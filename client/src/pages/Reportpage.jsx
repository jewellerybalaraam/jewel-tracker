// ──────────────────────────────────────────────────────────────
// Reports Page — full client + global reporting with PDF / Excel
// ──────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from "react"
import {
  Search, ChevronDown, X, FileDown, FileSpreadsheet, Printer,
  Users, Package, DollarSign, Receipt, Wallet, Activity, ArrowLeft,
} from "lucide-react"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { api } from "../api"

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—"

const dateOnlyKey = (d) => (d ? new Date(d).toISOString().split("T")[0] : "")
const purityToFraction = (p) => {
  const n = parseFloat(p)
  return isNaN(n) || n <= 0 ? 0 : n > 1 ? n / 100 : n
}
const n2 = (v) => parseFloat(parseFloat(v || 0).toFixed(2))
const n3 = (v) => parseFloat(parseFloat(v || 0).toFixed(3))

// derive status label for a bill (Paid / Partial / Unpaid)
const billStatus = (bill) => {
  const paid = (bill.payments || []).reduce((s, p) => s + (p.amount || 0), 0)
  const total = bill.totals?.finalCash || 0
  if (bill.status === "paid" || paid >= total) return "PAID"
  if (paid > 0) return "PARTIAL"
  return "UNPAID"
}
const billPaid = (bill) => (bill.payments || []).reduce((s, p) => s + (p.amount || 0), 0)

// ──────────────────────────────────────────────────────────────
// Excel export
// ──────────────────────────────────────────────────────────────
function exportExcel({ filename, sheets }) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, columns, rows, summary }) => {
    const header = columns.map((c) => c.header)
    const body = rows.map((r) => columns.map((c) => c.accessor(r) ?? ""))
    const aoa = [header, ...body]
    if (summary && summary.length) {
      aoa.push([]) // blank line
      summary.forEach((line) => aoa.push(line))
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    // auto width
    ws["!cols"] = columns.map((c) => ({ wch: Math.max(c.header.length + 2, c.width || 14) }))
    XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31))
  })
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), `${filename}.xlsx`)
}

// ──────────────────────────────────────────────────────────────
// PDF export (uses window.print → user picks "Save as PDF")
// ──────────────────────────────────────────────────────────────
function exportPDF({ title, subtitle, sections, summary }) {
  const sectionHtml = sections
    .map((s) => {
      const head = s.columns
        .map(
          (c) =>
            `<th style="border:1px solid #bbb;padding:6px 8px;background:#f4d4e3;text-align:left;font-size:11px;">${c.header}</th>`,
        )
        .join("")
      const body = s.rows.length
        ? s.rows
            .map((r) => {
              const tds = s.columns
                .map(
                  (c) =>
                    `<td style="border:1px solid #ddd;padding:5px 8px;font-size:11px;vertical-align:top;">${
                      c.accessor(r) ?? ""
                    }</td>`,
                )
                .join("")
              return `<tr>${tds}</tr>`
            })
            .join("")
        : `<tr><td colspan="${s.columns.length}" style="padding:14px;text-align:center;color:#999;font-style:italic;">No records</td></tr>`

      const summaryHtml = (s.summary || [])
        .map(
          (line) =>
            `<div style="margin:2px 0;font-size:12px;"><strong>${line[0]}:</strong> ${line[1]}</div>`,
        )
        .join("")

      return `
        <div style="margin-bottom:22px;page-break-inside:avoid;">
          <h3 style="margin:14px 0 8px;color:#a93672;border-bottom:2px solid #f0b5d0;padding-bottom:4px;">
            ${s.title} <span style="font-size:11px;color:#888;font-weight:normal;">(${s.rows.length})</span>
          </h3>
          <table style="border-collapse:collapse;width:100%;">
            <thead><tr>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
          ${summaryHtml ? `<div style="margin-top:6px;padding:6px 10px;background:#fdf2f8;border-left:3px solid #ec4899;">${summaryHtml}</div>` : ""}
        </div>
      `
    })
    .join("")

  const summaryTop = (summary || [])
    .map(
      (line) =>
        `<div style="display:inline-block;margin-right:18px;font-size:12px;"><strong>${line[0]}:</strong> ${line[1]}</div>`,
    )
    .join("")

  const html = `
    <!doctype html>
    <html><head><title>${title}</title>
    <style>
      @media print { @page { margin: 12mm; size: A4; } }
      body { font-family: Arial, Helvetica, sans-serif; padding: 16px; color:#222; }
      h1 { margin:0 0 4px; font-size:22px; color:#a93672; }
      .meta { color:#666; font-size:12px; margin-bottom:14px; }
      th { background:#f4d4e3 !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .top-summary { background:#fdf2f8; padding:8px 12px; border-radius:6px; margin-bottom:18px; }
      .footer { margin-top:24px; padding-top:8px; border-top:1px solid #ddd; font-size:10px; color:#999; text-align:center; }
    </style>
    </head><body>
      <h1>${title}</h1>
      <div class="meta">${subtitle || ""} · Generated ${new Date().toLocaleString("en-IN")}</div>
      ${summaryTop ? `<div class="top-summary">${summaryTop}</div>` : ""}
      ${sectionHtml}
      <div class="footer">Jewel ERP · Report</div>
      <script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
    </body></html>
  `

  const w = window.open("", "_blank", "width=1000,height=800")
  if (!w) {
    alert("Allow pop-ups to export PDF.")
    return
  }
  w.document.write(html)
  w.document.close()
  w.focus()
}

// ──────────────────────────────────────────────────────────────
// Row builders — convert raw eerettu / wallet / bill data → flat rows
// ──────────────────────────────────────────────────────────────
function buildItemRows(eerettus, statusFilter) {
  const rows = []
  eerettus.forEach((e) => {
    if (e.mode === "barcode") {
      ;(e.items || []).forEach((it) => {
        if (statusFilter && it.status !== statusFilter) return
        rows.push({
          clientName: e.clientName,
          mode: "barcode",
          roughProductName: e.roughProductName,
          productName: it.productName || e.roughProductName,
          barcode: it.barcode,
          wt: it.wt || 0,
          size: it.size || "",
          purity: it.purity || "",
          status: it.status,
          billBookNo: it.billBookNo || "",
          billPageNo: it.billPageNo || "",
          pureDue: it.pureDue || 0,
          cashDue: it.cashDue || 0,
          inDate: e.date,
          soldAt: it.soldAt,
          returnedAt: it.returnedAt,
          billed: !!it.billId,
          pcs: 1,
        })
      })
    } else if (e.mode === "wt" && e.wtMode) {
      const wt = e.wtMode
      if (statusFilter && wt.status !== statusFilter) return
      rows.push({
        clientName: e.clientName,
        mode: "wt",
        roughProductName: e.roughProductName,
        productName: e.roughProductName,
        barcode: "(wt-mode)",
        wt: wt.totalWt || 0,
        size: "",
        purity: wt.purity || "",
        status: wt.status,
        billBookNo: wt.billBookNo || "",
        billPageNo: wt.billPageNo || "",
        pureDue: wt.pureDue || 0,
        cashDue: wt.cashDue || 0,
        inDate: e.date,
        soldAt: wt.soldAt,
        returnedAt: wt.returnedAt,
        billed: !!wt.billId,
        pcs: wt.totalPcs || 0,
        soldPcs: wt.soldPcs || 0,
        soldWt: wt.soldWt || 0,
        returnedPcs: wt.returnedPcs || 0,
        returnedWt: wt.returnedWt || 0,
      })
    }
  })
  return rows
}

// ──────────────────────────────────────────────────────────────
// Column definitions per report
// ──────────────────────────────────────────────────────────────
const COLS = {
  itemsPending: [
    { header: "Date In",     accessor: (r) => fmtDate(r.inDate), width: 14 },
    { header: "Client",      accessor: (r) => r.clientName, width: 18 },
    { header: "Product",     accessor: (r) => r.productName, width: 22 },
    { header: "Mode",        accessor: (r) => r.mode, width: 10 },
    { header: "Barcode",     accessor: (r) => r.barcode, width: 14 },
    { header: "Pcs",         accessor: (r) => r.pcs, width: 6 },
    { header: "Wt (g)",      accessor: (r) => r.wt, width: 10 },
    { header: "Size",        accessor: (r) => r.size, width: 8 },
    { header: "Purity",      accessor: (r) => r.purity, width: 10 },
  ],
  itemsSold: [
    { header: "Date In",     accessor: (r) => fmtDate(r.inDate), width: 14 },
    { header: "Sold At",     accessor: (r) => fmtDateTime(r.soldAt), width: 18 },
    { header: "Client",      accessor: (r) => r.clientName, width: 18 },
    { header: "Product",     accessor: (r) => r.productName, width: 22 },
    { header: "Barcode",     accessor: (r) => r.barcode, width: 14 },
    { header: "Wt (g)",      accessor: (r) => r.wt, width: 10 },
    { header: "Purity",      accessor: (r) => r.purity, width: 8 },
    { header: "Pure Due (g)",accessor: (r) => n3(r.pureDue), width: 12 },
    { header: "Cash Due (₹)",accessor: (r) => n2(r.cashDue), width: 12 },
    { header: "Bill Book/Pg",accessor: (r) => (r.billBookNo || r.billPageNo) ? `${r.billBookNo}/${r.billPageNo}` : "", width: 14 },
    { header: "Billed?",     accessor: (r) => (r.billed ? "Yes" : "No"), width: 8 },
  ],
  itemsReturned: [
    { header: "Date In",     accessor: (r) => fmtDate(r.inDate), width: 14 },
    { header: "Returned At", accessor: (r) => fmtDateTime(r.returnedAt), width: 18 },
    { header: "Client",      accessor: (r) => r.clientName, width: 18 },
    { header: "Product",     accessor: (r) => r.productName, width: 22 },
    { header: "Barcode",     accessor: (r) => r.barcode, width: 14 },
    { header: "Wt (g)",      accessor: (r) => r.wt, width: 10 },
    { header: "Purity",      accessor: (r) => r.purity, width: 8 },
  ],
  bills: [
    { header: "Bill Date",   accessor: (b) => fmtDateTime(b.createdAt), width: 18 },
    { header: "Client",      accessor: (b) => b.clientName, width: 18 },
    { header: "Items",       accessor: (b) => (b.items || []).length, width: 8 },
    { header: "Silver Rate", accessor: (b) => b.silverRate, width: 10 },
    { header: "Pure Net (g)",accessor: (b) => n3(b.totals?.netPure), width: 12 },
    { header: "Tax",         accessor: (b) => (b.taxMode ? `₹${n2(b.totals?.taxAmt)}` : "—"), width: 10 },
    { header: "Final (₹)",   accessor: (b) => n2(b.totals?.finalCash), width: 12 },
    { header: "Paid (₹)",    accessor: (b) => n2(billPaid(b)), width: 12 },
    { header: "Remaining(₹)",accessor: (b) => n2((b.totals?.finalCash || 0) - billPaid(b)), width: 12 },
    { header: "Status",      accessor: (b) => billStatus(b), width: 10 },
    { header: "Payments",    accessor: (b) => (b.payments || []).length, width: 9 },
  ],
  wallet: [
    { header: "Date",    accessor: (w) => fmtDateTime(w.date), width: 18 },
    { header: "Client",  accessor: (w) => w.clientName, width: 18 },
    { header: "Type",    accessor: (w) => w.type, width: 12 },
    { header: "Weight / Cash", accessor: (w) => (w.type === "cash" ? `₹${w.weight}` : `${w.weight} g`), width: 14 },
    { header: "Purity",  accessor: (w) => w.purity || "", width: 8 },
    { header: "Pure (g)",accessor: (w) => (w.type === "cash" ? 0 : n3((w.weight || 0) * purityToFraction(w.purity))), width: 10 },
    { header: "Comment", accessor: (w) => w.comment || "", width: 20 },
    { header: "Billed?", accessor: (w) => (w.billId ? "Yes" : "No"), width: 8 },
  ],
  pendingClients: [
    { header: "Client",       accessor: (r) => r.clientName, width: 22 },
    { header: "Pending Items",accessor: (r) => r.pendingCount, width: 14 },
  ],
  pendingClientSummary: [
    { header: "Client",        accessor: (r) => r.clientName,  width: 24 },
    { header: "Pending Items", accessor: (r) => r.pendingCount, width: 14 },
    { header: "Total Pcs",     accessor: (r) => r.totalPcs,    width: 10 },
    { header: "Total Wt (g)",  accessor: (r) => n3(r.totalWt), width: 12 },
  ],
  outstandingClients: [
    { header: "Client",        accessor: (r) => r.clientName, width: 22 },
    { header: "Bills Unpaid",  accessor: (r) => r.unpaidCount, width: 12 },
    { header: "Bills Partial", accessor: (r) => r.partialCount, width: 12 },
    { header: "Total (₹)",     accessor: (r) => n2(r.totalAmount), width: 14 },
    { header: "Paid (₹)",      accessor: (r) => n2(r.paidAmount), width: 14 },
    { header: "Outstanding (₹)", accessor: (r) => n2(r.outstanding), width: 14 },
  ],
}

// ──────────────────────────────────────────────────────────────
// Date-range filter helper
// ──────────────────────────────────────────────────────────────
function withinRange(dateVal, from, to) {
  if (!from && !to) return true
  const k = dateOnlyKey(dateVal)
  if (!k) return false
  if (from && k < from) return false
  if (to && k > to) return false
  return true
}

// ──────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  { key: "pending",     icon: <Package className="w-5 h-5" />,  label: "Pending Items",   color: "from-yellow-500/20 to-yellow-700/10", border: "border-yellow-500/40", desc: "All PENDING jewelry/items for this client" },
  { key: "sold",        icon: <Receipt className="w-5 h-5" />,  label: "Sold Items",      color: "from-red-500/20 to-red-700/10",        border: "border-red-500/40",    desc: "All SOLD items with dues, bill book/page refs" },
  { key: "returned",    icon: <Activity className="w-5 h-5" />, label: "Returned Items",  color: "from-green-500/20 to-green-700/10",    border: "border-green-500/40",  desc: "All items returned back to client" },
  { key: "bills",       icon: <Receipt className="w-5 h-5" />,  label: "Bills",           color: "from-purple-500/20 to-purple-700/10",  border: "border-purple-500/40", desc: "Filter by Paid / Partially Paid / Unpaid" },
  { key: "dues",        icon: <DollarSign className="w-5 h-5" />, label: "Outstanding Dues", color: "from-pink-500/20 to-pink-700/10",  border: "border-pink-500/40",   desc: "Pure / cash dues + unpaid bill balances" },
  { key: "wallet",      icon: <Wallet className="w-5 h-5" />,   label: "Wallet Statement",color: "from-blue-500/20 to-blue-700/10",      border: "border-blue-500/40",   desc: "Items the client has given (katcha bar / cash / etc.)" },
  { key: "full",        icon: <FileDown className="w-5 h-5" />, label: "Full Statement",  color: "from-orange-500/20 to-orange-700/10",  border: "border-orange-500/40", desc: "Comprehensive ledger — every transaction" },
]

const GLOBAL_REPORTS = [
  { key: "g_pending",        icon: <Users className="w-5 h-5" />,      label: "All Pending Clients",         color: "from-yellow-500/20 to-yellow-700/10", border: "border-yellow-500/40", desc: "Every client with pending items" },
  { key: "g_pending_detail", icon: <Package className="w-5 h-5" />,    label: "Pending Items (Full Detail)",  color: "from-amber-500/20 to-orange-700/10",  border: "border-amber-500/40",  desc: "Full item-level breakdown of all pending jewelry across every client" },
  { key: "g_outstand",       icon: <DollarSign className="w-5 h-5" />, label: "All Outstanding Bills",       color: "from-red-500/20 to-red-700/10",        border: "border-red-500/40",    desc: "Cross-client unpaid + partially paid bills" },
  { key: "g_period",         icon: <Activity className="w-5 h-5" />,   label: "Period Activity",             color: "from-purple-500/20 to-purple-700/10",  border: "border-purple-500/40", desc: "All activity within a chosen date range" },
]

export default function ReportsPage() {
  // ── client picker ──
  const [clients, setClients]               = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientSearch, setClientSearch]     = useState("")
  const [showDropdown, setShowDropdown]     = useState(false)
  const [loading, setLoading]               = useState(false)

  // ── client data ──
  const [eerettus, setEerettus]             = useState([])
  const [walletEntries, setWalletEntries]   = useState([])
  const [bills, setBills]                   = useState([])
  const [dataLoading, setDataLoading]       = useState(false)

  // ── global data ──
  const [allEerettus, setAllEerettus]       = useState([])
  const [allBills, setAllBills]             = useState([])
  const [globalLoading, setGlobalLoading]   = useState(false)

  // ── report viewer state ──
  const [activeReport, setActiveReport]     = useState(null)   // key
  const [scope, setScope]                   = useState(null)   // "client" | "global"
  const [billFilter, setBillFilter]         = useState("ALL")  // ALL / PAID / PARTIAL / UNPAID
  const [fromDate, setFromDate]             = useState("")
  const [toDate, setToDate]                 = useState("")

  // ── fetchers (declared before effects to avoid hoisting issues) ──
  const fetchClients = async () => {
    try {
      setLoading(true)
      const res = await api.get("/clients")
      setClients(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      console.error("Clients fetch failed:", err)
      setClients([])
    } finally { setLoading(false) }
  }

  const fetchClientData = async (clientName) => {
    try {
      setDataLoading(true)
      const [eRes, wRes, bRes] = await Promise.all([
        api.get(`/eerettu/by-client/${encodeURIComponent(clientName)}`),
        api.get(`/wallet/by-client/${encodeURIComponent(clientName)}`),
        api.get(`/bills/by-client/${encodeURIComponent(clientName)}`),
      ])
      setEerettus(eRes.data || [])
      setWalletEntries(wRes.data || [])
      setBills(bRes.data || [])
    } catch (err) {
      console.error("Client data fetch failed:", err)
    } finally { setDataLoading(false) }
  }

  // ── fetch clients on mount ──
  useEffect(() => { fetchClients() }, [])

  // ── fetch client-specific data when a client is selected ──
  useEffect(() => {
    if (!selectedClient?.clientName) return
    fetchClientData(selectedClient.clientName)
  }, [selectedClient])

  // ── fetch global data lazily ──
  const ensureGlobalData = async () => {
    if (allEerettus.length || allBills.length) return
    try {
      setGlobalLoading(true)
      const [eRes, allBillRes] = await Promise.all([
        api.get("/eerettu"),
        // bills endpoint has no "all" — gather via clients
        loadAllBills(),
      ])
      setAllEerettus(eRes.data || [])
      setAllBills(allBillRes || [])
    } catch (err) {
      console.error("Global fetch failed:", err)
    } finally { setGlobalLoading(false) }
  }

  // helper: fetch bills for every client (server has no /bills root endpoint)
  const loadAllBills = async () => {
    const cRes = await api.get("/clients")
    const list = Array.isArray(cRes.data) ? cRes.data : []
    const all = []
    // run in batches of 8 to be polite
    for (let i = 0; i < list.length; i += 8) {
      const chunk = list.slice(i, i + 8)
      const results = await Promise.all(
        chunk.map((c) =>
          api.get(`/bills/by-client/${encodeURIComponent(c.clientName)}`).then((r) => r.data).catch(() => []),
        ),
      )
      results.forEach((arr) => all.push(...arr))
    }
    return all
  }

  // ── filtered client list ──
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => {
      const name = c?.clientName || ""
      const phone = c?.phone || c?.mobiles?.[0] || (c?.mobiles || []).join(" ")
      return name.toLowerCase().includes(q) || String(phone).toLowerCase().includes(q)
    })
  }, [clients, clientSearch])

  // ── build report dataset ──
  const reportData = useMemo(() => {
    if (!activeReport) return null

    // -------- GLOBAL REPORTS --------
    if (scope === "global") {
      if (activeReport === "g_pending") {
        const map = {}
        allEerettus.forEach((e) => {
          let count = 0
          if (e.mode === "barcode") count = (e.items || []).filter((i) => i.status === "PENDING").length
          else if (e.mode === "wt" && e.wtMode?.status === "PENDING") count = e.wtMode.totalPcs || 0
          if (count > 0) map[e.clientName] = (map[e.clientName] || 0) + count
        })
        const rows = Object.entries(map)
          .map(([clientName, pendingCount]) => ({ clientName, pendingCount }))
          .sort((a, b) => b.pendingCount - a.pendingCount)
        return {
          title: "All Pending Clients",
          subtitle: "Clients with at least one pending item",
          sections: [{ title: "Pending Clients", columns: COLS.pendingClients, rows, summary: [["Total Clients", rows.length], ["Total Pending Items", rows.reduce((s, r) => s + r.pendingCount, 0)]] }],
          summary: [["Clients", rows.length], ["Items", rows.reduce((s, r) => s + r.pendingCount, 0)]],
        }
      }

      if (activeReport === "g_pending_detail") {
        // All pending item rows, sorted by client then date
        const allPendingRows = buildItemRows(allEerettus, "PENDING")
          .sort((a, b) => a.clientName.localeCompare(b.clientName) || new Date(a.inDate) - new Date(b.inDate))

        // Per-client summary
        const clientMap = {}
        allPendingRows.forEach((r) => {
          if (!clientMap[r.clientName]) clientMap[r.clientName] = { clientName: r.clientName, pendingCount: 0, totalPcs: 0, totalWt: 0 }
          clientMap[r.clientName].pendingCount += 1
          clientMap[r.clientName].totalPcs     += r.pcs || 1
          clientMap[r.clientName].totalWt      += r.wt  || 0
        })
        const summaryRows = Object.values(clientMap).sort((a, b) => b.pendingCount - a.pendingCount)

        const totalClients = summaryRows.length
        const totalItems   = allPendingRows.length
        const totalPcs     = allPendingRows.reduce((s, r) => s + (r.pcs || 1), 0)
        const totalWt      = allPendingRows.reduce((s, r) => s + (r.wt  || 0), 0)

        return {
          title: "All Pending Clients — Full Detail",
          subtitle: "Every pending item across all clients with complete item details",
          sections: [
            {
              title: "Client Summary",
              columns: COLS.pendingClientSummary,
              rows: summaryRows,
              summary: [
                ["Total Clients",      totalClients],
                ["Total Pending Items", totalItems],
                ["Total Pcs",          totalPcs],
                ["Total Wt (g)",       n3(totalWt)],
              ],
            },
            {
              title: "All Pending Items (Item-wise Detail)",
              columns: COLS.itemsPending,
              rows: allPendingRows,
              summary: [
                ["Items", totalItems],
                ["Pcs",   totalPcs],
                ["Wt (g)", n3(totalWt)],
              ],
            },
          ],
          summary: [
            ["Clients",       totalClients],
            ["Pending Items", totalItems],
            ["Total Pcs",     totalPcs],
            ["Total Wt (g)",  n3(totalWt)],
          ],
        }
      }

      if (activeReport === "g_outstand") {
        const byClient = {}
        allBills.forEach((b) => {
          if (!withinRange(b.createdAt, fromDate, toDate)) return
          const st = billStatus(b)
          if (st === "PAID") return
          const c = b.clientName
          if (!byClient[c]) byClient[c] = { clientName: c, unpaidCount: 0, partialCount: 0, totalAmount: 0, paidAmount: 0, outstanding: 0 }
          const o = byClient[c]
          if (st === "UNPAID") o.unpaidCount += 1
          if (st === "PARTIAL") o.partialCount += 1
          o.totalAmount  += b.totals?.finalCash || 0
          o.paidAmount   += billPaid(b)
          o.outstanding  += (b.totals?.finalCash || 0) - billPaid(b)
        })
        const rows = Object.values(byClient).sort((a, b) => b.outstanding - a.outstanding)
        const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0)
        return {
          title: "All Outstanding Bills",
          subtitle: `Across every client${fromDate || toDate ? ` · ${fromDate || "…"} → ${toDate || "…"}` : ""}`,
          sections: [{ title: "Outstanding Summary", columns: COLS.outstandingClients, rows, summary: [["Total Outstanding (₹)", n2(totalOutstanding)]] }],
          summary: [["Clients with Dues", rows.length], ["Total Outstanding", `₹${n2(totalOutstanding)}`]],
        }
      }

      if (activeReport === "g_period") {
        const itemRows = buildItemRows(allEerettus).filter((r) => withinRange(r.inDate, fromDate, toDate))
        const periodBills = allBills.filter((b) => withinRange(b.createdAt, fromDate, toDate))
        return {
          title: "Period Activity",
          subtitle: `${fromDate || "beginning"} → ${toDate || "now"}`,
          sections: [
            { title: "Items Recorded",  columns: COLS.itemsPending, rows: itemRows.filter((r) => r.status === "PENDING"),  summary: [["Pending Items", itemRows.filter((r) => r.status === "PENDING").length]] },
            { title: "Items Sold",      columns: COLS.itemsSold,    rows: itemRows.filter((r) => r.status === "SOLD"),     summary: [["Sold Items", itemRows.filter((r) => r.status === "SOLD").length]] },
            { title: "Items Returned",  columns: COLS.itemsReturned,rows: itemRows.filter((r) => r.status === "RETURNED"), summary: [["Returned Items", itemRows.filter((r) => r.status === "RETURNED").length]] },
            { title: "Bills Created",   columns: COLS.bills,        rows: periodBills,                                     summary: [["Total Bills", periodBills.length], ["Total Value (₹)", n2(periodBills.reduce((s, b) => s + (b.totals?.finalCash || 0), 0))]] },
          ],
          summary: [["Date Range", `${fromDate || "—"} → ${toDate || "—"}`], ["Items", itemRows.length], ["Bills", periodBills.length]],
        }
      }
    }

    // -------- CLIENT REPORTS --------
    if (scope !== "client" || !selectedClient) return null
    const cname = selectedClient.clientName

    if (activeReport === "pending") {
      const rows = buildItemRows(eerettus, "PENDING").filter((r) => withinRange(r.inDate, fromDate, toDate))
      return {
        title: `Pending Items — ${cname}`,
        subtitle: `All items still pending${fromDate || toDate ? ` · ${fromDate || "…"} → ${toDate || "…"}` : ""}`,
        sections: [{
          title: "Pending Items",
          columns: COLS.itemsPending,
          rows,
          summary: [
            ["Total Items", rows.length],
            ["Total Pcs",   rows.reduce((s, r) => s + (r.pcs || 1), 0)],
            ["Total Wt (g)", n3(rows.reduce((s, r) => s + (r.wt || 0), 0))],
          ],
        }],
        summary: [["Client", cname], ["Pending Items", rows.length]],
      }
    }

    if (activeReport === "sold") {
      const rows = buildItemRows(eerettus, "SOLD").filter((r) => withinRange(r.soldAt || r.inDate, fromDate, toDate))
      const pureDue = rows.reduce((s, r) => s + (r.pureDue || 0), 0)
      const cashDue = rows.reduce((s, r) => s + (r.cashDue || 0), 0)
      return {
        title: `Sold Items — ${cname}`,
        subtitle: `All SOLD items${fromDate || toDate ? ` · ${fromDate || "…"} → ${toDate || "…"}` : ""}`,
        sections: [{
          title: "Sold Items",
          columns: COLS.itemsSold,
          rows,
          summary: [
            ["Total Items", rows.length],
            ["Total Wt (g)", n3(rows.reduce((s, r) => s + (r.wt || 0), 0))],
            ["Total Pure Due (g)", n3(pureDue)],
            ["Total Cash Due (₹)", n2(cashDue)],
          ],
        }],
        summary: [["Client", cname], ["Items Sold", rows.length], ["Pure Due", `${n3(pureDue)} g`], ["Cash Due", `₹${n2(cashDue)}`]],
      }
    }

    if (activeReport === "returned") {
      const rows = buildItemRows(eerettus, "RETURNED").filter((r) => withinRange(r.returnedAt || r.inDate, fromDate, toDate))
      return {
        title: `Returned Items — ${cname}`,
        subtitle: "All items returned to client",
        sections: [{
          title: "Returned Items",
          columns: COLS.itemsReturned,
          rows,
          summary: [["Total Items", rows.length], ["Total Wt (g)", n3(rows.reduce((s, r) => s + (r.wt || 0), 0))]],
        }],
        summary: [["Client", cname], ["Items Returned", rows.length]],
      }
    }

    if (activeReport === "bills") {
      let rows = bills.filter((b) => withinRange(b.createdAt, fromDate, toDate))
      if (billFilter !== "ALL") rows = rows.filter((b) => billStatus(b) === billFilter)
      const totalAmt = rows.reduce((s, b) => s + (b.totals?.finalCash || 0), 0)
      const paid     = rows.reduce((s, b) => s + billPaid(b), 0)
      const out      = totalAmt - paid
      return {
        title: `Bills — ${cname}`,
        subtitle: `Filter: ${billFilter}${fromDate || toDate ? ` · ${fromDate || "…"} → ${toDate || "…"}` : ""}`,
        sections: [{
          title: `Bills (${billFilter})`,
          columns: COLS.bills,
          rows,
          summary: [
            ["Total Bills", rows.length],
            ["Total Value (₹)", n2(totalAmt)],
            ["Total Paid (₹)", n2(paid)],
            ["Outstanding (₹)", n2(out)],
          ],
        }],
        summary: [["Client", cname], ["Status", billFilter], ["Bills", rows.length], ["Outstanding", `₹${n2(out)}`]],
      }
    }

    if (activeReport === "dues") {
      const soldRows = buildItemRows(eerettus, "SOLD")
      const pureDueRaw = soldRows.reduce((s, r) => s + (r.pureDue || 0), 0)
      const cashDueRaw = soldRows.reduce((s, r) => s + (r.cashDue || 0), 0)
      const walletPure = walletEntries.reduce((s, w) => w.type === "cash" ? s : s + (w.weight || 0) * purityToFraction(w.purity), 0)
      const walletCash = walletEntries.reduce((s, w) => w.type === "cash" ? s + (w.weight || 0) : s, 0)
      const unpaidBills = bills.filter((b) => billStatus(b) !== "PAID")
      const billOutstanding = unpaidBills.reduce((s, b) => s + ((b.totals?.finalCash || 0) - billPaid(b)), 0)
      const pureNet = n3(pureDueRaw - walletPure)
      const cashNet = n2(cashDueRaw - walletCash)

      return {
        title: `Outstanding Dues — ${cname}`,
        subtitle: "Complete dues breakdown",
        sections: [
          { title: "Sold Items With Dues", columns: COLS.itemsSold,  rows: soldRows.filter((r) => (r.pureDue || 0) > 0 || (r.cashDue || 0) > 0), summary: [["Item Pure Due (g)", n3(pureDueRaw)], ["Item Cash Due (₹)", n2(cashDueRaw)]] },
          { title: "Wallet (offset)",      columns: COLS.wallet,     rows: walletEntries,                                                       summary: [["Wallet Pure (g)", n3(walletPure)], ["Wallet Cash (₹)", n2(walletCash)]] },
          { title: "Unpaid / Partial Bills", columns: COLS.bills,    rows: unpaidBills,                                                         summary: [["Bills Outstanding (₹)", n2(billOutstanding)]] },
        ],
        summary: [
          ["Net Pure Due (g)", pureNet],
          ["Net Cash Due (₹)", `₹${cashNet}`],
          ["Bills Outstanding (₹)", `₹${n2(billOutstanding)}`],
          ["Grand Total Cash Liability (₹)", `₹${n2(cashNet + billOutstanding)}`],
        ],
      }
    }

    if (activeReport === "wallet") {
      const rows = walletEntries.filter((w) => withinRange(w.date, fromDate, toDate))
      const pure = rows.reduce((s, w) => w.type === "cash" ? s : s + (w.weight || 0) * purityToFraction(w.purity), 0)
      const cash = rows.reduce((s, w) => w.type === "cash" ? s + (w.weight || 0) : s, 0)
      return {
        title: `Wallet Statement — ${cname}`,
        subtitle: "Items client has given",
        sections: [{
          title: "Wallet Entries",
          columns: COLS.wallet,
          rows,
          summary: [["Total Pure (g)", n3(pure)], ["Total Cash (₹)", n2(cash)]],
        }],
        summary: [["Client", cname], ["Entries", rows.length]],
      }
    }

    if (activeReport === "full") {
      const pending  = buildItemRows(eerettus, "PENDING")
      const sold     = buildItemRows(eerettus, "SOLD")
      const returned = buildItemRows(eerettus, "RETURNED")
      return {
        title: `Full Statement — ${cname}`,
        subtitle: "Comprehensive ledger for this client",
        sections: [
          { title: "Pending Items",  columns: COLS.itemsPending, rows: pending,  summary: [["Count", pending.length],  ["Wt (g)", n3(pending.reduce((s, r) => s + (r.wt || 0), 0))]] },
          { title: "Sold Items",     columns: COLS.itemsSold,    rows: sold,     summary: [["Count", sold.length],     ["Pure Due (g)", n3(sold.reduce((s, r) => s + (r.pureDue || 0), 0))], ["Cash Due (₹)", n2(sold.reduce((s, r) => s + (r.cashDue || 0), 0))]] },
          { title: "Returned Items", columns: COLS.itemsReturned,rows: returned, summary: [["Count", returned.length]] },
          { title: "Wallet Entries", columns: COLS.wallet,       rows: walletEntries, summary: [["Entries", walletEntries.length]] },
          { title: "Bills",          columns: COLS.bills,        rows: bills,    summary: [["Total Bills", bills.length], ["Outstanding (₹)", n2(bills.reduce((s, b) => s + ((b.totals?.finalCash || 0) - billPaid(b)), 0))]] },
        ],
        summary: [["Client", cname]],
      }
    }

    return null
  }, [activeReport, scope, eerettus, walletEntries, bills, allEerettus, allBills, selectedClient, billFilter, fromDate, toDate])

  // ── handlers ──
  const openClientReport = (key) => {
    if (!selectedClient) return alert("Select a client first")
    setScope("client"); setActiveReport(key); setBillFilter("ALL"); setFromDate(""); setToDate("")
  }
  const openGlobalReport = async (key) => {
    await ensureGlobalData()
    setScope("global"); setActiveReport(key); setBillFilter("ALL"); setFromDate(""); setToDate("")
  }
  const closeReport = () => { setActiveReport(null); setScope(null) }

  const handleExportExcel = () => {
    if (!reportData) return
    const safe = (s) => s.replace(/[^a-z0-9_-]+/gi, "_").substring(0, 60)
    exportExcel({
      filename: safe(reportData.title) + "_" + new Date().toISOString().split("T")[0],
      sheets: reportData.sections.map((s) => ({ name: s.title, columns: s.columns, rows: s.rows, summary: s.summary })),
    })
  }
  const handleExportPDF = () => {
    if (!reportData) return
    exportPDF(reportData)
  }

  // ──────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-4 sm:p-6">
      <div className="max-w-7xl mx-auto rounded-3xl border border-white/10 bg-[#161922] p-6 sm:p-8">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
              Reports
            </h1>
            <p className="text-gray-400 mt-2">
              Per-client reports · cross-client summaries · PDF + Excel export
            </p>
          </div>
          {activeReport && (
            <button onClick={closeReport} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-sm font-bold border border-white/10">
              <ArrowLeft className="w-4 h-4" /> Back to Reports
            </button>
          )}
        </div>

        {/* ────────────── REPORT VIEWER ────────────── */}
        {activeReport && reportData && (
          <ReportViewer
            data={reportData}
            billFilter={billFilter}
            setBillFilter={setBillFilter}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            showBillFilter={activeReport === "bills"}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
          />
        )}

        {/* ────────────── PICKER VIEW ────────────── */}
        {!activeReport && (
          <>
            {/* CLIENT SELECTOR */}
            <div className="mt-8 bg-[#20232d] rounded-3xl p-5 sm:p-6 border border-white/10 relative">
              <label className="block text-xs text-gray-400 mb-3 tracking-wider font-bold uppercase">
                Select a Client (for client-specific reports)
              </label>
              <div className="relative">
                <div className="flex items-center bg-[#2a2d37] border border-pink-500 rounded-2xl px-4 py-3.5">
                  <Search className="w-5 h-5 text-gray-400 mr-3" />
                  <input
                    type="text"
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search client name or phone"
                    className="bg-transparent outline-none flex-1 text-white"
                  />
                  {(clientSearch || selectedClient) && (
                    <button
                      onClick={() => { setClientSearch(""); setSelectedClient(null) }}
                      className="mr-2"
                    >
                      <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
                  )}
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </div>

                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#2a2d37] border border-white/10 rounded-2xl overflow-hidden z-50 max-h-80 overflow-y-auto shadow-2xl">
                    {loading ? (
                      <div className="p-4 text-gray-400">Loading clients...</div>
                    ) : filteredClients.length === 0 ? (
                      <div className="p-4 text-gray-400">No clients found</div>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c._id}
                          onClick={() => { setSelectedClient(c); setClientSearch(c.clientName || ""); setShowDropdown(false) }}
                          className="w-full text-left px-4 py-3 hover:bg-[#3a3e4d] border-b border-white/5"
                        >
                          <div className="font-medium text-white">{c.clientName || "Unnamed Client"}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {(c.mobiles || []).join(" · ") || c.phone || "No phone"}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {selectedClient && !showDropdown && (
                <div className="mt-4 flex items-center gap-3 bg-pink-500/10 border border-pink-500/30 rounded-2xl p-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center font-bold">
                    {(selectedClient.clientName || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-pink-200">{selectedClient.clientName}</p>
                    <p className="text-xs text-gray-400">{(selectedClient.mobiles || []).join(" · ") || "No phone"}</p>
                  </div>
                  {dataLoading && <span className="text-xs text-gray-400">Loading…</span>}
                </div>
              )}
            </div>

            {/* CLIENT REPORTS GRID */}
            <h2 className="text-xl font-bold mt-10 mb-4 text-white">
              Client-Specific Reports
              {!selectedClient && <span className="text-sm text-gray-500 font-normal ml-2">— select a client to enable</span>}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {REPORT_TYPES.map((r) => (
                <button
                  key={r.key}
                  disabled={!selectedClient}
                  onClick={() => openClientReport(r.key)}
                  className={`bg-gradient-to-br ${r.color} border ${r.border} rounded-2xl p-5 text-left transition-all hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-white/10">{r.icon}</div>
                    <h3 className="font-bold text-white">{r.label}</h3>
                  </div>
                  <p className="text-xs text-gray-300">{r.desc}</p>
                </button>
              ))}
            </div>

            {/* GLOBAL REPORTS */}
            <h2 className="text-xl font-bold mt-10 mb-4 text-white">Global / Cross-Client Reports</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GLOBAL_REPORTS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => openGlobalReport(r.key)}
                  className={`bg-gradient-to-br ${r.color} border ${r.border} rounded-2xl p-5 text-left transition-all hover:scale-[1.02]`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-white/10">{r.icon}</div>
                    <h3 className="font-bold text-white">{r.label}</h3>
                  </div>
                  <p className="text-xs text-gray-300">{r.desc}</p>
                </button>
              ))}
            </div>
            {globalLoading && (
              <p className="text-center text-gray-400 mt-4 text-sm">Loading global data…</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Report Viewer component
// ──────────────────────────────────────────────────────────────
function ReportViewer({
  data, billFilter, setBillFilter, fromDate, setFromDate, toDate, setToDate,
  showBillFilter, onExportExcel, onExportPDF,
}) {
  const inp = "p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm"

  return (
    <div className="mt-6 space-y-5">

      {/* TOP CARD */}
      <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-3xl p-5 sm:p-6">
        <h2 className="text-2xl sm:text-3xl font-black text-white">{data.title}</h2>
        <p className="text-sm text-gray-300 mt-1">{data.subtitle}</p>

        {/* summary chips */}
        {data.summary && data.summary.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {data.summary.map(([k, v], i) => (
              <div key={i} className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
                <span className="text-gray-400">{k}:</span>{" "}
                <span className="text-white font-bold">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONTROLS */}
      <div className="flex flex-wrap gap-3 items-center bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex flex-wrap gap-2 flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inp} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inp} />
          </div>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(""); setToDate("") }} className="text-xs px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300">
              Clear dates
            </button>
          )}

          {showBillFilter && (
            <select value={billFilter} onChange={(e) => setBillFilter(e.target.value)} className={inp}>
              <option value="ALL">All Bills</option>
              <option value="PAID">Paid Only</option>
              <option value="PARTIAL">Partially Paid</option>
              <option value="UNPAID">Unpaid Only</option>
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={onExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 font-bold text-sm"
          >
            <Printer className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {/* SECTIONS */}
      {data.sections.map((s, idx) => (
        <SectionTable key={idx} section={s} />
      ))}
    </div>
  )
}

function SectionTable({ section }) {
  const { title, columns, rows, summary } = section
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 bg-white/5 hover:bg-white/10 flex items-center justify-between"
      >
        <h3 className="font-bold text-pink-300">
          {title} <span className="text-xs text-gray-500 ml-2">({rows.length})</span>
        </h3>
        <span className="text-gray-400 text-sm">{open ? "▼" : "▶"}</span>
      </button>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/30 border-b border-white/10">
                {columns.map((c, i) => (
                  <th key={i} className="px-3 py-2.5 text-left text-xs font-bold text-pink-200 uppercase tracking-wider whitespace-nowrap">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-500 italic">
                    No records
                  </td>
                </tr>
              ) : (
                rows.map((r, ri) => (
                  <tr key={ri} className="border-b border-white/5 hover:bg-white/5">
                    {columns.map((c, ci) => (
                      <td key={ci} className="px-3 py-2 text-gray-200 whitespace-nowrap">
                        {c.accessor(r) ?? ""}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && summary && summary.length > 0 && (
        <div className="px-5 py-3 bg-pink-500/10 border-t border-pink-500/20 flex flex-wrap gap-3">
          {summary.map(([k, v], i) => (
            <div key={i} className="text-xs">
              <span className="text-gray-400">{k}:</span>{" "}
              <span className="text-pink-200 font-bold">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}