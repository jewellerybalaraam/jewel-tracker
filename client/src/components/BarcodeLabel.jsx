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
  object-fit: contain;
}

</style>

</head>

<body>

${labels}

<script>

window.onload = () => {

  setTimeout(() => {
    window.print()
  }, 500)

}

</script>

</body>
</html>

`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}