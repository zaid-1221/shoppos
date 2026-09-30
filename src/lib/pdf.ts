import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export type PdfColumn = { key: string; header: string; align?: "left" | "right" | "center"; width?: number };
export type PdfRow = Record<string, string | number>;
export type PdfSummaryItem = { label: string; value: string };

function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** A4 landscape/portrait table PDF for reports and list exports. */
export function exportTablePdf(opts: {
  filename: string;
  title: string;
  shopName?: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: PdfRow[];
  summary?: PdfSummaryItem[];
  orientation?: "portrait" | "landscape";
}) {
  const { filename, title, shopName, subtitle, columns, rows, summary = [], orientation = "portrait" } = opts;
  if (!rows.length) {
    toast.error("Nothing to export.");
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;
  const colW = columns.map((c) => c.width ?? contentW / columns.length);
  const totalW = colW.reduce((a, b) => a + b, 0);
  const scale = contentW / totalW;
  const widths = colW.map((w) => w * scale);

  let y = margin;
  const centerX = pageW / 2;
  const lineH = 3.8;
  const rowPadY = 2.2;
  const headerH = 8;

  const newPage = () => {
    doc.addPage();
    y = margin;
  };

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin) newPage();
  };

  const cellX = (x: number, w: number, align: "left" | "right" | "center") => {
    if (align === "right") return x + w - 1.5;
    if (align === "center") return x + w / 2;
    return x + 1.5;
  };

  if (shopName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(60);
    doc.text(shopName, centerX, y, { align: "center" });
    doc.setTextColor(0);
    y += 5.5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, centerX, y, { align: "center" });
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  const meta = [subtitle, `Generated ${fmtDate(new Date().toISOString())}`, `${rows.length} rows`].filter(Boolean).join(" · ");
  doc.text(meta, centerX, y, { align: "center" });
  doc.setTextColor(0);
  y += 7;

  if (summary.length) {
    ensureSpace(8 + summary.length * 5);
    for (const s of summary) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(s.label, margin, y);
      doc.setFont("helvetica", "bold");
      doc.text(s.value, pageW - margin, y, { align: "right" });
      y += 4.5;
    }
    y += 4;
  }

  const drawHeader = () => {
    ensureSpace(headerH + 2);
    doc.setFillColor(245, 245, 245);
    doc.setDrawColor(210);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, contentW, headerH, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    let x = margin;
    const textY = y + headerH / 2 + 1.1;
    columns.forEach((col, i) => {
      const align = col.align ?? "left";
      doc.text(col.header, cellX(x, widths[i]!, align), textY, { align });
      x += widths[i]!;
    });
    y += headerH;
  };

  drawHeader();

  for (const row of rows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const cells = columns.map((col, i) => {
      const text = String(row[col.key] ?? "");
      return doc.splitTextToSize(text, widths[i]! - 3) as string[];
    });
    const linesCount = Math.max(1, ...cells.map((c) => c.length));
    const rowH = rowPadY * 2 + linesCount * lineH;

    if (y + rowH > pageH - margin) {
      newPage();
      drawHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
    }

    let x = margin;
    columns.forEach((col, i) => {
      const align = col.align ?? "left";
      const lines = cells[i]!;
      lines.forEach((line, li) => {
        const textY = y + rowPadY + 2.6 + li * lineH;
        doc.text(line, cellX(x, widths[i]!, align), textY, { align });
      });
      x += widths[i]!;
    });

    y += rowH;
    doc.setDrawColor(210);
    doc.setLineWidth(0.25);
    doc.line(margin, y, margin + contentW, y);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(`Page ${i} of ${pageCount}`, pageW / 2, pageH - 6, { align: "center" });
    doc.setTextColor(0);
  }

  downloadBlob(doc.output("blob"), filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  toast.success("PDF downloaded.");
}
