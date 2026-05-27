<div class="info">
  <div class="row-brj">
    <span class="shop">BRJ</span>
    <div class="weight">Wt:${Number(item.netWt || 0).toFixed(3)}</div>
  </div>

  <div class="code">${item.display || item.code || ''}</div>

  <div class="size-val">
    ${item.sizeVal ? `Sz:${item.sizeVal}` : ''}
  </div>
</div>