import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function SupplierModal({ initialName = '', onClose, onCreated }) {
  const [form, setForm] = useState({
    name: initialName, phone: '', address: '', gst: '', notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) { setErr('Supplier name is required'); return }
    setBusy(true); setErr('')
    try {
      const { data } = await axios.post(`${API}/api/suppliers`, form)
      onCreated?.(data.data)
      onClose?.()
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#15151c] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <h3 className="text-2xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-4">
          New Supplier
        </h3>

        <div className="space-y-3">
          <Field label="Name *"    value={form.name}    onChange={v => set('name', v)} />
          <Field label="Phone"     value={form.phone}   onChange={v => set('phone', v)} />
          <Field label="Address"   value={form.address} onChange={v => set('address', v)} textarea />
          <Field label="GST"       value={form.gst}     onChange={v => set('gst', v)} />
          <Field label="Notes"     value={form.notes}   onChange={v => set('notes', v)} textarea />
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
            {busy ? 'Saving…' : 'Save Supplier'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, textarea }) {
  const cls = 'w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-400'
  return (
    <label className="block">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      {textarea
        ? <textarea rows={2} value={value} onChange={e => onChange(e.target.value)} className={cls} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} className={cls} />}
    </label>
  )
}
