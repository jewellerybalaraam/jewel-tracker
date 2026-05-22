import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

const dateOnly = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toISOString().split('T')[0]
}

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

// Build flat sold-rows: { clientName, dateKey, soldAt, type, label, details }
function extractSoldRows(eerettus) {
  const rows = []
  eerettus.forEach(e => {
    if (e.mode === 'barcode') {
      (e.items || []).forEach(item => {
        if (item.status === 'SOLD') {
          const when = item.soldAt || e.date
          rows.push({
            id:           `${e._id}_${item.barcode}`,
            clientName:   e.clientName,
            dateKey:      dateOnly(when),
            soldAt:       when,
            type:         'barcode',
            roughProduct: e.roughProductName,
            productName:  item.productName || '',
            barcode:      item.barcode,
            wt:           item.wt,
            size:         item.size,
            purity:       item.purity,
            billBookNo:   item.billBookNo,
            billPageNo:   item.billPageNo,
          })
        }
      })
    } else if (e.mode === 'wt' && e.wtMode?.status === 'SOLD') {
      const when = e.wtMode.soldAt || e.date
      rows.push({
        id:           `${e._id}_wt`,
        clientName:   e.clientName,
        dateKey:      dateOnly(when),
        soldAt:       when,
        type:         'wt',
        roughProduct: e.roughProductName,
        soldPcs:      e.wtMode.soldPcs,
        soldWt:       e.wtMode.soldWt,
        purity:       e.wtMode.purity,
        billBookNo:   e.wtMode.billBookNo,
        billPageNo:   e.wtMode.billPageNo,
      })
    }
  })
  return rows
}

export default function SoldPage() {

  const [eerettus, setEerettus] = useState([])
  const [search,   setSearch]   = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [sortBy,   setSortBy]   = useState('date_desc')

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const res = await axios.get(`${API}/api/eerettu`)
      setEerettus(res.data)
    } catch (e) { console.log(e) }
  }

  const rows = useMemo(() => extractSoldRows(eerettus), [eerettus])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (q) {
        const hay = [r.clientName, r.roughProduct, r.productName, r.barcode].join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (fromDate && r.dateKey < fromDate) return false
      if (toDate   && r.dateKey > toDate)   return false
      return true
    })
  }, [rows, search, fromDate, toDate])

  // group by clientName + dateKey
  const groups = useMemo(() => {
    const map = {}
    filtered.forEach(r => {
      const key = `${r.clientName}::${r.dateKey}`
      if (!map[key]) map[key] = { clientName: r.clientName, dateKey: r.dateKey, items: [] }
      map[key].items.push(r)
    })
    const arr = Object.values(map)
    arr.sort((a, b) => {
      if (sortBy === 'date_asc')   return a.dateKey.localeCompare(b.dateKey)
      if (sortBy === 'date_desc')  return b.dateKey.localeCompare(a.dateKey)
      if (sortBy === 'client_asc') return a.clientName.localeCompare(b.clientName)
      return 0
    })
    return arr
  }, [filtered, sortBy])

  const inp = 'p-3 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10 outline-none focus:border-pink-400 text-white text-sm'

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-6">
        Sold Items
      </h1>

      {/* SEARCH + FILTERS */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        <input
          className={`${inp} flex-1`}
          placeholder="Search client, product, barcode..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <input type="date" className={inp} value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <input type="date" className={inp} value={toDate}   onChange={e => setToDate(e.target.value)} />
        <select className={inp} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="client_asc">Client A–Z</option>
        </select>
      </div>

      <div className="space-y-5">
        {groups.length === 0 && (
          <p className="text-center py-20 text-gray-400">No sold items match your filters</p>
        )}

        {groups.map(g => (
          <div key={`${g.clientName}_${g.dateKey}`} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <Link
                  to={`/client/${encodeURIComponent(g.clientName)}`}
                  className="text-xl font-bold text-pink-300 hover:text-pink-200 hover:underline"
                >
                  {g.clientName}
                </Link>
                <p className="text-orange-300 text-sm">sold {g.items.length} item{g.items.length === 1 ? '' : 's'}</p>
              </div>
              <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-xl">
                {fmtDate(g.dateKey)}
              </span>
            </div>

            <div className="space-y-2">
              {g.items.map(r => (
                <div key={r.id} className="bg-black/30 rounded-2xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="text-gray-500 text-xs bg-white/5 px-2 py-0.5 rounded-lg">{r.type === 'barcode' ? 'Barcode' : 'Wt'}</span>
                    <span className="text-orange-300 font-semibold">{r.roughProduct}</span>
                    {r.type === 'barcode' && (
                      <>
                        <span className="font-bold text-white">{r.barcode}</span>
                        {r.wt > 0 && <span className="text-gray-400">{r.wt} g</span>}
                        {r.size && <span className="text-gray-400">Size {r.size}</span>}
                      </>
                    )}
                    {r.type === 'wt' && (
                      <>
                        <span className="text-gray-300">{r.soldPcs} pcs</span>
                        <span className="text-gray-300">{r.soldWt} g</span>
                      </>
                    )}
                    {r.purity && <span className="text-orange-300">{r.purity}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {r.billBookNo && <span>Bill {r.billBookNo}/{r.billPageNo}</span>}
                    <span>{fmtTime(r.soldAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
