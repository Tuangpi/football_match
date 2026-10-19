import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  getLanguage,
  LANGUAGE_STORAGE_KEY,
  normalizeLanguage,
  setLanguage,
  subscribeLanguage,
  t,
} from "@/lib/language";

export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, getLanguage, () => "en" as const);
  return { language, setLanguage, t };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) {
        setLanguage(normalizeLanguage(event.newValue));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return children;
}
