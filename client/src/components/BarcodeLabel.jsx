import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

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

export async function printBarcodes(items = []) {

  const qrImages = await Promise.all(
    items.map(async (item) => {

      try {

        return await QRCode.toDataURL(item.code || 'EMPTY', {
          margin: 0,
          width: 140,
        })

      } catch {

        return ''
      }
    })
  )

  const printWindow = window.open('', '_blank')

  if (!printWindow) return

  const labels = items.map((item, idx) => {

    return `

      <div class="label">

        <div class="left">

          <img
            src="${qrImages[idx]}"
            class="qr"
          />

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
  size: 50mm 15mm;
  margin: 0;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 50mm;
  height: 15mm;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

.label {
  width: 50mm;
  height: 15mm;

  display: flex;
  align-items: center;

  padding: 1mm;
  box-sizing: border-box;
}

.left {
  width: 10mm;
  height: 10mm;

  display: flex;
  align-items: center;
  justify-content: center;

  margin-right: 1.5mm;
}

.qr {
  width: 10mm;
  height: 10mm;
}

.right {
  display: flex;
  flex-direction: column;
  justify-content: center;

  line-height: 1;
}

.product {
  font-size: 7px;
  font-weight: bold;
}

.row {
  display: flex;
  align-items: center;
  gap: 2mm;

  margin-top: 0.3mm;
}

.shop {
  font-size: 6px;
  font-weight: bold;
}

.size {
  font-size: 6px;
}

.weight {
  font-size: 6px;
  margin-top: 0.3mm;
}

.code {
  font-size: 6px;
  margin-top: 0.3mm;
}

</style>
</head>

<body>

${items.map((item, idx) => `

<div class="label">

  <div class="left">
    <canvas
      id="qr-${idx}"
      class="qr"
      width="100"
      height="100"
    ></canvas>
  </div>

  <div class="right">

    <div class="product">
      ${item.productName || ''}
    </div>

    <div class="row">
      <div class="shop">BRJ</div>

      <div class="size">
        Size: ${item.size || ''}
      </div>
    </div>

    <div class="weight">
      Wt: ${Number(item.netWt || 0).toFixed(3)}
    </div>

    <div class="code">
      ${item.display || item.code || ''}
    </div>

  </div>

</div>

`).join('')}

<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>

<script>

const items = ${JSON.stringify(
  items.map((i) => ({
    code: i.code || '',
  }))
)}

items.forEach((item, idx) => {

  const canvas = document.getElementById('qr-' + idx)

  if (!canvas || !item.code) return

  QRCode.toCanvas(canvas, item.code, {
    width: 100,
    margin: 0,
  })

})

window.onload = () => {
  setTimeout(() => {
    window.print()
  }, 300)
}

</script>

</body>
</html>
`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}