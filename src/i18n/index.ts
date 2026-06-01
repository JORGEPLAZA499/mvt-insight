import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import es from "./locales/es.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGUAGES = [
  { code: "es", label: "Español" },
  { code: "en", label: "English" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const isBrowser = typeof window !== "undefined";

if (!i18n.isInitialized) {
  const chain = isBrowser
    ? i18n.use(LanguageDetector).use(initReactI18next)
    : i18n.use(initReactI18next);

  chain.init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: isBrowser ? undefined : "es",
    fallbackLng: "es",
    supportedLngs: ["es", "en"],
    interpolation: { escapeValue: false },
    initImmediate: false,
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "sfa.lang",
    },
    react: { useSuspense: false },
  });
}


export default i18n;
