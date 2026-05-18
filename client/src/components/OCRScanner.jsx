import { useState } from "react";
import Tesseract from "tesseract.js";

function OCRScanner({ onDetected }) {

  const [loading, setLoading] =
    useState(false);

  const handleImage = async (e) => {

    const file = e.target.files[0];

    if (!file || loading) return;

    setLoading(true);

    try {

      const result =
        await Tesseract.recognize(
          file,
          "eng"
        );

      const text =
        result.data.text;

      const barcodeRegex =
        /\d{3}-[A-Za-z0-9]+/g;

      const match =
        text.match(barcodeRegex);

      if (match?.[0]) {

        onDetected(match[0]);

      } else {

        alert("Barcode not found");
      }

    } catch (error) {

      console.log(error);

      console.log("OCR Failed");

    } finally {

      setLoading(false);
    }
  };

  return (

    <div className="space-y-2">

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImage}
        className="w-full"
      />

      {loading && (
        <p className="text-sm text-pink-400">
          Scanning...
        </p>
      )}

    </div>
  );
}

export default OCRScanner;