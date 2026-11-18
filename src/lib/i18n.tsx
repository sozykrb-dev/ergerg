import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'en' | 'ar';

interface LocaleContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  isAr: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  /** pick the right string */
  t: (en: string, ar: string) => string;
  /** currency: EGP, Arabic numerals in Arabic */
  money: (value: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const STORAGE_KEY = 'molfet_lang_v1';

const readInitialLang = (): Lang => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ar' || saved === 'en') return saved;
    const nav = navigator.language || '';
    if (nav.toLowerCase().startsWith('ar')) return 'ar';
  } catch {
    /* ignore */
  }
  return 'en';
};

/**
 * Deep-link support: #/ar/... opens the store in Arabic, #/en/... in English.
 * The prefix is stripped from the hash so the router keeps working.
 */
const langFromHash = (): Lang | null => {
  const match = (window.location.hash || '').match(/^#\/(ar|en)(\/|$)/);
  return match ? (match[1] as Lang) : null;
};

const stripLangFromHash = () => {
  const hash = window.location.hash;
  const stripped = hash.replace(/^#\/(ar|en)(?=\/|$)/, '#');
  if (stripped !== hash) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${stripped === '#' ? '#/' : stripped}`);
  }
};

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => langFromHash() || readInitialLang());

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    stripLangFromHash();
    const html = document.documentElement;
    html.lang = lang;
    html.dir = dir;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggleLang = useCallback(() => setLangState((prev) => (prev === 'ar' ? 'en' : 'ar')), []);

  const value = useMemo<LocaleContextValue>(() => {
    const t = (en: string, ar: string) => (lang === 'ar' ? ar : en);
    const money = (input: number) => {
      const rounded = Math.round((Number(input) || 0) * 100) / 100;
      const formatted = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-EG', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(rounded);
      return lang === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
    };
    return { lang, dir, isAr: lang === 'ar', setLang, toggleLang, t, money };
  }, [lang, dir, setLang, toggleLang]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = (): LocaleContextValue => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
};
