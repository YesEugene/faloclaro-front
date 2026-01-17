'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { getTranslatedText } from '@/lib/lesson-translations';

interface ListeningTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
  savedAnswers?: { [key: number]: string };
  savedShowResults?: { [key: number]: boolean };
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

export default function ListeningTask({ task, language, onComplete, isCompleted, savedAnswers, savedShowResults, onNextTask, onPreviousTask, onNextLesson, canGoNext = false, canGoPrevious = false, isLastTask = false, progressCompleted = 0, progressTotal = 5, dayNumber }: ListeningTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [answers, setAnswers] = useState<{ [key: number]: string }>(savedAnswers || {});
  const [showResults, setShowResults] = useState<{ [key: number]: boolean }>(savedShowResults || {});
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: string]: boolean }>({});
  const [isReplaying, setIsReplaying] = useState(false);
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // Normalize option text - ensure it's always a string, not an object
  const normalizeOptionText = (option: any): string => {
    if (!option || typeof option !== 'object') return String(option || '');
    if (typeof option.text === 'string') return option.text;
    if (option.text && typeof option.text === 'object' && !Array.isArray(option.text)) {
      // IMPORTANT: option.text for listening options is { ru, en } (meaning translations).
      // Do NOT collapse to ru only; respect current UI language.
      const translated = getTranslatedText(option.text, appLanguage);
      return translated || option.text.en || option.text.ru || JSON.stringify(option.text);
    }
    return String(option.text || '');
  };

  // Get items from task - support both old structure (task.items) and new structure (task.blocks[].content.items)
  const getItemsFromTask = (task: any): any[] => {
    let items: any[] = [];
    
    if (task.blocks && Array.isArray(task.blocks)) {
      task.blocks.forEach((block: any) => {
        if (block.block_type === 'listen_phrase' && block.content?.items) {
          items.push(...block.content.items);
        }
      });
    }
    
    if (items.length === 0 && task.items && Array.isArray(task.items)) {
      items = task.items;
    }
    
    return items;
  };
  
  // IMPORTANT: Keep original option.text objects (ru/en) so UI can switch languages correctly.
  const items = getItemsFromTask(task);

  // Load saved answers on mount
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  useEffect(() => {
    if (!hasLoadedSavedData && !isReplaying) {
      if (savedAnswers && Object.keys(savedAnswers).length > 0) {
        setAnswers(savedAnswers);
      }
      if (savedShowResults && Object.keys(savedShowResults).length > 0) {
        setShowResults(savedShowResults);
      }
      setHasLoadedSavedData(true);
    }
  }, [savedAnswers, savedShowResults, hasLoadedSavedData, isReplaying]);

  // Update local completion state when prop changes
  useEffect(() => {
    if (!isReplaying) {
      if (isCompleted) {
        setLocalIsCompleted(true);
      }
    }
  }, [isCompleted, isReplaying]);

  // Save answers to completion_data whenever they change
  useEffect(() => {
    if (hasLoadedSavedData && !isReplaying && (Object.keys(answers).length > 0 || Object.keys(showResults).length > 0)) {
      onComplete({
        answers,
        showResults,
        saved: true,
      });
    }
  }, [answers, showResults, hasLoadedSavedData, isReplaying]);

  // Get progress message
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

  // Load audio URLs for all items
  useEffect(() => {
    const loadAudioUrls = async () => {
      const urls: { [key: string]: string } = {};
      const textsToLoad: string[] = [];

      items.forEach((item: any) => {
        if (item.audio) {
          textsToLoad.push(item.audio);
        }
      });

      for (const text of textsToLoad) {
        if (urls[text]) continue;

        try {
          const { data: phraseArray } = await supabase
            .from('phrases')
            .select('audio_url')
            .eq('portuguese_text', text)
            .limit(1);

          if (phraseArray && phraseArray.length > 0 && phraseArray[0]?.audio_url) {
            urls[text] = phraseArray[0].audio_url;
            continue;
          }
        } catch (error) {
          console.error(`Error loading audio for "${text}":`, error);
        }
      }

      setAudioUrls(urls);
    };

    if (items.length > 0) {
      loadAudioUrls();
    }
  }, [items]);

  // Play audio function
  const playAudio = useCallback(async (text: string) => {
    if (!audioUrls[text]) {
      console.warn(`Audio URL not found for: ${text}`);
      return;
    }

    Object.values(audioRefs.current).forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    if (!audioRefs.current[text]) {
      const audio = new Audio(audioUrls[text]);
      audio.crossOrigin = 'anonymous';
      audioRefs.current[text] = audio;
    }

    const audio = audioRefs.current[text];
    setIsPlayingAudio(prev => ({ ...prev, [text]: true }));

    try {
      await audio.play();
      audio.onended = () => {
        setIsPlayingAudio(prev => ({ ...prev, [text]: false }));
      };
      audio.onerror = () => {
        setIsPlayingAudio(prev => ({ ...prev, [text]: false }));
      };
    } catch (error) {
      setIsPlayingAudio(prev => ({ ...prev, [text]: false }));
    }
  }, [audioUrls]);

  const handleAnswerSelect = (itemIndex: number, optionText: string) => {
    const newAnswers = { ...answers, [itemIndex]: optionText };
    const newShowResults = { ...showResults, [itemIndex]: true };
    setAnswers(newAnswers);
    setShowResults(newShowResults);

    // Auto-complete as soon as the last required exercise is done.
    // No separate "Complete" button needed; this unlocks "Next" immediately.
    const allAnsweredNow = items.every((_: any, idx: number) => {
      const v = newAnswers[idx];
      return v !== undefined && v !== null && v !== '';
    });
    if (allAnsweredNow && !localIsCompleted && !isReplaying) {
      const correctCount = items.filter((item: any, index: number) => {
        const selectedAnswer = newAnswers[index];
        const correctOption = item.options?.find((opt: any) => opt.correct === true || opt.is_correct === true);
        if (!correctOption) return false;
        const correctTextCurrentLang = normalizeOptionText(correctOption);
        const correctTextRu = correctOption?.text && typeof correctOption.text === 'object' ? correctOption.text.ru : '';
        const correctTextEn = correctOption?.text && typeof correctOption.text === 'object' ? correctOption.text.en : '';
        return (
          selectedAnswer === correctTextCurrentLang ||
          (correctTextRu && selectedAnswer === correctTextRu) ||
          (correctTextEn && selectedAnswer === correctTextEn)
        );
      }).length;

      setLocalIsCompleted(true);
      onComplete({
        answers: newAnswers,
        showResults: newShowResults,
        correctCount,
        totalItems: items.length,
        completedAt: new Date().toISOString(),
      });
    }
  };

  const handleReplay = () => {
    Object.values(audioRefs.current).forEach(audio => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    setIsPlayingAudio({});
    
    setIsReplaying(true);
    setAnswers({});
    setShowResults({});
    setLocalIsCompleted(false);
    
    onComplete({
      answers: {},
      showResults: {},
      replay: true,
    });
    
    setTimeout(() => {
      setIsReplaying(false);
    }, 100);
  };

  // Render a single item
  const renderItem = (item: any, itemIndex: number) => {
    const currentAnswer = answers[itemIndex];
    const showResult = showResults[itemIndex] || false;

    return (
      <div key={itemIndex} className="space-y-4 mb-8">
        {/* Item indicator */}
        <div className="text-sm text-gray-500 mb-2">
          {appLanguage === 'ru' 
            ? `Блок ${itemIndex + 1} / ${items.length}`
            : appLanguage === 'en'
            ? `Block ${itemIndex + 1} / ${items.length}`
            : `Bloco ${itemIndex + 1} / ${items.length}`}
        </div>
        
        {/* Audio Player with title */}
        {item.audio && (
          <>
            <h3 className="text-xl font-bold text-black mb-4">
              {appLanguage === 'ru' ? 'Прослушай фразу' : appLanguage === 'en' ? 'Listen to the phrase' : 'Ouça a frase'}
            </h3>
            <div 
              className="p-4 mb-4"
              style={{ 
                height: '50px',
                backgroundColor: 'rgba(255, 255, 255, 1)',
                borderRadius: '6px',
                border: 'none'
              }}
            >
              <div className="flex items-center justify-between" style={{ height: '10px', marginTop: '3px', marginBottom: '3px' }}>
                <p className="text-black font-medium text-lg">
                  {showResult ? item.audio : '•'.repeat(item.audio.length)}
                </p>
                <button
                  onClick={() => playAudio(item.audio)}
                  disabled={isPlayingAudio[item.audio]}
                  className="flex-shrink-0 ml-3 transition-colors"
                  style={{
                    width: '30px',
                    height: '30px',
                    paddingTop: '0px',
                    paddingBottom: '0px',
                    paddingLeft: '11px',
                    paddingRight: '11px',
                    borderRadius: '0px',
                    backgroundColor: 'transparent',
                    color: 'rgba(255, 255, 255, 0.58)'
                  }}
                >
                  {isPlayingAudio[item.audio] ? (
                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'rgba(59, 130, 246, 1)' }}>
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Question */}
        <p className="text-lg font-semibold text-black mb-4">{getTranslatedText(item.question, appLanguage)}</p>

        {/* Options */}
        <div className="space-y-2">
          {item.options?.map((option: any, index: number) => {
            const optionText = normalizeOptionText(option);
            const optionTextRu = option?.text && typeof option.text === 'object' ? option.text.ru : '';
            const optionTextEn = option?.text && typeof option.text === 'object' ? option.text.en : '';
            const isSelected = currentAnswer === optionText || (optionTextRu && currentAnswer === optionTextRu) || (optionTextEn && currentAnswer === optionTextEn);
            // Check both correct and is_correct fields
            const isCorrect = option.correct === true || option.is_correct === true;
            const showResultForOption = showResult;

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(itemIndex, optionText)}
                disabled={showResultForOption}
                className="w-full text-left px-4 rounded-lg transition-colors flex items-center"
                style={{
                  height: '55px',
                  backgroundColor: showResultForOption 
                    ? (isCorrect ? 'rgb(220 252 231)' : (isSelected && !isCorrect ? 'rgb(254 226 226)' : 'white'))
                    : 'white',
                  border: showResultForOption 
                    ? (isCorrect ? '2px solid rgb(34 197 94)' : (isSelected && !isCorrect ? '2px solid rgb(239 68 68)' : 'none'))
                    : 'none'
                }}
              >
                {optionText}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (items.length === 0) {
    return (
      <div className="text-center text-gray-500">
        {appLanguage === 'ru' ? 'Задание не найдено' : appLanguage === 'en' ? 'Task not found' : 'Tarefa não encontrada'}
      </div>
    );
  }


  return (
    <div className="space-y-6 w-full" style={{ paddingBottom: '140px' }}>
      {/* All Items - Displayed on one page */}
      <div className="space-y-6">
        {items.map((item: any, index: number) => (
          <div key={index} className="rounded-lg border-2 border-gray-200 p-6 w-full" style={{ backgroundColor: '#F4F5F8' }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Replay Button - Floating above navigation panel, show if task is completed */}
      {localIsCompleted && (
        <div 
          className="fixed left-0 right-0 z-40 flex justify-center"
          style={{ 
            bottom: '59px', // Above navigation panel, same position as "All tasks completed"
            paddingLeft: '16px',
            paddingRight: '16px',
          }}
        >
          <div className="w-full max-w-md flex justify-center">
            <button
              onClick={handleReplay}
              className="bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
              style={{ width: '70%' }} // Same width as "All tasks completed" button
            >
              {appLanguage === 'ru' ? 'Пройти заново' : appLanguage === 'en' ? 'Replay' : 'Repetir'}
            </button>
          </div>
        </div>
      )}


      {/* Navigation Panel - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-black z-30" style={{ borderRadius: '0px', height: '59px', marginBottom: '0px', opacity: 1, color: 'rgba(255, 255, 255, 1)' }}>
        <div className="max-w-md mx-auto pt-3 pb-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', height: '59px', color: 'rgba(255, 255, 255, 1)', paddingLeft: '16px', paddingRight: '16px' }}>
          <div className="flex items-center justify-between gap-4">
            {/* Previous Task Button - Always green when available */}
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
                  const taskId = task?.task_id || 3;
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNextTask();
                  }}
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
                    onTouchStart={() => setShowTooltip(true)}
                    onTouchEnd={() => setTimeout(() => setShowTooltip(false), 2000)}
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
                        ? 'Нужно выполнить все задания для перехода на следующее задание'
                        : appLanguage === 'en'
                        ? 'You need to complete all tasks to proceed to the next task'
                        : 'Você precisa concluir todas as tarefas para prosseguir para a próxima tarefa'}
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                    </div>
                  )}
                </div>
              )
            ) : isLastTask && onNextLesson ? (
              localIsCompleted ? (
                // Last task completed - show green active next lesson button
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNextLesson();
                  }}
                  className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                  aria-label={appLanguage === 'ru' ? `Урок ${dayNumber ? dayNumber + 1 : 2}` : appLanguage === 'en' ? `Lesson ${dayNumber ? dayNumber + 1 : 2}` : `Lição ${dayNumber ? dayNumber + 1 : 2}`}
                  title={appLanguage === 'ru' ? `Урок ${dayNumber ? dayNumber + 1 : 2}` : appLanguage === 'en' ? `Lesson ${dayNumber ? dayNumber + 1 : 2}` : `Lição ${dayNumber ? dayNumber + 1 : 2}`}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                // Last task not completed - show gray disabled next lesson button
                <div className="relative">
                  <button
                    disabled
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    onTouchStart={() => setShowTooltip(true)}
                    onTouchEnd={() => setTimeout(() => setShowTooltip(false), 2000)}
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
                      className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg whitespace-nowrap z-50"
                      style={{ maxWidth: '200px' }}
                    >
                      {appLanguage === 'ru' 
                        ? `Закончите последнее упражнение, чтобы перейти к уроку ${dayNumber ? dayNumber + 1 : 2}`
                        : appLanguage === 'en'
                        ? `Finish the last exercise to proceed to lesson ${dayNumber ? dayNumber + 1 : 2}`
                        : `Termine o último exercício para prosseguir para a lição ${dayNumber ? dayNumber + 1 : 2}`}
                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="w-10 h-10"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
