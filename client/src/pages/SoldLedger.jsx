import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function SoldLedger() {
  const [list,   setList]   = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    axios.get(`${API}/api/eerettu/sold-clients`)
      .then(res => setList(res.data))
      .catch(e => console.log(e))
  }, [])

  const filtered = list.filter(c =>
    c.clientName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-6">
        Sold Ledger
      </h1>

      <input
        className="w-full p-4 rounded-2xl bg-white/10 backdrop-blur-lg border border-white/10 outline-none focus:border-pink-400 text-white mb-6"
        placeholder="Search client..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-center py-20 text-gray-400">No sold clients</p>
        )}
        {filtered.map(c => (
          <Link
            key={c.clientName}
            to={`/client/${encodeURIComponent(c.clientName)}`}
            className="flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl p-5 transition-all"
          >
            <span className="text-lg font-bold text-pink-300">{c.clientName}</span>
            <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-xl">
              {c.soldCount} sold
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
