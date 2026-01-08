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
    if (!userProgress?.task_progress) {
      // If no progress, only first task is available
      const tasks = lesson?.yaml_content?.tasks || [];
      const firstTask = tasks[0];
      return firstTask?.task_id === taskId ? 'current' : 'locked';
    }
    
    const taskProgress = userProgress.task_progress.find((tp: any) => tp.task_id === taskId);
    
    // If task is completed, it should always be accessible for replay
    if (taskProgress?.status === 'completed') return 'completed';
    
    // Find first incomplete task
    const tasks = lesson?.yaml_content?.tasks || [];
    const firstIncompleteIndex = tasks.findIndex((task: any, index: number) => {
      const tp = userProgress.task_progress?.find((t: any) => t.task_id === task.task_id);
      return !tp || tp.status !== 'completed';
    });
    
    const currentTaskIndex = tasks.findIndex((t: any) => t.task_id === taskId);
    
    // If all tasks are completed, mark all as completed (accessible for replay)
    if (firstIncompleteIndex === -1) {
      return 'completed';
    }
    
    if (currentTaskIndex === firstIncompleteIndex) return 'current';
    if (currentTaskIndex < firstIncompleteIndex) return 'completed';
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

  const yamlContent = lesson.yaml_content || {};
  const dayInfo = yamlContent.day || {};
  const tasks = yamlContent.tasks || [];
  const allCompleted = userProgress.tasks_completed >= userProgress.total_tasks;

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

        {/* Tasks List */}
        <div className="space-y-3 mb-8">
          {tasks.map((task: any, index: number) => {
            const status = getTaskStatus(task.task_id);
            const isClickable = status !== 'locked';
            
            return (
              <div
                key={task.task_id}
                onClick={() => handleTaskClick(task.task_id)}
                className={`rounded-lg p-4 border-2 transition-all ${
                  status === 'current'
                    ? 'border-black bg-white cursor-pointer hover:bg-gray-50'
                    : status === 'completed'
                    ? 'border-green-500 bg-green-50 cursor-pointer hover:bg-green-100'
                    : 'border-gray-300 bg-gray-100 opacity-60 cursor-not-allowed'
                }`}
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

        {/* Completion Icon */}
        {allCompleted && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-lg font-semibold text-green-600 text-center">
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

