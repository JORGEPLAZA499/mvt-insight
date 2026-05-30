import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };
  return (
    <div className="relative group rounded-lg border border-border bg-muted/40 my-3">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{language}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2" onClick={copy}>
          {copied ? <><Check className="h-3 w-3 mr-1" /> Copiado</> : <><Copy className="h-3 w-3 mr-1" /> Copiar</>}
        </Button>
      </div>
      <pre className="text-xs font-mono p-3 overflow-x-auto"><code>{code}</code></pre>
    </div>
  );
}
