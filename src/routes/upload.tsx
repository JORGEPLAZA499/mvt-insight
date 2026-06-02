import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  UploadCloud,
  FileArchive,
  ShieldCheck,
  X,
  AlertTriangle,
  ArrowLeft,
  Smartphone,
  Apple,
  Monitor,
  Download,
  CheckCircle2,
  WifiOff,
} from "lucide-react";

import { upsertAnalysis, Analysis } from "@/lib/mock-store";
import { parseMvtFiles } from "@/lib/mvt-parser";
import { UsbConnect } from "@/components/usb-connect";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Nuevo análisis — Spyware Forensic Analyzer" }] }),
  component: Upload,
});

const MAX_SIZE = 500 * 1024 * 1024;
const RELEASES_BASE_URL = "https://github.com/JORGEPLAZA499/mvt-insight/releases/latest/download";
const RELEASES_PAGE_URL = "https://github.com/JORGEPLAZA499/mvt-insight/releases/latest";
const TOTAL_STEPS = 4;

type Device = "android" | "ios";
type OS = "mac" | "linux" | "windows";

function detectOS(): OS {
  if (typeof navigator === "undefined") return "mac";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win")) return "windows";
  return "linux";
}

// Shared Trans components for inline markup in i18n bodies.
const transComponents = {
  b: <strong className="text-foreground" />,
  code: <code className="font-mono text-foreground" />,
};

function Upload() {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [device, setDevice] = useState<Device | null>(null);
  const [os, setOs] = useState<OS>("mac");
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    setOs(detectOS());
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        if (active) setCredits(0);
        return;
      }
      const { data: acc } = await supabase
        .from("accounts")
        .select("credits")
        .eq("id", userId)
        .maybeSingle();
      if (!active) return;
      setCredits(acc?.credits ?? 0);

      channel = supabase
        .channel(`upload-credits-${userId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "accounts", filter: `id=eq.${userId}` },
          (payload) => {
            const next = (payload.new as { credits?: number } | null)?.credits;
            if (active && typeof next === "number") setCredits(next);
          },
        )
        .subscribe();
    })();

    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const isLoadingCredits = credits === null;
  const hasCredits = !isLoadingCredits && (credits ?? 0) > 0;

  const next = () => setStep((s) => (Math.min(TOTAL_STEPS, s + 1) as 1 | 2 | 3 | 4));
  const back = () => setStep((s) => (Math.max(1, s - 1) as 1 | 2 | 3 | 4));

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={back}
              disabled={step === 1}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-0 disabled:cursor-default transition-opacity"
            >
              <ArrowLeft className="h-4 w-4" /> {t("upload.back")}
            </button>
            <span className="text-xs text-muted-foreground">
              {t("upload.stepCounter", { step, total: TOTAL_STEPS })}
            </span>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-1" />
        </header>

        {step === 1 && (
          <StepDevice
            value={device}
            disabled={!hasCredits}
            onSelect={(d) => {
              if (!hasCredits) return;
              setDevice(d);
              next();
            }}
          />
        )}
        {step === 2 && (
          <StepOS
            value={os}
            onSelect={(o) => {
              setOs(o);
              next();
            }}
          />
        )}
        {step === 3 && device && (
          <StepRun device={device} os={os} onDone={next} onChangeOS={back} />
        )}
        {step === 4 && <StepUpload />}
      </div>
    </AppShell>
  );
}

/* -------------------------- Paso 1 -------------------------- */
function StepDevice({
  value,
  disabled = false,
  onSelect,
}: {
  value: Device | null;
  disabled?: boolean;
  onSelect: (d: Device) => void;
}) {
  const { t } = useTranslation();
  return (
    <section>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        {t("upload.step1.title")}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{t("upload.step1.subtitle")}</p>

      {disabled && (
        <div className="mt-5 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-foreground">
                {t("upload.step1.noCredits.title")}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("upload.step1.noCredits.body")}
              </p>
              <Link
                to="/dashboard"
                className="inline-flex items-center mt-3 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 transition"
              >
                {t("upload.step1.noCredits.cta")}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <ChoiceCard
          active={value === "android"}
          disabled={disabled}
          onClick={() => onSelect("android")}
          icon={<Smartphone className="h-7 w-7" />}
          title={t("upload.step1.android.title")}
          subtitle={t("upload.step1.android.sub")}
        />
        <ChoiceCard
          active={value === "ios"}
          disabled={disabled}
          onClick={() => onSelect("ios")}
          icon={<Apple className="h-7 w-7" />}
          title={t("upload.step1.ios.title")}
          subtitle={t("upload.step1.ios.sub")}
        />
      </div>
    </section>
  );
}

/* -------------------------- Paso 2 -------------------------- */
function StepOS({ value, onSelect }: { value: OS; onSelect: (o: OS) => void }) {
  const { t } = useTranslation();
  const options: { id: OS; title: string; icon: React.ReactNode }[] = [
    { id: "mac", title: t("upload.step2.mac"), icon: <Apple className="h-7 w-7" /> },
    { id: "windows", title: t("upload.step2.windows"), icon: <Monitor className="h-7 w-7" /> },
    { id: "linux", title: t("upload.step2.linux"), icon: <Monitor className="h-7 w-7" /> },
  ];
  return (
    <section>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        {t("upload.step2.title")}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{t("upload.step2.subtitle")}</p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {options.map((o) => (
          <ChoiceCard
            key={o.id}
            active={value === o.id}
            onClick={() => onSelect(o.id)}
            icon={o.icon}
            title={o.title}
          />
        ))}
      </div>
    </section>
  );
}

/* -------------------------- Paso 3 -------------------------- */
function StepRun({
  device,
  os,
  onDone,
  onChangeOS,
}: {
  device: Device;
  os: OS;
  onDone: () => void;
  onChangeOS: () => void;
}) {
  const { t } = useTranslation();
  const [subStep, setSubStep] = useState<number>(1);

  const blocked = device === "ios" && os === "windows";

  if (blocked) {
    return (
      <section>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {t("upload.step3.blocked.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">{t("upload.step3.blocked.body")}</p>
        <Button className="mt-6" onClick={onChangeOS}>
          {t("upload.step3.blocked.cta")}
        </Button>
      </section>
    );
  }


  const protocolStep = {
    title: t("upload.step3.substeps.protocol.title"),
    content: (
      <>
        <p className="text-sm text-muted-foreground">
          {t("upload.step3.substeps.protocol.intro")}
        </p>
        <ol className="mt-3 space-y-3 text-sm">
          <li className="flex gap-3">
            <div className="h-7 w-7 shrink-0 rounded-full bg-card border border-border grid place-items-center text-xs font-semibold">
              A
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <WifiOff className="h-3.5 w-3.5" /> {t("upload.step3.substeps.protocol.a.title")}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <Trans
                  i18nKey="upload.step3.substeps.protocol.a.body"
                  components={transComponents}
                />
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <div className="h-7 w-7 shrink-0 rounded-full bg-card border border-border grid place-items-center text-xs font-semibold">
              B
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Smartphone className="h-3.5 w-3.5" /> {t("upload.step3.substeps.protocol.b.title")}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                <Trans
                  i18nKey="upload.step3.substeps.protocol.b.body"
                  components={transComponents}
                />
              </p>
            </div>
          </li>
        </ol>
      </>
    ),
  };

  const brandRoutes = t("upload.step3.substeps.dev.routes", {
    returnObjects: true,
  }) as string[];

  const instructions = t("upload.step3.substeps.download.instructions", {
    returnObjects: true,
  }) as string[];

  const osLabel = os === "windows" ? "Windows" : os === "mac" ? "macOS" : "Linux";

  const subSteps: { title: string; content: React.ReactNode }[] =
    device === "android"
      ? [
          {
            title: t("upload.step3.substeps.dev.title"),
            content: (
              <>
                <p>
                  <Trans i18nKey="upload.step3.substeps.dev.body" components={transComponents} />
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-primary hover:underline text-sm">
                    {t("upload.step3.substeps.dev.routesSummary")}
                  </summary>
                  <ul className="mt-2 space-y-1 pl-4 list-disc text-sm">
                    {brandRoutes.map((html, i) => (
                      <li key={i}>
                        <Trans
                          i18nKey={`upload.step3.substeps.dev.routes.${i}`}
                          components={transComponents}
                        >
                          {html}
                        </Trans>
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            ),
          },
          {
            title: t("upload.step3.substeps.usb.title"),
            content: (
              <p>
                <Trans i18nKey="upload.step3.substeps.usb.body" components={transComponents} />
              </p>
            ),
          },
          {
            title: t("upload.step3.substeps.connect.title"),
            content: (
              <>
                <p>
                  <Trans
                    i18nKey="upload.step3.substeps.connect.body"
                    components={transComponents}
                  />
                </p>
                <div className="mt-4 rounded-xl border border-border bg-card/40 p-4">
                  <UsbConnect connected />
                </div>
              </>
            ),
          },
        ]
      : [
          
          {
            title: t("upload.step3.substeps.iosTrust.title"),
            content: (
              <p>
                <Trans
                  i18nKey="upload.step3.substeps.iosTrust.body"
                  components={transComponents}
                />
              </p>
            ),
          },
          {
            title: t("upload.step3.substeps.iosBackup.title"),
            content: (
              <p>
                <Trans
                  i18nKey="upload.step3.substeps.iosBackup.body"
                  components={transComponents}
                />
                <span className="block mt-1 text-warning">
                  {t("upload.step3.substeps.iosBackup.warn")}
                </span>
              </p>
            ),
          },
          {
            title: t("upload.step3.substeps.iosKeep.title"),
            content: (
              <p>
                <Trans
                  i18nKey="upload.step3.substeps.iosKeep.body"
                  components={transComponents}
                />
              </p>
            ),
          },
        ];

  const downloadStep = {
    title: t("upload.step3.substeps.download.title"),
    content: (
      <>
        <p className="mb-4">
          <Trans i18nKey="upload.step3.substeps.download.intro" components={transComponents} />
        </p>

        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5 shadow-glow">
          <div className="flex items-start gap-4 mb-4">
            <div className="h-12 w-12 rounded-lg bg-gradient-primary grid place-items-center shadow-glow shrink-0">
              <Download className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold">{t("upload.step3.substeps.download.appName")}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("upload.step3.substeps.download.version")}
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            <a
              href={`${RELEASES_BASE_URL}/MvtInsight-Setup-1.0.3.exe`}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                os === "windows"
                  ? "border-primary bg-primary text-primary-foreground shadow-glow"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Monitor className="h-4 w-4" />
              Windows
            </a>
            <a
              href={`${RELEASES_BASE_URL}/MvtInsight-1.0.3-arm64.dmg`}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                os === "mac"
                  ? "border-primary bg-primary text-primary-foreground shadow-glow"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Apple className="h-4 w-4" />
              macOS
            </a>
            <a
              href={`${RELEASES_BASE_URL}/MvtInsight-1.0.3.AppImage`}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                os === "linux"
                  ? "border-primary bg-primary text-primary-foreground shadow-glow"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Monitor className="h-4 w-4" />
              Linux
            </a>
          </div>

          <p className="mt-3 text-[11px] text-muted-foreground">
            <Trans
              i18nKey="upload.step3.substeps.download.recommended"
              values={{ os: osLabel }}
              components={transComponents}
            />{" "}
            <a
              href={RELEASES_PAGE_URL}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-foreground"
            >
              {t("upload.step3.substeps.download.seeAll")}
            </a>
          </p>
        </div>

        <ol className="mt-5 space-y-2 text-sm text-muted-foreground list-decimal pl-5">
          {instructions.map((html, i) => (
            <li key={i}>
              <Trans
                i18nKey={`upload.step3.substeps.download.instructions.${i}`}
                components={transComponents}
              >
                {html}
              </Trans>
            </li>
          ))}
        </ol>

      </>
    ),
  };

  subSteps.unshift(downloadStep, protocolStep);

  subSteps.push({
    title: t("upload.step3.substeps.upload.title"),
    content: (
      <p>
        <Trans i18nKey="upload.step3.substeps.upload.body" components={transComponents} />
      </p>
    ),
  });

  const total = subSteps.length;
  const current = Math.min(subStep, total);
  const active = subSteps[current - 1];
  const isLast = current === total;

  return (
    <section>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        {t("upload.step3.header.title")}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{t("upload.step3.header.subtitle")}</p>

      <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("upload.step3.progress", { current, total })}</span>
        <span className="truncate ml-3">{active.title}</span>
      </div>
      <Progress value={(current / total) * 100} className="h-1 mt-2" />

      <div className="mt-6">
        <NumberedStep n={current} title={active.title}>
          {active.content}
        </NumberedStep>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setSubStep((s) => Math.max(1, s - 1))}
          disabled={current === 1}
          className="disabled:opacity-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> {t("upload.step3.prev")}
        </Button>
        {isLast ? (
          <Button onClick={onDone} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> {t("upload.step3.done")}
          </Button>
        ) : (
          <Button
            onClick={() => setSubStep((s) => Math.min(total, s + 1))}
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            {t("upload.step3.next")}
          </Button>
        )}
      </div>
    </section>
  );
}

function NumberedStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-sm font-semibold shadow-glow">
          {n}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{children}</div>
        </div>
      </div>
    </li>
  );
}

/* -------------------------- Paso 4 -------------------------- */
function StepUpload() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const addFiles = (incoming: File[]) => {
    setError(null);
    const ok: File[] = [];
    for (const f of incoming) {
      const lower = f.name.toLowerCase();
      if (!lower.endsWith(".json") && !lower.endsWith(".zip")) {
        setError(t("upload.step4.errors.unsupported", { name: f.name }));
        continue;
      }
      if (f.size > MAX_SIZE) {
        setError(t("upload.step4.errors.tooBig", { name: f.name }));
        continue;
      }
      ok.push(f);
    }
    setFiles((prev) => [...prev, ...ok]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  const start = async () => {
    if (!files.length || !consent || busy) return;
    setBusy(true);
    setError(null);
    const id = crypto.randomUUID();
    const sourceName =
      files.length === 1 ? files[0].name : t("upload.step4.filesLabel", { count: files.length });
    const totalSize = files.reduce((s, f) => s + f.size, 0);

    const base: Analysis = {
      id,
      fileName: sourceName,
      fileSize: totalSize,
      uploadedAt: new Date().toISOString(),
      status: "processing",
      progress: 10,
    };
    upsertAnalysis(base);

    try {
      const result = await parseMvtFiles(files, sourceName);
      const done: Analysis = { ...base, status: "completed", progress: 100, result };
      upsertAnalysis(done);
      navigate({ to: "/analysis/$id", params: { id } });
    } catch (e: any) {
      const errored: Analysis = {
        ...base,
        status: "error",
        progress: 0,
        error: e?.message || t("upload.step4.errors.generic"),
      };
      upsertAnalysis(errored);
      setError(e?.message || t("upload.step4.errors.generic"));
      setBusy(false);
    }
  };

  return (
    <section>
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        {t("upload.step4.title")}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        <Trans i18nKey="upload.step4.subtitle" components={transComponents} />
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="mt-6 rounded-xl border-2 border-dashed border-border bg-card/40 hover:border-primary/50 hover:bg-card/60 transition-colors p-10 text-center cursor-pointer"
      >
        <div className="mx-auto h-12 w-12 rounded-lg bg-gradient-primary grid place-items-center shadow-glow mb-3">
          <UploadCloud className="h-6 w-6 text-primary-foreground" />
        </div>
        <p className="text-sm font-medium">{t("upload.step4.dropLine1")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("upload.step4.dropLine2")}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".json,.zip"
          onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
        />
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileArchive className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <label className="mt-6 flex gap-3 items-start rounded-lg border border-warning/40 bg-warning/5 p-3 cursor-pointer">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span className="text-sm text-muted-foreground">
          <Trans i18nKey="upload.step4.consent" components={transComponents} />
        </span>
      </label>

      <div className="mt-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" /> {t("upload.step4.local")}
        </div>
        <Button
          onClick={start}
          disabled={!files.length || !consent || busy}
          className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
        >
          {busy ? t("upload.step4.processing") : t("upload.step4.analyze")}
        </Button>
      </div>
    </section>
  );
}

/* -------------------------- Helpers -------------------------- */
function ChoiceCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`group rounded-xl border bg-card text-card-foreground p-6 text-left transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed border-border"
          : `hover:border-primary/60 hover:bg-card/80 ${
              active ? "border-primary shadow-glow" : "border-border"
            }`
      }`}
    >
      <div
        className={`h-12 w-12 rounded-lg grid place-items-center mb-3 transition-colors ${
          active && !disabled
            ? "bg-gradient-primary text-primary-foreground shadow-glow"
            : "bg-muted text-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="font-semibold">{title}</div>
      {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
    </button>
  );
}
