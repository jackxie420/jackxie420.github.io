// Sweep a virtual cursor through the figure's existing hover handler.
// Real interaction takes priority; explicit Pause stays paused.
window.autoplayFigure = function ({ svg, container = svg?.parentElement, button, steps, idleMs = 4000 }) {
  if (!svg || !container || !steps?.length) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !motion.matches, visible = false, userActive = false;
  let pointerInside = false, focusInside = false;
  let idx = 0, elapsed = 0, lastTime = null, timer = null, idleTimer = null;
  let needsSetup = true;
  const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const running = () => playing && visible && !document.hidden && !userActive;

  function update() {
    if (button) {
      button.innerHTML = playing ? '<span aria-hidden="true">❚❚</span> Pause' : '<span aria-hidden="true">▶</span> Play';
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', playing ? 'Pause figure animation' : 'Play figure animation');
    }
    container.classList.toggle('autoplaying', running());
    clearTimeout(timer);
    timer = null;
    lastTime = null;
    if (running()) timer = setTimeout(frame, 30);
  }

  function frame() {
    timer = null;
    if (!running()) return;
    const now = performance.now();
    if (lastTime != null) elapsed += now - lastTime;
    lastTime = now;
    if (elapsed >= steps[idx].dur) {
      svg.onmouseleave?.();
      idx = (idx + 1) % steps.length;
      elapsed = 0;
      needsSetup = true;
    }
    if (needsSetup) {
      steps[idx].setup?.();
      needsSetup = false;
    }
    const ctm = svg.getScreenCTM();
    if (ctm && svg.onmousemove && steps[idx].sweep) {
      const [x0, x1, y] = steps[idx].sweep();
      const p = svg.createSVGPoint();
      p.x = x0 + (x1 - x0) * ease(Math.min(1, elapsed / steps[idx].dur));
      p.y = y;
      const screen = p.matrixTransform(ctm);
      svg.onmousemove({ clientX: screen.x, clientY: screen.y });
    }
    timer = setTimeout(frame, 30);
  }

  function resumeLater() {
    clearTimeout(idleTimer);
    if (pointerInside || focusInside) return;
    idleTimer = setTimeout(() => {
      userActive = false;
      // Restore a known view after the visitor has changed the controls.
      idx = 0; elapsed = 0; needsSetup = true;
      update();
    }, idleMs);
  }
  function interact() {
    clearTimeout(idleTimer);
    userActive = true;
    update();
  }
  container.addEventListener('pointerenter', e => {
    if (!e.isTrusted || e.pointerType === 'touch') return;
    pointerInside = true; interact();
  });
  container.addEventListener('pointermove', e => {
    if (!e.isTrusted || e.pointerType === 'touch') return;
    pointerInside = true; interact();
  });
  container.addEventListener('pointerleave', () => { pointerInside = false; resumeLater(); });
  container.addEventListener('focusin', e => {
    if (button?.contains(e.target)) return;
    focusInside = true; interact();
  });
  container.addEventListener('focusout', e => {
    focusInside = container.contains(e.relatedTarget) && !button?.contains(e.relatedTarget);
    resumeLater();
  });
  ['pointerdown', 'click', 'input', 'change', 'keydown'].forEach(type => {
    container.addEventListener(type, e => {
      if (!e.isTrusted || button?.contains(e.target)) return;
      interact(); resumeLater();
    });
  });
  // Pointer events let touch visitors explore the same curves as mouse users.
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') svg.onmousemove?.(e);
  });
  svg.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') { interact(); svg.onmousemove?.(e); resumeLater(); }
  });
  button?.addEventListener('click', () => {
    playing = !playing;
    clearTimeout(idleTimer);
    if (playing && userActive) { idx = 0; elapsed = 0; needsSetup = true; }
    userActive = false;
    if (!playing) svg.onmouseleave?.();
    update();
  });
  motion.addEventListener('change', () => {
    if (motion.matches) { playing = false; svg.onmouseleave?.(); update(); }
  });
  document.addEventListener('visibilitychange', update);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.2;
      update();
    }, { threshold: [0, 0.2] }).observe(svg);
  } else visible = true;
  update();
};
