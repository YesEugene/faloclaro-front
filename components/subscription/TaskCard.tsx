'use client';

import { useState, useEffect } from 'react';
import VocabularyTask from './tasks/VocabularyTask';
import VocabularyTaskPlayer from './tasks/VocabularyTaskPlayer';
import RulesTask from './tasks/RulesTask';
import ListeningTask from './tasks/ListeningTask';
import AttentionTask from './tasks/AttentionTask';
import WritingTask from './tasks/WritingTask';
import { getTaskTitle, getTaskSubtitle } from '@/lib/lesson-translations';
import { useAppLanguage } from '@/lib/language-context';

interface TaskCardProps {
  task: any;
  taskProgress: any;
  isUnlocked: boolean;
  language: string;
  onComplete: (completionData?: any) => void;
  onNext: () => void;
  onPrevious: () => void;
  onNextLesson?: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastTask?: boolean;
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
  onNextLesson,
  canGoNext,
  canGoPrevious,
  isLastTask = false,
  onBackToTasks,
  onDictionaryList,
  dayNumber,
  token,
  onTimerUpdate,
  progressCompleted = 0,
  progressTotal = 5,
}: TaskCardProps) {
  const { language: appLanguage } = useAppLanguage();
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
    // If replaying, don't set as completed - keep current status
    if (completionData?.replay) {
      setIsCompleted(false);
      onComplete(completionData);
      return;
    }
    
    // Only set as completed if not just saving and not replaying
    if (!completionData?.saved) {
      setIsCompleted(true);
    }
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
        
        // CRITICAL: Transform task structure if needed - support multiple formats
        // VocabularyTaskPlayer expects task.content.cards, but import may use different structure
        let vocabularyTask = task;
        
        // Debug: Log original task structure for troubleshooting
        console.log('📋 VocabularyTask original structure:', {
          hasContent: !!task.content,
          hasCards: !!task.content?.cards,
          cardsCount: task.content?.cards?.length || 0,
          hasBlocks: !!task.blocks,
          blocksIsArray: Array.isArray(task.blocks),
          blocksCount: Array.isArray(task.blocks) ? task.blocks.length : (typeof task.blocks === 'object' && task.blocks ? Object.keys(task.blocks).length : 0),
          blocksType: typeof task.blocks,
          blocksKeys: typeof task.blocks === 'object' && task.blocks && !Array.isArray(task.blocks) ? Object.keys(task.blocks) : [],
          hasStructure: !!task.structure,
          structureBlocksOrder: task.structure?.blocks_order,
          taskKeys: Object.keys(task),
        });
        
        // If no content.cards, try to extract from various structures
        if (!task.content?.cards || (Array.isArray(task.content.cards) && task.content.cards.length === 0)) {
          const cards: any[] = [];
          
          // Try 1: Extract from blocks array (if blocks is an array)
          if (task.blocks && Array.isArray(task.blocks)) {
            task.blocks.forEach((block: any) => {
              if (block.block_type === 'vocabulary_card' || block.type === 'vocabulary_card' || block.content?.word) {
                if (block.content?.cards && Array.isArray(block.content.cards)) {
                  cards.push(...block.content.cards);
                } else if (block.content?.word) {
                  cards.push(block.content);
                }
              }
            });
          }
          
          // Try 2: Extract from blocks object (if blocks is an object with keys)
          if (cards.length === 0 && task.blocks && typeof task.blocks === 'object' && !Array.isArray(task.blocks)) {
            Object.values(task.blocks).forEach((block: any) => {
              if (block && (block.block_type === 'vocabulary_card' || block.type === 'vocabulary_card' || block.content?.word)) {
                if (block.content?.cards && Array.isArray(block.content.cards)) {
                  cards.push(...block.content.cards);
                } else if (block.content?.word) {
                  cards.push(block.content);
                }
              }
            });
          }
          
          // Try 3: Extract from structure.blocks_order (if structure exists)
          if (cards.length === 0 && task.structure?.blocks_order && Array.isArray(task.structure.blocks_order)) {
            task.structure.blocks_order.forEach((blockKey: string) => {
              const block = task.blocks && typeof task.blocks === 'object' && !Array.isArray(task.blocks) 
                ? task.blocks[blockKey]
                : null;
              if (block && (block.block_type === 'vocabulary_card' || block.type === 'vocabulary_card' || block.content?.word)) {
                if (block.content?.cards && Array.isArray(block.content.cards)) {
                  cards.push(...block.content.cards);
                } else if (block.content?.word) {
                  cards.push(block.content);
                }
              }
            });
          }
          
          // Try 4: If task has direct cards array (fallback)
          if (cards.length === 0 && task.cards && Array.isArray(task.cards)) {
            cards.push(...task.cards);
          }
          
          // If cards were found, create transformed task
          if (cards.length > 0) {
            vocabularyTask = {
              ...task,
              content: {
                ...task.content,
                cards: cards,
              },
            };
            console.log('✅ Transformed vocabulary task - extracted', cards.length, 'cards');
          } else {
            console.warn('⚠️ No cards found in vocabulary task - task structure may be incorrect');
          }
        } else {
          console.log('✅ Vocabulary task already has content.cards - using as-is');
        }
        
        // Final check: ensure content.cards exists and is an array
        if (!vocabularyTask.content) {
          vocabularyTask = { ...vocabularyTask, content: {} };
        }
        if (!vocabularyTask.content.cards || !Array.isArray(vocabularyTask.content.cards)) {
          vocabularyTask.content.cards = [];
        }
        
        return (
          <VocabularyTaskPlayer
            task={vocabularyTask}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
            clusterColor="#94B7F2" // Default color for subscription course
            onNextTask={onNext}
            onPreviousTask={onPrevious}
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
            onNextTask={onNext}
            onPreviousTask={onPrevious}
            onNextLesson={onNextLesson}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            isLastTask={isLastTask}
            progressCompleted={progressCompleted}
            progressTotal={progressTotal}
          />
        );
      case 'listening_comprehension':
        // If completion_data is empty (replay was called), don't pass saved data
        const listeningSavedAnswers = taskProgress?.completion_data?.answers && Object.keys(taskProgress.completion_data.answers).length > 0
          ? taskProgress.completion_data.answers
          : undefined;
        const listeningSavedShowResults = taskProgress?.completion_data?.showResults && Object.keys(taskProgress.completion_data.showResults).length > 0
          ? taskProgress.completion_data.showResults
          : undefined;
        
        // Transform task if needed - extract items from blocks if using new structure
        let listeningTask = task;
        if (!task.items || (Array.isArray(task.items) && task.items.length === 0)) {
          const items: any[] = [];
          
          // Try to extract items from blocks (new structure)
          if (task.blocks && Array.isArray(task.blocks)) {
            task.blocks.forEach((block: any) => {
              if (block.block_type === 'listen_phrase' && block.content?.items) {
                items.push(...block.content.items);
              }
            });
          }
          
          // If items were found, create transformed task
          if (items.length > 0) {
            listeningTask = {
              ...task,
              items: items,
            };
            console.log('✅ Transformed listening task - extracted', items.length, 'items from blocks');
          }
        }
        
        return (
          <ListeningTask
            task={listeningTask}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
            savedAnswers={listeningSavedAnswers}
            savedShowResults={listeningSavedShowResults}
            onNextTask={onNext}
            onPreviousTask={onPrevious}
            onNextLesson={onNextLesson}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            isLastTask={isLastTask}
            progressCompleted={progressCompleted}
            progressTotal={progressTotal}
          />
        );
      case 'attention':
        // If completion_data is empty (replay was called), don't pass saved data
        const attentionSavedAnswers = taskProgress?.completion_data?.answers && Object.keys(taskProgress.completion_data.answers).length > 0
          ? taskProgress.completion_data.answers
          : undefined;
        const attentionSavedShowResults = taskProgress?.completion_data?.showResults && Object.keys(taskProgress.completion_data.showResults).length > 0
          ? taskProgress.completion_data.showResults
          : undefined;
        
        return (
          <AttentionTask
            task={task}
            language={language}
            onComplete={handleComplete}
            isCompleted={isCompleted}
            savedAnswers={attentionSavedAnswers}
            savedShowResults={attentionSavedShowResults}
            onNextTask={onNext}
            onPreviousTask={onPrevious}
            onNextLesson={onNextLesson}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            isLastTask={isLastTask}
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
            savedWrittenText={taskProgress?.completion_data?.writtenText}
            savedSpeakOutLoud={taskProgress?.completion_data?.speakOutLoud}
            onNextTask={onNext}
            onPreviousTask={onPrevious}
            onNextLesson={onNextLesson}
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            isLastTask={isLastTask}
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
            <h2 className="text-xl font-bold text-black mb-2">{getTaskTitle(task, appLanguage)}</h2>
            {getTaskSubtitle(task, appLanguage) && (
              <p className="text-gray-600 text-sm">{getTaskSubtitle(task, appLanguage)}</p>
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

