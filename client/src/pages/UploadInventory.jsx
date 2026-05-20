import { useState } from 'react'
import axios from 'axios'

const UploadInventory = () => {
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleUpload = async () => {
    if (!file) { alert('Please select an Excel file first'); return }

    try {
      setLoading(true)
      setMessage('')
      setSuccess(false)

      const formData = new FormData()
      formData.append('file', file)

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/inventory/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )

      setMessage(`${res.data.message} — ${res.data.insertedCount} items inserted.`)
      setSuccess(true)
      setFile(null)

    } catch (err) {
      console.log(err)
      setMessage(err.response?.data?.message || 'Upload failed')
      setSuccess(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl">

      <h2 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-8">
        Upload Inventory
      </h2>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
        <div>
          <label className="block text-gray-400 mb-2 text-sm">Select Excel File (.xlsx / .xls)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { setFile(e.target.files[0]); setMessage('') }}
            className="w-full text-sm text-gray-300"
          />
          {file && <p className="mt-2 text-xs text-gray-400">{file.name}</p>}
        </div>

        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="w-full py-4 rounded-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>

        {message && (
          <p className={`text-sm text-center ${success ? 'text-green-400' : 'text-red-400'}`}>
            {message}
          </p>
        )}
      </div>

    </div>
  )
}

export default UploadInventory