/* Front Office Baseball — extended systems: nationality, staff, bullpen roles, dynamic ratings,
   All-Star voting/game, calendar, amateur & pro scouting, trade hub. Loaded after engine.js. */
(function (G) {
'use strict';
const F = G.FR, H = F.H;
const { ri, rf, pick, clamp, r1, gauss, teamPlayers, active, isP, pname, sname, newsAdd, txnAdd, pval, batVal, B, P } = F;
const rnd = () => F.rnd();

/* ---------------- nationality ---------------- */
const NAT_W = [['USA', 70], ['Dominican Republic', 11], ['Venezuela', 8], ['Cuba', 2.5], ['Puerto Rico', 2.5], ['Mexico', 2], ['Canada', 1.5], ['Japan', 1], ['Colombia', 0.8], ['Panama', 0.6], ['Curacao', 0.5], ['Republic of Korea', 0.4], ['Taiwan', 0.3], ['Nicaragua', 0.3], ['Australia', 0.3], ['Aruba', 0.1], ['Bahamas', 0.1], ['Brazil', 0.1], ['Netherlands', 0.1]];
const NAT_T = NAT_W.reduce((s, x) => s + x[1], 0);
function randNat() { let x = rnd() * NAT_T; for (const [n, w] of NAT_W) { x -= w; if (x <= 0) return n; } return 'USA'; }
H.nat = tid => tid === -2 ? (rnd() < .86 ? 'USA' : rnd() < .5 ? 'Puerto Rico' : 'Canada') : randNat();
const FLAG = { 'USA': '🇺🇸', 'Dominican Republic': '🇩🇴', 'Venezuela': '🇻🇪', 'Cuba': '🇨🇺', 'Puerto Rico': '🇵🇷', 'Mexico': '🇲🇽', 'Canada': '🇨🇦', 'Japan': '🇯🇵', 'Colombia': '🇨🇴', 'Panama': '🇵🇦', 'Curacao': '🇨🇼', 'Republic of Korea': '🇰🇷', 'South Korea': '🇰🇷', 'Korea': '🇰🇷', 'Taiwan': '🇹🇼', 'Nicaragua': '🇳🇮', 'Australia': '🇦🇺', 'Aruba': '🇦🇼', 'Bahamas': '🇧🇸', 'Brazil': '🇧🇷', 'Netherlands': '🇳🇱', 'Germany': '🇩🇪', 'Peru': '🇵🇪', 'Honduras': '🇭🇳', 'Italy': '🇮🇹', 'United Kingdom': '🇬🇧', 'England': '🇬🇧', 'Spain': '🇪🇸', 'South Africa': '🇿🇦', 'China': '🇨🇳', 'Czech Republic': '🇨🇿', 'Lithuania': '🇱🇹', 'Philippines': '🇵🇭', 'Jamaica': '🇯🇲', 'Guatemala': '🇬🇹', 'El Salvador': '🇸🇻', 'Belgium': '🇧🇪', 'France': '🇫🇷', 'Russia': '🇷🇺', 'Ireland': '🇮🇪', 'Israel': '🇮🇱', 'New Zealand': '🇳🇿', 'Virgin Islands': '🇻🇮', 'U.S. Virgin Islands': '🇻🇮', 'Guam': '🇬🇺', 'American Samoa': '🇦🇸', 'Saudi Arabia': '🇸🇦', 'Ukraine': '🇺🇦', 'Poland': '🇵🇱', 'Sweden': '🇸🇪', 'Austria': '🇦🇹', 'Switzerland': '🇨🇭', 'Denmark': '🇩🇰', 'Norway': '🇳🇴', 'Hong Kong': '🇭🇰', 'Indonesia': '🇮🇩', 'Vietnam': '🇻🇳', 'India': '🇮🇳', 'Argentina': '🇦🇷', 'Chile': '🇨🇱', 'Ecuador': '🇪🇨', 'Costa Rica': '🇨🇷', 'Belize': '🇧🇿', 'Haiti': '🇭🇹', 'Bermuda': '🇧🇲', 'Saint Lucia': '🇱🇨', 'Greece': '🇬🇷', 'Iran': '🇮🇷', 'Nigeria': '🇳🇬', 'Ghana': '🇬🇭', 'Uganda': '🇺🇬', 'Zimbabwe': '🇿🇼', 'Croatia': '🇭🇷', 'Slovakia': '🇸🇰', 'Latvia': '🇱🇻', 'Belarus': '🇧🇾', 'Turkey': '🇹🇷', 'Singapore': '🇸🇬', 'Thailand': '🇹🇭', 'Portugal': '🇵🇹' };
F.flag = n => FLAG[n] || '🌐';
const NAT_SHORT = { 'Dominican Republic': 'DOM', 'Republic of Korea': 'KOR', 'Puerto Rico': 'PUR', 'Venezuela': 'VEN', 'USA': 'USA', 'Canada': 'CAN', 'Mexico': 'MEX', 'Japan': 'JPN', 'Cuba': 'CUB', 'Colombia': 'COL', 'Panama': 'PAN', 'Curacao': 'CUW', 'Taiwan': 'TPE', 'Nicaragua': 'NCA', 'Australia': 'AUS', 'Aruba': 'ARU', 'Bahamas': 'BAH', 'Brazil': 'BRA', 'Netherlands': 'NED', 'Germany': 'GER' };
const ISO2 = { 'USA': 'US', 'Dominican Republic': 'DO', 'Venezuela': 'VE', 'Cuba': 'CU', 'Puerto Rico': 'PR', 'Mexico': 'MX', 'Canada': 'CA', 'Japan': 'JP', 'Colombia': 'CO', 'Panama': 'PA', 'Curacao': 'CW', 'Republic of Korea': 'KR', 'South Korea': 'KR', 'Korea': 'KR', 'Taiwan': 'TW', 'Nicaragua': 'NI', 'Australia': 'AU', 'Aruba': 'AW', 'Bahamas': 'BS', 'Brazil': 'BR', 'Netherlands': 'NL', 'Germany': 'DE', 'Peru': 'PE', 'Honduras': 'HN', 'Italy': 'IT', 'United Kingdom': 'GB', 'England': 'GB', 'Spain': 'ES', 'South Africa': 'ZA', 'China': 'CN', 'Czech Republic': 'CZ', 'Lithuania': 'LT', 'Philippines': 'PH', 'Jamaica': 'JM', 'Guatemala': 'GT', 'El Salvador': 'SV', 'Belgium': 'BE', 'France': 'FR', 'Russia': 'RU', 'Ireland': 'IE', 'Israel': 'IL', 'New Zealand': 'NZ', 'Virgin Islands': 'VI', 'U.S. Virgin Islands': 'VI', 'Guam': 'GU', 'American Samoa': 'AS', 'Ukraine': 'UA', 'Poland': 'PL', 'Sweden': 'SE', 'Austria': 'AT', 'Switzerland': 'CH', 'Denmark': 'DK', 'Norway': 'NO', 'Hong Kong': 'HK', 'Indonesia': 'ID', 'Vietnam': 'VN', 'India': 'IN', 'Argentina': 'AR', 'Chile': 'CL', 'Ecuador': 'EC', 'Costa Rica': 'CR', 'Belize': 'BZ', 'Haiti': 'HT', 'Bermuda': 'BM', 'Saint Lucia': 'LC', 'Greece': 'GR', 'Nigeria': 'NG', 'Ghana': 'GH', 'Uganda': 'UG', 'Zimbabwe': 'ZW', 'Croatia': 'HR', 'Slovakia': 'SK', 'Latvia': 'LV', 'Belarus': 'BY', 'Turkey': 'TR', 'Singapore': 'SG', 'Thailand': 'TH', 'Portugal': 'PT' };
F.natCode = n => ISO2[n] || (n || '').slice(0, 2).toUpperCase();
F.natShort = n => NAT_SHORT[n] || (n || '').slice(0, 3).toUpperCase();

/* ---------------- staff ---------------- */
const ROLES = [['mgr', 'Manager'], ['bench', 'Bench Coach'], ['hit', 'Hitting Coach'], ['pit', 'Pitching Coach'], ['fb', 'First Base Coach'], ['tb', 'Third Base Coach'], ['trn', 'Head Athletic Trainer'], ['sct', 'Scouting Director']];
const RKEYS = { mgr: ['tac', 'dev', 'mot', 'pen'], bench: ['tac', 'dev', 'mot'], hit: ['con', 'pow', 'eye', 'dev'], pit: ['vel', 'cmd', 'brk', 'dev'], fb: ['run', 'def'], tb: ['run', 'aggr', 'def'], trn: ['prev', 'rec'], sct: ['eval', 'spd'] };
const RLABEL = { tac: 'Tactics', dev: 'Development', mot: 'Motivation', pen: 'Bullpen Mgmt', con: 'Contact Coaching', pow: 'Power Coaching', eye: 'Plate Discipline', vel: 'Velocity / Stuff', cmd: 'Command', brk: 'Breaking Pitches', run: 'Baserunning', def: 'Defense', aggr: 'Aggressiveness', prev: 'Injury Prevention', rec: 'Recovery', eval: 'Evaluation', spd: 'Coverage / Speed' };
const REGIONS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West Coast', 'Texas', 'Puerto Rico & Canada'];
const PREFS = {
  mgr: ['Small Ball', 'Power Ball', 'Aggressive Baserunning', 'Quick Hook', 'Long Leash', 'Analytics', 'Platoon Heavy', 'Old School'],
  bench: ['Defensive Positioning', 'Player Development', 'Veteran Mentor'],
  hit: ['Contact Approach', 'Launch Angle', 'Patient Hitters', 'Balanced'],
  pit: ['Strikeout Stuff', 'Pitch to Contact', 'Pitch Efficiency', 'Balanced'],
  fb: ['Green Light', 'Conservative', 'Balanced'],
  tb: ['Aggressive Sends', 'Safe Sends', 'Balanced'],
  trn: ['Injury Prevention', 'Rapid Rehab', 'Balanced'],
  sct: REGIONS
};
const PREF_DESC = {
  'Small Ball': 'Bunts runners over late in close games.', 'Power Ball': 'Never bunts; hitters swing for extra bases (+power).', 'Aggressive Baserunning': 'Steals more and takes extra bases.',
  'Quick Hook': 'Pulls starters earlier.', 'Long Leash': 'Lets starters work deeper.', 'Analytics': 'Better positioning and plate discipline.', 'Platoon Heavy': 'Bigger platoon advantages.', 'Old School': 'Occasional bunting; trusts veterans.',
  'Defensive Positioning': 'Improves team defense.', 'Player Development': 'Young players develop faster.', 'Veteran Mentor': 'Slows veterans\' decline.',
  'Contact Approach': 'More contact, a little less power.', 'Launch Angle': 'More power, a little less contact.', 'Patient Hitters': 'Better plate discipline.', 'Balanced': 'No special emphasis.',
  'Strikeout Stuff': 'Nastier stuff, slightly worse control.', 'Pitch to Contact': 'Better control and fewer pitches per batter.', 'Pitch Efficiency': 'Fewer pitches per batter — starters go deeper.',
  'Green Light': 'Runners steal more often.', 'Conservative': 'Fewer steal attempts.', 'Aggressive Sends': 'Sends runners home more often.', 'Safe Sends': 'Holds runners more often.',
  'Injury Prevention': 'Fewer injuries.', 'Rapid Rehab': 'Injured players return sooner.'
};
F.STAFF_ROLES = ROLES; F.RKEYS = RKEYS; F.RLABEL = RLABEL; F.REGIONS = REGIONS; F.PREFS = PREFS; F.PREF_DESC = PREF_DESC;
const coachOvr = c => c ? Math.round(RKEYS[c.role].reduce((s, k) => s + c.r[k], 0) / RKEYS[c.role].length) : 0;
F.coachOvr = coachOvr;
function coachSal(c) { const o = coachOvr(c); return r1(c.role === 'mgr' ? 1 + Math.max(0, o - 50) * 0.16 : c.role === 'bench' ? 0.6 + Math.max(0, o - 50) * 0.05 : 0.3 + Math.max(0, o - 50) * 0.04); }
function newCoach(st, role, o) {
  o = o || {};
  const id = 'c' + (st.cNext = (st.cNext || 1) + 1);
  const base = o.base != null ? o.base : rf(46, 74);
  const c = { id, f: o.f || pick(F.FN), l: o.l || pick(F.LN), a: o.a || ri(34, 66), nat: o.nat || (rnd() < .78 ? 'USA' : randNat()), role, r: {}, pref: o.pref || pick(PREFS[role]), sal: 0, y: ri(1, 4), tid: o.tid != null ? o.tid : -1, hist: [], real: !!o.real, exp: o.exp || ri(0, 18) };
  for (const k of RKEYS[role]) c.r[k] = clamp(Math.round(base + gauss() * 8), 30, 95);
  c.sal = coachSal(c);
  (st.coaches || (st.coaches = {}))[id] = c;
  return c;
}
F.coachOf = (st, tid, role) => { const t = st.teams[tid]; const id = t && t.staff && t.staff[role]; return id ? st.coaches[id] : null; };
function staffFor(st, t) {
  t.staff = {};
  const real = st.settings.real && (G.REAL_STAFF || {})[t.ab];
  for (const [role] of ROLES) {
    const rr = real && real[role];
    let c;
    if (rr) {
      const sp = rr[0].indexOf(' ');
      c = newCoach(st, role, { f: rr[0].slice(0, sp), l: rr[0].slice(sp + 1), a: rr[1] || ri(40, 60), nat: rr[2] || 'USA', tid: t.id, real: true, base: rf(50, 76) + (rr[3] ? 2 : 0), exp: ri(2, 20) });
    } else c = newCoach(st, role, { tid: t.id });
    t.staff[role] = c.id;
  }
}
H.staffPay = (st, tid) => { const t = st.teams[tid]; if (!t || !t.staff || !st.coaches) return 0; let s = 0; for (const k in t.staff) { const c = st.coaches[t.staff[k]]; if (c) s += c.sal; } return s; };
H.mods = (st, t) => {
  if (!t || t.id >= 30 || !t.staff || !st.coaches) return {};
  const c = role => st.coaches[t.staff[role]];
  const v = (x, k) => x ? x.r[k] : 45;
  const m = { con: 0, pow: 0, eye: 0, stuff: 0, ctl: 0, dfld: 0, sbs: 0, sbr: 1, adv: 0, hook: 1, bunt: 0, plat: 1, inj: 1, pcAdj: 0 };
  const h = c('hit'), p = c('pit'), bc = c('bench'), fb = c('fb'), tb = c('tb'), mg = c('mgr'), tr = c('trn');
  m.con = (v(h, 'con') - 60) * 0.05; m.pow = (v(h, 'pow') - 60) * 0.05; m.eye = (v(h, 'eye') - 60) * 0.05;
  if (h) { if (h.pref === 'Contact Approach') { m.con += 0.8; m.pow -= 0.4; } if (h.pref === 'Launch Angle') { m.pow += 0.8; m.con -= 0.4; } if (h.pref === 'Patient Hitters') m.eye += 0.8; }
  m.stuff = ((v(p, 'vel') + v(p, 'brk')) / 2 - 60) * 0.05; m.ctl = (v(p, 'cmd') - 60) * 0.05;
  if (p) { if (p.pref === 'Strikeout Stuff') { m.stuff += 0.8; m.ctl -= 0.4; } if (p.pref === 'Pitch to Contact') { m.ctl += 0.8; m.pcAdj -= 0.15; } if (p.pref === 'Pitch Efficiency') m.pcAdj -= 0.3; }
  m.dfld = (v(bc, 'tac') - 60) * 0.04 + (bc && bc.pref === 'Defensive Positioning' ? 0.6 : 0) + (v(fb, 'def') + v(tb, 'def') - 120) * 0.01;
  m.sbs = (v(fb, 'run') - 60) * 0.002; if (fb) m.sbr = fb.pref === 'Green Light' ? 1.4 : fb.pref === 'Conservative' ? 0.7 : 1;
  m.adv = (v(tb, 'run') - 60) * 0.0015 + (v(tb, 'aggr') - 60) * 0.001 + (tb && tb.pref === 'Aggressive Sends' ? 0.04 : tb && tb.pref === 'Safe Sends' ? -0.03 : 0);
  if (mg) {
    m.dfld += (mg.r.tac - 60) * 0.02;
    if (mg.pref === 'Quick Hook') m.hook = 0.92; if (mg.pref === 'Long Leash') m.hook = 1.06;
    if (mg.pref === 'Small Ball') m.bunt = 0.35; if (mg.pref === 'Old School') m.bunt = 0.15;
    if (mg.pref === 'Aggressive Baserunning') { m.sbr *= 1.4; m.adv += 0.03; }
    if (mg.pref === 'Analytics') { m.eye += 0.5; m.dfld += 0.3; }
    if (mg.pref === 'Platoon Heavy') m.plat = 1.25;
    if (mg.pref === 'Power Ball') { m.pow += 0.6; m.bunt = 0; }
  }
  m.inj = clamp(1 - (v(tr, 'prev') - 60) * 0.01 - (tr && tr.pref === 'Injury Prevention' ? 0.08 : 0), 0.55, 1.4);
  return m;
};
F.teamMods = H.mods;
H.dev = (st, p) => {
  const t = st.teams[p.tid]; if (!t || !t.staff || !st.coaches) return 1;
  const c = role => st.coaches[t.staff[role]];
  const dc = isP(p) ? c('pit') : c('hit'), mg = c('mgr'), bc = c('bench');
  let m = 1 + ((dc ? dc.r.dev : 45) - 60) * 0.008 + ((mg ? mg.r.dev : 45) - 60) * 0.004 + ((bc ? bc.r.dev : 45) - 60) * 0.003;
  if (bc && bc.pref === 'Player Development' && p.a <= 26) m += 0.06;
  if (bc && bc.pref === 'Veteran Mentor' && p.a >= 31) m += 0.08;
  return clamp(m, 0.75, 1.3);
};
function coachAsk(c) { return { sal: r1(coachSal(c) * rf(1, 1.15)), y: ri(1, 3) }; }
F.hireCoach = (st, tid, cid) => {
  const c = st.coaches[cid]; if (!c || c.tid !== -1) return 'That coach is no longer available.';
  const t = st.teams[tid]; t.staff = t.staff || {};
  const ask = c.ask || coachAsk(c);
  const cur = st.coaches[t.staff[c.role]];
  const pay = F.payroll(st, tid) - (cur ? cur.sal : 0) + ask.sal;
  if (pay > t.bud) return `Hiring him would put you over budget ($${t.bud}M).`;
  if (cur) { cur.tid = -1; cur.ask = coachAsk(cur); }
  c.tid = tid; c.sal = ask.sal; c.y = ask.y; delete c.ask; t.staff[c.role] = c.id;
  txnAdd(st, `${t.ab} hired ${c.f} ${c.l} as ${ROLES.find(r => r[0] === c.role)[1]}`);
  newsAdd(st, `The ${t.name} hired ${c.f} ${c.l} as their new ${ROLES.find(r => r[0] === c.role)[1].toLowerCase()}.`, tid);
  return null;
};
F.fireCoach = (st, tid, cid) => {
  const t = st.teams[tid]; const c = st.coaches[cid]; if (!c || c.tid !== tid) return 'Not on your staff.';
  c.tid = -1; c.ask = coachAsk(c); delete t.staff[c.role];
  txnAdd(st, `${t.ab} parted ways with ${c.f} ${c.l} (${ROLES.find(r => r[0] === c.role)[1]})`);
  return null;
};
F.extendCoach = (st, tid, cid) => {
  const c = st.coaches[cid]; if (!c || c.tid !== tid) return 'Not on your staff.';
  const ns = r1(coachSal(c) * 1.05); const t = st.teams[tid];
  if (F.payroll(st, tid) - c.sal + ns > t.bud) return 'An extension would put you over budget.';
  c.sal = ns; c.y += 2; return null;
};
F.faCoaches = st => Object.values(st.coaches || {}).filter(c => c.tid === -1);
function coachSeasonEnd(st) {
  if (!st.coaches) return;
  for (const t of st.teams) {
    if (!t.staff) continue;
    const pl = teamPlayers(st, t.id);
    const bat = new Array(F.BL).fill(0), pit = new Array(F.PL).fill(0);
    pl.forEach(p => { if (p.sb) p.sb.forEach((v, i) => bat[i] += v); if (p.sp) p.sp.forEach((v, i) => pit[i] += v); });
    const ops = F.batLine(bat).ops, era = F.pitLine(pit).era;
    const po = st.po ? st.po.series.filter(s => s.hi === t.id || s.lo === t.id) : [];
    const deep = po.length ? Math.max(...po.map(s => s.r)) : -1;
    const res = st.po && st.po.champ === t.id ? 'Won World Series' : deep >= 0 ? 'Lost in ' + F.RN[deep] : 'Missed playoffs';
    for (const role in t.staff) { const c = st.coaches[t.staff[role]]; if (c) { c.hist.push({ y: st.season, t: t.ab, w: t.w, l: t.l, ops: +ops.toFixed(3), era: +era.toFixed(2), res }); if (c.hist.length > 25) c.hist.shift(); } }
  }
}
function coachOffseason(st) {
  if (!st.coaches) return;
  for (const c of Object.values(st.coaches)) {
    c.a++; c.exp++;
    if (c.a >= 70 && rnd() < (c.a - 68) * 0.15) { if (c.tid >= 0) { const t = st.teams[c.tid]; delete t.staff[c.role]; if (t.user != null) newsAdd(st, `${c.f} ${c.l} (${ROLES.find(r => r[0] === c.role)[1]}) has retired.`, t.id); } delete st.coaches[c.id]; continue; }
    if (c.tid >= 0) {
      c.y--;
      if (c.y <= 0) {
        const t = st.teams[c.tid];
        if (t.user == null && rnd() < 0.75) { c.y = ri(1, 3); c.sal = coachSal(c); }
        else { delete t.staff[c.role]; c.tid = -1; c.ask = coachAsk(c); if (t.user != null) newsAdd(st, `${c.f} ${c.l}'s contract as ${ROLES.find(r => r[0] === c.role)[1].toLowerCase()} expired. Hire a replacement in Free Agents → Coaches & Staff.`, t.id); }
      }
    } else if (!c.ask) c.ask = coachAsk(c);
  }
  // refresh FA pool and let AI fill vacancies
  for (let i = 0; i < 10; i++) { const c = newCoach(st, pick(ROLES)[0]); c.ask = coachAsk(c); }
  for (const t of st.teams) {
    if (t.user != null) continue; t.staff = t.staff || {};
    for (const [role] of ROLES) if (!t.staff[role] || !st.coaches[t.staff[role]]) {
      const fa = F.faCoaches(st).filter(c => c.role === role).sort((a, b) => coachOvr(b) - coachOvr(a));
      const c = fa[ri(0, Math.min(3, fa.length - 1))] || newCoach(st, role);
      c.tid = t.id; c.sal = coachSal(c); c.y = ri(1, 3); delete c.ask; t.staff[role] = c.id;
    }
  }
  const fa = F.faCoaches(st).sort((a, b) => coachOvr(b) - coachOvr(a));
  fa.slice(45).forEach(c => delete st.coaches[c.id]);
}

/* ---------------- bullpen roles ---------------- */
F.PEN_ROLES = [['cl', 'Closer', 1], ['stp', 'Stopper / Fireman', 1], ['su', 'Setup', 2], ['spec', 'Specialist', 2], ['lr', 'Long Relief', 2]];
function penPool(st, t) { const rot = new Set(t.rot || []); return active(st, t.id).filter(p => isP(p) && !rot.has(p.id)); }
H.autoPen = (st, t) => {
  const pool = penPool(st, t).sort((a, b) => b.o - a.o); const used = new Set();
  const take = f => { const p = pool.find(x => !used.has(x.id) && (!f || f(x))); if (p) used.add(p.id); return p ? p.id : null; };
  const cl = take(), su = [take(), take()].filter(Boolean), stp = take();
  const spec = []; const l = take(p => p.t === 'L'); if (l) spec.push({ id: l, vs: 'L' });
  const r = take(p => p.t === 'R' && p.r.brk >= 60); if (r) spec.push({ id: r, vs: 'R' });
  const lr = []; const lrc = pool.filter(p => !used.has(p.id)).sort((a, b) => b.r.sta - a.r.sta); if (lrc[0]) { lr.push(lrc[0].id); used.add(lrc[0].id); }
  t.pen = { cl, stp, su, spec, lr };
  t.cl = cl; t.su = su[0] || null;
};
H.fixPen = (st, t) => {
  if (!t.pen) return H.autoPen(st, t);
  const ok = new Set(penPool(st, t).map(p => p.id)); const seen = new Set();
  const v = id => { if (id == null || !ok.has(id) || seen.has(id)) return null; seen.add(id); return id; };
  const pn = t.pen;
  pn.cl = v(pn.cl); pn.stp = v(pn.stp); pn.su = (pn.su || []).map(v).filter(x => x != null).slice(0, 2);
  pn.spec = (pn.spec || []).filter(s => v(s.id) != null).slice(0, 2); pn.lr = (pn.lr || []).map(v).filter(x => x != null).slice(0, 2);
  if (pn.cl == null) { const b = penPool(st, t).filter(p => !seen.has(p.id)).sort((a, b) => b.o - a.o)[0]; pn.cl = b ? b.id : null; }
  t.cl = pn.cl; t.su = pn.su[0] || null;
};
H.roles = (st, t) => {
  const m = {}; const pn = t.pen; if (!pn) return m;
  (pn.lr || []).forEach(id => m[id] = 'LR'); (pn.spec || []).forEach(s => m[s.id] = s.vs === 'L' ? 'SPL' : 'SPR');
  (pn.su || []).forEach(id => m[id] = 'SU'); if (pn.stp != null) m[pn.stp] = 'STP'; if (pn.cl != null) m[pn.cl] = 'CL';
  return m;
};
F.setPenRole = (st, t, role, idx, pid, vs) => {
  if (!t.pen) H.autoPen(st, t);
  const pn = t.pen; pid = pid == null || pid === '' ? null : +pid;
  // remove pid from any other role
  if (pid != null) { if (pn.cl === pid) pn.cl = null; if (pn.stp === pid) pn.stp = null; pn.su = pn.su.filter(x => x !== pid); pn.spec = pn.spec.filter(s => s.id !== pid); pn.lr = pn.lr.filter(x => x !== pid); t.rot = (t.rot || []).filter(x => x !== pid); }
  if (role === 'cl' || role === 'stp') pn[role] = pid;
  else if (role === 'spec') { const a = pn.spec.slice(); if (pid == null) a.splice(idx, 1); else a[idx] = { id: pid, vs: vs || (a[idx] && a[idx].vs) || 'L' }; pn.spec = a.filter(Boolean).slice(0, 2); }
  else { const a = (pn[role] || []).slice(); if (pid == null) a.splice(idx, 1); else a[idx] = pid; pn[role] = a.filter(x => x != null).slice(0, 2); }
  t.cl = pn.cl; t.su = pn.su[0] || null;
  return null;
};
F.roleOf = (t, id) => { const m = H.roles(null, t); return m[id] || 'MR'; };
F.ROLE_NAMES = { CL: 'Closer', STP: 'Stopper', SU: 'Setup', SPL: 'Specialist vs LHB', SPR: 'Specialist vs RHB', LR: 'Long Relief', MR: 'Middle Relief' };

/* ---------------- dynamic ratings ---------------- */
function dynamicRatings(st) {
  const cen = st.cen || {}; const cenBat = batVal({ con: cen.con || 68, pow: cen.pow || 68, eye: cen.eye || 68, spd: cen.spd || 68 });
  const cenP = ((cen.S || 68) + (cen.ctl || 68)) / 2;
  // league baselines for this window
  const hb = new Array(F.BL).fill(0), pb = new Array(F.PL).fill(0); let hbv = 0, hn = 0, pbv = 0, pn = 0;
  const wins = [];
  for (const p of Object.values(st.players)) {
    if (p.tid < 0 || p.lv !== 0) continue;
    if (!isP(p) && p.sb) { const w0 = p.ws || new Array(F.BL).fill(0); const d = p.sb.map((v, i) => v - (w0[i] || 0)); if (d[B.pa] >= 15) { d.forEach((v, i) => hb[i] += v); hbv += batVal(p.r) * d[B.pa]; hn += d[B.pa]; wins.push([p, d]); } }
    else if (isP(p) && p.sp) { const w0 = p.ws || new Array(F.PL).fill(0); const d = p.sp.map((v, i) => v - (w0[i] || 0)); if (d[P.bf] >= 20) { d.forEach((v, i) => pb[i] += v); const S = p.r.vel * .45 + p.r.brk * .55; pbv += (S + p.r.ctl) / 2 * d[P.bf]; pn += d[P.bf]; wins.push([p, d]); } }
  }
  const lgW = hn ? F.batLine(hb).woba : 0.315, lgBV = hn ? hbv / hn : cenBat;
  const lgF = pn ? F.pitLine(pb).fip : 4.1, lgPV = pn ? pbv / pn : cenP;
  for (const [p, d] of wins) {
    const t = st.teams[p.tid];
    const mg = t.staff && st.coaches ? st.coaches[t.staff.mgr] : null; const mot = 1 + ((mg ? mg.r.mot : 50) - 60) * 0.004;
    const old = p.o; let delta = 0; const tr = p.trend || 0;
    if (!isP(p)) {
      const lw = F.batLine(d); const exp = lgW + (batVal(p.r) - lgBV) * 0.0042;
      const wg = d[B.pa] / (d[B.pa] + 120);
      delta = clamp((lw.woba - exp) * 40 * wg * (lw.woba > exp ? mot : 1), -1, 1);
      if ((tr >= 7 && delta > 0) || (tr <= -7 && delta < 0)) delta *= 0.3;
      for (const k of ['con', 'pow', 'eye']) p.r[k] = clamp(p.r[k] + delta * rf(0.6, 1.4), 15, 99);
      p.ws = p.sb.slice();
    } else {
      const fip = F.pitLine(d).fip; const S = p.r.vel * .45 + p.r.brk * .55;
      const expF = lgF - ((S + p.r.ctl) / 2 - lgPV) * 0.07;
      const wg = d[P.bf] / (d[P.bf] + 150);
      delta = clamp((expF - fip) * 1.0 * wg * (fip < expF ? mot : 1), -1, 1);
      if ((tr >= 7 && delta > 0) || (tr <= -7 && delta < 0)) delta *= 0.3;
      p.r.vel = clamp(p.r.vel + delta * rf(0.2, 0.7), 15, 99); p.r.brk = clamp(p.r.brk + delta * rf(0.6, 1.4), 15, 99); p.r.ctl = clamp(p.r.ctl + delta * rf(0.6, 1.4), 15, 99);
      p.ws = p.sp.slice();
    }
    p.o = F.calcOvr(p);
    if (p.o > p.pt) p.pt = p.o;
    if (delta > 0.7 && p.a >= 27) p.pt = Math.max(p.pt, p.o + 1);
    const ch = p.o - old; p.td = ch; p.trend = tr + ch;
    if (t.user != null && ch !== 0 && Math.abs(p.trend) >= 3 && Math.abs(tr) < 3) newsAdd(st, `${pname(p)} is ${p.trend > 0 ? 'on fire' : 'slumping'} — his overall is ${p.trend > 0 ? 'up' : 'down'} ${Math.abs(p.trend)} this season (now ${p.o}).`, t.id);
  }
}

/* ---------------- calendar ---------------- */
F.dateOf = (st, d) => {
  const start = Date.UTC(st.season, 2, 27); const n = st.settings.games; const span = n >= 150 ? 186 : Math.round(n * 1.15);
  return new Date(start + Math.floor(d * span / n) * 864e5);
};
F.asgDay = st => Math.round(st.settings.games * 0.555);
F.asgOpenDay = st => Math.round(st.settings.games * 0.25);
F.asgCloseDay = st => Math.max(F.asgOpenDay(st) + 1, F.asgDay(st) - 4);
F.events = st => {
  const n = st.settings.games;
  return [
    { d: 0, k: 'open', t: 'Opening Day' }, { d: F.asgOpenDay(st), k: 'vote', t: 'All-Star voting opens' }, { d: F.asgCloseDay(st), k: 'vote', t: 'All-Star rosters announced' },
    { d: F.draftDay(st), k: 'draft', t: 'Amateur Draft' }, { d: F.asgDay(st), k: 'asg', t: 'All-Star Game' }, { d: F.deadlineDay(st), k: 'deadline', t: 'Trade Deadline' },
    { d: n - 1, k: 'end', t: 'Final day of regular season' }, { d: n, k: 'post', t: 'Postseason begins' }
  ].sort((a, b) => a.d - b.d);
};

/* ---------------- All-Star ---------------- */
const ASG_POS = ['C', '1B', '2B', '3B', 'SS', 'OF', 'DH'];
F.ASG_POS = ASG_POS;
function asgInit(st) { st.asg = { open: false, closed: false, done: false, ballot: null, votes: {}, uv: {}, rosters: null, starters: null, result: null }; }
function asgOpen(st) {
  const a = st.asg; a.open = true; a.ballot = { 0: {}, 1: {} };
  for (const t of st.teams) {
    const ps = active(st, t.id).filter(p => !isP(p));
    const lu = (t.lu && t.lu.length === 9) ? t.lu : F.autoLineup(st, t);
    const add = (cat, p) => { if (!p) return; (a.ballot[t.lg][cat] || (a.ballot[t.lg][cat] = [])).push(p.id); a.votes[p.id] = a.votes[p.id] || 0; };
    const taken = new Set();
    for (const cat of ['C', '1B', '2B', '3B', 'SS']) { const p = ps.filter(x => x.p === cat && !taken.has(x.id)).sort((x, y) => y.o - x.o)[0]; if (p) { taken.add(p.id); add(cat, p); } }
    ps.filter(x => ['LF', 'CF', 'RF'].includes(x.p) && !taken.has(x.id)).sort((x, y) => y.o - x.o).slice(0, 3).forEach(p => { taken.add(p.id); add('OF', p); });
    const dh = lu.find(s => s.pos === 'DH'); const dp = dh && st.players[dh.id];
    if (dp && !taken.has(dp.id)) add('DH', dp); else { const b = ps.filter(x => !taken.has(x.id)).sort((x, y) => batVal(y.r) - batVal(x.r))[0]; add('DH', b); }
  }
  newsAdd(st, 'All-Star voting is open! Cast your ballots on the All-Star page.');
}
function asgDailyVotes(st) {
  const a = st.asg;
  for (const id of Object.keys(a.votes)) {
    const p = st.players[id]; if (!p || p.tid < 0) continue;
    const t = st.teams[p.tid]; const l = p.sb ? F.batLine(p.sb) : null;
    const perf = l ? Math.max(0, l.woba - 0.29) * l.pa * 90 : 0;
    a.votes[id] += Math.round(4 * (Math.pow(Math.max(0, p.o - 50), 2) * 6 + t.mkt * 700 + perf) * rf(0.85, 1.15));
  }
}
F.asgVote = (st, voter, pid) => {
  const a = st.asg; if (!a || !a.open || a.closed) return 'Voting is closed.';
  if (!(pid in a.votes)) return 'Not on the ballot.';
  const p = st.players[pid]; const t = st.teams[p.tid];
  const cat = Object.keys(a.ballot[t.lg]).find(c => a.ballot[t.lg][c].includes(+pid));
  const key = voter + '|' + t.lg + cat; const u = a.uv[key] || { d: -1, n: 0 };
  if (u.d !== st.day) { u.d = st.day; u.n = 0; }
  if (u.n >= 5) return 'You have used your 5 votes for this position today. Sim a day to vote again.';
  u.n++; a.uv[key] = u; a.votes[pid] += 25000;
  return null;
};
F.asgVotesLeft = (st, voter, lg, cat) => { const u = st.asg && st.asg.uv[voter + '|' + lg + cat]; return u && u.d === st.day ? 5 - u.n : 5; };
function asgSelect(st) {
  const a = st.asg; a.closed = true; a.rosters = { 0: [], 1: [] }; a.starters = { 0: [], 1: [] };
  for (let lg = 0; lg < 2; lg++) {
    const taken = new Set();
    for (const cat of ASG_POS) {
      const c = (a.ballot[lg][cat] || []).filter(id => st.players[id] && st.players[id].tid >= 0 && st.teams[st.players[id].tid].lg === lg).sort((x, y) => a.votes[y] - a.votes[x]);
      const n = cat === 'OF' ? 3 : 1;
      c.filter(id => !taken.has(id)).slice(0, n).forEach(id => { taken.add(id); a.starters[lg].push([id, cat]); });
    }
    const pool = Object.values(st.players).filter(p => p.tid >= 0 && p.lv === 0 && st.teams[p.tid].lg === lg);
    const hit = pool.filter(p => !isP(p) && p.sb && !taken.has(p.id)).sort((x, y) => F.war(y) - F.war(x));
    const res = [];
    if (!a.starters[lg].some(s => s[1] === 'C') || true) { const c2 = hit.find(p => p.p === 'C'); if (c2) res.push(c2); }
    for (const p of hit) { if (res.length >= 11) break; if (!res.includes(p)) res.push(p); }
    const sps = pool.filter(p => p.p === 'SP' && p.sp && p.sp[P.gs] >= 3).sort((x, y) => F.war(y) - F.war(x)).slice(0, 9);
    const rps = pool.filter(p => p.p === 'RP' && p.sp).sort((x, y) => (y.sp[P.sv] * 0.05 + F.war(y)) - (x.sp[P.sv] * 0.05 + F.war(x))).slice(0, 4);
    let roster = a.starters[lg].map(s => st.players[s[0]]).concat(res, sps, rps);
    // every team represented
    for (const t of st.teams.filter(x => x.lg === lg)) {
      if (roster.some(p => p.tid === t.id)) continue;
      const best = pool.filter(p => p.tid === t.id && (p.sb || p.sp)).sort((x, y) => F.war(y) - F.war(x))[0]; if (!best) continue;
      const swap = (isP(best) ? roster.filter(p => isP(p)) : res).filter(p => roster.filter(q => q.tid === p.tid).length > 1).sort((x, y) => F.war(x) - F.war(y))[0];
      if (swap) roster = roster.filter(p => p !== swap); roster.push(best);
    }
    a.rosters[lg] = roster.map(p => p.id);
    roster.forEach(p => (p.aw || (p.aw = [])).push(st.season + ' All-Star'));
  }
  const mine = st.teams.filter(t => t.user != null);
  for (const t of mine) { const n = a.rosters[t.lg].filter(id => st.players[id].tid === t.id); if (n.length) newsAdd(st, `All-Stars! ${n.map(id => pname(st.players[id])).join(', ')} will represent the ${t.name}.`, t.id); }
  newsAdd(st, `All-Star rosters announced. Top vote-getters: ${[0, 1].map(lg => { const top = a.starters[lg].slice().sort((x, y) => a.votes[y[0]] - a.votes[x[0]])[0]; return top ? `${pname(st.players[top[0]])} (${(a.votes[top[0]] / 1e6).toFixed(2)}M)` : ''; }).join(' & ')}.`);
}
function asgPlay(st) {
  const a = st.asg; if (!a.rosters) asgSelect(st);
  const lt = { players: {}, teams: [], cen: st.cen, settings: { injuries: false }, season: st.season, coaches: {} };
  for (let lg = 0; lg < 2; lg++) {
    const tid = 30 + lg;
    for (const id of a.rosters[lg]) { const p = st.players[id]; if (p) lt.players[id] = Object.assign({}, p, { tid, lv: 0, inj: 0, e: 100 }); }
    const used = new Set(), lu = [];
    const sts = a.starters[lg].map(([id, cat]) => ({ id, cat })).filter(s => lt.players[s.id]);
    for (const s of sts) if (s.cat !== 'OF') { lu.push({ id: s.id, pos: s.cat }); used.add(s.id); }
    const of = sts.filter(s => s.cat === 'OF').map(s => lt.players[s.id]).sort((x, y) => y.r.fld + y.r.spd - x.r.fld - x.r.spd);
    ['CF', 'RF', 'LF'].forEach((pos, i) => { if (of[i]) { lu.push({ id: of[i].id, pos }); used.add(of[i].id); } });
    const need = F.LPOS.filter(p => !lu.some(s => s.pos === p));
    const bench = Object.values(lt.players).filter(p => !isP(p) && !used.has(p.id));
    for (const pos of need) { const b = bench.filter(p => !used.has(p.id)).sort((x, y) => F.ovrAt(y, pos) - F.ovrAt(x, pos))[0]; if (b) { lu.push({ id: b.id, pos }); used.add(b.id); } }
    const pits = Object.values(lt.players).filter(isP).sort((x, y) => F.war(y) - F.war(x));
    const sp = pits.find(p => p.p === 'SP') || pits[0];
    const cl = pits.filter(p => p.p === 'RP').sort((x, y) => y.o - x.o)[0];
    lt.teams[tid] = { id: tid, ab: F.LG[lg], name: 'All-Stars', city: F.LEAGUES[lg], user: null, auto: false, lu: F.orderLineup(lt, lu), rot: sp ? [sp.id] : [], rotI: 0, cl: cl ? cl.id : null, su: null, lg };
  }
  const home = st.season % 2 ? 30 : 31;
  const g = new F.Game(lt, home, home === 30 ? 31 : 30, { log: true, asg: true });
  g.simToEnd();
  const box = g.box();
  box.id = st.season + '-asg'; box.asg = true;
  st.boxes.unshift(box); if (st.boxes.length > 40) st.boxes.length = 40;
  const win = box.hs > box.as ? box.h : box.a;
  const wside = box.sides.find(s => s.tid === win);
  let mvp = null, mv = -1; for (const [id, l] of wside.bat) { const v = l[B.h] + l[B.hr] * 2 + l[B.rbi] * 0.7 + l[B.bb] * 0.3; if (v > mv) { mv = v; mvp = id; } }
  const mp = st.players[mvp];
  a.done = true; a.result = { win: win - 30, as: box.as, hs: box.hs, a: box.a - 30, h: box.h - 30, mvp, box: box.id };
  if (mp) (mp.aw || (mp.aw = [])).push(st.season + ' All-Star Game MVP');
  (st.asgHist || (st.asgHist = [])).unshift({ y: st.season, w: F.LG[win - 30], s: `${F.LG[box.a - 30]} ${box.as}, ${F.LG[box.h - 30]} ${box.hs}`, mvp: mp ? pname(mp) + ' (' + st.teams[mp.tid].ab + ')' : '—' });
  newsAdd(st, `⭐ The ${F.LEAGUES[win - 30]} wins the ${st.season} All-Star Game, ${Math.max(box.as, box.hs)}-${Math.min(box.as, box.hs)}. MVP: ${mp ? pname(mp) : '—'}.`);
}
F.asgPlayNow = asgPlay;

/* ---------------- amateur & pro scouting ---------------- */
const COLLEGES = { 'Northeast': ['Boston College', 'Maryland', 'Rutgers', 'Penn State', 'UConn', 'Stony Brook'], 'Southeast': ['Florida', 'Vanderbilt', 'LSU', 'Georgia Tech', 'Clemson', 'Wake Forest', 'Tennessee', 'Ole Miss', 'Miami', 'Florida State'], 'Midwest': ['Indiana', 'Michigan', 'Ohio State', 'Louisville', 'Illinois', 'Nebraska'], 'Southwest': ['Arizona', 'Arizona State', 'Oklahoma State', 'Grand Canyon', 'New Mexico'], 'West Coast': ['UCLA', 'Stanford', 'Oregon State', 'USC', 'Cal Poly', 'UC Santa Barbara'], 'Texas': ['Texas', 'TCU', 'Texas A&M', 'Rice', 'Baylor', 'Dallas Baptist'], 'Puerto Rico & Canada': ['Puerto Rico Baseball Academy', 'Canadian Junior National Team'] };
const TOWNS = ['Lakeland', 'Sarasota', 'Marietta', 'Plano', 'Katy', 'Corona', 'Mission Viejo', 'Chandler', 'Naperville', 'Bergen', 'Cherry Hill', 'Tampa Jesuit', 'IMG Academy', 'Harvard-Westlake', 'Orange Lutheran', 'Owasso', 'Etiwanda', 'Barbe', 'Parkview', 'Buford', 'Calvary Christian', 'Montverde Academy', 'St. Thomas Aquinas', 'Bishop Gorman', 'Jesuit (Portland)', 'Vandegrift'];
H.prospect = (st, p) => {
  p.reg = p.nat === 'Puerto Rico' || p.nat === 'Canada' ? 'Puerto Rico & Canada' : pick(['Northeast', 'Southeast', 'Southeast', 'Southeast', 'Midwest', 'Southwest', 'West Coast', 'West Coast', 'Texas', 'Texas']);
  p.sch = p.col ? pick(COLLEGES[p.reg]) : (p.reg === 'Puerto Rico & Canada' ? pick(COLLEGES[p.reg]) : pick(TOWNS) + ' HS');
  p.nz = Math.round(gauss() * 9); p.nzo = Math.round(gauss() * 5);
};
function genDraftClass(st) {
  st.dc = { pool: [] };
  for (let i = 0; i < 210; i++) st.dc.pool.push(F.genProspect(st).id);
}
F.scState = (st, tid) => { st.sc = st.sc || {}; return st.sc[tid] || (st.sc[tid] = { reg: 'Southeast', focus: [], prog: {}, pro: null, proProg: {} }); };
F.scoutAssign = (st, tid, o) => { const s = F.scState(st, tid); if (o.reg) { s.reg = o.reg; s.pro = null; } if (o.pro != null) { s.pro = +o.pro; } return null; };
F.scoutFocus = (st, tid, pid, on) => {
  const s = F.scState(st, tid); pid = +pid;
  if (on) { if (s.focus.includes(pid)) return null; if (s.focus.length >= 5) return 'Your scouting director can follow at most 5 prospects closely.'; s.focus.push(pid); }
  else s.focus = s.focus.filter(x => x !== pid);
  return null;
};
F.scoutEst = (st, tid, p) => {
  const s = tid != null ? F.scState(st, tid) : null; const prog = s ? (s.prog[p.id] || 0) : 0;
  const c = tid != null ? F.coachOf(st, tid, 'sct') : null; const ev = c ? c.r.eval : 45;
  const err = (1 - prog / 100) * (1.35 - ev / 100);
  return { pot: clamp(Math.round(p.pt + (p.nz || 0) * err), 30, 99), ovr: clamp(Math.round(p.o + (p.nzo || 0) * err), 20, 99), rng: Math.max(0, Math.round(10 * err)), prog: Math.round(prog) };
};
H.aiEval = (st, tid) => { const c = F.coachOf(st, tid, 'sct'); return 1.35 - (c ? c.r.eval : 50) / 100; };
function scoutDaily(st) {
  const pool = st.dc ? st.dc.pool : (st.draft && !st.draft.done ? st.draft.pool : null);
  for (const t of st.teams) {
    if (t.user == null) continue;
    const s = F.scState(st, t.id); const c = F.coachOf(st, t.id, 'sct'); const spd = c ? c.r.spd : 40;
    if (pool && s.pro == null) {
      for (const id of pool) {
        const p = st.players[id]; if (!p || p.tid !== -2) continue;
        let inc = 0.12;
        if (p.reg === s.reg) inc += (0.6 + spd / 100) * (c && c.pref === s.reg ? 1.5 : 1);
        if (s.focus.includes(p.id)) inc += 3.5 * spd / 70;
        s.prog[id] = Math.min(100, (s.prog[id] || 0) + inc);
      }
    } else if (pool) {
      for (const id of s.focus) { const p = st.players[id]; if (p && p.tid === -2) s.prog[id] = Math.min(100, (s.prog[id] || 0) + 3.5 * spd / 70); }
    }
    if (s.pro != null) s.proProg[s.pro] = Math.min(100, (s.proProg[s.pro] || 0) + 4.5 * spd / 70);
  }
}
F.proKnown = (st, tid, otherTid) => { if (tid == null || otherTid == null || otherTid < 0 || tid === otherTid) return 100; const s = F.scState(st, tid); return Math.round(s.proProg[otherTid] || 0); };
F.proPot = (st, tid, p) => { const k = F.proKnown(st, tid, p.tid); if (k >= 60) return { pot: p.pt, exact: true, k }; const h = ((p.id * 9301 + 49297) % 233280) / 233280 * 2 - 1; return { pot: clamp(Math.round(p.pt + h * 9 * (1 - k / 60)), p.o, 99), exact: false, k }; };

/* ---------------- trade hub ---------------- */
function teamStrength(st, t) { const a = active(st, t.id).sort((x, y) => y.o - x.o).slice(0, 26); return a.reduce((s, p) => s + p.o, 0) / Math.max(1, a.length); }
F.teamStrength = teamStrength;
F.strategy = (st, t) => {
  const strs = st.teams.map(x => [x.id, teamStrength(st, x)]).sort((a, b) => b[1] - a[1]);
  const rank = strs.findIndex(x => x[0] === t.id) + 1;
  const gp = t.w + t.l, pct = t.w / Math.max(1, gp);
  if (st.phase !== 'regular' || gp < 20) return rank <= 10 ? 'Contender' : rank >= 21 ? 'Rebuilding' : 'Middle';
  if (pct >= 0.54 || (pct >= 0.5 && rank <= 10)) return 'Contender';
  if (pct < 0.45 && rank >= 12) return 'Rebuilding';
  return 'Middle';
};
let _lgAvg = null, _lgAvgKey = '';
function leagueAvg(st) {
  const key = st.season + '-' + st.day + '-' + st.phase + '-' + (st.ver || 0);
  if (_lgAvg && _lgAvgKey === key) return _lgAvg;
  const pos = {}, cnt = {}; let sp = 0, spn = 0, rp = 0, rpn = 0;
  for (const t of st.teams) {
    const lu = (t.lu && t.lu.length === 9) ? t.lu : F.autoLineup(st, t);
    for (const s of lu) { const p = st.players[s.id]; if (!p) continue; pos[s.pos] = (pos[s.pos] || 0) + F.ovrAt(p, s.pos); cnt[s.pos] = (cnt[s.pos] || 0) + 1; }
    (t.rot || []).forEach(id => { const p = st.players[id]; if (p) { sp += p.o; spn++; } });
    penPool(st, t).sort((a, b) => b.o - a.o).slice(0, 5).forEach(p => { rp += p.o; rpn++; });
  }
  const out = {}; for (const k in pos) out[k] = pos[k] / cnt[k]; out.SP = sp / Math.max(1, spn); out.RP = rp / Math.max(1, rpn);
  _lgAvg = out; _lgAvgKey = key; return out;
}
F.teamNeeds = (st, t) => {
  const avg = leagueAvg(st); const res = [];
  const lu = (t.lu && t.lu.length === 9) ? t.lu : F.autoLineup(st, t);
  for (const s of lu) { const p = st.players[s.id]; if (!p) continue; res.push({ pos: s.pos, gap: Math.round(F.ovrAt(p, s.pos) - avg[s.pos]), who: p.id }); }
  const rot = (t.rot || []).map(id => st.players[id]).filter(Boolean);
  res.push({ pos: 'SP', gap: Math.round(rot.reduce((s, p) => s + p.o, 0) / Math.max(1, rot.length) - avg.SP), who: null });
  const pen = penPool(st, t).sort((a, b) => b.o - a.o).slice(0, 5);
  res.push({ pos: 'RP', gap: Math.round(pen.reduce((s, p) => s + p.o, 0) / Math.max(1, pen.length) - avg.RP), who: null });
  return res.sort((a, b) => a.gap - b.gap);
};
F.needList = (st, t) => F.teamNeeds(st, t).filter(x => x.gap <= -3).map(x => x.pos);
F.untouchables = (st, t) => {
  if (t.user != null) return (t.unt || []).filter(id => st.players[id] && st.players[id].tid === t.id);
  const ps = teamPlayers(st, t.id);
  const young = ps.filter(p => p.a <= 27).sort((a, b) => pval(b) - pval(a)).slice(0, 2).map(p => p.id);
  const face = ps.sort((a, b) => b.o - a.o)[0];
  return [...new Set(young.concat(face ? [face.id] : []))];
};
const posFits = (p, needs) => needs.some(n => n === p.p || (n === 'RP' && p.p === 'RP') || (n === 'SP' && p.p === 'SP') || (['LF', 'CF', 'RF'].includes(n) && ['LF', 'CF', 'RF'].includes(p.p)) || (n === 'DH' && !isP(p)));
H.valFor = (st, toTid, p, recv) => {
  let v = pval(p); const t = st.teams[toTid]; if (!t || t.user != null) return v;
  const strat = F.strategy(st, t);
  if (recv) {
    if (strat === 'Rebuilding') v *= p.a <= 25 ? 1.15 : p.a >= 30 ? 0.8 : 1;
    if (strat === 'Contender') v *= (p.o >= 72 && p.lv === 0) ? 1.12 : (p.lv >= 1 && p.a <= 23) ? 0.9 : 1;
    if (posFits(p, F.needList(st, t))) v *= 1.1;
  } else if (F.untouchables(st, t).includes(p.id)) v *= 1.8;
  return Math.round(v * 10) / 10;
};
F.blockInterest = (st, pid, myTid) => {
  const p = st.players[pid]; if (!p) return [];
  const out = [];
  for (const t of st.teams) {
    if (t.id === myTid || t.user != null) continue;
    const strat = F.strategy(st, t); const needs = F.needList(st, t);
    let score = 0;
    if (posFits(p, needs)) score += 2;
    if (strat === 'Contender' && p.o >= 70 && p.lv === 0) score += 2;
    if (strat === 'Rebuilding' && p.a <= 25 && p.pt >= 70) score += 2;
    if (strat === 'Rebuilding' && p.a >= 30) score -= 2;
    const room = t.bud - F.payroll(st, t.id); if (p.sal > room + 5) score -= 2;
    if (score >= 2) out.push({ tid: t.id, score, strat, offer: F.makeOffer(st, t.id, pid) });
  }
  return out.filter(o => o.offer.length).sort((a, b) => b.score - a.score).slice(0, 5);
};
F.makeOffer = (st, aiTid, pid) => {
  const p = st.players[pid]; const t = st.teams[aiTid]; const strat = F.strategy(st, t);
  const target = H.valFor(st, aiTid, p, true) * rf(0.88, 0.98);
  const unt = new Set(F.untouchables(st, t));
  let cand = teamPlayers(st, aiTid).filter(x => !unt.has(x.id));
  if (strat === 'Contender') cand.sort((a, b) => (b.lv - a.lv) || (a.a - b.a)); else if (strat === 'Rebuilding') cand.sort((a, b) => b.a - a.a); else cand.sort(() => rnd() - .5);
  const pickd = []; let tot = 0;
  for (let i = 0; i < 3 && tot < target * 0.9; i++) {
    const rem = target - tot;
    const c = cand.filter(x => !pickd.includes(x.id) && pval(x) <= rem * 1.05).sort((a, b) => pval(b) - pval(a))[0];
    if (!c) break; pickd.push(c.id); tot += pval(c);
  }
  return tot >= target * 0.75 ? pickd : [];
};
function rumorAdd(st, text, tid, pid) { st.rumors = st.rumors || []; st.rumors.unshift({ s: st.season, d: st.phase === 'regular' ? st.day : null, ph: st.phase, t: text, tid, pid }); if (st.rumors.length > 50) st.rumors.length = 50; }
function genRumors(st, n) {
  for (let i = 0; i < n; i++) {
    const t = pick(st.teams); const strat = F.strategy(st, t);
    const x = rnd();
    if (strat === 'Rebuilding' && x < 0.5) {
      const u = new Set(F.untouchables(st, t)); const v = teamPlayers(st, t.id).filter(p => p.lv === 0 && !u.has(p.id) && p.a >= 28 && p.o >= 70).sort((a, b) => b.o - a.o)[0];
      if (v) rumorAdd(st, `The ${t.name} are listening to offers on ${v.p} ${pname(v)} (${v.o} OVR, age ${v.a}).`, t.id, v.id);
    } else if (strat === 'Contender' && x < 0.7) {
      const needs = F.needList(st, t); if (!needs.length) continue;
      const need = pick(needs);
      const sellers = st.teams.filter(s => s.id !== t.id && F.strategy(st, s) !== 'Contender');
      const cands = sellers.flatMap(s => { const u = new Set(F.untouchables(st, s)); return teamPlayers(st, s.id).filter(p => p.lv === 0 && !u.has(p.id) && posFits(p, [need]) && p.o >= 70); }).sort((a, b) => b.o - a.o).slice(0, 8);
      const c = cands.length ? pick(cands) : null;
      if (c) rumorAdd(st, `Sources: the ${t.name} have checked in with the ${st.teams[c.tid].name} about ${pname(c)} to address their ${need} need.`, t.id, c.id);
      else rumorAdd(st, `The ${t.name} are in the market for ${need === 'SP' ? 'starting pitching' : need === 'RP' ? 'bullpen help' : 'help at ' + need}.`, t.id);
    } else if (x < 0.85) {
      const y = teamPlayers(st, t.id).filter(p => p.lv === 0 && p.a <= 26 && p.o >= 78 && p.y <= 2).sort((a, b) => b.o - a.o)[0];
      if (y) rumorAdd(st, `The ${t.name} have opened contract extension talks with ${pname(y)}.`, t.id, y.id);
    } else {
      const needs = F.needList(st, t); if (needs.length) rumorAdd(st, `Front-office chatter: the ${t.name} (${strat.toLowerCase()}) want upgrades at ${needs.slice(0, 2).join(' and ')}.`, t.id);
    }
  }
}
F.toggleList = (st, tid, key, pid, max) => {
  const t = st.teams[tid]; t[key] = (t[key] || []).filter(id => st.players[id]); pid = +pid;
  if (t[key].includes(pid)) t[key] = t[key].filter(x => x !== pid);
  else { if (t[key].length >= max) return `You can have at most ${max} players on this list.`; t[key].push(pid); }
  return null;
};


/* ---------------- GOAT meter ---------------- */
const REAL_TITLES = { NYY: 27, STL: 11, BOS: 9, ATH: 9, LAD: 9, SF: 8, PIT: 5, CIN: 5, DET: 4, ATL: 4, BAL: 3, CHC: 3, MIN: 3, CWS: 3, PHI: 2, CLE: 2, KC: 2, MIA: 2, NYM: 2, TOR: 2, HOU: 2, ARI: 1, LAA: 1, TEX: 1, WSH: 1, MIL: 1, SD: 0, SEA: 0, COL: 0, TB: 0 };
F.REAL_TITLES = REAL_TITLES;
function attachLegacy(st) {
  const L = G.REAL_LEGACY || {};
  for (const p of Object.values(st.players)) { if (p.leg === undefined) { const l = L[p.f + ' ' + p.l]; p.leg = l ? JSON.parse(JSON.stringify(l)) : 0; } }
}
const AWK = [['mvp', 'MVP', 7, '🏆'], ['cy', 'Cy Young', 6, '🔥'], ['ws', 'World Series title', 1.5, '💍'], ['wsmvp', 'World Series MVP', 2, '⭐'], ['roy', 'Rookie of the Year', 1.5, '🌱'], ['rel', 'Reliever of the Year', 2, '🔒'], ['as', 'All-Star', 1, '✨'], ['ss', 'Silver Slugger', 0.5, '🥈'], ['gg', 'Gold Glove', 0.5, '🧤'], ['asgmvp', 'All-Star Game MVP', 1, '🌟']];
F.AWK = AWK;
function awardsOf(p) {
  const a = Object.assign({}, (p.leg && p.leg.a) || {});
  for (const s of (p.aw || [])) {
    const k = /All-Star Game MVP/.test(s) ? 'asgmvp' : / MVP$/.test(s) ? 'mvp' : /Cy Young/.test(s) ? 'cy' : /Rookie of the Year/.test(s) ? 'roy' : /Reliever/.test(s) ? 'rel' : /All-Star$/.test(s) ? 'as' : /World Series Champion/.test(s) ? 'ws' : null;
    if (k) a[k] = (a[k] || 0) + 1;
  }
  return a;
}
const addArr = (x, y) => { if (!y) return x; if (!x) return y.slice(); return x.map((v, i) => v + (y[i] || 0)); };
function careerTotals(p) {
  let b = p.leg && p.leg.b ? p.leg.b.slice() : null, q = p.leg && p.leg.p ? p.leg.p.slice() : null;
  for (const c of (p.c || [])) { if (c.y <= 2026 || c.m) continue; b = addArr(b, c.b); q = addArr(q, c.p); }
  b = addArr(b, p.sb); q = addArr(q, p.sp);
  return { b, p: q };
}
function warOf(b, q, pos) {
  let v = 0;
  if (b && b[B.pa] > 0) { const l = F.batLine(b); v += (l.woba - 0.318) / 1.2 * l.pa / 10 + l.pa / 600 * 2 + ((F.POSADJ && F.POSADJ[pos]) || 0) * l.pa / 600 / 10 + (b[B.sb] - b[B.cs] * 2) * 0.02; }
  if (q && q[P.o] > 0) { const l = F.pitLine(q); v += (5.0 - l.fip * 0.6 - l.era * 0.4) * l.ip / 9 / 10 + q[P.sv] * 0.04; }
  return v;
}
const TIERS = [[90, 'GOAT Conversation', 't5'], [70, 'Inner-Circle Hall of Famer', 't5'], [55, 'Hall of Fame Track', 't4'], [38, 'All-Star Caliber Career', 't3'], [20, 'Solid Big Leaguer', 't2'], [0, 'Building a Résumé', '']];
F.goatTier = m => TIERS.find(t => m >= t[0]);
F.goatPlayer = (st, p) => {
  const tot = careerTotals(p); const war = warOf(tot.b, tot.p, p.p);
  const aw = awardsOf(p);
  let score = war;
  for (const [k, , w] of AWK) score += (aw[k] || 0) * w;
  const b = tot.b, q = tot.p; let mil = 0;
  if (b) mil += b[B.hr] / 100 * 2 + b[B.h] / 500 * 2 + b[B.sb] / 150;
  if (q) mil += q[P.w] / 50 * 2 + q[P.k] / 500 * 2 + q[P.sv] / 100 * 2;
  score += mil;
  const season = warOf(p.sb, p.sp, p.p) + (p.aw || []).filter(s => s.startsWith(st.season + ' ')).length;
  return { score: Math.round(score * 10) / 10, meter: Math.max(0, Math.min(100, Math.round(score / 1.45))), war: Math.round(war * 10) / 10, aw, season: Math.round(season * 10) / 10, tot };
};
F.goatTeam = (st, t) => {
  const th = t.th || [];
  const titles = th.filter(h => h.res === 'Won World Series').length, pennants = th.filter(h => /World Series/.test(h.res || '')).length, po = th.filter(h => h.res && h.res !== 'Missed playoffs').length;
  const w = th.reduce((s, h) => s + h.w, 0) + t.w, l = th.reduce((s, h) => s + h.l, 0) + t.l;
  const legacy = st.settings.real ? (REAL_TITLES[t.ab] || 0) : 0;
  const gp = t.w + t.l; const live = gp ? (t.w / gp - 0.5) * 30 : 0;
  const score = legacy * 2.5 + titles * 12 + (pennants - titles) * 5 + po * 2.5 + (w - l) / 12 + live;
  return { score: Math.round(score * 10) / 10, meter: Math.max(0, Math.min(100, Math.round(score / 0.9))), legacy, titles, pennants, po, w, l, seasons: th.length, live: Math.round(live * 10) / 10 };
};
function teamSeasonEnd(st) {
  for (const t of st.teams) {
    const po = st.po ? st.po.series.filter(s => s.hi === t.id || s.lo === t.id) : [];
    const deep = po.length ? Math.max(...po.map(s => s.r)) : -1;
    const res = st.po && st.po.champ === t.id ? 'Won World Series' : deep === 3 ? 'Lost World Series' : deep >= 0 ? 'Lost in ' + F.RN[deep] : 'Missed playoffs';
    (t.th || (t.th = [])).push({ y: st.season, w: t.w, l: t.l, res });
    if (st.po && st.po.champ === t.id) F.mlb(st, t.id).forEach(p => (p.aw || (p.aw = [])).push(st.season + ' World Series Champion'));
  }
}


/* ---------------- fantasy draft ---------------- */
const FD_ROUNDS = 26;
const FD_NEED = { C: 2, '1B': 1, '2B': 1, '3B': 1, SS: 1, OF: 4, SP: 5, RP: 7 };
const fdGroup = p => p.p === 'LF' || p.p === 'CF' || p.p === 'RF' ? 'OF' : p.p === 'DH' ? 'DH' : p.p;
F.fdStart = st => {
  const pool = [];
  for (const p of Object.values(st.players)) if (p.tid >= 0) { p.ftid = p.tid; p.tid = -3; p.lv = 0; pool.push(p.id); }
  const order = F.shuffle(st.teams.map(t => t.id));
  const picks = []; for (let r = 0; r < FD_ROUNDS; r++) (r % 2 ? order.slice().reverse() : order).forEach(t => picks.push(t));
  st.fd = { order, picks, i: 0, made: [], auto: {}, rounds: FD_ROUNDS };
  st.teams.forEach(t => { t.lu = null; t.rot = []; t.pen = null; t.cl = t.su = null; t.block = []; t.tgt = []; t.unt = []; });
  st.phase = 'fantasy';
  newsAdd(st, `Fantasy draft! Every player in baseball is up for grabs: ${FD_ROUNDS} snake rounds, then the rest of each organization fills in automatically.`);
};
F.fdPool = st => Object.values(st.players).filter(p => p.tid === -3);
F.fdTeamPicks = (st, tid) => st.fd.made.filter(m => m[0] === tid).map(m => st.players[m[1]]).filter(Boolean);
F.fdNeeds = (st, tid) => {
  const mine = F.fdTeamPicks(st, tid); const c = {};
  mine.forEach(p => { const g = fdGroup(p); c[g] = (c[g] || 0) + 1; });
  const need = {}; for (const g in FD_NEED) need[g] = Math.max(0, FD_NEED[g] - (c[g] || 0));
  return { have: c, need, n: mine.length };
};
function fdValue(p) { let v = p.o + (p.a <= 25 ? (p.pt - p.o) * 0.3 : 0) - (p.a >= 33 ? (p.a - 32) * 1.2 : 0); if (p.p === 'RP') v -= 5; return v; }
F.fdBest = (st, tid) => {
  const { need, n } = F.fdNeeds(st, tid);
  const left = FD_ROUNDS - n, deficit = Object.values(need).reduce((s, v) => s + v, 0);
  const pool = F.fdPool(st);
  let best = null, bv = -1e9;
  for (const p of pool) {
    const g = fdGroup(p); let v = fdValue(p) + gauss() * 1.5;
    if (need[g]) v += left <= deficit + 1 ? 40 : 4; else if (left <= deficit) v -= 60;
    if (g === 'DH' && n < 20 && p.o < 85) v -= 6;
    if (v > bv) { bv = v; best = p; }
  }
  return best;
};
F.fdPick = (st, tid, pid) => {
  const d = st.fd; if (!d || d.i >= d.picks.length) return 'The draft is over.';
  if (d.picks[d.i] !== tid) return 'Not your pick.';
  const p = st.players[pid]; if (!p || p.tid !== -3) return 'That player is already taken.';
  p.tid = tid; p.lv = 0; d.made.push([tid, pid]); d.i++;
  if (d.i <= 30 || st.teams[tid].user != null) txnAdd(st, `Fantasy draft R${Math.floor((d.i - 1) / 30) + 1} #${d.i}: ${st.teams[tid].ab} take ${p.p} ${pname(p)}`);
  if (d.i === 1) newsAdd(st, `The ${st.teams[tid].name} make ${pname(p)} the first overall pick of the fantasy draft.`, tid);
  return null;
};
F.fdAuto = (st, force) => {
  const d = st.fd; if (!d || d.paused) return;
  let f = force;
  while (d.i < d.picks.length) {
    const tid = d.picks[d.i];
    const human = st.teams[tid].user != null && !d.auto[tid];
    if (human && !f) break;
    const p = F.fdBest(st, tid); if (!p) break;
    F.fdPick(st, tid, p.id);
    if (f === 'one') f = false;
  }
  if (d.i >= d.picks.length) fdFinish(st);
};
function fdFinish(st) {
  const d = st.fd;
  // fill the rest of every organization automatically (snake by value)
  const rest = F.fdPool(st).sort((a, b) => fdValue(b) - fdValue(a));
  const order = d.order; let k = 0, dir = 1, i = 0;
  for (const p of rest) { p.tid = order[i]; i += dir; if (i >= order.length) { i = order.length - 1; dir = -1; } else if (i < 0) { i = 0; dir = 1; } k++; }
  for (const t of st.teams) {
    const minors = F.teamPlayers(st, t.id).filter(p => !d.made.some(m => m[1] === p.id)).sort((a, b) => b.o - a.o);
    minors.forEach((p, j) => { p.lv = st.settings.aa ? (j < 36 ? 1 : 2) : 1; });
    F.fixRoster(st, t); F.autoDepth(st, t); H.autoPen(st, t);
    const pay = F.payroll(st, t.id); if (pay + 8 > t.bud) t.bud = Math.round(pay + 8 + rf(0, 15));
  }
  for (const p of Object.values(st.players)) delete p.ftid;
  st.cen = F.computeCen(st); st.cen0 = Object.assign({}, st.cen);
  d.done = true; st.phase = 'regular';
  newsAdd(st, 'The fantasy draft is complete! Organizations are set — Opening Day awaits.');
}

/* ---------------- hooks ---------------- */
H.create = st => {
  st.coaches = {}; st.cNext = 1;
  st.teams.forEach(t => staffFor(st, t));
  for (let i = 0; i < 32; i++) { const c = newCoach(st, ROLES[i % ROLES.length][0]); c.ask = coachAsk(c); }
  st.asgTeams = { 30: { id: 30, ab: 'AL', name: 'All-Stars', city: 'American League', col: '#c8102e' }, 31: { id: 31, ab: 'NL', name: 'All-Stars', city: 'National League', col: '#1d4fa0' } };
  asgInit(st); genDraftClass(st); st.rumors = [];
  st.teams.forEach(t => H.autoPen(st, t));
  attachLegacy(st);
  genRumors(st, 4);
};
F.ensureExt = st => { // upgrade older saves
  if (!st.coaches) { st.coaches = {}; st.cNext = 1; st.teams.forEach(t => staffFor(st, t)); for (let i = 0; i < 32; i++) { const c = newCoach(st, ROLES[i % ROLES.length][0]); c.ask = coachAsk(c); } }
  if (!st.asgTeams) st.asgTeams = { 30: { id: 30, ab: 'AL', name: 'All-Stars', city: 'American League', col: '#c8102e' }, 31: { id: 31, ab: 'NL', name: 'All-Stars', city: 'National League', col: '#1d4fa0' } };
  if (!st.asg) asgInit(st);
  if (!st.dc && !st.draftDone && st.phase === 'regular') genDraftClass(st);
  if (!st.rumors) st.rumors = [];
  st.teams.forEach(t => { if (!t.pen) H.autoPen(st, t); });
  for (const p of Object.values(st.players)) if (!p.nat) p.nat = 'USA';
  if (st.settings.real) attachLegacy(st);
};
H.day = st => {
  for (const p of Object.values(st.players)) {
    if (p.tid < 0 || p.inj <= 0) continue;
    const tr = F.coachOf(st, p.tid, 'trn'); if (!tr) continue;
    if (rnd() < (tr.r.rec - 55) * 0.012 + (tr.pref === 'Rapid Rehab' ? 0.1 : 0)) p.inj = Math.max(0, p.inj - 1);
  }
  if (st.phase === 'regular') {
    if (st.day % 10 === 9) dynamicRatings(st);
    if (st.asg && st.asg.open && !st.asg.closed) asgDailyVotes(st);
    if (F.tradesOpen(st) && rnd() < 0.4) genRumors(st, ri(1, 2));
  }
  if (st.phase === 'regular' || st.phase === 'draft') scoutDaily(st);
};
H.after = st => {
  if (st.phase !== 'regular' && st.phase !== 'draft') return;
  const a = st.asg; if (!a) return;
  if (!a.open && st.day >= F.asgOpenDay(st)) asgOpen(st);
  if (a.open && !a.closed && st.day >= F.asgCloseDay(st)) asgSelect(st);
  if (!a.done && st.day >= F.asgDay(st) && st.phase === 'regular') asgPlay(st);
};
H.offseason = st => { teamSeasonEnd(st); coachSeasonEnd(st); coachOffseason(st); genRumors(st, 3); };
H.newSeason = st => {
  asgInit(st); genDraftClass(st);
  for (const p of Object.values(st.players)) { p.ws = null; p.trend = 0; p.td = 0; }
  if (st.sc) for (const k in st.sc) { st.sc[k].prog = {}; st.sc[k].focus = []; }
  st.teams.forEach(t => { if (t.user == null || t.auto) H.autoPen(st, t); else H.fixPen(st, t); });
};
F.dynamicRatings = dynamicRatings;
})(typeof window !== 'undefined' ? window : globalThis);
