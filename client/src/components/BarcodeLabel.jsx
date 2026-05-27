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
  size: 90mm 15mm;
  margin: 0;
}

html, body {
  width: 90mm;
  margin: 0;
  padding: 0;
  background: white;
  font-family: Arial, sans-serif;
  font-size: 0;
}

/* Full sticker: left blank (65mm) + content right (25mm) */
.label {
  width: 90mm;
  height: 15mm;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  page-break-after: always;
  overflow: hidden;
}

.left-blank {
  flex: 0 0 68mm;
}

/* Right 25mm content box — column layout */
.right-half {
  flex: 0 0 22mm;
  width: 22mm;
  height: 15mm;
  display: flex;
  flex-direction: column;
  padding: 0.8mm 0.5mm 0.8mm 0.5mm;
  overflow: hidden;
}

/* ROW 1: Product name — full width, top */
.product {
  width: 100%;
  font-size: 6pt;
  font-weight: bold;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.6mm;
}

/* ROW 2: QR (left) + details (right) */
.bottom-row {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  flex: 1;
  gap: 1mm;
  overflow: hidden;
}

/* QR — bottom-left */
.qr-wrap {
  flex: 0 0 9mm;
  width: 9mm;
  height: 9mm;
  overflow: hidden;
}

.qr-wrap img {
  width: 9mm;
  height: 9mm;
  display: block;
}

/* Text details — bottom-right */
.info {
  flex: 1 1 0;
  font-weight: bold;
  display: flex;
  font-size: 7.5pt;
  flex-direction: column;
  justify-content: flex-start;
  gap: 0.5mm;
  overflow: hidden;
  min-width: 0;
}

.row-brj {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 0.8mm;
}

.shop {
  font-size: 6.5pt;
  font-weight: bold;
  line-height: 1;
  white-space: nowrap;
}

.size-val {
  font-size: 6pt;
  line-height: 1;
  white-space: nowrap;
}

.weight {
  font-size: 6pt;
  line-height: 1;
  white-space: nowrap;
}

.code {
  font-size: 6pt;
  font-weight: bold;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

</style>
</head>
<body>
${items.map((item, idx) => `
<div class="label">
  <div class="left-blank"></div>
  <div class="right-half">

    <!-- TOP: Product name full width -->
    <div class="product">${item.productName || ''}</div>

    <!-- BOTTOM: QR left, details right -->
    <div class="bottom-row">
      <div class="qr-wrap">
        <img src="${qrImages[idx]}" style="width:9mm;height:9mm;display:block;" />
      </div>
      <div class="info">
        <div class="row-brj">
          <span class="shop">BRJ</span>${item.size ? `<span class="size-val"> Size:${item.size}</span>` : ''}
        </div>
        <div class="weight">Wt:${Number(item.netWt || 0).toFixed(3)}</div>
        <div class="code">${item.display || item.code || ''}</div>
      </div>
    </div>

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
