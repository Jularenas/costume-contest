// Storage backends. Both expose the same async API:
//   load()                 -> { costumes: [{ id, name, entrant, image, createdAt }],
//                               votes: [{ voterId, costumeId }] }
//   addCostume(entry)      -> id
//   vote(voterId, id|null) -> casts, moves (one row per voter) or clears a vote
//   remove(id), reset()
// "local" keeps everything in this browser (testing); "shared" uses Supabase (live site).

(() => {
const cfg = window.CONTEST_CONFIG || {};
const params = new URLSearchParams(location.search);
const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const configured = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);

// localhost defaults to local test data; ?store=shared tests against Supabase locally.
let mode = params.get('store') || (isLocalhost || !configured ? 'local' : 'shared');
if (mode === 'shared' && !configured) mode = 'local';

const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { throw quotaError(e); } };
const quotaError = (e) =>
  e && e.name === 'QuotaExceededError' ? new Error('This browser is out of space for test photos. Use "Clear data".') : e;

function voterId() {
  let id = safeGet('cc-voter');
  if (!id) {
    id = crypto.randomUUID();
    try { localStorage.setItem('cc-voter', id); } catch {}
  }
  return id;
}

const LocalStore = {
  key: 'cc-local-data',
  read() {
    try { return JSON.parse(safeGet(this.key)) || { nextId: 1, costumes: [], votes: {} }; }
    catch { return { nextId: 1, costumes: [], votes: {} }; }
  },
  write(d) { safeSet(this.key, JSON.stringify(d)); },
  async load() {
    const d = this.read();
    return { costumes: d.costumes, votes: Object.entries(d.votes).map(([voterId, costumeId]) => ({ voterId, costumeId })) };
  },
  async addCostume({ name, entrant, image }) {
    const d = this.read();
    const id = d.nextId++;
    d.costumes.push({ id, name, entrant, image, createdAt: Date.now() });
    this.write(d);
    return id;
  },
  async vote(voter, costumeId) {
    const d = this.read();
    if (costumeId === null) delete d.votes[voter];
    else if (d.costumes.some((c) => c.id === costumeId)) d.votes[voter] = costumeId;
    else throw new Error('That costume no longer exists.');
    this.write(d);
  },
  async remove(id) {
    const d = this.read();
    d.costumes = d.costumes.filter((c) => c.id !== id);
    for (const v in d.votes) if (d.votes[v] === id) delete d.votes[v];
    this.write(d);
  },
  async reset() {
    try { localStorage.removeItem(this.key); } catch {}
  },
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the Supabase library.'));
    document.head.append(s);
  });
}

const SharedStore = {
  client: null,
  images: new Map(), // photos are large, so each is fetched once and cached
  async db() {
    if (!this.client) {
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
      this.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    }
    return this.client;
  },
  async load() {
    const db = await this.db();
    const [cs, vs] = await Promise.all([
      db.from('costumes').select('id,name,entrant,created_at'),
      db.from('votes').select('voter_id,costume_id').limit(10000),
    ]);
    if (cs.error || vs.error) throw new Error((cs.error || vs.error).message);
    const missing = cs.data.filter((c) => !this.images.has(c.id)).map((c) => c.id);
    if (missing.length) {
      const { data, error } = await db.from('costumes').select('id,image').in('id', missing);
      if (error) throw new Error(error.message);
      data.forEach((r) => this.images.set(r.id, r.image));
    }
    return {
      costumes: cs.data.map((c) => ({
        id: c.id, name: c.name, entrant: c.entrant, image: this.images.get(c.id), createdAt: Date.parse(c.created_at),
      })),
      votes: vs.data.map((v) => ({ voterId: v.voter_id, costumeId: v.costume_id })),
    };
  },
  async addCostume({ name, entrant, image }) {
    const db = await this.db();
    const { data, error } = await db.from('costumes').insert({ name, entrant, image }).select('id').single();
    if (error) throw new Error(error.message);
    this.images.set(data.id, image);
    return data.id;
  },
  async vote(voter, costumeId) {
    const db = await this.db();
    const { error } = costumeId === null
      ? await db.from('votes').delete().eq('voter_id', voter)
      : await db.from('votes').upsert({ voter_id: voter, costume_id: costumeId, voted_at: new Date().toISOString() });
    if (error) throw new Error(error.code === '23503' ? 'That costume no longer exists.' : error.message);
  },
  async remove(id) {
    const db = await this.db();
    const { error } = await db.from('costumes').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
  async reset() {
    const db = await this.db();
    const { error } = await db.from('costumes').delete().gte('id', 0); // votes cascade
    if (error) throw new Error(error.message);
    this.images.clear();
  },
};

const backend = mode === 'shared' ? SharedStore : LocalStore;
window.ContestStore = {
  mode,
  isLocalhost,
  voterId,
  newVoter() { try { localStorage.removeItem('cc-voter'); } catch {} return voterId(); },
  load: () => backend.load(),
  addCostume: (entry) => backend.addCostume(entry),
  vote: (voter, id) => backend.vote(voter, id),
  remove: (id) => backend.remove(id),
  reset: () => backend.reset(),
};
})();
