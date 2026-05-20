import { useState } from 'react'
import axios from 'axios'

const UploadInventory = () => {

  const [file, setFile] = useState(null)

  const [message, setMessage] = useState('')

  const handleUpload = async () => {

    if (!file) {
      alert('Select file')
      return
    }

    try {

      const formData = new FormData()

      formData.append('file', file)

      const res = await axios.post(
        'https://jewel-tracker.onrender.com//api/inventory/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      )

      setMessage(res.data.message)

    } catch (err) {

      console.log(err)

      setMessage('Upload failed')
    }
  }

  return (

    <div style={{ padding: '20px' }}>

      <h2>Upload Inventory</h2>

      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) =>
          setFile(e.target.files[0])
        }
      />

      <br /><br />

      <button onClick={handleUpload}>
        Upload
      </button>

      <p>{message}</p>

    </div>
  )
}

export default UploadInventory