import { myanmar } from "./translations";

export type Language = "en" | "my";
export const LANGUAGE_STORAGE_KEY = "football-match-language";

export function normalizeLanguage(value: unknown): Language {
  return value === "my" ? "my" : "en";
}

export function readLanguage(): Language {
  try {
    return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return "en";
  }
}

let language: Language = readLanguage();
const listeners = new Set<() => void>();

export const getLanguage = () => language;
export const getLocale = () => (language === "my" ? "my-MM" : "en-US");
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setLanguage(value: Language) {
  language = normalizeLanguage(value);
  if (typeof document !== "undefined") document.documentElement.lang = language;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Language switching remains available when browser storage is disabled.
  }
  listeners.forEach((listener) => listener());
}

/** Only translate application-owned text, never user-entered content. */
export function translate(text: string | undefined, target: Language = language): string {
  if (text === undefined) return "";
  return target === "my" && Object.prototype.hasOwnProperty.call(myanmar, text)
    ? myanmar[text]
    : text;
}

export const t = translate;

/** Named parameters keep names, counts and prices out of translation keys. */
export function message(text: string, values: Record<string, string | number>): string {
  return translate(text).replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}
