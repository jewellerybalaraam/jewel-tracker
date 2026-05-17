import { useState } from "react";
import axios from "axios";

function InventoryUpload() {

  const [file, setFile] =
    useState(null);

  const handleUpload = async () => {

    if (!file) {
      return alert("Select file");
    }

    const formData = new FormData();

    formData.append("file", file);

    try {

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/inventory/upload`,
        formData
      );

      alert(
        `${res.data.inserted} items uploaded`
      );

    } catch (error) {
      console.log(error);
      alert("Upload failed");
    }
  };

  return (

    <div className="p-6">

      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 max-w-xl mx-auto">

        <h1 className="text-3xl font-bold mb-6 text-pink-400">
          Upload Inventory Excel
        </h1>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) =>
            setFile(e.target.files[0])
          }
          className="mb-6 w-full"
        />

        <button
          onClick={handleUpload}
          className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-2xl font-bold"
        >
          Upload Excel
        </button>

      </div>

    </div>
  );
}

export default InventoryUpload;