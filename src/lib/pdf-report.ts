import jsPDF from "jspdf";
import { Analysis, riskLabel, platformLabel } from "./mock-store";

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
  doc.text("Informe forense preliminar — basado en resultados MVT", 40, 66);

  y = 130;
  doc.setTextColor(20, 28, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Resumen ejecutivo", 40, y);
  y += 18;

  const r = a.result;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summary = r
    ? `Análisis de "${a.fileName}". Plataforma detectada: ${platformLabel(r.platform)}. Módulos MVT analizados: ${r.modules.length}. Entradas totales: ${r.totalEntries}. Detecciones MVT (_detected): ${r.totalDetections}. Nivel de riesgo estimado: ${riskLabel(r.risk)}. Este resultado es un indicio técnico y no una certificación absoluta de infección.`
    : `Análisis de "${a.fileName}". Estado: ${a.status}.`;
  const summaryLines = doc.splitTextToSize(summary, W - 80);
  doc.text(summaryLines, 40, y);
  y += summaryLines.length * 12 + 16;

  // Meta
  ensure(120);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("Detalles del análisis", 40, y); y += 16;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const meta: [string, string][] = [
    ["Fecha", new Date(a.uploadedAt).toLocaleString()],
    ["Origen", a.fileName],
    ["Tamaño", `${(a.fileSize / 1024).toFixed(1)} KB`],
    ["Plataforma", r ? platformLabel(r.platform) : "—"],
    ["Módulos", String(r?.modules.length ?? 0)],
    ["Detecciones", String(r?.totalDetections ?? 0)],
    ["Riesgo", riskLabel(r?.risk)],
  ];
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold"); doc.text(`${k}:`, 40, y);
    doc.setFont("helvetica", "normal"); doc.text(String(v), 130, y);
    y += 14;
  });
  y += 8;

  // Modules
  if (r && r.modules.length) {
    ensure(40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text("Módulos analizados", 40, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    r.modules.forEach((m) => {
      ensure(16);
      const flag = m.detected > 0 ? "  [DETECCIONES]" : "";
      doc.text(`• ${m.label} (${m.key}) — entradas: ${m.entries}, detecciones: ${m.detected}${flag}`, 40, y);
      y += 12;
    });
    y += 8;
  }

  // Detections
  if (r && r.detections.length) {
    ensure(40);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(`Indicadores detectados (${r.detections.length})`, 40, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);

    r.detections.slice(0, 80).forEach((d, idx) => {
      ensure(40);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. [${d.module}]${d.timestamp ? ` ${d.timestamp}` : ""}`, 40, y);
      y += 12;
      doc.setFont("courier", "normal");
      const lines = doc.splitTextToSize(d.summary, W - 80);
      doc.text(lines, 40, y);
      y += lines.length * 11 + 6;
    });
    if (r.detections.length > 80) {
      ensure(16);
      doc.setFont("helvetica", "italic");
      doc.text(`… y ${r.detections.length - 80} detecciones más (ver dashboard).`, 40, y);
      y += 14;
    }
  }

  // Recomendaciones
  ensure(120);
  y += 6;
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("Recomendaciones", 40, y); y += 16;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const recs = [
    "Aislar el dispositivo de redes sensibles hasta completar la verificación.",
    "Actualizar el sistema operativo y revocar credenciales potencialmente expuestas.",
    "Consultar con un especialista en respuesta a incidentes para análisis profundo.",
    "Conservar los artefactos originales (backup y resultados MVT) como evidencia.",
  ];
  recs.forEach((rec) => { ensure(14); doc.text(`• ${rec}`, 40, y); y += 14; });

  ensure(40);
  y += 10;
  doc.setFont("helvetica", "italic"); doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  const disclaimer = doc.splitTextToSize("Aviso: este informe ofrece indicios técnicos basados en resultados de MVT. No constituye una certificación absoluta de infección. El análisis se realiza con el consentimiento del propietario del dispositivo y los archivos se procesan localmente.", W - 80);
  doc.text(disclaimer, 40, y);

  doc.save(`informe-${a.id.slice(0, 8)}.pdf`);
}
