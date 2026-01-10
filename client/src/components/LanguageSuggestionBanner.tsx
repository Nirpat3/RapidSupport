import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  getLanguageForCountry, 
  getCountryName, 
  getLanguageInfo,
  SUPPORTED_LANGUAGES 
} from '@/lib/i18n';

const STORAGE_KEY = 'language-suggestion-dismissed';
const COUNTRY_STORAGE_KEY = 'detected-country-code';
const USER_SELECTED_LANGUAGE_KEY = 'language-user-selected';

interface GeoResponse {
  countryCode: string | null;
  source: string;
}

export default function LanguageSuggestionBanner() {
  const { i18n, t } = useTranslation();
  const [show, setShow] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [suggestedLanguage, setSuggestedLanguage] = useState<string | null>(null);

  useEffect(() => {
    const checkAndSuggestLanguage = async () => {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed === 'true') {
        return;
      }

      const userHasExplicitlyChosen = localStorage.getItem(USER_SELECTED_LANGUAGE_KEY);
      if (userHasExplicitlyChosen === 'true') {
        return;
      }

      let countryCode = localStorage.getItem(COUNTRY_STORAGE_KEY);
      
      if (!countryCode) {
        try {
          const response = await fetch('/api/geo/detect');
          if (response.ok) {
            const data: GeoResponse = await response.json();
            if (data.countryCode) {
              countryCode = data.countryCode;
              localStorage.setItem(COUNTRY_STORAGE_KEY, countryCode);
            }
          }
        } catch (error) {
          console.error('[LanguageSuggestion] Failed to detect country:', error);
          return;
        }
      }

      if (!countryCode) {
        return;
      }

      const suggestedLang = getLanguageForCountry(countryCode);
      if (!suggestedLang) {
        return;
      }

      const currentLang = i18n.language.split('-')[0];
      if (suggestedLang === currentLang) {
        return;
      }

      const langInfo = getLanguageInfo(suggestedLang);
      if (!langInfo) {
        return;
      }

      setDetectedCountry(countryCode);
      setSuggestedLanguage(suggestedLang);
      setShow(true);
    };

    checkAndSuggestLanguage();
  }, [i18n.language]);

  const handleSwitchLanguage = () => {
    if (suggestedLanguage) {
      i18n.changeLanguage(suggestedLanguage);
      localStorage.setItem('i18nextLng', suggestedLanguage);
      localStorage.setItem(USER_SELECTED_LANGUAGE_KEY, 'true');
    }
    setShow(false);
  };

  const handleKeepCurrent = () => {
    localStorage.setItem('i18nextLng', i18n.language);
    localStorage.setItem(USER_SELECTED_LANGUAGE_KEY, 'true');
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  };

  if (!show || !detectedCountry || !suggestedLanguage) {
    return null;
  }

  const countryName = getCountryName(detectedCountry);
  const langInfo = getLanguageInfo(suggestedLanguage);
  const currentLangInfo = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language.split('-')[0]) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary shrink-0" />
          <div className="text-sm">
            <span className="font-medium">
              {t('languageSuggestion.detected', { country: countryName })}
            </span>
            <span className="ml-1 text-muted-foreground">
              {t('languageSuggestion.wouldYouLike', { language: langInfo?.nativeName })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={handleSwitchLanguage}
          >
            {t('languageSuggestion.switchTo', { language: langInfo?.nativeName })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleKeepCurrent}
          >
            {t('languageSuggestion.keepCurrent', { language: currentLangInfo.nativeName })}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            title={t('languageSuggestion.dontAskAgain')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
