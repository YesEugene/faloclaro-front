'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Phrase, Translation } from '@/types';
import Link from 'next/link';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';

function PhrasesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clusterIds = searchParams.get('clusters') || '';
  const clusterId = searchParams.get('cluster') || '';
  const phraseType = searchParams.get('phraseType') || '';
  const returnPhraseId = searchParams.get('returnPhraseId') || '';
  const returnIndex = searchParams.get('returnIndex') || '';
  // Subscription course parameters
  const lessonDay = searchParams.get('lesson');
  const lessonToken = searchParams.get('token');
  const taskId = searchParams.get('task');
  const { language } = useAppLanguage();
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clusterIds || clusterId || (lessonDay && lessonToken && taskId)) {
      loadPhrases();
    }
  }, [clusterIds, clusterId, phraseType, language, lessonDay, lessonToken, taskId]);

  const loadPhrases = async () => {
    try {
      setLoading(true);
      
      // Handle subscription course lesson
      if (lessonDay && lessonToken && taskId) {
        // First, verify token for authorization (but don't rely on it for lesson selection)
        const { data: tokenData, error: tokenError } = await supabase
          .from('lesson_access_tokens')
          .select('lesson_id, user_id')
          .eq('token', lessonToken)
          .single();

        if (tokenError || !tokenData) {
          console.error('❌ Invalid lesson token:', tokenError);
          setLoading(false);
          return;
        }

        // IMPORTANT: Always find lesson by day_number from URL, not by lesson_id from token
        // This ensures we always get the correct lesson even if token points to wrong lesson
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select('id, day_number, yaml_content')
          .eq('day_number', parseInt(lessonDay))
          .single();

        if (lessonError || !lessonData) {
          console.error('❌ Lesson not found by day_number:', lessonError);
          setLoading(false);
          return;
        }

        console.log('✅ Lesson loaded by day_number:', {
          lessonId: lessonData.id,
          dayNumber: lessonData.day_number,
          expectedDayNumber: lessonDay,
        });

        // Find vocabulary task - always task_id: 1 for vocabulary tasks
        const tasks = lessonData.yaml_content?.tasks || [];
        const vocabularyTask = tasks.find((t: any) => t.task_id === 1 && t.type === 'vocabulary');
        
        if (!vocabularyTask || !vocabularyTask.content?.cards) {
          console.error('❌ Vocabulary task not found or has no cards', {
            tasksFound: tasks.length,
            tasks: tasks.map((t: any) => ({ task_id: t.task_id, type: t.type })),
            taskIdFromUrl: taskId,
          });
          setLoading(false);
          return;
        }

        console.log('✅ Vocabulary task found:', {
          taskId: vocabularyTask.task_id,
          type: vocabularyTask.type,
          cardsCount: vocabularyTask.content.cards.length,
          firstWords: vocabularyTask.content.cards.slice(0, 5).map((c: any) => c.word),
        });

        // Load phrases from task cards ONLY - don't search in database
        // This ensures we only show words from the current lesson
        const cards = vocabularyTask.content.cards;
        const phrasesList: Phrase[] = [];
        
        for (let i = 0; i < cards.length; i++) {
          const card = cards[i];
          if (card.word) {
            // Try to find audio URL for the word from database (optional)
            let audioUrl: string | null = null;
            const { data: phraseWithAudio } = await supabase
              .from('phrases')
              .select('audio_url')
              .eq('portuguese_text', card.word)
              .eq('phrase_type', 'word')
              .single();
            
            if (phraseWithAudio?.audio_url) {
              audioUrl = phraseWithAudio.audio_url;
            }
            
            // Always create phrase from card data to ensure we only show lesson words
            const phraseFromCard: Phrase = {
              id: `lesson-${lessonDay}-task-${taskId}-word-${i}`,
              cluster_id: '',
              portuguese_text: card.word,
              ipa_transcription: card.transcription || '',
              phrase_type: 'word',
              order_index: i,
              audio_url: audioUrl,
              movie_title: null,
              movie_character: null,
              movie_year: null,
            };
            phrasesList.push(phraseFromCard);
          }
        }

        setPhrases(phrasesList);

        // Load translations from task cards
        const translationsMap: Record<string, string> = {};
        cards.forEach((card: any, index: number) => {
          if (card.word) {
            const phraseId = phrasesList[index]?.id;
            if (phraseId) {
              if (language === 'ru' && card.word_translation_ru) {
                translationsMap[phraseId] = card.word_translation_ru;
              } else if (language === 'en' && card.word_translation_en) {
                translationsMap[phraseId] = card.word_translation_en;
              }
            }
          }
        });
        setTranslations(translationsMap);
        
        // Audio URLs are already loaded in the loop above
        // No need for additional audio URL loading
        
        setLoading(false);
        return;
      }

      // Regular flow - load from clusters
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
      backToClusters: '← Back to Topics',
      back: 'Back',
      noPhrases: 'No phrases found. Please select clusters first.',
      phrases: 'Phrases',
    },
    pt: {
      loading: 'A carregar...',
      backToClusters: '← Voltar aos Temas',
      back: 'Voltar',
      noPhrases: 'Nenhuma frase encontrada. Por favor, selecione clusters primeiro.',
      phrases: 'Frases',
    },
    ru: {
      loading: 'Загрузка...',
      backToClusters: '← Назад к темам',
      back: 'Назад',
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
              src="/Img/Website/logo.svg"
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
          <button
            onClick={() => {
              // Handle subscription course return
              if (lessonDay && lessonToken) {
                router.push(`/pt/lesson/${lessonDay}/${lessonToken}?task=${taskId || '1'}`);
                return;
              }

              if (returnPhraseId) {
                const params = new URLSearchParams();
                params.set('phraseId', returnPhraseId);
                params.set('index', returnIndex || '0');
                if (clusterId) {
                  params.set('cluster', clusterId);
                  if (phraseType) params.set('phraseType', phraseType);
                } else if (clusterIds) {
                  params.set('clusters', clusterIds);
                }
                router.push(`/player?${params.toString()}`);
              } else {
                router.push('/clusters');
              }
            }}
            className="text-black"
            style={{
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '1.2',
              background: 'transparent',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 19l-7-7 7-7" />
            </svg>
            <span>{t.back}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-6">
      <div className="space-y-3">
        {phrases.map((phrase, index) => {
          const translation = translations[phrase.id];
          
          // Build URL with all necessary parameters
          const buildPlayerUrl = () => {
            // Handle subscription course
            if (lessonDay && lessonToken) {
              const params = new URLSearchParams();
              params.set('lesson', lessonDay);
              params.set('token', lessonToken);
              params.set('task', taskId || '1');
              params.set('phraseId', phrase.id);
              params.set('index', index.toString());
              return `/pt/lesson/${lessonDay}/${lessonToken}?${params.toString()}`;
            }
            
            const params = new URLSearchParams();
            params.set('phraseId', phrase.id);
            params.set('index', index.toString());
            
            // Preserve cluster/clusterId and phraseType from current page
            if (clusterId) {
              params.set('cluster', clusterId);
              if (phraseType) params.set('phraseType', phraseType);
            } else if (clusterIds) {
              params.set('clusters', clusterIds);
            }
            
            // Preserve return parameters for navigation back
            if (returnPhraseId) {
              params.set('returnPhraseId', returnPhraseId);
              if (returnIndex) params.set('returnIndex', returnIndex);
            }
            
            return `/player?${params.toString()}`;
          };
          
          return (
            <Link
              key={phrase.id}
              href={buildPlayerUrl()}
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
                <div className="ml-4 flex-shrink-0">
                  {phrase.audio_url ? (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (phrase.audio_url) {
                          const audio = new Audio(phrase.audio_url);
                          audio.play().catch(console.error);
                        }
                      }}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <svg
                        className="w-8 h-8 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </button>
                  ) : (
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  )}
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

