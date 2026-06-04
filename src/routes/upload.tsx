import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/app-shell";
import { Monitor, ShieldCheck, Download, Smartphone, FileSearch, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Nuevo análisis — Spyware Forensic Analyzer" }] }),
  component: Upload,
});

function Upload() {
  const { t } = useTranslation();

  const steps = [
    { icon: Download, key: "step1" },
    { icon: Monitor, key: "step2" },
    { icon: Smartphone, key: "step3" },
    { icon: FileSearch, key: "step4" },
  ];

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
              "Por seguridad y rendimiento, el análisis forense se realiza en tu equipo. Tus datos nunca salen de tu ordenador: solo el informe (unas decenas de KB) se sincroniza con tu cuenta web.",
            )}
          </p>
        </header>

        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-6 shadow-glow mb-8">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-gradient-primary grid place-items-center shadow-glow shrink-0">
              <Monitor className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg">
                {t("upload.desktopOnly.cardTitle", "App de escritorio MVT Insight")}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t(
                  "upload.desktopOnly.cardBody",
                  "Disponible para macOS, Windows y Linux. Descárgala, vincúlala con tu cuenta y comienza el análisis con un clic.",
                )}
              </p>
              <Link
                to="/settings/desktop"
                className="inline-flex items-center gap-2 mt-4 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition"
              >
                <Download className="h-4 w-4" />
                {t("upload.desktopOnly.cta", "Descargar y vincular")}
              </Link>
            </div>
          </div>
        </div>

        <ol className="space-y-3 mb-8">
          {steps.map(({ icon: Icon, key }, idx) => (
            <li
              key={key}
              className="flex items-start gap-4 rounded-xl border border-border bg-card/40 p-4"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 font-semibold">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <Icon className="h-4 w-4 text-primary" />
                  {t(`upload.desktopOnly.${key}.title`)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {t(`upload.desktopOnly.${key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-start gap-3">
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
