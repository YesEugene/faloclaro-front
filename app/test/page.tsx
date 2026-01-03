'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Phrase, Translation } from '@/types';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';

function TestContent() {
  const router = useRouter();
  const { language: appLanguage } = useAppLanguage();
  
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [translation, setTranslation] = useState<string>('');
  const [showTranslation, setShowTranslation] = useState(false);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadPhrases();
  }, []);

  useEffect(() => {
    if (phrases.length > 0 && !phrase) {
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
    setPhrase(randomPhrase);
    setShowTranslation(false); // Reset translation visibility
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

  const handleNextPhrase = () => {
    loadRandomPhrase();
  };

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
        {/* Red Phrase Card */}
        <div className="bg-[#F03F3F] rounded-[30px] p-8 mb-6 relative aspect-square shadow-lg flex flex-col"
          style={{
            border: '2px solid white',
          }}
        >
          {/* Progress Indicator - Top Center */}
          <div className="text-white text-center mt-5 mb-5">
            Test
          </div>

          {/* Portuguese Text */}
          <div className="text-4xl font-bold mb-5 text-center" style={{ color: '#ECF700' }}>
            {phrase.portuguese_text}
          </div>
          
          {/* IPA Transcription */}
          <div className="text-base text-center mb-5 font-mono" style={{ color: '#FFCDCD' }}>
            {phrase.ipa_transcription ? `/${phrase.ipa_transcription}/` : 'Тут должна быть транскрипция фразы'}
          </div>

          {/* View Translation Button */}
          {!showTranslation && (
            <button
              onClick={() => setShowTranslation(true)}
              className="text-white text-center mb-4 hover:opacity-80 transition-opacity underline"
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

