import { useState } from 'react'
import axios from 'axios'

const today = () => new Date().toISOString().split('T')[0]

const emptyItem = () => ({ barcode: '', weight: '' })

export default function NewTransaction() {

  const [customerName, setCustomerName] = useState('')
  const [productName,  setProductName]  = useState('')
  const [mode,         setMode]         = useState('barcode')
  const [date,         setDate]         = useState(today())

  // barcode mode
  const [items, setItems] = useState([emptyItem()])

  // pcs mode
  const [totalPieces, setTotalPieces] = useState('')
  const [totalWeight, setTotalWeight] = useState('')

  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState('')
  const [error,    setError]    = useState('')

  // ── barcode mode helpers ──────────────────────────────────
  const updateItem = (index, field, value) => {
    setItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addItem = () => setItems(prev => [...prev, emptyItem()])

  const removeItem = (index) =>
    setItems(prev => prev.filter((_, i) => i !== index))

  // ── submit ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!customerName.trim()) { setError('Customer name is required'); return }
    if (!productName.trim())  { setError('Product name is required');  return }

    setError('')
    setSaving(true)
    setSuccess('')

    try {
      const payload = {
        customerName:    customerName.trim(),
        productName:     productName.trim(),
        mode,
        transactionDate: new Date(date).toISOString(),
      }

      if (mode === 'barcode') {
        const validItems = items.filter(i => i.barcode.trim())
        if (!validItems.length) { setError('Add at least one barcode'); setSaving(false); return }
        payload.items = validItems.map(i => ({
          barcode: i.barcode.trim(),
          weight:  parseFloat(i.weight) || 0,
          status:  'PENDING',
        }))
      } else {
        if (!totalPieces) { setError('Enter total pieces'); setSaving(false); return }
        payload.pcsTracking = {
          totalPieces:    parseInt(totalPieces) || 0,
          totalWeight:    parseFloat(totalWeight) || 0,
          returnedPieces: 0,
          returnedWeight: 0,
        }
        payload.items = []
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/api/transactions`, payload)

      setSuccess('Transaction saved!')
      setCustomerName('')
      setProductName('')
      setMode('barcode')
      setDate(today())
      setItems([emptyItem()])
      setTotalPieces('')
      setTotalWeight('')

    } catch (err) {
      console.log(err)
      setError('Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white placeholder-gray-500'
  const labelCls = 'block text-gray-400 text-sm mb-2'

  return (
    <div className="p-6 max-w-2xl space-y-6">

      <h2 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
        New Transaction
      </h2>

      {/* ── ROW 1: customer + product ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Customer Name *</label>
          <input
            className={inputCls}
            placeholder="Enter customer name"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Product Name *</label>
          <input
            className={inputCls}
            placeholder="e.g. SALEM KOLUSU"
            value={productName}
            onChange={e => setProductName(e.target.value)}
          />
        </div>
      </div>

      {/* ── ROW 2: date + mode ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Transaction Date</label>
          <input
            type="date"
            className={inputCls}
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Mode</label>
          <div className="flex gap-3 mt-1">
            {['barcode', 'pcs'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-4 rounded-2xl font-bold capitalize transition-all ${
                  mode === m
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                {m === 'barcode' ? 'Barcode / Weight' : 'Pieces Only'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BARCODE MODE ── */}
      {mode === 'barcode' && (
        <div className="space-y-3">
          <label className={labelCls}>Items</label>

          {items.map((item, i) => (
            <div key={i} className="flex gap-3 items-center">
              <input
                className={`${inputCls} flex-1`}
                placeholder={`Barcode ${i + 1}`}
                value={item.barcode}
                onChange={e => updateItem(i, 'barcode', e.target.value)}
              />
              <input
                className={`${inputCls} w-32`}
                placeholder="Weight g"
                type="number"
                value={item.weight}
                onChange={e => updateItem(i, 'weight', e.target.value)}
              />
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(i)}
                  className="text-red-400 hover:text-red-300 text-xl px-2"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            onClick={addItem}
            className="text-pink-400 hover:text-pink-300 text-sm font-bold py-2"
          >
            + Add another item
          </button>
        </div>
      )}

      {/* ── PCS MODE ── */}
      {mode === 'pcs' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Total Pieces *</label>
            <input
              className={inputCls}
              placeholder="e.g. 12"
              type="number"
              value={totalPieces}
              onChange={e => setTotalPieces(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Total Weight (g)</label>
            <input
              className={inputCls}
              placeholder="e.g. 450.5"
              type="number"
              value={totalWeight}
              onChange={e => setTotalWeight(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {error   && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}

      {/* ── SAVE ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Transaction'}
      </button>

    </div>
  )
}