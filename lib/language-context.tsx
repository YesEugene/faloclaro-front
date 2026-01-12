'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AppLanguage = 'en' | 'ru' | 'pt';

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
    if (saved && ['en', 'ru', 'pt'].includes(saved)) {
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
    pt: 'Principiante',
  },
  'My take': {
    en: 'My take',
    ru: 'Реакции и ответы',
    pt: 'Minha opinião',
  },
  'Politeness and Requests': {
    en: 'Politeness and Requests',
    ru: 'Вежливость и просьбы',
    pt: 'Polidez e Pedidos',
  },
  'Making sense': {
    en: 'Making sense',
    ru: 'Понял / Не понял',
    pt: 'Fazer sentido',
  },
  'Time and Path': {
    en: 'Time and Path',
    ru: 'Время и путь',
    pt: 'Tempo e Caminho',
  },
  'Home and Daily Life': {
    en: 'Home and Daily Life',
    ru: 'Дом и быт',
    pt: 'Casa e Vida Diária',
  },
  'Children and School': {
    en: 'Children and School',
    ru: 'Дети и школа',
    pt: 'Crianças e Escola',
  },
  'Shops and Services': {
    en: 'Shops and Services',
    ru: 'Магазины и сервисы',
    pt: 'Lojas e Serviços',
  },
  'Cafes and Restaurants': {
    en: 'Cafes and Restaurants',
    ru: 'Кафе и рестораны',
    pt: 'Cafés e Restaurantes',
  },
  'Emotions and States': {
    en: 'Emotions and States',
    ru: 'Эмоции и состояния',
    pt: 'Emoções e Estados',
  },
  'Speech Connectors': {
    en: 'Speech Connectors',
    ru: 'Связки речи',
    pt: 'Conectores de Fala',
  },
  'Conflict and Tension': {
    en: 'Conflict and Tension',
    ru: 'Конфликт и стресс',
    pt: 'Conflito e Tensão',
  },
  'Cult Phrases': {
    en: 'Cult Phrases',
    ru: 'Культовые фразы',
    pt: 'Frases Cult',
  },
};

export function getClusterName(clusterName: string, language: AppLanguage): string {
  return clusterTranslations[clusterName]?.[language] || clusterName;
}

