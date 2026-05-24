import { useEffect, useMemo, useState, useRef } from 'react'
import axios from 'axios'
import BarcodeScanner from '../components/BarcodeScanner'

const API = import.meta.env.VITE_API_URL

// ── helpers ───────────────────────────────────────────────────
const n2 = (v) => parseFloat(parseFloat(v||0).toFixed(2))
const n6 = (v) => parseFloat(parseFloat(v||0).toFixed(6))
const uid = () => `id_${Math.random().toString(36).slice(2,10)}`

const PAY_TYPES = ['katcha bar','london bar','bhoondhi','cash','OldJewel']

// ──────────────────────────────────────────────────────────────
// ClientPicker — pick existing client or create on the fly
// ──────────────────────────────────────────────────────────────
function ClientPicker({ value, mobile, onChange }) {
  const [clients, setClients] = useState([])
  const [q, setQ] = useState(value||'')
  const [open, setOpen] = useState(false)

  useEffect(() => { axios.get(`${API}/api/clients`).then(r=>setClients(r.data||[])).catch(()=>{}) }, [])
  useEffect(() => { setQ(value||'') }, [value])

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return clients.slice(0,8)
    return clients.filter(c =>
      c.clientName.toLowerCase().includes(term) ||
      (c.mobiles||[]).some(m => m.includes(term))
    ).slice(0,8)
  }, [q, clients])

  const choose = (c) => {
    onChange({ name: c.clientName, mobile: c.mobiles?.[0] || mobile || '' })
    setQ(c.clientName)
    setOpen(false)
  }

  const inp = 'w-full p-3 rounded-xl bg-white/10 border border-white/10 focus:border-pink-400 outline-none text-white text-sm'

  return (
    <div className="space-y-2">
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Client / Customer name *</label>
        <div className="relative">
          <input
            className={inp}
            value={q}
            onChange={e=>{ setQ(e.target.value); setOpen(true); onChange({ name:e.target.value, mobile }) }}
            onFocus={()=>setOpen(true)}
            placeholder="Type name or scroll list…"
          />
          {open && matches.length>0 && (
            <div className="absolute z-30 mt-1 w-full bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl max-h-56 overflow-auto">
              {matches.map(c => (
                <button key={c._id}
                  type="button"
                  onClick={()=>choose(c)}
                  className="w-full text-left px-3 py-2 hover:bg-white/10 text-sm">
                  <span className="text-white font-bold">{c.clientName}</span>
                  {c.mobiles?.length>0 && <span className="text-gray-400 text-xs ml-2">{c.mobiles[0]}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Mobile number (optional)</label>
        <input className={inp} value={mobile||''}
          onChange={e=>onChange({ name:q, mobile:e.target.value })}
          placeholder="e.g. 9876543210" />
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// AddManualSaleDialog
// ──────────────────────────────────────────────────────────────
function AddManualDialog({ open, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [wt, setWt] = useState('')
  const [purityPct, setPurityPct] = useState('')
  const [wastePct, setWastePct] = useState('')
  const [wasteSign, setWasteSign] = useState('+')
  const [mc, setMc] = useState('')

  useEffect(() => { if(open){ setLabel(''); setWt(''); setPurityPct(''); setWastePct(''); setWasteSign('+'); setMc('') } }, [open])
  if (!open) return null
  const inp = 'w-full p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 space-y-3">
        <h3 className="text-lg font-black text-pink-300">Add Untagged Item</h3>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Description *</label>
          <input className={inp} value={label} onChange={e=>setLabel(e.target.value)} placeholder="e.g. Anklet · plain" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-gray-400 mb-1 block">Weight (g) *</label>
            <input type="number" className={inp} value={wt} onChange={e=>setWt(e.target.value)} /></div>
          <div><label className="text-xs text-gray-400 mb-1 block">Purity %</label>
            <input type="number" className={inp} value={purityPct} onChange={e=>setPurityPct(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs text-gray-400 mb-1 block">Wastage %</label>
            <div className="flex gap-1">
              <button onClick={()=>setWasteSign(wasteSign==='+'?'-':'+')}
                className={`px-3 rounded-lg font-bold ${wasteSign==='+'?'bg-green-500/30 text-green-300':'bg-red-500/30 text-red-300'}`}>{wasteSign}</button>
              <input type="number" className={inp} value={wastePct} onChange={e=>setWastePct(e.target.value)} />
            </div>
          </div>
          <div><label className="text-xs text-gray-400 mb-1 block">MC ₹/g</label>
            <input type="number" className={inp} value={mc} onChange={e=>setMc(e.target.value)} /></div>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            onClick={()=>{
              if (!label.trim()) return alert('Description required')
              if (!parseFloat(wt)) return alert('Weight required')
              onSave({ label, wt:parseFloat(wt)||0, purityPct:parseFloat(purityPct)||0, wastePct:parseFloat(wastePct)||0, wasteSign, mc:parseFloat(mc)||0 })
            }}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 py-3 rounded-xl font-bold">Add</button>
          <button onClick={onClose} className="flex-1 bg-white/10 py-3 rounded-xl text-gray-400">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// AddPaymentInlineDialog — bar/old-gold/old-silver given as payment
// ──────────────────────────────────────────────────────────────
function AddPayInlineDialog({ open, onClose, onSave, defaultRemainPure, silverRate }) {
  const [payType, setPayType] = useState('london bar')
  const [wt, setWt] = useState('')
  const [purityPct, setPurityPct] = useState('99.9')
  const [cashAmt, setCashAmt] = useState('')

  useEffect(() => { if(open){ setPayType('london bar'); setWt(''); setPurityPct('99.9'); setCashAmt('') } }, [open])
  if (!open) return null
  const isCash = payType === 'cash'
  const inp = 'w-full p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm'

  // helper: compute required wt to settle remaining cash at this purity
  const purityFraction = (parseFloat(purityPct)||0)/100
  const requiredWt = (defaultRemainPure && purityFraction>0)
    ? (defaultRemainPure / purityFraction).toFixed(3)
    : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md bg-[#1a1a2e] border border-white/10 rounded-3xl p-6 space-y-3">
        <h3 className="text-lg font-black text-blue-300">Customer Pays With</h3>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Payment type</label>
          <select className={inp} value={payType} onChange={e=>setPayType(e.target.value)}>
            {PAY_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {isCash ? (
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Cash amount (₹)</label>
            <input type="number" className={inp} value={cashAmt} onChange={e=>setCashAmt(e.target.value)} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Weight (g)</label>
                <input type="number" className={inp} value={wt} onChange={e=>setWt(e.target.value)} placeholder={requiredWt||'0'} />
                {requiredWt && (
                  <p className="text-[10px] text-blue-300 mt-1">≈ {requiredWt} g would fully settle remaining</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Purity %</label>
                <input type="number" className={inp} value={purityPct} onChange={e=>setPurityPct(e.target.value)} />
              </div>
            </div>
            {silverRate>0 && (parseFloat(wt)||0)>0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-2 text-xs">
                <p className="text-blue-300">
                  Pure given: <strong>{n6((parseFloat(wt)||0) * purityFraction)} g</strong>
                  {silverRate>0 && <> · worth ₹{n2((parseFloat(wt)||0) * purityFraction * silverRate)}</>}
                </p>
              </div>
            )}
          </>
        )}
        <div className="flex gap-2 pt-2">
          <button
            onClick={()=>{
              if (isCash) {
                if (!parseFloat(cashAmt)) return alert('Cash amount required')
                onSave({ payType:'cash', isCash:true, cashAmt:parseFloat(cashAmt)||0, wt:0, purityPct:0 })
              } else {
                if (!parseFloat(wt))  return alert('Weight required')
                onSave({ payType, isCash:false, cashAmt:0, wt:parseFloat(wt)||0, purityPct:parseFloat(purityPct)||0 })
              }
            }}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 py-3 rounded-xl font-bold">Add</button>
          <button onClick={onClose} className="flex-1 bg-white/10 py-3 rounded-xl text-gray-400">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// SaleRow — editable inline
// ──────────────────────────────────────────────────────────────
function SaleRow({ item, onUpdate, onRemove }) {
  const set = (k,v) => onUpdate({ ...item, [k]:v })
  const inp = 'w-full p-1.5 rounded-lg bg-white/10 border border-white/10 focus:border-pink-400 outline-none text-white text-xs'
  return (
    <div className="bg-black/30 rounded-xl p-3 space-y-2 border border-white/5">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="text-xs font-bold text-white truncate">{item.label}</p>
          <p className="text-[10px] text-gray-500">
            {item.refType==='inventory_sale'?'📦 Tagged':'✍️ Manual'}
            {item.barcode?` · ${item.barcode}`:''}
          </p>
        </div>
        <button onClick={onRemove} className="text-red-400/60 hover:text-red-400 text-sm ml-2">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div><p className="text-[10px] text-gray-500 mb-0.5">Wt (g)</p>
          <input type="number" className={inp} value={item.wt||''} onChange={e=>set('wt',parseFloat(e.target.value)||0)} /></div>
        <div><p className="text-[10px] text-gray-500 mb-0.5">Purity %</p>
          <input type="number" className={inp} value={item.purityPct||''} onChange={e=>set('purityPct',parseFloat(e.target.value)||0)} /></div>
        <div>
          <p className="text-[10px] text-gray-500 mb-0.5">Wastage %</p>
          <div className="flex gap-1">
            <button onClick={()=>set('wasteSign', item.wasteSign==='+'?'-':'+')}
              className={`text-xs px-2 rounded-lg font-bold ${(item.wasteSign||'+')==='+'?'bg-green-500/30 text-green-300':'bg-red-500/30 text-red-300'}`}>
              {item.wasteSign||'+'}
            </button>
            <input type="number" className={inp} value={item.wastePct||''} onChange={e=>set('wastePct',parseFloat(e.target.value)||0)} />
          </div>
        </div>
        <div><p className="text-[10px] text-gray-500 mb-0.5">MC ₹/g</p>
          <input type="number" className={inp} value={item.mc||''} onChange={e=>set('mc',parseFloat(e.target.value)||0)} /></div>
      </div>
    </div>
  )
}

function PayRow({ item, onUpdate, onRemove }) {
  const set = (k,v) => onUpdate({ ...item, [k]:v })
  const inp = 'w-full p-1.5 rounded-lg bg-white/10 border border-white/10 focus:border-pink-400 outline-none text-white text-xs'
  return (
    <div className="bg-black/30 rounded-xl p-3 space-y-2 border border-blue-500/10">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-lg text-[10px] font-bold">{item.payType}</span>
          <p className="text-xs text-white mt-1">{item.isCash?`₹${item.cashAmt}`:`${item.wt}g · ${item.purityPct}%`}</p>
        </div>
        <button onClick={onRemove} className="text-red-400/60 hover:text-red-400 text-sm ml-2">✕</button>
      </div>
      {!item.isCash && (
        <div className="grid grid-cols-2 gap-1.5">
          <div><p className="text-[10px] text-gray-500 mb-0.5">Wt (g)</p>
            <input type="number" className={inp} value={item.wt||''} onChange={e=>set('wt',parseFloat(e.target.value)||0)} /></div>
          <div><p className="text-[10px] text-gray-500 mb-0.5">Purity %</p>
            <input type="number" className={inp} value={item.purityPct||''} onChange={e=>set('purityPct',parseFloat(e.target.value)||0)} /></div>
        </div>
      )}
      {item.isCash && (
        <div><p className="text-[10px] text-gray-500 mb-0.5">Cash (₹)</p>
          <input type="number" className={inp} value={item.cashAmt||''} onChange={e=>set('cashAmt',parseFloat(e.target.value)||0)} /></div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Main DirectBilling page
// ──────────────────────────────────────────────────────────────
export default function DirectBilling() {
  const [billType, setBillType]     = useState('sale')   // 'sale' or 'purchase'
  const [client, setClient]         = useState({ name:'', mobile:'' })
  const [saleItems, setSaleItems]   = useState([])       // tagged or manual (we give)
  const [payItems,  setPayItems]    = useState([])       // bars / old gold / cash (they give)
  const [silverRate, setSilverRate] = useState('')
  const [discountPure, setDiscountPure] = useState('')
  const [discountCash, setDiscountCash] = useState('')
  const [taxMode, setTaxMode] = useState(false)
  const [taxes, setTaxes] = useState([])
  const [newTaxName, setNewTaxName] = useState('')
  const [newTaxPct, setNewTaxPct] = useState('')

  // surplus-handling choices
  const [surplusMode, setSurplusMode] = useState('cash')  // 'cash' or 'wallet'

  // dialogs
  const [scannerOpen,  setScannerOpen]  = useState(false)
  const [manualOpen,   setManualOpen]   = useState(false)
  const [payOpen,      setPayOpen]      = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastBill, setLastBill] = useState(null)
  const lastScanRef = useRef({ code:'', at:0 })

  // ── scan → inventory lookup ────────────────────────────────
  const handleScan = async (raw) => {
    const code = String(raw||'').trim()
    if (!code) return
    const now = Date.now()
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 2000) return
    lastScanRef.current = { code, at: now }
    // avoid dup in list
    if (saleItems.some(i => i.barcode === code)) {
      try { navigator.vibrate?.([60,30,60]) } catch {}
      return
    }
    try {
      const { data } = await axios.get(`${API}/api/inventory/barcode/${encodeURIComponent(code)}`)
      const inv = data?.data || data       // controller returns { data: {...} }
      if (!inv || !inv._id) {
        // fall back: append as manual placeholder
        setSaleItems(prev => [...prev, {
          _id: uid(), refType:'manual_sale', label:`Unknown ${code}`, barcode:code,
          wt:0, purityPct:0, wastePct:0, wasteSign:'+', mc:0,
        }])
        try { navigator.vibrate?.([60,30,60]) } catch {}
        return
      }
      setSaleItems(prev => [...prev, {
        _id: uid(),
        refType:'inventory_sale',
        inventoryId: inv._id,
        barcode: inv.barcode,
        label: `${inv.productName||''}${inv.subProductName?' · '+inv.subProductName:''} · ${inv.barcode}`,
        wt: inv.netWt||0,
        purityPct: parseFloat(inv.purity)||0,
        wastePct: 0, wasteSign:'+',
        mc: inv.makingCharge||0,
      }])
      try { navigator.vibrate?.(40) } catch {}
    } catch {
      // 404 etc → manual placeholder
      setSaleItems(prev => [...prev, {
        _id: uid(), refType:'manual_sale', label:`Unknown ${code}`, barcode:code,
        wt:0, purityPct:0, wastePct:0, wasteSign:'+', mc:0,
      }])
    }
  }

  // ── totals (live) ──────────────────────────────────────────
  const totals = useMemo(() => {
    const rate = parseFloat(silverRate)||0
    let A=0, B=0, C=0, cashFromWallet=0
    saleItems.forEach(it => {
      const eff = (it.purityPct||0) + (it.wasteSign==='+' ? (it.wastePct||0) : -(it.wastePct||0))
      A += ((it.wt||0)*eff)/100
      B += (it.mc||0)*(it.wt||0)
    })
    payItems.forEach(it => {
      if (it.isCash) { cashFromWallet += (it.cashAmt||0); return }
      const eff = (it.purityPct||0)
      C += ((it.wt||0)*eff)/100
    })
    const netPure = A - C
    const netCashBD = (netPure*rate) + B - cashFromWallet
    const dp = parseFloat(discountPure)||0
    const dc = parseFloat(discountCash)||0
    const netCashAD = netCashBD - dc - (dp*rate)
    const totalTaxPct = taxes.reduce((s,t)=>s+(t.pct||0),0)
    const taxAmt = taxMode && netCashAD>0 ? (netCashAD*totalTaxPct/100) : 0
    const finalCash = netCashAD + taxAmt

    // remaining pure they still need to settle (positive = they owe pure)
    const remainPureRaw = netPure   // before discount/tax
    return {
      A:n6(A), B:n2(B), C:n6(C), cashFromWallet:n2(cashFromWallet),
      netPure:n6(netPure), netCashBD:n2(netCashBD), netCashAD:n2(netCashAD),
      taxAmt:n2(taxAmt), finalCash:n2(finalCash), rate,
      remainPure: n6(remainPureRaw),
    }
  }, [saleItems, payItems, silverRate, discountPure, discountCash, taxMode, taxes])

  // ── surplus calculation ───────────────────────────────────
  // If finalCash < 0 → they overpaid → surplus to wallet OR cash out
  const surplus = useMemo(() => {
    if (totals.finalCash >= 0) return { hasSurplus:false }
    const cashSurplus = Math.abs(totals.finalCash)
    // convert cash surplus back to pure-g if a rate is given
    const pureSurplus = totals.rate>0 ? cashSurplus/totals.rate : 0
    return { hasSurplus:true, cashSurplus:n2(cashSurplus), pureSurplus:n6(pureSurplus) }
  }, [totals])

  // ── helpers ───────────────────────────────────────────────
  const updateSale = (id, val) => setSaleItems(prev => prev.map(x => x._id===id?val:x))
  const removeSale = (id) => setSaleItems(prev => prev.filter(x => x._id!==id))
  const updatePay  = (id, val) => setPayItems(prev => prev.map(x => x._id===id?val:x))
  const removePay  = (id) => setPayItems(prev => prev.filter(x => x._id!==id))

  // ── build payload & POST ──────────────────────────────────
  const submitBill = async () => {
    if (!client.name?.trim()) return alert('Customer / client name is required')
    if (saleItems.length === 0 && payItems.length === 0)
      return alert('Add at least one item')
    setSaving(true)
    try {
      const items = []
      saleItems.forEach(it => {
        items.push({
          refType: it.refType,                     // inventory_sale | manual_sale
          inventoryId: it.inventoryId || null,
          barcode: it.barcode || '',
          label: it.label,
          wt: it.wt||0,
          purityPct: it.purityPct||0,
          wastePct: it.wastePct||0,
          wasteSign: it.wasteSign||'+',
          mc: it.mc||0,
          isCash:false, cashAmt:0,
        })
      })
      payItems.forEach(it => {
        items.push({
          refType:'payment_inline',
          payType: it.payType,
          label: it.isCash ? `${it.payType} · ₹${it.cashAmt}` : `${it.payType} · ${it.wt}g @ ${it.purityPct}%`,
          wt: it.wt||0,
          purityPct: it.purityPct||0,
          wastePct: 0, wasteSign:'+',
          mc: 0,
          isCash: !!it.isCash,
          cashAmt: it.cashAmt||0,
        })
      })

      // surplus
      let extraToWallet = 0
      let extraCashOut  = 0
      if (surplus.hasSurplus) {
        if (surplusMode === 'wallet') extraToWallet = surplus.pureSurplus
        else                          extraCashOut  = surplus.cashSurplus
      }

      const { data: bill } = await axios.post(`${API}/api/bills`, {
        clientName: client.name.trim(),
        customerMobile: client.mobile||'',
        billType,                       // 'sale' or 'purchase'
        silverRate: parseFloat(silverRate)||0,
        items,
        discountPure: parseFloat(discountPure)||0,
        discountCash: parseFloat(discountCash)||0,
        taxMode, taxes,
        extraToWallet, extraCashOut,
      })
      setLastBill(bill)
      // reset form
      setSaleItems([]); setPayItems([]); setSilverRate('')
      setDiscountPure(''); setDiscountCash(''); setTaxMode(false); setTaxes([])
      setSurplusMode('cash')
    } catch (e) {
      console.log(e); alert('Failed to create bill: '+(e?.response?.data?.message||e.message))
    } finally { setSaving(false) }
  }

  const inp = 'w-full p-3 rounded-xl bg-white/10 border border-white/10 focus:border-pink-400 outline-none text-white text-sm'

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5">
      {/* header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
            Direct Billing
          </h1>
          <p className="text-xs text-gray-400 mt-1">Scan tagged items or add untagged. Mix old gold / bars / cash as payment. Each bill gets a unique number.</p>
        </div>
        <div className="flex rounded-2xl overflow-hidden border border-white/10">
          <button onClick={()=>setBillType('sale')}
            className={`px-4 py-2 text-sm font-bold ${billType==='sale'?'bg-pink-500 text-white':'bg-white/5 text-gray-400'}`}>Sale</button>
          <button onClick={()=>setBillType('purchase')}
            className={`px-4 py-2 text-sm font-bold ${billType==='purchase'?'bg-blue-500 text-white':'bg-white/5 text-gray-400'}`}>Purchase (we buy)</button>
        </div>
      </div>

      {/* last bill banner */}
      {lastBill && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-green-300 font-bold">✓ Bill created</p>
            <p className="text-white text-sm">
              <span className="font-black tracking-wider text-pink-200">#{lastBill.billNumber}</span>
              <span className="text-gray-400 ml-2">· {lastBill.clientName}</span>
              {lastBill.customerMobile && <span className="text-gray-500 ml-2">· {lastBill.customerMobile}</span>}
            </p>
            <p className="text-xs text-gray-400 mt-1">Final: ₹{Math.abs(lastBill.totals.finalCash)} {lastBill.totals.finalCash<0?'(we owe customer)':''}</p>
          </div>
          <button onClick={()=>setLastBill(null)} className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-300 text-xs">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* LEFT — items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer card */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
            <h3 className="text-sm font-black text-pink-300 mb-3">👤 Customer</h3>
            <ClientPicker value={client.name} mobile={client.mobile} onChange={setClient} />
          </div>

          {/* We Give */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-black text-yellow-300">🏅 Items We Give ({saleItems.length})</h3>
              <div className="flex gap-2 flex-wrap">
                <button onClick={()=>setScannerOpen(s=>!s)} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-xs font-bold">
                  {scannerOpen?'⏹ Stop':'📷 Scan Barcode'}
                </button>
                <button onClick={()=>setManualOpen(true)} className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-pink-300">
                  + Untagged Item
                </button>
              </div>
            </div>

            {/* manual barcode entry */}
            <BarcodeEntryInput onSubmit={handleScan} />

            {scannerOpen && (
              <div className="mb-3"><BarcodeScanner onScan={handleScan} /></div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {saleItems.length===0 && <p className="text-xs text-gray-500 py-3 text-center sm:col-span-2">No items yet — scan or add manually</p>}
              {saleItems.map(it => (
                <SaleRow key={it._id} item={it} onUpdate={v=>updateSale(it._id,v)} onRemove={()=>removeSale(it._id)} />
              ))}
            </div>
          </div>

          {/* They Give */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="text-sm font-black text-blue-300">💰 Items They Give ({payItems.length})</h3>
              <button onClick={()=>setPayOpen(true)} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-xs font-bold">
                + Add Bar / Old Gold / Cash
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {payItems.length===0 && <p className="text-xs text-gray-500 py-3 text-center sm:col-span-2">{billType==='purchase'?'We buy nothing yet':'No payment items yet'}</p>}
              {payItems.map(it => (
                <PayRow key={it._id} item={it} onUpdate={v=>updatePay(it._id,v)} onRemove={()=>removePay(it._id)} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — calc panel */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
            <h3 className="text-lg font-black text-pink-300">Bill Calculation</h3>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Today's Silver Rate (₹/g)</label>
              <input type="number" className={inp} placeholder="e.g. 95.50" value={silverRate} onChange={e=>setSilverRate(e.target.value)} />
            </div>

            {(saleItems.length>0 || payItems.length>0) && (
              <div className="bg-black/30 rounded-2xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-gray-400">A — Pure we give:</span><span className="text-yellow-300 font-bold">{totals.A} g</span></div>
                <div className="flex justify-between"><span className="text-gray-400">B — MC total:</span><span className="text-yellow-300 font-bold">₹{totals.B}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">C — Pure they give:</span><span className="text-blue-300 font-bold">{totals.C} g</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Cash they give:</span><span className="text-blue-300 font-bold">₹{totals.cashFromWallet}</span></div>
                <div className="border-t border-white/10 pt-1 flex justify-between">
                  <span className="text-gray-400">Net pure (A−C):</span>
                  <span className={`font-bold ${totals.netPure>=0?'text-orange-300':'text-green-300'}`}>{totals.netPure} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">D — Net cash:</span>
                  <span className={`font-bold ${totals.netCashBD>=0?'text-white':'text-green-300'}`}>
                    {totals.netCashBD>=0?`₹${totals.netCashBD} (they owe)`:`₹${Math.abs(totals.netCashBD)} (we owe)`}
                  </span>
                </div>
              </div>
            )}

            {/* Discounts */}
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
                <button onClick={()=>setTaxMode(t=>!t)} className={`px-3 py-1 rounded-lg text-xs font-bold ${taxMode?'bg-orange-500 text-white':'bg-white/10 text-gray-400'}`}>{taxMode?'ON':'OFF'}</button>
              </div>
              {taxMode && (
                <div className="space-y-1.5">
                  {taxes.map((t,i)=>(
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="flex-1 text-gray-300">{t.name}</span>
                      <span className="text-orange-300 font-bold">{t.pct}%</span>
                      <button onClick={()=>setTaxes(prev=>prev.filter((_,j)=>j!==i))} className="text-red-400/60">✕</button>
                    </div>
                  ))}
                  <div className="flex gap-1">
                    <input className="flex-1 p-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs outline-none" placeholder="Tax name" value={newTaxName} onChange={e=>setNewTaxName(e.target.value)} />
                    <input type="number" className="w-16 p-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-xs outline-none" placeholder="%" value={newTaxPct} onChange={e=>setNewTaxPct(e.target.value)} />
                    <button onClick={()=>{ if(newTaxName&&newTaxPct){setTaxes(p=>[...p,{name:newTaxName,pct:parseFloat(newTaxPct)||0}]);setNewTaxName('');setNewTaxPct('')} }} className="px-2 py-1.5 rounded-lg bg-pink-500 text-white text-xs font-bold">+</button>
                  </div>
                </div>
              )}
            </div>

            {/* Final total */}
            {(saleItems.length>0 || payItems.length>0) && (
              <div className={`rounded-2xl p-3 text-center ${totals.finalCash>=0?'bg-red-500/10 border border-red-500/20':'bg-green-500/10 border border-green-500/20'}`}>
                <p className="text-xs text-gray-400 mb-1">{totals.finalCash>=0?'They owe us':'We owe them'}</p>
                <p className={`text-2xl font-black ${totals.finalCash>=0?'text-red-300':'text-green-300'}`}>₹{Math.abs(totals.finalCash)}</p>
                {taxMode && totals.taxAmt>0 && <p className="text-xs text-orange-300 mt-1">incl. tax ₹{totals.taxAmt}</p>}
              </div>
            )}

            {/* Surplus handling */}
            {surplus.hasSurplus && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-3 space-y-2">
                <p className="text-xs text-green-300 font-bold">Customer paid extra: ₹{surplus.cashSurplus}{totals.rate>0?` ≈ ${surplus.pureSurplus} g pure`:''}</p>
                <div className="flex gap-2">
                  <button onClick={()=>setSurplusMode('cash')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold ${surplusMode==='cash'?'bg-green-500 text-white':'bg-white/10 text-gray-300'}`}>
                    Pay back cash
                  </button>
                  <button onClick={()=>setSurplusMode('wallet')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold ${surplusMode==='wallet'?'bg-blue-500 text-white':'bg-white/10 text-gray-300'}`}>
                    Store in wallet
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">
                  {surplusMode==='wallet'
                    ? `Will add ${surplus.pureSurplus} g pure (at 100%) to ${client.name||'client'}'s wallet`
                    : `Cash ₹${surplus.cashSurplus} will be handed to customer`}
                </p>
              </div>
            )}

            {/* Pay-with hint */}
            {totals.finalCash>0 && totals.rate>0 && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-3 text-xs">
                <p className="text-blue-300 font-bold mb-1">💡 Pay-with calculator</p>
                <p className="text-gray-400">If customer wants to pay with bars/old silver instead of cash:</p>
                <p className="text-gray-300 mt-1">
                  Remaining = <span className="text-pink-300 font-bold">₹{totals.finalCash}</span>
                  {' '}({n6(totals.finalCash/totals.rate)} g of 100% pure)
                </p>
                <p className="text-[10px] text-gray-500 mt-1">Click "Add Bar / Old Gold / Cash" to enter what they're giving. Required weight at any purity is shown in the dialog.</p>
              </div>
            )}

            <button onClick={submitBill} disabled={saving}
              className="w-full py-3 rounded-2xl font-black bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-40">
              {saving ? 'Creating Bill...' : '🧾 Create Bill'}
            </button>
          </div>
        </div>
      </div>

      {/* dialogs */}
      <AddManualDialog open={manualOpen} onClose={()=>setManualOpen(false)}
        onSave={(d)=>{ setSaleItems(prev=>[...prev, { _id:uid(), refType:'manual_sale', barcode:'', ...d }]); setManualOpen(false) }} />

      <AddPayInlineDialog open={payOpen} onClose={()=>setPayOpen(false)}
        defaultRemainPure={ totals.finalCash>0 && totals.rate>0 ? totals.finalCash/totals.rate : 0 }
        silverRate={totals.rate}
        onSave={(d)=>{ setPayItems(prev=>[...prev, { _id:uid(), ...d }]); setPayOpen(false) }} />
    </div>
  )
}

// small input that submits on Enter (gun-scanner ends with Enter)
function BarcodeEntryInput({ onSubmit }) {
  const [v, setV] = useState('')
  return (
    <div className="flex gap-2 mb-3">
      <input
        value={v}
        onChange={e=>setV(e.target.value)}
        onKeyDown={e=>{ if(e.key==='Enter'){ if(v.trim()){ onSubmit(v.trim()); setV('') } } }}
        placeholder="Type or scan barcode and press Enter"
        className="flex-1 p-2.5 rounded-xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white text-sm" />
      <button
        onClick={()=>{ if(v.trim()){ onSubmit(v.trim()); setV('') } }}
        className="px-4 py-2 rounded-xl bg-pink-500 text-white text-sm font-bold">Add</button>
    </div>
  )
}
