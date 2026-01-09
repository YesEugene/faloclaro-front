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
  const [userProgress, setUserProgress] = useState<Map<number, string>>(new Map()); // day_number -> status
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLessons();
    
    // Reload lessons when page becomes visible (e.g., after completing a lesson)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadLessons();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
          console.log('🔑 Raw tokens data from DB:', {
            tokensCount: tokensData.length,
            tokens: tokensData.map(t => ({ lesson_id: t.lesson_id, token: t.token.substring(0, 10) + '...' }))
          });
          
          // Get lesson day_numbers for these tokens
          const lessonIds = tokensData.map(t => t.lesson_id);
          const { data: lessonsWithTokens, error: lessonsWithTokensError } = await supabase
            .from('lessons')
            .select('id, day_number')
            .in('id', lessonIds);

          console.log('📚 Lessons with tokens:', {
            lessonsCount: lessonsWithTokens?.length || 0,
            lessons: lessonsWithTokens?.map(l => ({ id: l.id, day_number: l.day_number })) || []
          });

          if (!lessonsWithTokensError && lessonsWithTokens) {
            const tokenMap = new Map<number, string>();
            tokensData.forEach(tokenData => {
              const lesson = lessonsWithTokens.find(l => l.id === tokenData.lesson_id);
              if (lesson) {
                tokenMap.set(lesson.day_number, tokenData.token);
                console.log(`  ✓ Token for lesson ${lesson.day_number} (ID: ${lesson.id})`);
              } else {
                console.warn(`  ⚠️ No lesson found for token with lesson_id: ${tokenData.lesson_id}`);
              }
            });
            console.log('🔑 Final user tokens map:', {
              tokensCount: tokenMap.size,
              lessonNumbers: Array.from(tokenMap.keys()).sort((a, b) => a - b),
              allLessons: Array.from(tokenMap.entries()).map(([day, token]) => ({ day, token: token.substring(0, 10) + '...' }))
            });
            setUserTokens(tokenMap);
          } else {
            console.error('❌ Error loading lessons with tokens:', lessonsWithTokensError);
          }
        } else {
          console.log('⚠️ No tokens found for user:', { 
            tokensError: tokensError?.message || tokensError,
            tokensErrorCode: tokensError?.code,
            tokensDataCount: tokensData?.length || 0
          });
        }

        // Get subscription to check if user has paid
        const { data: subData, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors if no subscription

        console.log('📊 Subscription query result:', {
          userId,
          hasSubData: !!subData,
          subData: subData ? {
            id: subData.id,
            status: subData.status,
            statusType: typeof subData.status,
            user_id: subData.user_id,
            created_at: subData.created_at,
            paid_at: subData.paid_at,
            allFields: Object.keys(subData)
          } : null,
          subError: subError ? {
            message: subError.message,
            code: subError.code,
            details: subError.details,
            hint: subError.hint
          } : null,
          errorCode: subError?.code
        });

        if (subData) {
          console.log('✅ Subscription found:', {
            status: subData.status,
            statusIsPaid: subData.status === 'paid',
            statusIsTrial: subData.status === 'trial',
            statusIsActive: subData.status === 'active',
            paidAt: subData.paid_at
          });
          setSubscription(subData);
        } else {
          // No subscription found - user is on free trial (lessons 1-3 only)
          console.log('ℹ️ No subscription found - user is on free trial (lessons 1-3 only)');
          setSubscription(null);
        }

        // Get user progress for all lessons
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('lesson_id, status')
          .eq('user_id', userId);

        if (!progressError && progressData) {
          // Get lesson day_numbers for progress
          const progressLessonIds = progressData.map(p => p.lesson_id);
          const { data: lessonsWithProgress, error: lessonsWithProgressError } = await supabase
            .from('lessons')
            .select('id, day_number')
            .in('id', progressLessonIds);

          if (!lessonsWithProgressError && lessonsWithProgress) {
            const progressMap = new Map<number, string>();
            progressData.forEach(progress => {
              const lesson = lessonsWithProgress.find(l => l.id === progress.lesson_id);
              if (lesson) {
                progressMap.set(lesson.day_number, progress.status);
              }
            });
            setUserProgress(progressMap);
          }
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
    console.log(`\n🔍 Checking lesson ${dayNumber}:`, {
      dayNumber,
      isFirstThree: dayNumber <= 3,
      userTokensSize: userTokens.size,
      userTokensKeys: Array.from(userTokens.keys()),
      subscriptionStatus: subscription?.status,
      hasSubscription: !!subscription,
      subscriptionObject: subscription
    });

    // First 3 lessons are always unlocked (if user has token)
    if (dayNumber <= 3) {
      const hasToken = userTokens.has(dayNumber);
      const unlocked = hasToken;
      console.log(`✅ Lesson ${dayNumber} (1-3):`, { 
        unlocked, 
        hasToken,
        tokenValue: userTokens.get(dayNumber) ? 'exists' : 'missing'
      });
      return unlocked;
    }
    
    // After 3, check if user has paid (only 'paid' status, not 'trial')
    // Also check if user has a token for this specific lesson (created after payment)
    const hasToken = userTokens.has(dayNumber);
    const hasPaid = subscription?.status === 'paid';
    const unlocked = hasPaid || hasToken;
    
    console.log(`❌ Lesson ${dayNumber} (4+):`, { 
      unlocked, 
      hasToken,
      hasPaid,
      subscriptionStatus: subscription?.status,
      subscriptionStatusType: typeof subscription?.status,
      subscriptionStatusComparison: subscription?.status === 'paid',
      hasSubscription: !!subscription,
      subscriptionId: subscription?.id,
      allSubscriptionFields: subscription ? Object.keys(subscription) : null
    });
    
    if (unlocked && !hasPaid) {
      console.warn(`⚠️ WARNING: Lesson ${dayNumber} is unlocked but user hasn't paid!`, {
        hasToken,
        hasPaid,
        subscriptionStatus: subscription?.status
      });
    }
    
    return unlocked;
  };

  const getLessonUrl = (dayNumber: number): string => {
    const token = userTokens.get(dayNumber);
    if (token) {
      return `/pt/lesson/${dayNumber}/${token}/overview`;
    }
    // If no token but unlocked (paid), try to use any available token
    const anyToken = Array.from(userTokens.values())[0] || localStorage.getItem('accessToken');
    if (anyToken && subscription?.status === 'paid') {
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
      // Redirect to payment page with token if available
      const currentToken = localStorage.getItem('accessToken') || searchParams.get('token');
      const paymentUrl = `/pt/payment?lesson=${dayNumber}${currentToken ? `&token=${currentToken}` : ''}`;
      router.push(paymentUrl);
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

        {/* Lessons List - Horizontal Scroll */}
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {lessons.map((lesson) => {
              console.log(`\n🎨 Rendering lesson ${lesson.day_number}:`);
              const isUnlocked = isLessonUnlocked(lesson.day_number);
              const progressStatus = userProgress.get(lesson.day_number);
              const isCompleted = progressStatus === 'completed';
              
              console.log(`  Status:`, {
                isUnlocked,
                progressStatus,
                isCompleted,
                willShowAsLocked: !isUnlocked
              });
              
              // Find first unlocked lesson that is not completed (for determining current lesson)
              const firstUnlockedNotCompleted = lessons.find(l => 
                isLessonUnlocked(l.day_number) && 
                userProgress.get(l.day_number) !== 'completed'
              );
              
              // Current lesson: in_progress OR first unlocked lesson that is not completed
              const isCurrent = progressStatus === 'in_progress' || 
                (!progressStatus && isUnlocked && !isCompleted && lesson.day_number === firstUnlockedNotCompleted?.day_number);
              
              // Locked lesson: not unlocked (no token for 1-3, or no payment for 4+)
              const isLocked = !isUnlocked;
              
              // Determine card style
              let cardStyle: React.CSSProperties = {
                width: '85px',
                height: '60px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isUnlocked ? 'pointer' : 'pointer',
                flexShrink: 0,
              };

              if (isCompleted) {
                // Green - completed
                cardStyle.backgroundColor = '#BEF4C2';
                cardStyle.border = 'none';
              } else if (isCurrent) {
                // Blue - current
                cardStyle.backgroundColor = '#CBE8FF';
                cardStyle.border = 'none';
              } else if (isUnlocked) {
                // White with border - unlocked but not started
                cardStyle.backgroundColor = 'white';
                cardStyle.border = '1px solid #E5E7EB';
              } else {
                // White with border and lock icon - locked
                cardStyle.backgroundColor = 'white';
                cardStyle.border = '1px solid #E5E7EB';
              }

              return (
                <div
                  key={lesson.id}
                  onClick={() => handleLessonClick(lesson.day_number)}
                  style={cardStyle}
                  className="transition-all hover:opacity-80"
                >
                  {isUnlocked ? (
                    <span className="text-sm font-medium text-gray-700 text-center">
                      {lesson.day_number} {appLanguage === 'ru' ? 'Урок' : appLanguage === 'en' ? 'Lesson' : 'Lição'}
                    </span>
                  ) : (
                    <Image
                      src="/Img/eye.svg"
                      alt="Locked"
                      width={24}
                      height={24}
                      className="w-6 h-6"
                    />
                  )}
                </div>
              );
            })}
          </div>
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

