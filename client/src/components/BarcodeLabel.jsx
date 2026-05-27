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

  // Pre-render all QR codes as tiny data-URLs (64px is enough for scanning)
  const qrImages = await Promise.all(
    items.map(async (item) => {
      try {
        return await QRCode.toDataURL(item.code || 'EMPTY', { margin: 0, width: 64 })
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

* { box-sizing: border-box; margin: 0; padding: 0; }

@page {
  size: 50mm 15mm;
  margin: 0;
}

html, body {
  width: 50mm;
  margin: 0;
  padding: 0;
  background: white;
  font-family: Arial, sans-serif;
  font-size: 0;
}

.label {
  width: 50mm;
  height: 15mm;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 1mm;
  page-break-after: always;
  overflow: hidden;
}

.qr-wrap {
  width: 11mm;
  height: 11mm;
  flex: 0 0 11mm;
  margin-right: 1.5mm;
  overflow: hidden;
}

.qr-wrap img {
  width: 11mm;
  height: 11mm;
  display: block;
}

.info {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow: hidden;
  height: 13mm;
}

.product {
  font-size: 7pt;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.15;
}

.row2 {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 1.5mm;
  margin-top: 0.4mm;
}

.shop {
  font-size: 6.5pt;
  font-weight: bold;
  line-height: 1;
  white-space: nowrap;
}

.size-val {
  font-size: 6.5pt;
  line-height: 1;
  white-space: nowrap;
}

.weight {
  font-size: 6pt;
  line-height: 1;
  margin-top: 0.5mm;
}

.code {
  font-size: 6pt;
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
  <div class="qr-wrap">
    <img src="${qrImages[idx]}" width="42" height="42" style="width:11mm;height:11mm;display:block;" />
  </div>
  <div class="info">
    <div class="product">${item.productName || ''}</div>
    <div class="row2">
      <span class="shop">BRJ</span>${item.size ? `<span class="size-val">Size: ${item.size}</span>` : ''}
    </div>
    <div class="weight">Wt: ${Number(item.netWt || 0).toFixed(3)}</div>
    <div class="code">${item.display || item.code || ''}</div>
  </div>
</div>
`).join('')}
<script>
window.onload = function () {
  setTimeout(function () { window.print(); }, 400);
};
</script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}