import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Languages className="h-4 w-4 text-muted-foreground shrink-0" />
      <select
        value={i18n.language?.split("-")[0] ?? "es"}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        aria-label="Language"
        className="bg-transparent border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-background text-foreground">
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
