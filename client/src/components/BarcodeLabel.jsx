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

/*
THERMAL JEWELLERY TAG PRINTING
For TSC thermal printers
*/
export function printBarcodes(items = []) {
  const printWindow = window.open('', '_blank', 'width=900,height=700')

  if (!printWindow) return

  const esc = (s) =>
    String(s || '').replace(/[&<>"']/g, (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c])
    )

  const html = `
<!DOCTYPE html>
<html>

<head>
<meta charset="utf-8" />
<title>Print Tags</title>

<style>

@page {
  size: 50mm 25mm;
  margin: 0;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  background: white;
  font-family: Arial, Helvetica, sans-serif;
}

.page {
  width: 50mm;
}

.label {
  width: 50mm;
  height: 25mm;

  position: relative;

  page-break-after: always;
  overflow: hidden;

  padding: 2mm;
}

.product {
  font-size: 9pt;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 1.2mm;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.middle {
  display: flex;
  align-items: center;
  gap: 2mm;
}

.qr {
  width: 12mm;
  height: 12mm;
  flex-shrink: 0;
}

.info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.prefix {
  font-size: 9pt;
  font-weight: bold;
  line-height: 1.1;
}

.weight {
  font-size: 8pt;
  line-height: 1.1;
}

.bottom {
  margin-top: 1mm;
  font-size: 8pt;
  font-family: monospace;
}

.size-tag {
  position: absolute;
  right: 2mm;
  bottom: 1.5mm;

  font-size: 7pt;
  font-weight: bold;
}

@media print {
  html,
  body {
    width: 50mm;
    height: auto;
  }
}

</style>
</head>

<body>

<div class="page">

${items
  .map((item, idx) => {
    const product = [item.productName, item.subProductName]
      .filter(Boolean)
      .join(' ')

    const wt = item.netWt
      ? Number(item.netWt).toFixed(3)
      : ''

    return `

<div class="label">

  <div class="product">
    ${esc(product)}
  </div>

  <div class="middle">

    <canvas
      id="qr-${idx}"
      class="qr"
      width="100"
      height="100"
    ></canvas>

    <div class="info">

      <div class="prefix">
        ${esc(item.prefix || '')}
      </div>

      <div class="weight">
        Wt :${esc(wt)}
      </div>

      ${
        item.purity
          ? `
      <div class="weight">
        ${esc(item.purity)}
      </div>
      `
          : ''
      }

    </div>

  </div>

  <div class="bottom">
    ${esc(item.display || item.code || '')}
  </div>

  ${
    item.size
      ? `
  <div class="size-tag">
    Size : ${esc(item.size)}
  </div>
  `
      : ''
  }

</div>

`
  })
  .join('')}

</div>

<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>

<script>

const items = ${JSON.stringify(
  items.map((i) => ({
    code: i.code || '',
  }))
)}

function renderQRs() {

  items.forEach((item, idx) => {

    const canvas = document.getElementById('qr-' + idx)

    if (!canvas || !item.code) return

    QRCode.toCanvas(canvas, item.code, {
      width: 100,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })

  })

}

window.onload = async () => {

  renderQRs()

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