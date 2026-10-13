// Small interactive helpers for project pages: bar charts with tooltips,
// segmented controls, a step viewer, and copy-to-clipboard buttons.
(function () {
  const tip = document.createElement('div');
  tip.className = 'viz-tip';
  tip.hidden = true;
  document.body.appendChild(tip);

  function showTip(target, html) {
    tip.innerHTML = html;
    tip.hidden = false;
    const r = target.getBoundingClientRect();
    const w = tip.offsetWidth;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), window.innerWidth - w - 8);
    tip.style.left = left + 'px';
    tip.style.top = (r.top - tip.offsetHeight - 8) + 'px';
  }
  function hideTip() { tip.hidden = true; }
  window.addEventListener('scroll', hideTip, { passive: true });

  // rows: [{label, value, lo?, hi?, base?, tip}]
  // opts: {min, max, fmt, columns: [[header, row => text], ...]}
  window.renderBars = function (el, rows, opts) {
    const span = opts.max - opts.min;
    const pct = v => ((v - opts.min) / span) * 100;
    const zero = pct(0);
    el.innerHTML = '';
    el.classList.add('bars');
    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.tabIndex = 0;
      const a = Math.min(0, r.value), b = Math.max(0, r.value);
      row.innerHTML =
        `<span class="bar-label">${r.label}</span>
         <span class="bar-track">
           <span class="bar-zero" style="left:${zero}%"></span>
           <span class="bar${r.value < 0 ? ' neg' : ''}" style="left:${pct(a)}%;width:${pct(b) - pct(a)}%"></span>
           ${r.lo != null ? `<span class="bar-ci" style="left:${pct(r.lo)}%;width:${pct(r.hi) - pct(r.lo)}%"></span>` : ''}
           ${r.base != null ? `<span class="bar-base" style="left:${pct(r.base)}%"></span>` : ''}
         </span>
         <span class="bar-value">${opts.fmt(r.value)}</span>`;
      row.addEventListener('mouseenter', () => showTip(row, r.tip));
      row.addEventListener('focus', () => showTip(row, r.tip));
      row.addEventListener('mouseleave', hideTip);
      row.addEventListener('blur', hideTip);
      el.appendChild(row);
    });
    if (opts.columns) {
      const details = document.createElement('details');
      details.className = 'data-table';
      details.innerHTML =
        `<summary>Show data table</summary><div class="table-wrap"><table>
          <thead><tr>${opts.columns.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr>${opts.columns.map(c => `<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>`;
      el.appendChild(details);
    }
  };

  // <div class="seg" data-seg="name"><button data-value="a">A</button>...</div>
  window.segmented = function (el, onChange) {
    const buttons = el.querySelectorAll('button');
    buttons.forEach(btn => btn.addEventListener('click', () => {
      buttons.forEach(b => b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'));
      onChange(btn.dataset.value);
    }));
    const first = el.querySelector('[aria-pressed="true"]') || buttons[0];
    first.setAttribute('aria-pressed', 'true');
    return first.dataset.value;
  };

  // Step viewer: .steps > .step-tabs button[data-step] + .step-panel[data-step]
  document.querySelectorAll('.steps').forEach(steps => {
    const tabs = steps.querySelectorAll('.step-tabs button');
    const panels = steps.querySelectorAll('.step-panel');
    function show(i) {
      tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.step === i ? 'true' : 'false'));
      panels.forEach(p => { p.hidden = p.dataset.step !== i; });
    }
    tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.step)));
    show(tabs[0].dataset.step);
  });

  // Copy buttons: <button data-copy="#target-id">
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const text = document.querySelector(btn.dataset.copy).textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied!';
      } catch (e) {
        btn.textContent = 'Select & copy';
      }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
    });
  });
})();
