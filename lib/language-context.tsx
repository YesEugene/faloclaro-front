'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AppLanguage = 'en' | 'ru';

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
    if (saved && ['en', 'ru'].includes(saved)) {
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
    ru: 'Новичок',
  },
  'My take': {
    en: 'My take',
    ru: 'Реакции и ответы',
  },
  'Politeness and Requests': {
    en: 'Politeness and Requests',
    ru: 'Вежливость и просьбы',
  },
  'Making sense': {
    en: 'Making sense',
    ru: 'Понял / Не понял',
  },
  'Time and Path': {
    en: 'Time and Path',
    ru: 'Время и путь',
  },
  'Home and Daily Life': {
    en: 'Home and Daily Life',
    ru: 'Дом и быт',
  },
  'Children and School': {
    en: 'Children and School',
    ru: 'Дети и школа',
  },
  'Shops and Services': {
    en: 'Shops and Services',
    ru: 'Магазины и сервисы',
  },
  'Cafes and Restaurants': {
    en: 'Cafes and Restaurants',
    ru: 'Кафе и рестораны',
  },
  'Emotions and States': {
    en: 'Emotions and States',
    ru: 'Эмоции и состояния',
  },
  'Speech Connectors': {
    en: 'Speech Connectors',
    ru: 'Связки речи',
  },
  'Conflict and Tension': {
    en: 'Conflict and Tension',
    ru: 'Конфликт и стресс',
  },
  'Cult Phrases': {
    en: 'Cult Phrases',
    ru: 'Культовые фразы',
  },
};

export function getClusterName(clusterName: string, language: AppLanguage): string {
  return clusterTranslations[clusterName]?.[language] || clusterName;
}

