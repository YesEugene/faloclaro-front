'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import Image from 'next/image';

function OverviewPageContent() {
  const params = useParams();
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  const day = parseInt(params.day as string);
  const token = params.token as string;

  const [lesson, setLesson] = useState<any>(null);
  const [userProgress, setUserProgress] = useState<any>(null);
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
    
    // If task is completed, it should always be accessible for replay
    if (taskProgress?.status === 'completed') {
      console.log(`✅ Task ${taskId} is completed - returning 'completed' status`);
      return 'completed';
    }
    
    // Find first incomplete task
    const firstIncompleteIndex = tasks.findIndex((task: any) => {
      const tp = userProgress.task_progress?.find((t: any) => t.task_id === task.task_id);
      return !tp || tp.status !== 'completed';
    });
    
    const currentTaskIndex = tasks.findIndex((t: any) => t.task_id === taskId);
    
    // If all tasks are completed, mark all as completed (accessible for replay)
    if (firstIncompleteIndex === -1) {
      console.log(`✅ All tasks completed - Task ${taskId} returning 'completed' status`);
      return 'completed';
    }
    
    if (currentTaskIndex === firstIncompleteIndex) return 'current';
    if (currentTaskIndex < firstIncompleteIndex) {
      console.log(`✅ Task ${taskId} is before incomplete task - returning 'completed' status`);
      return 'completed';
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
  const tasks = Array.isArray(yamlContent.tasks) ? yamlContent.tasks : [];
  const allCompleted = userProgress.tasks_completed >= userProgress.total_tasks;

  // Debug: Log tasks and completion status
  console.log('Overview Debug:', {
    hasLesson: !!lesson,
    hasYamlContent: !!lesson?.yaml_content,
    yamlContentType: typeof lesson?.yaml_content,
    parsedYamlContent: yamlContent,
    tasksCount: tasks.length,
    tasks: tasks.map((t: any) => ({ id: t.task_id, type: t.type, title: t.title })),
    allCompleted,
    tasksCompleted: userProgress.tasks_completed,
    totalTasks: userProgress.total_tasks,
    taskProgress: userProgress.task_progress
  });

  const translations = {
    ru: {
      day: 'День',
      estimatedTime: 'мин',
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
      estimatedTime: 'min',
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

  // Map task types to fixed display names based on index
  const getTaskDisplayName = (task: any, index: number) => {
    // Fixed names based on task order (1-5)
    const taskNames = [t.task1, t.task2, t.task3, t.task4, t.task5];
    return taskNames[index] || task.title || 'Task';
  };

  const getTaskDescription = (task: any) => {
    if (task.subtitle) return task.subtitle;
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
        {/* Day Tag - Clickable button */}
        <div className="mb-4">
          <Link 
            href="/pt"
            className="inline-block bg-gray-100 rounded-lg px-4 py-2 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <span className="text-gray-700 text-sm">
              {appLanguage === 'ru' ? 'Португальский язык за 60 дней' : appLanguage === 'en' ? 'Portuguese in 60 days' : 'Português em 60 dias'}
            </span>
          </Link>
        </div>

        {/* Day Title */}
        <h1 className="text-2xl font-bold text-black mb-2 text-left">
          {t.day} {lesson.day_number}/60: {appLanguage === 'ru' ? dayInfo.title : appLanguage === 'en' ? dayInfo.title_en : dayInfo.title_pt}
        </h1>

        {/* Estimated Time - Smaller (20% reduction) and more rounded */}
        {dayInfo.estimated_time && (
          <div className="mb-4">
            <div className="inline-block bg-gray-100 rounded-2xl px-3 py-1.5" style={{ fontSize: '0.8em' }}>
              <span className="text-gray-700 text-sm">
                {dayInfo.estimated_time} {t.estimatedTime}
              </span>
            </div>
          </div>
        )}

        {/* Subtitle/Description */}
        {dayInfo.subtitle && (
          <p className="text-gray-700 mb-8 text-left">
            {appLanguage === 'ru' ? dayInfo.subtitle : appLanguage === 'en' ? dayInfo.subtitle_en : dayInfo.subtitle_pt}
          </p>
        )}

        {/* Tasks List - Always visible, even when all completed */}
        <div className="mb-8">
          {tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.map((task: any, index: number) => {
                const status = getTaskStatus(task.task_id);
                const isClickable = status !== 'locked';
                
                return (
                  <div
                    key={task.task_id || index}
                    onClick={() => handleTaskClick(task.task_id)}
                    className={`rounded-lg p-4 border-2 transition-all ${
                      status === 'current'
                        ? 'border-black bg-white cursor-pointer hover:bg-gray-50'
                        : status === 'completed'
                        ? 'border-green-500 bg-green-50 cursor-pointer hover:bg-green-100'
                        : 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                    }`}
                    style={{ display: 'block' }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {status === 'completed' ? (
                          <Image
                            src="/Img/Day completed.png"
                            alt="Completed"
                            width={24}
                            height={24}
                            className="w-6 h-6"
                          />
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
                          {getTaskDisplayName(task, index)}
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

        {/* Completion Icon - Show below tasks, not instead of them */}
        {allCompleted && (
          <div className="flex flex-col items-center justify-center py-4 mt-4">
            <Image
              src="/Img/Day completed.png"
              alt="Day completed"
              width={80}
              height={80}
              className="w-20 h-20"
            />
            <p className="mt-3 text-base font-semibold text-green-600 text-center">
              {appLanguage === 'ru' 
                ? 'День завершён!' 
                : appLanguage === 'en' 
                ? 'Day completed!' 
                : 'Dia concluído!'}
            </p>
          </div>
        )}
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

