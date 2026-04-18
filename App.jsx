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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  const border = [196, 196, 196];
  const tableColumns = {
    description: 76,
    qty: 24,
    unitPrice: 40,
    total: 38,
  };
  const drawTableHeader = (y) => {
    pdf.setDrawColor(...border);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);

    const headerHeight = 16;
    let x = margin;

    pdf.rect(x, y, tableColumns.description, headerHeight);
    pdf.text("Description", x + 4, y + 10);
    x += tableColumns.description;

    pdf.rect(x, y, tableColumns.qty, headerHeight);
    pdf.text("Qty", x + 4, y + 10);
    x += tableColumns.qty;

    pdf.rect(x, y, tableColumns.unitPrice, headerHeight);
    pdf.text("Unit Price ($)", x + 4, y + 10);
    x += tableColumns.unitPrice;

    pdf.rect(x, y, tableColumns.total, headerHeight);
    pdf.text("Total ($)", x + 4, y + 10);

    return y + headerHeight;
  };

  const addPage = () => {
    pdf.addPage();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.text("Invoice", pageWidth / 2, 22, { align: "center" });
    return 34;
  };

  const drawInfoField = (label, value, y) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(14);
    pdf.text(`${label}:`, margin, y);

    const valueLines = pdf.splitTextToSize(value || "-", contentWidth);
    pdf.setFontSize(11);
    pdf.text(valueLines, margin + 3, y + 10);

    return y + 24 + (valueLines.length - 1) * 5;
  };

  let y = 22;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.text("Invoice", pageWidth / 2, y, { align: "center" });

  y = 40;
  y = drawInfoField("From", invoice.from, y);
  y = drawInfoField("To", invoice.to, y);
  y = drawInfoField("Invoice #", invoice.invoiceNumber, y);
  y = drawInfoField("Date", invoice.date, y);

  y += 8;
  y = drawTableHeader(y);

  invoice.items.forEach((item) => {
    const descriptionLines = pdf.splitTextToSize(item.description || "-", tableColumns.description - 8);
    const rowHeight = Math.max(18, 8 + descriptionLines.length * 5);

    if (y + rowHeight + 36 > pageHeight - margin) {
      y = addPage();
      y = drawTableHeader(y);
    }

    pdf.setDrawColor(...border);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);

    let x = margin;
    pdf.rect(x, y, tableColumns.description, rowHeight);
    pdf.text(descriptionLines, x + 4, y + 10);
    x += tableColumns.description;

    pdf.rect(x, y, tableColumns.qty, rowHeight);
    pdf.text(String(item.qty || 0), x + 4, y + 10);
    x += tableColumns.qty;

    pdf.rect(x, y, tableColumns.unitPrice, rowHeight);
    pdf.text(String(Number(item.unitPrice || 0)), x + 4, y + 10);
    x += tableColumns.unitPrice;

    pdf.rect(x, y, tableColumns.total, rowHeight);
    pdf.text(
      Number(Number(item.qty || 0) * Number(item.unitPrice || 0)).toFixed(2),
      x + 4,
      y + 10
    );

    y += rowHeight;
  });

  y += 14;

  if (y + 28 > pageHeight - margin) {
    y = addPage();
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(`Total Due: ${formatMoney(totalDue)}`, pageWidth - margin, y, {
    align: "right",
  });

  y += 18;
  const notesLines = pdf.splitTextToSize(invoice.notes || "No additional notes.", contentWidth);

  if (y + 12 + notesLines.length * 5 > pageHeight - margin) {
    y = addPage();
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.text("Notes:", margin, y);
  pdf.setFontSize(11);
  pdf.text(notesLines, margin + 3, y + 10);

  return pdf;
}

function createPrintableInvoiceHtml(invoice, totalDue) {
  const rows = invoice.items
    .map((item) => {
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const lineTotal = qty * unitPrice;

      return `
        <tr>
          <td>${escapeHtml(item.description || "-")}</td>
          <td>${qty}</td>
          <td>${escapeHtml(String(unitPrice))}</td>
          <td>${lineTotal.toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(getPdfFileName(invoice.invoiceNumber))}</title>
    <style>
      body {
        margin: 0;
        background: #ffffff;
        color: #000000;
        font-family: Arial, Helvetica, sans-serif;
      }

      .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 28px 22px 40px;
      }

      h1 {
        margin: 0 0 32px;
        text-align: center;
        font-size: 36px;
      }

      .field {
        margin-bottom: 22px;
        font-size: 15px;
        line-height: 1.5;
      }

      .field-label {
        margin-bottom: 6px;
        font-size: 16px;
      }

      table {
        width: 100%;
        margin-top: 34px;
        border-collapse: collapse;
      }

      th,
      td {
        border: 1px solid #c4c4c4;
        padding: 14px 12px;
        text-align: left;
        vertical-align: top;
      }

      th {
        font-size: 14px;
      }

      .total {
        margin-top: 24px;
        text-align: right;
        font-size: 24px;
        font-weight: 700;
      }

      .notes {
        margin-top: 28px;
      }

      .notes-label {
        margin-bottom: 8px;
        font-size: 16px;
      }

      .notes-body {
        white-space: pre-wrap;
        font-size: 15px;
        line-height: 1.6;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .page {
          max-width: none;
          padding: 18px;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <h1>Invoice</h1>

      <section class="field">
        <div class="field-label">From:</div>
        <div>${escapeHtml(invoice.from || "-")}</div>
      </section>

      <section class="field">
        <div class="field-label">To:</div>
        <div>${escapeHtml(invoice.to || "-")}</div>
      </section>

      <section class="field">
        <div class="field-label">Invoice #:</div>
        <div>${escapeHtml(invoice.invoiceNumber || "-")}</div>
      </section>

      <section class="field">
        <div class="field-label">Date:</div>
        <div>${escapeHtml(invoice.date || "-")}</div>
      </section>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit Price ($)</th>
            <th>Total ($)</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td>-</td><td>0</td><td>0</td><td>0.00</td></tr>'}
        </tbody>
      </table>

      <div class="total">Total Due: ${escapeHtml(formatMoney(totalDue))}</div>

      <section class="notes">
        <div class="notes-label">Notes:</div>
        <div class="notes-body">${escapeHtml(invoice.notes || "No additional notes.")}</div>
      </section>
    </main>
  </body>
</html>`;
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

  const printInvoice = () => {
    const printFrame = document.createElement("iframe");
    printFrame.setAttribute("aria-hidden", "true");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";

    const cleanup = () => {
      setTimeout(() => {
        printFrame.remove();
      }, 1000);
    };

    printFrame.onload = () => {
      const frameWindow = printFrame.contentWindow;
      if (!frameWindow) {
        cleanup();
        window.print();
        return;
      }

      try {
        frameWindow.focus();
        frameWindow.print();
      } catch (error) {
        console.error("Print failed", error);
        window.print();
      } finally {
        cleanup();
      }
    };

    document.body.appendChild(printFrame);

    const frameDocument = printFrame.contentWindow?.document;
    if (!frameDocument) {
      cleanup();
      window.print();
      return;
    }

    frameDocument.open();
    frameDocument.write(createPrintableInvoiceHtml(invoice, totalDue));
    frameDocument.close();
  };

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
            <Card title="Invoice details">
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

            <Card title="Notes">
              <textarea
                className="min-h-[140px] w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-900"
                value={invoice.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Additional info or payment instructions"
              />
            </Card>
          </main>

          <aside className="space-y-6">
            <Card title="Summary">
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
