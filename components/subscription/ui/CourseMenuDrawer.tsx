'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Lang = 'ru' | 'en' | 'pt' | string;

function pickLangText(obj: { ru?: string; en?: string; pt?: string } | string | null | undefined, lang: Lang): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (lang === 'ru') return obj.ru || obj.en || obj.pt || '';
  if (lang === 'pt') return obj.pt || obj.en || obj.ru || '';
  return obj.en || obj.ru || obj.pt || '';
}

const DEFAULT_MODULE_SUBTITLE_RU_BY_LEVEL: Record<number, string> = {
  1: 'Распознавание и базовые реакции',
  2: 'Поиск информации и ориентация',
  3: 'Истории, время, причины',
  4: 'Сообщения, решения, события',
};

function normalizeModuleSubtitle(raw: any): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const low = s.toLowerCase();
  // Old UI placeholder values that should never be shown as real subtitles
  if (low === 'уровень' || low === 'level') return '';
  return s;
}

function Chevron({ open }: { open: boolean }) {
  const d = open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function Check() {
  return (
    <span
      className="inline-flex items-center justify-center"
      style={{
        width: '22px',
        height: '22px',
        borderRadius: '999px',
        border: '2px solid #34BF5D',
        color: '#34BF5D',
        fontWeight: 800,
        fontSize: '13px',
        lineHeight: '22px',
      }}
    >
      ✓
    </span>
  );
}

export function CourseMenuDrawer(props: {
  open: boolean;
  lang: Lang;
  currentDay: number;
  currentToken: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [levels, setLevels] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [userTokens, setUserTokens] = useState<Map<number, string>>(new Map());
  const [progressMap, setProgressMap] = useState<Map<number, string>>(new Map());
  const [expandedLevelIds, setExpandedLevelIds] = useState<Set<string>>(new Set());

  const isLessonUnlocked = (lessonDay: number): boolean => {
    if (subscription?.status === 'active' || subscription?.status === 'paid') return true;
    if (subscription?.status === 'trial' || !subscription?.paid_at) {
      return lessonDay <= 3 && userTokens.size > 0;
    }
    if (lessonDay <= 3 && userTokens.size > 0) return true;
    return userTokens.has(lessonDay);
  };

  useEffect(() => {
    if (!props.open) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        // user id from current token
        const { data: tokenRows } = await supabase
          .from('lesson_access_tokens')
          .select('user_id')
          .eq('token', props.currentToken)
          .limit(1);

        const uid = tokenRows && tokenRows.length > 0 ? tokenRows[0]?.user_id : null;
        if (!uid) return;
        if (cancelled) return;
        setUserId(uid);

        const [{ data: levelsData }, { data: lessonsData }, { data: progressData }, { data: subscriptionData }, { data: tokensData }] =
          await Promise.all([
            supabase.from('levels').select('*').order('level_number', { ascending: true }),
            supabase
              .from('lessons')
              .select('id, day_number, title_ru, title_en, title_pt, level_id, levels(id, level_number, name_ru, name_en)')
              .eq('is_published', true)
              .order('day_number', { ascending: true }),
            supabase.from('user_progress').select('day_number, status').eq('user_id', uid),
            supabase
              .from('subscriptions')
              .select('status, paid_at, expires_at')
              .eq('user_id', uid)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabase
              .from('lesson_access_tokens')
              .select('token, lesson:lessons(day_number)')
              .eq('user_id', uid),
          ]);

        if (cancelled) return;
        setLevels(levelsData || []);
        setLessons(lessonsData || []);

        const pMap = new Map<number, string>();
        (progressData || []).forEach((p: any) => {
          if (Number.isFinite(Number(p?.day_number))) pMap.set(Number(p.day_number), p.status);
        });
        setProgressMap(pMap);
        setSubscription(subscriptionData || null);

        const tMap = new Map<number, string>();
        (tokensData || []).forEach((row: any) => {
          const d = row?.lesson?.day_number;
          if (Number.isFinite(Number(d)) && typeof row?.token === 'string') tMap.set(Number(d), row.token);
        });
        setUserTokens(tMap);

        // expand current module by default
        const currentLesson = (lessonsData || []).find((l: any) => Number(l?.day_number) === props.currentDay);
        if (currentLesson?.level_id) setExpandedLevelIds(new Set([String(currentLesson.level_id)]));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.currentToken, props.currentDay]);

  const lessonsByLevel = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const l of lessons) {
      const lid = l?.level_id ? String(l.level_id) : 'no-level';
      if (!map.has(lid)) map.set(lid, []);
      map.get(lid)!.push(l);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => (a?.day_number || 0) - (b?.day_number || 0));
      map.set(k, arr);
    }
    return map;
  }, [lessons]);

  const toggleLevel = (levelId: string) => {
    setExpandedLevelIds((prev) => {
      const next = new Set(prev);
      if (next.has(levelId)) next.delete(levelId);
      else next.add(levelId);
      return next;
    });
  };

  const goToLesson = async (lessonRow: any) => {
    const day = Number(lessonRow?.day_number);
    if (!Number.isFinite(day)) return;

    // If locked -> payment for trial (>3)
    const unlocked = isLessonUnlocked(day);
    if (!unlocked && day > 3 && (!subscription?.paid_at && subscription?.status !== 'active' && subscription?.status !== 'paid')) {
      props.onClose();
      router.push(`/pt/payment?day=${day}&token=${props.currentToken}`);
      return;
    }

    // Same lesson => just close
    if (day === props.currentDay) {
      props.onClose();
      return;
    }

    let lessonToken = userTokens.get(day) || null;
    const uid = userId;
    const lessonId = lessonRow?.id;

    // Ensure token exists for unlocked lesson (paid users might not have one yet)
    if (!lessonToken && uid && lessonId && (unlocked || progressMap.get(day) === 'completed')) {
      const { data: existingRows } = await supabase
        .from('lesson_access_tokens')
        .select('token')
        .eq('user_id', uid)
        .eq('lesson_id', lessonId)
        .limit(1);
      const existing = existingRows && existingRows.length > 0 ? existingRows[0]?.token : null;
      lessonToken = typeof existing === 'string' ? existing : null;

      if (!lessonToken) {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const newToken = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
        const { data: created } = await supabase
          .from('lesson_access_tokens')
          .insert({
            user_id: uid,
            lesson_id: lessonId,
            token: newToken,
            expires_at: null,
          })
          .select('token')
          .limit(1);
        lessonToken = created && created.length > 0 ? created[0]?.token : null;
      }

      if (lessonToken) {
        setUserTokens((prev) => {
          const next = new Map(prev);
          next.set(day, lessonToken as string);
          return next;
        });
      }
    }

    if (!lessonToken) return;
    props.onClose();
    router.push(`/pt/lesson/${day}/${lessonToken}?task=1`);
  };

  if (!mounted || !props.open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.25)' }}
        onClick={props.onClose}
      />

      {/* Drawer */}
      <div
        className="absolute top-0 bottom-0 left-0"
        style={{
          width: '80vw',
          maxWidth: '420px',
          background: '#F4F5F8',
          borderTopRightRadius: '0px',
          borderBottomRightRadius: '0px',
          padding: '20px 16px',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[20px] md:text-[25px] font-semibold" style={{ color: '#111', marginBottom: '18px' }}>
          {props.lang === 'ru' ? 'Содержание курса' : props.lang === 'en' ? 'Course contents' : 'Conteúdo do curso'}
        </div>

        {/* Intro (new page) */}
        <button
          type="button"
          onClick={() => {
            props.onClose();
            const params = new URLSearchParams();
            params.set('day', String(props.currentDay));
            params.set('token', props.currentToken);
            router.push(`/pt/intro?${params.toString()}`);
          }}
          style={{
            width: '100%',
            textAlign: 'left',
            background: 'white',
            borderRadius: '18px',
            padding: '18px 16px',
            border: '0px',
            marginBottom: '14px',
            color: '#111',
          }}
          className="text-[16px] md:text-[18px] font-bold"
        >
          {props.lang === 'ru' ? 'Вступление' : props.lang === 'en' ? 'Introduction' : 'Introdução'}
        </button>

        {loading && (
          <div className="text-sm text-gray-500" style={{ padding: '10px 4px' }}>
            {props.lang === 'ru' ? 'Загрузка…' : 'Loading…'}
          </div>
        )}

        {levels.map((lvl: any) => {
          const id = String(lvl.id);
          const expanded = expandedLevelIds.has(id);
          const subtitle =
            props.lang === 'ru'
              ? (normalizeModuleSubtitle(lvl.name_ru) || DEFAULT_MODULE_SUBTITLE_RU_BY_LEVEL[Number(lvl.level_number)] || '')
              : (normalizeModuleSubtitle(lvl.name_en) || '');
          const lvlLessons = lessonsByLevel.get(id) || [];

          return (
            <div
              key={id}
              style={{
                background: 'white',
                borderRadius: '22px',
                padding: '18px 16px',
                marginBottom: '14px',
              }}
            >
              <button
                type="button"
                onClick={() => toggleLevel(id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div className="text-[16px] md:text-[18px] font-bold" style={{ color: '#111' }}>
                    {props.lang === 'ru' ? `Модуль ${lvl.level_number}` : `Module ${lvl.level_number}`}
                  </div>
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '18px',
                      color: '#6B7280',
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    {subtitle}
                  </div>
                </div>
                <Chevron open={expanded} />
              </button>

              {expanded && (
                <div style={{ marginTop: '14px' }}>
                  {lvlLessons.map((lessonRow: any) => {
                    const day = Number(lessonRow?.day_number);
                    const completed = progressMap.get(day) === 'completed';
                    const isCurrent = day === props.currentDay;
                    const unlocked = isLessonUnlocked(day);
                    const title = pickLangText(
                      {
                        ru: lessonRow?.title_ru,
                        en: lessonRow?.title_en,
                        pt: lessonRow?.title_pt,
                      },
                      props.lang
                    );
                    const disabled = !unlocked && !completed && !(day > 3 && (!subscription?.paid_at && subscription?.status !== 'active' && subscription?.status !== 'paid'));

                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={disabled}
                        onClick={() => goToLesson(lessonRow)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          padding: '12px 14px',
                          borderRadius: '14px',
                          border: '1px solid #E5E7EB',
                          background: isCurrent ? '#E5E7EB' : 'white',
                          marginTop: '8px',
                          opacity: disabled ? 0.6 : 1,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#111',
                            textAlign: 'left',
                            flex: 1,
                          }}
                        >
                          {props.lang === 'ru' ? `Урок ${day}: ${title}` : `Lesson ${day}: ${title}`}
                        </div>
                        <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {completed ? <Check /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Levels-lessons without level_id */}
        {lessonsByLevel.get('no-level')?.length ? (
          <div style={{ background: 'white', borderRadius: '22px', padding: '18px 16px', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={() => toggleLevel('no-level')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#111' }}>
                  {props.lang === 'ru' ? 'Другие' : 'Other'}
                </div>
              </div>
              <Chevron open={expandedLevelIds.has('no-level')} />
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}


