// Switch between the classic look and the wood-board look; the choice is shared by every page.
// (Each page's <head> applies the saved look before first paint.)
(function () {
  const root = document.documentElement;
  let btn = document.querySelector('.look-toggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'look-toggle';
    btn.type = 'button';
    btn.innerHTML = '<span class="swatch" aria-hidden="true"></span><span class="label"></span>';
  }
  // Sits at the right end of the top bar, out of the way of the page content.
  (document.querySelector('.topnav .inner') || document.body).appendChild(btn);
  const sync = () => {
    const wood = root.classList.contains('wood');
    const label = wood ? 'Classic look' : 'Wood board look';
    btn.setAttribute('aria-pressed', wood);
    btn.setAttribute('aria-label', 'Switch to ' + label.toLowerCase());
    btn.title = 'Switch to ' + label.toLowerCase();
    btn.querySelector('.label').textContent = label;
  };
  btn.addEventListener('click', () => {
    root.classList.toggle('wood');
    try { localStorage.setItem('look', root.classList.contains('wood') ? 'wood' : 'classic'); } catch (e) {}
    sync();
  });
  sync();
})();
