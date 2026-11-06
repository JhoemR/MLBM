/* Diamond Dynasty Franchise — game engine (no DOM) */
(function (G) {
'use strict';
let rnd = Math.random;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const rf = (a, b) => a + rnd() * (b - a);
const pick = a => a[Math.floor(rnd() * a.length)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const r1 = x => Math.round(x * 10) / 10;
function gauss() { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const LEAGUES = ['American League', 'National League'], LG = ['AL', 'NL'], DIVS = ['East', 'Central', 'West'];
const TEAMS = [
  ['Brooklyn', 'Ironworks', 'BKN', '#c8553d', 3], ['Baltimore', 'Crabbers', 'BAL', '#e8871e', 2], ['Montreal', 'Voyageurs', 'MTL', '#3f6ad8', 2], ['Hartford', 'Foundry', 'HFD', '#7a7f87', 1], ['Toronto', 'Lakehawks', 'TOR', '#1f78b4', 3],
  ['Columbus', 'Aviators', 'CLB', '#b23a48', 2], ['Indianapolis', 'Pacemen', 'IND', '#2b9348', 1], ['Detroit', 'Motormen', 'DET', '#22333b', 2], ['Milwaukee', 'Anglers', 'MIL', '#0f7c8c', 1], ['Nashville', 'Fiddlers', 'NSH', '#d4a017', 2],
  ['Portland', 'Lumberjacks', 'POR', '#386641', 2], ['Las Vegas', 'High Rollers', 'LV', '#9b2226', 3], ['Sacramento', 'Prospectors', 'SAC', '#bc6c25', 1], ['Salt Lake', 'Summit', 'SLC', '#5e60ce', 1], ['Vancouver', 'Orcas', 'VAN', '#14213d', 2],
  ['Charlotte', 'Monarchs', 'CHA', '#6a4c93', 2], ['Richmond', 'Ironclads', 'RIC', '#495057', 1], ['Newark', 'Ferrymen', 'NWK', '#c1121f', 3], ['Raleigh', 'Oaks', 'RAL', '#606c38', 1], ['Orlando', 'Herons', 'ORL', '#219ebc', 2],
  ['Memphis', 'Riverboats', 'MEM', '#8338ec', 1], ['Oklahoma City', 'Drillers', 'OKC', '#e76f51', 2], ['Louisville', 'Thoroughbreds', 'LOU', '#7b2d26', 1], ['Omaha', 'Stockmen', 'OMA', '#a7754d', 1], ['San Antonio', 'Vaqueros', 'SA', '#264653', 2],
  ['San Jose', 'Comets', 'SJ', '#2a9d8f', 3], ['Albuquerque', 'Roadrunners', 'ABQ', '#f4a261', 1], ['Honolulu', 'Navigators', 'HNL', '#0081a7', 2], ['Austin', 'Armadillos', 'AUS', '#bf4342', 2], ['Boise', 'Peaks', 'BOI', '#4361ee', 1]
];
const FN = ['Aaron','Adrian','Alex','Andres','Andrew','Angel','Anthony','Ben','Blake','Brandon','Brett','Bryce','Caleb','Cam','Carlos','Carter','Chase','Chris','Cody','Colby','Colin','Connor','Corey','Dan','Dante','David','Derek','Diego','Dylan','Eddie','Eli','Emilio','Eric','Ethan','Evan','Felix','Francisco','Gabe','Garrett','Gavin','Grant','Hector','Hunter','Ian','Isaac','Ivan','Jace','Jack','Jake','James','Jared','Javier','Jesus','Joel','Jonah','Jordan','Jorge','Jose','Josh','Juan','Julio','Justin','Kai','Keegan','Kenta','Kevin','Kyle','Liam','Logan','Luis','Manny','Marcus','Mario','Mason','Matt','Max','Miguel','Mike','Nate','Nick','Noah','Omar','Oscar','Owen','Pablo','Pedro','Rafael','Ramon','Reese','Ricky','Riley','Rob','Ryan','Ryo','Sam','Sean','Seth','Shohei','Spencer','Taylor','Theo','Tomas','Trey','Tyler','Victor','Wes','Will','Xavier','Yoshi','Zach'];
const LN = ['Abreu','Adams','Alvarez','Anderson','Arroyo','Baker','Barnes','Bautista','Bell','Bennett','Brooks','Brown','Bryant','Burke','Cabrera','Campbell','Cano','Carter','Castillo','Chapman','Chavez','Choi','Clark','Cole','Collins','Cooper','Cruz','Davis','Diaz','Dominguez','Duran','Edwards','Ellis','Espinal','Evans','Fisher','Flores','Foster','Fuentes','Garcia','Gibson','Gomez','Gonzalez','Gray','Green','Guerrero','Gutierrez','Hall','Harper','Harris','Hayes','Hernandez','Hill','Holmes','Howard','Hughes','Ito','Jackson','James','Jimenez','Johnson','Jones','Kelly','Kim','King','Kowalski','Lee','Lewis','Lopez','Lynch','Machado','Marsh','Martin','Martinez','Matsui','Medina','Mendoza','Miller','Mitchell','Moore','Morales','Moreno','Murphy','Nakamura','Nelson','Nguyen','Nunez','Ortiz','Owens','Pages','Park','Parker','Pena','Perez','Peterson','Phillips','Price','Quinn','Ramirez','Ramos','Reed','Reyes','Rivera','Roberts','Robinson','Rodriguez','Rogers','Rojas','Romero','Ross','Ruiz','Russell','Sanchez','Santana','Sato','Schmidt','Scott','Silva','Smith','Soto','Stewart','Sullivan','Suzuki','Tanaka','Taylor','Thomas','Thompson','Torres','Turner','Valdez','Vargas','Vasquez','Walker','Ward','Watson','White','Williams','Wilson','Wright','Yamamoto','Young','Zimmerman'];

const HPOS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
const LPOS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const DEFW = { C: .38, SS: .36, CF: .32, '2B': .3, '3B': .26, RF: .2, LF: .16, '1B': .1, DH: 0 };
const IF = ['2B', '3B', 'SS'], OF = ['LF', 'CF', 'RF'];
const B = { g: 0, pa: 1, ab: 2, h: 3, d: 4, t: 5, hr: 6, r: 7, rbi: 8, bb: 9, k: 10, sb: 11, cs: 12, hbp: 13, sf: 14 }, BL = 15;
const P = { g: 0, gs: 1, o: 2, h: 3, er: 4, bb: 5, k: 6, hr: 7, w: 8, l: 9, sv: 10, bf: 11, r: 12, hld: 13 }, PL = 14;
const MINSAL = 0.74;
const isP = p => p.p === 'SP' || p.p === 'RP';
const H = G.FR_HOOKS || (G.FR_HOOKS = {});

/* ---------- ratings ---------- */
const BASEFAM = { SS: { '2B': 80, '3B': 72, '1B': 55, CF: 30, LF: 35, RF: 35 }, '2B': { SS: 50, '3B': 55, '1B': 60, LF: 35, RF: 30, CF: 25 }, '3B': { '1B': 65, SS: 35, '2B': 45, LF: 35, RF: 40 }, '1B': { LF: 30, RF: 25, '3B': 25 },
  CF: { LF: 88, RF: 85, '2B': 15 }, SP: { RP: 80 }, RP: { SP: 35 }, LF: { RF: 70, CF: 40, '1B': 45 }, RF: { LF: 75, CF: 45, '1B': 45 }, C: { '1B': 45, '3B': 20 }, DH: { '1B': 45, LF: 30 } };
function famAt(p, pos) {
  if (p.p === pos) return 100;
  const learned = p.fam && p.fam[pos]; const base = (BASEFAM[p.p] && BASEFAM[p.p][pos]) || (pos === 'C' ? 5 : 20);
  return Math.min(100, Math.max(base, learned || 0));
}
function batVal(r) { return r.con * .36 + r.pow * .32 + r.eye * .22 + r.spd * .10; }
function defAt(p, pos) {
  if (pos === 'DH') return 0;
  const r = p.r; let d = r.fld * .65 + r.arm * .35; const pp = p.p;
  if (pp === pos) return d;
  const fam = famAt(p, pos);
  return d - (100 - fam) * (pos === 'C' ? 0.32 : pos === 'SS' || pos === 'CF' ? 0.16 : 0.13);
}
function ovrAt(p, pos) { if (isP(p)) return p.o; const w = DEFW[pos]; return batVal(p.r) * (1 - w) + defAt(p, pos) * w; }
function calcOvr(p) {
  const r = p.r;
  if (p.p === 'SP') return Math.round(r.vel * .3 + r.ctl * .3 + r.brk * .3 + r.sta * .1 + 3);
  if (p.p === 'RP') return Math.round(r.vel * .36 + r.ctl * .28 + r.brk * .36);
  return Math.round(ovrAt(p, p.p));
}
function setOvr(p) { p.o = calcOvr(p); if (p.pt < p.o) p.pt = p.o; return p; }

function marketSal(o, age) {
  if (o < 60) return MINSAL;
  let s = MINSAL + Math.pow((o - 60) / 30, 2.2) * 36;
  if (age >= 33) s *= 1 - (age - 32) * 0.08;
  return Math.max(MINSAL, r1(s));
}
function pval(p) {
  const o = p.o, age = p.a;
  let eff = o;
  if (age <= 26) eff = o + (p.pt - o) * clamp((27 - age) / 8, 0, 1) * 0.7;
  if (age >= 32) eff -= (age - 31) * 1.5;
  if (p.p === 'RP') eff -= 4;
  let v = Math.pow(Math.max(0, eff - 40), 2.2) / 40;
  const ms = marketSal(o, age), yrs = Math.max(1, Math.min(p.y || 1, 4));
  v += (ms - p.sal) * yrs * 0.6;
  if (p.inj > 30) v *= 0.7;
  return Math.max(0.5, Math.round(v * 10) / 10);
}

function genRatings(p, t) {
  const g = (adj, sd) => clamp(Math.round(t + adj + gauss() * (sd || 7)), 20, 99);
  if (p.p === 'SP' || p.p === 'RP') {
    p.r = { vel: g(0), ctl: g(0), brk: g(0), sta: p.p === 'SP' ? clamp(Math.round(68 + gauss() * 9), 45, 99) : clamp(Math.round(38 + gauss() * 8), 20, 60) };
  } else {
    const f = { C: [0, -1, 0, -12, 8, 7], '1B': [1, 6, 1, -8, -6, -6], '2B': [2, -4, 1, 5, 4, -1], '3B': [0, 3, 0, -2, 2, 6], SS: [0, -4, 0, 6, 7, 5], LF: [1, 3, 0, 0, -4, -3], CF: [1, -3, 1, 10, 5, 2], RF: [0, 4, 0, 1, 0, 7], DH: [1, 5, 2, -6, -12, -8] }[p.p] || [0, 0, 0, 0, 0, 0];
    p.r = { con: g(f[0]), pow: g(f[1], 9), eye: g(f[2]), spd: g(f[3], 9), fld: g(f[4]), arm: g(f[5]) };
  }
}
function computeCen(st) {
  const hk = ['con', 'pow', 'eye', 'spd', 'fld'], pk = ['vel', 'ctl', 'brk'];
  const c = {}; hk.concat(pk).forEach(k => c[k] = 0);
  let nh = 0, np = 0;
  for (const t of st.teams) {
    const a = teamPlayers(st, t.id).filter(p => p.lv === 0);
    const hs = a.filter(p => !isP(p)).sort((x, y) => y.o - x.o).slice(0, 10);
    const sps = a.filter(p => p.p === 'SP').sort((x, y) => y.o - x.o).slice(0, 5), rps = a.filter(p => p.p === 'RP').sort((x, y) => y.o - x.o).slice(0, 5);
    for (const h of hs) { hk.forEach(k => c[k] += h.r[k]); nh++; }
    for (const p of sps) { pk.forEach(k => c[k] += p.r[k] * 2); np += 2; }
    for (const p of rps) { pk.forEach(k => c[k] += p.r[k]); np++; }
  }
  hk.forEach(k => c[k] = nh ? c[k] / nh : 68); pk.forEach(k => c[k] = np ? c[k] / np : 68);
  c.S = c.vel * .45 + c.brk * .55;
  return c;
}
function newPlayer(st, pos, age, tgt, tid, lv) {
  const p = { id: st.nextId++, f: pick(FN), l: pick(LN), a: age, p: pos, b: 'R', t: 'R', r: null, o: 0, pt: 0, tid, lv, sal: MINSAL, y: 1, inj: 0, e: 100, c: [], nat: H.nat ? H.nat(tid) : 'USA' };
  if (pos === 'SP' || pos === 'RP') { p.t = rnd() < .28 ? 'L' : 'R'; p.b = p.t; }
  else { const x = rnd(); p.b = x < .6 ? 'R' : x < .9 ? 'L' : 'S'; p.t = (pos === 'C' || IF.includes(pos)) ? 'R' : (rnd() < .2 ? 'L' : 'R'); }
  genRatings(p, tgt);
  p.o = calcOvr(p);
  let up = 0;
  if (age <= 20) up = rf(10, 32); else if (age <= 22) up = rf(6, 24); else if (age <= 24) up = rf(2, 14); else if (age <= 26) up = rf(0, 6);
  p.pt = clamp(Math.round(p.o + up), p.o, 99);
  st.players[p.id] = p;
  return p;
}

/* ---------- league creation ---------- */
function createLeague(opts) {
  const st = {
    v: 1, name: opts.name || 'My Franchise', season: opts.season || 2027, phase: 'regular', day: 0,
    settings: { games: opts.games || 162, diff: opts.diff || 'normal', injuries: opts.injuries !== false, advance: opts.advance || 'commish' },
    teams: [], players: {}, nextId: 1, sched: [], news: [], boxes: [], history: [], offers: [], txn: [],
    members: {}, ready: {}, commish: opts.commish || null, draftDone: false, po: null, fa: null, resign: null, draft: null, awards: null, ver: 0
  };
  const real = opts.real !== false && G.REAL_TEAMS;
  st.settings.real = !!real;
  (real ? G.REAL_TEAMS : TEAMS).forEach((d, i) => {
    st.teams.push({ id: i, city: d[0], name: d[1], ab: d[2], col: d[3], mkt: d[4], lg: i < 15 ? 0 : 1, div: Math.floor((i % 15) / 5), bud: 0, user: null, lu: null, rot: [], cl: null, su: null, rotI: 0, auto: true, w: 0, l: 0, rs: 0, ra: 0, strk: 0, l10: [] });
  });
  st.teams.forEach(t => (real ? genRealRoster(st, t) : genRoster(st, t)));
  for (let i = 0; i < 60; i++) { // free agent pool
    const pos = rnd() < .45 ? (rnd() < .4 ? 'SP' : 'RP') : pick(HPOS);
    const p = newPlayer(st, pos, ri(25, 36), ri(48, 63), -1, 0); p.ask = askFor(p);
  }
  st.teams.forEach(t => {
    const pay = payroll(st, t.id);
    const base = [0, 115, 165, 235][t.mkt];
    t.bud = Math.round(Math.max(base, pay + 8 + rf(0, 25)));
    autoDepth(st, t);
  });
  Object.values(st.players).forEach(p => { p.rk = p.a <= 24; });
  st.cen = computeCen(st); st.cen0 = Object.assign({}, st.cen);
  if (H.create) H.create(st);
  st.sched = genSchedule(st.settings.games);
  newsAdd(st, `Welcome to the ${st.season} season of ${st.name}!`);
  return st;
}
function genRoster(st, t) {
  const tier = clamp(gauss() * 1.8, -4, 4);
  const mk = (pos, a, tg, lv) => { const p = newPlayer(st, pos, a, tg + tier, t.id, lv); contractInit(p); return p; };
  const star = ri(0, 7);
  HPOS.forEach((pos, i) => mk(pos, ri(23, 34), 66 + gauss() * 4 + (i === star ? 12 : 0), 0));
  mk('C', ri(24, 34), 56, 0); mk(pick(['2B', 'SS']), ri(23, 33), 58, 0); mk(pick(['CF', 'LF', 'RF']), ri(23, 33), 58, 0); mk(pick(['1B', '3B']), ri(24, 34), 58, 0); mk(pick(HPOS), ri(23, 33), 56, 0);
  [76, 72, 69, 67, 65].forEach(tg => mk('SP', ri(23, 34), tg + gauss() * 3, 0));
  [72, 69, 67, 66, 65, 64, 63].forEach(tg => mk('RP', ri(24, 35), tg + gauss() * 3, 0));
  ['C', 'SS', '2B', '3B', 'CF', 'RF', '1B'].forEach(pos => mk(pos, ri(19, 25), ri(42, 56), 1));
  ['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP'].forEach(pos => mk(pos, ri(19, 26), ri(42, 56), 1));
}
const HTR = { p: 'pow', c: 'con', e: 'eye', s: 'spd', d: 'fld', a: 'arm' }, PTR = { v: 'vel', k: 'brk', c: 'ctl', s: 'sta' };
function fitOvr(p, target) {
  for (let i = 0; i < 8; i++) {
    const diff = target - calcOvr(p); if (Math.abs(diff) < 0.6) break;
    for (const k of Object.keys(p.r)) if (k !== 'sta') p.r[k] = clamp(p.r[k] + diff, 20, 99);
  }
  p.o = calcOvr(p);
}
function realPlayer(st, line, tid) {
  const [nm, pos, age, bt, ovr, tr] = line.split(',').map(x => (x || '').trim());
  const a = (+age || 28) + (st.season - 2026), o = +ovr || 65;
  const p = newPlayer(st, pos, a, o, tid, 0);
  const sp = nm.indexOf(' '); p.f = sp > 0 ? nm.slice(0, sp) : nm; p.l = sp > 0 ? nm.slice(sp + 1) : '';
  p.nat = (G.REAL_NAT || {})[nm] || 'USA';
  p.b = (bt || 'RR')[0]; p.t = (bt || 'RR')[1] || 'R';
  const has = c => (tr || '').includes(c);
  if (isP(p)) {
    for (const k of ['vel', 'ctl', 'brk']) p.r[k] = clamp(Math.round(o + (p.r[k] - o) * 0.5), 20, 99);
    for (const ch of (tr || '')) { const k = PTR[ch]; if (k) p.r[k] = clamp(p.r[k] + (k === 'sta' ? 10 : 8), 20, 99); }
    if (pos === 'SP') p.r.sta = clamp(Math.max(p.r.sta, 70 + (o - 70) * 0.3), 50, 99);
    fitOvr(p, o);
  } else {
    const f = { C: [-14, 8, 8], '1B': [-8, -6, -6], '2B': [4, 4, -1], '3B': [-2, 2, 7], SS: [5, 7, 6], LF: [0, -4, -3], CF: [9, 5, 2], RF: [1, 0, 7], DH: [-6, -12, -8] }[pos] || [0, 0, 0];
    const lvl = (o - 70) * 0.35;
    p.r.spd = clamp(Math.round(60 + f[0] + lvl + (has('s') ? 22 : 0) + gauss() * 5), 20, 99);
    p.r.fld = clamp(Math.round(64 + f[1] + lvl + (has('d') ? 18 : 0) + gauss() * 4), 20, 99);
    p.r.arm = clamp(Math.round(64 + f[2] + lvl + (has('a') ? 18 : 0) + (has('d') ? 5 : 0) + gauss() * 4), 20, 99);
    p.r.con = o + (has('c') ? 7 : -2) + gauss() * 3; p.r.pow = o + (has('p') ? 8 : -3) + gauss() * 3; p.r.eye = o + (has('e') ? 7 : -2) + gauss() * 3;
    for (let i = 0; i < 10; i++) {
      const diff = o - calcOvr(p); if (Math.abs(diff) < 0.6) break;
      for (const k of ['con', 'pow', 'eye']) p.r[k] = clamp(p.r[k] + diff, 20, 99);
    }
    for (const k of ['con', 'pow', 'eye']) p.r[k] = clamp(Math.round(p.r[k]), 20, 99);
    p.o = calcOvr(p);
  }
  let up = 0; if (a <= 22) up = rf(6, 16); else if (a <= 25) up = rf(2, 9); else if (a <= 27) up = rf(0, 3);
  p.pt = clamp(Math.round(p.o + up), p.o, 99);
  contractInit(p);
  if (a <= 25 && p.o >= 80) p.y = Math.max(p.y, 4);
  return p;
}
function genRealRoster(st, t) {
  const src = (G.REAL_ROSTERS || {})[t.ab];
  if (!src) return genRoster(st, t);
  const lines = src.split(/[;\n]/).map(x => x.trim()).filter(x => x && x.split(',').length >= 5);
  lines.forEach(l => realPlayer(st, l, t.id));
  const minors = (G.REAL_MINORS || {})[t.ab];
  t.aff = (G.REAL_AFFILIATES || {})[t.ab] || null;
  if (minors && minors.length) { genRealMinors(st, t, minors); st.settings.aa = true; }
  const mk = (pos, a, tg, lv) => { const p = newPlayer(st, pos, a, tg, t.id, lv); contractInit(p); return p; };
  const top = teamPlayers(st, t.id).filter(p => p.lv === 0);
  const hit = top.filter(p => !isP(p)), pit = top.filter(isP);
  if (!hit.some(p => p.p === 'C')) mk('C', ri(26, 33), 62, 0);
  if (hit.filter(p => p.p === 'C').length < 2) mk('C', ri(26, 33), 58, 0);
  const fillH = ['SS', 'CF', '2B', '1B', 'LF', '3B', 'RF'];
  let n = teamPlayers(st, t.id).filter(p => p.lv === 0 && !isP(p)).length, i = 0;
  while (n < 13) { mk(fillH[i++ % fillH.length], ri(25, 32), ri(58, 63), 0); n++; }
  let sps = pit.filter(p => p.p === 'SP').length; while (sps < 5) { mk('SP', ri(25, 32), ri(62, 66), 0); sps++; }
  let np = teamPlayers(st, t.id).filter(p => p.lv === 0 && isP(p)).length; while (np < 13) { mk('RP', ri(25, 33), ri(62, 67), 0); np++; }
  // trim the major-league group to 26: best players stay up
  const up = teamPlayers(st, t.id).filter(p => p.lv === 0);
  if (up.length > 26) {
    const h2 = up.filter(p => !isP(p)).sort((a, b) => b.o - a.o), p2 = up.filter(isP).sort((a, b) => b.o - a.o);
    const keep = new Set(h2.slice(0, 13).concat(p2.slice(0, 13)).map(p => p.id));
    if (!h2.slice(0, 13).some(p => p.p === 'C')) { const c = h2.find(p => p.p === 'C'); if (c) { keep.delete(h2[12].id); keep.add(c.id); } }
    up.forEach(p => { if (!keep.has(p.id)) p.lv = 1; });
  }
  if (!(minors && minors.length)) {
    ['C', 'SS', '2B', '3B', 'CF', 'RF', '1B'].forEach(pos => mk(pos, ri(19, 25), ri(44, 58), 1));
    ['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP'].forEach(pos => mk(pos, ri(19, 26), ri(44, 58), 1));
  }
}
function balanceMinors(st, t) {
  const ms = teamPlayers(st, t.id);
  const aaa = ms.filter(p => p.lv === 1), aa = ms.filter(p => p.lv === 2);
  const med = aaa.map(p => p.o).sort((a, b) => a - b)[Math.floor(aaa.length / 2)] || 55;
  aa.filter(p => p.o >= med + 2 && p.a >= 20).forEach(p => { p.lv = 1; txnAdd(st, `${t.ab} promoted ${p.p} ${pname(p)} to AAA`, 'promote', t.id); });
  const now = teamPlayers(st, t.id).filter(p => p.lv === 1).sort((a, b) => a.o - b.o);
  while (now.length > 32) { const p = now.shift(); if (p.a <= 25) { p.lv = 2; txnAdd(st, `${t.ab} sent ${p.p} ${pname(p)} down to AA`, 'senddown', t.id); } else break; }
}
function genRealMinors(st, t, list) {
  const yrs = st.season - 2026;
  for (const x of list) {
    const [nm, pos, age, bt, lv, r, pot, arr, tab, nat, mst] = x;
    const p = newPlayer(st, pos, age + yrs, 50, t.id, lv);
    const sp = nm.indexOf(' '); p.f = sp > 0 ? nm.slice(0, sp) : nm; p.l = sp > 0 ? nm.slice(sp + 1) : '';
    p.b = bt[0] || 'R'; p.t = bt[1] || 'R'; p.nat = nat || 'USA';
    p.r = (pos === 'SP' || pos === 'RP') ? { vel: r[0], ctl: r[1], brk: r[2], sta: r[3] } : { con: r[0], pow: r[1], eye: r[2], spd: r[3], fld: r[4], arm: r[5] };
    p.o = calcOvr(p); p.pt = Math.max(p.o, pot);
    p.sal = 0.5; p.y = p.a <= 24 ? ri(3, 6) : ri(1, 3);
    p.c = [{ y: 2026, t: /\(/.test(tab) ? tab : tab + (mst ? '' : lv === 1 ? ' (AAA)' : ' (AA)'), b: isP(p) ? null : arr, p: isP(p) ? arr : null, m: mst ? 0 : 1 }];
    if (lv === 0) { p.sal = r1(Math.max(MINSAL, marketSal(p.o, p.a) * (p.a <= 25 ? 0.3 : rf(0.7, 1.1)))); p.y = ri(1, 4); }
  }
}
function editPlayer(st, pid, ch) {
  const p = st.players[pid]; if (!p) return 'Player not found.';
  if (ch.f != null) p.f = String(ch.f).slice(0, 30);
  if (ch.l != null) p.l = String(ch.l).slice(0, 30);
  if (ch.a != null && +ch.a >= 16 && +ch.a <= 50) p.a = +ch.a;
  if (ch.b && 'LRS'.includes(ch.b)) p.b = ch.b;
  if (ch.t && 'LR'.includes(ch.t)) p.t = ch.t;
  if (ch.p && ch.p !== p.p) {
    const wasP = isP(p), nowP = ch.p === 'SP' || ch.p === 'RP';
    p.p = ch.p;
    if (wasP !== nowP) { const o = p.o; genRatings(p, o); fitOvr(p, o); }
  }
  if (ch.o != null && +ch.o >= 30 && +ch.o <= 99) fitOvr(p, +ch.o);
  if (ch.pt != null && +ch.pt >= 30 && +ch.pt <= 99) p.pt = +ch.pt;
  p.o = calcOvr(p); if (p.pt < p.o) p.pt = p.o;
  if (ch.sal != null && +ch.sal >= 0.5) p.sal = r1(+ch.sal);
  if (ch.y != null && +ch.y >= 0 && +ch.y <= 12) p.y = Math.round(+ch.y);
  if (ch.tid != null && +ch.tid !== p.tid) {
    const old = p.tid; p.tid = +ch.tid; p.lv = 0;
    if (p.tid === -1) p.ask = askFor(p); else delete p.ask;
    [old, p.tid].forEach(id => { if (id >= 0) fixRoster(st, st.teams[id]); });
  }
  return null;
}
function contractInit(p) {
  const ms = marketSal(p.o, p.a);
  if (p.lv >= 1) { p.sal = 0.5; p.y = ri(2, 5); return; }
  if (p.a <= 25) { p.sal = r1(Math.max(MINSAL, Math.min(ms, MINSAL + rf(0, 1.5)))); p.y = ri(2, 6); }
  else { p.sal = r1(Math.max(MINSAL, ms * rf(.7, 1.2))); p.y = ri(1, 5); }
}
function askFor(p) {
  const ms = marketSal(p.o, p.a);
  let y = p.a <= 29 ? ri(3, 6) : p.a <= 32 ? ri(2, 4) : p.a <= 35 ? ri(1, 2) : 1;
  if (p.o < 62) y = ri(1, 2);
  return { sal: r1(Math.max(MINSAL, ms * rf(.95, 1.15))), y };
}
function genSchedule(n) {
  const ids = [...Array(30).keys()];
  const rounds = [];
  for (let rep = 0; rep < 2; rep++) {
    const arr = shuffle(ids.slice());
    for (let r = 0; r < 29; r++) {
      const pairs = [];
      for (let i = 0; i < 15; i++) { const a = arr[i], b = arr[29 - i]; pairs.push((r + rep) % 2 ? [a, b] : [b, a]); }
      rounds.push(pairs);
      arr.splice(1, 0, arr.pop());
    }
  }
  const order = shuffle(rounds.slice());
  const days = [];
  let ri2 = 0;
  while (days.length < n) {
    const pairs = order[ri2 % order.length]; ri2++;
    for (let g = 0; g < 3 && days.length < n; g++) days.push(pairs.map(p => [p[0], p[1], null, null]));
  }
  return days;
}

/* ---------- helpers ---------- */
const teamPlayers = (st, tid) => Object.values(st.players).filter(p => p.tid === tid);
const onIL = p => p.inj > 10;
function mlb(st, tid) { return teamPlayers(st, tid).filter(p => p.lv === 0); }
function active(st, tid) { return mlb(st, tid).filter(p => !onIL(p)); }
function payroll(st, tid) { return r1(teamPlayers(st, tid).reduce((s, p) => s + p.sal, 0) + (H.staffPay ? H.staffPay(st, tid) : 0)); }
function pname(p) { return p ? p.f + ' ' + p.l : '—'; }
function sname(p) { return p ? p.f[0] + '. ' + p.l : '—'; }
function tname(t) { return (t.city + ' ' + t.name).trim(); }
function dayLabel(st, d) {
  if (d == null) d = st.day;
  const start = new Date(Date.UTC(st.season, 2, 27));
  const n = st.settings.games;
  const span = n >= 150 ? 186 : Math.round(n * 1.15);
  const dt = new Date(start.getTime() + Math.floor(d * span / n) * 864e5);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
function newsAdd(st, text, tid) { st.news.unshift({ s: st.season, d: st.phase === 'regular' ? st.day : null, ph: st.phase, t: text, tid: tid == null ? null : tid }); if (st.news.length > 200) st.news.length = 200; }
function txnAdd(st, text, k, tids) { st.txn.unshift({ s: st.season, d: dayLabel(st), di: st.phase === 'regular' ? st.day : -1, ph: st.phase, t: text, k: k || 'other', tm: tids == null ? [] : [].concat(tids) }); if (st.txn.length > 700) st.txn.length = 700; }
const draftDay = st => Math.round(st.settings.games * 0.52);
const deadlineDay = st => Math.round(st.settings.games * 0.66);
function tradesOpen(st) {
  if (st.phase === 'playoffs' || st.phase === 'draft') return false;
  if (st.phase === 'regular' && st.day >= deadlineDay(st)) return false;
  return true;
}
function userTeams(st) { return st.teams.filter(t => t.user != null); }
function isUserTeam(st, tid) { return st.teams[tid].user != null; }

/* ---------- depth / lineups ---------- */
function autoLineup(st, t) {
  const hs = active(st, t.id).filter(p => !isP(p) && p.inj === 0);
  const used = new Set(), lu = [];
  const ORDER = ['C', 'SS', 'CF', '2B', '3B', 'RF', 'LF', '1B'];
  const filled = new Set();
  for (const pos of ORDER) { // natural position first
    const best = hs.filter(h => !used.has(h.id) && h.p === pos).sort((a, b) => ovrAt(b, pos) - ovrAt(a, pos))[0];
    if (best) { used.add(best.id); lu.push({ id: best.id, pos }); filled.add(pos); }
  }
  for (const pos of ORDER) { // fill holes with the best fit (familiarity matters most)
    if (filled.has(pos)) continue;
    let best = null, bv = -1e9;
    for (const h of hs) { if (used.has(h.id)) continue; const v = ovrAt(h, pos) + famAt(h, pos) * (pos === 'C' ? 0.6 : 0.25); if (v > bv) { bv = v; best = h; } }
    if (best) { used.add(best.id); lu.push({ id: best.id, pos }); }
  }
  let dh = null, dv = -1;
  for (const h of hs) if (!used.has(h.id) && batVal(h.r) > dv) { dv = batVal(h.r); dh = h; }
  if (dh) { used.add(dh.id); lu.push({ id: dh.id, pos: 'DH' }); }
  return orderLineup(st, lu);
}
function bestPositions(st, t, ids) {
  const hs = ids.map(id => st.players[id]).filter(Boolean);
  const used = new Set(), lu = [];
  const ORDER = ['C', 'SS', 'CF', '2B', '3B', 'RF', 'LF', '1B'];
  const filled = new Set();
  for (const pos of ORDER) { const b = hs.filter(h => !used.has(h.id) && h.p === pos).sort((a, b) => ovrAt(b, pos) - ovrAt(a, pos))[0]; if (b) { used.add(b.id); filled.add(pos); lu.push({ id: b.id, pos }); } }
  for (const pos of ORDER) { if (filled.has(pos)) continue; const b = hs.filter(h => !used.has(h.id)).sort((a, b) => ovrAt(b, pos) - ovrAt(a, pos))[0]; if (b) { used.add(b.id); lu.push({ id: b.id, pos }); } }
  const dh = hs.find(h => !used.has(h.id)); if (dh) lu.push({ id: dh.id, pos: 'DH' });
  // keep the existing batting order sequence
  return ids.map(id => lu.find(s => s.id === id)).filter(Boolean);
}
function orderLineup(st, lu) {
  const P_ = id => st.players[id];
  const arr = lu.slice().sort((a, b) => batVal(P_(b.id).r) - batVal(P_(a.id).r));
  const out = new Array(arr.length);
  const take = fn => { let bi = 0, bv = -1e9; arr.forEach((x, i) => { const v = fn(P_(x.id).r); if (v > bv) { bv = v; bi = i; } }); return arr.splice(bi, 1)[0]; };
  if (arr.length < 9) return lu;
  const top = arr.splice(0, 5);
  const t2 = top.slice();
  const pickFrom = fn => { let bi = 0, bv = -1e9; t2.forEach((x, i) => { const v = fn(P_(x.id).r); if (v > bv) { bv = v; bi = i; } }); return t2.splice(bi, 1)[0]; };
  out[2] = pickFrom(r => batVal(r));
  out[3] = pickFrom(r => r.pow);
  out[0] = pickFrom(r => r.eye + r.con * .5 + r.spd * .8);
  out[1] = pickFrom(r => r.con + r.eye * .5);
  out[4] = t2[0];
  for (let i = 5; i < 9; i++) out[i] = arr.shift();
  void take;
  return out;
}
function autoDepth(st, t) {
  t.lu = autoLineup(st, t);
  const ps = active(st, t.id).filter(p => isP(p) && p.inj === 0);
  const sps = ps.filter(p => p.p === 'SP').sort((a, b) => b.o - a.o);
  const rot = sps.slice(0, 5);
  if (rot.length < 5) ps.filter(p => p.p === 'RP' && !rot.includes(p)).sort((a, b) => (b.r.sta + b.o) - (a.r.sta + a.o)).slice(0, 5 - rot.length).forEach(p => rot.push(p));
  t.rot = rot.map(p => p.id);
  const pen = ps.filter(p => !t.rot.includes(p.id)).sort((a, b) => b.o - a.o);
  t.cl = pen[0] ? pen[0].id : null; t.su = pen[1] ? pen[1].id : null;
  if (H.autoPen) H.autoPen(st, t);
}
function validLineup(st, t, lu) {
  if (!lu || lu.length !== 9) return false;
  const ids = new Set(), pos = new Set();
  for (const s of lu) {
    const p = st.players[s.id];
    if (!p || p.tid !== t.id || p.lv !== 0 || p.inj > 0 || isP(p) || ids.has(s.id) || pos.has(s.pos) || !LPOS.includes(s.pos)) return false;
    ids.add(s.id); pos.add(s.pos);
  }
  return true;
}
/* Fix a user lineup with minimal changes: swap invalid entries for best replacement at that position. */
function repairLineup(st, t) {
  let lu = (t.lu || []).filter(s => { const p = st.players[s.id]; return p && p.tid === t.id && p.lv === 0 && p.inj === 0 && !isP(p); });
  if (validLineup(st, t, t.lu)) return t.lu;
  const used = new Set(lu.map(s => s.id)), have = new Set(lu.map(s => s.pos));
  if (lu.length < 5) return autoLineup(st, t);
  const hs = active(st, t.id).filter(p => !isP(p) && p.inj === 0 && !used.has(p.id));
  const full = (t.lu || []).slice();
  const res = [];
  for (const s of full) {
    const p = st.players[s.id];
    if (p && p.tid === t.id && p.lv === 0 && p.inj === 0 && !isP(p)) { res.push(s); continue; }
    if (have.has(s.pos) && res.find(x => x.pos === s.pos)) continue;
    let best = null, bv = -1e9;
    for (const h of hs) { if (used.has(h.id)) continue; const v = ovrAt(h, s.pos); if (v > bv) { bv = v; best = h; } }
    if (best) { used.add(best.id); res.push({ id: best.id, pos: s.pos }); }
  }
  if (!validLineup(st, t, res)) return autoLineup(st, t);
  return res;
}

/* ---------- roster management ---------- */
function fixRoster(st, t) {
  const user = t.user != null;
  const callUp = isPit => {
    const c = teamPlayers(st, t.id).filter(p => p.lv >= 1 && p.inj === 0 && isP(p) === isPit).sort((a, b) => a.lv - b.lv || b.o - a.o)[0];
    if (c) { const was = c.lv; c.lv = 0; txnAdd(st, `${t.ab} recalled ${c.p} ${pname(c)} from ${was === 1 ? 'AAA' : 'AA'}`, 'recall', t.id); if (user) newsAdd(st, `${pname(c)} was called up to the ${t.name} (auto, roster shortage).`, t.id); return true; }
    const fa = Object.values(st.players).filter(p => p.tid === -1 && isP(p) === isPit).sort((a, b) => a.sal - b.sal || b.o - a.o).slice(0, 15).sort((a, b) => b.o - a.o)[0];
    if (fa) { signPlayer(st, fa, t.id, MINSAL, 1); fa.lv = 0; txnAdd(st, `${t.ab} signed free agent ${pname(fa)} (emergency depth)`, 'fa', t.id); return true; }
    return false;
  };
  const demote = list => { const w = list.sort((a, b) => a.o - b.o)[0]; if (w) { w.lv = 1; txnAdd(st, `${t.ab} optioned ${w.p} ${pname(w)} to AAA`, 'option', t.id); if (user) newsAdd(st, `${pname(w)} was optioned to AAA (roster over 26).`, t.id); } };
  let guard = 0;
  while (guard++ < 40) {
    const act = active(st, t.id);
    const hit = act.filter(p => !isP(p)), pit = act.filter(isP);
    const hitH = hit.filter(p => p.inj === 0), pitH = pit.filter(p => p.inj === 0);
    if (user) {
      if (act.length > 26) { demote(pit.length > 13 ? pit : hit); continue; }
      if (hitH.length < 10 && act.length < 26) { if (callUp(false)) continue; }
      if (pitH.length < 9 && act.length < 26) { if (callUp(true)) continue; }
      if (pit.length > 13) { demote(pit); continue; }
      break;
    }
    if (hit.length > 13) { demote(hit); continue; }
    if (pit.length > 13) { demote(pit); continue; }
    if (hit.length < 13 || hitH.length < 11) { if (callUp(false)) continue; }
    if (pit.length < 13 || pitH.length < 11) { if (callUp(true)) continue; }
    // positional coverage: make sure someone healthy can really play C, SS and CF
    let swapped = false;
    for (const pos of ['C', 'SS', 'CF', '2B', '3B']) {
      const th = pos === '2B' || pos === '3B' ? 60 : 75;
      if (hitH.some(h => famAt(h, pos) >= th)) continue;
      const cand = teamPlayers(st, t.id).filter(p => p.lv >= 1 && p.inj === 0 && !isP(p) && famAt(p, pos) >= th).sort((a, b) => a.lv - b.lv || b.o - a.o)[0];
      if (!cand) continue;
      const out = hit.filter(h => !['C', 'SS', 'CF'].some(q => famAt(h, q) >= 75 && hitH.filter(x => famAt(x, q) >= 75).length <= 1)).sort((a, b) => (a.inj > 0 ? -1 : 0) - (b.inj > 0 ? -1 : 0) || a.o - b.o)[0];
      if (!out) continue;
      out.lv = 1; cand.lv = 0; txnAdd(st, `${t.ab} recalled ${pos} ${pname(cand)}; optioned ${pname(out)}`, 'recall', t.id); swapped = true; break;
    }
    if (swapped) continue;
    // swap a clearly better AAA player in (AI only)
    const best = teamPlayers(st, t.id).filter(p => p.lv === 1 && p.inj === 0).sort((a, b) => b.o - a.o)[0];
    if (best) {
      const same = (isP(best) ? pit : hit).filter(p => p.p === best.p || (isP(best) && p.p === 'RP')).sort((a, b) => a.o - b.o)[0];
      if (same && best.o >= same.o + 4 && (best.a >= 22)) { best.lv = 0; same.lv = 1; txnAdd(st, `${t.ab} recalled ${best.p} ${pname(best)} from ${best.lv === 0 ? 'AAA' : 'AAA'}; optioned ${pname(same)}`, 'recall', t.id); continue; }
    }
    break;
  }
  if (!user || t.auto) autoDepth(st, t);
  else { t.lu = repairLineup(st, t); fixRotation(st, t); if (H.fixPen) H.fixPen(st, t); }
}
function fixRotation(st, t) {
  const ok = id => { const p = st.players[id]; return p && p.tid === t.id && p.lv === 0 && !onIL(p) && isP(p); };
  t.rot = (t.rot || []).filter(ok);
  if (t.rot.length < 5) {
    const extra = active(st, t.id).filter(p => isP(p) && !t.rot.includes(p.id) && p.id !== t.cl).sort((a, b) => (b.p === 'SP') - (a.p === 'SP') || b.o - a.o);
    while (t.rot.length < 5 && extra.length) t.rot.push(extra.shift().id);
  }
  if (!ok(t.cl) || t.rot.includes(t.cl)) { const c = active(st, t.id).filter(p => isP(p) && !t.rot.includes(p.id)).sort((a, b) => b.o - a.o)[0]; t.cl = c ? c.id : null; }
  if (!ok(t.su) || t.rot.includes(t.su) || t.su === t.cl) { const c = active(st, t.id).filter(p => isP(p) && !t.rot.includes(p.id) && p.id !== t.cl).sort((a, b) => b.o - a.o)[0]; t.su = c ? c.id : null; }
}
function signPlayer(st, p, tid, sal, y) {
  p.tid = tid; p.sal = r1(sal); p.y = y; delete p.ask; p.lv = 0;
}

/* ---------- the game engine ---------- */
function chooseStarter(st, t) {
  const rot = (t.rot || []).filter(id => { const p = st.players[id]; return p && p.tid === t.id && p.lv === 0 && p.inj === 0; });
  if (rot.length) {
    for (let k = 0; k < rot.length; k++) { const id = rot[(t.rotI + k) % rot.length]; if (st.players[id].e >= 85) return id; }
    return rot.slice().sort((a, b) => st.players[b].e - st.players[a].e)[0];
  }
  const ps = active(st, t.id).filter(p => isP(p) && p.inj === 0).sort((a, b) => b.e - a.e || b.r.sta - a.r.sta);
  return ps[0] ? ps[0].id : null;
}
function prepSide(st, tid) {
  const t = st.teams[tid];
  let lu = (t.user != null && !t.auto) ? repairLineup(st, t) : (validLineup(st, t, t.lu) ? t.lu : autoLineup(st, t));
  if (!validLineup(st, t, lu)) lu = autoLineup(st, t);
  const order = lu.map(s => ({ id: s.id, pos: s.pos }));
  const sp = chooseStarter(st, t);
  const inLu = new Set(order.map(s => s.id));
  const act = active(st, tid).filter(p => p.inj === 0);
  const bench = act.filter(p => !isP(p) && !inLu.has(p.id)).map(p => p.id);
  const rotSet = new Set(t.rot || []);
  let penP = act.filter(p => isP(p) && p.id !== sp && !rotSet.has(p.id));
  if (penP.length < 4) penP = penP.concat(act.filter(p => isP(p) && p.id !== sp && rotSet.has(p.id)).sort((a, b) => b.e - a.e).slice(0, 4 - penP.length));
  const pen = penP.map(p => p.id);
  const mods = H.mods ? H.mods(st, t) : {}; const roles = H.roles ? H.roles(st, t, pen) : {};
  return { tid, order, bi: 0, sp, pit: sp, pc: {}, ent: {}, outsBy: {}, ra: {}, used: [sp], gone: [], bench, pen, cl: t.cl, su: t.su, bat: {}, pitl: {}, runs: 0, hits: 0, ls: [], startE: {}, sb: {}, mods, roles, specUsed: {} };
}

class Game {
  constructor(st, hid, aid, opts) {
    opts = opts || {};
    this.st = st; this.opts = opts;
    this.s = [prepSide(st, aid), prepSide(st, hid)]; // 0 away, 1 home
    this.inn = 1; this.half = 0; this.outs = 0; this.bases = [null, null, null];
    this.over = false; this.log = []; this.logOn = !!opts.log; this.playoff = !!opts.playoff;
    this.ctrl = opts.ctrl || [false, false]; // user-controlled sides
    this.autoPen = opts.autoPen || [true, true];
    this.wc = [null, null]; this.lc = [null, null]; this.lastLeader = -1;
    this.inj = [];
    this.halfStart = true;
    for (const sd of this.s) { const p = this.P(sd.pit); sd.startE[sd.pit] = p ? p.e : 100; sd.pc[sd.pit] = 0; sd.ent[sd.pit] = 0; sd.outsBy[sd.pit] = 0; this.pline(sd, sd.pit)[P.gs] = 1; }
    this.s[0].ls.push(0);
    this.say(`<b>Top 1st</b>`);
  }
  P(id) { return this.st.players[id]; }
  get off() { return this.s[this.half]; }
  get def() { return this.s[1 - this.half]; }
  bline(sd, id) { return sd.bat[id] || (sd.bat[id] = new Array(BL).fill(0)); }
  pline(sd, id) { return sd.pitl[id] || (sd.pitl[id] = new Array(PL).fill(0)); }
  say(t) { if (this.logOn) this.log.push(t); }
  evt(c, label, who, isPA) {
    if (!this.logOn) return;
    this.seq = (this.seq || 0) + 1;
    const side = this._side != null ? this._side : this.half;
    this.ev = { c, label, who: who ? sname(who) : '', seq: this.seq, side, r0: this._r0 != null ? this._r0 : this.s[side].runs, outs: this.outs };
  }
  sub(kind, tid, who, why) {
    if (!this.logOn) return;
    this.subSeq = (this.subSeq || 0) + 1;
    this.lastSub = { seq: this.subSeq, kind, tid, who, why: why || '', ab: this.st.teams[tid] ? this.st.teams[tid].ab : '' };
  }
  pinchHit(sd, id, why) {
    const slot = sd.order[sd.bi % 9]; const old = slot.id;
    if (!sd.bench.includes(id) || sd.gone.includes(id)) return false;
    sd.gone.push(old); sd.bench = sd.bench.filter(x => x !== id); slot.id = id; sd.phUsed = (sd.phUsed || 0) + 1;
    this.say(`<i>Pinch hitter: ${sname(this.P(id))} bats for ${sname(this.P(old))}${why ? ' (' + why + ')' : ''}.</i>`);
    this.sub('PINCH HITTER', sd.tid, sname(this.P(id)), 'for ' + sname(this.P(old)));
    return true;
  }
  aiPinch() {
    const sd = this.off; if ((sd.phUsed || 0) >= 3 || this.inn < 7) return;
    const lead = this.lead(this.half); if (lead > 2 || lead < -4) return;
    const scoring = this.bases[1] || this.bases[2]; const late = this.inn >= 9 || (this.inn >= 8 && scoring) || (this.inn >= 7 && scoring && Math.abs(lead) <= 1);
    if (!late) return;
    const slot = sd.order[sd.bi % 9]; const cur = this.P(slot.id); if (!cur) return;
    const pit = this.P(this.def.pit);
    const val = p => batVal(p.r) + (p.b === 'S' ? 2 : p.b !== pit.t ? 3 : -3) - (slot.pos !== 'DH' ? Math.max(0, (cur.r.fld * .65 + cur.r.arm * .35) - defAt(p, slot.pos)) * 0.08 : 0);
    const cands = sd.bench.filter(id => !sd.gone.includes(id)).map(id => this.P(id)).filter(p => p && p.inj === 0);
    const best = cands.sort((a, b) => val(b) - val(a))[0];
    if (best && val(best) > val(cur) + 4) this.pinchHit(sd, best.id, best.b !== pit.t ? 'platoon advantage' : 'late-inning bat');
  }
  curBatter() { const o = this.off; return o.order[o.bi % 9]; }
  limitFor(sd, id) {
    const p = this.P(id); const e = sd.startE[id] == null ? 100 : sd.startE[id];
    const base = id === sd.sp ? 62 + p.r.sta * 0.56 : 14 + p.r.sta * 0.5;
    return base * (e >= 85 ? 1 : 0.55 + 0.45 * e / 85) + ((sd.bonus && sd.bonus[id]) || 0);
  }
  work(sd, id) { return (sd.pc[id] || 0) + ((sd.stress && sd.stress[id]) || 0); }
  stamina(sd, id) { const x = Math.min(1, this.work(sd, id) / (this.limitFor(sd, id) * 1.15)); const e = (sd.startE && sd.startE[id] != null ? sd.startE[id] : 100); const top = e >= 85 ? 100 : Math.max(40, e / 85 * 100); return Math.max(0, Math.min(100, Math.round(top * (1 - Math.pow(x, 1.6))))); }
  fatigue(sd, id) {
    const lim = this.limitFor(sd, id), w = this.work(sd, id), L = w / lim;
    return (L > 0.85 ? (L - 0.85) * 18 : 0) + (L > 1 ? (w - lim) * 0.5 : 0);
  }
  lead(sideIdx) { return this.s[sideIdx].runs - this.s[1 - sideIdx].runs; }
  availPen(sd) { return sd.pen.filter(id => !sd.used.includes(id) && this.P(id).e >= 55); }
  changePitcher(sd, id, why) {
    if (!id || sd.used.includes(id)) return false;
    sd.used.push(id); sd.pit = id; sd.pc[id] = 0; sd.outsBy[id] = 0; sd.startE[id] = this.P(id).e;
    sd.ent[id] = sd.runs - this.s[sd === this.s[0] ? 1 : 0].runs;
    this.pline(sd, id);
    this.say(`<i>Pitching change: ${this.st.teams[sd.tid].ab} brings in ${sname(this.P(id))}${why ? ' (' + why + ')' : ''}.</i>`);
    this.sub('PITCHING CHANGE', sd.tid, sname(this.P(id)), why);
    return true;
  }
  aiPitching() {
    const sd = this.def, di = 1 - this.half; const id = sd.pit;
    const m = sd.mods || {}, R = sd.roles || {};
    const pc = this.work(sd, id), lim = this.limitFor(sd, id) * (id === sd.sp ? (m.hook || 1) : 1), lead = this.lead(di);
    const empty = !this.bases[0] && !this.bases[1] && !this.bases[2];
    const av = this.availPen(sd);
    if (!av.length) return;
    const isSP = id === sd.sp;
    const nb = this.P(this.off.order[this.off.bi % 9].id);
    const close = Math.abs(lead) <= 2;
    const byRole = rs => { const l = av.filter(x => rs.includes(R[x] || 'MR')); return l.sort((a, b) => this.P(b).o - this.P(a).o)[0]; };
    const choose = ctx => {
      let pk = null;
      if (ctx === 'long') pk = byRole(['LR']) || byRole(['MR']);
      else if (ctx === 'fire') pk = byRole(['STP']) || byRole(['SU']) || byRole(['MR']);
      else if (ctx === 'setup') pk = byRole(['SU']) || byRole(['STP']) || byRole(['MR']);
      if (!pk && ctx !== 'setup' && !this.halfStart && this.inn >= 6 && close && this.bases.some(Boolean)) pk = byRole([nb.b === 'L' ? 'SPL' : 'SPR']);
      if (!pk) pk = byRole(['MR']) || byRole(['LR']) || byRole(['SPL', 'SPR']) || byRole(['SU']) || byRole(['STP']);
      return pk || av.filter(x => x !== sd.cl)[0] || av[0];
    };
    if (this.opts.asg) { if (this.halfStart && (sd.outsBy[id] || 0) >= 3) return this.changePitcher(sd, av[Math.floor(rnd() * av.length)]); return; }
    if (this.halfStart && this.outs === 0 && empty) {
      if (this.inn >= 9 && lead >= 1 && lead <= 3 && id !== sd.cl && av.includes(sd.cl)) return this.changePitcher(sd, sd.cl, 'save situation');
      if ((this.inn === 8 || (this.inn === 7 && lead >= 1 && lead <= 2)) && lead >= 1 && lead <= 3 && R[id] !== 'SU' && id !== sd.cl && (!isSP || pc > lim - 12)) { const s = byRole(['SU']); if (s) return this.changePitcher(sd, s, 'setup'); }
      if (!isSP && (sd.outsBy[id] || 0) >= (R[id] === 'LR' ? 6 : 3)) return this.changePitcher(sd, this.inn >= 9 && close && av.includes(sd.cl) ? sd.cl : choose(this.inn >= 7 && close ? 'setup' : this.inn <= 4 ? 'long' : 'middle'));
      if (isSP && this.inn >= 7 && pc > lim - 15) return this.changePitcher(sd, choose(close ? 'setup' : 'middle'));
    }
    // specialist done after facing his man
    if ((R[id] === 'SPL' || R[id] === 'SPR') && !this.halfStart && (this.pline(sd, id)[P.bf] || 0) >= 1 && nb.b !== (R[id] === 'SPL' ? 'L' : 'R')) return this.changePitcher(sd, choose(this.inn >= 8 && close ? 'setup' : 'middle'), 'matchup');
    // specialist matchup: late, close, runners on, opposite-hand threat
    if (!this.halfStart && this.inn >= 7 && close && this.bases.some(Boolean) && R[id] !== 'CL' && !sd.specUsed[nb.b]) {
      const want = nb.b === 'L' ? 'SPL' : nb.b === 'R' ? 'SPR' : null; const cur = this.P(id);
      if (want && cur.t !== (want === 'SPL' ? 'L' : 'R') && batVal(nb.r) >= 70) { const s = byRole([want]); if (s) { sd.specUsed[nb.b] = 1; return this.changePitcher(sd, s, (want === 'SPL' ? 'lefty' : 'righty') + ' specialist'); } }
    }
    const ra = sd.ra[id] || 0;
    if (isSP && (pc >= lim || ra >= 7 || (ra >= 5 && pc > 75) || (this.inn <= 4 && ra >= 6))) {
      const ctx = this.inn <= 4 ? 'long' : (close && (this.bases[1] || this.bases[2]) ? 'fire' : 'middle');
      return this.changePitcher(sd, choose(ctx), pc >= lim ? 'fatigue' : 'struggling');
    }
    if (!isSP && (pc >= lim + 4 || ((sd.ra[id] || 0) >= 3 && R[id] !== 'LR'))) return this.changePitcher(sd, choose(close && this.inn >= 7 ? 'fire' : 'middle'), 'fatigue');
  }
  aiSteal() {
    if (this.outs >= 2) return false;
    const b = this.bases;
    if (b[0] && !b[1]) {
      const r = this.P(b[0].id); if (r.r.spd < 68) return false;
      if (rnd() < (0.05 + (r.r.spd - 68) * 0.006) * ((this.off.mods && this.off.mods.sbr) || 1)) return this.steal(0);
    }
    return false;
  }
  catcherArm() { const c = this.def.order.find(s => s.pos === 'C'); return c ? this.P(c.id).r.arm : 55; }
  steal(base) { // base index of runner (0 = 1st, 1 = 2nd)
    this._r0 = this.off.runs; this._side = this.half;
    const b = this.bases; const run = b[base]; if (!run || b[base + 1]) return false;
    const r = this.P(run.id);
    const p = clamp(0.62 + (r.r.spd - 62) * 0.011 - (this.catcherArm() - 60) * 0.004 - (base === 1 ? 0.06 : 0) + ((this.off.mods && this.off.mods.sbs) || 0), 0.3, 0.95);
    const sd = this.off;
    if (rnd() < p) { b[base + 1] = run; b[base] = null; this.bline(sd, run.id)[B.sb]++; this.say(`${sname(r)} steals ${base === 0 ? 'second' : 'third'}!`); this.evt('SB', 'STOLEN BASE', r, 0); }
    else { b[base] = null; this.bline(sd, run.id)[B.cs]++; this.recordOut(1); this.say(`${sname(r)} is caught stealing.`); this.evt('CS', 'CAUGHT STEALING', r, 0); }
    if (this.outs >= 3) this.endHalf();
    return true;
  }
  recordOut(n) { this.outs += n; const sd = this.def; this.pline(sd, sd.pit)[P.o] += n; sd.outsBy[sd.pit] = (sd.outsBy[sd.pit] || 0) + n; }
  score(run, batterId, rbi) {
    const off = this.off, def = this.def;
    off.runs++; off.ls[off.ls.length - 1]++;
    this.bline(off, run.id)[B.r]++;
    if (rbi && batterId != null) this.bline(off, batterId)[B.rbi]++;
    const resp = run.resp != null ? run.resp : def.pit;
    const pl = this.pline(def, resp); pl[P.r]++; if (run.resp != null) pl[P.er]++;
    def.ra[resp] = (def.ra[resp] || 0) + 1;
    def.stress = def.stress || {}; def.stress[def.pit] = (def.stress[def.pit] || 0) + 2;
    // lead tracking
    const oi = this.half, ld = this.lead(oi);
    if (ld === 1 && this.lastLeader !== oi) { this.lastLeader = oi; this.wc[oi] = off.pit; this.lc[1 - oi] = resp; }
    else if (ld === 0) { this.lastLeader = -1; }
  }
  /* one plate appearance; opts: {bunt, ibb} */
  pa(opt) {
    if (this.over) return;
    opt = opt || {};
    if (this.halfStart && this.inn >= 10 && !this.playoff && !this.bases[1]) {
      const o = this.off; const prev = o.order[(o.bi + 8) % 9];
      this.bases[1] = { id: prev.id, resp: null }; this.say(`<i>Automatic runner ${sname(this.P(prev.id))} placed on second.</i>`);
    }
    if (!this.ctrl[1 - this.half] || this.autoPen[1 - this.half]) this.aiPitching();
    this.halfStart = false;
    if (!this.ctrl[this.half] && !opt.noSteal && this.aiSteal()) return;
    if (!this.ctrl[this.half] && !this.opts.asg) this.aiPinch();
    const off = this.off, def = this.def;
    this._r0 = off.runs; this._side = this.half;
    const slot = off.order[off.bi % 9]; off.bi++;
    const bat = this.P(slot.id), pit = this.P(def.pit);
    const bl = this.bline(off, bat.id), pl = this.pline(def, def.pit);
    bl[B.pa]++; pl[P.bf]++;
    const addP = n => { def.pc[def.pit] = (def.pc[def.pit] || 0) + Math.max(1, Math.round(n)); };
    if (opt.ibb) addP(4); else if (opt.bunt) addP(2 + rnd() * 2);
    const om = off.mods || {}, dm = def.mods || {};
    const nm = sname(bat);
    const resp = def.pit;
    if (!opt.bunt && !opt.ibb && !this.ctrl[this.half] && om.bunt && this.outs === 0 && this.inn >= 7 && Math.abs(this.lead(this.half)) <= 1 && ((this.bases[0] && !this.bases[1]) || (this.bases[1] && !this.bases[2])) && batVal(bat.r) < 66 && rnd() < om.bunt) opt.bunt = true;
    const adv = (n, batterOn, rbiOk) => { // force-free advance of all runners by n; batter to base batterOn (0-based) or -1
      let runs = 0; const b = this.bases;
      for (let i = 2; i >= 0; i--) if (b[i]) { const to = i + n; if (to >= 3) { this.score(b[i], bat.id, rbiOk); runs++; } else b[to] = b[i]; b[i] = null; }
      if (batterOn >= 0 && batterOn < 3) b[batterOn] = { id: bat.id, resp };
      return runs;
    };
    const walk = () => {
      const b = this.bases;
      if (b[0] && b[1] && b[2]) this.score(b[2], bat.id, true);
      if (b[0] && b[1]) b[2] = b[1];
      if (b[0]) b[1] = b[0];
      b[0] = { id: bat.id, resp };
    };
    if (opt.ibb) { bl[B.bb]++; pl[P.bb]++; walk(); this.say(`${nm} is intentionally walked.`); this.evt('BB', 'INTENTIONAL WALK', bat); return this.afterPA(); }
    if (opt.bunt && this.outs < 2 && (this.bases[0] || this.bases[1])) {
      const x = rnd();
      if (x < 0.72) { bl[B.sf] = bl[B.sf]; this.recordOut(1); const b = this.bases; if (b[2]) { /* squeeze-ish */ if (rnd() < .5) { this.score(b[2], bat.id, true); b[2] = null; } }
        if (b[1] && !b[2]) { b[2] = b[1]; b[1] = null; } if (b[0] && !b[1]) { b[1] = b[0]; b[0] = null; }
        this.say(`${nm} lays down a sacrifice bunt. Runners advance.`); this.evt('OUT', 'SAC BUNT', bat); return this.afterPA(); }
      if (x < 0.82) { bl[B.ab]++; bl[B.h]++; pl[P.h]++; off.hits++; adv(1, 0, true); this.say(`${nm} bunts for a hit!`); this.evt('1B', 'BUNT SINGLE', bat); return this.afterPA(); }
      bl[B.ab]++; this.recordOut(1); const b = this.bases; const lead = b[1] ? 1 : 0; b[lead] = null; if (lead === 1 && b[0]) { b[1] = b[0]; b[0] = null; } b[0] = { id: bat.id, resp };
      this.say(`${nm} bunts, but the lead runner is thrown out.`); this.evt('OUT', 'FIELDER\'S CHOICE', bat); return this.afterPA();
    }
    const plat = (bat.b === 'S' ? 2 : (bat.b !== pit.t ? 3 : -3)) * (om.plat || 1);
    const fat = this.fatigue(def, def.pit);
    const r = bat.r, q = pit.r;
    const rolePen = (100 - famAt(pit, def.pit === def.sp ? 'SP' : 'RP')) * 0.05;
    const S0 = q.vel * .45 + q.brk * .55 - fat - rolePen + (dm.stuff || 0), C0 = q.ctl - fat * .7 - rolePen * 0.6 + (dm.ctl || 0);
    const con0 = r.con + plat + (om.con || 0), pow0 = r.pow + plat * .7 + (om.pow || 0), eye0 = r.eye + (om.eye || 0);
    const dfld0 = def.order.reduce((s, x) => s + (x.pos === 'DH' ? 0 : defAt(this.P(x.id), x.pos)), 0) / 8 + (dm.dfld || 0);
    const cn = this.st.cen || { con: 68, pow: 68, eye: 68, spd: 68, fld: 68, ctl: 68, S: 68 };
    const Z = 0.8, zz = (v, c) => c + (v - c) * Z;
    const S = zz(S0, cn.S), C = zz(C0, cn.ctl), con = zz(con0, cn.con), pow = zz(pow0, cn.pow), eye = zz(eye0, cn.eye), dfld = zz(dfld0, cn.fld - 2);
    const k = clamp(0.222 + (S - cn.S) * 0.0036 - (con - cn.con) * 0.0030 - (eye - cn.eye) * 0.0008, 0.06, 0.45);
    const bb = clamp(0.082 + (eye - cn.eye) * 0.0016 - (C - cn.ctl) * 0.0019, 0.02, 0.2);
    const hbp = 0.010;
    const hr = clamp(0.032 + (pow - cn.pow) * 0.0011 - (S - cn.S) * 0.0004 - (C - cn.ctl) * 0.0002, 0.003, 0.095);
    const babip = clamp(0.296 + (con - cn.con) * 0.0016 - (S - cn.S) * 0.0007 + (r.spd - cn.spd) * 0.0005 - (dfld - (cn.fld - 2)) * 0.0009, 0.2, 0.4);
    const x = rnd();
    const dir = () => pick(['to left', 'to center', 'to right', 'up the middle', 'through the left side', 'into right-center', 'into left-center', 'down the line']);
    addP((x < k ? 4.9 + gauss() * 1.1 : x < k + bb ? 5.6 + gauss() * 0.8 : x < k + bb + hbp ? 2.5 + gauss() : 3.25 + gauss() * 1.4) + (dm.pcAdj || 0));
    if (x < k) { bl[B.ab]++; bl[B.k]++; pl[P.k]++; this.recordOut(1); { const how = pick(['swinging', 'looking', 'swinging']); this.say(`${nm} strikes out ${how}.`); this.evt('K', how === 'looking' ? 'STRIKEOUT LOOKING' : 'STRIKEOUT', bat); } return this.afterPA(); }
    if (x < k + bb) { bl[B.bb]++; pl[P.bb]++; walk(); this.say(`${nm} walks.`); this.evt('BB', 'WALK', bat); return this.afterPA(); }
    if (x < k + bb + hbp) { bl[B.hbp]++; walk(); this.say(`${nm} is hit by a pitch.`); this.evt('BB', 'HIT BY PITCH', bat); return this.afterPA(); }
    if (x < k + bb + hbp + hr) {
      bl[B.ab]++; bl[B.h]++; bl[B.hr]++; pl[P.h]++; pl[P.hr]++; off.hits++;
      const on = this.bases.filter(Boolean).length;
      adv(4, -1, true); this.score({ id: bat.id, resp }, bat.id, true);
      this.say(`<b>${nm} ${on === 3 ? 'hits a GRAND SLAM' : on ? `hits a ${on + 1}-run homer` : 'homers'} ${pick(['to left', 'to center', 'to right', 'into the second deck', 'over the bullpen'])}!</b>`);
      this.evt('HR', on === 3 ? 'GRAND SLAM' : on ? (on + 1) + '-RUN HOME RUN' : 'HOME RUN', bat);
      return this.afterPA();
    }
    // ball in play
    bl[B.ab]++;
    const b = this.bases; const sp = id => this.P(id).r.spd; const ad = om.adv || 0;
    if (rnd() < babip) {
      bl[B.h]++; pl[P.h]++; off.hits++;
      const tr = clamp(0.022 + (r.spd - 62) * 0.001, .004, .06), db = clamp(0.20 + (pow - 62) * 0.0016 + (r.spd - 62) * 0.0005, .1, .33);
      const y = rnd();
      if (y < tr) { bl[B.t]++; adv(3, 2, true); this.say(`${nm} triples ${dir()}!`); this.evt('3B', 'TRIPLE', bat); }
      else if (y < tr + db) {
        bl[B.d]++;
        if (b[2]) { this.score(b[2], bat.id, true); b[2] = null; }
        if (b[1]) { this.score(b[1], bat.id, true); b[1] = null; }
        if (b[0]) { if (rnd() < 0.40 + ad + (sp(b[0].id) - 62) * 0.01) { this.score(b[0], bat.id, true); } else b[2] = b[0]; b[0] = null; }
        b[1] = { id: bat.id, resp }; this.say(`${nm} doubles ${dir()}.`); this.evt('2B', 'DOUBLE', bat);
      } else {
        if (b[2]) { this.score(b[2], bat.id, true); b[2] = null; }
        if (b[1]) { if (rnd() < 0.60 + ad + (sp(b[1].id) - 62) * 0.009) this.score(b[1], bat.id, true); else b[2] = b[1]; b[1] = null; }
        if (b[0]) { if (!b[2] && rnd() < 0.28 + ad + (sp(b[0].id) - 62) * 0.008) b[2] = b[0]; else b[1] = b[0]; b[0] = null; }
        b[0] = { id: bat.id, resp }; this.say(`${nm} singles ${dir()}.`); this.evt('1B', 'SINGLE', bat);
      }
      return this.afterPA();
    }
    // out in play
    const gb = rnd() < 0.47;
    if (gb) {
      if (b[0] && this.outs < 2 && rnd() < 0.40 - (r.spd - 62) * 0.005) {
        this.recordOut(2); b[0] = null;
        if (this.outs < 3) { if (b[2]) { this.score(b[2], null, false); b[2] = null; } if (b[1]) { b[2] = b[1]; b[1] = null; } }
        this.say(`${nm} grounds into a double play.`); this.evt('DP', 'DOUBLE PLAY', bat); return this.afterPA();
      }
      this.recordOut(1);
      if (this.outs < 3) {
        if (b[2] && rnd() < 0.5) { this.score(b[2], bat.id, true); b[2] = null; }
        if (b[1] && !b[2] && rnd() < 0.55) { b[2] = b[1]; b[1] = null; }
        if (b[0] && !b[1]) { b[1] = b[0]; b[0] = null; }
      }
      this.say(`${nm} grounds out ${pick(['to short', 'to second', 'to third', 'to first', 'to the pitcher'])}.`); this.evt('OUT', 'GROUNDOUT', bat);
    } else {
      this.recordOut(1);
      let sf = false;
      if (this.outs < 3) {
        if (b[2] && rnd() < 0.55 + (sp(b[2].id) - 62) * 0.008) { this.score(b[2], bat.id, true); b[2] = null; sf = true; bl[B.ab]--; bl[B.sf]++; }
        if (b[1] && !b[2] && rnd() < 0.25) { b[2] = b[1]; b[1] = null; }
      }
      { const fo = pick(['flies out', 'lines out', 'pops out', 'flies out']); this.say(`${nm} ${fo} ${pick(['to left', 'to center', 'to right', 'to short', 'to second'])}${sf ? ' — sacrifice fly, a run scores' : ''}.`); this.evt('OUT', sf ? 'SACRIFICE FLY' : fo === 'lines out' ? 'LINEOUT' : fo === 'pops out' ? 'POP OUT' : 'FLYOUT', bat); }
    }
    return this.afterPA();
  }
  afterPA() {
    { const sd = this.def; const on = this.bases.filter(Boolean).length; if (on >= 2) { sd.stress = sd.stress || {}; sd.stress[sd.pit] = (sd.stress[sd.pit] || 0) + (on - 1); } }
    if (this.ev && this.ev.seq === this.seq && this.ev.runs == null) { this.ev.runs = this.s[this.ev.side].runs - this.ev.r0; this.ev.score = this.scoreStr(); }
    // walk-off
    if (this.half === 1 && this.inn >= 9 && this.s[1].runs > this.s[0].runs) { if (this.ev && this.ev.seq === this.seq) this.ev.walkoff = true; this.end(); return; }
    if (this.outs >= 3) { if (this.ev && this.ev.seq === this.seq) this.ev.endInn = true; this.endHalf(); }
  }
  endHalf() {
    if (this.over) return;
    this.outs = 0; this.bases = [null, null, null];
    if (this.half === 0) {
      if (this.inn >= 9 && this.s[1].runs > this.s[0].runs) { this.end(); return; }
      this.half = 1; this.s[1].ls.push(0);
      this.say(`<b>Bottom ${ord(this.inn)}</b> — ${this.scoreStr()}`);
    } else {
      if (this.inn >= 9 && this.s[0].runs !== this.s[1].runs) { this.end(); return; }
      if (this.inn >= 30) { this.s[1].runs++; this.s[1].ls[this.s[1].ls.length - 1]++; this.end(); return; }
      this.inn++; this.half = 0; this.s[0].ls.push(0);
      this.say(`<b>Top ${ord(this.inn)}</b> — ${this.scoreStr()}`);
    }
    this.halfStart = true;
  }
  scoreStr() { const T = this.st.teams; return `${T[this.s[0].tid].ab} ${this.s[0].runs}, ${T[this.s[1].tid].ab} ${this.s[1].runs}`; }
  simHalf() { const h = this.half, i = this.inn; let g = 0; while (!this.over && this.half === h && this.inn === i && g++ < 200) this.pa(); }
  simToEnd() { let g = 0; while (!this.over && g++ < 3000) this.pa(); if (!this.over) this.end(); }
  end() {
    if (this.over) return;
    this.over = true;
    const wi = this.s[1].runs > this.s[0].runs ? 1 : 0, li = 1 - wi;
    const W = this.s[wi], L = this.s[li];
    let w = this.wc[wi]; let l = this.lc[li];
    if (w == null) w = W.sp; if (l == null) l = L.sp;
    if (w === W.sp && (W.outsBy[w] || 0) < 15 && W.used.length > 1) {
      const rel = W.used.slice(1); w = rel.sort((a, b) => (W.outsBy[b] || 0) - (W.outsBy[a] || 0))[0];
    }
    this.pline(W, w)[P.w] = 1; this.pline(L, l)[P.l] = 1;
    const fin = W.pit;
    let sv = null;
    if (fin !== w && fin !== W.sp) {
      const entLead = W.ent[fin]; const outs = W.outsBy[fin] || 0;
      if ((entLead > 0 && entLead <= 3 && outs >= 3) || outs >= 9) { sv = fin; this.pline(W, fin)[P.sv] = 1; }
    }
    this.result = { w, l, sv };
    // injuries
    if (this.st.settings.injuries) {
      for (const sd of this.s) {
        const im = (sd.mods && sd.mods.inj) || 1;
        for (const id of Object.keys(sd.bat)) if (rnd() < 0.0024 * im) this.inj.push([+id, injDays()]);
        for (const id of Object.keys(sd.pitl)) if (rnd() < (+id === sd.sp ? 0.0055 : 0.0035) * im) this.inj.push([+id, injDays()]);
      }
    }
    this.say(`<b>Final: ${this.scoreStr()}</b>`);
  }
  box() {
    const T = this.st.teams, st = this.st;
    const sides = this.s.map(sd => ({
      tid: sd.tid, runs: sd.runs, hits: sd.hits, ls: sd.ls.slice(),
      bat: Object.keys(sd.bat).map(id => [+id, sd.bat[id]]), order: sd.order.map(s => [s.id, s.pos]),
      pit: sd.used.map(id => [id, sd.pitl[id] || new Array(PL).fill(0), sd.pc[id] || 0]),
      sp: sd.sp, rotSp: sd.sp
    }));
    const names = {};
    for (const sd of this.s) { for (const id of Object.keys(sd.bat)) names[id] = sname(st.players[id]); for (const id of sd.used) names[id] = sname(st.players[id]); }
    return { a: this.s[0].tid, h: this.s[1].tid, as: this.s[0].runs, hs: this.s[1].runs, inn: this.inn, sides, res: this.result, inj: this.inj, names, log: this.logOn ? this.log : null, po: this.playoff, ab: [T[this.s[0].tid].ab, T[this.s[1].tid].ab], asg: !!this.opts.asg };
  }
}
function ord(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function injDays() { const x = rnd(); return x < .68 ? ri(2, 14) : x < .94 ? ri(15, 45) : ri(50, 120); }
const INJ = ['hamstring strain', 'oblique strain', 'sprained ankle', 'bruised wrist', 'back spasms', 'shoulder inflammation', 'elbow soreness', 'calf tightness', 'concussion protocol', 'groin strain', 'fractured finger', 'knee sprain'];

function applyBox(st, box, ctx) {
  ctx = ctx || {};
  const T = st.teams;
  const reg = !box.po;
  const pls = st.players;
  box.sides.forEach((sd, i) => {
    const t = T[sd.tid], won = sd.runs > box.sides[1 - i].runs;
    if (reg) {
      t[won ? 'w' : 'l']++; t.rs += sd.runs; t.ra += box.sides[1 - i].runs;
      t.strk = won ? (t.strk > 0 ? t.strk + 1 : 1) : (t.strk < 0 ? t.strk - 1 : -1);
      t.l10.push(won ? 1 : 0); if (t.l10.length > 10) t.l10.shift();
      for (const [id, line] of sd.bat) { const p = pls[id]; if (!p) continue; const a = p.sb || (p.sb = new Array(BL).fill(0)); a[B.g]++; for (let k = 1; k < BL; k++) a[k] += line[k]; }
      for (const [id, line] of sd.pit) { const p = pls[id]; if (!p) continue; const a = p.sp || (p.sp = new Array(PL).fill(0)); a[P.g]++; for (let k = 1; k < PL; k++) a[k] += line[k]; }
    }
    for (const [id, , pc] of sd.pit) { const p = pls[id]; if (p) p.e = Math.max(0, p.e - pc * (id === sd.sp ? 1.0 : 1.6) - 6); }
    if (H.box) H.box(st, sd, box);
    // rotation advance
    const ri_ = (t.rot || []).indexOf(sd.sp); if (ri_ >= 0) t.rotI = (ri_ + 1) % Math.max(1, t.rot.length);
  });
  for (const [id, d] of box.inj) {
    const p = pls[id]; if (!p || p.inj > 0) continue;
    p.inj = d; const t = T[p.tid];
    if (t && (t.user != null || d >= 40)) newsAdd(st, `${t.ab} ${p.p} ${pname(p)} suffered a ${pick(INJ)} and is expected to miss ${d} days.`, p.tid);
  }
  // notable
  for (const sd of box.sides) for (const [id, l] of sd.bat) { if (l[B.hr] >= 3) newsAdd(st, `${pname(pls[id])} (${T[sd.tid].ab}) blasted ${l[B.hr]} home runs in one game!`, sd.tid); else if (l[B.h] >= 5) newsAdd(st, `${pname(pls[id])} (${T[sd.tid].ab}) went ${l[B.h]}-for-${l[B.ab]}!`, sd.tid); }
  box.sides.forEach((sd, i) => { const opp = box.sides[1 - i]; if (opp.hits === 0) newsAdd(st, `<b>NO-HITTER!</b> The ${T[sd.tid].name} no-hit the ${T[opp.tid].name}${sd.pit.length === 1 ? ` behind ${pname(pls[sd.sp])}` : ''}.`, sd.tid); });
  if (ctx.keepBox) { box.id = st.season + '-' + (box.po ? 'p' : 'd') + (ctx.day != null ? ctx.day : 0) + '-' + box.h + '-' + box.a + '-' + Math.floor(rnd() * 1e6); st.boxes.unshift(box); if (st.boxes.length > 40) st.boxes.length = 40; return box.id; }
  return null;
}
function playGame(st, h, a, opts) { const g = new Game(st, h, a, opts); g.simToEnd(); return g.box(); }

/* ---------- daily flow ---------- */
function isUserGame(st, gm) { return T_user(st, gm[0]) || T_user(st, gm[1]); }
function T_user(st, tid) { return st.teams[tid].user != null; }
function simDay(st) {
  if (st.phase === 'regular') {
    const d = st.day; const games = st.sched[d]; if (!games) return;
    st.teams.forEach(t => fixRoster(st, t));
    games.forEach(gm => {
      if (gm[2] != null) return;
      const user = isUserGame(st, gm);
      const box = playGame(st, gm[0], gm[1], { log: user });
      gm[2] = box.hs; gm[3] = box.as;
      const id = applyBox(st, box, { day: d, keepBox: user }); if (id) gm[4] = id;
    });
    endDay(st);
    st.day++;
    if (!st.draftDone && st.day >= draftDay(st)) startDraft(st);
    else if (st.day === deadlineDay(st)) newsAdd(st, 'The trade deadline has passed. Trades are closed until the offseason.');
    if (H.after) H.after(st);
    if (st.day >= st.sched.length) startPlayoffs(st);
  } else if (st.phase === 'playoffs') { playoffDay(st); }
}
function endDay(st) {
  for (const p of Object.values(st.players)) {
    if (p.tid < 0) continue;
    if (isP(p)) p.e = Math.min(100, p.e + 21);
    if (p.inj > 0) { p.inj--; if (p.inj === 0 && st.teams[p.tid].user != null) newsAdd(st, `${pname(p)} has returned from injury.`, p.tid); }
  }
  if (st.phase === 'regular' && st.day % 20 === 19) {
    for (const p of Object.values(st.players)) {
      if (p.tid < -1) continue;
      if (p.a <= 26 && p.pt > p.o) bump(p, rf(0, 0.6) * Math.min(1, (p.pt - p.o) / 15));
      else if (p.a >= 33) bump(p, -rf(0, 0.8));
    }
  }
  if (st.phase === 'regular' && st.day % 7 === 6) for (const p of Object.values(st.players)) if (p.tid === -1 && p.ask) p.ask.sal = r1(Math.max(MINSAL, p.ask.sal * 0.96));
  // occasional AI-to-AI trades
  if (st.phase === 'regular' && tradesOpen(st) && rnd() < 0.06) aiAiTrade(st);
  if (H.day) H.day(st);
}
function bump(p, d) {
  const keys = Object.keys(p.r);
  for (const k of keys) { if (k === 'sta' && d > 0 && rnd() < .5) continue; p.r[k] = clamp(Math.round((p.r[k] + d + gauss() * Math.abs(d) * 0.6) * 10) / 10, 15, 99); }
  setOvr(p);
}
function simDays(st, n, stopFn) {
  for (let i = 0; i < n; i++) {
    const ph = st.phase;
    if (ph !== 'regular' && ph !== 'playoffs') break;
    simDay(st);
    if (st.phase !== ph) break;
    if (stopFn && stopFn(st)) break;
  }
}

/* ---------- AI trades ---------- */
function aiAiTrade(st) {
  const ai = st.teams.filter(t => t.user == null);
  if (ai.length < 2) return;
  const a = pick(ai), b = pick(ai.filter(t => t !== a));
  const pa = mlb(st, a.id).filter(p => p.a >= 25).sort(() => rnd() - .5)[0];
  if (!pa) return;
  const v = pval(pa);
  const cands = teamPlayers(st, b.id).filter(p => Math.abs(pval(p) - v) < v * 0.2 + 2 && (isP(p) !== isP(pa) || p.p !== pa.p));
  const pb = cands[0]; if (!pb) return;
  executeTrade(st, { from: a.id, to: b.id, give: [pa.id], get: [pb.id] }, true);
}

/* ---------- trades ---------- */
function tradeEval(st, tr) {
  // value from the perspective of team "to" (the receiver of the proposal)
  const vf = (id, recv) => H.valFor ? H.valFor(st, tr.to, st.players[id], recv) : pval(st.players[id]);
  const giveV = tr.give.reduce((s, id) => s + vf(id, true), 0); // what 'to' receives
  const getV = tr.get.reduce((s, id) => s + vf(id, false), 0); // what 'to' gives up
  const k = { easy: 0.92, normal: 1.08, hard: 1.25 }[st.settings.diff] || 1.08;
  const extra = Math.max(0, tr.give.length - tr.get.length) * 1.5; // roster clog
  const need = getV * k + extra + (tr.get.length ? 0 : 1);
  return { recv: Math.round(giveV * 10) / 10, give: Math.round(getV * 10) / 10, need: Math.round(need * 10) / 10, ok: giveV >= need && tr.give.length > 0 };
}
function validTrade(st, tr) {
  if (!tradesOpen(st)) return 'Trades are closed right now.';
  if (!tr.give.length && !tr.get.length) return 'Add players to the trade.';
  for (const id of tr.give) { const p = st.players[id]; if (!p || p.tid !== tr.from) return 'A player in this deal is no longer on that team.'; }
  for (const id of tr.get) { const p = st.players[id]; if (!p || p.tid !== tr.to) return 'A player in this deal is no longer on that team.'; }
  if (tr.give.length > 6 || tr.get.length > 6) return 'Max 6 players per side.';
  return null;
}
function executeTrade(st, tr, quiet) {
  const err = validTrade(st, tr); if (err) return err;
  const A = st.teams[tr.from], Bt = st.teams[tr.to];
  tr.give.forEach(id => { st.players[id].tid = tr.to; });
  tr.get.forEach(id => { st.players[id].tid = tr.from; });
  const n = ids => ids.map(id => pname(st.players[id])).join(', ') || 'nothing';
  const msg = `TRADE: ${A.ab} send ${n(tr.give)} to ${Bt.ab} for ${n(tr.get)}.`;
  txnAdd(st, msg, 'trade', [tr.from, tr.to]); if (!quiet || A.user != null || Bt.user != null) newsAdd(st, msg, tr.from);
  [A, Bt].forEach(t => {
    if (t.user != null && !t.auto) { t.rot = (t.rot || []).filter(id => st.players[id].tid === t.id); }
    fixRoster(st, t);
  });
  return null;
}

/* ---------- draft ---------- */
function genProspect(st) {
  const col = rnd() < .45; const age = col ? ri(20, 22) : ri(18, 19);
  const pos = rnd() < .45 ? (rnd() < .65 ? 'SP' : 'RP') : pick(HPOS);
  const p = newPlayer(st, pos, age, ri(34, 50) + (col ? 4 : 0), -2, 1);
  const tierUp = Math.pow(rnd(), 2.2) * 38 + 8; p.pt = clamp(Math.round(p.o + tierUp + (col ? -3 : 3)), p.o + 3, 97);
  p.est = clamp(Math.round(p.pt + gauss() * 7), 35, 99); p.col = col;
  if (H.prospect) H.prospect(st, p);
  return p;
}
function startDraft(st) {
  const pool = st.dc && st.dc.pool ? st.dc.pool.filter(id => st.players[id] && st.players[id].tid === -2) : [];
  for (let i = pool.length; i < 210; i++) {
    pool.push(genProspect(st).id);
  }
  const order = st.teams.slice().sort((a, b) => (a.w / Math.max(1, a.w + a.l)) - (b.w / Math.max(1, b.w + b.l)) || rnd() - .5).map(t => t.id);
  const picks = []; for (let r = 0; r < 5; r++) order.forEach(t => picks.push(t));
  const scout = {}, left = {}; st.teams.forEach(t => { scout[t.id] = []; left[t.id] = 12; });
  st.draft = { picks, i: 0, made: [], pool, scout, left };
  st.phase = 'draft';
  newsAdd(st, `The ${st.season} Amateur Draft is here! 5 rounds, ${picks.length} picks.`);
  draftAuto(st);
}
function draftProspects(st) { return st.draft.pool.map(id => st.players[id]).filter(p => p && p.tid === -2); }
function draftAuto(st, force) {
  const d = st.draft; if (!d || d.done) return;
  let f = force;
  while (d.i < d.picks.length) {
    const tid = d.picks[d.i];
    const human = st.teams[tid].user != null && !(d.auto && d.auto[tid]);
    if (human && !f) break;
    const pool = draftProspects(st);
    let best = null, bv = -1e9;
    const ev = H.aiEval ? H.aiEval(st, tid) : 1;
    for (const p of pool) { const v = p.pt * 0.75 + p.o * 0.25 + gauss() * 4 * ev - (p.a > 20 ? 1 : 0); if (v > bv) { bv = v; best = p; } }
    if (!best) break;
    draftPick(st, tid, best.id);
    if (f === 'one') f = false;
  }
  if (d.i >= d.picks.length) endDraft(st);
}
function draftPick(st, tid, pid) {
  const d = st.draft; if (d.picks[d.i] !== tid) return 'Not your pick.';
  const p = st.players[pid]; if (!p || p.tid !== -2) return 'Player unavailable.';
  const rd = Math.floor(d.i / 30) + 1, no = d.i + 1;
  p.tid = tid; p.lv = st.settings.aa ? 2 : 1; p.sal = 0.5; p.y = 6; p.dr = `${st.season} R${rd} #${no}`; delete p.est; delete p.nz;
  d.made.push([tid, pid]); d.i++;
  txnAdd(st, `Draft R${rd} #${no}: ${st.teams[tid].ab} select ${p.p} ${pname(p)} (age ${p.a})`, 'draft', tid);
  if (rd === 1 && no === 1) newsAdd(st, `${st.teams[tid].name} take ${pname(p)} with the first overall pick.`);
  return null;
}
function endDraft(st) {
  for (const id of st.draft.pool) { const p = st.players[id]; if (p && p.tid === -2) delete st.players[id]; }
  st.draftDone = true; st.phase = 'regular'; st.dc = null;
  st.draft.done = true; st.draft.pool = [];
  newsAdd(st, 'The draft is complete. Draftees report to AAA.');
}
function scoutPlayer(st, tid, pid) {
  const d = st.draft; if (!d || d.left[tid] <= 0) return 'No scouting reports left.';
  if (d.scout[tid].includes(pid)) return null;
  d.scout[tid].push(pid); d.left[tid]--; return null;
}

/* ---------- playoffs ---------- */
const RN = ['Wild Card Series', 'Division Series', 'Championship Series', 'World Series'];
function pct(t) { return t.w / Math.max(1, t.w + t.l); }
function seeds(st, lg) {
  const ts = st.teams.filter(t => t.lg === lg);
  const winners = [0, 1, 2].map(dv => ts.filter(t => t.div === dv).sort((a, b) => pct(b) - pct(a) || (b.rs - b.ra) - (a.rs - a.ra))[0]);
  winners.sort((a, b) => pct(b) - pct(a));
  const wc = ts.filter(t => !winners.includes(t)).sort((a, b) => pct(b) - pct(a) || (b.rs - b.ra) - (a.rs - a.ra)).slice(0, 3);
  return winners.concat(wc).map(t => t.id);
}
function startPlayoffs(st) {
  st.phase = 'playoffs';
  st.awards = computeAwards(st);
  st.po = { round: 0, seeds: [seeds(st, 0), seeds(st, 1)], series: [], champ: null };
  for (let lg = 0; lg < 2; lg++) { const s = st.po.seeds[lg]; mkSeries(st, 0, lg, s[2], s[5]); mkSeries(st, 0, lg, s[3], s[4]); }
  newsAdd(st, `The regular season is over! The postseason begins with the Wild Card Series.`);
  st.teams.forEach(t => { if (t.user != null) newsAdd(st, st.po.seeds[t.lg].includes(t.id) ? `${tname(t)} clinched a playoff spot as the #${st.po.seeds[t.lg].indexOf(t.id) + 1} seed!` : `${tname(t)} missed the playoffs this year.`, t.id); });
}
function mkSeries(st, r, lg, hi, lo) { st.po.series.push({ r, lg, hi, lo, wh: 0, wl: 0, best: [3, 5, 7, 7][r], g: [], win: null }); }
function homeIsHi(best, n) { if (best === 3) return true; if (best === 5) return [0, 1, 4].includes(n); return [0, 1, 5, 6].includes(n); }
function playoffDay(st) {
  const po = st.po; const cur = po.series.filter(s => s.r === po.round && s.win == null);
  st.teams.forEach(t => fixRoster(st, t));
  for (const s of cur) {
    if (s.pending) { s.pending = false; continue; }
    const n = s.wh + s.wl; const hh = homeIsHi(s.best, n);
    const h = hh ? s.hi : s.lo, a = hh ? s.lo : s.hi;
    const box = playGame(st, h, a, { playoff: true, log: true });
    recordPlayoffGame(st, s, box);
  }
  endDay(st);
  advancePlayoffRound(st);
}
function recordPlayoffGame(st, s, box) {
  const id = applyBox(st, box, { keepBox: true, day: s.r * 10 + s.wh + s.wl });
  const hiWon = (box.h === s.hi) === (box.hs > box.as);
  if (hiWon) s.wh++; else s.wl++;
  s.g.push([box.h, box.a, box.hs, box.as, id]);
  const need = Math.ceil(s.best / 2);
  if (s.wh >= need || s.wl >= need) {
    s.win = s.wh >= need ? s.hi : s.lo;
    const W = st.teams[s.win], L = st.teams[s.win === s.hi ? s.lo : s.hi];
    newsAdd(st, `${W.name} defeat the ${L.name} ${Math.max(s.wh, s.wl)}-${Math.min(s.wh, s.wl)} in the ${s.r < 3 ? LG[s.lg] + ' ' : ''}${RN[s.r]}.`, W.id);
  }
}
function advancePlayoffRound(st) {
  const po = st.po; const cur = po.series.filter(s => s.r === po.round);
  if (cur.some(s => s.win == null)) return;
  if (po.round === 3) { finishPlayoffs(st, cur[0].win); return; }
  po.round++;
  const r = po.round;
  if (r === 1) for (let lg = 0; lg < 2; lg++) {
    const s = po.seeds[lg]; const w = cur.filter(x => x.lg === lg);
    const w45 = w.find(x => x.hi === s[3]).win, w36 = w.find(x => x.hi === s[2]).win;
    mkSeries(st, 1, lg, s[0], w45); mkSeries(st, 1, lg, s[1], w36);
  }
  if (r === 2) for (let lg = 0; lg < 2; lg++) {
    const w = cur.filter(x => x.lg === lg).map(x => x.win); const sd = po.seeds[lg];
    w.sort((a, b) => sd.indexOf(a) - sd.indexOf(b)); mkSeries(st, 2, lg, w[0], w[1]);
  }
  if (r === 3) {
    const a = cur.find(x => x.lg === 0).win, b = cur.find(x => x.lg === 1).win;
    const ta = st.teams[a], tb = st.teams[b];
    mkSeries(st, 3, -1, pct(ta) >= pct(tb) ? a : b, pct(ta) >= pct(tb) ? b : a);
  }
  newsAdd(st, `${RN[r]} matchups are set.`);
}
function finishPlayoffs(st, champ) {
  st.po.champ = champ;
  const T = st.teams[champ];
  const ws = st.po.series.find(s => s.r === 3);
  const ru = ws.win === ws.hi ? ws.lo : ws.hi;
  newsAdd(st, `🏆 The ${tname(T)} are ${st.season} World Series champions!`, champ);
  const aw = st.awards || computeAwards(st);
  st.history.unshift({ y: st.season, champ: T.ab + ' ' + T.name, ru: st.teams[ru].ab + ' ' + st.teams[ru].name, aw: aw.list, best: st.teams.slice().sort((a, b) => pct(b) - pct(a))[0].ab });
  st.phase = 'offseason';
}

/* ---------- awards ---------- */
function batLine(a) {
  if (!a) return null;
  const ab = a[B.ab], h = a[B.h], pa = a[B.pa];
  const avg = ab ? h / ab : 0, obp = pa ? (h + a[B.bb] + a[B.hbp]) / Math.max(1, ab + a[B.bb] + a[B.hbp] + a[B.sf]) : 0;
  const tb = h + a[B.d] + 2 * a[B.t] + 3 * a[B.hr]; const slg = ab ? tb / ab : 0;
  const s1 = h - a[B.d] - a[B.t] - a[B.hr];
  const woba = pa ? (0.69 * a[B.bb] + 0.72 * a[B.hbp] + 0.89 * s1 + 1.27 * a[B.d] + 1.62 * a[B.t] + 2.1 * a[B.hr]) / Math.max(1, ab + a[B.bb] + a[B.hbp] + a[B.sf]) : 0;
  return { avg, obp, slg, ops: obp + slg, woba, pa, tb };
}
function pitLine(a) {
  if (!a) return null;
  const ip = a[P.o] / 3; const era = ip ? a[P.er] * 9 / ip : 0, whip = ip ? (a[P.h] + a[P.bb]) / ip : 0;
  const fip = ip ? (13 * a[P.hr] + 3 * a[P.bb] - 2 * a[P.k]) / ip + 3.2 : 0;
  return { ip, era, whip, fip, k9: ip ? a[P.k] * 9 / ip : 0 };
}
const POSADJ = { C: 12.5, SS: 7.5, '2B': 2.5, '3B': 2.5, CF: 2.5, LF: -7.5, RF: -7.5, '1B': -12.5, DH: -17.5 };
function war(p) {
  let v = 0;
  if (p.sb) { const l = batLine(p.sb); v += (l.woba - 0.315) / 1.2 * l.pa / 10 + l.pa / 600 * 2 + (POSADJ[p.p] || 0) * l.pa / 600 / 10 + (p.sb[B.sb] - p.sb[B.cs] * 2) * 0.02; }
  if (p.sp) { const l = pitLine(p.sp); v += (5.0 - l.fip * 0.6 - l.era * 0.4) * l.ip / 9 / 10 + (p.p === 'RP' ? p.sp[P.sv] * 0.04 : 0); }
  return Math.round(v * 10) / 10;
}
function computeAwards(st) {
  const list = [];
  const pls = Object.values(st.players).filter(p => p.tid >= 0);
  const games = Math.max(1, st.teams.reduce((s, t) => s + t.w + t.l, 0) / 30);
  for (let lg = 0; lg < 2; lg++) {
    const inLg = pls.filter(p => st.teams[p.tid].lg === lg);
    const hit = inLg.filter(p => p.sb && p.sb[B.pa] >= games * 3.1);
    const pit = inLg.filter(p => p.sp && p.sp[P.o] / 3 >= games * 0.9);
    const mvp = inLg.filter(p => (p.sb && p.sb[B.pa] >= games * 2.5) || (p.sp && p.sp[P.o] >= games * 2.7)).sort((a, b) => war(b) - war(a))[0];
    const cy = pit.sort((a, b) => war(b) - war(a))[0];
    const roy = inLg.filter(p => p.rk && ((p.sb && p.sb[B.pa] > games * 1.5) || (p.sp && p.sp[P.o] > games * 1.2))).sort((a, b) => war(b) - war(a))[0];
    const rel = inLg.filter(p => p.p === 'RP' && p.sp).sort((a, b) => (b.sp[P.sv] + war(b) * 8) - (a.sp[P.sv] + war(a) * 8))[0];
    const tag = p => p ? `${pname(p)} (${st.teams[p.tid].ab})` : '—';
    list.push([LG[lg] + ' MVP', tag(mvp), mvp && mvp.id], [LG[lg] + ' Cy Young', tag(cy), cy && cy.id], [LG[lg] + ' Rookie of the Year', tag(roy), roy && roy.id], [LG[lg] + ' Reliever of the Year', tag(rel), rel && rel.id]);
    void hit;
  }
  list.forEach(a => { if (a[2] != null) { const p = st.players[a[2]]; (p.aw || (p.aw = [])).push(st.season + ' ' + a[0]); } });
  return { list: list.map(a => [a[0], a[1]]) };
}

/* ---------- offseason ---------- */
function progressPlayer(p, mult) {
  const age = p.a; let d; mult = mult || 1;
  const gap = Math.max(0, p.pt - p.o);
  if (age <= 22) d = rf(0, 3) + gap * 0.12;
  else if (age <= 25) d = rf(-1, 2.5) + gap * 0.12;
  else if (age <= 28) d = rf(-1.5, 1.5) + gap * 0.06;
  else if (age <= 31) d = rf(-2.5, 0.5);
  else if (age <= 34) d = rf(-4, 0);
  else d = rf(-6.5, -1.5);
  if (d > 0) d *= mult; else d /= Math.max(0.7, mult);
  bump(p, d);
  if (p.r.spd != null && age >= 28) p.r.spd = clamp(Math.round(p.r.spd - rf(0, 2)), 15, 99);
  if (age >= 27) p.pt = Math.max(p.o, Math.round(p.pt - rf(1, 4)));
  setOvr(p);
}
function normalize(st) {
  const yr = st.season;
  const use = (p, hit) => { const c = p.c[p.c.length - 1]; if (!c || c.y !== yr) return 0; return hit ? (c.b ? c.b[B.pa] : 0) : (c.p ? c.p[P.bf] : 0); };
  const groups = [[p => !isP(p), ['con', 'pow', 'eye', 'spd', 'fld', 'arm'], true], [isP, ['vel', 'ctl', 'brk'], false]];
  for (const [f, keys, hit] of groups) {
    const all = Object.values(st.players).filter(f);
    const ps = all.filter(p => p.tid >= 0 && use(p, hit) > 0);
    const W = ps.reduce((s, p) => s + use(p, hit), 0); if (!W) continue;
    for (const k of keys) {
      const m = ps.reduce((s, p) => s + p.r[k] * use(p, hit), 0) / W;
      const tgt = st.cen0 && st.cen0[k] != null ? st.cen0[k] : 68;
      const sh = (tgt - m) * 0.8;
      for (const p of all) p.r[k] = clamp(Math.round((p.r[k] + sh) * 10) / 10, 15, 99);
    }
    for (const p of all) { const o = p.o; setOvr(p); p.pt = Math.max(p.o, Math.round(p.pt + (p.o - o))); }
  }
}
function startOffseason(st) {
  if (H.offseason) H.offseason(st);
  // archive, age, progress, retire, contracts
  const pls = Object.values(st.players);
  for (const p of pls) {
    if (p.sb || p.sp) { p.c.push({ y: st.season, t: p.tid >= 0 ? st.teams[p.tid].ab : 'FA', b: p.sb || null, p: p.sp || null }); if (p.c.length > 20) p.c.shift(); }
    p.sb = null; p.sp = null; p.inj = Math.max(0, p.inj - 60); p.e = 100;
  }
  let retired = [];
  for (const p of pls) {
    if (p.tid < -1) continue;
    p.a++;
    progressPlayer(p, H.dev ? H.dev(st, p) : 1);
    const rprob = p.a >= 41 ? 1 : p.a >= 35 ? (p.a - 34) * 0.16 + (p.o < 62 ? .25 : 0) : (p.tid === -1 && p.a >= 32 && p.o < 55 ? .5 : 0);
    if (rnd() < rprob) { retired.push(p); continue; }
    if (p.tid >= 0) p.y--;
  }
  normalize(st);
  for (const p of retired) {
    if (p.tid >= 0 && (p.o >= 75 || st.teams[p.tid].user != null)) newsAdd(st, `${pname(p)} (${p.tid >= 0 ? st.teams[p.tid].ab : 'FA'}) has announced his retirement at age ${p.a}.`, p.tid);
    delete st.players[p.id];
  }
  // expiring
  const exp = Object.values(st.players).filter(p => p.tid >= 0 && p.y <= 0);
  const asks = {};
  for (const p of exp) {
    if (p.lv >= 1 && p.o < 60) { asks[p.id] = { sal: 0.5, y: ri(1, 3), will: true, minor: true }; continue; }
    const a = askFor(p); a.will = rnd() > 0.15; asks[p.id] = a;
  }
  st.resign = { asks, dec: {} };
  st.phase = 'resign';
  st.teams.forEach(t => { if (t.user != null) { const n = exp.filter(p => p.tid === t.id).length; newsAdd(st, `${t.name}: ${n} player${n === 1 ? '' : 's'} with expiring contracts. Decide who to re-sign.`, t.id); } });
}
function finishResign(st) {
  const { asks, dec } = st.resign;
  for (const id of Object.keys(asks)) {
    const p = st.players[id]; if (!p) continue; const a = asks[id]; const t = st.teams[p.tid];
    let keep;
    if (t.user != null) keep = !!dec[id] && a.will;
    else keep = a.will && (a.minor ? p.pt >= 55 && p.a <= 26 : (pval(Object.assign({}, p, { sal: a.sal, y: a.y })) > 6 && payroll(st, t.id) + a.sal - p.sal <= t.bud) ) && rnd() < 0.8;
    if (keep) { p.sal = a.sal; p.y = a.y; txnAdd(st, `${t.ab} re-signed ${pname(p)}: ${a.y} yr / $${a.sal}M`, 'resign', t.id); }
    else { const was = t.ab; p.tid = -1; p.lv = 0; p.ask = askFor(p); if (p.o >= 72) newsAdd(st, `${pname(p)} (${was}) hits free agency.`); }
  }
  st.resign = null;
  st.fa = { day: 0, max: 6, offers: {} };
  st.phase = 'fa';
  pruneFA(st);
  newsAdd(st, 'Free agency is open! Place your offers — players decide over 6 days.');
}
function pruneFA(st) {
  const fa = Object.values(st.players).filter(p => p.tid === -1).sort((a, b) => pval(b) - pval(a));
  fa.slice(260).forEach(p => delete st.players[p.id]);
}
function offerScore(st, p, o) {
  const t = st.teams[o.tid];
  const sal = o.sal / Math.max(MINSAL, p.ask.sal);
  const yr = 1 + 0.04 * (o.y - p.ask.y) * (p.a >= 31 ? 1.5 : 0.7);
  const win = 1 + (pct(t) - 0.5) * 0.15;
  return sal * yr * win;
}
function faOffer(st, tid, pid, sal, y) {
  const p = st.players[pid]; if (!p || p.tid !== -1) return 'Player is not a free agent.';
  const t = st.teams[tid];
  sal = r1(Math.max(MINSAL, +sal)); y = clamp(Math.round(+y), 1, 8);
  const committed = Object.values(st.fa ? st.fa.offers : {}).flat().filter(o => o.tid === tid && o.pid !== pid).reduce((s, o) => s + o.sal, 0);
  if (payroll(st, tid) + committed + sal > t.bud) return `That offer would put you over budget ($${t.bud}M).`;
  if (st.phase !== 'fa') { // instant signing during season / preseason
    if (sal < p.ask.sal * 0.98 || y < 1) return `${pname(p)} wants at least $${p.ask.sal}M.`;
    signPlayer(st, p, tid, sal, y);
    txnAdd(st, `${t.ab} signed free agent ${pname(p)}: ${y} yr / $${sal}M`, 'fa', tid); newsAdd(st, `${t.name} sign ${pname(p)} (${y} yr / $${sal}M).`, tid);
    fixRoster(st, t);
    return null;
  }
  const offs = st.fa.offers[pid] || (st.fa.offers[pid] = []);
  const ex = offs.findIndex(o => o.tid === tid); if (ex >= 0) offs.splice(ex, 1);
  offs.push({ tid, pid, sal, y, user: true });
  return null;
}
function faWithdraw(st, tid, pid) { const o = st.fa && st.fa.offers[pid]; if (o) { st.fa.offers[pid] = o.filter(x => x.tid !== tid); } }
function faDay(st) {
  const fa = st.fa;
  for (const pid of Object.keys(fa.offers)) fa.offers[pid] = fa.offers[pid].filter(o => o.user);
  const pool = Object.values(st.players).filter(p => p.tid === -1).sort((a, b) => pval(b) - pval(a));
  const ai = st.teams.filter(t => t.user == null).sort(() => rnd() - .5);
  for (const t of ai) {
    let room = t.bud - payroll(st, t.id); let n = 0;
    const act = active(st, t.id);
    for (const p of pool.slice(0, 80)) {
      if (n >= 2 || room < MINSAL) break;
      if (p.ask.sal > room) continue;
      const same = act.filter(x => isP(p) ? isP(x) && (p.p === 'SP' ? x.p === 'SP' : true) : x.p === p.p).sort((a, b) => b.o - a.o);
      const ref = isP(p) ? (same[p.p === 'SP' ? 4 : 6] || { o: 40 }) : (same[0] || { o: 40 });
      if (p.o < ref.o + 2) continue;
      if (rnd() < 0.45) continue;
      const o = { tid: t.id, pid: p.id, sal: r1(p.ask.sal * rf(0.88, 1.12)), y: clamp(p.ask.y + ri(-1, 1), 1, 7) };
      (fa.offers[p.id] || (fa.offers[p.id] = [])).push(o); room -= o.sal; n++;
    }
  }
  const last = fa.day >= fa.max - 1;
  for (const pid of Object.keys(fa.offers)) {
    const p = st.players[pid]; const offs = fa.offers[pid]; if (!p || p.tid !== -1 || !offs.length) { delete fa.offers[pid]; continue; }
    const valid = offs.filter(o => payroll(st, o.tid) + o.sal <= st.teams[o.tid].bud);
    if (!valid.length) continue;
    const scored = valid.map(o => [o, offerScore(st, p, o) + rnd() * 0.04]).sort((a, b) => b[1] - a[1]);
    const [best, sc] = scored[0];
    const thresh = 1.0 - fa.day * 0.05;
    if ((sc >= thresh && rnd() < 0.45 + fa.day * 0.1) || (last && sc >= 0.8)) {
      const t = st.teams[best.tid];
      signPlayer(st, p, best.tid, best.sal, best.y);
      txnAdd(st, `${t.ab} signed free agent ${pname(p)}: ${best.y} yr / $${best.sal}M`, 'fa', t.id);
      if (p.o >= 70 || t.user != null) newsAdd(st, `${pname(p)} signs with the ${t.name}: ${best.y} years, $${best.sal}M per year.`, t.id);
      offs.filter(o => o.user && o.tid !== best.tid).forEach(o => newsAdd(st, `${pname(p)} turned down the ${st.teams[o.tid].name}'s offer.`, o.tid));
      delete fa.offers[pid];
    }
  }
  fa.day++;
  if (fa.day >= fa.max) {
    st.phase = 'preseason'; st.fa = null;
    newsAdd(st, 'Free agency period is over. Unsigned players remain available. Get your roster ready for opening day!');
  }
}
function newSeason(st) {
  st.season++; st.day = 0; st.draftDone = false; st.draft = null; st.po = null; st.awards = null;
  st.sched = genSchedule(st.settings.games);
  st.boxes = [];
  for (const p of Object.values(st.players)) {
    const car = p.c.filter(c => !c.m).reduce((s, c) => [s[0] + (c.b ? c.b[B.pa] : 0), s[1] + (c.p ? c.p[P.o] : 0)], [0, 0]);
    p.rk = car[0] < 130 && car[1] < 150;
    p.e = 100;
  }
  for (const t of st.teams) {
    t.bud = Math.round(t.bud * (1 + (pct(t) - 0.5) * 0.1 + 0.015));
    t.w = t.l = t.rs = t.ra = t.strk = 0; t.l10 = []; t.rotI = 0; t.dead = 0;
    // trim total roster
    if (st.settings.aa && t.user == null) balanceMinors(st, t);
    const all = teamPlayers(st, t.id); const limit = st.settings.aa ? 110 : 44;
    if (all.length > limit) {
      const cut = all.filter(p => p.lv >= 1).sort((a, b) => pval(a) - pval(b)).slice(0, all.length - limit);
      cut.forEach(p => { p.tid = -1; p.lv = 0; p.ask = askFor(p); txnAdd(st, `${t.ab} waived ${pname(p)} to clear organization space`, 'waive', t.id); });
      if (t.user != null && cut.length) newsAdd(st, `${t.name}: released ${cut.length} minor leaguer(s) to meet the ${limit}-player organization limit: ${cut.map(pname).join(', ')}.`, t.id);
    }
    fixRoster(st, t);
  }
  pruneFA(st);
  st.cen = computeCen(st); if (!st.cen0) st.cen0 = Object.assign({}, st.cen);
  if (H.newSeason) H.newSeason(st);
  st.ready = {};
  st.phase = 'regular';
  newsAdd(st, `Opening Day of the ${st.season} season!`);
}
/* phase-advance used by "Advance" button outside regular/playoffs */
function advancePhase(st) {
  if (st.phase === 'offseason') return startOffseason(st);
  if (st.phase === 'resign') return finishResign(st);
  if (st.phase === 'fa') return faDay(st);
  if (st.phase === 'preseason') return newSeason(st);
  if (st.phase === 'draft') return draftAuto(st, true);
}
function releasePlayer(st, pid) {
  const p = st.players[pid]; if (!p || p.tid < 0) return 'Invalid player.';
  const t = st.teams[p.tid];
  txnAdd(st, `${t.ab} released ${pname(p)}`, 'release', t.id);
  p.tid = -1; p.lv = 0; p.ask = askFor(p); p.ask.sal = r1(Math.max(MINSAL, p.ask.sal * 0.8));
  // dead money: remaining salary stays this season (simplified: 50% of 1 yr)
  t.dead = r1((t.dead || 0) + p.sal * 0.5);
  return null;
}

G.FR = {
  rnd: () => rnd(), setRng: f => { rnd = f; }, ri, rf, pick, clamp, r1, gauss, shuffle, FN, LN, POSADJ, newPlayer, genProspect, bump, computeCen, injDays, H, DEFW,
  LEAGUES, LG, DIVS, TEAMS, HPOS, LPOS, B, BL, P, PL, MINSAL, RN,
  isP, batVal, defAt, famAt, BASEFAM, editPlayer, fitOvr, ovrAt, calcOvr, setOvr, marketSal, pval, askFor,
  createLeague, genSchedule, teamPlayers, mlb, active, onIL, payroll, pname, sname, tname, dayLabel, newsAdd, txnAdd,
  draftDay, deadlineDay, tradesOpen, userTeams, isUserTeam,
  autoLineup, orderLineup, bestPositions, autoDepth, validLineup, repairLineup, fixRoster, fixRotation, signPlayer,
  Game, playGame, applyBox, simDay, simDays, endDay, prepSide,
  tradeEval, validTrade, executeTrade,
  startDraft, draftProspects, draftAuto, draftPick, endDraft, scoutPlayer,
  seeds, startPlayoffs, playoffDay, recordPlayoffGame, advancePlayoffRound, pct, homeIsHi,
  batLine, pitLine, war, computeAwards, startOffseason, finishResign, faOffer, faWithdraw, faDay, newSeason, advancePhase, releasePlayer, ord
};
})(typeof window !== 'undefined' ? window : globalThis);
