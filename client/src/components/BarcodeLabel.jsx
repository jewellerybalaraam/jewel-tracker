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
          width: 64,
        })
      } catch {
        return ''
      }
    })
  )

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />

<style>

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

@page {
  size: 90mm 15mm;
  margin: 0;
}

html,
body {
  width: 90mm;
  margin: 0;
  padding: 0;
  background: white;
  font-family: Arial, sans-serif;
  font-size: 0;
}

/* Sticker */
.label {
  width: 90mm;
  height: 15mm;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  page-break-after: always;
}

/* Left Blank */
.left-blank {
  flex: 0 0 68mm;
}

/* Right Side */
.right-half {
  flex: 0 0 22mm;
  width: 22mm;
  height: 15mm;
  display: flex;
  flex-direction: column;
  padding: 0.4mm;
  overflow: hidden;
}

/* Product Name */
.product {
  width: 100%;
  font-size: 5.5pt;
  font-weight: bold;
  line-height: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.1mm;
}

/* Bottom Layout */
.bottom-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.5mm;
  flex: 1;
  overflow: hidden;
}

/* QR */
.qr-wrap {
  width: 7mm;
  height: 7mm;
  flex: 0 0 7mm;
}

.qr-wrap img {
  width: 7mm;
  height: 7mm;
  display: block;
}

/* Right Text */
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.05mm;
  overflow: hidden;
  font-weight: bold;
  min-width: 0;
}

/* BRJ */
.shop {
  font-size: 6.5pt;
  line-height: 0.95;
  white-space: nowrap;
}

/* Weight */
.weight {
  font-size: 6.5pt;
  line-height: 0.95;
  white-space: nowrap;
}

/* Code */
.code {
  font-size: 6.5pt;
  line-height: 0.95;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Size */
.size-val {
  font-size: 6.5pt;
  line-height: 0.95;
  white-space: nowrap;
}

</style>
</head>

<body>

${items.map((item, idx) => `
<div class="label">

  <div class="left-blank"></div>

  <div class="right-half">

    <!-- Product -->
    <div class="product">
      ${item.productName || ''}
    </div>

    <!-- Bottom -->
    <div class="bottom-row">

      <!-- QR -->
      <div class="qr-wrap">
        <img src="${qrImages[idx]}" />
      </div>

      <!-- Info -->
      <div class="info">

        <div class="shop">
          BRJ
        </div>

        <div class="weight">
          Wt:${Number(item.netWt || 0).toFixed(3)}
        </div>

        <div class="code">
          ${item.display || item.code || ''}
        </div>

        <div class="size-val">
          ${item.sizeVal ? `Sz:${item.sizeVal}` : ''}
        </div>

      </div>

    </div>

  </div>

</div>
`).join('')}

<script>
window.onload = function () {
  setTimeout(function () {
    window.print()
  }, 400)
}
</script>

</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}