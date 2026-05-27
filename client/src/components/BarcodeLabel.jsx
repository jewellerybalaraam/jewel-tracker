import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

export default function BarcodeLabel({
  code,
  display,
  width = 1.8,
  height = 50,
  showText = true,
}) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current || !code) return

    try {
      JsBarcode(ref.current, code, {
        format: 'CODE128',
        width,
        height,
        displayValue: showText,
        text: display || code,
        fontSize: 12,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch (e) {
      console.error(e)
    }
  }, [code, display, width, height, showText])

  return (
    <div className="inline-block bg-white p-2 rounded-md">
      <svg ref={ref}></svg>
    </div>
  )
}

export function printBarcodes(items = []) {

  const printWindow = window.open('', '_blank')

  if (!printWindow) return

  const labels = items.map((item, idx) => {

    return `
      <div class="label">

        <div class="left">
          <canvas
            id="qr-${idx}"
            class="qr"
            width="120"
            height="120"
          ></canvas>
        </div>

        <div class="right">

          <div class="product">
            ${item.productName || ''}
          </div>

          <div class="shop">
            BRJ
          </div>

          <div class="weight">
            Wt: ${Number(item.netWt || 0).toFixed(3)}
          </div>

          <div class="code">
            ${item.display || item.code || ''}
          </div>

          <div class="size">
            Size : ${item.size || ''}
          </div>

        </div>

      </div>
    `
  }).join('')

  const html = `
<!DOCTYPE html>
<html>

<head>

<meta charset="utf-8" />

<style>

@page {
  size: 60mm 20mm;
  margin: 0;
}

html,
body {
  margin: 0;
  padding: 0;
  background: white;
  font-family: Arial, sans-serif;
}

body {
  width: 60mm;
}

.label {

  width: 60mm;
  height: 20mm;

  display: flex;

  overflow: hidden;

  page-break-after: always;

  border: 1px solid #000;
}

.left {

  width: 18mm;

  display: flex;
  align-items: center;
  justify-content: center;

  border-right: 1px solid #000;
}

.right {

  flex: 1;

  padding: 1.5mm;

  display: flex;
  flex-direction: column;
  justify-content: center;
}

.product {
  font-size: 10px;
  font-weight: bold;
}

.shop {
  font-size: 9px;
  font-weight: bold;
  margin-top: 1mm;
}

.weight,
.code,
.size {
  font-size: 8px;
  margin-top: 0.5mm;
}

.qr {
  width: 14mm;
  height: 14mm;
}

</style>

</head>

<body>

${labels}

<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>

<script>

const items = ${JSON.stringify(
  items.map(i => ({
    code: i.code || ''
  }))
)}

items.forEach((item, idx) => {

  const canvas = document.getElementById('qr-' + idx)

  if (!canvas) return

  QRCode.toCanvas(canvas, item.code, {
    width: 120,
    margin: 0
  })

})

window.onload = () => {

  setTimeout(() => {
    window.print()
  }, 700)

}

</script>

</body>
</html>
`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}