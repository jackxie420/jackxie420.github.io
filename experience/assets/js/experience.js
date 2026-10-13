// Match every experience card to the tallest natural card at the current width.
(() => {
  const page = document.querySelector('.experience-page');
  const cards = [...document.querySelectorAll('.experience-card')];
  if (!page || !cards.length) return;
  const equalize = () => {
    page.style.removeProperty('--experience-card-height');
    const height = Math.ceil(Math.max(...cards.map(card => card.getBoundingClientRect().height)));
    page.style.setProperty('--experience-card-height', `${height}px`);
  };
  let previousWidth = 0;
  new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === previousWidth) return;
    previousWidth = entry.contentRect.width;
    equalize();
  }).observe(page);
  equalize();
  document.fonts.ready.then(equalize);
})();
