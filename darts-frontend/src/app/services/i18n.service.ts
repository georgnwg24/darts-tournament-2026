import { Injectable, signal } from '@angular/core';

import { TRANSLATIONS, TranslationLanguage } from '../i18n/translations';

const STORAGE_KEY = 'app.language';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly currentLanguage = signal<TranslationLanguage>('en');

  constructor() {
    const initial = this.resolveInitialLanguage();
    this.currentLanguage.set(initial);
  }

  setLanguage(language: TranslationLanguage): void {
    this.currentLanguage.set(language);
    localStorage.setItem(STORAGE_KEY, language);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const lang = this.currentLanguage();
    const source = TRANSLATIONS[lang][key] ?? TRANSLATIONS.en[key] ?? key;

    if (!params) return source;

    return Object.entries(params).reduce(
      (text, [paramKey, value]) => text.replaceAll(`{{${paramKey}}}`, String(value)),
      source,
    );
  }

  private resolveInitialLanguage(): TranslationLanguage {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'de' || saved === 'en') return saved;

    const browserLanguage = navigator.language.toLowerCase();
    if (browserLanguage.startsWith('de')) return 'de';
    if (browserLanguage.startsWith('en')) return 'en';

    return 'en';
  }
}
