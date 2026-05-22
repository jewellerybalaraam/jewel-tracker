import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const STATUS_COLORS = {
  Pending: '#EAB308',
  Sold: '#EF4444',
  Returned: '#22C55E',
}

function Dashboard() {
  const [eerettus, setEerettus] = useState([])

  useEffect(() => { fetchEerettus() }, [])

  const fetchEerettus = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/eerettu`)
      setEerettus(res.data)
    } catch (error) {
      console.log(error)
    }
  }

  let pendingCount = 0, soldCount = 0, returnedCount = 0

  eerettus.forEach((e) => {
    if (e.mode === 'barcode') {
      e.items?.forEach((item) => {
        if (item.status === 'PENDING')  pendingCount++
        if (item.status === 'SOLD')     soldCount++
        if (item.status === 'RETURNED') returnedCount++
      })
    } else if (e.mode === 'wt' && e.wtMode) {
      if (e.wtMode.status === 'PENDING')  pendingCount  += e.wtMode.totalPcs || 0
      if (e.wtMode.status === 'SOLD')     soldCount     += e.wtMode.soldPcs  || 0
      if (e.wtMode.status === 'RETURNED') returnedCount += e.wtMode.totalPcs || 0
    }
  })

  const chartData = [
    { name: 'Pending',  value: pendingCount },
    { name: 'Sold',     value: soldCount },
    { name: 'Returned', value: returnedCount },
  ]

  const tile = 'p-6 rounded-3xl border border-white/10 transition-all'

  return (
    <div className="p-6 space-y-8">

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className={`bg-white/5 ${tile}`}>
          <h2 className="text-gray-400">Total Transactions</h2>
          <p className="text-4xl font-bold text-pink-400 mt-3">{eerettus.length}</p>
        </div>

        <Link to="/pending-list" className={`bg-yellow-500/20 hover:bg-yellow-500/30 ${tile} block cursor-pointer`}>
          <h2 className="text-yellow-300 flex items-center justify-between">
            Pending <span className="text-xs text-yellow-400/80">view list →</span>
          </h2>
          <p className="text-4xl font-bold mt-3">{pendingCount}</p>
        </Link>

        <Link to="/sold-ledger" className={`bg-red-500/20 hover:bg-red-500/30 ${tile} block cursor-pointer`}>
          <h2 className="text-red-300 flex items-center justify-between">
            Sold <span className="text-xs text-red-400/80">view ledger →</span>
          </h2>
          <p className="text-4xl font-bold mt-3">{soldCount}</p>
        </Link>

        <div className={`bg-green-500/20 ${tile}`}>
          <h2 className="text-green-300">Returned</h2>
          <p className="text-4xl font-bold mt-3">{returnedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 h-[400px]">
          <h2 className="text-2xl font-bold text-pink-400 mb-6">Transaction Analytics</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ background: '#1f1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 h-[400px]">
          <h2 className="text-2xl font-bold text-pink-400 mb-6">Status Distribution</h2>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                outerRadius={120}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1f1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

    </div>
  )
}

export default Dashboard
