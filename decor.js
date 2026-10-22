// Background characters: spreads config.decorations around the screen edges,
// behind the page content. Purely decorative.
(() => {
  const items = (window.CONTEST_CONFIG || {}).decorations || [];
  if (!items.length) return;

  const layer = document.createElement('div');
  layer.className = 'decor';
  layer.setAttribute('aria-hidden', 'true');

  const img = (d) => {
    const el = document.createElement('img');
    el.src = `img/characters/${d.src}`;
    el.alt = '';
    el.decoding = 'async';
    return el;
  };

  const bottom = { left: items.filter((d) => d.edge === 'bottom-left'), right: items.filter((d) => d.edge === 'bottom-right') };
  const side = items.filter((d) => !d.edge || d.edge === 'side');
  const tilts = [-8, 6, -4, 9, -6, 4];

  for (const s of ['left', 'right']) {
    // Alternate characters between the two sides, then space them out top to bottom,
    // leaving room at the bottom when corner pieces sit there.
    const column = side.filter((_, i) => (i % 2 === 0) === (s === 'left'));
    const reserve = bottom[s].length ? 24 : 4;
    const slot = (100 - reserve - 3) / Math.max(1, column.length);
    column.forEach((d, i) => {
      const el = img(d);
      el.className = `decor-side decor-${s}`;
      el.style.setProperty('--top', `${3 + i * slot}vh`);
      el.style.setProperty('--h', `min(${slot * 1.1}vh, 230px)`);
      el.style.setProperty('--r', `${tilts[(i * 2 + (s === 'right')) % tilts.length]}deg`);
      el.style.setProperty('--x', i % 2 ? '1.5vw' : '-1.5vw');
      el.style.setProperty('--delay', `${-(i * 1.7 + (s === 'right') * 0.9)}s`);
      layer.append(el);
    });

    if (bottom[s].length) {
      const row = document.createElement('div');
      row.className = `decor-bottom decor-bottom-${s}`;
      bottom[s].forEach((d, i) => {
        const el = img(d);
        el.style.zIndex = bottom[s].length - i; // corner piece in front
        row.append(el);
      });
      layer.append(row);
    }
  }

  document.body.prepend(layer);
})();
