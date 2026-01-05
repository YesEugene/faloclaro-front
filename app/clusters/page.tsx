'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Cluster } from '@/types';
import Link from 'next/link';
import { useAppLanguage, getClusterName } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';

// Cluster configuration with colors and icons
const clusterConfig: Record<string, { 
  color: string; // Hex color for background
  icon: string; 
  isLarge?: boolean;
}> = {
  'All Clusters': {
    color: '#94B7F2',
    icon: '👾',
  },
  'Beginner': {
    color: '#FDFFA4',
    icon: '⭐',
  },
  'Reactions and Responses': {
    color: '#FBDDC3',
    icon: '💬',
  },
  'Politeness and Requests': {
    color: '#FAF7BF',
    icon: '👌',
  },
  'Understanding / Not Understanding': {
    color: '#FBC3C8',
    icon: '🙃',
  },
  'Movement, Time, Pauses': {
    color: '#84E9F3',
    icon: '⏳',
  },
  'Home and Daily Life': {
    color: '#E9B0E4',
    icon: '🏠',
  },
  'Children and School': {
    color: '#90F5D9',
    icon: '👶',
  },
  'Shops and Services': {
    color: '#B2FDB0',
    icon: '🛒',
  },
  'Cafes and Restaurants': {
    color: '#91B7FF',
    icon: '☕',
  },
  'Emotions and States': {
    color: '#84D4F2',
    icon: '🤡',
  },
  'Speech Connectors': {
    color: '#FA9A9D',
    icon: '💭',
  },
  'Profanity': {
    color: '#ADA0FF',
    icon: '🤬',
  },
  'Movie Quotes': {
    color: '#B474FF',
    icon: '🎬',
    isLarge: true,
  },
};

export default function ClustersPage() {
  const { language } = useAppLanguage();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClusters, setSelectedClusters] = useState<Set<string>>(new Set());
  const [allSelected, setAllSelected] = useState(false);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    try {
      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setClusters(data || []);
    } catch (error) {
      console.error('Error loading clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCluster = (clusterId: string) => {
    const newSelected = new Set(selectedClusters);
    if (newSelected.has(clusterId)) {
      newSelected.delete(clusterId);
    } else {
      newSelected.add(clusterId);
    }
    setSelectedClusters(newSelected);
    setAllSelected(false);
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedClusters(new Set());
      setAllSelected(false);
    } else {
      setSelectedClusters(new Set(clusters.map(c => c.id)));
      setAllSelected(true);
    }
  };

  const handleContinue = () => {
    const clusterIds = allSelected 
      ? 'all' 
      : Array.from(selectedClusters).join(',');
    window.location.href = `/phrases?clusters=${clusterIds}`;
  };

  const titles = {
    en: { 
      title: 'Select Learning Scope', 
      all: 'All Clusters', 
      continue: 'Continue', 
      about: 'About the Method',
      test: 'Test',
      loading: 'Loading...',
    },
    pt: { 
      title: 'Selecionar Escopo de Aprendizagem', 
      all: 'Todos os Clusters', 
      continue: 'Continuar', 
      about: 'Sobre o Método',
      test: 'Teste',
      loading: 'A carregar...',
    },
    ru: { 
      title: 'Выберите область обучения', 
      all: 'Все кластеры', 
      continue: 'Продолжить', 
      about: 'О методе',
      test: 'Тест',
      loading: 'Загрузка...',
    },
  };

  const t = titles[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">{t.loading}</div>
      </div>
    );
  }

  // Separate regular clusters and movie quotes
  const regularClusters = clusters.filter(c => c.name !== 'Movie Quotes');
  const movieCluster = clusters.find(c => c.name === 'Movie Quotes');

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

        {/* Navigation Bar */}
        <div className="max-w-md mx-auto px-4 grid grid-cols-3 gap-[10px]">
          <Link 
            href="/methodology" 
            className="col-span-2 px-4 py-2 rounded-[10px] bg-white border-2 border-gray-300 text-black hover:bg-gray-50 transition-colors text-center font-medium"
            style={{ transform: 'translateY(1px)', fontWeight: 500 }}
          >
            {t.about}
          </Link>
          <Link 
            href="/test" 
            className="col-span-1 px-4 py-2 rounded-[10px] bg-white border-2 border-gray-300 text-black hover:bg-gray-50 transition-colors text-center font-medium"
            style={{ transform: 'translateY(1px)', fontWeight: 500 }}
          >
            {t.test}
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-24">
        {/* All Clusters and Regular Clusters Grid */}
        <div className="grid grid-cols-3 gap-[10px] mb-[10px]">
          {/* All Clusters Card - spans 2 columns and 2 rows */}
          <button
            onClick={toggleAll}
            className="relative rounded-[10px] transition-all col-span-2 row-span-2"
            style={{ 
              backgroundColor: clusterConfig['All Clusters'].color,
              aspectRatio: '1 / 1', // Square shape
            }}
          >
            {/* Icon - top left */}
            <div className="absolute top-2 left-[20px]" style={{ fontSize: '53px' }}>{clusterConfig['All Clusters'].icon}</div>
            
            {/* Title - bottom left */}
            <div className="absolute bottom-[20px] left-[20px] right-4">
              <span className="font-semibold text-white drop-shadow-md text-left block leading-tight" style={{ fontSize: '33px' }}>
                {language === 'ru' ? (
                  <>
                    Все<br />
                    тематики
                  </>
                ) : language === 'pt' ? (
                  <>
                    Todos os<br />
                    Clusters
                  </>
                ) : (
                  <>
                    All<br />
                    Themes
                  </>
                )}
              </span>
            </div>
            
            {/* Checkbox - top right */}
            <div className={`absolute top-2 right-2 w-6 h-6 rounded border-2 flex items-center justify-center ${
              allSelected 
                ? 'bg-white border-white' 
                : 'bg-white/30 border-white/50'
            }`}>
              {allSelected && (
                <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>

          {/* Regular Clusters */}
          {regularClusters.map((cluster) => {
            const isSelected = allSelected || selectedClusters.has(cluster.id);
            const displayName = getClusterName(cluster.name, language);
            const config = clusterConfig[cluster.name] || {
              color: '#CCCCCC',
              icon: '📝',
            };

            return (
              <button
                key={cluster.id}
                onClick={() => toggleCluster(cluster.id)}
                className="relative p-4 rounded-[10px] transition-all aspect-square"
                style={{ backgroundColor: config.color }}
              >
                {/* Icon - top left */}
                <div className="absolute top-2 left-[20px]" style={{ fontSize: '43px' }}>{config.icon}</div>
                
                {/* Title - bottom left with 20px padding */}
                <div className="absolute bottom-[20px] left-[20px] right-4">
                  {/* All cluster titles are black and same size (except "All Clusters" and "Movie Quotes") */}
                  <div className="font-medium text-black drop-shadow-sm text-left leading-tight text-[13px]">
                    {cluster.name === 'Profanity' && language === 'ru' ? (
                      <>
                        Плохие<br />
                        слова (16+)
                      </>
                    ) : cluster.name === 'Profanity' ? (
                      <>
                        {displayName} (16+)
                      </>
                    ) : (
                      displayName
                    )}
                  </div>
                </div>
                
                {/* Checkbox - top right */}
                <div className={`absolute top-2 right-2 w-5 h-5 rounded border-2 flex items-center justify-center ${
                  isSelected 
                    ? 'bg-white border-white' 
                    : 'bg-white/30 border-white/50'
                }`}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Movie Quotes Large Card */}
        {movieCluster && (
          <div className="mb-[10px]">
            <button
              onClick={() => toggleCluster(movieCluster.id)}
              className="relative w-full rounded-[10px] overflow-hidden transition-all h-48"
            >
              {/* Background Image - stretched to fill */}
              <div className="absolute inset-0">
                <Image
                  src="/Img/Movie cluster 3.jpg"
                  alt="Movie"
                  fill
                  className="object-cover"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              
              {/* Overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              
              {/* Content - bottom left with 20px padding */}
              <div className="relative h-full flex items-end">
                <div className="text-white font-semibold drop-shadow-lg mb-[20px] ml-[20px] text-left leading-tight" style={{ fontSize: '27px' }}>
                  {language === 'ru' ? (
                    <>
                      Фразы<br />
                      из фильмов
                    </>
                  ) : language === 'pt' ? (
                    <>
                      Citações de<br />
                      Filmes
                    </>
                  ) : (
                    <>
                      Movie<br />
                      Quotes
                    </>
                  )}
                </div>
              </div>

              {/* Checkbox - top right */}
              <div className={`absolute top-3 right-3 w-6 h-6 rounded border-2 flex items-center justify-center ${
                allSelected || selectedClusters.has(movieCluster.id)
                  ? 'bg-white border-white' 
                  : 'bg-white/30 border-white/50'
              }`}>
                {(allSelected || selectedClusters.has(movieCluster.id)) && (
                  <svg className="w-4 h-4 text-gray-800" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          </div>
        )}

      </div>

      {/* Continue Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white z-50 shadow-lg border-t border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <button
            onClick={handleContinue}
            disabled={!allSelected && selectedClusters.size === 0}
            className="w-full py-4 bg-blue-600 text-white rounded-[10px] font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            {t.continue}
          </button>
        </div>
      </div>
    </div>
  );
}
