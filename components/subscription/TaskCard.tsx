'use client';

import { useState, useEffect } from 'react';
import VocabularyTask from './tasks/VocabularyTask';
import VocabularyTaskPlayer from './tasks/VocabularyTaskPlayer';
import RulesTask from './tasks/RulesTask';
import ListeningTask from './tasks/ListeningTask';
import AttentionTask from './tasks/AttentionTask';
import WritingTask from './tasks/WritingTask';

interface TaskCardProps {
  task: any;
  taskProgress: any;
  isUnlocked: boolean;
  language: string;
  onComplete: (completionData?: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onBackToTasks?: () => void;
  onDictionaryList?: () => void;
  dayNumber?: number;
  token?: string;
  onTimerUpdate?: (time: { elapsed: number; required: number }) => void;
  progressCompleted?: number;
  progressTotal?: number;
}

export default function TaskCard({
  task,
  taskProgress,
  isUnlocked,
  language,
  onComplete,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  onBackToTasks,
  onDictionaryList,
  dayNumber,
  token,
  onTimerUpdate,
  progressCompleted = 0,
  progressTotal = 5,
}: TaskCardProps) {
  const [isCompleted, setIsCompleted] = useState(taskProgress?.status === 'completed');

  useEffect(() => {
    const completed = taskProgress?.status === 'completed';
    console.log('📊 TaskCard: taskProgress updated', {
      taskId: task?.task_id,
      status: taskProgress?.status,
      isCompleted: completed,
      taskProgress
    });
    setIsCompleted(completed);
  }, [taskProgress, task?.task_id]);

  const handleComplete = (completionData?: any) => {
    setIsCompleted(true);
    onComplete(completionData);
  };

  const renderTask = () => {
    if (!isUnlocked) {
      return (
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <p className="text-gray-500">
            {language === 'ru'
              ? 'Сначала выполните предыдущее задание'
              : language === 'en'
              ? 'Complete the previous task first'
              : 'Complete a tarefa anterior primeiro'}
          </p>
        </div>
      );
    }

    switch (task.type) {
      case 'vocabulary':
        // Get initial card index from URL if coming from dictionary
        const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        const phraseIdParam = urlParams.get('phraseId');
        const indexParam = urlParams.get('index');
        const initialCardIndex = indexParam ? parseInt(indexParam) : undefined;
        
        return (
          <VocabularyTaskPlayer
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
            clusterColor="#94B7F2" // Default color for subscription course
            onNextTask={canGoNext ? onNext : undefined}
            onPreviousTask={canGoPrevious ? onPrevious : undefined}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            onBackToTasks={onBackToTasks}
            onDictionaryList={onDictionaryList}
            dayNumber={dayNumber}
            token={token}
            initialCardIndex={initialCardIndex}
            onTimerUpdate={task.type === 'vocabulary' ? onTimerUpdate : undefined}
            progressCompleted={progressCompleted}
            progressTotal={progressTotal}
          />
        );
      case 'rules':
        return (
          <RulesTask
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
            savedAnswers={taskProgress?.completion_data?.selectedAnswers}
            savedShowResults={taskProgress?.completion_data?.showResults}
            savedSpeakOutLoudCompleted={taskProgress?.completion_data?.speakOutLoudCompleted}
            onNextTask={canGoNext ? onNext : undefined}
            onPreviousTask={canGoPrevious ? onPrevious : undefined}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            progressCompleted={progressCompleted}
            progressTotal={progressTotal}
          />
        );
      case 'listening_comprehension':
        return (
          <ListeningTask
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
            onNextTask={canGoNext ? onNext : undefined}
            onPreviousTask={canGoPrevious ? onPrevious : undefined}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            progressCompleted={progressCompleted}
            progressTotal={progressTotal}
          />
        );
      case 'attention':
        return (
          <AttentionTask
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
            onNextTask={canGoNext ? onNext : undefined}
            onPreviousTask={canGoPrevious ? onPrevious : undefined}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            progressCompleted={progressCompleted}
            progressTotal={progressTotal}
          />
        );
      case 'writing_optional':
        return (
          <WritingTask
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
            onNextTask={canGoNext ? onNext : undefined}
            onPreviousTask={canGoPrevious ? onPrevious : undefined}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            progressCompleted={progressCompleted}
            progressTotal={progressTotal}
          />
        );
      default:
        return <div>Unknown task type: {task.type}</div>;
    }
  };

  const translations = {
    ru: {
      next: 'Следующее задание',
      previous: 'Предыдущее задание',
      completed: 'Задание выполнено',
    },
    en: {
      next: 'Next task',
      previous: 'Previous task',
      completed: 'Task completed',
    },
    pt: {
      next: 'Próxima tarefa',
      previous: 'Tarefa anterior',
      completed: 'Tarefa concluída',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  // For vocabulary task, render directly without wrapper (it has its own UI)
  if (task.type === 'vocabulary' && isUnlocked) {
    return (
      <div className="space-y-4">
        {/* Task Content - VocabularyTaskPlayer has its own full UI */}
        {renderTask()}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Task Header - Hide for rules, listening_comprehension, attention, and writing_optional tasks */}
      {task.type !== 'rules' && task.type !== 'listening_comprehension' && task.type !== 'attention' && task.type !== 'writing_optional' && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-black mb-2">{task.title}</h2>
            {task.subtitle && (
              <p className="text-gray-600 text-sm">{task.subtitle}</p>
            )}
            {task.recommended_time && (
              <p className="text-gray-500 text-xs mt-1">
                {language === 'ru' ? 'Рекомендуемое время:' : language === 'en' ? 'Recommended time:' : 'Tempo recomendado:'} {task.recommended_time}
              </p>
            )}
          </div>

          {/* Task Content */}
          {renderTask()}
        </div>
      )}

      {/* Task Content for rules, listening_comprehension, attention, and writing_optional - without header wrapper */}
      {(task.type === 'rules' || task.type === 'listening_comprehension' || task.type === 'attention' || task.type === 'writing_optional') && renderTask()}

      {/* Navigation is now handled inside each task component (cross-task navigation panel) */}
    </div>
  );
}

