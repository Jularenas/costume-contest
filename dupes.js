// Duplicate detection for new entries: similar names and (nearly) identical photos.
window.Dupes = (() => {
  const STOP = new Set(['el', 'la', 'los', 'las', 'lo', 'un', 'una', 'unos', 'unas', 'de', 'del', 'y', 'e', 'en', 'con',
    'disfraz', 'disfrazado', 'disfrazada', 'the', 'a', 'an', 'of', 'and']);

  // "La Brujas Malvadás" -> ["bruja", "malvada"]: no accents, case, articles or plural s.
  const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = (s) => fold(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ')
    .filter((w) => w && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w));

  function lev(a, b) {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = tmp;
      }
    }
    return row[b.length];
  }

  // Typos are fine in longer words ("calabasa"), but short ones must match exactly
  // so "gato" and "pato" stay different.
  const typo = (a, b) => {
    const n = Math.min(a.length, b.length);
    if (n >= 6) return lev(a, b) <= (n >= 9 ? 2 : 1);
    // 5-letter words: an extra or missing letter ("zombi"/"zombie") but not a swapped one ("bruja"/"brujo").
    return n === 5 && Math.abs(a.length - b.length) === 1 && lev(a, b) === 1;
  };
  const sameWord = (a, b) => a === b || typo(a, b);

  // 0..1, where >= 0.8 means "probably the same costume".
  function nameScore(a, b) {
    const wa = words(a), wb = words(b);
    if (!wa.length || !wb.length) return 0;
    const ja = wa.join(''), jb = wb.join(''); // "spider man" = "spiderman"
    if (ja === jb) return 1;
    if (typo(ja, jb)) return 0.9;
    const [small, big] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
    const exact = small.filter((w) => big.includes(w)).length;
    const hits = small.filter((w) => big.some((x) => sameWord(w, x))).length;
    if (hits === small.length) return small.length === big.length ? (exact === hits ? 1 : 0.9) : 0.8;
    const sa = [...wa].sort().join(' '), sb = [...wb].sort().join(' ');
    const len = Math.max(sa.length, sb.length);
    const sim = 1 - lev(sa, sb) / len;
    return len < 8 ? Math.min(sim, 0.75) : sim; // one letter is a lot in a short name: bruja ≠ brujo
  }

  // Partial typing in the form: "cala" should already suggest "Calabaza".
  const startsLike = (typed, name) => {
    const t = words(typed).join(' ');
    return t.length >= 3 && words(name).join(' ').includes(t);
  };

  // 64-bit difference hash: survives resizing and recompression, so a re-sent
  // photo still matches. Returns a string of 64 '0'/'1'.
  const hashes = new Map();
  function photoHash(src) {
    if (hashes.has(src)) return hashes.get(src);
    const p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 9;
        c.height = 8;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(img, 0, 0, 9, 8);
        const d = g.getImageData(0, 0, 9, 8).data;
        const lum = (x, y) => { const i = (y * 9 + x) * 4; return d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; };
        let bits = '';
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += lum(x, y) > lum(x + 1, y) ? '1' : '0';
        resolve(bits);
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
    hashes.set(src, p);
    return p;
  }
  const hashDistance = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) n += a[i] !== b[i]; return n; };

  // Costumes that look like the new entry, best match first.
  async function find(costumes, name, image) {
    const mine = await photoHash(image);
    const found = await Promise.all(costumes.map(async (c) => {
      const reasons = [];
      const h = mine && c.image ? await photoHash(c.image) : null;
      if (h && hashDistance(mine, h) <= 10) reasons.push('Misma foto');
      const score = nameScore(name, c.name);
      if (score >= 0.8) reasons.push(score === 1 ? 'Mismo nombre' : 'Nombre parecido');
      return reasons.length ? { costume: c, reasons, rank: reasons.length * 2 + score } : null;
    }));
    return found.filter(Boolean).sort((a, b) => b.rank - a.rank);
  }

  return { fold, nameScore, startsLike, find };
})();
