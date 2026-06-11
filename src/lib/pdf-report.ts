import jsPDF from "jspdf";
import { Analysis, riskLabel, platformLabel } from "./mock-store";
import type { MvtDeviceInfo, RiskLevel } from "./mvt-parser";

function formatDeviceForPdf(d?: MvtDeviceInfo): string {
  if (!d) return "";
  const maker = d.manufacturer || d.brand;
  const left = [maker, d.model].filter(Boolean).join(" ").trim();
  const os = d.osVersion ? `${maker?.toLowerCase() === "apple" ? "iOS" : "Android"} ${d.osVersion}` : "";
  return [left, os].filter(Boolean).join(" · ");
}
import {
  humanizeModule,
  humanizeDetection,
  severityLabel,
  explainSeverity,
  nextSteps,
  classifyDetection,
  buildVerdict,
  CATEGORY_LABEL,
  CATEGORY_DESC,
  CROSS_CHECK_STEPS,
  detectionKey,
  buildModuleHighlights,
  buildDeviceCard,
  buildTopApps,
  buildHumanTimeline,
  GLOSSARY,
  type Category,
} from "./mvt-translate";

// ---------- Paleta ----------
const NAVY: [number, number, number] = [15, 23, 42];
const NAVY_SOFT: [number, number, number] = [30, 41, 59];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [226, 232, 240];
const SOFT_BG: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];
const ACCENT: [number, number, number] = [37, 99, 235];

const SEV_COLOR: Record<string, [number, number, number]> = {
  critical: [185, 28, 28],
  high: [194, 87, 24],
  medium: [161, 122, 0],
  low: [71, 85, 105],
};
const SEV_BG: Record<string, [number, number, number]> = {
  critical: [254, 226, 226],
  high: [255, 237, 213],
  medium: [254, 243, 199],
  low: [241, 245, 249],
};

const M = { left: 48, right: 48, top: 56, bottom: 64 };

export function generatePdfReport(a: Analysis) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const CW = W - M.left - M.right;

  const ctx = {
    doc, W, H, CW,
    y: M.top,
    page: 1,
    reportId: a.id.slice(0, 8).toUpperCase(),
    fileName: a.fileName,
  };

  // ---------- helpers ----------
  const setFill = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const setStroke = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const setText = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  function drawHeader() {
    setFill(NAVY);
    doc.rect(0, 0, W, 36, "F");
    setText(WHITE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("SPYWARE FORENSIC ANALYZER", M.left, 22);
    doc.setFont("helvetica", "normal");
    setText([203, 213, 225]);
    doc.text(`Informe ${ctx.reportId}`, W - M.right, 22, { align: "right" });
  }

  function drawFooter(pageNum: number) {
    setStroke(LINE);
    doc.setLineWidth(0.5);
    doc.line(M.left, H - 38, W - M.right, H - 38);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    setText(MUTED);
    doc.text("Documento confidencial · uso forense", M.left, H - 22);
    doc.text(`Página ${pageNum}`, W - M.right, H - 22, { align: "right" });
  }

  function newPage() {
    drawFooter(ctx.page);
    doc.addPage();
    ctx.page += 1;
    drawHeader();
    ctx.y = M.top + 8;
  }

  function ensure(need: number) {
    if (ctx.y + need > H - M.bottom) newPage();
  }

  function sectionTitle(num: string, title: string) {
    ensure(48);
    setText(MUTED);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(num, M.left, ctx.y);
    setText(INK);
    doc.setFontSize(15);
    doc.text(title, M.left + 24, ctx.y);
    ctx.y += 8;
    setStroke(LINE); doc.setLineWidth(0.8);
    doc.line(M.left, ctx.y, W - M.right, ctx.y);
    ctx.y += 16;
  }

  function paragraph(text: string, opts: { size?: number; color?: [number, number, number]; italic?: boolean } = {}) {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.italic ? "italic" : "normal");
    doc.setFontSize(size);
    setText(opts.color ?? INK);
    const lines = doc.splitTextToSize(text, CW);
    const lh = size * 1.35;
    ensure(lines.length * lh);
    doc.text(lines, M.left, ctx.y);
    ctx.y += lines.length * lh;
  }

  function severityChip(level: RiskLevel | string, x: number, y: number): number {
    const lvl = (level as string) ?? "low";
    const label = severityLabel(lvl as RiskLevel);
    const [r, g, b] = SEV_COLOR[lvl] ?? MUTED;
    const [br, bg, bb] = SEV_BG[lvl] ?? LINE;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    const w = doc.getTextWidth(label) + 14;
    setFill([br, bg, bb]);
    doc.roundedRect(x, y - 9, w, 13, 3, 3, "F");
    setText([r, g, b]);
    doc.text(label, x + 7, y);
    return w;
  }

  // ============================================================
  // PORTADA
  // ============================================================
  setFill(NAVY);
  doc.rect(0, 0, W, H, "F");

  // Brand mark
  setFill(ACCENT);
  doc.rect(M.left, 90, 36, 4, "F");
  setText(WHITE);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("SPYWARE FORENSIC ANALYZER", M.left, 118);

  // Título principal
  doc.setFont("helvetica", "bold"); doc.setFontSize(34);
  doc.text("Informe forense", M.left, 240);
  doc.text("de dispositivo móvil", M.left, 278);

  setText([148, 163, 184]);
  doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  doc.text("Análisis basado en resultados de Mobile Verification Toolkit (MVT)", M.left, 304);

  // Tarjeta de metadatos en portada
  const r = a.result;
  const cardY = 360;
  const cardH = 200;
  setFill([22, 32, 52]);
  doc.roundedRect(M.left, cardY, CW, cardH, 6, 6, "F");

  const deviceStr = formatDeviceForPdf(r?.deviceInfo);
  const metaCover: [string, string][] = [
    ["Archivo analizado", a.fileName],
    ["Identificador del informe", ctx.reportId],
    ["Fecha del análisis", new Date(a.uploadedAt).toLocaleString()],
    ["Plataforma detectada", r ? platformLabel(r.platform) : "—"],
    ...(deviceStr ? [["Dispositivo", deviceStr] as [string, string]] : []),
    ["Tamaño del origen", `${(a.fileSize / 1024).toFixed(1)} KB`],
    ["Estado", a.status],
  ];
  let cy = cardY + 28;
  metaCover.forEach(([k, v]) => {
    setText([148, 163, 184]);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text(k.toUpperCase(), M.left + 20, cy);
    setText(WHITE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    const val = doc.splitTextToSize(String(v), CW - 40)[0];
    doc.text(val, M.left + 20, cy + 14);
    cy += 28;
  });

  // Banda de riesgo en portada
  if (r) {
    const sevKey = r.risk;
    const [sr, sg, sb] = SEV_COLOR[sevKey] ?? MUTED;
    const bandY = cardY + cardH + 28;
    setFill([sr, sg, sb]);
    doc.roundedRect(M.left, bandY, CW, 70, 6, 6, "F");
    setText(WHITE);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("NIVEL DE RIESGO ESTIMADO", M.left + 20, bandY + 22);
    doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.text(riskLabel(r.risk).toUpperCase(), M.left + 20, bandY + 50);
    // Stats a la derecha
    doc.setFont("helvetica", "bold"); doc.setFontSize(22);
    doc.text(String(r.totalDetections), W - M.right - 20, bandY + 32, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text("indicios detectados", W - M.right - 20, bandY + 48, { align: "right" });
  }

  // Pie de portada
  setText([148, 163, 184]);
  doc.setFont("helvetica", "italic"); doc.setFontSize(8);
  doc.text("Documento confidencial · generado localmente · no constituye certificación de infección", M.left, H - 40);

  // ============================================================
  // CONTENIDO
  // ============================================================
  newPage();

  // 01 · Resumen ejecutivo
  sectionTitle("01", "Resumen ejecutivo");

  // Bloque de VEREDICTO en una frase
  // 01 · Veredicto
  sectionTitle("01", "Veredicto");
  if (r) {
    const v = buildVerdict(r);
    const verdictColor: [number, number, number] =
      v.level === "mercenary" ? SEV_COLOR.critical
      : v.level === "stalkerware" ? SEV_COLOR.high
      : v.level === "suspicious" ? SEV_COLOR.medium
      : [22, 163, 74];
    ensure(110);
    setFill(verdictColor);
    doc.roundedRect(M.left, ctx.y, CW, 8, 2, 2, "F");
    ctx.y += 14;
    setFill(SOFT_BG);
    doc.roundedRect(M.left, ctx.y, CW, 86, 4, 4, "F");
    setStroke(LINE); doc.setLineWidth(0.5);
    doc.roundedRect(M.left, ctx.y, CW, 86, 4, 4, "S");
    setText(MUTED);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text("VEREDICTO", M.left + 16, ctx.y + 18);
    setText(verdictColor);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    const hLines = doc.splitTextToSize(v.headline, CW - 32);
    doc.text(hLines, M.left + 16, ctx.y + 36);
    setText(INK);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    const dLines = doc.splitTextToSize(v.detail, CW - 32);
    doc.text(dLines, M.left + 16, ctx.y + 36 + hLines.length * 15);
    ctx.y += 86 + 14;
  }

  // 02 · Resumen ejecutivo
  sectionTitle("02", "Resumen ejecutivo");
  const baseSummary = r
    ? `Se ha analizado el archivo "${a.fileName}". La plataforma detectada es ${platformLabel(r.platform)}. Se procesaron ${r.modules.length} módulos MVT con un total de ${r.totalEntries.toLocaleString()} entradas y se identificaron ${r.totalDetections} indicios técnicos. El nivel de riesgo estimado es ${riskLabel(r.risk)}.`
    : `Análisis de "${a.fileName}". Estado actual: ${a.status}.`;
  paragraph(baseSummary);
  ctx.y += 8;

  // Panel KPIs
  if (r) {
    const kpis: [string, string, [number, number, number]][] = [
      ["Indicios", String(r.totalDetections), SEV_COLOR[r.risk] ?? INK],
      ["Módulos con indicios", String(r.modules.filter((m) => m.detected > 0).length), ACCENT],
      ["Entradas analizadas", r.totalEntries.toLocaleString(), NAVY_SOFT],
      ["Riesgo", riskLabel(r.risk), SEV_COLOR[r.risk] ?? INK],
    ];
    const gap = 10;
    const kw = (CW - gap * 3) / 4;
    ensure(70);
    kpis.forEach(([label, value, color], i) => {
      const x = M.left + i * (kw + gap);
      setFill(SOFT_BG);
      doc.roundedRect(x, ctx.y, kw, 60, 4, 4, "F");
      setStroke(LINE); doc.setLineWidth(0.5);
      doc.roundedRect(x, ctx.y, kw, 60, 4, 4, "S");
      setText(MUTED);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.text(label.toUpperCase(), x + 10, ctx.y + 16);
      setText(color);
      doc.setFont("helvetica", "bold"); doc.setFontSize(18);
      doc.text(value, x + 10, ctx.y + 42);
    });
    ctx.y += 72;
  }

  // 03 · Ficha del dispositivo
  const deviceCard = r ? buildDeviceCard(r.deviceInfo) : [];
  if (deviceCard.length > 0) {
    sectionTitle("03", "Ficha del dispositivo");
    paragraph("Información del terminal extraída del análisis. Los identificadores sensibles (serie, IMEI) se muestran parcialmente.", { size: 9, color: MUTED });
    ctx.y += 4;
    const rowH2 = 22;
    deviceCard.forEach((f, i) => {
      const hintH = f.hint ? 10 : 0;
      const totalH = rowH2 + hintH;
      ensure(totalH);
      if (i % 2 === 0) {
        setFill(SOFT_BG);
        doc.rect(M.left, ctx.y - 12, CW, totalH, "F");
      }
      setText(MUTED);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(f.label, M.left + 10, ctx.y);
      setText(INK);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      const val = doc.splitTextToSize(String(f.value), CW - 200)[0];
      doc.text(val, M.left + 200, ctx.y);
      if (f.hint) {
        setText(MUTED);
        doc.setFont("helvetica", "italic"); doc.setFontSize(8);
        doc.text(f.hint, M.left + 200, ctx.y + 10);
      }
      ctx.y += totalH;
    });
    ctx.y += 8;
  }

  // 04 · Cómo leer este informe
  sectionTitle("04", "Cómo leer este informe");
  paragraph("MVT (Mobile Verification Toolkit) busca rastros conocidos de spyware y apps de vigilancia en una copia del dispositivo. Un indicio no equivale a una infección confirmada: puede tratarse de una app legítima instalada por el propio usuario. Revisa cada hallazgo y comprueba si reconoces la app o el comportamiento descrito.");
  ctx.y += 4;
  paragraph("Las severidades empleadas en este informe:", { color: NAVY_SOFT });
  ctx.y += 2;
  (["critical", "high", "medium", "low"] as const).forEach((lvl) => {
    ensure(20);
    severityChip(lvl, M.left, ctx.y + 6);
    setText(INK);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const text = explainSeverity(lvl).replace(/^[^—]+—\s*/, "");
    const lines = doc.splitTextToSize(text, CW - 70);
    doc.text(lines, M.left + 64, ctx.y + 6);
    ctx.y += Math.max(18, lines.length * 13);
  });
  ctx.y += 6;

  // 05 · Áreas analizadas (módulos)
  const rowH = 18;
  if (r && r.modules.length) {
    sectionTitle("05", "Áreas del dispositivo analizadas");
    const visible = r.modules.filter((m) => m.entries > 0 || m.detected > 0);
    // Cabecera
    ensure(22);
    setFill(NAVY); doc.rect(M.left, ctx.y - 12, CW, 20, "F");
    setText(WHITE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text("ÁREA", M.left + 10, ctx.y);
    doc.text("ENTRADAS", M.left + CW - 180, ctx.y, { align: "right" });
    doc.text("INDICIOS", M.left + CW - 90, ctx.y, { align: "right" });
    doc.text("ESTADO", M.left + CW - 10, ctx.y, { align: "right" });
    ctx.y += 14;

    visible.forEach((m, i) => {
      ensure(rowH);
      if (i % 2 === 0) { setFill(SOFT_BG); doc.rect(M.left, ctx.y - 12, CW, rowH, "F"); }
      setText(INK);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      const human = humanizeModule(m.key, m.label);
      doc.text(doc.splitTextToSize(human, CW - 320)[0], M.left + 10, ctx.y);
      setText(MUTED);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.text(`(${m.key})`, M.left + 10, ctx.y + 10);
      setText(INK);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.text(String(m.entries), M.left + CW - 180, ctx.y, { align: "right" });
      if (m.detected > 0) setText(SEV_COLOR.critical); else setText(MUTED);
      doc.setFont("helvetica", "bold");
      doc.text(String(m.detected), M.left + CW - 90, ctx.y, { align: "right" });
      if (m.detected > 0) {
        severityChip("high", M.left + CW - 50, ctx.y);
      } else {
        setText(MUTED);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9);
        doc.text("limpio", M.left + CW - 10, ctx.y, { align: "right" });
      }
      ctx.y += rowH + 4;

      // Detalle: qué entidades concretas hay detrás del agregado
      if (m.detected > 0) {
        const highlights = buildModuleHighlights(r.detections, m.key, 8);
        if (highlights.length) {
          highlights.forEach((h) => {
            const line = `• ${h.count}× ${h.label}${h.detail ? ` — ${h.detail}` : ""}`;
            doc.setFont("helvetica", "normal"); doc.setFontSize(8);
            setText(NAVY_SOFT);
            const lines = doc.splitTextToSize(line, CW - 24);
            ensure(lines.length * 10 + 2);
            doc.text(lines, M.left + 18, ctx.y);
            ctx.y += lines.length * 10 + 1;
          });
          ctx.y += 4;
        }
      }
    });
    ctx.y += 8;
  }

  // 05 · Indicios detectados — agrupados por CATEGORÍA y luego por ENTIDAD
  if (r && r.detections.length) {
    // Pre-clasificar
    const byCat: Record<Category, typeof r.detections> = {
      mercenary: [], stalkerware: [], suspicious: [],
    };
    for (const d of r.detections) byCat[classifyDetection(d)].push(d);

    // Agrupar dentro de cada categoría por detectionKey
    type Group = {
      key: string;
      label: string;
      level: string;
      count: number;
      modules: Map<string, number>;
      sampleSummary: string;
      firstSeen?: string;
      lastSeen?: string;
    };
    const sevRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const groupsByCat: Record<Category, Group[]> = { mercenary: [], stalkerware: [], suspicious: [] };
    let uniqueTotal = 0;

    (["mercenary", "stalkerware", "suspicious"] as Category[]).forEach((cat) => {
      const map = new Map<string, Group>();
      for (const d of byCat[cat]) {
        const { key, label } = detectionKey(d);
        const lvl = d.level ?? "high";
        let g = map.get(key);
        if (!g) {
          g = { key, label, level: lvl, count: 0, modules: new Map(), sampleSummary: d.summary };
          map.set(key, g);
        }
        g.count += 1;
        g.modules.set(d.module, (g.modules.get(d.module) ?? 0) + 1);
        // severidad máxima
        if ((sevRank[lvl] ?? 9) < (sevRank[g.level] ?? 9)) g.level = lvl;
        // evidencia más informativa (la más larga)
        if (d.summary && d.summary.length > g.sampleSummary.length) g.sampleSummary = d.summary;
        // rango temporal
        if (d.timestamp) {
          if (!g.firstSeen || d.timestamp < g.firstSeen) g.firstSeen = d.timestamp;
          if (!g.lastSeen || d.timestamp > g.lastSeen) g.lastSeen = d.timestamp;
        }
      }
      const arr = [...map.values()].sort((a, b) => {
        const ra = sevRank[a.level] ?? 9, rb = sevRank[b.level] ?? 9;
        if (ra !== rb) return ra - rb;
        return b.count - a.count;
      });
      groupsByCat[cat] = arr;
      uniqueTotal += arr.length;
    });

    sectionTitle("06", `Indicios detectados · ${uniqueTotal} entidad${uniqueTotal === 1 ? "" : "es"} (${r.detections.length} ocurrencias)`);

    // Distribución
    const distLine = (["mercenary", "stalkerware", "suspicious"] as Category[])
      .filter((c) => groupsByCat[c].length)
      .map((c) => `${groupsByCat[c].length} ${CATEGORY_LABEL[c].toLowerCase()} (${byCat[c].length} ocurr.)`)
      .join(" · ");
    if (distLine) {
      paragraph(`Distribución: ${distLine}.`, { size: 9, color: MUTED, italic: true });
      ctx.y += 6;
    }

    const CAT_COLOR: Record<Category, [number, number, number]> = {
      mercenary: SEV_COLOR.critical,
      stalkerware: SEV_COLOR.high,
      suspicious: SEV_COLOR.medium,
    };
    const MAX_PER_CAT = 60;

    (["mercenary", "stalkerware", "suspicious"] as Category[]).forEach((cat) => {
      const groups = groupsByCat[cat];
      if (!groups.length) return;

      // Cabecera de categoría
      ensure(60);
      ctx.y += 6;
      const [cr, cg, cb] = CAT_COLOR[cat];
      setFill([cr, cg, cb]);
      doc.roundedRect(M.left, ctx.y, CW, 4, 1, 1, "F");
      ctx.y += 12;
      setText([cr, cg, cb]);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      const occ = groups.reduce((s, g) => s + g.count, 0);
      doc.text(`${CATEGORY_LABEL[cat]}  ·  ${groups.length} entidad${groups.length === 1 ? "" : "es"}  ·  ${occ} ocurr.`, M.left, ctx.y);
      ctx.y += 14;
      setText(MUTED);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const descLines = doc.splitTextToSize(CATEGORY_DESC[cat], CW);
      doc.text(descLines, M.left, ctx.y);
      ctx.y += descLines.length * 12 + 6;

      groups.slice(0, MAX_PER_CAT).forEach((g, idx) => {
        const human = humanizeDetection(g.sampleSummary);
        const modList = [...g.modules.entries()].sort((a, b) => b[1] - a[1]);
        const modShown = modList.slice(0, 4).map(([m, n]) => `${humanizeModule(m)} (${n})`).join(", ");
        const modExtra = modList.length > 4 ? ` (+${modList.length - 4} más)` : "";
        const modulesLine = `Detectado en: ${modShown}${modExtra}`;

        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        const humanLines = doc.splitTextToSize(human, CW - 24);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        const modulesLines = doc.splitTextToSize(modulesLine, CW - 24);
        doc.setFont("helvetica", "italic"); doc.setFontSize(8);
        const techLines = doc.splitTextToSize(`Evidencia representativa: ${g.sampleSummary}`, CW - 24);
        const hasRange = g.firstSeen && g.lastSeen && g.firstSeen !== g.lastSeen;
        const rangeLines = hasRange
          ? [`Visto entre ${g.firstSeen} y ${g.lastSeen}`]
          : g.firstSeen ? [`Visto el ${g.firstSeen}`] : [];

        const cardH2 = 22 + humanLines.length * 12 + modulesLines.length * 10 + techLines.length * 10 + rangeLines.length * 10 + 16;
        ensure(cardH2 + 6);

        setFill(SOFT_BG);
        doc.roundedRect(M.left, ctx.y - 4, CW, cardH2, 4, 4, "F");
        const [sr, sg, sb] = SEV_COLOR[g.level] ?? MUTED;
        setFill([sr, sg, sb]);
        doc.rect(M.left, ctx.y - 4, 3, cardH2, "F");

        let yy = ctx.y + 12;
        const chipW = severityChip(g.level, M.left + 12, yy);
        setText(INK);
        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        const head = `${idx + 1}. ${g.label}${g.count > 1 ? `  ·  ${g.count}×` : ""}`;
        doc.text(head, M.left + 12 + chipW + 6, yy);
        yy += 14;

        setText(MUTED);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text(modulesLines, M.left + 12, yy);
        yy += modulesLines.length * 10 + 2;

        setText(INK);
        doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text(humanLines, M.left + 12, yy);
        yy += humanLines.length * 12 + 2;

        if (rangeLines.length) {
          setText(MUTED);
          doc.setFont("helvetica", "normal"); doc.setFontSize(8);
          doc.text(rangeLines, M.left + 12, yy);
          yy += rangeLines.length * 10;
        }

        setText(MUTED);
        doc.setFont("helvetica", "italic"); doc.setFontSize(8);
        doc.text(techLines, M.left + 12, yy);

        ctx.y += cardH2 + 6;
      });

      if (groups.length > MAX_PER_CAT) {
        ensure(20);
        paragraph(`… y ${groups.length - MAX_PER_CAT} entidades más en esta categoría.`, { italic: true, color: MUTED, size: 9 });
      }
    });
  }


  // 07 · Apps con más actividad sospechosa
  const topApps = r ? buildTopApps(r.detections, 10) : [];
  if (topApps.length > 0) {
    sectionTitle("07", "Apps con más actividad sospechosa");
    paragraph("Apps que más veces aparecen en los indicios técnicos. Revisa con calma las marcadas como 'Origen no reconocido'.", { size: 9, color: MUTED });
    ctx.y += 4;
    topApps.forEach((app, i) => {
      const originText =
        app.origin === "system" ? "App del sistema o del fabricante"
        : app.origin === "known" ? "App popular conocida"
        : "Origen no reconocido — revísala";
      const catLine = app.categories.length ? `Visto en: ${app.categories.join(", ")}` : "";
      const cardH3 = 16 + 14 + 12 + (catLine ? 12 : 0) + 14;
      ensure(cardH3 + 4);
      setFill(SOFT_BG);
      doc.roundedRect(M.left, ctx.y, CW, cardH3, 4, 4, "F");
      const [sr, sg, sb] = SEV_COLOR[app.severity] ?? MUTED;
      setFill([sr, sg, sb]);
      doc.rect(M.left, ctx.y, 3, cardH3, "F");
      let yy = ctx.y + 16;
      const chipW = severityChip(app.severity, M.left + 12, yy);
      setText(INK);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(`${i + 1}. ${app.displayName}  ·  ${app.count} indicio(s)`, M.left + 12 + chipW + 6, yy);
      yy += 12;
      setText(MUTED);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.text(app.packageName, M.left + 12, yy);
      yy += 11;
      doc.setFont("helvetica", "italic"); doc.setFontSize(8);
      doc.text(originText, M.left + 12, yy);
      if (catLine) {
        yy += 11;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text(doc.splitTextToSize(catLine, CW - 24)[0], M.left + 12, yy);
      }
      ctx.y += cardH3 + 6;
    });
    ctx.y += 4;
  }

  // 08 · Cronología de eventos clave
  const humanEvents = r ? buildHumanTimeline(r.timeline, r.detections, 20) : [];
  if (humanEvents.length > 0) {
    sectionTitle("08", "Cronología de eventos clave");
    paragraph("Reconstrucción en lenguaje natural de los eventos más relevantes, ordenados por fecha.", { size: 9, color: MUTED });
    ctx.y += 6;
    humanEvents.forEach((e) => {
      const whenLines = doc.splitTextToSize(e.when, CW - 24);
      const sentLines = doc.splitTextToSize(e.sentence, CW - 24);
      const boxH = 6 + whenLines.length * 10 + sentLines.length * 12 + 8;
      ensure(boxH + 4);
      const [sr, sg, sb] = SEV_COLOR[e.severity] ?? MUTED;
      setFill([sr, sg, sb]);
      doc.rect(M.left, ctx.y, 3, boxH, "F");
      let yy = ctx.y + 12;
      setText(MUTED);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.text(whenLines, M.left + 12, yy);
      yy += whenLines.length * 10 + 2;
      setText(INK);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.text(sentLines, M.left + 12, yy);
      ctx.y += boxH + 4;
    });
    ctx.y += 4;
  }

  // 09 · Próximos pasos
  sectionTitle("09", "Próximos pasos recomendados");
  const recs = r ? nextSteps(r) : [
    "Aislar el dispositivo de redes sensibles hasta completar la verificación.",
    "Actualizar el sistema operativo y revocar credenciales potencialmente expuestas.",
  ];
  recs.forEach((rec, i) => {
    ensure(28);
    setFill(ACCENT);
    doc.circle(M.left + 8, ctx.y - 3, 8, "F");
    setText(WHITE);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(String(i + 1), M.left + 8, ctx.y, { align: "center" });
    setText(INK);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const lines = doc.splitTextToSize(rec, CW - 32);
    doc.text(lines, M.left + 24, ctx.y);
    ctx.y += Math.max(20, lines.length * 13 + 4);
  });

  // 10 · Verificación cruzada
  sectionTitle("10", "Cómo verificar este resultado");
  ctx.y += 6;
  CROSS_CHECK_STEPS.forEach((step) => {
    const titleLines = doc.splitTextToSize(step.title, CW - 24);
    const detailLines = doc.splitTextToSize(step.detail, CW - 24);
    const boxH = 14 + titleLines.length * 13 + detailLines.length * 12 + 12;
    ensure(boxH + 6);
    setFill(SOFT_BG);
    doc.roundedRect(M.left, ctx.y, CW, boxH, 4, 4, "F");
    setFill(ACCENT);
    doc.rect(M.left, ctx.y, 3, boxH, "F");
    let yy = ctx.y + 18;
    setText(NAVY);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(titleLines, M.left + 14, yy);
    yy += titleLines.length * 13 + 2;
    setText(INK);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(detailLines, M.left + 14, yy);
    ctx.y += boxH + 6;
  });

  // 11 · Glosario de términos
  sectionTitle("11", "Glosario de términos");
  paragraph("Pequeño diccionario para entender los términos técnicos que aparecen en este informe.", { size: 9, color: MUTED });
  ctx.y += 4;
  GLOSSARY.forEach((g, i) => {
    const termLines = doc.splitTextToSize(g.term, CW - 20);
    const defLines = doc.splitTextToSize(g.definition, CW - 20);
    const boxH = 6 + termLines.length * 12 + defLines.length * 11 + 8;
    ensure(boxH);
    if (i % 2 === 0) {
      setFill(SOFT_BG);
      doc.rect(M.left, ctx.y - 4, CW, boxH, "F");
    }
    let yy = ctx.y + 8;
    setText(NAVY);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10);
    doc.text(termLines, M.left + 10, yy);
    yy += termLines.length * 12;
    setText(INK);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(defLines, M.left + 10, yy);
    ctx.y += boxH;
  });
  ctx.y += 8;

  // 12 · Aviso legal
  sectionTitle("12", "Aviso legal y metodología");
  paragraph("Este informe ha sido generado automáticamente a partir de los resultados de Mobile Verification Toolkit (MVT), un proyecto de Amnesty International Security Lab. MVT compara los artefactos extraídos del dispositivo con un conjunto público de indicadores de compromiso (IOCs) conocidos.", { size: 9 });
  ctx.y += 2;
  paragraph("Un indicio detectado en este informe no constituye una certificación absoluta de infección: puede tratarse de software legítimo (control parental, gestión empresarial, apps de seguimiento autorizadas). La clasificación por categorías y la traducción a lenguaje claro son heurísticas que ofrece esta herramienta; la interpretación final corresponde a un analista cualificado.", { size: 9 });
  ctx.y += 2;
  paragraph("Familias de spyware cubiertas por los IOCs públicos de MVT: Pegasus (NSO Group), Predator (Intellexa/Cytrox), Reign (QuaDream), Hermit (RCS Lab), la operación Triangulation contra iOS y diversas familias de stalkerware comercial identificadas por nombre de paquete. La lista exacta evoluciona con cada actualización de los repositorios públicos de Amnesty International, Citizen Lab y Google TAG, por lo que la cobertura real depende de la versión de MVT y de los indicadores vigentes en el momento del análisis.", { size: 9 });
  ctx.y += 2;
  paragraph("La ausencia de indicios no garantiza que el dispositivo esté limpio: MVT solo cubre amenazas con firma pública conocida. Spyware nuevo o muestras privadas pueden no detectarse.", { size: 9 });
  ctx.y += 2;
  paragraph("Los archivos se procesan localmente en el navegador. No se transmite información del dispositivo analizado a terceros. El análisis se realiza con el consentimiento del propietario del dispositivo.", { size: 9, italic: true, color: MUTED });

  // ---------- Footer última página ----------
  drawFooter(ctx.page);

  doc.save(`informe-${ctx.reportId}.pdf`);
}
