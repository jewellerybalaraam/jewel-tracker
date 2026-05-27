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
*{
  box-sizing:border-box;
  margin:0;
  padding:0;
}

@page{
  size:90mm 15mm;
  margin:0;
}

html,body{
  width:90mm;
  margin:0;
  padding:0;
  background:#fff;
  font-family:Arial,sans-serif;
}

/* FULL LABEL */
.label{
  width:90mm;
  height:15mm;
  display:flex;
  overflow:hidden;
  page-break-after:always;
}

/* LEFT BLANK */
.left-blank{
  width:68mm;
  flex:0 0 68mm;
}

/* RIGHT AREA */
.right-half{
  width:22mm;
  height:15mm;
  padding:0.2mm;
  display:flex;
  flex-direction:column;
  overflow:hidden;
}

/* PRODUCT */
.product{
  font-size:5pt;
  font-weight:bold;
  line-height:0.9;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  margin-bottom:0.1mm;
}

/* LOWER AREA */
.bottom-row{
  display:flex;
  gap:0.4mm;
  overflow:hidden;
  flex: 1; /* Changed: Allows row to take up remaining height */
}

/* QR */
.qr-wrap{
  width:6mm;
  height:6mm;
  flex:0 0 6mm;
}

.qr-wrap img{
  width:6mm;
  height:6mm;
  display:block;
}

/* TEXT AREA */
.info{
  display:flex;
  flex-direction:column;
  gap:0;
  overflow:hidden;
  font-weight:bold;
  min-width:0;
  flex: 1; /* Changed: Allows info column to stretch down to the bottom */
}

/* COMMON TEXT */
.shop,
.weight,
.code{
  font-size:6pt;
  line-height:0.9;
  white-space:nowrap;
}

/* SIZE VALUE */
.size-val{
  font-size:6pt;
  line-height:0.9;
  white-space:nowrap;
  margin-top: auto; /* Changed: Standard flexbox trick to push this element to the absolute bottom */
}

/* CODE CUT */
.code{
  overflow:hidden;
  text-overflow:ellipsis;
}
</style>
</head>

<body>

${items.map((item, idx) => `
<div class="label">
  <div class="left-blank"></div>
  <div class="right-half">
    <div class="product">
      ${item.productName || ''}
    </div>
    <div class="bottom-row">
      <div class="qr-wrap">
        <img src="${qrImages[idx]}" />
      </div>
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
window.onload=function(){
  setTimeout(function(){
    window.print()
  },400)
}
</script>

</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}