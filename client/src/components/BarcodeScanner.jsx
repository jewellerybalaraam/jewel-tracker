import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

function BarcodeScanner({ onScan }) {

  const [scanned, setScanned] =
    useState(false);

  return (

    <div className="rounded-2xl overflow-hidden border border-white/10">

      <Scanner

        constraints={{
          facingMode: "environment",
        }}

        scanDelay={800}

        formats={[
          "qr_code",
          "data_matrix",
          "code_128",
          "ean_13",
          "ean_8",
          "upc_a",
          "upc_e",
        ]}

        onScan={(result) => {

          if (
            scanned ||
            !result?.[0]?.rawValue
          ) {
            return;
          }

          setScanned(true);

          const scannedValue =
            result[0].rawValue;

          onScan(scannedValue);

          setTimeout(() => {
            setScanned(false);
          }, 2000);
        }}

        onError={(error) => {
          console.log(
            "Scanner Error:",
            error
          );
        }}

        styles={{
          container: {
            width: "100%",
            borderRadius: "24px",
          },
        }}
      />

    </div>
  );
}

export default BarcodeScanner;