import Tesseract from "tesseract.js";

function OCRScanner({ onDetected }) {

  const handleImage = async (e) => {

    const file = e.target.files[0];

    if (!file) return;

    const result = await Tesseract.recognize(
      file,
      "eng"
    );

    const text = result.data.text;

    const barcodeRegex =
      /\b\d{3}-[A-Z0-9]+\b/g;

    const match = text.match(
      barcodeRegex
    );

    if (match?.[0]) {
      onDetected(match[0]);
    } else {
      alert("Barcode not found");
    }
  };

  return (

    <input
      type="file"
      accept="image/*"
      capture="environment"
      onChange={handleImage}
    />
  );
}

export default OCRScanner;