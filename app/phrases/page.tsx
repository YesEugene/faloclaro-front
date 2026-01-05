'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Phrase, Translation } from '@/types';
import Link from 'next/link';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';

function PhrasesContent() {
  const searchParams = useSearchParams();
  const clusterIds = searchParams.get('clusters') || '';
  const clusterId = searchParams.get('cluster') || '';
  const phraseType = searchParams.get('phraseType') || '';
  const { language } = useAppLanguage();
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clusterIds || clusterId) {
      loadPhrases();
    }
  }, [clusterIds, clusterId, phraseType, language]);

  const loadPhrases = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('phrases')
        .select('*');

      // Support both old (clusters) and new (cluster) parameters
      if (clusterId) {
        query = query.eq('cluster_id', clusterId);
      } else if (clusterIds && clusterIds !== 'all') {
        const ids = clusterIds.split(',');
        query = query.in('cluster_id', ids);
      }

      // Filter by phrase type if specified
      if (phraseType && phraseType !== 'all') {
        query = query.eq('phrase_type', phraseType);
      }

      const { data: phrasesData, error: phrasesError } = await query.order('order_index', { ascending: true });

      if (phrasesError) throw phrasesError;
      setPhrases(phrasesData || []);

      // Load translations for selected language immediately after loading phrases
      if (phrasesData && phrasesData.length > 0 && language) {
        await loadTranslationsForPhrases(phrasesData.map(p => p.id));
      }
    } catch (error) {
      console.error('Error loading phrases:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTranslationsForPhrases = async (phraseIds: string[]) => {
    if (phraseIds.length === 0 || !language) return;

    try {
      const { data: translationsData, error: translationsError } = await supabase
        .from('translations')
        .select('phrase_id, translation_text')
        .in('phrase_id', phraseIds)
        .eq('language_code', language);

      if (!translationsError && translationsData) {
        const translationsMap: Record<string, string> = {};
        translationsData.forEach(t => {
          translationsMap[t.phrase_id] = t.translation_text;
        });
        setTranslations(translationsMap);
      }
    } catch (error) {
      console.error('Error loading translations:', error);
    }
  };

  useEffect(() => {
    if (clusterIds && phrases.length > 0 && language) {
      // Reload translations when language changes
      loadTranslationsForPhrases(phrases.map(p => p.id));
    }
  }, [language]);

  // UI translations (separate from phrase translations state)
  const uiTranslations = {
    en: {
      loading: 'Loading...',
      backToClusters: '← Назад к темам',
      noPhrases: 'No phrases found. Please select clusters first.',
      phrases: 'Phrases',
    },
    pt: {
      loading: 'A carregar...',
      backToClusters: '← Назад к темам',
      noPhrases: 'Nenhuma frase encontrada. Por favor, selecione clusters primeiro.',
      phrases: 'Frases',
    },
    ru: {
      loading: 'Загрузка...',
      backToClusters: '← Назад к темам',
      noPhrases: 'Фразы не найдены. Пожалуйста, сначала выберите кластеры.',
      phrases: 'Фразы',
    },
  };

  const t = uiTranslations[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 pb-[10px]">
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
        <div className="max-w-md mx-auto px-4">
          <Link 
            href="/clusters" 
            className="block w-full px-4 py-2 rounded-[10px] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-center"
          >
            {t.backToClusters}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-6">
      <div className="space-y-3">
        {phrases.map((phrase, index) => {
          const translation = translations[phrase.id];
          return (
            <Link
              key={phrase.id}
              href={`/player?phraseId=${phrase.id}&index=${index}&clusters=${clusterIds}`}
              className="block p-4 rounded-[10px] border-2 border-gray-300 hover:border-blue-500 transition-colors bg-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-lg font-medium text-gray-900">{phrase.portuguese_text}</div>
                  {translation && (
                    <div className="text-sm text-gray-600 mt-1">
                      {translation}
                    </div>
                  )}
                  {phrase.ipa_transcription && (
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      /{phrase.ipa_transcription}/
                    </div>
                  )}
                </div>
                <div className="ml-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {phrases.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          {t.noPhrases}
        </div>
      )}
      </div>
    </div>
  );
}

export default function PhrasesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <PhrasesContent />
    </Suspense>
  );
}

