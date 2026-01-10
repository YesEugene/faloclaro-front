'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useAppLanguage } from '@/lib/language-context';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';

export default function SubcategoriesPage() {
  const { language } = useAppLanguage();
  const searchParams = useSearchParams();
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const clusterId = searchParams.get('cluster');
  const clusterName = searchParams.get('name');
  const clustersParam = searchParams.get('clusters');

  useEffect(() => {
    loadSubcategories();
  }, [clusterId, clustersParam]);

  const loadSubcategories = async () => {
    try {
      let query = supabase.from('subcategories').select('*');

      if (clusterId) {
        query = query.eq('cluster_id', clusterId);
      } else if (clustersParam && clustersParam !== 'all') {
        const clusterIds = clustersParam.split(',');
        query = query.in('cluster_id', clusterIds);
      }

      query = query.order('order_index', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;
      setSubcategories(data || []);
    } catch (error) {
      console.error('Error loading subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    en: { 
      title: 'Select Subcategory', 
      loading: 'Loading...',
      back: 'Back',
    },
    ru: { 
      title: 'Выберите подкатегорию', 
      loading: 'Загрузка...',
      back: 'Назад',
    },
  };

  const t = titles[language as keyof typeof titles] || titles.en;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 pb-24">
        <h1 className="text-2xl font-bold mb-4">{t.title}</h1>
        
        {clusterName && (
          <p className="text-gray-600 mb-4">{clusterName}</p>
        )}

        <div className="space-y-2">
          {subcategories.map((subcategory) => (
            <Link
              key={subcategory.id}
              href={`/player?subcategory=${subcategory.id}`}
              className="block p-4 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-black">
                {language === 'ru' ? subcategory.name_ru : subcategory.name_en || subcategory.name}
              </div>
            </Link>
          ))}
        </div>

        {subcategories.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            {language === 'ru' ? 'Подкатегории не найдены' : 'No subcategories found'}
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white z-50 shadow-lg border-t border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <Link
            href="/clusters"
            className="block w-full py-4 bg-gray-200 text-black rounded-[10px] font-semibold text-lg text-center hover:bg-gray-300 transition-colors"
          >
            {t.back}
          </Link>
        </div>
      </div>
    </div>
  );
}
