// client/src/pages/NewTransaction.jsx

import { useState } from 'react'
import axios from 'axios'

const NewTransaction = () => {

  const [barcode, setBarcode] = useState('')

  const [productName, setProductName] = useState('')

  const [subProductName, setSubProductName] =
    useState('')

  const [grossWeight, setGrossWeight] =
    useState('')

  const [netWeight, setNetWeight] =
    useState('')

  const [size, setSize] = useState('')

  const [salePrice, setSalePrice] =
    useState('')

  const [boardRate, setBoardRate] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')


  // =====================================
  // FETCH INVENTORY USING BARCODE
  // =====================================

  const handleBarcodeChange = async (e) => {

    const value = e.target.value

    setBarcode(value)

    setError('')

    // CLEAR IF EMPTY
    if (!value) {

      setProductName('')
      setSubProductName('')
      setGrossWeight('')
      setNetWeight('')
      setSize('')
      setSalePrice('')
      setBoardRate('')

      return
    }

    // WAIT MINIMUM LENGTH
    if (value.length < 4) return

    try {

      setLoading(true)

      const res = await axios.get(
        `https://jewel-tracker.onrender.com/api/inventory/barcode/${value}`
      )

      const item = res.data.data

      setProductName(item.productName)

      setSubProductName(
        item.subProductName
      )

      setGrossWeight(
        item.grossWeight
      )

      setNetWeight(
        item.netWeight
      )

      setSize(item.size)

      setSalePrice(
        item.salePrice
      )

      setBoardRate(
        item.boardRate
      )

    } catch (err) {

      console.log(err)

      setError('Item not found')

      setProductName('')
      setSubProductName('')
      setGrossWeight('')
      setNetWeight('')
      setSize('')
      setSalePrice('')
      setBoardRate('')

    } finally {

      setLoading(false)
    }
  }


  return (

    <div
      style={{
        padding: '20px',
        maxWidth: '500px'
      }}
    >

      <h2>New Transaction</h2>


      {/* BARCODE */}

      <div style={{ marginBottom: '15px' }}>

        <label>Barcode</label>

        <input
          type="text"
          placeholder="Enter Barcode"
          value={barcode}
          onChange={handleBarcodeChange}
          style={{
            width: '100%',
            padding: '10px'
          }}
        />

      </div>


      {/* LOADING */}

      {loading && (
        <p>Loading...</p>
      )}


      {/* ERROR */}

      {error && (
        <p style={{ color: 'red' }}>
          {error}
        </p>
      )}


      {/* PRODUCT NAME */}

      <div style={{ marginBottom: '15px' }}>

        <label>Product Name</label>

        <input
          type="text"
          value={productName}
          readOnly
          style={{
            width: '100%',
            padding: '10px'
          }}
        />

      </div>


      {/* SUB PRODUCT */}

      <div style={{ marginBottom: '15px' }}>

        <label>Sub Product</label>

        <input
          type="text"
          value={subProductName}
          readOnly
          style={{
            width: '100%',
            padding: '10px'
          }}
        />

      </div>


      {/* GROSS WEIGHT */}

      <div style={{ marginBottom: '15px' }}>

        <label>Gross Weight</label>

        <input
          type="text"
          value={grossWeight}
          readOnly
          style={{
            width: '100%',
            padding: '10px'
          }}
        />

      </div>


      {/* NET WEIGHT */}

      <div style={{ marginBottom: '15px' }}>

        <label>Net Weight</label>

        <input
          type="text"
          value={netWeight}
          readOnly
          style={{
            width: '100%',
            padding: '10px'
          }}
        />

      </div>


      {/* SIZE */}

      <div style={{ marginBottom: '15px' }}>

        <label>Size</label>

        <input
          type="text"
          value={size}
          readOnly
          style={{
            width: '100%',
            padding: '10px'
          }}
        />

      </div>


      {/* SALE PRICE */}

      <div style={{ marginBottom: '15px' }}>

        <label>Sale Price</label>

        <input
          type="text"
          value={salePrice}
          readOnly
          style={{
            width: '100%',
            padding: '10px'
          }}
        />

      </div>


      {/* BOARD RATE */}

      <div style={{ marginBottom: '15px' }}>

        <label>Board Rate</label>

        <input
          type="text"
          value={boardRate}
          readOnly
          style={{
            width: '100%',
            padding: '10px'
          }}
        />

      </div>

    </div>
  )
}

export default NewTransaction