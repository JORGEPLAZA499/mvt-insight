import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function FlagES({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden="true">
      <title>España</title>
      <rect width="60" height="40" fill="#AA151B" />
      <rect y="10" width="60" height="20" fill="#F1BF00" />
    </svg>
  );
}

function FlagGB({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden="true">
      <title>United Kingdom</title>
      <clipPath id="lang-gb-clip">
        <rect width="60" height="40" />
      </clipPath>
      <g clipPath="url(#lang-gb-clip)">
        <rect width="60" height="40" fill="#012169" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
        <path
          d="M0,0 L60,40 M60,0 L0,40"
          stroke="#C8102E"
          strokeWidth="4"
          clipPath="url(#lang-gb-clip)"
        />
        <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="12" />
        <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

const FLAGS: Record<SupportedLanguage, (props: { className?: string }) => JSX.Element> = {
  es: FlagES,
  en: FlagGB,
};

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const current = (i18n.language?.split("-")[0] ?? "es") as SupportedLanguage;
  const CurrentFlag = FLAGS[current] ?? FLAGS.es;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Language"
        className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${className}`}
      >
        <CurrentFlag className="h-4 w-6 rounded-[2px] overflow-hidden ring-1 ring-border/60" />
        <span className="uppercase tracking-wide">{current}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {SUPPORTED_LANGUAGES.map((l) => {
          const Flag = FLAGS[l.code];
          const active = l.code === current;
          return (
            <DropdownMenuItem
              key={l.code}
              onSelect={() => i18n.changeLanguage(l.code)}
              className="cursor-pointer gap-2"
            >
              <Flag className="h-4 w-6 rounded-[2px] overflow-hidden ring-1 ring-border/60 shrink-0" />
              <span className="flex-1">{l.label}</span>
              {active && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
