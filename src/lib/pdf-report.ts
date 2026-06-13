import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { Analysis, riskLabel, platformLabel } from "./mock-store";
import type { MvtDeviceInfo } from "./mvt-parser";

// ---------- Paleta (portada / header / footer) ----------
const NAVY: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [226, 232, 240];
const WHITE: [number, number, number] = [255, 255, 255];
const ACCENT: [number, number, number] = [37, 99, 235];

const SEV_COLOR: Record<string, [number, number, number]> = {
  critical: [185, 28, 28],
  high: [194, 87, 24],
  medium: [161, 122, 0],
  low: [71, 85, 105],
};

function formatDeviceForPdf(d?: MvtDeviceInfo): string {
  if (!d) return "";
  const maker = d.manufacturer || d.brand;
  const left = [maker, d.model].filter(Boolean).join(" ").trim();
  const os = d.osVersion
    ? `${maker?.toLowerCase() === "apple" ? "iOS" : "Android"} ${d.osVersion}`
    : "";
  return [left, os].filter(Boolean).join(" · ");
}

/**
 * Genera el PDF capturando la vista actual del informe (#pdf-report-root)
 * con html2canvas-pro, sección por sección. Mantiene una portada propia y
 * encabezado/pie de página corporativos.
 *
 * Requiere que el componente del informe esté visible en el DOM en el
 * momento de la llamada (ruta /analysis/$id, pestaña "Usuario").
 */
export async function generatePdfReport(a: Analysis): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = { left: 40, right: 40, top: 56, bottom: 48 };
  const CW = W - M.left - M.right;
  const reportId = a.id.slice(0, 8).toUpperCase();

  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setStroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  // ============================================================
  // PORTADA
  // ============================================================
  setFill(NAVY);
  doc.rect(0, 0, W, H, "F");

  setFill(ACCENT);
  doc.rect(M.left, 90, 36, 4, "F");
  setText(WHITE);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("SPYWARE FORENSIC ANALYZER", M.left, 118);

  doc.setFont("helvetica", "bold"); doc.setFontSize(32);
  doc.text("Informe forense", M.left, 240);
  doc.text("de dispositivo móvil", M.left, 276);

  setText([148, 163, 184]);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text("Análisis basado en Mobile Verification Toolkit (MVT)", M.left, 300);

  // Tarjeta de metadatos
  const r = a.result;
  const cardY = 360;
  const deviceStr = formatDeviceForPdf(r?.deviceInfo);
  const meta: [string, string][] = [
    ["Archivo analizado", a.fileName],
    ["Identificador del informe", reportId],
    ["Fecha del análisis", new Date(a.uploadedAt).toLocaleString()],
    ["Plataforma detectada", r ? platformLabel(r.platform) : "—"],
    ...(deviceStr ? [["Dispositivo", deviceStr] as [string, string]] : []),
    ["Tamaño del origen", `${(a.fileSize / 1024).toFixed(1)} KB`],
  ];
  const cardH = meta.length * 28 + 24;
  setFill([22, 32, 52]);
  doc.roundedRect(M.left, cardY, CW, cardH, 6, 6, "F");
  let cy = cardY + 28;
  meta.forEach(([k, v]) => {
    setText([148, 163, 184]);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(k.toUpperCase(), M.left + 20, cy);
    setText(WHITE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    const val = doc.splitTextToSize(String(v), CW - 40)[0];
    doc.text(val, M.left + 20, cy + 13);
    cy += 28;
  });

  // Banda de riesgo
  if (r) {
    const [sr, sg, sb] = SEV_COLOR[r.risk] ?? MUTED;
    const bandY = cardY + cardH + 24;
    setFill([sr, sg, sb]);
    doc.roundedRect(M.left, bandY, CW, 70, 6, 6, "F");
    setText(WHITE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("NIVEL DE RIESGO ESTIMADO", M.left + 20, bandY + 22);
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text(riskLabel(r.risk).toUpperCase(), M.left + 20, bandY + 50);
    doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text(String(r.totalDetections), W - M.right - 20, bandY + 32, { align: "right" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("INDICIOS DETECTADOS", W - M.right - 20, bandY + 48, { align: "right" });
  }

  setText([148, 163, 184]);
  doc.setFont("helvetica", "italic"); doc.setFontSize(8);
  doc.text(
    "Documento confidencial · generado localmente · no constituye certificación de infección",
    M.left,
    H - 40,
  );

  // ============================================================
  // CAPTURA DEL INFORME
  // ============================================================
  const root = typeof document !== "undefined"
    ? (document.getElementById("pdf-report-root") as HTMLElement | null)
    : null;

  if (!root) {
    // No hay informe en pantalla — guardamos solo la portada.
    drawFooter(doc, 1, W, H, M);
    doc.save(`informe-forense-${reportId}.pdf`);
    return;
  }

  // Esperar a que fuentes y layout estén estables antes de capturar
  if (document.fonts && typeof document.fonts.ready?.then === "function") {
    try { await document.fonts.ready; } catch { /* ignore */ }
  }
  await new Promise((res) => requestAnimationFrame(() => res(null)));

  const sections = Array.from(
    root.querySelectorAll<HTMLElement>("[data-pdf-section]"),
  );
  const targets: HTMLElement[] = sections.length > 0 ? sections : [root];

  // Página de contenido: dejamos espacio para header/footer
  const contentTop = M.top + 16;
  const contentBottom = H - M.bottom - 8;
  const contentH = contentBottom - contentTop;

  let firstContentPage = true;
  let y = contentTop;

  const newPage = () => {
    doc.addPage();
    drawHeader(doc, reportId, W, M);
    y = contentTop;
  };

  // Primera página de contenido (después de portada)
  doc.addPage();
  drawHeader(doc, reportId, W, M);
  y = contentTop;

  for (const el of targets) {
    // Captura del bloque
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#0f172a", // navy (tema oscuro)
        windowWidth: Math.max(el.scrollWidth, 1024),
      });
    } catch (err) {
      console.error("PDF capture failed for section", err);
      continue;
    }

    const imgWpt = CW;
    const imgHpt = (canvas.height * imgWpt) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    if (imgHpt <= contentH) {
      // Cabe en una página: si no entra en lo que queda, salto
      if (y + imgHpt > contentBottom && !firstContentPage) {
        newPage();
      } else if (y + imgHpt > contentBottom && firstContentPage) {
        newPage();
        firstContentPage = false;
      }
      doc.addImage(imgData, "JPEG", M.left, y, imgWpt, imgHpt, undefined, "FAST");
      y += imgHpt + 12;
      firstContentPage = false;
    } else {
      // Sección más alta que una página: trocear por franjas
      const pxPerPt = canvas.width / imgWpt;
      const sliceHpt = contentH;
      const sliceHpx = Math.floor(sliceHpt * pxPerPt);
      let offsetPx = 0;
      // Si la página actual ya tiene contenido, salta a nueva
      if (y > contentTop + 1) newPage();
      while (offsetPx < canvas.height) {
        const thisHpx = Math.min(sliceHpx, canvas.height - offsetPx);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = thisHpx;
        const sctx = slice.getContext("2d");
        if (!sctx) break;
        sctx.fillStyle = "#0f172a";
        sctx.fillRect(0, 0, slice.width, slice.height);
        sctx.drawImage(canvas, 0, -offsetPx);
        const sliceData = slice.toDataURL("image/jpeg", 0.9);
        const thisHpt = thisHpx / pxPerPt;
        doc.addImage(sliceData, "JPEG", M.left, contentTop, imgWpt, thisHpt, undefined, "FAST");
        offsetPx += thisHpx;
        if (offsetPx < canvas.height) newPage();
      }
      y = contentTop + ((canvas.height - (Math.floor(canvas.height / sliceHpx) * sliceHpx)) / pxPerPt) + 12;
      if (y > contentBottom) { newPage(); }
      firstContentPage = false;
    }
  }

  // Footer en todas las páginas
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    drawFooter(doc, p, W, H, M);
  }

  doc.save(`informe-forense-${reportId}.pdf`);
}

function drawHeader(
  doc: jsPDF,
  reportId: string,
  W: number,
  M: { left: number; right: number },
) {
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, W, 36, "F");
  doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("SPYWARE FORENSIC ANALYZER", M.left, 22);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(`Informe ${reportId}`, W - M.right, 22, { align: "right" });
}

function drawFooter(
  doc: jsPDF,
  pageNum: number,
  W: number,
  H: number,
  M: { left: number; right: number; bottom: number },
) {
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setLineWidth(0.5);
  doc.line(M.left, H - 32, W - M.right, H - 32);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
  doc.text("Documento confidencial · uso forense", M.left, H - 18);
  doc.text(`Página ${pageNum}`, W - M.right, H - 18, { align: "right" });
}
