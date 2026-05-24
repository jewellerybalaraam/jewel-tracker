import { useEffect, useMemo, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from 'axios'
import BarcodeScanner from '../components/BarcodeScanner'

const API = import.meta.env.VITE_API_URL

// ── helpers ──────────────────────────────────────────────────
const dateOnlyKey = (d) => (d ? new Date(d).toISOString().split('T')[0] : '')
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'
const toLocalInput = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60_000).toISOString().slice(0,16)
}
const purityToFraction = (p) => { const n = parseFloat(p); return (isNaN(n)||n<=0)?0:(n>1?n/100:n) }
const n2 = (v) => parseFloat(parseFloat(v||0).toFixed(2))
const n6 = (v) => parseFloat(parseFloat(v||0).toFixed(6))

// ── build flat rows from eerettus ─────────────────────────────
function buildRows(eerettus) {
  const rows = []
  eerettus.forEach(e => {
    if (e.mode === 'barcode') {
      ;(e.items||[]).forEach(item => {
        rows.push({
          kind:'barcode', eerettuId:e._id, status:item.status,
          barcode:item.barcode, wt:item.wt, size:item.size,
          purity:item.purity, productName:item.productName||e.roughProductName,
          roughProduct:e.roughProductName, createdAt:e.date,
          soldAt:item.soldAt, returnedAt:item.returnedAt,
          pureDue:item.pureDue||0, cashDue:item.cashDue||0,
          billBookNo:item.billBookNo, billPageNo:item.billPageNo,
          billId:item.billId||null, dateKey:dateOnlyKey(e.date),
        })
      })
    } else {
      const wt = e.wtMode||{}
      rows.push({
        kind:'wt', eerettuId:e._id, status:wt.status,
        totalPcs:wt.totalPcs, totalWt:wt.totalWt,
        returnedPcs:wt.returnedPcs, returnedWt:wt.returnedWt,
        soldPcs:wt.soldPcs, soldWt:wt.soldWt, purity:wt.purity,
        roughProduct:e.roughProductName, productName:e.roughProductName,
        createdAt:e.date, soldAt:wt.soldAt, returnedAt:wt.returnedAt,
        pureDue:wt.pureDue||0, cashDue:wt.cashDue||0,
        billBookNo:wt.billBookNo, billPageNo:wt.billPageNo,
        billId:wt.billId||null, dateKey:dateOnlyKey(e.date),
      })
    }
  })
  return rows
}

function groupRowsForTab(rows) {
  const groups = [], map = {}
  rows.forEach(r => {
    if (r.kind === 'wt') {
      groups.push({ kind:'wt-single', key:`wt_${r.eerettuId}`, row:r })
    } else {
      const key = `bc_${r.productName}_${r.dateKey}`
      if (!map[key]) {
        const g = { kind:'bc-group', key, productName:r.productName, dateKey:r.dateKey, createdAt:r.createdAt, items:[] }
        map[key] = g; groups.push(g)
      }
      map[key].items.push(r)
    }
  })
  return groups.sort((a,b) => {
    const da = a.kind==='wt-single' ? a.row.createdAt : a.createdAt
    const db = b.kind==='wt-single' ? b.row.createdAt : b.createdAt
    return new Date(db)-new Date(da)
  })
}

// ── InlineEdit ────────────────────────────────────────────────
function InlineEdit({ value, label, type='text', onSave, placeholder='' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value??'')
  useEffect(() => { if (!editing) setVal(value??'') }, [value, editing])
  if (!editing) return (
    <button onClick={()=>setEditing(true)} className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300">
      {label}: <span className="text-pink-300 font-semibold">{value||placeholder||'—'}</span>
    </button>
  )
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-400">{label}:</span>
      <input type={type} value={val} onChange={e=>setVal(e.target.value)}
        className="w-24 p-1.5 rounded-lg bg-white/10 border border-pink-400 text-white text-xs outline-none" />
      <button onClick={()=>{onSave(val);setEditing(false)}} className="text-xs px-2 py-1 rounded-lg bg-green-500 text-white font-bold">✓</button>
      <button onClick={()=>{setVal(value??'');setEditing(false)}} className="text-xs px-2 py-1 rounded-lg bg-white/10 text-gray-400">✕</button>
    </div>
  )
}

// ── StatusChangeForm ──────────────────────────────────────────
function StatusChangeForm({ row, onClose, onApply }) {
  const isWt = row.kind==='wt'
  const [target, setTarget] = useState('')
  const [retPcs, setRetPcs] = useState('')
  const [retWt, setRetWt]   = useState('')
  const [pureDue, setPureDue] = useState(row.pureDue||'')
  const [cashDue, setCashDue] = useState(row.cashDue||'')
  const [bookNo, setBookNo]   = useState(row.billBookNo||'')
  const [pageNo, setPageNo]   = useState(row.billPageNo||'')
  const [whenAt, setWhenAt]   = useState(toLocalInput(new Date()))

  if (!target) return (
    <div className="flex gap-2 mt-2">
      <button onClick={()=>setTarget('RETURNED')} className="px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-bold">Mark Returned</button>
      <button onClick={()=>setTarget('SOLD')} className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold">Mark Sold</button>
      <button onClick={onClose} className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-400 text-xs">Cancel</button>
    </div>
  )

  const submit = () => {
    const payload = { status:target }
    if (target==='SOLD') {
      payload.soldAt=new Date(whenAt).toISOString()
      payload.pureDue=parseFloat(pureDue)||0
      payload.cashDue=parseFloat(cashDue)||0
      payload.billBookNo=bookNo; payload.billPageNo=pageNo
      if (isWt) { payload.returnedPcs=parseFloat(retPcs)||0; payload.returnedWt=parseFloat(retWt)||0 }
    } else {
      payload.returnedAt=new Date(whenAt).toISOString()
      if (isWt) { if(retPcs!=='') payload.returnedPcs=parseFloat(retPcs)||0; if(retWt!=='') payload.returnedWt=parseFloat(retWt)||0 }
    }
    onApply(payload)
  }

  const inp = 'w-full p-2 rounded-xl bg-white/10 border border-pink-400 text-white text-sm outline-none'
  return (
    <div className="bg-black/30 rounded-2xl p-4 space-y-3 mt-2">
      <p className="text-xs font-bold text-pink-300">{target==='RETURNED'?'Confirm Return':'Confirm Sale'}</p>
      <div className="grid grid-cols-2 gap-2">
        <div><p className="text-xs text-gray-400 mb-1">{target==='RETURNED'?'Returned at':'Sold at'}</p>
          <input type="datetime-local" value={whenAt} onChange={e=>setWhenAt(e.target.value)} className={inp} /></div>
        {isWt && <><div><p className="text-xs text-gray-400 mb-1">Returned pcs</p>
          <input type="number" value={retPcs} onChange={e=>setRetPcs(e.target.value)} className={inp} /></div>
          <div><p className="text-xs text-gray-400 mb-1">Returned wt (g)</p>
          <input type="number" value={retWt} onChange={e=>setRetWt(e.target.value)} className={inp} /></div></>}
        {target==='SOLD' && <>
          <div><p className="text-xs text-gray-400 mb-1">Pure due (g)</p><input type="number" value={pureDue} onChange={e=>setPureDue(e.target.value)} className={inp} placeholder="0" /></div>
          <div><p className="text-xs text-gray-400 mb-1">Cash due (₹)</p><input type="number" value={cashDue} onChange={e=>setCashDue(e.target.value)} className={inp} placeholder="0" /></div>
          <div><p className="text-xs text-gray-400 mb-1">Bill book</p><input value={bookNo} onChange={e=>setBookNo(e.target.value)} className={inp} /></div>
          <div><p className="text-xs text-gray-400 mb-1">Bill page</p><input value={pageNo} onChange={e=>setPageNo(e.target.value)} className={inp} /></div>
        </>}
      </div>
      <div className="flex gap-2">
        <button onClick={submit} className="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 rounded-xl text-sm font-bold">Confirm</button>
        <button onClick={()=>setTarget('')} className="bg-white/10 px-4 py-2 rounded-xl text-sm text-gray-400">Back</button>
      </div>
    </div>
  )
}

// ── BarcodeItemCard ───────────────────────────────────────────
function BarcodeItemCard({ row, tab, onUpdate, onCheckout, isCheckedOut }) {
  const [showForm, setShowForm] = useState(false)
  const patch = (payload) => { onUpdate({ kind:'barcode', eerettuId:row.eerettuId, barcode:row.barcode, payload }); setShowForm(false) }
  const locked = !!row.billId

  return (
    <div className={`bg-black/40 rounded-2xl p-3 space-y-2 border ${locked?'border-yellow-500/30':'border-white/5'}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-white">{row.barcode}</span>
          {row.wt>0 && <span className="text-gray-400">{row.wt} g</span>}
          {row.size && <span className="text-gray-400">Size {row.size}</span>}
          {locked && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-lg">🔒 Billed</span>}
        </div>
        {tab==='sold' && !locked && (
          <button title={isCheckedOut?'Remove':'Add to checkout'} onClick={onCheckout}
            className={`${isCheckedOut?'bg-red-500':'bg-pink-500'} text-white text-xs px-2 py-1 rounded-lg font-bold`}>
            {isCheckedOut?'✕':'🛒'}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-gray-400">
        <span className="bg-white/5 px-2 py-0.5 rounded-lg">In: {fmtDateTime(row.createdAt)}</span>
        {tab==='sold' && row.soldAt && <span className="bg-white/5 px-2 py-0.5 rounded-lg">Sold: {fmtDateTime(row.soldAt)}</span>}
        {tab==='returned' && row.returnedAt && <span className="bg-white/5 px-2 py-0.5 rounded-lg">Returned: {fmtDateTime(row.returnedAt)}</span>}
      </div>
      {(tab==='sold'||tab==='returned') && (
        <div className="flex flex-wrap gap-2">
          <InlineEdit label="Purity" value={row.purity} onSave={v=>patch({purity:v})} />
          {tab==='sold' && <>
            <InlineEdit label="Pure due (g)" type="number" value={row.pureDue} onSave={v=>patch({pureDue:v})} />
            <InlineEdit label="Cash due (₹)" type="number" value={row.cashDue} onSave={v=>patch({cashDue:v})} />
            <InlineEdit label="Sold at" type="datetime-local" value={toLocalInput(row.soldAt)} onSave={v=>patch({soldAt:new Date(v).toISOString()})} />
          </>}
          {tab==='returned' && <InlineEdit label="Returned at" type="datetime-local" value={toLocalInput(row.returnedAt)} onSave={v=>patch({returnedAt:new Date(v).toISOString()})} />}
        </div>
      )}
      {tab==='pending' && !locked && (
        !showForm
          ? <button onClick={()=>setShowForm(true)} className="text-xs text-pink-400 hover:text-pink-300 font-bold">Change status →</button>
          : <StatusChangeForm row={row} onClose={()=>setShowForm(false)} onApply={patch} />
      )}
    </div>
  )
}

// ── WtItemCard ────────────────────────────────────────────────
function WtItemCard({ row, tab, onUpdate, onCheckout, isCheckedOut }) {
  const [showForm, setShowForm] = useState(false)
  const patch = (payload) => { onUpdate({ kind:'wt', eerettuId:row.eerettuId, payload }); setShowForm(false) }
  const locked = !!row.billId

  return (
    <div className={`bg-white/5 border ${locked?'border-yellow-500/30':'border-white/10'} rounded-2xl p-4 space-y-3`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-orange-300 font-bold">{row.roughProduct}</p>
          <p className="text-xs text-gray-500">Wt-mode · In: {fmtDateTime(row.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          {locked && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-lg">🔒 Billed</span>}
          {tab==='sold' && !locked && (
            <button onClick={onCheckout} className={`${isCheckedOut?'bg-red-500':'bg-pink-500'} text-white text-xs px-2 py-1 rounded-lg font-bold`}>
              {isCheckedOut?'✕':'🛒'}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-black/30 rounded-xl p-2"><p className="text-gray-500">Total</p><p className="text-white font-bold">{row.totalPcs}pcs/{row.totalWt}g</p></div>
        {tab==='sold' && <>
          <div className="bg-black/30 rounded-xl p-2"><p className="text-gray-500">Returned</p><p className="text-green-300 font-bold">{row.returnedPcs}p/{row.returnedWt}g</p></div>
          <div className="bg-black/30 rounded-xl p-2"><p className="text-gray-500">Sold</p><p className="text-red-300 font-bold">{row.soldPcs}p/{row.soldWt}g</p></div>
        </>}
      </div>
      {(tab==='sold'||tab==='returned') && (
        <div className="flex flex-wrap gap-2">
          <InlineEdit label="Purity" value={row.purity} onSave={v=>patch({purity:v})} />
          {tab==='sold' && <>
            <InlineEdit label="Pure due (g)" type="number" value={row.pureDue} onSave={v=>patch({pureDue:v})} />
            <InlineEdit label="Cash due (₹)" type="number" value={row.cashDue} onSave={v=>patch({cashDue:v})} />
          </>}
        </div>
      )}
      {tab==='pending' && !locked && (
        !showForm
          ? <button onClick={()=>setShowForm(true)} className="text-xs text-pink-400 hover:text-pink-300 font-bold">Change status →</button>
          : <StatusChangeForm row={row} onClose={()=>setShowForm(false)} onApply={patch} />
      )}
    </div>
  )
}

function GroupContainer({ group, tab, onUpdate, checkoutSet, toggleCheckout }) {
  if (group.kind==='wt-single') {
    const r = group.row
    const id = `wt_${r.eerettuId}`
    return <WtItemCard row={r} tab={tab} onUpdate={onUpdate} isCheckedOut={checkoutSet.has(id)} onCheckout={()=>toggleCheckout(id,r)} />
  }
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
      <div><p className="text-orange-300 font-bold">{group.productName}</p>
        <p className="text-xs text-gray-500">{fmtDate(group.dateKey)} · {group.items.length} item{group.items.length===1?'':'s'}</p></div>
      <div className="space-y-2">
        {group.items.map(r => {
          const id = `bc_${r.eerettuId}_${r.barcode}`
          return <BarcodeItemCard key={id} row={r} tab={tab} onUpdate={onUpdate} isCheckedOut={checkoutSet.has(id)} onCheckout={()=>toggleCheckout(id,r)} />
        })}
      </div>
    </div>
  )
}

function TabSearchBar({ search, setSearch, fromDate, setFromDate, toDate, setToDate, sortBy, setSortBy }) {
  const inp = 'p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm'
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <input className={`${inp} flex-1 min-w-[140px]`} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} />
      <input type="date" className={inp} value={fromDate} onChange={e=>setFromDate(e.target.value)} />
      <input type="date" className={inp} value={toDate}   onChange={e=>setToDate(e.target.value)} />
      <select className={inp} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
        <option value="date_desc">Newest</option><option value="date_asc">Oldest</option>
      </select>
    </div>
  )
}

// ── QuickScanPanel ─ scan-driven status change for Pending tab ──
function QuickScanPanel({ pendingRows, onBulk, onMarkAll }) {
  const [open, setOpen]       = useState(false)
  const [mode, setMode]       = useState('RETURNED')         // RETURNED or SOLD
  const [scanning, setScanning] = useState(false)
  const [feed, setFeed]       = useState([])                 // recent scan log
  const [manual, setManual]   = useState('')
  const lastScanRef = useRef({ code: '', at: 0 })

  // index pending barcode rows by barcode
  const barcodeMap = useMemo(() => {
    const m = {}
    pendingRows.forEach(r => { if (r.kind === 'barcode' && r.barcode && !r.billId) m[r.barcode] = r })
    return m
  }, [pendingRows])

  const pushFeed = (entry) =>
    setFeed(f => [{ ...entry, at: new Date() }, ...f].slice(0, 20))

  const handleScan = async (raw) => {
    const code = String(raw||'').trim()
    if (!code) return
    // de-dupe: ignore same code within 2.5s
    const now = Date.now()
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 2500) return
    lastScanRef.current = { code, at: now }

    const row = barcodeMap[code]
    if (!row) {
      pushFeed({ code, status: 'NOT FOUND', ok: false })
      try { navigator.vibrate?.([60,40,60]) } catch{}
      return
    }
    try {
      await onBulk([{ kind:'barcode', eerettuId: row.eerettuId, barcode: row.barcode, status: mode }])
      pushFeed({ code, status: mode, ok: true, label: row.productName })
      try { navigator.vibrate?.(40) } catch{}
    } catch (e) {
      pushFeed({ code, status: 'ERROR', ok: false })
    }
  }

  const submitManual = () => {
    if (!manual.trim()) return
    handleScan(manual.trim())
    setManual('')
  }

  const pendingBarcodes = Object.keys(barcodeMap).length

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-pink-500/20 rounded-2xl p-3 mb-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-pink-300 font-black text-sm">⚡ Quick Mode</span>
          <span className="text-xs text-gray-400">{pendingBarcodes} barcode item(s) pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            <button onClick={()=>setMode('RETURNED')}
              className={`px-3 py-1.5 text-xs font-bold ${mode==='RETURNED'?'bg-green-500 text-white':'bg-white/5 text-gray-400'}`}>Returned</button>
            <button onClick={()=>setMode('SOLD')}
              className={`px-3 py-1.5 text-xs font-bold ${mode==='SOLD'?'bg-red-500 text-white':'bg-white/5 text-gray-400'}`}>Sold</button>
          </div>
          <button onClick={()=>setOpen(o=>!o)} className="text-xs px-3 py-1.5 rounded-xl bg-pink-500 text-white font-bold">
            {open?'Close':'Open'}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <button onClick={()=>setScanning(s=>!s)}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-sm font-bold">
              {scanning?'⏹ Stop Camera':'📷 Scan with Camera'}
            </button>
            <button
              onClick={()=>{
                if (!pendingBarcodes) return
                if (!window.confirm(`Mark ALL ${pendingBarcodes} pending barcode item(s) as ${mode}?`)) return
                onMarkAll(mode)
              }}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold">
              Mark All {mode==='RETURNED'?'Returned':'Sold'}
            </button>
          </div>

          {scanning && <BarcodeScanner onScan={handleScan} />}

          <div className="flex gap-2">
            <input
              autoFocus
              value={manual}
              onChange={e=>setManual(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') submitManual() }}
              placeholder="Or type / scan barcode then press Enter"
              className="flex-1 p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm" />
            <button onClick={submitManual} className="px-4 py-2 rounded-xl bg-pink-500 text-white text-sm font-bold">Apply</button>
          </div>

          {feed.length>0 && (
            <div className="max-h-48 overflow-auto space-y-1">
              {feed.map((f,i)=>(
                <div key={i} className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${f.ok?'bg-green-500/10 border border-green-500/20':'bg-red-500/10 border border-red-500/20'}`}>
                  <span className={`font-bold ${f.ok?'text-green-300':'text-red-300'}`}>{f.code}</span>
                  <span className="text-gray-400 text-[10px]">{f.label||''}</span>
                  <span className={`font-bold ${f.ok?'text-green-300':'text-red-300'}`}>{f.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusTab({ allRows, status, tab, onUpdate, onBulk, checkoutSet, toggleCheckout }) {
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [sortBy,   setSortBy]   = useState('date_desc')
  const rows = allRows.filter(r => r.status===status)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      const refDate = tab==='sold'?(r.soldAt||r.createdAt):tab==='returned'?(r.returnedAt||r.createdAt):r.createdAt
      const dk = dateOnlyKey(refDate)
      if (q) { const hay=[r.productName,r.roughProduct,r.barcode].filter(Boolean).join(' ').toLowerCase(); if(!hay.includes(q)) return false }
      if (fromDate&&dk<fromDate) return false
      if (toDate&&dk>toDate) return false
      return true
    }).sort((a,b) => {
      const da=tab==='sold'?(a.soldAt||a.createdAt):tab==='returned'?(a.returnedAt||a.createdAt):a.createdAt
      const db=tab==='sold'?(b.soldAt||b.createdAt):tab==='returned'?(b.returnedAt||b.createdAt):b.createdAt
      return sortBy==='date_asc'?new Date(da)-new Date(db):new Date(db)-new Date(da)
    })
  }, [rows, search, fromDate, toDate, sortBy, tab])
  const groups = useMemo(() => groupRowsForTab(filtered), [filtered])

  const markAllPending = async (mode) => {
    const updates = rows.filter(r => r.kind==='barcode' && !r.billId).map(r => ({
      kind:'barcode', eerettuId: r.eerettuId, barcode: r.barcode, status: mode,
    }))
    if (updates.length) await onBulk(updates)
  }

  return (
    <div>
      {tab==='pending' && (
        <QuickScanPanel pendingRows={rows} onBulk={onBulk} onMarkAll={markAllPending} />
      )}
      <TabSearchBar search={search} setSearch={setSearch} fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} sortBy={sortBy} setSortBy={setSortBy} />
      <div className="space-y-3">
        {groups.length===0 && <p className="text-center py-8 text-gray-500 text-sm">No items</p>}
        {groups.map(g => <GroupContainer key={g.key} group={g} tab={tab} onUpdate={onUpdate} checkoutSet={checkoutSet} toggleCheckout={toggleCheckout} />)}
      </div>
    </div>
  )
}

// ── WalletDialog ──────────────────────────────────────────────
function WalletDialog({ open, onClose, onSave, initial }) {
  const [type, setType]       = useState(initial?.type||'cash')
  const [weight, setWeight]   = useState(initial?.weight??'')
  const [purity, setPurity]   = useState(initial?.purity??'')
  const [comment, setComment] = useState(initial?.comment??'')
  const [date, setDate]       = useState(toLocalInput(initial?.date||new Date()))
  useEffect(() => {
    if (open) { setType(initial?.type||'cash'); setWeight(initial?.weight??''); setPurity(initial?.purity??''); setComment(initial?.comment??''); setDate(toLocalInput(initial?.date||new Date())) }
  }, [open, initial])
  if (!open) return null
  const inp = 'w-full p-3 rounded-xl bg-white/10 border border-white/10 focus:border-pink-400 outline-none text-white text-sm'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 space-y-4">
        <h3 className="text-xl font-black text-pink-300">{initial?._id?'Edit Wallet Entry':'Add Wallet Entry'}</h3>
        <div><label className="text-xs text-gray-400 mb-1 block">Type</label>
          <select className={inp} value={type} onChange={e=>setType(e.target.value)}>
            {['katcha bar','london bar','bhoondhi','cash','OldJewel'].map(t=><option key={t} value={t}>{t}</option>)}
          </select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-400 mb-1 block">{type==='cash'?'Cash (₹)':'Weight (g)'}</label>
            <input type="number" className={inp} value={weight} onChange={e=>setWeight(e.target.value)} /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Purity %</label>
            <input className={inp} value={purity} onChange={e=>setPurity(e.target.value)} disabled={type==='cash'} /></div>
        </div>
        <div><label className="text-xs text-gray-400 mb-1 block">Date / time</label>
          <input type="datetime-local" className={inp} value={date} onChange={e=>setDate(e.target.value)} /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Comment</label>
          <textarea className={`${inp} min-h-[60px]`} value={comment} onChange={e=>setComment(e.target.value)} /></div>
        <div className="flex gap-2">
          <button onClick={()=>onSave({type,weight:parseFloat(weight)||0,purity:type==='cash'?'':purity,comment,date:new Date(date).toISOString()})} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 py-3 rounded-xl font-bold">Save</button>
          <button onClick={onClose} className="flex-1 bg-white/10 py-3 rounded-xl text-gray-400">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── WalletTab ──────────────────────────────────────────────────
function WalletTab({ entries, onAdd, onUpdate, onDelete, checkoutSet, toggleCheckout }) {
  const [search, setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [sortBy, setSortBy]     = useState('date_desc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter(e => {
      if (typeFilter!=='ALL'&&e.type!==typeFilter) return false
      if (q) { const hay=[e.type,e.purity,e.comment].join(' ').toLowerCase(); if(!hay.includes(q)) return false }
      return true
    }).sort((a,b)=>sortBy==='date_asc'?new Date(a.date)-new Date(b.date):new Date(b.date)-new Date(a.date))
  }, [entries, search, typeFilter, sortBy])
  const totals = useMemo(() => {
    let cash=0,pure=0
    entries.forEach(e=>{ if(e.type==='cash') cash+=(e.weight||0); else pure+=(e.weight||0)*purityToFraction(e.purity) })
    return { cash, pure:parseFloat(pure.toFixed(3)) }
  }, [entries])
  const inp = 'p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm'
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <input className={`${inp} flex-1 min-w-[140px]`} placeholder="Search wallet..." value={search} onChange={e=>setSearch(e.target.value)} />
        <select className={inp} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
          <option value="ALL">All types</option>
          {['katcha bar','london bar','bhoondhi','cash','OldJewel'].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        <select className={inp} value={sortBy} onChange={e=>setSortBy(e.target.value)}>
          <option value="date_desc">Newest</option><option value="date_asc">Oldest</option>
        </select>
        <button onClick={()=>{setEditEntry(null);setDialogOpen(true)}} className="bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2.5 rounded-xl font-bold text-sm">+ Add</button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-3"><p className="text-xs text-orange-300">Total Pure (g)</p><p className="text-xl font-black text-orange-200">{totals.pure}</p></div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3"><p className="text-xs text-green-300">Total Cash (₹)</p><p className="text-xl font-black text-green-200">{totals.cash}</p></div>
      </div>
      <div className="space-y-2">
        {filtered.length===0 && <p className="text-center py-8 text-gray-500 text-sm">No wallet entries</p>}
        {filtered.map(e => {
          const id = `wallet_${e._id}`
          const isCO = checkoutSet.has(id)
          const locked = !!e.billId
          return (
            <div key={e._id} className={`bg-black/40 border ${locked?'border-yellow-500/30':'border-white/5'} rounded-2xl p-3 space-y-1`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-lg text-xs font-bold">{e.type}</span>
                  <span className="text-white font-bold text-sm">{e.type==='cash'?`₹${e.weight}`:`${e.weight} g`}</span>
                  {e.purity && <span className="text-orange-300 text-xs">{e.purity}%</span>}
                  {locked && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-lg">🔒 Billed</span>}
                </div>
                <div className="flex items-center gap-1">
                  {!locked && <button title={isCO?'Remove':'Add to checkout'} onClick={()=>toggleCheckout(id,{walletEntry:e})} className={`${isCO?'bg-red-500':'bg-pink-500'} text-white text-xs px-2 py-1 rounded-lg font-bold`}>{isCO?'✕':'🛒'}</button>}
                  <button onClick={()=>{setEditEntry(e);setDialogOpen(true)}} className="text-xs text-pink-400 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10">✎</button>
                  {!locked && <button onClick={()=>onDelete(e._id)} className="text-xs text-red-400 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10">🗑</button>}
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
      <WalletDialog open={dialogOpen} onClose={()=>setDialogOpen(false)} initial={editEntry}
        onSave={async (payload)=>{ if(editEntry) await onUpdate(editEntry._id,payload); else await onAdd(payload); setDialogOpen(false) }} />
    </div>
  )
}

// ── BillingPanel ──────────────────────────────────────────────
// itemOverrides: { [checkoutId]: { purityPct, wastePct, wasteSign, mc } }
function BillingItemRow({ id, data, overrides, setOverride, onRemove }) {
  const ov = overrides[id] || {}
  const isWalletCash = data.walletEntry?.type === 'cash'
  const isWallet = !!data.walletEntry
  const wt = isWallet
    ? (isWalletCash ? 0 : (data.walletEntry.weight||0))
    : (data.kind==='wt' ? (data.soldWt||0) : (data.wt||0))
  const label = isWallet
    ? `${data.walletEntry.type} · ${isWalletCash?`₹${data.walletEntry.weight}`:`${data.walletEntry.weight}g`}`
    : data.kind==='wt' ? `${data.roughProduct} · ${data.soldWt}g` : `${data.barcode} · ${wt}g`

  const set = (k,v) => setOverride(id, { ...ov, [k]:v })
  const inp = 'p-1.5 rounded-lg bg-white/10 border border-white/10 focus:border-pink-400 outline-none text-white text-xs w-full'

  return (
    <div className="bg-black/30 rounded-xl p-3 space-y-2 border border-white/5">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-bold text-white truncate max-w-[180px]">{label}</p>
          {!isWalletCash && <p className="text-xs text-gray-500">{wt}g</p>}
        </div>
        <button onClick={()=>onRemove(id)} className="text-red-400/60 hover:text-red-400 text-sm ml-2">✕</button>
      </div>
      {!isWalletCash && (
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Purity %</p>
            <input type="number" className={inp} placeholder={isWallet?(data.walletEntry.purity||'0'):'0'}
              value={ov.purityPct??''} onChange={e=>set('purityPct',e.target.value)} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Wastage %</p>
            <div className="flex gap-1">
              <button onClick={()=>set('wasteSign',ov.wasteSign==='+'?'-':'+')}
                className={`text-xs px-2 rounded-lg font-bold ${(ov.wasteSign||'+')==='+' ? 'bg-green-500/30 text-green-300' : 'bg-red-500/30 text-red-300'}`}>
                {ov.wasteSign||'+'}
              </button>
              <input type="number" className={inp} placeholder="0"
                value={ov.wastePct??''} onChange={e=>set('wastePct',e.target.value)} />
            </div>
          </div>
          {!isWallet && (
            <div className="col-span-2">
              <p className="text-[10px] text-gray-500 mb-0.5">MC (₹/g)</p>
              <input type="number" className={inp} placeholder="0"
                value={ov.mc??''} onChange={e=>set('mc',e.target.value)} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BillingPanel({ checkoutItems, removeItem, clientName, onBillCreated }) {
  const [overrides, setOverrides] = useState({})  // id -> {purityPct,wastePct,wasteSign,mc}
  const [silverRate, setSilverRate] = useState('')
  const [discountPure, setDiscountPure] = useState('')
  const [discountCash, setDiscountCash] = useState('')
  const [taxMode, setTaxMode] = useState(false)
  const [taxes, setTaxes] = useState([])
  const [newTaxName, setNewTaxName] = useState('')
  const [newTaxPct, setNewTaxPct] = useState('')
  const [saving, setSaving] = useState(false)

  const setOverride = (id, val) => setOverrides(prev => ({ ...prev, [id]:val }))

  // Separate sold items (we give) vs wallet items (they give)
  const soldItems   = checkoutItems.filter(ci => !ci.data.walletEntry)
  const walletItems = checkoutItems.filter(ci =>  ci.data.walletEntry)

  // Live totals
  const totals = useMemo(() => {
    const rate = parseFloat(silverRate)||0
    let A=0, B=0, C=0, cashFromWallet=0

    soldItems.forEach(ci => {
      const ov = overrides[ci.id]||{}
      const wt = ci.data.kind==='wt'?(ci.data.soldWt||0):(ci.data.wt||0)
      const pPct = parseFloat(ov.purityPct)||0
      const wPct = parseFloat(ov.wastePct)||0
      const sign = ov.wasteSign||'+'
      const eff  = pPct + (sign==='+'?wPct:-wPct)
      const mc   = parseFloat(ov.mc)||0
      A += (wt*eff)/100
      B += mc*wt
    })

    walletItems.forEach(ci => {
      const w = ci.data.walletEntry
      if (w.type==='cash') { cashFromWallet += (w.weight||0); return }
      const ov = overrides[ci.id]||{}
      const wt = w.weight||0
      const pPct = parseFloat(ov.purityPct)||parseFloat(w.purity)||0
      const wPct = parseFloat(ov.wastePct)||0
      const sign = ov.wasteSign||'+'
      const eff  = pPct + (sign==='+'?wPct:-wPct)
      C += (wt*eff)/100
    })

    const netPure = A - C
    const netCashBD = (netPure*rate) + B - cashFromWallet
    const dp = parseFloat(discountPure)||0
    const dc = parseFloat(discountCash)||0
    const netCashAD = netCashBD - dc - (dp*rate)
    const totalTaxPct = taxes.reduce((s,t)=>s+(t.pct||0),0)
    const taxAmt = taxMode&&netCashAD>0 ? (netCashAD*totalTaxPct/100) : 0
    const finalCash = netCashAD + taxAmt

    return {
      A: n6(A), B: n2(B), C: n6(C), cashFromWallet: n2(cashFromWallet),
      netPure: n6(netPure), netCashBD: n2(netCashBD), netCashAD: n2(netCashAD),
      taxAmt: n2(taxAmt), finalCash: n2(finalCash), rate,
    }
  }, [soldItems, walletItems, overrides, silverRate, discountPure, discountCash, taxMode, taxes])

  const handleBill = async () => {
    if (!checkoutItems.length) return alert('No items in checkout')
    setSaving(true)
    try {
      const rate = parseFloat(silverRate)||0
      const items = checkoutItems.map(ci => {
        const ov = overrides[ci.id]||{}
        const w = ci.data.walletEntry
        if (w) {
          const isCash = w.type==='cash'
          const wt = w.weight||0
          const pPct = isCash?0:(parseFloat(ov.purityPct)||parseFloat(w.purity)||0)
          const wPct = parseFloat(ov.wastePct)||0
          const sign = ov.wasteSign||'+'
          return {
            refType:'wallet', walletId:w._id,
            label:`${w.type} · ${isCash?`₹${w.weight}`:`${w.weight}g`}`,
            wt, purityPct:pPct, wastePct:wPct, wasteSign:sign, mc:0,
            isCash, cashAmt:isCash?(w.weight||0):0,
          }
        }
        const d = ci.data
        const wt = d.kind==='wt'?(d.soldWt||0):(d.wt||0)
        const pPct = parseFloat(ov.purityPct)||0
        const wPct = parseFloat(ov.wastePct)||0
        const sign = ov.wasteSign||'+'
        const mc   = parseFloat(ov.mc)||0
        return {
          refType: d.kind==='wt'?'sold_wt':'sold_barcode',
          eerettuId: d.eerettuId,
          barcode: d.barcode||'',
          label: d.kind==='wt'?`${d.roughProduct} · ${wt}g`:`${d.barcode} · ${wt}g`,
          wt, purityPct:pPct, wastePct:wPct, wasteSign:sign, mc, isCash:false, cashAmt:0,
        }
      })

      const dp = parseFloat(discountPure)||0
      const dc = parseFloat(discountCash)||0
      await axios.post(`${API}/api/bills`, {
        clientName, silverRate:rate, items,
        discountPure:dp, discountCash:dc,
        taxMode, taxes,
      })
      // clear checkout
      checkoutItems.forEach(ci => removeItem(ci.id))
      setOverrides({}); setSilverRate(''); setDiscountPure(''); setDiscountCash('')
      setTaxMode(false); setTaxes([]); setNewTaxName(''); setNewTaxPct('')
      onBillCreated()
    } catch(e) { console.log(e); alert('Failed to create bill') }
    finally { setSaving(false) }
  }

  const inp = 'p-2.5 rounded-xl bg-white/10 border border-white/10 focus:border-pink-400 outline-none text-white text-sm'

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
      <h3 className="text-lg font-black text-pink-300">Billing Panel</h3>

      {/* Items we give */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-yellow-300 uppercase tracking-wider">🏅 Items We Give ({soldItems.length})</p>
        {soldItems.length===0 && <p className="text-xs text-gray-600 py-2 text-center">Send sold items here via 🛒</p>}
        {soldItems.map(ci => (
          <BillingItemRow key={ci.id} id={ci.id} data={ci.data} overrides={overrides} setOverride={setOverride} onRemove={removeItem} />
        ))}
      </div>

      {/* Items they give */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <p className="text-xs font-bold text-blue-300 uppercase tracking-wider">💰 Items They Give ({walletItems.length})</p>
        {walletItems.length===0 && <p className="text-xs text-gray-600 py-2 text-center">Send wallet items here via 🛒</p>}
        {walletItems.map(ci => (
          <BillingItemRow key={ci.id} id={ci.id} data={ci.data} overrides={overrides} setOverride={setOverride} onRemove={removeItem} />
        ))}
      </div>

      {/* Rate + calculations */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">📊 Calculation</p>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Today's Silver Rate (₹/g)</label>
          <input type="number" className={inp} placeholder="e.g. 95.50" value={silverRate} onChange={e=>setSilverRate(e.target.value)} />
        </div>

        {/* Live totals breakdown */}
        {(soldItems.length>0||walletItems.length>0) && (
          <div className="bg-black/30 rounded-2xl p-3 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-400">A — Pure we give:</span><span className="text-yellow-300 font-bold">{totals.A} g</span></div>
            <div className="flex justify-between"><span className="text-gray-400">B — MC total:</span><span className="text-yellow-300 font-bold">₹{totals.B}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">C — Pure they have:</span><span className="text-blue-300 font-bold">{totals.C} g</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Cash they gave:</span><span className="text-blue-300 font-bold">₹{totals.cashFromWallet}</span></div>
            <div className="border-t border-white/10 pt-1 flex justify-between"><span className="text-gray-400">Net pure (A−C):</span>
              <span className={`font-bold ${totals.netPure>=0?'text-orange-300':'text-green-300'}`}>{totals.netPure} g {totals.netPure<0?' (we owe pure)':''}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">D — Net cash:</span>
              <span className={`font-bold ${totals.netCashBD>=0?'text-white':'text-green-300'}`}>{totals.netCashBD>=0?`₹${totals.netCashBD} (they owe)`:`₹${Math.abs(totals.netCashBD)} (we owe)`}</span></div>
          </div>
        )}

        {/* Discount */}
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-gray-400 mb-1 block">Discount pure (g)</label>
            <input type="number" className={inp} placeholder="0" value={discountPure} onChange={e=>setDiscountPure(e.target.value)} /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Discount cash (₹)</label>
            <input type="number" className={inp} placeholder="0" value={discountCash} onChange={e=>setDiscountCash(e.target.value)} /></div>
        </div>

        {/* Tax */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold">Tax Mode</span>
            <button onClick={()=>setTaxMode(t=>!t)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${taxMode?'bg-orange-500 text-white':'bg-white/10 text-gray-400'}`}>
              {taxMode?'ON':'OFF'}
            </button>
          </div>
          {taxMode && (
            <div className="space-y-1.5">
              {taxes.map((t,i)=>(
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 text-gray-300">{t.name}</span>
                  <span className="text-orange-300 font-bold">{t.pct}%</span>
                  <button onClick={()=>setTaxes(prev=>prev.filter((_,j)=>j!==i))} className="text-red-400/60 hover:text-red-400">✕</button>
                </div>
              ))}
              <div className="flex gap-1">
                <input className="flex-1 p-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs outline-none focus:border-pink-400" placeholder="Tax name" value={newTaxName} onChange={e=>setNewTaxName(e.target.value)} />
                <input type="number" className="w-16 p-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs outline-none focus:border-pink-400" placeholder="%" value={newTaxPct} onChange={e=>setNewTaxPct(e.target.value)} />
                <button onClick={()=>{ if(newTaxName&&newTaxPct){setTaxes(p=>[...p,{name:newTaxName,pct:parseFloat(newTaxPct)||0}]);setNewTaxName('');setNewTaxPct('')} }} className="px-2 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-bold">+</button>
              </div>
            </div>
          )}
        </div>

        {/* Final total */}
        {(soldItems.length>0||walletItems.length>0) && (
          <div className={`rounded-2xl p-3 text-center ${totals.finalCash>=0?'bg-red-500/10 border border-red-500/20':'bg-green-500/10 border border-green-500/20'}`}>
            <p className="text-xs text-gray-400 mb-1">{totals.finalCash>=0?'They owe us':'We owe them'}</p>
            <p className={`text-2xl font-black ${totals.finalCash>=0?'text-red-300':'text-green-300'}`}>₹{Math.abs(totals.finalCash)}</p>
            {taxMode && totals.taxAmt>0 && <p className="text-xs text-orange-300 mt-1">incl. tax ₹{totals.taxAmt}</p>}
          </div>
        )}

        <button onClick={handleBill} disabled={saving||checkoutItems.length===0}
          className="w-full py-3 rounded-2xl font-black bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed">
          {saving ? 'Creating Bill...' : '🧾 Create Bill'}
        </button>
      </div>
    </div>
  )
}

// ── BillsTab ──────────────────────────────────────────────────
function PaymentDialog({ open, onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [note, setNote]     = useState('')
  const [date, setDate]     = useState(toLocalInput(new Date()))
  useEffect(() => { if(open){setAmount('');setNote('');setDate(toLocalInput(new Date()))} }, [open])
  if (!open) return null
  const inp = 'w-full p-3 rounded-xl bg-white/10 border border-white/10 focus:border-pink-400 outline-none text-white text-sm'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-black text-pink-300">Add Payment</h3>
        <div><label className="text-xs text-gray-400 mb-1 block">Amount (₹)</label><input type="number" className={inp} value={amount} onChange={e=>setAmount(e.target.value)} /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Note</label><input className={inp} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional" /></div>
        <div><label className="text-xs text-gray-400 mb-1 block">Date</label><input type="datetime-local" className={inp} value={date} onChange={e=>setDate(e.target.value)} /></div>
        <div className="flex gap-2">
          <button onClick={()=>onSave({amount:parseFloat(amount)||0,note,date:new Date(date).toISOString()})} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 py-3 rounded-xl font-bold">Save</button>
          <button onClick={onClose} className="flex-1 bg-white/10 py-3 rounded-xl text-gray-400">Cancel</button>
        </div>
      </div>
    </div>
  )
}

function BillCard({ bill, onAddPayment, onDeletePayment, onDeleteBill }) {
  const [expanded, setExpanded] = useState(false)
  const [payDialog, setPayDialog] = useState(false)
  const paid = bill.payments.reduce((s,p)=>s+(p.amount||0),0)
  const remaining = n2(bill.totals.finalCash - paid)
  const isTax = bill.taxMode

  return (
    <div className={`border rounded-2xl overflow-hidden ${bill.status==='paid'?'border-green-500/30 bg-green-500/5':'border-white/10 bg-white/5'}`}>
      <div className="p-4 flex items-start justify-between gap-3 cursor-pointer" onClick={()=>setExpanded(e=>!e)}>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {bill.billNumber && <span className="text-xs bg-pink-500/20 text-pink-200 px-2 py-0.5 rounded-lg font-black tracking-wider">#{bill.billNumber}</span>}
            <span className="font-black text-white">{fmtDateTime(bill.createdAt)}</span>
            {bill.billType && bill.billType!=='client' && (
              <span className={`text-xs px-2 py-0.5 rounded-lg font-bold ${bill.billType==='purchase'?'bg-blue-500/20 text-blue-300':'bg-purple-500/20 text-purple-300'}`}>
                {bill.billType==='purchase'?'Purchase':'Direct Sale'}
              </span>
            )}
            {isTax && <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-lg">Tax</span>}
            {bill.status==='paid' && <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-lg font-bold">✓ Paid</span>}
          </div>
          {bill.customerMobile && <p className="text-xs text-gray-500 mt-1">📞 {bill.customerMobile}</p>}
          <div className="flex flex-wrap gap-3 mt-1 text-sm">
            <span className="text-gray-400">Total: <strong className="text-white">₹{bill.totals.finalCash}</strong></span>
            <span className="text-gray-400">Paid: <strong className="text-green-300">₹{n2(paid)}</strong></span>
            {bill.status!=='paid' && <span className="text-gray-400">Remaining: <strong className="text-red-300">₹{remaining}</strong></span>}
          </div>
        </div>
        <span className="text-gray-500 text-sm">{expanded?'▲':'▼'}</span>
      </div>

      {expanded && (
        <div className="border-t border-white/10 p-4 space-y-4 text-sm">
          {/* Totals breakdown */}
          <div className="bg-black/30 rounded-xl p-3 space-y-1.5 text-xs">
            <p className="font-bold text-gray-300 mb-2">Calculation Summary</p>
            <div className="flex justify-between"><span className="text-gray-500">A (pure we gave):</span><span className="text-yellow-300">{bill.totals.A} g</span></div>
            <div className="flex justify-between"><span className="text-gray-500">B (MC):</span><span className="text-yellow-300">₹{bill.totals.B}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">C (pure they had):</span><span className="text-blue-300">{bill.totals.C} g</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cash they gave:</span><span className="text-blue-300">₹{bill.totals.cashFromWallet}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Rate:</span><span className="text-gray-300">₹{bill.silverRate}/g</span></div>
            <div className="flex justify-between border-t border-white/10 pt-1.5"><span className="text-gray-500">Net (D):</span><span className="text-white font-bold">₹{bill.totals.netCashBeforeDiscount}</span></div>
            {(bill.discountPure||bill.discountCash) && <div className="flex justify-between"><span className="text-gray-500">Discount:</span><span className="text-green-300">−₹{n2((bill.discountPure||0)*bill.silverRate + (bill.discountCash||0))}</span></div>}
            {bill.taxMode && bill.taxes.map((t,i)=>(
              <div key={i} className="flex justify-between"><span className="text-gray-500">{t.name} ({t.pct}%):</span><span className="text-orange-300">₹{bill.totals.taxAmt}</span></div>
            ))}
            <div className="flex justify-between font-black text-base pt-1 border-t border-white/10">
              <span className="text-gray-300">Final</span><span className={bill.totals.finalCash>=0?'text-red-300':'text-green-300'}>₹{Math.abs(bill.totals.finalCash)}</span>
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-gray-400 mb-2">Items ({bill.items.length})</p>
            <div className="space-y-1">
              {bill.items.map((it,i)=>(
                <div key={i} className="bg-black/20 rounded-lg px-3 py-2 flex justify-between text-xs">
                  <span className="text-gray-300">{it.label}</span>
                  <span className="text-gray-500">{it.isCash?`₹${it.cashAmt}`:`${it.wt}g @ ${it.effectivePurityPct?.toFixed(2)||0}%`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payments */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-bold text-gray-400">Payments</p>
              {bill.status!=='paid' && (
                <button onClick={()=>setPayDialog(true)} className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-lg hover:bg-green-500/30 font-bold">+ Payment</button>
              )}
            </div>
            {bill.payments.length===0 && <p className="text-xs text-gray-600 text-center py-2">No payments yet</p>}
            <div className="space-y-1">
              {bill.payments.map((p,i)=>(
                <div key={i} className="bg-black/20 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-green-300 font-bold">₹{p.amount}</span>
                    {p.note && <span className="text-gray-500 ml-2">— {p.note}</span>}
                    <span className="text-gray-600 ml-2">{fmtDate(p.date)}</span>
                  </div>
                  <button onClick={()=>onDeletePayment(bill._id, p._id)} className="text-red-400/50 hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
            {bill.payments.length>0 && (
              <div className="flex justify-between mt-2 px-1 text-xs font-bold">
                <span className="text-gray-400">Total paid</span>
                <span className="text-green-300">₹{n2(paid)} / ₹{bill.totals.finalCash}</span>
              </div>
            )}
          </div>

          <button onClick={()=>{ if(window.confirm('Delete this bill? Items will be unlocked.')) onDeleteBill(bill._id) }}
            className="w-full py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20">
            🗑 Delete Bill (unlock items)
          </button>
        </div>
      )}

      <PaymentDialog open={payDialog} onClose={()=>setPayDialog(false)}
        onSave={async(payload)=>{ await onAddPayment(bill._id,payload); setPayDialog(false) }} />
    </div>
  )
}

function BillsTab({ bills, onAddPayment, onDeletePayment, onDeleteBill }) {
  const [subTab, setSubTab] = useState('unpaid')
  const [search, setSearch] = useState('')
  const filtered = bills
    .filter(b => b.status===subTab)
    .filter(b => !search || fmtDateTime(b.createdAt).includes(search))
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))

  const inp = 'p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm'
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {['unpaid','paid'].map(s=>(
          <button key={s} onClick={()=>setSubTab(s)} className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${subTab===s?'bg-gradient-to-r from-pink-500 to-purple-500':'bg-white/10 text-gray-400'}`}>
            {s} ({bills.filter(b=>b.status===s).length})
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <input className={`${inp} flex-1`} placeholder="Search bills..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>
      {filtered.length===0 && <p className="text-center py-8 text-gray-500 text-sm">No {subTab} bills</p>}
      <div className="space-y-3">
        {filtered.map(b=>(
          <BillCard key={b._id} bill={b} onAddPayment={onAddPayment} onDeletePayment={onDeletePayment} onDeleteBill={onDeleteBill} />
        ))}
      </div>
    </div>
  )
}

// ── Main ClientPage ───────────────────────────────────────────
export default function ClientPage() {
  const { clientName: rawName } = useParams()
  const clientName = rawName

  const [eerettus, setEerettus]   = useState([])
  const [walletEntries, setWalletEntries] = useState([])
  const [bills, setBills]         = useState([])
  const [tab, setTab]             = useState('pending')
  const [checkout, setCheckout]   = useState({})   // { id: { id, data } }

  const fetchAll = async () => {
    try {
      const [eRes, wRes, bRes] = await Promise.all([
        axios.get(`${API}/api/eerettu/by-client/${encodeURIComponent(clientName)}`),
        axios.get(`${API}/api/wallet/by-client/${encodeURIComponent(clientName)}`),
        axios.get(`${API}/api/bills/by-client/${encodeURIComponent(clientName)}`),
      ])
      setEerettus(eRes.data)
      setWalletEntries(wRes.data)
      setBills(bRes.data)
    } catch (e) { console.log(e) }
  }

  useEffect(() => { fetchAll() }, [clientName])

  const allRows = useMemo(() => buildRows(eerettus), [eerettus])

  const totals = useMemo(() => {
    let pendingItems=0, soldItems=0, pendingPureRaw=0, pendingCashRaw=0
    allRows.forEach(r => {
      if (r.status==='PENDING') pendingItems += r.kind==='wt'?(r.totalPcs||0):1
      else if (r.status==='SOLD') {
        soldItems += r.kind==='wt'?(r.soldPcs||0):1
        pendingPureRaw += r.pureDue||0
        pendingCashRaw += r.cashDue||0
      }
    })
    let walletPure=0, walletCash=0
    walletEntries.forEach(e => {
      if (e.type==='cash') walletCash+=(e.weight||0)
      else walletPure+=(e.weight||0)*purityToFraction(e.purity)
    })
    return {
      pendingItems, soldItems,
      pendingPure:  parseFloat((pendingPureRaw-walletPure).toFixed(3)),
      pendingCash:  parseFloat((pendingCashRaw-walletCash).toFixed(2)),
    }
  }, [allRows, walletEntries])

  const onUpdateRow = async ({ kind, eerettuId, barcode, payload }) => {
    try {
      if (kind==='barcode') await axios.patch(`${API}/api/eerettu/${eerettuId}/item`, { barcode, ...payload })
      else                   await axios.patch(`${API}/api/eerettu/${eerettuId}/wt`, payload)
      fetchAll()
    } catch (e) { console.log(e); alert('Update failed') }
  }

  const onBulkUpdate = async (updates) => {
    try {
      await axios.post(`${API}/api/eerettu/bulk-status`, { updates })
      await fetchAll()
    } catch (e) { console.log(e); alert('Bulk update failed') }
  }

  const addWallet    = async (p)    => { await axios.post(`${API}/api/wallet`, { clientName, ...p }); fetchAll() }
  const updateWallet = async (id,p) => { await axios.patch(`${API}/api/wallet/${id}`, p); fetchAll() }
  const deleteWallet = async (id)   => { if(!window.confirm('Delete wallet entry?')) return; await axios.delete(`${API}/api/wallet/${id}`); fetchAll() }

  const addPayment    = async (billId, p)       => { await axios.post(`${API}/api/bills/${billId}/payments`, p); fetchAll() }
  const deletePayment = async (billId, payId)   => { await axios.delete(`${API}/api/bills/${billId}/payments/${payId}`); fetchAll() }
  const deleteBill    = async (billId)           => { await axios.delete(`${API}/api/bills/${billId}`); fetchAll() }

  const checkoutSet = useMemo(() => new Set(Object.keys(checkout)), [checkout])
  const toggleCheckout = (id, data) => setCheckout(prev => {
    if (prev[id]) { const n={...prev}; delete n[id]; return n }
    return { ...prev, [id]:{id,data} }
  })
  const removeCheckout = (id) => setCheckout(prev => { const n={...prev}; delete n[id]; return n })
  const checkoutItems = Object.values(checkout)

  const tabBtn = (k,label) => (
    <button key={k} onClick={()=>setTab(k)} className={`flex-1 py-2.5 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${tab===k?'text-pink-300 border-pink-400':'text-gray-500 border-transparent hover:text-gray-300'}`}>
      {label}
    </button>
  )

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <Link to="/clients" className="text-xs text-gray-400 hover:text-gray-300">← All clients</Link>
        <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mt-2">{clientName}</h1>
      </div>

      {/* TOTALS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-yellow-500/15 border border-yellow-500/30 rounded-2xl p-4"><p className="text-xs text-yellow-300">Pending Items</p><p className="text-3xl font-black text-yellow-200 mt-1">{totals.pendingItems}</p></div>
        <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-4"><p className="text-xs text-red-300">Sold Items</p><p className="text-3xl font-black text-red-200 mt-1">{totals.soldItems}</p></div>
        <div className="bg-orange-500/15 border border-orange-500/30 rounded-2xl p-4"><p className="text-xs text-orange-300">Pending Pure</p><p className="text-3xl font-black text-orange-200 mt-1">{totals.pendingPure}g</p></div>
        <div className="bg-green-500/15 border border-green-500/30 rounded-2xl p-4"><p className="text-xs text-green-300">Pending Cash</p><p className="text-3xl font-black text-green-200 mt-1">₹{totals.pendingCash}</p></div>
      </div>

      {/* 2-COLUMN BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT: tabs */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-4">
          <div className="flex border-b border-white/10 mb-4 overflow-x-auto">
            {tabBtn('pending','Pending')}
            {tabBtn('returned','Returned')}
            {tabBtn('sold','Sold')}
            {tabBtn('wallet','Wallet')}
            {tabBtn('bills',`Bills${bills.filter(b=>b.status==='unpaid').length>0?` (${bills.filter(b=>b.status==='unpaid').length})`:''}`)}
          </div>

          {tab==='pending' && <StatusTab allRows={allRows} status="PENDING" tab="pending" onUpdate={onUpdateRow} onBulk={onBulkUpdate} checkoutSet={checkoutSet} toggleCheckout={toggleCheckout} />}
          {tab==='returned' && <StatusTab allRows={allRows} status="RETURNED" tab="returned" onUpdate={onUpdateRow} onBulk={onBulkUpdate} checkoutSet={checkoutSet} toggleCheckout={toggleCheckout} />}
          {tab==='sold' && <StatusTab allRows={allRows} status="SOLD" tab="sold" onUpdate={onUpdateRow} onBulk={onBulkUpdate} checkoutSet={checkoutSet} toggleCheckout={toggleCheckout} />}
          {tab==='wallet' && <WalletTab entries={walletEntries} onAdd={addWallet} onUpdate={updateWallet} onDelete={deleteWallet} checkoutSet={checkoutSet} toggleCheckout={toggleCheckout} />}
          {tab==='bills' && <BillsTab bills={bills} onAddPayment={addPayment} onDeletePayment={deletePayment} onDeleteBill={deleteBill} />}
        </div>

        {/* RIGHT: billing panel */}
        <div className="lg:col-span-1">
          <BillingPanel
            checkoutItems={checkoutItems}
            removeItem={removeCheckout}
            clientName={clientName}
            onBillCreated={() => { fetchAll(); setTab('bills') }}
          />
        </div>
      </div>
    </div>
  )
}
