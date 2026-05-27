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
            width="140"
            height="140"
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

        </div>

        <div class="size">
          Size : ${item.size || ''}
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
  size: 75mm 18mm;
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
  width: 75mm;
}

.label {

  width: 75mm;
  height: 18mm;

  display: flex;
  align-items: center;

  padding: 1mm 2mm;

  box-sizing: border-box;

  overflow: hidden;

  page-break-after: always;
}

.left {

  width: 18mm;
  height: 18mm;

  display: flex;
  align-items: center;
  justify-content: center;

  margin-right: 2mm;
}

.right {

  flex: 1;

  display: flex;
  flex-direction: column;
  justify-content: center;
}

.product {
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
}

.shop {
  font-size: 9px;
  font-weight: bold;
  margin-top: 0.6mm;
}

.weight {
  font-size: 9px;
  margin-top: 0.4mm;
}

.code {
  font-size: 9px;
  margin-top: 0.4mm;
}

.size {
  font-size: 9px;
  margin-left: auto;
  padding-left: 3mm;
}

.qr {
  width: 16mm;
  height: 16mm;
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

async function generateQRs() {

  for (let idx = 0; idx < items.length; idx++) {

    const item = items[idx]

    const canvas = document.getElementById('qr-' + idx)

    if (!canvas) continue

    await QRCode.toCanvas(canvas, item.code || 'EMPTY', {
      width: 140,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
  }
}

window.onload = async () => {

  await generateQRs()

  setTimeout(() => {
    window.print()
  }, 1000)
}

</script>

</body>
</html>

`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}