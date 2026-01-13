'use client';

import { useState, useEffect } from 'react';
import { useAppLanguage } from '@/lib/language-context';
import { getTranslatedText } from '@/lib/lesson-translations';

interface WritingTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
  savedWrittenText?: string | null;
  savedSpeakOutLoud?: boolean;
  onNextTask?: () => void;
  onPreviousTask?: () => void;
  onNextLesson?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLastTask?: boolean;
  progressCompleted?: number;
  progressTotal?: number;
  dayNumber?: number;
}

export default function WritingTask({ task, language, onComplete, isCompleted, savedWrittenText, savedSpeakOutLoud, onNextTask, onPreviousTask, onNextLesson, canGoNext = false, canGoPrevious = false, isLastTask = false, progressCompleted = 0, progressTotal = 5, dayNumber }: WritingTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [writtenText, setWrittenText] = useState(savedWrittenText || '');
  const [speakOutLoud, setSpeakOutLoud] = useState(savedSpeakOutLoud || false);
  const [showExample, setShowExample] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  const [showTooltip, setShowTooltip] = useState(false);

  // Get progress message based on completed tasks
  const getProgressMessage = (completed: number, total: number) => {
    if (appLanguage === 'ru') {
      if (completed === 1) return 'Назад дороги нет.';
      if (completed === 2) return 'Поймали ритм.';
      if (completed === 3) return 'Ты просто Вау!';
      if (completed === 4) return 'Почти финиш.';
      if (completed === 5) return 'Можно собой гордиться.';
      return '';
    } else if (appLanguage === 'en') {
      if (completed === 1) return 'No turning back.';
      if (completed === 2) return 'Catching the rhythm.';
      if (completed === 3) return "You're just Wow!";
      if (completed === 4) return 'Almost finish.';
      if (completed === 5) return 'You can be proud.';
      return '';
    } else {
      if (completed === 1) return 'Não há volta.';
      if (completed === 2) return 'Pegando o ritmo.';
      if (completed === 3) return 'Você é simplesmente Uau!';
      if (completed === 4) return 'Quase no fim.';
      if (completed === 5) return 'Pode se orgulhar.';
      return '';
    }
  };

  // Load saved data on mount
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  useEffect(() => {
    if (!hasLoadedSavedData) {
      if (savedWrittenText !== undefined && savedWrittenText !== null) {
        setWrittenText(savedWrittenText);
      }
      if (savedSpeakOutLoud !== undefined) {
        setSpeakOutLoud(savedSpeakOutLoud);
      }
      setHasLoadedSavedData(true);
    }
  }, [savedWrittenText, savedSpeakOutLoud, hasLoadedSavedData]);

  // Update local completion state when prop changes
  useEffect(() => {
    if (!isReplaying) {
      setLocalIsCompleted(isCompleted);
    }
  }, [isCompleted, isReplaying]);
  
  // Also check if task should be considered completed based on speakOutLoud or writtenText
  useEffect(() => {
    // If user has completed the task (either by writing or speaking), mark as completed
    if (!localIsCompleted && (speakOutLoud || writtenText.trim())) {
      // Only auto-complete if this is the last task and user clicked "I said it out loud"
      // For other cases, let the explicit completion handle it
      if (isLastTask && speakOutLoud) {
        setLocalIsCompleted(true);
      }
    }
  }, [speakOutLoud, writtenText, localIsCompleted, isLastTask]);
  
  // Save answers to completion_data whenever they change (for persistence)
  // BUT only if task is not completed yet - don't overwrite completion
  useEffect(() => {
    if (hasLoadedSavedData && !localIsCompleted && (writtenText.trim() || speakOutLoud)) {
      // Save current state to completion_data without marking as completed
      onComplete({
        writtenText: speakOutLoud ? null : writtenText,
        speakOutLoud,
        saved: true, // Flag to indicate this is just saving, not completing
      });
    }
  }, [writtenText, speakOutLoud, hasLoadedSavedData, localIsCompleted]);

  const handleComplete = (forceSpeakOutLoud?: boolean) => {
    // Writing task is optional - can be completed with either text or speaking out loud
    // If user clicked "I said it out loud" button, complete immediately
    const shouldComplete = forceSpeakOutLoud || speakOutLoud || writtenText.trim();
    if (shouldComplete) {
      // Update local state first to show "Пройти заново" button immediately
      if (forceSpeakOutLoud) {
        setSpeakOutLoud(true);
      }
      
      // Set local completion state immediately
      setLocalIsCompleted(true);
      
      // Call onComplete to update database and parent state
      onComplete({
        writtenText: (forceSpeakOutLoud || speakOutLoud) ? null : writtenText,
        speakOutLoud: forceSpeakOutLoud || speakOutLoud,
        completedAt: new Date().toISOString(),
      });
      setIsReplaying(false);
    }
  };

  const handleReplay = () => {
    setWrittenText('');
    setSpeakOutLoud(false);
    setShowExample(false);
    setIsReplaying(true);
    setLocalIsCompleted(false);
    
    onComplete({
      writtenText: '',
      speakOutLoud: false,
      replay: true,
    });
    
    setTimeout(() => {
      setIsReplaying(false);
    }, 100);
  };

  // Don't hide task when completed - show it so user can replay
  if (!task) {
    return (
      <div className="text-center text-gray-500">
        {appLanguage === 'ru' ? 'Задание не найдено' : appLanguage === 'en' ? 'Task not found' : 'Tarefa não encontrada'}
      </div>
    );
  }

  const instructionText = getTranslatedText(task.instruction?.text || task.instruction, appLanguage);
  const mainTask = task.main_task || {};
  const template = mainTask.template || task.template || [];
  const hints = mainTask.hints || task.hints || [];
  const example = task.example || {};
  const alternative = task.alternative || {};
  const reflection = task.reflection || {};

  return (
    <div className="space-y-6 w-full" style={{ paddingBottom: '140px' }}>
      {/* Task Content - Full width - Always show, even if completed */}
      <div className="rounded-lg border-2 border-gray-200 p-6 w-full" style={{ backgroundColor: '#F4F5F8' }}>
        <div className="space-y-4">
          {/* Block indicator - Writing task is always block 1/1 */}
          <div className="text-sm text-gray-500 mb-2">
            {appLanguage === 'ru' 
              ? `Блок 1 / 1`
              : appLanguage === 'en'
              ? `Block 1 / 1`
              : `Bloco 1 / 1`}
          </div>
          
          {/* Title */}
          <h3 className="text-xl font-bold text-black mb-4">
            {appLanguage === 'ru' 
              ? 'Напиши от руки или проговори вслух'
              : appLanguage === 'en'
              ? 'Write by hand or say out loud'
              : 'Escreva à mão ou diga em voz alta'}
          </h3>
          
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
                  {getTranslatedText(example.button_text, appLanguage) || (appLanguage === 'ru' ? 'Показать пример' : appLanguage === 'en' ? 'Show example' : 'Mostrar exemplo')}
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
              {getTranslatedText(alternative.title, appLanguage) && (
                <p className="text-lg font-semibold text-black">{getTranslatedText(alternative.title, appLanguage)}</p>
              )}
              
              {getTranslatedText(alternative.instruction, appLanguage) && (
                <div 
                  className="rounded-lg p-4"
                  style={{ 
                    borderWidth: '1px',
                    borderColor: 'rgba(194, 194, 194, 1)',
                    borderStyle: 'solid',
                    backgroundColor: '#F4F5F8'
                  }}
                >
                  <p className="text-black font-medium whitespace-pre-line">{getTranslatedText(alternative.instruction, appLanguage)}</p>
                </div>
              )}

              {!speakOutLoud ? (
                <button
                  onClick={() => {
                    // First click - complete immediately
                    setSpeakOutLoud(true);
                    handleComplete(true); // Pass true to force completion with speakOutLoud
                  }}
                  className="w-full py-4 rounded-lg font-semibold text-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  style={{
                    height: '55px'
                  }}
                >
                  {getTranslatedText(alternative.action_button?.text, appLanguage) || (appLanguage === 'ru' ? '✔ Я сказал(а) вслух' : appLanguage === 'en' ? '✔ I said it out loud' : '✔ Disse em voz alta')}
                </button>
              ) : (
                <div 
                  className="w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center"
                  style={{
                    height: '55px',
                    backgroundColor: '#F1F2F6',
                    border: '1px solid #E5E7EB',
                    color: '#109929'
                  }}
                >
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="#109929" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {appLanguage === 'ru' ? 'Выполнено' : appLanguage === 'en' ? 'Completed' : 'Concluído'}
                </div>
              )}
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
              <p className="text-black font-medium whitespace-pre-line">{getTranslatedText(reflection.text, appLanguage)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Complete Button (if not using alternative speak out loud) */}
      {!alternative.action_button && (
        <button
          onClick={() => {
            if (!localIsCompleted || isReplaying) {
              handleComplete();
            } else {
              handleReplay();
            }
          }}
          disabled={localIsCompleted && !isReplaying}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            localIsCompleted && !isReplaying
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {localIsCompleted && !isReplaying
            ? (appLanguage === 'ru' ? 'Пройти заново' : appLanguage === 'en' ? 'Replay' : 'Repetir')
            : (appLanguage === 'ru' ? 'Завершить' : appLanguage === 'en' ? 'Complete' : 'Concluir')}
        </button>
      )}

      {/* Progress Bar - Above navigation panel */}
      <div className="fixed left-0 right-0 z-30 flex justify-center" style={{ bottom: '59px', height: '28px', margin: 0, padding: 0 }}>
        <div className="w-full max-w-md relative" style={{ height: '100%', margin: 0, padding: 0 }}>
          {/* Progress Bar - Full height with green and gray sections */}
          <div className="absolute inset-0 flex">
            {/* Green section (completed) */}
            <div
              className="transition-all duration-300"
              style={{ 
                width: `${(progressCompleted / progressTotal) * 100}%`,
                backgroundColor: '#B2FDB0'
              }}
            />
            {/* Gray section (remaining) */}
            <div
              className="flex-1"
              style={{ 
                backgroundColor: '#F4F5F9'
              }}
            />
          </div>
          
          {/* Progress Text - Overlay on top of progress bar */}
          <div className="relative flex justify-between items-center h-full px-4" style={{ fontSize: '15px', color: 'rgba(23, 23, 23, 1)', zIndex: 1 }}>
            <span>
              {getProgressMessage(progressCompleted, progressTotal)}
            </span>
            <span>{Math.round((progressCompleted / progressTotal) * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Navigation Panel - Fixed at bottom (Cross-task navigation) */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-30" style={{ borderRadius: '0px', borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', height: '59px', verticalAlign: 'bottom', marginBottom: '0px', opacity: 1, color: 'rgba(255, 255, 255, 1)' }}>
        <div className="max-w-md mx-auto pt-3 pb-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', height: '59px', color: 'rgba(255, 255, 255, 1)', paddingLeft: '16px', paddingRight: '16px' }}>
          <div className="flex items-center justify-between gap-4">
            {/* Previous Button - Left - Always green when available */}
            {canGoPrevious && onPreviousTask ? (
              <button
                onClick={onPreviousTask}
                className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                aria-label={appLanguage === 'ru' ? 'Предыдущее задание' : appLanguage === 'en' ? 'Previous task' : 'Tarefa anterior'}
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <div className="w-10 h-10"></div>
            )}

            {/* Task Title - Center */}
            <div className="flex-1 text-center">
              <p className="text-sm font-medium" style={{ color: 'rgba(255, 255, 255, 1)' }}>
                {(() => {
                  const taskId = task?.task_id || 5;
                  if (appLanguage === 'ru') {
                    const titles = {
                      1: '1/5 Слушай и повторяй',
                      2: '2/5 Говорим правильно',
                      3: '3/5 Пойми смысл',
                      4: '4/5 Выбери ситуацию',
                      5: '5/5 Попробуй сам'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}/5 Задание`;
                  } else if (appLanguage === 'en') {
                    const titles = {
                      1: '1/5 Listen and repeat',
                      2: '2/5 Speak correctly',
                      3: '3/5 Understand the meaning',
                      4: '4/5 Choose the situation',
                      5: '5/5 Try yourself'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}/5 Task`;
                  } else {
                    const titles = {
                      1: '1/5 Ouve e repete',
                      2: '2/5 Fala corretamente',
                      3: '3/5 Compreende o significado',
                      4: '4/5 Escolhe a situação',
                      5: '5/5 Tenta tu mesmo'
                    };
                    return titles[taskId as keyof typeof titles] || `${taskId}/5 Tarefa`;
                  }
                })()}
              </p>
            </div>

            {/* Next Task/Lesson Button - Always visible, gray when not completed, green when completed */}
            {canGoNext && onNextTask ? (
              localIsCompleted ? (
                // Task completed - show green active button
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
                // Task not completed - show gray disabled button with tooltip
                <div className="relative">
                  <button
                    disabled
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onClick={() => setShowTooltip(true)}
                    className="w-10 h-10 rounded-full bg-gray-400 cursor-not-allowed flex items-center justify-center"
                    aria-label={appLanguage === 'ru' ? 'Следующее задание' : appLanguage === 'en' ? 'Next task' : 'Próxima tarefa'}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  {showTooltip && (
                    <div
                      className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg whitespace-nowrap z-50"
                      style={{ maxWidth: '200px' }}
                    >
                      {appLanguage === 'ru' 
                        ? 'Чтобы перейти к следующему заданию, выполните текущее задание'
                        : appLanguage === 'en'
                        ? 'Complete the current task to proceed to the next one'
                        : 'Complete a tarefa atual para prosseguir para a próxima'}
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                    </div>
                  )}
                </div>
              )
            ) : isLastTask && onNextLesson ? (
              <div className="relative">
                {localIsCompleted ? (
                  // Last task completed - show green active next lesson button with tooltip
                  <>
                    <button
                      onClick={onNextLesson}
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                      aria-label={appLanguage === 'ru' ? `Урок ${dayNumber ? dayNumber + 1 : 2}` : appLanguage === 'en' ? `Lesson ${dayNumber ? dayNumber + 1 : 2}` : `Lição ${dayNumber ? dayNumber + 1 : 2}`}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {showTooltip && (
                      <div
                        className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg whitespace-nowrap"
                        style={{ maxWidth: '200px', zIndex: 9999 }}
                      >
                        {appLanguage === 'ru' 
                          ? `Перейти к уроку ${dayNumber ? dayNumber + 1 : 2}`
                          : appLanguage === 'en'
                          ? `Go to lesson ${dayNumber ? dayNumber + 1 : 2}`
                          : `Ir para a lição ${dayNumber ? dayNumber + 1 : 2}`}
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                      </div>
                    )}
                  </>
                ) : (
                  // Last task not completed - show gray disabled next lesson button with tooltip
                  <>
                    <button
                      disabled
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      onClick={() => setShowTooltip(true)}
                      className="w-10 h-10 rounded-full bg-gray-400 cursor-not-allowed flex items-center justify-center"
                      aria-label={appLanguage === 'ru' ? `Урок ${dayNumber ? dayNumber + 1 : 2}` : appLanguage === 'en' ? `Lesson ${dayNumber ? dayNumber + 1 : 2}` : `Lição ${dayNumber ? dayNumber + 1 : 2}`}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    {showTooltip && (
                      <div
                        className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg whitespace-nowrap"
                        style={{ maxWidth: '200px', zIndex: 9999 }}
                      >
                        {appLanguage === 'ru' 
                          ? `Выполните задание, чтобы перейти к уроку ${dayNumber ? dayNumber + 1 : 2}`
                          : appLanguage === 'en'
                          ? `Complete the task to proceed to lesson ${dayNumber ? dayNumber + 1 : 2}`
                          : `Complete a tarefa para prosseguir para a lição ${dayNumber ? dayNumber + 1 : 2}`}
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="w-10 h-10"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
