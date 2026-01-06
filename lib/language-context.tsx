'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AppLanguage = 'en' | 'pt' | 'ru';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    // Load saved language from localStorage
    const saved = localStorage.getItem('faloClaro_app_language') as AppLanguage;
    if (saved && ['en', 'pt', 'ru'].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('faloClaro_app_language', lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useAppLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useAppLanguage must be used within LanguageProvider');
  }
  return context;
}

// Cluster name translations
export const clusterTranslations: Record<string, Record<AppLanguage, string>> = {
  'Beginner': {
    en: 'Beginner',
    pt: 'Iniciante',
    ru: 'Новичок',
  },
  'My take': {
    en: 'My take',
    pt: 'Minha opinião',
    ru: 'Реакции и ответы',
  },
  'Politeness and Requests': {
    en: 'Politeness and Requests',
    pt: 'Polidez e Pedidos',
    ru: 'Вежливость и просьбы',
  },
  'Making sense': {
    en: 'Making sense',
    pt: 'Faz sentido',
    ru: 'Понял / Не понял',
  },
  'Time and Path': {
    en: 'Time and Path',
    pt: 'Tempo e caminho',
    ru: 'Время и путь',
  },
  'Home and Daily Life': {
    en: 'Home and Daily Life',
    pt: 'Casa e Vida Diária',
    ru: 'Дом и быт',
  },
  'Children and School': {
    en: 'Children and School',
    pt: 'Crianças e Escola',
    ru: 'Дети и школа',
  },
  'Shops and Services': {
    en: 'Shops and Services',
    pt: 'Lojas e Serviços',
    ru: 'Магазины и сервисы',
  },
  'Cafes and Restaurants': {
    en: 'Cafes and Restaurants',
    pt: 'Cafés e Restaurantes',
    ru: 'Кафе и рестораны',
  },
  'Emotions and States': {
    en: 'Emotions and States',
    pt: 'Emoções e Estados',
    ru: 'Эмоции и состояния',
  },
  'Speech Connectors': {
    en: 'Speech Connectors',
    pt: 'Conectores de Fala',
    ru: 'Связки речи',
  },
  'Conflict and Discontent': {
    en: 'Conflict and Discontent',
    pt: 'Conflito e Descontentamento',
    ru: 'Конфликт, недовольство',
  },
  'Cult Phrases': {
    en: 'Cult Phrases',
    pt: 'Frases Cult',
    ru: 'Культовые фразы',
  },
};

export function getClusterName(clusterName: string, language: AppLanguage): string {
  return clusterTranslations[clusterName]?.[language] || clusterName;
}

