'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage, syncUserLanguageFromDB } from '@/lib/language-context';
import { getDayTitle, getDaySubtitle, getTaskTitle, getTaskSubtitle } from '@/lib/lesson-translations';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import Image from 'next/image';

function OverviewPageContent() {
  const params = useParams();
  const router = useRouter();
  const { language: appLanguage, setLanguage } = useAppLanguage();
  const day = parseInt(params.day as string);
  const token = params.token as string;

  const [lesson, setLesson] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [allLessonsProgress, setAllLessonsProgress] = useState<Map<number, string>>(new Map()); // day_number -> status
  const [userTokens, setUserTokens] = useState<Map<number, string>>(new Map()); // day_number -> token
  const [subscription, setSubscription] = useState<any>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]); // All published lessons from DB
  const [levels, setLevels] = useState<any[]>([]); // All levels from DB
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set()); // Expanded level IDs
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!day || !token) {
      setError('Invalid lesson link');
      setLoading(false);
      return;
    }

    loadLesson();
  }, [day, token]);

  const loadAllLessonsData = async (userId: string) => {
    try {
      // Get all levels from DB
      const { data: levelsData } = await supabase
        .from('levels')
        .select('*')
        .order('level_number', { ascending: true });

      // Get all published lessons from DB with level info
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('day_number, level_id, levels(id, level_number, name_ru, name_en)')
        .eq('is_published', true)
        .order('day_number', { ascending: true });

      if (lessonsData) {
        setAllLessons(lessonsData);
      }

      if (levelsData) {
        setLevels(levelsData);
        // Expand level containing current lesson by default
        if (lessonsData) {
          const currentLesson = lessonsData.find((l: any) => l.day_number === day);
          if (currentLesson?.level_id) {
            setExpandedLevels(new Set([currentLesson.level_id]));
          } else if (levelsData.length > 0) {
            // If current lesson has no level, expand first level
            setExpandedLevels(new Set([levelsData[0].id]));
          }
        } else if (levelsData.length > 0) {
          // If no lessons yet, expand first level
          setExpandedLevels(new Set([levelsData[0].id]));
        }
      }

      // Get user subscription status (use maybeSingle to handle case when subscription doesn't exist)
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions')
        .select('status, paid_at, expires_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (subscriptionData) {
        console.log('Subscription status loaded:', {
          status: subscriptionData.status,
          userId,
          hasPaidAt: !!subscriptionData.paid_at,
        });
        setSubscription(subscriptionData);
      } else if (subError && subError.code !== 'PGRST116') {
        console.error('Error loading subscription:', subError);
      }

      // Get all user tokens
      const { data: tokensData } = await supabase
        .from('lesson_access_tokens')
        .select('token, lesson_id, lesson:lessons(day_number)')
        .eq('user_id', userId);

      const tokensMap = new Map<number, string>();
      if (tokensData) {
        tokensData.forEach((item: any) => {
          if (item.lesson?.day_number) {
            tokensMap.set(item.lesson.day_number, item.token);
          }
        });
      }
      setUserTokens(tokensMap);

      // Get all user progress
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('day_number, status')
        .eq('user_id', userId);

      const progressMap = new Map<number, string>();
      if (progressData) {
        progressData.forEach((item: any) => {
          progressMap.set(item.day_number, item.status);
        });
      }
      setAllLessonsProgress(progressMap);
    } catch (err) {
      console.error('Error loading all lessons data:', err);
    }
  };

  const isLessonUnlocked = (lessonDay: number): boolean => {
    // If user has active or paid subscription, all published lessons are unlocked
    if (subscription?.status === 'active' || subscription?.status === 'paid') {
      return true;
    }
    // For trial users: only first 3 lessons are unlocked
    if (subscription?.status === 'trial' || !subscription?.paid_at) {
      return lessonDay <= 3 && userTokens.size > 0;
    }
    // First 3 lessons are always unlocked if user has any token
    if (lessonDay <= 3 && userTokens.size > 0) {
      return true;
    }
    // Other lessons are unlocked if user has a token for them
    return userTokens.has(lessonDay);
  };


  const loadLesson = async () => {
    try {
      setLoading(true);

      // Verify token and get user
      const { data: tokenData, error: tokenError } = await supabase
        .from('lesson_access_tokens')
        .select('user_id, lesson_id, expires_at, used_at')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        setError('Invalid or expired link');
        setLoading(false);
        return;
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        setError('Link has expired');
        setLoading(false);
        return;
      }

      // Sync user language from database
      await syncUserLanguageFromDB(tokenData.user_id, setLanguage);

      // Load all lessons data first
      await loadAllLessonsData(tokenData.user_id);

      // Get lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from('lessons')
        .select('*')
        .eq('day_number', day)
        .single();

      if (lessonError || !lessonData) {
        setError('Lesson not found');
        setLoading(false);
        return;
      }

      // Get user progress
      let { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*, task_progress(*)')
        .eq('user_id', tokenData.user_id)
        .eq('lesson_id', lessonData.id)
        .single();

      if (progressError && progressError.code === 'PGRST116') {
        // Create new progress
        const { data: newProgress, error: createError } = await supabase
          .from('user_progress')
          .insert({
            user_id: tokenData.user_id,
            lesson_id: lessonData.id,
            day_number: day,
            status: 'not_started',
            total_tasks: 5,
          })
          .select('*, task_progress(*)')
          .single();

        if (createError) {
          throw createError;
        }

        progressData = newProgress;
      } else if (progressError) {
        throw progressError;
      }

      // Debug: Log lesson data
      console.log('Lesson loaded:', {
        lessonId: lessonData.id,
        dayNumber: lessonData.day_number,
        hasYamlContent: !!lessonData.yaml_content,
        yamlContentType: typeof lessonData.yaml_content,
        yamlContentKeys: lessonData.yaml_content ? Object.keys(lessonData.yaml_content) : [],
        tasksInYaml: lessonData.yaml_content?.tasks?.length || 0,
        yamlContent: lessonData.yaml_content
      });

      setLesson(lessonData);
      setUserProgress(progressData);
    } catch (err) {
      console.error('Error loading lesson:', err);
      setError(err instanceof Error ? err.message : 'Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  const getTaskStatus = (taskId: number) => {
    // Parse yaml_content to get tasks
    let yamlContent: any = {};
    if (lesson?.yaml_content) {
      if (typeof lesson.yaml_content === 'string') {
        try {
          yamlContent = JSON.parse(lesson.yaml_content);
        } catch (e) {
          console.error('Error parsing yaml_content as JSON:', e);
          yamlContent = {};
        }
      } else {
        yamlContent = lesson.yaml_content;
      }
    }
    const tasks = Array.isArray(yamlContent.tasks) ? yamlContent.tasks : [];
    
    if (!userProgress?.task_progress || userProgress.task_progress.length === 0) {
      // If no progress, only first task is available
      const firstTask = tasks[0];
      return firstTask?.task_id === taskId ? 'current' : 'locked';
    }
    
    const taskProgress = userProgress.task_progress.find((tp: any) => tp.task_id === taskId);
    const currentTaskIndex = tasks.findIndex((t: any) => t.task_id === taskId);
    
    // IMPORTANT: If task is completed, it should ALWAYS be accessible for replay
    // This ensures completed tasks (like 3, 4, 5) are always visible and clickable
    if (taskProgress?.status === 'completed') {
      console.log(`✅ Task ${taskId} is completed - returning 'completed' status`);
      return 'completed';
    }
    
    // Find first incomplete task
    const firstIncompleteIndex = tasks.findIndex((task: any) => {
      const tp = userProgress.task_progress?.find((t: any) => t.task_id === task.task_id);
      return !tp || tp.status !== 'completed';
    });
    
    // If all tasks are completed, mark all as completed (accessible for replay)
    if (firstIncompleteIndex === -1) {
      console.log(`✅ All tasks completed - Task ${taskId} returning 'completed' status`);
      return 'completed';
    }
    
    // Tasks unlock sequentially: after completing task N, task N+1 becomes available
    if (currentTaskIndex === firstIncompleteIndex) return 'current';
    if (currentTaskIndex < firstIncompleteIndex) {
      console.log(`✅ Task ${taskId} is before incomplete task - returning 'completed' status`);
      return 'completed';
    }
    
    // For tasks after the first incomplete: check if ALL previous tasks are completed
    // If all previous tasks are completed, this task is unlocked (current)
    if (currentTaskIndex > firstIncompleteIndex) {
      // Check if all tasks before this one are completed
      let allPreviousCompleted = true;
      for (let i = 0; i < currentTaskIndex; i++) {
        const prevTask = tasks[i];
        if (prevTask) {
          const prevTaskProgress = userProgress.task_progress?.find((tp: any) => tp.task_id === prevTask.task_id);
          if (!prevTaskProgress || prevTaskProgress.status !== 'completed') {
            allPreviousCompleted = false;
            break;
          }
        }
      }
      
      if (allPreviousCompleted) {
        // All previous tasks are completed, so this task is unlocked and should be 'current'
        // This allows sequential unlocking: after completing task N, task N+1 becomes available
        return 'current';
      }
    }
    
    return 'locked';
  };

  const handleTaskClick = (taskId: number) => {
    const status = getTaskStatus(taskId);
    // Allow clicking on completed tasks for replay - all completed tasks should be accessible
    if (status === 'locked') return;
    
    router.push(`/pt/lesson/${day}/${token}?task=${taskId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!lesson || !userProgress) {
    return null;
  }

  // Parse yaml_content - handle both string and object
  let yamlContent: any = {};
  if (lesson.yaml_content) {
    if (typeof lesson.yaml_content === 'string') {
      try {
        yamlContent = JSON.parse(lesson.yaml_content);
      } catch (e) {
        console.error('Error parsing yaml_content as JSON:', e);
        yamlContent = {};
      }
    } else {
      yamlContent = lesson.yaml_content;
    }
  }

  const dayInfo = (yamlContent.day || {}) as any;
  // Tasks can be at top level (yamlContent.tasks) or inside day (yamlContent.day.tasks)
  // After import, they should be at top level, but check both locations
  const tasks = Array.isArray(yamlContent.tasks) 
    ? yamlContent.tasks 
    : Array.isArray(yamlContent.day?.tasks) 
    ? yamlContent.day.tasks 
    : [];
  const allCompleted = userProgress.tasks_completed >= userProgress.total_tasks;

  // Debug: Log tasks and completion status
  console.log('Overview Debug:', {
    hasLesson: !!lesson,
    hasYamlContent: !!lesson?.yaml_content,
    yamlContentType: typeof lesson?.yaml_content,
    parsedYamlContent: yamlContent,
    tasksCount: tasks.length,
    tasks: tasks.map((t: any) => ({ 
      id: t.task_id, 
      type: t.type, 
      title: t.title,
      status: getTaskStatus(t.task_id)
    })),
    allCompleted,
    tasksCompleted: userProgress.tasks_completed,
    totalTasks: userProgress.total_tasks,
    taskProgress: userProgress.task_progress,
    taskProgressDetails: userProgress.task_progress?.map((tp: any) => ({
      taskId: tp.task_id,
      status: tp.status,
      completedAt: tp.completed_at
    }))
  });
  
  // Ensure all tasks are always displayed - log if tasks array is empty
  if (tasks.length === 0) {
    console.error('⚠️ WARNING: tasks array is empty!', {
      yamlContent,
      yamlContentTasks: yamlContent.tasks,
      yamlContentTasksType: typeof yamlContent.tasks,
      yamlContentTasksIsArray: Array.isArray(yamlContent.tasks)
    });
  }
  
  // Log each task status to debug why tasks 3, 4, 5 might not be visible
  console.log('🔍 ALL TASKS IN ARRAY:', tasks.map((t: any, i: number) => ({
    index: i,
    taskId: t.task_id,
    type: t.type,
    title: t.title || 'No title'
  })));
  
  tasks.forEach((task: any, index: number) => {
    const status = getTaskStatus(task.task_id);
    const taskProgress = userProgress.task_progress?.find((tp: any) => tp.task_id === task.task_id);
    console.log(`📋 Task ${task.task_id} (index ${index}):`, {
      taskId: task.task_id,
      type: task.type,
      title: task.title,
      status,
      hasProgress: !!taskProgress,
      progressStatus: taskProgress?.status,
      willBeDisplayed: true, // All tasks should be displayed
      willBeRendered: true // All tasks should be rendered
    });
  });

  const translations = {
    ru: {
      day: 'День',
      estimatedTime: 'мин.',
      task1: 'Слушай и повторяй',
      task2: 'Говорим правильно',
      task3: 'Пойми смысл',
      task4: 'Выбери ситуацию',
      task5: 'Попробуй сам',
      playListenRepeat: 'Слушай, повторяй и привыкай к звучанию языка.',
      listenExamples: 'Послушай примеры и повтори вслух.',
      listenAnswer: 'Послушай фразу и ответь на вопрос.',
      listenChoose: 'Послушай фразу и выбери ситуацию.',
      writeOrSpeak: 'Напиши от руки или просто проговорить вслух.',
    },
    en: {
      day: 'Day',
      estimatedTime: 'min.',
      task1: 'Listen and repeat',
      task2: 'Speak correctly',
      task3: 'Understand the meaning',
      task4: 'Choose the situation',
      task5: 'Try yourself',
      playListenRepeat: 'Listen, repeat and get used to the sound of the language',
      listenExamples: 'Listen to examples and repeat aloud.',
      listenAnswer: 'Listen to the phrase and answer the question.',
      listenChoose: 'Listen to the phrase and choose the situation.',
      writeOrSpeak: 'Write by hand or just say aloud.',
    },
    pt: {
      day: 'Dia',
      estimatedTime: 'min',
      task1: 'Ouve e repete',
      task2: 'Falamos corretamente',
      task3: 'Compreende o significado',
      task4: 'Escolhe a situação',
      task5: 'Experimenta tu mesmo',
      playListenRepeat: 'Ouve, repete e habitua-te ao som da língua',
      listenExamples: 'Ouve exemplos e repete em voz alta.',
      listenAnswer: 'Ouve a frase e responde à pergunta.',
      listenChoose: 'Ouve a frase e escolhe a situação.',
      writeOrSpeak: 'Escreve à mão ou apenas diz em voz alta.',
    },
  };

  const t = translations[appLanguage] || translations.ru;

  // Map task types to fixed display names based on task_id (not index!)
  const getTaskDisplayName = (task: any) => {
    // Fixed names based on task_id (1-5), not array index
    const taskId = task.task_id || 0;
    const taskNames = [t.task1, t.task2, t.task3, t.task4, t.task5];
    const translatedTitle = getTaskTitle(task, appLanguage);
    // Use task_id - 1 as index (task_id is 1-5, array index is 0-4)
    return taskNames[taskId - 1] || translatedTitle || 'Task';
  };

  const getTaskDescription = (task: any) => {
    const translatedSubtitle = getTaskSubtitle(task, appLanguage);
    if (translatedSubtitle) return translatedSubtitle;
    switch (task.type) {
      case 'vocabulary':
        return t.playListenRepeat;
      case 'rules':
        return t.listenExamples;
      case 'listening_comprehension':
        return t.listenAnswer;
      case 'attention':
        return t.listenChoose;
      case 'writing_optional':
        return t.writeOrSpeak;
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo and Language Selector */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
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
          
          {/* Language Selector */}
          <div className="flex items-center">
            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Lesson Header - New Format */}
        <div className="mb-6">
          {/* УРОК X/60 - на черной плашке (размер как кнопка "← Назад к заданиям") */}
          <div className="flex items-center gap-2 mb-3">
            <span 
              className="px-4 py-2 rounded-[10px] text-white font-medium text-sm"
              style={{ 
                backgroundColor: '#000000',
                display: 'inline-block',
              }}
            >
              {appLanguage === 'ru' ? 'УРОК' : appLanguage === 'en' ? 'LESSON' : 'LIÇÃO'} {lesson.day_number}{allLessons.length > 0 ? `/${allLessons.length}` : ''}
            </span>
            {dayInfo.estimated_time && (
              <span className="text-sm text-gray-600">
                ({dayInfo.estimated_time} {t.estimatedTime})
              </span>
            )}
          </div>

          {/* Заголовок урока - уменьшенное межстрочное расстояние при переносе на две строки */}
          <h1 className="font-bold text-black text-left leading-tight" style={{ fontSize: '29px', lineHeight: '1.2', marginBottom: '10px' }}>
            {getDayTitle(dayInfo, appLanguage)}
          </h1>

          {/* Описание урока - 10px отступ от заголовка */}
          {getDaySubtitle(dayInfo, appLanguage) && (
            <p className="text-gray-700 mb-6 text-left">
              {getDaySubtitle(dayInfo, appLanguage)}
            </p>
          )}
        </div>

        {/* Tasks List - Always visible, even when all completed */}
        <div className="mb-24" style={{ minHeight: '400px' }}>
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task: any, index: number) => {
                const status = getTaskStatus(task.task_id);
                const isClickable = status !== 'locked';
                
                // Debug: Log each task being rendered
                console.log(`🎨 Rendering task ${task.task_id} (index ${index}):`, {
                  taskId: task.task_id,
                  type: task.type,
                  title: task.title,
                  status,
                  isClickable,
                  willRender: true
                });
                
                // CRITICAL: Always render all tasks, regardless of status
                // Completed tasks should be visible for replay
                return (
                  <div
                    key={`task-${task.task_id}-${index}`}
                    onClick={() => handleTaskClick(task.task_id)}
                    className={`rounded-lg p-4 border-2 transition-all ${
                      status === 'current'
                        ? 'border-black bg-white cursor-pointer hover:bg-gray-50'
                        : status === 'completed'
                        ? 'border-green-500 bg-green-50 cursor-pointer hover:bg-green-100'
                        : 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                    }`}
                    style={{ 
                      display: 'block', 
                      visibility: 'visible',
                      opacity: status === 'locked' ? 0.6 : 1,
                      minHeight: '80px'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {status === 'completed' ? (
                          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : status === 'current' ? (
                          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <h3 className={`font-bold mb-1 ${
                          status === 'current' ? 'text-black' : status === 'completed' ? 'text-black' : 'text-gray-500'
                        }`}>
                          {getTaskDisplayName(task)}
                        </h3>
                        <p className={`text-sm ${
                          status === 'current' ? 'text-gray-700' : status === 'completed' ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {getTaskDescription(task)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-lg mb-2">
                {appLanguage === 'ru' 
                  ? 'Задачи не найдены' 
                  : appLanguage === 'en' 
                  ? 'No tasks found' 
                  : 'Tarefas não encontradas'}
              </p>
              <p className="text-sm text-gray-400">
                {appLanguage === 'ru' 
                  ? 'Проверьте консоль браузера (F12) для отладки' 
                  : appLanguage === 'en' 
                  ? 'Check browser console (F12) for debugging' 
                  : 'Verifique o console do navegador (F12) para depuração'}
              </p>
            </div>
          )}
        </div>

        {/* Lessons Navigation - Grouped by Levels - Expandable Cards */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="max-w-md mx-auto px-4 py-3 md:max-w-full md:w-full">
            <div className="overflow-x-auto -mx-4 px-4">
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {/* Render levels with their lessons */}
                {levels.map((level) => {
                  const levelLessons = allLessons.filter((l: any) => l.level_id === level.id);
                  const isExpanded = expandedLevels.has(level.id);
                  
                  // Check if current lesson belongs to this level
                  const currentLesson = allLessons.find((l: any) => l.day_number === day);
                  const isCurrentLevel = currentLesson?.level_id === level.id;
                  
                  // Green color for current level, black for others
                  const levelBackgroundColor = isCurrentLevel ? '#BEF4C2' : '#1F2937'; // Green for current, black for others
                  const levelTextColor = isCurrentLevel ? '#000000' : '#FFFFFF'; // Black text on green, white text on black

                  return (
                    <div key={level.id} className="flex-shrink-0">
                      {/* Level Card - Black (or green if current) - expands horizontally to the right */}
                      <div
                        style={{
                          backgroundColor: levelBackgroundColor,
                          borderRadius: '12px',
                          padding: isExpanded ? '12px 16px' : '10px 13px',
                          width: isExpanded ? 'auto' : '80px',
                          minWidth: '80px',
                          height: '80px',
                          display: 'flex',
                          flexDirection: isExpanded ? 'row' : 'column',
                          alignItems: isExpanded ? 'center' : 'center',
                          justifyContent: isExpanded ? 'flex-start' : 'center',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          flexShrink: 0,
                          gap: isExpanded ? '12px' : '0',
                        }}
                        className="md:h-[100px] md:w-[100px] md:min-w-[100px] md:p-[12px_16px] hover:opacity-90"
                        onClick={() => {
                          const newExpanded = new Set(expandedLevels);
                          if (newExpanded.has(level.id)) {
                            newExpanded.delete(level.id);
                          } else {
                            newExpanded.add(level.id);
                          }
                          setExpandedLevels(newExpanded);
                        }}
                      >
                        {/* Level Number and Title - Always visible */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <span 
                            className="text-2xl md:text-3xl font-bold"
                            style={{ color: levelTextColor, lineHeight: '1.2' }}
                          >
                            {level.level_number}
                          </span>
                          <span 
                            className="text-[10px] md:text-xs font-medium"
                            style={{ color: levelTextColor, marginTop: '4px' }}
                          >
                            {appLanguage === 'ru' ? 'УРОВЕНЬ' : 'LEVEL'}
                          </span>
                        </div>

                        {/* Expanded Lessons - Inside the level card, opens to the right */}
                        {isExpanded && (
                          <div className="flex gap-2 items-center flex-shrink-0">
                          {levelLessons.length > 0 ? (
                            levelLessons.map((publishedLesson: any) => {
                                // Render lesson card with smaller size inside level card
                                const lessonDay = publishedLesson.day_number;
                                const isUnlocked = isLessonUnlocked(lessonDay);
                                const progressStatus = allLessonsProgress.get(lessonDay);
                                const isCompleted = progressStatus === 'completed';
                                const isCurrent = lessonDay === day;
                                
                                // Determine icon based on status
                                let iconSrc = '/Img/eye.svg'; // default: locked
                                if (isCompleted) {
                                  iconSrc = '/Img/done.svg';
                                } else if (isCurrent) {
                                  iconSrc = '/Img/Play.svg';
                                } else if (isUnlocked) {
                                  iconSrc = '/Img/eyeopen.svg';
                                }
                                
                                // Smaller lesson cards for inside level card (56x56 on mobile, 70x70 on desktop)
                                const lessonCardStyle: React.CSSProperties = {
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  paddingTop: '6px',
                                  paddingBottom: '5px',
                                  backgroundColor: 'white',
                                  border: '1px solid #E5E7EB',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                };

                                // Completed lessons get green border
                                if (isCompleted) {
                                  lessonCardStyle.border = '2px solid #BEF4C2';
                                } else if (isCurrent) {
                                  // Current lesson gets light green border (highlighted)
                                  lessonCardStyle.border = '2px solid #BEF4C2';
                                  lessonCardStyle.backgroundColor = '#F0FDF4';
                                } else if (isUnlocked) {
                                  lessonCardStyle.border = '1px solid #D1D5DB';
                                } else {
                                  lessonCardStyle.border = '1px solid #E5E7EB';
                                  lessonCardStyle.opacity = 0.6;
                                }
                                
                                const lessonToken = userTokens.get(lessonDay) || (isUnlocked ? token : null);
                                const canNavigate = (isUnlocked || isCompleted) && lessonToken;
                                const lessonUrl = canNavigate
                                  ? `/pt/lesson/${lessonDay}/${lessonToken}/overview`
                                  : '#';

                                return (
                                  <div key={lessonDay} onClick={(e) => e.stopPropagation()}>
                                    {canNavigate ? (
                                      <Link
                                        href={lessonUrl}
                                        style={lessonCardStyle}
                                        className="transition-all hover:opacity-80 cursor-pointer"
                                      >
                                        <div className="flex-shrink-0 mb-1">
                                          <Image
                                            src={iconSrc}
                                            alt={isCompleted ? 'Completed' : isCurrent ? 'Current' : isUnlocked ? 'Unlocked' : 'Locked'}
                                            width={20}
                                            height={20}
                                            className="w-5 h-5"
                                          />
                                        </div>
                                        <span className="text-xs font-medium text-gray-700 text-center mt-auto">
                                          {lessonDay}
                                        </span>
                                      </Link>
                                    ) : (
                                      <div
                                        style={lessonCardStyle}
                                        className="transition-all cursor-not-allowed opacity-60"
                                      >
                                        <div className="flex-shrink-0 mb-1">
                                          <Image
                                            src={iconSrc}
                                            alt={isCompleted ? 'Completed' : isCurrent ? 'Current' : isUnlocked ? 'Unlocked' : 'Locked'}
                                            width={20}
                                            height={20}
                                            className="w-5 h-5"
                                          />
                                        </div>
                                        <span className="text-xs font-medium text-gray-700 text-center mt-auto">
                                          {lessonDay}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div
                                className="md:w-[70px] md:h-[70px]"
                                style={{
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                  border: '1px solid rgba(255, 255, 255, 0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  color: levelTextColor,
                                }}
                              >
                                {appLanguage === 'ru' ? 'Нет уроков' : 'No lessons'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Lessons without level */}
                {(() => {
                  const noLevelLessons = allLessons.filter((l: any) => !l.level_id);
                  if (noLevelLessons.length === 0) return null;

                  const isExpanded = expandedLevels.has('no-level');
                  const currentLesson = allLessons.find((l: any) => l.day_number === day);
                  const isCurrentLevel = !currentLesson?.level_id;
                  const levelBackgroundColor = isCurrentLevel ? '#BEF4C2' : '#1F2937';
                  const levelTextColor = isCurrentLevel ? '#000000' : '#FFFFFF';

                  return (
                    <div className="flex-shrink-0">
                      <div
                        style={{
                          backgroundColor: levelBackgroundColor,
                          borderRadius: '12px',
                          padding: isExpanded ? '12px 16px' : '10px 13px',
                          width: isExpanded ? 'auto' : '80px',
                          minWidth: '80px',
                          height: '80px',
                          display: 'flex',
                          flexDirection: isExpanded ? 'row' : 'column',
                          alignItems: isExpanded ? 'center' : 'center',
                          justifyContent: isExpanded ? 'flex-start' : 'center',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          flexShrink: 0,
                          gap: isExpanded ? '12px' : '0',
                        }}
                        className="md:h-[100px] md:w-[100px] md:min-w-[100px] md:p-[12px_16px] hover:opacity-90"
                        onClick={() => {
                          const newExpanded = new Set(expandedLevels);
                          if (newExpanded.has('no-level')) {
                            newExpanded.delete('no-level');
                          } else {
                            newExpanded.add('no-level');
                          }
                          setExpandedLevels(newExpanded);
                        }}
                      >
                        <span 
                          className="text-xs font-medium flex-shrink-0"
                          style={{ color: levelTextColor }}
                        >
                          {appLanguage === 'ru' ? 'БЕЗ УРОВНЯ' : 'NO LEVEL'}
                        </span>

                        {isExpanded && (
                          <div className="flex gap-2 items-center flex-shrink-0">
                            {noLevelLessons.map((publishedLesson: any) => {
                              const lessonDay = publishedLesson.day_number;
                              const isUnlocked = isLessonUnlocked(lessonDay);
                              const progressStatus = allLessonsProgress.get(lessonDay);
                              const isCompleted = progressStatus === 'completed';
                              const isCurrent = lessonDay === day;
                              
                              let iconSrc = '/Img/eye.svg';
                              if (isCompleted) {
                                iconSrc = '/Img/done.svg';
                              } else if (isCurrent) {
                                iconSrc = '/Img/Play.svg';
                              } else if (isUnlocked) {
                                iconSrc = '/Img/eyeopen.svg';
                              }
                              
                                const lessonCardStyle: React.CSSProperties = {
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                  paddingTop: '6px',
                                  paddingBottom: '5px',
                                  backgroundColor: 'white',
                                  border: '1px solid #E5E7EB',
                                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                };
                                
                                if (isCompleted) {
                                  lessonCardStyle.border = '2px solid #BEF4C2';
                                } else if (isCurrent) {
                                  lessonCardStyle.border = '2px solid #BEF4C2';
                                  lessonCardStyle.backgroundColor = '#F0FDF4';
                                } else if (isUnlocked) {
                                  lessonCardStyle.border = '1px solid #D1D5DB';
                                } else {
                                  lessonCardStyle.border = '1px solid #E5E7EB';
                                  lessonCardStyle.opacity = 0.6;
                                }
                                
                              const lessonToken = userTokens.get(lessonDay) || (isUnlocked ? token : null);
                              const canNavigate = (isUnlocked || isCompleted) && lessonToken;
                              // For trial users, redirect locked lessons (> 3) to payment page
                              const lessonUrl = canNavigate
                                ? `/pt/lesson/${lessonDay}/${lessonToken}/overview`
                                : lessonDay > 3 && (!subscription?.paid_at && subscription?.status !== 'active' && subscription?.status !== 'paid')
                                  ? `/pt/payment?day=${lessonDay}&token=${token}`
                                  : '#';

                              return (
                                <div key={lessonDay} onClick={(e) => e.stopPropagation()}>
                                  {canNavigate ? (
                                    <Link
                                      href={lessonUrl}
                                      style={lessonCardStyle}
                                      className="transition-all hover:opacity-80 cursor-pointer md:w-[70px] md:h-[70px] md:pt-[8px] md:pb-[6px]"
                                    >
                                      <div className="flex-shrink-0 mb-1">
                                        <Image
                                          src={iconSrc}
                                          alt={isCompleted ? 'Completed' : isCurrent ? 'Current' : isUnlocked ? 'Unlocked' : 'Locked'}
                                          width={20}
                                          height={20}
                                          className="w-5 h-5"
                                        />
                                      </div>
                                      <span className="text-xs font-medium text-gray-700 text-center mt-auto">
                                        {lessonDay}
                                      </span>
                                    </Link>
                                  ) : (
                                    <div
                                      style={lessonCardStyle}
                                      className="transition-all cursor-not-allowed opacity-60"
                                    >
                                      <div className="flex-shrink-0 mb-1">
                                        <Image
                                          src={iconSrc}
                                          alt={isCompleted ? 'Completed' : isCurrent ? 'Current' : isUnlocked ? 'Unlocked' : 'Locked'}
                                          width={20}
                                          height={20}
                                          className="w-5 h-5"
                                        />
                                      </div>
                                      <span className="text-xs font-medium text-gray-700 text-center mt-auto">
                                        {lessonDay}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <OverviewPageContent />
    </Suspense>
  );
}

