import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ShieldCheck, ShieldAlert } from "lucide-react";
import {
  adminGetLegalAcceptance,
  adminListLegalAcceptances,
  type LegalAcceptanceDetail,
} from "@/lib/legal.functions";

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function downloadAcceptancePdf(detail: LegalAcceptanceDetail, userCode: string) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = { left: 48, right: 48, top: 56, bottom: 56 };
  const CW = W - M.left - M.right;
  let y = M.top;

  const ensure = (need: number) => {
    if (y + need > H - M.bottom) {
      doc.addPage();
      y = M.top;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Comprobante de aceptación de términos legales", M.left, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `Documento con valor jurídico — eIDAS (UE 910/2014), Ley 6/2020, art. 326.3 LEC`,
    M.left,
    y,
  );
  y += 24;
  doc.setTextColor(0);

  const meta: [string, string][] = [
    ["Usuario", userCode || detail.user_id],
    ["ID comprobante", detail.id],
    ["Versión documento", detail.document_version],
    ["Idioma", detail.locale],
    ["Fecha (UTC)", new Date(detail.accepted_at).toISOString()],
    ["IP", detail.ip_address || "—"],
    ["User-Agent", detail.user_agent || "—"],
    ["Método", detail.acceptance_method || "—"],
    ["Hash SHA-256 (texto)", detail.document_hash],
    ["Firma HMAC-SHA256", detail.signature],
    ["Verificación firma", detail.verified ? "VÁLIDA" : "INVÁLIDA"],
  ];

  doc.setFontSize(10);
  meta.forEach(([k, v]) => {
    ensure(28);
    doc.setFont("helvetica", "bold");
    doc.text(k, M.left, y);
    doc.setFont("courier", "normal");
    const lines = doc.splitTextToSize(v, CW - 150) as string[];
    lines.forEach((ln, i) => {
      doc.text(ln, M.left + 150, y + i * 12);
    });
    y += Math.max(16, lines.length * 12 + 4);
  });

  y += 12;
  ensure(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Texto íntegro aceptado", M.left, y);
  y += 14;
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  const bodyLines = doc.splitTextToSize(detail.document_text, CW) as string[];
  bodyLines.forEach((ln) => {
    ensure(11);
    doc.text(ln, M.left, y);
    y += 10;
  });

  const filename = `comprobante-legal-${userCode || detail.user_id.slice(0, 8)}-${detail.document_version}.pdf`;
  doc.save(filename);
}

export function LegalAcceptanceViewer({
  open,
  onOpenChange,
  userId,
  userCode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userCode: string;
}) {
  const { t } = useTranslation();
  const listFn = useServerFn(adminListLegalAcceptances);
  const detailFn = useServerFn(adminGetLegalAcceptance);
  const [rows, setRows] = useState<any[] | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detail, setDetail] = useState<LegalAcceptanceDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRows(null);
    setDetail(null);
    setErr(null);
    listFn({ data: { userId } })
      .then((r) => setRows(r as any[]))
      .catch((e) => setErr(e?.message ?? String(e)));
  }, [open, userId, listFn]);

  const openDetail = async (id: string) => {
    setLoadingDetail(true);
    setErr(null);
    try {
      const d = await detailFn({ data: { id } });
      setDetail(d);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("admin.legal.viewerTitle", { code: userCode })}</DialogTitle>
          <DialogDescription>{t("admin.legal.viewerSubtitle")}</DialogDescription>
        </DialogHeader>

        {err && <p className="text-sm text-destructive">{err}</p>}

        {rows === null ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground text-center">
            {t("admin.legal.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">{t("admin.legal.colDate")}</th>
                  <th className="text-left px-3 py-2 font-medium">{t("admin.legal.colVersion")}</th>
                  <th className="text-left px-3 py-2 font-medium">{t("admin.legal.colLocale")}</th>
                  <th className="text-left px-3 py-2 font-medium">{t("admin.legal.colIp")}</th>
                  <th className="text-right px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">{fmt(r.accepted_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.document_version}</td>
                    <td className="px-3 py-2">{r.locale}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.ip_address ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => openDetail(r.id)}>
                        {t("admin.legal.view")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {loadingDetail && (
          <div className="py-4 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin inline" />
          </div>
        )}

        {detail && (
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-2">
              {detail.verified ? (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-success/15 text-success">
                  <ShieldCheck className="h-3.5 w-3.5" /> {t("admin.legal.verifiedOk")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                  <ShieldAlert className="h-3.5 w-3.5" /> {t("admin.legal.verifiedBad")}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {t("admin.legal.signedAs", { v: detail.document_version })}
              </span>
            </div>
            <dl className="grid grid-cols-[160px_1fr] gap-y-1 text-xs">
              <dt className="text-muted-foreground">Hash SHA-256</dt>
              <dd className="font-mono break-all">{detail.document_hash}</dd>
              <dt className="text-muted-foreground">Firma HMAC</dt>
              <dd className="font-mono break-all">{detail.signature}</dd>
              <dt className="text-muted-foreground">IP</dt>
              <dd className="font-mono">{detail.ip_address ?? "—"}</dd>
              <dt className="text-muted-foreground">User-Agent</dt>
              <dd className="font-mono break-all">{detail.user_agent ?? "—"}</dd>
            </dl>
            <div className="flex justify-end">
              <Button onClick={() => downloadAcceptancePdf(detail, userCode)} size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t("admin.legal.downloadPdf")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
