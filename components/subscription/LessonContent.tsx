'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import Link from 'next/link';
import Image from 'next/image';
import { SettingsPanel } from '@/components/subscription/ui/SettingsPanel';
import { LessonMenuSheet } from '@/components/subscription/ui/LessonMenuSheet';
import { CourseMenuDrawer } from '@/components/subscription/ui/CourseMenuDrawer';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lessonMenuOpen, setLessonMenuOpen] = useState(false);
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  
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

      // Get user ID for email sending
      const { data: tokenData } = await supabase
        .from('lesson_access_tokens')
        .select('user_id')
        .eq('token', token)
        .single();

      await supabase
        .from('user_progress')
        .update({
          tasks_completed: completedTasks,
          status: allCompleted ? 'completed' : 'in_progress',
          completed_at: allCompleted ? new Date().toISOString() : null,
          started_at: userProgress.started_at || new Date().toISOString(),
        })
        .eq('id', userProgress.id);

      // Mark learning activity (stops inactivity campaign)
      try {
        await fetch('/api/subscription/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonToken: token }),
        });
      } catch (err) {
        console.error('Error marking activity:', err);
      }

      // Lesson completed event (day3 congrats/payment campaign, module/course completion)
      if (allCompleted) {
        try {
          await fetch('/api/subscription/events/lesson-completed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonToken: token, dayNumber: lesson.day_number }),
          });
        } catch (err) {
          console.error('Error sending lesson-completed event:', err);
        }
      }

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

  const handleNextLesson = async () => {
    try {
      // Get next lesson
      const nextDayNumber = lesson.day_number + 1;
      
      // Get user ID from token
      const { data: tokenData } = await supabase
        .from('lesson_access_tokens')
        .select('user_id')
        .eq('token', token)
        .single();

      if (!tokenData) {
        console.error('Token not found');
        return;
      }

      // Check subscription status
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('status, paid_at')
        .eq('user_id', tokenData.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const hasPaidAccess = subscriptionData?.status === 'active' || subscriptionData?.status === 'paid' || subscriptionData?.paid_at;

      // If trying to access lesson > 3 without paid access, redirect to payment
      if (nextDayNumber > 3 && !hasPaidAccess) {
        router.push(`/pt/payment?day=${nextDayNumber}&token=${token}`);
        return;
      }
      
      // Check if next lesson exists
      const { data: nextLesson, error: lessonError } = await supabase
        .from('lessons')
        .select('id, day_number, is_published')
        .eq('day_number', nextDayNumber)
        .eq('is_published', true)
        .single();

      if (lessonError || !nextLesson) {
        // No next lesson available - redirect to course overview
        router.push('/pt/course');
        return;
      }

      // Get or create token for next lesson
      const { data: nextTokenData, error: tokenError } = await supabase
        .from('lesson_access_tokens')
        .select('token')
        .eq('user_id', tokenData.user_id)
        .eq('lesson_id', nextLesson.id)
        .single();

      if (tokenError && tokenError.code === 'PGRST116') {
        // Token doesn't exist, create it
        // Generate random token using Web Crypto API (browser-compatible)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        const newToken = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        
        const { data: newTokenData, error: createError } = await supabase
          .from('lesson_access_tokens')
          .insert({
            user_id: tokenData.user_id,
            lesson_id: nextLesson.id,
            token: newToken,
            expires_at: null, // Never expires
          })
          .select('token')
          .single();

        if (createError || !newTokenData) {
          console.error('Error creating token:', createError);
          return;
        }

        // Navigate to next lesson (start from task 1; /overview is deprecated)
        router.push(`/pt/lesson/${nextDayNumber}/${newTokenData.token}?task=1`);
      } else if (nextTokenData) {
        // Token exists, navigate to next lesson
        router.push(`/pt/lesson/${nextDayNumber}/${nextTokenData.token}?task=1`);
      }
    } catch (error) {
      console.error('Error navigating to next lesson:', error);
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

  const completedTaskIds = useMemo(() => {
    const set = new Set<number>();
    const tps = userProgress?.task_progress || [];
    for (const tp of tps) {
      if (tp?.status === 'completed' && Number.isFinite(Number(tp?.task_id))) {
        set.add(Number(tp.task_id));
      }
    }
    return set;
  }, [userProgress]);

  const selectTaskById = (taskId: number) => {
    const idx = tasks.findIndex((t) => Number(t?.task_id) === Number(taskId));
    if (idx === -1) return;
    setCurrentTaskIndex(idx);
    currentTaskIdRef.current = Number(taskId);
    initializedRef.current = true;

    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('task', String(taskId));
    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.pushState({}, '', newUrl);

    setLessonMenuOpen(false);
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
  const totalTasksCount = tasks.length || userProgress.total_tasks || 5;
  const currentTaskNumber = Math.min(Math.max(currentTaskIndex + 1, 1), totalTasksCount);
  const headerProgressPct = Math.min(100, Math.max(0, (currentTaskNumber / totalTasksCount) * 100));


  const currentTaskProgress = currentTask ? getTaskProgress(currentTask.task_id) : null;
  const isUnlocked = isTaskUnlocked(currentTaskIndex);

  // Ensure each task opens at top (prevents starting Task 5 already scrolled down).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // next tick to avoid fighting with layout/portals
    setTimeout(() => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      } catch {
        window.scrollTo(0, 0);
      }
    }, 0);
  }, [currentTaskIndex]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Logo and Language Selector */}
      <div className="sticky top-0 bg-white z-20" style={{ borderBottomWidth: '0px', borderWidth: '0px' }}>
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <a href="https://faloclaro.com" className="flex items-center cursor-pointer">
            <Image
              src="/Img/Website/logo.svg"
              alt="FaloClaro"
              width={120}
              height={40}
              className="h-10 w-auto"
              style={{ width: 'auto', height: '40px' }}
            />
          </a>
          
          {/* Settings */}
          <div className="flex items-center">
            <button
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              style={{ width: '29px', height: '29px', padding: 0, background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Image
                src="/Img/Website/Settings.svg"
                alt="Settings"
                width={29}
                height={29}
                style={{ width: '29px', height: '29px' }}
              />
            </button>
          </div>
        </div>

        {/* Lesson navigation + dictionary + progress */}
        {currentTask && (
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
                  <span>
                    {appLanguage === 'ru'
                      ? 'Меню курса'
                      : appLanguage === 'en'
                      ? 'Course menu'
                      : 'Menu do curso'}
                  </span>
                </span>
              </button>

              {currentTask?.type === 'vocabulary' && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('lesson', lesson.day_number.toString());
                    params.set('token', token);
                    params.set('task', currentTask.task_id?.toString() || '1');
                    params.set('phraseType', 'word');
                    router.push(`/phrases?${params.toString()}`);
                  }}
                  className="text-black"
                  style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    lineHeight: '1.2',
                    background: 'transparent',
                    padding: 0,
                    textAlign: 'right',
                  }}
                >
                  {appLanguage === 'ru' ? 'Словарь урока' : appLanguage === 'en' ? 'Lesson dictionary' : 'Dicionário da lição'}
                </button>
              )}
            </div>

            <div style={{ marginTop: '14px' }}>
              <div
                style={{
                  height: '2px',
                  backgroundColor: '#EDEDED',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '2px',
                    width: `${headerProgressPct}%`,
                    backgroundColor: '#34BF5D',
                  }}
                />
              </div>

              <div style={{ marginTop: '4px', fontSize: '12px', color: 'rgba(0,0,0,0.85)' }}>
                {appLanguage === 'ru'
                  ? `Задание ${currentTaskNumber}/${totalTasksCount}`
                  : appLanguage === 'en'
                  ? `Task ${currentTaskNumber}/${totalTasksCount}`
                  : `Tarefa ${currentTaskNumber}/${totalTasksCount}`}
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar is now in each task component (above navigation panel) */}
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} lessonToken={token} />

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
            onNextLesson={handleNextLesson}
            canGoNext={currentTaskIndex < tasks.length - 1}
            canGoPrevious={currentTaskIndex > 0}
            isLastTask={currentTaskIndex === tasks.length - 1}
            onBackToTasks={() => router.push(`/pt/lesson/${lesson.day_number}/${token}?task=1`)}
            onDictionaryList={() => {
              // Navigate to dictionary list - we need to construct URL with cluster info
              // For now, just navigate to phrases page with task info
              router.push(`/pt/lesson/${lesson.day_number}/${token}?task=${currentTask.task_id}&dictionary=true`);
            }}
            onOpenLessonMenu={() => setLessonMenuOpen((v) => !v)}
            lessonMenuOpen={lessonMenuOpen}
            dayNumber={lesson.day_number}
            token={token}
            onTimerUpdate={currentTask?.type === 'vocabulary' ? handleTimerUpdate : undefined}
            progressCompleted={userProgress.tasks_completed || 0}
            progressTotal={userProgress.total_tasks || 5}
          />
        </div>
      )}

      <LessonMenuSheet
        open={lessonMenuOpen}
        lang={appLanguage}
        tasks={tasks}
        currentTaskId={currentTask?.task_id || 1}
        completedTaskIds={completedTaskIds}
        onSelectTaskId={selectTaskById}
        onClose={() => setLessonMenuOpen(false)}
      />

      <CourseMenuDrawer
        open={courseMenuOpen}
        lang={appLanguage}
        currentDay={lesson.day_number}
        currentToken={token}
        activeEntry="lesson"
        onClose={() => setCourseMenuOpen(false)}
      />
    </div>
  );
}

