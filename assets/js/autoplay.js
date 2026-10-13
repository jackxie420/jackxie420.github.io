// Sweep a virtual cursor through the figure's existing hover handler.
// Hover pauses only over the graph and resumes immediately on leaving it.
window.autoplayFigure = function ({ svg, container = svg?.parentElement, button, steps }) {
  if (!svg || !container || !steps?.length) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !motion.matches, visible = false;
  let pointerInside = false;
  let idx = 0, elapsed = 0, lastTime = null, timer = null;
  let needsSetup = true;
  const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const running = () => playing && visible && !document.hidden && !pointerInside;

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

  // Only the SVG graph pauses hover playback; captions and controls do not.
  function setPointerInside(inside) {
    if (pointerInside === inside) return;
    pointerInside = inside;
    update();
  }
  svg.addEventListener('pointerenter', e => {
    if (e.isTrusted && e.pointerType !== 'touch') setPointerInside(true);
  });
  svg.addEventListener('pointermove', e => {
    if (!e.isTrusted) return;
    if (e.pointerType !== 'touch') setPointerInside(true);
    else if (e.buttons) svg.onmousemove?.(e);
  });
  svg.addEventListener('pointerleave', () => setPointerInside(false));
  svg.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') {
      setPointerInside(true);
      svg.onmousemove?.(e);
    }
  });
  ['pointerup', 'pointercancel'].forEach(type => svg.addEventListener(type, e => {
    if (e.pointerType === 'touch') setPointerInside(false);
  }));
  button?.addEventListener('click', () => {
    playing = !playing;
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
