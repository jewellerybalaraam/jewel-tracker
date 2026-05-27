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
        return await QRCode.toDataURL(item.code || 'EMPTY', { margin: 0, width: 80 })
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

/* Full label — left half blank, right half has all content */
.label {
  width: 50mm;
  height: 15mm;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  page-break-after: always;
  overflow: hidden;
}

/* Blank left half */
.left-blank {
  flex: 0 0 25mm;
  width: 25mm;
}

/* Right half: QR on left, text stack on right */
.right-half {
  flex: 0 0 25mm;
  width: 25mm;
  height: 15mm;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 1mm 0.5mm 1mm 0.5mm;
  gap: 1mm;
  overflow: hidden;
}

/* QR code — tall enough to span all 4 text rows */
.qr-wrap {
  flex: 0 0 11mm;
  width: 11mm;
  height: 11mm;
  overflow: hidden;
}

.qr-wrap img {
  width: 11mm;
  height: 11mm;
  display: block;
}

/* Text column */
.info {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5mm;
  overflow: hidden;
  min-width: 0;
}

/* Row 1: Product name — bold, wraps to 2 lines max */
.product {
  font-size: 6.5pt;
  font-weight: bold;
  line-height: 1.2;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Row 2: BRJ + Size on same line */
.row-brj {
  display: flex;
  flex-direction: row;
  align-items: baseline;
  gap: 1mm;
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

/* Row 3: Weight */
.weight {
  font-size: 6pt;
  line-height: 1;
  white-space: nowrap;
}

/* Row 4: Item code */
.code {
  font-size: 6pt;
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
    <div class="qr-wrap">
      <img src="${qrImages[idx]}" style="width:11mm;height:11mm;display:block;" />
    </div>
    <div class="info">
      <div class="product">${item.productName || ''}</div>
      <div class="row-brj">
        <span class="shop">BRJ</span>${item.size ? `<span class="size-val">Size:${item.size}</span>` : ''}
      </div>
      <div class="weight">Wt:${Number(item.netWt || 0).toFixed(3)}</div>
      <div class="code">${item.display || item.code || ''}</div>
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
