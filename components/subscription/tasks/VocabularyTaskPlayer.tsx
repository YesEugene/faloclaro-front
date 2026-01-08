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
        if (card.word) {
          // Try to find phrase in database first (by word, not example sentence)
          // Use limit(1) instead of single() to avoid 406 errors when phrase doesn't exist
          try {
            const { data: phraseArray, error: phraseError } = await supabase
              .from('phrases')
              .select('audio_url, id')
              .eq('portuguese_text', card.word)
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
          
          // If no audio URL from database, try Storage fallback
          if (!urls[card.word]) {
            // If not in database, construct URL from Storage path for lesson cards
            // Format: lesson-1/word-{word}.mp3
            const sanitizeForUrl = (text: string) => {
              return text
                .toLowerCase()
                .trim()
                // Remove punctuation and special characters but keep hyphens and spaces
                // Keep: letters, numbers, spaces, hyphens, accented chars
                .replace(/[^\w\s\-àáâãäåèéêëìíîïòóôõöùúûüçñ]/g, '')
                // Normalize accented characters
                .replace(/[àáâãäå]/g, 'a')
                .replace(/[èéêë]/g, 'e')
                .replace(/[ìíîï]/g, 'i')
                .replace(/[òóôõö]/g, 'o')
                .replace(/[ùúûü]/g, 'u')
                .replace(/[ç]/g, 'c')
                .replace(/[ñ]/g, 'n')
                // Replace spaces with dashes (but keep existing hyphens)
                .replace(/\s+/g, '-')
                // Remove multiple consecutive dashes
                .replace(/-+/g, '-')
                // Remove leading/trailing dashes
                .replace(/^-|-$/g, '')
                .substring(0, 100);
            };
            
            const wordSanitized = sanitizeForUrl(card.word || '');
            const filename = `lesson-1-word-${wordSanitized}.mp3`;
            const storagePath = `lesson-1/${filename}`;
            
            console.log(`🔍 Trying to get Storage URL for word: "${card.word}"`);
            console.log(`   Sanitized: "${wordSanitized}"`);
            console.log(`   Storage path: "${storagePath}"`);
            
            // Get public URL from Supabase Storage
            // Note: getPublicUrl doesn't return an error, it always returns a URL
            const { data: urlData } = supabase.storage
              .from('audio')
              .getPublicUrl(storagePath);
            
            if (urlData?.publicUrl) {
              urls[card.word] = urlData.publicUrl;
              console.log(`✅ Generated Storage URL for word: "${card.word}"`);
              console.log(`   URL: ${urlData.publicUrl}`);
              
              // Test if file is accessible
              fetch(urlData.publicUrl, { method: 'HEAD' })
                .then(response => {
                  if (response.ok) {
                    console.log(`✅ File is accessible: ${urlData.publicUrl}`);
                  } else {
                    console.warn(`⚠️  File returned status ${response.status}: ${urlData.publicUrl}`);
                  }
                })
                .catch(error => {
                  console.error(`❌ Error checking file accessibility:`, error);
                });
            } else {
              console.warn(`⚠️  No audio URL found for word: "${card.word}"`);
              console.warn(`   Expected path: ${storagePath}`);
            }
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
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
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
    }
  }, [isPlaying, currentCard, audioUrls, playAudioSafely]);

  const handleAudioEnded = useCallback(() => {
    if (!audioRef.current || !currentCard) return;
    
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
            
            // Auto-play next card after switching
            setTimeout(async () => {
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

      // If infinite mode or not reached max repeats, continue repeating
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
  }, [repeatCount, pauseBetweenRepeats, playAudioSafely, currentCard, currentCardIndex, cards, isRandomMode, audioUrls]);

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
    <div className="space-y-4 pb-24">
      {/* Card - Using existing player design */}
      <div
        className="rounded-[30px] p-4 mb-6 relative touch-none select-none aspect-square shadow-lg flex flex-col"
        style={{
          backgroundColor: clusterColor,
          border: '2px solid white',
        }}
      >
        {/* Timer - Small white rounded badge in top right */}
        {task.ui?.show_timer && requiredTime > 0 && (
          <div 
            className="absolute right-4 bg-white rounded-full py-1.5 shadow-sm" 
            style={{ 
              top: '29px',
              paddingLeft: '16px',
              paddingRight: '16px',
              zIndex: 35
            }}
          >
            <span className="text-xs font-medium text-gray-700 whitespace-nowrap" style={{ height: '12px', fontSize: '12px' }}>
              {formatTime(displayTime)} / {formatTime(requiredTime)}
            </span>
          </div>
        )}

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
            crossOrigin="anonymous"
            onError={(e) => {
              console.error('Audio element error:', e);
              setIsPlaying(false);
            }}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30" style={{ marginBottom: 0 }}>
        <div className="max-w-md mx-auto px-4 pt-[10px] pb-3" style={{ height: '70px' }}>
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

      {/* Completion Section - Always show after completion */}
      {isCompleted && (
        <div className="space-y-4">
          {/* Progress for today */}
          <div className="text-center">
            <p className="text-gray-700 font-medium mb-3" style={{ height: '23px' }}>{t.progressToday}</p>
            
            {/* Stars - Number of filled stars equals task_id */}
            <div className="flex justify-center gap-2 mb-3" style={{ height: '37px' }}>
              {(() => {
                const taskId = task?.task_id || 1;
                const filledStars = taskId;
                const totalStars = 5;
                
                return Array.from({ length: totalStars }, (_, i) => {
                  const isFilled = i < filledStars;
                  return (
                    <img 
                      key={i}
                      src={isFilled ? "/Img/Star-1.svg" : "/Img/Star-2.svg"}
                      alt={isFilled ? "Filled star" : "Empty star"}
                      className="w-8 h-8"
                      style={{ width: '2rem', height: '2rem' }}
                    />
                  );
                });
              })()}
            </div>
            
            {/* Level - Different for each task */}
            <p 
              className="text-black font-bold mb-4"
              style={{ 
                fontSize: '30px', 
                lineHeight: '45px', 
                height: '51px' 
              }}
            >
              {(() => {
                const taskId = task?.task_id || 1;
                if (appLanguage === 'ru') {
                  return taskId === 1 ? 'Начало' : taskId === 2 ? 'Разогрев' : 'Начало';
                } else if (appLanguage === 'en') {
                  return taskId === 1 ? 'Start' : taskId === 2 ? 'Warm-up' : 'Start';
                } else {
                  return taskId === 1 ? 'Início' : taskId === 2 ? 'Aquecimento' : 'Início';
                }
              })()}
            </p>
            
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

