/* Storage: private single-player saves + shared multiplayer leagues */
(function (G) {
'use strict';
const CH = 180000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

async function gz(str) {
  const cs = new CompressionStream('gzip');
  const buf = await new Response(new Blob([str]).stream().pipeThrough(cs)).arrayBuffer();
  const bytes = new Uint8Array(buf); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function gunz(b64) {
  const bin = atob(b64); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ds = new DecompressionStream('gzip');
  return await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
}
async function pack(st) { return await gz(JSON.stringify(st)); }
async function unpack(b64) { return JSON.parse(await gunz(b64)); }
function split(s) { const out = []; for (let i = 0; i < s.length; i += CH) out.push(s.slice(i, i + CH)); return out.length ? out : ['']; }

const S = {
  db: null, user: null, uid: null, holder: rid(), ready: false, canWrite: null,
  async init() {
    const c = G.claude;
    if (!c || !c.use) { this.ready = true; return; }
    const tm = new Promise(r => setTimeout(() => r(null), 10000));
    try { this.user = await Promise.race([c.use('user'), tm]); } catch (e) { this.user = null; }
    try { this.db = await Promise.race([c.use('db'), tm]); } catch (e) { this.db = null; }
    try { this.uid = this.user ? await this.user.id() : null; } catch (e) { this.uid = null; }
    try { this.canWrite = this.user && this.user.can ? await this.user.can('data.write') : null; } catch (e) { this.canWrite = null; }
    if (!this.uid) this.db = this.db; // shared reads still work
    this.ready = true;
  },
  hasCloud() { return !!(this.db && this.uid); },
  async names(ids) {
    const out = {};
    if (!this.user || !this.user.profiles || !ids.length) return out;
    try { const ps = await this.user.profiles(ids); for (const id of ids) out[id] = (ps[id] && ps[id].name) || ''; } catch (e) { }
    return out;
  },

  /* ---------- private saves ---------- */
  idxRef() { return this.db.doc('data/users/' + this.uid + '/index'); },
  async listSaves() {
    if (this.hasCloud()) {
      try { const s = await this.idxRef().get(); return (s.exists && s.data().saves) ? s.data().saves.slice() : []; } catch (e) { }
    }
    try { return JSON.parse(localStorage.getItem('fob_index') || '[]'); } catch (e) { return []; }
  },
  async saveLocal(id, st, info) {
    const data = await pack(st);
    if (this.hasCloud()) {
      const saves = await this.listSaves();
      const prev = saves.find(s => s.id === id);
      const ver = (prev ? prev.ver || 0 : 0) + 1;
      const parts = split(data);
      const col = this.db.collection('data/users/' + this.uid);
      for (let i = 0; i < parts.length; i++) await col.doc(`s_${id}_v${ver}_${i}`).set({ d: parts[i] });
      const entry = Object.assign({ id, ver, n: parts.length, updated: Date.now() }, info);
      const next = saves.filter(s => s.id !== id); next.unshift(entry);
      await this.idxRef().set({ saves: next });
      if (prev) for (let i = 0; i < (prev.n || 1); i++) col.doc(`s_${id}_v${prev.ver}_${i}`).delete().catch(() => { });
      return;
    }
    try {
      localStorage.setItem('fob_s_' + id, data);
      const saves = JSON.parse(localStorage.getItem('fob_index') || '[]').filter(s => s.id !== id);
      saves.unshift(Object.assign({ id, updated: Date.now() }, info));
      localStorage.setItem('fob_index', JSON.stringify(saves));
    } catch (e) { throw new Error('Could not save in this browser. Use Export to keep a backup.'); }
  },
  async loadLocal(id) {
    if (this.hasCloud()) {
      const saves = await this.listSaves(); const e = saves.find(s => s.id === id);
      if (e && e.ver) {
        const col = this.db.collection('data/users/' + this.uid); let s = '';
        for (let i = 0; i < e.n; i++) { const d = await col.doc(`s_${id}_v${e.ver}_${i}`).get(); if (!d.exists) throw new Error('Save data missing.'); s += d.data().d; }
        return await unpack(s);
      }
    }
    const raw = localStorage.getItem('fob_s_' + id); if (!raw) throw new Error('Save not found.');
    return await unpack(raw);
  },
  async deleteLocal(id) {
    if (this.hasCloud()) {
      const saves = await this.listSaves(); const e = saves.find(s => s.id === id);
      await this.idxRef().set({ saves: saves.filter(s => s.id !== id) });
      if (e && e.ver) { const col = this.db.collection('data/users/' + this.uid); for (let i = 0; i < e.n; i++) col.doc(`s_${id}_v${e.ver}_${i}`).delete().catch(() => { }); }
    }
    try { localStorage.removeItem('fob_s_' + id); localStorage.setItem('fob_index', JSON.stringify(JSON.parse(localStorage.getItem('fob_index') || '[]').filter(s => s.id !== id))); } catch (e) { }
  },

  /* ---------- shared leagues ---------- */
  async listLeagues() {
    if (!this.db) return [];
    const q = await this.db.collection('leagues').get();
    return q.docs.filter(d => d.exists).map(d => Object.assign({ id: d.id }, d.data()));
  },
  metaOf(st, lid) {
    const teams = {}; st.teams.forEach(t => { if (t.user) teams[t.id] = t.user; });
    return { name: st.name, owner: st.commish, ver: st.ver, season: st.season, phase: st.phase, day: st.day, games: st.settings.games, teams, updated: Date.now(), lid };
  },
  async writeShared(lid, st, prevVer, prevN) {
    const data = await pack(st);
    const parts = split(data);
    for (let i = 0; i < parts.length; i++) await this.db.doc(`chunks/${lid}_v${st.ver}_${i}`).set({ d: parts[i], ver: st.ver });
    const meta = this.metaOf(st, lid); meta.n = parts.length;
    await this.db.doc('leagues/' + lid).set(meta);
    if (prevVer != null) for (let i = 0; i < (prevN || 1); i++) this.db.doc(`chunks/${lid}_v${prevVer}_${i}`).delete().catch(() => { });
    return meta;
  },
  async createShared(st) {
    const lid = rid(); st.lid = lid; st.ver = 1;
    await this.writeShared(lid, st, null);
    return lid;
  },
  async fetchShared(lid, metaIn) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const meta = metaIn && attempt === 0 ? metaIn : (await this.db.doc('leagues/' + lid).get()).data();
      if (!meta) throw new Error('League not found (it may have been deleted).');
      let s = '', ok = true;
      for (let i = 0; i < (meta.n || 1); i++) {
        const d = await this.db.doc(`chunks/${lid}_v${meta.ver}_${i}`).get();
        if (!d.exists) { ok = false; break; } s += d.data().d;
      }
      if (ok) { const st = await unpack(s); st.ver = meta.ver; st.lid = lid; return { st, meta }; }
      await sleep(600 + Math.random() * 600);
    }
    throw new Error('Could not load the league right now. Try again.');
  },
  /* run fn on the freshest state under a cooperative lease, then publish */
  async commitShared(lid, localSt, fn) {
    const lock = this.db.doc('locks/' + lid);
    let got = false;
    for (let i = 0; i < 40; i++) {
      const r = await lock.acquire({ holder: this.holder, ttlMs: 12000 });
      if (r.acquired) { got = true; break; }
      await sleep(500 + Math.random() * 500);
    }
    if (!got) throw new Error('Another manager is saving right now. Try again in a moment.');
    const m = await this.db.doc('leagues/' + lid).get();
    if (!m.exists) throw new Error('League not found.');
    const meta = m.data();
    let st;
    if (localSt && localSt.ver === meta.ver) st = structuredClone(localSt);
    else st = (await this.fetchShared(lid, meta)).st;
    let err;
    try { err = fn(st); } catch (e) { lock.acquire({ holder: this.holder, ttlMs: 1000 }).catch(() => { }); throw e; }
    if (typeof err === 'string') { lock.acquire({ holder: this.holder, ttlMs: 1000 }).catch(() => { }); return { err, st: null }; }
    await lock.acquire({ holder: this.holder, ttlMs: 12000 });
    const prevVer = meta.ver, prevN = meta.n;
    st.ver = meta.ver + 1; st.lid = lid;
    try { await this.writeShared(lid, st, prevVer, prevN); }
    finally { lock.acquire({ holder: this.holder, ttlMs: 1000 }).catch(() => { }); }
    return { err: null, st };
  },
  watch(lid, cb, onErr) {
    return this.db.doc('leagues/' + lid).onSnapshot(s => { if (s.exists) cb(s.data()); else cb(null); }, e => onErr && onErr(e));
  },
  async deleteShared(lid) {
    const m = await this.db.doc('leagues/' + lid).get();
    const meta = m.exists ? m.data() : null;
    await this.db.doc('leagues/' + lid).delete();
    if (meta) for (let i = 0; i < (meta.n || 1); i++) await this.db.doc(`chunks/${lid}_v${meta.ver}_${i}`).delete().catch(() => { });
  },
  async sendMsg(lid, to, text) {
    if (!this.db || !this.uid) throw new Error('Sign in to send messages.');
    await this.db.collection('msgs').add({ lid, a: this.uid, b: to, t: String(text).slice(0, 500), ts: Date.now() });
  },
  watchMsgs(lid, cb) {
    if (!this.db) return () => { };
    try { return this.db.collection('msgs').where('lid', '==', lid).limit(1000).onSnapshot(q => cb(q.docs.filter(d => d.exists).map(d => Object.assign({ id: d.id }, d.data()))), () => { }); } catch (e) { return () => { }; }
  },
  pack, unpack, rid
};
G.Store = S;
})(window);
