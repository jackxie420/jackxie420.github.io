// Live pitch tracker (runs entirely in the browser).
// Privacy: audio is analyzed one short frame at a time and immediately discarded.
// Nothing is recorded, uploaded, or stored; only the pitch values needed to draw the
// visible window are kept in memory, and they are cleared on Clear or when leaving the page.

// ---------------------------------------------------------------- YIN pitch estimator
// de Cheveigné & Kawahara (2002). Returns { f0, confidence } or null when unvoiced.
function yinPitch(buf, sampleRate, opts) {
  const o = Object.assign({ fmin: 65, fmax: 450, threshold: 0.15, rmsGate: 0.008 }, opts || {});
  const n = buf.length;
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < o.rmsGate) return null;

  const tauMin = Math.max(2, Math.floor(sampleRate / o.fmax));
  const tauMax = Math.min(Math.floor(sampleRate / o.fmin), Math.floor(n / 2));
  const W = n - tauMax;
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
    d[tau] = s;
  }
  // cumulative mean normalized difference
  const cm = new Float32Array(tauMax + 1);
  cm[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    cm[tau] = running > 0 ? d[tau] * tau / running : 1;
  }
  // first dip below threshold, then walk to its local minimum
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cm[t] < o.threshold) {
      while (t + 1 <= tauMax && cm[t + 1] < cm[t]) t++;
      tau = t; break;
    }
  }
  if (tau < 0) return null;
  // parabolic interpolation for sub-sample precision
  let better = tau;
  if (tau > 1 && tau < tauMax) {
    const a = cm[tau - 1], b = cm[tau], c = cm[tau + 1], den = a + c - 2 * b;
    if (den !== 0) better = tau + (a - c) / (2 * den);
  }
  const f0 = sampleRate / better;
  if (f0 < o.fmin || f0 > o.fmax) return null;
  return { f0, confidence: 1 - cm[tau] };
}
if (typeof module !== 'undefined') module.exports = { yinPitch };

// ---------------------------------------------------------------- UI
(function () {
  if (typeof document === 'undefined') return;
  const canvas = document.getElementById('pt-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const startBtn = document.getElementById('pt-start'), clearBtn = document.getElementById('pt-clear');
  const hzEl = document.getElementById('pt-hz'), noteEl = document.getElementById('pt-note'), stEl = document.getElementById('pt-status');
  const rangeSel = document.getElementById('pt-range');

  const WINDOW_S = 10, FRAME_MS = 15;
  const RANGES = { speech: [65, 450], low: [65, 260], high: [130, 520] };
  let range = RANGES.speech;
  let audioCtx = null, stream = null, analyser = null, source = null, timer = null, raf = null;
  let points = [];          // [{t, f0}] pitch values for the visible window only
  let t0 = 0, recent = [];  // short median-filter history
  const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteName = f => { const m = Math.round(69 + 12 * Math.log2(f / 440)); return NOTES[(m % 12 + 12) % 12] + (Math.floor(m / 12) - 1); };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    const w = canvas.clientWidth, h = canvas.clientHeight, L = 62, R = 12, T = 12, B = 26;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h);
    const [lo, hi] = range, ly = v => T + (h - T - B) * (1 - Math.log(v / lo) / Math.log(hi / lo));
    const now = audioCtx ? audioCtx.currentTime - t0 : (points.length ? points[points.length - 1].t : 0);
    const tStart = Math.max(0, now - WINDOW_S), lx = t => L + ((t - tStart) / WINDOW_S) * (w - L - R);
    // semitone grid with labels on C and A
    ctx.font = '11px Inter, -apple-system, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let m = Math.ceil(12 * Math.log2(lo / 440) + 69); 440 * Math.pow(2, (m - 69) / 12) <= hi; m++) {
      const f = 440 * Math.pow(2, (m - 69) / 12), y = ly(f), named = m % 12 === 0 || m % 12 === 9;
      ctx.strokeStyle = named ? '#dbe5ef' : '#f1f5f9'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - R, y); ctx.stroke();
      if (named) { ctx.fillStyle = '#7a8899'; ctx.fillText(`${NOTES[m % 12]}${Math.floor(m / 12) - 1} · ${Math.round(f)}`, L - 6, y); }
    }
    // time axis
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#7a8899';
    for (let s = Math.ceil(tStart); s <= now; s++) ctx.fillText(s + 's', lx(s), h - B + 8);
    // pitch line: break at gaps (unvoiced stretches)
    ctx.strokeStyle = '#2a78d6'; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    let prev = null;
    for (const p of points) {
      if (p.t < tStart) continue;
      const x = lx(p.t), y = ly(Math.min(hi, Math.max(lo, p.f0)));
      if (prev && p.t - prev.t < 0.06) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      prev = p;
    }
    ctx.stroke();
    if (!points.length) {
      ctx.fillStyle = '#93a3b8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '14px Inter, -apple-system, sans-serif';
      ctx.fillText(audioCtx ? 'Listening… say something' : 'Press Start and speak', (L + w - R) / 2, (T + h - B) / 2);
    }
  }

  function tick() {
    if (!analyser) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);          // this frame only; discarded after analysis
    const r = yinPitch(buf, audioCtx.sampleRate, { fmin: range[0], fmax: range[1] });
    const t = audioCtx.currentTime - t0;
    if (r && r.confidence > 0.8) {
      recent.push(r.f0); if (recent.length > 3) recent.shift();
      const f0 = recent.slice().sort((a, b) => a - b)[Math.floor(recent.length / 2)];
      points.push({ t, f0 });
      hzEl.textContent = Math.round(f0); noteEl.textContent = noteName(f0);
    } else {
      recent = [];
      hzEl.textContent = '–'; noteEl.textContent = '';
    }
    while (points.length && points[0].t < t - WINDOW_S - 1) points.shift();   // keep only the visible window
  }

  function loop() { draw(); raf = requestAnimationFrame(loop); }

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      stEl.textContent = 'Microphone access was blocked. Allow it in your browser to use the tracker.';
      return;
    }
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume();
    source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 2048;
    source.connect(analyser);                        // not connected to speakers, nothing is recorded
    points = []; recent = []; t0 = audioCtx.currentTime;
    timer = setInterval(tick, FRAME_MS);
    loop();
    startBtn.textContent = '■ Stop'; startBtn.classList.add('live');
    stEl.innerHTML = '<span class="live-dot"></span>Listening. Audio stays on this device and is never stored.';
  }

  function stop() {
    clearInterval(timer); timer = null;
    cancelAnimationFrame(raf); raf = null;
    if (stream) stream.getTracks().forEach(t => t.stop());   // releases the microphone
    if (source) source.disconnect();
    if (audioCtx) audioCtx.close();
    stream = source = analyser = null; audioCtx = null;
    startBtn.textContent = '● Start'; startBtn.classList.remove('live');
    hzEl.textContent = '–'; noteEl.textContent = '';
    stEl.textContent = 'Stopped. The microphone is off.';
    draw();
  }

  startBtn.addEventListener('click', () => (audioCtx ? stop() : start()));
  clearBtn.addEventListener('click', () => { points = []; recent = []; draw(); });
  rangeSel.addEventListener('change', () => { range = RANGES[rangeSel.value]; recent = []; draw(); });
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', () => { if (audioCtx) stop(); points = []; });
  document.addEventListener('visibilitychange', () => { if (document.hidden && audioCtx) stop(); });
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    startBtn.disabled = true; stEl.textContent = 'This browser does not support microphone input.';
  }
  resize();
})();
