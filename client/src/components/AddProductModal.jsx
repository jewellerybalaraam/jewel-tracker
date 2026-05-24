import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function AddProductModal({ initialName = '', onClose, onCreated }) {
  const [form, setForm] = useState({
    productName: initialName,
    subProductName: '',
    prefix: '',
    purity: 92.5,
    isBulk: false,
    unit: 'pcs',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.productName.trim()) { setErr('Product name required'); return }
    if (!form.prefix.trim())      { setErr('Prefix (abbr) required for barcode'); return }
    setBusy(true); setErr('')
    try {
      const { data } = await axios.post(`${API}/api/products`, {
        ...form,
        prefix: form.prefix.toUpperCase(),
        unit: form.isBulk ? (form.unit === 'pcs' ? 'm' : form.unit) : 'pcs',
      })
      onCreated?.(data.data)
      onClose?.()
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  const cls = 'w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#15151c] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-2xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
          New Product
        </h3>

        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs text-gray-400 mb-1">Product name *</span>
            <input type="text" value={form.productName} onChange={e => set('productName', e.target.value)} className={cls} />
          </label>

          <label className="block">
            <span className="block text-xs text-gray-400 mb-1">Sub-product</span>
            <input type="text" value={form.subProductName} onChange={e => set('subProductName', e.target.value)} className={cls} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Prefix (3-4 letters) *</span>
              <input
                type="text" maxLength={6}
                value={form.prefix}
                onChange={e => set('prefix', e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                className={cls + ' uppercase tracking-widest'}
                placeholder="ABC"
              />
            </label>

            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Default purity</span>
              <input type="number" step="0.01" value={form.purity} onChange={e => set('purity', e.target.value)} className={cls} />
            </label>
          </div>

          <label className="flex items-center gap-2 mt-1">
            <input type="checkbox" checked={form.isBulk} onChange={e => set('isBulk', e.target.checked)} />
            <span className="text-sm text-gray-300">Bulk / length-based (e.g. rope) — no per-piece barcode</span>
          </label>

          {form.isBulk && (
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Unit</span>
              <select value={form.unit === 'pcs' ? 'm' : form.unit} onChange={e => set('unit', e.target.value)} className={cls}>
                <option value="m">meters (m)</option>
                <option value="ft">feet (ft)</option>
                <option value="inch">inches</option>
                <option value="g">grams (g)</option>
              </select>
            </label>
          )}
        </div>

        {err && <p className="text-red-400 text-sm mt-3">{err}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save Product'}
          </button>
        </div>
      </div>
    </div>
  )
}
