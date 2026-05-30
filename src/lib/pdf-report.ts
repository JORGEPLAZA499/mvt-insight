import jsPDF from "jspdf";
import { Analysis, riskLabel, platformLabel } from "./mock-store";
import {
  humanizeModule,
  humanizeDetection,
  severityLabel,
  explainSeverity,
  riskNarrative,
  nextSteps,
} from "./mvt-translate";

export function generatePdfReport(a: Analysis) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 56;

  const ensure = (need: number) => {
    if (y + need > H - 56) { doc.addPage(); y = 56; }
  };

  // Header
  doc.setFillColor(20, 28, 48);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Spyware Forensic Analyzer", 40, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Informe forense en lenguaje claro — basado en resultados MVT", 40, 66);

  y = 130;
  doc.setTextColor(20, 28, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Resumen ejecutivo", 40, y);
  y += 18;

  const r = a.result;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const baseSummary = r
    ? `Análisis de "${a.fileName}". Plataforma detectada: ${platformLabel(r.platform)}. Módulos MVT analizados: ${r.modules.length}. Entradas totales: ${r.totalEntries}. Indicios detectados: ${r.totalDetections}. Nivel de riesgo estimado: ${riskLabel(r.risk)}.`
    : `Análisis de "${a.fileName}". Estado: ${a.status}.`;
  const narrative = r ? " " + riskNarrative(r) : "";
  const summaryLines = doc.splitTextToSize(baseSummary + narrative, W - 80);
  doc.text(summaryLines, 40, y);
  y += summaryLines.length * 12 + 16;

  // ¿Qué significa este informe?
  ensure(120);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("¿Qué significa este informe?", 40, y); y += 16;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const intro = "MVT (Mobile Verification Toolkit) busca rastros conocidos de spyware y apps de vigilancia en una copia del dispositivo. Un indicio no equivale a infección: puede ser una app legítima que tú instalaste. Lee cada hallazgo y comprueba si reconoces la app o el comportamiento. Las severidades significan:";
  const introLines = doc.splitTextToSize(intro, W - 80);
  doc.text(introLines, 40, y);
  y += introLines.length * 12 + 6;
  (["critical", "high", "medium", "low"] as const).forEach((lvl) => {
    ensure(14);
    doc.text(`• ${explainSeverity(lvl)}`, 50, y);
    y += 13;
  });
  y += 8;

  // Meta
  ensure(140);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("Detalles del análisis", 40, y); y += 16;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const meta: [string, string][] = [
    ["Fecha", new Date(a.uploadedAt).toLocaleString()],
    ["Origen", a.fileName],
    ["Tamaño", `${(a.fileSize / 1024).toFixed(1)} KB`],
    ["Plataforma", r ? platformLabel(r.platform) : "—"],
    ["Módulos", String(r?.modules.length ?? 0)],
    ["Indicios", String(r?.totalDetections ?? 0)],
    ["Riesgo", riskLabel(r?.risk)],
  ];
  meta.forEach(([k, v]) => {
    ensure(14);
    doc.setFont("helvetica", "bold"); doc.text(`${k}:`, 40, y);
    doc.setFont("helvetica", "normal"); doc.text(String(v), 130, y);
    y += 14;
  });
  y += 8;

  // Modules
  if (r && r.modules.length) {
    ensure(40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("Áreas del dispositivo analizadas", 40, y); y += 16;
    const visibleMods = r.modules.filter((m) => m.entries > 0 || m.detected > 0);
    visibleMods.forEach((m) => {
      ensure(16);
      const human = humanizeModule(m.key, m.label);
      const flag = m.detected > 0 ? "  [con indicios]" : "";
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.setTextColor(20, 28, 48);
      doc.text(`• ${human}`, 40, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`(${m.key}) — entradas: ${m.entries}, indicios: ${m.detected}${flag}`, 280, y);
      y += 13;
    });
    doc.setTextColor(20, 28, 48);
    y += 8;
  }

  // Detections — group consecutive duplicates and sort by severity
  if (r && r.detections.length) {
    ensure(40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.setTextColor(20, 28, 48);
    doc.text(`Indicios detectados (${r.detections.length})`, 40, y); y += 16;

    const sevRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sevColor: Record<string, [number, number, number]> = {
      critical: [185, 28, 28],
      high: [194, 87, 24],
      medium: [161, 122, 0],
      low: [90, 90, 90],
    };

    const sorted = [...r.detections].sort((a, b) => {
      const ra = sevRank[a.level ?? "high"] ?? 4;
      const rb = sevRank[b.level ?? "high"] ?? 4;
      if (ra !== rb) return ra - rb;
      if (a.module !== b.module) return a.module.localeCompare(b.module);
      return a.summary.localeCompare(b.summary);
    });

    type Group = { module: string; summary: string; level: string; count: number };
    const groups: Group[] = [];
    for (const d of sorted) {
      const last = groups[groups.length - 1];
      const lvl = d.level ?? "high";
      if (last && last.module === d.module && last.summary === d.summary && last.level === lvl) {
        last.count += 1;
      } else {
        groups.push({ module: d.module, summary: d.summary, level: lvl, count: 1 });
      }
    }

    const MAX = 150;
    groups.slice(0, MAX).forEach((g, idx) => {
      ensure(48);
      const [cr, cg, cb] = sevColor[g.level] ?? [60, 60, 60];
      // Header line: [SEV] N. Módulo humanizado (N×)
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.setTextColor(cr, cg, cb);
      const tag = `[${severityLabel(g.level as any)}]`;
      doc.text(tag, 40, y);
      const tagW = doc.getTextWidth(tag) + 6;
      doc.setTextColor(20, 28, 48);
      const head = `${idx + 1}. ${humanizeModule(g.module)}${g.count > 1 ? `  (${g.count}×)` : ""}`;
      doc.text(head, 40 + tagW, y);
      y += 13;

      // Plain-language explanation
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const human = humanizeDetection(g.summary);
      const humanLines = doc.splitTextToSize(human, W - 80);
      doc.text(humanLines, 40, y);
      y += humanLines.length * 12 + 2;

      // Technical detail in gray
      doc.setFont("helvetica", "italic"); doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      const tech = doc.splitTextToSize(`Detalle técnico: ${g.summary}`, W - 80);
      doc.text(tech, 40, y);
      y += tech.length * 10 + 8;
    });
    doc.setTextColor(20, 28, 48);
    if (groups.length > MAX) {
      ensure(16);
      doc.setFont("helvetica", "italic"); doc.setFontSize(10);
      doc.text(`… y ${groups.length - MAX} grupos de indicios más (ver dashboard).`, 40, y);
      y += 14;
    }
  }

  // Próximos pasos recomendados
  ensure(120);
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.setTextColor(20, 28, 48);
  doc.text("Próximos pasos recomendados", 40, y); y += 16;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const recs = r ? nextSteps(r) : [
    "Aislar el dispositivo de redes sensibles hasta completar la verificación.",
    "Actualizar el sistema operativo y revocar credenciales potencialmente expuestas.",
  ];
  recs.forEach((rec) => {
    ensure(28);
    const lines = doc.splitTextToSize(`• ${rec}`, W - 80);
    doc.text(lines, 40, y);
    y += lines.length * 12 + 2;
  });

  ensure(40);
  y += 10;
  doc.setFont("helvetica", "italic"); doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const disclaimer = doc.splitTextToSize("Aviso: este informe ofrece indicios técnicos basados en resultados de MVT. No constituye una certificación absoluta de infección. El análisis se realiza con el consentimiento del propietario del dispositivo y los archivos se procesan localmente.", W - 80);
  doc.text(disclaimer, 40, y);

  doc.save(`informe-${a.id.slice(0, 8)}.pdf`);
}
