import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'de', 'fr', 'zh', 'hi', 'gu'],
    debug: false,
    ns: ['common'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
  });

export default i18n;

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
];

export const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  US: 'en',
  GB: 'en',
  CA: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  PE: 'es',
  CL: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  PR: 'es',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  FR: 'fr',
  BE: 'fr',
  LU: 'fr',
  MC: 'fr',
  SN: 'fr',
  CI: 'fr',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  SG: 'zh',
  IN: 'hi',
};

export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  NZ: 'New Zealand',
  IE: 'Ireland',
  ES: 'Spain',
  MX: 'Mexico',
  AR: 'Argentina',
  CO: 'Colombia',
  PE: 'Peru',
  CL: 'Chile',
  VE: 'Venezuela',
  EC: 'Ecuador',
  GT: 'Guatemala',
  CU: 'Cuba',
  BO: 'Bolivia',
  DO: 'Dominican Republic',
  HN: 'Honduras',
  PY: 'Paraguay',
  SV: 'El Salvador',
  NI: 'Nicaragua',
  CR: 'Costa Rica',
  PA: 'Panama',
  UY: 'Uruguay',
  PR: 'Puerto Rico',
  DE: 'Germany',
  AT: 'Austria',
  CH: 'Switzerland',
  FR: 'France',
  BE: 'Belgium',
  LU: 'Luxembourg',
  MC: 'Monaco',
  SN: 'Senegal',
  CI: 'Ivory Coast',
  CN: 'China',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  SG: 'Singapore',
  IN: 'India',
};

export function getLanguageForCountry(countryCode: string): string | null {
  return COUNTRY_TO_LANGUAGE[countryCode.toUpperCase()] || null;
}

export function getCountryName(countryCode: string): string {
  return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
}

export function getLanguageInfo(langCode: string) {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === langCode);
}
