import jsPDF from "jspdf";
import { Analysis, riskLabel } from "./mock-store";

export function generatePdfReport(a: Analysis) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  // Header
  doc.setFillColor(20, 28, 48);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Spyware Forensic Analyzer", 40, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Informe forense preliminar — basado en MVT", 40, 66);

  y = 130;
  doc.setTextColor(20, 28, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Resumen ejecutivo", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summary = `Se realizó un análisis preliminar sobre el archivo "${a.fileName}". Dispositivo: ${a.device || "—"}. Coincidencias detectadas: ${a.matches ?? 0}. Nivel de riesgo estimado: ${riskLabel(a.risk)}. Este resultado constituye un indicio técnico y no una certificación absoluta de infección.`;
  doc.text(doc.splitTextToSize(summary, W - 80), 40, y);
  y += 70;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Detalles del análisis", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const meta = [
    ["Fecha", new Date(a.uploadedAt).toLocaleString()],
    ["Archivo", a.fileName],
    ["Tamaño", `${(a.fileSize / 1024).toFixed(1)} KB`],
    ["Dispositivo", a.device || "—"],
    ["Estado", a.status],
    ["Riesgo", riskLabel(a.risk)],
  ];
  meta.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold"); doc.text(`${k}:`, 40, y);
    doc.setFont("helvetica", "normal"); doc.text(String(v), 130, y);
    y += 14;
  });

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Indicadores detectados", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  (a.indicators || []).forEach((ind, idx) => {
    if (y > 740) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", "bold");
    doc.text(`${idx + 1}. [${ind.type.toUpperCase()}] ${riskLabel(ind.severity)}`, 40, y);
    y += 14;
    doc.setFont("courier", "normal");
    doc.text(doc.splitTextToSize(ind.value, W - 80), 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const desc = doc.splitTextToSize(`${ind.description} (origen: ${ind.source}, ${new Date(ind.timestamp).toLocaleString()})`, W - 80);
    doc.text(desc, 40, y);
    y += desc.length * 12 + 10;
  });

  if (y > 700) { doc.addPage(); y = 56; }
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Recomendaciones", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const recs = [
    "Aislar el dispositivo de redes sensibles hasta completar la verificación.",
    "Actualizar el sistema operativo y revocar credenciales potencialmente expuestas.",
    "Consultar con un especialista en respuesta a incidentes para análisis profundo.",
    "Conservar los artefactos originales como evidencia forense.",
  ];
  recs.forEach((r) => { doc.text(`• ${r}`, 40, y); y += 14; });

  y += 14;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(doc.splitTextToSize("Aviso: este informe ofrece indicios técnicos basados en MVT y feeds públicos. No constituye una certificación absoluta de infección. El análisis se realiza con el consentimiento del propietario del dispositivo.", W - 80), 40, y);

  doc.save(`informe-${a.id.slice(0, 8)}.pdf`);
}
