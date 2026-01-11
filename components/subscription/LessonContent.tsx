'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import Image from 'next/image';
import TaskCard from './TaskCard';

interface LessonContentProps {
  lesson: any;
  userProgress: any;
  token: string;
  onProgressUpdate: () => void;
}

export default function LessonContent({ lesson, userProgress: initialUserProgress, token, onProgressUpdate }: LessonContentProps) {
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [timerData, setTimerData] = useState<{ elapsed: number; required: number } | null>(null);
  const [userProgress, setUserProgress] = useState(initialUserProgress);
  const [totalLessons, setTotalLessons] = useState<number>(0);
  
  // Update userProgress when initialUserProgress changes
  useEffect(() => {
    setUserProgress(initialUserProgress);
  }, [initialUserProgress]);

  // Load total number of published lessons
  useEffect(() => {
    const loadTotalLessons = async () => {
      try {
        const { count, error } = await supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true);
          
        if (!error && count !== null) {
          setTotalLessons(count);
        }
      } catch (err) {
        console.error('Error loading total lessons:', err);
      }
    };

    loadTotalLessons();
  }, []);

  // Track if we've initialized to prevent auto-switching after task completion
  const initializedRef = useRef(false);
  const currentTaskIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Parse yaml_content - handle both string and object
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

    // Debug: Log parsed content
    console.log('📋 LessonContent Debug:', {
      hasLesson: !!lesson,
      hasYamlContent: !!lesson?.yaml_content,
      yamlContentType: typeof lesson?.yaml_content,
      tasksCount: yamlContent.tasks?.length || 0,
      tasks: yamlContent.tasks?.map((t: any) => ({ 
        id: t.task_id, 
        type: t.type, 
        title: t.title,
        hasStructure: !!t.structure,
        hasBlocks: !!t.blocks,
        blocksOrder: t.structure?.blocks_order,
        blocksKeys: t.blocks ? Object.keys(t.blocks) : []
      })) || []
    });

    if (yamlContent.tasks) {
      setTasks(yamlContent.tasks);
      
      // Check if taskId is in URL params - always respect URL
      const urlParams = new URLSearchParams(window.location.search);
      const taskIdParam = urlParams.get('task');
      
      if (taskIdParam) {
        // Find task by task_id - allow accessing completed tasks for replay
        const taskIndex = yamlContent.tasks.findIndex((task: any) => task.task_id === parseInt(taskIdParam));
        if (taskIndex !== -1) {
          // Always respect URL - update if task changed
          if (currentTaskIdRef.current !== parseInt(taskIdParam)) {
            setCurrentTaskIndex(taskIndex);
            currentTaskIdRef.current = parseInt(taskIdParam);
            initializedRef.current = true;
          }
          return; // Don't auto-select if URL has task param
        }
      }
      
      // Only auto-select task on initial load, not after completion or manual navigation
      // If initializedRef is true, user has already navigated manually - don't override
      if (!initializedRef.current) {
        // Find first incomplete task
        // But if all tasks are completed, show first task for replay
        const incompleteIndex = yamlContent.tasks.findIndex((task: any, index: number) => {
          const taskProgress = userProgress.task_progress?.find((tp: any) => tp.task_id === task.task_id);
          return !taskProgress || taskProgress.status !== 'completed';
        });
        
        if (incompleteIndex !== -1) {
          setCurrentTaskIndex(incompleteIndex);
          currentTaskIdRef.current = yamlContent.tasks[incompleteIndex]?.task_id || null;
          // Update URL to reflect selected task
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.set('task', String(yamlContent.tasks[incompleteIndex]?.task_id));
          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          window.history.replaceState({}, '', newUrl);
        } else {
          // All tasks completed - show first task for replay
          setCurrentTaskIndex(0);
          currentTaskIdRef.current = yamlContent.tasks[0]?.task_id || null;
          // Update URL to reflect first task
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.set('task', String(yamlContent.tasks[0]?.task_id));
          const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
          window.history.replaceState({}, '', newUrl);
        }
        initializedRef.current = true;
      }
    }
  }, [lesson, userProgress]);

  const handleTaskComplete = async (taskId: number, completionData?: any) => {
    try {
      // If this is just saving (not completing), update completion_data only
      if (completionData?.saved && !completionData?.replay) {
        const taskProgress = userProgress.task_progress?.find((tp: any) => tp.task_id === taskId);
        const task = tasks.find(t => t.task_id === taskId);
        
        // Always use upsert to handle both insert and update cases
        // This avoids 400 errors when record exists in local state but not in DB
        const { error } = await supabase
          .from('task_progress')
          .upsert({
            user_progress_id: userProgress.id,
            task_id: taskId,
            task_type: task?.type || 'unknown',
            status: taskProgress?.status || 'in_progress', // Preserve existing status if available
            completion_data: completionData,
          }, {
            onConflict: 'user_progress_id,task_id',
          });
        
        if (error) {
          console.error('Error upserting task_progress (saved):', error);
        }
        // Update local state
        const updatedTaskProgress = userProgress.task_progress?.map((tp: any) => 
          tp.task_id === taskId ? { ...tp, completion_data: completionData } : tp
        ) || [];
        if (!userProgress.task_progress?.some((tp: any) => tp.task_id === taskId)) {
          updatedTaskProgress.push({
            task_id: taskId,
            status: 'in_progress',
            completion_data: completionData,
          });
        }
        setUserProgress({
          ...userProgress,
          task_progress: updatedTaskProgress,
        });
        return; // Don't mark as completed, just save data
      }
      
      // If replaying, clear completion_data and reset status to in_progress
      if (completionData?.replay) {
        const task = tasks.find(t => t.task_id === taskId);
        
        // Always use upsert to handle both insert and update cases
        const { error } = await supabase
          .from('task_progress')
          .upsert({
            user_progress_id: userProgress.id,
            task_id: taskId,
            task_type: task?.type || 'unknown',
            status: 'in_progress',
            completion_data: completionData, // Empty answers and showResults
            completed_at: null,
          }, {
            onConflict: 'user_progress_id,task_id',
          });
        
        if (error) {
          console.error('Error upserting task_progress on replay:', error);
        }
        
        // Update local state to reflect replay
        setUserProgress((prev: any) => {
          const updatedTaskProgress = prev.task_progress?.map((tp: any) => 
            tp.task_id === taskId ? { ...tp, status: 'in_progress', completion_data: completionData, completed_at: null } : tp
          ) || [];
          
          // Recalculate tasks_completed (exclude this task if it was completed)
          const tasksCompleted = updatedTaskProgress.filter((tp: any) => tp.status === 'completed').length;
          
          return {
            ...prev,
            task_progress: updatedTaskProgress,
            tasks_completed: tasksCompleted,
            status: tasksCompleted >= prev.total_tasks ? 'completed' : 'in_progress',
          };
        });
        
        return; // Don't continue with completion logic on replay
      }
      
      // Update task progress - mark as completed
      const taskProgress = userProgress.task_progress?.find((tp: any) => tp.task_id === taskId);
      const wasAlreadyCompleted = taskProgress?.status === 'completed';
      const task = tasks.find(t => t.task_id === taskId);
      
      // Always use upsert to handle both insert and update cases
      // This avoids 400 errors when record exists in local state but not in DB
      const { error } = await supabase
        .from('task_progress')
        .upsert({
          user_progress_id: userProgress.id,
          task_id: taskId,
          task_type: task?.type || 'unknown',
          status: 'completed',
          completion_data: completionData, // Always update with latest answers/progress
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_progress_id,task_id',
        });
      
      if (error) {
        console.error('Error upserting task_progress (completed):', error);
      }

      // Update user progress - count completed tasks correctly
      // If task was already completed, don't add +1
      const currentCompletedCount = (userProgress.task_progress || []).filter(
        (tp: any) => tp.status === 'completed'
      ).length;
      const completedTasks = wasAlreadyCompleted ? currentCompletedCount : currentCompletedCount + 1;

      // Parse yaml_content for task count
      let yamlContent: any = {};
      if (lesson?.yaml_content) {
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
      const allCompleted = completedTasks >= (yamlContent.tasks?.length || 5);

      await supabase
        .from('user_progress')
        .update({
          tasks_completed: completedTasks,
          status: allCompleted ? 'completed' : 'in_progress',
          completed_at: allCompleted ? new Date().toISOString() : null,
          started_at: userProgress.started_at || new Date().toISOString(),
        })
        .eq('id', userProgress.id);

      // Update local state immediately to reflect completion
      // This ensures isCompleted is set correctly in TaskCard
      const updatedTaskProgress = userProgress.task_progress?.map((tp: any) => 
        tp.task_id === taskId ? { ...tp, status: 'completed', completed_at: new Date().toISOString() } : tp
      ) || [];
      
      // If task progress didn't exist, add it
      if (!taskProgress) {
        updatedTaskProgress.push({
          task_id: taskId,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }
      
      // Update local state immediately to reflect completion
      // This ensures isCompleted is set correctly in TaskCard
      // But DON'T trigger task switch - user should stay on current task
      setUserProgress((prev: any) => {
        const updatedTaskProgress = prev.task_progress?.map((tp: any) => 
          tp.task_id === taskId ? { ...tp, status: 'completed', completed_at: new Date().toISOString(), completion_data: completionData } : tp
        ) || [];
        
        // If task progress didn't exist, add it
        if (!prev.task_progress?.some((tp: any) => tp.task_id === taskId)) {
          updatedTaskProgress.push({
            task_id: taskId,
            status: 'completed',
            completed_at: new Date().toISOString(),
            completion_data: completionData,
          });
        }
        
        return {
          ...prev,
          task_progress: updatedTaskProgress,
          tasks_completed: completedTasks,
          status: allCompleted ? 'completed' : 'in_progress',
          completed_at: allCompleted ? new Date().toISOString() : null,
        };
      });
      
      // Reload progress in background - don't wait for it
      // This updates the database but won't cause immediate re-render that switches tasks
      // Call onProgressUpdate without await to avoid blocking
      try {
        onProgressUpdate();
      } catch (err) {
        console.error('Error in background progress update:', err);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const handleNextTask = () => {
    if (currentTaskIndex < tasks.length - 1) {
      const nextIndex = currentTaskIndex + 1;
      const nextTaskId = tasks[nextIndex]?.task_id;
      setCurrentTaskIndex(nextIndex);
      currentTaskIdRef.current = nextTaskId || null;
      initializedRef.current = true; // Mark as initialized to prevent auto-switch
      
      // Update URL to reflect current task
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('task', String(nextTaskId));
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const handlePreviousTask = () => {
    if (currentTaskIndex > 0) {
      const prevIndex = currentTaskIndex - 1;
      const prevTaskId = tasks[prevIndex]?.task_id;
      setCurrentTaskIndex(prevIndex);
      currentTaskIdRef.current = prevTaskId || null;
      initializedRef.current = true; // Mark as initialized to prevent auto-switch
      
      // Update URL to reflect current task
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set('task', String(prevTaskId));
      const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const getTaskProgress = (taskId: number) => {
    return userProgress.task_progress?.find((tp: any) => tp.task_id === taskId);
  };

  const isTaskUnlocked = (taskIndex: number) => {
    // All tasks are always unlocked - user can proceed to any task at any time
    // Timer is optional, so tasks don't need to be completed before proceeding
    return true;
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleTimerUpdate = (time: { elapsed: number; required: number }) => {
    setTimerData(time);
  };

  // Parse yaml_content - handle both string and object
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
      <div className="sticky top-0 bg-white z-20" style={{ borderBottomWidth: '0px', borderWidth: '0px' }}>
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

        {/* Back button - for all tasks */}
        {currentTask && (
          <>
            <div className="max-w-md mx-auto px-4 mb-[10px] flex gap-[10px]" style={{ paddingBottom: '10px', position: 'relative', zIndex: 20 }}>
              <button
                onClick={() => router.push(`/pt/lesson/${lesson.day_number}/${token}/overview`)}
                className="px-4 py-2 rounded-[10px] transition-colors text-center"
                style={{ 
                  backgroundColor: '#EDF3FF',
                  width: currentTask?.type === 'vocabulary' ? 'calc(50% - 5px)' : '100%',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <span className="text-gray-700">
                  {appLanguage === 'ru' 
                    ? `← УРОК ${lesson.day_number}` 
                    : appLanguage === 'en' 
                    ? `← LESSON ${lesson.day_number}` 
                    : `← LIÇÃO ${lesson.day_number}`}
                </span>
              </button>
              {/* Dictionary button - only for vocabulary task */}
              {currentTask?.type === 'vocabulary' && (
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
                  {appLanguage === 'ru' ? 'СЛОВАРЬ' : appLanguage === 'en' ? 'DICTIONARY' : 'DICIONÁRIO'}
                </button>
              )}
            </div>
          </>
        )}

        {/* Progress Bar is now in each task component (above navigation panel) */}
      </div>

      {/* Tasks List (Collapsed View) */}

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
            onTimerUpdate={currentTask?.type === 'vocabulary' ? handleTimerUpdate : undefined}
            progressCompleted={userProgress.tasks_completed || 0}
            progressTotal={userProgress.total_tasks || 5}
          />
        </div>
      )}
    </div>
  );
}

