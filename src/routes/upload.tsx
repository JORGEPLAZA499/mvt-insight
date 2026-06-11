import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Monitor,
  ShieldCheck,
  Download,
  Smartphone,
  FileSearch,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Settings,
  Usb,
} from "lucide-react";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Nuevo análisis — Spyware Forensic Analyzer" }] }),
  component: Upload,
});

function Upload() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);

  const steps = [
    { icon: Download, key: "step1" },
    { icon: Monitor, key: "step2" },
    { icon: Smartphone, key: "step3" },
    { icon: Settings, key: "step4" },
    { icon: Usb, key: "step5" },
    { icon: FileSearch, key: "step6" },
  ];

  const total = steps.length;
  const progress = ((current + 1) / total) * 100;
  const { icon: Icon, key } = steps[current];
  const isLast = current === total - 1;

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("upload.desktopOnly.badge", "Análisis seguro local")}
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            {t("upload.desktopOnly.title", "Analiza tu dispositivo desde la app de escritorio")}
          </h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            {t(
              "upload.desktopOnly.intro",
              "Por seguridad y rendimiento, el análisis forense se realiza en tu equipo. Tus datos nunca salen de tu ordenador: solo el informe se sincroniza con tu cuenta web.",
            )}
          </p>
        </header>

        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>
              {t("upload.desktopOnly.stepLabel", "Paso")} {current + 1} {t("upload.desktopOnly.of", "de")} {total}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="rounded-2xl border border-border bg-card/40 p-6 md:p-8 min-h-[260px] flex flex-col">
          <div className="flex items-start gap-4 flex-1">
            <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{t(`upload.desktopOnly.${key}.title`)}</h2>
              {t(`upload.desktopOnly.${key}.body`) && (
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  {t(`upload.desktopOnly.${key}.body`)}
                </p>
              )}

              {key === "step1" && (
                <Link
                  to="/settings/desktop"
                  className="inline-flex items-center gap-2 mt-5 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition"
                >
                  <Download className="h-4 w-4" />
                  {t("upload.desktopOnly.cta", "Descargar y vincular")}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("upload.desktopOnly.prev", "Anterior")}
            </Button>
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/40"
                  }`}
                  aria-label={`Paso ${i + 1}`}
                />
              ))}
            </div>
            <Button
              onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
              disabled={isLast}
              className="gap-2"
            >
              {t("upload.desktopOnly.next", "Siguiente")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3 mt-8">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-foreground">
              {t("upload.desktopOnly.security.title", "Privacidad por diseño")}
            </div>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              {t(
                "upload.desktopOnly.security.body",
                "El backup completo del dispositivo (que puede pesar varios GB) se procesa exclusivamente en tu equipo con MVT (Mobile Verification Toolkit) de Amnesty International. Solo el informe resultante —indicadores, detecciones y metadatos— se sube cifrado a tu cuenta.",
              )}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
