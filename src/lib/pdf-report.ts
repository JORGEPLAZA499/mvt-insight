import jsPDF from "jspdf";
import { Analysis, riskLabel } from "./mock-store";
import type { MvtDeviceInfo, MvtParsedResult, RiskLevel } from "./mvt-parser";
import { KIND_LABEL, CATEGORY_LABEL_HEUR, type HeuristicFinding, type FindingCategory } from "./heuristics";

/**
 * Generador de PDF 100 % vectorial con jsPDF. No depende del DOM ni de
 * html2canvas: el informe se dibuja sección por sección con primitivas de
 * jsPDF, lo que permite texto seleccionable, búsqueda, tamaño pequeño y
 * cero defectos heredados de la maqueta web (truncados, responsive, etc).
 */

// ---------- Paleta (tema oscuro corporativo) ----------
const NAVY: RGB = [15, 23, 42];          // fondo de página
const SURFACE: RGB = [22, 32, 52];       // tarjetas
const SURFACE_2: RGB = [30, 41, 64];     // KPIs / cabeceras de tabla
const BORDER: RGB = [51, 65, 85];        // separadores
const TEXT: RGB = [241, 245, 249];       // texto principal
const MUTED: RGB = [148, 163, 184];      // texto secundario
const SOFT: RGB = [203, 213, 225];       // texto suave
const ACCENT: RGB = [59, 130, 246];      // azul marca
const SUCCESS: RGB = [34, 197, 94];

const SEV_COLOR: Record<RiskLevel | "none", RGB> = {
  critical: [220, 38, 38],
  high: [234, 88, 12],
  medium: [202, 138, 4],
  low: [34, 197, 94],
  none: [100, 116, 139],
};

type RGB = [number, number, number];

// ---------- Geometría ----------
const PAGE = { W: 595.28, H: 841.89 }; // A4 pt
const MARGIN = { left: 40, right: 40, top: 64, bottom: 56 };
const CW = PAGE.W - MARGIN.left - MARGIN.right;

// ---------- Helpers de formato ----------
function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : v >= 10 ? 1 : 2)} ${u[i]}`;
}

function cleanCarrier(s?: string): string {
  if (!s) return "—";
  const v = s.replace(/[,\s]+/g, " ").trim();
  return v || "—";
}

function platformShort(p?: string): string {
  return p === "ios" ? "iOS" : p === "android" ? "Android" : "—";
}
function platformTag(p?: string): string {
  return p === "ios" ? "mvt-ios" : p === "android" ? "mvt-android" : "";
}

function formatDevice(d?: MvtDeviceInfo): string {
  if (!d) return "—";
  const maker = d.manufacturer || d.brand;
  const left = [maker, d.model].filter(Boolean).join(" ").trim();
  const os = d.osVersion
    ? `${maker?.toLowerCase() === "apple" ? "iOS" : "Android"} ${d.osVersion}`
    : "";
  return [left, os].filter(Boolean).join(" · ") || "—";
}

function bootloaderLabel(s?: string): string {
  if (!s) return "—";
  const v = s.toLowerCase();
  if (v.includes("green") || v === "1" || v === "true" || v.includes("locked")) return "bloqueado (recomendado)";
  if (v.includes("orange") || v.includes("yellow") || v === "0" || v.includes("unlock")) return "desbloqueado (riesgo)";
  return s;
}

function severityLabel(lvl?: RiskLevel): string {
  return lvl === "critical" ? "CRÍTICO"
    : lvl === "high" ? "ALTO"
    : lvl === "medium" ? "MEDIO"
    : lvl === "low" ? "BAJO"
    : "—";
}

// ============================================================
// Engine
// ============================================================
class PdfEngine {
  doc: jsPDF;
  y: number;
  reportId: string;

  constructor(reportId: string) {
    this.doc = new jsPDF({ unit: "pt", format: "a4" });
    this.reportId = reportId;
    this.y = MARGIN.top;
  }

  // ---- raw setters ----
  fill(c: RGB) { this.doc.setFillColor(c[0], c[1], c[2]); }
  stroke(c: RGB) { this.doc.setDrawColor(c[0], c[1], c[2]); }
  text(c: RGB) { this.doc.setTextColor(c[0], c[1], c[2]); }
  font(style: "normal" | "bold" | "italic", size: number) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
  }

  // ---- página oscura con cabecera/pie ----
  paintBackground() {
    this.fill(NAVY);
    this.doc.rect(0, 0, PAGE.W, PAGE.H, "F");
  }

  drawHeader() {
    this.fill(SURFACE);
    this.doc.rect(0, 0, PAGE.W, 36, "F");
    this.text(TEXT);
    this.font("bold", 9);
    this.doc.text("SPYWARE FORENSIC ANALYZER", MARGIN.left, 22);
    this.text(SOFT);
    this.font("normal", 9);
    this.doc.text(`Informe ${this.reportId}`, PAGE.W - MARGIN.right, 22, { align: "right" });
  }

  drawFooter(pageNum: number, total: number) {
    this.stroke(BORDER);
    this.doc.setLineWidth(0.4);
    this.doc.line(MARGIN.left, PAGE.H - 36, PAGE.W - MARGIN.right, PAGE.H - 36);
    this.text(MUTED);
    this.font("normal", 8);
    this.doc.text("Documento confidencial · uso forense", MARGIN.left, PAGE.H - 22);
    this.doc.text(`Página ${pageNum} de ${total}`, PAGE.W - MARGIN.right, PAGE.H - 22, { align: "right" });
  }

  newPage() {
    this.doc.addPage();
    this.paintBackground();
    this.drawHeader();
    this.y = MARGIN.top + 16;
  }

  ensureSpace(h: number) {
    if (this.y + h > PAGE.H - MARGIN.bottom - 8) this.newPage();
  }

  // ---- títulos / texto ----
  sectionTitle(num: number, label: string) {
    this.ensureSpace(46);
    this.y += 8;
    // barra inferior sutil
    this.stroke(BORDER);
    this.doc.setLineWidth(0.5);
    this.doc.line(MARGIN.left, this.y + 22, PAGE.W - MARGIN.right, this.y + 22);
    this.text(MUTED);
    this.font("bold", 10);
    const numStr = String(num).padStart(2, "0");
    this.doc.text(numStr, MARGIN.left, this.y + 14);
    this.text(TEXT);
    this.font("bold", 14);
    this.doc.text(label, MARGIN.left + 24, this.y + 14);
    this.y += 36;
  }

  paragraph(s: string, color: RGB = SOFT, size = 10, lineH = 13) {
    this.font("normal", size);
    this.text(color);
    const lines = this.doc.splitTextToSize(s, CW) as string[];
    this.ensureSpace(lines.length * lineH + 4);
    for (const ln of lines) {
      this.doc.text(ln, MARGIN.left, this.y);
      this.y += lineH;
    }
    this.y += 4;
  }

  // tarjeta rellena (sin texto)
  card(x: number, y: number, w: number, h: number, fill: RGB = SURFACE, radius = 8) {
    this.fill(fill);
    this.doc.roundedRect(x, y, w, h, radius, radius, "F");
  }

  // ---- KPIs en grid 4 columnas ----
  drawKpis(kpis: { label: string; value: string; color?: RGB }[]) {
    const cols = kpis.length;
    const gap = 10;
    const w = (CW - gap * (cols - 1)) / cols;
    const h = 60;
    this.ensureSpace(h + 8);
    kpis.forEach((k, i) => {
      const x = MARGIN.left + i * (w + gap);
      this.card(x, this.y, w, h, SURFACE_2);
      this.text(MUTED);
      this.font("bold", 7);
      this.doc.text(k.label.toUpperCase(), x + 12, this.y + 16);
      this.text(k.color || TEXT);
      this.font("bold", 20);
      this.doc.text(k.value, x + 12, this.y + 44);
    });
    this.y += h + 14;
  }

  // ---- fila clave/valor (en tarjeta de 2 columnas) ----
  drawKvGrid(rows: { label: string; value: string; hint?: string }[]) {
    const cols = 2;
    const colW = (CW - 12) / cols;
    const rowH = 38;
    const rowsPerCol = Math.ceil(rows.length / cols);
    const cardH = rowsPerCol * rowH + 16;
    this.ensureSpace(cardH + 8);
    this.card(MARGIN.left, this.y, CW, cardH, SURFACE);
    const startY = this.y + 12;
    rows.forEach((r, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = MARGIN.left + 14 + col * (colW + 0);
      const y = startY + row * rowH;
      this.text(MUTED);
      this.font("bold", 7);
      this.doc.text(r.label.toUpperCase(), x, y + 4);
      this.text(TEXT);
      this.font("bold", 10);
      const v = (this.doc.splitTextToSize(r.value || "—", colW - 18) as string[])[0];
      this.doc.text(v, x, y + 18);
      if (r.hint) {
        this.text(MUTED);
        this.font("normal", 8);
        const h = (this.doc.splitTextToSize(r.hint, colW - 18) as string[])[0];
        this.doc.text(h, x, y + 30);
      }
    });
    this.y += cardH + 12;
  }

  // ---- tabla de áreas analizadas ----
  drawAreasTable(rows: { name: string; code: string; entries: number; detected: number }[]) {
    if (rows.length === 0) return;
    const colW = [CW * 0.55, CW * 0.18, CW * 0.12, CW * 0.15];
    const headerH = 24;
    const rowH = 26;

    // cabecera
    this.ensureSpace(headerH + rowH);
    this.card(MARGIN.left, this.y, CW, headerH, SURFACE_2, 6);
    this.text(MUTED);
    this.font("bold", 8);
    const headers = ["ÁREA", "ENTRADAS", "INDICIOS", "ESTADO"];
    let cx = MARGIN.left + 14;
    headers.forEach((h, i) => {
      const align = i === 0 ? "left" : "right";
      const px = align === "left" ? cx : cx + colW[i] - 14;
      this.doc.text(h, px, this.y + 15, { align });
      cx += colW[i];
    });
    this.y += headerH + 4;

    for (const r of rows) {
      this.ensureSpace(rowH);
      // sutil banda alternativa
      this.fill(SURFACE);
      this.doc.roundedRect(MARGIN.left, this.y, CW, rowH - 2, 4, 4, "F");
      let x = MARGIN.left + 14;
      // ÁREA — nombre humano + código en gris
      this.text(TEXT);
      this.font("bold", 10);
      const name = (this.doc.splitTextToSize(r.name, colW[0] - 28) as string[])[0];
      this.doc.text(name, x, this.y + 17);
      const nameW = this.doc.getTextWidth(name);
      if (r.code && r.code !== r.name) {
        this.text(MUTED);
        this.font("normal", 8);
        this.doc.text(`(${r.code})`, x + nameW + 6, this.y + 17);
      }
      x += colW[0];
      // ENTRADAS
      this.text(TEXT);
      this.font("normal", 10);
      this.doc.text(r.entries.toLocaleString("es-ES"), x + colW[1] - 14, this.y + 17, { align: "right" });
      x += colW[1];
      // INDICIOS
      const detCol: RGB = r.detected > 0 ? SEV_COLOR.high : MUTED;
      this.text(detCol);
      this.font("bold", 10);
      this.doc.text(String(r.detected), x + colW[2] - 14, this.y + 17, { align: "right" });
      x += colW[2];
      // ESTADO
      const status = r.detected > 0 ? "con indicios" : "limpio";
      this.text(r.detected > 0 ? SEV_COLOR.high : SUCCESS);
      this.font("bold", 9);
      this.doc.text(status, x + colW[3] - 14, this.y + 17, { align: "right" });

      this.y += rowH;
    }
    this.y += 6;
  }

  // ---- lista de indicios ----
  drawDetectionsList(detections: { module: string; summary: string; level?: RiskLevel }[]) {
    const max = 50;
    const shown = detections.slice(0, max);
    for (const d of shown) {
      const color = SEV_COLOR[d.level || "high"] || SEV_COLOR.high;
      const padX = 14;
      const innerW = CW - padX * 2;
      const sumLines = this.doc.splitTextToSize(d.summary, innerW) as string[];
      const cardH = 22 + sumLines.length * 12 + 12;
      this.ensureSpace(cardH + 6);
      this.card(MARGIN.left, this.y, CW, cardH, SURFACE);
      // barra lateral
      this.fill(color);
      this.doc.rect(MARGIN.left, this.y, 3, cardH, "F");
      // chip
      this.fill(color);
      this.doc.roundedRect(MARGIN.left + padX, this.y + 10, 44, 14, 3, 3, "F");
      this.text(TEXT);
      this.font("bold", 8);
      this.doc.text(severityLabel(d.level), MARGIN.left + padX + 22, this.y + 19, { align: "center" });
      // módulo
      this.text(MUTED);
      this.font("normal", 9);
      this.doc.text(d.module, MARGIN.left + padX + 56, this.y + 19);
      // resumen
      this.text(TEXT);
      this.font("normal", 10);
      sumLines.forEach((ln, i) => {
        this.doc.text(ln, MARGIN.left + padX, this.y + 36 + i * 12);
      });
      this.y += cardH + 6;
    }
    if (detections.length > max) {
      this.paragraph(`… y ${detections.length - max} indicios más en el informe completo.`, MUTED, 9);
    }
  }

  // ---- caja informativa (genérica) ----
  noticeBox(text: string, color: RGB = SUCCESS) {
    const padX = 14;
    const padY = 14;
    const lines = this.doc.splitTextToSize(text, CW - padX * 2 - 4) as string[];
    const h = padY * 2 + lines.length * 13;
    this.ensureSpace(h + 6);
    this.card(MARGIN.left, this.y, CW, h, SURFACE);
    this.fill(color);
    this.doc.rect(MARGIN.left, this.y, 3, h, "F");
    this.text(TEXT);
    this.font("normal", 10);
    lines.forEach((ln, i) => this.doc.text(ln, MARGIN.left + padX, this.y + padY + 10 + i * 13));
    this.y += h + 10;
  }

  // ---- lista numerada ----
  numberedList(items: string[]) {
    items.forEach((it, i) => {
      const lines = this.doc.splitTextToSize(it, CW - 32) as string[];
      const h = Math.max(20, lines.length * 13 + 6);
      this.ensureSpace(h);
      // círculo
      this.fill(ACCENT);
      this.doc.circle(MARGIN.left + 8, this.y + 7, 8, "F");
      this.text(TEXT);
      this.font("bold", 9);
      this.doc.text(String(i + 1), MARGIN.left + 8, this.y + 10, { align: "center" });
      // texto
      this.text(SOFT);
      this.font("normal", 10);
      lines.forEach((ln, j) => this.doc.text(ln, MARGIN.left + 26, this.y + 9 + j * 13));
      this.y += h;
    });
    this.y += 4;
  }

  // ---- glosario / definiciones ----
  drawDefinitions(items: { term: string; def: string }[]) {
    for (const it of items) {
      const defLines = this.doc.splitTextToSize(it.def, CW - 18) as string[];
      const h = 16 + defLines.length * 12 + 10;
      this.ensureSpace(h);
      this.card(MARGIN.left, this.y, CW, h, SURFACE);
      this.text(TEXT);
      this.font("bold", 10);
      this.doc.text(it.term, MARGIN.left + 12, this.y + 16);
      this.text(MUTED);
      this.font("normal", 9);
      defLines.forEach((ln, i) => this.doc.text(ln, MARGIN.left + 12, this.y + 30 + i * 12));
      this.y += h + 4;
    }
  }

  // ---- chips (familias) ----
  drawChips(items: string[]) {
    let x = MARGIN.left;
    const padY = 5;
    const gap = 6;
    const lineH = 22;
    this.font("normal", 9);
    this.ensureSpace(lineH);
    for (const it of items) {
      const w = this.doc.getTextWidth(it) + 16;
      if (x + w > MARGIN.left + CW) {
        x = MARGIN.left;
        this.y += lineH;
        this.ensureSpace(lineH);
      }
      this.card(x, this.y, w, 18, SURFACE_2, 4);
      this.text(SOFT);
      this.font("normal", 9);
      this.doc.text(it, x + w / 2, this.y + 12, { align: "center" });
      x += w + gap;
      void padY;
    }
    this.y += lineH + 4;
  }
}

// ============================================================
// API pública
// ============================================================
export async function generatePdfReport(a: Analysis): Promise<void> {
  const reportId = a.id.slice(0, 8).toUpperCase();
  const eng = new PdfEngine(reportId);
  const r = a.result;
  const d = r?.deviceInfo;

  // ----- PORTADA -----
  eng.paintBackground();
  eng.fill(ACCENT);
  eng.doc.rect(MARGIN.left, 88, 36, 4, "F");
  eng.text(TEXT);
  eng.font("bold", 11);
  eng.doc.text("SPYWARE FORENSIC ANALYZER", MARGIN.left, 116);

  eng.font("bold", 30);
  eng.doc.text("Informe forense", MARGIN.left, 184);
  eng.doc.text("de dispositivo móvil", MARGIN.left, 220);
  eng.text(MUTED);
  eng.font("normal", 11);
  eng.doc.text("Análisis basado en Mobile Verification Toolkit (MVT)", MARGIN.left, 244);

  // Tarjeta de metadatos (más arriba para evitar el hueco)
  const cardY = 280;
  const platStr = platformShort(r?.platform);
  const platTag = platformTag(r?.platform);
  const meta: [string, string][] = [
    ["Archivo analizado", a.fileName],
    ["Identificador del informe", reportId],
    ["Fecha del análisis", new Date(a.uploadedAt).toLocaleString("es-ES")],
    ["Plataforma detectada", platTag ? `${platStr}  ·  ${platTag}` : platStr],
    ...(d ? [["Dispositivo", formatDevice(d)] as [string, string]] : []),
    ["Tamaño del origen", formatBytes(a.fileSize)],
  ];
  const cardH = meta.length * 30 + 20;
  eng.card(MARGIN.left, cardY, CW, cardH, SURFACE);
  let cy = cardY + 24;
  meta.forEach(([k, v]) => {
    eng.text(MUTED);
    eng.font("bold", 7);
    eng.doc.text(k.toUpperCase(), MARGIN.left + 20, cy);
    eng.text(TEXT);
    eng.font("bold", 10);
    const val = (eng.doc.splitTextToSize(v || "—", CW - 40) as string[])[0];
    eng.doc.text(val, MARGIN.left + 20, cy + 14);
    cy += 30;
  });

  // Banda de riesgo (color por severidad)
  if (r) {
    const sev = SEV_COLOR[r.risk] ?? SEV_COLOR.none;
    const bandY = cardY + cardH + 24;
    eng.card(MARGIN.left, bandY, CW, 78, sev, 8);
    eng.text(TEXT);
    eng.font("bold", 9);
    eng.doc.text("NIVEL DE RIESGO ESTIMADO", MARGIN.left + 20, bandY + 24);
    eng.font("bold", 22);
    eng.doc.text(riskLabel(r.risk).toUpperCase(), MARGIN.left + 20, bandY + 56);
    eng.font("bold", 28);
    eng.doc.text(String(r.totalDetections), PAGE.W - MARGIN.right - 20, bandY + 40, { align: "right" });
    eng.font("bold", 9);
    eng.doc.text("INDICIOS DETECTADOS", PAGE.W - MARGIN.right - 20, bandY + 60, { align: "right" });
  }

  eng.text(MUTED);
  eng.font("italic", 8);
  eng.doc.text(
    "Documento confidencial · generado localmente · no constituye certificación de infección",
    MARGIN.left,
    PAGE.H - 44,
  );

  // ----- CUERPO -----
  let n = 0;
  const sec = () => ++n;
  eng.newPage();

  // 01 Veredicto
  eng.sectionTitle(sec(), "Veredicto");
  if (!r || r.totalDetections === 0) {
    eng.noticeBox(
      "Sin indicios de spyware conocido. MVT no ha encontrado coincidencias con sus indicadores públicos en este informe. Esto no garantiza que el dispositivo esté limpio: MVT solo detecta amenazas con firma conocida.",
      SUCCESS,
    );
  } else {
    const sev = SEV_COLOR[r.risk] ?? SEV_COLOR.high;
    eng.noticeBox(
      `Se han detectado ${r.totalDetections} indicio${r.totalDetections === 1 ? "" : "s"} con nivel de riesgo ${riskLabel(r.risk).toLowerCase()}. Revisa la sección "Indicios detectados" y compara con apps que reconozcas haber instalado.`,
      sev,
    );
  }

  // 02 Análisis por motor
  if (r) {
    eng.sectionTitle(sec(), "Análisis por motor");
    eng.paragraph(
      "El informe combina dos motores. El motor MVT busca indicadores conocidos (IOCs) de spyware mercenario. El motor heurístico detecta stalkerware comercial, apps espía simples, permisos peligrosos y configuraciones de riesgo basándose en patrones, no en firmas.",
      SOFT, 9,
    );
    const h = r.heuristics;
    eng.drawKpis([
      { label: "MVT (IOCs)", value: String(r.totalDetections), color: r.totalDetections > 0 ? SEV_COLOR.high : TEXT },
      { label: "Riesgo MVT", value: riskLabel(r.risk), color: SEV_COLOR[r.risk] ?? TEXT },
      { label: "Heurístico", value: String(h?.findings.length ?? 0), color: (h?.findings.length ?? 0) > 0 ? SEV_COLOR.medium : TEXT },
      { label: "Riesgo heurístico", value: riskLabel(h?.overallRisk ?? "low"), color: SEV_COLOR[h?.overallRisk ?? "low"] ?? TEXT },
    ]);
    if (h && h.findings.length > 0) {
      eng.paragraph(
        `Desglose heurístico: ${h.countsByKind.confirmed_indicator} indicador(es) confirmado(s), ${h.countsByKind.suspicious_pattern} patrón(es) sospechoso(s), ${h.countsByKind.informational} informativo(s).`,
        MUTED, 9,
      );
    }
  }


  // 02 Resumen ejecutivo
  if (r) {
    eng.sectionTitle(sec(), "Resumen ejecutivo");
    const modulesWithDet = r.modules.filter((m) => m.detected > 0).length;
    eng.paragraph(
      `Origen analizado: "${a.fileName}". Plataforma ${platformShort(r.platform)} (${platformTag(r.platform)}). Se han revisado ${r.modules.length} módulos sobre ${r.totalEntries.toLocaleString("es-ES")} entradas extraídas del dispositivo. Resultado: ${r.totalDetections} indicio${r.totalDetections === 1 ? "" : "s"} en ${modulesWithDet} módulo${modulesWithDet === 1 ? "" : "s"} · riesgo ${riskLabel(r.risk).toLowerCase()}.`,
      SOFT,
    );
    eng.drawKpis([
      { label: "Indicios", value: String(r.totalDetections), color: r.totalDetections > 0 ? SEV_COLOR.high : TEXT },
      { label: "Módulos con indicios", value: String(modulesWithDet), color: modulesWithDet > 0 ? SEV_COLOR.medium : TEXT },
      { label: "Entradas analizadas", value: r.totalEntries.toLocaleString("es-ES") },
      { label: "Riesgo", value: riskLabel(r.risk), color: SEV_COLOR[r.risk] ?? TEXT },
    ]);
  }

  // 03 Ficha del dispositivo
  if (d) {
    eng.sectionTitle(sec(), "Ficha del dispositivo");
    eng.paragraph(
      "Información del terminal extraída automáticamente del análisis. Por privacidad, números de serie e identificadores se muestran parcialmente.",
      MUTED, 9,
    );
    const isIos = (d.manufacturer || d.brand || "").toLowerCase() === "apple";
    const rows: { label: string; value: string; hint?: string }[] = [
      { label: "Marca", value: d.manufacturer || d.brand || "—" },
      { label: "Modelo", value: d.model || "—" },
      { label: "Sistema operativo", value: d.osVersion ? `${isIos ? "iOS" : "Android"} ${d.osVersion}` : "—" },
      { label: "Parche de seguridad", value: d.securityPatch || "—", hint: d.securityPatch ? "Fecha del último parche instalado." : undefined },
      { label: "Versión del firmware", value: d.buildId || "—" },
      { label: "Nombre del dispositivo", value: d.deviceName || "—", hint: "El que aparece en Bluetooth y Wi-Fi." },
      { label: "Idioma / región", value: d.locale || d.regionInfo || "—" },
      { label: "Zona horaria", value: d.timezone || "—" },
      { label: "Operador (SIM)", value: cleanCarrier(d.carrier) },
      { label: "Estado del bootloader", value: bootloaderLabel(d.bootloaderState), hint: "Indica si el sistema operativo ha sido modificado." },
      { label: "Modo desarrollador", value: d.debuggable === true ? "activo" : d.debuggable === false ? "no activo" : "—" },
      { label: "Número de serie", value: d.serialLast4 ? `····${d.serialLast4}` : "—", hint: d.serialLast4 ? "Solo se muestran los últimos 4 dígitos." : undefined },
    ];
    eng.drawKvGrid(rows);
  }

  // 04 Cómo leer este informe
  eng.sectionTitle(sec(), "Cómo leer este informe");
  eng.paragraph(
    "MVT (Mobile Verification Toolkit) busca rastros conocidos de spyware y apps de vigilancia en una copia del dispositivo. Un indicio no equivale a una infección confirmada: puede tratarse de una app legítima instalada por el propio usuario. Revisa cada hallazgo y comprueba si reconoces la app o el comportamiento descrito.",
    SOFT, 10,
  );
  const sevExplain: { lvl: RiskLevel; text: string }[] = [
    { lvl: "critical", text: "coincide con spyware o stalkerware conocido. Requiere atención inmediata." },
    { lvl: "high", text: "comportamiento muy sospechoso. Revisar pronto." },
    { lvl: "medium", text: "comportamiento inusual; puede ser legítimo, pero conviene verificar." },
    { lvl: "low", text: "informativo. No suele indicar problema por sí solo." },
  ];
  for (const s of sevExplain) {
    eng.ensureSpace(22);
    const color = SEV_COLOR[s.lvl];
    eng.card(MARGIN.left, eng.y, 56, 16, color, 3);
    eng.text(TEXT);
    eng.font("bold", 8);
    eng.doc.text(severityLabel(s.lvl), MARGIN.left + 28, eng.y + 11, { align: "center" });
    eng.text(SOFT);
    eng.font("normal", 10);
    const ln = (eng.doc.splitTextToSize(s.text, CW - 70) as string[])[0];
    eng.doc.text(ln, MARGIN.left + 66, eng.y + 12);
    eng.y += 22;
  }
  eng.y += 6;

  // 05 Áreas del dispositivo analizadas
  if (r && r.modules.length > 0) {
    eng.sectionTitle(sec(), "Áreas del dispositivo analizadas");
    const areaRows = r.modules
      .filter((m) => m.entries > 0 || m.detected > 0)
      .sort((a, b) => b.entries - a.entries)
      .map((m) => ({
        name: m.label || m.key,
        code: m.key,
        entries: m.entries,
        detected: m.detected,
      }));
    eng.drawAreasTable(areaRows);
  }

  // 06 Indicios detectados
  eng.sectionTitle(sec(), "Indicios detectados");
  if (!r || r.detections.length === 0) {
    eng.noticeBox("MVT no encontró coincidencias con indicadores conocidos en los archivos subidos.", SUCCESS);
  } else {
    eng.drawDetectionsList(
      r.detections.map((x) => ({ module: x.module, summary: x.summary, level: x.level })),
    );
  }

  // 06b Hallazgos heurísticos
  if (r?.heuristics && r.heuristics.findings.length > 0) {
    eng.sectionTitle(sec(), "Análisis general de spyware y stalkerware");
    eng.paragraph(
      "Hallazgos heurísticos agrupados por categoría. No son IOCs forenses: indican patrones compatibles con vigilancia que conviene verificar.",
      SOFT, 9,
    );
    drawHeuristicFindings(eng, r.heuristics.findings);
  }


  // 07 Próximos pasos recomendados
  eng.sectionTitle(sec(), "Próximos pasos recomendados");
  const recs = buildRecommendations(r);
  eng.numberedList(recs);

  // 08 Cómo verificar este resultado
  eng.sectionTitle(sec(), "Cómo verificar este resultado");
  const verify: { term: string; def: string }[] = [
    {
      term: "Access Now Digital Security Helpline",
      def: "Ayuda gratuita 24/7 para activistas, periodistas y sociedad civil. Correo: help@accessnow.org · accessnow.org/help",
    },
    {
      term: "Amnesty International Security Lab",
      def: "Equipo que mantiene MVT y los indicadores de Pegasus/Predator. Contacto a través de securitylab.amnesty.org cuando hay sospecha de spyware mercenario.",
    },
    {
      term: "Citizen Lab (Universidad de Toronto)",
      def: "Centro de investigación sobre spyware mercenario. Acepta casos a través de citizenlab.ca cuando se sospecha de un ataque dirigido.",
    },
  ];
  eng.drawDefinitions(verify);

  // 09 Glosario
  eng.sectionTitle(sec(), "Glosario de términos");
  eng.paragraph("Pequeño diccionario para entender los términos técnicos que aparecen en este informe.", MUTED, 9);
  eng.drawDefinitions(GLOSSARY);

  // 10 Aviso legal y metodología
  eng.sectionTitle(sec(), "Aviso legal y metodología");
  eng.paragraph(
    "Este informe ha sido generado automáticamente a partir de los resultados de Mobile Verification Toolkit (MVT), un proyecto de Amnesty International Security Lab. MVT compara los artefactos extraídos del dispositivo con un conjunto público de indicadores de compromiso (IOCs) conocidos.",
    SOFT, 9,
  );
  eng.paragraph(
    "Un indicio detectado en este informe no constituye una certificación absoluta de infección: puede tratarse de software legítimo (control parental, gestión empresarial, apps de seguimiento autorizadas). La clasificación por categorías y la traducción a lenguaje claro son heurísticas que ofrece esta herramienta; la interpretación final corresponde a un analista cualificado.",
    SOFT, 9,
  );
  eng.text(TEXT);
  eng.font("bold", 10);
  eng.ensureSpace(20);
  eng.doc.text("Familias de spyware cubiertas por los IOCs públicos de MVT", MARGIN.left, eng.y);
  eng.y += 12;
  eng.drawChips([
    "Pegasus (NSO Group)",
    "Predator (Intellexa/Cytrox)",
    "Reign (QuaDream)",
    "Hermit (RCS Lab)",
    "Triangulation (iOS)",
    "Stalkerware comercial",
  ]);
  eng.paragraph(
    "La lista exacta evoluciona con cada actualización de los repositorios públicos de Amnesty International, Citizen Lab y Google TAG, por lo que la cobertura real depende de la versión de MVT y de los indicadores vigentes en el momento del análisis.",
    SOFT, 9,
  );
  eng.paragraph(
    "La ausencia de indicios no garantiza que el dispositivo esté limpio: MVT solo cubre amenazas con firma pública conocida. Spyware nuevo o muestras privadas pueden no detectarse.",
    SOFT, 9,
  );
  eng.paragraph(
    "Los archivos se procesan localmente en el navegador. No se transmite información del dispositivo analizado a terceros. El análisis se realiza con el consentimiento del propietario del dispositivo.",
    MUTED, 9,
  );

  // ----- Footer en todas las páginas (salta la portada) -----
  const total = eng.doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    eng.doc.setPage(p);
    eng.drawFooter(p, total);
  }

  eng.doc.save(`informe-forense-${reportId}.pdf`);
}

// ---------- Hallazgos heurísticos ----------
const KIND_COLOR: Record<string, RGB> = {
  confirmed_indicator: SEV_COLOR.high,
  suspicious_pattern: SEV_COLOR.medium,
  informational: MUTED,
};

function drawHeuristicFindings(eng: PdfEngine, findings: HeuristicFinding[]) {
  const cats: FindingCategory[] = ["dangerous_permission", "suspicious_app", "risky_config", "anomalous_behavior"];
  for (const cat of cats) {
    const items = findings.filter((f) => f.category === cat);
    if (items.length === 0) continue;
    eng.ensureSpace(22);
    eng.text(SOFT);
    eng.font("bold", 11);
    eng.doc.text(`${CATEGORY_LABEL_HEUR[cat]} (${items.length})`, MARGIN.left, eng.y + 4);
    eng.y += 16;

    for (const f of items) {
      const padX = 14;
      const innerW = CW - padX * 2;
      const reasonLines = eng.doc.splitTextToSize(f.reason, innerW) as string[];
      const recLines = eng.doc.splitTextToSize(`Recomendación: ${f.recommendation}`, innerW) as string[];
      const evLines = eng.doc.splitTextToSize(`Evidencia: ${f.evidence}`, innerW) as string[];
      const cardH = 28 + 14 + evLines.length * 11 + reasonLines.length * 12 + 6 + recLines.length * 11 + 14;
      eng.ensureSpace(cardH + 6);
      eng.card(MARGIN.left, eng.y, CW, cardH, SURFACE);
      // barra lateral por severidad
      eng.fill(SEV_COLOR[f.severity] ?? SEV_COLOR.high);
      eng.doc.rect(MARGIN.left, eng.y, 3, cardH, "F");
      // chips
      const sevColor = SEV_COLOR[f.severity] ?? SEV_COLOR.high;
      eng.fill(sevColor);
      eng.doc.roundedRect(MARGIN.left + padX, eng.y + 10, 44, 14, 3, 3, "F");
      eng.text(TEXT);
      eng.font("bold", 8);
      eng.doc.text(severityLabel(f.severity), MARGIN.left + padX + 22, eng.y + 19, { align: "center" });
      // chip kind
      const kColor = KIND_COLOR[f.kind] ?? MUTED;
      const kLabel = KIND_LABEL[f.kind];
      const kW = eng.doc.getTextWidth(kLabel) + 14;
      eng.fill(kColor);
      eng.doc.roundedRect(MARGIN.left + padX + 50, eng.y + 10, kW, 14, 3, 3, "F");
      eng.text(TEXT);
      eng.font("bold", 8);
      eng.doc.text(kLabel, MARGIN.left + padX + 50 + kW / 2, eng.y + 19, { align: "center" });
      // título
      eng.text(TEXT);
      eng.font("bold", 11);
      eng.doc.text(f.title, MARGIN.left + padX, eng.y + 38);
      // evidencia
      eng.text(MUTED);
      eng.font("normal", 8);
      let yy = eng.y + 52;
      evLines.forEach((ln) => { eng.doc.text(ln, MARGIN.left + padX, yy); yy += 11; });
      // razón
      eng.text(SOFT);
      eng.font("normal", 10);
      reasonLines.forEach((ln) => { eng.doc.text(ln, MARGIN.left + padX, yy + 2); yy += 12; });
      // recomendación
      eng.text(MUTED);
      eng.font("normal", 9);
      yy += 4;
      recLines.forEach((ln) => { eng.doc.text(ln, MARGIN.left + padX, yy); yy += 11; });

      eng.y += cardH + 6;
    }
  }
}



// ---------- Datos auxiliares ----------
function buildRecommendations(r?: MvtParsedResult): string[] {
  const base = [
    "Mantén el sistema operativo y las apps actualizadas.",
    "Revisa periódicamente qué apps tienen permisos sensibles (ubicación, SMS, accesibilidad).",
    "Repite el análisis cada cierto tiempo para detectar cambios.",
  ];
  if (!r) return base;
  if (r.totalDetections > 0) {
    return [
      "Desinstala o desactiva inmediatamente las apps marcadas como indicio si no reconoces haberlas instalado.",
      "Cambia las contraseñas de cuentas críticas (correo, banca, redes sociales) desde otro dispositivo de confianza.",
      "Considera restaurar el dispositivo a valores de fábrica si las detecciones son de severidad alta o crítica.",
      ...base,
    ];
  }
  return base;
}

const GLOSSARY: { term: string; def: string }[] = [
  { term: "MVT (Mobile Verification Toolkit)", def: "Herramienta libre de Amnesty International para buscar rastros conocidos de spyware en copias de seguridad de móviles." },
  { term: "AndroidQF", def: "Utilidad oficial que extrae del móvil Android los datos necesarios (paquetes, permisos, propiedades) que después analiza MVT." },
  { term: "IOC (Indicador de Compromiso)", def: "Pista pública que identifica un malware concreto: un nombre de paquete, un dominio, un hash de certificado, etc." },
  { term: "Módulo", def: "Cada una de las áreas del dispositivo que MVT analiza por separado (permisos, paquetes instalados, accesibilidad, etc.)." },
  { term: "Paquete (package)", def: "Identificador único de una app en Android, por ejemplo 'com.whatsapp'. En iOS se llama 'bundle ID'." },
  { term: "Permiso sensible", def: "Permiso que da a una app acceso a datos delicados (ubicación, micrófono, SMS, contactos, accesibilidad)." },
  { term: "Servicio de accesibilidad", def: "Permiso muy potente pensado para personas con discapacidad: permite a una app leer la pantalla y simular toques. Es muy usado por stalkerware." },
  { term: "Bootloader", def: "Programa que arranca el sistema operativo del móvil. Si está desbloqueado, el sistema podría haber sido modificado." },
  { term: "Root", def: "Acceso de administrador total al sistema Android. Si está activo, las apps pueden saltarse muchas protecciones." },
  { term: "SELinux", def: "Mecanismo de seguridad de Android que aísla las apps entre sí. Debe estar en modo 'enforcing' (estricto) para proteger correctamente el dispositivo." },
  { term: "Perfil de configuración (MDM)", def: "En iOS, archivo que aplica ajustes al dispositivo (VPN, certificados, restricciones). Si lo instala alguien que no eres tú, puede interceptar tu tráfico." },
  { term: "Exfiltración de datos", def: "Envío silencioso de información del dispositivo (mensajes, contactos, ubicación) hacia un servidor externo controlado por un atacante." },
  { term: "Parche de seguridad", def: "Actualización del fabricante que corrige fallos de seguridad. Si lleva muchos meses sin instalarse, el dispositivo es más vulnerable." },
  { term: "Stalkerware", def: "Apps comerciales legales de vigilancia (control parental, seguimiento de pareja). No son malware en sentido estricto, pero permiten espiar." },
  { term: "Spyware mercenario", def: "Malware avanzado de uso dirigido vendido a gobiernos (Pegasus, Predator, FinFisher). Trátalo siempre como emergencia." },
];
