import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Scale } from "lucide-react";
import { acceptLegalTerms, getCurrentLegalDocument, getMyLegalStatus } from "@/lib/legal.functions";

type Doc = { version: string; locale: "es" | "en"; title: string; text: string; hash: string };

export function LegalAcceptanceModal() {
  const { t, i18n } = useTranslation();
  const fetchStatus = useServerFn(getMyLegalStatus);
  const fetchDoc = useServerFn(getCurrentLegalDocument);
  const accept = useServerFn(acceptLegalTerms);

  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [checkedUse, setCheckedUse] = useState(false);
  const [checkedPay, setCheckedPay] = useState(false);
  const [scrolledEnd, setScrolledEnd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const locale = useMemo<"es" | "en">(
    () => (i18n.language?.startsWith("en") ? "en" : "es"),
    [i18n.language],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const status = await fetchStatus();
        if (!alive || !status.needsAcceptance) return;
        const d = (await fetchDoc({ data: { locale } })) as Doc;
        if (!alive) return;
        setDoc(d);
        setOpen(true);
      } catch {
        // silently ignore — user not authenticated yet, etc.
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchStatus, fetchDoc, locale]);

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 24) setScrolledEnd(true);
  };

  const canAccept = scrolledEnd && checkedUse && checkedPay && !submitting && !!doc;

  const onAccept = async () => {
    if (!doc) return;
    setSubmitting(true);
    setError(null);
    try {
      await accept({ data: { version: doc.version, hash: doc.hash, locale: doc.locale } });
      setOpen(false);
      // Force a refresh so any gated UI reacts immediately.
      window.location.reload();
    } catch (e: any) {
      setError(e?.message ?? t("legalModal.error"));
      setSubmitting(false);
    }
  };

  if (!open || !doc) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* not closable */ }}>
      <DialogContent
        className="max-w-3xl p-0 gap-0 [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5 text-primary" />
            {doc.title}
          </DialogTitle>
          <DialogDescription>
            {t("legalModal.subtitle", { version: doc.version })}
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="px-6 py-4 max-h-[55vh] overflow-y-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-foreground/90 bg-muted/30"
        >
          {doc.text}
        </div>

        <div className="p-6 pt-4 border-t border-border space-y-3">
          {!scrolledEnd && (
            <p className="text-xs text-muted-foreground">{t("legalModal.scrollHint")}</p>
          )}
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={checkedUse}
              onCheckedChange={(v) => setCheckedUse(v === true)}
              disabled={!scrolledEnd}
            />
            <span className="text-sm">{t("legalModal.acceptUse")}</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={checkedPay}
              onCheckedChange={(v) => setCheckedPay(v === true)}
              disabled={!scrolledEnd}
            />
            <span className="text-sm">{t("legalModal.acceptPay")}</span>
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end pt-2">
            <Button onClick={onAccept} disabled={!canAccept}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("legalModal.acceptCta")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
