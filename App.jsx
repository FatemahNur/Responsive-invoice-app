import React, { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import {
  Calendar,
  Download,
  FileText,
  Plus,
  Printer,
  Trash2,
  User,
} from "lucide-react";

const STORAGE_KEY = "invoice-app-data-v1";

const createEmptyItem = () => ({
  id: crypto.randomUUID(),
  description: "",
  qty: 1,
  unitPrice: 0,
});

const defaultInvoice = {
  from: "tester1",
  to: "tester",
  invoiceNumber: "123",
  date: "2026-04-15",
  notes: "Additional info or payment instructions",
  items: [
    {
      id: crypto.randomUUID(),
      description: "eggs",
      qty: 1,
      unitPrice: 20,
    },
  ],
};

function formatMoney(value) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getPdfFileName(invoiceNumber) {
  return `invoice-${invoiceNumber || "draft"}.pdf`;
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function createInvoicePdf(invoice, totalDue) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const dark = [15, 23, 42];
  const muted = [100, 116, 139];
  const border = [226, 232, 240];
  const soft = [248, 250, 252];
  const accent = [255, 255, 255];
  const tableColumns = {
    description: 88,
    qty: 20,
    unitPrice: 34,
    total: 36,
  };

  let pageNumber = 1;

  const drawPageShell = (firstPage) => {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    if (firstPage) {
      pdf.setFillColor(...dark);
      pdf.roundedRect(margin, margin, contentWidth, 30, 4, 4, "F");

      pdf.setTextColor(...accent);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(21);
      pdf.text("INVOICE", margin + 8, margin + 13);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("Responsive Invoice App", margin + 8, margin + 20);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(`Invoice #: ${invoice.invoiceNumber || "Draft"}`, pageWidth - margin - 8, margin + 10, {
        align: "right",
      });
      pdf.text(`Date: ${invoice.date || "-"}`, pageWidth - margin - 8, margin + 16, {
        align: "right",
      });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text(formatMoney(totalDue), pageWidth - margin - 8, margin + 25, {
        align: "right",
      });

      return margin + 40;
    }

    pdf.setDrawColor(...border);
    pdf.line(margin, margin, pageWidth - margin, margin);

    pdf.setTextColor(...dark);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(`Invoice ${invoice.invoiceNumber || "Draft"}`, margin, margin + 7);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`Page ${pageNumber}`, pageWidth - margin, margin + 7, {
      align: "right",
    });

    return margin + 16;
  };

  const drawInfoCard = (x, y, width, title, body) => {
    const innerWidth = width - 8;
    const bodyLines = pdf.splitTextToSize(body || "-", innerWidth);
    const height = Math.max(24, 14 + bodyLines.length * 5);

    pdf.setFillColor(...soft);
    pdf.setDrawColor(...border);
    pdf.roundedRect(x, y, width, height, 3, 3, "FD");

    pdf.setTextColor(...muted);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text(title.toUpperCase(), x + 4, y + 7);

    pdf.setTextColor(...dark);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(bodyLines, x + 4, y + 14);

    return height;
  };

  const drawTableHeader = (y) => {
    pdf.setFillColor(...dark);
    pdf.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");

    pdf.setTextColor(...accent);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);

    let x = margin + 4;
    pdf.text("Description", x, y + 6.5);
    x += tableColumns.description;
    pdf.text("Qty", x + tableColumns.qty / 2, y + 6.5, { align: "center" });
    x += tableColumns.qty;
    pdf.text("Unit Price", x + tableColumns.unitPrice - 2, y + 6.5, { align: "right" });
    x += tableColumns.unitPrice;
    pdf.text("Total", x + tableColumns.total - 2, y + 6.5, { align: "right" });

    return y + 14;
  };

  const addPage = () => {
    pdf.addPage();
    pageNumber += 1;
    return drawPageShell(false);
  };

  let y = drawPageShell(true);
  const cardGap = 6;
  const cardWidth = (contentWidth - cardGap) / 2;
  const fromHeight = drawInfoCard(margin, y, cardWidth, "From", invoice.from);
  const toHeight = drawInfoCard(margin + cardWidth + cardGap, y, cardWidth, "To", invoice.to);
  y += Math.max(fromHeight, toHeight) + 8;

  pdf.setTextColor(...muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("SUMMARY", margin, y);

  y += 6;
  pdf.setFillColor(...soft);
  pdf.setDrawColor(...border);
  pdf.roundedRect(margin, y, contentWidth, 18, 3, 3, "FD");

  pdf.setTextColor(...muted);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("Invoice #", margin + 5, y + 7);
  pdf.text("Date", margin + 5, y + 13);

  pdf.text("Items", margin + 78, y + 7);
  pdf.text("Total Due", margin + 78, y + 13);

  pdf.setTextColor(...dark);
  pdf.setFont("helvetica", "bold");
  pdf.text(invoice.invoiceNumber || "-", margin + 36, y + 7);
  pdf.text(invoice.date || "-", margin + 36, y + 13);
  pdf.text(String(invoice.items.length), margin + 104, y + 7);
  pdf.text(formatMoney(totalDue), margin + 104, y + 13);

  y += 28;
  y = drawTableHeader(y);

  invoice.items.forEach((item, index) => {
    const descriptionLines = pdf.splitTextToSize(item.description || "-", tableColumns.description - 6);
    const rowHeight = Math.max(11, 5 + descriptionLines.length * 5);

    if (y + rowHeight > pageHeight - margin - 34) {
      y = addPage();
      y = drawTableHeader(y);
    }

    if (index % 2 === 0) {
      pdf.setFillColor(...soft);
      pdf.roundedRect(margin, y - 4, contentWidth, rowHeight, 1.5, 1.5, "F");
    }

    pdf.setTextColor(...dark);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    let x = margin + 4;
    pdf.text(descriptionLines, x, y + 1);
    x += tableColumns.description;
    pdf.text(String(item.qty || 0), x + tableColumns.qty / 2, y + 1, { align: "center" });
    x += tableColumns.qty;
    pdf.text(formatMoney(item.unitPrice || 0), x + tableColumns.unitPrice - 2, y + 1, { align: "right" });
    x += tableColumns.unitPrice;
    pdf.setFont("helvetica", "bold");
    pdf.text(formatMoney(Number(item.qty || 0) * Number(item.unitPrice || 0)), x + tableColumns.total - 2, y + 1, {
      align: "right",
    });

    pdf.setDrawColor(...border);
    pdf.line(margin, y + rowHeight - 5, pageWidth - margin, y + rowHeight - 5);
    y += rowHeight;
  });

  const notesLines = pdf.splitTextToSize(invoice.notes || "No additional notes.", contentWidth - 10);
  const notesHeight = Math.max(24, 12 + notesLines.length * 5);

  if (y + notesHeight + 28 > pageHeight - margin) {
    y = addPage();
  }

  pdf.setTextColor(...muted);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("NOTES", margin, y + 2);

  y += 6;
  pdf.setFillColor(...soft);
  pdf.setDrawColor(...border);
  pdf.roundedRect(margin, y, contentWidth, notesHeight, 3, 3, "FD");
  pdf.setTextColor(...dark);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(notesLines, margin + 5, y + 8);

  y += notesHeight + 8;
  const totalBoxWidth = 64;
  pdf.setFillColor(...dark);
  pdf.roundedRect(pageWidth - margin - totalBoxWidth, y, totalBoxWidth, 18, 3, 3, "F");
  pdf.setTextColor(...accent);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.text("TOTAL DUE", pageWidth - margin - totalBoxWidth + 5, y + 6);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(formatMoney(totalDue), pageWidth - margin - 5, y + 13, {
    align: "right",
  });

  return pdf;
}

function loadInvoice() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultInvoice;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return { ...parsed, items: [createEmptyItem()] };
    }
    return parsed;
  } catch {
    return defaultInvoice;
  }
}

function Field({ label, icon, children }) {
  const Icon = icon;
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
      </label>
      {children}
    </div>
  );
}

function Card({ title, subtitle, children, right }) {
  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 lg:p-7">
      {(title || subtitle || right) && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? <h2 className="text-xl font-bold text-slate-900">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export default function App() {
  const [invoice, setInvoice] = useState(loadInvoice);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoice));
  }, [invoice]);

  const totalDue = useMemo(() => {
    return invoice.items.reduce((sum, item) => {
      return sum + Number(item.qty || 0) * Number(item.unitPrice || 0);
    }, 0);
  }, [invoice.items]);

  const updateField = (field, value) => {
    setInvoice((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (id, field, value) => {
    setInvoice((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItem = () => {
    setInvoice((prev) => ({
      ...prev,
      items: [...prev.items, createEmptyItem()],
    }));
  };

  const deleteItem = (id) => {
    setInvoice((prev) => {
      if (prev.items.length === 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      };
    });
  };

  const resetInvoice = () => {
    setInvoice({
      ...defaultInvoice,
      items: [
        {
          id: crypto.randomUUID(),
          description: "",
          qty: 1,
          unitPrice: 0,
        },
      ],
    });
  };

  const copySummary = async () => {
    const text = `Invoice #${invoice.invoiceNumber}\nFrom: ${invoice.from}\nTo: ${invoice.to}\nDate: ${invoice.date}\nTotal Due: ${formatMoney(totalDue)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const printInvoice = () => window.print();

  const downloadPdf = async () => {
    if (pdfBusy) return;

    setPdfBusy(true);

    const mobilePreview = isMobileDevice() ? window.open("", "_blank") : null;

    try {
      if (mobilePreview) {
        mobilePreview.document.write(
          "<!doctype html><title>Preparing PDF</title><body style='font-family:Arial,sans-serif;padding:24px'>Preparing your PDF…</body>"
        );
        mobilePreview.document.close();
      }

      const pdf = createInvoicePdf(invoice, totalDue);
      const fileName = getPdfFileName(invoice.invoiceNumber);
      const pdfBlob = pdf.output("blob");
      const pdfFile =
        typeof File === "function"
          ? new File([pdfBlob], fileName, { type: "application/pdf" })
          : null;

      if (pdfFile && navigator.share && navigator.canShare?.({ files: [pdfFile] })) {
        if (mobilePreview) {
          mobilePreview.close();
        }
        await navigator.share({
          files: [pdfFile],
          title: fileName,
        });
        return;
      }

      if (mobilePreview) {
        const previewUrl = URL.createObjectURL(pdfBlob);
        mobilePreview.location.replace(previewUrl);
        setTimeout(() => URL.revokeObjectURL(previewUrl), 120000);
        return;
      }

      pdf.save(fileName);
    } catch (error) {
      if (mobilePreview) {
        mobilePreview.close();
      }
      console.error("PDF generation failed", error);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-7xl p-3 sm:p-5 lg:p-8">
        <header className="mb-6 rounded-[32px] bg-slate-900 px-5 py-6 text-white shadow-sm sm:px-7 sm:py-8 print:hidden">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
                <FileText className="h-3.5 w-3.5" />
                Invoice App
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl">Invoice Builder</h1>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <button
                onClick={printInvoice}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:scale-[1.01]"
              >
                <div className="mb-1 flex justify-center">
                  <Printer className="h-4 w-4" />
                </div>
                Print
              </button>
              <button
                onClick={downloadPdf}
                disabled={pdfBusy}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <div className="mb-1 flex justify-center">
                  <Download className="h-4 w-4" />
                </div>
                {pdfBusy ? "Preparing" : "PDF"}
              </button>
              <button
                onClick={copySummary}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <div className="mb-1 flex justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={resetInvoice}
                className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
              >
                <div className="mb-1 flex justify-center">
                  <Trash2 className="h-4 w-4" />
                </div>
                Reset
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">
          <main className="space-y-6">
            <Card title="Invoice details" subtitle="A clean layout inspired by your screenshot, improved for phones and tablets.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="From" icon={User}>
                  <input
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-900"
                    value={invoice.from}
                    onChange={(e) => updateField("from", e.target.value)}
                    placeholder="Your name or business"
                  />
                </Field>

                <Field label="To" icon={User}>
                  <input
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-900"
                    value={invoice.to}
                    onChange={(e) => updateField("to", e.target.value)}
                    placeholder="Client name"
                  />
                </Field>

                <Field label="Invoice #" icon={FileText}>
                  <input
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-900"
                    value={invoice.invoiceNumber}
                    onChange={(e) => updateField("invoiceNumber", e.target.value)}
                    placeholder="INV-001"
                  />
                </Field>

                <Field label="Date" icon={Calendar}>
                  <input
                    type="date"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-900"
                    value={invoice.date}
                    onChange={(e) => updateField("date", e.target.value)}
                  />
                </Field>
              </div>
            </Card>

            <Card
              title="Items"
              subtitle="Users can add services or products quickly."
              right={
                <button
                  onClick={addItem}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              }
            >
              <div className="hidden grid-cols-12 gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 md:grid">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-3">Unit Price ($)</div>
                <div className="col-span-2">Total ($)</div>
              </div>

              <div className="mt-3 space-y-3">
                {invoice.items.map((item) => {
                  const lineTotal = Number(item.qty || 0) * Number(item.unitPrice || 0);

                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-12 md:items-center">
                        <div className="space-y-2 md:col-span-5">
                          <label className="text-sm font-medium text-slate-600 md:hidden">Description</label>
                          <input
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                            placeholder="Description"
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium text-slate-600 md:hidden">Qty</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                            value={item.qty}
                            onChange={(e) => updateItem(item.id, "qty", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2 md:col-span-3">
                          <label className="text-sm font-medium text-slate-600 md:hidden">Unit Price</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 md:bg-transparent md:px-0 md:py-0">
                            <div className="text-sm font-medium text-slate-600 md:hidden">Total</div>
                            <div className="font-semibold">{formatMoney(lineTotal)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Notes" subtitle="Helpful for payment terms or extra instructions.">
              <textarea
                className="min-h-[140px] w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                value={invoice.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Additional info or payment instructions"
              />
            </Card>
          </main>

          <aside className="space-y-6">
            <Card title="Summary" subtitle="A sticky side panel on larger screens for fast review.">
              <div className="space-y-4 lg:sticky lg:top-6">
                <div className="rounded-3xl bg-slate-900 p-5 text-white">
                  <div className="text-sm text-slate-300">Total Due</div>
                  <div className="mt-2 text-3xl font-bold">{formatMoney(totalDue)}</div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Invoice number</span>
                    <span className="font-semibold text-slate-900">{invoice.invoiceNumber || "-"}</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                    <span>Items</span>
                    <span className="font-semibold text-slate-900">{invoice.items.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>Date</span>
                    <span className="font-semibold text-slate-900">{invoice.date || "-"}</span>
                  </div>
                </div>

              </div>
            </Card>

          </aside>
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }

          body {
            background: white !important;
          }

          input,
          textarea {
            border: none !important;
            box-shadow: none !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            background: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
