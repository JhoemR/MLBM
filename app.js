/* Front Office Baseball — UI controller */
(function () {
'use strict';
const F = window.FR, S = window.Store;
const B = F.B, P = F.P;
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 20)));

const SELF = !!window.FOB_SELFHOST;
const App = {
  st: null, mode: null, id: null, view: 'home', vt: null, my: null, live: null, names: {},
  saveTimer: null, saving: false, unsub: null, tab: {}, trade: { partner: null, give: [], get: [] }, sort: {}, filt: {}, penMode: 'ask', liveSpeed: 'normal', aiTake: true,
  start: { saves: null, leagues: null, wizard: null }
};
window.App = App;

/* ---------------- formatting ---------------- */
const f3 = x => (x >= 1 ? x.toFixed(3) : x.toFixed(3).replace(/^0/, ''));
const f2 = x => x.toFixed(2);
const ipS = o => Math.floor(o / 3) + '.' + (o % 3);
const money = x => '$' + (+x).toFixed(1) + 'M';
const rc = v => v >= 85 ? 'r5' : v >= 75 ? 'r4' : v >= 65 ? 'r3' : v >= 55 ? 'r2' : 'r1';
const grade = v => v >= 90 ? 'A+' : v >= 85 ? 'A' : v >= 80 ? 'A-' : v >= 76 ? 'B+' : v >= 72 ? 'B' : v >= 68 ? 'B-' : v >= 64 ? 'C+' : v >= 60 ? 'C' : v >= 55 ? 'C-' : 'D';
const T = tid => App.st.teams[tid] || (App.st.asgTeams && App.st.asgTeams[tid]);
const PL = id => App.st.players[id];
const tb = (tid, big) => { const t = T(tid); return t ? `<span class="tb${big ? ' big' : ''}" style="--c:${t.col}">${t.ab}</span>` : '<span class="tb" style="--c:#555">FA</span>'; };
const natTag = n => n ? `<span class="natc" title="${esc(n)}">${F.natCode(n)} <span class="fl">${F.flag(n)}</span></span>` : '';
const plink = (p, short) => p ? `<a class="pl" data-act="player" data-id="${p.id}">${esc(short ? F.sname(p) : F.pname(p))}</a> ${natTag(p.nat)}` : '—';
const tlink = tid => `<a class="pl" data-act="team" data-id="${tid}">${esc(T(tid).city + ' ' + T(tid).name)}</a>`;
const rec = t => `${t.w}-${t.l}`;
const flag = p => p && p.nat ? `<span class="flag" title="${esc(p.nat)}">${F.flag(p.nat)}</span>` : '';
const trendTag = p => p && p.trend ? `<span class="trend ${p.trend > 0 ? 'up' : 'dn'}" title="Rating change this season">${p.trend > 0 ? '▲' : '▼'}${Math.abs(p.trend)}</span>` : '';
function potOf(p) { const my = myTid(); if (p.tid >= 0 && my != null && p.tid !== my && !canControl(p.tid)) { const k = F.proPot(App.st, my, p); return { v: k.pot, exact: k.exact }; } return { v: p.pt, exact: true }; }
const potTag = p => { const q = potOf(p); return `<span class="pot" title="${q.exact ? 'Potential' : 'Estimated — send your scout to this team for an accurate read'}">${q.exact ? '' : '~'}${grade(q.v)}</span>`; };
const injTag = p => p.inj > 0 ? `<span class="tag bad" title="Injured">${F.onIL(p) ? 'IL' : 'DTD'} ${p.inj}d</span>` : '';

function toast(msg, kind) {
  const el = document.createElement('div'); el.className = 'toast ' + (kind || ''); el.innerHTML = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3800); setTimeout(() => el.remove(), 4400);
}
function busy(on, text) { const b = $('#busy'); b.style.display = on ? 'flex' : 'none'; if (text) b.querySelector('span').textContent = text; }

/* ---------------- identity / permissions ---------------- */
function myTid() {
  const st = App.st; if (!st) return null;
  if (App.mode === 'shared') { const t = st.members[S.uid]; return t == null ? null : t; }
  const us = st.teams.filter(t => t.user != null);
  if (App.my == null || !us.find(t => t.id === App.my)) App.my = us.length ? us[0].id : 0;
  return App.my;
}
function canControl(tid) {
  const t = App.st.teams[tid]; if (!t) return false;
  if (App.mode === 'shared') return t.user === S.uid;
  return t.user != null;
}
const isCommish = () => App.mode !== 'shared' || App.st.commish === S.uid;
function members() { return Object.keys(App.st.members || {}); }
function canAdvance() {
  if (App.mode !== 'shared') return true;
  const st = App.st; if (st.commish === S.uid) return true;
  if (!(S.uid in st.members)) return false;
  if (st.settings.advance === 'any') return true;
  if (st.settings.advance === 'ready') return members().every(u => st.ready[u]);
  return false;
}
function uname(uid) { if (uid === S.uid) return 'You'; const n = App.st && App.st.nick && App.st.nick[uid]; return n || App.names[uid] || 'Manager'; }
const ARTIFACT_URL = 'https://claude.ai/artifact/AdLkLg8XjWmCD2k2mYpMTZ';
function inviteLink(lid) { const base = SELF ? (location.origin + location.pathname) : ARTIFACT_URL; return base + '#join-' + lid; }
async function resolveNames() {
  if (App.mode !== 'shared' || !App.st) return;
  const ids = [...new Set(members().concat(App.st.commish ? [App.st.commish] : []))].filter(id => !(id in App.names));
  if (!ids.length) return;
  const n = await S.names(ids); Object.assign(App.names, n); render();
}

/* ---------------- state mutation ---------------- */
async function act(fn, label) {
  if (!App.st) return;
  if (App.mode === 'local') {
    if (label) { busy(true, label); await nextFrame(); }
    let err;
    try { err = fn(App.st); } catch (e) { console.error(e); err = 'Something went wrong: ' + e.message; }
    if (label) busy(false);
    if (typeof err === 'string') toast(err, 'err'); else scheduleSave();
    render(); return err;
  }
  busy(true, label || 'Saving…'); await nextFrame();
  try {
    const r = await S.commitShared(App.id, App.st, fn);
    if (r.err) toast(r.err, 'err'); else App.st = r.st;
    return r.err;
  } catch (e) { console.error(e); toast(esc(e.message || 'Could not save.'), 'err'); return 'fail'; }
  finally { busy(false); render(); }
}
function scheduleSave() {
  clearTimeout(App.saveTimer); setSaveState('Unsaved…');
  App.saveTimer = setTimeout(saveNow, 1200);
}
async function saveNow() {
  if (App.mode !== 'local' || !App.st) return;
  if (App.saving) { scheduleSave(); return; }
  App.saving = true; setSaveState('Saving…');
  try {
    const st = App.st, t = T(myTid());
    await S.saveLocal(App.id, st, { name: st.name, team: t ? t.ab + ' ' + t.name : '', season: st.season, phase: st.phase, rec: t ? rec(t) : '' });
    setSaveState(S.hasCloud() ? 'Saved' : 'Saved in this browser');
  } catch (e) { console.error(e); setSaveState('Save failed'); toast(esc(e.message), 'err'); }
  App.saving = false;
}
function setSaveState(s) { const el = $('#savestate'); if (el) el.textContent = s; }

/* ---------------- start screen ---------------- */
async function loadStart() {
  App.start.saves = await S.listSaves();
  try { App.start.leagues = S.db ? await S.listLeagues() : null; } catch (e) { App.start.leagues = null; }
  if (App.start.leagues) {
    const ids = [...new Set(App.start.leagues.map(l => l.owner).filter(Boolean))];
    Object.assign(App.names, await S.names(ids.filter(i => !(i in App.names))));
  }
  render();
}
function contCard(kind, name, sub, act, id) {
  return `<section class="card contcard"><div><div class="kick">Continue where you left off · ${kind}</div><h2>${esc(name)}</h2><div class="muted sm">${sub}</div></div><button class="btn primary big" data-act="${act}" data-id="${esc(id)}">▶ Continue</button></section>`;
}
function ago(t) { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; }
function V_start() {
  const w = App.start.wizard;
  if (w) return V_wizard(w);
  const saves = App.start.saves, lgs = App.start.leagues;
  const last = getLast();
  let cont = '';
  if (last && last.mode === 'local' && saves && saves.find(x => x.id === last.id)) { const sv = saves.find(x => x.id === last.id); cont = contCard('Single player', sv.name, `${esc(sv.team || '')} · ${sv.season} · ${esc(phaseName(sv.phase))}`, 'openSave', sv.id); }
  else if (last && last.mode === 'shared' && lgs && lgs.find(x => x.id === last.id)) { const l = lgs.find(x => x.id === last.id); cont = contCard('Multiplayer league', l.name, `${l.season} · ${esc(phaseName(l.phase))} · ${Object.keys(l.teams || {}).length} managers`, 'openLeague', l.id); }
  const saveRows = saves == null ? '<p class="muted">Loading…</p>' : saves.length ? saves.map(s => `<div class="saverow"><div><b>${esc(s.name)}</b><div class="muted sm">${esc(s.team || '')} · ${s.season} · ${esc(phaseName(s.phase))}${s.rec ? ' · ' + esc(s.rec) : ''}</div></div><div class="row"><button class="btn" data-act="openSave" data-id="${esc(s.id)}">Continue</button><button class="btn ghost sm" data-act="delSave" data-id="${esc(s.id)}" title="Delete">✕</button></div></div>`).join('') : '<p class="muted">No saved franchises yet.</p>';
  let mp;
  if (!S.db) mp = SELF ? `<p class="bad">Couldn't connect to your Firebase project. Check the settings in <b>firebase-config.js</b> and that Anonymous sign-in and Firestore are turned on (see SETUP guide).</p>` : `<p class="muted">Multiplayer needs the published page opened while signed in to Claude, by someone the owner has invited as an Editor. Open this page from its claude.ai link to create or join shared leagues.</p>`;
  else if (lgs == null) mp = '<p class="muted">Loading leagues…</p>';
  else mp = (lgs.length ? lgs.sort((a, b) => b.updated - a.updated).map(l => {
    const mine = Object.values(l.teams || {}).includes(S.uid);
    const n = Object.keys(l.teams || {}).length;
    const own = l.owner === S.uid;
    const myT = Object.keys(l.teams || {}).find(k => l.teams[k] === S.uid);
    const tab = myT != null && window.REAL_TEAMS && REAL_TEAMS[myT] ? REAL_TEAMS[myT][2] : '';
    return `<div class="saverow${mine ? ' mine' : ''}"><div><b>${esc(l.name)}</b>${own ? ' <span class="tag">Commissioner</span>' : ''}<div class="muted sm">${own ? '' : 'Commissioner: ' + esc(App.names[l.owner] || 'Manager') + ' · '}${l.season} ${esc(phaseName(l.phase))} · ${n} manager${n === 1 ? '' : 's'}${mine ? ` · <span class="good">you manage${tab ? ' ' + esc(tab) : ' a team'}</span>` : ''}${l.updated ? ' · updated ' + esc(ago(l.updated)) : ''}</div></div>
     <div class="row"><button class="btn${mine ? ' primary' : ''}" data-act="openLeague" data-id="${esc(l.id)}">${mine ? '▶ Continue' : 'View / Join'}</button>${own ? `<button class="btn ghost sm" data-act="mgrMenu" data-id="${esc(l.id)}" title="Managers">👥 Managers</button><button class="btn ghost sm bad" data-act="delLeagueMenu" data-id="${esc(l.id)}" data-n="${esc(l.name)}" title="Delete league">🗑 Delete</button>` : mine ? `<button class="btn ghost sm" data-act="leaveMenu" data-id="${esc(l.id)}" data-n="${esc(l.name)}">Leave</button>` : ''}</div></div>`;
  }).join('') : '<p class="muted">No shared leagues yet. Create one and invite your friends.</p>') +
    (S.uid ? `<div class="row" style="margin-top:12px"><button class="btn primary" data-act="wizard" data-mode="shared">+ Create Multiplayer League</button><button class="btn ghost" data-act="refreshStart">↻ Refresh</button></div>` : '<p class="muted sm">Sign in to create a league.</p>');
  return `<div class="start">
  <div class="hero"><div class="logo">FRONT OFFICE<small>BASEBALL FRANCHISE</small></div>
  <p>Run a big-league club for as many seasons as you like: set lineups, manage games pitch by pitch, make trades, bid in free agency, scout the draft, and chase a title. Play solo or in a shared league with friends.</p><button class="btn ghost sm" data-act="tutMenu">📘 Tutorial</button></div>
  ${window.tutStartCard ? tutStartCard() : ''}
  ${cont}
  <div class="grid2">
    <section class="card"><h2>Single Player</h2>${saveRows}<div class="row" style="margin-top:12px"><button class="btn primary" data-act="wizard" data-mode="local">+ New Franchise</button><button class="btn ghost" data-act="importOpen">Import save</button></div>
    <p class="muted sm" style="margin-top:10px">${S.hasCloud() ? 'Saves are stored privately in your account.' : 'Saves are kept in this browser. Use Export in Settings to back up.'}</p></section>
    <section class="card"><h2>Multiplayer Leagues</h2>${mp}<p class="muted sm" style="margin-top:10px">Everyone in a league shares one universe: each friend claims a team, and the commissioner advances the calendar. ${SELF ? `Invite friends by sending them this page's web address — they pick a nickname and claim a team.${S.uid ? ` You're playing as <b>${esc(window.FOB_NAME ? window.FOB_NAME() : 'Manager')}</b> · <a class="pl" data-act="nick">change name</a>` : ''}` : 'To invite friends, the owner shares this page from claude.ai and adds each friend by email as an <b>Editor</b> (with no public link turned on).'}</p></section>
  </div></div>`;
}
function V_wizard(w) {
  const TL = w.real ? window.REAL_TEAMS : F.TEAMS;
  const teams = TL.map((d, i) => {
    const sel = w.teams.includes(i);
    return `<button class="teampick${sel ? ' sel' : ''}" data-act="wizTeam" data-id="${i}" style="--c:${d[3]}"><span class="tb" style="--c:${d[3]}">${d[2]}</span><span>${esc(d[0])}${d[1] ? '<br><b>' + esc(d[1]) + '</b>' : ''}</span><small>${F.LG[i < 15 ? 0 : 1]} ${F.DIVS[Math.floor((i % 15) / 5)]} · ${['', 'Small', 'Mid', 'Large'][d[4]]} market</small></button>`;
  }).join('');
  return `<div class="start"><section class="card wide">
  <h2>${w.mode === 'shared' ? 'Create Multiplayer League' : 'New Franchise'}</h2>
  <div class="form">
   <label>League name<input id="wName" value="${esc(w.name)}" maxlength="40"></label>
   <label>Players<select id="wReal" data-chg="wizReal"><option value="1"${w.real ? ' selected' : ''}>Real MLB teams & rosters</option><option value="0"${!w.real ? ' selected' : ''}>Fictional league (random players)</option></select></label>
   <label>League setup<select id="wFd"><option value="0"${!w.fd ? ' selected' : ''}>Keep real / default rosters</option><option value="1"${w.fd ? ' selected' : ''}>Fantasy draft (redraft every player)</option></select></label>
   <label>Season length<select id="wGames">${[162, 81, 54, 30].map(n => `<option value="${n}"${w.games == n ? ' selected' : ''}>${n} games</option>`).join('')}</select></label>
   <label>Trade AI difficulty<select id="wDiff">${['easy', 'normal', 'hard'].map(n => `<option${w.diff === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
   <label>Injuries<select id="wInj"><option value="1"${w.inj ? ' selected' : ''}>On</option><option value="0"${!w.inj ? ' selected' : ''}>Off</option></select></label>
   ${w.mode === 'shared' ? `<label>Who can advance the calendar<select id="wAdv"><option value="commish">Commissioner only</option><option value="ready">Anyone, once all managers are ready</option><option value="any">Any manager</option></select></label>` : ''}
  </div>
  <h3>${w.mode === 'shared' ? 'Pick your team' : 'Pick your team(s) — choose more than one for couch co-op'}</h3>
  <div class="teamgrid">${teams}</div>
  <div class="row" style="margin-top:16px"><button class="btn primary" data-act="wizGo">Start Franchise</button><button class="btn ghost" data-act="wizCancel">Cancel</button></div>
  </section></div>`;
}
function phaseName(ph) { return ({ fantasy: 'Fantasy Draft', regular: 'Regular Season', draft: 'Amateur Draft', playoffs: 'Postseason', offseason: 'Season Review', resign: 'Re-sign Players', fa: 'Free Agency', preseason: 'Preseason' })[ph] || ph || ''; }

/* ---------------- shell ---------------- */
const NAV = [['home', 'Home'], ['roster', 'Roster'], ['lineup', 'Lineup & Depth'], ['staff', 'Staff'], ['schedule', 'Schedule'], ['standings', 'Standings'], ['stats', 'Stats'], ['trades', 'Trades'], ['hub', 'Trade Hub'], ['fa', 'Free Agents'], ['scouting', 'Scouting'], ['draft', 'Draft'], ['allstar', 'All-Star'], ['playoffs', 'Postseason'], ['goat', 'GOAT Meter'], ['league', 'League'], ['settings', 'Settings']];
let _lastView = null;
function render() {
  const root = $('#app');
  const key = App.st ? (App.live ? 'live' : App.view + '|' + JSON.stringify(App.tab[App.view] || '')) : 'start';
  const same = key === _lastView;
  const sc = same ? [...root.querySelectorAll('.scroll,.pbp,.tplist')].map(e => [e.scrollTop, e.scrollLeft]) : null;
  const wy = same ? window.scrollY : 0;
  const ae = document.activeElement; const aeId = ae && ae.id; const sel = aeId && ae.selectionStart != null ? [ae.selectionStart, ae.selectionEnd] : null;
  _render(root);
  if (aeId) { const n = document.getElementById(aeId); if (n && n !== ae) { n.focus(); if (sel && n.setSelectionRange) try { n.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
  const mb = root.querySelector('#msgs'); if (mb && (!same || App._msgsScrollBottom)) { mb.scrollTop = mb.scrollHeight; App._msgsScrollBottom = false; }
  if (same && sc) { [...root.querySelectorAll('.scroll,.pbp,.tplist')].forEach((e, i) => { if (sc[i]) { e.scrollTop = sc[i][0]; e.scrollLeft = sc[i][1]; } }); if (Math.abs(window.scrollY - wy) > 2) window.scrollTo(0, wy); }
  else { const m = root.querySelector('main'); if (m) m.classList.add('enter'); }
  _lastView = key;
  if (!same && innerWidth <= 700) { const nv = root.querySelector('nav.side'), on = nv && nv.querySelector('a.on'); if (on) nv.scrollLeft = on.offsetLeft - (nv.clientWidth - on.offsetWidth) / 2; }
  if (App.tut && window.tutAfterRender) tutAfterRender();
}
function _render(root) {
  if (!App.st) { root.innerHTML = V_start(); return; }
  if (App.live) { root.innerHTML = shellTop() + `<main class="full">${V_live()}</main>`; return; }
  let v = App.view;
  if (App.st.phase === 'fantasy' && !['fantasy', 'staff', 'league', 'settings', 'inbox'].includes(v)) v = App.view = 'fantasy';
  const fn = { fantasy: V_fantasy, inbox: V_inbox, goat: V_goat, staff: V_staff, hub: V_hub, scouting: V_scouting, allstar: V_allstar, home: V_home, roster: V_roster, lineup: V_lineup, schedule: V_schedule, standings: V_standings, stats: V_stats, trades: V_trades, fa: V_fa, draft: V_draft, playoffs: V_playoffs, league: V_league, settings: V_settings, resign: V_resign }[v] || V_home;
  let body;
  try { body = fn(); } catch (e) { console.error(e); body = `<div class="card">Error rendering this page: ${esc(e.message)}</div>`; }
  const st = App.st, my = myTid();
  const badge = k => (k === 'trades' && st.offers.some(o => o.status === 'open' && canControl(o.to))) ? ' <i class="dot"></i>' :
    (k === 'draft' && st.phase === 'draft' && st.draft && canControl(st.draft.picks[st.draft.i])) ? ' <i class="dot"></i>' :
      (k === 'fa' && st.phase === 'fa') ? ' <i class="dot"></i>' : (k === 'inbox' && unreadCount() ? ` <i class="ub">${unreadCount()}</i>` : '') || (k === 'fantasy' && st.fd && !st.fd.done && canControl(st.fd.picks[st.fd.i]) ? ' <i class="dot"></i>' : '');
  const navList = st.phase === 'fantasy' ? [['fantasy', 'Fantasy Draft'], ['staff', 'Staff'], ['league', 'League'], ['settings', 'Settings']] : NAV.concat(st.phase === 'resign' ? [['resign', 'Re-sign']] : []);
  if (App.mode === 'shared') navList.splice(1, 0, ['inbox', 'Inbox']);
  const nav = navList.map(([k, l]) => `<a class="${v === k ? 'on' : ''}" data-act="nav" data-v="${k}">${l}${badge(k)}</a>`).join('');
  root.innerHTML = shellTop() + `<div class="layout"><nav class="side">${nav}</nav><main>${body}</main></div>`;
  void my;
}
function shellTop() {
  const st = App.st, my = myTid(), t = my != null ? T(my) : null;
  const us = App.mode === 'local' ? st.teams.filter(x => x.user != null) : [];
  const sw = us.length > 1 ? `<select data-chg="switchTeam" class="sw">${us.map(x => `<option value="${x.id}"${x.id === my ? ' selected' : ''}>${x.ab} ${esc(x.name)}</option>`).join('')}</select>` : '';
  const date = st.phase === 'regular' ? `${F.dayLabel(st)} · Day ${st.day + 1}/${st.sched.length}` : phaseName(st.phase);
  return `<header class="top">
  <div class="brand" data-act="home" title="Back to main menu">FO<span>B</span></div>
  <button class="btn ghost sm menub" data-act="home" title="Return to main menu">⌂<span> Main Menu</span></button>
  <div class="lg"><b>${esc(st.name)}</b><span class="muted">${st.season} · ${esc(date)}</span></div>
  ${t ? `<div class="myteam">${tb(t.id, true)}<div><b>${esc(t.name)}</b><span class="muted">${rec(t)}${st.phase === 'regular' ? ' · ' + gbText(t) : ''}</span></div>${sw}</div>` : `<div class="myteam muted">Spectating</div>`}
  <div class="adv">${App.live ? '' : advControls()}</div>
  ${App.mode === 'shared' ? `<button class="btn ghost sm mgrb" data-act="mgrOpen" title="Managers">👥<span> ${members().length}</span></button>` : ''}
  <button class="btn ghost sm tutq" data-act="tutMenu" title="Tutorial / help">?</button>
  <div class="sv"><span id="savestate" class="muted sm">${App.mode === 'shared' ? 'Shared league' : ''}</span></div>
  </header>`;
}
function managersCard() {
  const st = App.st, c = isCommish();
  const rows = members().map(u => `<tr><td class="l"><b>${esc(uname(u))}</b>${u === st.commish ? ' <span class="tag">Commissioner</span>' : ''}${u === S.uid ? ' <span class="muted sm">(you)</span>' : ''}</td><td>${tb(st.members[u])}</td><td>${st.ready && st.ready[u] ? '<span class="good sm">Ready</span>' : '<span class="muted sm">—</span>'}</td><td class="r">${c && u !== S.uid ? `<button class="mini bad ghost" data-act="kick" data-id="${esc(u)}">Remove manager</button>` : ''}${u === S.uid && u !== st.commish ? `<button class="mini ghost" data-act="leave">Leave league</button>` : ''}</td></tr>`).join('');
  return `<section class="card"><h3>Managers</h3>${c ? '<p class="muted sm">As commissioner you can remove a manager. Their team goes back to AI control and opens up for someone else to claim.</p>' : ''}<div class="scroll"><table class="t mgr-t"><tr><th class="l">Manager</th><th>Team</th><th>Status</th><th></th></tr>${rows}</table></div>
   ${inviteBox()}<p class="muted sm">${SELF ? 'Invite friends by sending them this website\'s address. They choose a nickname, open Multiplayer and claim a team.' : 'Invite friends from claude.ai: Share → add each friend by email as <b>Editor</b> (no public link). They open it, choose Multiplayer, and claim a team.'}</p></section>`;
}
function gbText(t) {
  const div = App.st.teams.filter(x => x.lg === t.lg && x.div === t.div).sort((a, b) => F.pct(b) - F.pct(a));
  const lead = div[0]; const gb = ((lead.w - t.w) + (t.l - lead.l)) / 2;
  return gb === 0 ? '1st ' + F.DIVS[t.div] : gb + ' GB';
}
function advControls() {
  const st = App.st, ph = st.phase;
  const can = canAdvance();
  const my = myTid();
  let readyBtn = '';
  if (App.mode === 'shared' && S.uid in st.members) {
    const r = !!st.ready[S.uid]; const n = members().filter(u => st.ready[u]).length;
    readyBtn = `<button class="btn ${r ? 'good' : 'ghost'}" data-act="ready">${r ? '✓ Ready' : 'Mark Ready'} <small>${n}/${members().length}</small></button>`;
  }
  const dis = can ? '' : ' disabled title="Waiting for the commissioner (or for everyone to be ready)"';
  if (ph === 'regular' || ph === 'playoffs') {
    const play = my != null && myGameToday() ? `<button class="btn primary" data-act="playLive">▶ Play Game</button>` : '';
    const opts = ph === 'regular'
      ? [['day', 'Sim Day'], ['week', 'Sim Week'], ['month', 'Sim Month'], ...(!st.draftDone ? [['draft', 'Sim to Draft']] : []), ...(st.asg && !st.asg.done ? [['asg', 'Sim to All-Star Game']] : []), ...(st.day < F.deadlineDay(st) ? [['deadline', 'Sim to Trade Deadline']] : []), ['season', 'Sim to End of Season']]
      : [['day', 'Sim Day'], ['round', 'Sim Round'], ['playoffs', 'Sim Postseason']];
    return `${readyBtn}${play}<button class="btn" data-act="sim" data-k="${opts[0][0]}"${dis}>${opts[0][1]}</button><select class="simsel" data-chg="simSel"${dis}><option value="">More…</option>${opts.slice(1).map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`;
  }
  if (ph === 'fantasy') {
    const ot = st.fd.picks[st.fd.i];
    return `${readyBtn}<button class="btn primary" data-act="nav" data-v="fantasy">Fantasy Draft: ${tb(ot)} on the clock</button>${App.mode === 'shared' && isCommish() && T(ot).user && !canControl(ot) ? `<button class="btn" data-act="fdForce">Auto-pick for them</button>` : ''}`;
  }
  if (ph === 'draft') {
    const d = st.draft; const ot = d.picks[d.i];
    return `${readyBtn}<button class="btn primary" data-act="nav" data-v="draft">Draft: ${tb(ot)} on the clock</button>${App.mode === 'shared' && isCommish() && T(ot).user ? `<button class="btn" data-act="draftForce">Auto-pick for them</button>` : ''}`;
  }
  const label = { offseason: 'Continue to Re-signing →', resign: 'Finish Re-signing →', fa: `Next FA Day (${st.fa ? st.fa.day + 1 : 1}/6) →`, preseason: `Start ${st.season + 1} Season →` }[ph];
  return `${readyBtn}<button class="btn primary" data-act="sim" data-k="phase"${dis}>${label}</button>`;
}
function myGameToday() {
  const st = App.st, my = myTid(); if (my == null) return null;
  if (st.phase === 'regular') { const day = st.sched[st.day]; if (!day) return null; const i = day.findIndex(g => g[0] === my || g[1] === my); if (i < 0 || day[i][2] != null) return null; return { type: 'reg', day: st.day, idx: i, h: day[i][0], a: day[i][1] }; }
  if (st.phase === 'playoffs' && st.po) {
    const si = st.po.series.findIndex(s => s.r === st.po.round && s.win == null && (s.hi === my || s.lo === my));
    if (si < 0) return null; const s = st.po.series[si]; if (s.pending) return null;
    const n = s.wh + s.wl; const hh = F.homeIsHi(s.best, n);
    return { type: 'po', sidx: si, n: s.g.length, h: hh ? s.hi : s.lo, a: hh ? s.lo : s.hi };
  }
  return null;
}

/* ---------------- HOME ---------------- */
function V_home() {
  const st = App.st, my = myTid();
  if (my == null) return V_spectate();
  const t = T(my);
  const parts = [];
  // next game
  const g = myGameToday();
  if (g) {
    const opp = g.h === my ? g.a : g.h; const sideH = g.h === my;
    const spM = F.prepSide(st, my).sp, spO = F.prepSide(st, opp).sp;
    const ser = g.type === 'po' ? st.po.series[g.sidx] : null;
    parts.push(`<section class="card next"><div class="kick">${g.type === 'po' ? `${F.RN[ser.r]} · Game ${ser.wh + ser.wl + 1} · Series ${ser.hi === my ? ser.wh : ser.wl}-${ser.hi === my ? ser.wl : ser.wh}` : 'Today · ' + F.dayLabel(st)}</div>
    <div class="matchup"><div>${tb(g.a, true)}<b>${esc(T(g.a).name)}</b><span class="muted">${rec(T(g.a))}</span></div><div class="at">@</div><div>${tb(g.h, true)}<b>${esc(T(g.h).name)}</b><span class="muted">${rec(T(g.h))}</span></div></div>
    <div class="probables"><span>Your SP: ${plink(PL(spM))} ${pitchSum(PL(spM))}</span><span>Their SP: ${plink(PL(spO))} ${pitchSum(PL(spO))}</span></div>
    <div class="row"><button class="btn primary" data-act="playLive">▶ Play / Manage Game</button>${sideH ? '' : ''}<span class="muted sm">Or sim the day from the top bar.</span></div></section>`);
  } else if (st.phase === 'regular' && st.sched[st.day]) {
    parts.push(`<section class="card next"><div class="kick">Today</div><p>Your game today is final. ${canAdvance() ? 'Sim the day to move on.' : 'Waiting for the league to advance.'}</p></section>`);
  }
  // phase prompts
  if (st.phase === 'draft') parts.push(`<section class="card hi"><h3>The Amateur Draft is underway</h3><p>${canControl(st.draft.picks[st.draft.i]) ? '<b>You are on the clock!</b>' : `${esc(T(st.draft.picks[st.draft.i]).name)} are on the clock.`}</p><button class="btn primary" data-act="nav" data-v="draft">Go to Draft Room</button></section>`);
  if (st.phase === 'offseason') parts.push(V_awardsCard());
  if (st.phase === 'resign') parts.push(`<section class="card hi"><h3>Re-sign your players</h3><p>Contracts are expiring. Choose who to keep before free agency opens.</p><button class="btn primary" data-act="nav" data-v="resign">Open Re-sign list</button></section>`);
  if (st.phase === 'fa') parts.push(`<section class="card hi"><h3>Free Agency — Day ${st.fa.day + 1} of 6</h3><p>Make offers. Players compare salary, years and team quality. Each day some sign.</p><button class="btn primary" data-act="nav" data-v="fa">Browse Free Agents</button></section>`);
  if (st.phase === 'preseason') parts.push(`<section class="card hi"><h3>Preseason</h3><p>Set your lineup and rotation, then start the ${st.season + 1} season. Remaining free agents can still be signed at their asking price.</p></section>`);
  // offers
  const inc = st.offers.filter(o => o.status === 'open' && canControl(o.to));
  if (inc.length) parts.push(`<section class="card hi"><h3>${inc.length} trade offer${inc.length > 1 ? 's' : ''} waiting</h3><button class="btn" data-act="nav" data-v="trades">Review</button></section>`);
  // team snapshot
  const pay = F.payroll(st, my);
  const last = recentGames(my, 6);
  parts.push(`<section class="card"><h3>${esc(F.tname(t))}</h3><div class="kpis">
    <div><small>Record</small><b>${rec(t)}</b></div><div><small>Run diff</small><b class="${t.rs - t.ra >= 0 ? 'good' : 'bad'}">${t.rs - t.ra >= 0 ? '+' : ''}${t.rs - t.ra}</b></div>
    <div><small>Streak</small><b>${t.strk > 0 ? 'W' + t.strk : t.strk < 0 ? 'L' + (-t.strk) : '—'}</b></div><div><small>Last 10</small><b>${t.l10.filter(x => x).length}-${t.l10.filter(x => !x).length}</b></div>
    <div><small>Payroll</small><b>${money(pay)}</b></div><div><small>Budget</small><b>${money(t.bud)}</b></div></div>
    ${last.length ? `<div class="recent">${last.map(r => `<a class="res ${r.w ? 'w' : 'l'}" ${r.id ? `data-act="box" data-id="${r.id}"` : ''}>${r.w ? 'W' : 'L'} ${r.my}-${r.op} ${r.home ? 'vs' : '@'} ${T(r.opp).ab}</a>`).join('')}</div>` : ''}
  </section>`);
  parts.push(`<section class="card">${divTable(t.lg, t.div, true)}</section>`);
  parts.push(`<section class="card"><h3>League Leaders</h3>${miniLeaders()}</section>`);
  if (App.mode === 'shared') parts.push(V_members());
  parts.push(`<section class="card span2"><h3>News</h3>${newsList(st.news.slice(0, 14))}</section>`);
  return `<div class="dash">${parts.join('')}</div>`;
}
function inviteBox() {
  if (App.mode !== 'shared') return '';
  const open = App.st.teams.filter(t => !t.user).length;
  return `<div class="invite"><b>🔗 Invite link</b> <span class="muted sm">${open} teams open</span><div class="row"><input id="invUrl" readonly value="${esc(inviteLink(App.id))}"><button class="btn sm" data-act="copyInv">Copy</button></div>
  <p class="muted sm">${SELF ? 'Send this to friends — they open it, pick a nickname and claim a team.' : 'Friends who open this link land straight on the join screen to pick a nickname and team. They still need to be signed in to Claude and invited by email as an Editor from the Share menu.'}</p></div>`;
}
function V_spectate() {
  const st = App.st;
  const open = st.teams.filter(t => !t.user);
  return `<section class="card hi"><h2>Join ${esc(st.name)}</h2><p>You've been invited! Pick a nickname and claim an open team.</p>
  ${S.uid ? `<label class="lrow" style="grid-template-columns:90px 1fr"><span>Nickname</span><input id="joinNick" data-inp="nick" maxlength="24" placeholder="e.g. Jho" value="${esc(App.joinNick || (window.FOB_NAME ? window.FOB_NAME() : ''))}"></label>
  <p class="muted sm">${st.phase === 'fantasy' ? 'This league uses a fantasy draft — you\'ll draft your roster once the commissioner starts it.' : 'You take over the team\'s real roster.'}</p><div class="teamgrid">${open.map(t => `<button class="teampick" data-act="claim" data-id="${t.id}" style="--c:${t.col}">${tb(t.id)}<span>${esc(t.city)}<br><b>${esc(t.name)}</b></span><small>${rec(t)}</small></button>`).join('')}</div>` : '<p class="muted">Sign in to claim a team.</p>'}
  </section>${V_members()}<section class="card"><h3>News</h3>${newsList(st.news.slice(0, 20))}</section>`;
}
function V_members() {
  const st = App.st;
  const rows = members().map(u => `<tr><td>${esc(uname(u))}${st.commish === u ? ' <span class="tag">Commish</span>' : ''}</td><td>${tb(st.members[u])} ${esc(T(st.members[u]).name)}</td><td>${rec(T(st.members[u]))}</td><td>${st.ready[u] ? '<span class="good">Ready</span>' : '<span class="muted">—</span>'}</td></tr>`).join('');
  return `<section class="card"><h3>Managers</h3><table class="t"><tr><th>Manager</th><th>Team</th><th>Rec</th><th>Status</th></tr>${rows || '<tr><td colspan=4 class="muted">No managers yet</td></tr>'}</table>${inviteBox()}
  <p class="muted sm">Advance: ${({ commish: 'commissioner only', ready: 'anyone once all are ready', any: 'any manager' })[st.settings.advance]}</p></section>`;
}
function V_awardsCard() {
  const st = App.st; const h = st.history[0];
  if (!h || h.y !== st.season) return '';
  return `<section class="card hi span2"><h3>🏆 ${st.season} Champions: ${esc(h.champ)}</h3><p class="muted">Runner-up: ${esc(h.ru)}</p>
  <div class="awards">${h.aw.map(a => `<div><small>${esc(a[0])}</small><b>${esc(a[1])}</b></div>`).join('')}</div>
  <p>Advance to begin the offseason: players age and develop, veterans retire, and contracts expire.</p></section>`;
}
function pitchSum(p) { if (!p) return ''; const l = p.sp ? F.pitLine(p.sp) : null; return `<span class="muted sm">${p.t}HP · ${p.o} OVR${l ? ` · ${p.sp[P.w]}-${p.sp[P.l]}, ${f2(l.era)} ERA` : ''} · ⚡${Math.round(p.e)}</span>`; }
function recentGames(tid, n) {
  const st = App.st, out = [];
  for (let d = Math.min(st.day, st.sched.length - 1); d >= 0 && out.length < n; d--) {
    for (const g of st.sched[d]) if ((g[0] === tid || g[1] === tid) && g[2] != null) {
      const home = g[0] === tid; const my = home ? g[2] : g[3], op = home ? g[3] : g[2];
      out.push({ w: my > op, my, op, home, opp: home ? g[1] : g[0], id: g[4] });
    }
  }
  return out;
}
function newsList(items) {
  if (!items.length) return '<p class="muted">No news yet.</p>';
  return `<ul class="news">${items.map(n => `<li><small>${n.s}${n.d != null ? ' · ' + F.dayLabel(App.st, n.d) : ' · ' + phaseName(n.ph)}</small>${n.t}</li>`).join('')}</ul>`;
}
function miniLeaders() {
  const st = App.st; const g = Math.max(1, avgGames());
  const hit = Object.values(st.players).filter(p => p.tid >= 0 && p.sb && p.sb[B.pa] >= g * 3.1);
  const allH = Object.values(st.players).filter(p => p.tid >= 0 && p.sb);
  const pit = Object.values(st.players).filter(p => p.tid >= 0 && p.sp && p.sp[P.o] >= g * 3);
  const allP = Object.values(st.players).filter(p => p.tid >= 0 && p.sp);
  const top = (arr, f, asc) => arr.slice().sort((a, b) => asc ? f(a) - f(b) : f(b) - f(a))[0];
  const cell = (lab, p, v) => `<div><small>${lab}</small>${p ? `${plink(p, true)} ${tb(p.tid)}<b>${v(p)}</b>` : '<span class="muted">—</span>'}</div>`;
  return `<div class="leaders">
  ${cell('AVG', top(hit, p => F.batLine(p.sb).avg), p => f3(F.batLine(p.sb).avg))}
  ${cell('HR', top(allH, p => p.sb[B.hr]), p => p.sb[B.hr])}
  ${cell('RBI', top(allH, p => p.sb[B.rbi]), p => p.sb[B.rbi])}
  ${cell('ERA', top(pit, p => F.pitLine(p.sp).era, true), p => f2(F.pitLine(p.sp).era))}
  ${cell('K', top(allP, p => p.sp[P.k]), p => p.sp[P.k])}
  ${cell('SV', top(allP, p => p.sp[P.sv]), p => p.sp[P.sv])}</div>`;
}
function avgGames() { return App.st.teams.reduce((s, t) => s + t.w + t.l, 0) / 30; }

/* ---------------- ROSTER ---------------- */
function teamSelect(cur, chg) { return `<select data-chg="${chg || 'viewTeam'}">${App.st.teams.map(t => `<option value="${t.id}"${t.id === cur ? ' selected' : ''}>${t.ab} — ${esc(t.city)} ${esc(t.name)}${t.user ? ' ★' : ''}</option>`).join('')}</select>`; }
function viewTeam() { if (App.vt == null) App.vt = myTid() != null ? myTid() : 0; return App.vt; }
const LVN = ['MLB', 'AAA', 'AA'];
const maxLv = () => App.st.settings.aa ? 2 : 1;
const POS_ORDER = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'];
F.POS_ORDER_IDX = x => -POS_ORDER.indexOf(x);
function V_roster() {
  const st = App.st, tid = viewTeam(), t = T(tid), mine = canControl(tid);
  const all = F.teamPlayers(st, tid).sort((a, b) => POS_ORDER.indexOf(a.p) - POS_ORDER.indexOf(b.p) || b.o - a.o);
  const act = all.filter(p => p.lv === 0 && !F.onIL(p)), il = all.filter(p => p.lv === 0 && F.onIL(p)), aaa = all.filter(p => p.lv === 1), aa = all.filter(p => p.lv === 2);
  const hitA = act.filter(p => !F.isP(p)).length, pitA = act.filter(F.isP).length;
  const tab = App.tab.roster || 'mlb';
  const list = tab === 'mlb' ? act : tab === 'aaa' ? aaa : tab === 'aa' ? aa : il;
  const affName = tab === 'aaa' && t.aff && t.aff.aaa ? t.aff.aaa[0] : tab === 'aa' && t.aff && t.aff.aa ? t.aff.aa[0] : '';
  const hit = list.filter(p => !F.isP(p)), pit = list.filter(F.isP);
  return `<div class="pagehead"><h2>${tb(tid, true)} ${esc(F.tname(t))} Roster</h2>${teamSelect(tid)}</div>
  <div class="kpis small"><div><small>Active</small><b class="${act.length > 26 ? 'bad' : ''}">${act.length}/26</b></div><div><small>Hitters / Pitchers</small><b>${hitA} / ${pitA}</b></div><div><small>Injured list</small><b>${il.length}</b></div><div><small>AAA / AA</small><b>${aaa.length} / ${aa.length}</b></div><div><small>Total (${App.st.settings.aa ? 110 : 44} max)</small><b>${all.length}</b></div><div><small>Payroll / Budget</small><b>${money(F.payroll(st, tid))} / ${money(t.bud)}</b></div></div>
  <div class="tabs">${[['mlb', `MLB Active (${act.length})`], ['aaa', `AAA (${aaa.length})`], ...(aa.length || App.st.settings.aa ? [['aa', `AA (${aa.length})`]] : []), ['il', `Injured List (${il.length})`]].map(([k, l]) => `<a class="${tab === k ? 'on' : ''}" data-act="tab" data-g="roster" data-v="${k}">${l}</a>`).join('')}</div>
  ${affName ? `<p><b>${esc(affName)}</b> <span class="muted sm">· ${(() => { const r = (t.mrec || {})[tab === 'aaa' ? 1 : 2]; return r ? `${r[0]}-${r[1]} this season · ` : ''; })()}stats below are this season's minor league games</span></p>` : ''}
  <p class="muted sm">Click any column header to sort. ± is how much a player's overall has moved this season based on performance.</p>
  ${mine ? `<p class="muted sm">Click ▲/▼ to call up or option players. Max 26 active and 13 pitchers. Players on the IL (10+ days) don't count toward 26.</p>` : ''}
  <div class="card flush">${rosterTable(hit, false, mine, tab)}</div><div class="card flush">${rosterTable(pit, true, mine, tab)}</div>`;
}
function rosterTable(list, pit, mine, tab) {
  if (!list.length) return `<p class="muted pad">No ${pit ? 'pitchers' : 'position players'}.</p>`;
  const t = T(viewTeam());
  const roleOf = p => t && t.pen ? F.roleOf(t, p.id) : '';
  const MIN = tab === 'aaa' || tab === 'aa';
  const SB = p => MIN ? p.mb : p.sb, SPx = p => MIN ? p.mp : p.sp;
  const sb = (p, k) => SB(p) ? SB(p)[B[k]] : -1, sp = (p, k) => SPx(p) ? SPx(p)[P[k]] : -1;
  const cols = pit ? [
    ['Pos', p => F.POS_ORDER_IDX(p.p)], ['Name', p => p.l], ['Age', p => p.a], ['T', p => p.t], ['OVR', p => p.o], ['±', p => p.trend || 0], ['POT', p => p.pt],
    ['VEL', p => p.r.vel], ['CTL', p => p.r.ctl], ['BRK', p => p.r.brk], ['STA', p => p.r.sta], ['Role', p => roleOf(p)],
    ['W', p => sp(p, 'w')], ['L', p => sp(p, 'l')], ['ERA', p => SPx(p) ? -F.pitLine(SPx(p)).era : -99], ['IP', p => sp(p, 'o')], ['K', p => sp(p, 'k')], ['SV', p => sp(p, 'sv')], ['NRG', p => p.e], ['$', p => p.sal], ['Yrs', p => p.y]]
    : [['Pos', p => F.POS_ORDER_IDX(p.p)], ['Name', p => p.l], ['Age', p => p.a], ['B/T', p => p.b], ['OVR', p => p.o], ['±', p => p.trend || 0], ['POT', p => p.pt],
    ['CON', p => p.r.con], ['POW', p => p.r.pow], ['EYE', p => p.r.eye], ['SPD', p => p.r.spd], ['FLD', p => p.r.fld], ['ARM', p => p.r.arm],
    ['G', p => sb(p, 'g')], ['AVG', p => SB(p) ? F.batLine(SB(p)).avg : -1], ['HR', p => sb(p, 'hr')], ['RBI', p => sb(p, 'rbi')], ['SB', p => sb(p, 'sb')], ['OPS', p => SB(p) ? F.batLine(SB(p)).ops : -1], ['$', p => p.sal], ['Yrs', p => p.y]];
  const g = pit ? 'rosP' : 'rosH';
  const sk = App.sort[g], col = cols.find(c => c[0] === sk);
  let rows = list.slice();
  if (col) { const rev = App.sort[g + 'rev']; rows.sort((a, b) => { const x = col[1](a), y = col[1](b); const c = typeof x === 'string' ? x.localeCompare(y) : y - x; return rev ? -c : c; }); }
  const head = `<tr>${cols.map(c => `<th class="sort${c[0] === sk ? ' on' : ''}${c[0] === 'Name' ? ' l' : ''}" data-act="sort" data-g="${g}" data-k="${c[0]}" title="Sort">${c[0] === '$' ? 'Salary' : c[0]}</th>`).join('')}${mine ? '<th></th>' : ''}</tr>`;
  const body = rows.map(p => {
    let actb = '';
    if (mine) actb = `<td class="nw">${p.lv >= 1 ? `<button class="mini" data-act="move" data-id="${p.id}" data-to="${p.lv - 1}" title="Promote to ${LVN[p.lv - 1]}">▲</button>` : ''}${p.lv < maxLv() ? `<button class="mini" data-act="move" data-id="${p.id}" data-to="${p.lv + 1}" title="Send to ${LVN[p.lv + 1]}">▼</button>` : ''}<button class="mini ghost" data-act="tradeAdd" data-id="${p.id}" title="Add to trade">⇄</button></td>`;
    const st0 = '<td>—</td>';
    let stats;
    if (pit) { const q = SPx(p); const l = q ? F.pitLine(q) : null; stats = q ? `<td>${q[P.w]}</td><td>${q[P.l]}</td><td>${f2(l.era)}</td><td>${ipS(q[P.o])}</td><td>${q[P.k]}</td><td>${q[P.sv]}</td>` : st0.repeat(6); stats += `<td>${energy(p)}</td>`; }
    else { const q = SB(p); const l = q ? F.batLine(q) : null; stats = q ? `<td>${q[B.g]}</td><td>${f3(l.avg)}</td><td>${q[B.hr]}</td><td>${q[B.rbi]}</td><td>${q[B.sb]}</td><td>${f3(l.ops)}</td>` : st0.repeat(6); }
    const rk = pit ? ['vel', 'ctl', 'brk', 'sta'] : ['con', 'pow', 'eye', 'spd', 'fld', 'arm'];
    const role = pit ? `<td>${p.lv === 0 ? `<span class="tag">${roleOf(p) === 'MR' && (t.rot || []).includes(p.id) ? 'SP' + ((t.rot || []).indexOf(p.id) + 1) : roleOf(p)}</span>` : ''}</td>` : '';
    const sec = F.POS_ALL.filter(x => x !== p.p && F.famAt(p, x) >= 75); const secS = !pit && sec.length ? `<div class="muted sm">${sec.join(', ')}</div>` : '';
    return `<tr><td><b>${p.p}</b>${secS}${p.learn ? `<div class="sm" title="Training at ${p.learn}">🎯${p.learn}</div>` : ''}</td><td class="l">${plink(p)} ${injTag(p)}${p.rk && p.a <= 25 ? '<span class="tag">R</span>' : ''}</td><td>${p.a}</td><td>${pit ? p.t : p.b + '/' + p.t}</td><td><span class="ov ${rc(p.o)}">${p.o}</span></td><td>${trendTag(p)}</td><td>${potTag(p)}</td>${rk.map(k => `<td class="${rc(p.r[k])}t">${Math.round(p.r[k])}</td>`).join('')}${role}${stats}<td>${money(p.sal)}</td><td>${p.y}</td>${actb}</tr>`;
  }).join('');
  return `<div class="scroll"><table class="t">${head}${body}</table></div>`;
}

/* ---------------- PLAYER MODAL ---------------- */
function openPlayer(id) {
  const st = App.st, p = PL(id); if (!p) return;
  const pit = F.isP(p);
  const rk = pit ? [['vel', 'Velocity'], ['ctl', 'Control'], ['brk', 'Break'], ['sta', 'Stamina']] : [['con', 'Contact'], ['pow', 'Power'], ['eye', 'Eye / Discipline'], ['spd', 'Speed'], ['fld', 'Fielding'], ['arm', 'Arm']];
  const bars = rk.map(([k, l]) => `<div class="bar"><span>${l}</span><i><b class="${rc(p.r[k])}" style="width:${p.r[k]}%"></b></i><em>${Math.round(p.r[k])}</em></div>`).join('');
  const team = p.tid >= 0 ? `${tb(p.tid)} ${esc(F.tname(T(p.tid)))} · ${LVN[p.lv]}` : p.tid === -2 ? 'Draft prospect' : 'Free agent';
  const seasons = (p.c || []).slice().reverse().map(c => pit ? pitRow(c.y, c.t, c.p) : batRow(c.y, c.t, c.b)).join('');
  const affAb = p.tid >= 0 && T(p.tid).aff ? (p.lv === 2 && T(p.tid).aff.aa ? T(p.tid).aff.aa[1] + ' (AA)' : T(p.tid).aff.aaa ? T(p.tid).aff.aaa[1] + ' (AAA)' : 'MiLB') : 'MiLB';
  const cur = (pit ? (p.sp ? pitRow(st.season, p.tid >= 0 ? T(p.tid).ab : 'FA', p.sp, true) : '') : (p.sb ? batRow(st.season, p.tid >= 0 ? T(p.tid).ab : 'FA', p.sb, true) : '')) + (pit ? (p.mp ? pitRow(st.season, affAb, p.mp, true) : '') : (p.mb ? batRow(st.season, affAb, p.mb, true) : ''));
  const mineP = p.tid >= 0 && canControl(p.tid);
  const posList = pit ? ['SP', 'RP'] : F.POS_ALL;
  const famRows = posList.map(x => { const fm = Math.round(F.famAt(p, x)); return { x, fm }; }).sort((a, b) => b.fm - a.fm);
  const posR = `<h4 style="margin-top:12px">Positions & familiarity</h4><div class="fams">${famRows.map(({ x, fm }) => `<div class="fam${x === p.p ? ' pri' : ''}${p.learn === x ? ' tr' : ''}"><b>${x}</b><i><em style="width:${fm}%"></em></i><span>${x === p.p ? 'Primary' : fm}</span>${!pit ? `<small class="muted">${Math.round(F.ovrAt(p, x))}</small>` : ''}${mineP && x !== p.p ? `<span class="fbtns">${p.learn === x ? `<button class="mini on" data-act="train" data-id="${p.id}" data-pos="">Training ✓</button>` : `<button class="mini ghost" data-act="train" data-id="${p.id}" data-pos="${x}">Train</button>`}${fm >= 85 ? `<button class="mini" data-act="makePrimary" data-id="${p.id}" data-pos="${x}">Make primary</button>` : ''}</span>` : ''}</div>`).join('')}</div>
  <p class="muted sm">Familiarity grows each game a player is used at a position (faster when young). ${mineP ? 'Choose “Train” to have him practice there daily and play there in minor league games.' : ''}</p>`;
  const mine = p.tid >= 0 && canControl(p.tid);
  let actions = '';
  if (mine) actions = `<div class="row">${p.lv >= 1 ? `<button class="btn" data-act="move" data-id="${p.id}" data-to="${p.lv - 1}">Promote to ${LVN[p.lv - 1]}</button>` : ''}${p.lv < maxLv() ? `<button class="btn" data-act="move" data-id="${p.id}" data-to="${p.lv + 1}">Send to ${LVN[p.lv + 1]}</button>` : ''}<button class="btn ghost" data-act="tradeAdd" data-id="${p.id}">Add to trade</button><button class="btn bad ghost" data-act="release" data-id="${p.id}">Release</button></div>`;
  else if (p.tid >= 0 && myTid() != null) actions = `<div class="row"><button class="btn" data-act="tradeAdd" data-id="${p.id}">Trade for this player</button></div>`;
  else if (p.tid === -1 && myTid() != null) actions = `<div class="row"><button class="btn" data-act="nav" data-v="fa">Go to Free Agents</button></div>`;
  if (isCommish() && p.tid !== -2) actions += `<div class="row" style="margin-top:8px"><button class="btn ghost sm" data-act="editPlayer" data-id="${p.id}">✎ Edit player${App.mode === 'shared' ? ' (commissioner)' : ''}</button></div>`;
  const my0 = myTid();
  if (p.tid >= 0 && my0 != null) {
    const mt = T(my0); const onB = (mt.block || []).includes(p.id), onT = (mt.tgt || []).includes(p.id), onU = (mt.unt || []).includes(p.id);
    actions += mine ? `<div class="row" style="margin-top:8px"><button class="btn ghost sm${onB ? ' on' : ''}" data-act="lst" data-k="block" data-id="${p.id}">${onB ? '✓ On trade block' : '+ Trade block'}</button><button class="btn ghost sm${onU ? ' on' : ''}" data-act="lst" data-k="unt" data-id="${p.id}">${onU ? '🔒 Untouchable' : 'Mark untouchable'}</button></div>`
      : `<div class="row" style="margin-top:8px"><button class="btn ghost sm${onT ? ' on' : ''}" data-act="lst" data-k="tgt" data-id="${p.id}">${onT ? '✓ On target list' : '+ Target list'}</button></div>`;
  }
  let potShow;
  if (p.tid === -2) { const e = F.scoutEst(App.st, my0, p); potShow = e.prog >= 95 ? e.pot : '~' + e.pot; }
  else { const q = potOf(p); potShow = q.exact ? q.v : '~' + q.v; }
  modal(`<div class="pcard"><div class="phead"><div class="ovbig ${rc(p.o)}">${p.o}<small>OVR</small></div><div><h2>${esc(F.pname(p))} ${natTag(p.nat)} ${injTag(p)}</h2><div class="muted">${p.p} · Age ${p.a} · Bats ${p.b} / Throws ${p.t} · ${esc(p.nat || '')} ${trendTag(p)}</div>${p.tid === -2 ? `<div class="muted sm">${esc(p.sch || '')} · ${esc(p.reg || '')}</div>` : ''}<div>${team}</div></div><div class="ovbig pot">${grade(parseInt(String(potShow).replace('~', ''), 10))}<small>POT ${potShow}</small></div></div>
  <div class="grid2"><div>${bars}${posR}</div><div><div class="kpis small"><div><small>Salary</small><b>${money(p.sal)}</b></div><div><small>Years left</small><b>${p.y}</b></div><div><small>Trade value</small><b>${F.pval(p)}</b></div>${p.dr ? `<div><small>Drafted</small><b>${esc(p.dr)}</b></div>` : ''}</div>
  ${p.aw && p.aw.length ? `<div class="aw">${p.aw.map(a => `<span class="tag gold">🏅 ${esc(a)}</span>`).join('')}</div>` : ''}${actions}</div></div>
  <h3>Stats</h3><div class="scroll"><table class="t">${pit ? pitHead() : batHead()}${cur}${seasons || (!cur ? `<tr><td colspan=20 class="muted">No MLB stats yet.</td></tr>` : '')}</table></div></div>`);
}
const batHead = () => `<tr><th>Year</th><th>Tm</th><th>G</th><th>PA</th><th>AB</th><th>H</th><th>2B</th><th>3B</th><th>HR</th><th>R</th><th>RBI</th><th>BB</th><th>K</th><th>SB</th><th>AVG</th><th>OBP</th><th>SLG</th><th>OPS</th></tr>`;
const pitHead = () => `<tr><th>Year</th><th>Tm</th><th>G</th><th>GS</th><th>W</th><th>L</th><th>SV</th><th>IP</th><th>H</th><th>ER</th><th>BB</th><th>K</th><th>HR</th><th>ERA</th><th>WHIP</th><th>K/9</th></tr>`;
function batRow(y, t, a, cur) { if (!a) return ''; const l = F.batLine(a); return `<tr class="${cur ? 'cur' : ''}"><td>${y}</td><td>${t}</td><td>${a[B.g]}</td><td>${a[B.pa]}</td><td>${a[B.ab]}</td><td>${a[B.h]}</td><td>${a[B.d]}</td><td>${a[B.t]}</td><td>${a[B.hr]}</td><td>${a[B.r]}</td><td>${a[B.rbi]}</td><td>${a[B.bb]}</td><td>${a[B.k]}</td><td>${a[B.sb]}</td><td>${f3(l.avg)}</td><td>${f3(l.obp)}</td><td>${f3(l.slg)}</td><td>${f3(l.ops)}</td></tr>`; }
function pitRow(y, t, a, cur) { if (!a) return ''; const l = F.pitLine(a); return `<tr class="${cur ? 'cur' : ''}"><td>${y}</td><td>${t}</td><td>${a[P.g]}</td><td>${a[P.gs]}</td><td>${a[P.w]}</td><td>${a[P.l]}</td><td>${a[P.sv]}</td><td>${ipS(a[P.o])}</td><td>${a[P.h]}</td><td>${a[P.er]}</td><td>${a[P.bb]}</td><td>${a[P.k]}</td><td>${a[P.hr]}</td><td>${f2(l.era)}</td><td>${f2(l.whip)}</td><td>${l.k9.toFixed(1)}</td></tr>`; }
function modal(html) { $('#modal').innerHTML = `<div class="mbox"><button class="x" data-act="closeModal">✕</button>${html}</div>`; $('#modal').style.display = 'flex'; }
function closeModal() { $('#modal').style.display = 'none'; $('#modal').innerHTML = ''; }

/* ---------------- LINEUP ---------------- */
function V_lineup() {
  const st = App.st, tid = myTid();
  if (tid == null) return '<div class="card">Claim a team to set a lineup.</div>';
  const t = T(tid);
  const act = F.active(st, tid);
  const hit = act.filter(p => !F.isP(p)).sort((a, b) => b.o - a.o), pit = act.filter(F.isP).sort((a, b) => b.o - a.o);
  const lu = (t.lu && t.lu.length === 9) ? t.lu : F.autoLineup(st, t);
  const issues = lineupIssues(st, t, lu);
  const optsH = cur => hit.map(p => `<option value="${p.id}"${p.id === cur ? ' selected' : ''}${p.inj ? ' disabled' : ''}>${esc(F.sname(p))} · ${p.p} · ${p.o}${p.inj ? ' (inj)' : ''}</option>`).join('');
  const optsPos = cur => F.LPOS.map(x => `<option${x === cur ? ' selected' : ''}>${x}</option>`).join('');
  const rows = lu.map((s, i) => {
    const p = PL(s.id); if (!p) return '';
    const l = p.sb ? F.batLine(p.sb) : null; const at = Math.round(F.ovrAt(p, s.pos));
    const oop = s.pos !== 'DH' && s.pos !== p.p && F.defAt(p, s.pos) < (p.r.fld * .65 + p.r.arm * .35) - 6;
    return `<tr><td><b class="ord">${i + 1}</b></td><td class="nw"><button class="mini" data-act="luUp" data-i="${i}"${i ? '' : ' disabled'} title="Move up">▲</button><button class="mini" data-act="luDn" data-i="${i}"${i < 8 ? '' : ' disabled'} title="Move down">▼</button></td>
    <td class="l pp"><select data-chg="luP" data-i="${i}">${optsH(s.id)}</select></td><td><select data-chg="luPos" data-i="${i}">${optsPos(s.pos)}</select></td>
    <td><span class="ov ${rc(at)}">${at}</span>${oop ? '<div class="oop">out of position</div>' : ''}</td>
    <td class="${rc(p.r.con)}t">${Math.round(p.r.con)}</td><td class="${rc(p.r.pow)}t">${Math.round(p.r.pow)}</td><td class="${rc(p.r.eye)}t">${Math.round(p.r.eye)}</td><td class="${rc(p.r.spd)}t">${Math.round(p.r.spd)}</td><td>${p.b}</td>
    <td class="sm">${l ? `${f3(l.avg)} · ${p.sb[B.hr]} HR · ${f3(l.ops)}` : '—'}</td></tr>`;
  }).join('');
  const inLu = new Set(lu.map(s => s.id));
  const bench = hit.filter(p => !inLu.has(p.id));
  const optsP = (cur, allowNone) => (allowNone ? '<option value="">— none —</option>' : '') + pit.map(p => `<option value="${p.id}"${p.id === cur ? ' selected' : ''}>${esc(F.sname(p))} (${p.p}, ${p.o})${p.inj ? ' – inj' : ''}</option>`).join('');
  const rot = (t.rot || []).slice(); while (rot.length < 5) rot.push(null);
  const pen = pit.filter(p => !rot.includes(p.id));
  return `<div class="pagehead"><h2>Lineup & Depth Chart</h2><div class="row"><label class="chk"><input type="checkbox" data-chg="autoMgr"${t.auto ? ' checked' : ''}> Let AI manage lineup & rotation daily</label><button class="btn" data-act="autoLu">Auto-build everything</button></div></div>
  ${t.auto ? '<p class="muted">AI is managing your depth chart (it rebuilds before each game). Change anything below to take control.</p>' : ''}
  <section class="card flush luwrap"><div class="pagehead pad"><h3>Batting Order <span class="muted sm">(universal DH)</span></h3><div class="row"><button class="btn ghost sm" data-act="luFix" title="Keep these 9 hitters, put each at his best position">Best positions</button><button class="btn ghost sm" data-act="luOrder" title="Keep the 9 hitters and positions, re-sort the order">Optimize order</button></div></div>
  ${issues.length ? `<div class="luissues pad">⚠ ${issues.map(esc).join(' · ')} — the game will auto-fix this at first pitch.</div>` : ''}
  <div class="scroll"><table class="t lu-t"><tr><th>#</th><th></th><th class="l">Player</th><th>Pos</th><th>Rtg @ Pos</th><th>CON</th><th>POW</th><th>EYE</th><th>SPD</th><th>Bats</th><th>Season</th></tr>${rows}</table></div>
  <div class="bench-row"><b class="muted sm">BENCH</b>${bench.map(p => `<span class="chipb">${plink(p, true)} <span class="muted">${p.p} · ${p.o}</span><button class="mini" data-act="luStart" data-id="${p.id}" title="Start him: replaces the starter at his position (or the DH)">Start</button></span>`).join('') || '<span class="muted sm">No bench players.</span>'}</div>
  <p class="muted sm pad" style="padding-bottom:12px">Pick a bench player in any slot to put him in that spot. Picking someone already in the lineup swaps the two. Changing a position swaps it with whoever had it.</p></section>
  <div class="grid2"><section class="card"><h3>Starting Rotation</h3>${rot.map((id, i) => `<label class="lrow"><span>SP${i + 1}</span><select data-chg="rot" data-i="${i}">${optsP(id, true)}</select>${id && PL(id) ? `<em>${energy(PL(id))} ${restInfo(PL(id))}</em>` : ''}</label>`).join('')}<p class="muted sm">Starters need 4–5 days of rest depending on how deep they went (85+ energy to start). If the scheduled starter isn't ready, the next rested arm in the rotation takes the ball.</p></section>
  <section class="card">${penRolesHtml(st, t, pen)}</section></div>`;
}
function lineupIssues(st, t, lu) {
  const out = [];
  const pos = lu.map(s => s.pos), ids = lu.map(s => s.id);
  F.LPOS.forEach(x => { if (!pos.includes(x)) out.push(`nobody at ${x}`); });
  F.LPOS.forEach(x => { if (pos.filter(y => y === x).length > 1) out.push(`two players at ${x}`); });
  if (new Set(ids).size !== ids.length) out.push('a player is listed twice');
  lu.forEach(s => { const p = PL(s.id); if (!p) out.push('a listed player left the team'); else if (p.inj) out.push(`${F.sname(p)} is injured`); else if (p.lv !== 0 || p.tid !== t.id) out.push(`${F.sname(p)} isn't on the active roster`); });
  return out;
}
function penRolesHtml(st, t, pen) {
  const pn = t.pen || { cl: null, stp: null, su: [], spec: [], lr: [] };
  const sel = (role, idx, cur) => `<select data-chg="pr" data-r="${role}" data-i="${idx}"><option value="">— empty —</option>${pen.map(p => `<option value="${p.id}"${p.id === cur ? ' selected' : ''}>${esc(F.sname(p))} (${p.t}HP, ${p.o})${p.inj ? ' – inj' : ''}</option>`).join('')}</select>`;
  const row = (lab, html, info) => `<label class="lrow"><span>${lab}</span>${html}<em class="muted sm">${info || ''}</em></label>`;
  const nrg = id => id && PL(id) ? energy(PL(id)) : '';
  const assigned = new Set([pn.cl, pn.stp, ...(pn.su || []), ...(pn.spec || []).map(s => s.id), ...(pn.lr || [])].filter(x => x != null));
  const mr = pen.filter(p => !assigned.has(p.id));
  const spec = (pn.spec || []).slice(); while (spec.length < 2) spec.push({ id: null, vs: spec.length ? 'R' : 'L' });
  return `<h3>Bullpen Roles</h3>
  ${row('Closer', sel('cl', 0, pn.cl), nrg(pn.cl) + ' 9th inning, save chances')}
  ${row('Stopper', sel('stp', 0, pn.stp), nrg(pn.stp) + ' Fireman for high-leverage jams (6th–8th)')}
  ${[0, 1].map(i => row('Setup ' + (i + 1), sel('su', i, (pn.su || [])[i]), nrg((pn.su || [])[i]) + (i ? ' 7th inning bridge' : ' 8th inning'))).join('')}
  ${spec.map((s, i) => row('Specialist', `${sel('spec', i, s.id)}<select data-chg="prvs" data-i="${i}"><option value="L"${s.vs === 'L' ? ' selected' : ''}>vs LHB</option><option value="R"${s.vs === 'R' ? ' selected' : ''}>vs RHB</option></select>`, nrg(s.id) + ' Brought in for a tough late-inning matchup')).join('')}
  ${[0, 1].map(i => row('Long Relief', sel('lr', i, (pn.lr || [])[i]), nrg((pn.lr || [])[i]) + ' Early exits & extra innings')).join('')}
  <p class="muted sm"><b>Middle Relief</b> (everyone else): ${mr.map(p => `${plink(p, true)} <span class="muted">${p.o}</span> ${energy(p)}`).join(' · ') || 'none'}</p>
  <p class="muted sm">Max: 1 closer, 1 stopper, 2 setup, 2 specialists, 2 long relievers. AI managers use these roles in every game; in games you play, they're labeled in the bullpen panel.</p>`;
}
function energy(p) { const e = Math.round(p.e); return `<span class="en ${e >= 85 ? 'good' : e >= 60 ? 'warn' : 'bad'}" title="Energy">⚡${e}</span>`; }
function restInfo(p) { if (p.e >= 85) return '<span class="good sm">Ready to start</span>'; const d = Math.ceil((85 - p.e) / 21); return `<span class="warn sm">Needs ${d} more day${d > 1 ? 's' : ''} rest</span>`; }
function editLineup(mut) {
  const tid = myTid();
  return act(st => {
    const t = st.teams[tid];
    if (!t.lu || t.lu.length !== 9) t.lu = F.autoLineup(st, t);
    t.lu = t.lu.map(s => ({ id: s.id, pos: s.pos }));
    t.auto = false;
    if (!t.rot || !t.rot.length) F.autoDepth(st, t), t.auto = false;
    return mut(st, t);
  });
}

/* ---------------- SCHEDULE ---------------- */
function V_schedule() {
  const st = App.st, tid = viewTeam();
  const n = st.sched.length;
  const byDate = {}; for (let d = 0; d < n; d++) byDate[F.dateOf(st, d).toISOString().slice(0, 10)] = d;
  const evs = F.events(st); const evByDay = {}; evs.forEach(e => (evByDay[e.d] = evByDay[e.d] || []).push(e));
  const months = []; const first = F.dateOf(st, 0), last = F.dateOf(st, n);
  for (let y = first.getUTCFullYear(), m = first.getUTCMonth(); y < last.getUTCFullYear() || (y === last.getUTCFullYear() && m <= last.getUTCMonth()); m++) { if (m > 11) { m = 0; y++; } months.push([y, m]); }
  if (App.calM == null || App.calSeason !== st.season) { const cur = F.dateOf(st, Math.min(st.day, n - 1)); App.calM = Math.max(0, months.findIndex(([y, m]) => y === cur.getUTCFullYear() && m === cur.getUTCMonth())); App.calSeason = st.season; }
  App.calM = Math.max(0, Math.min(months.length - 1, App.calM));
  const [Y, M] = months[App.calM];
  const mname = new Date(Date.UTC(Y, M, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const startDow = new Date(Date.UTC(Y, M, 1)).getUTCDay(); const dim = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push('<div class="cal-c empty"></div>');
  let w = 0, l = 0;
  for (let dd = 1; dd <= dim; dd++) {
    const key = new Date(Date.UTC(Y, M, dd)).toISOString().slice(0, 10); const d = byDate[key];
    let inner = `<span class="cal-d">${dd}</span>`;
    let cls = '';
    if (d != null) {
      const g = st.sched[d].find(x => x[0] === tid || x[1] === tid);
      if (g) {
        const home = g[0] === tid, opp = home ? g[1] : g[0];
        inner += `<div class="cal-g">${home ? 'vs' : '@'} ${tb(opp)}</div>`;
        if (g[2] != null) { const my = home ? g[2] : g[3], op = home ? g[3] : g[2]; my > op ? w++ : l++; inner += `<a class="res ${my > op ? 'w' : 'l'}" ${g[4] ? `data-act="box" data-id="${g[4]}"` : ''}>${my > op ? 'W' : 'L'} ${my}-${op}</a>`; }
      }
      if (d === st.day && st.phase === 'regular') cls = ' today';
      (evByDay[d] || []).forEach(e => { inner += `<div class="cal-ev ev-${e.k}">${esc(e.t)}</div>`; });
    } else {
      const post = evs.find(e => e.k === 'post'); if (post && F.dateOf(st, post.d).toISOString().slice(0, 10) === key) inner += `<div class="cal-ev ev-post">Postseason begins</div>`;
      else inner += '<div class="cal-off">Off</div>';
    }
    cells.push(`<div class="cal-c${cls}${d == null ? ' off' : ''}">${inner}</div>`);
  }
  const evList = evs.map(e => { const past = e.d < st.day || (e.k === 'post' && st.phase !== 'regular' && st.phase !== 'draft'); const dt = F.dateOf(st, e.d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }); const left = e.d - st.day; return `<li class="${past ? 'past' : ''}"><span class="cal-ev ev-${e.k}">${esc(e.t)}</span><b>${dt}</b><span class="muted sm">${past ? 'done' : left === 0 ? 'today' : `in ${left} day${left === 1 ? '' : 's'}`}</span></li>`; }).join('');
  return `<div class="pagehead"><h2>${tb(tid, true)} Schedule & Calendar</h2>${teamSelect(tid)}</div>
  <div class="grid2 wide-left"><section class="card"><div class="cal-head"><button class="btn ghost sm" data-act="calM" data-d="-1"${App.calM ? '' : ' disabled'}>‹ Prev</button><h3>${mname}</h3><button class="btn ghost sm" data-act="calM" data-d="1"${App.calM < months.length - 1 ? '' : ' disabled'}>Next ›</button></div>
  <div class="cal">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(x => `<div class="cal-h">${x}</div>`).join('')}${cells.join('')}</div>
  <p class="muted sm">${w || l ? `This month: ${w}-${l}. ` : ''}Click a result for the box score.</p></section>
  <section class="card"><h3>Key Dates — ${st.season}</h3><ul class="evlist">${evList}</ul>
  <h3 style="margin-top:14px">Offseason</h3><ul class="evlist"><li><span class="cal-ev">Awards</span><b>After World Series</b></li><li><span class="cal-ev">Re-sign window</span><b>Before free agency</b></li><li><span class="cal-ev">Free agency</b></span><b>6 days</b></li><li><span class="cal-ev">Coaching contracts expire</span><b>Offseason</b></li></ul></section></div>`;
}

/* ---------------- STANDINGS ---------------- */
function divTable(lg, dv, compact) {
  const st = App.st;
  const ts = st.teams.filter(t => t.lg === lg && t.div === dv).sort((a, b) => F.pct(b) - F.pct(a) || (b.rs - b.ra) - (a.rs - a.ra));
  const lead = ts[0];
  const my = myTid();
  return `<table class="t st"><tr><th class="l">${F.LG[lg]} ${F.DIVS[dv]}</th><th>W</th><th>L</th><th>PCT</th><th>GB</th>${compact ? '' : '<th>RS</th><th>RA</th><th>DIFF</th><th>STRK</th><th>L10</th>'}</tr>${ts.map(t => { const gb = ((lead.w - t.w) + (t.l - lead.l)) / 2; return `<tr class="${t.id === my ? 'me' : ''}"><td class="l">${tb(t.id)} <a class="pl" data-act="team" data-id="${t.id}">${esc(t.name)}</a>${t.user ? ' ★' : ''}</td><td>${t.w}</td><td>${t.l}</td><td>${f3(F.pct(t))}</td><td>${gb ? gb : '—'}</td>${compact ? '' : `<td>${t.rs}</td><td>${t.ra}</td><td class="${t.rs - t.ra >= 0 ? 'good' : 'bad'}">${t.rs - t.ra >= 0 ? '+' : ''}${t.rs - t.ra}</td><td>${t.strk > 0 ? 'W' + t.strk : t.strk < 0 ? 'L' + (-t.strk) : '-'}</td><td>${t.l10.filter(x => x).length}-${t.l10.filter(x => !x).length}</td>`}</tr>`; }).join('')}</table>`;
}
function V_minorStandings(L) {
  const st = App.st; const my = myTid();
  const rows = st.teams.map(t => { const r = (t.mrec || {})[L] || [0, 0, 0, 0]; return { t, r }; }).sort((a, b) => (b.r[0] / Math.max(1, b.r[0] + b.r[1])) - (a.r[0] / Math.max(1, a.r[0] + a.r[1])) || (b.r[2] - b.r[3]) - (a.r[2] - a.r[3]));
  const lead = rows[0].r;
  return `<div class="card flush scroll tall"><table class="t st"><tr><th>#</th><th class="l">${L === 1 ? 'Triple-A' : 'Double-A'} club</th><th>Parent</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>RS</th><th>RA</th><th>DIFF</th></tr>${rows.map((o, i) => { const r = o.r; const nm = o.t.aff ? (L === 1 ? o.t.aff.aaa : o.t.aff.aa) : null; const gb = ((lead[0] - r[0]) + (r[1] - lead[1])) / 2;
    return `<tr class="${o.t.id === my ? 'me' : ''}"><td>${i + 1}</td><td class="l"><b>${esc(nm ? nm[0] : o.t.ab + (L === 1 ? ' AAA' : ' AA'))}</b></td><td>${tb(o.t.id)}</td><td>${r[0]}</td><td>${r[1]}</td><td>${f3(r[0] / Math.max(1, r[0] + r[1]))}</td><td>${gb || '—'}</td><td>${r[2]}</td><td>${r[3]}</td><td class="${r[2] - r[3] >= 0 ? 'good' : 'bad'}">${r[2] - r[3] >= 0 ? '+' : ''}${r[2] - r[3]}</td></tr>`; }).join('')}</table></div>
  <p class="muted sm">Minor league clubs play every day of the regular season. Players there earn stats, get familiar with new positions, and develop faster when they play regularly.</p>`;
}
function V_standings() {
  const st = App.st;
  const lvTab = App.tab.standings || 'mlb';
  const lvTabs = `<div class="tabs"><a class="${lvTab === 'mlb' ? 'on' : ''}" data-act="tab" data-g="standings" data-v="mlb">MLB</a><a class="${lvTab === 'aaa' ? 'on' : ''}" data-act="tab" data-g="standings" data-v="aaa">Triple-A</a>${st.settings.aa ? `<a class="${lvTab === 'aa' ? 'on' : ''}" data-act="tab" data-g="standings" data-v="aa">Double-A</a>` : ''}</div>`;
  if (lvTab !== 'mlb') return `<div class="pagehead"><h2>Standings</h2></div>${lvTabs}${V_minorStandings(lvTab === 'aaa' ? 1 : 2)}`;
  const wc = lg => {
    const sd = F.seeds(st, lg); const divW = sd.slice(0, 3);
    const rest = st.teams.filter(t => t.lg === lg && !divW.includes(t.id)).sort((a, b) => F.pct(b) - F.pct(a));
    const third = rest[2];
    return `<table class="t st"><tr><th class="l">${F.LG[lg]} Wild Card</th><th>W</th><th>L</th><th>PCT</th><th>WCGB</th></tr>${rest.slice(0, 8).map((t, i) => { const gb = third ? ((third.w - t.w) + (t.l - third.l)) / 2 : 0; return `<tr class="${i === 2 ? 'cut' : ''}${t.id === myTid() ? ' me' : ''}"><td class="l">${tb(t.id)} ${esc(t.name)}</td><td>${t.w}</td><td>${t.l}</td><td>${f3(F.pct(t))}</td><td>${i < 3 ? (i === 2 ? '—' : '+' + (-gb)) : gb}</td></tr>`; }).join('')}</table>`;
  };
  return `<div class="pagehead"><h2>Standings</h2></div>${lvTabs}
  <div class="grid2">${[0, 1].map(lg => `<div><h3>${F.LEAGUES[lg]}</h3>${[0, 1, 2].map(d => `<div class="card flush">${divTable(lg, d)}</div>`).join('')}<div class="card flush">${wc(lg)}</div></div>`).join('')}</div>
  <p class="muted sm">Six teams per league make the postseason: three division winners and three wild cards. Top two seeds get a bye past the Wild Card Series.</p>`;
}

/* ---------------- STATS ---------------- */
function V_stats() {
  const st = App.st;
  const kind = App.tab.stats || 'bat';
  const scope = App.filt.scope || 'all';
  const qual = App.filt.qual !== false;
  const g = Math.max(1, avgGames());
  const LVL = scope === 'aaa' ? 1 : scope === 'aa' ? 2 : 0;
  const SB = p => LVL ? p.mb : p.sb, SPx = p => LVL ? p.mp : p.sp;
  let ps = Object.values(st.players).filter(p => p.tid >= 0 && (LVL ? p.lv === LVL : true) && (kind === 'bat' ? SB(p) : SPx(p)));
  if (scope === 'cl') ps = ps.filter(p => T(p.tid).lg === 0); else if (scope === 'fl') ps = ps.filter(p => T(p.tid).lg === 1); else if (scope === 'mine' && myTid() != null) ps = ps.filter(p => p.tid === myTid()); else if (/^t\d+$/.test(scope)) ps = ps.filter(p => p.tid === +scope.slice(1));
  if (qual) ps = ps.filter(p => kind === 'bat' ? SB(p)[B.pa] >= g * 3.1 : SPx(p)[P.o] >= g * 3 || SPx(p)[P.sv] >= 5 || (p.p === 'RP' && SPx(p)[P.o] >= g));
  let cols;
  if (kind === 'bat') cols = [['G', p => SB(p)[B.g]], ['PA', p => SB(p)[B.pa]], ['H', p => SB(p)[B.h]], ['2B', p => SB(p)[B.d]], ['HR', p => SB(p)[B.hr]], ['R', p => SB(p)[B.r]], ['RBI', p => SB(p)[B.rbi]], ['BB', p => SB(p)[B.bb]], ['K', p => SB(p)[B.k]], ['SB', p => SB(p)[B.sb]], ['AVG', p => F.batLine(SB(p)).avg, f3], ['OBP', p => F.batLine(SB(p)).obp, f3], ['SLG', p => F.batLine(SB(p)).slg, f3], ['OPS', p => F.batLine(SB(p)).ops, f3], ['WAR', p => LVL ? 0 : F.war(p), x => LVL ? '—' : x]];
  else cols = [['G', p => SPx(p)[P.g]], ['GS', p => SPx(p)[P.gs]], ['W', p => SPx(p)[P.w]], ['L', p => SPx(p)[P.l]], ['SV', p => SPx(p)[P.sv]], ['IP', p => SPx(p)[P.o], ipS], ['H', p => SPx(p)[P.h]], ['BB', p => SPx(p)[P.bb]], ['K', p => SPx(p)[P.k]], ['HR', p => SPx(p)[P.hr]], ['ERA', p => F.pitLine(SPx(p)).era, f2, 1], ['WHIP', p => F.pitLine(SPx(p)).whip, f2, 1], ['K/9', p => F.pitLine(SPx(p)).k9, x => x.toFixed(1)], ['WAR', p => LVL ? 0 : F.war(p), x => LVL ? '—' : x]];
  const sk = App.sort[kind] || (kind === 'bat' ? 'OPS' : 'ERA');
  const col = cols.find(c => c[0] === sk) || cols[0];
  const asc = col[3] ? !App.sort[kind + 'rev'] : !!App.sort[kind + 'rev'];
  ps.sort((a, b) => asc ? col[1](a) - col[1](b) : col[1](b) - col[1](a));
  const rows = ps.slice(0, 150).map((p, i) => `<tr class="${p.tid === myTid() ? 'me' : ''}"><td>${i + 1}</td><td class="l">${plink(p)}</td><td>${tb(p.tid)}${LVL ? `<div class="muted sm">${LVN[p.lv]}</div>` : ''}</td><td>${p.p}</td>${cols.map(c => `<td class="${c[0] === sk ? 'sorted' : ''}">${(c[2] || (x => x))(c[1](p))}</td>`).join('')}</tr>`).join('');
  const sopt = [['all', 'All MLB'], ['aaa', 'Triple-A (all teams)'], ...(st.settings.aa ? [['aa', 'Double-A (all teams)']] : []), ['cl', F.LEAGUES[0]], ['fl', F.LEAGUES[1]], ...(myTid() != null ? [['mine', 'My team']] : []), ...st.teams.map(t => ['t' + t.id, t.ab + ' ' + t.name])];
  return `<div class="pagehead"><h2>Stats — ${st.season}</h2><div class="row"><select data-chg="scope">${sopt.map(o => `<option value="${o[0]}"${o[0] === scope ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select><label class="chk"><input type="checkbox" data-chg="qual"${qual ? ' checked' : ''}> Qualified only</label></div></div>
  <div class="tabs"><a class="${kind === 'bat' ? 'on' : ''}" data-act="tab" data-g="stats" data-v="bat">Batting</a><a class="${kind === 'pit' ? 'on' : ''}" data-act="tab" data-g="stats" data-v="pit">Pitching</a></div>
  <div class="card flush scroll tall"><table class="t"><tr><th>#</th><th class="l">Player</th><th>Tm</th><th>Pos</th>${cols.map(c => `<th class="sort${c[0] === sk ? ' on' : ''}" data-act="sort" data-g="${kind}" data-k="${c[0]}">${c[0]}</th>`).join('')}</tr>${rows || `<tr><td colspan=20 class="muted">No stats yet${qual ? ' (try turning off Qualified only)' : ''}.</td></tr>`}</table></div>`;
}

/* ---------------- TRADES ---------------- */
function V_trades() {
  const st = App.st, my = myTid();
  if (my == null) return '<div class="card">Claim a team to make trades.</div>';
  const tr = App.trade;
  if (tr.partner == null || tr.partner === my) tr.partner = st.teams.find(t => t.id !== my).id;
  tr.give = tr.give.filter(id => PL(id) && PL(id).tid === my); tr.get = tr.get.filter(id => PL(id) && PL(id).tid === tr.partner);
  const pt = T(tr.partner); const me = T(my);
  const human = pt.user != null && App.mode !== 'local';
  const open = F.tradesOpen(st);
  const ev = F.tradeEval(st, { from: my, to: tr.partner, give: tr.give, get: tr.get });
  const pctv = ev.need ? Math.min(100, Math.round(ev.recv / ev.need * 100)) : 0;
  const tf = App.tf || (App.tf = { give: { lv: 'all', pos: 'all', q: '', sort: 'ovr', more: 0 }, get: { lv: 'all', pos: 'all', q: '', sort: 'ovr', more: 0 } });
  const grp = p => F.isP(p) ? p.p : ['LF', 'CF', 'RF'].includes(p.p) ? 'OF' : ['1B', '2B', '3B', 'SS'].includes(p.p) ? 'IF' : p.p;
  const theirUnt = new Set(F.untouchables(st, pt));
  const stat = p => { const b = p.lv === 0 ? p.sb : p.mb, q = p.lv === 0 ? p.sp : p.mp; if (F.isP(p) && q) return `${f2(F.pitLine(q).era)} ERA`; if (!F.isP(p) && b) { const l = F.batLine(b); return `${f3(l.avg)} · ${b[B.hr]} HR`; } return ''; };
  const picker = (side, tid, sel) => {
    const f = tf[side];
    let ps = F.teamPlayers(st, tid).filter(p => !sel.includes(p.id));
    if (f.lv !== 'all') ps = ps.filter(p => p.lv === +f.lv);
    if (f.pos !== 'all') ps = ps.filter(p => grp(p) === f.pos);
    if (f.q) { const q = f.q.toLowerCase(); ps = ps.filter(p => (p.f + ' ' + p.l).toLowerCase().includes(q)); }
    const key = { ovr: p => p.o, pot: p => p.pt, val: p => F.pval(p), age: p => -p.a, sal: p => p.sal, cheap: p => -p.sal }[f.sort] || (p => p.o);
    ps.sort((a, b) => key(b) - key(a));
    const total = ps.length, shown = ps.slice(0, 25 + f.more * 25);
    const cnt = lv => F.teamPlayers(st, tid).filter(p => lv === 'all' || p.lv === +lv).length;
    const chips = (k, opts) => `<div class="chips fchips">${opts.map(([v, l]) => `<button class="chip${f[k] === v ? ' on' : ''}" data-act="tfSet" data-s="${side}" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div>`;
    const rows = shown.map(p => `<div class="tprow${side === 'get' && theirUnt.has(p.id) ? ' unt' : ''}" data-act="tAdd" data-s="${side}" data-id="${p.id}" title="Add to the deal">
      <span class="ov ${rc(p.o)}">${p.o}</span><div class="nmc"><div><b>${esc(F.pname(p))}</b> ${natTag(p.nat)} ${injTag(p)}${side === 'get' && theirUnt.has(p.id) ? ' <span class="tag bad">🔒</span>' : ''}</div><div class="muted sm">${p.p} · ${p.a}y · ${LVN[p.lv]} · POT ${grade(p.pt)} · ${money(p.sal)}×${p.y}${stat(p) ? ' · ' + stat(p) : ''}</div></div><b class="val">${F.pval(p)}</b><span class="addb">＋</span></div>`).join('');
    return `<div class="tpick"><div class="tptools"><input class="tpq" id="tfq_${side}" data-inp="tfq" data-s="${side}" placeholder="Search ${side === 'give' ? 'your' : 'their'} players…" value="${esc(f.q)}">
      <select data-chg="tfSort" data-s="${side}">${[['ovr', 'Overall'], ['pot', 'Potential'], ['val', 'Trade value'], ['age', 'Youngest'], ['sal', 'Highest salary'], ['cheap', 'Lowest salary']].map(o => `<option value="${o[0]}"${f.sort === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>
      ${chips('lv', [['all', `All (${cnt('all')})`], ['0', `MLB (${cnt('0')})`], ['1', `AAA (${cnt('1')})`], ...(st.settings.aa ? [['2', `AA (${cnt('2')})`]] : [])])}
      ${chips('pos', [['all', 'All'], ['C', 'C'], ['IF', 'IF'], ['OF', 'OF'], ['DH', 'DH'], ['SP', 'SP'], ['RP', 'RP']])}
      <div class="tplist2">${rows || '<p class="muted sm pad">No players match these filters.</p>'}</div>
      ${total > shown.length ? `<button class="btn ghost sm more" data-act="tfMore" data-s="${side}">Show more (${total - shown.length} left)</button>` : ''}</div>`;
  };
  const dealSide = (side, ids, t) => {
    const ps = ids.map(PL); const val = Math.round(ps.reduce((s, p) => s + F.pval(p), 0) * 10) / 10, sal = ps.reduce((s, p) => s + p.sal, 0);
    return `<div class="dside"><div class="dh">${tb(t.id)} <b>${side === 'give' ? 'You give' : 'You get'}</b><span class="muted sm">${ps.length} player${ps.length === 1 ? '' : 's'} · value ${val} · ${money(sal)}</span></div>
      <div class="dchips">${ps.map(p => `<span class="dchip"><span class="ov ${rc(p.o)}">${p.o}</span><span><b>${esc(F.sname(p))}</b><small class="muted"> ${p.p} · ${p.a}y · ${LVN[p.lv]} · ${money(p.sal)}</small></span><button class="x2" data-act="tRem" data-s="${side}" data-id="${p.id}" title="Remove">✕</button></span>`).join('') || `<span class="muted sm">Tap players below to add them.</span>`}</div></div>`;
  };
  const giveSal = tr.give.reduce((s, id) => s + PL(id).sal, 0), getSal = tr.get.reduce((s, id) => s + PL(id).sal, 0);
  const payAfter = F.payroll(st, my) - giveSal + getSal;
  const mlbAfter = F.active(st, my).length - tr.give.filter(id => PL(id).lv === 0).length + tr.get.filter(id => PL(id).lv === 0).length;
  const verdict = human ? `<span class="muted">${esc(uname(pt.user))} decides — your offer goes to their inbox.</span>` : (!tr.give.length && !tr.get.length) ? '<span class="muted">Add players from both teams to build a deal.</span>' : ev.ok ? '<span class="good">✓ They would accept this.</span>' : `<span class="bad">✕ Not enough value — they want about ${Math.round((ev.need - ev.recv) * 10) / 10} more.</span>`;
  const offers = st.offers.filter(o => o.status === 'open' && (canControl(o.to) || canControl(o.from)));
  const offerHtml = offers.map(o => { const n = ids => ids.map(id => PL(id) ? plink(PL(id)) : '(gone)').join(', ') || 'nothing'; const incoming = canControl(o.to);
    return `<div class="offer"><div>${tb(o.from)} → ${tb(o.to)}: <b>${T(o.from).ab}</b> send ${n(o.give)} for ${n(o.get)}</div><div class="row">${incoming ? `<button class="btn good" data-act="offerAccept" data-id="${o.id}">Accept</button><button class="btn ghost" data-act="offerDecline" data-id="${o.id}">Decline</button>` : `<span class="muted sm">Waiting for ${esc(T(o.to).name || T(o.to).city)}</span><button class="btn ghost sm" data-act="offerCancel" data-id="${o.id}">Withdraw</button>`}</div></div>`; }).join('');
  const strat = F.strategy(st, pt), needs = F.needList(st, pt);
  return `<div class="pagehead"><h2>Trade Center</h2><button class="btn ghost" data-act="nav" data-v="hub">Trade Hub ›</button></div>
  ${!open ? `<p class="bad">${st.phase === 'regular' ? 'The trade deadline has passed. Trades reopen after the postseason.' : 'Trades are closed during this phase.'}</p>` : ''}
  ${offerHtml ? `<section class="card hi"><h3>Trade offers</h3>${offerHtml}</section>` : ''}
  <section class="card partner"><div class="prt">${tb(pt.id, true)}<div><small class="muted">Trading with</small><select data-chg="tradePartner" class="psel">${st.teams.filter(t => t.id !== my).map(t => `<option value="${t.id}"${t.id === tr.partner ? ' selected' : ''}>${t.ab} — ${esc(F.tname(t))}${t.user ? ' ★ human' : ''}</option>`).join('')}</select></div></div>
   <div class="pinfo"><span class="stag s-${strat}">${strat === 'Contender' ? '🏆 ' : strat === 'Rebuilding' ? '🔧 ' : '⚖️ '}${strat}</span><span class="sm">${rec(pt)} · needs: ${needs.length ? needs.map(n => `<b class="bad">${n}</b>`).join(', ') : 'none'}</span><span class="muted sm">${strat === 'Rebuilding' ? 'Values young players & prospects' : strat === 'Contender' ? 'Wants proven big leaguers' : 'Looking for fair value'}</span></div></section>
  <section class="card deal">
   <div class="dgrid">${dealSide('give', tr.give, me)}<div class="darrow">⇄</div>${dealSide('get', tr.get, pt)}</div>
   <div class="dmeter"><div class="dm-l"><small>${esc(pt.name || pt.city)} receive</small><b>${ev.recv}</b></div><div class="meter big"><i style="width:${pctv}%" class="${ev.ok ? 'ok' : pctv >= 80 ? 'close' : ''}"></i><span>${human ? '' : pctv + '%'}</span></div><div class="dm-r"><small>${human ? 'Value you ask for' : 'They want at least'}</small><b>${human ? ev.give : ev.need}</b></div></div>
   <div class="dfoot"><div>${verdict}<div class="muted sm">After this deal: payroll ${money(payAfter)} / ${money(me.bud)}${payAfter > me.bud ? ' <span class="bad">(over budget)</span>' : ''} · active roster ${mlbAfter}${mlbAfter > 26 ? ' <span class="warn">(extra players get optioned)</span>' : ''}</div></div>
   <div class="row">${!human && tr.get.length && !ev.ok ? `<button class="btn ghost" data-act="tradeBalance">What would it take?</button>` : ''}<button class="btn ghost" data-act="tradeClear"${tr.give.length || tr.get.length ? '' : ' disabled'}>Clear</button><button class="btn primary" data-act="tradePropose"${open && (tr.give.length || tr.get.length) ? '' : ' disabled'}>${human ? 'Send Offer' : 'Propose Trade'}</button></div></div>
  </section>
  <div class="grid2 tcols"><section class="card"><h3>${tb(my)} Your players</h3>${picker('give', my, tr.give)}</section><section class="card"><h3>${tb(pt.id)} Their players</h3>${picker('get', pt.id, tr.get)}</section></div>
  <p class="muted sm">Trade value weighs rating, age, potential and contract. 🔒 = they consider him untouchable (costs much more). Difficulty: ${st.settings.diff}.</p>`;
}

/* ---------------- FREE AGENTS ---------------- */
function V_fa() {
  const st = App.st, my = myTid();
  const fa = Object.values(st.players).filter(p => p.tid === -1).sort((a, b) => b.o - a.o);
  const pf = App.filt.fapos || 'all';
  const list = fa.filter(p => pf === 'all' ? true : pf === 'P' ? F.isP(p) : pf === 'H' ? !F.isP(p) : p.p === pf);
  const t = my != null ? T(my) : null;
  const inFA = st.phase === 'fa';
  const committed = inFA && my != null ? Object.values(st.fa.offers).flat().filter(o => o.tid === my).reduce((s, o) => s + o.sal, 0) : 0;
  const rows = list.slice(0, 120).map(p => {
    const offs = inFA ? (st.fa.offers[p.id] || []) : [];
    const mine = offs.find(o => o.tid === my);
    const rk = F.isP(p) ? `${Math.round(p.r.vel)}/${Math.round(p.r.ctl)}/${Math.round(p.r.brk)}/${Math.round(p.r.sta)}` : `${Math.round(p.r.con)}/${Math.round(p.r.pow)}/${Math.round(p.r.eye)}/${Math.round(p.r.spd)}/${Math.round(p.r.fld)}`;
    return `<tr><td><b>${p.p}</b></td><td class="l">${plink(p)} ${injTag(p)}</td><td>${p.a}</td><td><span class="ov ${rc(p.o)}">${p.o}</span></td><td>${grade(p.pt)}</td><td class="muted sm">${rk}</td><td>${money(p.ask.sal)} × ${p.ask.y}</td>${inFA ? `<td>${offs.length ? offs.length + ' offer' + (offs.length > 1 ? 's' : '') : '—'}</td>` : ''}
    <td class="nw">${my != null ? `<input class="num" id="fs${p.id}" value="${mine ? mine.sal : p.ask.sal}" size="4"> <input class="num" id="fy${p.id}" value="${mine ? mine.y : p.ask.y}" size="2"> <button class="mini" data-act="faOffer" data-id="${p.id}">${inFA ? (mine ? 'Update' : 'Offer') : 'Sign'}</button>${mine ? `<button class="mini ghost" data-act="faWithdraw" data-id="${p.id}">✕</button>` : ''}` : ''}</td></tr>`;
  }).join('');
  if ((App.tab.fa || 'pl') === 'staff') return V_faStaff();
  return `<div class="pagehead"><h2>Free Agents</h2><select data-chg="fapos">${[['all', 'All'], ['H', 'Hitters'], ['P', 'Pitchers'], ...F.HPOS.map(x => [x, x]), ['SP', 'SP'], ['RP', 'RP']].map(o => `<option value="${o[0]}"${o[0] === pf ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>
  ${t ? `<div class="kpis small"><div><small>Budget</small><b>${money(t.bud)}</b></div><div><small>Payroll</small><b>${money(F.payroll(st, my))}</b></div>${inFA ? `<div><small>Pending offers</small><b>${money(committed)}</b></div>` : ''}<div><small>Room</small><b class="${t.bud - F.payroll(st, my) - committed < 0 ? 'bad' : 'good'}">${money(t.bud - F.payroll(st, my) - committed)}</b></div></div>` : ''}
  ${faTabs()}
  <p class="muted">${inFA ? `Free agency day ${st.fa.day + 1} of 6. Offers are salary per year ($M) × years. Players weigh money, years, and how good your team is — and each day without a deal they get more flexible.` : 'Outside the free-agency period, sign any free agent instantly at (or above) his asking price.'}</p>
  <div class="card flush scroll tall"><table class="t"><tr><th>Pos</th><th class="l">Name</th><th>Age</th><th>OVR</th><th>POT</th><th>Ratings</th><th>Asking</th>${inFA ? '<th>Interest</th>' : ''}<th>Your offer ($M / yrs)</th></tr>${rows || '<tr><td colspan=9 class="muted">No free agents.</td></tr>'}</table></div>`;
}

/* ---------------- RE-SIGN ---------------- */
function V_resign() {
  const st = App.st, my = myTid();
  if (st.phase !== 'resign' || !st.resign) return '<div class="card">The re-signing period is over.</div>';
  const ids = Object.keys(st.resign.asks).filter(id => PL(id) && PL(id).tid === my);
  const t = T(my);
  const total = ids.filter(id => st.resign.dec[id]).reduce((s, id) => s + st.resign.asks[id].sal - PL(id).sal, 0);
  return `<div class="pagehead"><h2>Re-sign Players</h2></div><div class="kpis small"><div><small>Budget</small><b>${money(t.bud)}</b></div><div><small>Payroll now</small><b>${money(F.payroll(st, my))}</b></div><div><small>Change if re-signed</small><b>${total >= 0 ? '+' : ''}${money(total)}</b></div></div>
  <p class="muted">Tick the players you want to bring back at their asking price. Anyone not re-signed becomes a free agent. Some players want to test the market and won't negotiate.</p>
  <div class="card flush"><table class="t"><tr><th>Keep</th><th>Pos</th><th class="l">Name</th><th>Age</th><th>OVR</th><th>POT</th><th>Old salary</th><th>Asking</th><th></th></tr>
  ${ids.map(id => { const p = PL(id), a = st.resign.asks[id]; return `<tr><td>${a.will ? `<input type="checkbox" data-chg="resign" data-id="${id}"${st.resign.dec[id] ? ' checked' : ''}>` : '—'}</td><td>${p.p}</td><td class="l">${plink(p)}</td><td>${p.a}</td><td><span class="ov ${rc(p.o)}">${p.o}</span></td><td>${grade(p.pt)}</td><td>${money(p.sal)}</td><td>${money(a.sal)} × ${a.y}</td><td>${a.will ? '' : '<span class="bad sm">Testing free agency</span>'}</td></tr>`; }).join('') || '<tr><td colspan=9 class="muted">No expiring contracts.</td></tr>'}</table></div>`;
}

/* ---------------- DRAFT ---------------- */
function V_draft() {
  const st = App.st, my = myTid(), d = st.draft;
  if (!d) return `<div class="card"><h2>Amateur Draft</h2><p>The ${st.season} draft happens on <b>${F.dayLabel(st, F.draftDay(st))}</b> (day ${F.draftDay(st) + 1}). The regular season pauses for 5 rounds; worst records pick first.</p><p><button class="btn" data-act="nav" data-v="scouting">Scout this year's draft class</button></p></div>`;
  const made = d.made.slice().reverse().slice(0, 40).map(([tid, pid], i) => { const p = PL(pid); const no = d.made.length - i; return `<tr class="${tid === my ? 'me' : ''}"><td>${no}</td><td>${tb(tid)}</td><td class="l">${p ? plink(p) : '(released)'}</td><td>${p ? p.p : ''}</td><td>${p ? p.a : ''}</td></tr>`; }).join('');
  if (d.done) return `<div class="card"><h2>${st.season} Draft — Complete</h2><p class="muted">Draftees report to AAA. The next draft is next season.</p></div><div class="card flush scroll tall"><table class="t"><tr><th>#</th><th>Tm</th><th class="l">Player</th><th>Pos</th><th>Age</th></tr>${d.made.map(([tid, pid], i) => { const p = PL(pid); return `<tr class="${tid === my ? 'me' : ''}"><td>${i + 1}</td><td>${tb(tid)}</td><td class="l">${p ? plink(p) : '(gone)'}</td><td>${p ? p.p : ''}</td><td>${p ? p.a : ''}</td></tr>`; }).join('')}</table></div>`;
  const onClock = d.picks[d.i]; const mineOn = canControl(onClock);
  const est = p => F.scoutEst(st, my, p);
  const pf = App.filt.dpos || 'all';
  const pool = F.draftProspects(st).filter(p => pf === 'all' ? true : pf === 'P' ? F.isP(p) : pf === 'H' ? !F.isP(p) : p.p === pf)
    .map(p => { const e = est(p); return { p, pot: e.pot, known: e.prog >= 95, e }; }).sort((a, b) => b.pot - a.pot);
  const myNext = []; for (let i = d.i; i < d.picks.length && myNext.length < 5; i++) if (d.picks[i] === my) myNext.push(i + 1);
  const scs = my != null ? F.scState(st, my) : { focus: [] };
  const rows = pool.slice(0, 120).map(({ p, pot, known, e }) => {
    const rk = F.isP(p) ? `VEL ${Math.round(p.r.vel)} CTL ${Math.round(p.r.ctl)} BRK ${Math.round(p.r.brk)}` : `CON ${Math.round(p.r.con)} POW ${Math.round(p.r.pow)} SPD ${Math.round(p.r.spd)} FLD ${Math.round(p.r.fld)}`;
    return `<tr><td><b>${p.p}</b></td><td class="l">${plink(p)}<div class="muted sm">${esc(p.sch || '')}</div></td><td>${p.a}</td><td>${p.a >= 20 ? 'College' : 'High School'}</td><td><span class="ov ${rc(e.ovr)}">${e.ovr}</span></td><td><b class="pot">${grade(pot)}</b> <span class="${known ? 'good' : 'muted'} sm">${known ? pot + ' ✔' : pot + ' ±' + e.rng}</span></td><td class="muted sm">${rk}</td>
    <td class="nw">${my != null && !known ? `<button class="mini ghost${scs.focus.includes(p.id) ? ' on' : ''}" data-act="focus" data-id="${p.id}">${scs.focus.includes(p.id) ? '👁 Following' : 'Follow'}</button>` : ''}${mineOn ? `<button class="mini" data-act="draftPick" data-id="${p.id}">Draft</button>` : ''}</td></tr>`;
  }).join('');
  return `<div class="pagehead"><h2>${st.season} Amateur Draft</h2><select data-chg="dpos">${[['all', 'All'], ['H', 'Hitters'], ['P', 'Pitchers'], ...F.HPOS.map(x => [x, x]), ['SP', 'SP'], ['RP', 'RP']].map(o => `<option value="${o[0]}"${o[0] === pf ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>
  <section class="card ${mineOn ? 'hi' : ''}"><div class="clock">Round ${Math.floor(d.i / 30) + 1}, Pick ${d.i + 1} of ${d.picks.length} — ${tb(onClock, true)} <b>${esc(F.tname(T(onClock)))}</b> ${mineOn ? '<span class="good">— you are on the clock!</span>' : ''}</div>
  ${my != null ? `<p>Your upcoming picks: ${myNext.join(', ') || 'none left'} · Estimates come from your scouting department — <a class="pl" data-act="nav" data-v="scouting">open Scouting</a> to follow prospects more closely.</p>` : ''}
  <div class="row">${mineOn ? `<button class="btn" data-act="draftAutoOne">Auto-pick this one</button>` : ''}${my != null ? `<label class="chk"><input type="checkbox" data-chg="draftAutoMe"${d.auto && d.auto[my] ? ' checked' : ''}> Auto-draft all my picks</label>` : ''}</div></section>
  <div class="grid2 wide-left"><div class="card flush scroll tall"><table class="t"><tr><th>Pos</th><th class="l">Prospect</th><th>Age</th><th>Level</th><th>OVR</th><th>POT (est.)</th><th>Tools</th><th></th></tr>${rows}</table></div>
  <div class="card flush scroll tall"><h3 class="pad">Recent picks</h3><table class="t"><tr><th>#</th><th>Tm</th><th class="l">Player</th><th>Pos</th><th>Age</th></tr>${made || '<tr><td colspan=5 class="muted">No picks yet</td></tr>'}</table></div></div>`;
}

/* ---------------- PLAYOFFS ---------------- */
function histTable() {
  const h = App.st.history; if (!h.length) return '';
  return `<section class="card flush"><h3 class="pad">Champions</h3><table class="t"><tr><th>Year</th><th class="l">Champion</th><th class="l">Runner-up</th><th class="l">MVPs</th></tr>${h.map(x => `<tr><td>${x.y}</td><td class="l"><b>${esc(x.champ)}</b></td><td class="l">${esc(x.ru)}</td><td class="l sm">${esc(x.aw.filter(a => /MVP/.test(a[0])).map(a => a[1]).join(' · '))}</td></tr>`).join('')}</table></section>`;
}

/* ---------------- LEAGUE ---------------- */
const TXK = [['trade', 'Trades', '#5aa9e6'], ['fa', 'FA signings', '#4cc38a'], ['resign', 'Re-signings', '#7fc8a9'], ['draft', 'Draft', '#f2c94c'], ['recall', 'Recalled', '#9b8cf0'], ['option', 'Sent down (MLB→AAA)', '#e0873a'], ['promote', 'Sent up', '#7ad3c4'], ['senddown', 'Sent down (AAA→AA)', '#c98a57'], ['release', 'Released', '#ef6461'], ['waive', 'Waived', '#d4777b'], ['position', 'Position changes', '#b9c6d2'], ['staff', 'Staff moves', '#8796a6'], ['other', 'Other', '#5d6b7a']];
function txnKind(x) { if (x.k) return x.k; const t = x.t || ''; return /^TRADE/.test(t) ? 'trade' : /signed (FA|free agent)/.test(t) ? 'fa' : /re-signed/.test(t) ? 'resign' : /Draft R|Fantasy draft/.test(t) ? 'draft' : /released/.test(t) ? 'release' : /called up|recalled/.test(t) ? 'recall' : /optioned/.test(t) ? 'option' : /hired|parted ways/.test(t) ? 'staff' : 'other'; }
function V_txn() {
  const st = App.st; const my = myTid();
  const kf = App.filt.txk || 'all', tf = App.filt.txt != null ? App.filt.txt : 'all', order = App.sort.txn || 'new';
  let list = st.txn.map((x, i) => Object.assign({ _i: i, _k: txnKind(x) }, x));
  if (kf !== 'all') list = list.filter(x => x._k === kf);
  if (tf === 'mine' && my != null) list = list.filter(x => (x.tm || []).includes(my) || (x.t || '').includes(T(my).ab + ' '));
  else if (tf !== 'all' && tf !== 'mine') list = list.filter(x => (x.tm || []).includes(+tf) || (x.t || '').startsWith(T(+tf).ab + ' ') || (x.t || '').includes(' ' + T(+tf).ab + ' '));
  if (order === 'old') list.reverse();
  else if (order === 'type') list.sort((a, b) => TXK.findIndex(k => k[0] === a._k) - TXK.findIndex(k => k[0] === b._k) || a._i - b._i);
  const counts = {}; st.txn.forEach(x => { const k = txnKind(x); counts[k] = (counts[k] || 0) + 1; });
  const chips = `<div class="chips txchips"><button class="chip${kf === 'all' ? ' on' : ''}" style="--c:#2b3a48" data-act="txk" data-k="all">All (${st.txn.length})</button>${TXK.filter(k => counts[k[0]]).map(k => `<button class="chip${kf === k[0] ? ' on' : ''}" style="--c:${k[2]}" data-act="txk" data-k="${k[0]}">${k[1]} (${counts[k[0]]})</button>`).join('')}</div>`;
  const rows = list.slice(0, 400).map(x => { const k = TXK.find(q => q[0] === x._k) || TXK[TXK.length - 1];
    return `<tr><td class="nw">${x.s} · ${esc(x.d)}</td><td><span class="txtag" style="--c:${k[2]}">${k[1].replace(/ \(.*\)/, '')}</span></td><td class="nw">${(x.tm || []).map(id => tb(id)).join(' ')}</td><td class="l">${esc(x.t)}</td></tr>`; }).join('');
  return `<div class="row" style="justify-content:space-between;margin-bottom:8px">${chips}<div class="row"><select data-chg="txt"><option value="all">All teams</option>${my != null ? `<option value="mine"${tf === 'mine' ? ' selected' : ''}>My team</option>` : ''}${st.teams.map(t => `<option value="${t.id}"${String(tf) === String(t.id) ? ' selected' : ''}>${t.ab} — ${esc(t.name)}</option>`).join('')}</select><select data-chg="txo"><option value="new"${order === 'new' ? ' selected' : ''}>Newest first</option><option value="old"${order === 'old' ? ' selected' : ''}>Oldest first</option><option value="type"${order === 'type' ? ' selected' : ''}>By type</option></select></div></div>
  <div class="card flush scroll tall"><table class="t"><tr><th>Date</th><th>Type</th><th>Team</th><th class="l">Transaction</th></tr>${rows || '<tr><td colspan=4 class="muted">No transactions match.</td></tr>'}</table></div>`;
}
function V_league() {
  const st = App.st; const tab = App.tab.league || 'news';
  let body = '';
  if (tab === 'news') body = `<div class="card">${newsList(st.news)}</div>`;
  if (tab === 'txn') body = V_txn();
  if (tab === 'hist') body = histTable() + st.history.map(h => `<section class="card"><h3>${h.y} Awards</h3><div class="awards">${h.aw.map(a => `<div><small>${esc(a[0])}</small><b>${esc(a[1])}</b></div>`).join('')}</div></section>`).join('') || '<div class="card muted">Complete a season to build league history.</div>';
  if (tab === 'teams') body = `<div class="card flush"><table class="t"><tr><th class="l">Team</th><th>Rec</th><th>OVR (top 26)</th><th>Payroll</th><th>Budget</th><th>Market</th><th>Manager</th></tr>${st.teams.map(t => { const a = F.active(st, t.id).sort((x, y) => y.o - x.o).slice(0, 26); const ov = Math.round(a.reduce((s, p) => s + p.o, 0) / Math.max(1, a.length)); return `<tr><td class="l">${tb(t.id)} ${tlink(t.id)}</td><td>${rec(t)}</td><td><span class="ov ${rc(ov)}">${ov}</span></td><td>${money(F.payroll(st, t.id))}</td><td>${money(t.bud)}</td><td>${['', 'Small', 'Mid', 'Large'][t.mkt]}</td><td>${t.user ? (App.mode === 'shared' ? esc(uname(t.user)) : 'You') : '<span class="muted">AI</span>'}</td></tr>`; }).join('')}</table></div>`;
  return `<div class="pagehead"><h2>League Office</h2></div><div class="tabs">${[['news', 'News'], ['txn', 'Transactions'], ['teams', 'Teams'], ['hist', 'History & Awards']].map(([k, l]) => `<a class="${tab === k ? 'on' : ''}" data-act="tab" data-g="league" data-v="${k}">${l}</a>`).join('')}</div>${body}`;
}

/* ---------------- SETTINGS ---------------- */
function V_settings() {
  const st = App.st;
  const c = isCommish();
  const us = st.teams.filter(t => t.user != null);
  return `<div class="pagehead"><h2>Settings</h2></div><div class="grid2">
  <section class="card"><h3>League</h3><div class="form">
   <label>Name<input id="sName" value="${esc(st.name)}" maxlength="40"${c ? '' : ' disabled'}></label>
   <label>Trade AI difficulty<select id="sDiff"${c ? '' : ' disabled'}>${['easy', 'normal', 'hard'].map(n => `<option${st.settings.diff === n ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
   <label>Injuries<select id="sInj"${c ? '' : ' disabled'}><option value="1"${st.settings.injuries ? ' selected' : ''}>On</option><option value="0"${!st.settings.injuries ? ' selected' : ''}>Off</option></select></label>
   ${App.mode === 'shared' ? `<label>Who can advance<select id="sAdv"${c ? '' : ' disabled'}>${[['commish', 'Commissioner only'], ['ready', 'Anyone, once all are ready'], ['any', 'Any manager']].map(o => `<option value="${o[0]}"${st.settings.advance === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label>` : ''}
   <p class="muted sm">Season length (${st.settings.games} games) is fixed for this league.</p>
   ${c ? '<button class="btn primary" data-act="saveSettings">Save settings</button>' : '<p class="muted sm">Only the commissioner can change league settings.</p>'}</div></section>
  <section class="card"><h3>Tutorial</h3><p class="muted sm">A quick tour of the site and the basics of baseball.</p><button class="btn" data-act="tutMenu">📘 Open tutorial</button></section>
  ${App.mode === 'local' ? `<section class="card"><h3>Controlled teams (couch co-op)</h3><p class="muted sm">Every ★ team is human-controlled. Use the switcher at the top to manage each one.</p>
   <div class="chips">${st.teams.map(t => `<button class="chip${t.user ? ' on' : ''}" data-act="toggleUser" data-id="${t.id}" style="--c:${t.col}">${t.ab}</button>`).join('')}</div></section>` :
      managersCard()}
  <section class="card"><h3>Backup</h3><p class="muted sm">Export copies the whole league as text you can paste into Import later (single player).</p><div class="row"><button class="btn" data-act="export">Copy export</button><button class="btn ghost" data-act="home">Back to main menu</button></div>
   ${App.mode === 'local' ? `<button class="btn bad ghost" data-act="delSave" data-id="${esc(App.id)}" style="margin-top:10px">Delete this franchise</button>` : (c ? `<button class="btn bad ghost" data-act="delLeague" style="margin-top:10px">Delete this league for everyone</button>` : '')}</section>
  <section class="card"><h3>How it works</h3><ul class="help"><li><b>Play Game</b> lets you manage any of your games at-bat by at-bat: pinch hit, steal, bunt, walk a batter, or go to the bullpen.</li><li>The <b>draft</b> happens mid-season; the <b>trade deadline</b> follows. After the postseason: awards → re-sign → 6 days of free agency → preseason.</li><li>Players develop toward their potential until their late 20s and decline in their 30s.</li><li>Budgets grow with winning. Free-agent offers can't exceed your budget.</li></ul></section>
  </div>${us.length ? '' : ''}`;
}

/* ---------------- LIVE GAME ---------------- */
function startLive() {
  const g0 = myGameToday(); if (!g0) return toast('No game to play right now.');
  const snap = structuredClone(App.st);
  const my = myTid();
  const side = g0.h === my ? 1 : 0;
  const ctrl = [false, false]; ctrl[side] = true;
  const pen = [true, true]; pen[side] = App.penMode === 'ai';
  const g = new F.Game(snap, g0.h, g0.a, { log: true, ctrl, autoPen: pen, playoff: g0.type === 'po' });
  App.live = { g, st: snap, info: g0, side, sel: null };
  render();
}
function V_live() {
  const L = App.live, g = L.g, st = L.st;
  const TT = id => st.teams[id];
  const n = Math.max(9, g.inn);
  const ls = [0, 1].map(i => { const sd = g.s[i]; return `<tr><td class="l">${tb(sd.tid)} ${esc(TT(sd.tid).name)}<div class="lsp">P: ${esc(F.sname(st.players[sd.pit]))} · ${sd.pc[sd.pit] || 0} P ${stamBarG(g, sd)}</div></td>${Array.from({ length: n }, (_, k) => `<td>${sd.ls[k] != null ? sd.ls[k] : ''}</td>`).join('')}<td class="R">${sd.runs}</td><td>${sd.hits}</td></tr>`; }).join('');
  const off = g.off, def = g.def;
  const slot = off.order[off.bi % 9]; const bat = st.players[slot.id]; const pit = st.players[def.pit];
  const bl = off.bat[bat.id]; const today = bl ? `${bl[B.h]}-${bl[B.ab]}${bl[B.hr] ? ', ' + bl[B.hr] + ' HR' : ''}${bl[B.bb] ? ', ' + bl[B.bb] + ' BB' : ''}` : '0-0';
  const sl = bat.sb ? F.batLine(bat.sb) : null;
  const pc = def.pc[def.pit] || 0;
  const fat = g.stamina(def, def.pit);
  const stamBar = (sd, id) => { const s = g.stamina(sd, id); return `<span class="stm" title="Stamina ${s}%"><i><b class="${s > 55 ? 'r4' : s > 30 ? 'r2' : 'r1'}" style="width:${s}%"></b></i>${s}%</span>`; };
  const pln = def.pitl[def.pit];
  const mineBat = g.half === L.side, mineDef = !mineBat;
  const b = g.bases;
  const rn = o => o ? esc(F.sname(st.players[o.id]).split(' ').slice(1).join(' ') || '') : '';
  const dia = diamondSVG(L, rn);
  let pop = '';
  const ev = g.ev;
  if (ev) {
    const fresh = ev.seq !== L.shown; L.shown = ev.seq;
    pop = `<div class="pop c-${ev.c} ${fresh ? 'anim' : 'stale'}"><b>${esc(ev.label)}</b>${ev.who ? `<span>${esc(ev.who)}</span>` : ''}${ev.walkoff ? '<em class="wo">WALK-OFF!</em>' : ev.endInn && !ev.runs ? '<i>Side retired</i>' : ''}</div>`;
    if (ev.runs > 0) {
      const bt = st.teams[g.s[ev.side].tid];
      const sc = `${st.teams[g.s[0].tid].ab} ${ev.score ? ev.score.split(', ')[0].split(' ').pop() : g.s[0].runs} · ${st.teams[g.s[1].tid].ab} ${ev.score ? ev.score.split(', ')[1].split(' ').pop() : g.s[1].runs}`;
      pop += `<div class="runpop ${fresh ? 'anim' : 'stale'}" style="--c:${bt.col}"><b>${ev.runs === 1 ? 'RUN SCORES!' : ev.runs + ' RUNS SCORE!'}</b><span>${esc(sc)}</span></div>`;
    }
  }
  let subBan = '';
  if (g.lastSub) {
    const fresh2 = g.lastSub.seq !== L.shownSub; L.shownSub = g.lastSub.seq;
    if (fresh2) subBan = `<div class="subpop anim" style="--c:${(st.teams[g.lastSub.tid] || {}).col || '#5aa9e6'}">🔄 <b>${esc(g.lastSub.ab)} ${esc(g.lastSub.kind)}</b> ${esc(g.lastSub.who)}${g.lastSub.why ? ` <span>${esc(g.lastSub.why)}</span>` : ''}</div>`;
  }
  const outs = `<div class="outs">${[0, 1, 2].map(i => `<i class="${i < g.outs ? 'on' : ''}"></i>`).join('')}<span>${g.outs} out${g.outs === 1 ? '' : 's'}</span></div>`;
  let controls = '';
  if (!g.over && L.prompt) {
    controls = '';
  } else if (!g.over && L.auto) {
    controls = `<button class="btn primary" data-act="lv" data-k="pause">❚❚ Pause</button><span class="muted">Simulating ${L.auto === 'half' ? 'the half-inning' : 'to the end'}…${L.aiOn ? ' <b>AI is managing your team</b> (pause to take back control)' : ''}</span>${speedSel()}`;
  } else if (!g.over) {
    const avail = g.availPen(def);
    const benchOk = off.bench.filter(id => !off.gone.includes(id));
    if (mineBat) {
      controls = `<button class="btn primary" data-act="lv" data-k="pa">Next At-Bat</button>
      ${g.outs < 2 && (b[0] || b[1]) ? '<button class="btn" data-act="lv" data-k="bunt">Sac Bunt</button>' : ''}
      ${b[0] && !b[1] ? '<button class="btn" data-act="lv" data-k="steal2">Steal 2nd</button>' : ''}${b[1] && !b[2] ? '<button class="btn" data-act="lv" data-k="steal3">Steal 3rd</button>' : ''}
      ${benchOk.length ? `<select data-chg="lvPH"><option value="">Pinch hit…</option>${benchOk.map(id => { const p = st.players[id]; return `<option value="${id}">${esc(F.sname(p))} (${p.p}, ${p.o})</option>`; }).join('')}</select>` : ''}`;
    } else {
      controls = `<button class="btn primary" data-act="lv" data-k="pa">Next At-Bat</button><button class="btn" data-act="lv" data-k="ibb">Intentional Walk</button>
      ${avail.length ? `<select data-chg="lvPC"><option value="">Pitching change…</option>${avail.map(id => { const p = st.players[id]; return `<option value="${id}">${esc(F.sname(p))} (${p.p}, ${p.o}, ⚡${Math.round(p.e)})${id === def.cl ? ' – CL' : id === def.su ? ' – SU' : ''}</option>`; }).join('')}</select>` : '<span class="muted sm">Bullpen empty</span>'}`;
    }
    controls += `<button class="btn ghost" data-act="lv" data-k="half">▶ Play Half-Inning</button><button class="btn ghost" data-act="lv" data-k="end">▶▶ Play to End</button><button class="btn ghost sm lvtog" data-act="lvMore">${App.lvMore ? '✕ Close' : '⚙ Options'}</button><span class="lvsec">${speedSel()}<button class="btn ghost sm" data-act="lv" data-k="instant" title="Skip straight to the final — the AI manages your team">Skip to Final</button><label class="chk" title="When you Play to End, the AI makes pinch-hit and pitching moves for you"><input type="checkbox" data-chg="aiTake"${App.aiTake ? ' checked' : ''}> AI manages my team on Play to End</label><select data-chg="lvPen" title="Bullpen management">${[['ask', 'Bullpen: ask me'], ['ai', 'Bullpen: AI decides'], ['manual', 'Bullpen: manual only']].map(o => `<option value="${o[0]}"${App.penMode === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></span>`;
  }
  const final = g.over ? `<section class="card hi"><h3>Final: ${esc(g.scoreStr())}</h3><p>${g.s[L.side].runs > g.s[1 - L.side].runs ? '<b class="good">Victory!</b>' : '<b class="bad">Tough loss.</b>'} ${g.result ? `W: ${esc(F.sname(st.players[g.result.w]))} · L: ${esc(F.sname(st.players[g.result.l]))}${g.result.sv ? ' · SV: ' + esc(F.sname(st.players[g.result.sv])) : ''}` : ''}</p><div class="row"><button class="btn primary" data-act="liveSave">Save Result & Continue</button><button class="btn ghost" data-act="liveBox">Box Score</button></div></section>` : '';
  const logs = g.log.slice(-60).reverse().map(x => `<li>${x}</li>`).join('');
  return `<div class="live">
  <div class="lhead"><h2>${g.half ? 'Bottom' : 'Top'} ${F.ord(g.inn)}</h2><span class="muted">${L.info.type === 'po' ? 'Postseason' : F.dayLabel(App.st, L.info.day)} · You are ${mineBat ? '<b>batting</b>' : '<b>pitching</b>'}</span>${!g.over ? `<button class="btn ghost sm" data-act="liveQuit">Quit (game will be simmed)</button>` : ''}</div>
  <div class="card flush"><table class="t ls"><tr><th class="l"></th>${Array.from({ length: n }, (_, k) => `<th>${k + 1}</th>`).join('')}<th>R</th><th>H</th></tr>${ls}</table></div>
  ${final}
  <div class="lgrid"><section class="card field"><div class="fieldwrap">${dia}${pop}${subBan}</div>${outs}</section>
  <section class="card mu"><div class="who"><small>AT BAT · ${esc(TT(off.tid).ab)} · #${(off.bi % 9) + 1} · ${slot.pos}</small><b>${esc(F.pname(bat))}</b><span class="muted">${bat.b}HB · ${bat.o} OVR · Today ${today}${sl ? ` · Season ${f3(sl.avg)}, ${bat.sb[B.hr]} HR` : ''}</span>
   <div class="rt">CON <b class="${rc(bat.r.con)}t">${Math.round(bat.r.con)}</b> POW <b class="${rc(bat.r.pow)}t">${Math.round(bat.r.pow)}</b> EYE <b class="${rc(bat.r.eye)}t">${Math.round(bat.r.eye)}</b> SPD <b class="${rc(bat.r.spd)}t">${Math.round(bat.r.spd)}</b></div></div>
   <div class="vs">vs</div>
   <div class="who"><small>PITCHING · ${esc(TT(def.tid).ab)}</small><b>${esc(F.pname(pit))}</b><span class="muted">${pit.t}HP · ${pit.o} OVR · ${pln ? ipS(pln[P.o]) + ' IP, ' + pln[P.r] + ' R, ' + pln[P.k] + ' K' : 'just entered'}</span>
   <div class="rt">VEL <b class="${rc(pit.r.vel)}t">${Math.round(pit.r.vel)}</b> CTL <b class="${rc(pit.r.ctl)}t">${Math.round(pit.r.ctl)}</b> BRK <b class="${rc(pit.r.brk)}t">${Math.round(pit.r.brk)}</b></div>
   <div class="bar stam"><span>Stamina · ${pc} P</span><i><b class="${fat > 55 ? 'r4' : fat > 30 ? 'r2' : 'r1'}" style="width:${fat}%"></b></i><em>${fat}%</em></div>${fat <= 30 ? '<div class="bad sm">⚠ Tired — his pitches are losing life</div>' : fat <= 50 ? '<div class="warn sm">Starting to tire</div>' : ''}</div></section></div>
  ${L.prompt && !g.over ? hookPanel(L) : ''}
  ${controls ? `<div class="controls${App.lvMore ? ' more' : ''}">${controls}</div>` : ''}
  <section class="card"><h3>Play-by-play</h3><ul class="pbp">${logs}</ul></section></div>`;
}
/* ---- base-running animation on the live diamond ---- */
const BASE_XY = [[60, 88], [100, 50], [60, 12], [20, 50], [60, 88]];
const BASE_MS = { slow: 430, normal: 300, fast: 150, test: 1 };
function baseMoves(L) {
  const g = L.g, cur = g.bases.map(o => o ? o.id : null), sl = g.scoredLog || [];
  const key = [g.inn, g.half, g.seq || 0, sl.length, cur.join(',')].join('|');
  const prev = L.bsnap;
  L.bsnap = { key, cur, half: g.half, inn: g.inn, seq: g.seq || 0, scN: sl.length };
  if (!prev || prev.key === key || (g.seq || 0) - prev.seq > 1) return { moves: [], arrive: {}, ms: 0 };
  const per = BASE_MS[App.liveSpeed] || 300;
  const pos = {}; prev.cur.forEach((id, i) => { if (id != null) pos[id] = i + 1; });
  const halfChanged = prev.half !== g.half || prev.inn !== g.inn;
  const from = id => pos[id] != null ? pos[id] : (id === g.lastBatId ? 0 : null);
  const moves = [], arrive = {}; let ms = 0;
  cur.forEach((id, i) => {
    if (id == null) return; const k = i + 1, f = from(id);
    if (f == null) { moves.push({ id, a: k, b: k, kind: 'appear' }); arrive[k] = per; ms = Math.max(ms, per); return; }
    if (f < k) { const d = (k - f) * per; moves.push({ id, a: f, b: k, kind: 'run', d }); arrive[k] = d; ms = Math.max(ms, d); }
  });
  const scored = sl.slice(prev.scN);
  scored.forEach(id => { const f = from(id); if (f == null) return; const d = (4 - f) * per; moves.push({ id, a: f, b: 4, kind: 'score', d }); ms = Math.max(ms, d + 350); });
  Object.keys(pos).forEach(k => { const id = +k; if (cur.includes(id) || scored.includes(id)) return; moves.push({ id, a: pos[id], b: pos[id], kind: halfChanged ? 'strand' : 'out' }); ms = Math.max(ms, 500); });
  return { moves, arrive, ms };
}
function diamondSVG(L, rn) {
  const g = L.g, st = L.st, b = g.bases;
  const { moves, arrive, ms } = baseMoves(L);
  L.animMs = ms;
  const col = id => { const p = st.players[id]; const t = p && st.teams[p.tid]; return (t && t.col) || 'var(--acc)'; };
  const moving = new Set(moves.map(m => m.id));
  const xy = i => BASE_XY[i];
  const bases = [[1, 'end', -10, 18], [2, 'middle', 0, -12], [3, 'start', 10, 18]].map(([k, an, dx, dy]) => {
    const o = b[k - 1], [x, y] = xy(k), d = arrive[k];
    const delay = o && d ? ` style="animation:baseoff ${d}ms step-end"` : '';
    return `<rect x="${x - 8}" y="${y - 8}" width="16" height="16" transform="rotate(45 ${x} ${y})" class="${o ? 'on' : ''}"${delay}/>${o ? `<text x="${x + dx}" y="${y + dy}" text-anchor="${an}" class="rname"${d ? ` style="animation:hid ${d}ms step-end"` : ''}>${rn(o)}</text>` : ''}`;
  }).join('');
  // runners standing still
  const still = b.map((o, i) => o && !moving.has(o.id) ? `<circle cx="${xy(i + 1)[0]}" cy="${xy(i + 1)[1] - 1}" r="4.2" class="rdot" style="fill:${col(o.id)}"/>` : '').join('');
  const anim = moves.map(m => {
    const c = col(m.id);
    if (m.kind === 'appear') return `<circle cx="${xy(m.b)[0]}" cy="${xy(m.b)[1] - 1}" r="4.2" class="rdot pop-in" style="fill:${c}"/>`;
    if (m.kind === 'out' || m.kind === 'strand') { const [x, y] = xy(m.a); return `<g class="${m.kind === 'out' ? 'rout' : 'rstrand'}"><circle cx="${x}" cy="${y - 1}" r="4.2" class="rdot" style="fill:${c}"/>${m.kind === 'out' ? `<text x="${x}" y="${y + 2}" text-anchor="middle" class="rx">✕</text>` : ''}</g>`; }
    const pts = []; for (let i = m.a; i <= m.b; i++) pts.push(xy(i)[0] + ' ' + (xy(i)[1] - 1));
    const path = 'M' + pts.join(' L');
    const trail = `<path d="${path}" pathLength="100" class="rtrail" style="stroke:${c};animation-duration:${m.d}ms"/>`;
    const fade = m.kind === 'score' ? `<animate attributeName="opacity" from="1" to="0" begin="${m.d}ms" dur="350ms" fill="freeze"/><animate attributeName="r" from="4.2" to="9" begin="${m.d}ms" dur="350ms" fill="freeze"/>` : '';
    return `${trail}<circle r="4.2" class="rdot${m.kind === 'score' ? ' rscore' : ''}" style="fill:${c}"><animateMotion dur="${m.d}ms" fill="freeze" calcMode="linear" path="${path}"/>${fade}</circle>`;
  }).join('');
  return `<svg viewBox="0 0 120 100" class="dia"><path d="M60 92 L104 50 L60 8 L16 50 Z" class="grass"/><path d="M60 88 L100 50 L60 12 L20 50 Z" fill="none" stroke="currentColor" opacity=".35"/>${bases}<rect x="54" y="82" width="12" height="12" transform="rotate(45 60 88)" class="home"/>${still}${anim}</svg>`;
}
function stamBarG(g, sd) { const s = g.stamina(sd, sd.pit); return `<span class="stm"><i><b class="${s > 55 ? 'r4' : s > 30 ? 'r2' : 'r1'}" style="width:${s}%"></b></i>${s}%</span>`; }
function speedSel() { return `<select data-chg="lvSpeed" title="Sim speed">${[['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast']].map(o => `<option value="${o[0]}"${App.liveSpeed === o[0] ? ' selected' : ''}>${o[1]} speed</option>`).join('')}</select>`; }
const SPEED = { slow: 1700, normal: 1000, fast: 420, test: 1 };
function checkHook(L) {
  const g = L.g; if (g.over || L.aiOn || App.penMode !== 'ask' || g.half === L.side) return null;
  const st = L.st, sd = g.def, id = sd.pit, p = st.players[id];
  const av = g.availPen(sd); if (!av.length) return null;
  const pc = sd.pc[id] || 0, wk = g.work(sd, id), lim = g.limitFor(sd, id), ra = sd.ra[id] || 0, ln = sd.pitl[id] || [], stam = g.stamina(sd, id);
  const di = 1 - g.half, lead = g.lead(di), empty = !g.bases.some(Boolean);
  const asked = L.asked || (L.asked = {});
  const nm = F.pname(p);
  const line = `${ipS(ln[P.o] || 0)} IP, ${ln[P.h] || 0} H, ${ln[P.r] || 0} R, ${ln[P.bb] || 0} BB, ${ln[P.k] || 0} K`;
  const ask = (key, kind, title, msg) => { if (asked[key]) return null; asked[key] = 1; return { kind, title, msg, pid: id }; };
  let r = null;
  if (g.halfStart && g.outs === 0 && empty && g.inn >= 9 && lead >= 1 && lead <= 3 && id !== sd.cl && av.includes(sd.cl))
    r = ask('save' + g.inn, 'save', 'Save situation', `${F.ord(g.inn)} inning, ${lead}-run lead. Bring in your closer, ${F.pname(st.players[sd.cl])}?`);
  if (!r && g.halfStart && g.outs === 0 && empty && g.inn === 8 && lead >= 1 && lead <= 3 && id === sd.sp && sd.su && av.includes(sd.su))
    r = ask('setup8', 'save', 'Hold the lead', `8th inning, ${lead}-run lead. Hand the ball to your setup man, ${F.pname(st.players[sd.su])}?`);
  if (!r && g.halfStart && g.outs === 0 && empty && id !== sd.sp && (sd.outsBy[id] || 0) >= 3) r = ask(id + 'inn' + g.inn, 'tired', 'Fresh arm?', `${nm} already pitched ${ipS(sd.outsBy[id])} innings in relief (${pc} pitches). Go to the bullpen for the ${F.ord(g.inn)}?`);
  if (!r && wk >= lim + 8) r = ask(id + 'gassed', 'gassed', 'He\'s running on fumes', `${nm} is exhausted — stamina ${stam}% after ${pc} pitches — and his stuff is fading fast. (${line})`);
  if (!r && wk >= lim - 6) r = ask(id + 'tired', 'tired', 'Your pitcher is tiring', `${nm}'s stamina is down to ${stam}% after ${pc} pitches. (${line})`);
  if (!r && ra >= 4) r = ask(id + 'ra' + (ra >= 7 ? 7 : ra >= 6 ? 6 : 4), 'struggle', 'He\'s getting hit hard', `${nm} has allowed ${ra} runs. (${line})`);
  if (!r && g.bases.every(Boolean) && g.inn >= 5 && Math.abs(lead) <= 3) r = ask(id + 'jam' + g.inn + g.outs, 'jam', 'Bases loaded', `${nm} is in a jam with the bases loaded and ${g.outs} out${g.outs === 1 ? '' : 's'}. (${line})`);
  return r;
}
function hookPanel(L) {
  const g = L.g, st = L.st, sd = g.def, pr = L.prompt;
  const cur = st.players[sd.pit];
  const off = g.off; const nx = [0, 1, 2].map(i => st.players[off.order[(off.bi + i) % 9].id]);
  const RO = { CL: 0, STP: 1, SU: 2, SPL: 3, SPR: 3, MR: 4, LR: 5 };
  const av = g.availPen(sd).map(id => st.players[id]).sort((a, b) => (RO[(sd.roles || {})[a.id] || 'MR'] - RO[(sd.roles || {})[b.id] || 'MR']) || b.o - a.o);
  const role = p => { const r = (sd.roles || {})[p.id] || (p.id === sd.cl ? 'CL' : 'MR'); return `<span class="tag${['CL', 'SU', 'STP'].includes(r) ? ' gold' : ''}" title="${F.ROLE_NAMES[r] || ''}">${r}</span>`; };
  const era = p => p.sp ? f2(F.pitLine(p.sp).era) : '—';
  const visited = sd.bonus && sd.bonus[sd.pit];
  return `<section class="card hook k-${pr.kind}"><div class="hk"><span class="ic">${pr.kind === 'save' ? '🔒' : pr.kind === 'struggle' || pr.kind === 'jam' ? '🔥' : '🥵'}</span><div><h3>${esc(pr.title)}</h3><p>${esc(pr.msg)}</p>
  <p class="muted sm">Due up: ${nx.map(p => `${esc(F.sname(p))} <b>(${p.b})</b>`).join(' · ')}</p></div></div>
  <div class="scroll"><table class="t"><tr><th class="l">Reliever</th><th>Role</th><th>T</th><th>OVR</th><th>VEL/CTL/BRK</th><th>Energy</th><th>ERA</th><th></th></tr>
  ${av.map(p => `<tr><td class="l"><b>${esc(F.pname(p))}</b></td><td>${role(p)}</td><td>${p.t}HP</td><td><span class="ov ${rc(p.o)}">${p.o}</span></td><td class="sm">${Math.round(p.r.vel)}/${Math.round(p.r.ctl)}/${Math.round(p.r.brk)}</td><td>${energy(p)}</td><td>${era(p)}</td><td><button class="btn primary sm" data-act="hookIn" data-id="${p.id}">Bring him in</button></td></tr>`).join('')}</table></div>
  <div class="row" style="margin-top:10px"><button class="btn" data-act="hookStay">Leave ${esc(F.sname(cur))} in</button>${visited ? '' : `<button class="btn ghost" data-act="hookVisit" title="Buys a few more pitches, once per pitcher">Mound visit</button>`}${L.resume ? '<span class="muted sm">The sim resumes after you decide.</span>' : ''}</div></section>`;
}
function hookResume() {
  const L = App.live; L.prompt = null;
  if (L.resume) { L.auto = L.resume; L.resume = null; render(); L.timer = setTimeout(liveTick, 350); } else render();
}
function liveTick() {
  const L = App.live; if (!L || !L.auto) return;
  const g = L.g;
  if (g.over) { L.auto = null; render(); return; }
  const hk = checkHook(L);
  if (hk) { L.prompt = hk; L.resume = L.auto; L.auto = null; render(); return; }
  g.pa();
  if (L.auto === 'half' && (g.inn !== L.autoAt[0] || g.half !== L.autoAt[1])) L.auto = null;
  if (g.over) L.auto = null;
  render();
  if (L.auto) { const ev = g.ev; const extra = Math.max(0, (L.animMs || 0) - SPEED[App.liveSpeed] * 0.6) + (ev && ev.runs ? 1100 : ev && ev.c === 'HR' ? 600 : 0) + (g.lastSub && g.lastSub.seq !== L.lastSubTick ? 500 : 0); L.lastSubTick = g.lastSub && g.lastSub.seq; L.timer = setTimeout(liveTick, SPEED[App.liveSpeed] + extra); }
}
function liveStop() { const L = App.live; if (L) { L.auto = null; clearTimeout(L.timer); if (L.aiOn) aiTakeover(L, false); } }
function aiTakeover(L, on) {
  const g = L.g; L.aiOn = on;
  g.ctrl[L.side] = !on; g.autoPen[L.side] = on || App.penMode === 'ai';
  if (on) { L.prompt = null; g.say('<i>AI manager takes over for the rest of the game.</i>'); }
}
function liveAction(k) {
  const L = App.live, g = L.g; if (!g) return;
  if (k === 'pause') { liveStop(); render(); return; }
  if (g.over) return;
  if (k === 'half' || k === 'end') { liveStop(); L.auto = k; L.autoAt = [g.inn, g.half]; if (k === 'end' && App.aiTake) aiTakeover(L, true); liveTick(); return; }
  if (k === 'instant') { liveStop(); aiTakeover(L, true); g.simToEnd(); render(); return; }
  if (k === 'pa') { if (!L.prompt) { const hk = checkHook(L); if (hk) { L.prompt = hk; L.resume = null; render(); return; } } L.prompt = null; g.pa(); }
  if (k === 'bunt') g.pa({ bunt: true });
  if (k === 'ibb') g.pa({ ibb: true });
  if (k === 'steal2') g.steal(0);
  if (k === 'steal3') g.steal(1);
  render();
}
async function liveSave() {
  liveStop();
  const L = App.live; const box = L.g.box(); const info = L.info;
  const local = App.mode === 'local';
  const err = await act(st => {
    if (info.type === 'reg') {
      const gm = st.phase === 'regular' && st.day === info.day ? st.sched[info.day][info.idx] : null;
      if (!gm || gm[2] != null) return 'That game was already simulated by the league, so this result was discarded.';
      gm[2] = box.hs; gm[3] = box.as; gm[4] = F.applyBox(st, box, { day: info.day, keepBox: true });
      if (local) F.simDay(st);
    } else {
      const s = st.phase === 'playoffs' && st.po ? st.po.series[info.sidx] : null;
      if (!s || s.g.length !== info.n || s.pending || s.win != null) return 'That game was already played, so this result was discarded.';
      F.recordPlayoffGame(st, s, box); s.pending = true;
      if (local) F.playoffDay(st);
    }
  }, 'Saving game…');
  App.live = null;
  if (!err && local) toast('Result saved. The rest of the day was simulated.', 'good');
  render();
}
function openBox(id, boxObj) {
  const st = App.st; const bx = boxObj || st.boxes.find(b => b.id === id);
  if (!bx) return toast('Box score no longer available (only recent games are kept).');
  const nm = pid => esc(bx.names[pid] || (st.players[pid] ? F.sname(st.players[pid]) : '?'));
  const n = Math.max(9, bx.sides[0].ls.length);
  const ls = bx.sides.map((sd, i) => `<tr><td class="l">${tb(sd.tid)} ${esc(T(sd.tid).name)}</td>${Array.from({ length: n }, (_, k) => `<td>${sd.ls[k] != null ? sd.ls[k] : 'x'}</td>`).join('')}<td class="R">${sd.runs}</td><td>${sd.hits}</td></tr>`).join('');
  const bt = sd => { const m = new Map(sd.bat); const ord = sd.order.map(o => o[0]); const ids = ord.concat([...m.keys()].filter(x => !ord.includes(x))); return `<table class="t"><tr><th class="l">${T(sd.tid).ab} Batting</th><th>AB</th><th>R</th><th>H</th><th>RBI</th><th>BB</th><th>K</th><th>HR</th></tr>${ids.filter(id => m.has(id)).map(id => { const l = m.get(id); const pos = (sd.order.find(o => o[0] === id) || [0, 'PH'])[1]; return `<tr><td class="l"><a class="pl" data-act="player" data-id="${id}">${nm(id)}</a> <span class="muted">${pos}</span></td><td>${l[B.ab]}</td><td>${l[B.r]}</td><td>${l[B.h]}</td><td>${l[B.rbi]}</td><td>${l[B.bb]}</td><td>${l[B.k]}</td><td>${l[B.hr] || ''}</td></tr>`; }).join('')}</table>`; };
  const pt = sd => `<table class="t"><tr><th class="l">${T(sd.tid).ab} Pitching</th><th>IP</th><th>H</th><th>R</th><th>ER</th><th>BB</th><th>K</th><th>HR</th><th>PC</th></tr>${sd.pit.map(([id, l, pc]) => `<tr><td class="l"><a class="pl" data-act="player" data-id="${id}">${nm(id)}</a> ${l[P.w] ? '<b class="good">W</b>' : ''}${l[P.l] ? '<b class="bad">L</b>' : ''}${l[P.sv] ? '<b>SV</b>' : ''}</td><td>${ipS(l[P.o])}</td><td>${l[P.h]}</td><td>${l[P.r]}</td><td>${l[P.er]}</td><td>${l[P.bb]}</td><td>${l[P.k]}</td><td>${l[P.hr] || ''}</td><td>${pc}</td></tr>`).join('')}</table>`;
  modal(`<h2>${esc(T(bx.a).name)} ${bx.as} @ ${esc(T(bx.h).name)} ${bx.hs}${bx.inn > 9 ? ` <small class="muted">(${bx.inn})</small>` : ''}</h2><table class="t ls"><tr><th></th>${Array.from({ length: n }, (_, k) => `<th>${k + 1}</th>`).join('')}<th>R</th><th>H</th></tr>${ls}</table>
  <div class="grid2">${bx.sides.map(sd => `<div>${bt(sd)}${pt(sd)}</div>`).join('')}</div>${bx.log ? `<details><summary>Play-by-play</summary><ul class="pbp">${bx.log.map(x => `<li>${x}</li>`).join('')}</ul></details>` : ''}`);
}

/* ---------------- sims ---------------- */
async function doSim(k) {
  if (!canAdvance()) return toast('Waiting for the commissioner — or for every manager to mark Ready.');
  const label = { day: 'Simulating day…', week: 'Simulating week…', month: 'Simulating month…', season: 'Simulating season…', draft: 'Simulating…', deadline: 'Simulating…', round: 'Simulating round…', playoffs: 'Simulating postseason…', phase: 'Advancing…' }[k];
  await act(st => {
    const ph = st.phase;
    if (k === 'phase') F.advancePhase(st);
    else if (ph === 'regular') {
      const n = { day: 1, week: 7, month: 30, season: 999, draft: 999, deadline: 999, asg: 999 }[k] || 1;
      F.simDays(st, n, k === 'deadline' ? s => s.day >= F.deadlineDay(s) : k === 'asg' ? s => s.asg && s.asg.done : null);
    } else if (ph === 'playoffs') {
      const r0 = st.po.round;
      const n = k === 'day' ? 1 : 99;
      for (let i = 0; i < n && st.phase === 'playoffs'; i++) { F.playoffDay(st); if (k === 'round' && st.po.round !== r0) break; }
    }
    st.ready = {};
  }, label);
}

/* ---------------- league open/create ---------------- */
async function openSave(id) {
  busy(true, 'Loading…');
  try { App.st = await S.loadLocal(id); F.ensureExt(App.st); App.mode = 'local'; App.id = id; resetView(); setLast('local', id, App.st.name); }
  catch (e) { toast(esc(e.message), 'err'); }
  busy(false); render();
}
function setLast(mode, id, name) { try { localStorage.setItem('fob_last', JSON.stringify({ mode, id, name, t: Date.now() })); } catch (e) { } }
function getLast() { try { return JSON.parse(localStorage.getItem('fob_last') || 'null'); } catch (e) { return null; } }
async function openLeague(lid) {
  busy(true, 'Loading league…');
  try {
    const { st } = await S.fetchShared(lid);
    F.ensureExt(st);
    App.st = st; App.mode = 'shared'; App.id = lid; resetView(); setLast('shared', lid, st.name);
    try { if (location.hash !== '#join-' + lid) location.hash = 'join-' + lid; } catch (e) { }
    if (App.unsub) App.unsub();
    App.unsub = S.watch(lid, meta => onRemote(meta), () => { });
    App.msgs = []; if (App.unsubMsgs) App.unsubMsgs();
    App.unsubMsgs = S.watchMsgs(lid, list => { const before = (App.msgs || []).length; const prevIds = new Set((App.msgs || []).map(m => m.id)); App.msgs = list; const fresh = list.filter(m => !prevIds.has(m.id) && m.a !== S.uid && (m.b === 'all' || m.b === S.uid)); App._msgsScrollBottom = true; if (before && fresh.length && App.view !== 'inbox') toast(`✉️ ${esc(uname(fresh[0].a))}: ${esc(fresh[0].t.slice(0, 80))}`, 'good'); if (!App.live && $('#modal').style.display !== 'flex') render(); });
    resolveNames();
  } catch (e) { toast(esc(e.message), 'err'); }
  busy(false); render();
}
let fetching = false;
async function onRemote(meta) {
  if (!meta) { if (App.mode === 'shared' && App.st) { toast('This league was deleted.', 'err'); goHome(); } return; }
  if (!App.st || App.mode !== 'shared' || meta.ver <= App.st.ver || fetching) return;
  fetching = true;
  try {
    const { st } = await S.fetchShared(App.id, meta);
    if (st.ver > App.st.ver) {
      const oldDay = App.st.day + App.st.phase, wasIn = S.uid in (App.st.members || {});
      App.st = st;
      if (wasIn && !(S.uid in (st.members || {}))) toast('You are no longer managing a team in this league. You can claim an open team from the League page.', 'err');
      if (!App.live) { if ($('#modal').style.display !== 'flex') render(); else { const top = document.querySelector('header.top'); if (top) top.outerHTML = shellTop(); } }
      F.ensureExt(st);
      if (oldDay !== st.day + st.phase) toast('The league advanced.', 'good');
      resolveNames();
    }
  } catch (e) { console.warn(e); }
  fetching = false;
}
function resetView() { App.view = 'home'; App.vt = null; App.my = null; App.live = null; App.trade = { partner: null, give: [], get: [] }; App.tab = {}; App.filt = {}; }
function goHome() { try { if (location.hash) location.hash = ''; } catch (e) { } if (App.unsub) { App.unsub(); App.unsub = null; } if (App.unsubMsgs) { App.unsubMsgs(); App.unsubMsgs = null; } App.msgs = []; if (App.mode === 'local' && App.st) saveNow(); App.st = null; App.mode = null; App.live = null; App.start.wizard = null; render(); loadStart(); }
async function createFromWizard() {
  const w = App.start.wizard;
  w.name = ($('#wName').value || '').trim() || 'My Franchise'; w.games = +$('#wGames').value; w.real = $('#wReal').value === '1'; w.fd = $('#wFd').value === '1'; w.diff = $('#wDiff').value; w.inj = $('#wInj').value === '1';
  const adv = $('#wAdv') ? $('#wAdv').value : 'commish';
  if (!w.teams.length) return toast('Pick a team first.', 'err');
  busy(true, 'Building the league…'); await nextFrame();
  try {
    const st = F.createLeague({ real: w.real, name: w.name, games: w.games, diff: w.diff, injuries: w.inj, advance: adv, commish: w.mode === 'shared' ? S.uid : null });
    if (w.fd) F.fdStart(st);
    if (w.mode === 'shared') {
      const tid = w.teams[0]; st.teams[tid].user = S.uid; st.members[S.uid] = tid;
      if (st.fd) st.fd.paused = true;
      const lid = await S.createShared(st);
      App.start.wizard = null; busy(false);
      await openLeague(lid); if (window.tutOffer) tutOffer(); return;
    }
    w.teams.forEach(tid => { st.teams[tid].user = 'local'; });
    if (st.phase === 'fantasy') F.fdAuto(st);
    App.st = st; App.mode = 'local'; App.id = S.rid(); resetView(); App.start.wizard = null; setLast('local', App.id, st.name);
    await saveNow();
  } catch (e) { console.error(e); toast(esc(e.message || 'Could not create league.'), 'err'); }
  busy(false); render();
  if (App.st && window.tutOffer) tutOffer();
}

/* ---------------- event handlers ---------------- */
const H = {
  nav: el => { App.view = el.dataset.v; closeModal(); render(); window.scrollTo(0, 0); },
  home: () => { if (App.live && App.live.g && !App.live.g.over) return confirmBox('Leave this game and return to the main menu? The game will be simmed when the day advances.', () => { closeModal(); liveStop(); App.live = null; goHome(); }); closeModal(); goHome(); },
  refreshStart: () => { App.start.leagues = null; render(); loadStart(); },
  mgrOpen: () => modal(managersCard().replace('<section class="card">', '<div class="mgrmodal">').replace(/<\/section>$/, '</div>')),
  delLeagueMenu: el => confirmBox(`Delete the league <b>${esc(el.dataset.n)}</b> for every manager? This cannot be undone.`, async () => { closeModal(); busy(true, 'Deleting…'); try { await S.deleteShared(el.dataset.id); toast('League deleted.'); } catch (e) { toast(esc(e.message), 'err'); } busy(false); loadStart(); }),
  leaveMenu: el => confirmBox(`Leave <b>${esc(el.dataset.n)}</b>? Your team goes back to AI control.`, async () => { closeModal(); busy(true, 'Leaving…'); try { const r = await S.commitShared(el.dataset.id, null, st => { const tid = st.members[S.uid]; if (tid != null) { st.teams[tid].user = null; st.teams[tid].auto = true; } delete st.members[S.uid]; if (st.ready) delete st.ready[S.uid]; }); if (r.err) toast(esc(r.err), 'err'); else toast('You left the league.'); } catch (e) { toast(esc(e.message), 'err'); } busy(false); loadStart(); }),
  mgrMenu: async el => {
    const lid = el.dataset.id; busy(true, 'Loading managers…');
    try {
      const { st } = await S.fetchShared(lid); busy(false);
      const ms = Object.keys(st.members || {});
      Object.assign(App.names, await S.names(ms.filter(u => !(u in App.names))));
      const nm = u => (st.nick && st.nick[u]) || App.names[u] || 'Manager';
      const rows = ms.map(u => { const t = st.teams[st.members[u]]; return `<tr><td class="l"><b>${esc(nm(u))}</b>${u === st.commish ? ' <span class="tag">Commissioner</span>' : ''}</td><td><span class="tb" style="--c:${t.col}">${t.ab}</span></td><td class="r">${u !== S.uid ? `<button class="mini bad ghost" data-act="kickMenu" data-lid="${esc(lid)}" data-id="${esc(u)}" data-n="${esc(nm(u))}">Remove manager</button>` : ''}</td></tr>`; }).join('');
      modal(`<h2>Managers · ${esc(st.name)}</h2><p class="muted sm">Removing a manager hands their team back to the AI and opens it up for someone else to claim.</p><table class="t mgr-t">${rows || '<tr><td class="muted">No managers yet.</td></tr>'}</table>`);
    } catch (e) { busy(false); toast(esc(e.message), 'err'); }
  },
  kickMenu: el => { const lid = el.dataset.lid, u = el.dataset.id; confirmBox(`Remove <b>${esc(el.dataset.n)}</b> from the league? Their team goes back to AI control.`, async () => { closeModal(); busy(true, 'Removing…'); try { const r = await S.commitShared(lid, null, st => { const tid = st.members[u]; if (tid != null) { st.teams[tid].user = null; st.teams[tid].auto = true; } delete st.members[u]; if (st.ready) delete st.ready[u]; }); if (r.err) toast(esc(r.err), 'err'); else toast('Manager removed.', 'good'); } catch (e) { toast(esc(e.message), 'err'); } busy(false); loadStart(); }); },
  lvMore: () => { App.lvMore = !App.lvMore; render(); },
  tab: el => { App.tab[el.dataset.g] = el.dataset.v; render(); },
  sort: el => { const g = el.dataset.g; if (App.sort[g] === el.dataset.k) App.sort[g + 'rev'] = !App.sort[g + 'rev']; else { App.sort[g] = el.dataset.k; App.sort[g + 'rev'] = false; } render(); },
  player: el => openPlayer(+el.dataset.id),
  team: el => { App.vt = +el.dataset.id; App.view = 'roster'; closeModal(); render(); },
  closeModal: () => closeModal(),
  box: el => openBox(el.dataset.id),
  wizard: el => { App.start.wizard = { mode: el.dataset.mode, name: el.dataset.mode === 'shared' ? 'Friends League' : 'My Franchise', games: 162, diff: 'normal', inj: true, real: true, teams: [] }; render(); },
  wizTeam: el => { const w = App.start.wizard; const id = +el.dataset.id; w.name = ($('#wName').value || w.name); w.fd = $('#wFd').value === '1'; w.games = +$('#wGames').value; w.diff = $('#wDiff').value; w.inj = $('#wInj').value === '1'; if (w.mode === 'shared') w.teams = [id]; else w.teams = w.teams.includes(id) ? w.teams.filter(x => x !== id) : w.teams.concat(id); render(); },
  editPlayer: el => openEdit(+el.dataset.id),
  editSave: el => {
    const id = +el.dataset.id; const v = k => { const x = $('#e_' + k); return x ? x.value : null; };
    const ch = { f: v('f'), l: v('l'), a: +v('a'), p: v('p'), b: v('b'), t: v('t'), tid: +v('tid'), o: +v('o'), pt: +v('pt'), sal: +v('sal'), y: +v('y') };
    closeModal(); act(st => F.editPlayer(st, id, ch) || undefined).then(e => { if (!e) { toast('Player updated.', 'good'); openPlayer(id); } });
  },
  wizCancel: () => { App.start.wizard = null; render(); },
  wizGo: () => createFromWizard(),
  openSave: el => openSave(el.dataset.id),
  openLeague: el => openLeague(el.dataset.id),
  delSave: el => confirmBox('Delete this franchise? This cannot be undone.', async () => { await S.deleteLocal(el.dataset.id); if (App.id === el.dataset.id) { App.st = null; App.mode = null; } closeModal(); loadStart(); render(); }),
  delLeague: () => confirmBox('Delete this league for every manager? This cannot be undone.', async () => { await S.deleteShared(App.id); closeModal(); goHome(); }),
  importOpen: () => modal(`<h2>Import save</h2><p class="muted">Paste text from a previous Export.</p><textarea id="impText" rows="8" style="width:100%"></textarea><div class="row"><button class="btn primary" data-act="importGo">Import</button></div>`),
  importGo: async () => {
    try { const st = await S.unpack($('#impText').value.trim()); if (!st.teams || !st.players) throw new Error('Not a valid save.'); st.commish = null; st.members = {}; st.teams.forEach(t => { if (t.user) t.user = 'local'; }); if (!st.teams.some(t => t.user)) st.teams[0].user = 'local'; App.st = st; App.mode = 'local'; App.id = S.rid(); resetView(); closeModal(); await saveNow(); render(); toast('Save imported.', 'good'); }
    catch (e) { toast('Import failed: ' + esc(e.message), 'err'); }
  },
  export: async () => { const txt = await S.pack(App.st); try { await navigator.clipboard.writeText(txt); toast('Export copied to clipboard (' + Math.round(txt.length / 1024) + ' KB).', 'good'); } catch (e) { modal(`<h2>Export</h2><p class="muted">Copy this text and keep it somewhere safe.</p><textarea rows="10" style="width:100%" readonly>${esc(txt)}</textarea>`); } },
  sim: el => doSim(el.dataset.k),
  ready: () => act(st => { if (st.ready[S.uid]) delete st.ready[S.uid]; else st.ready[S.uid] = true; }),
  playLive: () => startLive(),
  lv: el => liveAction(el.dataset.k),
  liveSave: () => liveSave(),
  liveBox: () => openBox(null, App.live.g.box()),
  hookIn: el => { const L = App.live; const g = L.g; g.changePitcher(g.def, +el.dataset.id, 'your call'); hookResume(); },
  hookStay: () => { const L = App.live; L.g.say(`<i>${esc(F.sname(L.st.players[L.g.def.pit]))} stays in the game.</i>`); hookResume(); },
  hookVisit: () => { const L = App.live, g = L.g, sd = g.def; sd.bonus = sd.bonus || {}; sd.bonus[sd.pit] = (sd.bonus[sd.pit] || 0) + 8; g.say(`<i>Mound visit to settle down ${esc(F.sname(L.st.players[sd.pit]))}.</i>`); hookResume(); },
  liveQuit: () => { liveStop(); App.live = null; render(); },
  claim: el => { const tid = +el.dataset.id; const nk = (App.joinNick || (window.FOB_NAME ? window.FOB_NAME() : '') || '').trim().slice(0, 24); act(st => { if (nk) { st.nick = st.nick || {}; st.nick[S.uid] = nk; } if (st.teams[tid].user) return 'That team was just claimed.'; if (S.uid in st.members) return 'You already manage a team.'; st.teams[tid].user = S.uid; st.members[S.uid] = tid; F.newsAdd(st, `A new manager has taken over the ${F.tname(st.teams[tid])}.`, tid); }); },
  kick: el => { const u = el.dataset.id; confirmBox('Remove this manager? Their team goes back to AI control.', () => { closeModal(); act(st => { const tid = st.members[u]; if (tid != null) { st.teams[tid].user = null; st.teams[tid].auto = true; } delete st.members[u]; delete st.ready[u]; }); }); },
  leave: () => confirmBox('Leave this league? Your team goes back to AI control.', () => { closeModal(); act(st => { const tid = st.members[S.uid]; if (tid != null) { st.teams[tid].user = null; st.teams[tid].auto = true; } delete st.members[S.uid]; delete st.ready[S.uid]; }); }),
  toggleUser: el => { const tid = +el.dataset.id; act(st => { const t = st.teams[tid]; if (t.user && st.teams.filter(x => x.user).length === 1) return 'You need at least one team.'; t.user = t.user ? null : 'local'; if (!t.user) t.auto = true; }); },
  saveSettings: () => { const name = ($('#sName').value || '').trim() || 'League', diff = $('#sDiff').value, inj = $('#sInj').value === '1', adv = $('#sAdv') ? $('#sAdv').value : null; act(st => { st.name = name; st.settings.diff = diff; st.settings.injuries = inj; if (adv) st.settings.advance = adv; }).then(e => { if (!e) toast('Settings saved.', 'good'); }); },
  move: el => {
    const id = +el.dataset.id, to = +el.dataset.to; closeModal();
    act(st => {
      const p = st.players[id]; if (!p || !canControl(p.tid)) return 'Not your player.';
      if (to === 0) {
        const a = F.active(st, p.tid); if (!F.onIL(p) && a.length >= 26) return 'Your active roster is full (26). Option someone first.';
        if (F.isP(p) && a.filter(F.isP).length >= 13) return 'Max 13 pitchers on the active roster.';
        const wl = p.lv; p.lv = 0; F.txnAdd(st, `${st.teams[p.tid].ab} recalled ${p.p} ${F.pname(p)} from ${wl === 2 ? 'AA' : 'AAA'}`, 'recall', p.tid);
      } else {
        const was = p.lv; p.lv = to; const t = st.teams[p.tid]; F.txnAdd(st, `${t.ab} ${was === 0 ? 'optioned' : to < was ? 'promoted' : 'sent down'} ${p.p} ${F.pname(p)} to ${LVN[to]}`, was === 0 ? 'option' : to < was ? 'promote' : 'senddown', p.tid);
        if (t.lu) t.lu = t.lu.filter(s => s.id !== id).length === 9 ? t.lu : F.repairLineup(st, t);
        F.fixRotation(st, t);
      }
    });
  },
  release: el => { const id = +el.dataset.id; confirmBox(`Release ${esc(F.pname(PL(id)))}? Half of this year's salary stays on your books.`, () => { closeModal(); act(st => { const p = st.players[id]; if (!p || !canControl(p.tid)) return 'Not your player.'; const t = st.teams[p.tid]; const e = F.releasePlayer(st, id); if (e) return e; F.fixRotation(st, t); }); }); },
  luFix: () => editLineup((st, t) => { t.lu = F.bestPositions(st, t, t.lu.map(s => s.id)); }),
  luOrder: () => editLineup((st, t) => { t.lu = F.orderLineup(st, t.lu); }),
  luStart: el => { const id = +el.dataset.id; editLineup((st, t) => { const p = st.players[id]; let i = t.lu.findIndex(s => s.pos === p.p); if (i < 0 && ['LF', 'CF', 'RF'].includes(p.p)) i = t.lu.findIndex(s => ['LF', 'CF', 'RF'].includes(s.pos) && st.players[s.id].o < p.o); if (i < 0) i = t.lu.findIndex(s => s.pos === 'DH'); if (i < 0) return 'No spot found.'; t.lu[i] = { id, pos: t.lu[i].pos }; }); },
  autoLu: () => act(st => { const t = st.teams[myTid()]; F.autoDepth(st, t); }),
  luUp: el => { const i = +el.dataset.i; if (i === 0) return; editLineup((st, t) => { [t.lu[i - 1], t.lu[i]] = [t.lu[i], t.lu[i - 1]]; }); },
  luDn: el => { const i = +el.dataset.i; if (i === 8) return; editLineup((st, t) => { [t.lu[i + 1], t.lu[i]] = [t.lu[i], t.lu[i + 1]]; }); },
  tradeAdd: el => {
    const p = PL(+el.dataset.id); const my = myTid(); if (!p || my == null) return; closeModal();
    if (p.tid === my) { if (!App.trade.give.includes(p.id)) App.trade.give.push(p.id); }
    else { if (App.trade.partner !== p.tid) { App.trade.partner = p.tid; App.trade.get = []; } if (!App.trade.get.includes(p.id)) App.trade.get.push(p.id); }
    App.view = 'trades'; render();
  },
  tradeClear: () => { App.trade.give = []; App.trade.get = []; render(); },
  tradeBalance: () => {
    const st = App.st, my = myTid(), tr = App.trade;
    const cand = F.teamPlayers(st, my).filter(p => !tr.give.includes(p.id)).sort((a, b) => F.pval(a) - F.pval(b));
    let tries = 0;
    while (tries++ < 4) {
      const ev = F.tradeEval(st, { from: my, to: tr.partner, give: tr.give, get: tr.get });
      if (ev.ok) break;
      const gap = ev.need - ev.recv + 0.1;
      let c = cand.find(p => !tr.give.includes(p.id) && F.pval(p) >= gap);
      if (!c) c = cand.filter(p => !tr.give.includes(p.id)).pop();
      if (!c) break; tr.give.push(c.id);
    }
    const ok = F.tradeEval(st, { from: my, to: tr.partner, give: tr.give, get: tr.get }).ok;
    toast(ok ? 'They suggested a package. Review it before proposing.' : 'They could not find a package that works.', ok ? 'good' : 'err'); render();
  },
  tradePropose: () => {
    const my = myTid(), tr = App.trade; const deal = { from: my, to: tr.partner, give: tr.give.slice(), get: tr.get.slice() };
    const human = App.st.teams[tr.partner].user != null && App.mode === 'shared';
    if (human) return act(st => { const e = F.validTrade(st, deal); if (e) return e; st.offers.push(Object.assign({ id: S.rid(), status: 'open', s: st.season }, deal)); F.newsAdd(st, `${st.teams[deal.from].name} sent a trade offer to the ${st.teams[deal.to].name}.`, deal.to); }).then(e => { if (!e) { toast('Offer sent.', 'good'); App.trade.give = []; App.trade.get = []; render(); } });
    const localHuman = App.st.teams[tr.partner].user != null;
    act(st => { const e = F.validTrade(st, deal); if (e) return e; if (!localHuman) { const ev = F.tradeEval(st, deal); if (!ev.ok) return `${st.teams[deal.to].name} declined. They want more value (${ev.recv} offered vs ${ev.need} needed).`; } return F.executeTrade(st, deal) || undefined; })
      .then(e => { if (!e) { toast('Trade accepted!', 'good'); App.trade.give = []; App.trade.get = []; render(); } });
  },
  offerAccept: el => act(st => { const o = st.offers.find(x => x.id === el.dataset.id); if (!o || o.status !== 'open') return 'Offer no longer available.'; if (!canControl(o.to)) return 'Not your offer.'; const e = F.executeTrade(st, o); if (e) { o.status = 'void'; return e; } o.status = 'done'; }),
  offerDecline: el => act(st => { const o = st.offers.find(x => x.id === el.dataset.id); if (o) { o.status = 'declined'; F.newsAdd(st, `${st.teams[o.to].name} declined a trade offer from the ${st.teams[o.from].name}.`, o.from); } }),
  offerCancel: el => act(st => { const o = st.offers.find(x => x.id === el.dataset.id); if (o) o.status = 'cancelled'; }),
  faOffer: el => { const id = +el.dataset.id, my = myTid(); const sal = parseFloat($('#fs' + id).value), y = parseInt($('#fy' + id).value, 10); if (!(sal > 0) || !(y > 0)) return toast('Enter salary and years.', 'err'); act(st => F.faOffer(st, my, id, sal, y) || undefined).then(e => { if (!e) toast(App.st.phase === 'fa' ? 'Offer submitted.' : 'Signed!', 'good'); }); },
  faWithdraw: el => { const id = +el.dataset.id, my = myTid(); act(st => { F.faWithdraw(st, my, id); }); },
  scout: el => { const id = +el.dataset.id, my = myTid(); act(st => F.scoutPlayer(st, my, id) || undefined); },
  draftPick: el => { const id = +el.dataset.id, my = myTid(); act(st => { const e = F.draftPick(st, my, id); if (e) return e; F.draftAuto(st); }); },
  draftAutoOne: () => act(st => { if (!canControl(st.draft.picks[st.draft.i])) return 'Not your pick.'; F.draftAuto(st, 'one'); }),
  draftForce: () => act(st => { if (st.phase !== 'draft') return; F.draftAuto(st, 'one'); }),
  nav2: el => { App.view = el.dataset.v; App.tab.fa = el.dataset.tab; if (el.dataset.role) App.filt.farole = el.dataset.role; closeModal(); render(); },
  fdPick: el => { const id = +el.dataset.id, my = myTid(); act(st => { const e = F.fdPick(st, my, id); if (e) return e; F.fdAuto(st); }, 'Drafting…'); },
  fdAutoOne: () => act(st => { if (!canControl(st.fd.picks[st.fd.i])) return 'Not your pick.'; F.fdAuto(st, 'one'); }, 'Drafting…'),
  fdGo: () => act(st => { if (!st.fd) return; st.fd.paused = false; F.newsAdd(st, 'The fantasy draft is underway!'); F.fdAuto(st); }, 'Starting draft…'),
  fdForce: () => act(st => { if (st.phase !== 'fantasy') return; F.fdAuto(st, 'one'); }, 'Drafting…'),
  conv: el => { App.conv = el.dataset.k; render(); },
  dmSend: async () => { const t = (App.dmDraft || '').trim(); if (!t) return; const to = App.conv || 'all'; try { await S.sendMsg(App.id, to, t); App.dmDraft = ''; render(); } catch (e) { toast('Could not send: ' + esc(e.message || ''), 'err'); } },
  nick: () => { if (window.FOB_ASKNAME) window.FOB_ASKNAME(() => { App.names = {}; render(); }); },
  copyInv: async () => { const u = inviteLink(App.id); try { await navigator.clipboard.writeText(u); toast('Invite link copied!', 'good'); } catch (e) { const i = $('#invUrl'); if (i && i.select) i.select(); toast('Select the link and copy it.', ''); } },
  txk: el => { App.filt.txk = el.dataset.k; render(); },
  train: el => { const id = +el.dataset.id, pos = el.dataset.pos; closeModal(); act(st => F.setTrain(st, id, pos) || undefined).then(() => openPlayer(id)); },
  makePrimary: el => { const id = +el.dataset.id, pos = el.dataset.pos; closeModal(); act(st => F.setPrimary(st, id, pos) || undefined).then(() => openPlayer(id)); },
  hubF: el => { App.filt[el.dataset.k] = el.dataset.v; render(); },
  hubTeamPick: el => { App.hubT = el.dataset.id === '' ? null : +el.dataset.id; render(); if (App.hubT != null) { const r = document.querySelector('.treport'); if (r && r.scrollIntoView) r.scrollIntoView({ block: 'start' }); } },
  tAdd: el => { const s = el.dataset.s, id = +el.dataset.id; if (!App.trade[s].includes(id)) App.trade[s].push(id); render(); },
  tRem: el => { const s = el.dataset.s, id = +el.dataset.id; App.trade[s] = App.trade[s].filter(x => x !== id); render(); },
  tfSet: el => { const f = App.tf[el.dataset.s]; f[el.dataset.k] = el.dataset.v; f.more = 0; render(); },
  tfMore: el => { App.tf[el.dataset.s].more++; render(); },
  calM: el => { App.calM = (App.calM || 0) + (+el.dataset.d); render(); },
  vote: el => { const voter = App.mode === 'shared' ? S.uid : 'local'; act(st => F.asgVote(st, voter, +el.dataset.id) || undefined); },
  lst: el => { const k = el.dataset.k, id = +el.dataset.id, my = myTid(); const max = { block: 10, tgt: 15, unt: 5 }[k]; closeModal(); act(st => F.toggleList(st, my, k, id, max) || undefined).then(() => { if (App.view !== 'hub' && $('#modal').style.display !== 'flex') openPlayer(id); }); },
  loadOffer: el => { const o = JSON.parse(el.dataset.o); App.trade = { partner: o.tid, give: [o.pid], get: o.offer.slice() }; App.view = 'trades'; render(); },
  hubTarget: el => { const p = PL(+el.dataset.id); if (!p) return; App.trade = { partner: p.tid, give: [], get: [p.id] }; App.view = 'trades'; render(); },
  focus: el => { const id = +el.dataset.id, my = myTid(); const on = !F.scState(App.st, my).focus.includes(id); act(st => F.scoutFocus(st, my, id, on) || undefined); },
  hire: el => { const id = el.dataset.id, my = myTid(); act(st => F.hireCoach(st, my, id) || undefined).then(e => { if (!e) toast('Coach hired.', 'good'); }); },
  fireC: el => { const id = el.dataset.id, my = myTid(); confirmBox('Release this coach? He becomes a free agent and the job stays open until you hire someone.', () => { closeModal(); act(st => F.fireCoach(st, my, id) || undefined); }); },
  extendC: el => { const id = el.dataset.id, my = myTid(); act(st => F.extendCoach(st, my, id) || undefined).then(e => { if (!e) toast('Extended 2 more years.', 'good'); }); },
  coach: el => openCoach(el.dataset.id),
  asgBox: () => { const r = App.st.asg && App.st.asg.result; if (r) openBox(r.box); },
  confirmYes: () => { const f = App._confirm; App._confirm = null; if (f) f(); },
};
function confirmBox(msg, fn) { App._confirm = fn; modal(`<h3>${msg}</h3><div class="row"><button class="btn bad" data-act="confirmYes">Yes</button><button class="btn ghost" data-act="closeModal">Cancel</button></div>`); }

function openEdit(id) {
  const p = PL(id); if (!p) return;
  const inp = (k, lab, val, w) => `<label>${lab}<input id="e_${k}" value="${esc(val)}"${w ? ` style="width:${w}px"` : ''}></label>`;
  const sel = (k, lab, opts, cur) => `<label>${lab}<select id="e_${k}">${opts.map(o => `<option value="${esc(o[0])}"${String(o[0]) === String(cur) ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
  modal(`<h2>Edit player</h2><p class="muted sm">Fix a name, move a player to his real team, or adjust ratings. Changing OVR rescales his ratings.</p><div class="form">
  ${inp('f', 'First name', p.f)}${inp('l', 'Last name', p.l)}${inp('a', 'Age', p.a)}
  ${sel('p', 'Position', ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP'].map(x => [x, x]), p.p)}
  ${sel('b', 'Bats', [['R', 'R'], ['L', 'L'], ['S', 'S']], p.b)}${sel('t', 'Throws', [['R', 'R'], ['L', 'L']], p.t)}
  ${sel('tid', 'Team', [[-1, 'Free agent'], ...App.st.teams.map(t => [t.id, F.tname(t)])], p.tid)}
  ${inp('o', 'OVR (30-99)', p.o)}${inp('pt', 'Potential (30-99)', p.pt)}${inp('sal', 'Salary ($M)', p.sal)}${inp('y', 'Contract years', p.y)}</div>
  <div class="row"><button class="btn primary" data-act="editSave" data-id="${p.id}">Save</button><button class="btn ghost" data-act="player" data-id="${p.id}">Cancel</button></div>`);
}
const C = {
  fdF: el => { App.filt.fd = el.value; render(); },
  fdS: el => { App.sort.fd = el.value.split(' ')[0]; render(); },
  fdAutoMe: el => { const on = el.checked, my = myTid(); act(st => { st.fd.auto[my] = on; if (on) F.fdAuto(st); }, on ? 'Drafting…' : null); },
  pr: el => { const r = el.dataset.r, i = +el.dataset.i, v = el.value; editLineup((st, t) => { const vs = r === 'spec' ? ((t.pen && t.pen.spec && t.pen.spec[i] && t.pen.spec[i].vs) || (i ? 'R' : 'L')) : null; return F.setPenRole(st, t, r, i, v, vs) || undefined; }); },
  prvs: el => { const i = +el.dataset.i, v = el.value; editLineup((st, t) => { if (!t.pen || !t.pen.spec[i]) return 'Pick a specialist first.'; t.pen.spec[i].vs = v; }); },
  scReg: el => { const v = el.value, my = myTid(); act(st => F.scoutAssign(st, my, v.startsWith('pro:') ? { pro: +v.slice(4) } : { reg: v }) || undefined); },
  goatF: el => { App.filt.goat = el.value; render(); },
  txt: el => { App.filt.txt = el.value; render(); },
  txo: el => { App.sort.txn = el.value; render(); },
  stLvl: el => { App.tab.standings = el.value; render(); },
  hubSort: el => { App.sort[el.dataset.k] = el.value; render(); },
  tfSort: el => { App.tf[el.dataset.s].sort = el.value; render(); },
  farole: el => { App.filt.farole = el.value; render(); },
  scFilt: el => { App.filt.screg = el.value; render(); },
  staffTeam: el => { App.staffT = +el.value; render(); },
  hubTeam: el => { App.hubT = +el.value; render(); },
  wizReal: el => { const w = App.start.wizard; w.real = el.value === '1'; w.fd = $('#wFd').value === '1'; w.teams = []; w.name = ($('#wName').value || w.name); render(); },
  switchTeam: el => { App.my = +el.value; App.vt = App.my; App.trade = { partner: null, give: [], get: [] }; render(); },
  viewTeam: el => { App.vt = +el.value; render(); },
  simSel: el => { const v = el.value; el.value = ''; if (v) doSim(v); },
  scope: el => { App.filt.scope = el.value; render(); },
  qual: el => { App.filt.qual = el.checked; render(); },
  fapos: el => { App.filt.fapos = el.value; render(); },
  dpos: el => { App.filt.dpos = el.value; render(); },
  autoMgr: el => { const on = el.checked; act(st => { const t = st.teams[myTid()]; t.auto = on; if (on) F.autoDepth(st, t); }); },
  luP: el => { const i = +el.dataset.i, id = +el.value; editLineup((st, t) => { const j = t.lu.findIndex(s => s.id === id); if (j >= 0 && j !== i) { const tmp = t.lu[j].id; t.lu[j].id = t.lu[i].id; t.lu[i].id = tmp; } else t.lu[i].id = id; }); },
  luPos: el => { const i = +el.dataset.i, pos = el.value; editLineup((st, t) => { const j = t.lu.findIndex(s => s.pos === pos); if (j >= 0 && j !== i) { t.lu[j].pos = t.lu[i].pos; } t.lu[i].pos = pos; }); },
  rot: el => { const i = +el.dataset.i, id = el.value ? +el.value : null; editLineup((st, t) => { const rot = (t.rot || []).slice(); while (rot.length < 5) rot.push(null); const j = rot.indexOf(id); if (id != null && j >= 0) rot[j] = rot[i]; rot[i] = id; t.rot = rot.filter(x => x != null); if (t.cl === id) t.cl = null; if (t.su === id) t.su = null; }); },
  role: el => { const k = el.dataset.k, v = el.value; editLineup((st, t) => F.setPenRole(st, t, k, 0, v) || undefined); },
  tradePartner: el => { App.trade.partner = +el.value; App.trade.get = []; if (App.tf) App.tf.get = { lv: 'all', pos: 'all', q: '', sort: 'ovr', more: 0 }; render(); },
  tradePick: el => { const id = +el.dataset.id, side = el.dataset.side; const arr = App.trade[side]; const i = arr.indexOf(id); if (el.checked && i < 0) arr.push(id); if (!el.checked && i >= 0) arr.splice(i, 1); render(); },
  resign: el => { const id = el.dataset.id, on = el.checked; act(st => { if (!st.resign) return 'Re-signing is over.'; const p = st.players[id]; if (!p || !canControl(p.tid)) return 'Not your player.'; if (on) { const a = st.resign.asks[id]; const t = st.teams[p.tid]; const extra = Object.keys(st.resign.dec).filter(x => st.resign.dec[x] && st.players[x] && st.players[x].tid === p.tid).reduce((s, x) => s + st.resign.asks[x].sal - st.players[x].sal, 0); if (F.payroll(st, p.tid) + extra + a.sal - p.sal > t.bud) return 'That would put you over budget.'; st.resign.dec[id] = true; } else delete st.resign.dec[id]; }); },
  draftAutoMe: el => { const on = el.checked, my = myTid(); act(st => { if (!st.draft) return; st.draft.auto = st.draft.auto || {}; st.draft.auto[my] = on; if (on) F.draftAuto(st); }); },
  lvPH: el => { const id = +el.value; if (!id) return; const g = App.live.g; const o = g.off; const slot = o.order[o.bi % 9]; o.gone.push(slot.id); o.bench = o.bench.filter(x => x !== id); g.say(`<i>Pinch hitter: ${esc(F.sname(App.live.st.players[id]))} bats for ${esc(F.sname(App.live.st.players[slot.id]))}.</i>`); slot.id = id; render(); },
  lvPC: el => { const id = +el.value; if (!id) return; const g = App.live.g; g.changePitcher(g.def, id, 'your call'); render(); },
  lvSpeed: el => { App.liveSpeed = el.value; },
  aiTake: el => { App.aiTake = el.checked; },
  lvPen: el => { App.penMode = el.value; if (App.live) App.live.g.autoPen[App.live.side] = el.value === 'ai'; if (el.value !== 'ask' && App.live) App.live.prompt = null; render(); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  if (el.tagName === 'A') e.preventDefault();
  const h = H[el.dataset.act]; if (h) h(el, e);
});
let _fdqT = null;
document.addEventListener('input', e => {
  const el = e.target.closest('[data-inp]'); if (!el) return;
  if (el.dataset.inp === 'dm') App.dmDraft = el.value;
  if (el.dataset.inp === 'nick') App.joinNick = el.value;
  if (el.dataset.inp === 'tfq') { App.tf[el.dataset.s].q = el.value; App.tf[el.dataset.s].more = 0; clearTimeout(_fdqT); _fdqT = setTimeout(render, 220); }
  if (el.dataset.inp === 'fdq') { App.filt.fdq = el.value; clearTimeout(_fdqT); _fdqT = setTimeout(render, 250); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'dmText') { e.preventDefault(); H.dmSend(); } });
document.addEventListener('change', e => { const el = e.target.closest('[data-chg]'); if (!el) return; const h = C[el.dataset.chg]; if (h) h(el, e); });
document.addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ---------------- STAFF ---------------- */
const roleName = r => (F.STAFF_ROLES.find(x => x[0] === r) || [r, r])[1];
function coachEffects(c) {
  if (!c) return 'Vacant — your team plays with replacement-level coaching here.';
  const r = c.r, s = v => (v >= 0 ? '+' : '') + v.toFixed(1);
  const fx = {
    mgr: `Development ${s((r.dev - 60) * 0.4)}% · Hot-streak boost ${s((r.mot - 60) * 0.4)}% · Defense ${s((r.tac - 60) * 0.02)}`,
    bench: `Team defense ${s((r.tac - 60) * 0.04)} · Development ${s((r.dev - 60) * 0.3)}%`,
    hit: `Contact ${s((r.con - 60) * 0.05)} · Power ${s((r.pow - 60) * 0.05)} · Discipline ${s((r.eye - 60) * 0.05)} · Hitter development ${s((r.dev - 60) * 0.8)}%`,
    pit: `Stuff ${s(((r.vel + r.brk) / 2 - 60) * 0.05)} · Control ${s((r.cmd - 60) * 0.05)} · Pitcher development ${s((r.dev - 60) * 0.8)}%`,
    fb: `Steal success ${s((r.run - 60) * 0.2)}% · Defense ${s((r.def - 60) * 0.01)}`,
    tb: `Extra-base taking ${s((r.run - 60) * 0.15 + (r.aggr - 60) * 0.1)}% · Defense ${s((r.def - 60) * 0.01)}`,
    trn: `Injury risk ${s(-(r.prev - 60))}% · Faster recovery ${s(Math.max(0, (r.rec - 55) * 1.2))}% per day`,
    sct: `Draft estimate accuracy ${s((r.eval - 45))}% · Scouting speed ${s((r.spd - 40) * 1.4)}%`
  }[c.role];
  return fx + (c.pref ? ` · <b>${esc(c.pref)}</b>${F.PREF_DESC[c.pref] ? ': ' + esc(F.PREF_DESC[c.pref]) : c.role === 'sct' ? ': region specialty (1.5× speed there)' : ''}` : '');
}
function coachRec(c) { const w = c.hist.reduce((s, h) => s + h.w, 0), l = c.hist.reduce((s, h) => s + h.l, 0); return { w, l, n: c.hist.length }; }
function V_staff() {
  const st = App.st, my = myTid();
  const tid = App.staffT != null ? App.staffT : (my != null ? my : 0); const t = T(tid); const mine = canControl(tid);
  const rows = F.STAFF_ROLES.map(([role, name]) => {
    const c = F.coachOf(st, tid, role);
    const ks = F.RKEYS[role];
    const rec = c ? coachRec(c) : null;
    return `<section class="card coach"><div class="ch"><div class="ovbig ${c ? rc(F.coachOvr(c)) : 'r1'}">${c ? F.coachOvr(c) : '—'}<small>OVR</small></div><div style="flex:1"><small class="muted">${esc(name)}</small><h3>${c ? `<a class="pl" data-act="coach" data-id="${c.id}">${esc(c.f + ' ' + c.l)}</a> ${natTag(c.nat)}${c.real ? ' <span class="tag" title="Real 2026 MLB coaching staff">2026 staff</span>' : ''}` : '<span class="bad">Vacant</span>'}</h3>
    ${c ? `<div class="muted sm">Age ${c.a} · ${c.exp} yrs experience · ${money(c.sal)} × ${c.y} yr${c.y === 1 ? '' : 's'}${rec && rec.n ? ` · Record with clubs ${rec.w}-${rec.l}` : ''}</div>` : ''}</div>
    ${mine ? `<div class="row">${c ? `<button class="btn ghost sm" data-act="extendC" data-id="${c.id}">Extend +2 yrs</button><button class="btn ghost sm bad" data-act="fireC" data-id="${c.id}">Release</button>` : ''}<button class="btn sm" data-act="nav2" data-v="fa" data-tab="staff" data-role="${role}">${c ? 'Find replacement' : 'Hire'}</button></div>` : ''}</div>
    ${c ? `<div class="cbars">${ks.map(k => `<div class="bar"><span>${F.RLABEL[k]}</span><i><b class="${rc(c.r[k])}" style="width:${c.r[k]}%"></b></i><em>${c.r[k]}</em></div>`).join('')}</div>` : ''}
    <p class="sm fx">${coachEffects(c)}</p></section>`;
  }).join('');
  const pay = F.STAFF_ROLES.reduce((s, [r]) => { const c = F.coachOf(st, tid, r); return s + (c ? c.sal : 0); }, 0);
  return `<div class="pagehead"><h2>${tb(tid, true)} Coaching & Staff</h2><select data-chg="staffTeam">${st.teams.map(x => `<option value="${x.id}"${x.id === tid ? ' selected' : ''}>${x.ab} — ${esc(F.tname(x))}${x.user ? ' ★' : ''}</option>`).join('')}</select></div>
  <div class="kpis small"><div><small>General Manager</small><b>${t.user ? (App.mode === 'shared' ? esc(uname(t.user)) : 'You') : 'AI'}</b></div><div><small>Staff payroll</small><b>${money(pay)}</b></div><div><small>Team payroll (incl. staff)</small><b>${money(F.payroll(st, tid))} / ${money(t.bud)}</b></div></div>
  <p class="muted sm">Coaches change how your team plays: ratings give small boosts in every game and to player development, and each coach's philosophy changes in-game decisions. Real 2026 managers and coaches come from MLB's official coaching rosters; trainers, scouting directors and all ratings are generated.</p>
  <div class="grid2">${rows}</div>`;
}
function openCoach(id) {
  const st = App.st, c = st.coaches[id]; if (!c) return;
  const rec = coachRec(c);
  modal(`<div class="pcard"><div class="phead"><div class="ovbig ${rc(F.coachOvr(c))}">${F.coachOvr(c)}<small>OVR</small></div><div><h2>${esc(c.f + ' ' + c.l)} ${natTag(c.nat)}</h2><div class="muted">${esc(roleName(c.role))} · Age ${c.a} · ${c.exp} yrs experience</div><div>${c.tid >= 0 ? tb(c.tid) + ' ' + esc(F.tname(T(c.tid))) : 'Free agent'}</div></div></div>
  <div class="grid2"><div>${F.RKEYS[c.role].map(k => `<div class="bar"><span>${F.RLABEL[k]}</span><i><b class="${rc(c.r[k])}" style="width:${c.r[k]}%"></b></i><em>${c.r[k]}</em></div>`).join('')}<p><b>Philosophy:</b> ${esc(c.pref)}${F.PREF_DESC[c.pref] ? ' — ' + esc(F.PREF_DESC[c.pref]) : ''}</p></div>
  <div><div class="kpis small"><div><small>Salary</small><b>${money(c.tid === -1 && c.ask ? c.ask.sal : c.sal)}</b></div><div><small>Years</small><b>${c.tid === -1 && c.ask ? c.ask.y : c.y}</b></div><div><small>Career W-L</small><b>${rec.n ? rec.w + '-' + rec.l : '—'}</b></div></div><p class="sm">${coachEffects(c)}</p></div></div>
  <h3>History</h3><table class="t"><tr><th>Year</th><th>Team</th><th>W-L</th><th>Team OPS</th><th>Team ERA</th><th class="l">Result</th></tr>${c.hist.slice().reverse().map(h => `<tr><td>${h.y}</td><td>${h.t}</td><td>${h.w}-${h.l}</td><td>${f3(h.ops)}</td><td>${f2(h.era)}</td><td class="l">${esc(h.res || '')}</td></tr>`).join('') || '<tr><td colspan=6 class="muted">No seasons in this league yet.</td></tr>'}</table></div>`);
}
function faTabs() { const t = App.tab.fa || 'pl'; return `<div class="tabs"><a class="${t === 'pl' ? 'on' : ''}" data-act="tab" data-g="fa" data-v="pl">Players</a><a class="${t === 'staff' ? 'on' : ''}" data-act="tab" data-g="fa" data-v="staff">Coaches & Staff</a></div>`; }
function V_faStaff() {
  const st = App.st, my = myTid();
  const rf = App.filt.farole || 'all';
  const list = F.faCoaches(st).filter(c => rf === 'all' || c.role === rf).sort((a, b) => F.coachOvr(b) - F.coachOvr(a));
  const t = my != null ? T(my) : null;
  const rows = list.map(c => { const cur = my != null ? F.coachOf(st, my, c.role) : null; const ask = c.ask || { sal: c.sal, y: 2 };
    return `<tr><td class="l"><a class="pl" data-act="coach" data-id="${c.id}">${esc(c.f + ' ' + c.l)}</a> ${natTag(c.nat)}</td><td>${esc(roleName(c.role))}</td><td>${c.a}</td><td><span class="ov ${rc(F.coachOvr(c))}">${F.coachOvr(c)}</span></td><td class="sm">${F.RKEYS[c.role].map(k => `${F.RLABEL[k].split(' ')[0]} ${c.r[k]}`).join(' · ')}</td><td class="sm">${esc(c.pref)}</td><td>${money(ask.sal)} × ${ask.y}</td><td class="sm muted">${cur ? 'Yours: ' + F.coachOvr(cur) : '<span class="warn">Vacant</span>'}</td><td>${my != null ? `<button class="mini" data-act="hire" data-id="${c.id}">Hire</button>` : ''}</td></tr>`; }).join('');
  return `<div class="pagehead"><h2>Free Agents</h2><select data-chg="farole"><option value="all">All roles</option>${F.STAFF_ROLES.map(([r, n]) => `<option value="${r}"${rf === r ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
  ${t ? `<div class="kpis small"><div><small>Budget</small><b>${money(t.bud)}</b></div><div><small>Payroll (incl. staff)</small><b>${money(F.payroll(st, my))}</b></div><div><small>Room</small><b class="${t.bud - F.payroll(st, my) < 0 ? 'bad' : 'good'}">${money(t.bud - F.payroll(st, my))}</b></div></div>` : ''}
  ${faTabs()}<p class="muted">Hiring replaces whoever holds that job now; he becomes a free agent. Coaches sign at their asking price.</p>
  <div class="card flush scroll tall"><table class="t"><tr><th class="l">Name</th><th>Role</th><th>Age</th><th>OVR</th><th>Ratings</th><th>Philosophy</th><th>Asking</th><th>Current</th><th></th></tr>${rows || '<tr><td colspan=9 class="muted">No coaches available.</td></tr>'}</table></div>`;
}

/* ---------------- SCOUTING ---------------- */
function V_scouting() {
  const st = App.st, my = myTid();
  if (my == null) return '<div class="card">Claim a team to run a scouting department.</div>';
  const s = F.scState(st, my); const c = F.coachOf(st, my, 'sct');
  const pool = st.dc ? st.dc.pool : (st.draft && !st.draft.done ? st.draft.pool : []);
  const rf = App.filt.screg || 'all';
  const ps = pool.map(id => PL(id)).filter(p => p && p.tid === -2).filter(p => rf === 'all' || (rf === 'focus' ? s.focus.includes(p.id) : p.reg === rf))
    .map(p => ({ p, e: F.scoutEst(st, my, p) })).sort((a, b) => b.e.pot - a.e.pot);
  const asg = s.pro != null ? 'pro:' + s.pro : s.reg;
  const rows = ps.slice(0, 150).map(({ p, e }, i) => { const f = s.focus.includes(p.id);
    const tools = F.isP(p) ? `VEL ${Math.round(p.r.vel)} · CTL ${Math.round(p.r.ctl)} · BRK ${Math.round(p.r.brk)}` : `CON ${Math.round(p.r.con)} · POW ${Math.round(p.r.pow)} · SPD ${Math.round(p.r.spd)} · FLD ${Math.round(p.r.fld)}`;
    return `<tr class="${f ? 'me' : ''}"><td>${i + 1}</td><td><b>${p.p}</b></td><td class="l">${plink(p)}<div class="muted sm">${esc(p.sch || '')}</div></td><td>${p.a}</td><td class="sm">${esc(p.reg || '')}</td><td><span class="ov ${rc(e.ovr)}">${e.ovr}</span></td><td><b class="pot">${grade(e.pot)}</b> <span class="muted sm">${e.pot}${e.rng ? ' ±' + e.rng : ' ✔'}</span></td><td class="sm muted">${tools}</td><td><div class="prog"><i style="width:${e.prog}%"></i></div><span class="sm">${e.prog}%</span></td><td><button class="mini${f ? ' on' : ''}" data-act="focus" data-id="${p.id}">${f ? '👁 Following' : 'Follow'}</button></td></tr>`; }).join('');
  const proT = s.pro != null ? T(s.pro) : null;
  const proRows = st.teams.filter(x => x.id !== my).map(x => ({ x, k: F.proKnown(st, my, x.id) })).filter(o => o.k > 0).sort((a, b) => b.k - a.k).map(o => `<span class="chip on" style="--c:${o.x.col}">${o.x.ab} ${o.k}%</span>`).join(' ');
  return `<div class="pagehead"><h2>Scouting Department</h2></div>
  <div class="grid2"><section class="card"><h3>${c ? `Scouting Director: <a class="pl" data-act="coach" data-id="${c.id}">${esc(c.f + ' ' + c.l)}</a> ${natTag(c.nat)}` : '<span class="bad">No scouting director — hire one in Free Agents → Coaches & Staff</span>'}</h3>
   ${c ? `<div class="bar"><span>Evaluation</span><i><b class="${rc(c.r.eval)}" style="width:${c.r.eval}%"></b></i><em>${c.r.eval}</em></div><div class="bar"><span>Coverage / Speed</span><i><b class="${rc(c.r.spd)}" style="width:${c.r.spd}%"></b></i><em>${c.r.spd}</em></div><p class="sm muted">Specialty region: <b>${esc(c.pref)}</b> (scouts 1.5× faster there)</p>` : ''}
   <label class="lrow"><span>Assignment</span><select data-chg="scReg"><optgroup label="Amateur — draft regions">${F.REGIONS.map(r => `<option value="${r}"${asg === r ? ' selected' : ''}>${r}</option>`).join('')}</optgroup><optgroup label="Pro scouting — evaluate a club's players">${st.teams.filter(x => x.id !== my).map(x => `<option value="pro:${x.id}"${asg === 'pro:' + x.id ? ' selected' : ''}>${x.ab} — ${esc(F.tname(x))}</option>`).join('')}</optgroup></select></label>
   <p class="sm">${proT ? `Your scout is evaluating the <b>${esc(F.tname(proT))}</b>. At 60%+ you see their players' true potential (useful before trades).` : `Your scout is covering the <b>${esc(s.reg)}</b> region. Prospects there are evaluated faster; up to 5 followed prospects get extra attention anywhere.`}</p>
   <p class="sm muted">Followed: ${s.focus.length}/5 · Pro reports: ${proRows || 'none yet'}</p></section>
   <section class="card"><h3>How scouting works</h3><ul class="help"><li>Every prospect starts as a rough guess. The ± range shrinks as your <b>scouting progress</b> grows.</li><li>Progress builds every day of the season until the draft: fastest for <b>followed</b> prospects, then your assigned <b>region</b>.</li><li>A better <b>Evaluation</b> rating gives tighter estimates; better <b>Coverage</b> scouts faster.</li><li>Switch to <b>pro scouting</b> to see the real potential of another team's players.</li></ul></section></div>
  <div class="pagehead"><h3>${st.season} Draft Class (${ps.length})</h3><select data-chg="scFilt"><option value="all">All regions</option><option value="focus"${rf === 'focus' ? ' selected' : ''}>Followed only</option>${F.REGIONS.map(r => `<option value="${r}"${rf === r ? ' selected' : ''}>${r}</option>`).join('')}</select></div>
  ${pool.length ? `<div class="card flush scroll tall"><table class="t"><tr><th>Rank</th><th>Pos</th><th class="l">Prospect</th><th>Age</th><th>Region</th><th>OVR</th><th>POT (est.)</th><th>Tools</th><th>Scouted</th><th></th></tr>${rows}</table></div>` : '<div class="card muted">The draft class is revealed at the start of each season.</div>'}`;
}

/* ---------------- ALL-STAR ---------------- */
function V_allstar() {
  const st = App.st, a = st.asg; const my = myTid();
  const voter = App.mode === 'shared' ? S.uid : 'local';
  const head = `<div class="pagehead"><h2>⭐ ${st.season} All-Star Game</h2></div>`;
  const dates = `<p class="muted">Voting opens ${F.dayLabel(st, F.asgOpenDay(st))} · Rosters announced ${F.dayLabel(st, F.asgCloseDay(st))} · All-Star Game ${F.dayLabel(st, F.asgDay(st))}</p>`;
  const hist = (st.asgHist || []).length ? `<section class="card flush"><h3 class="pad">All-Star Game history</h3><table class="t"><tr><th>Year</th><th>Winner</th><th>Score</th><th class="l">MVP</th></tr>${st.asgHist.map(h => `<tr><td>${h.y}</td><td><b>${h.w}</b></td><td>${esc(h.s)}</td><td class="l">${esc(h.mvp)}</td></tr>`).join('')}</table></section>` : '';
  if (!a || (!a.open && !a.closed)) return head + dates + `<div class="card"><p>Fan voting hasn't started yet. Starters are chosen by fan votes at each position (three outfielders); reserves and pitchers are picked on performance, with every club represented.</p></div>` + hist;
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n);
  const ballot = lg => F.ASG_POS.map(cat => {
    const ids = (a.ballot[lg][cat] || []).filter(id => PL(id)).sort((x, y) => a.votes[y] - a.votes[x]);
    const top = a.votes[ids[0]] || 1; const n = cat === 'OF' ? 3 : 1;
    const left = F.asgVotesLeft(st, voter, lg, cat);
    return `<section class="card flush asgpos"><h3 class="pad">${cat === 'OF' ? 'Outfield (top 3 start)' : cat}${!a.closed ? ` <span class="muted sm">· ${left} vote${left === 1 ? '' : 's'} left today</span>` : ''}</h3><table class="t">${ids.slice(0, cat === 'OF' ? 12 : 8).map((id, i) => { const p = PL(id); const l = p.sb ? F.batLine(p.sb) : null;
      return `<tr class="${i < n ? 'lead' : ''}${p.tid === my ? ' me' : ''}"><td>${i + 1}</td><td class="l">${plink(p)} ${tb(p.tid)}</td><td class="sm">${l ? f3(l.avg) + ' · ' + p.sb[B.hr] + ' HR · ' + f3(l.ops) : '—'}</td><td class="vt"><div class="vbar"><i style="width:${Math.round(a.votes[id] / top * 100)}%"></i></div><b>${fmt(a.votes[id])}</b></td><td>${!a.closed ? `<button class="mini" data-act="vote" data-id="${id}"${left > 0 ? '' : ' disabled'}>Vote</button>` : i < n ? '<span class="tag gold">Starter</span>' : ''}</td></tr>`; }).join('')}</table></section>`;
  }).join('');
  let rosters = '';
  if (a.closed && a.rosters) {
    rosters = `<div class="grid2">${[0, 1].map(lg => { const ids = a.rosters[lg].filter(id => PL(id)); const stIds = new Set(a.starters[lg].map(s => s[0]));
      const hit = ids.filter(id => !F.isP(PL(id))), pit = ids.filter(id => F.isP(PL(id)));
      const r = id => { const p = PL(id); return `<tr class="${p.tid === my ? 'me' : ''}"><td><b>${p.p}</b></td><td class="l">${plink(p)} ${tb(p.tid)}</td><td>${stIds.has(id) ? '<span class="tag gold">Starter</span>' : ''}</td><td>${p.o}</td></tr>`; };
      return `<section class="card flush"><h3 class="pad">${F.LEAGUES[lg]} All-Stars</h3><table class="t">${hit.map(r).join('')}<tr><th colspan=4 class="l">Pitchers</th></tr>${pit.map(r).join('')}</table></section>`; }).join('')}</div>`;
  }
  const res = a.done && a.result ? `<section class="card hi"><h3>${F.LEAGUES[a.result.win]} wins! ${F.LG[a.result.a]} ${a.result.as}, ${F.LG[a.result.h]} ${a.result.hs}</h3><p>MVP: ${PL(a.result.mvp) ? plink(PL(a.result.mvp)) + ' ' + tb(PL(a.result.mvp).tid) : '—'}</p><button class="btn" data-act="asgBox">Box score</button></section>` : '';
  const tab = App.tab.asg || (a.closed ? 'rost' : 0);
  return head + dates + res + `<div class="tabs"><a class="${tab === 0 || tab === '0' ? 'on' : ''}" data-act="tab" data-g="asg" data-v="0">AL Ballot</a><a class="${tab === '1' ? 'on' : ''}" data-act="tab" data-g="asg" data-v="1">NL Ballot</a>${a.closed ? `<a class="${tab === 'rost' ? 'on' : ''}" data-act="tab" data-g="asg" data-v="rost">Rosters</a>` : ''}</div>` +
    (tab === 'rost' ? rosters : `${!a.closed ? '<p class="muted sm">Each manager gets 5 votes per position per day; each vote is a fan campaign worth 25K votes. Fans vote every day too, based on popularity and performance.</p>' : ''}<div class="asggrid">${ballot(+tab || 0)}</div>`) + hist;
}

/* ---------------- TRADE HUB ---------------- */
function V_hub() {
  const st = App.st, my = myTid();
  if (my == null) return '<div class="card">Claim a team to use the Trade Hub.</div>';
  const me = T(my); const tab = App.tab.hub || 'rumors';
  const myS = F.strategy(st, me), myNeeds = F.needList(st, me);
  const stratTag = s => `<span class="stag s-${s}">${s === 'Contender' ? '🏆 ' : s === 'Rebuilding' ? '🔧 ' : '⚖️ '}${s}</span>`;
  const pmini = p => `<span class="pmini"><b>${p.p}</b> <span class="ov ${rc(p.o)}">${p.o}</span> <span class="muted">${p.a}y · ${money(p.sal)}×${p.y}</span></span>`;
  const fits = p => myNeeds.some(n => n === p.p || (['LF', 'CF', 'RF'].includes(n) && ['LF', 'CF', 'RF'].includes(p.p)) || (n === 'DH' && !F.isP(p)));
  const acts = p => p.tid !== my && p.tid >= 0 ? `<button class="mini" data-act="hubTarget" data-id="${p.id}">Make offer</button><button class="mini ghost${(me.tgt || []).includes(p.id) ? ' on' : ''}" data-act="lst" data-k="tgt" data-id="${p.id}">${(me.tgt || []).includes(p.id) ? '✓ Target' : '+ Target'}</button>` : '';
  const chipRow = (key, opts, cur) => `<div class="chips fchips">${opts.map(([v, l]) => `<button class="chip${cur === v ? ' on' : ''}" data-act="hubF" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const dl = F.deadlineDay(st), left = dl - st.day;
  const rumors = st.rumors || [];
  const block = (me.block || []).filter(id => PL(id) && PL(id).tid === my), tgts = (me.tgt || []).filter(id => PL(id));
  const summary = `<div class="hubsum">
    <div class="hs"><small>Your approach</small>${stratTag(myS)}</div>
    <div class="hs"><small>Your needs</small><div>${myNeeds.length ? myNeeds.map(n => `<span class="tag bad">${n}</span>`).join(' ') : '<span class="good sm">No glaring holes</span>'}</div></div>
    <div class="hs"><small>Trade deadline</small><b>${!F.tradesOpen(st) ? '<span class="bad">Closed</span>' : st.phase === 'regular' ? `${F.dayLabel(st, dl)} <span class="muted sm">· ${left} day${left === 1 ? '' : 's'} left</span>` : 'Offseason — open'}</b></div>
    <div class="hs"><small>Your activity</small><b>${block.length} on block · ${tgts.length} targets</b></div></div>`;
  const tabs = [['rumors', '📰 Rumors', rumors.length], ['market', '🛒 Market', null], ['teams', '🏟️ Team Reports', null], ['block', '📦 Trade Block', block.length], ['targets', '🎯 Targets', tgts.length], ['unt', '🔒 Untouchables', null]];
  let body = '';
  if (tab === 'rumors') {
    const kf = App.filt.hrk || 'all', mineOnly = App.filt.hrm === 'mine';
    const kind = r => r.k || (/listening/.test(r.t) ? 'sell' : /checked in/.test(r.t) ? 'interest' : /extension/.test(r.t) ? 'ext' : 'need');
    const KN = { sell: ['💰', 'Selling', '#e0873a'], interest: ['👀', 'Interest', '#5aa9e6'], need: ['🔎', 'Shopping for', '#9b8cf0'], ext: ['✍️', 'Extension talks', '#4cc38a'] };
    let list = rumors.filter(r => kf === 'all' || kind(r) === kf);
    if (mineOnly) list = list.filter(r => r.tid === my || r.t2 === my || (r.pid != null && (PL(r.pid) || {}).tid === my) || (r.pid != null && tgts.includes(r.pid)));
    body = `<div class="hubtools">${chipRow('hrk', [['all', 'All'], ['sell', '💰 Selling'], ['interest', '👀 Interest'], ['need', '🔎 Needs'], ['ext', '✍️ Extensions']], kf)}${chipRow('hrm', [['all', 'Whole league'], ['mine', 'My team & targets']], mineOnly ? 'mine' : 'all')}</div>
    <div class="rgrid">${list.map(r => { const k = KN[kind(r)]; const p = r.pid != null ? PL(r.pid) : null;
      return `<div class="rcard" style="--c:${k[2]}"><div class="rh"><span class="rk">${k[0]} ${k[1]}</span><span class="muted sm">${r.s} · ${r.d != null ? F.dayLabel(st, r.d) : phaseName(r.ph)}</span></div>
      <div class="rt">${r.tid != null ? tb(r.tid) : ''}${r.t2 != null ? ' → ' + tb(r.t2) : ''} ${esc(r.t)}</div>${p ? `<div class="rp">${plink(p)} ${pmini(p)} ${fits(p) && p.tid !== my ? '<span class="tag good">Fits your need</span>' : ''}<span class="ra">${acts(p)}</span></div>` : ''}</div>`; }).join('') || '<div class="card muted">No rumors match. They pick up as the season goes on.</div>'}</div>`;
  } else if (tab === 'market') {
    const pf = App.filt.hmp || 'all', sk = App.sort.hm || 'ovr', needOnly = App.filt.hmn === 'need';
    let list = F.marketPlayers(st);
    const grp = p => F.isP(p) ? p.p : ['LF', 'CF', 'RF'].includes(p.p) ? 'OF' : ['1B', '2B', '3B', 'SS'].includes(p.p) ? 'IF' : p.p;
    if (pf !== 'all') list = list.filter(o => grp(o.p) === pf);
    if (needOnly) list = list.filter(o => fits(o.p));
    const key = { ovr: o => o.p.o, age: o => -o.p.a, val: o => F.pval(o.p), sal: o => -o.p.sal, pot: o => o.p.pt }[sk];
    list.sort((a, b) => key(b) - key(a));
    body = `<div class="hubtools">${chipRow('hmp', [['all', 'All'], ['C', 'C'], ['IF', 'Infield'], ['OF', 'Outfield'], ['DH', 'DH'], ['SP', 'SP'], ['RP', 'RP']], pf)}${chipRow('hmn', [['all', 'Everyone'], ['need', 'Fits my needs']], needOnly ? 'need' : 'all')}
    <label class="chk">Sort <select data-chg="hubSort" data-k="hm">${[['ovr', 'Overall'], ['pot', 'Potential'], ['val', 'Trade value'], ['age', 'Youngest'], ['sal', 'Cheapest']].map(o => `<option value="${o[0]}"${sk === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label></div>
    <p class="muted sm">Players AI clubs are most willing to move right now: veterans on rebuilding teams, expiring deals and big contracts.</p>
    <div class="card flush scroll tall"><table class="t"><tr><th class="l">Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>POT</th><th>Contract</th><th>Value</th><th>Team</th><th>Why available</th><th></th></tr>${list.slice(0, 200).map(o => { const p = o.p;
      return `<tr><td class="l">${plink(p)} ${fits(p) ? '<span class="tag good">Need</span>' : ''}</td><td><b>${p.p}</b></td><td>${p.a}</td><td><span class="ov ${rc(p.o)}">${p.o}</span></td><td>${potTag(p)}</td><td>${money(p.sal)}×${p.y}</td><td>${F.pval(p)}</td><td>${tb(p.tid)} ${stratTag(o.strat)}</td><td class="sm">${o.why}</td><td class="nw">${acts(p)}</td></tr>`; }).join('') || '<tr><td colspan=10 class="muted">No players match.</td></tr>'}</table></div>`;
  } else if (tab === 'teams') {
    const sf = App.filt.hts || 'all', sk = App.sort.ht || 'rec';
    let teams = st.teams.filter(t => t.id !== my).map(t => ({ t, s: F.strategy(st, t), needs: F.needList(st, t), str: F.teamStrength(st, t), room: t.bud - F.payroll(st, t.id) }));
    if (sf !== 'all') teams = teams.filter(o => o.s === sf);
    const key = { rec: o => F.pct(o.t), ovr: o => o.str, room: o => o.room, needs: o => o.needs.length, name: o => -o.t.ab.charCodeAt(0) }[sk];
    teams.sort((a, b) => key(b) - key(a));
    const sel = App.hubT != null && App.hubT !== my ? App.hubT : null;
    body = `<div class="hubtools">${chipRow('hts', [['all', 'All teams'], ['Contender', '🏆 Contenders'], ['Middle', '⚖️ Middle'], ['Rebuilding', '🔧 Rebuilding']], sf)}
    <label class="chk">Sort <select data-chg="hubSort" data-k="ht">${[['rec', 'Record'], ['ovr', 'Team overall'], ['room', 'Payroll room'], ['needs', 'Most needs']].map(o => `<option value="${o[0]}"${sk === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label></div>
    ${sel != null ? teamReport(sel, stratTag, pmini, acts) : '<p class="muted sm">Click a team for its full report.</p>'}
    <div class="tgrid">${teams.map(o => `<a class="tcard${sel === o.t.id ? ' on' : ''}" data-act="hubTeamPick" data-id="${o.t.id}" style="--c:${o.t.col}"><div class="th">${tb(o.t.id, true)}<div><b>${esc(o.t.name || o.t.city)}</b><span class="muted sm">${rec(o.t)} · OVR ${Math.round(o.str)}</span></div></div>
      ${stratTag(o.s)}<div class="tn">${o.needs.length ? o.needs.slice(0, 4).map(n => `<span class="tag bad">${n}</span>`).join(' ') : '<span class="muted sm">No needs</span>'}</div><div class="muted sm">Room ${money(o.room)}</div></a>`).join('')}</div>`;
  } else if (tab === 'block') {
    const ids = block.slice().sort((a, b) => F.pval(PL(b)) - F.pval(PL(a)));
    body = ids.length ? `<div class="bgrid">${ids.map(id => { const p = PL(id); const ints = F.blockInterest(st, id, my); const pv = F.pval(p);
      return `<section class="card bcard"><div class="bh">${plink(p)} ${pmini(p)}<span class="muted sm">Value ${pv}</span><button class="mini ghost" data-act="lst" data-k="block" data-id="${id}">Remove</button></div>
      ${ints.length ? ints.map(o => { const tot = Math.round(o.offer.reduce((s, x) => s + F.pval(PL(x)), 0) * 10) / 10; const pct = Math.round(tot / Math.max(0.1, pv) * 100);
        return `<div class="offerrow"><div class="ot">${tb(o.tid)} <b>${esc(T(o.tid).name || T(o.tid).city)}</b> ${stratTag(o.strat)}</div><div class="oo">${o.offer.map(x => `${plink(PL(x), true)} <span class="muted sm">${PL(x).p} ${PL(x).o}</span>`).join(', ')}</div><div class="ov2"><span class="${pct >= 95 ? 'good' : pct >= 80 ? 'warn' : 'bad'}">${pct}% value</span></div><button class="mini" data-act="loadOffer" data-o='${esc(JSON.stringify({ tid: o.tid, pid: id, offer: o.offer }))}'>Load in Trade Center</button></div>`; }).join('') : '<p class="muted sm">No serious interest right now.</p>'}</section>`; }).join('')}</div>`
      : '<div class="card muted">Your trade block is empty. Open one of your players and choose “+ Trade block” to see which teams want him and what they would offer.</div>';
  } else if (tab === 'targets') {
    const sk = App.sort.htg || 'ovr', sf = App.filt.htg || 'all';
    const stanceOf = p => { const t = p.tid >= 0 ? T(p.tid) : null; if (!t) return ['fa', 'Free agent']; if (p.tid === my) return ['mine', 'On your team']; if (F.untouchables(st, t).includes(p.id)) return ['no', 'Untouchable']; const s = F.strategy(st, t); return s === 'Rebuilding' && p.a >= 27 ? ['yes', 'Available'] : s === 'Contender' ? ['hard', 'Core piece'] : ['maybe', 'Listening']; };
    let list = tgts.map(id => PL(id));
    if (sf !== 'all') list = list.filter(p => stanceOf(p)[0] === sf);
    const key = { ovr: p => p.o, val: p => F.pval(p), age: p => -p.a, sal: p => -p.sal }[sk]; list.sort((a, b) => key(b) - key(a));
    const SC = { yes: 'good', maybe: 'warn', hard: 'warn', no: 'bad', fa: 'muted', mine: 'muted' };
    body = tgts.length ? `<div class="hubtools">${chipRow('htg', [['all', 'All'], ['yes', 'Available'], ['maybe', 'Listening'], ['hard', 'Core piece'], ['no', 'Untouchable']], sf)}<label class="chk">Sort <select data-chg="hubSort" data-k="htg">${[['ovr', 'Overall'], ['val', 'Trade value'], ['age', 'Youngest'], ['sal', 'Cheapest']].map(o => `<option value="${o[0]}"${sk === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></label></div>
      <div class="card flush scroll"><table class="t"><tr><th class="l">Player</th><th>Pos</th><th>Age</th><th>OVR</th><th>POT</th><th>Contract</th><th>Value</th><th>Team</th><th>Stance</th><th></th></tr>${list.map(p => { const s = stanceOf(p);
        return `<tr><td class="l">${plink(p)} ${fits(p) ? '<span class="tag good">Need</span>' : ''}</td><td><b>${p.p}</b></td><td>${p.a}</td><td><span class="ov ${rc(p.o)}">${p.o}</span></td><td>${potTag(p)}</td><td>${money(p.sal)}×${p.y}</td><td>${F.pval(p)}</td><td>${p.tid >= 0 ? tb(p.tid) : 'FA'}</td><td class="${SC[s[0]]}">${s[1]}</td><td class="nw">${p.tid >= 0 && p.tid !== my ? `<button class="mini" data-act="hubTarget" data-id="${p.id}">Make offer</button>` : ''}<button class="mini ghost" data-act="lst" data-k="tgt" data-id="${p.id}">✕</button></td></tr>`; }).join('') || '<tr><td colspan=10 class="muted">No targets match.</td></tr>'}</table></div>`
      : '<div class="card muted">No targets yet. Use “+ Target” on any player in Rumors, Market or Team Reports to track him here.</div>';
  } else if (tab === 'unt') {
    const ids = (me.unt || []).filter(id => PL(id) && PL(id).tid === my); const sf = App.filt.hus || 'all';
    let teams = st.teams.filter(t => t.id !== my).map(t => ({ t, s: F.strategy(st, t) })); if (sf !== 'all') teams = teams.filter(o => o.s === sf);
    body = `<section class="card"><h3>Your untouchables (${ids.length}/5)</h3><p class="muted sm">Mark players from their player card. AI teams ask for far more for their own untouchables.</p><div class="chips">${ids.map(id => `<span class="chipb">${plink(PL(id))} ${pmini(PL(id))}<button class="mini ghost" data-act="lst" data-k="unt" data-id="${id}">✕</button></span>`).join('') || '<span class="muted">None.</span>'}</div></section>
    <div class="hubtools">${chipRow('hus', [['all', 'All teams'], ['Contender', '🏆 Contenders'], ['Middle', '⚖️ Middle'], ['Rebuilding', '🔧 Rebuilding']], sf)}</div>
    <div class="ugrid">${teams.map(o => `<div class="ucard" style="--c:${o.t.col}"><div class="th">${tb(o.t.id)} <b>${esc(o.t.name || o.t.city)}</b> ${stratTag(o.s)}</div>${F.untouchables(st, o.t).map(id => `<div class="sm">${plink(PL(id), true)} ${pmini(PL(id))}</div>`).join('') || '<div class="muted sm">—</div>'}</div>`).join('')}</div>`;
  }
  return `<div class="pagehead"><h2>Trade Hub</h2><button class="btn primary" data-act="nav" data-v="trades">Open Trade Center</button></div>${summary}
  <div class="tabs">${tabs.map(([k, l, n]) => `<a class="${tab === k ? 'on' : ''}" data-act="tab" data-g="hub" data-v="${k}">${l}${n ? ` <span class="cnt">${n}</span>` : ''}</a>`).join('')}</div>${body}`;
}
function teamReport(tid, stratTag, pmini, acts) {
  const st = App.st, t = T(tid), my = myTid();
  const strat = F.strategy(st, t), needs = F.teamNeeds(st, t), unt = F.untouchables(st, t);
  const want = strat === 'Contender' ? 'Proven big-league talent who can help now. Will pay with prospects.' : strat === 'Rebuilding' ? 'Young players and high-potential prospects. Willing to move veterans and big contracts.' : 'Value deals that fill a hole without giving up core pieces.';
  const shop = F.marketPlayers(st).filter(o => o.t.id === tid).sort((a, b) => b.p.o - a.p.o).slice(0, 8);
  return `<section class="card hi treport"><div class="pagehead"><h3>${tb(tid, true)} ${esc(F.tname(t))} ${stratTag(strat)}</h3><button class="mini ghost" data-act="hubTeamPick" data-id="">Close ✕</button></div>
  <div class="kpis small"><div><small>Record</small><b>${rec(t)}</b></div><div><small>Team OVR</small><b>${Math.round(F.teamStrength(st, t))}</b></div><div><small>Payroll room</small><b>${money(t.bud - F.payroll(st, tid))}</b></div><div><small>Your scouting</small><b>${F.proKnown(st, my, tid)}%</b></div></div>
  <p><b>Looking for:</b> ${want}</p>
  <div class="grid2"><div><h4>Position by position</h4><div class="needbars">${needs.map(n => { const w = Math.min(50, Math.abs(n.gap) * 4); return `<div class="nb"><b>${n.pos}</b><span class="nbw">${n.gap < 0 ? `<i class="neg" style="width:${w}%"></i>` : ''}<i class="mid"></i>${n.gap > 0 ? `<i class="pos" style="width:${w}%"></i>` : ''}</span><span class="${n.gap <= -3 ? 'bad' : n.gap >= 3 ? 'good' : 'muted'} sm">${n.gap > 0 ? '+' : ''}${n.gap}</span><span class="sm">${n.who && PL(n.who) ? plink(PL(n.who), true) : n.pos === 'SP' ? 'Rotation' : 'Bullpen'}</span></div>`; }).join('')}</div><p class="muted sm">Compared with the league-average starter at each spot. Red = need, green = strength.</p></div>
  <div><h4>🔒 Untouchable</h4>${unt.map(id => `<div class="sm">${plink(PL(id))} ${pmini(PL(id))}</div>`).join('') || '<p class="muted">Nobody.</p>'}
  <h4 style="margin-top:12px">🛒 Likely available</h4>${shop.map(o => `<div class="avrow">${plink(o.p)} ${pmini(o.p)} <span class="muted sm">${o.why}</span><span class="ra">${acts(o.p)}</span></div>`).join('') || '<p class="muted">They aren\'t actively shopping anyone.</p>'}</div></div></section>`;
}

/* ---------------- GOAT METER ---------------- */
function goatBar(m) { return `<div class="gm"><i><b style="width:${m}%"></b></i><em>${m}</em></div>`; }
function V_goat() {
  const st = App.st, my = myTid();
  const tab = App.tab.goat || 'pl';
  const tabs = `<div class="tabs"><a class="${tab === 'pl' ? 'on' : ''}" data-act="tab" data-g="goat" data-v="pl">Players</a><a class="${tab === 'tm' ? 'on' : ''}" data-act="tab" data-g="goat" data-v="tm">Franchises</a></div>`;
  const intro = `<p class="muted sm">The GOAT Meter rates legacy on a 0–100 scale from career value (WAR-style, built from stats), awards and milestones. ${st.settings.real ? 'Real players start with their actual MLB careers and awards through 2026 (from MLB.com data); ' : ''}everything you do in this league adds to it, and it moves day by day during the season.</p>`;
  if (tab === 'tm') {
    const rows = st.teams.map(t => ({ t, g: F.goatTeam(st, t) })).sort((a, b) => b.g.score - a.g.score).map((o, i) => { const g = o.g, t = o.t;
      return `<tr class="${t.id === my ? 'me' : ''}"><td>${i + 1}</td><td class="l">${tb(t.id)} ${tlink(t.id)}</td><td>${goatBar(g.meter)}</td><td>${g.legacy ? g.legacy + ' 🏆' : '—'}</td><td>${g.titles ? g.titles + ' 💍' : '—'}</td><td>${g.pennants}</td><td>${g.po}</td><td>${g.w}-${g.l}</td><td class="${g.live >= 0 ? 'good' : 'bad'}">${g.live >= 0 ? '+' : ''}${g.live}</td></tr>`; }).join('');
    return `<div class="pagehead"><h2>🐐 GOAT Meter</h2></div>${tabs}${intro}<div class="card flush scroll tall"><table class="t"><tr><th>#</th><th class="l">Franchise</th><th>GOAT Meter</th><th title="Real World Series titles through 2026">Real titles</th><th title="Titles won in this league">League titles</th><th>Pennants</th><th>Playoff apps</th><th>League W-L</th><th title="Live boost from this season's record">This season</th></tr>${rows}</table></div>
    <p class="muted sm">Franchise score: real championships through 2026 (2026: Milwaukee Brewers over Tampa Bay, 4–1) + titles, pennants, playoff trips and winning in this league + a live boost from the current season.</p>`;
  }
  const flt = App.filt.goat || 'all';
  let ps = Object.values(st.players).filter(p => p.tid >= -1 && (p.lv === 0 || p.leg));
  if (flt === 'hit') ps = ps.filter(p => !F.isP(p)); else if (flt === 'pit') ps = ps.filter(F.isP); else if (flt === 'mine' && my != null) ps = ps.filter(p => p.tid === my); else if (flt === 'young') ps = ps.filter(p => p.a <= 27);
  const list = ps.map(p => ({ p, g: F.goatPlayer(st, p) })).sort((a, b) => b.g.score - a.g.score).slice(0, 150);
  const rows = list.map(({ p, g }, i) => { const tr = F.goatTier(g.meter); const t = g.tot;
    const line = !F.isP(p) && t.b ? `${t.b[B.h]} H · ${t.b[B.hr]} HR · ${f3(F.batLine(t.b).ops)} OPS` : t.p ? `${t.p[P.w]} W · ${t.p[P.k]} K · ${f2(F.pitLine(t.p).era)} ERA${t.p[P.sv] > 20 ? ' · ' + t.p[P.sv] + ' SV' : ''}` : '—';
    const aw = F.AWK.filter(([k]) => g.aw[k]).map(([k, n, , ic]) => `<span title="${n}">${ic}${g.aw[k] > 1 ? '×' + g.aw[k] : ''}</span>`).join(' ');
    return `<tr class="${p.tid === my ? 'me' : ''}"><td>${i + 1}</td><td class="l">${plink(p)} ${p.tid >= 0 ? tb(p.tid) : '<span class="muted sm">FA</span>'}</td><td>${p.p}</td><td>${p.a}</td><td>${goatBar(g.meter)}</td><td><span class="tier ${tr[2]}">${tr[1]}</span></td><td>${g.war}</td><td class="awi">${aw || '—'}</td><td class="sm">${line}</td><td class="${g.season > 0 ? 'good' : 'muted'}">${g.season > 0 ? '+' : ''}${g.season}</td></tr>`; }).join('');
  return `<div class="pagehead"><h2>🐐 GOAT Meter</h2><select data-chg="goatF">${[['all', 'All players'], ['hit', 'Hitters'], ['pit', 'Pitchers'], ['young', 'Age 27 and under'], ...(my != null ? [['mine', 'My team']] : [])].map(o => `<option value="${o[0]}"${flt === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></div>${tabs}${intro}
  <div class="card flush scroll tall"><table class="t"><tr><th>#</th><th class="l">Player</th><th>Pos</th><th>Age</th><th>GOAT Meter</th><th>Tier</th><th>Career WAR</th><th>Awards</th><th class="l">Career</th><th title="Value added this season">This season</th></tr>${rows}</table></div>
  <p class="muted sm">Awards: 🏆 MVP · 🔥 Cy Young · 💍 World Series title · ⭐ WS MVP · 🌱 Rookie of the Year · 🔒 Reliever of the Year · ✨ All-Star · 🥈 Silver Slugger · 🧤 Gold Glove · 🌟 All-Star Game MVP</p>`;
}

/* ---------------- BRACKET ---------------- */
function V_playoffs() {
  const st = App.st, po = st.po;
  const seeds = po ? po.seeds : [F.seeds(st, 0), F.seeds(st, 1)];
  const sd = (lg, tid) => seeds[lg].indexOf(tid) + 1;
  const find = (r, lg, pred) => po ? po.series.find(s => s.r === r && (lg < 0 || s.lg === lg) && pred(s)) : null;
  const box = (s, lg, a, b, label) => {
    // a, b: team ids or null for TBD (a = higher seed)
    const done = s && s.win != null;
    const row = (tid, w, isHi) => { if (tid == null) return `<div class="tm"><span class="sd"></span><span class="nm">TBD</span><b></b></div>`; const T_ = T(tid);
      const cls = done ? (s.win === tid ? 'win' : 'lose') : '';
      return `<div class="tm ${cls}"><span class="sd">${lg >= 0 ? sd(lg, tid) || '' : ''}</span>${tb(tid)}<span class="nm" title="${esc(F.tname(T_))}">${esc(T_.name)}</span><b>${s ? w : ''}</b></div>`; };
    const hi = s ? s.hi : a, lo = s ? s.lo : b;
    const foot = s ? (done ? `${T(s.win).ab} wins ${Math.max(s.wh, s.wl)}-${Math.min(s.wh, s.wl)}` : `Best of ${s.best} · ${s.wh === s.wl ? 'tied ' + s.wh + '-' + s.wl : (s.wh > s.wl ? T(s.hi).ab : T(s.lo).ab) + ' leads ' + Math.max(s.wh, s.wl) + '-' + Math.min(s.wh, s.wl)}`) : label;
    const games = s && s.g.length ? `<div class="ft">${s.g.map(g => g[4] ? `<a class="pl" data-act="box" data-id="${g[4]}">G</a>` : '').join(' ')}</div>` : '';
    return `<div class="mu${!s ? ' tbd' : ''}${s && !done ? ' live' : ''}">${row(hi, s ? s.wh : 0)}${row(lo, s ? s.wl : 0)}<div class="ft">${foot}</div>${games}</div>`;
  };
  const lgCols = lg => {
    const s = seeds[lg];
    const wc45 = find(0, lg, x => x.hi === s[3]), wc36 = find(0, lg, x => x.hi === s[2]);
    const ds1 = find(1, lg, x => x.hi === s[0]), ds2 = find(1, lg, x => x.hi === s[1]);
    const cs = find(2, lg, () => true);
    const w = x => x && x.win != null ? x.win : null;
    return {
      wc: [box(wc45, lg, s[3], s[4], 'Best of 3'), box(wc36, lg, s[2], s[5], 'Best of 3')],
      ds: [box(ds1, lg, s[0], w(wc45), 'Best of 5 · #1 seed bye'), box(ds2, lg, s[1], w(wc36), 'Best of 5 · #2 seed bye')],
      cs: [box(cs, lg, w(ds1), w(ds2), 'Best of 7')]
    };
  };
  const L = lgCols(0), R = lgCols(1);
  const ws = find(3, -1, () => true);
  const csL = find(2, 0, () => true), csR = find(2, 1, () => true);
  const wsBox = box(ws, -1, csL && csL.win != null ? csL.win : null, csR && csR.win != null ? csR.win : null, 'Best of 7');
  const col = (cls, title, items) => `<div class="col ${cls}"><h4>${title}</h4>${items.join('')}</div>`;
  const champ = po && po.champ != null ? `<div class="champ">🏆 ${esc(F.tname(T(po.champ)))} — ${st.season} World Series Champions</div>` : '';
  const head = po ? `${st.season} Postseason` : `${st.season} Playoff Picture <span class="muted sm">(if the season ended today)</span>`;
  return `<div class="pagehead"><h2>${head}</h2></div>${champ}
  <section class="card"><div class="brk">
   ${col('lgL', 'AL Wild Card', L.wc)}${col('lgL', 'AL Division Series', L.ds)}${col('lgL', 'ALCS', L.cs)}
   ${col('ws', '🏆 World Series', [wsBox])}
   ${col('lgR', 'NLCS', R.cs)}${col('lgR', 'NL Division Series', R.ds)}${col('lgR', 'NL Wild Card', R.wc)}
  </div></section>
  <div class="grid2">${[0, 1].map(lg => `<section class="card"><h3>${F.LEAGUES[lg]} seeds</h3><ol class="seeds">${seeds[lg].map((tid, i) => `<li>${tb(tid)} ${esc(T(tid).name)} <span class="muted">${rec(T(tid))}${i < 3 ? ' · Division' : ' · Wild Card'}${i < 2 ? ' · bye' : ''}</span></li>`).join('')}</ol></section>`).join('')}</div>${histTable()}`;
}

/* ---------------- FANTASY DRAFT ---------------- */
function V_fantasy() {
  const st = App.st, my = myTid(), d = st.fd;
  if (!d) return '<div class="card">No fantasy draft in this league.</div>';
  if (d.done) return `<div class="card"><h2>Fantasy Draft — Complete</h2><p class="muted">Every organization is set. Check your roster and lineup before Opening Day.</p><button class="btn primary" data-act="nav" data-v="roster">View my roster</button></div>`;
  const on = d.picks[d.i], mineOn = canControl(on);
  const rnd = Math.floor(d.i / 30) + 1;
  const myNext = []; for (let i = d.i; i < d.picks.length && myNext.length < 4; i++) if (d.picks[i] === my) myNext.push(i + 1);
  const f = App.filt.fd || 'all', q = (App.filt.fdq || '').toLowerCase(), sk = App.sort.fd || 'OVR';
  let pool = F.fdPool(st);
  if (f === 'H') pool = pool.filter(p => !F.isP(p)); else if (f === 'P') pool = pool.filter(F.isP); else if (f === 'OF') pool = pool.filter(p => ['LF', 'CF', 'RF'].includes(p.p)); else if (f !== 'all') pool = pool.filter(p => p.p === f);
  if (q) pool = pool.filter(p => (p.f + ' ' + p.l).toLowerCase().includes(q));
  const key = { OVR: p => p.o, POT: p => p.pt, Age: p => -p.a, Value: p => F.pval(p) }[sk] || (p => p.o);
  pool.sort((a, b) => key(b) - key(a));
  const rows = pool.slice(0, 200).map(p => { const c = (p.c || []).find(x => x.y === 2026); const l = c && (F.isP(p) ? c.p : c.b);
    const line = l ? (F.isP(p) ? `${l[P.w]}-${l[P.l]}, ${f2(F.pitLine(l).era)} ERA, ${l[P.k]} K` : `${f3(F.batLine(l).avg)}, ${l[B.hr]} HR, ${f3(F.batLine(l).ops)} OPS`) + (c.m ? ' <span class="muted">(minors)</span>' : '') : '—';
    const rk = F.isP(p) ? `${Math.round(p.r.vel)}/${Math.round(p.r.ctl)}/${Math.round(p.r.brk)}/${Math.round(p.r.sta)}` : `${Math.round(p.r.con)}/${Math.round(p.r.pow)}/${Math.round(p.r.eye)}/${Math.round(p.r.spd)}/${Math.round(p.r.fld)}`;
    return `<tr><td><b>${p.p}</b></td><td class="l">${plink(p)}</td><td>${p.ftid != null ? tb(p.ftid) : ''}</td><td>${p.a}</td><td><span class="ov ${rc(p.o)}">${p.o}</span></td><td><span class="pot">${grade(p.pt)}</span></td><td class="sm muted">${rk}</td><td class="sm">${line}</td><td>${money(p.sal)}×${p.y}</td><td>${mineOn ? `<button class="mini" data-act="fdPick" data-id="${p.id}">Draft</button>` : ''}</td></tr>`; }).join('');
  let mineHtml = '';
  if (my != null) {
    const nd = F.fdNeeds(st, my); const mine = F.fdTeamPicks(st, my);
    const needs = Object.entries(nd.need).filter(([, v]) => v > 0).map(([g, v]) => `<span class="tag bad">${g}×${v}</span>`).join(' ') || '<span class="good sm">All core spots filled</span>';
    mineHtml = `<section class="card"><h3>${tb(my)} Your picks (${mine.length}/${d.rounds})</h3><p class="sm">Still need: ${needs}</p><table class="t">${mine.map((p, i) => `<tr><td>${i + 1}</td><td><b>${p.p}</b></td><td class="l">${plink(p, true)}</td><td><span class="ov ${rc(p.o)}">${p.o}</span></td><td>${p.a}</td></tr>`).join('') || '<tr><td class="muted">No picks yet.</td></tr>'}</table></section>`;
  }
  const recent = d.made.slice(-14).reverse().map(([tid, pid], i) => { const p = PL(pid); return `<tr class="${tid === my ? 'me' : ''}"><td>${d.made.length - i}</td><td>${tb(tid)}</td><td class="l">${p ? plink(p, true) : ''}</td><td>${p ? p.p : ''}</td><td>${p ? p.o : ''}</td></tr>`; }).join('');
  return `<div class="pagehead"><h2>🎲 Fantasy Draft</h2><div class="row"><input id="fdq" data-inp="fdq" placeholder="Search players…" value="${esc(App.filt.fdq || '')}"><select data-chg="fdF">${[['all', 'All'], ['H', 'Hitters'], ['P', 'Pitchers'], ['C', 'C'], ['1B', '1B'], ['2B', '2B'], ['3B', '3B'], ['SS', 'SS'], ['OF', 'OF'], ['DH', 'DH'], ['SP', 'SP'], ['RP', 'RP']].map(o => `<option value="${o[0]}"${f === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select><select data-chg="fdS">${['OVR', 'POT', 'Value', 'Age'].map(o => `<option${sk === o ? ' selected' : ''}>${o === 'Age' ? 'Age (youngest)' === o ? o : o : o}</option>`).join('')}</select></div></div>
  ${d.paused ? `<section class="card hi"><h3>Waiting for managers</h3><p>Invite your friends and have them claim teams before the draft starts — any team without a manager is drafted by the AI.</p><p class="sm">Joined: ${members().map(u => esc(uname(u)) + ' (' + T(App.st.members[u]).ab + ')').join(', ')}</p>${isCommish() ? '<button class="btn primary" data-act="fdGo">Start the draft</button>' : '<p class="muted">The commissioner will start the draft.</p>'}${S.uid && !(S.uid in App.st.members) ? `<label class="lrow" style="grid-template-columns:90px 1fr"><span>Nickname</span><input id="joinNick" data-inp="nick" maxlength="24" placeholder="e.g. Jho" value="${esc(App.joinNick || (window.FOB_NAME ? window.FOB_NAME() : ''))}"></label><p>Pick a team to join:</p><div class="chips">` + App.st.teams.filter(t => !t.user).map(t => `<button class="chip" data-act="claim" data-id="${t.id}" style="--c:${t.col}">${t.ab}</button>`).join('') + '</div>' : ''}</section>` : ''}
  <section class="card ${mineOn ? 'hi' : ''}"><div class="clock">Round ${rnd} of ${d.rounds}, Pick ${d.i + 1} of ${d.picks.length} — ${tb(on, true)} <b>${esc(F.tname(T(on)))}</b> ${mineOn ? '<span class="good">— you are on the clock!</span>' : T(on).user ? `<span class="muted">(${App.mode === 'shared' ? esc(uname(T(on).user)) : 'human'})</span>` : ''}</div>
  <p class="sm">Snake order: rounds alternate direction. ${my != null ? `Your next picks: ${myNext.join(', ') || 'none left'}.` : ''} After ${d.rounds} rounds, the rest of every organization (minor leaguers) is filled automatically.</p>
  <div class="row">${mineOn ? '<button class="btn" data-act="fdAutoOne">Auto-pick for me</button>' : ''}${my != null ? `<label class="chk"><input type="checkbox" data-chg="fdAutoMe"${d.auto[my] ? ' checked' : ''}> Auto-draft the rest of my picks</label>` : ''}${App.mode === 'shared' && isCommish() && T(on).user && !mineOn ? '<button class="btn ghost" data-act="fdForce">Auto-pick for them</button>' : ''}</div></section>
  <div class="grid2 wide-left"><div class="card flush scroll tall"><table class="t"><tr><th>Pos</th><th class="l">Player</th><th>2026</th><th>Age</th><th>OVR</th><th>POT</th><th>Ratings</th><th class="l">2026 stats</th><th>Contract</th><th></th></tr>${rows || '<tr><td colspan=10 class="muted">No players match.</td></tr>'}</table></div>
  <div>${mineHtml}<section class="card flush"><h3 class="pad">Latest picks</h3><table class="t">${recent || '<tr><td class="muted pad">No picks yet.</td></tr>'}</table></section></div></div>`;
}

/* ---------------- INBOX ---------------- */
function readMap() { try { return JSON.parse(localStorage.getItem('fob_read_' + App.id) || '{}'); } catch (e) { return App._read || (App._read = {}); } }
function setRead(conv, ts) { const m = readMap(); m[conv] = Math.max(m[conv] || 0, ts); try { localStorage.setItem('fob_read_' + App.id, JSON.stringify(m)); } catch (e) { App._read = m; } }
const convOf = m => m.b === 'all' ? 'all' : (m.a === S.uid ? m.b : m.a);
function myMsgs() { return (App.msgs || []).filter(m => m.b === 'all' || m.a === S.uid || m.b === S.uid); }
function unreadCount(conv) { const r = readMap(); return myMsgs().filter(m => m.a !== S.uid && (conv == null || convOf(m) === conv) && m.ts > (r[convOf(m)] || 0)).length; }
function V_inbox() {
  if (App.mode !== 'shared') return '<div class="card">The inbox is for multiplayer leagues.</div>';
  if (!(S.uid in App.st.members) && S.uid !== App.st.commish) return '<div class="card">Claim a team to message the other managers.</div>';
  const st = App.st;
  const others = [...new Set(members().concat(st.commish ? [st.commish] : []))].filter(u => u !== S.uid);
  const conv = App.conv || 'all';
  const list = [['all', '📣 League chat', 'Everyone in the league']].concat(others.map(u => [u, esc(uname(u)), st.members[u] != null ? `${T(st.members[u]).ab} ${esc(T(st.members[u]).name)}` : 'Commissioner']));
  const msgs = myMsgs().filter(m => convOf(m) === conv).sort((a, b) => a.ts - b.ts);
  if (msgs.length) setRead(conv, msgs[msgs.length - 1].ts);
  const fmt = ts => new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const thread = msgs.map(m => { const me = m.a === S.uid; const tid = st.members[m.a];
    return `<div class="msg ${me ? 'mine' : ''}"><div class="mh">${tid != null ? tb(tid) : ''} <b>${esc(me ? 'You' : uname(m.a))}</b> <span class="muted sm">${fmt(m.ts)}</span></div><div class="mb">${esc(m.t).replace(/\n/g, '<br>')}</div></div>`; }).join('');
  const title = conv === 'all' ? 'League chat' : esc(uname(conv));
  return `<div class="pagehead"><h2>✉️ Inbox</h2></div>
  <div class="inbox"><section class="card flush convs">${list.map(([k, n, sub]) => { const u = unreadCount(k); return `<a class="conv${k === conv ? ' on' : ''}" data-act="conv" data-k="${esc(k)}"><b>${n}</b><span class="muted sm">${sub}</span>${u ? `<i class="ub">${u}</i>` : ''}</a>`; }).join('')}</section>
  <section class="card thread"><h3>${title}</h3><div class="msgs scroll" id="msgs">${thread || '<p class="muted">No messages yet. Say hi!</p>'}</div>
  <div class="compose"><textarea id="dmText" data-inp="dm" rows="2" maxlength="500" placeholder="${conv === 'all' ? 'Message the whole league…' : 'Message ' + title + '…'}">${esc(App.dmDraft || '')}</textarea><button class="btn primary" data-act="dmSend">Send</button></div>
  <p class="muted sm">Messages are visible to the people in the conversation. Note: messages are stored with the league's shared data, so they aren't encrypted.</p></section></div>`;
}

window.__dbg = { openLeague, render, H, C, startLive, liveAction, liveSave, doSim, openPlayer, openBox, myGameToday };
/* ---------------- boot ---------------- */
(async function boot() {
  render();
  await S.init();
  const m = /^#join-([A-Za-z0-9]+)$/.exec(location.hash || '');
  if (m && S.db) { await openLeague(m[1]); if (App.st) { App.view = 'home'; render(); return; } }
  loadStart();
})();
window.FOB_UI = { App, H, render, modal, closeModal, toast };
})();
