/* ---------------- Tutorial: site tour + Baseball 101 ---------------- */
(function () {
  const { App, H, render, modal, closeModal, toast } = window.FOB_UI;
  const KEY = 'fob_tut';
  const seen = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return !!window._fobTut; } };
  const mark = v => { try { localStorage.setItem(KEY, v); } catch (e) { window._fobTut = v; } };

  const FIELD = `<svg viewBox="0 0 220 200" class="tutfield" aria-label="Baseball field with positions">
    <path d="M110 190 L10 90 A141 141 0 0 1 210 90 Z" fill="#1f5c33" stroke="#2f7a46"/>
    <path d="M110 178 L60 128 L110 78 L160 128 Z" fill="#8a6a43" stroke="#a88456"/>
    <path d="M110 165 L73 128 L110 91 L147 128 Z" fill="#2a6b3d"/>
    <rect x="106" y="174" width="8" height="8" fill="#fff" transform="rotate(45 110 178)"/>
    <rect x="156" y="124" width="8" height="8" fill="#fff" transform="rotate(45 160 128)"/>
    <rect x="106" y="74" width="8" height="8" fill="#fff" transform="rotate(45 110 78)"/>
    <rect x="56" y="124" width="8" height="8" fill="#fff" transform="rotate(45 60 128)"/>
    <circle cx="110" cy="130" r="6" fill="#a88456"/>
    <g font-size="10" font-weight="700" fill="#fff" text-anchor="middle" font-family="Barlow,sans-serif">
      <text x="110" y="133">P</text><text x="110" y="196">C</text>
      <text x="176" y="118">1B</text><text x="140" y="96">2B</text><text x="80" y="96">SS</text><text x="44" y="118">3B</text>
      <text x="40" y="60">LF</text><text x="110" y="30">CF</text><text x="180" y="60">RF</text>
      <text x="168" y="146" font-size="8" fill="#e8d9b5">1st</text><text x="110" y="70" font-size="8" fill="#e8d9b5">2nd</text><text x="52" y="146" font-size="8" fill="#e8d9b5">3rd</text><text x="128" y="186" font-size="8" fill="#e8d9b5">Home</text>
    </g></svg>`;
  const gl = rows => `<table class="tutgl">${rows.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td></tr>`).join('')}</table>`;

  const SITE = [
    { t: 'Welcome, General Manager', b: `<p>In <b>Front Office Baseball</b> you run a big-league club. You build the roster, set the lineup, make trades, sign free agents and draft prospects. Then you sim or play the games.</p><p>This tour shows where everything is. Use <b>Next</b> and <b>Back</b>, or skip at any time.</p>` },
    { v: 'home', t: 'Home', b: `<p>Your dashboard shows your record, upcoming games, league news, trade offers sent to you and team leaders.</p><p>Click the <b>FOB</b> logo at the top left to go back to the main menu. Your franchise saves automatically.</p>` },
    { hl: '.adv', t: 'Moving time forward', b: `<p>These buttons in the top bar move the calendar.</p><ul><li><b>Sim Day</b> plays one day. <b>More…</b> sims a week, a month, or to the draft, the trade deadline or the end of the season.</li><li><b>▶ Play Game</b> lets you manage today's game yourself.</li><li>In the offseason, the same button moves you through re-signing, free agency and preseason.</li></ul>` },
    { t: 'Playing a game live', b: `<p>When you play live, each at-bat result pops up on the diamond: strikeouts, hits, home runs and runs scoring.</p><p>Watch your pitcher's <b>stamina</b> bar. When he tires or struggles you'll be asked about a <b>bullpen change</b>. You can also pinch-hit. Choose <b>Skip to end</b> and the AI manages the rest of the game for you.</p>` },
    { v: 'roster', t: 'Roster', b: `<p>See your MLB club and your <b>AAA</b> and <b>AA</b> farm teams. Click any column header to sort, and click a player to see his ratings, stats, contract and positions.</p><p>From the player card you can call players up, send them down, release them or put them on the trade block.</p>` },
    { v: 'lineup', t: 'Lineup & Depth', b: `<p>Set your batting order and who plays each position, your 5-man <b>rotation</b> and your <b>bullpen roles</b>: long and middle relief, setup, specialists, stopper and closer.</p><p>Starters need 4–5 days of rest after an outing. Everyday players get tired more slowly and need an occasional day off (catchers more often). With <b>Auto-rest</b> on, a bench player fills in for them that day. Players learn new positions the more they play there.</p>` },
    { v: 'staff', t: 'Staff', b: `<p>Your manager and coaches help players develop, and better coaches cost more. You can hire coaches from the free-agent pool.</p>` },
    { v: 'trades', t: 'Trade Center', b: `<p>Pick a trade partner, then use the filters (level, position, search, sort) to find players on either side. Click a player to add him to the deal.</p><p>The <b>value meter</b> shows whether the other team will say yes. The <b>Trade Hub</b> page has rumors, trade blocks, team needs and your target list.</p>` },
    { v: 'fa', t: 'Free Agents', b: `<p>Sign players and coaches who don't have a team. Most of the action is in the offseason <b>Free Agency</b> phase, when you make offers and other teams bid against you.</p>` },
    { v: 'scouting', t: 'Scouting & Draft', b: `<p>Your amateur scout reports on the draft class. The more you scout a player, the more accurate his grades are. When the <b>Draft</b> comes, you pick from these players when you're on the clock.</p>` },
    { v: 'standings', t: 'Standings, Stats & more', b: `<p><b>Schedule</b> is your calendar with key dates. <b>Standings</b> and <b>Stats</b> show the league races and leaderboards (click headers to sort). <b>All-Star</b> has voting and the game, <b>Postseason</b> shows the playoff bracket, and the <b>GOAT Meter</b> ranks the all-time greats.</p>` },
    { v: 'league', t: 'League & Settings', b: `<p><b>League</b> shows transactions: trades, signings, call-ups and more. <b>Settings</b> has league options, save export and import, and this tutorial.</p><p><b>Multiplayer:</b> share the invite link so friends can pick a nickname and claim a team. Use <b>Inbox</b> to message each other and <b>Mark Ready</b> when you're done for the day.</p>` },
    { t: 'The yearly cycle', b: `<p><b>Preseason → Regular Season</b> (with the Draft, All-Star Game and Trade Deadline along the way) <b>→ Postseason → Season Review → Re-sign Players → Free Agency →</b> next season.</p><p>Players age, improve or decline every year, so keep an eye on your farm system.</p>` },
  ];

  const BALL = [
    { t: 'Baseball 101: the goal', b: `<p>Two teams take turns batting and fielding. Whoever scores more <b>runs</b> wins.</p><p>A game has <b>9 innings</b>. In each inning the away team bats first (the <b>top</b>) and the home team bats second (the <b>bottom</b>). If the game is tied after 9, it goes to <b>extra innings</b>.</p>` },
    { t: 'The field', b: `${FIELD}<p>Batters hit from <b>home plate</b> and run counter-clockwise: first base, second, third, then home. Nine fielders play defense.</p>` },
    { t: 'An at-bat', b: `<p>The pitcher throws to the batter. A pitch in the strike zone, or any swing and miss, is a <b>strike</b>. A pitch outside the zone that the batter doesn't swing at is a <b>ball</b>.</p><ul><li><b>3 strikes</b> is a strikeout (K).</li><li><b>4 balls</b> is a walk (BB): the batter goes to first base.</li><li>A <b>foul ball</b> counts as a strike, but it can't be strike three.</li><li>Hits: <b>single</b> (1 base), <b>double</b> (2), <b>triple</b> (3), <b>home run</b> (all the way around).</li></ul>` },
    { t: 'Outs and runs', b: `<p>Each team gets <b>3 outs</b> per half-inning. Outs come from strikeouts, fly balls caught in the air, and grounders thrown to first before the runner gets there.</p><p>A runner who touches all four bases scores a <b>run</b>. A batter who drives in a run gets an <b>RBI</b>.</p>` },
    { t: 'Positions', b: `<p><b>P</b> pitcher, <b>C</b> catcher, <b>1B 2B 3B</b> basemen, <b>SS</b> shortstop, <b>LF CF RF</b> outfielders, and the <b>DH</b> (designated hitter), who bats but doesn't field.</p><p><b>C, SS, 2B and CF</b> ("up the middle") are the hardest to play, so good fielders there are valuable. A player can be listed at other positions too, and he gets more comfortable there the more he plays.</p>` },
    { t: 'Pitching staff', b: `<p><b>Starters (SP)</b> begin games and usually go about 5–7 innings, then rest for several days. <b>Relievers (RP)</b> finish games. The <b>closer</b> gets the final outs of close wins and earns a <b>save</b>, and <b>setup</b> men pitch the 7th and 8th.</p><p>Same-side matchups favor the pitcher, so a lefty pitcher has an edge against lefty batters. That's what <b>specialists</b> are for.</p>` },
    { t: 'Hitting stats', b: gl([['AVG', 'Batting average: hits ÷ at-bats. Around .250 is normal and .300 is great.'], ['OBP', 'On-base %: how often he reaches base, walks included.'], ['SLG', 'Slugging: total bases per at-bat (power).'], ['OPS', 'OBP + SLG. About .720 is average and .900+ is star level.'], ['HR / RBI / R', 'Home runs, runs batted in, runs scored.'], ['SB', 'Stolen bases.'], ['WAR', 'Wins Above Replacement: total value. 2 is solid, 5+ is All-Star, 8+ is MVP level.']]) },
    { t: 'Pitching stats', b: gl([['ERA', 'Earned runs allowed per 9 innings. Lower is better: ~4.00 is average and under 3.00 is excellent.'], ['WHIP', 'Walks + hits per inning. Around 1.30 is average and under 1.10 is elite.'], ['IP', 'Innings pitched.'], ['K / BB', 'Strikeouts and walks.'], ['W-L', 'Wins and losses credited to the pitcher.'], ['SV', 'Saves, mostly by closers.']]) },
    { t: 'Player ratings in this game', b: `<p><b>Hitters:</b> CON contact, POW power, EYE plate discipline, SPD speed, FLD fielding, ARM throwing arm.</p><p><b>Pitchers:</b> VEL velocity, CTL control, BRK breaking stuff, STA stamina (how deep he can go).</p><p><b>OVR</b> is how good he is now and <b>POT</b> is how good he could become. Most players improve into their mid-20s, peak around 27–30, then decline. Ratings also move during the season with hot and cold streaks.</p>` },
    { t: 'The season & the minors', b: `<p>MLB has two leagues (AL and NL), each with three divisions. Over the regular season (162 games by default), the best teams make the <b>postseason</b>, and the winners meet in the <b>World Series</b>.</p><p>Young players develop in the minors: <b>AA</b>, then <b>AAA</b>, then the majors. When contracts end, you can re-sign players or let them go to free agency.</p>` },
    { t: "You're ready!", b: `<p>Tip for your first season: check <b>Lineup & Depth</b>, sim a few days, then play a game live to get the feel. You can reopen this tutorial anytime with the <b>?</b> button at the top or from <b>Settings</b>.</p><p>Play ball! ⚾</p>` },
  ];
  const TRACKS = { site: SITE, ball: BALL, both: SITE.concat(BALL) };

  window.tutMenu = function () {
    App.tut = null; tutPanel();
    modal(`<div class="tutmenu"><h2>Welcome to Front Office Baseball</h2><p class="muted">Want a quick tour? Pick what you'd like to learn, or skip if you already know your way around.</p>
    <div class="tutopts">
      <button class="tutopt" data-act="tutGo" data-k="site"><b>🧭 How the site works</b><span>Pages, simming, trades and multiplayer · ${SITE.length} steps</span></button>
      <button class="tutopt" data-act="tutGo" data-k="ball"><b>⚾ Baseball 101</b><span>Rules, positions, stats and ratings explained · ${BALL.length} steps</span></button>
      <button class="tutopt" data-act="tutGo" data-k="both"><b>⭐ Full tutorial</b><span>Both of the above · ${SITE.length + BALL.length} steps</span></button>
    </div>
    <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-act="tutSkip">Skip, I'm an experienced player</button></div></div>`);
  };
  window.tutOffer = function () { if (!seen()) tutMenu(); };
  window.tutStartCard = function () {
    if (seen()) return '';
    return `<section class="card tutcard"><div><b>New here?</b> <span class="muted">Take a quick tour of the site and the basics of baseball.</span></div><div class="row"><button class="btn primary" data-act="tutMenu">Start tutorial</button><button class="btn ghost" data-act="tutSkip">Skip</button></div></section>`;
  };

  function step() { const t = App.tut; return t && t.steps[t.i]; }
  function tutPanel() {
    let el = document.getElementById('tut');
    const t = App.tut, s = step();
    if (!s) { if (el) el.remove(); document.querySelectorAll('.tuthi').forEach(n => n.classList.remove('tuthi')); return; }
    if (!el) { el = document.createElement('div'); el.id = 'tut'; document.body.appendChild(el); }
    const away = s.v && !App.st ? `<p class="muted sm">Start or open a franchise to see this page during the tour.</p>` : '';
    const pct = Math.round((t.i + 1) / t.steps.length * 100);
    el.innerHTML = `<div class="tuthead"><span class="muted sm">Tutorial · ${t.i + 1} / ${t.steps.length}</span><button class="x" data-act="tutEnd" title="Close tutorial">✕</button></div>
      <div class="tutbar"><i style="width:${pct}%"></i></div>
      <h3>${s.t}</h3><div class="tutbody">${s.b}${away}</div>
      <div class="tutnav"><button class="btn ghost sm" data-act="tutEnd">Skip tutorial</button><span style="flex:1"></span>
      ${t.i > 0 ? '<button class="btn sm" data-act="tutPrev">← Back</button>' : ''}
      <button class="btn primary sm" data-act="tutNext">${t.i === t.steps.length - 1 ? 'Finish ✓' : 'Next →'}</button></div>`;
    el.querySelector('.tutbody').scrollTop = 0;
    tutAfterRender();
  }
  function go() {
    const s = step();
    if (s && s.v && App.st && !App.live && App.view !== s.v) { App.view = s.v; render(); window.scrollTo(0, 0); }
    tutPanel();
  }
  window.tutAfterRender = function () {
    document.querySelectorAll('.tuthi').forEach(n => n.classList.remove('tuthi'));
    const s = step(); if (!s) return;
    const sel = s.hl || (s.v ? `nav.side a[data-v="${s.v}"]` : null);
    const n = sel && document.querySelector(sel);
    if (n) { n.classList.add('tuthi'); if (n.scrollIntoView && n.closest('nav.side')) try { n.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { } }
  };
  function end() { App.tut = null; mark('done'); tutPanel(); if (!App.st) render(); }

  Object.assign(H, {
    tutMenu: () => tutMenu(),
    tutGo: el => { mark('done'); closeModal(); App.tut = { steps: TRACKS[el.dataset.k] || SITE, i: 0 }; go(); },
    tutSkip: () => { mark('skip'); closeModal(); App.tut = null; tutPanel(); if (!App.st) render(); toast('Tutorial skipped. You can open it anytime with the ? button or from Settings.'); },
    tutNext: () => { const t = App.tut; if (!t) return; if (t.i >= t.steps.length - 1) { end(); toast('Tutorial complete. Good luck this season! ⚾', 'good'); return; } t.i++; go(); },
    tutPrev: () => { const t = App.tut; if (!t || !t.i) return; t.i--; go(); },
    tutEnd: () => end(),
  });
  document.addEventListener('keydown', e => {
    if (!App.tut || /INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
    if (e.key === 'ArrowRight') H.tutNext(); else if (e.key === 'ArrowLeft') H.tutPrev(); else if (e.key === 'Escape') end();
  });
  if (!App.st) render();
})();
