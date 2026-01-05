'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Phrase, Translation } from '@/types';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';

function PlayerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  const phraseId = searchParams.get('phraseId') || '';
  const currentIndex = parseInt(searchParams.get('index') || '0');
  const clusterIds = searchParams.get('clusters') || '';
  const autoPlay = searchParams.get('autoPlay') === 'true';

  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [translation, setTranslation] = useState<string>('');
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
  const currentIndexRef = useRef(currentIndex);

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

  useEffect(() => {
    loadData();
  }, [phraseId]);

  useEffect(() => {
    if (phrase) {
      loadTranslation(phrase.id, appLanguage);
      // Reset repeat counter when phrase changes
      setCurrentRepeat(0);
    }
  }, [phrase?.id, appLanguage]);

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
    };
  }, []);

  const loadData = async () => {
    try {
      // Load all phrases for navigation
      let phrasesQuery = supabase
        .from('phrases')
        .select('*');

      if (clusterIds !== 'all') {
        const ids = clusterIds.split(',');
        phrasesQuery = phrasesQuery.in('cluster_id', ids);
      }

      const { data: phrasesData, error: phrasesError } = await phrasesQuery
        .order('order_index', { ascending: true });

      if (phrasesError) throw phrasesError;
      setPhrases(phrasesData || []);

      // Load current phrase
      const { data: phraseData, error: phraseError } = await supabase
        .from('phrases')
        .select('*')
        .eq('id', phraseId)
        .single();

      if (phraseError) throw phraseError;
      setPhrase(phraseData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
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

  const handlePlayPause = () => {
    if (!audioRef.current || !phrase || !phrase.audio_url) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (repeatTimeoutRef.current) {
        clearTimeout(repeatTimeoutRef.current);
      }
    } else {
      startPlayback();
    }
  };

  const handleAudioEnded = () => {
    if (!audioRef.current || !phrase) return;

    // Use functional update to ensure we have the latest currentRepeat value
    // This prevents race conditions when multiple onEnded events fire quickly
    setCurrentRepeat((prevRepeat) => {
      const newRepeat = prevRepeat + 1;
      const maxRepeats = repeatCount === 'infinite' ? Infinity : repeatCount;

      // If we've reached the max repeats, stop playing
      if (newRepeat >= maxRepeats) {
        // Update counter first to show final count
        // Then stop playing and advance to next phrase
        setTimeout(() => {
          setIsPlaying(false);
          // Auto-advance to next phrase with auto-play
          if (repeatCount !== 'infinite') {
            setTimeout(() => {
              if (isRandomMode) {
                const randomIndex = getRandomPhraseIndex();
                navigateToPhrase(randomIndex, true); // Pass true to auto-play
              } else if (currentIndex < phrases.length - 1) {
                navigateToPhrase(currentIndex + 1, true); // Pass true to auto-play
              }
            }, 500);
          }
        }, 0);
        return newRepeat; // Update counter to show final count
      }

      // Continue to next repeat - schedule the next playback
      // Use a small delay to ensure state update completes and UI reflects the new count
      const playNext = () => {
        if (!audioRef.current || !phrase) return;
        
        // Ensure audio element is ready
        if (audioRef.current.readyState < 2) {
          // Audio not loaded yet, wait for it
          audioRef.current.addEventListener('canplay', () => {
            if (audioRef.current && phrase) {
              audioRef.current.playbackRate = playbackSpeed;
              audioRef.current.currentTime = 0;
              audioRef.current.play()
                .then(() => {
                  setIsPlaying(true);
                })
                .catch((error) => {
                  console.error('Error playing next repeat:', error);
                  setIsPlaying(false);
                });
            }
          }, { once: true });
          return;
        }

        // Audio is ready, play immediately
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.currentTime = 0;
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error('Error playing next repeat:', error);
            setIsPlaying(false);
          });
      };

      if (pauseBetweenRepeats > 0) {
        repeatTimeoutRef.current = setTimeout(playNext, pauseBetweenRepeats * 1000);
      } else {
        // Small delay to ensure state update completes and DOM updates
        repeatTimeoutRef.current = setTimeout(playNext, 100);
      }

      return newRepeat; // Update counter
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
    const autoPlayParam = shouldAutoPlay ? '&autoPlay=true' : '';
    router.push(`/player?phraseId=${newPhrase.id}&index=${index}&clusters=${clusterIds}${autoPlayParam}`);
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

        {/* Back Button */}
        <div className="max-w-md mx-auto px-4 mb-[10px]">
          <button
            onClick={() => router.push(`/phrases?clusters=${clusterIds}`)}
            className="block w-full px-4 py-2 rounded-[10px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center"
          >
            {t.backToPhrases}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-24 relative">
        {/* Red Phrase Card with Swipe */}
        <div
          ref={cardRef}
          className="bg-[#F03F3F] rounded-[30px] p-4 mb-6 relative touch-none select-none aspect-square shadow-lg flex flex-col"
          style={{
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
          <div className="text-white text-center mt-5 mb-5">
            {currentIndex + 1} / {phrases.length}
          </div>

          {/* Portuguese Text */}
          <div className="text-4xl font-bold mb-5 text-center" style={{ color: '#ECF700' }}>
            {phrase.portuguese_text}
          </div>
          
          {/* IPA Transcription */}
          <div className="text-base text-center mb-5 font-mono" style={{ color: '#FFCDCD' }}>
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

          {/* Movie Information (for movie quotes) */}
          {phrase.movie_title && (
            <div className="mt-2 mb-2 border-t border-white/30 pt-2">
              <div className="text-sm text-white text-center">
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
            className="p-4 rounded-full bg-[#F03F3F] text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
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

