import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, Terminal } from "lucide-react";

interface CopyCommandProps {
  command: string;
  label?: string;
}

export function CopyCommand({ command, label }: CopyCommandProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = command;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-[#0b0f17] overflow-hidden">
      {label && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/60 bg-card/50 text-xs text-muted-foreground">
          <Terminal className="h-3.5 w-3.5" /> {label}
        </div>
      )}
      <div className="flex items-stretch">
        <code className="flex-1 px-4 py-3 font-mono text-sm text-foreground overflow-x-auto whitespace-pre">
          {command}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className={`shrink-0 px-4 flex items-center gap-2 text-sm font-medium border-l border-border/60 transition-colors ${
            copied
              ? "bg-success/15 text-success"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
          aria-label={t("a11y.copyCommand")}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" /> {t("a11y.copied")}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> {t("a11y.copy")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
