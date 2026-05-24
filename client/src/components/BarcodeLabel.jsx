import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

/*
  Renders a CODE128 barcode SVG for a tag.
  Props:
    code        — raw stored code, e.g. "123ABC119"
    display     — what to show under the bars, e.g. "123-ABC119"
    width, height
    showText    — boolean
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
    } catch (e) {
      // ignore — invalid code
    }
  }, [code, display, width, height, showText])

  return (
    <div className="inline-block bg-white p-2 rounded-md">
      <svg ref={ref}></svg>
    </div>
  )
}

/*
  Opens a print-friendly window with the given barcodes.
  items: [{ code, display, productName, subProductName, netWt, size, purity }]
*/
export function printBarcodes(items = []) {
  const w = window.open('', '_blank', 'width=800,height=600')
  if (!w) return

  const html = `
    <html>
      <head>
        <title>Print Barcodes</title>
        <script>
          // jsbarcode from CDN for print window (separate doc)
        </script>
        <style>
          body { font-family: sans-serif; margin: 8mm; }
          .tag {
            display: inline-block;
            width: 60mm;
            border: 1px dashed #999;
            padding: 4mm;
            margin: 2mm;
            text-align: center;
            page-break-inside: avoid;
            vertical-align: top;
          }
          .meta { font-size: 10px; color: #333; margin-top: 4px; line-height: 1.3; }
          svg { width: 100%; height: auto; }
          @media print { .tag { border: none; } }
        </style>
      </head>
      <body>
        ${items.map((it, idx) => `
          <div class="tag">
            <svg id="bc-${idx}"></svg>
            <div class="meta">
              <div><b>${escapeHtml(it.productName || '')}</b> ${it.subProductName ? '· ' + escapeHtml(it.subProductName) : ''}</div>
              <div>${it.netWt ? Number(it.netWt).toFixed(3) + ' g' : ''} ${it.size ? ' · sz ' + escapeHtml(it.size) : ''} ${it.purity ? ' · ' + escapeHtml(it.purity) : ''}</div>
            </div>
          </div>
        `).join('')}

        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
        <script>
          window.onload = function () {
            var items = ${JSON.stringify(items.map(i => ({ code: i.code, display: i.display || i.code })))};
            items.forEach(function (it, idx) {
              try {
                JsBarcode('#bc-' + idx, it.code, {
                  format: 'CODE128',
                  width: 1.6, height: 50,
                  displayValue: true, text: it.display,
                  fontSize: 11, margin: 2
                })
              } catch (e) {}
            });
            setTimeout(function () { window.print(); }, 300);
          }
        </script>
      </body>
    </html>
  `
  w.document.open()
  w.document.write(html)
  w.document.close()
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]))
}
