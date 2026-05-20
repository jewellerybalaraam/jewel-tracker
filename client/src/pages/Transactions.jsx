import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

export default function Transactions() {

  const [transactions,  setTransactions]  = useState([])
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState('ALL')
  const [editDateId,    setEditDateId]    = useState(null)
  const [editDateVal,   setEditDateVal]   = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    fetchTransactions()
    searchRef.current?.focus()
  }, [])

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/transactions`)
      setTransactions(res.data)
    } catch (err) { console.log(err) }
  }

  const handleSaveDate = async (id) => {
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/transactions/${id}`,
        { transactionDate: editDateVal }
      )
      setEditDateId(null)
      fetchTransactions()
    } catch (err) { console.log(err) }
  }

  const filtered = transactions.filter(t => {
    const q = search.toLowerCase()
    const matchSearch =
      t.customerName?.toLowerCase().includes(q) ||
      t.productName?.toLowerCase().includes(q) ||
      t.items?.some(i => i.barcode?.toLowerCase().includes(q))

    const matchStatus =
      statusFilter === 'ALL' ||
      t.items?.some(i => i.status === statusFilter)

    return matchSearch && matchStatus
  })

  const displayDate = (t) =>
    new Date(t.transactionDate || t.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  const isoDate = (t) => {
    const d = new Date(t.transactionDate || t.createdAt)
    return d.toISOString().split('T')[0]
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen">

      {/* ── SEARCH + FILTER ── */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search customer, product, barcode..."
          className="flex-1 p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10 outline-none focus:border-pink-400"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10 outline-none"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="SOLD">Sold</option>
          <option value="RETURNED">Returned</option>
        </select>
      </div>

      {/* ── LIST ── */}
      <div className="space-y-6">

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">No Transactions Found</div>
        )}

        {filtered.map(t => {
          const totalPcs      = t.pcsTracking?.totalPieces    || 0
          const returnedPcs   = t.pcsTracking?.returnedPieces || 0
          const soldPcs       = totalPcs - returnedPcs
          const totalWeight   = t.pcsTracking?.totalWeight    || 0
          const returnedWeight = t.pcsTracking?.returnedWeight || 0
          const soldWeight    = (totalWeight - returnedWeight).toFixed(2)

          return (
            <div key={t._id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl">

              {/* HEADER */}
              <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-pink-300 break-words">{t.customerName}</h2>
                  <p className="text-gray-300 text-lg">{t.productName}</p>
                </div>

                {/* DATE + EDIT */}
                <div className="text-sm text-gray-400 flex items-center gap-2">
                  {editDateId === t._id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={editDateVal}
                        onChange={e => setEditDateVal(e.target.value)}
                        className="p-2 rounded-xl bg-white/10 border border-pink-400 outline-none text-white text-sm"
                      />
                      <button
                        onClick={() => handleSaveDate(t._id)}
                        className="bg-green-500 px-3 py-2 rounded-xl text-sm font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditDateId(null)}
                        className="bg-white/10 px-3 py-2 rounded-xl text-sm text-gray-400"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span>{displayDate(t)}</span>
                      <button
                        onClick={() => { setEditDateId(t._id); setEditDateVal(isoDate(t)) }}
                        className="text-pink-400 hover:text-pink-300 text-xs bg-white/5 px-2 py-1 rounded-lg"
                      >
                        ✎ edit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* PCS MODE */}
              {t.mode === 'pcs' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  <div className="bg-black/30 rounded-2xl p-4">
                    <p className="text-gray-400 text-sm">Total</p>
                    <p className="font-bold text-lg">{totalPcs} pcs</p>
                    <p className="text-gray-300">{totalWeight} g</p>
                  </div>
                  <div className="bg-red-500/20 rounded-2xl p-4">
                    <p className="text-red-300 text-sm">Sold</p>
                    <p className="font-bold text-lg">{soldPcs} pcs</p>
                    <p className="text-gray-200">{soldWeight} g</p>
                  </div>
                  <div className="bg-green-500/20 rounded-2xl p-4">
                    <p className="text-green-300 text-sm">Returned</p>
                    <p className="font-bold text-lg">{returnedPcs} pcs</p>
                    <p className="text-gray-200">{returnedWeight} g</p>
                  </div>
                </div>
              )}

              {/* BARCODE MODE */}
              {t.mode === 'barcode' && (
                <div className="space-y-3">
                  {t.items?.map((item, idx) => (
                    <div key={idx} className="bg-black/30 p-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="font-bold break-all text-lg">{item.barcode}</p>
                        <p className="text-sm text-gray-400">{item.weight} g</p>
                      </div>
                      <span className={`px-4 py-2 rounded-xl font-bold w-fit ${
                        item.status === 'SOLD'     ? 'bg-red-500' :
                        item.status === 'RETURNED' ? 'bg-green-500' :
                        'bg-yellow-400 text-black'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}