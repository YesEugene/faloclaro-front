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
}: TaskCardProps) {
  const [isCompleted, setIsCompleted] = useState(taskProgress?.status === 'completed');

  useEffect(() => {
    setIsCompleted(taskProgress?.status === 'completed');
  }, [taskProgress]);

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
        return (
          <VocabularyTaskPlayer
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
            clusterColor="#94B7F2" // Default color for subscription course
          />
        );
      case 'rules':
        return (
          <RulesTask
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
          />
        );
      case 'listening_comprehension':
        return (
          <ListeningTask
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
          />
        );
      case 'attention':
        return (
          <AttentionTask
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
          />
        );
      case 'writing_optional':
        return (
          <WritingTask
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
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
      {/* Task Header */}
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

      {/* Navigation */}
      {isCompleted && (
        <div className="flex gap-4">
          {canGoPrevious && (
            <button
              onClick={onPrevious}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              ← {t.previous}
            </button>
          )}
          {canGoNext && (
            <button
              onClick={onNext}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {t.next} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

