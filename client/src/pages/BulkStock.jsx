import { useEffect, useState } from 'react'
import axios from 'axios'
import toast, { Toaster } from 'react-hot-toast'
import { FaPlus, FaTrash, FaBoxOpen } from 'react-icons/fa'

const API = import.meta.env.VITE_API_URL

export default function BulkStock() {
  const [stocks, setStocks] = useState([])
  const [openId, setOpenId] = useState(null)

  const refresh = async () => {
    const { data } = await axios.get(`${API}/api/bulk-stock`)
    setStocks(data.data || [])
  }
  useEffect(() => { refresh() }, [])

  const active = stocks.find(s => s._id === openId)

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1f1f2a', color: '#fff' } }} />

      <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
        Bulk Stock
      </h1>
      <p className="text-gray-400 text-sm mb-6">
        Length / weight-based goods (e.g. silver rope) — track receipts, sales and remaining balance.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-3 space-y-1.5 max-h-[80vh] overflow-y-auto">
          {stocks.length === 0 && (
            <div className="text-gray-500 text-sm p-3"><FaBoxOpen className="inline mr-2" />No bulk products yet</div>
          )}
          {stocks.map(s => (
            <button
              key={s._id}
              onClick={() => setOpenId(s._id)}
              className={
                'w-full text-left p-3 rounded-2xl border transition-all ' +
                (openId === s._id
                  ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 border-cyan-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10')
              }
            >
              <div className="font-semibold text-sm truncate">{s.productName}</div>
              <div className="text-xs text-gray-400 truncate">{s.subProductName || '—'} · {s.purity}</div>
              <div className="text-xs mt-1">
                <span className="text-emerald-300">In {Number(s.totalIn).toFixed(2)}</span>
                <span className="mx-1 text-gray-500">·</span>
                <span className="text-rose-300">Out {Number(s.totalOut).toFixed(2)}</span>
                <span className="mx-1 text-gray-500">·</span>
                <span className="text-cyan-200 font-bold">Bal {Number(s.balance).toFixed(2)} {s.unit}</span>
              </div>
            </button>
          ))}
        </div>

        {!active && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center text-gray-400">
            Pick a bulk product to see its full transaction ledger.
          </div>
        )}

        {active && <StockDetail key={active._id} stock={active} onRefresh={async () => { await refresh() }} />}
      </div>
    </div>
  )
}

function StockDetail({ stock, onRefresh }) {
  const [tab, setTab] = useState('OUT')
  const [form, setForm] = useState({ quantity: '', supplierName: '', clientName: '', note: '' })

  const submit = async () => {
    if (!Number(form.quantity) || Number(form.quantity) === 0) {
      toast.error('Quantity required'); return
    }
    try {
      await axios.post(`${API}/api/bulk-stock/${stock._id}/transactions`, {
        type: tab,
        quantity: Number(form.quantity),
        unit: stock.unit,
        supplierName: form.supplierName,
        clientName:   form.clientName,
        note: form.note,
      })
      setForm({ quantity:'', supplierName:'', clientName:'', note:'' })
      await onRefresh()
      toast.success(`${tab} recorded`)
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-cyan-500/15 to-blue-500/10 border border-cyan-500/30 rounded-3xl p-5">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div>
            <div className="text-xs uppercase text-cyan-300">{stock.productName} {stock.subProductName && '· ' + stock.subProductName}</div>
            <div className="text-4xl font-black text-white mt-1">
              {Number(stock.balance).toFixed(3)} <span className="text-base text-gray-300">{stock.unit}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Total in: {Number(stock.totalIn).toFixed(3)} · Total out: {Number(stock.totalOut).toFixed(3)} · Purity: {stock.purity || '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-4">
        <div className="flex gap-2 mb-3">
          {['IN', 'OUT', 'ADJUST'].map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              className={
                'px-3 py-1.5 rounded-lg text-xs font-bold ' +
                (tab === t
                  ? (t === 'IN' ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                     : t === 'OUT' ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                     : 'bg-amber-500/30 text-amber-200 border border-amber-400/40')
                  : 'bg-white/5 text-gray-400 border border-white/10')
              }
            >{t}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-end">
          <Field label={`Qty (${stock.unit}) *`}>
            <input type="number" step="0.001" value={form.quantity}
              onChange={e => setForm({ ...form, quantity: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10" />
          </Field>
          {tab === 'IN' && (
            <Field label="Supplier">
              <input value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10" />
            </Field>
          )}
          {tab === 'OUT' && (
            <Field label="Client">
              <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10" />
            </Field>
          )}
          {tab === 'ADJUST' && (
            <Field label="Hint">
              <div className="text-xs text-gray-500 px-3 py-2">+positive: add stock · −negative: remove stock</div>
            </Field>
          )}
          <Field label="Note">
            <input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10" />
          </Field>
          <div /> {/* spacer */}
          <button onClick={submit}
            className="px-5 py-2 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500">
            <FaPlus className="inline mr-1.5" /> Record {tab}
          </button>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/10 text-sm font-bold text-gray-300">
          Ledger ({stock.transactions.length})
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
                    {t.lotNumber ? `LOT #${t.lotNumber} ` : ''}
                    {t.supplierName || t.clientName || ''}
                  </td>
                  <td className="px-3 py-2 text-gray-400">{t.note}</td>
                  <td className="px-3 py-2 text-gray-400">{new Date(t.txnDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={async () => {
                        if (!confirm('Reverse this transaction?')) return
                        await axios.delete(`${API}/api/bulk-stock/${stock._id}/transactions/${t._id}`)
                        await onRefresh()
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  )
}
