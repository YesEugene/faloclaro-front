'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { getTranslatedText } from '@/lib/lesson-translations';
import { BottomLessonNav } from '@/components/subscription/ui/BottomLessonNav';
import { ReplayPill } from '@/components/subscription/ui/ReplayPill';

interface AttentionTaskProps {
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

export default function AttentionTask({ task, language, onComplete, isCompleted, savedAnswers, savedShowResults, onNextTask, onPreviousTask, onNextLesson, canGoNext = false, canGoPrevious = false, isLastTask = false, progressCompleted = 0, progressTotal = 5, dayNumber }: AttentionTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [answers, setAnswers] = useState<{ [key: number]: string }>(savedAnswers || {});
  const [showResults, setShowResults] = useState<{ [key: number]: boolean }>(savedShowResults || {});
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: string]: boolean }>({});
  const [isReplaying, setIsReplaying] = useState(false);
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  
  // Get items from task
  const items = task.items || [];

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
      setLocalIsCompleted(isCompleted);
    }
  }, [isCompleted, isReplaying]);

  // Save answers to completion_data whenever they change
  useEffect(() => {
    if (hasLoadedSavedData && !isReplaying && !localIsCompleted && (Object.keys(answers).length > 0 || Object.keys(showResults).length > 0)) {
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
      return newShowResults[idx] === true;
    });
    if (allAnsweredNow && !localIsCompleted && !isReplaying) {
      const correctCount = items.filter((item: any, index: number) => {
        const selectedAnswer = newAnswers[index];
        const correctOption = item.options?.find((opt: any) => opt.correct === true || opt.is_correct === true);
        if (!correctOption) return false;
        const correctOptionText = typeof correctOption.text === 'string'
          ? correctOption.text
          : getTranslatedText(correctOption.text, appLanguage);
        const optText = getTranslatedText(correctOption.text, appLanguage);
        return selectedAnswer === correctOptionText || selectedAnswer === optText || selectedAnswer === correctOption.text;
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
    // Check both correct and is_correct fields
    const correctOption = item.options?.find((opt: any) => opt.correct === true || opt.is_correct === true);

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
            const optionText = getTranslatedText(option.text, appLanguage);
            const isSelected = currentAnswer === optionText || currentAnswer === option.text;
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

        {/* Show feedback after answer (admin stores feedback on item, not on option) */}
        {showResult && item.feedback && (
          <div 
            className="rounded-lg p-4 mt-4"
            style={{ 
              borderWidth: '1px',
              borderColor: 'rgba(194, 194, 194, 1)',
              borderStyle: 'solid',
              backgroundColor: '#F4F5F8'
            }}
          >
            <p className="text-black font-medium">
              {getTranslatedText(item.feedback, appLanguage)}
            </p>
          </div>
        )}
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
      {localIsCompleted && !isReplaying && (
        <ReplayPill lang={appLanguage} onClick={handleReplay} />
      )}

{/* Navigation Panel */}
      <BottomLessonNav
            taskId={task?.task_id || 4}
            lang={appLanguage}
            canGoPrevious={canGoPrevious && !!onPreviousTask}
            canGoNext={localIsCompleted && ((isLastTask && !!onNextLesson) || (!isLastTask && !!onNextTask))}
            onPrevious={onPreviousTask}
            onNext={onNextTask}
            isLastTask={isLastTask}
            onNextLesson={onNextLesson}
          />
    </div>
  );
}
