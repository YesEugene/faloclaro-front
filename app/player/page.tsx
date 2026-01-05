'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Phrase, Translation } from '@/types';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';
import { getClusterColor } from '@/lib/cluster-config';

function PlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  const phraseId = searchParams.get('phraseId') || '';
  const urlIndex = parseInt(searchParams.get('index') || '0');
  const [currentIndex, setCurrentIndex] = useState(urlIndex);
  const clusterIds = searchParams.get('clusters') || '';
  const clusterId = searchParams.get('cluster') || ''; // Single cluster ID
  const phraseType = searchParams.get('phraseType') || ''; // word, short_sentence, long_sentence, all
  const autoPlay = searchParams.get('autoPlay') === 'true';

  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [translation, setTranslation] = useState<string>('');
  const [wordTranslation, setWordTranslation] = useState<string>(''); // Translation for word type
  const [wordTranslations, setWordTranslations] = useState<{
    ptSentence?: string;
    ruSentence?: string;
    enSentence?: string;
    ru?: string;
    en?: string;
  }>({});
  const [clusterName, setClusterName] = useState<string>(''); // Cluster name for navigation
  const [loading, setLoading] = useState(true);

  // Audio controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [pauseBetweenRepeats, setPauseBetweenRepeats] = useState(0);
  const [repeatCount, setRepeatCount] = useState<number | 'infinite'>('infinite');
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isRandomMode, setIsRandomMode] = useState(false);

  // Swipe state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const repeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const swipeOffsetRef = useRef(0);
  const currentIndexRef = useRef(urlIndex);
  const isRepeatingRef = useRef(false); // Prevent multiple handleAudioEnded calls
  const playStartTimeRef = useRef<number | null>(null); // Track when playback started
  const playbackWatchdogRef = useRef<NodeJS.Timeout | null>(null); // Watchdog timer for stuck playback

  // Load settings from localStorage on mount
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

  // Load phrases only when clusterId or phraseType changes, not on every phraseId change
  useEffect(() => {
    if (clusterId || clusterIds) {
      loadPhrases();
    }
  }, [clusterId, clusterIds, phraseType]);

  // Load current phrase when phraseId changes or when phrases array is ready
  useEffect(() => {
    if (phraseId && phrases.length > 0) {
      // Find phrase in already loaded phrases array
      const foundPhrase = phrases.find(p => p.id === phraseId);
      if (foundPhrase) {
        setPhrase(foundPhrase);
        // Update currentIndex based on found phrase position
        const foundIndex = phrases.findIndex(p => p.id === phraseId);
        if (foundIndex !== -1 && foundIndex !== currentIndex) {
          setCurrentIndex(foundIndex);
          currentIndexRef.current = foundIndex;
        }
        setLoading(false);
      } else {
        // If not found, load it separately (fallback)
        loadSinglePhrase(phraseId);
      }
    } else if (phrases.length > 0 && !phraseId) {
      // If no phraseId, load first phrase
      setPhrase(phrases[0]);
      setCurrentIndex(0);
      currentIndexRef.current = 0;
      setLoading(false);
    }
  }, [phraseId, phrases]);

  useEffect(() => {
    if (phrase) {
      if (phrase.phrase_type === 'word') {
        // Load all translations for word type
        loadWordTranslations(phrase.id);
      } else {
        // Load regular translation for sentences
        loadTranslation(phrase.id, appLanguage);
        setWordTranslations({});
      }
      // Reset repeat counter when phrase changes
      setCurrentRepeat(0);
      isRepeatingRef.current = false; // Reset repeat flag
      playStartTimeRef.current = null;
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
      if (playbackWatchdogRef.current) {
        clearTimeout(playbackWatchdogRef.current);
        playbackWatchdogRef.current = null;
      }
    }
  }, [phrase?.id, phrase?.phrase_type, appLanguage]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
    // Save to localStorage
    localStorage.setItem('playbackSpeed', playbackSpeed.toString());
  }, [playbackSpeed]);

  // Apply playback speed when phrase changes (critical fix)
  useEffect(() => {
    if (audioRef.current && phrase?.audio_url) {
      // Apply saved playback speed immediately when audio element is ready
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [phrase?.id, phrase?.audio_url, playbackSpeed]);

  // Define startPlayback function (must be before useEffect that uses it)
  const startPlayback = useCallback(() => {
    if (!audioRef.current || !phrase || !phrase.audio_url) return;

    // Apply playback speed before playing (critical fix)
    audioRef.current.playbackRate = playbackSpeed;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
    setCurrentRepeat(0);
  }, [phrase, phrase?.audio_url, playbackSpeed]);

  // Handle auto-play when audio is loaded
  const handleAudioLoaded = useCallback(() => {
    if (autoPlay && audioRef.current && phrase && phrase.audio_url) {
      // Remove autoPlay parameter from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('autoPlay');
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
      
      // Start playback
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.currentTime = 0;
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setCurrentRepeat(0);
        })
        .catch((error) => {
          console.error('Auto-play failed:', error);
          setIsPlaying(false);
        });
    }
  }, [autoPlay, phrase, phrase?.audio_url, playbackSpeed, router]);

  useEffect(() => {
    localStorage.setItem('pauseBetweenRepeats', pauseBetweenRepeats.toString());
  }, [pauseBetweenRepeats]);

  useEffect(() => {
    localStorage.setItem('repeatCount', repeatCount.toString());
  }, [repeatCount]);

  useEffect(() => {
    localStorage.setItem('isRandomMode', isRandomMode.toString());
  }, [isRandomMode]);

  useEffect(() => {
    return () => {
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
      if (playbackWatchdogRef.current) {
        clearTimeout(playbackWatchdogRef.current);
      }
    };
  }, []);

  // Load cluster name once
  useEffect(() => {
    if (clusterId && !clusterName) {
      loadClusterName();
    }
  }, [clusterId]);

  const loadClusterName = async () => {
    try {
      const { data: clusterData, error: clusterError } = await supabase
        .from('clusters')
        .select('name')
        .eq('id', clusterId)
        .single();
      
      if (!clusterError && clusterData) {
        setClusterName(clusterData.name);
      }
    } catch (error) {
      console.error('Error loading cluster name:', error);
    }
  };

  // Load all phrases (only once when filters change)
  const loadPhrases = async () => {
    try {
      setLoading(true);
      
      // Load all phrases for navigation
      let phrasesQuery = supabase
        .from('phrases')
        .select('*');

      // Support both old (clusters) and new (cluster) parameters
      if (clusterId) {
        phrasesQuery = phrasesQuery.eq('cluster_id', clusterId);
      } else if (clusterIds && clusterIds !== 'all') {
        const ids = clusterIds.split(',');
        phrasesQuery = phrasesQuery.in('cluster_id', ids);
      }

      // Filter by phrase type if specified
      if (phraseType && phraseType !== 'all') {
        phrasesQuery = phrasesQuery.eq('phrase_type', phraseType);
      }

      const { data: phrasesData, error: phrasesError } = await phrasesQuery
        .order('order_index', { ascending: true });

      if (phrasesError) throw phrasesError;
      setPhrases(phrasesData || []);

      // If we have phraseId, find it in the loaded phrases
      if (phraseId && phrasesData) {
        const foundPhrase = phrasesData.find(p => p.id === phraseId);
        if (foundPhrase) {
          setPhrase(foundPhrase);
        }
      } else if (phrasesData && phrasesData.length > 0) {
        // If no phraseId, load first phrase
        setPhrase(phrasesData[0]);
      }
    } catch (error) {
      console.error('Error loading phrases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load single phrase (fallback if not found in array)
  const loadSinglePhrase = async (id: string) => {
    try {
      const { data: phraseData, error: phraseError } = await supabase
        .from('phrases')
        .select('*')
        .eq('id', id)
        .single();

      if (phraseError) throw phraseError;
      setPhrase(phraseData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading phrase:', error);
      setLoading(false);
    }
  };

  const loadTranslation = async (phraseId: string, langCode: string) => {
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('translation_text')
        .eq('phrase_id', phraseId)
        .eq('language_code', langCode)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTranslation(data?.translation_text || '');
    } catch (error) {
      console.error('Error loading translation:', error);
      setTranslation('');
    }
  };

  const loadWordTranslations = async (phraseId: string) => {
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('language_code, translation_text')
        .eq('phrase_id', phraseId);

      if (error) throw error;

      const translations: {
        ptSentence?: string;
        ruSentence?: string;
        enSentence?: string;
        ru?: string;
        en?: string;
      } = {};

      data?.forEach((t) => {
        if (t.language_code === 'pt-sentence') {
          translations.ptSentence = t.translation_text;
        } else if (t.language_code === 'ru-sentence') {
          translations.ruSentence = t.translation_text;
        } else if (t.language_code === 'en-sentence') {
          translations.enSentence = t.translation_text;
        } else if (t.language_code === 'ru') {
          translations.ru = t.translation_text;
        } else if (t.language_code === 'en') {
          translations.en = t.translation_text;
        }
      });

      setWordTranslations(translations);
    } catch (error) {
      console.error('Error loading word translations:', error);
      setWordTranslations({});
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !phrase || !phrase.audio_url) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
      if (playbackWatchdogRef.current) {
        clearTimeout(playbackWatchdogRef.current);
        playbackWatchdogRef.current = null;
      }
      playStartTimeRef.current = null;
      isRepeatingRef.current = false; // Reset repeat flag
    } else {
      isRepeatingRef.current = false; // Reset repeat flag
      playStartTimeRef.current = null;
      startPlayback();
    }
  };

  const handleAudioEnded = () => {
    if (!audioRef.current || !phrase) return;
    
    // Prevent multiple simultaneous calls - simple guard
    if (isRepeatingRef.current) {
      return;
    }
    
    // Block further calls immediately
    isRepeatingRef.current = true;

    // Use functional update to ensure we have the latest currentRepeat value
    setCurrentRepeat((prevRepeat) => {
      const newRepeat = prevRepeat + 1;
      const maxRepeats = repeatCount === 'infinite' ? Infinity : repeatCount;

      // If we've reached the max repeats, stop playing
      if (newRepeat >= maxRepeats) {
        setIsPlaying(false);
        isRepeatingRef.current = false;
        // Auto-advance to next phrase with auto-play
        if (repeatCount !== 'infinite') {
          setTimeout(() => {
            if (isRandomMode) {
              const randomIndex = getRandomPhraseIndex();
              navigateToPhrase(randomIndex, true);
            } else if (currentIndex < phrases.length - 1) {
              navigateToPhrase(currentIndex + 1, true);
            }
          }, 500);
        }
        return newRepeat;
      }

      // Calculate pause delay: user setting (in seconds, convert to ms)
      const pauseDelay = pauseBetweenRepeats * 1000;
      
      // Schedule next playback after pause
      repeatTimeoutRef.current = setTimeout(() => {
        if (!audioRef.current || !phrase) {
          isRepeatingRef.current = false;
          return;
        }
        
        // Reset audio and set playback speed
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.currentTime = 0;
        
        // Start playback
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            // Reset flag after playback successfully started
            // Use a delay to ensure playback actually began and prevent double triggers
            setTimeout(() => {
              isRepeatingRef.current = false;
            }, 300);
          })
          .catch((error) => {
            console.error('Error playing next repeat:', error);
            setIsPlaying(false);
            isRepeatingRef.current = false;
          });
      }, pauseDelay);

      // Update counter immediately
      return newRepeat;
    });
  };

  const getRandomPhraseIndex = (): number => {
    if (phrases.length === 0) return 0;
    if (phrases.length === 1) return 0;
    
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * phrases.length);
    } while (randomIndex === currentIndex && phrases.length > 1);
    
    return randomIndex;
  };

  const navigateToPhrase = (index: number, shouldAutoPlay: boolean = false) => {
    if (index < 0 || index >= phrases.length) return;
    const newPhrase = phrases[index];
    
    // Update state immediately for instant UI update
    setPhrase(newPhrase);
    setCurrentIndex(index);
    currentIndexRef.current = index;
    
    // Update URL without page reload (shallow routing)
    const params = new URLSearchParams();
    params.set('phraseId', newPhrase.id);
    params.set('index', index.toString());
    
    if (clusterId) {
      params.set('cluster', clusterId);
      if (phraseType) params.set('phraseType', phraseType);
    } else if (clusterIds) {
      params.set('clusters', clusterIds);
    }
    
    if (shouldAutoPlay) {
      params.set('autoPlay', 'true');
    }
    
    // Use replace instead of push to avoid adding to history, and scroll: false to prevent scroll
    router.replace(`/player?${params.toString()}`, { scroll: false });
  };

  const handlePrevious = () => {
    if (isRandomMode) {
      const randomIndex = getRandomPhraseIndex();
      navigateToPhrase(randomIndex);
    } else {
      navigateToPhrase(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (isRandomMode) {
      const randomIndex = getRandomPhraseIndex();
      navigateToPhrase(randomIndex);
    } else {
      navigateToPhrase(currentIndex + 1);
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setSwipeOffset(diff);
    swipeOffsetRef.current = diff;
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = 100; // Minimum swipe distance
    const currentOffset = swipeOffsetRef.current;
    const idx = currentIndexRef.current;
    
    if (Math.abs(currentOffset) > threshold) {
      if (currentOffset > 0) {
        // Swipe right - previous phrase
        if (isRandomMode) {
          const randomIndex = getRandomPhraseIndex();
          navigateToPhrase(randomIndex);
        } else if (idx > 0) {
          navigateToPhrase(idx - 1);
        }
      } else {
        // Swipe left - next phrase
        if (isRandomMode) {
          const randomIndex = getRandomPhraseIndex();
          navigateToPhrase(randomIndex);
        } else if (idx < phrases.length - 1) {
          navigateToPhrase(idx + 1);
        }
      }
    }
    setSwipeOffset(0);
    swipeOffsetRef.current = 0;
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartX(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentX = e.clientX;
      const diff = currentX - startX;
      setSwipeOffset(diff);
      swipeOffsetRef.current = diff;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      
      const threshold = 100;
      const currentOffset = swipeOffsetRef.current;
      const idx = currentIndexRef.current;
      
      if (Math.abs(currentOffset) > threshold) {
        if (currentOffset > 0) {
          // Swipe right - previous phrase
          if (isRandomMode) {
            const randomIndex = getRandomPhraseIndex();
            navigateToPhrase(randomIndex);
          } else if (idx > 0) {
            navigateToPhrase(idx - 1);
          }
        } else {
          // Swipe left - next phrase
          if (isRandomMode) {
            const randomIndex = getRandomPhraseIndex();
            navigateToPhrase(randomIndex);
          } else if (idx < phrases.length - 1) {
            navigateToPhrase(idx + 1);
          }
        }
      }
      setSwipeOffset(0);
      swipeOffsetRef.current = 0;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, startX, phrases.length, isRandomMode, currentIndex]);

  // Update refs when values change
  useEffect(() => {
    swipeOffsetRef.current = swipeOffset;
  }, [swipeOffset]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  // Reset swipe on phrase change
  useEffect(() => {
    setSwipeOffset(0);
  }, [phraseId]);

  // Translations for UI elements
  const translations = {
    en: {
      loading: 'Loading...',
      backToPhrases: '← Back to Phrases',
      back: 'Back',
      dictionaryList: 'Dictionary List',
      translationNotAvailable: 'Translation not available',
      playbackSpeed: 'Playback Speed',
      pauseBetweenRepeats: 'Pause Between Repeats',
      repeatCount: 'Repeat Count',
      infinite: 'Infinite',
      repeat: 'Repeat',
      play: 'Play',
      pause: 'Pause',
      previous: 'Previous phrase',
      next: 'Next phrase',
      settings: 'Settings',
      nextPhrase: 'Next phrase',
      randomMode: 'Random Mode',
    },
    pt: {
      loading: 'A carregar...',
      backToPhrases: '← Voltar às Frases',
      back: 'Voltar',
      dictionaryList: 'Dicionário Lista',
      translationNotAvailable: 'Tradução não disponível',
      playbackSpeed: 'Velocidade de Reprodução',
      pauseBetweenRepeats: 'Pausa Entre Repetições',
      repeatCount: 'Número de Repetições',
      infinite: 'Infinito',
      repeat: 'Repetir',
      play: 'Reproduzir',
      pause: 'Pausar',
      previous: 'Frase anterior',
      next: 'Próxima frase',
      settings: 'Configurações',
      nextPhrase: 'Próxima frase',
      randomMode: 'Modo Aleatório',
    },
    ru: {
      loading: 'Загрузка...',
      backToPhrases: '← Назад к тематикам',
      back: 'Назад',
      dictionaryList: 'Словарь списком',
      translationNotAvailable: 'Перевод недоступен',
      playbackSpeed: 'Скорость воспроизведения',
      pauseBetweenRepeats: 'Пауза между повторениями',
      repeatCount: 'Количество повторений',
      infinite: 'Бесконечно',
      repeat: 'Повтор',
      play: 'Воспроизвести',
      pause: 'Пауза',
      previous: 'Предыдущая фраза',
      next: 'Следующая фраза',
      settings: 'Настройки',
      nextPhrase: 'Следующая фраза',
      randomMode: 'Случайный порядок',
    },
  };

  const t = translations[appLanguage];

  if (loading || !phrase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/clusters" className="flex items-center cursor-pointer">
            <Image
              src="/Img/Logo FaloClaro.svg"
              alt="FaloClaro"
              width={120}
              height={40}
              className="h-10 w-auto"
              style={{ width: 'auto', height: '40px' }}
            />
          </Link>
          
          {/* Language Selector */}
          <div className="flex items-center">
            <LanguageSelector />
          </div>
        </div>

        {/* Back and Dictionary Buttons */}
        <div className="max-w-md mx-auto px-4 mb-[10px] flex gap-[10px]">
          <button
            onClick={() => {
              if (clusterId && clusterName) {
                router.push(`/subcategories?cluster=${clusterId}&name=${encodeURIComponent(clusterName)}`);
              } else {
                router.push('/clusters');
              }
            }}
            className="px-4 py-2 rounded-[10px] transition-colors text-center"
            style={{ 
              backgroundColor: '#EDF3FF',
              width: 'calc(50% - 5px)',
            }}
          >
            <span className="text-gray-700">← {t.back}</span>
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (clusterId) {
                params.set('cluster', clusterId);
                if (phraseType) params.set('phraseType', phraseType);
              } else if (clusterIds) {
                params.set('clusters', clusterIds);
              }
              // Save current phraseId to return to it later
              if (phraseId) {
                params.set('returnPhraseId', phraseId);
                params.set('returnIndex', currentIndex.toString());
              }
              router.push(`/phrases?${params.toString()}`);
            }}
            className="px-4 py-2 rounded-[10px] bg-white border-2 border-gray-300 text-black hover:bg-gray-50 transition-colors text-center font-medium"
            style={{ 
              width: 'calc(50% - 5px)',
              transform: 'translateY(1px)',
              fontWeight: 500,
            }}
          >
            {t.dictionaryList}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-24 relative">
        {/* Phrase Card with Swipe - Color based on cluster */}
        <div
          ref={cardRef}
          className="rounded-[30px] p-4 mb-6 relative touch-none select-none aspect-square shadow-lg flex flex-col"
          style={{
            backgroundColor: clusterName ? getClusterColor(clusterName) : '#F03F3F', // Fallback to red if no cluster
            transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.1}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 1 - Math.abs(swipeOffset) / 500 : 1,
            border: '2px solid white',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          {/* Progress Indicator - Top Center */}
          <div className="text-black text-center mt-5 mb-5 font-medium">
            {currentIndex + 1} / {phrases.length}
          </div>

          {/* Different card structure for word type */}
          {phrase.phrase_type === 'word' ? (
            <>
              {/* Word (large) */}
              <div className="text-5xl font-bold mb-4 text-center text-black">
                {phrase.portuguese_text}
              </div>
              
              {/* IPA Transcription */}
              <div className="text-lg text-center mb-3 font-mono text-black">
                {phrase.ipa_transcription ? `/${phrase.ipa_transcription}/` : ''}
              </div>

              {/* PT sentence (example usage) */}
              {wordTranslations.ptSentence && (
                <div className="text-base text-center mb-2 text-black">
                  <span className="font-semibold">PT sentence: </span>
                  {wordTranslations.ptSentence}
                </div>
              )}

              {/* RU sentence (translation of example) */}
              {wordTranslations.ruSentence && (
                <div className="text-base text-center mb-2 text-black">
                  <span className="font-semibold">RU sentence: </span>
                  {wordTranslations.ruSentence}
                </div>
              )}

              {/* EN sentence (translation of example) */}
              {wordTranslations.enSentence && (
                <div className="text-base text-center mb-4 text-black">
                  <span className="font-semibold">EN sentence: </span>
                  {wordTranslations.enSentence}
                </div>
              )}

              {/* Word translations in white card */}
              <div className="mt-auto mx-[10px] mb-3">
                {(wordTranslations.ru || wordTranslations.en) ? (
                  <div className="bg-white rounded-[20px] p-4 text-center">
                    {wordTranslations.ru && (
                      <div className="text-xl text-gray-900 font-semibold mb-2">
                        {wordTranslations.ru}
                      </div>
                    )}
                    {wordTranslations.en && (
                      <div className="text-xl text-gray-900 font-semibold">
                        {wordTranslations.en}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-[20px] p-4 text-center">
                    <div className="text-sm text-gray-500 italic">
                      {t.translationNotAvailable}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Portuguese Text */}
              <div className="text-4xl font-bold mb-5 text-center text-black">
                {phrase.portuguese_text}
              </div>
              
              {/* IPA Transcription */}
              <div className="text-base text-center mb-5 font-mono text-black">
                {phrase.ipa_transcription ? `/${phrase.ipa_transcription}/` : 'Тут должна быть транскрипция фразы'}
              </div>

              {/* Translation on White Card */}
              <div className="mt-auto mx-[10px] mb-[10px]">
                {translation ? (
                  <div className="bg-white rounded-[20px] p-4 text-center">
                    <div className="text-xl text-gray-900 font-medium">
                      {translation}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-[20px] p-4 text-center">
                    <div className="text-sm text-gray-500 italic">
                      {t.translationNotAvailable}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Movie Information (for movie quotes) */}
          {phrase.movie_title && (
            <div className="mt-2 mb-2 border-t border-black/30 pt-2">
              <div className="text-sm text-black text-center">
                <div className="font-semibold text-base mb-1">
                  {phrase.movie_title}
                  {phrase.movie_year && ` (${phrase.movie_year})`}
                </div>
                {phrase.movie_character && (
                  <div className="text-sm italic">
                    — {phrase.movie_character}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Audio Element */}
          {phrase.audio_url && (
            <audio
              ref={audioRef}
              src={phrase.audio_url}
              onEnded={handleAudioEnded}
              onLoadedData={handleAudioLoaded}
              preload="auto"
            />
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="p-3 rounded-full bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t.previous}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
            </svg>
          </button>

          <button
            onClick={handlePlayPause}
            disabled={!phrase.audio_url}
            className="p-4 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
            style={{ 
              backgroundColor: clusterName ? getClusterColor(clusterName) : '#F03F3F' // Use cluster color or fallback to red
            }}
            aria-label={isPlaying ? t.pause : t.play}
          >
            {isPlaying ? (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20" style={{ display: 'block', margin: '0 auto' }}>
                <rect x="6" y="3" width="3.5" height="14" rx="0.75" />
                <rect x="10.5" y="3" width="3.5" height="14" rx="0.75" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex === phrases.length - 1}
            className="p-3 rounded-full bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t.next}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0011 6v2.798l-5.445-3.63z" />
            </svg>
          </button>
        </div>

      </div>

      {/* Settings Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-md mx-auto px-4 py-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full px-4 py-3 rounded-[10px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center"
          >
            {t.settings}
          </button>
        </div>
      </div>

      {/* Settings Panel (Slide-up) */}
      <div
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] shadow-2xl transition-transform duration-300 z-50 ${
          showSettings ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div className="max-w-md mx-auto px-4 py-6">
          {/* Close Button */}
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
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="font-medium">
                {t.randomMode}
              </span>
              {isRandomMode && (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
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

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <PlayerContent />
    </Suspense>
  );
}

