/* Front Office Baseball — self-hosted multiplayer bridge.
   Gives the game the same small storage API it uses inside Claude, backed by your own Firebase
   project (Firestore + anonymous / Google sign-in). You don't need to edit this file. */
(function (G) {
  'use strict';
  G.FOB_SELFHOST = true;
  const cfg = G.FIREBASE_CONFIG || {};
  const configured = cfg.apiKey && !/PASTE/.test(cfg.apiKey);
  let fs = null, auth = null, ready = null;
  const nameKey = 'fob_nickname';
  const getName = () => { try { return localStorage.getItem(nameKey) || ''; } catch (e) { return ''; } };
  G.FOB_NAME = () => getName() || 'Manager';

  function snapDoc(s) { return { id: s.id, exists: s.exists, data: () => (s.exists ? s.data() : undefined), metadata: { fromCache: s.metadata ? s.metadata.fromCache : false, hasPendingWrites: s.metadata ? s.metadata.hasPendingWrites : false } }; }
  function snapQuery(q) { const docs = q.docs.map(snapDoc); return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } }; }
  function err(e) { return { code: (e && e.code) || 'unavailable', message: (e && e.message) || String(e) }; }
  function docRef(ref) {
    return {
      id: ref.id, path: ref.path,
      get: async () => snapDoc(await ref.get()),
      set: async d => { await ref.set(d); },
      update: async d => { await ref.update(d); },
      delete: async () => { await ref.delete(); },
      onSnapshot: (next, e) => ref.onSnapshot(s => next(snapDoc(s)), x => e && e(err(x))),
      collection: p => colRef(ref.collection(p)),
      acquire: async o => {
        const holder = o.holder, ttl = Math.min(600000, Math.max(1000, o.ttlMs || 30000));
        return fs.runTransaction(async tx => {
          const s = await tx.get(ref); const l = s.exists ? (s.data() || {}).lease : null; const now = Date.now();
          if (l && l.exp > now && l.holder !== holder) return { acquired: false, expiresAt: new Date(l.exp).toISOString() };
          tx.set(ref, { lease: { holder, exp: now + ttl } }, { merge: true });
          return { acquired: true, holder, expiresAt: new Date(now + ttl).toISOString() };
        });
      }
    };
  }
  function query(q) {
    return {
      where: (f, op, v) => query(q.where(f, op, v)),
      orderBy: (f, d) => query(q.orderBy(f, d || 'asc')),
      limit: n => query(q.limit(n)),
      get: async () => snapQuery(await q.get()),
      onSnapshot: (next, e) => q.onSnapshot(s => next(snapQuery(s)), x => e && e(err(x)))
    };
  }
  function colRef(c) { return Object.assign(query(c), { path: c.path, doc: id => docRef(id ? c.doc(id) : c.doc()), add: async d => docRef(await c.add(d)) }); }
  const db = { doc: p => docRef(fs.doc(p)), collection: p => colRef(fs.collection(p)) };
  const user = {
    id: async () => (auth && auth.currentUser ? auth.currentUser.uid : null),
    me: async () => ({ id: auth && auth.currentUser ? auth.currentUser.uid : null, name: getName() }),
    isOwner: () => false, canEdit: () => true, can: async () => true,
    profiles: async ids => {
      const out = {};
      await Promise.all(ids.map(async id => { try { const s = await fs.doc('profiles/' + id).get(); out[id] = { id, name: s.exists ? (s.data().name || '') : '' }; } catch (e) { out[id] = { id, name: '' }; } }));
      return out;
    }
  };
  async function saveName(n) {
    try { localStorage.setItem(nameKey, n); } catch (e) { }
    if (fs && auth && auth.currentUser) try { await fs.doc('profiles/' + auth.currentUser.uid).set({ name: n, ts: Date.now() }); } catch (e) { }
  }
  function askName(done) {
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(3,7,10,.75);display:flex;align-items:center;justify-content:center;z-index:100;font-family:Barlow,system-ui,sans-serif';
    ov.innerHTML = `<form style="background:#111b24;border:1px solid #253545;border-radius:14px;padding:22px;max-width:380px;width:92%;color:#e7edf3">
      <h2 style="margin:0 0 8px;font-family:'Barlow Condensed',sans-serif">Choose a nickname</h2>
      <p style="color:#8796a6;margin:0 0 12px">Other managers will see this name.</p>
      <input name="n" maxlength="24" required value="${(getName() || '').replace(/"/g, '')}" style="width:100%;padding:9px;border-radius:8px;border:1px solid #253545;background:#0f1a23;color:#e7edf3;font:inherit">
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button style="background:#f2a541;border:0;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer">Continue</button>
      <button type="button" data-g style="background:transparent;color:#e7edf3;border:1px solid #253545;border-radius:8px;padding:8px 14px;cursor:pointer">Sign in with Google instead</button></div>
      <p style="color:#8796a6;font-size:12px;margin:10px 0 0">Tip: Google sign-in keeps your team if you switch devices. Without it, your team is tied to this browser.</p></form>`;
    document.body.appendChild(ov);
    const f = ov.querySelector('form');
    f.onsubmit = async e => { e.preventDefault(); const n = f.n.value.trim().slice(0, 24); if (!n) return; await saveName(n); ov.remove(); done && done(); };
    ov.querySelector('[data-g]').onclick = async () => {
      try {
        const prov = new firebase.auth.GoogleAuthProvider();
        const res = auth.currentUser && auth.currentUser.isAnonymous ? await auth.currentUser.linkWithPopup(prov).catch(() => auth.signInWithPopup(prov)) : await auth.signInWithPopup(prov);
        const n = (f.n.value.trim() || (res.user && res.user.displayName) || 'Manager').slice(0, 24);
        await saveName(n); ov.remove(); location.reload();
      } catch (e) { alert('Google sign-in is not enabled for this site yet. Ask the league owner, or just use a nickname.'); }
    };
  }
  G.FOB_ASKNAME = askName;
  if (configured && G.firebase) {
    try {
      firebase.initializeApp(cfg);
      fs = firebase.firestore(); auth = firebase.auth();
      ready = new Promise(res => {
        const off = auth.onAuthStateChanged(async u => {
          if (u) { off(); res(true); if (getName()) saveName(getName()); else askName(() => { if (G.App && G.App.st == null && G.__dbg) G.__dbg.render(); }); }
        });
        auth.signInAnonymously().catch(() => res(false));
        setTimeout(() => res(!!auth.currentUser), 8000);
      });
    } catch (e) { console.error(e); ready = Promise.resolve(false); }
  } else ready = Promise.resolve(false);
  G.claude = {
    use: async name => {
      const ok = await ready; if (!ok) return null;
      if (name === 'db') return db;
      if (name === 'user') return user;
      return null;
    }
  };
})(window);
