'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { getTranslatedText } from '@/lib/lesson-translations';
import { BottomLessonNav } from '@/components/subscription/ui/BottomLessonNav';
import { ReplayPill } from '@/components/subscription/ui/ReplayPill';
import { AudioPillRow } from '@/components/subscription/ui/AudioPillRow';

interface AttentionTaskProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
  savedAnswers?: { [key: number]: string };
  savedShowResults?: { [key: number]: boolean };
  savedWrongAnswers?: { [key: number]: string[] };
  onNextTask?: () => void;
  onPreviousTask?: () => void;
  onNextLesson?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isLastTask?: boolean;
  progressCompleted?: number;
  progressTotal?: number;
  dayNumber?: number;
  onOpenLessonMenu?: () => void;
  lessonMenuOpen?: boolean;
}

export default function AttentionTask({ task, language, onComplete, isCompleted, savedAnswers, savedShowResults, savedWrongAnswers, onNextTask, onPreviousTask, onNextLesson, canGoNext = false, canGoPrevious = false, isLastTask = false, progressCompleted = 0, progressTotal = 5, dayNumber, onOpenLessonMenu, lessonMenuOpen }: AttentionTaskProps) {
  const { language: appLanguage } = useAppLanguage();
  const [answers, setAnswers] = useState<{ [key: number]: string }>(savedAnswers || {});
  const [showResults, setShowResults] = useState<{ [key: number]: boolean }>(savedShowResults || {});
  const [wrongAnswers, setWrongAnswers] = useState<{ [key: number]: string[] }>(savedWrongAnswers || {});
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [isPlayingAudio, setIsPlayingAudio] = useState<{ [key: string]: boolean }>({});
  const [isReplaying, setIsReplaying] = useState(false);
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const OPTION_BORDER_COLOR = '#CED2D6';
  const CHECKBOX_BORDER_COLOR = '#1A8CFF';
  const DOT_GREEN = '#34BF5D';
  const DOT_RED = '#FF3B30';
  
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
      if (savedWrongAnswers && Object.keys(savedWrongAnswers).length > 0) {
        setWrongAnswers(savedWrongAnswers);
      }
      setHasLoadedSavedData(true);
    }
  }, [savedAnswers, savedShowResults, savedWrongAnswers, hasLoadedSavedData, isReplaying]);

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

  const handleAnswerSelect = (itemIndex: number, optionText: string, isCorrect: boolean) => {
    if (showResults[itemIndex] === true) return;

    const newAnswers = { ...answers, [itemIndex]: optionText };
    setAnswers(newAnswers);

    if (isCorrect) {
      const newShowResults = { ...showResults, [itemIndex]: true };
      setShowResults(newShowResults);

      const allCorrectNow = items.every((_: any, idx: number) => newShowResults[idx] === true);
      if (allCorrectNow && !localIsCompleted && !isReplaying) {
        setLocalIsCompleted(true);
        onComplete({
          answers: newAnswers,
          showResults: newShowResults,
          wrongAnswers,
          correctCount: items.length,
          totalItems: items.length,
          completedAt: new Date().toISOString(),
        });
      }
      return;
    }

    setWrongAnswers((prev) => {
      const existing = prev[itemIndex] || [];
      if (existing.includes(optionText)) return prev;
      return { ...prev, [itemIndex]: [...existing, optionText] };
    });

    if (hasLoadedSavedData && !isReplaying && !localIsCompleted) {
      onComplete({
        answers: newAnswers,
        showResults,
        wrongAnswers: {
          ...wrongAnswers,
          [itemIndex]: Array.from(new Set([...(wrongAnswers[itemIndex] || []), optionText])),
        },
        saved: true,
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
    setWrongAnswers({});
    setLocalIsCompleted(false);
    
    onComplete({
      answers: {},
      showResults: {},
      wrongAnswers: {},
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
            <div className="mb-4">
              <AudioPillRow
                text={showResult ? item.audio : (appLanguage === 'ru' ? 'Прослушай аудио' : appLanguage === 'en' ? 'Listen to the audio' : 'Ouve o áudio')}
                onPlay={() => playAudio(item.audio)}
                isPlaying={isPlayingAudio[item.audio]}
              />
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
                onClick={() => {
                  if (showResult) return;
                  handleAnswerSelect(itemIndex, optionText, isCorrect);
                }}
                disabled={showResult}
                className="w-full text-left transition-colors flex items-center"
                style={{
                  backgroundColor: 'white',
                  border: `1.5px solid ${OPTION_BORDER_COLOR}`,
                  borderRadius: '18px',
                  height: '50px',
                  padding: '0 18px',
                  gap: '14px',
                }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '999px',
                    border: `1.5px solid ${CHECKBOX_BORDER_COLOR}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {(showResult && isCorrect) || (wrongAnswers[itemIndex] || []).includes(optionText) ? (
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '999px',
                        background: showResult && isCorrect ? DOT_GREEN : DOT_RED,
                      }}
                    />
                  ) : null}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 500, color: '#000' }}>{optionText}</span>
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
              backgroundColor: '#F4F5F8',
                  borderRadius: '20px'
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
          <div
            key={index}
            className="border-2 border-gray-200 p-6 w-full"
            style={{ backgroundColor: '#F4F5F8', borderRadius: '20px' }}
          >
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
            onOpenMenu={onOpenLessonMenu}
            menuOpen={!!lessonMenuOpen}
          />
    </div>
  );
}
