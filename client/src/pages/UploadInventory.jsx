import { useState } from "react";
import axios from "axios";

function UploadInventory() {

  const [file, setFile] =
    useState(null);

  const [message, setMessage] =
    useState("");

  const handleUpload =
    async () => {

      if (!file) {
        return;
      }

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      try {

        const res =
          await axios.post(
            `${import.meta.env.VITE_API_URL}/api/inventory/upload`,
            formData
          );

        setMessage(
          res.data.message
        );

      } catch (error) {

        console.log(error);

        setMessage(
          "Upload Failed"
        );
      }
    };

  return (

    <div className="p-6">

      <div className="bg-white/5 p-6 rounded-3xl border border-white/10 max-w-2xl mx-auto">

        <h1 className="text-3xl font-bold mb-6 text-pink-400">
          Upload Inventory
        </h1>

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) =>
            setFile(
              e.target.files[0]
            )
          }
          className="mb-6 w-full"
        />

        <button
          onClick={handleUpload}
          className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-2xl font-bold"
        >
          Upload Excel
        </button>

        {message && (

          <p className="mt-5 text-green-400">
            {message}
          </p>

        )}

      </div>

    </div>
  );
}

export default UploadInventory;