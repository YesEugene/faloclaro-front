'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAppLanguage } from '@/lib/language-context';
import { getClusterColor } from '@/lib/cluster-config';

interface VocabularyTaskPlayerProps {
  task: any;
  language: string;
  onComplete: (completionData?: any) => void;
  isCompleted: boolean;
  clusterColor?: string; // Color from lesson's cluster
  onNextTask?: () => void;
  onBackToTasks?: () => void;
  onDictionaryList?: () => void;
  dayNumber?: number;
  token?: string;
  initialCardIndex?: number; // For navigation from dictionary
  onTimerUpdate?: (time: { elapsed: number; required: number }) => void; // For passing timer to parent
}

export default function VocabularyTaskPlayer({ 
  task, 
  language, 
  onComplete, 
  isCompleted,
  clusterColor = '#94B7F2', // Default color
  onNextTask,
  onBackToTasks,
  onDictionaryList,
  dayNumber,
  token,
  initialCardIndex,
  onTimerUpdate
}: VocabularyTaskPlayerProps) {
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  const [currentCardIndex, setCurrentCardIndex] = useState(() => {
    return initialCardIndex !== undefined && initialCardIndex !== null && initialCardIndex >= 0 
      ? initialCardIndex 
      : 0;
  });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerCompleted, setIsTimerCompleted] = useState(false);
  const [audioUrls, setAudioUrls] = useState<{ [key: string]: string }>({});
  const [wordTranslations, setWordTranslations] = useState<{ [key: string]: {
    ptSentence?: string;
    ruSentence?: string;
    enSentence?: string;
    ru?: string;
    en?: string;
  } }>({});
  
  // Audio controls (from existing player)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [pauseBetweenRepeats, setPauseBetweenRepeats] = useState(0);
  const [repeatCount, setRepeatCount] = useState<number | 'infinite'>('infinite');
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRepeatingRef = useRef(false);
  const currentIndexRef = useRef(0);

  const cards = task.content?.cards || [];
  const currentCard = cards[currentCardIndex];
  const requiredTime = task.completion_rule === 'auto_after_audio_10_min' ? 10 * 60 * 1000 : 0; // 10 minutes in ms

  // Load settings from localStorage
  useEffect(() => {
    const savedSpeed = localStorage.getItem('playbackSpeed');
    const savedPause = localStorage.getItem('pauseBetweenRepeats');
    const savedRepeat = localStorage.getItem('repeatCount');
    const savedRandom = localStorage.getItem('isRandomMode');
    
    if (savedSpeed) setPlaybackSpeed(parseFloat(savedSpeed));
    if (savedPause) setPauseBetweenRepeats(parseFloat(savedPause));
    if (savedRepeat) {
      if (savedRepeat === 'infinite') {
        setRepeatCount('infinite');
      } else {
        setRepeatCount(parseInt(savedRepeat));
      }
    }
    if (savedRandom) setIsRandomMode(savedRandom === 'true');
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('playbackSpeed', playbackSpeed.toString());
    localStorage.setItem('pauseBetweenRepeats', pauseBetweenRepeats.toString());
    localStorage.setItem('repeatCount', repeatCount.toString());
    localStorage.setItem('isRandomMode', isRandomMode.toString());
  }, [playbackSpeed, pauseBetweenRepeats, repeatCount, isRandomMode]);

  useEffect(() => {
    if (!isCompleted && startTime && !isTimerCompleted) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setElapsedTime(elapsed);
        
        // Update parent component with timer data
        if (onTimerUpdate) {
          onTimerUpdate({ elapsed, required: requiredTime });
        }
        
        if (elapsed >= requiredTime && requiredTime > 0) {
          setIsTimerCompleted(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          // Mark task as completed but keep player visible
          handleComplete();
        }
      }, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [startTime, requiredTime, isCompleted, isTimerCompleted, onTimerUpdate]);

  useEffect(() => {
    // Set initial card index if provided (from dictionary navigation)
    if (initialCardIndex !== undefined && initialCardIndex !== null && initialCardIndex >= 0 && initialCardIndex < cards.length) {
      setCurrentCardIndex(initialCardIndex);
      currentIndexRef.current = initialCardIndex;
    }
  }, [initialCardIndex, cards.length]);

  useEffect(() => {
    // Start timer when task is first viewed
    if (!isCompleted && !startTime && cards.length > 0) {
      const now = Date.now();
      setStartTime(now);
      // Initialize timer display in parent
      if (onTimerUpdate && requiredTime > 0) {
        onTimerUpdate({ elapsed: 0, required: requiredTime });
      }
    }
  }, [isCompleted, startTime, cards.length, requiredTime, onTimerUpdate]);

  useEffect(() => {
    // Load audio URLs and translations for cards
    const loadCardData = async () => {
      const urls: { [key: string]: string } = {};
      const translations: { [key: string]: any } = {};
      
      for (const card of cards) {
        if (card.example_sentence) {
          // Try to find phrase in database
          const { data: phrase } = await supabase
            .from('phrases')
            .select('audio_url, id')
            .eq('portuguese_text', card.example_sentence)
            .single();
          
          if (phrase?.audio_url) {
            urls[card.example_sentence] = phrase.audio_url;
          }

          // Load translations if phrase exists
          if (phrase?.id) {
            const { data: transData } = await supabase
              .from('translations')
              .select('language_code, translation_text')
              .eq('phrase_id', phrase.id)
              .in('language_code', ['pt-sentence', 'ru-sentence', 'en-sentence', 'ru', 'en']);

            if (transData) {
              const trans: any = {};
              transData.forEach(t => {
                if (t.language_code === 'pt-sentence') trans.ptSentence = t.translation_text;
                if (t.language_code === 'ru-sentence') trans.ruSentence = t.translation_text;
                if (t.language_code === 'en-sentence') trans.enSentence = t.translation_text;
                if (t.language_code === 'ru') trans.ru = t.translation_text;
                if (t.language_code === 'en') trans.en = t.translation_text;
              });
              translations[card.example_sentence] = trans;
            }
          }
        }
      }
      
      setAudioUrls(urls);
      setWordTranslations(translations);
    };

    if (cards.length > 0) {
      loadCardData();
    }
  }, [cards]);

  // Audio playback logic (from existing player)
  const playAudioSafely = useCallback(async (audio: HTMLAudioElement): Promise<boolean> => {
    try {
      if (audio.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          const checkReady = () => {
            if (audio.readyState >= 2) {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', checkReady);
              resolve();
            }
          };
          audio.addEventListener('canplay', checkReady);
          audio.load();
        });
      }
      await audio.play();
      return true;
    } catch (error) {
      console.error('Playback error:', error);
      return false;
    }
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current || !currentCard?.example_sentence || !audioUrls[currentCard.example_sentence]) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        if (audioRef.current.src !== audioUrls[currentCard.example_sentence]) {
          audioRef.current.src = audioUrls[currentCard.example_sentence];
          audioRef.current.load();
        }
        const success = await playAudioSafely(audioRef.current);
        if (success) {
          setIsPlaying(true);
          setCurrentRepeat(0);
        }
      }
    } catch (error) {
      console.error('Play/Pause error:', error);
    }
  }, [isPlaying, currentCard, audioUrls, playAudioSafely]);

  const handleAudioEnded = useCallback(async () => {
    if (!audioRef.current || !currentCard) return;
    
    if (isRepeatingRef.current) return;
    isRepeatingRef.current = true;

    setCurrentRepeat((prevRepeat) => {
      const newRepeat = prevRepeat + 1;
      const maxRepeats = repeatCount === 'infinite' ? Infinity : repeatCount;

      if (newRepeat >= maxRepeats) {
        setIsPlaying(false);
        isRepeatingRef.current = false;
        return newRepeat;
      }

      const pauseDelay = pauseBetweenRepeats * 1000;
      repeatTimeoutRef.current = setTimeout(async () => {
        if (!audioRef.current) {
          isRepeatingRef.current = false;
          return;
        }
        const success = await playAudioSafely(audioRef.current);
        if (success) {
          setIsPlaying(true);
          setTimeout(() => {
            isRepeatingRef.current = false;
          }, 300);
        } else {
          setIsPlaying(false);
          isRepeatingRef.current = false;
        }
      }, pauseDelay);

      return newRepeat;
    });
  }, [repeatCount, pauseBetweenRepeats, playAudioSafely, currentCard]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlaying = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => handleAudioEnded();
    const handleError = () => {
      setIsPlaying(false);
      console.error('Audio error');
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [handleAudioEnded]);

  // Apply playback speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
    }
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
    onComplete({
      elapsedTime,
      cardsViewed: currentCardIndex + 1,
      completedAt: new Date().toISOString(),
    });
  };

  const handleNextCard = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      currentIndexRef.current = currentCardIndex + 1;
      setCurrentRepeat(0);
    }
  };

  const handlePreviousCard = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      currentIndexRef.current = currentCardIndex - 1;
      setCurrentRepeat(0);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const translations = {
    ru: {
      time: 'Время:',
      playbackSpeed: 'Скорость воспроизведения',
      pauseBetweenRepeats: 'Пауза между повторениями',
      repeatCount: 'Количество повторений',
      infinite: 'Бесконечно',
      repeat: 'Повтор',
      settings: 'Настройки',
      randomMode: 'Случайный порядок',
      previous: 'Предыдущая',
      next: 'Следующая',
      complete: 'Завершить',
      backToTasks: 'Назад к заданиям',
      dictionaryList: 'Словарь списком',
      progressToday: 'Прогресс на сегодня',
      level: 'Начало',
      nextTask: 'Следующее задание',
    },
    en: {
      time: 'Time:',
      playbackSpeed: 'Playback Speed',
      pauseBetweenRepeats: 'Pause Between Repeats',
      repeatCount: 'Repeat Count',
      infinite: 'Infinite',
      repeat: 'Repeat',
      settings: 'Settings',
      randomMode: 'Random Mode',
      previous: 'Previous',
      next: 'Next',
      complete: 'Complete',
      backToTasks: 'Back to tasks',
      dictionaryList: 'Dictionary list',
      progressToday: 'Progress for today',
      level: 'Start',
      nextTask: 'Next task',
    },
    pt: {
      time: 'Tempo:',
      playbackSpeed: 'Velocidade de Reprodução',
      pauseBetweenRepeats: 'Pausa Entre Repetições',
      repeatCount: 'Número de Repetições',
      infinite: 'Infinito',
      repeat: 'Repetir',
      settings: 'Configurações',
      randomMode: 'Modo Aleatório',
      previous: 'Anterior',
      next: 'Próxima',
      complete: 'Concluir',
      backToTasks: 'Voltar às tarefas',
      dictionaryList: 'Lista de dicionário',
      progressToday: 'Progresso de hoje',
      level: 'Início',
      nextTask: 'Próxima tarefa',
    },
  };

  const t = translations[appLanguage as keyof typeof translations] || translations.en;

  if (!currentCard) {
    return <div>No cards available</div>;
  }

  const currentAudioUrl = currentCard.example_sentence ? audioUrls[currentCard.example_sentence] : null;
  const currentTranslations = currentCard.example_sentence ? wordTranslations[currentCard.example_sentence] : null;
  
  // Show final time when timer completed
  const displayTime = isTimerCompleted ? requiredTime : elapsedTime;

  return (
    <div className="space-y-4 pb-24">
      {/* Card - Using existing player design */}
      <div
        className="rounded-[30px] p-4 mb-6 relative touch-none select-none aspect-square shadow-lg flex flex-col"
        style={{
          backgroundColor: clusterColor,
          border: '2px solid white',
        }}
      >
        {/* Progress Indicator */}
        <div className="text-black text-center mt-5 mb-5 font-medium">
          {currentCardIndex + 1} / {cards.length}
        </div>

        {/* Word (large) */}
        {task.card_format?.show_word && currentCard.word && (
          <div className="text-5xl font-bold mb-4 text-center text-black">
            {currentCard.word}
          </div>
        )}

        {/* IPA Transcription */}
        {task.card_format?.show_transcription && currentCard.transcription && (
          <div className="text-lg text-center mb-3 font-mono text-black">
            {currentCard.transcription}
          </div>
        )}

        {/* PT sentence (example usage) */}
        {task.card_format?.show_example_sentence && currentCard.example_sentence && (
          <div className="text-base text-center mb-2 text-black">
            {currentCard.example_sentence}
          </div>
        )}

        {/* Sentence translation - based on interface language */}
        {task.card_format?.show_sentence_translation_ru && appLanguage === 'ru' && currentCard.sentence_translation_ru && (
          <div className="text-base text-center mb-2 text-black">
            {currentCard.sentence_translation_ru}
          </div>
        )}
        {task.card_format?.show_sentence_translation_en && appLanguage === 'en' && currentCard.sentence_translation_en && (
          <div className="text-base text-center mb-4 text-black">
            {currentCard.sentence_translation_en}
          </div>
        )}
        {appLanguage === 'pt' && currentCard.sentence_translation_ru && (
          <div className="text-base text-center mb-4 text-black">
            {currentCard.sentence_translation_ru}
          </div>
        )}

        {/* Word translation in white card */}
        {task.card_format?.show_word_translation_ru && (
          <div className="mt-auto mx-[10px] mb-3">
            {(appLanguage === 'ru' && currentCard.word_translation_ru) || 
             (appLanguage === 'en' && currentCard.word_translation_en) ||
             (appLanguage === 'pt' && (currentCard.word_translation_ru || currentCard.word_translation_en)) ? (
              <div className="bg-white rounded-[20px] p-4 text-center">
                <div className="text-xl text-gray-900 font-semibold">
                  {appLanguage === 'ru' && currentCard.word_translation_ru}
                  {appLanguage === 'en' && currentCard.word_translation_en}
                  {appLanguage === 'pt' && (currentCard.word_translation_ru || currentCard.word_translation_en)}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Audio Element */}
        {currentAudioUrl && (
          <audio
            ref={audioRef}
            src={currentAudioUrl}
            preload="auto"
          />
        )}
      </div>

      {/* Navigation Buttons - Using existing player design */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={handlePreviousCard}
          disabled={currentCardIndex === 0}
          className="p-3 rounded-full bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t.previous}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
          </svg>
        </button>

        <button
          onClick={handlePlayPause}
          disabled={!currentAudioUrl}
          className="p-4 rounded-full disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
          style={{ backgroundColor: clusterColor }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-8 h-8" fill="black" viewBox="0 0 20 20" style={{ display: 'block', margin: '0 auto' }}>
              <rect x="6" y="3" width="3.5" height="14" rx="0.75" />
              <rect x="10.5" y="3" width="3.5" height="14" rx="0.75" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="black" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        <button
          onClick={handleNextCard}
          disabled={currentCardIndex === cards.length - 1}
          className="p-3 rounded-full bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t.next}
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0011 6v2.798l-5.445-3.63z" />
          </svg>
        </button>
      </div>

      {/* Settings Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-md mx-auto px-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full px-4 py-3 rounded-[10px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center"
          >
            {t.settings}
          </button>
        </div>
      </div>

      {/* Settings Panel (from existing player) */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] shadow-2xl transition-transform duration-300 z-50 ${
          showSettings ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div className="max-w-md mx-auto px-4 pt-6 pb-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">{t.settings}</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Playback Speed */}
          <div className="mb-6">
            <label className="block mb-2 font-medium">
              {t.playbackSpeed}: {playbackSpeed.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.1"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Pause Between Repeats */}
          <div className="mb-6">
            <label className="block mb-2 font-medium">
              {t.pauseBetweenRepeats}: {pauseBetweenRepeats}s
            </label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={pauseBetweenRepeats}
              onChange={(e) => setPauseBetweenRepeats(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Repeat Count */}
          <div className="mb-6">
            <label className="block mb-2 font-medium">{t.repeatCount}</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRepeatCount('infinite')}
                className={`px-4 py-2 rounded-lg ${
                  repeatCount === 'infinite'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200'
                }`}
              >
                {t.infinite}
              </button>
              {[1, 3, 5, 10, 20].map((count) => (
                <button
                  key={count}
                  onClick={() => setRepeatCount(count)}
                  className={`px-4 py-2 rounded-lg ${
                    repeatCount === count
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Random Mode */}
          <div className="mb-4">
            <label className="block mb-3 font-medium">{t.randomMode}</label>
            <button
              onClick={() => setIsRandomMode(!isRandomMode)}
              className={`w-full px-4 py-3 rounded-lg flex items-center justify-center gap-3 transition-colors ${
                isRandomMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="font-medium">{t.randomMode}</span>
              {isRandomMode && (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>

          {isPlaying && repeatCount !== 'infinite' && (
            <div className="text-center text-sm text-gray-600">
              {t.repeat} {currentRepeat + 1} / {repeatCount}
            </div>
          )}
        </div>
      </div>

      {/* Overlay when settings are open */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Completion Section - Always show after completion */}
      {isCompleted && (
        <div className="space-y-4">
          {/* Progress for today */}
          <div className="text-center">
            <p className="text-gray-700 font-medium mb-3">{t.progressToday}</p>
            
            {/* Stars - 1 star for first task */}
            <div className="flex justify-center gap-2 mb-3">
              <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {[...Array(4)].map((_, i) => (
                <svg key={i} className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.364-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              ))}
            </div>
            
            {/* Level */}
            <p className="text-black font-bold text-lg mb-4">{t.level}</p>
            
            {/* Next Task Button */}
            {onNextTask && (
              <button
                onClick={onNextTask}
                className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span>{t.nextTask}</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

