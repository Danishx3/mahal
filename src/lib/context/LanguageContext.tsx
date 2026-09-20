'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, translations, TranslationDictionary } from '@/lib/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: TranslationDictionary;
  isMalayalam: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ml',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: translations.ml,
  isMalayalam: true,
});

const STORAGE_KEY = 'mahallu_lang_pref';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default is Malayalam ('ml')
  const [language, setLanguageState] = useState<Language>('ml');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && (saved === 'ml' || saved === 'en')) {
        setLanguageState(saved);
      } else {
        // Explicitly persist default 'ml'
        localStorage.setItem(STORAGE_KEY, 'ml');
      }
    } catch {
      // Safe fallback
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ml' ? 'en' : 'ml');
  };

  const t = translations[language] || translations.ml;

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        isMalayalam: language === 'ml',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
