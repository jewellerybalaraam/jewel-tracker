import { Scanner } from "@yudiel/react-qr-scanner";

function BarcodeScanner({ onScan }) {

  return (
    <div className="rounded-2xl overflow-hidden">

      <Scanner
        onScan={(result) => {

          if (result?.[0]?.rawValue) {

            onScan(result[0].rawValue);
          }
        }}
        onError={(error) => console.log(error)}
      />

    </div>
  );
}

export default BarcodeScanner;