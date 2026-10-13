// Figure 3 data: Xie et al., 'Is Prosody Lost in Translation?' (Findings of EMNLP 2026), histogram counts extracted from the paper's vector figure.
window.FIG3 = {"pitch":{"DE\u2013EN":{"counts":[0,1,5,8,8,12,21,29,36,47,69,56,71,80,83,81,114,127,136,129,189,193,239,265,255,309,317,334,393,443,481,451,500,517,541,589,571,636,642,557,624,609,612,565,541,493,442,426,414,370,373,313,251,233,174,139,107,76,30,8],"n":16335,"mean":0.229,"sd":0.223,"shuffled":0.007},"EN\u2013ES":{"counts":[0,8,7,9,12,26,23,31,44,41,52,45,71,72,118,104,115,121,145,143,191,186,211,226,295,288,348,350,394,408,444,504,532,546,552,578,621,576,620,646,626,592,561,568,524,509,526,477,428,406,367,342,311,261,214,229,150,93,41,11],"n":16939,"mean":0.241,"sd":0.236,"shuffled":0.005},"EN\u2013FR":{"counts":[1,2,6,8,8,18,21,25,34,50,37,64,50,88,88,95,107,131,143,156,175,168,214,210,296,287,307,320,395,426,421,453,485,461,497,495,532,545,565,597,580,524,532,519,493,536,482,445,425,394,390,350,299,285,249,181,155,88,42,7],"n":15957,"mean":0.246,"sd":0.236,"shuffled":0.01}},"energy":{"DE\u2013EN":{"counts":[0,0,0,0,0,0,1,0,2,3,1,4,4,4,14,15,19,23,37,39,67,93,114,142,206,245,334,383,504,552,752,821,958,1061,1141,1103,1176,1052,999,819,756,616,520,453,305,254,193,173,138,84,50,39,23,19,13,6,2,2,1,0],"n":16335,"mean":0.183,"sd":0.14,"shuffled":0.043},"EN\u2013ES":{"counts":[0,0,0,0,0,0,1,2,0,4,3,4,4,4,7,10,19,22,40,50,73,91,119,168,188,239,340,440,551,706,818,956,1113,1116,1171,1175,1141,1087,940,825,714,605,530,396,317,264,190,151,99,73,64,40,26,12,13,10,5,3,0,0],"n":16939,"mean":0.174,"sd":0.144,"shuffled":0.03},"EN\u2013FR":{"counts":[0,0,0,0,0,0,1,1,1,1,2,0,7,7,9,13,14,30,25,44,65,69,123,147,180,236,316,385,476,648,757,838,984,1137,1176,1116,1097,1016,893,853,706,605,484,354,284,235,187,144,102,61,54,30,18,14,5,4,1,2,0,0],"n":15957,"mean":0.176,"sd":0.15,"shuffled":0.026}}};
// Interactive version of Figure 3: distribution of utterance-level Spearman correlations.
(function () {
  const D = window.FIG3;
  const svg = document.getElementById('dist');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const W = 760, H = 330, L = 56, R = 16, T = 22, B = 44;
  const PW = W - L - R, PH = H - T - B;
  const PAIRS = ['DE–EN', 'EN–ES', 'EN–FR'];
  const COL = { 'DE–EN': '#eb6834', 'EN–ES': '#2a78d6', 'EN–FR': '#1baf7a' };
  const YMAX = { pitch: 700, energy: 1250 };
  const readout = document.getElementById('dist-readout');
  const slider = document.getElementById('dist-thr');
  const thrLabel = document.getElementById('dist-thr-val');
  const tableEl = document.getElementById('dist-table');

  let feature = 'pitch', pair = 'DE–EN', thr = 0.5;
  const sx = r => L + ((r + 1) / 2) * PW;
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  };
  const binLo = i => -1 + i / 30;
  const share = (counts, t) => {
    let above = 0, total = 0;
    counts.forEach((c, i) => { total += c; if (binLo(i) >= t - 1e-9) above += c; });
    return above / total;
  };
  const pct = v => (v * 100).toFixed(1) + '%';

  function draw() {
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const ymax = YMAX[feature], sy = c => T + PH - (c / ymax) * PH;
    const shown = pair === 'all' ? PAIRS : [pair];

    // grid + axes
    const step = feature === 'pitch' ? 100 : 200;
    for (let c = 0; c <= ymax; c += step) {
      el('line', { x1: L, x2: W - R, y1: sy(c), y2: sy(c), class: 'd-grid' });
      el('text', { x: L - 6, y: sy(c) + 3.5, class: 'd-axis', 'text-anchor': 'end' }).textContent = c;
    }
    [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1].forEach(r => {
      el('text', { x: sx(r), y: H - B + 16, class: 'd-axis', 'text-anchor': 'middle' }).textContent = r.toFixed(2).replace('-0.00', '0.00');
    });
    el('text', { x: L + PW / 2, y: H - 6, class: 'd-axis', 'text-anchor': 'middle' }).textContent = 'Spearman ρ between source and dubbed contour (per utterance pair)';
    el('text', { x: 14, y: T + PH / 2, class: 'd-axis', transform: `rotate(-90 14 ${T + PH / 2})`, 'text-anchor': 'middle' }).textContent = 'Utterance pairs';

    // threshold shading
    el('rect', { x: sx(thr), y: T, width: sx(1) - sx(thr), height: PH, class: 'd-thr' });

    // r = 0
    el('line', { x1: sx(0), x2: sx(0), y1: T, y2: T + PH, class: 'd-zero' });

    if (shown.length === 1) {
      const d = D[feature][pair], bw = PW / 60;
      d.counts.forEach((c, i) => {
        const x = sx(binLo(i));
        const bar = el('rect', { x: x + 0.5, y: sy(c), width: bw - 1, height: Math.max(0, sy(0) - sy(c)), class: 'd-bar' + (binLo(i) >= thr - 1e-9 ? ' above' : ''), rx: 1.5 });
        bar.addEventListener('mouseenter', () => {
          bar.classList.add('hot');
          readout.innerHTML = `<b>${pair} · ρ ∈ [${binLo(i).toFixed(2)}, ${(binLo(i) + 1 / 30).toFixed(2)})</b>: ${c.toLocaleString()} pairs (${pct(c / d.n)})`;
        });
        bar.addEventListener('mouseleave', () => { bar.classList.remove('hot'); summary(); });
      });
      // mean & shuffled mean
      el('line', { x1: sx(d.mean), x2: sx(d.mean), y1: T, y2: T + PH, class: 'd-mean' });
      el('text', { x: sx(d.mean) + 5, y: T + 12, class: 'd-label' }).textContent = `mean ${d.mean.toFixed(3)}`;
      el('line', { x1: sx(d.shuffled), x2: sx(d.shuffled), y1: T, y2: T + PH, class: 'd-shuf' });
      el('text', { x: sx(d.shuffled) - 5, y: T + 12, class: 'd-label muted', 'text-anchor': 'end' }).textContent = `shuffled ${d.shuffled.toFixed(3)}`;
    } else {
      // overlay as step lines with direct labels
      shown.forEach((p, k) => {
        const d = D[feature][p];
        let dpath = `M${sx(-1)} ${sy(0)}`;
        d.counts.forEach((c, i) => { dpath += `L${sx(binLo(i))} ${sy(c)}L${sx(binLo(i) + 1 / 30)} ${sy(c)}`; });
        dpath += `L${sx(1)} ${sy(0)}`;
        el('path', { d: dpath, class: 'd-step', stroke: COL[p] });
        el('line', { x1: sx(d.mean), x2: sx(d.mean), y1: T, y2: T + PH, class: 'd-mean', style: 'stroke:' + COL[p] });
        el('text', { x: sx(0.62), y: T + 16 + k * 16, class: 'd-label', style: 'fill:' + COL[p] }).textContent = `${p}  mean ${d.mean.toFixed(3)}`;
      });
      // hover band per bin
      const bw = PW / 60;
      for (let i = 0; i < 60; i++) {
        const hit = el('rect', { x: sx(binLo(i)), y: T, width: bw, height: PH, class: 'd-hit' });
        hit.addEventListener('mouseenter', () => {
          hit.classList.add('hot');
          readout.innerHTML = `<b>ρ ∈ [${binLo(i).toFixed(2)}, ${(binLo(i) + 1 / 30).toFixed(2)})</b>: ` +
            shown.map(p => `<span style="color:${COL[p]};font-weight:600">${p}</span> ${D[feature][p].counts[i].toLocaleString()}`).join(' · ');
        });
        hit.addEventListener('mouseleave', () => { hit.classList.remove('hot'); summary(); });
      }
    }
    // threshold line
    el('line', { x1: sx(thr), x2: sx(thr), y1: T - 4, y2: T + PH, class: 'd-thrline' });
    summary();
    table();
  }

  function summary() {
    const shown = pair === 'all' ? PAIRS : [pair];
    readout.innerHTML = `Share of utterance pairs with ρ ≥ <b>${thr.toFixed(2)}</b>: ` +
      shown.map(p => `${shown.length > 1 ? `<span style="color:${COL[p]};font-weight:600">${p}</span> ` : ''}<b>${pct(share(D[feature][p].counts, thr))}</b>`).join(' · ') +
      ` <span class="muted">(${feature})</span>`;
  }

  function table() {
    tableEl.innerHTML = `<thead><tr><th>Pair</th><th>n</th><th>Mean ρ</th><th>σ</th><th>Shuffled mean</th><th>ρ &gt; 0</th><th>ρ ≥ ${thr.toFixed(2)}</th></tr></thead><tbody>` +
      PAIRS.map(p => {
        const d = D[feature][p];
        return `<tr><td>${p}</td><td>${d.n.toLocaleString()}</td><td>${d.mean.toFixed(3)}</td><td>${d.sd.toFixed(3)}</td><td>${d.shuffled.toFixed(3)}</td><td>${pct(share(d.counts, 0))}</td><td>${pct(share(d.counts, thr))}</td></tr>`;
      }).join('') + '</tbody>';
  }

  feature = segmented(document.getElementById('dist-feature'), v => { feature = v; draw(); });
  pair = segmented(document.getElementById('dist-pair'), v => { pair = v; draw(); });
  slider.addEventListener('input', () => {
    thr = Math.round(+slider.value * 30) / 30;
    thrLabel.textContent = thr.toFixed(2);
    draw();
  });
  thr = Math.round(+slider.value * 30) / 30;
  thrLabel.textContent = thr.toFixed(2);
  draw();
})();
