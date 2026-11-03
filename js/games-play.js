// מדליק – משחקים על המסך: אליאס בקבוצות, חידון, גלגל, תשבץ, צופן ושמונה נרות
window.GamesPlay = (function(){
'use strict';
const U = window.GamesPro.util, {esc, shuffle, lines, HEB, base, isHeb} = U;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TEAM_NAMES = ['הלביבות','הסופגניות','הסביבונים','הנרות','הפכים','המכבים'];
const TEAM_COLS = ['#ff6b6b','#ffd23f','#3ddc97','#4cc9f0','#a685e2','#ff8fab'];

/* ---------- צלילים, קונפטי, הודעה ---------- */
let ac = null, muted = false;
function beep(f, d, type, vol){
  if(muted) return;
  try{ ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.type = type || 'sine'; o.frequency.value = f || 880; g.gain.setValueAtTime(vol || .12, t); g.gain.exponentialRampToValueAtTime(.0001, t + (d || .1));
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + (d || .1) + .02); }catch(e){}
}
const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .18, 'triangle', .14), i*120));
function confetti(){
  if(reduce) return; const b = document.createElement('div'); b.className = 'gp-confetti';
  const cols = ['#ff6a00','#ffd23f','#2f80ed','#ec008c','#3ddc97','#ffffff'];
  b.innerHTML = Array.from({length:70}, (_, i) => `<i style="--x:${(Math.random()*100).toFixed(1)}vw;--d:${(1.6+Math.random()*1.6).toFixed(2)}s;--dl:${(Math.random()*.5).toFixed(2)}s;--c:${cols[i%cols.length]};--r:${Math.round(Math.random()*720-360)}deg"></i>`).join('');
  document.body.appendChild(b); setTimeout(() => b.remove(), 3800);
}
function toast(t){ const el = document.getElementById('toast'); if(!el) return; el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2600); }

/* ---------- חלון משחק על כל המסך ---------- */
function ov(cls){
  const el = document.createElement('div'); el.className = 'gp-ov ' + (cls || ''); el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="gp-bar"><button class="gp-mute" aria-pressed="${muted}">${muted ? 'צליל: כבוי' : 'צליל: פועל'}</button><button class="gp-x" aria-label="סגירת המשחק">× סגירה</button></div><div class="gp-body"></div>`;
  document.body.appendChild(el); document.body.classList.add('gp-lock');
  const T = [];
  const close = () => { T.forEach(t => { clearInterval(t); clearTimeout(t); }); cancelAnimationFrame(el._raf); el.remove(); document.body.classList.remove('gp-lock'); document.removeEventListener('keydown', key); };
  const key = e => { if(e.key === 'Escape'){ e.preventDefault(); close(); } else if(el.onkey) el.onkey(e); };
  document.addEventListener('keydown', key);
  el.querySelector('.gp-x').onclick = close;
  const mb = el.querySelector('.gp-mute'); mb.onclick = () => { muted = !muted; mb.setAttribute('aria-pressed', muted); mb.textContent = muted ? 'צליל: כבוי' : 'צליל: פועל'; };
  const o = {el, body:el.querySelector('.gp-body'), close, T};
  o.focus = () => { const f = o.body.querySelector('.gp-go, button, input'); if(f) f.focus({preventScroll:true}); };
  return o;
}
const seg = (key, vals, cur, label) => `<div class="gp-field"><span>${label}</span><div class="gp-seg" role="group" aria-label="${label}">${vals.map(v => `<button data-${key}="${v[0]}" aria-pressed="${String(v[0]) === String(cur)}">${v[1]}</button>`).join('')}</div></div>`;
const board = teams => `<div class="gp-board">${teams.map(t => `<div class="gp-b" style="--tc:${t.col}"><b>${esc(t.name)}</b><span>${t.score}</span></div>`).join('')}</div>`;
function teamsSetup(G, max){
  return seg('n', Array.from({length:max-1}, (_, i) => [i+2, String(i+2)]), G.n, 'כמה קבוצות?') +
    `<div class="gp-names">${Array.from({length:G.n}, (_, i) => `<label style="--tc:${TEAM_COLS[i]}"><i></i><input data-name="${i}" value="${esc(G.names[i])}" aria-label="שם קבוצה ${i+1}"></label>`).join('')}</div>`;
}
function podium(o, teams, again){
  const s = teams.slice().sort((a, b) => b.score - a.score);
  o.body.innerHTML = `<div class="gp-card gp-win"><p class="gp-kick">ניצחון!</p><h2>קבוצת <b style="color:${s[0].col}">${esc(s[0].name)}</b></h2>
    <div class="gp-pod">${s.slice(0, 3).map((t, i) => `<div class="p${i+1}" style="--tc:${t.col}"><b>${esc(t.name)}</b><span>${t.score}</span><i>${i+1}</i></div>`).join('')}</div>
    ${s.length > 3 ? board(s.slice(3)) : ''}<button class="gp-go" data-go="again">משחק חדש</button></div>`;
  confetti(); fanfare(); o.body.querySelector('[data-go=again]').onclick = again; o.focus();
}

/* ======================= אליאס בקבוצות ======================= */
function elias(words){
  if(words.length < 2) return toast('צריך לפחות 2 מילים');
  const o = ov('gp-elias');
  const G = {n:2, names:TEAM_NAMES.slice(), time:60, target:30, pen:true, teams:[], turn:0, deck:[], log:[], sec:0, round:1};
  const next = () => { if(!G.deck.length) G.deck = shuffle(words); return G.deck.pop(); };
  function setup(){
    o.body.innerHTML = `<div class="gp-card gp-setup"><p class="gp-kick">אליאס על המסך</p><h2>מכינות את המשחק</h2>
      ${teamsSetup(G, 4)}${seg('time', [[30,'30 שניות'],[60,'דקה'],[90,'דקה וחצי']], G.time, 'זמן לכל סבב')}${seg('target', [[20,'20'],[30,'30'],[50,'50']], G.target, 'משחקים עד')}
      <label class="gp-check"><input type="checkbox" id="gpPen" ${G.pen ? 'checked' : ''}> דילוג מוריד נקודה (כמו בכללים המקוריים)</label>
      <button class="gp-go" data-go="start">מתחילות ←</button>
      <button class="gp-link" data-go="rules">איך משחקים?</button></div>`;
    o.focus();
  }
  function ready(){
    const t = G.teams[G.turn];
    o.body.innerHTML = `<div class="gp-card gp-ready" style="--tc:${t.col}"><p class="gp-kick">סבב ${G.round}</p><h2>התור של <b>${esc(t.name)}</b></h2>
      <p>בחרו מסבירה. כשהיא מוכנה ומחזיקה את המסך מול עצמה, לוחצים.</p>${board(G.teams)}
      <button class="gp-go" data-go="count">${G.time === 60 ? 'מתחילים את הדקה' : 'מתחילים'} ←</button></div>`;
    o.focus();
  }
  function count(){
    let n = 3; const show = () => { o.body.innerHTML = `<div class="gp-count" aria-live="assertive"><b>${n}</b></div>`; beep(660, .12); };
    show(); const t = setInterval(() => { n--; if(n > 0) show(); else { clearInterval(t); beep(990, .2); round(); } }, 800); o.T.push(t);
  }
  function round(){
    const t = G.teams[G.turn]; G.log = []; G.sec = G.time; G.word = next();
    o.body.innerHTML = `<div class="gp-round" style="--tc:${t.col}">
      <div class="gp-top"><span class="gp-team">${esc(t.name)}</span>
        <div class="gp-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52"/></svg><b id="gpSec" aria-live="off">${G.sec}</b></div>
        <span class="gp-pts">בסבב: <b id="gpPts">0</b></span></div>
      <div class="gp-word" id="gpWord"><span>${esc(G.word)}</span></div>
      <div class="gp-acts"><button class="gp-ok" data-go="ok">✓ ניחשו <kbd>רווח</kbd></button><button class="gp-skip" data-go="skip">דילוג <kbd>S</kbd></button></div></div>`;
    const fg = o.body.querySelector('.gp-ring .fg'), C = 2*Math.PI*52; fg.style.strokeDasharray = C;
    const tick = () => { fg.style.strokeDashoffset = C * (1 - G.sec / G.time); const s = o.body.querySelector('#gpSec'); if(s) s.textContent = G.sec; o.body.querySelector('.gp-ring').classList.toggle('hurry', G.sec <= 5); };
    tick();
    const iv = setInterval(() => { G.sec--; if(G.sec <= 5 && G.sec > 0) beep(880, .07); tick(); if(G.sec <= 0){ clearInterval(iv); beep(196, .6, 'sawtooth', .1); lastWord(); } }, 1000); o.T.push(iv);
    o.body.querySelector('.gp-ok').focus({preventScroll:true});
  }
  const pts = () => G.log.filter(x => x.ok).length - (G.pen ? G.log.filter(x => !x.ok).length : 0);
  function mark(ok){
    G.log.push({w:G.word, ok}); beep(ok ? 1046 : 330, .09, ok ? 'triangle' : 'square', .08);
    G.word = next(); const w = o.body.querySelector('#gpWord'); if(!w) return;
    w.innerHTML = `<span class="${ok ? 'from-ok' : 'from-skip'}">${esc(G.word)}</span>`; o.body.querySelector('#gpPts').textContent = pts();
  }
  function lastWord(){
    o.body.innerHTML = `<div class="gp-card gp-last"><p class="gp-kick">נגמר הזמן!</p><h2>המילה האחרונה פתוחה לכולן</h2><div class="gp-word small"><span>${esc(G.word)}</span></div>
      <p>מי ניחשה אותה ראשונה?</p><div class="gp-seg wide">${G.teams.map((t, i) => `<button data-last="${i}" style="--tc:${t.col}">${esc(t.name)}</button>`).join('')}<button data-last="-1">אף אחת</button></div></div>`;
    o.focus();
  }
  function summary(){
    const t = G.teams[G.turn];
    o.body.innerHTML = `<div class="gp-card gp-sum" style="--tc:${t.col}"><p class="gp-kick">סיכום הסבב של ${esc(t.name)}</p><h2><b id="gpTot">${pts()}</b> נקודות</h2>
      <p class="hint">טעיתן בסימון? לחיצה על מילה מחליפה בין "ניחשו" ל"דילוג".</p>
      <div class="gp-logs">${G.log.map((x, i) => `<button class="gp-log ${x.ok ? 'ok' : 'no'}" data-log="${i}" aria-pressed="${x.ok}">${esc(x.w)} <i>${x.ok ? '✓' : '✕'}</i></button>`).join('') || '<p>לא היו מילים בסבב הזה.</p>'}</div>
      <button class="gp-go" data-go="apply">מוסיפים לניקוד וממשיכים ←</button></div>`;
    o.focus();
  }
  function apply(){
    G.teams[G.turn].score += pts();
    const win = G.teams.find(t => t.score >= G.target);
    if(win) return podium(o, G.teams, () => { G.teams.forEach(t => t.score = 0); G.turn = 0; G.round = 1; setup(); });
    G.turn = (G.turn + 1) % G.teams.length; if(G.turn === 0) G.round++; ready();
  }
  o.body.onclick = e => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.n){ G.n = +b.dataset.n; setup(); return; }
    if(b.dataset.time){ G.time = +b.dataset.time; setup(); return; }
    if(b.dataset.target){ G.target = +b.dataset.target; setup(); return; }
    if(b.dataset.log){ const x = G.log[+b.dataset.log]; x.ok = !x.ok; b.classList.toggle('ok', x.ok); b.classList.toggle('no', !x.ok); b.setAttribute('aria-pressed', x.ok); b.querySelector('i').textContent = x.ok ? '✓' : '✕'; o.body.querySelector('#gpTot').textContent = pts(); return; }
    if(b.dataset.last != null && b.dataset.last !== ''){ const i = +b.dataset.last; if(i >= 0){ G.teams[i].score++; beep(1046, .15, 'triangle'); } summary(); return; }
    const go = b.dataset.go;
    if(go === 'start'){ G.pen = o.body.querySelector('#gpPen').checked; G.teams = Array.from({length:G.n}, (_, i) => ({name:G.names[i] || TEAM_NAMES[i], col:TEAM_COLS[i], score:0})); G.turn = 0; G.round = 1; ready(); }
    else if(go === 'rules') window.GamesPro.showRules('elias');
    else if(go === 'count') count();
    else if(go === 'ok') mark(true);
    else if(go === 'skip') mark(false);
    else if(go === 'apply') apply();
  };
  o.body.oninput = e => { const i = e.target.dataset.name; if(i != null) G.names[+i] = e.target.value; };
  o.el.onkey = e => { if(!o.body.querySelector('.gp-round')) return;
    if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); mark(true); }
    else if(e.key === 's' || e.key === 'S' || e.key === 'ד'){ e.preventDefault(); mark(false); } };
  setup();
}

/* ======================= חידון טלוויזיה ======================= */
function quiz(qz, secs){
  if(!qz || !qz.length) return toast('צריך לפחות שאלה אחת');
  const o = ov('gp-quiz'); secs = +secs || 20;
  const Q = {n:3, names:TEAM_NAMES.slice(), teams:[], i:0};
  function setup(){ o.body.innerHTML = `<div class="gp-card gp-setup"><p class="gp-kick">חידון על המסך</p><h2>${qz.length} שאלות, מי תנצח?</h2>${teamsSetup(Q, 6)}<button class="gp-go" data-go="start">מתחילות ←</button><button class="gp-link" data-go="rules">איך משחקים?</button></div>`; o.focus(); }
  function question(){
    const q = qz[Q.i], last = Q.i === qz.length - 1;
    o.body.innerHTML = `<div class="qz-play"><div class="qz-head"><span>שאלה ${Q.i+1} מתוך ${qz.length}</span>${last && qz.length > 1 ? '<span class="qz-dbl">שאלת הכפל! ×2</span>' : ''}</div>
      <h2 class="qz-qt">${esc(q.q)}</h2><div class="qz-bar"><i style="animation-duration:${secs}s"></i></div>
      <div class="qz-tiles">${q.opts.map((x, k) => `<div class="qz-tile t${k}" style="--d:${k*.08}s"><b>${U.LETTER_NAMES[k]}</b><span>${esc(x)}</span></div>`).join('')}</div>
      <div class="qz-ctl"><button class="gp-go" data-go="reveal">חשיפת התשובה <kbd>רווח</kbd></button></div></div>`;
    let left = secs; const iv = setInterval(() => { left--; if(left <= 5 && left > 0) beep(880, .06); if(left <= 0){ clearInterval(iv); reveal(); } }, 1000); Q.iv = iv; o.T.push(iv);
    o.focus();
  }
  function reveal(){
    clearInterval(Q.iv); const p = o.body.querySelector('.qz-play'); if(!p || p.classList.contains('revealed')) return;
    const q = qz[Q.i]; p.classList.add('revealed'); p.querySelectorAll('.qz-tile').forEach((t, k) => t.classList.toggle('right', k === q.ans)); beep(784, .25, 'triangle');
    p.querySelector('.qz-ctl').innerHTML = `<div class="qz-who"><p>מי צדקה?</p>${Q.teams.map((t, k) => `<button data-team="${k}" aria-pressed="false" style="--tc:${t.col}">${esc(t.name)}</button>`).join('')}</div><button class="gp-go" data-go="score">עדכון הניקוד ←</button>`;
    o.focus();
  }
  function score(){
    const val = Q.i === qz.length - 1 && qz.length > 1 ? 200 : 100;
    o.body.querySelectorAll('[data-team][aria-pressed=true]').forEach(b => { Q.teams[+b.dataset.team].score += val; });
    const max = Math.max(100, ...Q.teams.map(t => t.score)), last = Q.i >= qz.length - 1;
    o.body.innerHTML = `<div class="gp-card gp-scores"><p class="gp-kick">טבלת הניקוד</p><div class="qz-bars">${Q.teams.slice().sort((a, b) => b.score - a.score).map(t => `<div class="qz-row" style="--tc:${t.col}"><b>${esc(t.name)}</b><span class="qz-track"><i style="--w:${(t.score/max*100).toFixed(1)}%"></i></span><em>${t.score}</em></div>`).join('')}</div>
      <button class="gp-go" data-go="${last ? 'end' : 'next'}">${last ? 'לתוצאות ←' : 'לשאלה הבאה ←'}</button></div>`;
    o.focus();
  }
  o.body.onclick = e => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.n){ Q.n = +b.dataset.n; setup(); return; }
    if(b.dataset.team != null){ const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); if(on) beep(1046, .07, 'triangle'); return; }
    const go = b.dataset.go;
    if(go === 'start'){ Q.teams = Array.from({length:Q.n}, (_, i) => ({name:Q.names[i] || TEAM_NAMES[i], col:TEAM_COLS[i], score:0})); Q.i = 0; question(); }
    else if(go === 'rules') window.GamesPro.showRules('quiz');
    else if(go === 'reveal') reveal();
    else if(go === 'score') score();
    else if(go === 'next'){ Q.i++; question(); }
    else if(go === 'end') podium(o, Q.teams, () => { Q.teams.forEach(t => t.score = 0); Q.i = 0; question(); });
  };
  o.body.oninput = e => { const i = e.target.dataset.name; if(i != null) Q.names[+i] = e.target.value; };
  o.el.onkey = e => { if(e.key === ' ' && o.body.querySelector('.qz-play:not(.revealed)')){ e.preventDefault(); reveal(); } };
  setup();
}

/* ======================= גלגל המזל ======================= */
function wheel(items, remove, title){
  if(!items.length) return toast('צריך לפחות פריט אחד בגלגל');
  const o = ov('gp-wheel'); let list = items.slice(), rot = 0, spinning = false, rm = !!remove; const hist = [];
  function draw(){
    o.body.innerHTML = `<div class="wh-play"><div class="wh-stage"><i class="wh-pointer" aria-hidden="true"></i><div class="wh-wrap" style="transform:rotate(${rot % 360}deg)">${U.wheelSVG(list, 'wh-big')}</div></div>
      <div class="wh-side"><p class="gp-kick">גלגל המזל</p><h2>${esc(title || 'מי זה יהיה?')}</h2>
        <button class="gp-go wh-spin" data-go="spin" ${list.length ? '' : 'disabled'}>סובבו! <kbd>רווח</kbd></button>
        <label class="gp-check"><input type="checkbox" id="whRm" ${rm ? 'checked' : ''}> להוציא מהגלגל אחרי בחירה</label>
        <h4>נבחרו עד עכשיו</h4><ol class="wh-hist">${hist.map(h => `<li>${esc(h)}</li>`).join('') || '<li class="muted">עוד לא סובבנו</li>'}</ol>
        ${list.length ? '' : '<p>הגלגל ריק! <button class="gp-link" data-go="refill">למלא מחדש</button></p>'}</div></div>`;
    rot = rot % 360; o.focus();
  }
  function spin(){
    if(spinning || !list.length) return; spinning = true;
    const n = list.length, a = 360 / n, i = Math.floor(Math.random() * n), jit = (Math.random() - .5) * a * .6;
    const target = ((360 - (i + .5) * a - jit) % 360 + 360) % 360, cur = ((rot % 360) + 360) % 360;
    let delta = target - cur; if(delta < 0) delta += 360; rot += 360 * 6 + delta;
    const w = o.body.querySelector('.wh-wrap'), ptr = o.body.querySelector('.wh-pointer'), btn = o.body.querySelector('.wh-spin');
    btn.disabled = true; w.style.transition = reduce ? 'transform .3s' : 'transform 5.4s cubic-bezier(.12,.72,.1,1)'; w.style.transform = `rotate(${rot}deg)`;
    let lastIdx = -1;
    const loop = () => { const m = getComputedStyle(w).transform; if(m && m !== 'none'){ const v = m.split('(')[1].split(')')[0].split(','); const ang = (Math.atan2(+v[1], +v[0]) * 180 / Math.PI + 360) % 360;
        const idx = Math.floor((((360 - ang) % 360) + 360) % 360 / a); if(idx !== lastIdx){ lastIdx = idx; beep(1500, .025, 'square', .04); ptr.classList.remove('bump'); void ptr.offsetWidth; ptr.classList.add('bump'); } }
      if(spinning) o.el._raf = requestAnimationFrame(loop); };
    o.el._raf = requestAnimationFrame(loop);
    w.addEventListener('transitionend', () => {
      spinning = false; const res = list[i]; hist.unshift(res); fanfare(); confetti();
      const pop = document.createElement('div'); pop.className = 'wh-result'; pop.setAttribute('role', 'alert');
      pop.innerHTML = `<div><p>הגלגל בחר:</p><h2>${esc(res)}</h2><button class="gp-go" data-go="again">עוד סיבוב ←</button></div>`;
      o.body.appendChild(pop); pop.querySelector('button').focus();
      rm = o.body.querySelector('#whRm').checked; if(rm) list.splice(i, 1);
    }, {once:true});
  }
  o.body.onclick = e => { const b = e.target.closest('button'); if(!b) return; const go = b.dataset.go;
    if(go === 'spin') spin(); else if(go === 'again') draw(); else if(go === 'refill'){ list = items.slice(); draw(); } };
  o.body.onchange = e => { if(e.target.id === 'whRm') rm = e.target.checked; };
  o.el.onkey = e => { if(e.key === ' '){ e.preventDefault(); const r = o.body.querySelector('.wh-result'); if(r) draw(); else spin(); } };
  draw();
}

/* ======================= תשבץ לפתרון על המסך ======================= */
function crossword(cw, title){
  if(!cw) return toast('צריך לפחות שתי מילים');
  const o = ov('gp-cw'); let dir = 0, cur = null;
  const {rows, cols, cells} = cw, all = cw.across.concat(cw.down);
  const cs = Math.max(26, Math.min(50, Math.floor(Math.min(innerWidth * (innerWidth > 900 ? .52 : .92), 680) / cols)));
  o.body.innerHTML = `<div class="cw-play"><div class="cw-board"><p class="gp-kick">${esc(title || 'תשבץ')}</p>
      <div class="cw-grid cw-live" style="--cols:${cols};--cs:${cs}px">${cells.map((row, r) => row.map((c, k) => c ? `<label class="cw-c" data-r="${r}" data-c="${k}">${c.num ? `<b>${c.num}</b>` : ''}<input maxlength="2" autocomplete="off" inputmode="text" aria-label="שורה ${r+1} טור ${k+1}"></label>` : '<div class="cw-x"></div>').join('')).join('')}</div>
      <div class="cw-btns"><button data-go="check">בדיקה</button><button data-go="reveal">גילוי הפתרון</button><button data-go="clear">ניקוי</button></div><p class="cw-msg" aria-live="polite"></p></div>
    <div class="cw-side">${['across','down'].map(k => `<div><h4>${k === 'across' ? 'מאוזן' : 'מאונך'}</h4><ol>${cw[k].map(x => `<li><button data-clue="${k}:${x.n}"><b>${x.n}.</b> ${esc(x.clue)} <i>(${x.len})</i></button></li>`).join('')}</ol></div>`).join('')}</div></div>`;
  const inp = (r, c) => o.body.querySelector(`.cw-c[data-r="${r}"][data-c="${c}"] input`);
  const wordAt = (r, c, d) => all.find(x => x.dir === d && (d === 0 ? x.r === r && c >= x.c && c < x.c + x.len : x.c === c && r >= x.r && r < x.r + x.len));
  function hl(){
    o.body.querySelectorAll('.cw-c').forEach(el => el.classList.remove('hl', 'cur'));
    o.body.querySelectorAll('[data-clue]').forEach(b => b.classList.remove('on'));
    if(!cur) return; let w = wordAt(cur.r, cur.c, dir); if(!w){ dir = 1 - dir; w = wordAt(cur.r, cur.c, dir); } if(!w) return;
    for(let i = 0; i < w.len; i++){ const el = inp(w.r + w.dir*i, w.c + (1-w.dir)*i); if(el) el.parentNode.classList.add('hl'); }
    const ce = inp(cur.r, cur.c); if(ce) ce.parentNode.classList.add('cur');
    const cb = o.body.querySelector(`[data-clue="${w.dir === 0 ? 'across' : 'down'}:${w.n}"]`); if(cb) cb.classList.add('on');
  }
  const move = (dr, dc) => { if(!cur) return; const n = inp(cur.r + dr, cur.c + dc); if(n) n.focus(); };
  function solved(){ return [...o.body.querySelectorAll('.cw-c')].every(el => base(el.querySelector('input').value) === cells[+el.dataset.r][+el.dataset.c].b); }
  o.body.addEventListener('focusin', e => { const l = e.target.closest('.cw-c'); if(!l) return; cur = {r:+l.dataset.r, c:+l.dataset.c}; hl(); });
  o.body.addEventListener('mousedown', e => { const l = e.target.closest('.cw-c'); if(l && cur && +l.dataset.r === cur.r && +l.dataset.c === cur.c){ dir = 1 - dir; setTimeout(hl, 0); } });
  o.body.addEventListener('input', e => { const t = e.target; if(!t.closest('.cw-c')) return; t.value = t.value.slice(-1); t.parentNode.classList.remove('wrong', 'right');
    if(t.value){ move(dir, 1 - dir); if(solved()){ o.body.querySelector('.cw-msg').textContent = 'כל הכבוד! התשבץ נפתר!'; confetti(); fanfare(); } } });
  o.body.addEventListener('keydown', e => { const t = e.target; if(!t.closest('.cw-c')) return;
    if(e.key === 'Backspace' && !t.value){ e.preventDefault(); move(-dir, -(1 - dir)); const p = document.activeElement; if(p && p.closest('.cw-c')) p.value = ''; }
    else if(e.key === 'ArrowLeft'){ e.preventDefault(); dir = 0; move(0, 1); } else if(e.key === 'ArrowRight'){ e.preventDefault(); dir = 0; move(0, -1); }
    else if(e.key === 'ArrowDown'){ e.preventDefault(); dir = 1; move(1, 0); } else if(e.key === 'ArrowUp'){ e.preventDefault(); dir = 1; move(-1, 0); } });
  o.body.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.clue){ const [k, n] = b.dataset.clue.split(':'), w = cw[k].find(x => x.n === +n); dir = w.dir; const el = inp(w.r, w.c); if(el) el.focus(); return; }
    const go = b.dataset.go, cellsEl = [...o.body.querySelectorAll('.cw-c')];
    if(go === 'check'){ let bad = 0; cellsEl.forEach(el => { const v = el.querySelector('input').value, ok = base(v) === cells[+el.dataset.r][+el.dataset.c].b; el.classList.toggle('wrong', !!v && !ok); el.classList.toggle('right', ok); if(!ok) bad++; });
      o.body.querySelector('.cw-msg').textContent = bad ? `עוד ${bad} משבצות לתקן או למלא` : 'מושלם!'; if(!bad){ confetti(); fanfare(); } }
    else if(go === 'reveal'){ cellsEl.forEach(el => { el.querySelector('input').value = cells[+el.dataset.r][+el.dataset.c].ch; el.classList.remove('wrong'); }); }
    else if(go === 'clear'){ cellsEl.forEach(el => { el.querySelector('input').value = ''; el.classList.remove('wrong', 'right'); }); }
  });
  const first = inp(cw.across[0] ? cw.across[0].r : cw.down[0].r, cw.across[0] ? cw.across[0].c : cw.down[0].c); if(first) setTimeout(() => first.focus(), 80);
}

/* ======================= צופן לפענוח על המסך ======================= */
function cipher(cp, title){
  if(!cp || !cp.tokens.some(t => t.b)) return toast('צריך הודעה בעברית');
  const o = ov('gp-cp'); const words = U.cipherWords(cp);
  o.body.innerHTML = `<div class="cp-play"><p class="gp-kick">${esc(title || 'הצופן הסודי')}</p><h2>מפענחות את ההודעה</h2>
    ${cp.kind === 'crypto' ? U.cipherKeyHTML(cp) : `<details class="cp-keybox" open><summary>מפתח הצופן</summary>${U.cipherKeyHTML(cp)}</details>`}
    <div class="cp-msg cp-live">${words.map(w => `<span class="cp-w">${w.map(t => t.b ? `<label class="cp-l" data-code="${esc(t.code)}" data-b="${t.b}" data-ch="${esc(t.ch)}"><i>${esc(t.code)}</i><input maxlength="2" autocomplete="off" ${cp.hints.includes(t.b) ? `readonly value="${esc(t.ch)}"` : ''} aria-label="האות שמסתתרת מאחורי ${esc(t.code)}"></label>` : `<span class="cp-p">${esc(t.sp)}</span>`).join('')}</span>`).join('')}</div>
    <div class="cw-btns"><button data-go="check">בדיקה</button><button data-go="hint">עוד רמז</button><button data-go="reveal">גילוי הפתרון</button></div><p class="cw-msg" aria-live="polite"></p></div>`;
  const labels = [...o.body.querySelectorAll('.cp-l')];
  const fill = (code, v) => labels.filter(l => l.dataset.code === code).forEach(l => { const inp = l.querySelector('input'); if(inp.readOnly) return; inp.value = v && base(v) === l.dataset.b ? l.dataset.ch : v; l.classList.remove('wrong'); });
  const solved = () => labels.every(l => base(l.querySelector('input').value) === l.dataset.b);
  const done = () => { o.body.querySelector('.cw-msg').textContent = 'פוענח! ההודעה: ' + cp.tokens.map(t => t.b ? t.ch : t.sp).join(''); confetti(); fanfare(); };
  o.body.addEventListener('input', e => { const t = e.target, l = t.closest('.cp-l'); if(!l) return; const v = t.value.slice(-1); fill(l.dataset.code, isHeb(v) ? v : '');
    if(v){ const nx = labels.slice(labels.indexOf(l) + 1).find(x => !x.querySelector('input').value); if(nx) nx.querySelector('input').focus(); }
    if(solved()) done(); });
  o.body.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; const go = b.dataset.go;
    if(go === 'check'){ let bad = 0; labels.forEach(l => { const v = l.querySelector('input').value, ok = base(v) === l.dataset.b; l.classList.toggle('wrong', !!v && !ok); if(!ok) bad++; }); o.body.querySelector('.cw-msg').textContent = bad ? `עוד ${bad} אותיות` : ''; if(!bad) done(); }
    else if(go === 'hint'){ const miss = labels.filter(l => base(l.querySelector('input').value) !== l.dataset.b); if(!miss.length) return; const l = miss[Math.floor(Math.random()*miss.length)]; fill(l.dataset.code, l.dataset.b); labels.filter(x => x.dataset.code === l.dataset.code).forEach(x => x.classList.add('hinted')); if(solved()) done(); }
    else if(go === 'reveal'){ labels.forEach(l => { l.querySelector('input').value = l.dataset.ch; }); done(); } });
  const f = labels.find(l => !l.querySelector('input').readOnly); if(f) setTimeout(() => f.querySelector('input').focus(), 80);
}

/* ======================= שמונה נרות ======================= */
function candles(entries, title){
  if(!entries.length) return toast('צריך לפחות מילה אחת');
  const o = ov('gp-cd'); let order = shuffle(entries), idx = 0, wins = 0, played = 0, guessed, wrong, done;
  const cur = () => order[idx % order.length];
  const inWord = ch => cur().L.some(x => base(x) === ch);
  function start(){
    guessed = new Set(); wrong = 0; done = false; const e = cur();
    o.body.innerHTML = `<div class="cd-play"><div class="cd-top"><span>${esc(title || 'שמונה נרות')} · מילה ${played + 1}</span><span>ניצחונות: <b>${wins}</b> מתוך ${played}</span></div>
      ${U.menorahHTML()}
      <div class="cd-word" aria-live="polite">${[...e.w].map(ch => (isHeb(ch) || /[A-Za-z0-9]/.test(ch)) ? `<span class="cd-l" data-b="${base(ch)}" data-ch="${esc(ch)}"></span>` : ch === ' ' ? '<span class="cd-gap"></span>' : `<span class="cd-p">${esc(ch)}</span>`).join('')}</div>
      ${e.hint ? `<button class="cd-hint" data-go="hint">רמז</button><p class="cd-hint-t" hidden>${esc(e.hint)}</p>` : ''}
      <div class="cd-kb" role="group" aria-label="מקלדת אותיות">${HEB.map(ch => `<button data-k="${ch}" aria-label="האות ${ch}">${ch}</button>`).join('')}</div>
      <form class="cd-guess"><input placeholder="יודעות את כל המילה?" aria-label="ניחוש כל המילה"><button class="gp-link">ניחוש</button></form>
      <p class="cd-msg" aria-live="assertive"></p><div class="cd-next"></div></div>`;
    setCandles(); o.body.querySelector('.cd-kb button').focus({preventScroll:true});
  }
  function setCandles(){ o.body.querySelectorAll('.cd-men .candle').forEach(c => { const i = +c.dataset.i; c.classList.toggle('lit', i === 0 || i <= 8 - wrong); }); }
  function reveal(all){ o.body.querySelectorAll('.cd-l').forEach(s => { if(all || guessed.has(s.dataset.b)){ if(!s.textContent){ s.textContent = s.dataset.ch; s.classList.add(guessed.has(s.dataset.b) ? 'on' : 'lost'); } } }); }
  const isWon = () => cur().L.every(x => guessed.has(base(x)));
  function guess(ch){
    if(done || guessed.has(ch)) return; guessed.add(ch);
    const b = o.body.querySelector(`.cd-kb [data-k="${ch}"]`), hit = inWord(ch);
    if(b){ b.disabled = true; b.classList.add(hit ? 'hit' : 'miss'); }
    if(hit){ beep(1046, .1, 'triangle'); reveal(false); if(isWon()) win(); }
    else { wrong++; beep(196, .25, 'sawtooth', .08); setCandles(); const m = o.body.querySelector('.cd-men'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
      if(wrong >= 8) lose(); else o.body.querySelector('.cd-msg').textContent = `אוי! נשארו ${8 - wrong} נרות דולקים`; }
  }
  function win(){ done = true; wins++; played++; reveal(true); const cs = [...o.body.querySelectorAll('.cd-men .candle')];
    cs.forEach((c, k) => setTimeout(() => c.classList.add('lit'), k * 110)); o.body.querySelector('.cd-msg').textContent = 'כל הכבוד! החנוכייה דולקת!'; confetti(); fanfare(); nextBtn(); }
  function lose(){ done = true; played++; reveal(true); o.body.querySelector('.cd-msg').textContent = 'הנרות כבו... המילה הייתה: ' + cur().w; nextBtn(); }
  function nextBtn(){ const n = o.body.querySelector('.cd-next'); n.innerHTML = '<button class="gp-go" data-go="next">למילה הבאה ←</button>'; n.querySelector('button').focus(); }
  o.body.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.k){ guess(b.dataset.k); return; }
    if(b.dataset.go === 'hint'){ const t = o.body.querySelector('.cd-hint-t'); t.hidden = false; b.remove(); }
    if(b.dataset.go === 'next'){ idx++; if(idx % order.length === 0) order = shuffle(entries); start(); } });
  o.body.addEventListener('submit', e => { e.preventDefault(); const v = e.target.querySelector('input').value.replace(/\s/g, ''), w = cur().L.join('');
    if(!v || done) return; if([...v].map(base).join('') === [...w].map(base).join('')){ cur().L.forEach(x => guessed.add(base(x))); win(); }
    else { wrong = Math.min(8, wrong + 1); setCandles(); beep(196, .25, 'sawtooth', .08); if(wrong >= 8) lose(); else o.body.querySelector('.cd-msg').textContent = `לא זאת המילה. נשארו ${8 - wrong} נרות`; e.target.reset(); } });
  o.el.onkey = e => { if(e.target.tagName === 'INPUT') return; const k = e.key; if(isHeb(k)){ e.preventDefault(); guess(base(k)); } };
  start();
}

/* ---------- הפעלה לפי סוג ---------- */
function start(type, s, cache){
  cache = cache || {};
  if(type === 'elias') return elias(lines(s.words));
  if(type === 'quiz'){ if(!cache.qz || cache.key !== s.words){ cache.key = s.words; cache.qz = U.buildQuiz(s.words); } return quiz(cache.qz, s.secs); }
  if(type === 'wheel') return wheel(lines(s.words), s.remove === true || s.remove === 'on', s.title);
  if(type === 'crossword'){ if(!cache.cw || cache.key !== s.words){ cache.key = s.words; cache.cw = U.buildCrossword(s.words); } return crossword(cache.cw, s.title); }
  if(type === 'cipher'){ const k = (s.msg||'') + '|' + s.kind + '|' + s.hints; if(!cache.cp || cache.key !== k){ cache.key = k; cache.cp = U.buildCipher(s); } return cipher(cache.cp, s.title); }
  if(type === 'candles') return candles(U.candleEntries(s.words), s.title);
}
return {start, elias, quiz, wheel, crossword, cipher, candles, confetti, _:{ov, beep, fanfare, confetti, toast, seg, board, teamsSetup, podium, TEAM_NAMES, TEAM_COLS}};
})();
