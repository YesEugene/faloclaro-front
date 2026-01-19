'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAppLanguage } from '@/lib/language-context';
import { SettingsPanel } from '@/components/subscription/ui/SettingsPanel';
import { CourseMenuDrawer } from '@/components/subscription/ui/CourseMenuDrawer';

function SectionChevron({ open }: { open: boolean }) {
  const d = open ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function PlaceholderGraphic({ height = 140 }: { height?: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: `${height}px`,
        borderRadius: '16px',
        background: 'linear-gradient(180deg, #F3F4F6 0%, #E5E7EB 100%)',
        border: '1px solid #E5E7EB',
      }}
    />
  );
}

export default function IntroClient() {
  const params = useSearchParams();
  const { language } = useAppLanguage();

  const day = Number(params.get('day') || '1');
  const token = String(params.get('token') || '');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    course: true,
  });

  const langKey = language === 'ru' ? 'ru' : 'en';

  const strings = useMemo(
    () => ({
      ru: {
        menuCourse: 'Меню курса',
        introLabel: 'Введение',
        hero: 'Добро пожаловать на курс FaloClaro',
        lead:
          'Ты уже внутри, отлично! Сейчас мы коротко покажем, как здесь всё устроено, чтобы тебе было легко ориентироваться и учиться без лишнего напряжения.',
        note:
          'FaloClaro — это практический курс. Ты не просто смотришь уроки, а постепенно учишься понимать речь и говорить связно. Ниже — как всё работает.',
        sections: {
          course: 'Как устроен курс',
          find: 'Как найти уроки',
          settings: 'Настройки и профиль',
          how: 'Как проходить уроки',
          t1: 'Задание «Учим слова»',
          taskmenu: 'Меню заданий урока',
          t234: 'Задания 2, 3 и 4',
          t5: 'Задание «Практикуемся»',
          start: 'Можно начинать',
        },
      },
      en: {
        menuCourse: 'Course menu',
        introLabel: 'Intro',
        hero: 'Welcome to FaloClaro',
        lead: 'You’re in — great! Here’s a quick tour so you can navigate easily and learn without friction.',
        note:
          'FaloClaro is a practical course. You don’t just watch lessons — you gradually learn to understand and speak fluently. Below is how it works.',
        sections: {
          course: 'How the course is structured',
          find: 'How to find lessons',
          settings: 'Settings and profile',
          how: 'How to take lessons',
          t1: 'Task “Learn words”',
          taskmenu: 'Lesson task menu',
          t234: 'Tasks 2, 3 and 4',
          t5: 'Task “Practice”',
          start: 'You can start now',
        },
      },
    }),
    []
  );

  const s = strings[langKey];

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header (same style as lessons) */}
      <div className="sticky top-0 bg-white z-20" style={{ borderBottomWidth: '0px', borderWidth: '0px' }}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <a href="https://faloclaro.com" className="flex items-center cursor-pointer">
            <Image src="/Img/Website/logo.svg" alt="FaloClaro" width={120} height={40} className="h-10 w-auto" style={{ width: 'auto', height: '40px' }} />
          </a>

          <div className="flex items-center">
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              style={{ width: '29px', height: '29px', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Image src="/Img/Website/Settings.svg" alt="Settings" width={29} height={29} style={{ width: '29px', height: '29px' }} />
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4" style={{ paddingBottom: '10px', position: 'relative', zIndex: 20 }}>
          <div className="flex items-center justify-between" style={{ gap: '12px' }}>
            <button
              onClick={() => setCourseMenuOpen(true)}
              className="text-black"
              style={{
                fontSize: '16px',
                fontWeight: 400,
                lineHeight: '1.2',
                background: 'transparent',
                padding: 0,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 19l-7-7 7-7" />
                </svg>
                <span>{s.menuCourse}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} lessonToken={token} />
      <CourseMenuDrawer open={courseMenuOpen} lang={language} currentDay={day} currentToken={token} onClose={() => setCourseMenuOpen(false)} />

      {/* Content */}
      <div className="max-w-md mx-auto px-4 pb-12">
        <div style={{ marginTop: '18px' }}>
          <div style={{ fontSize: '16px', color: '#6B7280', fontWeight: 600 }}>{s.introLabel}</div>
          <h1 style={{ fontSize: '40px', fontWeight: 900, color: '#111', marginTop: '10px', lineHeight: '1.05' }}>{s.hero}</h1>
          <div style={{ marginTop: '14px', fontSize: '18px', color: '#111', lineHeight: '1.55' }}>{s.lead}</div>
          <div style={{ marginTop: '14px', fontSize: '18px', color: '#111', lineHeight: '1.55' }}>{s.note}</div>
        </div>

        <div style={{ marginTop: '18px' }}>
          <PlaceholderGraphic height={160} />
        </div>

        {/* Accordion sections */}
        <div style={{ marginTop: '16px' }}>
          {(
            [
              { key: 'course', title: s.sections.course },
              { key: 'find', title: s.sections.find },
              { key: 'settings', title: s.sections.settings },
              { key: 'how', title: s.sections.how },
              { key: 't1', title: s.sections.t1 },
              { key: 'taskmenu', title: s.sections.taskmenu },
              { key: 't234', title: s.sections.t234 },
              { key: 't5', title: s.sections.t5 },
              { key: 'start', title: s.sections.start },
            ] as const
          ).map((item) => {
            const isOpen = !!openSections[item.key];
            return (
              <div key={item.key} style={{ borderTop: '1px solid #E5E7EB' }}>
                <button
                  type="button"
                  onClick={() => toggleSection(item.key)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 0',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#111' }}>{item.title}</div>
                  <SectionChevron open={isOpen} />
                </button>

                {isOpen && (
                  <div style={{ paddingBottom: '18px' }}>
                    <div style={{ fontSize: '18px', color: '#111', lineHeight: '1.6' }}>
                      {langKey === 'ru'
                        ? 'Здесь будет подробный текст и изображения. Пока это “каркас” страницы — ты сможешь заменить контент, когда подготовишь финальный текст.'
                        : 'This section will contain detailed text and images. This is a placeholder scaffold you can fill later.'}
                    </div>
                    <div style={{ marginTop: '12px' }}>
                      <PlaceholderGraphic height={140} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ borderTop: '1px solid #E5E7EB' }} />
        </div>
      </div>
    </div>
  );
}


