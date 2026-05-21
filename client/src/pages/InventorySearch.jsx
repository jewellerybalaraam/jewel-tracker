import { useState } from 'react'
import axios from 'axios'
import { Scanner } from '@yudiel/react-qr-scanner'

const API = import.meta.env.VITE_API_URL

const Field = ({ label, value, accent }) => {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-semibold ${accent || 'text-white'}`}>{value}</span>
    </div>
  )
}

const purityColor = (p) => {
  if (!p) return ''
  const s = String(p).toUpperCase()
  if (s === 'SLM') return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
  if (s === '99')  return 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30'
  if (s === '95')  return 'bg-orange-400/20 text-orange-300 border-orange-400/30'
  return 'bg-white/10 text-gray-300 border-white/10'
}

export default function InventorySearch() {

  const [barcode,     setBarcode]     = useState('')
  const [item,        setItem]        = useState(null)
  const [notFound,    setNotFound]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const search = async (code) => {
    const q = (code || barcode).trim()
    if (!q) return

    setLoading(true)
    setItem(null)
    setNotFound(false)

    try {
      const res = await axios.get(`${API}/api/inventory/barcode/${q}`)
      setItem(res.data.data)
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  const handleScan = (result) => {
    if (result?.[0]?.rawValue) {
      const code = result[0].rawValue
      setBarcode(code)
      setShowScanner(false)
      search(code)
    }
  }

  const formatDate = (d) => {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-xl">

      <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-2">
        Inventory Search
      </h1>
      <p className="text-gray-500 text-sm mb-8">Look up any item by its barcode tag</p>

      {/* search bar */}
      <div className="flex gap-3 mb-5">
        <input
          type="text"
          value={barcode}
          onChange={e => { setBarcode(e.target.value); setItem(null); setNotFound(false) }}
          onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Enter barcode tag (e.g. 2AART1)"
          autoFocus
          className="flex-1 p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white placeholder-gray-500"
        />
        <button
          onClick={() => search()}
          disabled={loading || !barcode.trim()}
          className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-4 rounded-2xl font-bold disabled:opacity-40 transition-all"
        >
          {loading ? '…' : 'Search'}
        </button>
        <button
          onClick={() => setShowScanner(s => !s)}
          className="bg-white/10 hover:bg-white/20 px-4 py-4 rounded-2xl transition-all text-lg"
          title="Scan QR"
        >
          📷
        </button>
      </div>

      {/* qr scanner */}
      {showScanner && (
        <div className="mb-6 overflow-hidden rounded-3xl border border-white/10">
          <Scanner
            onScan={handleScan}
            onError={err => console.log(err)}
          />
        </div>
      )}

      {/* loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* not found */}
      {!loading && notFound && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-8 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-red-400 font-bold text-lg">Not Found</p>
          <p className="text-gray-500 text-sm mt-1">No inventory item with barcode <span className="text-white font-mono">{barcode}</span></p>
        </div>
      )}

      {/* result card */}
      {!loading && item && (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">

          {/* header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">{item.productName}</h2>
              {item.subProductName && item.subProductName !== item.productName && (
                <p className="text-gray-400 text-sm mt-0.5">{item.subProductName}</p>
              )}
              <p className="text-pink-300 font-mono text-sm mt-1">{item.barcode}</p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {/* status badge */}
              <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                item.status === 'AVAILABLE'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                {item.status}
              </span>

              {/* purity badge */}
              {item.purity && (
                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${purityColor(item.purity)}`}>
                  {item.purity}
                </span>
              )}
            </div>
          </div>

          <hr className="border-white/10" />

          {/* details grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <Field label="Product ID"      value={item.productId} />
            <Field label="Net Weight"      value={item.netWt ? `${item.netWt} g` : null} accent="text-orange-300" />
            <Field label="Making Charge"   value={item.makingCharge ? `₹ ${item.makingCharge}` : null} />
            <Field label="Pure Rate"       value={item.pureRate ? `₹ ${item.pureRate}` : null} />
            <Field label="Size"            value={item.size || null} />
            <Field label="Record Time"     value={item.recordTime || null} />
            <Field label="Tagged Date"     value={formatDate(item.recordDate)} />
          </div>

          {/* full-width weight highlight */}
          {item.netWt > 0 && (
            <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 rounded-2xl p-4 flex items-center justify-between">
              <span className="text-gray-400 text-sm">Net Weight</span>
              <span className="text-2xl font-black text-orange-300">{item.netWt} <span className="text-base font-normal text-gray-400">g</span></span>
            </div>
          )}

        </div>
      )}

    </div>
  )
}