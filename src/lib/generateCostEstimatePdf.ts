import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export function generateCostEstimatePdf(estimate: any): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 20;

  const currency = estimate.display_currency || "USD";
  const fmtCurrency = (val: number | null | undefined) => {
    if (val == null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // ── Header ──
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Cost Estimate", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(
    `Employee: ${estimate.employee_name}  ·  Version ${estimate.version}  ·  ${format(new Date(estimate.created_at), "MMMM d, yyyy")}`,
    margin,
    y
  );
  y += 4;
  doc.text(`Currency: ${currency}  ·  Status: ${estimate.status || "draft"}`, margin, y);
  doc.setTextColor(0);
  y += 10;

  // ── Source details ──
  const details: Record<string, any> =
    typeof estimate.details_snapshot === "object" && estimate.details_snapshot
      ? estimate.details_snapshot
      : {};
  const source: Record<string, any> =
    typeof estimate.source_snapshot === "object" && estimate.source_snapshot
      ? estimate.source_snapshot
      : {};

  const infoEntries = [
    ...Object.entries(details),
    ...Object.entries(source).filter(([k]) => !details[k]),
  ];

  if (infoEntries.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Assignment Details", margin, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Field", "Value"]],
      body: infoEntries.map(([key, value]) => [
        key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        typeof value === "object" ? JSON.stringify(value).slice(0, 80) : String(value ?? "—"),
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Line items by category ──
  const lineItems: any[] = Array.isArray(estimate.line_items)
    ? estimate.line_items
    : [];

  const categories = lineItems.reduce<Record<string, any[]>>((acc, item) => {
    const cat = item.display_category || item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  if (Object.keys(categories).length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Compensation Breakdown", margin, y);
    y += 2;

    const tableBody: any[][] = [];
    Object.entries(categories).forEach(([cat, items]) => {
      // Category header row
      tableBody.push([
        { content: cat, colSpan: 4, styles: { fontStyle: "bold" as const, fillColor: [230, 235, 245] } },
      ]);
      items.forEach((item: any) => {
        tableBody.push([
          item.display_label || item.label || item.name || "—",
          item.paycode || "—",
          item.is_taxable !== undefined ? (item.is_taxable ? "Yes" : "No") : "—",
          fmtCurrency(Number(item.amount) || Number(item.default_value) || 0),
        ]);
      });
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Item", "Paycode", "Taxable", "Amount"]],
      body: tableBody,
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        3: { halign: "right", fontStyle: "bold" },
      },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // ── Grand total ──
  const totalCost =
    estimate.total_cost ??
    lineItems.reduce(
      (sum: number, i: any) => sum + (Number(i.amount) || Number(i.default_value) || 0),
      0
    );

  doc.setFillColor(59, 130, 246);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255);
  doc.text("Grand Total", margin + 4, y + 8);
  doc.text(fmtCurrency(totalCost), pageWidth - margin - 4, y + 8, { align: "right" });
  doc.setTextColor(0);
  y += 20;

  // ── Tax summary ──
  const taxSnapshot: Record<string, any> =
    typeof estimate.tax_snapshot === "object" && estimate.tax_snapshot
      ? estimate.tax_snapshot
      : {};

  if (Object.keys(taxSnapshot).length > 0) {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Tax Details", margin, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Tax Setting", "Value"]],
      body: Object.entries(taxSnapshot).map(([key, value]) => [
        key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        typeof value === "number" ? fmtCurrency(value) : String(value ?? "—"),
      ]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      theme: "grid",
    });
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Generated ${format(new Date(), "MMM d, yyyy HH:mm")} — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return doc;
}

export function downloadCostEstimatePdf(estimate: any) {
  const doc = generateCostEstimatePdf(estimate);
  const safeName = (estimate.employee_name || "estimate")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase();
  doc.save(`cost_estimate_${safeName}_v${estimate.version}.pdf`);
}
