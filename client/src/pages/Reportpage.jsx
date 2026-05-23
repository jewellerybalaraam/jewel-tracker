import { useEffect, useMemo, useState, useRef } from 'react'
import axios from 'axios'
import {
  FaFileExcel, FaFilePdf, FaPrint, FaSearch, FaFilter,
  FaChevronDown, FaBoxOpen, FaTag, FaFileInvoiceDollar,
  FaBalanceScale, FaHistory, FaCalendarAlt, FaTimes,
} from 'react-icons/fa'

const API = import.meta.env.VITE_API_URL

// ── helpers ──────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const n2 = (v) => (isNaN(+v) ? 0 : +(+v).toFixed(2))
const cur = (v) => `₹${n2(v).toLocaleString('en-IN')}`

// Flatten eerettus into rows (same logic as ClientPage)
function buildRows(eerettus) {
  const rows = []
  eerettus.forEach((e) => {
    if (e.mode === 'barcode') {
      ;(e.items || []).forEach((item) => {
        rows.push({
          kind: 'barcode',
          eerettuId: e._id,
          status: item.status,
          barcode: item.barcode,
          wt: item.wt,
          size: item.size,
          purity: item.purity,
          productName: item.productName || e.roughProductName,
          roughProduct: e.roughProductName,
          createdAt: e.date,
          soldAt: item.soldAt,
          returnedAt: item.returnedAt,
          pureDue: item.pureDue || 0,
          cashDue: item.cashDue || 0,
          billBookNo: item.billBookNo,
          billPageNo: item.billPageNo,
          billId: item.billId || null,
        })
      })
    } else {
      const wt = e.wtMode || {}
      rows.push({
        kind: 'wt',
        eerettuId: e._id,
        status: wt.status,
        totalPcs: wt.totalPcs,
        totalWt: wt.totalWt,
        returnedPcs: wt.returnedPcs,
        returnedWt: wt.returnedWt,
        soldPcs: wt.soldPcs,
        soldWt: wt.soldWt,
        purity: wt.purity,
        roughProduct: e.roughProductName,
        productName: e.roughProductName,
        createdAt: e.date,
        soldAt: wt.soldAt,
        returnedAt: wt.returnedAt,
        pureDue: wt.pureDue || 0,
        cashDue: wt.cashDue || 0,
        billBookNo: wt.billBookNo,
        billPageNo: wt.billPageNo,
        billId: wt.billId || null,
      })
    }
  })
  return rows
}

// ── CSV Export ───────────────────────────────────────────────
function downloadCSV(filename, headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Print PDF helper ─────────────────────────────────────────
function triggerPrint(sectionRef, title, clientName) {
  const content = sectionRef.current?.innerHTML
  if (!content) return
  const w = window.open('', '_blank', 'width=900,height=700')
  w.document.write(`
    <html>
      <head>
        <title>${title} — ${clientName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Noto Sans', sans-serif; font-size: 12px; color: #111; background: #fff; padding: 20px; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #1a1a2e; }
          .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #1a1a2e; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; }
          td { padding: 7px 10px; border-bottom: 1px solid #e5e5e5; font-size: 11px; }
          tr:nth-child(even) td { background: #f9f9fb; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
          .badge-pending { background: #fef3c7; color: #92400e; }
          .badge-sold { background: #fee2e2; color: #991b1b; }
          .badge-returned { background: #d1fae5; color: #065f46; }
          .badge-unpaid { background: #fee2e2; color: #991b1b; }
          .badge-paid { background: #d1fae5; color: #065f46; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
          .summary-card { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; }
          .summary-card .label { font-size: 10px; color: #666; margin-bottom: 4px; }
          .summary-card .value { font-size: 16px; font-weight: 700; color: #1a1a2e; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="subtitle">Client: <strong>${clientName}</strong> &nbsp;|&nbsp; Generated: ${fmtDateTime(new Date())}</p>
        ${content}
      </body>
    </html>
  `)
  w.document.close()
  setTimeout(() => { w.print(); w.close() }, 600)
}

// ── REPORT TYPES config ──────────────────────────────────────
const REPORT_TYPES = [
  { id: 'pending',   label: 'Pending Items',   icon: <FaBoxOpen />,           color: 'from-amber-500 to-orange-500' },
  { id: 'sold',      label: 'Sold Items',       icon: <FaTag />,               color: 'from-red-500 to-pink-500' },
  { id: 'unpaid',    label: 'Unpaid Bills',     icon: <FaFileInvoiceDollar />, color: 'from-purple-500 to-indigo-500' },
  { id: 'due',       label: 'Due Summary',      icon: <FaBalanceScale />,      color: 'from-teal-500 to-cyan-500' },
  { id: 'history',   label: 'Full History',     icon: <FaHistory />,           color: 'from-pink-500 to-rose-500' },
]

// ── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

// ── PENDING ITEMS report ─────────────────────────────────────
function PendingReport({ rows, clientName, printRef }) {
  const pending = rows.filter((r) => r.status === 'PENDING')
  const totalWt = pending.reduce((s, r) => s + (r.kind === 'wt' ? (r.totalWt || 0) : (r.wt || 0)), 0)

  const exportCSV = () => {
    const headers = ['Product', 'Type', 'Barcode', 'Weight(g)', 'Purity', 'Size', 'Date In']
    const data = pending.map((r) => [
      r.productName, r.kind === 'barcode' ? 'Barcode' : 'Wt-mode',
      r.barcode || '—', r.kind === 'wt' ? r.totalWt : r.wt,
      r.purity || '—', r.size || '—', fmtDate(r.createdAt),
    ])
    downloadCSV(`Pending_${clientName}_${Date.now()}.csv`, headers, data)
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Pending Items" value={pending.length} color="text-amber-400" />
        <StatCard label="Total Weight" value={`${n2(totalWt)} g`} color="text-orange-300" />
        <StatCard label="Barcode Items" value={pending.filter(r => r.kind === 'barcode').length} />
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-all">
          <FaFileExcel /> Export Excel
        </button>
        <button onClick={() => triggerPrint(printRef, 'Pending Items Report', clientName)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
          <FaFilePdf /> Print / PDF
        </button>
      </div>

      <div ref={printRef}>
        {pending.length === 0 ? (
          <p className="text-center py-12 text-gray-500">No pending items for this client.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/10">
                  {['#', 'Product', 'Type', 'Barcode', 'Weight', 'Purity', 'Size', 'Date In'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-bold text-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((r, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-white">{r.productName}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.kind === 'barcode' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                        {r.kind === 'barcode' ? 'Barcode' : 'Wt-mode'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-300">{r.barcode || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-300">{r.kind === 'wt' ? `${r.totalWt}g` : `${r.wt}g`}</td>
                    <td className="px-3 py-2.5 text-gray-400">{r.purity || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400">{r.size || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── SOLD ITEMS report ────────────────────────────────────────
function SoldReport({ rows, clientName, printRef }) {
  const sold = rows.filter((r) => r.status === 'SOLD')
  const totalPureDue = sold.reduce((s, r) => s + (r.pureDue || 0), 0)
  const totalCashDue = sold.reduce((s, r) => s + (r.cashDue || 0), 0)
  const totalWt = sold.reduce((s, r) => s + (r.kind === 'wt' ? (r.soldWt || 0) : (r.wt || 0)), 0)

  const exportCSV = () => {
    const headers = ['Product', 'Type', 'Barcode', 'Weight(g)', 'Purity', 'Sold On', 'Pure Due(g)', 'Cash Due(₹)', 'Bill Book', 'Bill Page']
    const data = sold.map((r) => [
      r.productName, r.kind === 'barcode' ? 'Barcode' : 'Wt-mode',
      r.barcode || '—', r.kind === 'wt' ? r.soldWt : r.wt,
      r.purity || '—', fmtDate(r.soldAt),
      r.pureDue || 0, r.cashDue || 0,
      r.billBookNo || '—', r.billPageNo || '—',
    ])
    downloadCSV(`Sold_${clientName}_${Date.now()}.csv`, headers, data)
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Sold" value={sold.length} color="text-red-400" />
        <StatCard label="Total Weight" value={`${n2(totalWt)} g`} color="text-orange-300" />
        <StatCard label="Total Pure Due" value={`${n2(totalPureDue)} g`} color="text-yellow-300" />
        <StatCard label="Total Cash Due" value={cur(totalCashDue)} color="text-pink-300" />
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-all">
          <FaFileExcel /> Export Excel
        </button>
        <button onClick={() => triggerPrint(printRef, 'Sold Items Report', clientName)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
          <FaFilePdf /> Print / PDF
        </button>
      </div>

      <div ref={printRef}>
        {sold.length === 0 ? (
          <p className="text-center py-12 text-gray-500">No sold items found.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/10">
                  {['#', 'Product', 'Type', 'Barcode', 'Weight', 'Purity', 'Sold On', 'Pure Due', 'Cash Due', 'Bill'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-bold text-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sold.map((r, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-white">{r.productName}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.kind === 'barcode' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                        {r.kind === 'barcode' ? 'Barcode' : 'Wt'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-300 text-xs">{r.barcode || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-300">{r.kind === 'wt' ? `${r.soldWt}g` : `${r.wt}g`}</td>
                    <td className="px-3 py-2.5 text-gray-400">{r.purity || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(r.soldAt)}</td>
                    <td className="px-3 py-2.5 text-yellow-300 font-semibold">{r.pureDue ? `${r.pureDue}g` : '—'}</td>
                    <td className="px-3 py-2.5 text-pink-300 font-semibold">{r.cashDue ? cur(r.cashDue) : '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-500">
                      {r.billBookNo ? `${r.billBookNo}/${r.billPageNo}` : (r.billId ? '🔒' : '—')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-white/5 font-bold">
                  <td colSpan={7} className="px-3 py-2 text-right text-gray-400 text-xs">Totals →</td>
                  <td className="px-3 py-2 text-yellow-300">{n2(totalPureDue)}g</td>
                  <td className="px-3 py-2 text-pink-300">{cur(totalCashDue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── UNPAID BILLS report ──────────────────────────────────────
function UnpaidBillsReport({ bills, clientName, printRef }) {
  const unpaid = bills.filter((b) => b.status === 'unpaid')

  const totalFinal = unpaid.reduce((s, b) => s + (b.totals?.finalCash || 0), 0)
  const totalPaid  = unpaid.reduce((s, b) => s + b.payments.reduce((ps, p) => ps + p.amount, 0), 0)
  const totalBalance = totalFinal - totalPaid

  const exportCSV = () => {
    const headers = ['Bill Date', 'Silver Rate', 'Net Pure(g)', 'Final Amount(₹)', 'Paid(₹)', 'Balance(₹)', 'Status']
    const data = unpaid.map((b) => {
      const paid = b.payments.reduce((s, p) => s + p.amount, 0)
      return [
        fmtDate(b.createdAt), b.silverRate, n2(b.totals?.netPure),
        n2(b.totals?.finalCash), n2(paid), n2((b.totals?.finalCash || 0) - paid), b.status,
      ]
    })
    downloadCSV(`UnpaidBills_${clientName}_${Date.now()}.csv`, headers, data)
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <StatCard label="Unpaid Bills" value={unpaid.length} color="text-purple-400" />
        <StatCard label="Total Billed" value={cur(totalFinal)} color="text-indigo-300" />
        <StatCard label="Outstanding Balance" value={cur(totalBalance)} color="text-red-400" />
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-all">
          <FaFileExcel /> Export Excel
        </button>
        <button onClick={() => triggerPrint(printRef, 'Unpaid Bills Report', clientName)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
          <FaFilePdf /> Print / PDF
        </button>
      </div>

      <div ref={printRef}>
        {unpaid.length === 0 ? (
          <p className="text-center py-12 text-gray-500">No unpaid bills — all clear! ✅</p>
        ) : (
          <div className="space-y-4">
            {unpaid.map((b, i) => {
              const paid = b.payments.reduce((s, p) => s + p.amount, 0)
              const balance = (b.totals?.finalCash || 0) - paid
              const paidPct = b.totals?.finalCash ? Math.min(100, (paid / b.totals.finalCash) * 100) : 0
              return (
                <div key={b._id} className="bg-white/5 border border-purple-500/20 rounded-2xl p-4">
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                    <div>
                      <p className="font-bold text-white">Bill #{i + 1} &nbsp;
                        <span className="text-xs font-normal text-gray-500">{fmtDateTime(b.createdAt)}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Silver rate: ₹{b.silverRate}/g · {b.items?.length || 0} items</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300">UNPAID</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs mb-3">
                    <div className="bg-black/30 rounded-xl p-2.5">
                      <p className="text-gray-500 mb-1">Net Pure</p>
                      <p className="text-yellow-300 font-bold">{n2(b.totals?.netPure)}g</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-2.5">
                      <p className="text-gray-500 mb-1">Final Amount</p>
                      <p className="text-white font-bold">{cur(b.totals?.finalCash)}</p>
                    </div>
                    <div className="bg-black/30 rounded-xl p-2.5">
                      <p className="text-gray-500 mb-1">Balance Due</p>
                      <p className="text-red-400 font-bold">{cur(balance)}</p>
                    </div>
                  </div>

                  {/* Payment progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Paid: {cur(paid)}</span>
                      <span>{paidPct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                        style={{ width: `${paidPct}%` }} />
                    </div>
                  </div>

                  {/* Payments list */}
                  {b.payments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-xs text-gray-500 mb-2">Payment history:</p>
                      <div className="space-y-1">
                        {b.payments.map((p, pi) => (
                          <div key={pi} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{fmtDate(p.date)} {p.note && `— ${p.note}`}</span>
                            <span className="text-green-300 font-semibold">{cur(p.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Total row */}
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-2xl p-4 flex flex-wrap gap-4 justify-between">
              <div className="text-sm"><p className="text-gray-400 text-xs">Total Outstanding</p><p className="text-2xl font-black text-red-400">{cur(totalBalance)}</p></div>
              <div className="text-sm"><p className="text-gray-400 text-xs">Total Paid</p><p className="text-xl font-black text-green-400">{cur(totalPaid)}</p></div>
              <div className="text-sm"><p className="text-gray-400 text-xs">Total Billed</p><p className="text-xl font-black text-white">{cur(totalFinal)}</p></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── DUE SUMMARY report ───────────────────────────────────────
function DueSummaryReport({ rows, bills, clientName, printRef }) {
  const sold = rows.filter((r) => r.status === 'SOLD')
  const unpaidBills = bills.filter((b) => b.status === 'unpaid')

  const totalPureDue = sold.reduce((s, r) => s + (r.pureDue || 0), 0)
  const totalCashDue = sold.reduce((s, r) => s + (r.cashDue || 0), 0)
  const totalBillDue = unpaidBills.reduce((s, b) => {
    const paid = b.payments.reduce((ps, p) => ps + p.amount, 0)
    return s + ((b.totals?.finalCash || 0) - paid)
  }, 0)
  const totalBillPureDue = unpaidBills.reduce((s, b) => s + (b.totals?.netPure || 0), 0)

  const pending = rows.filter((r) => r.status === 'PENDING')
  const pendingWt = pending.reduce((s, r) => s + (r.kind === 'wt' ? (r.totalWt || 0) : (r.wt || 0)), 0)

  const exportCSV = () => {
    const headers = ['Category', 'Description', 'Value']
    const data = [
      ['Pending Items', 'Count', pending.length],
      ['Pending Items', 'Total Weight (g)', n2(pendingWt)],
      ['Sold Items', 'Count', sold.length],
      ['Sold Items', 'Pure Due (g)', n2(totalPureDue)],
      ['Sold Items', 'Cash Due (₹)', n2(totalCashDue)],
      ['Unpaid Bills', 'Count', unpaidBills.length],
      ['Unpaid Bills', 'Outstanding Balance (₹)', n2(totalBillDue)],
      ['Unpaid Bills', 'Net Pure in Bills (g)', n2(totalBillPureDue)],
    ]
    downloadCSV(`DueSummary_${clientName}_${Date.now()}.csv`, headers, data)
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-all">
          <FaFileExcel /> Export Excel
        </button>
        <button onClick={() => triggerPrint(printRef, 'Due Summary Report', clientName)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
          <FaFilePdf /> Print / PDF
        </button>
      </div>

      <div ref={printRef}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pending Summary */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FaBoxOpen className="text-amber-400" />
              <h3 className="font-bold text-amber-300">Pending Items</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Total Items</span><span className="text-white font-bold">{pending.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Total Weight</span><span className="text-amber-300 font-bold">{n2(pendingWt)} g</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Barcode Items</span><span className="text-white">{pending.filter(r => r.kind === 'barcode').length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Wt-mode Items</span><span className="text-white">{pending.filter(r => r.kind === 'wt').length}</span></div>
            </div>
          </div>

          {/* Sold Due Summary */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FaTag className="text-red-400" />
              <h3 className="font-bold text-red-300">Sold Item Dues</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Sold Items</span><span className="text-white font-bold">{sold.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Pure Due</span><span className="text-yellow-300 font-bold">{n2(totalPureDue)} g</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Cash Due</span><span className="text-pink-300 font-bold">{cur(totalCashDue)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">With Bill</span><span className="text-white">{sold.filter(r => r.billId).length}</span></div>
            </div>
          </div>

          {/* Unpaid Bills Summary */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FaFileInvoiceDollar className="text-purple-400" />
              <h3 className="font-bold text-purple-300">Unpaid Bills</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Bills Count</span><span className="text-white font-bold">{unpaidBills.length}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Outstanding</span><span className="text-red-400 font-bold">{cur(totalBillDue)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Net Pure in Bills</span><span className="text-yellow-300 font-bold">{n2(totalBillPureDue)} g</span></div>
            </div>
          </div>

          {/* Overall Summary */}
          <div className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FaBalanceScale className="text-pink-400" />
              <h3 className="font-bold text-pink-300">Overall Balance</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Total Pure Due</span><span className="text-yellow-300 font-bold">{n2(totalPureDue + totalBillPureDue)} g</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Total Cash Due</span><span className="text-pink-300 font-bold">{cur(totalCashDue + totalBillDue)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">All Pending Items</span><span className="text-amber-300 font-bold">{pending.length} items</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FULL HISTORY report ──────────────────────────────────────
function FullHistoryReport({ rows, bills, clientName, printRef }) {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const STATUS_OPTS = ['ALL', 'PENDING', 'SOLD', 'RETURNED']

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (q) {
        const hay = [r.productName, r.barcode, r.roughProduct].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [rows, statusFilter, search])

  const statusColor = (s) => ({
    PENDING: 'bg-amber-500/20 text-amber-300',
    SOLD: 'bg-red-500/20 text-red-300',
    RETURNED: 'bg-green-500/20 text-green-300',
  }[s] || 'bg-white/10 text-gray-400')

  const exportCSV = () => {
    const headers = ['Product', 'Type', 'Barcode', 'Weight(g)', 'Purity', 'Status', 'Date In', 'Sold/Returned On', 'Pure Due(g)', 'Cash Due(₹)']
    const data = filtered.map((r) => [
      r.productName, r.kind,
      r.barcode || '—', r.kind === 'wt' ? r.totalWt : r.wt,
      r.purity || '—', r.status,
      fmtDate(r.createdAt), r.soldAt ? fmtDate(r.soldAt) : (r.returnedAt ? fmtDate(r.returnedAt) : '—'),
      r.pureDue || 0, r.cashDue || 0,
    ])
    downloadCSV(`History_${clientName}_${Date.now()}.csv`, headers, data)
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex-1 min-w-[160px]">
          <FaSearch className="text-gray-500" />
          <input className="bg-transparent outline-none text-white text-sm flex-1 placeholder-gray-500"
            placeholder="Search product / barcode..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><FaTimes className="text-gray-500 text-xs" /></button>}
        </div>
        <div className="flex gap-1">
          {STATUS_OPTS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${statusFilter === s ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-all">
          <FaFileExcel /> Export Excel
        </button>
        <button onClick={() => triggerPrint(printRef, 'Full Transaction History', clientName)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all">
          <FaFilePdf /> Print / PDF
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">{filtered.length} of {rows.length} items</p>

      <div ref={printRef}>
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-500">No items match the filter.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/10">
                  {['#', 'Product', 'Type', 'Barcode', 'Weight', 'Purity', 'Status', 'Date In', 'Action Date', 'Due'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-bold text-gray-300 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-3 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-3 py-2.5 font-semibold text-white">{r.productName}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.kind === 'barcode' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'}`}>
                        {r.kind === 'barcode' ? 'BC' : 'Wt'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-gray-300 text-xs">{r.barcode || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-300">{r.kind === 'wt' ? `${r.totalWt}g` : `${r.wt}g`}</td>
                    <td className="px-3 py-2.5 text-gray-400">{r.purity || '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap text-xs">{fmtDate(r.createdAt)}</td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap text-xs">
                      {r.soldAt ? fmtDate(r.soldAt) : r.returnedAt ? fmtDate(r.returnedAt) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {(r.pureDue || r.cashDue) ? (
                        <span className="text-pink-300">{r.pureDue ? `${r.pureDue}g` : ''}{r.pureDue && r.cashDue ? ' / ' : ''}{r.cashDue ? cur(r.cashDue) : ''}</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── MAIN COMPONENT ───────────────────────────────────────────
export default function ReportPage() {
  const [clients, setClients]         = useState([])
  const [clientSearch, setClientSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)

  const [eerettus, setEerettus] = useState([])
  const [bills, setBills]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const [activeReport, setActiveReport] = useState('pending')

  // One ref per report type for printing
  const printRefs = {
    pending: useRef(),
    sold:    useRef(),
    unpaid:  useRef(),
    due:     useRef(),
    history: useRef(),
  }

  // Fetch clients list
  useEffect(() => {
    axios.get(`${API}/clients`).then((r) => setClients(r.data)).catch(console.error)
  }, [])

  // Fetch data when client selected
  useEffect(() => {
    if (!selectedClient) return
    setLoading(true)
    setError(null)
    const name = encodeURIComponent(selectedClient.clientName)
    Promise.all([
      axios.get(`${API}/eerettus/by-client/${name}`),
      axios.get(`${API}/bills/by-client/${name}`),
    ])
      .then(([eRes, bRes]) => {
        setEerettus(eRes.data)
        setBills(bRes.data)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedClient])

  const rows = useMemo(() => buildRows(eerettus), [eerettus])

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    return q ? clients.filter((c) => c.clientName.toLowerCase().includes(q)) : clients
  }, [clients, clientSearch])

  const selectClient = (c) => {
    setSelectedClient(c)
    setClientSearch(c.clientName)
    setShowDropdown(false)
  }

  return (
    <div className="min-h-screen p-4 md:p-8 text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
          Client Reports
        </h1>
        <p className="text-gray-400 text-sm mt-1">Pending items · Sold items · Bills · Due summary · Full history</p>
      </div>

      {/* Client Selector */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-5 mb-6">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Select Client</label>
        <div className="relative max-w-md">
          <div className="flex items-center gap-2 px-4 py-3 bg-white/10 border border-white/20 rounded-2xl focus-within:border-pink-400 transition-colors">
            <FaSearch className="text-gray-400 flex-shrink-0" />
            <input
              className="bg-transparent outline-none text-white flex-1 placeholder-gray-500 text-sm"
              placeholder="Search client name..."
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
            />
            {clientSearch && (
              <button onClick={() => { setClientSearch(''); setSelectedClient(null); setShowDropdown(false) }}>
                <FaTimes className="text-gray-400 text-xs" />
              </button>
            )}
            <FaChevronDown className="text-gray-400 text-xs flex-shrink-0" />
          </div>

          {showDropdown && filteredClients.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl max-h-56 overflow-y-auto">
              {filteredClients.slice(0, 30).map((c) => (
                <button
                  key={c._id || c.clientName}
                  className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors text-sm border-b border-white/5 last:border-0"
                  onClick={() => selectClient(c)}
                >
                  <span className="font-semibold text-white">{c.clientName}</span>
                  {c.mobile?.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">{c.mobile[0]}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedClient && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-sm font-black">
              {selectedClient.clientName[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-white">{selectedClient.clientName}</p>
              <p className="text-xs text-gray-500">{selectedClient.mobile?.join(', ') || 'No phone'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Report Types */}
      {selectedClient && (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.id}
                onClick={() => setActiveReport(rt.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                  activeReport === rt.id
                    ? `bg-gradient-to-r ${rt.color} text-white shadow-lg`
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {rt.icon} {rt.label}
              </button>
            ))}
          </div>

          {/* Report Panel */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
                <span className="ml-3 text-gray-400">Loading data…</span>
              </div>
            )}
            {error && (
              <p className="text-center py-12 text-red-400">Error: {error}</p>
            )}
            {!loading && !error && (
              <>
                {activeReport === 'pending' && (
                  <PendingReport rows={rows} clientName={selectedClient.clientName} printRef={printRefs.pending} />
                )}
                {activeReport === 'sold' && (
                  <SoldReport rows={rows} clientName={selectedClient.clientName} printRef={printRefs.sold} />
                )}
                {activeReport === 'unpaid' && (
                  <UnpaidBillsReport bills={bills} clientName={selectedClient.clientName} printRef={printRefs.unpaid} />
                )}
                {activeReport === 'due' && (
                  <DueSummaryReport rows={rows} bills={bills} clientName={selectedClient.clientName} printRef={printRefs.due} />
                )}
                {activeReport === 'history' && (
                  <FullHistoryReport rows={rows} bills={bills} clientName={selectedClient.clientName} printRef={printRefs.history} />
                )}
              </>
            )}
          </div>
        </>
      )}

      {!selectedClient && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-400 text-lg font-semibold">Select a client to view reports</p>
          <p className="text-gray-600 text-sm mt-2">Choose from pending items, sold items, unpaid bills, due summary & full history</p>
        </div>
      )}
    </div>
  )
}