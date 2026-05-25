import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/*
  Renders a small inline CODE128 barcode SVG — used inside the table row tag preview.
*/
export default function BarcodeLabel({
  code,
  display,
  width   = 1.8,
  height  = 50,
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
    } catch (e) {}
  }, [code, display, width, height, showText])

  return (
    <div className="inline-block bg-white p-2 rounded-md">
      <svg ref={ref}></svg>
    </div>
  )
}

/*
  Prints one or more jewellery tags matching your physical label format:

  ┌─────────────────────────────┐
  │ BOMBAY PAYAL                │
  │ [QR]  BRJ                   │
  │       Wt :25.800            │
  │ 254-BOP321                  │
  └─────────────────────────────┘
  ┌──────────┐
  │ Size: 9  │  (back tab — only shown when size is present)
  └──────────┘

  items: [{
    code,           // raw barcode string e.g. "254BOP321"
    display,        // formatted e.g. "254-BOP321"
    productName,
    subProductName,
    prefix,         // e.g. "BRJ"
    netWt,
    size,
    purity,
  }]
*/
export function printBarcodes(items = []) {
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return

  const esc = (s) =>
    String(s || '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    )

  const tagsHtml = items
    .map((it, idx) => {
      const displayCode = it.display || it.code || ''
      const productLine = [it.productName, it.subProductName].filter(Boolean).join(' ')
      const wt = it.netWt ? Number(it.netWt).toFixed(3) : ''
      const prefix = it.prefix || ''
      const hasSize = it.size && String(it.size).trim()

      return `
        <!-- MAIN TAG -->
        <div class="tag" id="tag-wrap-${idx}">
          <div class="tag-inner">
            <!-- Top: product name -->
            <div class="product-name">${esc(productLine)}</div>

            <!-- Middle row: QR + right info -->
            <div class="mid-row">
              <canvas class="qr-canvas" id="qr-${idx}" width="52" height="52"></canvas>
              <div class="right-info">
                <div class="prefix">${esc(prefix)}</div>
                ${wt ? `<div class="weight">Wt :${esc(wt)}</div>` : ''}
                ${it.purity ? `<div class="purity">${esc(it.purity)}</div>` : ''}
              </div>
            </div>

            <!-- Bottom: barcode display number -->
            <div class="barcode-num">${esc(displayCode)}</div>
          </div>
        </div>

        <!-- BACK / SIZE TAB (printed right after the main tag) -->
        ${hasSize ? `
        <div class="size-tab">
          <div class="size-label">Size :${esc(it.size)}</div>
        </div>
        ` : ''}
      `
    })
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print Tags</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      padding: 4mm;
    }

    /* ── Main tag: 60mm × 28mm ───────────────────────── */
    .tag {
      display: inline-block;
      width: 60mm;
      height: 28mm;
      border: 1px dashed #aaa;
      margin: 1mm 2mm 1mm 0;
      vertical-align: top;
      page-break-inside: avoid;
    }

    .tag-inner {
      width: 100%;
      height: 100%;
      padding: 1.5mm 2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .product-name {
      font-size: 9pt;
      font-weight: bold;
      letter-spacing: 0.3px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mid-row {
      display: flex;
      align-items: center;
      gap: 3mm;
      flex: 1;
      margin: 1mm 0;
    }

    .qr-canvas {
      width: 18mm;
      height: 18mm;
      flex-shrink: 0;
    }

    .right-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5mm;
    }

    .prefix {
      font-size: 8.5pt;
      font-weight: bold;
    }

    .weight {
      font-size: 8pt;
    }

    .purity {
      font-size: 7pt;
      color: #555;
    }

    .barcode-num {
      font-size: 8pt;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.5px;
      border-top: 0.3mm solid #ddd;
      padding-top: 1mm;
    }

    /* ── Size tab: 25mm × 12mm ───────────────────────── */
    .size-tab {
      display: inline-block;
      width: 25mm;
      height: 12mm;
      border: 1px dashed #aaa;
      margin: 1mm 4mm 1mm 0;
      vertical-align: top;
      page-break-inside: avoid;
    }

    .size-label {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      font-weight: bold;
    }

    @media print {
      body { padding: 0; }
      .tag, .size-tab { border: none; margin: 0.5mm; }
    }
  </style>
</head>
<body>
  ${tagsHtml}

  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
  <script>
    var items = ${JSON.stringify(
      items.map((i) => ({ code: i.code || '', display: i.display || i.code || '' }))
    )};

    function renderAll() {
      items.forEach(function (it, idx) {
        var canvas = document.getElementById('qr-' + idx);
        if (!canvas || !it.code) return;
        try {
          QRCode.toCanvas(canvas, it.code, {
            width: canvas.width,
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
          }, function(err) {});
        } catch(e) {}
      });
    }

    window.onload = function () {
      renderAll();
      setTimeout(function () { window.print(); }, 600);
    };
  </script>
</body>
</html>`

  w.document.open()
  w.document.write(html)
  w.document.close()
}