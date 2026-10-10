// ============================================================
// CitySync — Language Context & Reusable Language Selector
// ============================================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import {
  TRANSLATIONS,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  type SupportedLanguage,
  type LanguageMeta,
} from '../i18n/translations';
import clsx from 'clsx';

export const LANGUAGE_STORAGE_KEY = 'citysync_lang';

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  languages: LanguageMeta[];
  currentLanguageMeta: LanguageMeta;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function getInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
    if (saved && (saved === 'en' || saved === 'ta' || saved === 'hi')) {
      return saved;
    }
  } catch {
    // LocalStorage unavailable
  }
  return DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  const setLanguage = useCallback((newLang: SupportedLanguage) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch {
      // Ignore storage error
    }
  }, []);

  // Sync document lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  /**
   * Deterministic translation lookup:
   * 1. Look up in active language dictionary
   * 2. If missing, fall back to English dictionary
   * 3. If still missing, return provided fallback or key
   */
  const t = useCallback(
    (key: string, fallback?: string): string => {
      const activeDict = TRANSLATIONS[language];
      if (activeDict && activeDict[key] !== undefined) {
        return activeDict[key];
      }
      // English fallback
      const enDict = TRANSLATIONS.en;
      if (enDict && enDict[key] !== undefined) {
        return enDict[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [language]
  );

  const currentLanguageMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        languages: SUPPORTED_LANGUAGES,
        currentLanguageMeta,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within LanguageProvider');
  }
  return ctx;
}

/**
 * Reusable, keyboard-accessible Language Selector Dropdown
 * Features:
 * - Globe icon + "Language" label + Active native script
 * - Accessible via keyboard (Enter/Space to open, Esc to close, Tab to navigate)
 * - Mobile responsive
 */
export function LanguageSelector({
  variant = 'header',
  className = '',
}: {
  variant?: 'header' | 'landing' | 'compact';
  className?: string;
}) {
  const { language, setLanguage, languages, currentLanguageMeta, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isLanding = variant === 'landing';
  const isCompact = variant === 'compact';

  return (
    <div
      ref={containerRef}
      className={clsx('relative inline-block text-left', className)}
      onKeyDown={handleKeyDown}
    >
      <button
        type="button"
        id="language-selector-button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t('app.selectLanguage')}: ${currentLanguageMeta.nativeName}`}
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'inline-flex items-center gap-2 font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg',
          isLanding &&
            'px-3.5 py-2 text-sm bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 shadow-sm active:scale-95',
          !isLanding &&
            !isCompact &&
            'px-3 py-1.5 text-xs border rounded-lg shadow-sm hover:opacity-90 active:scale-95',
          isCompact && 'p-1.5 text-xs rounded-md hover:bg-black/5 dark:hover:bg-white/5'
        )}
        style={
          !isLanding
            ? {
                backgroundColor: 'var(--cs-surface)',
                borderColor: 'var(--cs-border)',
                color: 'var(--cs-text)',
              }
            : undefined
        }
      >
        <Globe
          className={clsx(
            isLanding ? 'w-4 h-4 text-blue-300' : 'w-4 h-4 text-blue-500 flex-shrink-0'
          )}
        />
        {!isCompact && (
          <span className="hidden sm:inline opacity-80 text-[11px] uppercase tracking-wider font-semibold">
            {t('app.language')}:
          </span>
        )}
        <span className="font-semibold text-xs tracking-wide">
          {currentLanguageMeta.nativeName}
        </span>
        <ChevronDown
          className={clsx(
            'w-3.5 h-3.5 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
            isLanding ? 'text-white/70' : 'text-gray-400'
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t('app.selectLanguage')}
          className={clsx(
            'absolute right-0 mt-2 w-48 rounded-xl shadow-2xl border py-1.5 z-50 animate-slide-down focus:outline-none backdrop-blur-lg',
            isLanding ? 'bg-slate-900/95 border-slate-700/80 text-white' : ''
          )}
          style={
            !isLanding
              ? {
                  backgroundColor: 'var(--cs-surface)',
                  borderColor: 'var(--cs-border)',
                  color: 'var(--cs-text)',
                }
              : undefined
          }
        >
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 dark:border-gray-800">
            {t('app.selectLanguage')}
          </div>
          {languages.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={clsx(
                  'w-full flex items-center justify-between px-3.5 py-2 text-xs text-left transition-colors',
                  isSelected
                    ? isLanding
                      ? 'bg-blue-600/30 text-blue-200 font-semibold'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                    : isLanding
                    ? 'hover:bg-white/10 text-gray-200'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                )}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{lang.nativeName}</span>
                  <span className="text-[10px] opacity-70">{lang.name}</span>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
