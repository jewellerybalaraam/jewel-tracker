import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Clients() {

  const [clients,     setClients]     = useState([])
  const [newName,     setNewName]     = useState('')
  const [saving,      setSaving]      = useState(false)
  const [expandId,    setExpandId]    = useState(null)
  const [newMobile,   setNewMobile]   = useState('')

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    try {
      const res = await api.get('/clients')
      setClients(res.data)
    } catch (e) { console.log(e) }
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    try {
      setSaving(true)
      await api.post('/clients', { clientName: newName.trim() })
      setNewName('')
      fetchClients()
    } catch (e) {
      alert(e.response?.data?.message || 'Error')
    } finally { setSaving(false) }
  }

  const addMobile = async (clientName) => {
    if (!newMobile.trim()) return
    await api.patch(`/clients/${encodeURIComponent(clientName)}/add-mobile`, { mobile: newMobile.trim() })
    setNewMobile('')
    fetchClients()
  }

  const removeMobile = async (clientName, mobile) => {
    await api.patch(`/clients/${encodeURIComponent(clientName)}/remove-mobile`, { mobile })
    fetchClients()
  }

  const inp = 'w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white placeholder-gray-500'

  return (
    <div className="p-6 max-w-2xl space-y-6">

      <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
        Clients
      </h1>

      {/* ADD CLIENT */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex gap-3">
        <input
          className={`${inp} flex-1`}
          placeholder="New client name"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newName.trim()}
          className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-4 rounded-2xl font-bold disabled:opacity-50 whitespace-nowrap"
        >
          Add
        </button>
      </div>

      {/* CLIENT LIST */}
      <div className="space-y-3">
        {clients.map(c => (
          <div key={c._id} className="bg-white/5 border border-white/10 rounded-3xl p-5">

            <div
              className="flex justify-between items-center cursor-pointer"
              onClick={() => setExpandId(expandId === c._id ? null : c._id)}
            >
              <div>
                <h2 className="text-lg font-bold text-pink-300">{c.clientName}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.mobiles?.length > 0
                    ? c.mobiles.join(' · ')
                    : 'No mobile numbers'}
                </p>
              </div>
              <span className="text-gray-500 text-sm">{expandId === c._id ? '▲' : '▼'}</span>
            </div>

            {expandId === c._id && (
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">

                {/* MOBILE LIST */}
                {c.mobiles?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {c.mobiles.map(m => (
                      <div key={m} className="flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-xl">
                        <span className="text-sm text-white">{m}</span>
                        <button
                          onClick={() => removeMobile(c.clientName, m)}
                          className="text-red-400 hover:text-red-300 text-xs ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ADD MOBILE */}
                <div className="flex gap-2">
                  <input
                    className="flex-1 p-3 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-pink-400 text-white placeholder-gray-500 text-sm"
                    placeholder="Add mobile number"
                    value={newMobile}
                    onChange={e => setNewMobile(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addMobile(c.clientName)}
                  />
                  <button
                    onClick={() => addMobile(c.clientName)}
                    className="bg-pink-500 px-4 py-3 rounded-2xl font-bold text-sm"
                  >
                    + Add
                  </button>
                </div>

              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}