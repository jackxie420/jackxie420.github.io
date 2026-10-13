// Interactive figures for "Lexical Tone and Word Order Matter in Translation".
// All curve and histogram data were extracted from the paper's vector figures (Figures 2, 3, 6, 8).
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (svg, tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  };
  const pathOf = (segs, sx, sy) => segs.map(s => s.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join('')).join('');
  const valueAt = (segs, x) => {
    for (const s of segs) {
      if (x < s[0][0] || x > s[s.length - 1][0]) continue;
      for (let i = 1; i < s.length; i++) if (s[i][0] >= x) {
        const [x0, y0] = s[i - 1], [x1, y1] = s[i];
        return x1 === x0 ? y0 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
    }
    return null;
  };
  const svgPoint = (svg, ev) => { const p = svg.createSVGPoint(); p.x = ev.clientX; p.y = ev.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
  const COL = { en: '#2a78d6', zh: '#eb6834', zhadj: '#9a3d12', ja: '#d4588a' };

  // ------------------------------------------------------------------ Figure 8: linked contours
  (function () {
    const D = window.TONE_FIG8, svg = document.getElementById('tf8');
    if (!svg || !D) return;
    const readout = document.getElementById('tf8-readout');
    // English word index -> Chinese syllable indices (alignment clusters shown in the paper)
    const LINKS = [[0, [0]], [2, [2, 3]], [3, [6, 7]], [6, [4, 5]], [8, [11]], [9, [13]]];
    const CLUSTERS = ['I / 我', 'feel / 觉得', 'like / 好像', 'before / 以前', 'seen / 见', 'you / 你'];
    const REORDERED = new Set([2, 3]);
    let view = 'time', adj = false, links = true;
    const W = 760, L = 54, R = 16, clean = w => w.replace(/[.,]/g, '');

    function drawTime() {
      const H = 440; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const T = 2.62, sx = t => L + (t / T) * (W - L - R);
      const P = { zh: { top: 62, h: 120, lo: 50, hi: 200 }, en: { top: 252, h: 120, lo: 50, hi: 220 } };
      const sy = k => v => P[k].top + P[k].h - ((v - P[k].lo) / (P[k].hi - P[k].lo)) * P[k].h;
      const g = el(svg, 'g', {});
      el(svg, 'text', { x: L, y: 18, class: 'f-title' }, g).textContent = 'Chinese (dubbed) · syllables with tone numbers';
      el(svg, 'text', { x: L, y: P.en.top + P.en.h + 36, class: 'f-title' }, g).textContent = 'English (source) · Whisper words';
      // shading
      D.zh.shade.forEach(([a, b]) => el(svg, 'rect', { x: sx(a), y: P.zh.top, width: sx(b) - sx(a), height: P.zh.h, class: 'f-shade' }, g));
      D.en.shade.forEach(([a, b]) => el(svg, 'rect', { x: sx(a), y: P.en.top, width: sx(b) - sx(a), height: P.en.h, class: 'f-shade' }, g));
      // grid
      for (const k of ['zh', 'en']) [100, 200].forEach(v => {
        el(svg, 'line', { x1: L, x2: W - R, y1: sy(k)(v), y2: sy(k)(v), class: 'f-grid' }, g);
        el(svg, 'text', { x: L - 6, y: sy(k)(v) + 3.5, class: 'f-axis', 'text-anchor': 'end' }, g).textContent = v;
      });
      [0, 0.5, 1, 1.5, 2, 2.5].forEach(t => { el(svg, 'text', { x: sx(t) + 0, y: P.en.top + P.en.h + 52, class: 'f-axis', 'text-anchor': 'middle' }, g).textContent = t.toFixed(1) + 's'; });
      el(svg, 'text', { x: 14, y: P.zh.top + 60, class: 'f-axis', transform: `rotate(-90 14 ${P.zh.top + 60})`, 'text-anchor': 'middle' }, g).textContent = 'Hz';
      el(svg, 'text', { x: 14, y: P.en.top + 60, class: 'f-axis', transform: `rotate(-90 14 ${P.en.top + 60})`, 'text-anchor': 'middle' }, g).textContent = 'Hz';
      // labels
      const sylEls = D.zh.syl.map((s, i) => {
        const t = el(svg, 'text', { x: sx(s.t), y: P.zh.top - 22, class: 'f-hz', 'text-anchor': 'middle' }, g); t.textContent = s.hz;
        const p = el(svg, 'text', { x: sx(s.t), y: P.zh.top - 8, class: 'f-py', 'text-anchor': 'middle' }, g); p.textContent = s.py;
        return [t, p];
      });
      const wordEls = D.en.words.map(w => { const t = el(svg, 'text', { x: sx(w.t), y: P.en.top + P.en.h + 16, class: 'f-token', 'text-anchor': 'middle' }, g); t.textContent = clean(w.w); return t; });
      // curves
      el(svg, 'path', { d: pathOf(D.zh.interp, sx, sy('zh')), class: 'f-interp', stroke: COL.zh }, g);
      el(svg, 'path', { d: pathOf(D.zh.voiced, sx, sy('zh')), class: 'f-voiced' + (adj ? ' faded' : ''), stroke: COL.zh }, g);
      if (adj) el(svg, 'path', { d: pathOf(D.zh.adj, sx, sy('zh')), class: 'f-adj', stroke: COL.zhadj }, g);
      el(svg, 'path', { d: pathOf(D.en.interp, sx, sy('en')), class: 'f-interp', stroke: COL.en }, g);
      el(svg, 'path', { d: pathOf(D.en.voiced, sx, sy('en')), class: 'f-voiced', stroke: COL.en }, g);
      // alignment links
      const lg = el(svg, 'g', { class: 'f-links' + (links ? '' : ' off') }, g);
      const linkEls = LINKS.map(([wi, sis], ci) => {
        const x1 = sx(sis.reduce((a, i) => a + D.zh.syl[i].t, 0) / sis.length), x2 = sx(D.en.words[wi].t);
        const y1 = P.zh.top + P.zh.h + 4, y2 = P.en.top - 4;
        const l = el(svg, 'path', { d: `M${x1} ${y1}C${x1} ${y1 + 32} ${x2} ${y2 - 32} ${x2} ${y2}`, class: 'f-link' }, lg);
        return l;
      });
      function highlight(ci) {
        linkEls.forEach((l, i) => l.classList.toggle('hot', i === ci));
        sylEls.forEach((s, i) => s.forEach(n => n.classList.toggle('hot', ci != null && LINKS[ci][1].includes(i))));
        wordEls.forEach((w, i) => w.classList.toggle('hot', ci != null && LINKS[ci][0] === i));
      }
      const cross = el(svg, 'line', { class: 'f-cross', visibility: 'hidden' }, g);
      svg.onmousemove = ev => {
        const m = svgPoint(svg, ev), k = m.y < (P.zh.top + P.zh.h + P.en.top) / 2 ? 'zh' : 'en';
        const t = ((m.x - L) / (W - L - R)) * T; if (m.x < L || t > T) return svg.onmouseleave();
        cross.setAttribute('x1', m.x); cross.setAttribute('x2', m.x); cross.setAttribute('y1', P[k].top); cross.setAttribute('y2', P[k].top + P[k].h); cross.setAttribute('visibility', 'visible');
        let ci = null, label = '';
        if (k === 'zh') {
          const si = D.zh.syl.reduce((b, s, i) => Math.abs(s.t - t) < Math.abs(D.zh.syl[b].t - t) ? i : b, 0);
          ci = LINKS.findIndex(([, sis]) => sis.includes(si)); label = `${D.zh.syl[si].hz} ${D.zh.syl[si].py}`;
          const raw = valueAt(D.zh.interp, t), a = valueAt(D.zh.adj, t);
          readout.innerHTML = `<b style="color:${COL.zh}">Chinese</b> · ${t.toFixed(2)} s · nearest syllable <b>${label}</b> · ${raw != null ? Math.round(raw) + ' Hz' : '—'}${adj && a != null ? ` → <b style="color:${COL.zhadj}">${Math.round(a)} Hz</b> tone-adjusted` : ''}${ci >= 0 ? ` · aligned to “${clean(D.en.words[LINKS[ci][0]].w)}”` : ' · unaligned'}`;
        } else {
          const wi = D.en.words.reduce((b, w, i) => Math.abs(w.t - t) < Math.abs(D.en.words[b].t - t) ? i : b, 0);
          ci = LINKS.findIndex(([w]) => w === wi); const v = valueAt(D.en.interp, t) ?? valueAt(D.en.voiced, t);
          readout.innerHTML = `<b style="color:${COL.en}">English</b> · ${t.toFixed(2)} s · nearest word <b>“${clean(D.en.words[wi].w)}”</b> · ${v != null ? Math.round(v) + ' Hz' : '—'}${ci >= 0 ? ` · aligned to ${LINKS[ci][1].map(i => D.zh.syl[i].hz).join('')}` : ' · unaligned'}`;
        }
        highlight(ci >= 0 ? ci : null);
      };
      svg.onmouseleave = () => { cross.setAttribute('visibility', 'hidden'); highlight(null); readout.innerHTML = 'Hover over either recording. Curved lines link the six aligned clusters; unlinked words are left out of the comparison.'; };
      svg.onmouseleave();
    }

    function drawPair() {
      const H = 330, top = 34, h = 230; svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.onmousemove = svg.onmouseleave = null;
      const sx = c => L + (c / 6) * (W - L - R), sy = v => top + h - ((v - 0.45) / 1.1) * h;
      const g = el(svg, 'g', {});
      REORDERED.forEach(i => el(svg, 'rect', { x: sx(i), y: top, width: sx(i + 1) - sx(i), height: h, class: 'f-reorder' }, g));
      [0.5, 1.0, 1.5].forEach(v => {
        el(svg, 'line', { x1: L, x2: W - R, y1: sy(v), y2: sy(v), class: 'f-grid' + (v === 1 ? ' mean' : '') }, g);
        el(svg, 'text', { x: L - 6, y: sy(v) + 3.5, class: 'f-axis', 'text-anchor': 'end' }, g).textContent = v.toFixed(1);
      });
      el(svg, 'text', { x: 14, y: top + h / 2, class: 'f-axis', transform: `rotate(-90 14 ${top + h / 2})`, 'text-anchor': 'middle' }, g).textContent = 'Pitch ÷ utterance mean';
      const bands = CLUSTERS.map((c, i) => {
        const b = el(svg, 'rect', { x: sx(i), y: top, width: sx(i + 1) - sx(i), height: h, class: 'f-band' }, g);
        if (i) el(svg, 'line', { x1: sx(i), x2: sx(i), y1: top, y2: top + h, class: 'f-sep' }, g);
        el(svg, 'text', { x: sx(i + 0.5), y: top + h + 18, class: 'f-token', 'text-anchor': 'middle' }, g).textContent = c;
        return b;
      });
      el(svg, 'text', { x: sx(3), y: top - 10, class: 'f-note', 'text-anchor': 'middle' }, g).textContent = 'shaded: order differs between the two recordings';
      el(svg, 'path', { d: pathOf(D.norm.en, sx, sy), class: 'f-voiced', stroke: COL.en }, g);
      el(svg, 'path', { d: pathOf(D.norm.zh, sx, sy), class: 'f-voiced' + (adj ? ' faded' : ''), stroke: COL.zh }, g);
      if (adj) el(svg, 'path', { d: pathOf(D.norm.zhadj, sx, sy), class: 'f-adj', stroke: COL.zhadj }, g);
      el(svg, 'text', { x: W - R - 4, y: top + 16, class: 'f-rho', 'text-anchor': 'end' }, g).textContent = adj ? 'ρ = 0.61 (tone-adjusted)' : 'ρ = 0.55 (raw)';
      const cross = el(svg, 'line', { class: 'f-cross', y1: top, y2: top + h, visibility: 'hidden' }, g);
      svg.onmousemove = ev => {
        const m = svgPoint(svg, ev), c = ((m.x - L) / (W - L - R)) * 6;
        if (c < 0 || c >= 6) return svg.onmouseleave();
        cross.setAttribute('x1', m.x); cross.setAttribute('x2', m.x); cross.setAttribute('visibility', 'visible');
        const ci = Math.floor(c); bands.forEach((b, i) => b.classList.toggle('hot', i === ci));
        const e = valueAt(D.norm.en, c), z = valueAt(D.norm.zh, c), za = valueAt(D.norm.zhadj, c);
        readout.innerHTML = `Cluster <b>${CLUSTERS[ci]}</b> · <span style="color:${COL.en}">English ${e?.toFixed(2)}</span> · <span style="color:${COL.zh}">Chinese ${z?.toFixed(2)}</span>${adj ? ` · <span style="color:${COL.zhadj}">adjusted ${za?.toFixed(2)}</span>` : ''}${REORDERED.has(ci) ? ' · reordered' : ''}`;
      };
      svg.onmouseleave = () => { cross.setAttribute('visibility', 'hidden'); bands.forEach(b => b.classList.remove('hot')); readout.innerHTML = 'Clusters are placed in English order before computing Spearman ρ. Toggle tone adjustment to see the Chinese contour flatten.'; };
      svg.onmouseleave();
    }

    function render() { svg.innerHTML = ''; (view === 'time' ? drawTime : drawPair)(); document.getElementById('tf8-links-wrap').hidden = view !== 'time'; }
    view = segmented(document.getElementById('tf8-view'), v => { view = v; render(); });
    document.getElementById('tf8-adj').addEventListener('change', e => { adj = e.target.checked; render(); });
    document.getElementById('tf8-links').addEventListener('change', e => { links = e.target.checked; const g = svg.querySelector('.f-links'); if (g) g.classList.toggle('off', !links); });
    render();
  })();

  // ------------------------------------------------------------------ Figure 2: tone removal explorer
  (function () {
    const D = window.TONE_FIGS && window.TONE_FIGS.F2, svg = document.getElementById('tf2');
    if (!svg || !D) return;
    const PAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
    const chips = document.getElementById('tf2-chips'), slider = document.getElementById('tf2-mix'), readout = document.getElementById('tf2-readout');
    let lang = 'Chinese', focus = null;
    const W = 620, H = 300, L = 46, R = 90, T = 16, B = 34, sx = x => L + x * (W - L - R), sy = v => T + (H - T - B) * (1 - (v + 2.6) / 5.4);
    function draw() {
      const d = D[lang], m = +slider.value / 100;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = '';
      [-2, -1, 0, 1, 2].forEach(v => {
        el(svg, 'line', { x1: L, x2: W - R, y1: sy(v), y2: sy(v), class: 'f-grid' + (v === 0 ? ' mean' : '') });
        el(svg, 'text', { x: L - 6, y: sy(v) + 3.5, class: 'f-axis', 'text-anchor': 'end' }).textContent = (v > 0 ? '+' : '') + v;
      });
      el(svg, 'text', { x: 12, y: T + (H - T - B) / 2, class: 'f-axis', transform: `rotate(-90 12 ${T + (H - T - B) / 2})`, 'text-anchor': 'middle' }).textContent = 'semitones vs. median';
      [0, 0.5, 1].forEach(x => el(svg, 'text', { x: sx(x), y: H - 12, class: 'f-axis', 'text-anchor': 'middle' }).textContent = ['syllable start', 'middle', 'end'][x * 2]);
      const ends = [];
      d.raw.forEach((rc, i) => {
        const pts = rc.map((p, j) => [p[0], p[1] * (1 - m) + d.adj[i][j][1] * m]);
        const dim = focus != null && focus !== i;
        el(svg, 'path', { d: pts.map((p, j) => (j ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(''), class: 'tone-line' + (dim ? ' dim' : ''), stroke: PAL[i] });
        ends.push([pts[pts.length - 1][1], i]);
      });
      // direct labels at the right edge, nudged apart
      ends.sort((a, b) => b[0] - a[0]);
      let last = -1e9;
      ends.forEach(([v, i]) => {
        let y = sy(v); if (y - last < 12) y = last + 12; last = y;
        const t = el(svg, 'text', { x: W - R + 6, y: y + 4, class: 'tone-label' + (focus != null && focus !== i ? ' dim' : '') }); t.textContent = d.tones[i]; t.setAttribute('fill', PAL[i]);
      });
      const acc = d.acc[0] * (1 - m) + d.acc[1] * m;
      readout.innerHTML = `${Math.round(m * 100)}% of the estimated tone component removed · tone-classification accuracy <b>${acc.toFixed(2)}</b> (raw ${d.acc[0].toFixed(2)} → adjusted ${d.acc[1].toFixed(2)}; chance ${d.acc[2].toFixed(2)})`;
    }
    function buildChips() {
      chips.innerHTML = '';
      D[lang].tones.forEach((t, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'tone-chip'; b.innerHTML = `<i style="background:${PAL[i]}"></i>${t}`;
        b.addEventListener('click', () => { focus = focus === i ? null : i; [...chips.children].forEach((c, j) => c.classList.toggle('on', focus === j)); draw(); });
        chips.appendChild(b);
      });
    }
    lang = segmented(document.getElementById('tf2-lang'), v => { lang = v; focus = null; buildChips(); draw(); });
    slider.addEventListener('input', draw);
    document.querySelectorAll('[data-mix]').forEach(b => b.addEventListener('click', () => {
      const target = +b.dataset.mix, start = +slider.value, t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / 700); slider.value = start + (target - start) * (1 - Math.pow(1 - k, 3)); draw(); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      setTimeout(() => { if (+slider.value !== target) { slider.value = target; draw(); } }, 800);
    }));
    buildChips(); draw();
  })();

  // ------------------------------------------------------------------ Figure 3: detrending
  (function () {
    const D = window.TONE_FIGS && window.TONE_FIGS.F3, svg = document.getElementById('tf3');
    if (!svg || !D) return;
    const readout = document.getElementById('tf3-readout');
    const W = 560, H = 270, L = 46, R = 16, T = 30, B = 46, sx = c => L + (c / 4) * (W - L - R), sy = v => T + (H - T - B) * (1 - (v + 0.3) / 0.6);
    // raw curves centered on their linear trend line's mean; detrended curves come straight from panel (b)
    const center = pts => pts.map(p => [p[0], p[1] - 1]);
    const raw = { en: center(D.raw.en), ja: center(D.raw.ja) }, det = { en: D.det.en, ja: D.det.ja };
    const trend = k => D.raw[k + '_trend'].map(p => [p[0], p[1] - 1]);
    const lerpCurve = (a, b, m) => a.map((p, i) => [p[0], p[1] * (1 - m) + (b[Math.min(i, b.length - 1)][1]) * m]);
    let m = 0;
    function draw() {
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = '';
      [-0.2, 0, 0.2].forEach(v => {
        el(svg, 'line', { x1: L, x2: W - R, y1: sy(v), y2: sy(v), class: 'f-grid' + (v === 0 ? ' mean' : '') });
        el(svg, 'text', { x: L - 6, y: sy(v) + 3.5, class: 'f-axis', 'text-anchor': 'end' }).textContent = (v > 0 ? '+' : '') + v.toFixed(1);
      });
      for (let i = 1; i < 4; i++) el(svg, 'line', { x1: sx(i), x2: sx(i), y1: T, y2: H - B, class: 'f-sep' });
      D.words.forEach((w, i) => {
        el(svg, 'text', { x: sx(i + 0.5), y: H - B + 16, class: 'f-token', 'text-anchor': 'middle' }).textContent = w;
        el(svg, 'text', { x: sx(i + 0.5), y: H - B + 31, class: 'f-py', 'text-anchor': 'middle' }).textContent = D.ja[i];
      });
      const line = pts => pts.map((p, j) => (j ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join('');
      // trend lines fade out as the trend is removed
      for (const [k, c] of [['en', COL.en], ['ja', COL.ja]]) {
        const tr = trend(k), a = tr[0], b = tr[tr.length - 1];
        const slope = (b[1] - a[1]) / (b[0] - a[0]), y = x => (a[1] + slope * (x - a[0])) * (1 - m);
        el(svg, 'path', { d: `M${sx(0)} ${sy(y(0))}L${sx(4)} ${sy(y(4))}`, class: 'trend-line', stroke: c, opacity: 1 - m });
      }
      el(svg, 'path', { d: line(lerpCurve(raw.en, det.en, m)), class: 'f-voiced', stroke: COL.en });
      el(svg, 'path', { d: line(lerpCurve(raw.ja, det.ja, m)), class: 'f-voiced', stroke: COL.ja });
      const rho = m < 0.02 ? 'ρ = 0.75 (raw)' : m > 0.98 ? 'ρ = 0.44 (detrended)' : '…';
      el(svg, 'text', { x: W - R - 4, y: T - 10, class: 'f-rho', 'text-anchor': 'end' }).textContent = rho;
      readout.innerHTML = m < 0.02
        ? 'Both recordings fall from start to end (dashed trend lines). That shared decline inflates the raw correlation.'
        : m > 0.98 ? 'After removing each recording’s own linear trend, a real but smaller word-level correspondence remains.' : 'Removing the trend…';
    }
    document.querySelectorAll('[data-detrend]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-detrend]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      const target = +b.dataset.detrend, start = m, t0 = performance.now();
      const step = now => { const k = Math.min(1, (now - t0) / 900); m = start + (target - start) * (1 - Math.pow(1 - k, 3)); draw(); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
      setTimeout(() => { if (m !== target) { m = target; draw(); } }, 1000);
    }));
    draw();
  })();

  // ------------------------------------------------------------------ Distributions: EMNLP (Figure 3) + this paper (Figure 6)
  (function () {
    const svg = document.getElementById('tfd'), F6 = window.TONE_FIGS && window.TONE_FIGS.F6, E = window.FIG3;
    if (!svg || !F6 || !E) return;
    const readout = document.getElementById('tfd-readout');
    const MEANS = {
      pitch: { 'EN–FR (ref.)': [.221, .019], 'EN–ZH': [.129, .026], 'EN–VI': [.113, .009], 'EN–TH': [.151, .016], 'EN–JA': [.082, .020], 'EN–KO': [.124, .026] },
      energy: { 'EN–FR (ref.)': [.154, .038], 'EN–ZH': [.116, .045], 'EN–VI': [.166, .102], 'EN–TH': [.151, .085], 'EN–JA': [.090, .050], 'EN–KO': [.078, .033] },
    };
    // Each series: bins of equal width over [-1, 1] as share of utterances; plotted as density (share per unit ρ)
    function series(feature, key) {
      if (key.startsWith('EMNLP ')) {
        const p = key.slice(6), d = E[feature][p], tot = d.counts.reduce((a, b) => a + b, 0);
        return { shares: d.counts.map(c => c / tot), mean: d.mean, shuf: d.shuffled, label: `${p} (EMNLP 2026)` };
      }
      return { shares: F6[feature][key], mean: MEANS[feature][key][0], shuf: MEANS[feature][key][1], label: key === 'EN–FR (ref.)' ? 'EN–FR (same-pipeline reference)' : key };
    }
    const selA = document.getElementById('tfd-a'), selB = document.getElementById('tfd-b');
    let feature = 'pitch';
    const W = 760, H = 300, L = 50, R = 16, T = 18, B = 40, sx = r => L + ((r + 1) / 2) * (W - L - R);
    function draw() {
      const A = series(feature, selA.value), Bs = series(feature, selB.value);
      const dens = s => s.shares.map(v => v * s.shares.length / 2);
      const ymax = Math.max(...dens(A), ...dens(Bs)) * 1.12, sy = v => T + (H - T - B) * (1 - v / ymax);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = '';
      [0, 0.25, 0.5, 0.75, 1].map(f => f * ymax).forEach(v => {
        el(svg, 'line', { x1: L, x2: W - R, y1: sy(v), y2: sy(v), class: 'd-grid-l' });
        el(svg, 'text', { x: L - 6, y: sy(v) + 3.5, class: 'f-axis', 'text-anchor': 'end' }).textContent = v.toFixed(2);
      });
      [-1, -0.5, 0, 0.5, 1].forEach(r => el(svg, 'text', { x: sx(r), y: H - B + 16, class: 'f-axis', 'text-anchor': 'middle' }).textContent = r.toFixed(1));
      el(svg, 'text', { x: L + (W - L - R) / 2, y: H - 6, class: 'f-axis', 'text-anchor': 'middle' }).textContent = 'Spearman ρ per utterance pair';
      el(svg, 'text', { x: 12, y: T + (H - T - B) / 2, class: 'f-axis', transform: `rotate(-90 12 ${T + (H - T - B) / 2})`, 'text-anchor': 'middle' }).textContent = 'density';
      el(svg, 'line', { x1: sx(0), x2: sx(0), y1: T, y2: H - B, class: 'd-zero-l' });
      [[A, COL.en], [Bs, COL.zh]].forEach(([s, c], k) => {
        const d = dens(s), n = d.length, w = 2 / n;
        let p = `M${sx(-1)} ${sy(0)}`;
        d.forEach((v, i) => { p += `L${sx(-1 + i * w)} ${sy(v)}L${sx(-1 + (i + 1) * w)} ${sy(v)}`; });
        p += `L${sx(1)} ${sy(0)}`;
        el(svg, 'path', { d: p + 'Z', fill: c, opacity: 0.10 });
        el(svg, 'path', { d: p, fill: 'none', stroke: c, 'stroke-width': 2 });
        el(svg, 'line', { x1: sx(s.mean), x2: sx(s.mean), y1: T, y2: H - B, stroke: c, 'stroke-width': 1.6, 'stroke-dasharray': '5 3' });
        el(svg, 'line', { x1: sx(s.shuf), x2: sx(s.shuf), y1: T, y2: H - B, stroke: c, 'stroke-width': 1.2, 'stroke-dasharray': '1.5 2.5', opacity: 0.8 });
        el(svg, 'text', { x: W - R - 4, y: T + 14 + k * 16, 'text-anchor': 'end', class: 'd-lab', fill: c }).textContent = `${s.label} · mean ${s.mean.toFixed(3)}`;
      });
      const cross = el(svg, 'line', { y1: T, y2: H - B, class: 'f-cross', visibility: 'hidden' });
      svg.onmousemove = ev => {
        const mm = svgPoint(svg, ev), r = ((mm.x - L) / (W - L - R)) * 2 - 1; if (r < -1 || r > 1) return svg.onmouseleave();
        cross.setAttribute('x1', mm.x); cross.setAttribute('x2', mm.x); cross.setAttribute('visibility', 'visible');
        const above = s => s.shares.reduce((a, v, i) => a + ((-1 + (i + 0.5) * 2 / s.shares.length) >= r ? v : 0), 0);
        readout.innerHTML = `Share of utterance pairs with ρ ≥ <b>${r.toFixed(2)}</b>: <span style="color:${COL.en};font-weight:600">${A.label}</span> ${(above(A) * 100).toFixed(1)}% · <span style="color:${COL.zh};font-weight:600">${Bs.label}</span> ${(above(Bs) * 100).toFixed(1)}%`;
      };
      svg.onmouseleave = () => { cross.setAttribute('visibility', 'hidden'); readout.innerHTML = 'Dashed lines: means. Dotted lines: shuffled-baseline means. Hover to compare the share of pairs above any ρ.'; };
      svg.onmouseleave();
    }
    feature = segmented(document.getElementById('tfd-feat'), v => { feature = v; draw(); });
    selA.addEventListener('change', draw); selB.addEventListener('change', draw);
    draw();
  })();
})();
