import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import {
  FaPlus, FaTrash, FaPrint, FaCheck, FaEdit,
  FaArrowLeft, FaArrowRight, FaBoxOpen, FaSyncAlt,
} from 'react-icons/fa'

import Autocomplete from '../components/Autocomplete'
import SupplierModal from '../components/SupplierModal'
import AddProductModal from '../components/AddProductModal'
import BarcodeLabel, { printBarcodes } from '../components/BarcodeLabel'

const API = import.meta.env.VITE_API_URL

/* ─── helpers ──────────────────────────────────────────────────────── */
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const emptyProductRow = () => ({
  productKey:     newKey(),
  supplierName:   '',
  supplierId:     '',
  productId:      0,
  prefix:         '',
  productName:    '',
  subProductName: '',
  quantity:       '',
  totalWeight:    '',
  purity:         '',
  isBulk:         false,
  bulkLength:     '',
  bulkUnit:       'm',
})

const ownerKeyFromStorage = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user'))
    return u?.username || u?.email || u?._id || 'anon'
  } catch { return 'anon' }
}

/* ─── main component ─────────────────────────────────────────────── */
export default function InventoryEntry() {
  const navigate = useNavigate()

  const [step, setStep]           = useState(1)
  const [lotNumber, setLotNumber] = useState(null)
  const [savedLot, setSavedLot]   = useState(null)   // server lot doc after step1 saved
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes]         = useState('')
  const [rows, setRows]           = useState([emptyProductRow()])
  const [activeKey, setActiveKey] = useState('')
  const [items, setItems]         = useState([])     // tagged items for active product (step 2)
  const [allItems, setAllItems]   = useState([])     // all items in current lot (for review)
  const [summary, setSummary]     = useState([])     // lot summary on finalize
  const [loading, setLoading]     = useState(false)
  const [resumeBanner, setResumeBanner] = useState(false)

  // modals
  const [supplierModal, setSupplierModal] = useState(null)  // { rowIdx, initialName }
  const [productModal, setProductModal]   = useState(null)  // { rowIdx, initialName }

  // step 2 item form
  const [itemForm, setItemForm] = useState({ size: '', netWt: '', purity: '' })

  const ownerKey = useMemo(ownerKeyFromStorage, [])
  const debSave  = useRef(null)

  /* ── load existing draft on mount ────────────────────────────── */
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await axios.get(`${API}/api/drafts/inventory-entry`, { params: { ownerKey } })
        if (cancelled) return
        if (data?.data) {
          const d = data.data
          if (d.formData?.receivedDate) setReceivedDate(d.formData.receivedDate)
          if (d.formData?.notes !== undefined) setNotes(d.formData.notes)
          if (Array.isArray(d.formData?.rows) && d.formData.rows.length > 0) {
            setRows(d.formData.rows)
          }
          if (d.lotNumber) {
            setLotNumber(d.lotNumber)
            // re-hydrate the saved LOT from server
            try {
              const r = await axios.get(`${API}/api/lots/${d.lotNumber}`)
              setSavedLot(r.data.data)
              setAllItems(r.data.items || [])
            } catch (_) {}
          }
          if (d.step) setStep(d.step)
          if (d.activeProductKey) setActiveKey(d.activeProductKey)
          setResumeBanner(true)
          setTimeout(() => setResumeBanner(false), 4500)
        }
      } catch (_) {}
    })()
    return () => { cancelled = true }
  }, [ownerKey])

  /* ── allocate a new LOT number (only if we don't have one) ─── */
  useEffect(() => {
    if (lotNumber) return
    ;(async () => {
      try {
        const { data } = await axios.get(`${API}/api/lots/next-number`)
        setLotNumber(data.lotNumber)
      } catch (_) {}
    })()
  }, [lotNumber])

  /* ── auto-save draft (debounced, never on first paint) ────── */
  const firstPaint = useRef(true)
  useEffect(() => {
    if (firstPaint.current) { firstPaint.current = false; return }
    if (debSave.current) clearTimeout(debSave.current)
    debSave.current = setTimeout(() => {
      axios.put(`${API}/api/drafts/inventory-entry`, {
        ownerKey,
        step,
        lotNumber: savedLot?.lotNumber || null,
        activeProductKey: activeKey,
        formData: { receivedDate, notes, rows },
      }).catch(() => {})
    }, 600)
  }, [ownerKey, step, savedLot, activeKey, receivedDate, notes, rows])

  /* ── reload items for the active product whenever it changes ── */
  useEffect(() => {
    if (step !== 2 || !savedLot || !activeKey) { setItems([]); return }
    setItems(allItems.filter(i => i.productKey === activeKey))
  }, [step, savedLot, activeKey, allItems])

  /* ───────────────────────────────────────────────────────────── */
  /* row helpers (step 1)                                          */
  /* ───────────────────────────────────────────────────────────── */
  const setRow = (idx, patch) =>
    setRows(rs => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)))

  const addRow = () => setRows(rs => [...rs, emptyProductRow()])

  const removeRow = (idx) => setRows(rs => rs.filter((_, i) => i !== idx))

  /* ── fetchers for autocomplete (declared once via useCallback-y closure) ── */
  const fetchSuppliers = async (q) => {
    const { data } = await axios.get(`${API}/api/suppliers`, { params: { q } })
    return data.data || []
  }

  const fetchProductsByName = useCallback(async (q) => {
    const { data } = await axios.get(`${API}/api/products/search`, { params: { q, field: 'productName' } })
    return data.data || []
  }, [])

  const fetchProductsBySub = useCallback(async (q) => {
    const { data } = await axios.get(`${API}/api/products/search`, { params: { q, field: 'subProductName' } })
    return data.data || []
  }, [])
  const fetchPurities = async (q) => {
    const { data } = await axios.get(`${API}/api/products/search`, { params: { q: '', field: 'productName' } })
    const set = new Set((data.data || []).map(p => String(p.purity)))
    const arr = Array.from(set).filter(Boolean).map(v => ({ name: v }))
    // static commons
    ;['92.5', '99', '95', 'SLM', '65'].forEach(v => {
      if (!set.has(v)) arr.push({ name: v })
    })
    return arr.filter(o => !q || o.name.toLowerCase().includes(q.toLowerCase()))
  }

  /* ───────────────────────────────────────────────────────────── */
  /* STEP 1 — save LOT                                              */
  /* ───────────────────────────────────────────────────────────── */
  const validateRow = (r) => {
    if (!r.productName)  return 'Product name required'
    if (!r.prefix)       return 'Prefix required (pick a product or add new one)'
    if (!r.supplierName) return 'Supplier required'
    if (!r.isBulk) {
      if (!Number(r.quantity) || Number(r.quantity) <= 0) return 'Quantity must be > 0'
    } else {
      if (!Number(r.bulkLength) || Number(r.bulkLength) <= 0) return 'Bulk length must be > 0'
    }
    if (!Number(r.totalWeight) || Number(r.totalWeight) < 0) return 'Total weight required'
    if (!r.purity) return 'Purity required'
    return null
  }

  const saveLot = async () => {
    if (!rows.length) { toast.error('Add at least one product'); return }
    for (let i = 0; i < rows.length; i++) {
      const err = validateRow(rows[i])
      if (err) { toast.error(`Row ${i + 1}: ${err}`); return }
    }
    setLoading(true)
    try {
      let resp
      if (savedLot) {
        // editing an existing draft LOT
        resp = await axios.put(`${API}/api/lots/${savedLot.lotNumber}`, {
          receivedDate, notes, products: rows,
        })
      } else {
        resp = await axios.post(`${API}/api/lots`, {
          lotNumber, receivedDate, notes, products: rows,
          createdBy: ownerKey,
        })
      }
      setSavedLot(resp.data.data)
      setLotNumber(resp.data.data.lotNumber)
      const r = await axios.get(`${API}/api/lots/${resp.data.data.lotNumber}`)
      setAllItems(r.data.items || [])
      toast.success(`LOT ${resp.data.data.lotNumber} ${savedLot ? 'updated' : 'saved'}`)
      setStep(2)
      // pick first non-bulk product as active
      const firstTagged = resp.data.data.products.find(p => !p.isBulk)
      setActiveKey(firstTagged?.productKey || resp.data.data.products[0]?.productKey || '')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save LOT')
    } finally {
      setLoading(false)
    }
  }

  /* ───────────────────────────────────────────────────────────── */
  /* STEP 2 — add items                                             */
  /* ───────────────────────────────────────────────────────────── */
  const activeProduct = useMemo(
    () => savedLot?.products.find(p => p.productKey === activeKey),
    [savedLot, activeKey]
  )

  const addItem = async () => {
    if (!activeProduct) { toast.error('Pick a product'); return }
    if (activeProduct.isBulk) { toast.error('This is a bulk product (length-based)'); return }
    if (!Number(itemForm.netWt) || Number(itemForm.netWt) <= 0) {
      toast.error('Weight required'); return
    }
    setLoading(true)
    try {
      const { data } = await axios.post(
        `${API}/api/lots/${savedLot.lotNumber}/products/${activeProduct.productKey}/items`,
        {
          netWt: Number(itemForm.netWt),
          size:  itemForm.size,
          purity: itemForm.purity || activeProduct.purity,
        }
      )
      // refresh items
      const r = await axios.get(`${API}/api/lots/${savedLot.lotNumber}`)
      setAllItems(r.data.items || [])
      setSavedLot(r.data.data)
      setItemForm({ size: '', netWt: '', purity: '' })
      toast.success(`Added ${data.barcodeDisplay}`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to add item')
    } finally {
      setLoading(false)
    }
  }

  const editItem = async (id, patch) => {
    try {
      await axios.put(`${API}/api/inventory/${id}`, patch)
      const r = await axios.get(`${API}/api/lots/${savedLot.lotNumber}`)
      setAllItems(r.data.items || [])
      setSavedLot(r.data.data)
      toast.success('Item updated')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed')
    }
  }

  const deleteItem = async (id) => {
    if (!confirm('Delete this tagged item? Barcode will be removed.')) return
    try {
      await axios.delete(`${API}/api/inventory/${id}`)
      const r = await axios.get(`${API}/api/lots/${savedLot.lotNumber}`)
      setAllItems(r.data.items || [])
      setSavedLot(r.data.data)
      toast.success('Deleted')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed')
    }
  }

  const saveProductBatch = async () => {
    if (!activeProduct) return
    // compute diff
    const totalItemsWt = items.reduce((s, i) => s + (i.netWt || 0), 0)
    const declared = Number(activeProduct.totalWeight) || 0
    const diff = +(totalItemsWt - declared).toFixed(3)
    try {
      await axios.post(
        `${API}/api/lots/${savedLot.lotNumber}/products/${activeProduct.productKey}/complete`,
        { completed: true }
      )
      const r = await axios.get(`${API}/api/lots/${savedLot.lotNumber}`)
      setSavedLot(r.data.data)
    } catch (_) {}
    // toast a rich notification
    if (Math.abs(diff) < 0.001) {
      toast.success(`Perfectly matched! ${totalItemsWt.toFixed(3)} g = declared ${declared.toFixed(3)} g`,
        { duration: 5000, icon: '🎯' })
    } else if (diff > 0) {
      toast(`Items weigh ${diff.toFixed(3)} g MORE than declared (${totalItemsWt.toFixed(3)} g vs ${declared.toFixed(3)} g)`,
        { duration: 6000, icon: '⚠️', style: { background: '#3a2a00', color: '#ffd97a' } })
    } else {
      toast(`Items weigh ${Math.abs(diff).toFixed(3)} g LESS than declared (${totalItemsWt.toFixed(3)} g vs ${declared.toFixed(3)} g)`,
        { duration: 6000, icon: '⚠️', style: { background: '#3a2a00', color: '#ffd97a' } })
    }
  }

  const printAllForProduct = () => {
    if (!items.length) { toast.error('No items to print'); return }
    printBarcodes(items.map(i => ({
      code: i.barcode,
      display: `${i.lotNumber || ''}-${i.prefix}${i.serialNo}`,
      productName: i.productName,
      subProductName: i.subProductName,
      netWt: i.netWt,
      size: i.size,
      purity: i.purity,
    })))
  }

  const finalizeAndExit = async () => {
    if (!savedLot) return
    try {
      const r = await axios.get(`${API}/api/lots/${savedLot.lotNumber}/summary`)
      setSummary(r.data.summary || [])
      await axios.post(`${API}/api/lots/${savedLot.lotNumber}/finalize`)
      await axios.delete(`${API}/api/drafts/inventory-entry`, { params: { ownerKey } })
      toast.success(`LOT ${savedLot.lotNumber} finalized`)
    } catch (e) {
      toast.error('Failed to finalize')
    }
  }

  const discardDraft = async () => {
    if (!confirm('Discard this in-progress entry? Any unsaved fields will be lost (saved items remain).')) return
    await axios.delete(`${API}/api/drafts/inventory-entry`, { params: { ownerKey } })
    setStep(1)
    setRows([emptyProductRow()])
    setNotes('')
    setSavedLot(null)
    setAllItems([])
    setActiveKey('')
    setItemForm({ size:'', netWt:'', purity:'' })
    try {
      const { data } = await axios.get(`${API}/api/lots/next-number`)
      setLotNumber(data.lotNumber)
    } catch (_) {}
    toast('Draft cleared', { icon: '🧹' })
  }

  /* ── derived UI state ───────────────────────────────────────── */
  const products = savedLot?.products || []
  const itemsForActive = items
  const liveItemsWt = itemsForActive.reduce((s, i) => s + (i.netWt || 0), 0)

  /* ─────────────────────────────────────────────────────────── */
  /* render                                                      */
  /* ─────────────────────────────────────────────────────────── */
  return (
    <div className="p-4 sm:p-6 md:p-8">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f1f2a', color: '#fff' } }} />

      {/* header */}
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
            New Inventory Entry
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            LOT <span className="text-pink-300 font-bold">#{lotNumber || '...'}</span>
            {savedLot && <span className="ml-3 px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">SAVED · {savedLot.status}</span>}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={discardDraft} className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm">
            <FaSyncAlt className="inline mr-1.5" /> Start fresh
          </button>
        </div>
      </div>

      {/* resume banner */}
      {resumeBanner && (
        <div className="mb-4 p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-sm">
          Resumed from where you left off · saved automatically as you work.
        </div>
      )}

      {/* stepper */}
      <div className="flex items-center gap-3 mb-8 overflow-x-auto">
        <StepDot active={step === 1} done={!!savedLot} index={1} label="LOT details" />
        <div className="flex-1 h-px bg-white/10 min-w-[20px]" />
        <StepDot active={step === 2} done={false}      index={2} label="Tag items & barcodes" />
      </div>

      {/* ─── STEP 1 ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">LOT number</span>
              <input
                type="number"
                value={lotNumber || ''}
                onChange={e => setLotNumber(Number(e.target.value))}
                disabled={!!savedLot}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Received date</span>
              <input
                type="date" value={receivedDate}
                onChange={e => setReceivedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="block text-xs text-gray-400 mb-1">Notes</span>
              <input
                type="text" value={notes} onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                placeholder="any remarks…"
              />
            </label>
          </div>

          <div className="space-y-3">
            {rows.map((r, idx) => (
              <ProductRow
  key={r.productKey}
  idx={idx}
  row={r}
  onChange={(patch) => setRow(idx, patch)}
  onRemove={() => removeRow(idx)}
  fetchSuppliers={fetchSuppliers}
  fetchPurities={fetchPurities}

  // ADD THESE TWO LINES
  fetchProductsByName={fetchProductsByName}
  fetchProductsBySub={fetchProductsBySub}

  openSupplierModal={(name) =>
    setSupplierModal({ rowIdx: idx, initialName: name })
  }
  openProductModal={(name) =>
    setProductModal({ rowIdx: idx, initialName: name })
  }
/>
            ))}
          </div>

          <button
            onClick={addRow}
            className="w-full py-3 rounded-2xl border border-dashed border-white/20 hover:bg-white/5 text-gray-300"
          >
            <FaPlus className="inline mr-2" /> Add another product to this LOT
          </button>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={saveLot}
              disabled={loading}
              className="px-6 py-3 rounded-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-50"
            >
              {savedLot ? 'Update LOT' : 'Save LOT'} & continue <FaArrowRight className="inline ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2 ───────────────────────────────────────────── */}
      {step === 2 && savedLot && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
          {/* product list */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-3 space-y-1.5 max-h-[70vh] overflow-y-auto">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 px-2 pb-1">Products in LOT</h3>
            {products.map(p => {
              const isActive = p.productKey === activeKey
              const done = p.itemsAddedCount >= p.quantity && !p.isBulk
              return (
                <button
                  key={p.productKey}
                  onClick={() => setActiveKey(p.productKey)}
                  className={
                    'w-full text-left p-3 rounded-2xl border transition-all ' +
                    (isActive
                      ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 border-pink-400/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10')
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{p.productName}</span>
                    {p.isBulk
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">BULK</span>
                      : <span className={'text-xs px-2 py-0.5 rounded-full border ' +
                          (done ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-white/5 text-gray-400 border-white/10')}>
                          {p.itemsAddedCount}/{p.quantity}
                        </span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">
                    {p.subProductName || '—'} · {p.purity} · {p.prefix}
                  </div>
                </button>
              )
            })}
          </div>

          {/* active product panel */}
          <div className="space-y-4">
            {!activeProduct && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center text-gray-400">
                Pick a product from the left to start tagging items.
              </div>
            )}

            {activeProduct && (
              <>
                {/* header */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                  <div className="flex flex-wrap items-end gap-3 justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-white">
                        {activeProduct.productName}
                        {activeProduct.subProductName && <span className="text-gray-400 font-normal text-lg"> · {activeProduct.subProductName}</span>}
                      </h2>
                      <p className="text-xs text-gray-400 mt-1">
                        Supplier: <span className="text-gray-200">{activeProduct.supplierName || '—'}</span>
                        &nbsp;·&nbsp; Purity: <span className="text-gray-200">{activeProduct.purity}</span>
                        &nbsp;·&nbsp; Prefix: <span className="text-pink-300">{activeProduct.prefix}</span>
                      </p>
                    </div>

                    {!activeProduct.isBulk && (
                      <div className="text-right text-sm">
                        <div className="text-gray-400">
                          Items: <span className="text-white font-bold">{activeProduct.itemsAddedCount || 0}</span> / {activeProduct.quantity}
                        </div>
                        <div className="text-gray-400">
                          Weight: <span className="text-white font-bold">{Number(liveItemsWt || 0).toFixed(3)} g</span> / {Number(activeProduct.totalWeight).toFixed(3)} g
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {activeProduct.isBulk ? (
                  <BulkProductPanel
                    activeProduct={activeProduct}
                    lotNumber={savedLot.lotNumber}
                    onAfterChange={async () => {
                      const r = await axios.get(`${API}/api/lots/${savedLot.lotNumber}`)
                      setSavedLot(r.data.data)
                      setAllItems(r.data.items || [])
                    }}
                  />
                ) : (
                  <>
                    {/* item entry form */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-5">
                      <h4 className="text-sm font-bold text-gray-300 mb-3">Add item #{(activeProduct.itemsAddedCount || 0) + 1}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                        <label className="block">
                          <span className="block text-xs text-gray-400 mb-1">Size (optional)</span>
                          <input
                            type="text"
                            value={itemForm.size}
                            onChange={e => setItemForm(f => ({ ...f, size: e.target.value }))}
                            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                            placeholder="e.g. 16"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-xs text-gray-400 mb-1">Net wt (g) *</span>
                          <input
                            type="number" step="0.001"
                            value={itemForm.netWt}
                            onChange={e => setItemForm(f => ({ ...f, netWt: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addItem()}
                            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                          />
                        </label>
                        <label className="block">
                          <span className="block text-xs text-gray-400 mb-1">Purity (override)</span>
                          <input
                            type="text"
                            value={itemForm.purity}
                            onChange={e => setItemForm(f => ({ ...f, purity: e.target.value }))}
                            placeholder={activeProduct.purity}
                            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
                          />
                        </label>
                        <button
                          onClick={addItem}
                          disabled={loading}
                          className="px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-50"
                        >
                          <FaPlus className="inline mr-1.5" /> Add & Tag
                        </button>
                      </div>
                    </div>

                    {/* items table */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                      <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h4 className="text-sm font-bold text-gray-300">Tagged items ({itemsForActive.length})</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={printAllForProduct}
                            className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/15"
                          >
                            <FaPrint className="inline mr-1" /> Print all
                          </button>
                          <button
                            onClick={saveProductBatch}
                            className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-500/40"
                          >
                            <FaCheck className="inline mr-1" /> Save & verify totals
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-white/5 text-xs text-gray-400 uppercase">
                            <tr>
                              <th className="text-left px-4 py-2">#</th>
                              <th className="text-left px-4 py-2">Barcode</th>
                              <th className="text-left px-4 py-2">Size</th>
                              <th className="text-right px-4 py-2">Wt (g)</th>
                              <th className="text-left px-4 py-2">Purity</th>
                              <th className="text-left px-4 py-2 w-[180px]">Tag</th>
                              <th className="text-right px-4 py-2">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itemsForActive.length === 0 && (
                              <tr><td colSpan={7} className="text-center py-8 text-gray-500">No items added yet</td></tr>
                            )}
                            {itemsForActive.map((it, i) => (
                              <ItemRow
                                key={it._id}
                                index={i + 1}
                                item={it}
                                onEdit={(patch) => editItem(it._id, patch)}
                                onDelete={() => deleteItem(it._id)}
                                onPrintOne={() => printBarcodes([{
                                  code: it.barcode,
                                  display: `${it.lotNumber}-${it.prefix}${it.serialNo}`,
                                  productName: it.productName,
                                  subProductName: it.subProductName,
                                  prefix: it.prefix,
                                  netWt: it.netWt, size: it.size, purity: it.purity,
                                }])}
                              />
                            ))}
                          </tbody>
                          {itemsForActive.length > 0 && (
                            <tfoot>
                              <tr className="border-t border-white/10 text-gray-300">
                                <td colSpan={3} className="px-4 py-2 text-right font-semibold">Total</td>
                                <td className="px-4 py-2 text-right font-bold text-pink-300">{liveItemsWt.toFixed(3)} g</td>
                                <td colSpan={3} className="px-4 py-2 text-xs text-gray-400">
                                  Declared: {Number(activeProduct.totalWeight).toFixed(3)} g ·
                                  Diff: <span className={Math.abs(liveItemsWt - activeProduct.totalWeight) < 0.001 ? 'text-emerald-300' : 'text-yellow-300'}>
                                    {(liveItemsWt - activeProduct.totalWeight).toFixed(3)} g
                                  </span>
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* bottom nav */}
            <div className="flex flex-wrap justify-between gap-3 pt-2">
              <button onClick={() => setStep(1)} className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10">
                <FaArrowLeft className="inline mr-1.5" /> Edit LOT details
              </button>
              <div className="flex gap-3">
                <button onClick={finalizeAndExit}
                  className="px-5 py-3 rounded-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90"
                >
                  <FaCheck className="inline mr-1.5" /> Finalize LOT
                </button>
              </div>
            </div>

            {summary.length > 0 && (
              <div className="bg-white/5 border border-emerald-500/30 rounded-3xl p-4 mt-2">
                <h4 className="font-bold mb-2">LOT Summary</h4>
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-400 uppercase">
                    <tr><th className="text-left py-1">Product</th><th className="text-right">Items</th><th className="text-right">Declared (g)</th><th className="text-right">Tagged (g)</th><th className="text-right">Diff</th></tr>
                  </thead>
                  <tbody>
                    {summary.map(s => (
                      <tr key={s.productKey} className="border-t border-white/5">
                        <td className="py-1.5">{s.productName} {s.isBulk && <span className="text-xs text-cyan-300">(bulk)</span>}</td>
                        <td className="text-right">{s.addedCount}/{s.expectedCount}</td>
                        <td className="text-right">{Number(s.expectedWeight).toFixed(3)}</td>
                        <td className="text-right">{Number(s.addedWeight).toFixed(3)}</td>
                        <td className={'text-right font-semibold ' + (Math.abs(s.weightDiff) < 0.001 ? 'text-emerald-300' : 'text-yellow-300')}>
                          {Number(s.weightDiff).toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── modals ─────────────────────────────────────────── */}
      {supplierModal && (
        <SupplierModal
          initialName={supplierModal.initialName}
          onClose={() => setSupplierModal(null)}
          onCreated={(sup) => {
            setRow(supplierModal.rowIdx, { supplierName: sup.name, supplierId: sup._id })
            toast.success('Supplier added')
          }}
        />
      )}
      {productModal && (
        <AddProductModal
          initialName={productModal.initialName}
          onClose={() => setProductModal(null)}
          onCreated={(prod) => {
            setRow(productModal.rowIdx, {
              productName:    prod.productName,
              subProductName: prod.subProductName || '',
              prefix:         prod.prefix,
              productId:      prod.productId,
              purity:         String(prod.purity),
              isBulk:         !!prod.isBulk,
              bulkUnit:       prod.unit || 'm',
            })
            toast.success('Product added')
          }}
        />
      )}
    </div>
  )
}

/* ─── tiny sub-components ──────────────────────────────────── */

function StepDot({ active, done, index, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={
        'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ' +
        (active
          ? 'bg-gradient-to-r from-pink-500 to-purple-500 border-pink-400 text-white'
          : done
            ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
            : 'bg-white/5 border-white/10 text-gray-400')
      }>
        {done ? <FaCheck size={12} /> : index}
      </div>
      <span className={active || done ? 'text-white text-sm font-semibold' : 'text-gray-400 text-sm'}>
        {label}
      </span>
    </div>
  )
}

function ProductRow({
  idx,
  row,
  onChange,
  onRemove,
  fetchSuppliers,
  fetchPurities,

  // ADD THESE
  fetchProductsByName,
  fetchProductsBySub,

  openSupplierModal,
  openProductModal,
})  {
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Product #{idx + 1}</span>
        <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300">
          <FaTrash className="inline mr-1" /> Remove
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Supplier *">
          <Autocomplete
            value={row.supplierName}
            onChange={(v) => onChange({ supplierName: v, supplierId: '' })}
            fetcher={fetchSuppliers}
            getLabel={(o) => o.name}
            onPick={(o) => onChange({ supplierName: o.name, supplierId: o._id })}
            onAddNew={(q) => openSupplierModal(q)}
            placeholder="type supplier name…"
          />
        </Field>

        <Field label="Product name *">
          <Autocomplete
            value={row.productName}
            onChange={(v) => onChange({ productName: v, prefix: '', productId: 0 })}
            fetcher={fetchProductsByName}
            getLabel={(o) => o.productName}
            onPick={(o) => onChange({
              productName: o.productName,
              subProductName: o.subProductName || row.subProductName,
              prefix: o.prefix,
              productId: o.productId,
              purity: row.purity || String(o.purity),
              isBulk: !!o.isBulk,
              bulkUnit: o.unit || 'm',
            })}
            onAddNew={(q) => openProductModal(q)}
            placeholder="type product name…"
          />
        </Field>

        <Field label="Sub-product">
          <Autocomplete
            value={row.subProductName}
            onChange={(v) => onChange({ subProductName: v })}
            fetcher={fetchProductsBySub}
            getLabel={(o) => o.subProductName || o.productName}
            onPick={(o) => onChange({ subProductName: o.subProductName || '' })}
            placeholder="type sub-product…"
          />
        </Field>

        <Field label={row.isBulk ? `Bulk length (${row.bulkUnit}) *` : 'Quantity (items) *'}>
          {row.isBulk
            ? <input
                type="number" step="0.01"
                value={row.bulkLength}
                onChange={e => onChange({ bulkLength: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
              />
            : <input
                type="number"
                value={row.quantity}
                onChange={e => onChange({ quantity: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
              />}
        </Field>

        <Field label="Total weight (g) *">
          <input
            type="number" step="0.001"
            value={row.totalWeight}
            onChange={e => onChange({ totalWeight: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
          />
        </Field>

        <Field label="Purity *">
          <Autocomplete
            value={row.purity}
            onChange={(v) => onChange({ purity: v })}
            fetcher={fetchPurities}
            getLabel={(o) => o.name}
            onPick={(o) => onChange({ purity: o.name })}
            placeholder="e.g. 92.5, SLM, 99…"
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="text-xs text-gray-300 flex items-center gap-2">
          <input
            type="checkbox" checked={row.isBulk}
            onChange={e => onChange({ isBulk: e.target.checked })}
          />
          Bulk product (sold by length — no per-piece barcode)
        </label>
        {row.isBulk && (
          <label className="text-xs text-gray-300 flex items-center gap-2">
            Unit:&nbsp;
            <select
              value={row.bulkUnit}
              onChange={e => onChange({ bulkUnit: e.target.value })}
              className="px-2 py-1 rounded-md bg-white/5 border border-white/10"
            >
              <option value="m">m</option>
              <option value="ft">ft</option>
              <option value="inch">inch</option>
              <option value="g">g</option>
            </select>
          </label>
        )}
        {row.prefix && (
          <span className="ml-auto text-xs text-gray-400">
            Barcode prefix: <span className="text-pink-300 font-bold">{row.prefix}</span>
          </span>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  )
}

function ItemRow({ index, item, onEdit, onDelete, onPrintOne }) {
  const [edit, setEdit] = useState(false)
  const [f, setF]       = useState({ netWt: item.netWt, size: item.size || '', purity: item.purity || '' })

  return (
    <tr className="border-t border-white/5 hover:bg-white/5">
      <td className="px-4 py-2 text-gray-400">{index}</td>
      <td className="px-4 py-2 font-mono text-xs text-pink-300">
        {item.lotNumber}-{item.prefix}{item.serialNo}
      </td>
      <td className="px-4 py-2">
        {edit
          ? <input value={f.size} onChange={e => setF({ ...f, size: e.target.value })} className="w-20 px-2 py-1 rounded-md bg-white/5 border border-white/10" />
          : item.size || <span className="text-gray-600">—</span>}
      </td>
      <td className="px-4 py-2 text-right">
        {edit
          ? <input type="number" step="0.001" value={f.netWt} onChange={e => setF({ ...f, netWt: e.target.value })} className="w-24 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-right" />
          : Number(item.netWt).toFixed(3)}
      </td>
      <td className="px-4 py-2">
        {edit
          ? <input value={f.purity} onChange={e => setF({ ...f, purity: e.target.value })} className="w-20 px-2 py-1 rounded-md bg-white/5 border border-white/10" />
          : item.purity}
      </td>
      <td className="px-4 py-2">
        <BarcodeLabel
          code={item.barcode}
          display={`${item.lotNumber}-${item.prefix}${item.serialNo}`}
          width={1.2} height={28} showText={false}
        />
      </td>
      <td className="px-4 py-2 text-right whitespace-nowrap">
        {edit ? (
          <>
            <button
              onClick={async () => { await onEdit({ netWt: Number(f.netWt), size: f.size, purity: f.purity }); setEdit(false) }}
              className="text-emerald-300 hover:text-emerald-200 mr-3"
            ><FaCheck /></button>
            <button onClick={() => setEdit(false)} className="text-gray-400 hover:text-white">✕</button>
          </>
        ) : (
          <>
            <button onClick={onPrintOne} className="text-gray-400 hover:text-white mr-3" title="Print"><FaPrint /></button>
            <button onClick={() => setEdit(true)} className="text-blue-300 hover:text-blue-200 mr-3" title="Edit"><FaEdit /></button>
            <button onClick={onDelete} className="text-red-400 hover:text-red-300" title="Delete"><FaTrash /></button>
          </>
        )}
      </td>
    </tr>
  )
}

function BulkProductPanel({ activeProduct, lotNumber, onAfterChange }) {
  const [bulkId, setBulkId]   = useState(null)
  const [stock, setStock]     = useState(null)
  const [out, setOut]         = useState({ quantity: '', clientName: '', note: '' })

  useEffect(() => {
    (async () => {
      // ensure a stock entry exists
      const { data } = await axios.post(`${API}/api/bulk-stock`, {
        productName: activeProduct.productName,
        subProductName: activeProduct.subProductName,
        purity: activeProduct.purity,
        unit: activeProduct.bulkUnit || 'm',
      })
      setBulkId(data.data._id)
      setStock(data.data)
    })()
  }, [activeProduct.productKey])

  const refresh = async () => {
    const { data } = await axios.get(`${API}/api/bulk-stock/${bulkId}`)
    setStock(data.data)
    onAfterChange?.()
  }

  const addOut = async () => {
    if (!Number(out.quantity) || Number(out.quantity) <= 0) {
      toast.error('Quantity required'); return
    }
    try {
      await axios.post(`${API}/api/bulk-stock/${bulkId}/transactions`, {
        type: 'OUT',
        quantity: Number(out.quantity),
        unit: activeProduct.bulkUnit || 'm',
        clientName: out.clientName,
        note: out.note,
      })
      setOut({ quantity:'', clientName:'', note:'' })
      await refresh()
      toast.success('Recorded outgoing')
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed')
    }
  }

  if (!stock) return <div className="text-gray-400 p-4">Loading bulk stock…</div>

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-cyan-500/15 to-blue-500/10 border border-cyan-500/30 rounded-3xl p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="text-xs uppercase text-cyan-300 mb-1">Length-based stock</div>
            <div className="text-3xl font-black text-white">
              {Number(stock.balance || 0).toFixed(3)} <span className="text-base text-gray-300">{stock.unit}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              In: {Number(stock.totalIn).toFixed(3)} · Out: {Number(stock.totalOut).toFixed(3)}
            </div>
          </div>
          <div className="ml-auto text-xs text-gray-400 text-right">
            Received from this LOT: <b className="text-cyan-200">{activeProduct.bulkLength} {activeProduct.bulkUnit}</b>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
        <h4 className="text-sm font-bold text-gray-300 mb-3">Record outgoing (sale / transfer to client)</h4>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
          <Field label={`Quantity (${activeProduct.bulkUnit}) *`}>
            <input type="number" step="0.001" value={out.quantity}
              onChange={e => setOut({ ...out, quantity: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
            />
          </Field>
          <Field label="Client name">
            <input type="text" value={out.clientName}
              onChange={e => setOut({ ...out, clientName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
            />
          </Field>
          <Field label="Note">
            <input type="text" value={out.note}
              onChange={e => setOut({ ...out, note: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10"
            />
          </Field>
          <button onClick={addOut} className="px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500">
            <FaPlus className="inline mr-1.5" /> Add OUT
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/10 text-sm font-bold text-gray-300">
          Transaction history ({stock.transactions.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs text-gray-400 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-left">LOT / Party</th>
                <th className="px-3 py-2 text-left">Note</th>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...stock.transactions].reverse().map(t => (
                <tr key={t._id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <span className={'px-2 py-0.5 rounded-full text-xs ' +
                      (t.type === 'IN' ? 'bg-emerald-500/20 text-emerald-300' :
                       t.type === 'OUT' ? 'bg-rose-500/20 text-rose-300' :
                       'bg-amber-500/20 text-amber-300')}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{Number(t.quantity).toFixed(3)} {t.unit}</td>
                  <td className="px-3 py-2 text-gray-300">
                    {t.lotNumber ? `LOT #${t.lotNumber}` : ''}{' '}
                    {t.supplierName || t.clientName || ''}
                  </td>
                  <td className="px-3 py-2 text-gray-400">{t.note}</td>
                  <td className="px-3 py-2 text-gray-400">{new Date(t.txnDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={async () => {
                        if (!confirm('Reverse this transaction?')) return
                        await axios.delete(`${API}/api/bulk-stock/${bulkId}/transactions/${t._id}`)
                        await refresh()
                      }}
                      className="text-red-400 hover:text-red-300"
                    ><FaTrash /></button>
                  </td>
                </tr>
              ))}
              {stock.transactions.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-500">No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}