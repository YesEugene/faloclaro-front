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
  onPreviousTask?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  onBackToTasks?: () => void;
  onDictionaryList?: () => void;
  dayNumber?: number;
  token?: string;
  initialCardIndex?: number; // For navigation from dictionary
  onTimerUpdate?: (time: { elapsed: number; required: number }) => void; // For passing timer to parent
  progressCompleted?: number; // For progress bar
  progressTotal?: number; // For progress bar
}

export default function VocabularyTaskPlayer({ 
  task, 
  language, 
  onComplete, 
  isCompleted,
  clusterColor = '#94B7F2', // Default color
  onNextTask,
  onPreviousTask,
  canGoNext = false,
  canGoPrevious = false,
  onBackToTasks,
  onDictionaryList,
  dayNumber,
  token,
  initialCardIndex,
  onTimerUpdate,
  progressCompleted = 0,
  progressTotal = 5
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
  const [localIsCompleted, setLocalIsCompleted] = useState(isCompleted);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRepeatingRef = useRef(false);
  const isUserControlledRef = useRef(false); // Track if user manually clicked Play/Pause
  
  // Update local completion state when prop changes
  useEffect(() => {
    setLocalIsCompleted(isCompleted);
  }, [isCompleted]);
  const currentIndexRef = useRef(0);

  const cards = task.content?.cards || [];
  const currentCard = cards[currentCardIndex] || cards[0] || null;
  
  // Debug: Log card structure for troubleshooting
  useEffect(() => {
    console.log('📋 VocabularyTaskPlayer Debug:', {
      cardsCount: cards.length,
      currentCardIndex,
      isLastCard: currentCardIndex === cards.length - 1,
      cardsArray: cards,
      hasCurrentCard: !!currentCard,
      currentCard: currentCard,
      currentCardKeys: currentCard ? Object.keys(currentCard) : [],
      currentCardWord: currentCard?.word,
      hasCardFormat: !!task.card_format,
      cardFormat: task.card_format,
      showWord: task.card_format?.show_word,
      taskKeys: Object.keys(task),
      taskContentKeys: task.content ? Object.keys(task.content) : [],
      taskContent: task.content,
      canGoNext,
      hasOnNextTask: !!onNextTask,
      willShowNextButton: currentCardIndex === cards.length - 1 && !!onNextTask,
    });
  }, [cards, currentCardIndex, currentCard, task, canGoNext, onNextTask]);
  
  // Check show_timer from task.ui or task.show_timer (fallback for backwards compatibility)
  const showTimer = task.ui?.show_timer !== undefined ? task.ui.show_timer : (task.show_timer !== undefined ? task.show_timer : true);
  
  // CRITICAL: Set requiredTime based on completion_rule, but default to 10 minutes if show_timer is true
  // This ensures timer is visible when show_timer is enabled, even if completion_rule is not set
  let requiredTime = 0;
  if (task.completion_rule === 'auto_after_audio_10_min') {
    requiredTime = 10 * 60 * 1000; // 10 minutes in ms
  } else if (showTimer) {
    // If show_timer is true but completion_rule is not set, use default 10 minutes
    requiredTime = 10 * 60 * 1000; // 10 minutes in ms
  }
  
  // CRITICAL: Default card_format if not present (for imported lessons)
  // If card_format is missing, enable all fields by default so content is visible
  const cardFormat = task.card_format || {
    show_word: true,
    show_transcription: true,
    show_example_sentence: true,
    show_word_translation_ru: true,
    show_sentence_translation_ru: true,
    show_sentence_translation_en: true,
  };
  
  // CRITICAL: Ensure show_word is true by default if not explicitly set to false
  if (cardFormat.show_word === undefined) {
    cardFormat.show_word = true;
  }

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
        if (card.word) {
          // Try to find phrase in database first (by word, not example sentence)
          // Use limit(1) instead of single() to avoid 406 errors when phrase doesn't exist
          try {
            // CRITICAL: Get audio URL from phrases table
            // Audio URLs are saved here after generation via admin panel
            // NOTE: phrases table does not have lesson_id column, so we search only by portuguese_text
            const { data: phraseArray, error: phraseError } = await supabase
              .from('phrases')
              .select('audio_url, id, created_at')
              .eq('portuguese_text', card.word)
              .order('created_at', { ascending: false }) // Get most recent first
              .limit(1);
            
            if (phraseError) {
              console.warn(`⚠️  Error fetching phrase for word: "${card.word}"`, phraseError);
            } else if (phraseArray && phraseArray.length > 0) {
              const phrase = phraseArray[0];
              if (phrase?.audio_url) {
                urls[card.word] = phrase.audio_url;
                console.log(`✅ Found audio in DB for word: "${card.word}" - ${phrase.audio_url}`);
              }
            } else {
              console.log(`ℹ️  No phrase found in DB for word: "${card.word}" - will use Storage fallback`);
            }
          } catch (error) {
            console.error(`❌ Exception fetching phrase for word: "${card.word}"`, error);
          }
          
          // CRITICAL: Don't try to construct Storage URLs manually
          // Audio should be loaded from database (phrases table) after generation
          // If audio is not in database, it needs to be generated first in admin panel
          // The URL from database will be the correct public URL from Storage
          if (!urls[card.word]) {
            console.log(`ℹ️  No audio URL found in database for word: "${card.word}"`);
            console.log(`   Audio can be generated in the admin panel. After generation, the URL will be saved to phrases table.`);
            // Don't set a URL - audio will need to be generated first
          }

          // Use translations from card data if available (for lesson cards)
          // Store translations using word as key for consistency
          if (card.sentence_translation_ru || card.sentence_translation_en || card.word_translation_ru || card.word_translation_en) {
            translations[card.word] = {
              ptSentence: card.example_sentence,
              ruSentence: card.sentence_translation_ru,
              enSentence: card.sentence_translation_en,
              ru: card.word_translation_ru,
              en: card.word_translation_en,
            };
          } else {
            // Try to get phrase ID again if we have it from previous query
            // Use limit(1) instead of single() to avoid 406 errors
            try {
              const { data: phraseArray } = await supabase
                .from('phrases')
                .select('id')
                .eq('portuguese_text', card.word)
                .limit(1);
              
              if (phraseArray && phraseArray.length > 0 && phraseArray[0]?.id) {
                const phraseId = phraseArray[0].id;
                // Load translations from database if phrase exists
                const { data: transData, error: transError } = await supabase
                  .from('translations')
                  .select('language_code, translation_text')
                  .eq('phrase_id', phraseId)
                  .in('language_code', ['pt-sentence', 'ru-sentence', 'en-sentence', 'ru', 'en']);

                if (transError) {
                  console.warn(`⚠️  Error loading translations for word: "${card.word}"`, transError);
                } else if (transData) {
                  const trans: any = {};
                  transData.forEach(t => {
                    if (t.language_code === 'pt-sentence') trans.ptSentence = t.translation_text;
                    if (t.language_code === 'ru-sentence') trans.ruSentence = t.translation_text;
                    if (t.language_code === 'en-sentence') trans.enSentence = t.translation_text;
                    if (t.language_code === 'ru') trans.ru = t.translation_text;
                    if (t.language_code === 'en') trans.en = t.translation_text;
                  });
                  translations[card.word] = trans;
                }
              }
            } catch (error) {
              console.warn(`⚠️  Error loading translations for word: "${card.word}"`, error);
            }
          }
        }
      }
      
      setAudioUrls(urls);
      setWordTranslations(translations);
      
      console.log('📋 Loaded audio URLs:', Object.keys(urls).length, 'out of', cards.length);
      console.log('📋 Audio URLs details:', Object.entries(urls).map(([word, url]) => `${word}: ${url ? 'OK' : 'MISSING'}`).join(', '));
    };

    if (cards.length > 0) {
      loadCardData();
    }
  }, [cards]);


  // Audio playback logic (from existing player)
  const playAudioSafely = useCallback(async (audio: HTMLAudioElement): Promise<boolean> => {
    try {
      // Set crossOrigin to handle CORS issues
      if (!audio.crossOrigin) {
        audio.crossOrigin = 'anonymous';
      }
      
      // Preload audio if not ready
      if (audio.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            audio.removeEventListener('canplay', checkReady);
            audio.removeEventListener('error', handleError);
            reject(new Error('Audio load timeout'));
          }, 10000); // Increased timeout to 10 seconds
          
          const checkReady = () => {
            if (audio.readyState >= 2) {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', checkReady);
              audio.removeEventListener('error', handleError);
              resolve();
            }
          };
          
          const handleError = (e: Event) => {
            clearTimeout(timeout);
            audio.removeEventListener('canplay', checkReady);
            audio.removeEventListener('error', handleError);
            console.error('Audio load error:', e);
            reject(new Error('Audio load failed'));
          };
          
          audio.addEventListener('canplay', checkReady);
          audio.addEventListener('error', handleError);
          audio.load();
        });
      }
      
      // Play audio
      await audio.play();
      return true;
    } catch (error) {
      console.error('Playback error:', error);
      // Try to reload and play again
      try {
        audio.load();
        await new Promise(resolve => setTimeout(resolve, 500));
        await audio.play();
        return true;
      } catch (retryError) {
        console.error('Retry playback error:', retryError);
        return false;
      }
    }
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current || !currentCard?.word || !audioUrls[currentCard.word]) return;

    try {
      if (isPlaying) {
        // User clicked Pause - stop playback and prevent auto-repeat
        isUserControlledRef.current = true;
        audioRef.current.pause();
        setIsPlaying(false);
        // Clear any pending repeat timeouts
        if (repeatTimeoutRef.current) {
          clearTimeout(repeatTimeoutRef.current);
          repeatTimeoutRef.current = null;
        }
        isRepeatingRef.current = false;
      } else {
        // User clicked Play - start playback with repeat settings
        isUserControlledRef.current = true;
        if (audioRef.current.src !== audioUrls[currentCard.word]) {
          audioRef.current.src = audioUrls[currentCard.word];
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
      isUserControlledRef.current = false;
    }
  }, [isPlaying, currentCard, audioUrls, playAudioSafely]);

  const handleAudioEnded = useCallback(() => {
    if (!audioRef.current || !currentCard) return;
    
    // Always use repeat settings (repeatCount, pauseBetweenRepeats)
    if (isRepeatingRef.current) return;
    isRepeatingRef.current = true;

    setCurrentRepeat((prevRepeat) => {
      const newRepeat = prevRepeat + 1;
      const maxRepeats = repeatCount === 'infinite' ? Infinity : repeatCount;

      // If reached max repeats (and not infinite), switch to next card
      if (newRepeat >= maxRepeats && repeatCount !== 'infinite') {
        setIsPlaying(false);
        isRepeatingRef.current = false;
        
        // Auto-advance to next card after a short delay
        setTimeout(() => {
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setIsPlaying(false);
          }
          if (repeatTimeoutRef.current) {
            clearTimeout(repeatTimeoutRef.current);
          }
          setCurrentRepeat(0);
          
          // Use functional update to get the latest currentCardIndex
          setCurrentCardIndex((prevIndex) => {
            // Calculate next index (with wrap-around for infinite loop)
            let nextIndex: number;
            if (isRandomMode) {
              nextIndex = Math.floor(Math.random() * cards.length);
            } else {
              nextIndex = prevIndex + 1;
              if (nextIndex >= cards.length) {
                // Wrap around to first card for infinite loop
                nextIndex = 0;
              }
            }
            
            currentIndexRef.current = nextIndex;
            
            // Auto-play next card after switching (only if user hasn't paused)
            setTimeout(async () => {
              if (isUserControlledRef.current) {
                // User paused, don't auto-play
                return;
              }
              const nextCard = cards[nextIndex];
              if (audioRef.current && nextCard?.word) {
                const audioUrl = audioUrls[nextCard.word];
                if (audioUrl) {
                  audioRef.current.src = audioUrl;
                  audioRef.current.load();
                  const success = await playAudioSafely(audioRef.current);
                  if (success) {
                    setIsPlaying(true);
                    console.log(`✅ Auto-playing next card ${nextIndex + 1}/${cards.length}: "${nextCard.word}"`);
                  } else {
                    console.warn(`⚠️  Failed to auto-play next card: "${nextCard.word}"`);
                  }
                } else {
                  console.warn(`⚠️  Cannot auto-play next card ${nextIndex + 1}/${cards.length}: word="${nextCard.word}", url is MISSING`);
                  console.warn(`   Available URLs:`, Object.keys(audioUrls).join(', '));
                }
              } else {
                console.warn(`⚠️  Cannot auto-play next card ${nextIndex + 1}/${cards.length}: card="${nextCard?.word}"`);
              }
            }, 100);
            
            return nextIndex;
          });
        }, 500);
        
        return newRepeat;
      }

      // If infinite mode, auto-advance to next card (loop through all cards)
      if (repeatCount === 'infinite') {
        const pauseDelay = pauseBetweenRepeats * 1000;
        repeatTimeoutRef.current = setTimeout(() => {
          if (!audioRef.current) {
            isRepeatingRef.current = false;
            return;
          }
          
          // Auto-advance to next card (loop through all cards)
          setCurrentCardIndex((prevIndex) => {
            let nextIndex: number;
            if (isRandomMode) {
              nextIndex = Math.floor(Math.random() * cards.length);
            } else {
              nextIndex = prevIndex + 1;
              if (nextIndex >= cards.length) {
                nextIndex = 0; // Wrap around to first card for infinite loop
              }
            }
            currentIndexRef.current = nextIndex;
            
            // Auto-play next card after switching (only if user hasn't paused)
            setTimeout(async () => {
              if (isUserControlledRef.current) {
                // User paused, don't auto-play
                isRepeatingRef.current = false;
                return;
              }
              const nextCard = cards[nextIndex];
              if (audioRef.current && nextCard?.word) {
                const audioUrl = audioUrls[nextCard.word];
                if (audioUrl) {
                  audioRef.current.src = audioUrl;
                  audioRef.current.load();
                  const success = await playAudioSafely(audioRef.current);
                  if (success) {
                    setIsPlaying(true);
                    setCurrentRepeat(0); // Reset repeat counter for new card
                  } else {
                    setIsPlaying(false);
                  }
                } else {
                  setIsPlaying(false);
                }
              } else {
                setIsPlaying(false);
              }
              isRepeatingRef.current = false;
            }, 100);
            
            return nextIndex;
          });
        }, pauseDelay);
        
        return newRepeat;
      }

      // If not infinite and not reached max repeats, continue repeating current card
      const pauseDelay = pauseBetweenRepeats * 1000;
      repeatTimeoutRef.current = setTimeout(async () => {
        if (!audioRef.current || isUserControlledRef.current) {
          // Don't auto-repeat if user manually paused
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
  }, [repeatCount, pauseBetweenRepeats, playAudioSafely, currentCard, currentCardIndex, cards, isRandomMode, audioUrls]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Only update isPlaying from events if it's not user-controlled
    // This prevents "jumping" between Play/Pause during auto-repeat
    const handlePlaying = () => {
      // Only update if user hasn't manually paused
      if (!isUserControlledRef.current || isPlaying) {
        setIsPlaying(true);
      }
    };
    
    const handlePause = () => {
      // Only update if user manually paused
      if (isUserControlledRef.current) {
        setIsPlaying(false);
        isUserControlledRef.current = false; // Reset after handling
      }
    };
    
    const handleEnded = () => {
      // Reset user control flag when audio ends naturally
      isUserControlledRef.current = false;
      handleAudioEnded();
    };
    
    const handleError = () => {
      setIsPlaying(false);
      isUserControlledRef.current = false;
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
  }, [handleAudioEnded, isPlaying]);

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
    setLocalIsCompleted(true); // Update local state immediately
    onComplete({
      elapsedTime,
      cardsViewed: currentCardIndex + 1,
      completedAt: new Date().toISOString(),
    });
  };

  // Handle next task - complete current task first, then navigate
  const handleNextTask = () => {
    // Complete current task if not already completed
    if (!localIsCompleted && !isCompleted) {
      handleComplete();
    }
    // Navigate to next task
    if (onNextTask) {
      onNextTask();
    }
  };


  const handleNextCard = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if (repeatTimeoutRef.current) {
      clearTimeout(repeatTimeoutRef.current);
    }
    isRepeatingRef.current = false;
    setCurrentRepeat(0);
    
    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      currentIndexRef.current = currentCardIndex + 1;
    } else if (isRandomMode || repeatCount === 'infinite') {
      // Wrap around to first card for infinite loop
      setCurrentCardIndex(0);
      currentIndexRef.current = 0;
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
      previousTask: 'Предыдущее задание',
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
      previousTask: 'Previous task',
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
      previousTask: 'Tarefa anterior',
    },
  };

  const t = translations[appLanguage as keyof typeof translations] || translations.en;

  // CRITICAL: If no current card but cards exist, try to use first card
  if (!currentCard && cards.length > 0) {
    console.warn('⚠️ Current card is undefined, but cards exist. Using first card.');
    setCurrentCardIndex(0);
    return null; // Will re-render with first card
  }
  
  if (!currentCard || cards.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-600">
          {appLanguage === 'ru' 
            ? 'Нет доступных карточек' 
            : appLanguage === 'en'
            ? 'No cards available'
            : 'Nenhum cartão disponível'}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Cards: {cards.length}, Current Index: {currentCardIndex}
        </p>
      </div>
    );
  }

  // Use word as key for audio URL (not example_sentence)
  const currentAudioUrl = currentCard.word ? audioUrls[currentCard.word] : null;
  const currentTranslations = currentCard.word ? wordTranslations[currentCard.word] : null;
  
  // Show final time when timer completed
  const displayTime = isTimerCompleted ? requiredTime : elapsedTime;

  // Update audio source when currentCard changes
  useEffect(() => {
    if (audioRef.current && currentCard?.word) {
      const audioUrl = audioUrls[currentCard.word];
      if (audioUrl) {
        // Set crossOrigin before setting src to avoid CORS issues
        if (!audioRef.current.crossOrigin) {
          audioRef.current.crossOrigin = 'anonymous';
        }
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        console.log(`🎵 Updated audio source for word "${currentCard.word}" (card ${currentCardIndex + 1}/${cards.length}):`, audioUrl);
      } else {
        console.warn(`⚠️  No audio URL found for word "${currentCard.word}" (card ${currentCardIndex + 1}/${cards.length})`);
        console.warn(`   Available URLs:`, Object.keys(audioUrls).join(', '));
        audioRef.current.src = '';
      }
    } else if (audioRef.current && !currentCard?.word) {
      audioRef.current.src = '';
      console.log('⚠️  No word for current card');
    }
  }, [currentCardIndex, currentCard, audioUrls, cards.length]);

  return (
    <div className="space-y-4" style={{ paddingBottom: '140px' }}>
      {/* Card - Using existing player design */}
      <div
        className="rounded-[30px] p-4 mb-6 relative touch-none select-none aspect-square shadow-lg flex flex-col"
        style={{
          backgroundColor: clusterColor,
          border: '2px solid white',
        }}
      >
        {/* Timer - On the blue card, top right, positioned to not overlap white button bar */}
        {/* CRITICAL: Show timer if showTimer is true, use requiredTime or default to 10 minutes */}
        {showTimer && (
          <div 
            className="absolute right-4 bg-white rounded-full py-1.5 shadow-sm" 
            style={{ 
              top: '16px',
              paddingLeft: '16px',
              paddingRight: '16px',
              zIndex: 0
            }}
          >
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap" style={{ height: '12px', fontSize: '12px' }}>
              {formatTime(displayTime)} / {formatTime(requiredTime || 10 * 60 * 1000)}
            </span>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="text-black text-center mt-5 mb-5 font-medium">
          {currentCardIndex + 1} / {cards.length}
        </div>

        {/* Word (large) - CRITICAL: Always show word if it exists, card_format is optional */}
        {/* Show word if it exists in any form (word, text, portuguese_text) */}
        {(currentCard?.word || currentCard?.text || currentCard?.portuguese_text) && (cardFormat.show_word !== false) && (
          <div className="text-5xl font-bold mb-4 text-center text-black">
            {currentCard?.word || currentCard?.text || currentCard?.portuguese_text}
          </div>
        )}

        {/* IPA Transcription */}
        {currentCard?.transcription && (cardFormat.show_transcription !== false) && (
          <div className="text-lg text-center mb-3 font-mono text-black">
            {currentCard.transcription}
          </div>
        )}

        {/* PT sentence (example usage) */}
        {currentCard?.example_sentence && (cardFormat.show_example_sentence !== false) && (
          <div className="text-base text-center mb-2 text-black">
            {currentCard.example_sentence}
          </div>
        )}

        {/* Sentence translation - based on interface language */}
        {appLanguage === 'ru' && currentCard?.sentence_translation_ru && (cardFormat.show_sentence_translation_ru !== false) && (
          <div className="text-base text-center mb-2 text-black">
            {currentCard.sentence_translation_ru}
          </div>
        )}
        {appLanguage === 'en' && currentCard?.sentence_translation_en && (cardFormat.show_sentence_translation_en !== false) && (
          <div className="text-base text-center mb-4 text-black">
            {currentCard.sentence_translation_en}
          </div>
        )}

        {/* Word translation in white card */}
        {(cardFormat.show_word_translation_ru !== false) && (
          <div className="mt-auto mx-[10px] mb-3">
            {(appLanguage === 'ru' && currentCard?.word_translation_ru) || 
             (appLanguage === 'en' && currentCard?.word_translation_en) ? (
              <div className="bg-white rounded-[20px] p-4 text-center">
                <div className="text-xl text-gray-900 font-semibold">
                  {appLanguage === 'ru' && currentCard?.word_translation_ru}
                  {appLanguage === 'en' && currentCard?.word_translation_en}
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
            crossOrigin="anonymous"
            onError={(e) => {
              const audioEl = e.target as HTMLAudioElement;
              const errorCode = audioEl.error?.code;
              const errorMessage = audioEl.error?.message || 'Unknown error';
              console.error('❌ Audio element error:', {
                error: e,
                errorCode,
                errorMessage,
                src: currentAudioUrl,
                readyState: audioEl.readyState,
                networkState: audioEl.networkState,
              });
              
              // Provide more specific error messages
              if (errorCode === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || errorCode === 4) {
                console.error('   Error: Media not supported or file format invalid');
                console.error('   URL:', currentAudioUrl);
              } else if (errorCode === MediaError.MEDIA_ERR_NETWORK || errorCode === 2) {
                console.error('   Error: Network error - file may not be accessible');
                console.error('   URL:', currentAudioUrl);
                console.error('   Check if Storage bucket is public and file exists');
              } else if (errorCode === MediaError.MEDIA_ERR_ABORTED || errorCode === 1) {
                console.error('   Error: Playback aborted');
              } else {
                console.error('   Error: Unknown audio error');
              }
              
              setIsPlaying(false);
            }}
            onLoadedData={() => {
              console.log('✅ Audio loaded successfully. URL:', currentAudioUrl);
            }}
            onCanPlay={() => {
              console.log('✅ Audio can play. URL:', currentAudioUrl);
            }}
          />
        )}
      </div>

      {/* Audio Player Controls - Previous, Play/Pause, Next */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {/* Previous Card Button - Left */}
        <button
          onClick={handlePreviousCard}
          disabled={currentCardIndex === 0}
          className="rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ width: '48px', height: '48px' }}
          aria-label={t.previous}
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Play/Pause Button - Center (larger) */}
        <button
          onClick={handlePlayPause}
          disabled={!currentAudioUrl}
          className="rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          style={{ backgroundColor: clusterColor, width: '72px', height: '72px' }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg className="w-10 h-10" fill="black" viewBox="0 0 20 20" style={{ display: 'block', margin: '0 auto' }}>
              <rect x="6" y="3" width="3.5" height="14" rx="0.75" />
              <rect x="10.5" y="3" width="3.5" height="14" rx="0.75" />
            </svg>
          ) : (
            <svg className="w-10 h-10" fill="black" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          )}
        </button>

        {/* Next Card Button - Right */}
        <button
          onClick={handleNextCard}
          disabled={currentCardIndex === cards.length - 1}
          className="rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ width: '48px', height: '48px' }}
          aria-label={t.next}
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Settings Button - Below Play button, centered */}
      <div className="flex items-center justify-center mb-6">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="transition-opacity hover:opacity-80 rounded-full flex items-center justify-center border-none p-0 cursor-pointer"
          style={{ 
            width: '48px',
            height: '48px',
            background: 'transparent'
          }}
          aria-label={t.settings}
        >
          <img 
            src="/Img/settings.svg" 
            alt={t.settings}
            style={{ width: '48px', height: '48px', display: 'block' }}
          />
        </button>
      </div>

      {/* Progress Bar - Above navigation panel */}
      <div className="fixed left-0 right-0 z-30 flex justify-center" style={{ bottom: '69px', height: '33px', margin: 0, padding: 0 }}>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white z-30" style={{ borderRadius: '0px', borderTopLeftRadius: '0px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderBottomLeftRadius: '0px', height: '69px', verticalAlign: 'bottom', marginBottom: '0px', opacity: 1, color: 'rgba(0, 0, 0, 1)' }}>
        <div className="max-w-md mx-auto pt-3 pb-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)', height: '69px', color: 'rgba(0, 0, 0, 1)', paddingLeft: '16px', paddingRight: '16px' }}>
          <div className="flex items-center justify-between gap-4">
            {/* Previous Task Button - Left */}
            {/* Only show previous task button, no card navigation */}
            {canGoPrevious && onPreviousTask ? (
              <button
                onClick={onPreviousTask}
                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors flex items-center justify-center"
                aria-label={t.previousTask}
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
                  const taskId = task?.task_id || 1;
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

            {/* Next Task Button - Right */}
            {/* Only show next task button, no card navigation */}
            {canGoNext && onNextTask ? (
              <button
                onClick={handleNextTask}
                className="w-10 h-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center"
                aria-label={t.nextTask}
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

      {/* Settings Panel (from existing player) */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] shadow-2xl transition-transform duration-300 z-50 ${
          showSettings ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80vh', overflowY: 'auto', marginBottom: 0 }}
      >
        <div className="max-w-md mx-auto px-4 pt-6 pb-2">
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

    </div>
  );
}

