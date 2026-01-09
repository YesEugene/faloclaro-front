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
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  progressCompleted?: number;
  progressTotal?: number;
}

export default function ListeningTask({ task, language, onComplete, isCompleted, savedAnswers, savedShowResults, onNextTask, onPreviousTask, canGoNext = false, canGoPrevious = false, progressCompleted = 0, progressTotal = 5 }: ListeningTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>(savedAnswers || {});
  const [showResults, setShowResults] = useState<{ [key: number]: boolean }>(savedShowResults || {});
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: string]: boolean }>({});
  const [isReplaying, setIsReplaying] = useState(false);
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  
  // Update local completion state when prop changes (but not during replay)
  useEffect(() => {
    if (!isReplaying) {
      setLocalIsCompleted(isCompleted);
    }
  }, [isCompleted, isReplaying]);
  
  // Load saved answers on mount
  const [hasLoadedSavedData, setHasLoadedSavedData] = useState(false);
  useEffect(() => {
    if (!hasLoadedSavedData) {
      if (savedAnswers && Object.keys(savedAnswers).length > 0) {
        setAnswers(savedAnswers);
      }
      if (savedShowResults && Object.keys(savedShowResults).length > 0) {
        setShowResults(savedShowResults);
      }
      setHasLoadedSavedData(true);
    }
  }, [savedAnswers, savedShowResults, hasLoadedSavedData]);
  
  // Save answers to completion_data whenever they change (for persistence)
  useEffect(() => {
    if (hasLoadedSavedData && (Object.keys(answers).length > 0 || Object.keys(showResults).length > 0)) {
      // Save current state to completion_data without marking as completed
      onComplete({
        answers,
        showResults,
        saved: true, // Flag to indicate this is just saving, not completing
      });
    }
  }, [answers, showResults, hasLoadedSavedData]);

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

  // Get items from task - listening_comprehension uses items, not blocks
  const items = task.items || [];
  const currentItem = items[currentItemIndex];

  // Load audio URLs for all items
  useEffect(() => {
    const loadAudioUrls = async () => {
      const urls: { [key: string]: string } = {};
      const textsToLoad: string[] = [];

      // Collect all audio texts
      items.forEach((item: any) => {
        if (item.audio) {
          textsToLoad.push(item.audio);
        }
      });

      // Load audio URLs from database or Storage
      for (const text of textsToLoad) {
        if (urls[text]) continue;

        try {
          // Try to find in phrases table
          const { data: phraseArray } = await supabase
            .from('phrases')
            .select('audio_url')
            .eq('portuguese_text', text)
            .limit(1);

          if (phraseArray && phraseArray.length > 0 && phraseArray[0]?.audio_url) {
            urls[text] = phraseArray[0].audio_url;
            continue;
          }

          // If not found, try to get from Storage
          const sanitizeForUrl = (text: string) => {
            return text
              .toLowerCase()
              .trim()
              .replace(/[^\w\s\-àáâãäåèéêëìíîïòóôõöùúûüçñ]/g, '')
              .replace(/[àáâãäå]/g, 'a')
              .replace(/[èéêë]/g, 'e')
              .replace(/[ìíîï]/g, 'i')
              .replace(/[òóôõö]/g, 'o')
              .replace(/[ùúûü]/g, 'u')
              .replace(/[ç]/g, 'c')
              .replace(/[ñ]/g, 'n')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
              .substring(0, 100);
          };

          const filename = `lesson-1-task3-${sanitizeForUrl(text)}.mp3`;
          const storagePath = `lesson-1/${filename}`;
          const { data: urlData } = supabase.storage.from('audio').getPublicUrl(storagePath);
          
          // Verify file exists
          try {
            await fetch(urlData.publicUrl, { method: 'HEAD' });
            urls[text] = urlData.publicUrl;
          } catch (e) {
            console.warn(`Audio file not found: ${storagePath}`);
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

    // Stop all other audio
    Object.values(audioRefs.current).forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    // Create or get audio element
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
        console.error(`Error playing audio for: ${text}`);
      };
    } catch (error) {
      setIsPlayingAudio(prev => ({ ...prev, [text]: false }));
      console.error(`Error playing audio:`, error);
    }
  }, [audioUrls]);

  const handleAnswerSelect = (itemIndex: number, optionText: string) => {
    setAnswers({ ...answers, [itemIndex]: optionText });
    setShowResults({ ...showResults, [itemIndex]: true });
  };

  const handleNextItem = () => {
    if (currentItemIndex < items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    }
  };

  const handlePreviousItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    }
  };

  const handleComplete = () => {
    const allAnswered = items.every((item: any, index: number) => answers[index]);
    if (allAnswered) {
      const correctCount = items.filter((item: any, index: number) => {
        const selectedAnswer = answers[index];
        const correctOption = item.options?.find((opt: any) => opt.correct);
        return selectedAnswer === correctOption?.text;
      }).length;

      setLocalIsCompleted(true); // Update local state immediately
      onComplete({
        answers,
        showResults,
        correctCount,
        totalItems: items.length,
        completedAt: new Date().toISOString(),
      });
    }
  };

  // Don't hide task when completed - show it so user can replay
  if (!currentItem) {
    return (
      <div className="text-center text-gray-500">
        {appLanguage === 'ru' ? 'Задание не найдено' : appLanguage === 'en' ? 'Task not found' : 'Tarefa não encontrada'}
      </div>
    );
  }

  const currentAnswer = answers[currentItemIndex];
  const showResult = showResults[currentItemIndex];
  const correctOption = currentItem.options?.find((opt: any) => opt.correct);
  const allAnswered = items.every((item: any, index: number) => showResults[index]);

  return (
    <div className="space-y-6 w-full">
      {/* Task Content - Full width - Always show, even if completed */}
      <div className="rounded-lg border-2 border-gray-200 p-6 w-full" style={{ backgroundColor: '#F4F5F8' }}>
        <div className="space-y-4">
          {/* Item indicator - above title */}
          <div className="text-sm text-gray-500 mb-2">
            {appLanguage === 'ru' 
              ? `Блок ${currentItemIndex + 1} / ${items.length}`
              : appLanguage === 'en'
              ? `Block ${currentItemIndex + 1} / ${items.length}`
              : `Bloco ${currentItemIndex + 1} / ${items.length}`}
          </div>
          
          {/* Audio Player with title */}
          {currentItem.audio && (
            <>
              <h3 className="text-xl font-bold text-black mb-4">
                {appLanguage === 'ru' ? 'Прослушай фразу' : appLanguage === 'en' ? 'Listen to the phrase' : 'Ouça a frase'}
              </h3>
              {/* White card with hidden text (stars) or revealed text after answer */}
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
                    {showResult ? currentItem.audio : '•'.repeat(currentItem.audio.length)}
                  </p>
                  <button
                    onClick={() => playAudio(currentItem.audio)}
                    disabled={isPlayingAudio[currentItem.audio]}
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
                    {isPlayingAudio[currentItem.audio] ? (
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
          <p className="text-lg font-semibold text-black mb-4">{getTranslatedText(currentItem.question, appLanguage)}</p>

          {/* Options */}
          <div className="space-y-2">
            {currentItem.options?.map((option: any, index: number) => {
              const isSelected = currentAnswer === option.text;
              const isCorrect = option.correct;
              const showResultForOption = showResult;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentItemIndex, option.text)}
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
                  {option.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation buttons removed - now handled by bottom panel */}
      {/* Complete button is now integrated into the bottom panel logic */}

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

      {/* Navigation Panel - Fixed at bottom (Unified navigation: items within task OR tasks) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30" style={{ borderRadius: '0px', borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', height: '69px', verticalAlign: 'bottom', marginBottom: '0px', opacity: 1, color: 'rgba(0, 0, 0, 1)' }}>
        <div className="max-w-md mx-auto pt-3 pb-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', height: '69px', color: 'rgba(0, 0, 0, 1)', paddingLeft: '16px', paddingRight: '16px' }}>
          <div className="flex items-center justify-between gap-4">
            {/* Previous Button - Left */}
            {/* If task is completed AND on last item: show previous task button, else: show previous item button */}
            {localIsCompleted && currentItemIndex === items.length - 1 ? (
              // Task completed AND on last item - show previous task button
              canGoPrevious && onPreviousTask ? (
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
              )
            ) : (
              // Task not completed OR not on last item - show previous item button
              currentItemIndex > 0 ? (
                <button
                  onClick={handlePreviousItem}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                  aria-label={appLanguage === 'ru' ? 'Предыдущий блок' : appLanguage === 'en' ? 'Previous item' : 'Item anterior'}
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              ) : (
                <div className="w-10 h-10"></div>
              )
            )}

            {/* Task Title - Center */}
            <div className="flex-1 text-center">
              <p className="text-sm font-medium" style={{ color: 'rgba(0, 0, 0, 1)' }}>
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

            {/* Next Button - Right */}
            {/* If task is completed AND on last item: show next task button (green), else: show next item button (blue) or complete button */}
            {localIsCompleted && currentItemIndex === items.length - 1 ? (
              // Task completed AND on last item - show next task button (green, active)
              canGoNext && onNextTask ? (
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
              )
            ) : (
              // Task not completed OR not on last item - show next item button (blue) or complete button (green) if on last item
              currentItemIndex < items.length - 1 ? (
                <button
                  onClick={handleNextItem}
                  className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center"
                  aria-label={appLanguage === 'ru' ? 'Следующий блок' : appLanguage === 'en' ? 'Next item' : 'Próximo item'}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : allAnswered ? (
                // Last item and all answered - show complete button (green)
                <button
                  onClick={() => {
                    handleComplete();
                    setIsReplaying(false);
                  }}
                  className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                  aria-label={appLanguage === 'ru' ? 'Завершить' : appLanguage === 'en' ? 'Complete' : 'Concluir'}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              ) : (
                <div className="w-10 h-10"></div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
