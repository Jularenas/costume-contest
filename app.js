const $ = (id) => document.getElementById(id);
const cfg = window.CONTEST_CONFIG || {};
const store = window.ContestStore;
const state = { costumes: [], myVote: null, totalVotes: 0 };
let voter = store.voterId();

let isAdmin = false;
try {
  const key = new URLSearchParams(location.search).get('admin');
  if (key !== null) sessionStorage.setItem('cc-admin', key);
  isAdmin = Boolean(cfg.adminKey) && sessionStorage.getItem('cc-admin') === cfg.adminKey;
} catch {}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const clean = (s, max) => s.replace(/\s+/g, ' ').trim().slice(0, max);

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

// Turn raw rows from the store into a ranked list with vote counts.
function tally({ costumes, votes }) {
  const counts = new Map();
  let myVote = null;
  for (const v of votes) {
    counts.set(v.costumeId, (counts.get(v.costumeId) || 0) + 1);
    if (v.voterId === voter) myVote = v.costumeId;
  }
  const ranked = costumes
    .map((c) => ({ ...c, votes: counts.get(c.id) || 0 }))
    .sort((a, b) => b.votes - a.votes || a.createdAt - b.createdAt);
  return { costumes: ranked, myVote, totalVotes: ranked.reduce((n, c) => n + c.votes, 0) };
}

async function refresh() {
  try {
    Object.assign(state, tally(await store.load()));
    $('load-error').hidden = true;
    render();
  } catch (err) {
    $('load-error').hidden = false;
    $('load-error').textContent = `No se puede conectar con el concurso en este momento (${err.message}). Reintentando…`;
  }
}

// ---------- Rendering ----------

function renderBanner() {
  const b = $('mode-banner');
  if (store.mode === 'shared' && !isAdmin) return (b.hidden = true);
  b.hidden = false;
  const parts = [];
  if (store.mode === 'local') {
    parts.push(store.isLocalhost
      ? `<strong>Modo de prueba</strong> — los datos se guardan solo en este navegador. Votante <code>${voter.slice(0, 6)}</code>`
      : '<strong>Modo demo</strong> — los disfraces y votos se guardan solo en este dispositivo.');
    if (store.isLocalhost) parts.push('<button data-act="new-voter">Ser un votante nuevo</button>');
  } else {
    parts.push('<strong>Admin</strong> — concurso compartido en vivo.');
  }
  if (store.isLocalhost || isAdmin) parts.push(`<button data-act="reset" class="danger">${store.mode === 'shared' ? 'Borrar concurso' : 'Borrar datos'}</button>`);
  b.innerHTML = parts.join(' ');
}

function render() {
  const { costumes, myVote, totalVotes } = state;
  $('stats').textContent = `${plural(costumes.length, 'disfraz', 'disfraces')} · ${plural(totalVotes, 'voto', 'votos')}`;

  const lead = costumes[0];
  const leader = $('leader');
  leader.hidden = !lead || lead.votes === 0;
  if (!leader.hidden) {
    const tied = costumes.filter((c) => c.votes === lead.votes).length;
    leader.innerHTML = `
      <img src="${lead.image}" alt="">
      <div>
        <div class="label">${tied > 1 ? `Empate en primer lugar (${tied} disfraces)` : 'Va ganando'}</div>
        <div class="who">${esc(lead.name)}</div>
      </div>
      <div class="count">${lead.votes}<small>${lead.votes === 1 ? 'voto' : 'votos'}</small></div>`;
  }

  const term = norm($('search').value);
  const shown = costumes.filter((c) => !term || norm(`${c.name} ${c.entrant}`).includes(term));
  const max = Math.max(1, ...costumes.map((c) => c.votes));

  // Competition ranking: ties share a rank.
  const rankOf = new Map();
  costumes.forEach((c, i) => rankOf.set(c.id, i && c.votes === costumes[i - 1].votes ? rankOf.get(costumes[i - 1].id) : i + 1));

  const empty = $('empty');
  empty.hidden = shown.length > 0;
  empty.textContent = costumes.length ? 'Ningún disfraz coincide con tu búsqueda.' : 'Aún no hay disfraces. ¡Sé el primero en participar!';

  $('grid').innerHTML = shown.map((c) => {
    const rank = rankOf.get(c.id);
    const mine = c.id === myVote;
    return `
      <article class="card${mine ? ' mine' : ''}" data-id="${c.id}">
        <span class="rank${c.votes && rank <= 3 ? ` r${rank}` : ''}">#${rank}</span>
        ${isAdmin || store.isLocalhost ? `<button class="remove" data-remove="${c.id}" title="Quitar disfraz">Quitar</button>` : ''}
        <img src="${c.image}" alt="${esc(c.name)}" loading="lazy" data-zoom>
        <div class="card-body">
          <div class="card-title">${esc(c.name)}</div>
          ${c.entrant ? `<div class="card-by">por ${esc(c.entrant)}</div>` : ''}
          <div class="bar"><i style="width:${(c.votes / max) * 100}%"></i></div>
          <div class="card-foot">
            <span class="votes">${c.votes} <small>${c.votes === 1 ? 'voto' : 'votos'}</small></span>
            <button class="vote" data-vote="${c.id}">${mine ? '✓ Tu voto' : 'Votar'}</button>
          </div>
        </div>
      </article>`;
  }).join('');

  renderBanner();
  renderMatches();
}

// While someone types a costume name, surface entries that look the same so
// duplicate costumes get voted for instead of entered twice.
function renderMatches() {
  const term = norm($('name').value);
  const box = $('matches');
  const hits = term.length < 3 ? [] : state.costumes.filter((c) => {
    const n = norm(c.name);
    return n.includes(term) || term.includes(n);
  }).slice(0, 3);
  box.hidden = hits.length === 0;
  box.innerHTML = hits.length ? `<p>¿Ya está aquí? Vota por él en vez de publicarlo otra vez:</p>` + hits.map((c) => `
    <div class="match">
      <img src="${c.image}" alt="">
      <span>${esc(c.name)}${c.entrant ? ` · ${esc(c.entrant)}` : ''}</span>
      <button type="button" data-vote="${c.id}">${c.id === state.myVote ? '✓ Votado' : 'Votar'}</button>
    </div>`).join('') : '';
}

// ---------- Voting & admin actions ----------

async function vote(id) {
  const undo = state.myVote === id;
  try {
    await store.vote(voter, undo ? null : id);
    await refresh();
    const c = state.costumes.find((x) => x.id === id);
    toast(undo ? 'Voto quitado' : `Votaste por ${c ? c.name : 'ese disfraz'} 🎉`);
  } catch (err) {
    toast(err.message);
    refresh();
  }
}

document.addEventListener('click', async (e) => {
  const v = e.target.closest('[data-vote]');
  if (v) return vote(Number(v.dataset.vote));

  const r = e.target.closest('[data-remove]');
  if (r) {
    if (!confirm('¿Quitar este disfraz y sus votos?')) return;
    try { await store.remove(Number(r.dataset.remove)); await refresh(); toast('Disfraz quitado'); }
    catch (err) { toast(err.message); }
    return;
  }

  const act = e.target.closest('[data-act]');
  if (act && act.dataset.act === 'new-voter') {
    voter = store.newVoter();
    await refresh();
    return toast('Ahora eres un votante nuevo');
  }
  if (act && act.dataset.act === 'reset') {
    if (!confirm('¿Borrar TODOS los disfraces y votos? Esto no se puede deshacer.')) return;
    try { await store.reset(); await refresh(); toast('Concurso borrado'); }
    catch (err) { toast(err.message); }
    return;
  }

  const z = e.target.closest('[data-zoom]');
  if (z) {
    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = `<img src="${z.src}" alt="${esc(z.alt)}">`;
    box.onclick = () => box.remove();
    document.body.append(box);
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') document.querySelector('.lightbox')?.remove();
});

// ---------- Entering a costume ----------

let photoData = null;

// Shrink photos in the browser so they're small enough to store and quick to load.
async function shrink(file, maxSide = 1000) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

$('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  $('form-error').textContent = '';
  if (!file) return;
  try {
    photoData = await shrink(file);
    $('preview').src = photoData;
    $('preview').hidden = false;
    $('photo-hint').hidden = true;
  } catch {
    photoData = null;
    $('form-error').textContent = 'No se pudo leer esa foto. Prueba con un JPEG o PNG.';
  }
});

$('name').addEventListener('input', renderMatches);
$('search').addEventListener('input', render);

$('entry-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('form-error');
  err.textContent = '';
  const name = clean($('name').value, 60);
  if (!name) return (err.textContent = 'Ponle un nombre a tu disfraz.');
  if (!photoData) return (err.textContent = 'Agrega una foto de tu disfraz.');
  const btn = $('submit');
  btn.disabled = true;
  btn.textContent = 'Publicando…';
  try {
    const id = await store.addCostume({ name, entrant: clean($('entrant').value, 60), image: photoData });
    $('entry-form').reset();
    $('search').value = '';
    photoData = null;
    $('preview').hidden = true;
    $('photo-hint').hidden = false;
    await refresh();
    toast('¡Disfraz publicado! 🎃');
    const card = document.querySelector(`.card[data-id="${id}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('flash');
    }
  } catch (ex) {
    err.textContent = ex.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Publicar disfraz';
  }
});

// ---------- Start + live updates ----------

if (cfg.title) {
  document.title = cfg.title;
  $('title').textContent = `🎃 ${cfg.title}`;
}
refresh().then(() => {
  // Returning visitors land on the gallery rather than the entry form.
  if (state.costumes.length) $('enter').open = false;
});
setInterval(() => { if (!document.hidden) refresh(); }, 5000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
window.addEventListener('storage', refresh); // other tabs in local test mode
