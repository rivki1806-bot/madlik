// מדליק – קרב המילים: 6 סוגי אתגרים במשחק אחד, מאגר מוכן או אישי, בלי בינה מלאכותית
window.WordBattle = (function(){
'use strict';
const P = window.GamesPlay._, U = window.GamesPro.util, {esc, shuffle} = U;

/* ---------- המאגר המוכן: מילה | מילים אסורות לטאבו ---------- */
const RAW = {
  easy: ['סביבון|לסובב,משחק,אותיות,נס','לביבה|תפוח אדמה,לטגן,שמן,מחבת','סופגנייה|ריבה,אבקת סוכר,לטגן,בצק','חנוכייה|נרות,להדליק,שמונה,שמש','נר|אש,להדליק,פתילה,שעווה',
    'מתנה|עטיפה,לקבל,יום הולדת,הפתעה','שוקולד|מתוק,קקאו,ממתק,חום','גפרור|אש,להדליק,קופסה,ראש','שמש|נר,חנוכייה,להדליק,חם','אור|חושך,מנורה,להדליק,אש','חלון|זכוכית,בית,לפתוח,וילון',
    'ריבה|תות,מתוק,למרוח,צנצנת','מחבת|לטגן,מטבח,שמן,ביצה','שמן|זית,לטגן,פך,נוזל','מטבע|כסף,שקל,עגול,זהב','בלון|אוויר,לנפח,צבעוני,לפוצץ','עוגה|יום הולדת,נרות,קצפת,לאפות',
    'פנס|אור,לילה,להאיר,סוללה','שיר|לשיר,מילים,לחן,זמרת','ממתק|סוכר,מתוק,ילדים,סוכרייה','כובע|ראש,לחבוש,שמש,צמר','מטרייה|גשם,לפתוח,רטוב,חורף'],
  medium: ['מכבים|יהודה,יוונים,מלחמה,גיבורים','פך שמן|נס,מקדש,טהור,שמונה','בית המקדש|ירושלים,כהן,קדוש,חורבן','דמי חנוכה|כסף,מטבעות,ילדים,לקבל','פרסומי ניסא|חלון,להראות,נס,לפרסם',
    'אנטיוכוס|יווני,מלך,רשע,מכבים','מתתיהו|כהן,מכבים,אבא,מודיעין','אבקת סוכר|לבן,לפזר,מתוק,סופגנייה','פתילה|נר,להדליק,חוט,שמן','מסיבה|ריקודים,מוזיקה,חברים,חגיגה',
    'מגש|להגיש,אוכל,אירוח,כלי','הפתעה|לא יודעים,מתנה,לגלות,פתאום','סבתא|אמא,נכדים,עוגיות,זקנה','מטבח|לבשל,כיריים,מקרר,אוכל','פנס|אור,חושך,סוללה,להאיר','שלג|קר,לבן,חורף,לרדת',
    'מקרר|קר,מטבח,אוכל,מקפיא','צלחת|אוכל,עגולה,לשבור,סכו״ם','שולחן|רגליים,לאכול,כיסא,מפה','מוזיקה|לשמוע,שיר,רמקול,לרקוד'],
  hard: ['מעוז צור|שיר,להדליק,ישועתי,לשיר','נס גדול היה פה|סביבון,אותיות,ארץ,שם','חשמונאים|מכבים,מלכות,משפחה,כהנים','מודיעין|עיר,מתתיהו,מכבים,מקום','על הניסים|תפילה,להוסיף,חנוכה,פורים',
    'יהודית|גיבורה,גבינה,אישה,סיפור','כסלו|חודש,חנוכה,חורף,טבת','מנהג|מסורת,לעשות,משפחה,תמיד','גבורה|גיבור,אומץ,לנצח,חזק','נוסטלגיה|זיכרון,פעם,געגוע,ילדות',
    'אירוח|אורחים,לארח,כיבוד,בית','הגרלה|פרס,כרטיס,מזל,לזכות','מסורת|דורות,משפחה,מנהג,ישן','טהרה|נקי,טומאה,מקדש,כשר','הלל|תפילה,לשבח,חג,לשיר']
};
const LEVEL = {easy:'קל', medium:'בינוני', hard:'מאתגר'};
const BANK = []; Object.entries(RAW).forEach(([lvl, arr]) => arr.forEach(s => { const [w, t] = s.split('|'); BANK.push({w, taboo:(t||'').split(',').map(x => x.trim()).filter(Boolean), lvl}); }));
const LINKS = [['שמש','פתילה','גפרור','הדלקת נרות'],['ריבה','אבקת סוכר','בצק','סופגנייה'],['יהודה','יוחנן','שמעון','בני מתתיהו'],['תפוח אדמה','בצל','מחבת','לביבות'],
  ['שמונה','כסלו','נס','חנוכה'],['זית','מנורה','פך','שמן'],['מעיל','גשם','מטרייה','חורף'],['עטיפה','סרט','הפתעה','מתנה'],['שוקולד','זהב','עגול','מטבעות שוקולד'],
  ['חלון','רחוב','להראות','פרסומי ניסא'],['חרב','יוונים','ניצחון','המכבים'],['מקהלה','מעוז צור','גיטרה','שירי חנוכה'],['סבתא','מתכון','סיר','בישול משפחתי'],['מצלמה','חיוך','אלבום','צילום משפחתי'],['נ','ג','ה','אותיות הסביבון']];
const CATS = ['מאכלים מטוגנים','דברים שיש במטבח','דברים שמאירים','שירי חנוכה','מילים שמתחילות באות ס','דברים כחולים','מתנות שכיף לקבל','דמויות מהתנ״ך','משחקי קופסה','דברים שיש בחורף',
  'פירות','דברים שעושים במסיבה','מקומות בארץ','דברים שמסתובבים','דברים מתוקים','בגדים','שמות של פרחים','כלי נגינה','דברים עגולים','בעלי חיים','דברים שיש בכיתה','צבעים','דברים שאפשר לטגן','משהו שנותנים במתנה'];
const TYPES = {
  explain:{n:'הסבר במילים אחרות', d:'מסבירים את המילה בלי להגיד אותה. כל ניחוש נכון שווה נקודה.'},
  mime:   {n:'פנטומימה', d:'מציגים את המילה בלי דיבור בכלל. רק תנועות!'},
  link:   {n:'מה הקשר?', d:'שלוש מילים על המסך. מוצאים מה מחבר ביניהן. אפשר לגלות את התשובה.'},
  taboo:  {n:'טאבו', d:'מסבירים את המילה בלי להשתמש במילים האסורות.'},
  blitz:  {n:'אתגר בזק', d:'כמה שיותר דברים שמתאימים לקטגוריה. כל תשובה טובה שווה נקודה.'},
  memory: {n:'זיכרון', d:'מילים מופיעות לכמה שניות ונעלמות. כמה תזכרו?'}
};
/* המאגר האישי נשמר בדפדפן: מילים, טאבו, שלישיות "מה הקשר" וקטגוריות לאתגר בזק */
const POOL_KEY = 'madlik_battle_pool', POOL2_KEY = 'madlik_battle_pool2';
const EMPTY_POOL = {words:'', taboo:'', links:'', cats:''};
const loadPool = () => {
  try{ const j = localStorage.getItem(POOL2_KEY); if(j) return Object.assign({}, EMPTY_POOL, JSON.parse(j)); }catch(e){}
  try{ const w = localStorage.getItem(POOL_KEY) || ''; return w ? Object.assign({}, EMPTY_POOL, {words:w}) : null; }catch(e){ return null; }
};
const savePool = p => { try{ localStorage.setItem(POOL2_KEY, JSON.stringify(p)); localStorage.setItem(POOL_KEY, p.words || ''); return true; }catch(e){ return false; } };
const hasPool = p => !!(p && (p.words || p.taboo || p.links || p.cats).trim());
const lines = text => String(text || '').split(/\n/).map(l => l.trim()).filter(Boolean);
const splitList = s => s.split(/[,،+\/]/).map(x => x.trim()).filter(Boolean);

/* טאבו: "מילה: אסורה, אסורה". מקבלים גם מקף או קו מפריד במקום נקודתיים */
function parseTaboo(text){
  const out = [], seen = new Set();
  lines(text).forEach(l => {
    const m = l.match(/^(.+?)\s*(?::|\s[-–—]\s|\|)\s*(.*)$/);
    const w = (m ? m[1] : l).trim(), t = m ? splitList(m[2]) : [];
    if(w && !seen.has(w)){ seen.add(w); out.push({w, taboo:t, mine:true}); }
  });
  return out;
}
/* מה הקשר: "מילה, מילה, מילה = התשובה" (אפשר גם נקודתיים במקום =) */
function parseLinks(text){
  return lines(text).map(l => {
    const i = l.search(/[=:]/), ws = splitList(i >= 0 ? l.slice(0, i) : l), a = i >= 0 ? l.slice(i + 1).trim() : '';
    return ws.length >= 2 ? {ws, a} : null;
  }).filter(Boolean);
}
/* אתגר בזק: קטגוריה בכל שורה, או עם פסיקים */
const parseCats = text => [...new Set(lines(text).flatMap(l => l.split(/[,،]/).map(x => x.trim()).filter(Boolean)))];

/* מילים אישיות: שורה אחת או פסיקים. לטאבו: "מילה: אסורה, אסורה" */
function parseWords(text){
  const out = [], seen = new Set();
  String(text||'').split(/\n/).map(l => l.trim()).filter(Boolean).forEach(l => {
    if(l.includes(':')){ const w = l.slice(0, l.indexOf(':')).trim(), t = l.slice(l.indexOf(':')+1).split(',').map(x => x.trim()).filter(Boolean); if(w) out.push({w, taboo:t, mine:true}); }
    else l.split(/[,،]/).map(x => x.trim()).filter(Boolean).forEach(w => out.push({w, taboo:[], mine:true}));
  });
  return out.filter(x => !seen.has(x.w) && seen.add(x.w));
}
function tabooFor(x){
  if(x.taboo && x.taboo.length) return x.taboo;
  const first = U.lettersOf(x.w)[0];
  return [`מילים שמתחילות באות ${first || '?'}`, 'כמה אותיות יש במילה', 'מילה מאותו שורש'];
}

/* ======================= המשחק ======================= */
function play(initial){
  const o = P.ov('gp-battle'), saved = loadPool(), hasInit = !!(initial && initial.trim());
  const sv = hasPool(saved) ? saved : EMPTY_POOL;
  const B = {src: (hasInit || hasPool(saved)) ? 'mix' : 'bank', text: hasInit ? initial : sv.words, tabooText: sv.taboo, linksText: sv.links, catsText: sv.cats, level:'medium', time:30, size:40, rounds:3,
    types:new Set(Object.keys(TYPES)), n:2, names:P.TEAM_NAMES.slice(), teams:[], turn:0, roundNo:1, deck:[], all:[], tdeck:[], tall:[], ldeck:[], cdeck:[], last:null, log:[], pts:0};
  const bar = o.el.querySelector('.gp-bar');
  bar.insertAdjacentHTML('afterbegin', '<button class="gp-wordsbtn" hidden>המילים במשחק (<b>0</b>)</button>');
  const wordsBtn = bar.querySelector('.gp-wordsbtn');
  const mine = () => parseWords(B.text);
  const myTaboo = () => parseTaboo(B.tabooText);
  const myLinks = () => parseLinks(B.linksText);
  const myCats = () => parseCats(B.catsText);
  const curPool = () => ({words:B.text, taboo:B.tabooText, links:B.linksText, cats:B.catsText});
  const bankFor = () => BANK.filter(x => B.level === 'hard' || (B.level === 'medium' ? x.lvl !== 'hard' : x.lvl === 'easy'));
  const count = () => B.src === 'bank' ? bankFor().length : B.src === 'mine' ? mine().length : bankFor().length + mine().length;
  /* מה ייכנס לכל אתגר, לפי המאגר שבחרו */
  const linkPool = () => { const m = myLinks().map(l => ({w:l.ws, a:l.a})), b = LINKS.map(l => ({w:l.slice(0, 3), a:l[3]})); return B.src === 'bank' ? b : B.src === 'mine' ? m : b.concat(m); };
  const catPool = () => { const m = myCats(); return B.src === 'bank' ? CATS.slice() : B.src === 'mine' ? (m.length ? m : CATS.slice()) : CATS.concat(m.filter(c => !CATS.includes(c))); };
  function updWords(){ wordsBtn.querySelector('b').textContent = B.all.length; }

  /* --- מסך ההגדרות --- */
  function setup(){
    const opt = (v, t, d) => `<button class="bt-src ${B.src === v ? 'on' : ''}" data-src="${v}" aria-pressed="${B.src === v}"><b>${t}</b><span>${d}</span></button>`;
    o.body.innerHTML = `<div class="gp-card gp-setup bt-setup"><p class="gp-kick">קרב המילים</p><h2>איך תרצו לשחק?</h2>
      <div class="bt-srcs">${opt('bank','מאגר מילים מוכן',`${bankFor().length} מילים לחנוכה, ברמה ${LEVEL[B.level]}`)}${opt('mine','מאגר מילים אישי','שמות, מקומות, בדיחות פנימיות. מה שתרצו')}${opt('mix','לערבב','המאגר המוכן ועוד המילים שלכם')}</div>
      ${B.src !== 'bank' ? `<div class="bt-mine"><p class="bt-mine-h">המילים שלכם לכל אתגר <i class="hint">אפשר למלא רק חלק. אתגר בלי מילים שלכם ישתמש ${B.src === 'mine' ? 'במילים מהתיבה הראשונה או במאגר המוכן' : 'במאגר המוכן'}.</i></p>
        <label class="bt-ta"><span>🗣️ הסבר במילים אחרות, פנטומימה וזיכרון <i class="hint">שורה לכל מילה, או עם פסיקים. אפשר להדביק גם 100 מילים בבת אחת.</i></span>
          <textarea id="btText" rows="5" placeholder="שרה, הדודה רחל, הכינרת, הלביבה של סבתא...">${esc(B.text)}</textarea><span class="bt-cnt"><b id="btMine">${mine().length}</b> מילים</span></label>
        <label class="bt-ta"><span>🚫 טאבו <i class="hint">שורה לכל מילה: קודם המילה, אחריה נקודתיים, ואז המילים שאסור להגיד עם פסיקים.</i></span>
          <textarea id="btTaboo" rows="4" placeholder="סביבון: לסובב, משחק, אותיות&#10;סופגנייה: ריבה, בצק, לטגן">${esc(B.tabooText)}</textarea><span class="bt-cnt"><b id="btTabooN">${myTaboo().length}</b> מילים לטאבו</span></label>
        <label class="bt-ta"><span>🔗 מה הקשר? <i class="hint">שורה לכל שלישייה: שלוש מילים עם פסיקים, אחריהן = ואז התשובה. התשובה מוסתרת, ונחשפת בלחיצה על "גילוי".</i></span>
          <textarea id="btLinks" rows="4" placeholder="שמש, פתילה, גפרור = הדלקת נרות&#10;ריבה, אבקת סוכר, בצק = סופגנייה">${esc(B.linksText)}</textarea><span class="bt-cnt"><b id="btLinksN">${myLinks().length}</b> שלישיות</span></label>
        <label class="bt-ta"><span>⚡ אתגר בזק <i class="hint">קטגוריה בכל שורה. הקבוצה אומרת כמה שיותר דברים מהקטגוריה.</i></span>
          <textarea id="btCats" rows="4" placeholder="דברים שיש בבית של סבתא&#10;שמות של בני הדודים">${esc(B.catsText)}</textarea><span class="bt-cnt"><b id="btCatsN">${myCats().length}</b> קטגוריות</span></label>
        <p class="bt-cnt"><button class="gp-link" data-go="save">שמירת כל המאגר לפעם הבאה</button>${hasPool(loadPool()) ? ' · <button class="gp-link" data-go="load">טעינת המאגר השמור</button>' : ''}</p></div>` : ''}
      ${P.seg('level', [['easy','קל'],['medium','בינוני'],['hard','מאתגר']], B.level, 'רמת קושי')}
      ${P.seg('time', [[30,'30 שניות'],[45,'45 שניות'],[60,'דקה']], B.time, 'משך כל סבב')}
      ${P.seg('size', [[20,'20'],[40,'40'],[60,'60'],[9999,'הכול']], B.size, 'כמה מילים במשחק')}
      ${P.seg('rounds', [[2,'2'],[3,'3'],[5,'5']], B.rounds, 'סבבים לכל קבוצה')}
      <div class="gp-field"><span>סוגי האתגרים</span><div class="bt-types">${Object.entries(TYPES).map(([k, t], i) => `<button data-type="${k}" aria-pressed="${B.types.has(k)}"><i>${i+1}</i><b>${t.n}</b><small>${t.d}</small></button>`).join('')}</div></div>
      ${P.teamsSetup(B, 4)}
      <p class="bt-total">במאגר: <b id="btTotal">${count()}</b> מילים</p>
      <button class="gp-go" data-go="start">מתחילים בקרב! ←</button><button class="gp-link" data-go="rules">איך משחקים?</button></div>`;
    o.focus();
  }

  /* --- תור, גלגל אתגרים ואתגר --- */
  function build(){
    let pool = B.src === 'bank' ? bankFor() : B.src === 'mine' ? mine() : bankFor().concat(mine());
    pool = shuffle(pool); B.all = pool.slice(0, Math.min(pool.length, B.size));
    /* טאבו: המילים שכתבו לטאבו (ובערבוב גם המאגר המוכן). בלי מילים לטאבו, משתמשים במילים הכלליות */
    const mt = myTaboo(), tp = B.src === 'bank' ? [] : B.src === 'mine' ? mt : bankFor().concat(mt);
    B.tall = tp.length ? shuffle(tp) : B.all.slice();
    if(!B.all.length) B.all = B.tall.slice(0, Math.min(B.tall.length, B.size)); // מילאו רק טאבו: גם שאר האתגרים משתמשים בהן
    if(!B.tall.length) B.tall = B.all.slice();
    B.deck = shuffle(B.all); B.tdeck = shuffle(B.tall); B.ldeck = []; B.cdeck = []; updWords();
  }
  const nextWord = () => { if(!B.deck.length) B.deck = shuffle(B.all); return B.deck.pop(); };
  const nextTaboo = () => { if(!B.tdeck.length) B.tdeck = shuffle(B.tall); return B.tdeck.pop(); };
  const nextCard = () => B.type === 'taboo' ? nextTaboo() : nextWord();
  function ready(){
    wordsBtn.hidden = false; const t = B.teams[B.turn];
    o.body.innerHTML = `<div class="gp-card gp-ready" style="--tc:${t.col}"><p class="gp-kick">סבב ${B.roundNo} מתוך ${B.rounds}</p><h2>התור של <b>${esc(t.name)}</b></h2>
      ${P.board(B.teams)}<button class="gp-go" data-go="spin">סובבו את גלגל האתגרים ←</button></div>`;
    o.focus();
  }
  function spin(){
    const list = [...B.types]; let pick = list[Math.floor(Math.random()*list.length)];
    if(list.length > 1) while(pick === B.last) pick = list[Math.floor(Math.random()*list.length)];
    B.last = pick; B.type = pick;
    o.body.innerHTML = `<div class="gp-card bt-slot"><p class="gp-kick">גלגל האתגרים</p><div class="bt-reel" aria-live="polite"><b>${TYPES[list[0]].n}</b></div></div>`;
    const reel = o.body.querySelector('.bt-reel b'); let k = 0, delay = 60;
    const step = () => { k++; reel.textContent = TYPES[list[k % list.length]].n; P.beep(1200 + (k%3)*120, .03, 'square', .04); delay *= 1.16;
      if(delay < 340) o.T.push(setTimeout(step, delay)); else { reel.textContent = TYPES[pick].n; reel.parentNode.classList.add('landed'); P.beep(880, .2, 'triangle'); o.T.push(setTimeout(intro, 700)); } };
    o.T.push(setTimeout(step, delay));
  }
  function intro(){
    const t = B.teams[B.turn], ty = TYPES[B.type];
    const extra = B.type === 'memory' ? `<p>יופיעו <b>${memN()}</b> מילים למשך <b>${memView()}</b> שניות. אחר כך יש ${B.time} שניות להיזכר.</p>` : B.type === 'blitz' ? '<p>המנחה לוחץ "+1" על כל תשובה טובה.</p>' : B.type === 'link' ? '<p>מצאתם קשר? המנחה מאשר. אפשר לפתור כמה שלישיות בסבב.</p>' : '';
    o.body.innerHTML = `<div class="gp-card bt-intro" style="--tc:${t.col}"><p class="gp-kick">${esc(t.name)} · אתגר</p><h2>${ty.n}</h2><p class="bt-d">${ty.d}</p>${extra}
      <button class="gp-go" data-go="go">מתחילים! (${B.time} שניות) ←</button></div>`;
    o.focus();
  }
  const memN = () => ({easy:6, medium:8, hard:10})[B.level];
  const memView = () => ({easy:12, medium:10, hard:8})[B.level];

  function timer(sec, onEnd){
    const ring = o.body.querySelector('.gp-ring'), fg = ring && ring.querySelector('.fg'), C = 2*Math.PI*52; let left = sec;
    if(fg) fg.style.strokeDasharray = C;
    const draw = () => { if(fg) fg.style.strokeDashoffset = C*(1 - left/sec); const s = o.body.querySelector('#gpSec'); if(s) s.textContent = left; if(ring) ring.classList.toggle('hurry', left <= 5); };
    draw(); const iv = setInterval(() => { left--; if(left <= 5 && left > 0) P.beep(880, .07); draw(); if(left <= 0){ clearInterval(iv); P.beep(196, .6, 'sawtooth', .1); onEnd(); } }, 1000);
    o.T.push(iv); B.iv = iv;
  }
  const ringHTML = sec => `<div class="gp-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52"/></svg><b id="gpSec">${sec}</b></div>`;
  const top = () => { const t = B.teams[B.turn]; return `<div class="gp-top"><span class="gp-team">${esc(t.name)} · ${TYPES[B.type].n}</span>${ringHTML(B.time)}<span class="gp-pts">בסבב: <b id="gpPts">0</b></span></div>`; };

  function go(){
    B.log = []; B.pts = 0; const t = B.teams[B.turn];
    if(B.type === 'explain' || B.type === 'mime' || B.type === 'taboo'){
      B.word = nextCard();
      o.body.innerHTML = `<div class="gp-round" style="--tc:${t.col}">${top()}<div class="gp-word" id="gpWord">${cardHTML(B.word)}</div>
        <div class="gp-acts"><button class="gp-ok" data-go="ok">✓ ניחשו <kbd>רווח</kbd></button><button class="gp-skip" data-go="skip">דילוג <kbd>S</kbd></button></div></div>`;
      timer(B.time, sum);
    } else if(B.type === 'blitz'){
      if(!B.cdeck.length) B.cdeck = shuffle(catPool()); B.cat = B.cdeck.pop();
      o.body.innerHTML = `<div class="gp-round bt-blitz" style="--tc:${t.col}">${top()}<div class="gp-word"><span><small>הקטגוריה:</small>${esc(B.cat)}</span></div>
        <div class="gp-acts"><button class="gp-ok bt-plus" data-go="plus">+1 <kbd>רווח</kbd></button><button class="gp-skip" data-go="minus">−1</button></div></div>`;
      timer(B.time, sum);
    } else if(B.type === 'link'){
      nextLink();
      o.body.innerHTML = `<div class="gp-round bt-link" style="--tc:${t.col}">${top()}<div class="gp-word" id="gpWord">${linkHTML()}</div>
        <div class="gp-acts"><button class="gp-ok" data-go="lok">✓ מצאו את הקשר</button><button class="gp-skip" data-go="lnext">שלישייה אחרת</button><button class="gp-link" data-go="lshow">גילוי</button></div></div>`;
      timer(B.time, sum);
    } else if(B.type === 'memory'){
      B.mem = shuffle(B.all).slice(0, memN()).map(x => x.w);
      o.body.innerHTML = `<div class="gp-round bt-mem" style="--tc:${t.col}"><div class="gp-top"><span class="gp-team">${esc(t.name)} · שננו!</span>${ringHTML(memView())}<span class="gp-pts">${B.mem.length} מילים</span></div>
        <div class="bt-grid">${B.mem.map((w, i) => `<div class="bt-m" style="--d:${i*.06}s"><span>${esc(w)}</span></div>`).join('')}</div></div>`;
      timer(memView(), () => {
        o.body.querySelectorAll('.bt-m').forEach(c => c.classList.add('hide'));
        o.body.querySelector('.gp-top').outerHTML = top();
        o.body.querySelector('.bt-mem').insertAdjacentHTML('beforeend', '<p class="bt-memhint">המילים נעלמו! אומרים בקול את כל מה שזוכרים.</p><div class="gp-acts"><button class="gp-go" data-go="memdone">סיימנו להיזכר</button></div>');
        timer(B.time, memMark);
      });
    }
    o.focus();
  }
  function cardHTML(x){
    if(B.type === 'taboo') return `<span class="bt-taboo"><b>${esc(x.w)}</b><em>אסור להגיד:</em><ul>${tabooFor(x).map(t => `<li>${esc(t)}</li>`).join('')}</ul></span>`;
    if(B.type === 'mime') return `<span><small>פנטומימה · בלי מילים!</small>${esc(x.w)}</span>`;
    return `<span>${esc(x.w)}</span>`;
  }
  function nextLink(){
    /* קודם השלישיות המוכנות (שלכם ו/או של המאגר), בלי חזרות עד שנגמרות. אין בכלל? 3 מילים אקראיות והקבוצה ממציאה קשר */
    const lp = linkPool();
    if(lp.length){ if(!B.ldeck.length) B.ldeck = shuffle(lp); const l = B.ldeck.pop(); B.link = {w:shuffle(l.w).slice(0, 3), a:l.a || 'לא נכתבה תשובה. המנחה מחליט אם הקשר משכנע.'}; }
    else { const w = shuffle(B.all).slice(0, 3).map(x => x.w); B.link = {w, a:'אין תשובה אחת נכונה! הקבוצה ממציאה קשר, והמנחה מחליט אם הוא משכנע.'}; }
  }
  const linkHTML = () => `<span class="bt-trio">${B.link.w.map(w => `<b>${esc(w)}</b>`).join('<i>+</i>')}</span><p class="bt-ans" hidden>${esc(B.link.a)}</p>`;
  function bump(n){ B.pts = Math.max(0, B.pts + n); const p = o.body.querySelector('#gpPts'); if(p){ p.textContent = B.pts; p.parentNode.classList.remove('pop'); void p.offsetWidth; p.parentNode.classList.add('pop'); } }
  function mark(ok){
    B.log.push({w:B.word.w, ok}); if(ok) bump(1); P.beep(ok ? 1046 : 330, .09, ok ? 'triangle' : 'square', .08);
    B.word = nextCard(); const w = o.body.querySelector('#gpWord'); if(w){ w.innerHTML = cardHTML(B.word); w.firstElementChild.classList.add(ok ? 'from-ok' : 'from-skip'); }
  }
  function memMark(){
    clearInterval(B.iv);
    o.body.innerHTML = `<div class="gp-card gp-sum"><p class="gp-kick">זיכרון: מה זכרתם?</p><h2><b id="gpTot">0</b> נקודות</h2><p class="hint">המנחה לוחץ על כל מילה שהקבוצה זכרה.</p>
      <div class="gp-logs">${B.mem.map((w, i) => `<button class="gp-log no" data-mem="${i}" aria-pressed="false">${esc(w)} <i>✕</i></button>`).join('')}</div>
      <button class="gp-go" data-go="apply">מוסיפים לניקוד וממשיכים ←</button></div>`;
    B.pts = 0; o.focus();
  }
  function sum(){
    clearInterval(B.iv);
    const listable = ['explain','mime','taboo'].includes(B.type);
    if(listable) B.pts = B.log.filter(x => x.ok).length;
    o.body.innerHTML = `<div class="gp-card gp-sum" style="--tc:${B.teams[B.turn].col}"><p class="gp-kick">נגמר הזמן! ${TYPES[B.type].n}</p><h2><b id="gpTot">${B.pts}</b> נקודות</h2>
      ${listable ? `<p class="hint">טעיתם בסימון? לחיצה על מילה מתקנת.</p><div class="gp-logs">${B.log.map((x, i) => `<button class="gp-log ${x.ok ? 'ok' : 'no'}" data-log="${i}" aria-pressed="${x.ok}">${esc(x.w)} <i>${x.ok ? '✓' : '✕'}</i></button>`).join('') || '<p>לא היו מילים בסבב.</p>'}</div>` : ''}
      <div class="bt-fix">תיקון ידני: <button data-go="fixm">−1</button><button data-go="fixp">+1</button></div>
      <button class="gp-go" data-go="apply">מוסיפים לניקוד וממשיכים ←</button></div>`;
    o.focus();
  }
  function apply(){
    B.teams[B.turn].score += B.pts;
    B.turn = (B.turn + 1) % B.teams.length; if(B.turn === 0) B.roundNo++;
    if(B.roundNo > B.rounds) return podium();
    ready();
  }
  function podium(){ wordsBtn.hidden = true; P.podium(o, B.teams, () => { B.teams.forEach(t => t.score = 0); B.turn = 0; B.roundNo = 1; setup(); }); }

  /* --- ניהול מילים באמצע המשחק --- */
  function words(){
    const d = document.createElement('div'); d.className = 'bt-drawer'; d.setAttribute('role','dialog'); d.setAttribute('aria-label','המילים במשחק');
    const draw = () => { d.innerHTML = `<div class="bt-dr-in"><div class="bt-dr-h"><h3>המילים במשחק (${B.all.length})</h3><button data-dr="close" aria-label="סגירה">×</button></div>
      <form class="bt-add"><input placeholder="הוספת מילים: מילה, מילה, מילה" aria-label="הוספת מילים"><button class="gp-go">הוספה</button></form>
      <div class="bt-list">${B.all.map((x, i) => `<span>${esc(x.w)}<button data-rm="${i}" aria-label="הסרת ${esc(x.w)}">×</button></span>`).join('')}</div></div>`;
      d.querySelector('input').focus(); };
    o.el.appendChild(d); draw();
    d.addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return;
      if(b.dataset.dr === 'close'){ d.remove(); return; }
      if(b.dataset.rm != null){ const x = B.all.splice(+b.dataset.rm, 1)[0]; B.deck = B.deck.filter(y => y !== x); updWords(); draw(); } });
    d.addEventListener('submit', e => { e.preventDefault(); const add = parseWords(e.target.querySelector('input').value).filter(x => !B.all.some(y => y.w === x.w));
      B.all = B.all.concat(add); B.deck = shuffle(B.deck.concat(add)); updWords(); draw(); if(add.length) P.toast(`נוספו ${add.length} מילים`); });
  }
  wordsBtn.onclick = words;

  /* --- אירועים --- */
  o.body.onclick = e => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.src){ B.src = b.dataset.src; setup(); return; }
    if(b.dataset.level){ B.level = b.dataset.level; setup(); return; }
    if(b.dataset.time){ B.time = +b.dataset.time; setup(); return; }
    if(b.dataset.size){ B.size = +b.dataset.size; setup(); return; }
    if(b.dataset.rounds){ B.rounds = +b.dataset.rounds; setup(); return; }
    if(b.dataset.n){ B.n = +b.dataset.n; setup(); return; }
    if(b.dataset.type){ const k = b.dataset.type; if(B.types.has(k)){ if(B.types.size > 1) B.types.delete(k); else P.toast('צריך לפחות סוג אתגר אחד'); } else B.types.add(k); b.setAttribute('aria-pressed', B.types.has(k)); return; }
    if(b.dataset.log != null){ const x = B.log[+b.dataset.log]; x.ok = !x.ok; b.classList.toggle('ok', x.ok); b.classList.toggle('no', !x.ok); b.setAttribute('aria-pressed', x.ok); b.querySelector('i').textContent = x.ok ? '✓' : '✕'; B.pts = B.log.filter(y => y.ok).length; o.body.querySelector('#gpTot').textContent = B.pts; return; }
    if(b.dataset.mem != null){ const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); b.classList.toggle('ok', on); b.classList.toggle('no', !on); b.querySelector('i').textContent = on ? '✓' : '✕'; B.pts += on ? 1 : -1; o.body.querySelector('#gpTot').textContent = B.pts; return; }
    const g = b.dataset.go;
    if(g === 'save'){ savePool(curPool()) ? P.toast('המאגר האישי נשמר בדפדפן הזה') : P.toast('לא הצלחתי לשמור'); setup(); }
    else if(g === 'load'){ const p = loadPool(); if(p){ B.text = p.words; B.tabooText = p.taboo; B.linksText = p.links; B.catsText = p.cats; } setup(); }
    else if(g === 'rules') window.GamesPro.showRules('battle');
    else if(g === 'start'){
      build();
      const needWords = ['explain','mime','taboo','memory'].some(k => B.types.has(k)) || (B.types.has('link') && !linkPool().length);
      if(needWords && B.all.length < 4){ P.toast('צריך לפחות 4 מילים. הוסיפו מילים או בחרו את המאגר המוכן'); return; }
      if(B.src !== 'bank') savePool(curPool()); // שומרים אוטומטית, כדי שהמאגר יחכה בפעם הבאה
      B.teams = Array.from({length:B.n}, (_, i) => ({name:B.names[i] || P.TEAM_NAMES[i], col:P.TEAM_COLS[i], score:0})); B.turn = 0; B.roundNo = 1; ready(); }
    else if(g === 'spin') spin();
    else if(g === 'go') go();
    else if(g === 'ok') mark(true);
    else if(g === 'skip') mark(false);
    else if(g === 'plus'){ bump(1); P.beep(1046, .07, 'triangle'); }
    else if(g === 'minus') bump(-1);
    else if(g === 'lok'){ bump(1); P.beep(1046, .12, 'triangle'); nextLink(); o.body.querySelector('#gpWord').innerHTML = linkHTML(); }
    else if(g === 'lnext'){ nextLink(); o.body.querySelector('#gpWord').innerHTML = linkHTML(); }
    else if(g === 'lshow'){ const a = o.body.querySelector('.bt-ans'); if(a) a.hidden = false; }
    else if(g === 'memdone'){ clearInterval(B.iv); memMark(); }
    else if(g === 'fixm'){ B.pts = Math.max(0, B.pts - 1); o.body.querySelector('#gpTot').textContent = B.pts; }
    else if(g === 'fixp'){ B.pts++; o.body.querySelector('#gpTot').textContent = B.pts; }
    else if(g === 'apply') apply();
  };
  o.body.oninput = e => {
    const id = e.target.id, setN = (sel, n) => { const el = o.body.querySelector(sel); if(el) el.textContent = n; };
    if(id === 'btText'){ B.text = e.target.value; setN('#btMine', mine().length); setN('#btTotal', count()); }
    else if(id === 'btTaboo'){ B.tabooText = e.target.value; setN('#btTabooN', myTaboo().length); }
    else if(id === 'btLinks'){ B.linksText = e.target.value; setN('#btLinksN', myLinks().length); }
    else if(id === 'btCats'){ B.catsText = e.target.value; setN('#btCatsN', myCats().length); }
    const i = e.target.dataset.name; if(i != null) B.names[+i] = e.target.value;
  };
  o.el.onkey = e => {
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const r = o.body.querySelector('.gp-round'); if(!r) return;
    if(e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); if(r.classList.contains('bt-blitz')){ bump(1); P.beep(1046, .07, 'triangle'); } else if(!r.classList.contains('bt-link') && !r.classList.contains('bt-mem')) mark(true); }
    else if((e.key === 's' || e.key === 'S' || e.key === 'ד') && !r.classList.contains('bt-blitz') && !r.classList.contains('bt-link') && !r.classList.contains('bt-mem')){ e.preventDefault(); mark(false); }
  };
  setup();
}

/* ---------- חיבור למערכת המשחקים: הוראות, שדות, תצוגה והפעלה ---------- */
const G = window.GamesPro;
G.RULES.battle = {title:'איך משחקים קרב המילים?', intro:'משחק קבוצות על המסך עם 6 סוגי אתגרים. בכל תור גלגל האתגרים בוחר אתגר אחר, ולקבוצה יש 30 שניות, 45 שניות או דקה (לבחירתכם).',
  need:['מסך או מקרן','2 עד 4 קבוצות','מנחה שלוחץ על הכפתורים'],
  steps:['בוחרים מאגר: <b>מאגר מוכן</b> (מילים לחנוכה), <b>מאגר אישי</b> (רק המילים שלכם) או <b>לערבב</b> (המוכן ועוד שלכם).','במאגר אישי או בערבוב מופיעה <b>תיבה נפרדת לכל אתגר</b>, והאתר מראה כמה מילים יש בכל אחת. אפשר למלא רק חלק מהתיבות.','בוחרים רמת קושי, משך סבב, כמה מילים, כמה סבבים וסוגי אתגרים. אפשר לבטל אתגר שלא רוצים.','בכל תור מסובבים את גלגל האתגרים, והוא בוחר את האתגר של הקבוצה.','כשהזמן נגמר, האתר מסכם את הנקודות. טעיתם בסימון? לוחצים על המילה ומתקנים. אחר כך התור עובר לקבוצה הבאה.','אפשר להוסיף ולהסיר מילים באמצע המשחק, בכפתור "המילים במשחק" למעלה.'],
  okTitle:'מה כותבים בכל תיבה',
  ok:['<b>הסבר במילים אחרות, פנטומימה וזיכרון:</b> מילה בכל שורה, או מילים עם פסיקים. אותן מילים משמשות לשלושת האתגרים.','<b>טאבו:</b> בכל שורה המילה, נקודתיים, ואחריהן המילים האסורות עם פסיקים. לדוגמה: <i>סביבון: לסובב, משחק, אותיות</i>','<b>מה הקשר?:</b> בכל שורה שלוש מילים עם פסיקים, סימן = ואז התשובה. לדוגמה: <i>שמש, פתילה, גפרור = הדלקת נרות</i>. התשובה מוסתרת, ונחשפת בכפתור "גילוי".','<b>אתגר בזק:</b> קטגוריה בכל שורה. לדוגמה: <i>דברים בבית של סבתא</i>','תיבה שנשארה ריקה? האתגר הזה משתמש במילים מהתיבה הראשונה או במאגר המוכן.'],
  score:['כל ניחוש נכון, קשר שנמצא, תשובה בזק או מילה שנזכרה: נקודה','בהסבר, בפנטומימה ובטאבו: "ניחשו" (או מקש רווח) מוסיף נקודה, "דילוג" עובר למילה הבאה','אחרי מספר הסבבים שבחרתם: פודיום המנצחים'],
  tip:'המאגר האישי נשמר לבד בדפדפן כשמתחילים לשחק, ומחכה לכם בפעם הבאה באותו מחשב. רוצים רק את המילים שלכם, בלי המאגר המוכן? בוחרים "מאגר אישי" ולא "לערבב".'};
G.NEW.unshift('battle'); G.PLAYABLE.push('battle');
G.DEFAULTS.battle = {title:'קרב המילים', words:''};
const f0 = G.fields; G.fields = (type, s) => type === 'battle' ? `<label>מילים להסבר, לפנטומימה ולזיכרון (לא חובה) <span class="hint">שורה לכל מילה או עם פסיקים. אפשר גם 100 בבת אחת. בלי מילים, משחקים עם המאגר המוכן. מילים לטאבו, שלישיות ל"מה הקשר" וקטגוריות לאתגר בזק כותבים אחרי שלוחצים "מתחילים בקרב", בתיבה הנפרדת של כל אתגר.</span><textarea name="words" rows="10" placeholder="שרה, הדודה רחל, הכינרת...">${esc(s.words)}</textarea></label>` : f0(type, s);
const r0 = G.render; G.render = (type, s, cache, v, title) => {
  if(type !== 'battle') return r0(type, s, cache, v, title);
  const m = parseWords(s.words);
  return `<div class="bt-preview no-print"><p class="gp-kick">קרב המילים</p><h3>6 אתגרים במשחק אחד</h3><div class="bt-types static">${Object.values(TYPES).map((t, i) => `<div><i>${i+1}</i><b>${t.n}</b><small>${t.d}</small></div>`).join('')}</div>
    <p>${m.length ? `<b>${m.length}</b> מילים שלכם, ועוד ${BANK.length} במאגר המוכן` : `מאגר מוכן של ${BANK.length} מילים לחנוכה, בשלוש רמות קושי`}.</p>
    <button type="button" class="gp-go bt-start" data-play="1">מתחילים בקרב! ←</button></div>`
    + (m.length ? U.chunk(m, 12).map(pg => `<div class="sheet" style="${v}">${title}<div class="g-cards" style="grid-template-columns:repeat(3,1fr)">${pg.map(x => `<div class="g-card">${esc(x.w)}<small>מדליק</small></div>`).join('')}</div></div>`).join('') : '');
};
const s0 = window.GamesPlay.start; window.GamesPlay.start = (type, s, cache) => type === 'battle' ? play(s.words) : s0(type, s, cache);

return {play, parseWords, BANK, TYPES};
})();
