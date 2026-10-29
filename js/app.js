(function(){
'use strict';
const D = window.MADLIK_DATA;
const app = document.getElementById('app');

/* ---------- כלים ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store = {
  get(k, def){ try{ const v = localStorage.getItem('madlik_'+k); return v ? JSON.parse(v) : def; }catch(e){ return def; } },
  set(k, v){ try{ localStorage.setItem('madlik_'+k, JSON.stringify(v)); }catch(e){} },
  push(k, item){ const a = store.get(k, []); a.unshift(Object.assign({id:Date.now().toString(36), date:new Date().toLocaleString('he-IL')}, item)); store.set(k, a); }
};
const GAS_CODE = "// מדליק – שרת קטן וחינמי בגוגל: שומר נרשמות בגיליון ושולח להן מיילים.\n// 1. החליפי את המפתח כאן במפתח סודי משלך (אותיות באנגלית ומספרים).\nconst SECRET = 'CHANGE-ME-123';\n\nconst SHEET = 'נרשמות';\n\nfunction sheet_() {\n  const ss = SpreadsheetApp.getActiveSpreadsheet();\n  let sh = ss.getSheetByName(SHEET);\n  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(['תאריך', 'מייל', 'שם', 'מקור', 'פעילה']); }\n  return sh;\n}\nfunction json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }\nfunction valid_(e) { return /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(e); }\nfunction esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }\nfunction fmt_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm') : String(d); }\n\n// נרשמות חדשות, רשימה ושליחה\nfunction doPost(e) {\n  try {\n    const d = JSON.parse(e.postData.contents);\n    if (d.action === 'subscribe') {\n      const email = String(d.email || '').trim().toLowerCase();\n      if (!valid_(email)) return json_({ ok: false, error: 'מייל לא תקין' });\n      const sh = sheet_(), rows = sh.getDataRange().getValues();\n      for (let i = 1; i < rows.length; i++) {\n        if (String(rows[i][1]).toLowerCase() === email) {\n          if (rows[i][4] === 'לא') sh.getRange(i + 1, 5).setValue('כן');\n          return json_({ ok: true, dup: true });\n        }\n      }\n      sh.appendRow([new Date(), email, String(d.name || ''), String(d.source || ''), 'כן']);\n      return json_({ ok: true });\n    }\n    if (d.key !== SECRET) return json_({ ok: false, error: 'מפתח שגוי' });\n    if (d.action === 'list') {\n      const rows = sheet_().getDataRange().getValues(), out = [];\n      for (let i = 1; i < rows.length; i++) if (rows[i][4] !== 'לא') out.push({ date: fmt_(rows[i][0]), email: rows[i][1], source: rows[i][3] });\n      return json_({ ok: true, subscribers: out });\n    }\n    if (d.action === 'send') return send_(d);\n    return json_({ ok: false, error: 'פעולה לא מוכרת' });\n  } catch (err) {\n    return json_({ ok: false, error: String(err) });\n  }\n}\n\n// הסרה מהרשימה (הקישור שבסוף כל מייל)\nfunction doGet(e) {\n  const p = e.parameter || {};\n  if (p.action === 'unsub') {\n    const email = String(p.email || '').toLowerCase(), sh = sheet_(), rows = sh.getDataRange().getValues();\n    for (let i = 1; i < rows.length; i++) if (String(rows[i][1]).toLowerCase() === email) sh.getRange(i + 1, 5).setValue('לא');\n    return HtmlService.createHtmlOutput('<div dir=\"rtl\" style=\"font-family:Arial,sans-serif;padding:48px;font-size:20px\">הוסרת מרשימת התפוצה של מדליק. תודה, ושיהיה חג אורים שמח.</div>');\n  }\n  return json_({ ok: true });\n}\n\nfunction send_(d) {\n  const rows = sheet_().getDataRange().getValues();\n  let to = [];\n  if (d.test) to = [String(d.test)];\n  else for (let i = 1; i < rows.length; i++) if (rows[i][4] !== 'לא') to.push(rows[i][1]);\n  const subject = String(d.subject || '').trim(), body = String(d.body || '');\n  if (!subject || !body) return json_({ ok: false, error: 'חסר נושא או הודעה' });\n  const quota = MailApp.getRemainingDailyQuota();\n  let sent = 0, skipped = 0;\n  for (const email of to) {\n    if (sent >= quota) { skipped++; continue; }\n    const unsub = ScriptApp.getService().getUrl() + '?action=unsub&email=' + encodeURIComponent(email);\n    const html = '<div dir=\"rtl\" style=\"font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#071a38\">' + esc_(body).replace(/\\n/g, '<br>') +\n      '<hr style=\"margin-top:32px;border:0;border-top:1px solid #ddd\"><p style=\"font-size:12px;color:#666\">קיבלת מייל זה כי נרשמת לרשימת התפוצה של מדליק. <a href=\"' + unsub + '\">להסרה מהרשימה</a></p></div>';\n    MailApp.sendEmail({ to: email, subject: subject, htmlBody: html, body: body + '\\n\\nלהסרה מהרשימה: ' + unsub, name: 'מדליק' });\n    sent++;\n  }\n  return json_({ ok: true, sent: sent, skipped: skipped });\n}\n";
const API = () => String(window.MADLIK_API || '').trim();
function subscribe(email, source, name){
  email = String(email||'').trim();
  store.push('subscribers', {email, source, name:name||''});
  if(!API()) return;
  try{ fetch(API(), {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'subscribe', email, source, name:name||''})}).catch(()=>{}); }catch(e){}
}
const apiPost = body => fetch(API(), {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body)}).then(r=>r.json());
function toast(msg){ const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('show'), 2600); }
const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const chunk = (a,n) => { const r=[]; for(let i=0;i<a.length;i+=n) r.push(a.slice(i,i+n)); return r; };
const lines = s => String(s||'').split(/\n/).map(x=>x.trim()).filter(Boolean);
const enc = o => encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(o)))));
const dec = s => { try{ return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(s))))); }catch(e){ return null; } };
function copyLink(url){
  const full = location.href.split('#')[0] + url;
  (navigator.clipboard ? navigator.clipboard.writeText(full) : Promise.reject()).then(()=>toast('הקישור הועתק '), ()=>prompt('העתיקי את הקישור:', full));
}
function printHTML(html){
  const root = document.getElementById('printRoot');
  root.innerHTML = html;
  setTimeout(()=>{ window.print(); }, 300);
}
window.addEventListener('afterprint', ()=>{ document.getElementById('printRoot').innerHTML=''; });

// תוכן = תוכן בסיס + מה שנוסף בניהול
const content = k => (D[k]||[]).concat(store.get('extra_'+k, []));
const findIn = (k,id) => content(k).find(x=>x.id===id);

/* ---------- מועדפים ---------- */
const favs = () => store.get('favs', {games:[],recipes:[],ideas:[],suppliers:[]});
const isFav = (k,id) => (favs()[k]||[]).includes(id);
function toggleFav(k,id){ const f = favs(); f[k] = f[k]||[]; const i = f[k].indexOf(id); if(i>=0){ f[k].splice(i,1); toast('הוסר מהמועדפים'); } else { f[k].push(id); toast('נשמר באזור האישי ♡'); } store.set('favs', f); }
const favBtn = (k,id) => `<button class="fav-btn ${isFav(k,id)?'on':''}" data-fav="${k}|${esc(id)}" aria-label="שמירה במועדפים">${isFav(k,id)?'♥':'♡'}</button>`;
document.addEventListener('click', e=>{
  const b = e.target.closest('[data-fav]'); if(!b) return;
  e.preventDefault(); e.stopPropagation();
  const [k,id] = b.dataset.fav.split('|'); toggleFav(k,id);
  const on = isFav(k,id); b.classList.toggle('on', on); b.textContent = on?'♥':'♡';
});

/* ---------- כרטיסים ---------- */
const bgs = ['#d6e4ee','#e4f0e2','#fff3d6','#f3e9da','#e8eef7'];
const gameCard = (g,i=0) => `<a class="card" href="#/game/${esc(g.id)}">${favBtn('games',g.id)}<div class="card-top" style="--bg:${bgs[i%5]}">${art(g)}</div><div class="card-body"><h3>${esc(g.title)}</h3><p>${esc(g.short)}</p><div class="tags"><span class="tag">${esc(g.type)}</span><span class="tag">${esc(g.min)}–${esc(g.max)} משתתפות</span>${(g.format||[]).map(f=>`<span class="tag">${esc(f)}</span>`).join('')}</div></div></a>`;
const recipeCard = (r,i=0) => `<a class="card" href="#/recipe/${esc(r.id)}">${favBtn('recipes',r.id)}<div class="card-top" style="--bg:${bgs[(i+2)%5]}">${art(r)}</div><div class="card-body"><h3>${esc(r.title)}</h3><div class="tags"><span class="tag">${esc(r.cat)}</span><span class="tag"> ${esc(r.time)} דק׳</span><span class="tag">${esc(r.level)}</span><span class="tag">${esc(r.diet)}</span></div></div></a>`;
const ideaCard = (x,i=0) => `<div class="card">${favBtn('ideas',x.id)}<div class="card-top" style="--bg:${bgs[(i+1)%5]}">${art(x)}</div><div class="card-body"><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p><div class="tags"><span class="tag">${esc(x.cat)}</span>${x.credit?`<span class="tag"> ${esc(x.credit)}</span>`:''}</div></div></div>`;
const supCard = (s,i=0) => `<a class="card sup-card" href="#/supplier/${esc(s.id)}">${s.featured?'<span class="badge-featured">מומלץ</span>':''}${favBtn('suppliers',s.id)}<div class="card-top" style="--bg:${bgs[(i+3)%5]}">${art(s)}</div><div class="card-body"><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><div class="tags"><span class="tag">${esc(s.cat)}</span><span class="tag"> ${esc(s.region)}</span><span class="tag">${esc(s.price)}</span></div></div></a>`;
const tplCard = t => `<a class="card" href="#/studio/${esc(t.id)}"><div class="card-top" style="--bg:#f3e9da">${art(t)}</div><div class="card-body"><h3>${esc(t.title)}</h3><p>${t.w}×${t.h} מ״מ</p></div></a>`;
const creatorCard = c => `<a class="card" href="#/create/${esc(c.id)}"><div class="card-top" style="--bg:#fff3d6">${art(c)}</div><div class="card-body"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p><div class="tags"><span class="tag tag-gold">חינם</span></div></div></a>`;
const art = x => { const n = String(x.title||x.name||'').replace(/["'״׳]/g,'').trim(); return `<span class="card-letter">${esc(n[0]||'✦')}</span>`; };
const pageHead = (title, text, crumb) => `<div class="page-head"><div class="wrap">${crumb?`<div class="breadcrumb"><a href="#/">ראשי</a> › ${crumb}</div>`:''}<h1>${title}</h1>${text?`<p>${text}</p>`:''}</div></div>`;

/* ---------- עמודים ---------- */
const pages = {};

const glyphs = {
  games:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="32" height="32" rx="8"/><circle cx="17" cy="17" r="2.4" fill="currentColor"/><circle cx="31" cy="31" r="2.4" fill="currentColor"/><circle cx="24" cy="24" r="2.4" fill="currentColor"/><circle cx="31" cy="17" r="2.4" fill="currentColor"/><circle cx="17" cy="31" r="2.4" fill="currentColor"/></svg>',
  create:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 38l4-12L32 8l8 8-18 18z"/><path d="M28 12l8 8M14 26l8 8"/><path d="M8 42h32"/></svg>',
  studio:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M24 6C13 6 6 14 6 23c0 9 7 15 14 15 3 0 3-3 2-5s0-5 3-5h6c6 0 11-4 11-10C42 12 34 6 24 6z"/><circle cx="15" cy="21" r="2.5"/><circle cx="22" cy="14" r="2.5"/><circle cx="31" cy="15" r="2.5"/></svg>',
  recipes:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="22" cy="28" rx="16" ry="6"/><path d="M6 28v2c0 4 7 7 16 7s16-3 16-7v-2M38 27l8-3"/><path d="M16 18c0-3 3-3 3-6M23 18c0-3 3-3 3-6M30 18c0-3 3-3 3-6"/></svg>',
  ideas:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M24 6a12 12 0 0 0-7 22c1.5 1 2 2.5 2 4v2h10v-2c0-1.5.5-3 2-4a12 12 0 0 0-7-22z"/><path d="M19 39h10M21 43h6M24 2v-0M8 18H5M43 18h-3M11 7l2 2M37 7l-2 2"/></svg>',
  suppliers:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 18L24 6l18 12z"/><path d="M10 18v18M18 18v18M30 18v18M38 18v18M6 40h36M4 44h40"/></svg>'
};
pages.home = () => {
  const fx = window.MadlikFX;
  const games = content('games').slice(0,8), recipes = content('recipes').slice(0,8);
  const nights = [
    ['משחקים מוכנים','אליאס, רביעיות, בינגו וטריוויה. מדפיסות או מקרינות, ויוצאים לדרך.','#/games','למשחקים'],
    ['משחק משלך','מכניסות את המילים שלך ומקבלות משחק מעוצב עם טיימר. בלי הרשמה.','#/create','ליצירה'],
    ['מיתוג לערב','הזמנה, תפריט, מדבקה לבקבוק. כותבות שם ותאריך, מורידות ומדפיסות.','#/studio','לסטודיו'],
    ['מתכונים','לביבות לכמה סועדות שתרצי. הכמויות מתחשבות לבד.','#/recipes','למתכונים'],
    ['השראה','שולחנות, אולמות, מתנות קטנות והפעלות שבאמת עובדות.','#/ideas','להשראה'],
    ['ספקים','אולמות, קייטרינג ומפעילות. לפי אזור ולפי מחיר.','#/suppliers','לספקים'],
    ['הרעיון שלך','יש לך משחק או מתכון? שלחי, ואם יעלה לאתר נכתוב את שמך.','#/submit','לשליחה'],
    ['האזור שלי','מועדפים ורשימת קניות במקום אחד, והכול נשאר אצלך.','#/me','לאזור שלי']
  ];
  const words = ['סביבון','לביבות','סופגניות','שמונה נרות','פך שמן','נס גדול','משחקים','מיתוג','מתכונים'];
  const band = (cls,dir) => `<div class="band ${cls}" data-dir="${dir}" aria-hidden="true"><div class="band-track">${[0,1].map(()=>[...words,...words].map(w=>`<span>${w}</span>`).join('')).join('')}</div></div>`;
  const hl = ['בצחוק,','במשחק','בשולחן','ובתמונה','מוכן.'];
  const stm = 'ערב לביבות טוב לא נגמר בלביבות. הוא נגמר בצחוק, במשחק שכולן נכנסו אליו, בשולחן שמישהי טרחה עליו ובתמונה שכולן רוצות. אספנו את כל זה במקום אחד, כדי שתבואי עם כוס תה ותצאי עם ערב מוכן.'.split(' ').map(w=>`<span class="w${hl.includes(w)?' hl':''}">${w}</span>`).join(' ');
  const ring = txt => { const ch = [...txt], n = ch.length; return ch.map((c,i)=>`<text transform="rotate(${(-(i/n)*360).toFixed(2)} 80 80) translate(80 24)" text-anchor="middle">${c}</text>`).join(''); };
  const pile = (id,theme,font,over) => { const t = D.templates.find(x=>x.id===id); return designHTML(t, Object.assign({theme, font:font||'frank', deco:''}, t.fields, over||{}), ''); };
  const p2 = n => String(n).padStart(2,'0');
  return `
  <section class="hero" id="hero">
    <div class="hero-top"><span>חנוכה תשפ״ז</span><span>הכול בחינם</span><span>גללי ותראי מה קורה ↓</span></div>
    <h1 class="hero-word"><img class="hero-logo" src="img/logo-mark.png" alt="מדליק – כל מה שצריך לערב לביבות"></h1>
    <svg class="badge" viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="78" fill="#fbf1dc" stroke="#071a38" stroke-width="3"/>${ring('כל מה שצריך לערב לביבות ✦ שמדליק שמחה בלבבות ✦ ')}<circle cx="80" cy="80" r="27" fill="#ff6a00" stroke="#071a38" stroke-width="3"/><path d="M80 62c3 6 9 10 9 18a9 9 0 0 1-18 0c0-4 2-6 4-9 1 3 2 4 4 4-1-5 0-9 1-13z" fill="#071a38"/></svg>
        <div class="hero-copy">
      <p class="tagline">כל מה שצריך לערב לביבות<br><em>שמדליק שמחה בלבבות</em></p>
      <form class="search-big" id="heroSearch"><input type="search" name="q" placeholder="מה מחפשות? למשל: משחק לקבוצה גדולה" aria-label="חיפוש"><button class="btn btn-gold">חיפוש</button></form>
    </div>
  </section>
  ${band('', 1)}
  <div class="statement"><p>${stm}</p></div>
  <section class="nights" aria-label="שמונה לילות">
    <div class="nights-stage" data-theme="orange">
      <div class="n-panels">${nights.map((n,i)=>`<article class="n-panel" data-i="${i+1}"><div class="n-num"><small>לילה</small><b>${i+1}</b></div><h2>${n[0]}</h2><p>${n[1]}</p><a class="btn btn-gold" href="${n[2]}">${n[3]} ←</a></article>`).join('')}</div>
      <div class="n-menorah">${fx?fx.menorah({scroll:true}):''}</div>
      <div class="n-hint">גללי כדי להדליק</div>
      <div class="n-ticks">${nights.map(()=>'<i></i>').join('')}</div>
    </div>
  </section>
  <section class="hs" aria-label="משחקים">
    <div class="hs-stick">
      <div class="hs-head"><h2>משחקים</h2><div class="hs-count">01</div></div>
      <div class="hs-track">${games.map((g,i)=>`<a class="poster" href="#/game/${esc(g.id)}"><span class="p-num">${p2(i+1)}</span><div><b class="p-title">${esc(g.title)}</b><p class="p-sub">${esc(g.short)}</p><div class="p-meta"><span>${esc(g.min)}–${esc(g.max)}</span><span>${esc(g.type)}</span>${(g.format||[]).slice(0,1).map(f=>`<span>${esc(f)}</span>`).join('')}</div></div><span class="p-arrow">←</span></a>`).join('')}
        <a class="poster big-end" href="#/games" style="--bg:#071a38;--fg:#fbf1dc"><span class="p-num">+</span><div><b class="p-title">כל ${content('games').length} המשחקים</b><p class="p-sub">עם סינון לפי גיל, גודל קבוצה וציוד.</p></div><span class="p-arrow">←</span></a>
      </div>
      <div class="hs-bar"><i></i></div>
    </div>
  </section>
  <div class="wrap"><div class="nums">
    <div><b data-count="${content('games').length}">0</b><span>משחקים</span></div>
    <div><b data-count="${D.templates.length}">0</b><span>תבניות מיתוג</span></div>
    <div><b data-count="${content('recipes').length}">0</b><span>מתכונים</span></div>
    <div><b>0</b><span>שקלים. הכול בחינם</span></div>
  </div></div>
  <section class="studio-sec">
    <div class="wrap studio-grid">
      <div>
        <h2><span class="mask"><span>הזמנה.</span></span><span class="mask"><span>מדבקה.</span></span><span class="mask"><span>תפריט.</span></span></h2>
        <p>כותבות שם ותאריך, בוחרות צבע, מורידות ומדפיסות. הכול מוכן תוך דקה.</p>
        <a class="btn btn-ink" href="#/studio">לסטודיו המיתוג ←</a>
      </div>
      <div class="pile" data-parallax>
        <div class="pile-item" data-speed=".05" style="right:0;top:0;--r:3deg;--s:.4">${pile('poster','night','suez',{title:'ערב לביבות',sub:'משחקים · הפתעות'})}</div>
        <div class="pile-item" data-speed=".12" style="right:230px;top:120px;--r:-5deg;--s:.5">${pile('invite','cream','frank')}</div>
        <div class="pile-item" data-speed=".2" style="right:40px;top:470px;--r:-3deg;--s:.42">${pile('bottle','gold-blue','suez')}</div>
        <div class="pile-item" data-speed=".26" style="right:400px;top:20px;--r:9deg;--s:.7">${pile('sticker','mint','suez')}</div>
      </div>
    </div>
  </section>
  <section class="paper">
    <div class="wrap">
      <div class="paper-head"><h2><span class="mask"><span>מתכונים</span></span></h2><a class="btn" href="#/recipes">לכל המתכונים ←</a></div>
      <ul class="index">${recipes.map((r,i)=>`<li><a href="#/recipe/${esc(r.id)}"><span class="i-n">${p2(i+1)}</span><b>${esc(r.title)}</b><span class="i-t">${esc(r.time)} דק׳</span><span class="i-l">${esc(r.level)}</span><span class="i-a">←</span></a></li>`).join('')}</ul>
    </div>
  </section>
  ${band('cream flip', -1)}
  <section class="final">
    <a class="big-link" href="#/games">מתחילות לשחק <i>←</i></a>
    <a class="big-link" href="#/submit">יש לך רעיון? <i>←</i></a>
    <a class="big-link" href="#/advertise">יש לך עסק? <i>←</i></a>
  </section>`;
};
pages.home.after = () => { document.getElementById('heroSearch').onsubmit = e => { e.preventDefault(); location.hash = '#/search?q=' + encodeURIComponent(e.target.q.value); }; };

pages.search = (p,q) => {
  const term = (q.q||'').trim(); const m = x => JSON.stringify(x).includes(term);
  const g = content('games').filter(m), r = content('recipes').filter(m), i = content('ideas').filter(m), s = content('suppliers').filter(m);
  const block = (t,arr,fn) => arr.length?`<h2>${t}</h2><div class="cards" style="margin-bottom:30px">${arr.map(fn).join('')}</div>`:'';
  return pageHead('תוצאות חיפוש', `חיפשת: "${esc(term)}"`, 'חיפוש') + `<div class="wrap">${(g.length+r.length+i.length+s.length)?block('משחקים',g,gameCard)+block('מתכונים',r,recipeCard)+block('רעיונות',i,ideaCard)+block('ספקים',s,supCard):'<div class="empty">לא נמצאו תוצאות. נסי מילה אחרת.</div>'}</div>`;
};

/* משחקים */
pages.games = () => {
  const types = [...new Set(content('games').map(g=>g.type))], formats = [...new Set(content('games').flatMap(g=>g.format||[]))], ages = [...new Set(content('games').map(g=>g.age))];
  return pageHead('משחקים מוכנים', 'משחקים להדפסה, להקרנה ולהפעלה בעל פה. סנני לפי מה שמתאים לערב שלך.', 'משחקים') + `
  <div class="wrap">
    <form class="filters" id="gf" onsubmit="return false">
      <input type="search" name="q" placeholder="חיפוש משחק...">
      <select name="type"><option value="">כל הסוגים</option>${types.map(t=>`<option>${esc(t)}</option>`).join('')}</select>
      <select name="format"><option value="">כל הצורות</option>${formats.map(t=>`<option>${esc(t)}</option>`).join('')}</select>
      <select name="age"><option value="">כל הגילאים</option>${ages.map(t=>`<option>${esc(t)}</option>`).join('')}</select>
      <input type="number" name="n" min="1" placeholder="מספר משתתפות" style="width:150px">
      <label class="check" style="display:flex;align-items:center;gap:6px"><input type="checkbox" name="noequip"> בלי ציוד</label>
    </form>
    <div class="cards" id="gl"></div>
    <div class="box center" style="margin-top:30px"><h3>רוצה משחק עם המילים שלך?</h3><a class="btn btn-gold" href="#/create">ליצירת משחק אישי</a></div>
  </div>`;
};
pages.games.after = () => {
  const f = document.getElementById('gf'), l = document.getElementById('gl');
  const run = () => {
    const v = Object.fromEntries(new FormData(f)); const n = +v.n;
    const res = content('games').filter(g => (!v.q || JSON.stringify(g).includes(v.q)) && (!v.type || g.type===v.type) && (!v.format || (g.format||[]).includes(v.format)) && (!v.age || g.age===v.age) && (!n || (n>=g.min && n<=g.max)) && (!v.noequip || !g.equip));
    l.innerHTML = res.length ? res.map(gameCard).join('') : '<div class="empty">אין משחק שמתאים לכל המסננים. נסי להוריד אחד.</div>';
  };
  f.oninput = run; run();
};

pages.game = ([id]) => {
  const g = findIn('games', id); if(!g) return notFound();
  let play = '';
  if(g.words) play = `<a class="btn btn-gold" href="#/create/${g.creator||(g.id.startsWith('bingo')?'bingo':g.id.startsWith('memory')?'memory':'elias')}?d=${enc({title:g.title, words:g.words.join('\n'), size:g.size||5, count:10})}"> להדפסה / לשחק על המסך</a>`;
  if(g.quartets) play = `<a class="btn btn-gold" href="#/create/quartets?d=${enc({title:g.title, groups:g.quartets.map(q=>q.t+': '+q.i.join(', ')).join('\n')})}"> להדפסת הקלפים</a>`;
  if(g.qa) play = `<button class="btn btn-gold" id="triviaPlay"> מצב הקרנה</button>`;
  return pageHead(esc(g.title), esc(g.short), `<a href="#/games">משחקים</a> › ${esc(g.title)}`) + `
  <div class="wrap detail">
    <div>
      <div class="box"><h2>איך משחקים?</h2><p>${esc(g.how)}</p><div class="btn-row">${play}<button class="btn btn-light" id="printHow">הדפסת ההוראות</button><button class="btn btn-light" data-fav="games|${esc(g.id)}">${isFav('games',g.id)?'♥':'♡'} שמירה</button><button class="btn btn-light" id="share"> שיתוף</button></div></div>
      ${g.qa?`<div class="box"><h3>השאלות</h3><ol>${g.qa.map(([q,a])=>`<li>${esc(q)} <span class="muted">– ${esc(a)}</span></li>`).join('')}</ol></div>`:''}
      ${g.words?`<div class="box"><h3>המילים במשחק</h3><div class="tags">${g.words.map(w=>`<span class="tag">${esc(w)}</span>`).join('')}</div></div>`:''}
    </div>
    <aside class="box"><ul class="meta-list"><li><span>סוג</span><b>${esc(g.type)}</b></li><li><span>משתתפות</span><b>${esc(g.min)}–${esc(g.max)}</b></li><li><span>גיל</span><b>${esc(g.age)}</b></li><li><span>זמן</span><b>${esc(g.time)}</b></li><li><span>ציוד</span><b>${g.equip?'צריך':'לא צריך'}</b></li></ul></aside>
  </div>`;
};
pages.game.after = ([id]) => {
  const g = findIn('games', id); if(!g) return;
  document.getElementById('share').onclick = () => copyLink('#/game/'+g.id);
  document.getElementById('printHow').onclick = () => printHTML(`<div class="sheet" style="aspect-ratio:auto"><h1 style="text-align:center">${esc(g.title)}</h1><p style="font-size:1.2rem">${esc(g.how)}</p>${g.qa?`<ol>${g.qa.map(([q,a])=>`<li>${esc(q)} – <b>${esc(a)}</b></li>`).join('')}</ol>`:''}<p style="text-align:center;margin-top:40px;color:#c49a45">מדליק · כל מה שצריך לערב לביבות</p></div>`);
  const t = document.getElementById('triviaPlay');
  if(t) t.onclick = () => {
    let i = 0, showA = false;
    const ov = overlay(); const draw = () => { const [q,a] = g.qa[i]; ov.body.innerHTML = `<p>שאלה ${i+1} מתוך ${g.qa.length}</p><div class="big-card" style="font-size:clamp(1.4rem,4vw,2.4rem)">${esc(showA?a:q)}</div><div class="btn-row"><button class="btn btn-light" data-a="prev">הקודמת</button><button class="btn btn-gold" data-a="ans">${showA?'לשאלה':'הצגת תשובה'}</button><button class="btn btn-light" data-a="next">הבאה</button></div>`; };
    ov.body.onclick = e => { const a = e.target.dataset.a; if(a==='ans') showA=!showA; if(a==='next'&&i<g.qa.length-1){i++;showA=false;} if(a==='prev'&&i>0){i--;showA=false;} draw(); };
    draw();
  };
};

function overlay(){
  const el = document.createElement('div'); el.className = 'overlay';
  el.innerHTML = '<button class="close-x" aria-label="סגירה">×</button><div class="ov-body" style="display:flex;flex-direction:column;align-items:center"></div>';
  document.body.appendChild(el);
  const close = () => { el.remove(); clearInterval(el._t); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if(e.key==='Escape') close(); };
  document.addEventListener('keydown', onKey);
  el.querySelector('.close-x').onclick = close;
  return {el, body: el.querySelector('.ov-body'), close};
}

/* יצירת משחקים */
const gPalettes = [{c:'#0b2a55',bg:'#fbf1dc'},{c:'#1a56b0',bg:'#e8f0fb'},{c:'#ff6a00',bg:'#fff1e3'},{c:'#071a38',bg:'#ffd9b8'},{c:'#1a56b0',bg:'#fbf1dc'},{c:'#c24e00',bg:'#fbf1dc'}];
const creatorDefaults = {
  elias:{title:'אליאס חנוכה', words:'סביבון\nלביבה\nסופגנייה\nחנוכייה\nשמש\nפך שמן\nמכבים\nנס\nדמי חנוכה\nריבה\nמחבת\nגפרור'},
  quartets:{title:'רביעיות שלנו', groups:'מאכלי חנוכה: לביבה, סופגנייה, גביבה, פשטידה\nאותיות הסביבון: נ, ג, ה, ש\nבהדלקת נרות: שמש, גפרור, פתילה, שמן'},
  bingo:{title:'בינגו חנוכה', words:D.games.find(g=>g.id==='bingo-hanukkah').words.join('\n'), count:10, size:5},
  whoami:{title:'מי אני?', words:'יהודה המכבי\nסביבון\nסופגנייה\nהשמש\nפך השמן\nאנטיוכוס\nחנוכייה\nלביבה'},
  cards:{title:'כרטיסיות שאלות', words:'מה הזיכרון הכי מתוק שלך מחנוכה?\nאיזה מילוי סופגנייה את הכי אוהבת?\nאם היית נר – איזה נר היית?\nמה מדליק לך את הלב?\nמה המסורת המשפחתית שלכן בחנוכה?\nאיזה שיר חנוכה את הכי אוהבת?'},
  memory:{title:'זיכרון חנוכה', words:'סביבון\nלביבה\nסופגנייה\nחנוכייה\nשמש\nפך שמן\nמכבים\nנר'},
  wordsearch:{title:'תפזורת חנוכה', words:'סביבון\nלביבה\nסופגניה\nחנוכיה\nשמש\nמכבים\nשמן\nנס', size:12}
};
pages.create = () => pageHead('יצירת משחק אישי', 'בוחרות סוג משחק, מכניסות מילים – ומקבלות משחק מעוצב להדפסה, לשיתוף או לשחק ישר באתר. הכול בחינם.', 'יצירת משחק') + `<div class="wrap"><div class="cards">${D.creators.map(creatorCard).join('')}</div></div>`;

function getGameState(type, q){
  const s = Object.assign({palette:0, font:'frank'}, creatorDefaults[type], q.d ? dec(q.d) : {});
  return s;
}
pages.creator = ([type], q) => {
  const c = D.creators.find(x=>x.id===type); if(!c) return notFound();
  const s = getGameState(type, q);
  const wordsField = type==='quartets'
    ? `<label>רביעיות <span class="hint">שורה לכל רביעייה: נושא: פריט, פריט, פריט, פריט</span><textarea name="groups" rows="8">${esc(s.groups)}</textarea></label>`
    : `<label>${type==='cards'?'שאלות':'מילים'} <span class="hint">אחת בכל שורה</span><textarea name="words" rows="10">${esc(s.words)}</textarea></label>`;
  return pageHead(esc(c.title), esc(c.text), `<a href="#/create">יצירת משחק</a> › ${esc(c.title)}`) + `
  <div class="wrap builder">
    <form class="box form builder-panel" id="cf">
      <label>כותרת<input name="title" value="${esc(s.title)}"></label>
      ${wordsField}
      ${type==='bingo'?`<div class="two-col"><label>מספר לוחות<input type="number" name="count" min="1" max="200" value="${esc(s.count)}"></label><label>גודל<select name="size"><option value="4" ${s.size==4?'selected':''}>4×4</option><option value="5" ${s.size==5?'selected':''}>5×5</option></select></label></div>`:''}
      ${type==='wordsearch'?`<label>גודל הלוח<select name="size">${[10,12,14].map(n=>`<option ${s.size==n?'selected':''}>${n}</option>`).join('')}</select></label>`:''}
      <div><b>צבעים</b><div class="swatches">${gPalettes.map((p,i)=>`<button type="button" class="swatch ${s.palette==i?'on':''}" data-pal="${i}" style="background:linear-gradient(135deg,${p.c} 50%,${p.bg} 50%)" aria-label="צבע ${i+1}"></button>`).join('')}</div></div>
      <label>גופן<select name="font">${D.fonts.map(f=>`<option value="${f.id}" ${s.font===f.id?'selected':''}>${f.name}</option>`).join('')}</select></label>
      <div class="btn-row">
        <button type="button" class="btn btn-gold" id="doPrint"> הדפסה / PDF</button>
        ${['elias','memory','cards'].includes(type)?'<button type="button" class="btn" id="doPlay"> לשחק על המסך</button>':''}
        <button type="button" class="btn btn-light" id="doShare"> קישור לשיתוף</button>
        <button type="button" class="btn btn-light" id="doSave">♡ שמירה</button>
      </div>
      <p class="hint">להורדה כ-PDF: בחלון ההדפסה בחרי "שמירה כ-PDF".</p>
    </form>
    <div class="preview-area" id="pv"></div>
  </div>`;
};
pages.creator.after = ([type], q) => {
  const f = document.getElementById('cf'), pv = document.getElementById('pv');
  const s = getGameState(type, q);
  let cache = null; // כדי שהבינגו/תפזורת לא יתערבבו בכל הקלדה
  const read = () => { const v = Object.fromEntries(new FormData(f)); Object.assign(s, v); return s; };
  const draw = (reshuffle) => { read(); if(reshuffle || !cache) cache = null; pv.innerHTML = renderGame(type, s, cache || (cache = {})); };
  f.oninput = () => draw(false);
  f.onclick = e => { const b = e.target.closest('[data-pal]'); if(!b) return; s.palette = +b.dataset.pal; f.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('on', x===b)); draw(false); };
  draw(true);
  const link = () => { read(); return `#/create/${type}?d=${enc(s)}`; };
  document.getElementById('doPrint').onclick = () => printHTML(pv.innerHTML);
  document.getElementById('doShare').onclick = () => copyLink(link());
  document.getElementById('doSave').onclick = () => { store.push('saved', {kind:'משחק', title:s.title, link:link()}); toast('נשמר באזור האישי ♡'); };
  const play = document.getElementById('doPlay');
  if(play) play.onclick = () => { read(); type==='memory' ? playMemory(lines(s.words)) : playCards(lines(s.words), type==='elias'); };
};

function gameVars(s){ const p = gPalettes[s.palette||0], fnt = (D.fonts.find(x=>x.id===s.font)||D.fonts[0]).css; return `--gc1:${p.c};--gbg:${p.bg};--gf:${fnt}`; }
function renderGame(type, s, cache){
  const v = gameVars(s), title = `<div class="sheet-title">${esc(s.title)}</div>`, foot = '<small>מדליק</small>';
  const sheets = (items, per, cols, cellFn) => chunk(items, per).map(pg=>`<div class="sheet" style="${v}">${title}<div class="g-cards" style="grid-template-columns:repeat(${cols},1fr)">${pg.map(cellFn).join('')}</div></div>`).join('') || '<div class="empty">הכניסי מילים כדי לראות תצוגה</div>';
  const words = lines(s.words);
  if(type==='elias' || type==='cards') return sheets(words, 12, 3, w=>`<div class="g-card" style="${type==='cards'?'font-size:1rem':''}">${esc(w)}${foot}</div>`);
  if(type==='whoami') return sheets(words, 4, 2, w=>`<div class="g-card" style="font-size:2rem;aspect-ratio:1/1.1">${esc(w)}${foot}</div>`);
  if(type==='memory') return sheets(words.flatMap(w=>[w,w]), 12, 3, w=>`<div class="g-card">${esc(w)}${foot}</div>`);
  if(type==='quartets'){
    const groups = lines(s.groups).map(l=>{ const [t,rest] = l.includes(':') ? [l.slice(0,l.indexOf(':')), l.slice(l.indexOf(':')+1)] : ['רביעייה', l]; return {t:t.trim(), i:rest.split(',').map(x=>x.trim()).filter(Boolean).slice(0,4)}; }).filter(g=>g.i.length);
    const cards = groups.flatMap(g=>g.i.map(me=>({g,me})));
    return sheets(cards, 9, 3, ({g,me})=>`<div class="g-card"><span class="q-title">${esc(g.t)}</span><div style="font-size:1.3rem;margin-bottom:6px">${esc(me)}</div><ul>${g.i.map(x=>`<li class="${x===me?'me':''}">${esc(x)}</li>`).join('')}</ul>${foot}</div>`);
  }
  if(type==='bingo'){
    const n = +s.size||5, need = n*n - (n===5?1:0), count = Math.min(200, Math.max(1, +s.count||1));
    if(words.length < need) return `<div class="empty">לבינגו ${n}×${n} צריך לפחות ${need} מילים. יש כרגע ${words.length}.</div>`;
    if(!cache.boards || cache.key !== words.join()+n+count){ cache.key = words.join()+n+count; cache.boards = Array.from({length:count}, ()=>shuffle(words).slice(0,need)); }
    return cache.boards.map((b,bi)=>{ const cells = b.slice(); if(n===5) cells.splice(12,0,'★'); return `<div class="sheet" style="${v};--n:${n}">${title}<div class="bingo">${cells.map((c,i)=>`<div class="${n===5&&i===12?'free':''}">${esc(c)}</div>`).join('')}</div><p style="text-align:center;color:var(--gc1)">לוח מספר ${bi+1}</p></div>`; }).join('');
  }
  if(type==='wordsearch'){
    const n = +s.size||12, ws = words.map(w=>w.replace(/\s/g,'')).filter(w=>w.length<=n);
    if(!cache.grid || cache.key !== ws.join()+n){ cache.key = ws.join()+n; cache.grid = makeWordSearch(ws, n); }
    return `<div class="sheet" style="${v};--n:${n}">${title}<div class="ws-grid">${cache.grid.flat().map(ch=>`<div>${esc(ch)}</div>`).join('')}</div><div class="ws-words">${ws.map(w=>`<span>${esc(w)}</span>`).join('')}</div></div>`;
  }
  return '';
}
function makeWordSearch(words, n){
  const g = Array.from({length:n}, ()=>Array(n).fill(''));
  const dirs = [[0,1],[1,0],[1,1]];
  words.slice().sort((a,b)=>b.length-a.length).forEach(w=>{
    for(let t=0;t<200;t++){
      const [dr,dc] = dirs[Math.floor(Math.random()*dirs.length)];
      const r = Math.floor(Math.random()*(n-(dr?w.length-1:0))), c = Math.floor(Math.random()*(n-(dc?w.length-1:0)));
      let ok = true; for(let i=0;i<w.length;i++){ const x = g[r+dr*i][c+dc*i]; if(x && x!==w[i]){ ok=false; break; } }
      if(ok){ for(let i=0;i<w.length;i++) g[r+dr*i][c+dc*i] = w[i]; break; }
    }
  });
  const abc = 'אבגדהוזחטיכלמנסעפצקרשת';
  return g.map(row=>row.map(ch=>ch || abc[Math.floor(Math.random()*abc.length)]));
}
function playCards(words, timed){
  if(!words.length) return toast('אין מילים');
  let deck = shuffle(words), i = 0, score = 0, sec = 60;
  const ov = overlay();
  const draw = () => {
    if(i >= deck.length){ ov.body.innerHTML = `<div class="big-card">סיימנו! <br>${timed?score+' נקודות':''}</div><div class="btn-row"><button class="btn btn-gold" data-a="again">שוב</button></div>`; clearInterval(ov.el._t); return; }
    ov.body.innerHTML = `${timed?`<div class="timer">${sec}</div><p>נקודות: ${score}</p>`:`<p>${i+1} / ${deck.length}</p>`}<div class="big-card">${esc(deck[i])}</div><div class="btn-row">${timed?'<button class="btn btn-gold" data-a="ok">✔ ניחשו</button><button class="btn btn-light" data-a="skip">דילוג</button><button class="btn btn-light" data-a="reset">טיימר מחדש</button>':'<button class="btn btn-gold" data-a="skip">הבא ←</button>'}</div>`;
  };
  ov.body.onclick = e => { const a = e.target.dataset.a; if(!a) return;
    if(a==='ok'){ score++; i++; } if(a==='skip') i++;
    if(a==='reset'){ sec = 60; } if(a==='again'){ deck = shuffle(words); i=0; score=0; sec=60; startT(); }
    draw(); };
  const startT = () => { if(!timed) return; clearInterval(ov.el._t); ov.el._t = setInterval(()=>{ sec--; const t = ov.body.querySelector('.timer'); if(t) t.textContent = sec; if(sec<=0){ clearInterval(ov.el._t); ov.body.innerHTML = `<div class="big-card"> נגמר הזמן!<br>${score} נקודות</div><div class="btn-row"><button class="btn btn-gold" data-a="again">סבב נוסף</button></div>`; } }, 1000); };
  draw(); startT();
}
function playMemory(words){
  if(words.length < 2) return toast('צריך לפחות 2 מילים');
  const deck = shuffle(words.slice(0,12).flatMap((w,i)=>[{w,i},{w,i}]));
  const ov = overlay(); let open = [], moves = 0, done = 0;
  ov.body.innerHTML = `<p id="memInfo">מהלכים: 0</p><div class="mem-grid">${deck.map((c,k)=>`<div class="mem-card" data-k="${k}">${esc(c.w)}</div>`).join('')}</div>`;
  ov.body.onclick = e => {
    const el = e.target.closest('.mem-card'); if(!el || el.classList.contains('open') || el.classList.contains('done') || open.length===2) return;
    el.classList.add('open'); open.push(el);
    if(open.length===2){ moves++; ov.body.querySelector('#memInfo').textContent = 'מהלכים: '+moves;
      const [a,b] = open;
      if(deck[a.dataset.k].i === deck[b.dataset.k].i){ a.classList.add('done'); b.classList.add('done'); open = []; done += 2; if(done===deck.length) setTimeout(()=>{ ov.body.querySelector('#memInfo').textContent = `כל הכבוד!  סיימת ב-${moves} מהלכים`; }, 300); }
      else setTimeout(()=>{ a.classList.remove('open'); b.classList.remove('open'); open = []; }, 900);
    }
  };
}

/* סטודיו מיתוג */
pages.studio = () => pageHead('סטודיו מיתוג', 'בוחרות תבנית, כותבות את הפרטים – והעיצוב מתעדכן מיד. אפשר להוסיף לוגו ולהוריד להדפסה. הכול בחינם.', 'סטודיו מיתוג') + `<div class="wrap"><div class="cards">${D.templates.map(tplCard).join('')}</div></div>`;

pages.design = ([id], q) => {
  const t = D.templates.find(x=>x.id===id); if(!t) return notFound();
  const s = Object.assign({theme:'gold-blue', font:'frank', deco:'✦'}, t.fields, q.d?dec(q.d):{});
  const fl = {pre:'שורה עליונה', title:'כותרת', sub:'תת־כותרת', body:'פרטים', foot:'שורה תחתונה'};
  return pageHead(esc(t.title), 'משלימות את הפרטים, בוחרות צבעים – ומורידות.', `<a href="#/studio">סטודיו</a> › ${esc(t.title)}`) + `
  <div class="wrap builder">
    <form class="box form builder-panel" id="df">
      ${Object.keys(fl).map(k=> (k==='body' ? `<label>${fl[k]}<textarea name="body" rows="5">${esc(s.body)}</textarea></label>` : `<label>${fl[k]}<input name="${k}" value="${esc(s[k])}"></label>`)).join('')}
      <div><b>ערכת צבעים</b><div class="swatches">${D.themes.map(th=>`<button type="button" class="swatch ${s.theme===th.id?'on':''}" data-theme="${th.id}" title="${th.name}" style="background:linear-gradient(135deg,${th.bg} 55%,${th.acc} 55%)"></button>`).join('')}</div></div>
      <div class="two-col">
        <label>גופן<select name="font">${D.fonts.map(f=>`<option value="${f.id}" ${s.font===f.id?'selected':''}>${f.name}</option>`).join('')}</select></label>
        <label>קישוט<select name="deco">${D.decos.map(d=>`<option ${s.deco===d?'selected':''} value="${d}">${d||'בלי'}</option>`).join('')}</select></label>
      </div>
      <label>לוגו או תמונה <span class="hint">לא חובה</span><input type="file" accept="image/*" id="logoIn"></label>
      <div class="btn-row">
        <button type="button" class="btn btn-gold" id="dPrint"> הדפסה / PDF</button>
        <button type="button" class="btn" id="dPng"> הורדה כתמונה</button>
        <button type="button" class="btn btn-light" id="dShare"> שיתוף</button>
        <button type="button" class="btn btn-light" id="dSave">♡ שמירה</button>
      </div>
      <p class="hint">${t.repeat?'בהדפסה הדף יתמלא בכמה עותקים, מוכנים לגזירה.':'להורדה כ-PDF: בחלון ההדפסה בחרי "שמירה כ-PDF".'} הלוגו לא נשמר בקישור השיתוף.</p>
    </form>
    <div class="preview-area" id="dv" style="display:flex;align-items:center;justify-content:center"></div>
  </div>`;
};
pages.design.after = ([id], q) => {
  const t = D.templates.find(x=>x.id===id); if(!t) return;
  const f = document.getElementById('df'), dv = document.getElementById('dv');
  const s = Object.assign({theme:'gold-blue', font:'frank', deco:'✦'}, t.fields, q.d?dec(q.d):{});
  let logo = '';
  const read = () => Object.assign(s, Object.fromEntries(new FormData(f)));
  const one = () => designHTML(t, s, logo);
  const draw = () => { read(); dv.innerHTML = one(); const d = dv.firstElementChild; const sc = Math.min(1, (dv.clientWidth-40)/d.offsetWidth); d.style.zoom = sc; };
  f.oninput = draw;
  f.onclick = e => { const b = e.target.closest('[data-theme]'); if(!b) return; s.theme = b.dataset.theme; f.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('on', x===b)); draw(); };
  document.getElementById('logoIn').onchange = e => { const file = e.target.files[0]; if(!file) return; if(file.size > 5e6) return toast('הקובץ גדול מדי (עד 5MB)'); const r = new FileReader(); r.onload = () => { logo = r.result; draw(); }; r.readAsDataURL(file); };
  const onResize = () => document.body.contains(f) ? draw() : window.removeEventListener('resize', onResize);
  window.addEventListener('resize', onResize);
  draw();
  document.getElementById('dPrint').onclick = () => {
    if(!t.repeat) return printHTML(one());
    const cols = Math.max(1, Math.floor(190/(t.w+4))), rows = Math.max(1, Math.floor(277/(t.h+4)));
    printHTML(`<div class="sheet-labels" style="grid-template-columns:repeat(${cols},${t.w}mm)">${Array(cols*rows).fill(one()).join('')}</div>`);
  };
  document.getElementById('dShare').onclick = () => { read(); copyLink(`#/studio/${t.id}?d=${enc(s)}`); };
  document.getElementById('dSave').onclick = () => { read(); store.push('saved', {kind:'עיצוב', title:t.title+' – '+s.title, link:`#/studio/${t.id}?d=${enc(s)}`}); toast('נשמר באזור האישי ♡'); };
  document.getElementById('dPng').onclick = () => {
    const go = () => { const d = dv.firstElementChild; const z = d.style.zoom; d.style.zoom = 1;
      window.html2canvas(d, {scale:3, backgroundColor:null}).then(cv=>{ d.style.zoom = z; const a = document.createElement('a'); a.download = 'madlik-'+t.id+'.png'; a.href = cv.toDataURL('image/png'); a.click(); }); };
    if(window.html2canvas) return go();
    toast('מכינה את התמונה...');
    const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; sc.onload = go; sc.onerror = () => toast('לא הצלחתי לטעון – נסי הדפסה ל-PDF'); document.head.appendChild(sc);
  };
};
function designHTML(t, s, logo){
  const th = D.themes.find(x=>x.id===s.theme)||D.themes[0], fnt = (D.fonts.find(x=>x.id===s.font)||D.fonts[0]).css;
  const fs = Math.min(t.w, t.h)/32, small = Math.min(t.w,t.h) < 80;
  return `<div class="design ${t.round?'round':''}" style="width:${t.w}mm;height:${t.h}mm;font-size:${fs*(small?1.6:1)}mm;--d-bg:${th.bg};--d-ink:${th.ink};--d-title:${th.title};--d-acc:${th.acc};--d-font:${fnt};--d-r:${t.round?'50%':'6px'}">
    <div class="d-frame"></div>
    ${logo?`<img class="d-logo" src="${logo}" alt="">`:(s.deco&&!small?`<div class="d-deco">${esc(s.deco)}</div>`:'')}
    ${s.pre?`<div class="d-pre">${esc(s.pre)}</div>`:''}
    <div class="d-title">${esc(s.title)}</div>
    ${s.sub?`<div class="d-sub">${esc(s.sub)}</div>`:''}
    ${s.body&&!small?`<div class="d-body">${esc(s.body)}</div>`:''}
    ${s.foot&&!small?`<div class="d-foot">${esc(s.foot)}</div>`:''}
  </div>`;
}

/* מתכונים */
pages.recipes = () => {
  const cats = [...new Set(content('recipes').map(r=>r.cat))];
  return pageHead('מתכונים לערב לביבות', 'לביבות, סופגניות, מגשי אירוח ושתייה – עם חישוב כמויות לפי מספר הסועדות.', 'מתכונים') + `
  <div class="wrap"><form class="filters" id="rf" onsubmit="return false"><input type="search" name="q" placeholder="חיפוש מתכון או מצרך..."><select name="cat"><option value="">כל הקטגוריות</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select><select name="diet"><option value="">חלבי / פרווה</option><option>חלבי</option><option>פרווה</option><option>בשרי</option></select><select name="level"><option value="">כל הרמות</option><option>קל</option><option>בינוני</option><option>מאתגר</option></select></form><div class="cards" id="rl"></div></div>`;
};
pages.recipes.after = () => { const f = document.getElementById('rf'), l = document.getElementById('rl'); const run = () => { const v = Object.fromEntries(new FormData(f)); const res = content('recipes').filter(r=>(!v.q||JSON.stringify(r).includes(v.q))&&(!v.cat||r.cat===v.cat)&&(!v.diet||r.diet===v.diet)&&(!v.level||r.level===v.level)); l.innerHTML = res.length?res.map(recipeCard).join(''):'<div class="empty">לא נמצא מתכון.</div>'; }; f.oninput = run; run(); };

function fmtQty(n){
  if(!n) return '';
  const whole = Math.floor(n), frac = n - whole, map = [[0,''],[.25,'¼'],[.33,'⅓'],[.5,'½'],[.66,'⅔'],[.75,'¾'],[1,'']];
  let best = map[0]; map.forEach(m=>{ if(Math.abs(frac-m[0]) < Math.abs(frac-best[0])) best = m; });
  if(n >= 10) return String(Math.round(n));
  const w = whole + (best[0]===1?1:0);
  return (w? w : '') + best[1] || '0';
}
pages.recipe = ([id]) => {
  const r = findIn('recipes', id); if(!r) return notFound();
  return pageHead(esc(r.title), '', `<a href="#/recipes">מתכונים</a> › ${esc(r.title)}`) + `
  <div class="wrap detail">
    <div>
      <div class="box"><h2>מצרכים</h2>
        <div class="servings">מספר סועדות: <button id="sMinus" aria-label="פחות">−</button><strong id="sNum">${r.serves}</strong><button id="sPlus" aria-label="יותר">+</button></div>
        <ul class="ing-list" id="ing"></ul>
        <div class="btn-row"><button class="btn btn-gold" id="toShop"> הוספה לרשימת הקניות</button></div>
      </div>
      <div class="box"><h2>אופן ההכנה</h2><ol class="steps">${r.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>
    </div>
    <aside><div class="box"><ul class="meta-list"><li><span>זמן הכנה</span><b>${esc(r.time)} דק׳</b></li><li><span>רמת קושי</span><b>${esc(r.level)}</b></li><li><span>כשרות</span><b>${esc(r.diet)}</b></li><li><span>קטגוריה</span><b>${esc(r.cat)}</b></li></ul>
      <div class="btn-row"><button class="btn btn-light" data-fav="recipes|${esc(r.id)}">${isFav('recipes',r.id)?'♥':'♡'} מועדפים</button><button class="btn btn-light" id="rPrint"> הדפסה</button><button class="btn btn-light" id="rShare"> שיתוף</button></div></div>
      ${r.credit?`<div class="box"> המתכון נשלח על ידי ${esc(r.credit)}</div>`:''}</aside>
  </div>`;
};
pages.recipe.after = ([id]) => {
  const r = findIn('recipes', id); if(!r) return;
  let n = r.serves; const ing = document.getElementById('ing'), num = document.getElementById('sNum');
  const list = () => r.ing.map(([q,u,name])=>`${fmtQty(q*n/r.serves)} ${u} ${name}`.trim());
  const draw = () => { num.textContent = n; ing.innerHTML = list().map(x=>`<li>${esc(x)}</li>`).join(''); };
  document.getElementById('sMinus').onclick = () => { if(n>1){ n--; draw(); } };
  document.getElementById('sPlus').onclick = () => { n++; draw(); };
  document.getElementById('toShop').onclick = () => { const s = store.get('shop', []); list().forEach(x=>s.push({t:x, from:r.title, done:false})); store.set('shop', s); toast('נוסף לרשימת הקניות באזור האישי '); };
  document.getElementById('rShare').onclick = () => copyLink('#/recipe/'+r.id);
  document.getElementById('rPrint').onclick = () => printHTML(`<div class="sheet" style="aspect-ratio:auto"><h1>${esc(r.title)}</h1><p>${n} סועדות · ${esc(r.time)} דק׳ · ${esc(r.level)}</p><h2>מצרכים</h2><ul>${list().map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h2>אופן ההכנה</h2><ol>${r.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p style="color:#c49a45;text-align:center">מדליק · כל מה שצריך לערב לביבות</p></div>`);
  draw();
};

/* השראה */
pages.ideas = () => {
  const cats = [...new Set(content('ideas').map(x=>x.cat))];
  return pageHead('השראה ורעיונות', 'עיצוב שולחן, מתנות ומזכרות, הקרנה, מגשי אירוח וטיפים למארגנות.', 'השראה') + `<div class="wrap"><div class="chips" id="ic"><button class="chip on" data-c="">הכול</button>${cats.map(c=>`<button class="chip" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div><div class="cards" id="il"></div><div class="box center" style="margin-top:30px"><h3>יש לך רעיון או תמונה?</h3><a class="btn btn-gold" href="#/submit">שלחי לנו</a></div></div>`;
};
pages.ideas.after = () => { const c = document.getElementById('ic'), l = document.getElementById('il'); const run = cat => { l.innerHTML = content('ideas').filter(x=>!cat||x.cat===cat).map(ideaCard).join(''); }; c.onclick = e => { const b = e.target.closest('.chip'); if(!b) return; c.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on', x===b)); run(b.dataset.c); }; run(''); };

/* ספקים */
pages.suppliers = () => {
  const all = content('suppliers'), cats = [...new Set(all.map(s=>s.cat))], regions = ['צפון','חיפה','שרון','מרכז','ירושלים','שפלה','דרום'];
  return pageHead('ספקים ונותני שירות', 'אולמות, קייטרינג, מפעילות, עיצוב וקינוחים – לפי אזור, סוג ומחיר.', 'ספקים') + `
  <div class="wrap"><form class="filters" id="sf" onsubmit="return false"><input type="search" name="q" placeholder="חיפוש ספק..."><select name="cat"><option value="">כל סוגי השירות</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select><select name="region"><option value="">כל הארץ</option>${regions.map(c=>`<option>${c}</option>`).join('')}</select><select name="price"><option value="">כל טווחי המחיר</option><option>₪</option><option>₪₪</option><option>₪₪₪</option></select></form>
  <div class="cards" id="sl"></div>
  <div class="box center" style="margin-top:30px"><h3>יש לך עסק לערבי חנוכה?</h3><p class="muted">הגיעי לאלפי מארגנות ערבי לביבות.</p><a class="btn btn-gold" href="#/advertise">לפרסום באתר</a></div></div>`;
};
pages.suppliers.after = () => { const f = document.getElementById('sf'), l = document.getElementById('sl'); const run = () => { const v = Object.fromEntries(new FormData(f)); const res = content('suppliers').filter(s=>(!v.q||JSON.stringify(s).includes(v.q))&&(!v.cat||s.cat===v.cat)&&(!v.region||s.region===v.region)&&(!v.price||s.price===v.price)).sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)); l.innerHTML = res.length?res.map(supCard).join(''):'<div class="empty">אין עדיין ספקים שמתאימים. נסי אזור אחר.</div>'; }; f.oninput = run; run(); };

pages.supplier = ([id]) => {
  const s = findIn('suppliers', id); if(!s) return notFound();
  return pageHead(esc(s.name), esc(s.text), `<a href="#/suppliers">ספקים</a> › ${esc(s.name)}`) + `
  <div class="wrap detail">
    <div class="box"><h2>שליחת פנייה</h2>
      <form class="form" id="lf"><div class="two-col"><label>שם<input name="name" required></label><label>טלפון<input name="phone" type="tel" required></label></div><label>מייל<input name="email" type="email"></label><div class="two-col"><label>תאריך האירוע<input name="date" type="date"></label><label>מספר משתתפות<input name="count" type="number" min="1"></label></div><label>פרטים<textarea name="msg"></textarea></label><button class="btn btn-gold">שליחה</button></form>
    </div>
    <aside class="box"><ul class="meta-list"><li><span>תחום</span><b>${esc(s.cat)}</b></li><li><span>אזור</span><b>${esc(s.region)}</b></li><li><span>מחיר</span><b>${esc(s.price)}</b></li><li><span>טלפון</span><b><a href="tel:${esc(s.phone)}">${esc(s.phone)}</a></b></li><li><span>מייל</span><b><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></b></li></ul><div class="btn-row"><button class="btn btn-light" data-fav="suppliers|${esc(s.id)}">${isFav('suppliers',s.id)?'♥':'♡'} שמירה</button></div></aside>
  </div>`;
};
pages.supplier.after = ([id]) => { const f = document.getElementById('lf'); if(!f) return; f.onsubmit = e => { e.preventDefault(); store.push('leads', Object.assign({supplier:findIn('suppliers',id).name}, Object.fromEntries(new FormData(f)))); f.reset(); toast('הפנייה נשלחה! הספק יחזור אלייך בהקדם'); }; };

pages.advertise = () => pageHead('פרסום במדליק', 'מארגנות ערבי לביבות מחפשות כאן אולמות, קייטרינג, מפעילות ועוד. בואי שימצאו אותך.', 'פרסום') + `
  <div class="wrap">
    <div class="cards" style="margin-bottom:24px">
      ${[['','כרטיס עסק','כרטיס מעוצב עם תמונות, פרטי קשר וטופס פנייה, במדור הספקים.'],['','כרטיס מומלץ','מופיע ראשון במדור ובתג "מומלץ".'],['','בעמוד הבית','חשיפה בולטת במדור "ספקים מומלצים" בעמוד הבית.'],['','כתבת תוכן','כתבה או טיפ ממומן במדור ההשראה, עם קישור לעסק.']].map(([i,t,x])=>`<div class="card"><div class="card-top">${art({title:t})}</div><div class="card-body"><h3>${t}</h3><p>${x}</p></div></div>`).join('')}
    </div>
    <div class="box"><h2>השאירי פרטים ונחזור אלייך</h2>
      <form class="form" id="af"><div class="two-col"><label>שם העסק<input name="biz" required></label><label>איש/אשת קשר<input name="name" required></label></div><div class="two-col"><label>טלפון<input name="phone" type="tel" required></label><label>מייל<input name="email" type="email"></label></div><div class="two-col"><label>תחום<input name="cat" placeholder="למשל: קייטרינג"></label><label>אזור<input name="region"></label></div><label>איזה פרסום מעניין אותך?<select name="pkg"><option>כרטיס עסק</option><option>כרטיס מומלץ</option><option>בעמוד הבית</option><option>כתבת תוכן</option><option>עוד לא יודעת</option></select></label><label>על העסק<textarea name="msg"></textarea></label><button class="btn btn-gold">שליחה</button></form>
    </div>
  </div>`;
pages.advertise.after = () => { const f = document.getElementById('af'); f.onsubmit = e => { e.preventDefault(); store.push('ads', Object.fromEntries(new FormData(f))); f.reset(); toast('תודה! נחזור אלייך בקרוב'); }; };

pages.submit = () => pageHead('שליחת רעיון', 'משחק, מתכון, רעיון לעיצוב או טיפ – אחרי אישור הוא יעלה לאתר, ואם תרצי נכתוב את שמך.', 'שליחת רעיון') + `
  <div class="wrap"><div class="box"><form class="form" id="sbf">
    <label>קטגוריה<select name="cat"><option>משחק</option><option>מתכון</option><option>עיצוב שולחן</option><option>מתנות ומזכרות</option><option>טיפים למארגנות</option><option>אחר</option></select></label>
    <label>כותרת<input name="title" required></label>
    <label>התוכן<textarea name="text" required placeholder="תארי את הרעיון, איך משחקים, המצרכים..."></textarea></label>
    <div class="two-col"><label>שם<input name="name"></label><label>מייל<input name="email" type="email"></label></div>
    <label class="check"><input type="checkbox" name="credit" checked> אשמח שיופיע קרדיט עם השם שלי</label>
    <button class="btn btn-gold">שליחה</button></form></div></div>`;
pages.submit.after = () => { const f = document.getElementById('sbf'); f.onsubmit = e => { e.preventDefault(); store.push('subs', Object.assign({status:'ממתין'}, Object.fromEntries(new FormData(f)))); f.reset(); toast('תודה! הרעיון נשלח לאישור '); }; };

/* אזור אישי */
pages.me = () => {
  const f = favs(), user = store.get('user', null), saved = store.get('saved', []), shop = store.get('shop', []);
  const favList = (k,fn) => (f[k]||[]).map(id=>findIn(k,id)).filter(Boolean).map(fn).join('');
  const all = favList('games',gameCard)+favList('recipes',recipeCard)+favList('ideas',ideaCard)+favList('suppliers',supCard);
  return pageHead('האזור שלי', user?`שלום ${esc(user.name)} `:'כאן נשמרים המועדפים, המשחקים והעיצובים שלך.', 'האזור שלי') + `
  <div class="wrap">
    ${user?'':`<div class="box"><h2>פתיחת אזור אישי</h2><form class="form" id="uf"><div class="two-col"><label>שם<input name="name" required></label><label>מייל<input name="email" type="email" required></label></div><label class="check"><input type="checkbox" name="marketing"> אשמח לקבל במייל משחקים, תבניות ועדכונים חדשים</label><button class="btn btn-gold">פתיחה</button></form></div>`}
    <section class="section"><h2>המועדפים שלי</h2>${all?`<div class="cards">${all}</div>`:'<div class="empty">עוד לא שמרת כלום. לחצי על ♡ ליד משחק, מתכון או ספק.</div>'}</section>
    <section class="box"><h2>משחקים ועיצובים ששמרתי</h2>${saved.length?`<table class="table"><tr><th>סוג</th><th>שם</th><th>נשמר</th><th></th></tr>${saved.map(x=>`<tr><td>${esc(x.kind)}</td><td><a href="${esc(x.link)}">${esc(x.title)}</a></td><td>${esc(x.date)}</td><td><button class="btn btn-sm btn-light" data-del-saved="${esc(x.id)}">מחיקה</button></td></tr>`).join('')}</table>`:'<p class="muted">עוד אין. ביצירת משחק או עיצוב לחצי "שמירה".</p>'}</section>
    <section class="box"><h2> רשימת הקניות</h2>${shop.length?`<ul style="list-style:none;padding:0" id="shopL">${shop.map((x,i)=>`<li><label class="check"><input type="checkbox" data-shop="${i}" ${x.done?'checked':''}> <span style="${x.done?'text-decoration:line-through;opacity:.6':''}">${esc(x.t)}</span> <span class="muted" style="font-size:.85rem">(${esc(x.from)})</span></label></li>`).join('')}</ul><div class="btn-row"><button class="btn btn-light" id="shopPrint"> הדפסה</button><button class="btn btn-light" id="shopClear">ניקוי הרשימה</button></div>`:'<p class="muted">הרשימה ריקה. במתכון לחצי "הוספה לרשימת הקניות".</p>'}</section>
  </div>`;
};
pages.me.after = () => {
  const uf = document.getElementById('uf');
  if(uf) uf.onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(uf)); store.set('user', {name:v.name, email:v.email}); store.push('users', {name:v.name, email:v.email, marketing:v.marketing?'כן':'לא'}); if(v.marketing) subscribe(v.email, 'אזור אישי', v.name); toast('האזור האישי נפתח '); render(); };
  app.onclick = e => {
    const d = e.target.closest('[data-del-saved]'); if(d){ store.set('saved', store.get('saved',[]).filter(x=>x.id!==d.dataset.delSaved)); render(); }
  };
  app.onchange = e => { const c = e.target.closest('[data-shop]'); if(!c) return; const s = store.get('shop',[]); s[c.dataset.shop].done = c.checked; store.set('shop', s); render(); };
  const sp = document.getElementById('shopPrint'); if(sp) sp.onclick = () => printHTML(`<div class="sheet" style="aspect-ratio:auto"><h1>רשימת קניות לערב הלביבות</h1><ul style="font-size:1.2rem;line-height:2">${store.get('shop',[]).map(x=>`<li> ${esc(x.t)}</li>`).join('')}</ul></div>`);
  const sc = document.getElementById('shopClear'); if(sc) sc.onclick = () => { store.set('shop', []); render(); };
};

/* ניהול */
pages.admin = () => {
  if(!sessionStorage.getItem('madlik_admin')) return pageHead('ניהול', '', 'ניהול') + `<div class="wrap"><div class="box" style="max-width:420px;margin:auto"><form class="form" id="loginF"><label>סיסמת ניהול<input type="password" name="p" required></label><button class="btn btn-gold">כניסה</button><p class="hint">בגרסה הזו (הדגמה במחשב שלך) הסיסמה היא: madlik. בשלב הבא תהיה התחברות מאובטחת אמיתית.</p></form></div></div>`;
  const tab = location.hash.split('tab=')[1] || 'subs';
  const tabs = {subs:'רעיונות שנשלחו', leads:'פניות לספקים', ads:'בקשות פרסום', news:'רשימת תפוצה', users:'משתמשות', add:'הוספת תוכן'};
  const tbl = (rows, cols) => rows.length ? `<div style="overflow:auto"><table class="table"><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}<th></th></tr>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c[0]])}</td>`).join('')}<td>${tab==='subs'&&r.status==='ממתין'?`<button class="btn btn-sm btn-gold" data-approve="${esc(r.id)}">אישור ופרסום</button> `:''}<button class="btn btn-sm btn-light" data-del="${tab}|${esc(r.id)}">מחיקה</button></td></tr>`).join('')}</table></div>` : '<div class="empty">אין עדיין נתונים.</div>';
  let body = '';
  if(tab==='subs') body = tbl(store.get('subs',[]), [['date','תאריך'],['cat','קטגוריה'],['title','כותרת'],['text','תוכן'],['name','שם'],['email','מייל'],['status','סטטוס']]);
  if(tab==='leads') body = tbl(store.get('leads',[]), [['date','תאריך'],['supplier','ספק'],['name','שם'],['phone','טלפון'],['email','מייל'],['count','משתתפות'],['msg','פרטים']]);
  if(tab==='ads') body = tbl(store.get('ads',[]), [['date','תאריך'],['biz','עסק'],['name','קשר'],['phone','טלפון'],['pkg','חבילה'],['cat','תחום'],['region','אזור']]);
  if(tab==='news') body = newsTabHTML();
  if(tab==='users') body = tbl(store.get('users',[]), [['date','תאריך'],['name','שם'],['email','מייל'],['marketing','דיוור']]);
  if(tab==='add') body = `<div class="two-col">
    <form class="box form" data-add="suppliers"><h3>ספק חדש</h3><label>שם<input name="name" required></label><div class="two-col"><label>תחום<input name="cat" required></label><label>אזור<select name="region"><option>צפון</option><option>חיפה</option><option>שרון</option><option>מרכז</option><option>ירושלים</option><option>שפלה</option><option>דרום</option></select></label></div><div class="two-col"><label>טלפון<input name="phone"></label><label>מייל<input name="email"></label></div><div class="two-col"><label>מחיר<select name="price"><option>₪</option><option>₪₪</option><option>₪₪₪</option></select></label><label>אייקון<input name="ico" value=""></label></div><label>תיאור<textarea name="text"></textarea></label><label class="check"><input type="checkbox" name="featured"> מומלץ (מופיע בעמוד הבית)</label><button class="btn btn-gold">הוספה</button></form>
    <form class="box form" data-add="games"><h3>משחק חדש</h3><label>שם<input name="title" required></label><div class="two-col"><label>סוג<input name="type" value="מילים"></label><label>גיל<input name="age" value="כל הגילאים"></label></div><div class="two-col"><label>מינימום משתתפות<input type="number" name="min" value="4"></label><label>מקסימום<input type="number" name="max" value="50"></label></div><label>תיאור קצר<input name="short"></label><label>איך משחקים<textarea name="how"></textarea></label><label>מילים (לא חובה, שורה לכל מילה)<textarea name="words"></textarea></label><button class="btn btn-gold">הוספה</button></form>
    <form class="box form" data-add="recipes"><h3>מתכון חדש</h3><label>שם<input name="title" required></label><div class="two-col"><label>קטגוריה<input name="cat" value="לביבות"></label><label>כשרות<select name="diet"><option>פרווה</option><option>חלבי</option><option>בשרי</option></select></label></div><div class="two-col"><label>זמן (דקות)<input type="number" name="time" value="30"></label><label>סועדות<input type="number" name="serves" value="6"></label></div><label>רמה<select name="level"><option>קל</option><option>בינוני</option><option>מאתגר</option></select></label><label>מצרכים <span class="hint">שורה לכל מצרך: כמות | יחידה | שם</span><textarea name="ing" placeholder="2 | כוסות | קמח"></textarea></label><label>שלבי הכנה <span class="hint">שורה לכל שלב</span><textarea name="steps"></textarea></label><button class="btn btn-gold">הוספה</button></form>
    <form class="box form" data-add="ideas"><h3>רעיון / השראה</h3><label>כותרת<input name="title" required></label><label>קטגוריה<select name="cat"><option>עיצוב שולחן</option><option>מתנות ומזכרות</option><option>מגשי אירוח</option><option>הקרנה ומוזיקה</option><option>טיפים למארגנות</option></select></label><label>אייקון<input name="ico" value=""></label><label>תוכן<textarea name="text"></textarea></label><label>קרדיט<input name="credit"></label><button class="btn btn-gold">הוספה</button></form>
  </div>
  <div class="box"><h3>תוכן שהוספת</h3>${['games','recipes','ideas','suppliers'].map(k=>store.get('extra_'+k,[]).map(x=>`<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><span>${esc(x.title||x.name)} <span class="muted">(${k})</span></span><button class="btn btn-sm btn-light" data-del-extra="${k}|${esc(x.id)}">מחיקה</button></div>`).join('')).join('') || '<p class="muted">עוד לא הוספת.</p>'}</div>`;
  return pageHead('ניהול האתר', '', 'ניהול') + `<div class="wrap"><div class="notice" style="margin-bottom:16px">גרסת הדגמה: הנתונים נשמרים רק בדפדפן הזה. כשנעלה את האתר לאוויר, הכול יישמר בשרת מאובטח.</div><div class="tabs">${Object.entries(tabs).map(([k,v])=>`<a class="chip ${k===tab?'on':''}" href="#/admin?tab=${k}">${v}</a>`).join('')}<button class="chip" id="logout">יציאה</button></div>${body}</div>`;
};
function newsTabHTML(){
  const setup = API() ? '' : `<div class="box" id="nSetup"><h2>חיבור חד־פעמי של רשימת התפוצה</h2>
    <p>כדי שנרשמות מכל מקום יישמרו אצלך, וההודעות ייצאו מהג׳ימייל שלך, צריך שרת קטן וחינמי של גוגל. 5 דקות, פעם אחת:</p>
    <ol>
      <li>פתחי גיליון חדש בגוגל שיטס: <a href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a>.</li>
      <li>בתפריט למעלה: <b>תוספים</b> ← <b>Apps Script</b>.</li>
      <li>מחקי את מה שכתוב שם, ולחצי "העתקת הקוד" למטה והדביקי במקומו.</li>
      <li>בשורה השנייה בקוד, במקום <code>CHANGE-ME-123</code> כתבי מפתח סודי משלך (אנגלית ומספרים). את המפתח הזה תכתבי כאן באדמין.</li>
      <li>למעלה בצד ימין: <b>פריסה</b> ← <b>פריסה חדשה</b> ← סוג <b>אפליקציית אינטרנט</b>. ב"מי יכול לגשת" בחרי <b>כל אחד</b>, ולחצי פריסה. גוגל תבקש הרשאות: אשרי (אם מופיעה אזהרה, "מתקדם" ← "המשך").</li>
      <li>העתיקי את הכתובת שמופיעה בסוף ושלחי אותה לקלוד, והוא יחבר אותה לאתר.</li>
    </ol>
    <textarea readonly id="gasCode" rows="7" style="width:100%;direction:ltr;font-family:monospace;font-size:.8rem;border:2px solid var(--ink);border-radius:6px;padding:8px">${esc(GAS_CODE)}</textarea>
    <div class="btn-row"><button class="btn" id="gasCopy">העתקת הקוד</button></div></div>`;
  return `${setup}<div class="two-col" style="margin-top:20px;align-items:start">
    <div class="box"><h2>הנרשמות</h2>
      <p id="nCount" class="muted">טוענת...</p>
      <div class="form"><label>מפתח ניהול<input type="password" id="nkey" placeholder="המפתח שקבעת בסקריפט" autocomplete="off"></label></div>
      <div class="btn-row"><button class="btn btn-sm" id="nReload">רענון</button><button class="btn btn-sm" id="nCopy">העתקת כתובות</button><button class="btn btn-sm" id="nCsv">הורדה ל־CSV</button></div>
      <div id="nList" style="max-height:340px;overflow:auto"></div></div>
    <form class="box form" id="nf" style="margin-top:0"><h2>הודעה חדשה</h2>
      <label>נושא<input name="subject" required></label>
      <label>ההודעה<textarea name="body" rows="9" required placeholder="שלום! הוספנו משחקים חדשים לערב הלביבות..."></textarea></label>
      <label class="check"><input type="checkbox" name="test" id="nTest"> שליחת בדיקה בלבד</label>
      <label id="nToWrap" style="display:none">לאיזה מייל לשלוח את הבדיקה?<input name="testTo" type="email" placeholder="המייל שלך"></label>
      <button class="btn btn-gold">שליחה</button>
      <p class="hint" id="nStatus"></p>
      <p class="hint">בסוף כל הודעה מצורף קישור להסרה מהרשימה. מכסת שליחה בג׳ימייל רגיל: כ־100 נמענות ביום.</p></form></div>`;
}
function initNews(){
  const $ = id => document.getElementById(id);
  const cnt = $('nCount'), list = $('nList'), keyIn = $('nkey'), st = $('nStatus'), f = $('nf');
  let subs = [];
  keyIn.value = sessionStorage.getItem('madlik_key') || '';
  const draw = () => {
    cnt.textContent = subs.length + ' נרשמות' + (API() ? '' : ' (רק מהדפדפן הזה, עד שתחברי את השרת)');
    list.innerHTML = subs.length ? `<table class="table"><tr><th>מייל</th><th>תאריך</th><th>מקור</th></tr>${subs.slice(0,300).map(s=>`<tr><td>${esc(s.email)}</td><td>${esc(s.date)}</td><td>${esc(s.source)}</td></tr>`).join('')}</table>` : '<p class="muted">עוד אין נרשמות.</p>';
  };
  const load = () => {
    if(!API()){ subs = store.get('subscribers',[]).map(x=>({email:x.email, date:x.date, source:x.source})); draw(); return; }
    const k = keyIn.value.trim();
    if(!k){ cnt.textContent = 'כתבי את מפתח הניהול כדי לראות את הרשימה'; list.innerHTML = ''; return; }
    cnt.textContent = 'טוענת...';
    apiPost({action:'list', key:k}).then(r => { if(!r.ok) throw new Error(r.error||'שגיאה'); subs = r.subscribers; draw(); })
      .catch(e => { cnt.textContent = 'לא הצלחתי לטעון: ' + e.message; });
  };
  keyIn.onchange = () => { sessionStorage.setItem('madlik_key', keyIn.value.trim()); load(); };
  $('nReload').onclick = load;
  $('nCopy').onclick = () => { if(!subs.length) return toast('אין כתובות'); (navigator.clipboard ? navigator.clipboard.writeText(subs.map(s=>s.email).join(', ')) : Promise.reject()).then(()=>toast('הכתובות הועתקו'), ()=>toast('לא הצלחתי להעתיק')); };
  $('nCsv').onclick = () => { const txt = '﻿מייל,תאריך,מקור\n' + subs.map(r=>[r.email,r.date,r.source].map(x=>`"${String(x||'').replace(/"/g,'""')}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt],{type:'text/csv'})); a.download = 'madlik-subscribers.csv'; a.click(); };
  const gc = $('gasCopy'); if(gc) gc.onclick = () => { const t = $('gasCode'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(GAS_CODE) : Promise.reject()).then(()=>toast('הקוד הועתק'), ()=>{ document.execCommand('copy'); toast('הקוד הועתק'); }); };
  $('nTest').onchange = e => { $('nToWrap').style.display = e.target.checked ? 'grid' : 'none'; };
  f.onsubmit = e => {
    e.preventDefault();
    if(!API()) return toast('קודם מחברים את השרת של גוגל (ההנחיות למעלה)');
    const k = keyIn.value.trim(); if(!k) return toast('כתבי את מפתח הניהול');
    const v = Object.fromEntries(new FormData(f)), test = !!v.test;
    if(test && !v.testTo) return toast('כתבי לאיזה מייל לשלוח את הבדיקה');
    if(!test && !confirm('לשלוח את ההודעה ל־' + subs.length + ' נרשמות?')) return;
    st.textContent = 'שולחת...';
    apiPost({action:'send', key:k, subject:v.subject, body:v.body, test: test ? v.testTo : ''})
      .then(r => { if(!r.ok) throw new Error(r.error||'שגיאה'); st.textContent = 'נשלח ל־' + r.sent + (r.skipped ? ' (' + r.skipped + ' לא נשלחו בגלל המכסה היומית)' : ''); toast('ההודעה נשלחה'); })
      .catch(e => { st.textContent = 'שגיאה: ' + e.message; });
  };
  load();
}
pages.admin.after = () => {
  const lf = document.getElementById('loginF');
  if(lf){ lf.onsubmit = e => { e.preventDefault(); if(lf.p.value==='madlik'){ sessionStorage.setItem('madlik_admin','1'); render(); } else toast('סיסמה שגויה'); }; return; }
  if((location.hash.split('tab=')[1]||'') === 'news') initNews();
  document.getElementById('logout').onclick = () => { sessionStorage.removeItem('madlik_admin'); location.hash = '#/'; };
  const csv = document.getElementById('csv'); if(csv) csv.onclick = () => { const rows = store.get('subscribers',[]); const txt = '﻿תאריך,מייל,מקור\n' + rows.map(r=>[r.date,r.email,r.source].map(x=>`"${String(x||'').replace(/"/g,'""')}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt],{type:'text/csv'})); a.download = 'madlik-subscribers.csv'; a.click(); };
  app.onclick = e => {
    const d = e.target.closest('[data-del]'); if(d && confirm('למחוק את הרשומה?')){ const [k,id] = d.dataset.del.split('|'); store.set(k, store.get(k,[]).filter(x=>x.id!==id)); render(); }
    const x = e.target.closest('[data-del-extra]'); if(x && confirm('למחוק מהאתר?')){ const [k,id] = x.dataset.delExtra.split('|'); store.set('extra_'+k, store.get('extra_'+k,[]).filter(i=>i.id!==id)); render(); }
    const a = e.target.closest('[data-approve]');
    if(a){ const subs = store.get('subs',[]); const s = subs.find(i=>i.id===a.dataset.approve); s.status = 'אושר';
      const credit = s.credit ? s.name : '';
      const ex = store.get('extra_ideas',[]); ex.push({id:'u'+s.id, title:s.title, text:s.text, cat:s.cat, ico:'', credit}); store.set('extra_ideas', ex);
      store.set('subs', subs); toast('פורסם במדור ההשראה'); render(); }
  };
  document.querySelectorAll('[data-add]').forEach(f => f.onsubmit = e => {
    e.preventDefault(); const k = f.dataset.add, v = Object.fromEntries(new FormData(f)); v.id = 'x'+Date.now().toString(36);
    if(k==='suppliers') v.featured = !!v.featured;
    if(k==='games'){ v.min = +v.min; v.max = +v.max; v.ico = ''; v.format = ['בעל פה']; v.time = ''; v.equip = false; if(v.words) v.words = lines(v.words); else delete v.words; }
    if(k==='recipes'){ v.ico = ''; v.time = +v.time; v.serves = +v.serves||1; v.ing = lines(v.ing).map(l=>{ const p = l.split('|').map(x=>x.trim()); return p.length>=3 ? [parseFloat(p[0])||0, p[1], p[2]] : [0,'',l]; }); v.steps = lines(v.steps); }
    const ex = store.get('extra_'+k, []); ex.push(v); store.set('extra_'+k, ex); toast('נוסף לאתר ✔'); render();
  });
};

function notFound(){ return pageHead('לא מצאנו את העמוד', '', '') + '<div class="wrap"><a class="btn btn-gold" href="#/">לעמוד הבית</a></div>'; }

/* ---------- ניתוב ---------- */
const routes = [
  [/^\/?$/, 'home'], [/^\/search$/, 'search'], [/^\/games$/, 'games'], [/^\/game\/(.+)$/, 'game'],
  [/^\/create$/, 'create'], [/^\/create\/(.+)$/, 'creator'], [/^\/studio$/, 'studio'], [/^\/studio\/(.+)$/, 'design'],
  [/^\/recipes$/, 'recipes'], [/^\/recipe\/(.+)$/, 'recipe'], [/^\/ideas$/, 'ideas'], [/^\/suppliers$/, 'suppliers'],
  [/^\/supplier\/(.+)$/, 'supplier'], [/^\/advertise$/, 'advertise'], [/^\/submit$/, 'submit'], [/^\/me$/, 'me'], [/^\/admin$/, 'admin']
];
function render(){
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const q = Object.fromEntries(new URLSearchParams(qs||''));
  let name = null, params = [];
  for(const [re,n] of routes){ const m = path.match(re); if(m){ name = n; params = m.slice(1).map(decodeURIComponent); break; } }
  app.onclick = null; app.onchange = null;
  app.innerHTML = name ? pages[name](params, q) : notFound();
  if(name && pages[name].after) pages[name].after(params, q);
  if(window.MadlikFX) window.MadlikFX.onRender(app);
  document.querySelectorAll('.main-nav a').forEach(a=>a.classList.toggle('active', path!=='/' && ('#'+path).startsWith(a.getAttribute('href'))));
  document.getElementById('mainNav').classList.remove('open');
}
let lastPath = location.hash.split('?')[0], navTok = 0;
window.addEventListener('hashchange', () => {
  const p = location.hash.split('?')[0], same = p === lastPath; lastPath = p;
  const wipe = document.getElementById('wipe');
  const top = () => window.scrollTo({top:0, left:0, behavior:'instant'});
  if(!wipe || same || matchMedia('(prefers-reduced-motion: reduce)').matches){ render(); if(!same) top(); return; }
  const tok = ++navTok; wipe.className = 'wipe in';
  setTimeout(() => { if(tok !== navTok) return; render(); top(); wipe.className = 'wipe out'; setTimeout(()=>{ if(tok === navTok) wipe.className = 'wipe'; }, 520); }, 430);
});

/* ---------- כללי ---------- */
document.getElementById('menuToggle').onclick = () => document.getElementById('mainNav').classList.toggle('open');
const bar = document.getElementById('newsBar');
try{ localStorage.removeItem('madlik_newsClosed'); }catch(e){}
const closeBar = () => { bar.classList.add('hidden'); try{ sessionStorage.setItem('madlik_barClosed','1'); }catch(e){} };
let barHidden = false; try{ barHidden = sessionStorage.getItem('madlik_barClosed') === '1'; }catch(e){}
if(barHidden || store.get('subscribedEmail', '')) bar.classList.add('hidden');
document.getElementById('newsClose').onclick = closeBar;
document.getElementById('newsForm').onsubmit = e => {
  e.preventDefault();
  const email = e.target.querySelector('input').value.trim();
  subscribe(email, 'פס עליון'); store.set('subscribedEmail', email);
  e.target.innerHTML = '<b>תודה, נרשמת! נעדכן אותך ראשונה.</b>';
  setTimeout(closeBar, 3000);
};

(window.MadlikIntro || Promise.resolve()).then(render);
})();
