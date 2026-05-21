import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

const todayStr = () => new Date().toISOString().split('T')[0]
const emptyItem = () => ({ barcode: '', wt: '', size: '' })


// ── barcode item status editor ─────────────────────────────
function BarcodeStatusEditor({ status, onSave }) {
  const [val,      setVal]      = useState(status)
  const [showBill, setShowBill] = useState(false)
  const [bookNo,   setBookNo]   = useState('')
  const [pageNo,   setPageNo]   = useState('')

  const handleChange = (s) => {
    setVal(s)
    setShowBill(s === 'SOLD')
    if (s !== 'SOLD') onSave({ status: s })
  }

  const confirmSold = () =>
    onSave({ status: 'SOLD', billBookNo: bookNo, billPageNo: pageNo })

  const btnCls = (s) =>
    `px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
      val === s
        ? s === 'PENDING'  ? 'bg-yellow-400 text-black'
        : s === 'RETURNED' ? 'bg-green-500 text-white'
        :                    'bg-red-500 text-white'
        : 'bg-white/10 text-gray-400 hover:bg-white/20'
    }`

  return (
    <div className="flex flex-col gap-2 items-start">
      <div className="flex gap-2">
        {['PENDING', 'RETURNED', 'SOLD'].map(s => (
          <button key={s} className={btnCls(s)} onClick={() => handleChange(s)}>{s}</button>
        ))}
      </div>
      {showBill && (
        <div className="flex gap-2 items-center mt-1">
          <input
            className="w-24 p-2 rounded-xl bg-white/10 border border-pink-400 outline-none text-sm text-white placeholder-gray-500"
            placeholder="Book No"
            value={bookNo}
            onChange={e => setBookNo(e.target.value)}
          />
          <input
            className="w-20 p-2 rounded-xl bg-white/10 border border-pink-400 outline-none text-sm text-white placeholder-gray-500"
            placeholder="Page No"
            value={pageNo}
            onChange={e => setPageNo(e.target.value)}
          />
          <button onClick={confirmSold} className="bg-green-500 px-3 py-2 rounded-xl text-xs font-bold">
            Confirm
          </button>
        </div>
      )}
    </div>
  )
}


// ── wt mode status editor ──────────────────────────────────
function WtStatusEditor({ wtMode, onSave }) {
  const [val,         setVal]         = useState(wtMode.status)
  const [showSoldForm, setShowSoldForm] = useState(false)
  const [retPcs,      setRetPcs]      = useState('')
  const [retWt,       setRetWt]       = useState('')
  const [bookNo,      setBookNo]      = useState('')
  const [pageNo,      setPageNo]      = useState('')

  // auto-calc display
  const totalPcs = wtMode.totalPcs || 0
  const totalWt  = wtMode.totalWt  || 0
  const calcSoldPcs = totalPcs - (parseFloat(retPcs) || 0)
  const calcSoldWt  = parseFloat((totalWt - (parseFloat(retWt) || 0)).toFixed(3))

  const handleChange = (s) => {
    setVal(s)
    setShowSoldForm(s === 'SOLD')
    if (s === 'RETURNED') onSave({ status: 'RETURNED' })
    if (s === 'PENDING')  onSave({ status: 'PENDING' })
  }

  const confirmSold = () =>
    onSave({
      status:      'SOLD',
      returnedPcs: parseFloat(retPcs) || 0,
      returnedWt:  parseFloat(retWt)  || 0,
      billBookNo:  bookNo,
      billPageNo:  pageNo,
    })

  const btnCls = (s) =>
    `px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
      val === s
        ? s === 'PENDING'  ? 'bg-yellow-400 text-black'
        : s === 'RETURNED' ? 'bg-green-500 text-white'
        :                    'bg-red-500 text-white'
        : 'bg-white/10 text-gray-400 hover:bg-white/20'
    }`

  const miniInp = 'w-24 p-2 rounded-xl bg-white/10 border border-pink-400 outline-none text-sm text-white placeholder-gray-500'

  return (
    <div className="flex flex-col gap-3 items-start">

      <div className="flex gap-2">
        {['PENDING', 'RETURNED', 'SOLD'].map(s => (
          <button key={s} className={btnCls(s)} onClick={() => handleChange(s)}>{s}</button>
        ))}
      </div>

      {showSoldForm && (
        <div className="bg-black/30 rounded-2xl p-4 space-y-3 w-full">

          {/* returned inputs */}
          <p className="text-xs text-gray-400 font-semibold">Enter returned quantity:</p>
          <div className="flex gap-3 flex-wrap">
            <div>
              <p className="text-xs text-gray-500 mb-1">Returned Pcs</p>
              <input
                className={miniInp}
                type="number"
                placeholder="0"
                value={retPcs}
                onChange={e => setRetPcs(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Returned Wt (g)</p>
              <input
                className={miniInp}
                type="number"
                placeholder="0"
                value={retWt}
                onChange={e => setRetWt(e.target.value)}
              />
            </div>
          </div>

          {/* auto-calculated sold */}
          <div className="flex gap-6 text-sm bg-white/5 rounded-xl px-4 py-3">
            <div>
              <p className="text-gray-500 text-xs">Sold Pcs</p>
              <p className="font-bold text-green-400">{calcSoldPcs}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Sold Wt (g)</p>
              <p className="font-bold text-green-400">{calcSoldWt}</p>
            </div>
          </div>

          {/* bill inputs */}
          <div className="flex gap-3 flex-wrap">
            <div>
              <p className="text-xs text-gray-500 mb-1">Bill Book No</p>
              <input
                className={miniInp}
                placeholder="Book No"
                value={bookNo}
                onChange={e => setBookNo(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Page No</p>
              <input
                className={miniInp}
                placeholder="Page No"
                value={pageNo}
                onChange={e => setPageNo(e.target.value)}
              />
            </div>
          </div>

          <button
            onClick={confirmSold}
            disabled={calcSoldPcs < 0 || calcSoldWt < 0}
            className="bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
          >
            Confirm Sold
          </button>
        </div>
      )}

      {/* show saved breakdown after confirming */}
      {val === 'SOLD' && !showSoldForm && wtMode.soldPcs > 0 && (
        <div className="flex gap-6 text-xs text-gray-400 bg-white/5 rounded-xl px-4 py-2">
          <span>Returned: {wtMode.returnedPcs} pcs / {wtMode.returnedWt} g</span>
          <span className="text-green-400">Sold: {wtMode.soldPcs} pcs / {wtMode.soldWt} g</span>
        </div>
      )}
    </div>
  )
}


// ── today's list ────────────────────────────────────────────
function TodayList({ refresh }) {
  const [list, setList] = useState([])

  const fetch = async () => {
    try {
      const res = await axios.get(`${API}/api/eerettu/today`)
      setList(res.data)
    } catch (e) { console.log(e) }
  }

  useEffect(() => { fetch() }, [refresh])

  const updateItem = async (id, barcode, payload) => {
    await axios.patch(`${API}/api/eerettu/${id}/item`, { barcode, ...payload })
    fetch()
  }

  const updateWt = async (id, payload) => {
    await axios.patch(`${API}/api/eerettu/${id}/wt`, payload)
    fetch()
  }

  const grouped = list.reduce((acc, e) => {
    if (!acc[e.clientName]) acc[e.clientName] = []
    acc[e.clientName].push(e)
    return acc
  }, {})

  if (!list.length) return (
    <p className="text-gray-500 text-sm text-center py-8">No transactions today</p>
  )

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([client, entries]) => (
        <div key={client} className="bg-white/5 border border-white/10 rounded-3xl p-5">

          <h3 className="text-xl font-black text-pink-300 mb-4">{client}</h3>

          <div className="space-y-4">
            {entries.map(e => (
              <div key={e._id} className="bg-black/20 rounded-2xl p-4">

                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-orange-300 text-base">{e.roughProductName}</span>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">
                    {e.mode === 'barcode' ? 'Barcode' : 'Wt Mode'}
                  </span>
                </div>

                {/* BARCODE MODE */}
                {e.mode === 'barcode' && (
                  <div className="space-y-3">
                    {e.items.map((item, idx) => (
                      <div key={idx} className="bg-black/30 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex gap-4 text-sm">
                          <span className="font-bold text-white">{item.barcode}</span>
                          {item.wt > 0 && <span className="text-gray-400">{item.wt} g</span>}
                          {item.size  && <span className="text-gray-400">Size: {item.size}</span>}
                        </div>
                        <BarcodeStatusEditor
                          status={item.status}
                          onSave={(payload) => updateItem(e._id, item.barcode, payload)}
                        />
                        {item.status === 'SOLD' && item.billBookNo && (
                          <p className="text-xs text-gray-500">
                            Bill: Book {item.billBookNo} / Page {item.billPageNo}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* WT MODE */}
                {e.mode === 'wt' && (
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-6 text-sm text-gray-300">
                      <span>Total: {e.wtMode.totalPcs} pcs</span>
                      <span>{e.wtMode.totalWt} g</span>
                    </div>
                    <WtStatusEditor
                      wtMode={e.wtMode}
                      onSave={(payload) => updateWt(e._id, payload)}
                    />
                    {e.wtMode.status === 'SOLD' && e.wtMode.billBookNo && (
                      <p className="text-xs text-gray-500">
                        Bill: Book {e.wtMode.billBookNo} / Page {e.wtMode.billPageNo}
                      </p>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}


// ── main page ───────────────────────────────────────────────
export default function NewTransaction() {

  const [clientName,        setClientName]        = useState('')
  const [clientSuggestions, setClientSuggestions] = useState([])
  const [showDropdown,      setShowDropdown]      = useState(false)
  const [roughProductName,  setRoughProductName]  = useState('')
  const [date,              setDate]              = useState(todayStr())
  const [mode,              setMode]              = useState('barcode')
  const [items,             setItems]             = useState([emptyItem()])
  const [totalPcs,          setTotalPcs]          = useState('')
  const [totalWt,           setTotalWt]           = useState('')
  const [saving,            setSaving]            = useState(false)
  const [error,             setError]             = useState('')
  const [refreshToday,      setRefreshToday]      = useState(0)

  const dropdownRef = useRef(null)

  useEffect(() => {
    if (!clientName.trim()) { setClientSuggestions([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/api/clients?q=${encodeURIComponent(clientName)}`)
        setClientSuggestions(res.data)
        setShowDropdown(true)
      } catch (e) { console.log(e) }
    }, 200)
    return () => clearTimeout(t)
  }, [clientName])

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const updateItem = (idx, field, value) =>
    setItems(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })

  const addItem = () => {
    const last = items[items.length - 1]
    setItems(prev => [...prev, { barcode: last.barcode, wt: '', size: '' }])
  }

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!clientName.trim())       { setError('Client name is required');       return }
    if (!roughProductName.trim()) { setError('Rough product name is required'); return }
    setError('')
    setSaving(true)

    try {
      const payload = {
        clientName:       clientName.trim(),
        roughProductName: roughProductName.trim(),
        date:             new Date(date).toISOString(),
        mode,
      }

      if (mode === 'barcode') {
        const valid = items.filter(i => i.barcode.trim())
        if (!valid.length) { setError('Add at least one barcode'); setSaving(false); return }
        payload.items = valid.map(i => ({
          barcode: i.barcode.trim(),
          wt:      parseFloat(i.wt) || 0,
          size:    i.size.trim(),
          status:  'PENDING',
        }))
      } else {
        if (!totalPcs) { setError('Enter total pieces'); setSaving(false); return }
        payload.wtMode = {
          totalPcs: parseInt(totalPcs) || 0,
          totalWt:  parseFloat(totalWt) || 0,
          status:   'PENDING',
        }
      }

      await axios.post(`${API}/api/eerettu`, payload)

      setClientName('')
      setRoughProductName('')
      setDate(todayStr())
      setMode('barcode')
      setItems([emptyItem()])
      setTotalPcs('')
      setTotalWt('')
      setRefreshToday(r => r + 1)

    } catch (err) {
      console.log(err)
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white placeholder-gray-500'
  const lbl = 'block text-gray-400 text-sm mb-2'

  return (
    <div className="p-6 max-w-2xl space-y-8">

      <h2 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
        New Transaction
      </h2>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative" ref={dropdownRef}>
            <label className={lbl}>Client Name *</label>
            <input
              className={inp}
              placeholder="Type to search client..."
              value={clientName}
              onChange={e => { setClientName(e.target.value); setShowDropdown(true) }}
              onFocus={() => clientName && setShowDropdown(true)}
              autoComplete="off"
            />
            {showDropdown && clientSuggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 w-full bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                {clientSuggestions.map(c => (
                  <div
                    key={c._id}
                    className="px-4 py-3 hover:bg-white/10 cursor-pointer text-white text-sm"
                    onMouseDown={() => { setClientName(c.clientName); setShowDropdown(false) }}
                  >
                    {c.clientName}
                    {c.mobiles?.length > 0 &&
                      <span className="ml-2 text-gray-500 text-xs">{c.mobiles[0]}</span>
                    }
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={lbl}>Date</label>
            <input type="date" className={inp} value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={lbl}>Rough Product Name *</label>
          <input className={inp} placeholder="e.g. SALEM KOLUSU" value={roughProductName} onChange={e => setRoughProductName(e.target.value)} />
        </div>

        <div>
          <label className={lbl}>Mode</label>
          <div className="flex gap-3">
            {[['barcode', 'Barcode Mode'], ['wt', 'Wt Mode']].map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
                  mode === m ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-white/10 text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === 'barcode' && (
  <div className="space-y-3">
    {items.map((item, i) => (
      <div key={i} className="flex gap-2 items-center">
        <input
          className="flex-1 min-w-0 p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white placeholder-gray-500"
          placeholder="Barcode"
          value={item.barcode}
          onChange={e => updateItem(i, 'barcode', e.target.value)}
        />
        <input
          className="w-28 flex-shrink-0 p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white placeholder-gray-500"
          placeholder="Wt g"
          type="number"
          value={item.wt}
          onChange={e => updateItem(i, 'wt', e.target.value)}
        />
        <input
          className="w-24 flex-shrink-0 p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white placeholder-gray-500"
          placeholder="Size"
          value={item.size}
          onChange={e => updateItem(i, 'size', e.target.value)}
        />
        {items.length > 1 && (
          <button onClick={() => removeItem(i)} className="text-red-400 px-2 text-xl flex-shrink-0">✕</button>
        )}
      </div>
    ))}
    <button onClick={addItem} className="text-pink-400 hover:text-pink-300 text-sm font-bold py-1">
      + Add Barcode
    </button>
  </div>
)}

        {mode === 'wt' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Total Pieces *</label>
              <input className={inp} placeholder="e.g. 12" type="number" value={totalPcs} onChange={e => setTotalPcs(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Total Weight (g)</label>
              <input className={inp} placeholder="e.g. 450.5" type="number" value={totalWt} onChange={e => setTotalWt(e.target.value)} />
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-bold text-lg bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Transaction'}
        </button>
      </div>

      <div>
        <h3 className="text-xl font-black text-white mb-4">Today's Transactions</h3>
        <TodayList refresh={refreshToday} />
      </div>

    </div>
  )
}