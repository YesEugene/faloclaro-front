'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import Image from 'next/image';
import TaskCard from './TaskCard';
import ProgressBar from './ProgressBar';

interface LessonContentProps {
  lesson: any;
  userProgress: any;
  token: string;
  onProgressUpdate: () => void;
}

export default function LessonContent({ lesson, userProgress, token, onProgressUpdate }: LessonContentProps) {
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);

  useEffect(() => {
    if (lesson?.yaml_content?.tasks) {
      setTasks(lesson.yaml_content.tasks);
      
      // Check if taskId is in URL params
      const urlParams = new URLSearchParams(window.location.search);
      const taskIdParam = urlParams.get('task');
      
      if (taskIdParam) {
        // Find task by task_id
        const taskIndex = lesson.yaml_content.tasks.findIndex((task: any) => task.task_id === parseInt(taskIdParam));
        if (taskIndex !== -1) {
          setCurrentTaskIndex(taskIndex);
          return;
        }
      }
      
      // Otherwise, find first incomplete task
      const incompleteIndex = lesson.yaml_content.tasks.findIndex((task: any, index: number) => {
        const taskProgress = userProgress.task_progress?.find((tp: any) => tp.task_id === task.task_id);
        return !taskProgress || taskProgress.status !== 'completed';
      });
      
      if (incompleteIndex !== -1) {
        setCurrentTaskIndex(incompleteIndex);
      }
    }
  }, [lesson, userProgress]);

  const handleTaskComplete = async (taskId: number, completionData?: any) => {
    try {
      // Update task progress
      const taskProgress = userProgress.task_progress?.find((tp: any) => tp.task_id === taskId);
      
      if (taskProgress) {
        // Update existing
        await supabase
          .from('task_progress')
          .update({
            status: 'completed',
            completion_data: completionData,
            completed_at: new Date().toISOString(),
          })
          .eq('id', taskProgress.id);
      } else {
        // Create new
        const task = tasks.find(t => t.task_id === taskId);
        await supabase
          .from('task_progress')
          .insert({
            user_progress_id: userProgress.id,
            task_id: taskId,
            task_type: task?.type || 'unknown',
            status: 'completed',
            completion_data: completionData,
            completed_at: new Date().toISOString(),
          });
      }

      // Update user progress
      const completedTasks = (userProgress.task_progress || []).filter(
        (tp: any) => tp.status === 'completed'
      ).length + 1;

      const allCompleted = completedTasks >= (lesson.yaml_content?.tasks?.length || 5);

      await supabase
        .from('user_progress')
        .update({
          tasks_completed: completedTasks,
          status: allCompleted ? 'completed' : 'in_progress',
          completed_at: allCompleted ? new Date().toISOString() : null,
          started_at: userProgress.started_at || new Date().toISOString(),
        })
        .eq('id', userProgress.id);

      // Reload progress
      onProgressUpdate();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleNextTask = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    }
  };

  const handlePreviousTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
    }
  };

  const getTaskProgress = (taskId: number) => {
    return userProgress.task_progress?.find((tp: any) => tp.task_id === taskId);
  };

  const isTaskUnlocked = (taskIndex: number) => {
    if (taskIndex === 0) return true;
    const previousTask = tasks[taskIndex - 1];
    const previousProgress = getTaskProgress(previousTask?.task_id);
    return previousProgress?.status === 'completed';
  };

  const yamlContent = lesson.yaml_content || {};
  const dayInfo = yamlContent.day || {};
  const progressInfo = yamlContent.progress || {};

  const translations = {
    ru: {
      day: 'День',
      back: 'Назад',
      nextTask: 'Следующее задание',
      previousTask: 'Предыдущее задание',
      allCompleted: 'Все задания выполнены!',
      completionMessage: progressInfo.completion_message || 'День завершён. Отличное начало.',
    },
    en: {
      day: 'Day',
      back: 'Back',
      nextTask: 'Next task',
      previousTask: 'Previous task',
      allCompleted: 'All tasks completed!',
      completionMessage: progressInfo.completion_message || 'Day completed. Great start.',
    },
    pt: {
      day: 'Dia',
      back: 'Voltar',
      nextTask: 'Próxima tarefa',
      previousTask: 'Tarefa anterior',
      allCompleted: 'Todas as tarefas concluídas!',
      completionMessage: progressInfo.completion_message || 'Dia concluído. Excelente começo.',
    },
  };

  const t = translations[appLanguage] || translations.ru;

  const allTasksCompleted = userProgress.tasks_completed >= userProgress.total_tasks;
  const currentTask = tasks[currentTaskIndex];
  const currentTaskProgress = currentTask ? getTaskProgress(currentTask.task_id) : null;
  const isUnlocked = isTaskUnlocked(currentTaskIndex);

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

        {/* Back and Dictionary buttons - only for vocabulary task */}
        {currentTask?.type === 'vocabulary' && (
          <div className="max-w-md mx-auto px-4 mb-[10px] flex gap-[10px]">
            <button
              onClick={() => router.push(`/pt/lesson/${lesson.day_number}/${token}/overview`)}
              className="px-4 py-2 rounded-[10px] transition-colors text-center"
              style={{ 
                backgroundColor: '#EDF3FF',
                width: 'calc(50% - 5px)',
              }}
            >
              <span className="text-gray-700">
                {appLanguage === 'ru' ? '← Назад к заданиям' : appLanguage === 'en' ? '← Back to tasks' : '← Voltar às tarefas'}
              </span>
            </button>
            <button
              onClick={() => {
                // Navigate to phrases page with lesson context
                const params = new URLSearchParams();
                params.set('lesson', lesson.day_number.toString());
                params.set('token', token);
                params.set('task', currentTask.task_id?.toString() || '1');
                params.set('phraseType', 'word');
                router.push(`/phrases?${params.toString()}`);
              }}
              className="px-4 py-2 rounded-[10px] bg-white border-2 border-gray-300 text-black hover:bg-gray-50 transition-colors text-center font-medium"
              style={{ 
                width: 'calc(50% - 5px)',
                transform: 'translateY(1px)',
                fontWeight: 500,
              }}
            >
              {appLanguage === 'ru' ? 'Словарь списком' : appLanguage === 'en' ? 'Dictionary list' : 'Lista de dicionário'}
            </button>
          </div>
        )}

        {/* Progress Bar - After buttons for vocabulary task, or standalone for other tasks */}
        <div className="max-w-md mx-auto px-4 pb-4">
          <ProgressBar
            completed={userProgress.tasks_completed}
            total={userProgress.total_tasks}
            tasks={tasks}
            getTaskProgress={getTaskProgress}
          />
        </div>
      </div>

      {/* Tasks List (Collapsed View) */}
      {allTasksCompleted && (
        <div className="max-w-md mx-auto px-4 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 font-semibold text-center">
              {t.allCompleted}
            </p>
            <p className="text-green-700 text-sm text-center mt-2">
              {t.completionMessage}
            </p>
          </div>
        </div>
      )}

      {/* Current Task */}
      {currentTask && (
        <div className="max-w-md mx-auto px-4 pb-8">
          {!isUnlocked && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm text-center">
                {appLanguage === 'ru' 
                  ? 'Сначала выполните предыдущее задание'
                  : appLanguage === 'en'
                  ? 'Complete the previous task first'
                  : 'Complete a tarefa anterior primeiro'}
              </p>
            </div>
          )}
          
          <TaskCard
            task={currentTask}
            taskProgress={currentTaskProgress}
            isUnlocked={isUnlocked}
            language={appLanguage}
            onComplete={(completionData) => handleTaskComplete(currentTask.task_id, completionData)}
            onNext={handleNextTask}
            onPrevious={handlePreviousTask}
            canGoNext={currentTaskIndex < tasks.length - 1}
            canGoPrevious={currentTaskIndex > 0}
            onBackToTasks={() => router.push(`/pt/lesson/${lesson.day_number}/${token}/overview`)}
            onDictionaryList={() => {
              // Navigate to dictionary list - we need to construct URL with cluster info
              // For now, just navigate to phrases page with task info
              router.push(`/pt/lesson/${lesson.day_number}/${token}?task=${currentTask.task_id}&dictionary=true`);
            }}
            dayNumber={lesson.day_number}
            token={token}
          />
        </div>
      )}
    </div>
  );
}

