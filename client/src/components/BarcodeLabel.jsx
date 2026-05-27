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

  // Pre-render all QR codes as data-URLs so they're ready before print()
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

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>

@page {
  size: 50mm 15mm;
  margin: 0;
}

html, body {
  width: 50mm;
  height: 15mm;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: white;
  font-family: Arial, sans-serif;
}

.label {
  width: 50mm;
  height: 15mm;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  padding: 1mm;
  page-break-after: always;
}

.left {
  width: 11mm;
  height: 11mm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 1.5mm;
}

.qr {
  width: 11mm;
  height: 11mm;
  display: block;
}

.right {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
}

.product {
  font-size: 7px;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.row2 {
  display: flex;
  align-items: center;
  gap: 2mm;
  margin-top: 0.5mm;
}

.shop {
  font-size: 6.5px;
  font-weight: bold;
  line-height: 1;
  white-space: nowrap;
}

.size {
  font-size: 6.5px;
  line-height: 1;
  white-space: nowrap;
}

.weight {
  font-size: 6px;
  line-height: 1;
  margin-top: 0.5mm;
}

.code {
  font-size: 6px;
  line-height: 1;
  margin-top: 0.4mm;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

</style>
</head>
<body>

${items.map((item, idx) => `
<div class="label">

  <div class="left">
    <img src="${qrImages[idx]}" class="qr" />
  </div>

  <div class="right">
    <div class="product">${item.productName || ''}</div>

    <div class="row2">
      <div class="shop">BRJ</div>${item.size ? `<div class="size">Size: ${item.size}</div>` : ''}
    </div>

    <div class="weight">Wt: ${Number(item.netWt || 0).toFixed(3)}</div>
    <div class="code">${item.display || item.code || ''}</div>
  </div>

</div>
`).join('')}

<script>
window.onload = function() {
  setTimeout(function() { window.print(); }, 300);
};
</script>

</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}