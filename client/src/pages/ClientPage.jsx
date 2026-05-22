import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

// ── helpers ─────────────────────────────────────────────────
const dateOnlyKey = (d) => (d ? new Date(d).toISOString().split('T')[0] : '')
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—'
const toLocalInput = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  const off = dt.getTimezoneOffset()
  const local = new Date(dt.getTime() - off * 60_000)
  return local.toISOString().slice(0, 16)
}
const purityToFraction = (p) => {
  const n = parseFloat(p)
  if (isNaN(n) || n <= 0) return 0
  return n > 1 ? n / 100 : n
}

// flatten eerettus into per-tab rows
function buildRows(eerettus) {
  const rows = []
  eerettus.forEach((e) => {
    if (e.mode === 'barcode') {
      (e.items || []).forEach((item) => {
        rows.push({
          kind:         'barcode',
          eerettuId:    e._id,
          status:       item.status,
          barcode:      item.barcode,
          wt:           item.wt,
          size:         item.size,
          purity:       item.purity,
          productName:  item.productName || e.roughProductName,
          roughProduct: e.roughProductName,
          createdAt:    e.date,
          soldAt:       item.soldAt,
          returnedAt:   item.returnedAt,
          pureDue:      item.pureDue || 0,
          cashDue:      item.cashDue || 0,
          billBookNo:   item.billBookNo,
          billPageNo:   item.billPageNo,
          dateKey:      dateOnlyKey(e.date),
        })
      })
    } else if (e.mode === 'wt') {
      const wt = e.wtMode || {}
      rows.push({
        kind:         'wt',
        eerettuId:    e._id,
        status:       wt.status,
        totalPcs:     wt.totalPcs,
        totalWt:      wt.totalWt,
        returnedPcs:  wt.returnedPcs,
        returnedWt:   wt.returnedWt,
        soldPcs:      wt.soldPcs,
        soldWt:       wt.soldWt,
        purity:       wt.purity,
        roughProduct: e.roughProductName,
        productName:  e.roughProductName,
        createdAt:    e.date,
        soldAt:       wt.soldAt,
        returnedAt:   wt.returnedAt,
        pureDue:      wt.pureDue || 0,
        cashDue:      wt.cashDue || 0,
        billBookNo:   wt.billBookNo,
        billPageNo:   wt.billPageNo,
        dateKey:      dateOnlyKey(e.date),
      })
    }
  })
  return rows
}

// group barcode rows by (productName, dateKey); wt rows stand alone
function groupRowsForTab(rows) {
  const groups = []
  const map = {}
  rows.forEach((r) => {
    if (r.kind === 'wt') {
      groups.push({ kind: 'wt-single', key: `wt_${r.eerettuId}`, row: r })
    } else {
      const key = `bc_${r.productName}_${r.dateKey}`
      if (!map[key]) {
        const g = {
          kind: 'bc-group',
          key,
          productName: r.productName,
          dateKey: r.dateKey,
          createdAt: r.createdAt,
          items: [],
        }
        map[key] = g
        groups.push(g)
      }
      map[key].items.push(r)
    }
  })
  return groups.sort((a, b) => {
    const da = a.kind === 'wt-single' ? a.row.createdAt : a.createdAt
    const db = b.kind === 'wt-single' ? b.row.createdAt : b.createdAt
    return new Date(db) - new Date(da)
  })
}

// ── inline editable text ────────────────────────────────────
function InlineEdit({ value, label, type = 'text', onSave, placeholder = '' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value ?? '')
  // Only sync external `value` -> `val` when not actively editing,
  // so a sibling refresh doesn't clobber the user's in-progress text.
  useEffect(() => { if (!editing) setVal(value ?? '') }, [value, editing])

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
      >
        {label}: <span className="text-pink-300 font-semibold">{value || placeholder || '—'}</span>
      </button>
    )
  }
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400">{label}:</span>
      <input
        type={type}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-24 p-1.5 rounded-lg bg-white/10 border border-pink-400 text-white text-xs outline-none"
      />
      <button
        onClick={() => { onSave(val); setEditing(false) }}
        className="text-xs px-2 py-1 rounded-lg bg-green-500 text-white font-bold"
      >
        ✓
      </button>
      <button
        onClick={() => { setVal(value ?? ''); setEditing(false) }}
        className="text-xs px-2 py-1 rounded-lg bg-white/10 text-gray-400"
      >
        ✕
      </button>
    </div>
  )
}

// ── status change form (for pending tab) ────────────────────
function StatusChangeForm({ row, onClose, onApply }) {
  const isWt = row.kind === 'wt'
  const [target, setTarget] = useState('')
  const [retPcs, setRetPcs] = useState('')
  const [retWt, setRetWt]   = useState('')
  const [pureDue, setPureDue] = useState(row.pureDue || '')
  const [cashDue, setCashDue] = useState(row.cashDue || '')
  const [bookNo, setBookNo]   = useState(row.billBookNo || '')
  const [pageNo, setPageNo]   = useState(row.billPageNo || '')
  const [whenAt, setWhenAt]   = useState(toLocalInput(new Date()))

  if (!target) {
    return (
      <div className="flex gap-2 mt-2">
        <button onClick={() => setTarget('RETURNED')}
          className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold">
          Mark Returned
        </button>
        <button onClick={() => setTarget('SOLD')}
          className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold">
          Mark Sold
        </button>
        <button onClick={onClose}
          className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-400 text-xs">
          Cancel
        </button>
      </div>
    )
  }

  const submit = () => {
    const payload = { status: target }
    if (target === 'SOLD') {
      payload.soldAt   = new Date(whenAt).toISOString()
      payload.pureDue  = parseFloat(pureDue) || 0
      payload.cashDue  = parseFloat(cashDue) || 0
      payload.billBookNo = bookNo
      payload.billPageNo = pageNo
      if (isWt) {
        payload.returnedPcs = parseFloat(retPcs) || 0
        payload.returnedWt  = parseFloat(retWt) || 0
      }
    } else if (target === 'RETURNED') {
      payload.returnedAt = new Date(whenAt).toISOString()
      if (isWt) {
        if (retPcs !== '') payload.returnedPcs = parseFloat(retPcs) || 0
        if (retWt  !== '') payload.returnedWt  = parseFloat(retWt)  || 0
      }
    }
    onApply(payload)
  }

  const inp = 'w-full p-2 rounded-xl bg-white/10 border border-pink-400 text-white text-sm outline-none'

  return (
    <div className="bg-black/30 rounded-2xl p-4 space-y-3 mt-2">
      <p className="text-xs font-bold text-pink-300">
        {target === 'RETURNED' ? 'Confirm Return' : 'Confirm Sale'}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-400 mb-1">{target === 'RETURNED' ? 'Returned at' : 'Sold at'}</p>
          <input type="datetime-local" value={whenAt} onChange={e => setWhenAt(e.target.value)} className={inp} />
        </div>

        {isWt && (target === 'SOLD' || target === 'RETURNED') && (
          <>
            <div>
              <p className="text-xs text-gray-400 mb-1">Returned pcs</p>
              <input type="number" value={retPcs} onChange={e => setRetPcs(e.target.value)} className={inp} placeholder={target === 'RETURNED' ? String(row.totalPcs ?? 0) : '0'} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Returned wt (g)</p>
              <input type="number" value={retWt} onChange={e => setRetWt(e.target.value)} className={inp} placeholder={target === 'RETURNED' ? String(row.totalWt ?? 0) : '0'} />
            </div>
          </>
        )}

        {target === 'SOLD' && (
          <>
            <div>
              <p className="text-xs text-gray-400 mb-1">Pure due (g)</p>
              <input type="number" value={pureDue} onChange={e => setPureDue(e.target.value)} className={inp} placeholder="0" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Cash due (₹)</p>
              <input type="number" value={cashDue} onChange={e => setCashDue(e.target.value)} className={inp} placeholder="0" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Bill book</p>
              <input value={bookNo} onChange={e => setBookNo(e.target.value)} className={inp} placeholder="Book" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Bill page</p>
              <input value={pageNo} onChange={e => setPageNo(e.target.value)} className={inp} placeholder="Page" />
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={submit} className="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 rounded-xl text-sm font-bold">
          Confirm
        </button>
        <button onClick={() => setTarget('')} className="bg-white/10 px-4 py-2 rounded-xl text-sm text-gray-400">
          Back
        </button>
      </div>
    </div>
  )
}

// ── single barcode item card ────────────────────────────────
function BarcodeItemCard({ row, tab, onUpdate, onCheckout, isCheckedOut }) {
  const [showForm, setShowForm] = useState(false)
  const isPending = tab === 'pending'

  const patch = (payload) => {
    onUpdate({
      kind: 'barcode',
      eerettuId: row.eerettuId,
      barcode: row.barcode,
      payload,
    })
    setShowForm(false)
  }

  return (
    <div className="bg-black/40 rounded-2xl p-3 space-y-2 border border-white/5">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-white">{row.barcode}</span>
          {row.wt > 0 && <span className="text-gray-400">{row.wt} g</span>}
          {row.size && <span className="text-gray-400">Size {row.size}</span>}
        </div>
        {tab === 'sold' && (
          <button
            title={isCheckedOut ? 'Remove from checkout' : 'Send to checkout'}
            onClick={onCheckout}
            className={`${isCheckedOut ? 'bg-red-500' : 'bg-pink-500'} text-white text-xs px-2 py-1 rounded-lg font-bold`}
          >
            {isCheckedOut ? '✕' : '🛒'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
        <span className="bg-white/5 px-2 py-0.5 rounded-lg">In: {fmtDateTime(row.createdAt)}</span>
        {tab === 'sold' && row.soldAt && <span className="bg-white/5 px-2 py-0.5 rounded-lg">Sold: {fmtDateTime(row.soldAt)}</span>}
        {tab === 'returned' && row.returnedAt && <span className="bg-white/5 px-2 py-0.5 rounded-lg">Returned: {fmtDateTime(row.returnedAt)}</span>}
      </div>

      {(tab === 'sold' || tab === 'returned') && (
        <div className="flex flex-wrap gap-2">
          <InlineEdit
            label="Purity"
            value={row.purity}
            onSave={(v) => patch({ purity: v })}
          />
          {tab === 'sold' && (
            <>
              <InlineEdit label="Pure due (g)" type="number" value={row.pureDue}
                onSave={(v) => patch({ pureDue: v })} />
              <InlineEdit label="Cash due (₹)" type="number" value={row.cashDue}
                onSave={(v) => patch({ cashDue: v })} />
              <InlineEdit label="Sold at" type="datetime-local"
                value={toLocalInput(row.soldAt)}
                onSave={(v) => patch({ soldAt: new Date(v).toISOString() })} />
            </>
          )}
          {tab === 'returned' && (
            <InlineEdit label="Returned at" type="datetime-local"
              value={toLocalInput(row.returnedAt)}
              onSave={(v) => patch({ returnedAt: new Date(v).toISOString() })} />
          )}
        </div>
      )}

      {isPending && (
        <>
          {!showForm
            ? <button onClick={() => setShowForm(true)} className="text-xs text-pink-400 hover:text-pink-300 font-bold">Change status →</button>
            : <StatusChangeForm row={row} onClose={() => setShowForm(false)} onApply={patch} />}
        </>
      )}
    </div>
  )
}

// ── wt-mode card ────────────────────────────────────────────
function WtItemCard({ row, tab, onUpdate, onCheckout, isCheckedOut }) {
  const [showForm, setShowForm] = useState(false)
  const isPending = tab === 'pending'

  const patch = (payload) => {
    onUpdate({ kind: 'wt', eerettuId: row.eerettuId, payload })
    setShowForm(false)
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-orange-300 font-bold">{row.roughProduct}</p>
          <p className="text-xs text-gray-500">Wt-mode group · In: {fmtDateTime(row.createdAt)}</p>
        </div>
        {tab === 'sold' && (
          <button
            title={isCheckedOut ? 'Remove from checkout' : 'Send to checkout'}
            onClick={onCheckout}
            className={`${isCheckedOut ? 'bg-red-500' : 'bg-pink-500'} text-white text-xs px-2 py-1 rounded-lg font-bold`}
          >
            {isCheckedOut ? '✕' : '🛒'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        <div className="bg-black/30 rounded-xl p-2">
          <p className="text-gray-500">Total</p>
          <p className="text-white font-bold">{row.totalPcs} pcs / {row.totalWt} g</p>
        </div>
        {tab === 'sold' && (
          <>
            <div className="bg-black/30 rounded-xl p-2">
              <p className="text-gray-500">Returned</p>
              <p className="text-green-300 font-bold">{row.returnedPcs} pcs / {row.returnedWt} g</p>
            </div>
            <div className="bg-black/30 rounded-xl p-2">
              <p className="text-gray-500">Sold</p>
              <p className="text-red-300 font-bold">{row.soldPcs} pcs / {row.soldWt} g</p>
            </div>
          </>
        )}
        {tab === 'returned' && (
          <div className="bg-black/30 rounded-xl p-2 col-span-2">
            <p className="text-gray-500">Returned</p>
            <p className="text-green-300 font-bold">{row.returnedPcs} pcs / {row.returnedWt} g</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {tab === 'sold' && row.soldAt && <span className="bg-white/5 px-2 py-1 rounded-lg text-gray-400">Sold: {fmtDateTime(row.soldAt)}</span>}
        {tab === 'returned' && row.returnedAt && <span className="bg-white/5 px-2 py-1 rounded-lg text-gray-400">Returned: {fmtDateTime(row.returnedAt)}</span>}
      </div>

      {(tab === 'sold' || tab === 'returned') && (
        <div className="flex flex-wrap gap-2">
          <InlineEdit label="Purity" value={row.purity} onSave={v => patch({ purity: v })} />
          {tab === 'sold' && (
            <>
              <InlineEdit label="Pure due (g)" type="number" value={row.pureDue} onSave={v => patch({ pureDue: v })} />
              <InlineEdit label="Cash due (₹)" type="number" value={row.cashDue} onSave={v => patch({ cashDue: v })} />
              <InlineEdit label="Sold at" type="datetime-local"
                value={toLocalInput(row.soldAt)} onSave={v => patch({ soldAt: new Date(v).toISOString() })} />
            </>
          )}
          {tab === 'returned' && (
            <InlineEdit label="Returned at" type="datetime-local"
              value={toLocalInput(row.returnedAt)} onSave={v => patch({ returnedAt: new Date(v).toISOString() })} />
          )}
        </div>
      )}

      {isPending && (
        <>
          {!showForm
            ? <button onClick={() => setShowForm(true)} className="text-xs text-pink-400 hover:text-pink-300 font-bold">Change status →</button>
            : <StatusChangeForm row={row} onClose={() => setShowForm(false)} onApply={patch} />}
        </>
      )}
    </div>
  )
}

// ── group container (barcode group + wt single) ─────────────
function GroupContainer({ group, tab, onUpdate, checkoutSet, toggleCheckout }) {
  if (group.kind === 'wt-single') {
    const r = group.row
    const id = `wt_${r.eerettuId}`
    return (
      <WtItemCard
        row={r}
        tab={tab}
        onUpdate={onUpdate}
        isCheckedOut={checkoutSet.has(id)}
        onCheckout={() => toggleCheckout(id, r)}
      />
    )
  }
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="text-orange-300 font-bold">{group.productName}</p>
          <p className="text-xs text-gray-500">{fmtDate(group.dateKey)} · {group.items.length} item{group.items.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      <div className="space-y-2">
        {group.items.map((r) => {
          const id = `bc_${r.eerettuId}_${r.barcode}`
          return (
            <BarcodeItemCard
              key={id}
              row={r}
              tab={tab}
              onUpdate={onUpdate}
              isCheckedOut={checkoutSet.has(id)}
              onCheckout={() => toggleCheckout(id, r)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── tab-level search bar ────────────────────────────────────
function TabSearchBar({ search, setSearch, fromDate, setFromDate, toDate, setToDate, sortBy, setSortBy }) {
  const inp = 'p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm'
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <input className={`${inp} flex-1 min-w-[140px]`} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      <input type="date" className={inp} value={fromDate} onChange={e => setFromDate(e.target.value)} />
      <input type="date" className={inp} value={toDate}   onChange={e => setToDate(e.target.value)} />
      <select className={inp} value={sortBy} onChange={e => setSortBy(e.target.value)}>
        <option value="date_desc">Newest</option>
        <option value="date_asc">Oldest</option>
      </select>
    </div>
  )
}

// ── status tab (Pending/Returned/Sold) ──────────────────────
function StatusTab({ allRows, status, tab, onUpdate, checkoutSet, toggleCheckout }) {
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [sortBy,   setSortBy]   = useState('date_desc')

  const rows = allRows.filter(r => r.status === status)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      const refDate = tab === 'sold' ? (r.soldAt || r.createdAt) : tab === 'returned' ? (r.returnedAt || r.createdAt) : r.createdAt
      const dk = dateOnlyKey(refDate)
      if (q) {
        const hay = [r.productName, r.roughProduct, r.barcode].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (fromDate && dk < fromDate) return false
      if (toDate   && dk > toDate)   return false
      return true
    }).sort((a, b) => {
      const da = tab === 'sold' ? (a.soldAt || a.createdAt) : tab === 'returned' ? (a.returnedAt || a.createdAt) : a.createdAt
      const db = tab === 'sold' ? (b.soldAt || b.createdAt) : tab === 'returned' ? (b.returnedAt || b.createdAt) : b.createdAt
      return sortBy === 'date_asc' ? new Date(da) - new Date(db) : new Date(db) - new Date(da)
    })
  }, [rows, search, fromDate, toDate, sortBy, tab])

  const groups = useMemo(() => groupRowsForTab(filtered), [filtered])

  return (
    <div>
      <TabSearchBar
        search={search} setSearch={setSearch}
        fromDate={fromDate} setFromDate={setFromDate}
        toDate={toDate} setToDate={setToDate}
        sortBy={sortBy} setSortBy={setSortBy}
      />
      <div className="space-y-3">
        {groups.length === 0 && <p className="text-center py-8 text-gray-500 text-sm">No items</p>}
        {groups.map(g => (
          <GroupContainer
            key={g.key}
            group={g}
            tab={tab}
            onUpdate={onUpdate}
            checkoutSet={checkoutSet}
            toggleCheckout={toggleCheckout}
          />
        ))}
      </div>
    </div>
  )
}

// ── wallet dialog ───────────────────────────────────────────
function WalletDialog({ open, onClose, onSave, initial }) {
  const [type, setType] = useState(initial?.type || 'cash')
  const [weight, setWeight] = useState(initial?.weight ?? '')
  const [purity, setPurity] = useState(initial?.purity ?? '')
  const [comment, setComment] = useState(initial?.comment ?? '')
  const [date, setDate] = useState(toLocalInput(initial?.date || new Date()))

  useEffect(() => {
    if (open) {
      setType(initial?.type || 'cash')
      setWeight(initial?.weight ?? '')
      setPurity(initial?.purity ?? '')
      setComment(initial?.comment ?? '')
      setDate(toLocalInput(initial?.date || new Date()))
    }
  }, [open, initial])

  if (!open) return null

  const inp = 'w-full p-3 rounded-xl bg-white/10 border border-white/10 focus:border-pink-400 outline-none text-white text-sm'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 space-y-4">
        <h3 className="text-xl font-black text-pink-300">{initial?._id ? 'Edit Wallet Entry' : 'Add Wallet Entry'}</h3>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Type</label>
          <select className={inp} value={type} onChange={e => setType(e.target.value)}>
            <option value="katcha bar">katcha bar</option>
            <option value="london bar">london bar</option>
            <option value="bhoondhi">bhoondhi</option>
            <option value="cash">cash</option>
            <option value="OldJewel">OldJewel</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">{type === 'cash' ? 'Cash amount (₹)' : 'Weight (g)'}</label>
            <input type="number" className={inp} value={weight} onChange={e => setWeight(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Purity</label>
            <input className={inp} value={purity} onChange={e => setPurity(e.target.value)} placeholder="e.g. 91.6" disabled={type === 'cash'} />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Date / time</label>
          <input type="datetime-local" className={inp} value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Comment</label>
          <textarea className={`${inp} min-h-[80px]`} value={comment} onChange={e => setComment(e.target.value)} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onSave({
              type,
              weight: parseFloat(weight) || 0,
              purity: type === 'cash' ? '' : purity,
              comment,
              date: new Date(date).toISOString(),
            })}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 py-3 rounded-xl font-bold"
          >
            Save
          </button>
          <button onClick={onClose} className="flex-1 bg-white/10 py-3 rounded-xl text-gray-400">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── wallet tab ──────────────────────────────────────────────
function WalletTab({ entries, onAdd, onUpdate, onDelete, checkoutSet, toggleCheckout }) {
  const [search, setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sortBy, setSortBy]     = useState('date_desc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries
      .filter(e => {
        if (typeFilter !== 'ALL' && e.type !== typeFilter) return false
        if (q) {
          const hay = [e.type, e.purity, e.comment].join(' ').toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => sortBy === 'date_asc'
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date))
  }, [entries, search, typeFilter, sortBy])

  // totals
  const totals = useMemo(() => {
    let cash = 0, pure = 0
    entries.forEach(e => {
      if (e.type === 'cash') cash += (e.weight || 0)
      else pure += (e.weight || 0) * purityToFraction(e.purity)
    })
    return { cash, pure: parseFloat(pure.toFixed(3)) }
  }, [entries])

  const inp = 'p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm'

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <input className={`${inp} flex-1 min-w-[140px]`} placeholder="Search wallet..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className={inp} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="ALL">All types</option>
          <option value="katcha bar">katcha bar</option>
          <option value="london bar">london bar</option>
          <option value="bhoondhi">bhoondhi</option>
          <option value="cash">cash</option>
          <option value="OldJewel">OldJewel</option>
        </select>
        <select className={inp} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date_desc">Newest</option>
          <option value="date_asc">Oldest</option>
        </select>
        <button onClick={() => { setEditEntry(null); setDialogOpen(true) }}
          className="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2.5 rounded-xl font-bold text-sm">
          + Add
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3">
          <p className="text-xs text-orange-300">Total Pure (g)</p>
          <p className="text-xl font-black text-orange-200">{totals.pure}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3">
          <p className="text-xs text-green-300">Total Cash (₹)</p>
          <p className="text-xl font-black text-green-200">{totals.cash}</p>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center py-8 text-gray-500 text-sm">No wallet entries</p>}
        {filtered.map(e => {
          const id = `wallet_${e._id}`
          const isCO = checkoutSet.has(id)
          return (
            <div key={e._id} className="bg-black/40 border border-white/5 rounded-2xl p-3 space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-lg text-xs font-bold">{e.type}</span>
                  <span className="text-white font-bold text-sm">
                    {e.type === 'cash' ? `₹${e.weight}` : `${e.weight} g`}
                  </span>
                  {e.purity && <span className="text-orange-300 text-xs">{e.purity}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    title={isCO ? 'Remove from checkout' : 'Send to checkout'}
                    onClick={() => toggleCheckout(id, { walletEntry: e })}
                    className={`${isCO ? 'bg-red-500' : 'bg-pink-500'} text-white text-xs px-2 py-1 rounded-lg font-bold`}
                  >
                    {isCO ? '✕' : '🛒'}
                  </button>
                  <button onClick={() => { setEditEntry(e); setDialogOpen(true) }}
                    className="text-xs text-pink-400 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10">✎</button>
                  <button onClick={() => onDelete(e._id)}
                    className="text-xs text-red-400 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10">🗑</button>
                </div>
              </div>
              <div className="text-xs text-gray-500 flex flex-wrap gap-2">
                <span>{fmtDateTime(e.date)}</span>
                {e.comment && <span className="italic">— {e.comment}</span>}
              </div>
            </div>
          )
        })}
      </div>

      <WalletDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editEntry}
        onSave={async (payload) => {
          if (editEntry) await onUpdate(editEntry._id, payload)
          else            await onAdd(payload)
          setDialogOpen(false)
        }}
      />
    </div>
  )
}

// ── checkout column ─────────────────────────────────────────
function CheckoutColumn({ items, removeItem }) {
  const totals = useMemo(() => {
    let pure = 0, cash = 0, count = 0
    items.forEach(({ data }) => {
      count++
      if (data.walletEntry) {
        const w = data.walletEntry
        if (w.type === 'cash') cash += (w.weight || 0)
        else pure += (w.weight || 0) * purityToFraction(w.purity)
      } else if (data.kind === 'wt' || data.kind === 'barcode') {
        pure += (data.pureDue || 0)
        cash += (data.cashDue || 0)
      }
    })
    return { pure: parseFloat(pure.toFixed(3)), cash, count }
  }, [items])

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
      <h3 className="text-lg font-black text-pink-300 mb-3">Checkout ({totals.count})</h3>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-2">
          <p className="text-xs text-orange-300">Pure</p>
          <p className="font-black text-orange-200">{totals.pure} g</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-2">
          <p className="text-xs text-green-300">Cash</p>
          <p className="font-black text-green-200">₹{totals.cash}</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-6">
            Send items here from the Sold or Wallet tabs to settle them.
          </p>
        )}
        {items.map(({ id, data }) => (
          <div key={id} className="bg-black/40 rounded-xl p-2 flex items-start justify-between gap-2 text-xs">
            <div className="min-w-0">
              {data.walletEntry
                ? <p className="text-white truncate">{data.walletEntry.type} · {data.walletEntry.type === 'cash' ? `₹${data.walletEntry.weight}` : `${data.walletEntry.weight} g`}</p>
                : data.kind === 'wt'
                  ? <p className="text-white truncate">{data.roughProduct} · {data.soldPcs} pcs / {data.soldWt} g</p>
                  : <p className="text-white truncate">{data.barcode} · {data.wt} g</p>
              }
              <p className="text-gray-500 truncate">{
                data.walletEntry
                  ? fmtDateTime(data.walletEntry.date)
                  : fmtDateTime(data.soldAt || data.createdAt)
              }</p>
            </div>
            <button
              onClick={() => removeItem(id)}
              className="bg-red-500 text-white px-2 py-1 rounded-lg font-bold flex-shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── main component ──────────────────────────────────────────
export default function ClientPage() {
  const { clientName: rawName } = useParams()
  // React Router v6 already URL-decodes params — use as-is
  const clientName = rawName

  const [eerettus, setEerettus] = useState([])
  const [walletEntries, setWalletEntries] = useState([])
  const [tab, setTab] = useState('pending')

  // checkout staging — NOT persisted
  const [checkout, setCheckout] = useState({})  // { id: { id, data } }

  const fetchAll = async () => {
    try {
      const [eRes, wRes] = await Promise.all([
        axios.get(`${API}/api/eerettu/by-client/${encodeURIComponent(clientName)}`),
        axios.get(`${API}/api/wallet/by-client/${encodeURIComponent(clientName)}`),
      ])
      setEerettus(eRes.data)
      setWalletEntries(wRes.data)
    } catch (e) { console.log(e) }
  }

  useEffect(() => { fetchAll() }, [clientName])

  const allRows = useMemo(() => buildRows(eerettus), [eerettus])

  // ── totals ────────────────────────────────────────────────
  const totals = useMemo(() => {
    let pendingItems = 0, soldItems = 0
    let pendingPureRaw = 0, pendingCashRaw = 0
    allRows.forEach(r => {
      if (r.status === 'PENDING') {
        pendingItems += r.kind === 'wt' ? (r.totalPcs || 0) : 1
      } else if (r.status === 'SOLD') {
        soldItems += r.kind === 'wt' ? (r.soldPcs || 0) : 1
        pendingPureRaw += r.pureDue || 0
        pendingCashRaw += r.cashDue || 0
      }
    })
    let walletPure = 0, walletCash = 0
    walletEntries.forEach(e => {
      if (e.type === 'cash') walletCash += (e.weight || 0)
      else                   walletPure += (e.weight || 0) * purityToFraction(e.purity)
    })
    return {
      pendingItems,
      soldItems,
      pendingPure: parseFloat((pendingPureRaw - walletPure).toFixed(3)),
      pendingCash: parseFloat((pendingCashRaw - walletCash).toFixed(2)),
    }
  }, [allRows, walletEntries])

  // ── update handlers ───────────────────────────────────────
  const onUpdateRow = async ({ kind, eerettuId, barcode, payload }) => {
    try {
      if (kind === 'barcode') {
        await axios.patch(`${API}/api/eerettu/${eerettuId}/item`, { barcode, ...payload })
      } else {
        await axios.patch(`${API}/api/eerettu/${eerettuId}/wt`, payload)
      }
      fetchAll()
    } catch (e) { console.log(e); alert('Update failed') }
  }

  const addWallet = async (payload) => {
    await axios.post(`${API}/api/wallet`, { clientName, ...payload })
    fetchAll()
  }
  const updateWallet = async (id, payload) => {
    await axios.patch(`${API}/api/wallet/${id}`, payload)
    fetchAll()
  }
  const deleteWallet = async (id) => {
    if (!window.confirm('Delete this wallet entry?')) return
    await axios.delete(`${API}/api/wallet/${id}`)
    fetchAll()
  }

  // ── checkout staging ──────────────────────────────────────
  const checkoutSet = useMemo(() => new Set(Object.keys(checkout)), [checkout])
  const toggleCheckout = (id, data) => {
    setCheckout(prev => {
      if (prev[id]) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: { id, data } }
    })
  }
  const checkoutItems = Object.values(checkout)

  const tabBtn = (k, label) => (
    <button
      key={k}
      onClick={() => setTab(k)}
      className={`flex-1 py-2.5 text-sm font-bold transition-all border-b-2 ${
        tab === k
          ? 'text-pink-300 border-pink-400'
          : 'text-gray-500 border-transparent hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="p-4 sm:p-6 md:p-8">

      {/* HEADER */}
      <div className="mb-6">
        <Link to="/clients" className="text-xs text-gray-400 hover:text-gray-300">← All clients</Link>
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mt-2">
          {clientName}
        </h1>
      </div>

      {/* TOTALS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-2xl p-4">
          <p className="text-xs text-yellow-300">Total Pending Items</p>
          <p className="text-2xl md:text-3xl font-black text-yellow-200 mt-1">{totals.pendingItems}</p>
        </div>
        <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-4">
          <p className="text-xs text-red-300">Total Sold Items</p>
          <p className="text-2xl md:text-3xl font-black text-red-200 mt-1">{totals.soldItems}</p>
        </div>
        <div className="bg-orange-500/15 border border-orange-500/30 rounded-2xl p-4">
          <p className="text-xs text-orange-300">Total Pending Pure</p>
          <p className="text-2xl md:text-3xl font-black text-orange-200 mt-1">{totals.pendingPure} g</p>
        </div>
        <div className="bg-green-500/15 border border-green-500/30 rounded-2xl p-4">
          <p className="text-xs text-green-300">Total Pending Cash</p>
          <p className="text-2xl md:text-3xl font-black text-green-200 mt-1">₹{totals.pendingCash}</p>
        </div>
      </div>

      {/* 2-COLUMN BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* LEFT: tabs container */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-4">
          <div className="flex border-b border-white/10 mb-4">
            {tabBtn('pending',  'Pending')}
            {tabBtn('returned', 'Returned')}
            {tabBtn('sold',     'Sold')}
            {tabBtn('wallet',   'Wallet')}
          </div>

          {tab === 'pending' && (
            <StatusTab
              allRows={allRows} status="PENDING" tab="pending"
              onUpdate={onUpdateRow}
              checkoutSet={checkoutSet} toggleCheckout={toggleCheckout}
            />
          )}
          {tab === 'returned' && (
            <StatusTab
              allRows={allRows} status="RETURNED" tab="returned"
              onUpdate={onUpdateRow}
              checkoutSet={checkoutSet} toggleCheckout={toggleCheckout}
            />
          )}
          {tab === 'sold' && (
            <StatusTab
              allRows={allRows} status="SOLD" tab="sold"
              onUpdate={onUpdateRow}
              checkoutSet={checkoutSet} toggleCheckout={toggleCheckout}
            />
          )}
          {tab === 'wallet' && (
            <WalletTab
              entries={walletEntries}
              onAdd={addWallet}
              onUpdate={updateWallet}
              onDelete={deleteWallet}
              checkoutSet={checkoutSet}
              toggleCheckout={toggleCheckout}
            />
          )}
        </div>

        {/* RIGHT: checkout column */}
        <div className="lg:col-span-1">
          <CheckoutColumn items={checkoutItems} removeItem={(id) => toggleCheckout(id)} />
        </div>

      </div>
    </div>
  )
}
