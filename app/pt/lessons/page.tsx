'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import Image from 'next/image';

function LessonsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language: appLanguage } = useAppLanguage();
  const [lessons, setLessons] = useState<any[]>([]);
  const [userTokens, setUserTokens] = useState<Map<number, string>>(new Map());
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      setLoading(true);

      // Get token from URL if present (from email link)
      const token = searchParams.get('token');
      let userId: string | null = null;

      if (token) {
        // Verify token and get user
        const { data: tokenData, error: tokenError } = await supabase
          .from('lesson_access_tokens')
          .select('user_id')
          .eq('token', token)
          .single();

        if (!tokenError && tokenData) {
          userId = tokenData.user_id;
          // Save userId to localStorage for future use
          localStorage.setItem('userId', tokenData.user_id);
          localStorage.setItem('accessToken', token);
        }
      } else {
        // Try to get from localStorage
        const storedUserId = localStorage.getItem('userId');
        const storedToken = localStorage.getItem('accessToken');
        if (storedUserId && storedToken) {
          userId = storedUserId;
          // Verify token is still valid
          const { data: tokenData, error: tokenError } = await supabase
            .from('lesson_access_tokens')
            .select('user_id')
            .eq('token', storedToken)
            .eq('user_id', storedUserId)
            .single();

          if (tokenError || !tokenData) {
            // Token invalid, clear localStorage
            localStorage.removeItem('userId');
            localStorage.removeItem('accessToken');
            userId = null;
          }
        }
      }

      // Get all lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('day_number', { ascending: true });

      if (lessonsError) {
        throw lessonsError;
      }

      setLessons(lessonsData || []);

      // If we have userId, get all access tokens for this user
      if (userId) {
        const { data: tokensData, error: tokensError } = await supabase
          .from('lesson_access_tokens')
          .select('token, lesson_id')
          .eq('user_id', userId);

        if (!tokensError && tokensData) {
          // Get lesson day_numbers for these tokens
          const lessonIds = tokensData.map(t => t.lesson_id);
          const { data: lessonsWithTokens, error: lessonsWithTokensError } = await supabase
            .from('lessons')
            .select('id, day_number')
            .in('id', lessonIds);

          if (!lessonsWithTokensError && lessonsWithTokens) {
            const tokenMap = new Map<number, string>();
            tokensData.forEach(tokenData => {
              const lesson = lessonsWithTokens.find(l => l.id === tokenData.lesson_id);
              if (lesson) {
                tokenMap.set(lesson.day_number, tokenData.token);
              }
            });
            setUserTokens(tokenMap);
          }
        }

        // Get subscription to check if user has paid
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!subError && subData) {
          setSubscription(subData);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading lessons:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lessons');
      setLoading(false);
    }
  };

  const isLessonUnlocked = (dayNumber: number): boolean => {
    // First 3 lessons are always unlocked (if user has token)
    if (dayNumber <= 3) {
      return userTokens.has(dayNumber);
    }
    // After 3, check if user has paid
    return subscription?.status === 'active' || subscription?.status === 'paid';
  };

  const getLessonUrl = (dayNumber: number): string => {
    const token = userTokens.get(dayNumber);
    if (token) {
      return `/pt/lesson/${dayNumber}/${token}/overview`;
    }
    // If no token but unlocked (paid), try to use any available token
    const anyToken = Array.from(userTokens.values())[0] || localStorage.getItem('accessToken');
    if (anyToken && subscription?.status === 'active') {
      // User has paid, create token for this lesson on the fly or use existing token
      return `/pt/lesson/${dayNumber}/${anyToken}/overview`;
    }
    // If no token, redirect to payment
    const currentToken = localStorage.getItem('accessToken') || searchParams.get('token');
    return `/pt/payment?lesson=${dayNumber}${currentToken ? `&token=${currentToken}` : ''}`;
  };

  const handleLessonClick = (dayNumber: number) => {
    if (isLessonUnlocked(dayNumber)) {
      const url = getLessonUrl(dayNumber);
      router.push(url);
    } else {
      // Redirect to payment page
      router.push(`/pt/payment?lesson=${dayNumber}`);
    }
  };

  const translations = {
    ru: {
      title: 'Уроки',
      subtitle: 'Португальский язык за 60 дней',
      unlocked: 'Открыт',
      locked: 'Закрыт',
      day: 'День',
    },
    en: {
      title: 'Lessons',
      subtitle: 'Portuguese in 60 days',
      unlocked: 'Unlocked',
      locked: 'Locked',
      day: 'Day',
    },
    pt: {
      title: 'Lições',
      subtitle: 'Português em 60 dias',
      unlocked: 'Desbloqueado',
      locked: 'Bloqueado',
      day: 'Dia',
    },
  };

  const t = translations[appLanguage] || translations.ru;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">
          {appLanguage === 'ru' ? 'Загрузка...' : appLanguage === 'en' ? 'Loading...' : 'A carregar...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-red-600 text-center">
          <p className="mb-4">{error}</p>
          <button
            onClick={() => router.push('/pt')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            {appLanguage === 'ru' ? 'Вернуться на главную' : appLanguage === 'en' ? 'Back to home' : 'Voltar ao início'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="max-w-md mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <Link href="/pt">
            <Image
              src="/Img/Logo FaloClaro.svg"
              alt="FaloClaro"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </Link>
          <LanguageSelector />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-black mb-2 text-left">
          {t.title}
        </h1>
        <p className="text-gray-700 mb-6 text-left">
          {t.subtitle}
        </p>

        {/* Lessons List */}
        <div className="space-y-3">
          {lessons.map((lesson) => {
            const isUnlocked = isLessonUnlocked(lesson.day_number);
            const dayInfo = lesson.yaml_content?.day_info || {};
            const title = appLanguage === 'ru' 
              ? dayInfo.title || lesson.title_ru
              : appLanguage === 'en'
              ? dayInfo.title_en || lesson.title_en
              : dayInfo.title_pt || lesson.title_pt;

            return (
              <div
                key={lesson.id}
                onClick={() => handleLessonClick(lesson.day_number)}
                className={`rounded-lg p-4 border-2 transition-all cursor-pointer ${
                  isUnlocked
                    ? 'border-green-500 bg-green-50 hover:bg-green-100'
                    : 'border-gray-300 bg-gray-100 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-600">
                        {t.day} {lesson.day_number}/60
                      </span>
                      {isUnlocked ? (
                        <span className="text-xs text-green-600 font-medium">
                          {t.unlocked}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 font-medium">
                          {t.locked}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-black">
                      {title}
                    </h3>
                    {dayInfo.estimated_time && (
                      <p className="text-sm text-gray-600 mt-1">
                        {dayInfo.estimated_time}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    {isUnlocked ? (
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LessonsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    }>
      <LessonsPageContent />
    </Suspense>
  );
}

