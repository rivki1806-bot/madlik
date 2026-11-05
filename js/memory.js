// מדליק – משחק זיכרון חנוכה על המסך: קלפים מתהפכים, צלילים, חנוכייה שנדלקת, שחקן אחד או קבוצות
window.MemoryGame = (function(){
'use strict';
const P = window.GamesPlay._, U = window.GamesPro.util, {esc, shuffle} = U;
const beep = P.beep;

const SYMBOLS = [
  ['🕎','חנוכייה'], ['🍩','סופגנייה'], ['🕯️','נר'], ['🎁','מתנה'], ['🫒','זית'], ['🪙','דמי חנוכה'],
  ['🍎','תפוח עץ'], ['🔥','להבה'], ['🥔','תפוח אדמה'], ['🍳','מחבת'], ['🛡️','מגן המכבים'], ['🏺','פך שמן'],
  ['🎶','שירי חנוכה'], ['💧','טיפת שמן'], ['🍯','ריבה'], ['🪔','מנורת שמן'], ['👑','יהודה המכבי'], ['🌙','ליל חנוכה']
];
const WORDS = ['סביבון','לביבה','סופגנייה','חנוכייה','שמש','פך שמן','מכבים','נס גדול','דמי חנוכה','ריבה','מחבת','גפרור','להבה','מתתיהו','בית המקדש','שמונה נרות','אבקת סוכר','יהודה המכבי'];
const SIZES = {small:[6,'קטן'], big:[12,'גדול']};
const BEST = 'madlik_memory_best';

/* צלילים */
const sfx = {
  flip: () => beep(620 + Math.random()*80, .05, 'triangle', .08),
  match: streak => { const b = 520 * Math.pow(1.06, Math.min(streak, 8)); [b, b*1.26, b*1.5].forEach((f, i) => setTimeout(() => beep(f, .16, 'sine', .13), i*70)); },
  miss: () => { beep(220, .16, 'sawtooth', .05); setTimeout(() => beep(185, .2, 'sawtooth', .05), 110); },
  peek: () => [880, 990, 880].forEach((f, i) => setTimeout(() => beep(f, .08, 'sine', .07), i*90)),
  tick: () => beep(1200, .03, 'square', .03),
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, i === 6 ? .5 : .16, 'triangle', .14), i*130))
};

function play(customWords){
  const custom = (customWords || []).filter(Boolean);
  const o = P.ov('gp-memory');
  const G = {cat:'pics', size:'small', mode:1, n:2, names:P.TEAM_NAMES.slice(), preview:true};
  let best = {}; try{ best = JSON.parse(localStorage.getItem(BEST) || '{}'); }catch(e){}

  /* ---------- הגדרות ---------- */
  function setup(){
    const sz = Object.entries(SIZES).map(([k, v]) => [k, `${v[1]} · ${v[0]} זוגות (${v[0]*2} קלפים)`]);
    o.body.innerHTML = `<div class="gp-card mm-setup"><p class="gp-kick">משחק זיכרון חנוכה</p><h2>מוצאים <b>זוגות</b>, ומדליקים את החנוכייה</h2>
      <div class="gp-field"><span>איזה משחק זיכרון?</span><div class="mm-decks">
        <button data-cat="pics" aria-pressed="${G.cat==='pics'}"><b>🕎 🍩 🕯️</b><span>זיכרון תמונות</span><small>סמלי חנוכה צבעוניים</small></button>
        <button data-cat="words" aria-pressed="${G.cat==='words'}"><b>סביבון</b><span>זיכרון מילים</span><small>${custom.length ? 'המילים שכתבתם בטופס' : 'מילים של חנוכה'}</small></button>
      </div></div>
      ${P.seg('size', sz, G.size, 'גודל המשחק')}
      ${P.seg('mode', [[1,'שחקן אחד'],[2,'קבוצות בתורות']], G.mode, 'איך משחקים?')}
      ${G.mode == 2 ? P.teamsSetup(G, 4) : ''}
      <label class="gp-check"><input type="checkbox" id="mmPrev" ${G.preview?'checked':''}> הצצה של 3 שניות לכל הקלפים לפני שמתחילים</label>
      <button class="gp-go" data-go="start">מתחילים לשחק ←</button>
      <p class="mm-rules">הופכים שני קלפים. זוג? הוא נשאר פתוח ונדלק נר. לא זוג? הקלפים חוזרים. ${G.mode==2?'קבוצה שמצאה זוג ממשיכה לשחק.':'נסו לסיים בכמה שפחות מהלכים.'}</p></div>`;
    o.body.onclick = e => {
      const b = e.target.closest('button'); if(!b) return;
      if(b.dataset.cat){ G.cat = b.dataset.cat; sfx.flip(); return setup(); }
      if(b.dataset.size){ G.size = b.dataset.size; sfx.flip(); return setup(); }
      if(b.dataset.mode){ G.mode = +b.dataset.mode; sfx.flip(); return setup(); }
      if(b.dataset.n){ G.n = +b.dataset.n; return setup(); }
      if(b.dataset.go === 'start'){ G.preview = o.body.querySelector('#mmPrev').checked; start(); }
    };
    o.body.oninput = e => { if(e.target.dataset.name) G.names[e.target.dataset.name] = e.target.value; };
    o.el.onkey = null; o.focus();
  }

  /* ---------- בניית החפיסה ---------- */
  function buildDeck(pairs){
    // מילים: קודם המילים מהטופס, ואם אין מספיק משלימים ממילות חנוכה
    const pool = G.cat === 'words'
      ? [...new Set(shuffle(custom).concat(shuffle(WORDS)))].slice(0, pairs).map(w => ['', w])
      : shuffle(SYMBOLS).slice(0, pairs);
    return shuffle(pool.flatMap((s, i) => [{i, ico:s[0], t:s[1]}, {i, ico:s[0], t:s[1]}]));
  }

  /* ---------- המשחק ---------- */
  let S;
  function start(){
    const pairs = SIZES[G.size][0];
    const teams = G.mode == 2 ? Array.from({length:G.n}, (_, i) => ({name:G.names[i] || P.TEAM_NAMES[i], col:P.TEAM_COLS[i], score:0})) : null;
    S = {pairs, deck:buildDeck(pairs), open:[], found:0, moves:0, streak:0, bestStreak:0, t0:0, sec:0, lock:true, teams, turn:0, peeks:G.mode==1 ? 1 : 0};
    o.body.innerHTML = `<div class="mm-play">
      <div class="mm-top">
        ${teams ? `<div class="mm-teams">${teams.map((t, i) => `<div class="mm-team" data-t="${i}" style="--tc:${t.col}"><b>${esc(t.name)}</b><span>0</span></div>`).join('')}</div>`
          : `<div class="mm-stats"><span>מהלכים <b id="mmMoves">0</b></span><span>זמן <b id="mmTime">0:00</b></span><span>זוגות <b id="mmFound">0/${pairs}</b></span></div>`}
        <div class="mm-men">${menorah()}</div>
        ${G.mode==1 ? `<button class="mm-peek" id="mmPeek">👀 הצצה (${S.peeks})</button>` : '<div></div>'}
      </div>
      <p class="mm-msg" id="mmMsg" aria-live="polite">${G.preview ? 'מסתכלים טוב... 3 שניות!' : (teams ? `התור של ${esc(teams[0].name)}` : 'בהצלחה!')}</p>
      <div class="mm-grid">${S.deck.map((c, k) => `<button class="mm-card${c.ico?'':' txt'}" data-k="${k}" aria-label="קלף ${k+1}, הפוך"><span class="mm-in"><span class="mm-back" aria-hidden="true"><i>מדליק</i></span><span class="mm-front">${c.ico ? `<b>${c.ico}</b>` : ''}<em>${esc(c.t)}</em></span></span></button>`).join('')}</div>
    </div>`;
    light(0);
    const cards = [...o.body.querySelectorAll('.mm-card')];
    fit(); const onR = () => fit(); addEventListener('resize', onR); o.T.push(setInterval(() => { if(!o.el.isConnected) removeEventListener('resize', onR); }, 2000));
    if(teams) markTurn();
    const go = () => { S.lock = false; S.t0 = Date.now(); if(!teams) o.T.push(setInterval(clock, 1000)); msg(teams ? `התור של ${esc(teams[S.turn].name)}` : 'בהצלחה!'); };
    if(G.preview){ cards.forEach((c, i) => setTimeout(() => { c.classList.add('open'); if(i % 3 === 0) sfx.flip(); }, i*35)); o.T.push(setTimeout(() => { cards.forEach(c => c.classList.remove('open')); sfx.peek(); go(); }, 3000 + cards.length*35)); }
    else go();
    o.body.onclick = e => {
      if(e.target.closest('#mmPeek')) return peek(cards);
      const c = e.target.closest('.mm-card'); if(c) flip(c, cards);
    };
    o.el.onkey = null;
  }

  function flip(c, cards){
    if(S.lock || c.classList.contains('open') || c.classList.contains('done')) return;
    c.classList.add('open'); c.setAttribute('aria-label', S.deck[c.dataset.k].t); sfx.flip(); S.open.push(c);
    if(S.open.length < 2) return;
    S.moves++; S.lock = true; const [a, b] = S.open;
    const mv = o.body.querySelector('#mmMoves'); if(mv) mv.textContent = S.moves;
    if(S.deck[a.dataset.k].i === S.deck[b.dataset.k].i){
      S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); S.found++;
      setTimeout(() => {
        a.classList.add('done'); b.classList.add('done'); sfx.match(S.streak);
        if(S.teams){ S.teams[S.turn].score++; const el = o.body.querySelector(`.mm-team[data-t="${S.turn}"] span`); el.textContent = S.teams[S.turn].score; bump(el.parentNode); }
        const f = o.body.querySelector('#mmFound'); if(f){ f.textContent = `${S.found}/${S.pairs}`; bump(f.parentNode); }
        light(S.found); msg(S.streak > 1 ? `רצף של ${S.streak}! 🔥 ${esc(S.deck[a.dataset.k].t)}` : `זוג! ${esc(S.deck[a.dataset.k].t)}` + (S.teams ? ' · ממשיכים' : ''));
        S.open = []; S.lock = false;
        if(S.found === S.pairs) setTimeout(win, 700);
      }, 300);
    } else {
      S.streak = 0;
      setTimeout(() => { a.classList.add('nope'); b.classList.add('nope'); sfx.miss(); }, 350);
      setTimeout(() => {
        a.classList.remove('open', 'nope'); b.classList.remove('open', 'nope'); a.setAttribute('aria-label', 'קלף, הפוך'); b.setAttribute('aria-label', 'קלף, הפוך');
        S.open = []; S.lock = false;
        if(S.teams){ S.turn = (S.turn + 1) % S.teams.length; markTurn(); msg(`התור של ${esc(S.teams[S.turn].name)}`); } else msg('לא זוג. נסו שוב!');
      }, 1150);
    }
  }

  function peek(cards){
    if(S.lock || !S.peeks) return; S.peeks--; S.lock = true; sfx.peek();
    const b = o.body.querySelector('#mmPeek'); b.textContent = `👀 הצצה (${S.peeks})`; b.disabled = !S.peeks;
    const hidden = cards.filter(c => !c.classList.contains('open')); hidden.forEach(c => c.classList.add('open'));
    o.T.push(setTimeout(() => { hidden.forEach(c => c.classList.remove('open')); S.lock = false; }, 1500));
  }

  // בוחרת כמה עמודות, כך שהקלפים יהיו הכי גדולים שאפשר ועדיין ייכנסו במסך בלי גלילה
  function fit(){
    const g = o.body.querySelector('.mm-grid'); if(!g) return;
    const N = S.deck.length, gap = innerWidth < 700 ? 6 : 12, W = o.body.clientWidth - 36;
    const used = o.el.querySelector('.gp-bar').offsetHeight + o.body.querySelector('.mm-top').offsetHeight + o.body.querySelector('.mm-msg').offsetHeight + 24 + 70;
    const H = Math.max(260, innerHeight - used);
    let bestC = 4, bestW = 0;
    for(let c = 3; c <= 10; c++){ const r = Math.ceil(N / c), w = Math.min((W - gap*(c-1)) / c, ((H - gap*(r-1)) / r) * .75); if(w > bestW){ bestW = w; bestC = c; } }
    g.style.gridTemplateColumns = `repeat(${bestC}, ${Math.floor(bestW)}px)`; g.style.gap = gap + 'px'; g.style.width = 'auto';
  }
  // הציון קופץ לשנייה: מתנפח, זוהר, נפתחים ניצוצות ועולה "+1"
  function bump(el){
    if(!el) return;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    el.querySelectorAll('.mm-plus,.mm-burst').forEach(n => n.remove());
    el.insertAdjacentHTML('beforeend', '<i class="mm-plus">+1</i><span class="mm-burst" aria-hidden="true">' + Array.from({length:10}, (_, i) => '<b style="--a:' + (i * 36) + 'deg">●</b>').join('') + '</span>');
    sfx.tick();
    o.T.push(setTimeout(() => { el.classList.remove('bump'); el.querySelectorAll('.mm-plus,.mm-burst').forEach(n => n.remove()); }, 1200));
  }
  const msg = t => { const m = o.body.querySelector('#mmMsg'); if(m){ m.innerHTML = t; m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop'); } };
  const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2, '0')}`;
  function clock(){ S.sec = Math.round((Date.now() - S.t0) / 1000); const t = o.body.querySelector('#mmTime'); if(t) t.textContent = fmt(S.sec); }
  function markTurn(){ o.body.querySelectorAll('.mm-team').forEach((el, i) => el.classList.toggle('on', i === S.turn)); }
  function menorah(){ const fx = window.MadlikFX; return fx ? fx.menorah({scroll:true}) : ''; }
  // שמש נדלק בהתחלה, ושאר הנרות לפי כמה זוגות נמצאו
  function light(found){
    const n = Math.round(found / S.pairs * 8);
    o.body.querySelectorAll('.mm-men .candle').forEach(c => { const i = +c.dataset.i; const on = i === 0 || i <= n; if(on && !c.classList.contains('lit') && i) { c.classList.add('just'); setTimeout(() => c.classList.remove('just'), 700); } c.classList.toggle('lit', on); });
  }

  function win(){
    clearInterval(o.T[o.T.length - 1]); clock(); sfx.win(); P.confetti();
    if(S.teams) return setTimeout(() => P.podium(o, S.teams, setup), 900);
    const ratio = S.moves / S.pairs, stars = ratio <= 1.6 ? 3 : ratio <= 2.3 ? 2 : 1;
    const key = G.cat + '_' + G.size, prev = best[key], isBest = !prev || S.moves < prev.moves || (S.moves === prev.moves && S.sec < prev.sec);
    if(isBest){ best[key] = {moves:S.moves, sec:S.sec}; try{ localStorage.setItem(BEST, JSON.stringify(best)); }catch(e){} }
    setTimeout(() => {
      o.body.innerHTML = `<div class="gp-card mm-win"><p class="gp-kick">כל הנרות דולקים!</p><h2>כל הכבוד! <b>חג אורים שמח</b></h2>
        <div class="mm-stars" aria-label="${stars} להבות">${[1,2,3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="--d:${i*.18}s">🔥</span>`).join('')}</div>
        <div class="gp-board"><div class="gp-b" style="--tc:#ffd23f"><b>מהלכים</b><span>${S.moves}</span></div><div class="gp-b" style="--tc:#4cc9f0"><b>זמן</b><span>${fmt(S.sec)}</span></div><div class="gp-b" style="--tc:#3ddc97"><b>רצף הכי ארוך</b><span>${S.bestStreak}</span></div></div>
        <p>${isBest ? '🏆 שיא חדש ברמה הזאת!' : `השיא שלך ברמה הזאת: ${prev.moves} מהלכים, ${fmt(prev.sec)}`}</p>
        <button class="gp-go" data-go="again">עוד משחק ←</button> <button class="gp-link" data-go="setup">לשנות הגדרות</button></div>`;
      o.body.onclick = e => { const g = e.target.closest('[data-go]'); if(!g) return; g.dataset.go === 'again' ? start() : setup(); };
      o.focus();
    }, 900);
  }

  setup();
}

/* חיבור: הכפתור "לשחק על המסך" בדף יצירת משחק זיכרון */
const G = window.GamesPro;
if(G.PLAYABLE.indexOf('memory') < 0) G.PLAYABLE.push('memory');
G.RULES.memory = {title:'איך משחקים זיכרון חנוכה?', intro:'משחק זיכרון על המסך, עם צלילים וחנוכייה שנדלקת עם כל זוג שמוצאים.',
  need:['מסך, טאבלט או מחשב','שחקן אחד, או 2 עד 4 קבוצות'],
  steps:['בוחרים משחק: זיכרון תמונות (סמלי חנוכה) או זיכרון מילים (המילים שכתבתם בטופס, או מילים של חנוכה).','בוחרים גודל: קטן עם 6 זוגות, או גדול עם 12 זוגות.','אפשר להציץ 3 שניות בכל הקלפים לפני שמתחילים.','בכל תור הופכים שני קלפים. אם הם זוג, הם נשארים פתוחים ונדלק עוד נר בחנוכייה.','אם הם לא זוג, הם מתהפכים בחזרה. בקבוצות, התור עובר לקבוצה הבאה.'],
  ok:['לזכור איפה כל קלף','לעזור לחברים בקבוצה'],
  no:['לגעת בקלפים בזמן שהם מתהפכים','לצלם את המסך 😉'],
  score:['שחקן אחד: כמה שפחות מהלכים, עד 3 להבות ושיא אישי','קבוצות: כל זוג שווה נקודה, וקבוצה שמצאה זוג ממשיכה'],
  tip:'יש כפתור "הצצה" אחד לכל משחק (לשחקן אחד). רצף של זוגות מעלה את הצליל!',
  promo:{title:'משחק זיכרון מותאם אישית, עם המילים שלכם!', text:'כותבים בטופס בדף הזה שמות, מקומות או מילים של המשפחה, ובוחרים: להדפיס קלפים מעוצבים, או לשחק אינטרקטיבי על המסך.'}};
const s0 = window.GamesPlay.start;
window.GamesPlay.start = (type, s, cache) => type === 'memory' ? play(U.lines(s.words)) : s0(type, s, cache);

return {play, SYMBOLS};
})();
