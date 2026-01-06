'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Cluster } from '@/types';
import Link from 'next/link';
import { useAppLanguage, getClusterName } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';

// Cluster configuration with colors
const clusterConfig: Record<string, { 
  color: string;
  icon: string;
}> = {
  'All Clusters': {
    color: '#94B7F2',
    icon: '👾',
  },
  'My take': {
    color: '#FBDDC3',
    icon: '💬',
  },
  'Politeness and Requests': {
    color: '#FAF7BF',
    icon: '👌',
  },
  'Making sense': {
    color: '#FBC3C8',
    icon: '🙃',
  },
  'Time and Path': {
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
  'Conflict and Stress': {
    color: '#ADA0FF',
    icon: '🤬',
  },
  'Cult Phrases': {
    color: '#E1D0FF',
    icon: '🎬',
  },
};

const subcategoryTypes = [
  { key: 'all', en: 'Select all', ru: 'Выбрать все', pt: 'Selecionar todos' },
  { key: 'word', en: 'Words', ru: 'Слова', pt: 'Palavras' },
  { key: 'short_sentence', en: 'Short sentences', ru: 'Короткие предложения', pt: 'Frases curtas' },
  { key: 'long_sentence', en: 'Long sentences', ru: 'Длинные предложения', pt: 'Frases longas' },
];

function SubcategoriesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clusterId = searchParams.get('cluster') || '';
  const clusterIds = searchParams.get('clusters') || ''; // Multiple clusters or 'all'
  const clusterName = searchParams.get('name') || '';
  const { language } = useAppLanguage();
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [phraseCounts, setPhraseCounts] = useState<{
    word: number;
    short_sentence: number;
    long_sentence: number;
    all: number;
  }>({
    word: 0,
    short_sentence: 0,
    long_sentence: 0,
    all: 0,
  });
  const isMultipleClusters = !!clusterIds && !clusterId;

  useEffect(() => {
    if (clusterId) {
      loadCluster();
    } else if (clusterIds) {
      loadClusters();
    }
  }, [clusterId, clusterIds]);

  // Load phrase counts after cluster(s) are loaded
  useEffect(() => {
    // For single cluster: wait for cluster to load
    // For multiple clusters: can load immediately (don't need to wait for clusters list)
    if (!loading && (cluster || isMultipleClusters)) {
      loadPhraseCounts();
    }
  }, [cluster, isMultipleClusters, loading]);

  const loadCluster = async () => {
    try {
      const { data, error } = await supabase
        .from('clusters')
        .select('*')
        .eq('id', clusterId)
        .single();

      if (error) throw error;
      setCluster(data);
    } catch (error) {
      console.error('Error loading cluster:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClusters = async () => {
    try {
      let query = supabase
        .from('clusters')
        .select('*')
        .neq('name', 'Beginner'); // Exclude Beginner

      if (clusterIds !== 'all') {
        const ids = clusterIds.split(',');
        query = query.in('id', ids);
      }

      const { data, error } = await query.order('order_index', { ascending: true });

      if (error) throw error;
      setClusters(data || []);
    } catch (error) {
      console.error('Error loading clusters:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPhraseCounts = async () => {
    try {
      // Determine cluster IDs to filter by
      let targetClusterIds: string[] = [];
      
      if (clusterId) {
        targetClusterIds = [clusterId];
      } else if (clusterIds) {
        if (clusterIds === 'all') {
          // Get all cluster IDs except Beginner
          const { data: allClusters } = await supabase
            .from('clusters')
            .select('id')
            .neq('name', 'Beginner');
          
          if (allClusters && allClusters.length > 0) {
            targetClusterIds = allClusters.map(c => c.id);
          }
        } else {
          targetClusterIds = clusterIds.split(',');
        }
      }

      if (targetClusterIds.length === 0) {
        return;
      }

      // Create base query builder function
      const createCountQuery = (phraseType?: string) => {
        let query = supabase
          .from('phrases')
          .select('*', { count: 'exact', head: true })
          .in('cluster_id', targetClusterIds);
        
        if (phraseType) {
          query = query.eq('phrase_type', phraseType);
        }
        
        return query;
      };

      // Get counts for each phrase type
      const [wordResult, shortResult, longResult, allResult] = await Promise.all([
        createCountQuery('word'),
        createCountQuery('short_sentence'),
        createCountQuery('long_sentence'),
        createCountQuery(),
      ]);

      setPhraseCounts({
        word: wordResult.count || 0,
        short_sentence: shortResult.count || 0,
        long_sentence: longResult.count || 0,
        all: allResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading phrase counts:', error);
    }
  };

  const handleSubcategoryClick = (type: string) => {
    if (clusterId) {
      // Single cluster
      if (type === 'all') {
        router.push(`/player?cluster=${clusterId}&phraseType=all`);
      } else {
        router.push(`/player?cluster=${clusterId}&phraseType=${type}`);
      }
    } else if (clusterIds) {
      // Multiple clusters
      if (type === 'all') {
        router.push(`/player?clusters=${clusterIds}&phraseType=all`);
      } else {
        router.push(`/player?clusters=${clusterIds}&phraseType=${type}`);
      }
    }
  };

  const getClusterColor = () => {
    if (isMultipleClusters) {
      // Use "All Clusters" color for multiple clusters
      return clusterConfig['All Clusters']?.color || '#94B7F2';
    }
    if (!cluster) return '#EEEEEE';
    return clusterConfig[cluster.name]?.color || '#EEEEEE';
  };

  const getSubcategoryLabel = (key: string) => {
    const subcat = subcategoryTypes.find(s => s.key === key);
    if (!subcat) return '';
    
    if (key === 'all') {
      if (isMultipleClusters) {
        // Multiple clusters selected
        return language === 'ru' 
          ? `Выбрать все тематики`
          : language === 'pt'
          ? `Selecionar todos os temas`
          : `Select all themes`;
      } else if (cluster) {
        // Single cluster
        const clusterDisplayName = getClusterName(cluster.name, language);
        return language === 'ru' 
          ? `Выбрать все ${clusterDisplayName}`
          : language === 'pt'
          ? `Selecionar todos ${clusterDisplayName}`
          : `Select all ${clusterDisplayName}`;
      }
    }
    
    return subcat[language] || subcat.en;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!cluster && !isMultipleClusters) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Cluster not found</div>
      </div>
    );
  }

  const clusterColor = getClusterColor();
  const clusterDisplayName = isMultipleClusters 
    ? (language === 'ru' ? 'Все тематики' : language === 'pt' ? 'Todos os temas' : 'All themes')
    : cluster 
    ? getClusterName(cluster.name, language)
    : '';

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
          <button
            onClick={() => router.push('/clusters')}
            className="block px-4 py-2 rounded-[10px] transition-colors text-center"
            style={{ 
              backgroundColor: '#EDF3FF',
              width: 'calc(50% - 5px)', // Width of one card minus half gap
            }}
          >
            <span className="text-gray-700">
              {language === 'ru' ? '← Назад к темам' : language === 'pt' ? '← Voltar aos temas' : '← Back to topics'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-24">
        {/* Subcategories Grid */}
        <div className="grid grid-cols-2 gap-[10px] mt-4">
          {/* Select All Button */}
          <button
            onClick={() => handleSubcategoryClick('all')}
            className="relative rounded-[10px] transition-all aspect-square p-4"
            style={{ backgroundColor: clusterColor }}
          >
            {phraseCounts.all > 0 && (
              <div className="absolute top-4 left-4">
                <div className="bg-white rounded-full px-2 py-1">
                  <span className="text-black" style={{ fontSize: '10px' }}>
                    {phraseCounts.all}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="text-left">
                <div className="font-semibold text-black mb-1" style={{ fontSize: '16px' }}>
                  {language === 'ru' ? 'Выбрать все' : language === 'pt' ? 'Selecionar todos' : 'Select all'}
                </div>
                <div className="font-semibold text-black leading-tight" style={{ fontSize: '26px' }}>
                  {clusterDisplayName}
                </div>
              </div>
            </div>
          </button>

          {/* Words Button */}
          <button
            onClick={() => handleSubcategoryClick('word')}
            className="relative rounded-[10px] transition-all aspect-square p-4 bg-[#EEEEEE] hover:bg-[#DDDDDD]"
          >
            {phraseCounts.word > 0 && (
              <div className="absolute top-4 left-4">
                <div className="bg-white rounded-full px-2 py-1">
                  <span className="text-black" style={{ fontSize: '10px' }}>
                    {phraseCounts.word}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4">
              <span className="font-medium text-black text-left block leading-tight" style={{ fontSize: '20px' }}>
                {getSubcategoryLabel('word')}
              </span>
            </div>
          </button>

          {/* Short Sentences Button */}
          <button
            onClick={() => handleSubcategoryClick('short_sentence')}
            className="relative rounded-[10px] transition-all aspect-square p-4 bg-[#EEEEEE] hover:bg-[#DDDDDD]"
          >
            {phraseCounts.short_sentence > 0 && (
              <div className="absolute top-4 left-4">
                <div className="bg-white rounded-full px-2 py-1">
                  <span className="text-black" style={{ fontSize: '10px' }}>
                    {phraseCounts.short_sentence}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4">
              <span className="font-medium text-black text-left block leading-tight" style={{ fontSize: '20px' }}>
                {getSubcategoryLabel('short_sentence')}
              </span>
            </div>
          </button>

          {/* Long Sentences Button */}
          <button
            onClick={() => handleSubcategoryClick('long_sentence')}
            className="relative rounded-[10px] transition-all aspect-square p-4 bg-[#EEEEEE] hover:bg-[#DDDDDD]"
          >
            {phraseCounts.long_sentence > 0 && (
              <div className="absolute top-4 left-4">
                <div className="bg-white rounded-full px-2 py-1">
                  <span className="text-black" style={{ fontSize: '10px' }}>
                    {phraseCounts.long_sentence}
                  </span>
                </div>
              </div>
            )}
            <div className="absolute bottom-4 left-4 right-4">
              <span className="font-medium text-black text-left block leading-tight" style={{ fontSize: '20px' }}>
                {getSubcategoryLabel('long_sentence')}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubcategoriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-lg">Loading...</div>
      </div>
    }>
      <SubcategoriesContent />
    </Suspense>
  );
}

