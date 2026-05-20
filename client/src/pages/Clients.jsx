import { useEffect, useState } from 'react'
import axios from 'axios'

const emptyForm = {
  name: '', mobile: '', whatsapp: '',
  storeName: '', address: '', gstNo: '', notes: '',
}

export default function Clients() {

  const [clients,    setClients]    = useState([])
  const [form,       setForm]       = useState(emptyForm)
  const [editId,     setEditId]     = useState(null)
  const [editForm,   setEditForm]   = useState(null)
  const [saving,     setSaving]     = useState(false)

  useEffect(() => { fetchClients() }, [])

  const fetchClients = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/clients`)
      setClients(res.data)
    } catch (err) { console.log(err) }
  }

  const handleAdd = async () => {
    if (!form.name.trim()) return
    try {
      setSaving(true)
      await axios.post(`${import.meta.env.VITE_API_URL}/api/clients`, form)
      setForm(emptyForm)
      fetchClients()
    } catch (err) { console.log(err) }
    finally { setSaving(false) }
  }

  const startEdit = (client) => {
    setEditId(client._id)
    setEditForm({
      name:      client.name      || '',
      mobile:    client.mobile    || '',
      whatsapp:  client.whatsapp  || '',
      storeName: client.storeName || '',
      address:   client.address   || '',
      gstNo:     client.gstNo     || '',
      notes:     client.notes     || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) return
    try {
      setSaving(true)
      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/clients/${editId}`,
        editForm
      )
      setEditId(null)
      setEditForm(null)
      fetchClients()
    } catch (err) { console.log(err) }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full p-4 rounded-2xl bg-black/30 border border-white/10 outline-none focus:border-pink-400 text-white placeholder-gray-500'

  const fields = [
    { key: 'name',      placeholder: 'Client Name *' },
    { key: 'mobile',    placeholder: 'Mobile Number' },
    { key: 'whatsapp',  placeholder: 'WhatsApp Number' },
    { key: 'storeName', placeholder: 'Store Name' },
    { key: 'address',   placeholder: 'Address' },
    { key: 'gstNo',     placeholder: 'GST Number' },
  ]

  return (
    <div className="p-6 space-y-8 max-w-3xl">

      <h1 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent">
        Clients
      </h1>

      {/* ── ADD FORM ── */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
        <p className="text-gray-400 text-sm">Add New Client (only name is required)</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(({ key, placeholder }) => (
            <input
              key={key}
              className={inputCls}
              placeholder={placeholder}
              value={form[key]}
              onChange={e => setForm({ ...form, [key]: e.target.value })}
            />
          ))}
          <textarea
            className={`${inputCls} md:col-span-2`}
            placeholder="Notes"
            rows={3}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
          />
        </div>

        <button
          onClick={handleAdd}
          disabled={saving || !form.name.trim()}
          className="bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-3 rounded-2xl font-bold disabled:opacity-50"
        >
          Add Client
        </button>
      </div>

      {/* ── CLIENT LIST ── */}
      <div className="space-y-4">
        {clients.map(client => (
          <div
            key={client._id}
            className="bg-white/5 border border-white/10 rounded-3xl p-5"
          >
            {editId === client._id ? (

              /* ── EDIT MODE ── */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map(({ key, placeholder }) => (
                    <input
                      key={key}
                      className={inputCls}
                      placeholder={placeholder}
                      value={editForm[key]}
                      onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                    />
                  ))}
                  <textarea
                    className={`${inputCls} md:col-span-2`}
                    placeholder="Notes"
                    rows={3}
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-2xl font-bold disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => { setEditId(null); setEditForm(null) }}
                    className="bg-white/10 px-6 py-3 rounded-2xl font-bold text-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>

            ) : (

              /* ── VIEW MODE ── */
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-xl font-bold text-pink-300">{client.name}</h2>
                  {client.storeName && <p className="text-gray-300">{client.storeName}</p>}
                  {client.mobile    && <p className="text-gray-400 text-sm">{client.mobile}</p>}
                  {client.address   && <p className="text-gray-500 text-sm">{client.address}</p>}
                </div>
                <button
                  onClick={() => startEdit(client)}
                  className="text-pink-400 hover:text-pink-300 text-sm font-bold bg-white/5 px-4 py-2 rounded-xl"
                >
                  Edit
                </button>
              </div>

            )}
          </div>
        ))}
      </div>

    </div>
  )
}