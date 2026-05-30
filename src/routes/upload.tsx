import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileArchive, ShieldCheck, X, BookOpen, AlertTriangle } from "lucide-react";
import { upsertAnalysis, Analysis } from "@/lib/mock-store";
import { parseMvtFiles } from "@/lib/mvt-parser";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Nuevo análisis — Spyware Forensic Analyzer" }] }),
  component: Upload,
});

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

function Upload() {
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
        setError(`Archivo no soportado: ${f.name}. Solo .json o .zip generados por MVT.`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        setError(`El archivo ${f.name} supera el límite de 50 MB.`);
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
    const sourceName = files.length === 1 ? files[0].name : `${files.length} archivos MVT`;
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
      const errored: Analysis = { ...base, status: "error", progress: 0, error: e?.message || "Error al procesar" };
      upsertAnalysis(errored);
      setError(e?.message || "No se pudieron procesar los archivos.");
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Nuevo análisis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube los archivos JSON generados por MVT o un ZIP con la carpeta <code className="font-mono">resultados/</code>.
        </p>

        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">¿No sabes cómo generar los archivos?</div>
            <div className="text-muted-foreground mt-0.5">
              Sigue la <Link to="/guia" className="text-primary underline">guía paso a paso para iOS y Android</Link>. MVT se ejecuta en tu computador, no en la web.
            </div>
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="mt-6 rounded-xl border-2 border-dashed border-border bg-card/40 hover:border-primary/50 hover:bg-card/60 transition-colors p-12 text-center cursor-pointer"
        >
          <div className="mx-auto h-14 w-14 rounded-lg bg-gradient-primary grid place-items-center shadow-glow mb-4">
            <UploadCloud className="h-7 w-7 text-primary-foreground" />
          </div>
          <h3 className="font-semibold">Arrastra los archivos aquí</h3>
          <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionarlos · .json o .zip (máx. 50 MB)</p>
          <input ref={inputRef} type="file" multiple className="hidden" accept=".json,.zip"
            onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))} />
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-6 space-y-2">
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

        <label className="mt-8 flex gap-3 items-start rounded-lg border border-warning/40 bg-warning/5 p-4 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span className="text-sm text-muted-foreground">
            Confirmo que soy propietario del dispositivo analizado o dispongo del <strong className="text-foreground">consentimiento explícito</strong> del propietario. Entiendo que esta plataforma ofrece indicios técnicos, no una certificación absoluta de infección. Los archivos se procesan localmente en mi navegador.
          </span>
        </label>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" /> Procesamiento 100% local · no se sube nada al servidor
          </div>
          <Button onClick={start} disabled={!files.length || !consent || busy} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            {busy ? "Procesando…" : "Analizar archivos"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
