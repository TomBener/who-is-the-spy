import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zh from './locales/zh';
import en from './locales/en';

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh,
      en,
    },
    fallbackLng: 'zh',
    supportedLngs: ['zh', 'en'],
    // Treat region tags (zh-CN, en-US) as their base language.
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false, // React already escapes.
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'spy:lang',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;
