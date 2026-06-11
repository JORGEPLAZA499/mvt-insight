import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { riskColor, riskLabel, platformLabel, Analysis } from "@/lib/mock-store";
import { getAnalysisById } from "@/lib/analyses.functions";
import { mapServerAnalysis, type ServerAnalysisRow } from "@/lib/server-analyses";
import { ShieldAlert, ShieldCheck, Layers, AlertOctagon, Database, Download, Trash2, Activity, User, Code2, ChevronDown, ChevronRight, Smartphone, Clock, BookOpen, AppWindow } from "lucide-react";
import { generatePdfReport } from "@/lib/pdf-report";
import { detectionKey, classifyDetection, humanizeDetection, humanizeModule, severityLabel, explainSeverity, buildVerdict, nextSteps, buildModuleHighlights, CROSS_CHECK_STEPS, CATEGORY_LABEL, CATEGORY_DESC, type Category, buildDeviceCard, buildTopApps, buildHumanTimeline, GLOSSARY, type SuspiciousApp, type HumanEvent, type DeviceCardField } from "@/lib/mvt-translate";
import type { MvtDetection, MvtDeviceInfo, RiskLevel } from "@/lib/mvt-parser";

function formatDeviceLine(d?: MvtDeviceInfo): string {
  if (!d) return "";
  const maker = d.manufacturer || d.brand;
  const left = [maker, d.model].filter(Boolean).join(" ").trim();
  const right = d.osVersion ? `Android/iOS ${d.osVersion}`.replace("Android/iOS", maker?.toLowerCase() === "apple" ? "iOS" : "Android") : "";
  return [left, right].filter(Boolean).join(" · ");
}

export const Route = createFileRoute("/analysis/$id")({
  head: () => ({ meta: [{ title: "Resultado de análisis — Spyware Forensic Analyzer" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { t } = useTranslation();
  const { id } = useParams({ from: "/analysis/$id" });
  const [analysis, setAnalysis] = useState<Analysis | undefined>();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const fetchOne = useServerFn(getAnalysisById);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchOne({ data: { id } })
      .then((r) => {
        if (!alive) return;
        const row = r?.analysis as ServerAnalysisRow | null;
        setAnalysis(row ? mapServerAnalysis(row) : undefined);
      })
      .catch(() => { if (alive) setAnalysis(undefined); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, fetchOne]);

  if (loading) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">Cargando análisis…</div>
      </AppShell>
    );
  }

  if (!analysis) {
    return (
      <AppShell>
        <div className="p-10 text-center text-muted-foreground">Análisis no encontrado.</div>
      </AppShell>
    );
  }

  if (analysis.status === "processing") {
    return (
      <AppShell>
        <div className="p-10 max-w-2xl mx-auto text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-gradient-primary grid place-items-center shadow-glow animate-pulse">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold mt-4">Procesando archivos MVT…</h1>
          <p className="text-sm text-muted-foreground mt-2">Esto ocurre en tu navegador y suele tardar unos segundos.</p>
        </div>
      </AppShell>
    );
  }

  if (analysis.status === "error" || !analysis.result) {
    return (
      <AppShell>
        <div className="p-10 max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold">Error procesando archivos</h1>
          <p className="text-sm text-muted-foreground mt-2">{analysis.error || "Los archivos no parecen resultados válidos de MVT."}</p>
          <Link to="/upload" className="text-primary hover:underline text-sm mt-4 inline-block">← Subir otros archivos</Link>
        </div>
      </AppShell>
    );
  }

  const r = analysis.result;

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Resultado de análisis</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1 truncate max-w-2xl">{analysis.fileName}</h1>
            <p className="text-sm text-muted-foreground mt-1">{platformLabel(r.platform)} · {new Date(analysis.uploadedAt).toLocaleString()}</p>
            {formatDeviceLine(r.deviceInfo) && (
              <p className="text-sm text-foreground/80 mt-1">{formatDeviceLine(r.deviceInfo)}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90" onClick={() => generatePdfReport(analysis)}>
              <Download className="h-4 w-4 mr-2" /> Descargar PDF
            </Button>
          </div>
        </div>

        <div className={`rounded-xl border p-6 ${
          r.risk === "low" ? "border-success/40 bg-success/5" :
          r.risk === "medium" ? "border-warning/40 bg-warning/5" :
          "border-destructive/40 bg-destructive/5"
        }`}>
          <div className="flex items-center gap-4">
            {r.risk === "low" ? <ShieldCheck className="h-10 w-10 text-success" /> : <ShieldAlert className="h-10 w-10 text-destructive" />}
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Nivel de riesgo estimado</div>
              <div className={`text-2xl font-semibold ${riskColor(r.risk)}`}>{riskLabel(r.risk)}</div>
              <p className="text-sm text-muted-foreground mt-1">
                MVT generó <strong className="text-foreground">{r.totalDetections}</strong> detección(es) sobre <strong className="text-foreground">{r.modules.length}</strong> módulo(s) analizado(s).
                {r.totalDetections === 0 && " No se encontraron coincidencias con indicadores conocidos."}
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="user" className="w-full mt-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="user"><User className="h-4 w-4 mr-2" /> {t("analysis.tabs.user")}</TabsTrigger>
            <TabsTrigger value="dev"><Code2 className="h-4 w-4 mr-2" /> {t("analysis.tabs.dev")}</TabsTrigger>
          </TabsList>

          {/* ---------- Pestaña usuario no experto ---------- */}
          <TabsContent value="user" className="mt-6 space-y-10">
            <UserReport analysis={analysis} />
          </TabsContent>

          {/* ---------- Pestaña modo desarrollador ---------- */}
          <TabsContent value="dev" className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Módulos MVT analizados</h2>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <div className="col-span-6">Módulo</div>
                <div className="col-span-3 text-right">Entradas</div>
                <div className="col-span-3 text-right">Detecciones</div>
              </div>
              {r.modules.map((m) => (
                <div key={m.key} className="grid grid-cols-12 px-4 py-3 border-b border-border last:border-0 text-sm items-center">
                  <div className="col-span-6 min-w-0">
                    <div className="font-medium truncate">{m.label}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">{m.key}</div>
                  </div>
                  <div className="col-span-3 text-right tabular-nums">{m.entries}</div>
                  <div className={`col-span-3 text-right tabular-nums font-semibold ${m.detected > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {m.detected}
                  </div>
                </div>
              ))}
              {r.modules.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground text-center">No se reconocieron módulos MVT en los archivos subidos.</div>
              )}
            </div>

            <h2 className="text-lg font-semibold mt-10 mb-4">Detecciones crudas</h2>
            {r.detections.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground text-center">
                Sin detecciones registradas.
              </div>
            ) : (
              <DevDetections detections={r.detections} />
            )}

            {r.timeline.length > 0 && (
              <>
                <h2 className="text-lg font-semibold mt-10 mb-4">Línea de tiempo ({r.timeline.length} eventos)</h2>
                <div className="rounded-xl border border-border bg-card p-6">
                  <ol className="relative border-l border-border ml-3 space-y-4">
                    {r.timeline.slice(0, 30).map((e, i) => (
                      <li key={i} className="ml-6 relative">
                        <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-destructive" />
                        <div className="text-xs text-muted-foreground">{e.timestamp}</div>
                        <div className="text-sm font-medium mt-0.5">{e.module}</div>
                        <div className="text-xs text-muted-foreground font-mono break-all">{e.summary}</div>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>


        <div className="mt-8 text-xs text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">← Volver al dashboard</Link>
        </div>
      </div>
    </AppShell>
  );
}

function SmallStat({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wider">
        {label} <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="text-2xl font-semibold mt-2 tabular-nums">{value}</div>
    </div>
  );
}

// ---------- Pestaña usuario: mismo orden y contenido que el PDF ----------

const SEV_BADGE: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/15 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};

function UserReport({ analysis }: { analysis: Analysis }) {
  const r = analysis.result!;
  const verdict = useMemo(() => buildVerdict(r), [r]);
  const recs = useMemo(() => nextSteps(r), [r]);
  const deviceCard = useMemo(() => buildDeviceCard(r.deviceInfo), [r.deviceInfo]);
  const topApps = useMemo(() => buildTopApps(r.detections, 10), [r.detections]);
  const humanTimeline = useMemo(() => buildHumanTimeline(r.timeline, r.detections, 20), [r.timeline, r.detections]);
  const verdictBorder =
    verdict.level === "mercenary" ? "border-destructive/40 bg-destructive/5"
    : verdict.level === "stalkerware" ? "border-destructive/30 bg-destructive/5"
    : verdict.level === "suspicious" ? "border-warning/40 bg-warning/5"
    : "border-success/40 bg-success/5";
  const verdictTitle =
    verdict.level === "clean" ? "text-success" :
    verdict.level === "suspicious" ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-10">
      {/* 01 · Veredicto */}
      <section>
        <SectionTitle num="01" title="Veredicto" />
        <div className={`rounded-xl border p-6 ${verdictBorder}`}>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Veredicto</div>
          <div className={`text-xl font-semibold mt-1 ${verdictTitle}`}>{verdict.headline}</div>
          <p className="text-sm text-foreground/80 mt-2">{verdict.detail}</p>
        </div>
      </section>

      {/* 02 · Resumen ejecutivo */}
      <section>
        <SectionTitle num="02" title="Resumen ejecutivo" />
        <p className="text-sm text-foreground/90">
          Se ha analizado el archivo <strong>"{analysis.fileName}"</strong>. La plataforma detectada es{" "}
          <strong>{platformLabel(r.platform)}</strong>. Se procesaron{" "}
          <strong>{r.modules.length}</strong> módulos MVT con un total de{" "}
          <strong>{r.totalEntries.toLocaleString()}</strong> entradas y se identificaron{" "}
          <strong>{r.totalDetections}</strong> indicios técnicos. El nivel de riesgo estimado es{" "}
          <strong className={riskColor(r.risk)}>{riskLabel(r.risk)}</strong>.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <SmallStat icon={AlertOctagon} label="Indicios" value={r.totalDetections} />
          <SmallStat icon={Layers} label="Módulos con indicios" value={r.modules.filter((m) => m.detected > 0).length} />
          <SmallStat icon={Database} label="Entradas analizadas" value={r.totalEntries.toLocaleString()} />
          <SmallStat icon={ShieldAlert} label="Riesgo" value={riskLabel(r.risk)} />
        </div>
      </section>

      {/* 03 · Ficha del dispositivo */}
      {deviceCard.length > 0 && (
        <section>
          <SectionTitle num="03" title="Ficha del dispositivo" />
          <p className="text-sm text-muted-foreground mb-4">
            Información del terminal extraída automáticamente del análisis. Por privacidad, números de serie e identificadores se muestran parcialmente.
          </p>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {[0, 1].map((col) => (
                <div key={col} className="divide-y divide-border">
                  {deviceCard.filter((_, i) => i % 2 === col).map((f) => (
                    <div key={f.label} className="px-4 py-3 flex items-start gap-3">
                      <Smartphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
                        <div className="text-sm font-medium mt-0.5 break-words">{f.value}</div>
                        {f.hint && <div className="text-xs text-muted-foreground mt-0.5">{f.hint}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 04 · Cómo leer este informe */}
      <section>
        <SectionTitle num="04" title="Cómo leer este informe" />
        <p className="text-sm text-foreground/80">
          MVT (Mobile Verification Toolkit) busca rastros conocidos de spyware y apps de vigilancia en una copia del dispositivo.
          Un indicio no equivale a una infección confirmada: puede tratarse de una app legítima instalada por el propio usuario.
          Revisa cada hallazgo y comprueba si reconoces la app o el comportamiento descrito.
        </p>
        <div className="mt-4 rounded-xl border border-border bg-card divide-y divide-border">
          {(["critical", "high", "medium", "low"] as const).map((lvl) => (
            <div key={lvl} className="flex items-start gap-3 p-3">
              <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${SEV_BADGE[lvl]}`}>
                {severityLabel(lvl)}
              </span>
              <span className="text-sm text-foreground/80">
                {explainSeverity(lvl).replace(/^[^—]+—\s*/, "")}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 05 · Áreas del dispositivo analizadas */}
      <section>
        <SectionTitle num="05" title="Áreas del dispositivo analizadas" />
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
            <div className="col-span-6">Área</div>
            <div className="col-span-2 text-right">Entradas</div>
            <div className="col-span-2 text-right">Indicios</div>
            <div className="col-span-2 text-right">Estado</div>
          </div>
          {r.modules.filter((m) => m.entries > 0 || m.detected > 0).map((m) => (
            <ModuleRow key={m.key} module={m} detections={r.detections} />
          ))}
          {r.modules.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground text-center">No se reconocieron módulos MVT.</div>
          )}
        </div>
      </section>

      {/* 06 · Indicios detectados */}
      <section>
        <SectionTitle num="06" title="Indicios detectados" />
        {r.detections.length === 0 ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-sm">
            <ShieldCheck className="h-5 w-5 inline-block text-success mr-2" />
            MVT no encontró coincidencias con indicadores conocidos en los archivos subidos.
          </div>
        ) : (
          <UserDetections detections={r.detections} />
        )}
      </section>

      {/* 07 · Apps con más actividad sospechosa */}
      {topApps.length > 0 && (
        <section>
          <SectionTitle num="07" title="Apps con más actividad sospechosa" />
          <p className="text-sm text-muted-foreground mb-4">
            Apps que más veces aparecen en los indicios técnicos. Si no reconoces alguna marcada como "Origen no reconocido", revísala con calma.
          </p>
          <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
            {topApps.map((app, i) => (
              <TopAppRow key={app.packageName} app={app} index={i + 1} />
            ))}
          </div>
        </section>
      )}

      {/* 08 · Cronología de eventos clave */}
      {humanTimeline.length > 0 && (
        <section>
          <SectionTitle num="08" title="Cronología de eventos clave" />
          <p className="text-sm text-muted-foreground mb-4">
            Reconstrucción en lenguaje natural de los eventos más relevantes detectados, ordenados por fecha.
          </p>
          <ol className="relative border-l border-border ml-3 space-y-4">
            {humanTimeline.map((e, i) => (
              <li key={i} className="ml-6 relative">
                <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ${
                  e.severity === "critical" || e.severity === "high" ? "bg-destructive"
                  : e.severity === "medium" ? "bg-warning" : "bg-muted-foreground"
                }`} />
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> {e.when}
                </div>
                <div className="text-sm text-foreground/90 mt-1">{e.sentence}</div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 09 · Próximos pasos recomendados */}
      <section>
        <SectionTitle num="09" title="Próximos pasos recomendados" />
        <ol className="space-y-3">
          {recs.map((rec, i) => (
            <li key={i} className="flex gap-3">
              <span className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-semibold">{i + 1}</span>
              <span className="text-sm text-foreground/90 pt-0.5">{rec}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 10 · Cómo verificar este resultado */}
      <section>
        <SectionTitle num="10" title="Cómo verificar este resultado" />
        <div className="space-y-3">
          {CROSS_CHECK_STEPS.map((step) => (
            <div key={step.title} className="rounded-lg border border-border bg-card p-4 border-l-4 border-l-primary">
              <div className="text-sm font-semibold">{step.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{step.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 11 · Glosario */}
      <section>
        <SectionTitle num="11" title="Glosario de términos" />
        <p className="text-sm text-muted-foreground mb-4">
          Pequeño diccionario para entender los términos técnicos que aparecen en este informe.
        </p>
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="px-4 py-3 flex items-start gap-3">
              <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-semibold">{g.term}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{g.definition}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 12 · Aviso legal */}
      <section>
        <SectionTitle num="12" title="Aviso legal y metodología" />
        <div className="space-y-3 text-xs text-muted-foreground">
          <p>Este informe ha sido generado automáticamente a partir de los resultados de Mobile Verification Toolkit (MVT), un proyecto de Amnesty International Security Lab. MVT compara los artefactos extraídos del dispositivo con un conjunto público de indicadores de compromiso (IOCs) conocidos.</p>
          <p>Un indicio detectado en este informe no constituye una certificación absoluta de infección: puede tratarse de software legítimo (control parental, gestión empresarial, apps de seguimiento autorizadas). La clasificación por categorías y la traducción a lenguaje claro son heurísticas que ofrece esta herramienta; la interpretación final corresponde a un analista cualificado.</p>
          <div>
            <p className="font-semibold text-foreground mb-2">Familias de spyware cubiertas por los IOCs públicos de MVT</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {[
                "Pegasus (NSO Group)",
                "Predator (Intellexa/Cytrox)",
                "Reign (QuaDream)",
                "Hermit (RCS Lab)",
                "Triangulation (iOS)",
                "Stalkerware comercial",
              ].map((name) => (
                <span key={name} className="px-2 py-0.5 rounded-md border border-border bg-muted/40 text-[11px] text-foreground">
                  {name}
                </span>
              ))}
            </div>
            <p>La lista exacta evoluciona con cada actualización de los repositorios públicos de Amnesty International, Citizen Lab y Google TAG, por lo que la cobertura real depende de la versión de MVT y de los indicadores vigentes en el momento del análisis.</p>
          </div>
          <p>La ausencia de indicios no garantiza que el dispositivo esté limpio: MVT solo cubre amenazas con firma pública conocida. Spyware nuevo o muestras privadas pueden no detectarse.</p>

          <p className="italic">Los archivos se procesan localmente en el navegador. No se transmite información del dispositivo analizado a terceros. El análisis se realiza con el consentimiento del propietario del dispositivo.</p>
        </div>
      </section>
    </div>
  );
}

function TopAppRow({ app, index }: { app: SuspiciousApp; index: number }) {
  const originBadge =
    app.origin === "system" ? "bg-muted text-muted-foreground border-border"
    : app.origin === "known" ? "bg-primary/10 text-primary border-primary/20"
    : "bg-warning/15 text-warning border-warning/30";
  return (
    <div className="p-4 flex items-start gap-4">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0 tabular-nums text-xs font-semibold">
        {index}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <AppWindow className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">{app.displayName}</span>
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${SEV_BADGE[app.severity]}`}>
            {severityLabel(app.severity)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">· {app.count} indicio(s)</span>
        </div>
        <div className="text-xs text-muted-foreground font-mono mt-1 break-all">{app.packageName}</div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${originBadge}`}>
            {app.originLabel}
          </span>
          {app.categories.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Visto en: {app.categories.join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-border">
      <span className="text-lg font-semibold text-muted-foreground tabular-nums">{num}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}

function ModuleRow({ module: m, detections }: { module: { key: string; label: string; entries: number; detected: number }; detections: MvtDetection[] }) {
  const [open, setOpen] = useState(m.detected > 0);
  const highlights = useMemo(
    () => (m.detected > 0 ? buildModuleHighlights(detections, m.key, 8) : []),
    [detections, m.key, m.detected],
  );
  const hasHighlights = highlights.length > 0;
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => hasHighlights && setOpen((v) => !v)}
        className={`w-full grid grid-cols-12 px-4 py-3 text-sm items-center text-left ${hasHighlights ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"}`}
      >
        <div className="col-span-6 min-w-0 flex items-center gap-2">
          {hasHighlights ? (open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />) : <span className="w-3.5 shrink-0" />}
          <div className="min-w-0">
            <div className="font-medium truncate">{humanizeModule(m.key, m.label)}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{m.key}</div>
          </div>
        </div>
        <div className="col-span-2 text-right tabular-nums">{m.entries.toLocaleString()}</div>
        <div className={`col-span-2 text-right tabular-nums font-semibold ${m.detected > 0 ? "text-destructive" : "text-muted-foreground"}`}>{m.detected}</div>
        <div className="col-span-2 text-right">
          {m.detected > 0
            ? <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${SEV_BADGE.high}`}>ALTO</span>
            : <span className="text-xs text-muted-foreground">limpio</span>}
        </div>
      </button>
      {open && hasHighlights && (
        <div className="px-4 pb-4 pl-10">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Detalle</div>
          <ul className="space-y-1.5">
            {highlights.map((h, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span className="text-xs tabular-nums text-muted-foreground shrink-0 mt-0.5">{h.count}×</span>
                <span className="min-w-0">
                  <span className="font-mono text-xs">{h.label}</span>
                  {h.detail && <span className="text-foreground/80"> · {h.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- Agrupado por entidad (deduplicación) ----------

const LEVEL_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const CATEGORY_ORDER: Category[] = ["mercenary", "stalkerware", "suspicious"];

type Group = {
  key: string;
  label: string;
  category: Category;
  level: RiskLevel;
  count: number;
  modules: Map<string, number>;
  sample: MvtDetection;
  firstSeen?: string;
  lastSeen?: string;
};

function buildGroups(detections: MvtDetection[]): Record<Category, Group[]> {
  const buckets: Record<Category, Map<string, Group>> = {
    mercenary: new Map(), stalkerware: new Map(), suspicious: new Map(),
  };
  for (const d of detections) {
    const cat = classifyDetection(d);
    const { key, label } = detectionKey(d);
    const bucket = buckets[cat];
    let g = bucket.get(key);
    if (!g) {
      g = { key, label, category: cat, level: d.level ?? "low", count: 0, modules: new Map(), sample: d };
      bucket.set(key, g);
    }
    g.count += 1;
    g.modules.set(d.module, (g.modules.get(d.module) ?? 0) + 1);
    const dLevel: RiskLevel = d.level ?? "low";
    if ((LEVEL_RANK[dLevel] ?? 0) > (LEVEL_RANK[g.level] ?? 0)) {
      g.level = dLevel;
      g.sample = d;
    }
    if (d.timestamp) {
      if (!g.firstSeen || d.timestamp < g.firstSeen) g.firstSeen = d.timestamp;
      if (!g.lastSeen || d.timestamp > g.lastSeen) g.lastSeen = d.timestamp;
    }
  }
  return {
    mercenary: [...buckets.mercenary.values()].sort((a, b) => b.count - a.count),
    stalkerware: [...buckets.stalkerware.values()].sort((a, b) => b.count - a.count),
    suspicious: [...buckets.suspicious.values()].sort((a, b) => b.count - a.count),
  };
}

function severityClasses(level: RiskLevel | undefined): string {
  switch (level) {
    case "critical": return "bg-destructive/15 text-destructive border-destructive/30";
    case "high": return "bg-destructive/10 text-destructive border-destructive/20";
    case "medium": return "bg-warning/15 text-warning border-warning/30";
    case "low": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function UserDetections({ detections }: { detections: MvtDetection[] }) {
  const groups = useMemo(() => buildGroups(detections), [detections]);
  const uniqueTotal = groups.mercenary.length + groups.stalkerware.length + groups.suspicious.length;

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-3">
        {uniqueTotal} entidad(es) única(s) agrupadas a partir de {detections.length} indicio(s) técnico(s).
      </div>
      <div className="space-y-6">
        {CATEGORY_ORDER.map((cat) => {
          const list = groups[cat];
          if (list.length === 0) return null;
          const totalOccur = list.reduce((s, g) => s + g.count, 0);
          return (
            <div key={cat}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-semibold">{CATEGORY_LABEL[cat]}</h3>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {list.length} entidad(es) · {totalOccur} ocurrencias
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{CATEGORY_DESC[cat]}</p>
              <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
                {list.map((g, i) => (
                  <div key={g.key} className="p-4 flex items-start gap-4">
                    <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive grid place-items-center shrink-0 tabular-nums text-xs font-semibold">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{g.label}</span>
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityClasses(g.level)}`}>
                          {severityLabel(g.level)}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">· {g.count}×</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Detectado en:{" "}
                        {[...g.modules.entries()]
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 4)
                          .map(([m, c]) => `${humanizeModule(m)} (${c})`)
                          .join(" · ")}
                        {g.modules.size > 4 && ` · +${g.modules.size - 4} más`}
                      </div>
                      <div className="text-sm mt-1.5">{humanizeDetection(g.sample.summary)}</div>
                      {(g.firstSeen || g.lastSeen) && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {g.firstSeen && <>1ª vez: <span className="font-mono">{g.firstSeen}</span></>}
                          {g.firstSeen && g.lastSeen && g.firstSeen !== g.lastSeen && " · "}
                          {g.lastSeen && g.firstSeen !== g.lastSeen && <>última: <span className="font-mono">{g.lastSeen}</span></>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DevDetections({ detections }: { detections: MvtDetection[] }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-3">
        Salida cruda de MVT — un registro por cada indicio detectado ({detections.length} en total).
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {detections.slice(0, 200).map((d, i) => (
          <div key={i} className="p-4 border-b border-border last:border-0 flex items-start gap-4">
            <div className="h-9 w-9 rounded-lg bg-destructive/10 text-destructive grid place-items-center shrink-0">
              <AlertOctagon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{d.module}</span>
                {d.level && (
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${severityClasses(d.level)}`}>
                    {severityLabel(d.level)}
                  </span>
                )}
                {d.timestamp && <span className="text-xs text-muted-foreground font-mono">{d.timestamp}</span>}
              </div>
              <div className="font-mono text-xs mt-1 break-all whitespace-pre-wrap">{d.summary}</div>
            </div>
          </div>
        ))}
        {detections.length > 200 && (
          <div className="p-3 text-xs text-muted-foreground text-center border-t border-border">
            Mostrando 200 de {detections.length}. Descarga el PDF para el listado completo.
          </div>
        )}
      </div>
    </div>
  );
}

