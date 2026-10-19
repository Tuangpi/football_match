import { useLanguage } from "@/context/LanguageContext";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      role="group"
      aria-label="Language / ဘာသာစကား"
      className="inline-flex shrink-0 items-center rounded-full border border-border bg-background p-0.5 text-xs"
    >
      <button
        type="button"
        lang="en"
        aria-pressed={language === "en"}
        onClick={() => setLanguage("en")}
        className={`rounded-full px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${language === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
      >
        ENG
      </button>
      <button
        type="button"
        lang="my"
        aria-pressed={language === "my"}
        onClick={() => setLanguage("my")}
        className={`rounded-full px-2 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${language === "my" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
      >
        မြန်မာ
      </button>
    </div>
  );
}
