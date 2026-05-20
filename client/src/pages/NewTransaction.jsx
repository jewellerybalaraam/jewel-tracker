import { useState } from 'react'
import axios from 'axios'

const NewTransaction = () => {
  const [barcode, setBarcode] = useState('')
  const [productName, setProductName] = useState('')
  const [subProductName, setSubProductName] = useState('')
  const [grossWeight, setGrossWeight] = useState('')
  const [netWeight, setNetWeight] = useState('')
  const [size, setSize] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [boardRate, setBoardRate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const clearItem = () => {
    setProductName('')
    setSubProductName('')
    setGrossWeight('')
    setNetWeight('')
    setSize('')
    setSalePrice('')
    setBoardRate('')
  }

  const handleBarcodeChange = async (e) => {
    const value = e.target.value
    setBarcode(value)
    setError('')

    if (!value) { clearItem(); return }
    if (value.length < 4) return

    try {
      setLoading(true)

      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/inventory/barcode/${value}`
      )

      const item = res.data.data
      setProductName(item.productName)
      setSubProductName(item.subProductName)
      setGrossWeight(item.grossWeight)
      setNetWeight(item.netWeight)
      setSize(item.size)
      setSalePrice(item.salePrice)
      setBoardRate(item.boardRate)

    } catch (err) {
      console.log(err)
      setError('Item not found')
      clearItem()
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { label: 'Product Name', value: productName },
    { label: 'Sub Product', value: subProductName },
    { label: 'Gross Weight (g)', value: grossWeight },
    { label: 'Net Weight (g)', value: netWeight },
    { label: 'Size', value: size },
    { label: 'Sale Price', value: salePrice },
    { label: 'Board Rate', value: boardRate },
  ]

  return (
    <div className="p-6 max-w-xl">

      <h2 className="text-3xl font-black bg-gradient-to-r from-pink-400 via-orange-400 to-purple-500 bg-clip-text text-transparent mb-8">
        New Transaction
      </h2>

      <div className="mb-5">
        <label className="block text-gray-400 mb-2 text-sm">Barcode</label>
        <input
          type="text"
          placeholder="Enter or scan barcode"
          value={barcode}
          onChange={handleBarcodeChange}
          autoFocus
          className="w-full p-4 rounded-2xl bg-white/10 border border-white/20 outline-none focus:border-pink-400"
        />
      </div>

      {loading && <p className="text-pink-400 text-sm mb-4">Looking up item...</p>}
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="space-y-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <label className="block text-gray-400 mb-2 text-sm">{label}</label>
            <input
              type="text"
              value={value}
              readOnly
              className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-gray-300"
            />
          </div>
        ))}
      </div>

    </div>
  )
}

export default NewTransaction