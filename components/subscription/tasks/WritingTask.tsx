'use client';

import { useState, useEffect } from 'react';
import { useAppLanguage } from '@/lib/language-context';

interface WritingTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
  onNextTask?: () => void;
  onPreviousTask?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  progressCompleted?: number;
  progressTotal?: number;
}

export default function WritingTask({ task, language, onComplete, isCompleted, onNextTask, onPreviousTask, canGoNext = false, canGoPrevious = false, progressCompleted = 0, progressTotal = 5 }: WritingTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [writtenText, setWrittenText] = useState('');
  const [speakOutLoud, setSpeakOutLoud] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);

  // Get progress message based on completed tasks
  const getProgressMessage = (completed: number, total: number) => {
    if (appLanguage === 'ru') {
      if (completed === 1) return `${completed} / ${total} выполнено. Назад дороги нет.`;
      if (completed === 2) return `${completed} / ${total} выполнено. Поймали ритм.`;
      if (completed === 3) return `${completed} / ${total} выполнено. Ты просто Вау!`;
      if (completed === 4) return `${completed} / ${total} выполнено. Почти финиш.`;
      if (completed === 5) return `${completed} / ${total} выполнено. Можно собой гордиться.`;
      return `${completed} / ${total} выполнено`;
    } else if (appLanguage === 'en') {
      if (completed === 1) return `${completed} / ${total} completed. No turning back.`;
      if (completed === 2) return `${completed} / ${total} completed. Catching the rhythm.`;
      if (completed === 3) return `${completed} / ${total} completed. You're just Wow!`;
      if (completed === 4) return `${completed} / ${total} completed. Almost finish.`;
      if (completed === 5) return `${completed} / ${total} completed. You can be proud.`;
      return `${completed} / ${total} completed`;
    } else {
      if (completed === 1) return `${completed} / ${total} concluído. Não há volta.`;
      if (completed === 2) return `${completed} / ${total} concluído. Pegando o ritmo.`;
      if (completed === 3) return `${completed} / ${total} concluído. Você é simplesmente Uau!`;
      if (completed === 4) return `${completed} / ${total} concluído. Quase no fim.`;
      if (completed === 5) return `${completed} / ${total} concluído. Pode se orgulhar.`;
      return `${completed} / ${total} concluído`;
    }
  };

  // Reset state when replaying
  useEffect(() => {
    if (isCompleted && !isReplaying) {
      // Allow replay by resetting state
      setWrittenText('');
      setSpeakOutLoud(false);
      setShowExample(false);
    }
  }, [isCompleted, isReplaying]);

  const handleComplete = () => {
    if (speakOutLoud || writtenText.trim()) {
      onComplete({
        writtenText: speakOutLoud ? null : writtenText,
        speakOutLoud,
        completedAt: new Date().toISOString(),
      });
      setIsReplaying(false);
    }
  };

  // Don't hide task when completed - show it so user can replay
  if (!task) {
    return (
      <div className="text-center text-gray-500">
        {appLanguage === 'ru' ? 'Задание не найдено' : appLanguage === 'en' ? 'Task not found' : 'Tarefa não encontrada'}
      </div>
    );
  }

  const instructionText = task.instruction?.text || task.instruction || '';
  const mainTask = task.main_task || {};
  const template = mainTask.template || task.template || [];
  const hints = mainTask.hints || task.hints || [];
  const example = task.example || {};
  const alternative = task.alternative || {};
  const reflection = task.reflection || {};

  return (
    <div className="space-y-6 w-full">
      {/* Task Content - Full width - Always show, even if completed */}
      <div className="rounded-lg border-2 border-gray-200 p-6 w-full" style={{ backgroundColor: '#F4F5F8' }}>
        <div className="space-y-4">
          {/* Instruction */}
          {instructionText && (
            <div 
              className="rounded-lg p-4"
              style={{ 
                borderWidth: '1px',
                borderColor: 'rgba(194, 194, 194, 1)',
                borderStyle: 'solid',
                backgroundColor: '#F4F5F8'
              }}
            >
              <p className="text-black font-medium whitespace-pre-line">{instructionText}</p>
            </div>
          )}

          {/* Template */}
          {template.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-black mb-2">
                {appLanguage === 'ru' ? 'Шаблон:' : appLanguage === 'en' ? 'Template:' : 'Modelo:'}
              </p>
              {template.map((line: string, index: number) => (
                <div
                  key={index}
                  className="w-full px-4 rounded-lg flex items-center"
                  style={{
                    height: '55px',
                    backgroundColor: 'white',
                    border: 'none'
                  }}
                >
                  <p className="text-black font-mono text-sm">{line}</p>
                </div>
              ))}
            </div>
          )}

          {/* Hints */}
          {hints.length > 0 && (
            <div 
              className="rounded-lg p-4"
              style={{ 
                borderWidth: '1px',
                borderColor: 'rgba(194, 194, 194, 1)',
                borderStyle: 'solid',
                backgroundColor: '#F4F5F8'
              }}
            >
              <p className="text-sm font-semibold text-black mb-2">
                {appLanguage === 'ru' ? 'Подсказки:' : appLanguage === 'en' ? 'Hints:' : 'Dicas:'}
              </p>
              <ul className="list-disc list-inside space-y-1">
                {hints.map((hint: string, index: number) => (
                  <li key={index} className="text-sm text-black" style={{ marginTop: '2px', marginBottom: '2px' }}>
                    {hint}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Writing Area (if not using speak out loud alternative) */}
          {!speakOutLoud && (
            <div>
              <textarea
                value={writtenText}
                onChange={(e) => setWrittenText(e.target.value)}
                placeholder={appLanguage === 'ru' ? 'Напишите здесь...' : appLanguage === 'en' ? 'Write here...' : 'Escreve aqui...'}
                className="w-full px-4 py-3 rounded-lg resize-none text-black"
                style={{
                  minHeight: '120px',
                  backgroundColor: 'white',
                  border: 'none'
                }}
              />
            </div>
          )}

          {/* Example - Show by button */}
          {example.show_by_button && example.content && (
            <div className="space-y-2">
              {!showExample && (
                <button
                  onClick={() => setShowExample(true)}
                  className="w-full px-4 py-3 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: '#EDF3FF',
                    color: 'rgb(55, 65, 81)',
                    border: 'none'
                  }}
                >
                  {example.button_text || (appLanguage === 'ru' ? 'Показать пример' : appLanguage === 'en' ? 'Show example' : 'Mostrar exemplo')}
                </button>
              )}
              
              {showExample && (
                <div 
                  className="rounded-lg p-4"
                  style={{ 
                    borderWidth: '1px',
                    borderColor: 'rgba(194, 194, 194, 1)',
                    borderStyle: 'solid',
                    backgroundColor: '#F4F5F8'
                  }}
                >
                  <p className="text-sm font-semibold text-black mb-2">
                    {appLanguage === 'ru' ? 'Пример:' : appLanguage === 'en' ? 'Example:' : 'Exemplo:'}
                  </p>
                  {example.content.map((line: string, index: number) => (
                    <p key={index} className="text-black font-medium mb-1">
                      {line}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alternative: Speak Out Loud */}
          {alternative.action_button && (
            <div className="space-y-4">
              {alternative.title && (
                <p className="text-lg font-semibold text-black">{alternative.title}</p>
              )}
              
              {alternative.instruction && (
                <div 
                  className="rounded-lg p-4"
                  style={{ 
                    borderWidth: '1px',
                    borderColor: 'rgba(194, 194, 194, 1)',
                    borderStyle: 'solid',
                    backgroundColor: '#F4F5F8'
                  }}
                >
                  <p className="text-black font-medium whitespace-pre-line">{alternative.instruction}</p>
                </div>
              )}

              <button
                onClick={() => {
                  setSpeakOutLoud(true);
                  if (alternative.action_button?.completes_task) {
                    handleComplete();
                  }
                }}
                disabled={speakOutLoud || isCompleted}
                className="w-full px-4 py-3 rounded-lg font-medium transition-colors"
                style={{
                  height: '55px',
                  backgroundColor: speakOutLoud || isCompleted ? 'rgb(34, 197, 94)' : 'rgb(237, 243, 255)',
                  color: speakOutLoud || isCompleted ? 'white' : 'rgb(55, 65, 81)',
                  border: 'none'
                }}
              >
                {alternative.action_button?.text || (appLanguage === 'ru' ? '✔ Я сказал(а) вслух' : appLanguage === 'en' ? '✔ I said it out loud' : '✔ Disse em voz alta')}
              </button>
            </div>
          )}

          {/* Reflection (optional) */}
          {reflection.text && reflection.optional && speakOutLoud && (
            <div 
              className="rounded-lg p-4 mt-4"
              style={{ 
                borderWidth: '1px',
                borderColor: 'rgba(194, 194, 194, 1)',
                borderStyle: 'solid',
                backgroundColor: '#F4F5F8'
              }}
            >
              <p className="text-black font-medium whitespace-pre-line">{reflection.text}</p>
            </div>
          )}
        </div>
      </div>

      {/* Complete Button (if not using alternative speak out loud) */}
      {!alternative.action_button && (
        <button
          onClick={() => {
            if (!isCompleted || isReplaying) {
              handleComplete();
            } else {
              // If already completed, allow replay by resetting
              setWrittenText('');
              setSpeakOutLoud(false);
              setShowExample(false);
              setIsReplaying(true);
            }
          }}
          disabled={!speakOutLoud && !writtenText.trim() && !isCompleted}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            isCompleted && !isReplaying
              ? 'bg-green-600 text-white hover:bg-green-700'
              : (!speakOutLoud && !writtenText.trim())
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isCompleted && !isReplaying
            ? (appLanguage === 'ru' ? 'Пройти заново' : appLanguage === 'en' ? 'Replay' : 'Repetir')
            : (appLanguage === 'ru' ? 'Завершить' : appLanguage === 'en' ? 'Complete' : 'Concluir')}
        </button>
      )}

      {/* Progress Bar - Above navigation panel */}
      <div className="fixed bottom-[69px] left-0 right-0 bg-white z-30" style={{ marginBottom: '0px', borderRadius: '0px', borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', opacity: 1, color: 'rgba(23, 23, 23, 1)', verticalAlign: 'bottom', height: '33px' }}>
        <div className="max-w-md mx-auto" style={{ paddingTop: '2px', paddingBottom: '0px', paddingLeft: '16px', paddingRight: '16px', background: 'unset', backgroundColor: 'unset' }}>
          <div className="space-y-2">
            {/* Progress Text */}
            <div className="flex justify-between items-center" style={{ fontSize: '10px', color: 'rgba(23, 23, 23, 1)' }}>
              <span className="text-gray-600" style={{ color: 'rgba(23, 23, 23, 1)' }}>
                {getProgressMessage(progressCompleted, progressTotal)}
              </span>
              <span className="text-gray-600" style={{ color: 'rgba(23, 23, 23, 1)' }}>{Math.round((progressCompleted / progressTotal) * 100)}%</span>
            </div>

            {/* Progress Bar - Green, 4px thick */}
            <div className="w-full bg-gray-200 rounded-full" style={{ height: '4px' }}>
              <div
                className="rounded-full transition-all duration-300"
                style={{ 
                  width: `${(progressCompleted / progressTotal) * 100}%`, 
                  height: '4px',
                  backgroundColor: '#2FCD29'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Panel - Fixed at bottom (Cross-task navigation) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30" style={{ borderRadius: '0px', borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', height: '69px', verticalAlign: 'bottom', marginBottom: '0px', opacity: 1, color: 'rgba(0, 0, 0, 1)' }}>
        <div className="max-w-md mx-auto pt-3 pb-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', height: '69px', color: 'rgba(0, 0, 0, 1)', paddingLeft: '16px', paddingRight: '16px' }}>
          <div className="flex items-center justify-between gap-4">
            {/* Previous Button - Left */}
            {canGoPrevious && onPreviousTask ? (
              <button
                onClick={onPreviousTask}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                aria-label={appLanguage === 'ru' ? 'Предыдущее задание' : appLanguage === 'en' ? 'Previous task' : 'Tarefa anterior'}
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <div className="w-10 h-10"></div>
            )}

            {/* Task Title - Center */}
            <div className="flex-1 text-center">
              <p className="text-sm font-medium" style={{ color: 'rgba(0, 0, 0, 1)' }}>
                {(() => {
                  const taskId = task?.task_id || 5;
                  if (appLanguage === 'ru') {
                    const titles = {
                      1: '1. Слушай и повторяй',
                      2: '2. Говорим правильно',
                      3: '3. Пойми смысл',
                      4: '4. Выбери ситуацию',
                      5: '5. Попробуй сам'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}. Задание`;
                  } else if (appLanguage === 'en') {
                    const titles = {
                      1: '1. Listen and repeat',
                      2: '2. Speak correctly',
                      3: '3. Understand the meaning',
                      4: '4. Choose the situation',
                      5: '5. Try yourself'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}. Task`;
                  } else {
                    const titles = {
                      1: '1. Ouve e repete',
                      2: '2. Fala corretamente',
                      3: '3. Compreende o significado',
                      4: '4. Escolhe a situação',
                      5: '5. Tenta tu mesmo'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}. Tarefa`;
                  }
                })()}
              </p>
            </div>

            {/* Next Button - Right */}
            {canGoNext && onNextTask ? (
              <button
                onClick={onNextTask}
                className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                aria-label={appLanguage === 'ru' ? 'Следующее задание' : appLanguage === 'en' ? 'Next task' : 'Próxima tarefa'}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <div className="w-10 h-10"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
