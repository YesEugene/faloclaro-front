'use client';

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Phrase, Translation } from '@/types';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';

// Color palette for cards
const CARD_COLORS = [
  '#94B7F2',
  '#FDFFA4',
  '#FBDDC3',
  '#FAF7BF',
  '#FBC3C8',
  '#84E9F3',
  '#E9B0E4',
  '#90F5D9',
  '#B2FDB0',
  '#91B7FF',
  '#84D4F2',
  '#FA9A9D',
  '#ADA0FF',
];

function TestContent() {
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [nextPhrase, setNextPhrase] = useState<Phrase | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(-1);
  const [nextPhraseIndex, setNextPhraseIndex] = useState(-1);
  const [translation, setTranslation] = useState<string>('');
  const [nextTranslation, setNextTranslation] = useState<string>('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);

  // Swipe state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const swipeOffsetRef = useRef(0);

  // Get color for phrase index
  const getCardColor = (index: number): string => {
    return CARD_COLORS[index % CARD_COLORS.length];
  };

  useEffect(() => {
    loadPhrases();
  }, []);

  useEffect(() => {
    if (phrases.length > 0 && currentPhraseIndex === -1) {
      loadRandomPhrase();
    }
  }, [phrases]);

  useEffect(() => {
    if (phrase) {
      loadTranslation(phrase.id, appLanguage);
      // Auto-play audio when phrase loads
      if (phrase.audio_url && audioRef.current) {
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.play().catch(err => {
              console.error('Error playing audio:', err);
            });
          }
        }, 300);
      }
    }
  }, [phrase, appLanguage]);

  useEffect(() => {
    if (nextPhrase) {
      loadNextTranslation(nextPhrase.id, appLanguage);
    }
  }, [nextPhrase, appLanguage]);

  const loadPhrases = async () => {
    try {
      const { data: phrasesData, error: phrasesError } = await supabase
        .from('phrases')
        .select('*')
        .order('order_index', { ascending: true });

      if (phrasesError) throw phrasesError;
      setPhrases(phrasesData || []);
    } catch (error) {
      console.error('Error loading phrases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRandomPhrase = () => {
    if (phrases.length === 0) return;
    const randomIndex = Math.floor(Math.random() * phrases.length);
    const randomPhrase = phrases[randomIndex];
    setCurrentPhraseIndex(randomIndex);
    setPhrase(randomPhrase);
    setShowTranslation(false);
    
    // Load next phrase for stack effect
    loadNextRandomPhrase(randomIndex);
  };

  const loadNextRandomPhrase = (currentIndex: number) => {
    if (phrases.length === 0) return;
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * phrases.length);
    } while (nextIndex === currentIndex && phrases.length > 1);
    
    const nextRandomPhrase = phrases[nextIndex];
    setNextPhraseIndex(nextIndex);
    setNextPhrase(nextRandomPhrase);
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

  const loadNextTranslation = async (phraseId: string, langCode: string) => {
    try {
      const { data, error } = await supabase
        .from('translations')
        .select('translation_text')
        .eq('phrase_id', phraseId)
        .eq('language_code', langCode)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setNextTranslation(data?.translation_text || '');
    } catch (error) {
      console.error('Error loading next translation:', error);
      setNextTranslation('');
    }
  };

  const handleNextPhrase = () => {
    if (!phrase) return;
    
    // Move next phrase to current
    if (nextPhrase && nextPhraseIndex !== -1) {
      setCurrentPhraseIndex(nextPhraseIndex);
      setPhrase(nextPhrase);
      setTranslation(nextTranslation);
      setShowTranslation(false);
      
      // Load new next phrase
      loadNextRandomPhrase(nextPhraseIndex);
    } else {
      loadRandomPhrase();
    }
    
    // Reset swipe
    setSwipeOffset(0);
    swipeOffsetRef.current = 0;
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
    
    if (Math.abs(currentOffset) > threshold) {
      if (currentOffset < 0) {
        // Swipe left - next phrase
        handleNextPhrase();
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
      
      if (Math.abs(currentOffset) > threshold) {
        if (currentOffset < 0) {
          // Swipe left - next phrase
          handleNextPhrase();
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
  }, [isDragging, startX, phrase, nextPhrase]);

  // Reset swipe on phrase change
  useEffect(() => {
    setSwipeOffset(0);
    swipeOffsetRef.current = 0;
  }, [phrase?.id]);

  // Translations for UI elements
  const translations = {
    en: {
      loading: 'Loading...',
      backToClusters: '← Back to Clusters',
      translationNotAvailable: 'Translation not available',
      viewTranslation: 'View translation',
      nextPhrase: 'Next phrase',
    },
    pt: {
      loading: 'A carregar...',
      backToClusters: '← Voltar aos Clusters',
      translationNotAvailable: 'Tradução não disponível',
      viewTranslation: 'Ver tradução',
      nextPhrase: 'Próxima frase',
    },
    ru: {
      loading: 'Загрузка...',
      backToClusters: '← Назад к тематикам',
      translationNotAvailable: 'Перевод недоступен',
      viewTranslation: 'Посмотреть перевод',
      nextPhrase: 'Следующая фраза',
    },
  };

  const t = translations[appLanguage];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t.loading}</div>
      </div>
    );
  }

  if (!phrase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t.loading}</div>
      </div>
    );
  }

  const currentColor = currentPhraseIndex >= 0 ? getCardColor(currentPhraseIndex) : CARD_COLORS[0];
  const nextColor = nextPhraseIndex >= 0 ? getCardColor(nextPhraseIndex) : currentColor;

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
            onClick={() => router.push('/clusters')}
            className="block w-full px-4 py-2 rounded-[10px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center"
          >
            {t.backToClusters}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-6">
        {/* Cards Stack Container */}
        <div className="relative mb-6" style={{ aspectRatio: '1 / 1' }}>
          {/* Next Card (Background) */}
          {nextPhrase && (
            <div
              className="absolute inset-0 rounded-[30px] p-8 shadow-lg flex flex-col"
              style={{
                backgroundColor: nextColor,
                border: '2px solid white',
                transform: 'scale(0.95)',
                zIndex: 0,
              }}
            >
              {/* Progress Indicator */}
              <div className="text-black text-center mt-5 mb-5 opacity-50">
                Test
              </div>

              {/* Portuguese Text */}
              <div className="text-4xl font-bold mb-5 text-center opacity-50" style={{ color: '#000000' }}>
                {nextPhrase.portuguese_text}
              </div>
              
              {/* IPA Transcription */}
              <div className="text-base text-center mb-5 font-mono opacity-50" style={{ color: '#A9A789' }}>
                {nextPhrase.ipa_transcription ? `/${nextPhrase.ipa_transcription}/` : ''}
              </div>
            </div>
          )}

          {/* Current Card (Foreground) */}
          <div
            ref={cardRef}
            className="absolute inset-0 rounded-[30px] p-8 shadow-lg flex flex-col touch-none select-none"
            style={{
              backgroundColor: currentColor,
              border: '2px solid white',
              transform: `translateX(${swipeOffset}px) rotate(${swipeOffset * 0.1}deg)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease-out',
              cursor: isDragging ? 'grabbing' : 'grab',
              opacity: isDragging ? 1 - Math.abs(swipeOffset) / 500 : 1,
              zIndex: 1,
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
          >
            {/* Progress Indicator - Top Center */}
            <div className="text-black text-center mt-5 mb-5">
              Test
            </div>

            {/* Portuguese Text */}
            <div className="text-4xl font-bold mb-5 text-center" style={{ color: '#000000' }}>
              {phrase.portuguese_text}
            </div>
            
            {/* IPA Transcription */}
            <div className="text-base text-center mb-5 font-mono" style={{ color: '#A9A789' }}>
              {phrase.ipa_transcription ? `/${phrase.ipa_transcription}/` : 'Тут должна быть транскрипция фразы'}
            </div>

            {/* View Translation Button */}
            {!showTranslation && (
              <button
                onClick={() => setShowTranslation(true)}
                className="text-black text-center mb-4 hover:opacity-80 transition-opacity underline"
              >
                {t.viewTranslation}
              </button>
            )}

            {/* Translation on White Card */}
            {showTranslation && (
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
            )}

            {/* Audio Element */}
            {phrase.audio_url && (
              <audio
                ref={audioRef}
                src={phrase.audio_url}
                preload="auto"
              />
            )}
          </div>
        </div>

        {/* Next Phrase Button */}
        <button
          onClick={handleNextPhrase}
          className="w-full px-4 py-3 rounded-[10px] bg-[#F03F3F] text-white hover:opacity-90 transition-colors text-center font-semibold"
        >
          {t.nextPhrase}
        </button>
      </div>
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <TestContent />
    </Suspense>
  );
}
