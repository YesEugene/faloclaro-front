'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { getDayTitle, getDaySubtitle } from '@/lib/lesson-translations';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import Image from 'next/image';

function CoursePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language: appLanguage } = useAppLanguage();
  const [levels, setLevels] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [userTokens, setUserTokens] = useState<Map<number, string>>(new Map());
  const [userProgress, setUserProgress] = useState<Map<number, any>>(new Map());
  const [subscription, setSubscription] = useState<any>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/pt');
        return;
      }
      setUserId(user.id);

      // Load subscription
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subscriptionData) {
        setSubscription(subscriptionData);
      }

      // Load levels
      const { data: levelsData } = await supabase
        .from('levels')
        .select('*')
        .order('level_number', { ascending: true });

      if (levelsData) {
        setLevels(levelsData);
        // Expand first level by default
        if (levelsData.length > 0) {
          setExpandedLevels(new Set([levelsData[0].id]));
        }
      }

      // Load published lessons with levels
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*, levels(id, level_number, name_ru, name_en)')
        .eq('is_published', true)
        .order('day_number', { ascending: true });

      if (lessonsData) {
        setLessons(lessonsData);
      }

      // Load user tokens
      const { data: tokensData } = await supabase
        .from('lesson_access_tokens')
        .select('token, lesson_id, lesson:lessons(day_number)')
        .eq('user_id', user.id);

      const tokensMap = new Map<number, string>();
      if (tokensData) {
        tokensData.forEach((item: any) => {
          if (item.lesson?.day_number) {
            tokensMap.set(item.lesson.day_number, item.token);
          }
        });
      }
      setUserTokens(tokensMap);

      // Load user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('day_number, status, tasks_completed, total_tasks')
        .eq('user_id', user.id);

      const progressMap = new Map<number, any>();
      if (progressData) {
        progressData.forEach((item: any) => {
          progressMap.set(item.day_number, item);
        });
      }
      setUserProgress(progressMap);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isLessonUnlocked = (lessonDay: number): boolean => {
    // If user has paid subscription, all lessons are unlocked
    if (subscription?.status === 'paid') {
      return true;
    }
    // First 3 lessons are always unlocked if user has any token
    if (lessonDay <= 3 && userTokens.size > 0) {
      return true;
    }
    // Other lessons are unlocked if user has a token for them
    return userTokens.has(lessonDay);
  };

  const getLessonStatus = (lessonDay: number): 'completed' | 'current' | 'locked' => {
    const progress = userProgress.get(lessonDay);
    if (progress && progress.tasks_completed >= progress.total_tasks) {
      return 'completed';
    }
    if (isLessonUnlocked(lessonDay)) {
      return 'current';
    }
    return 'locked';
  };

  const toggleLevel = (levelId: string) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(levelId)) {
      newExpanded.delete(levelId);
    } else {
      newExpanded.add(levelId);
    }
    setExpandedLevels(newExpanded);
  };

  const getLevelName = (level: any) => {
    if (appLanguage === 'ru') return level.name_ru || level.name_en;
    return level.name_en || level.name_ru;
  };

  const getLessonsForLevel = (levelId: string | null) => {
    if (levelId === null) {
      // Lessons without level
      return lessons.filter((lesson: any) => !lesson.level_id);
    }
    return lessons.filter((lesson: any) => lesson.level_id === levelId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const translations = {
    ru: {
      title: 'Курс португальского',
      subtitle: 'Выберите урок',
      noLevel: 'Без уровня',
      completed: 'Завершено',
      current: 'Текущий',
      locked: 'Заблокировано',
    },
    en: {
      title: 'Portuguese Course',
      subtitle: 'Choose a lesson',
      noLevel: 'No Level',
      completed: 'Completed',
      current: 'Current',
      locked: 'Locked',
    },
  };

  const t = translations[appLanguage] || translations.ru;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/pt" className="flex items-center cursor-pointer">
            <Image
              src="/Img/Logo FaloClaro.svg"
              alt="FaloClaro"
              width={120}
              height={40}
              className="h-10 w-auto"
              style={{ width: 'auto', height: '40px' }}
            />
          </Link>
          <div className="flex items-center">
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-2 text-black">{t.title}</h1>
        <p className="text-gray-600 mb-6">{t.subtitle}</p>

        {/* Levels */}
        <div className="space-y-4">
          {levels.map((level) => {
            const levelLessons = getLessonsForLevel(level.id);
            const isExpanded = expandedLevels.has(level.id);

            if (levelLessons.length === 0) return null;

            return (
              <div key={level.id} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Level Header */}
                <button
                  onClick={() => toggleLevel(level.id)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900">
                      {getLevelName(level)}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({levelLessons.length} {appLanguage === 'ru' ? 'уроков' : 'lessons'})
                    </span>
                  </div>
                  <span className="text-gray-600">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </button>

                {/* Level Lessons */}
                {isExpanded && (
                  <div className="p-4 space-y-2">
                    {levelLessons.map((lesson: any) => {
                      const status = getLessonStatus(lesson.day_number);
                      const token = userTokens.get(lesson.day_number);
                      const progress = userProgress.get(lesson.day_number);

                      let yamlContent: any = {};
                      if (lesson.yaml_content) {
                        if (typeof lesson.yaml_content === 'string') {
                          try {
                            yamlContent = JSON.parse(lesson.yaml_content);
                          } catch (e) {
                            yamlContent = {};
                          }
                        } else {
                          yamlContent = lesson.yaml_content;
                        }
                      }

                      const dayInfo = yamlContent.day || {};

                      return (
                        <Link
                          key={lesson.id}
                          href={token ? `/pt/lesson/${lesson.day_number}/${token}/overview` : '#'}
                          className={`block rounded-lg p-4 border-2 transition-all ${
                            status === 'completed'
                              ? 'border-green-500 bg-green-50 hover:bg-green-100'
                              : status === 'current'
                              ? 'border-black bg-white hover:bg-gray-50'
                              : 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                          }`}
                          onClick={(e) => {
                            if (!token) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-700">
                                  {appLanguage === 'ru' ? 'Урок' : 'Lesson'} {lesson.day_number}
                                </span>
                                {status === 'completed' && (
                                  <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded">
                                    ✓ {t.completed}
                                  </span>
                                )}
                                {status === 'current' && (
                                  <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded">
                                    ▶ {t.current}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {getDayTitle(dayInfo, appLanguage)}
                              </h3>
                              {getDaySubtitle(dayInfo, appLanguage) && (
                                <p className="text-sm text-gray-600">
                                  {getDaySubtitle(dayInfo, appLanguage)}
                                </p>
                              )}
                              {progress && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {progress.tasks_completed}/{progress.total_tasks} {appLanguage === 'ru' ? 'заданий' : 'tasks'}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Lessons without level */}
          {(() => {
            const noLevelLessons = getLessonsForLevel(null);
            if (noLevelLessons.length === 0) return null;

            const isExpanded = expandedLevels.has('no-level');

            return (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleLevel('no-level')}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-semibold text-gray-900">{t.noLevel}</span>
                    <span className="text-sm text-gray-500">
                      ({noLevelLessons.length} {appLanguage === 'ru' ? 'уроков' : 'lessons'})
                    </span>
                  </div>
                  <span className="text-gray-600">{isExpanded ? '▼' : '▶'}</span>
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-2">
                    {noLevelLessons.map((lesson: any) => {
                      const status = getLessonStatus(lesson.day_number);
                      const token = userTokens.get(lesson.day_number);
                      const progress = userProgress.get(lesson.day_number);

                      let yamlContent: any = {};
                      if (lesson.yaml_content) {
                        if (typeof lesson.yaml_content === 'string') {
                          try {
                            yamlContent = JSON.parse(lesson.yaml_content);
                          } catch (e) {
                            yamlContent = {};
                          }
                        } else {
                          yamlContent = lesson.yaml_content;
                        }
                      }

                      const dayInfo = yamlContent.day || {};

                      return (
                        <Link
                          key={lesson.id}
                          href={token ? `/pt/lesson/${lesson.day_number}/${token}/overview` : '#'}
                          className={`block rounded-lg p-4 border-2 transition-all ${
                            status === 'completed'
                              ? 'border-green-500 bg-green-50 hover:bg-green-100'
                              : status === 'current'
                              ? 'border-black bg-white hover:bg-gray-50'
                              : 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                          }`}
                          onClick={(e) => {
                            if (!token) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-gray-700">
                                  {appLanguage === 'ru' ? 'Урок' : 'Lesson'} {lesson.day_number}
                                </span>
                                {status === 'completed' && (
                                  <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded">
                                    ✓ {t.completed}
                                  </span>
                                )}
                                {status === 'current' && (
                                  <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded">
                                    ▶ {t.current}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {getDayTitle(dayInfo, appLanguage)}
                              </h3>
                              {getDaySubtitle(dayInfo, appLanguage) && (
                                <p className="text-sm text-gray-600">
                                  {getDaySubtitle(dayInfo, appLanguage)}
                                </p>
                              )}
                              {progress && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {progress.tasks_completed}/{progress.total_tasks} {appLanguage === 'ru' ? 'заданий' : 'tasks'}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default function CoursePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <CoursePageContent />
    </Suspense>
  );
}



