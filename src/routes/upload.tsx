import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileArchive, ShieldCheck, X } from "lucide-react";
import { upsertAnalysis, Analysis } from "@/lib/mock-store";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Nuevo análisis — Spyware Forensic Analyzer" }] }),
  component: Upload,
});

function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) setFiles(Array.from(e.dataTransfer.files));
  };

  const start = () => {
    if (!files.length || !consent) return;
    const f = files[0];
    const id = crypto.randomUUID();
    const analysis: Analysis = {
      id,
      fileName: f.name,
      fileSize: f.size,
      uploadedAt: new Date().toISOString(),
      status: "pending",
      progress: 0,
    };
    upsertAnalysis(analysis);
    navigate({ to: "/analysis/$id", params: { id } });
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Nuevo análisis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sube los archivos generados por MVT (JSON/CSV) o un backup preparado para análisis.
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="mt-8 rounded-xl border-2 border-dashed border-border bg-card/40 hover:border-primary/50 hover:bg-card/60 transition-colors p-12 text-center cursor-pointer"
        >
          <div className="mx-auto h-14 w-14 rounded-lg bg-gradient-primary grid place-items-center shadow-glow mb-4">
            <UploadCloud className="h-7 w-7 text-primary-foreground" />
          </div>
          <h3 className="font-semibold">Arrastra los archivos aquí</h3>
          <p className="text-sm text-muted-foreground mt-1">o haz clic para seleccionarlos · JSON, CSV, ZIP, TAR</p>
          <input ref={inputRef} type="file" multiple className="hidden" accept=".json,.csv,.zip,.tar,.gz"
            onChange={(e) => e.target.files && setFiles(Array.from(e.target.files))} />
        </div>

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
            Confirmo que dispongo del <strong className="text-foreground">consentimiento explícito</strong> del propietario del dispositivo y que entiendo que esta plataforma ofrece indicios técnicos, no una certificación absoluta de infección.
          </span>
        </label>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success" /> Archivos cifrados en reposo · eliminación bajo demanda
          </div>
          <Button onClick={start} disabled={!files.length || !consent} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            Iniciar análisis
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
