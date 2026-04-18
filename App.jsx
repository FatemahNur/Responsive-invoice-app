import React, { useEffect, useMemo, useState } from "react";
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

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(invoice, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${invoice.invoiceNumber || "draft"}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
              <h1 className="text-3xl font-bold sm:text-4xl">Responsive Invoice Builder</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
                Built for desktop and mobile, easy for users to fill in, and friendly for GitHub deployment.
                It also saves invoice data automatically in local storage.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              <button
                onClick={printInvoice}
                className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:scale-[1.01]"
              >
                <div className="mb-1 flex justify-center">
                  <Printer className="h-4 w-4" />
                </div>
                Print / PDF
              </button>
              <button
                onClick={exportJson}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                <div className="mb-1 flex justify-center">
                  <Download className="h-4 w-4" />
                </div>
                Export
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

                <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600">
                  This version is easier to use on mobile than a basic table layout. It also works well for GitHub deployment because it is a simple React app with no backend required.
                </div>
              </div>
            </Card>

            <Card title="Recommended project files" subtitle="Use this structure for a Vite + React GitHub-ready project.">
              <div className="rounded-2xl bg-slate-50 p-4 font-mono text-sm leading-7 text-slate-700">
                invoice-app/
                <br />|- public/
                <br />|- src/
                <br />|  |- App.jsx
                <br />|  |- main.jsx
                <br />|  `- index.css
                <br />|- package.json
                <br />|- vite.config.js
                <br />`- README.md
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
