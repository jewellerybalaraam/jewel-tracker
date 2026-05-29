import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

function StatusBadge({ status }) {
  return (
    <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
      status === 'SOLD'     ? 'bg-red-500' :
      status === 'RETURNED' ? 'bg-green-500' :
      'bg-yellow-400 text-black'
    }`}>
      {status}
    </span>
  )
}

export default function Transactions() {

  const [list,         setList]         = useState([])
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [editDateId,   setEditDateId]   = useState(null)
  const [editDateVal,  setEditDateVal]  = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    fetchAll()
    searchRef.current?.focus()
  }, [])

  const fetchAll = async () => {
    try {
      const res = await axios.get(`${API}/api/eerettu`)
      setList(res.data)
    } catch (e) { console.log(e) }
  }

  const saveDate = async (id) => {
    await axios.patch(`${API}/api/eerettu/${id}/date`, { date: editDateVal })
    setEditDateId(null)
    fetchAll()
  }

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const isoDate = (d) => new Date(d).toISOString().split('T')[0]

  const filtered = list.filter(e => {
    const q = search.toLowerCase()
    const matchSearch =
      e.clientName?.toLowerCase().includes(q) ||
      e.roughProductName?.toLowerCase().includes(q) ||
      e.items?.some(i => i.barcode?.toLowerCase().includes(q))

    const matchStatus =
      statusFilter === 'ALL' ||
      (e.mode === 'barcode' && e.items?.some(i => i.status === statusFilter)) ||
      (e.mode === 'wt'      && e.wtMode?.status === statusFilter)

    return matchSearch && matchStatus
  })

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen">

      <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-6">
        Transactions
      </h1>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <input
          ref={searchRef}
          type="text"
          placeholder="Search client, product, barcode..."
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

      {/* LIST */}
      <div className="space-y-5">
        {filtered.length === 0 && (
          <p className="text-center py-20 text-gray-400">No Transactions Found</p>
        )}

        {filtered.map(e => (
          <div key={e._id} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-pink-300">{e.clientName}</h2>
                <p className="text-orange-300 font-semibold">{e.roughProductName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-lg">
                    {e.mode === 'barcode' ? 'Barcode Mode' : 'Wt Mode'}
                  </span>
                  <span className="text-xs font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2.5 py-0.5 rounded-lg">
                    {e.mode === 'barcode'
                      ? `${(e.items || []).length} item${(e.items || []).length !== 1 ? 's' : ''}`
                      : `${e.wtMode?.totalPcs ?? 0} pcs`}
                  </span>
                </div>
              </div>

              {/* DATE EDIT */}
              <div className="text-sm text-gray-400 flex items-center gap-2">
                {editDateId === e._id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={editDateVal}
                      onChange={ev => setEditDateVal(ev.target.value)}
                      className="p-2 rounded-xl bg-white/10 border border-pink-400 outline-none text-white text-sm"
                    />
                    <button onClick={() => saveDate(e._id)} className="bg-green-500 px-3 py-2 rounded-xl text-sm font-bold">Save</button>
                    <button onClick={() => setEditDateId(null)} className="bg-white/10 px-3 py-2 rounded-xl text-sm text-gray-400">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>{fmtDate(e.date || e.createdAt)}</span>
                    <button
                      onClick={() => { setEditDateId(e._id); setEditDateVal(isoDate(e.date || e.createdAt)) }}
                      className="text-pink-400 text-xs bg-white/5 px-2 py-1 rounded-lg hover:bg-white/10"
                    >
                      ✎ edit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* BARCODE MODE */}
            {e.mode === 'barcode' && (
              <div className="space-y-2">
                {e.items?.map((item, idx) => (
                  <div key={idx} className="bg-black/30 p-3 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex gap-4 text-sm">
                      <span className="font-bold">{item.barcode}</span>
                      {item.wt  > 0 && <span className="text-gray-400">{item.wt} g</span>}
                      {item.size    && <span className="text-gray-400">Size: {item.size}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={item.status} />
                      {item.status === 'SOLD' && item.billBookNo &&
                        <span className="text-xs text-gray-500">Book {item.billBookNo} / Pg {item.billPageNo}</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* WT MODE */}
            {e.mode === 'wt' && (
              <div className="bg-black/30 p-4 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex gap-6 text-sm">
                  <span className="text-gray-300">{e.wtMode?.totalPcs} pcs</span>
                  <span className="text-gray-300">{e.wtMode?.totalWt} g</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.wtMode?.status} />
                  {e.wtMode?.status === 'SOLD' && e.wtMode?.billBookNo &&
                    <span className="text-xs text-gray-500">Book {e.wtMode.billBookNo} / Pg {e.wtMode.billPageNo}</span>
                  }
                </div>
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  )
}