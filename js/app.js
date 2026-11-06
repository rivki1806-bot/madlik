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
const GAS_CODE = "// מדליק – שרת קטן וחינמי בגוגל.\n// שומר בגיליון: נרשמות לרשימת התפוצה, כל הטפסים מהאתר, ותוכן שנוסף מהאדמין. ושולח מיילים לנרשמות.\n// 1. החליפי את המפתח כאן במפתח סודי משלך (אותיות באנגלית ומספרים).\nconst SECRET = 'CHANGE-ME-123';\n\nconst KINDS = { subs: 'רעיונות שנשלחו', leads: 'פניות לבעלי עסקים', ads: 'בקשות פרסום', users: 'משתמשות', contact: 'פניות יצירת קשר' };\nconst CONTENT_KINDS = ['games', 'recipes', 'suppliers'];\n\nfunction tab_(name, head) {\n  const ss = SpreadsheetApp.getActiveSpreadsheet();\n  let sh = ss.getSheetByName(name);\n  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }\n  return sh;\n}\nconst subsSheet_ = () => tab_('נרשמות', ['תאריך', 'מייל', 'שם', 'מקור', 'פעילה']);\nconst recSheet_ = kind => tab_(KINDS[kind], ['מזהה', 'תאריך', 'סטטוס', 'סיכום', 'נתונים']);\nconst conSheet_ = () => tab_('תוכן באתר', ['מזהה', 'תאריך', 'סוג', 'כותרת', 'נתונים']);\nconst hitSheet_ = () => tab_('כניסות', ['תאריך', 'סוג', 'מזהה', 'מבקרת']);\n\n// סיכום הכניסות: סה\"כ, היום, 7 ימים, ומבקרות שונות – לכל מדור ולכל בעל עסק\nfunction stats_() {\n  const rows = hitSheet_().getDataRange().getValues(), now = Date.now(), DAY = 864e5;\n  const today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');\n  const out = { sec: {}, sup: {}, tel: {}, web: {}, all: { total: 0, today: 0, week: 0, uniq: 0 }, days: {} }, seen = {}, seenAll = {};\n  for (let i = 1; i < rows.length; i++) {\n    const d = rows[i][0] instanceof Date ? rows[i][0] : new Date(rows[i][0]), type = rows[i][1], id = String(rows[i][2]), v = String(rows[i][3]);\n    if (type === 'sup' && /^(tel|web):/.test(id)) { // לחיצות על \"הטלפון שלנו\" ועל האתר של העסק\n      const kind = id.slice(0, 3), tid = id.slice(4), grp = out[kind], t = grp[tid] = grp[tid] || { total: 0, today: 0, week: 0 };\n      t.total++; if (Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd') === today) t.today++; if (now - d.getTime() < 7 * DAY) t.week++;\n      continue;\n    }\n    if (type !== 'sec' && type !== 'sup') continue;\n    if (type === 'sec') {\n      const A = out.all, dk = Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd');\n      A.total++; if (dk === today) A.today++; if (now - d.getTime() < 7 * DAY) A.week++;\n      if (v && !seenAll[v]) { seenAll[v] = 1; A.uniq++; }\n      out.days[dk] = (out.days[dk] || 0) + 1;\n    }\n    const o = out[type][id] = out[type][id] || { total: 0, today: 0, week: 0, uniq: 0 };\n    o.total++;\n    if (Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd') === today) o.today++;\n    if (now - d.getTime() < 7 * DAY) o.week++;\n    const k = type + '|' + id + '|' + v; if (v && !seen[k]) { seen[k] = 1; o.uniq++; }\n  }\n  return out;\n}\n\nfunction json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }\nfunction valid_(e) { return /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(e); }\nfunction esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }\nfunction fmt_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm') : String(d); }\nfunction newId_() { return Utilities.getUuid().slice(0, 8); }\nfunction folder_() { const it = DriveApp.getFoldersByName('מדליק – מודעות'); return it.hasNext() ? it.next() : DriveApp.createFolder('מדליק – מודעות'); }\nfunction rowOf_(sh, id) { const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues(); for (let i = 1; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 1; return 0; }\n\n// טופס מהאתר: רק טקסט, באורך מוגבל\nfunction clean_(o) {\n  const out = {};\n  Object.keys(o || {}).slice(0, 30).forEach(k => { out[String(k).slice(0, 40)] = String(o[k] == null ? '' : o[k]).slice(0, 3000); });\n  return out;\n}\n\nfunction doPost(e) {\n  try {\n    const d = JSON.parse(e.postData.contents);\n\n    // --- פעולות פתוחות לכל גולשת ---\n    if (d.action === 'subscribe') {\n      const email = String(d.email || '').trim().toLowerCase();\n      if (!valid_(email)) return json_({ ok: false, error: 'מייל לא תקין' });\n      const sh = subsSheet_(), rows = sh.getDataRange().getValues();\n      for (let i = 1; i < rows.length; i++) {\n        if (String(rows[i][1]).toLowerCase() === email) {\n          if (rows[i][4] === 'לא') sh.getRange(i + 1, 5).setValue('כן');\n          return json_({ ok: true, dup: true });\n        }\n      }\n      sh.appendRow([new Date(), email, String(d.name || '').slice(0, 100), String(d.source || '').slice(0, 50), 'כן']);\n      return json_({ ok: true });\n    }\n    if (d.action === 'submit') {\n      if (!KINDS[d.kind]) return json_({ ok: false, error: 'סוג לא מוכר' });\n      const data = clean_(d.data);\n      const summary = ['name', 'biz', 'title', 'supplier', 'phone', 'email'].map(k => data[k]).filter(Boolean).join(' · ');\n      recSheet_(d.kind).appendRow([newId_(), new Date(), d.kind === 'subs' ? 'ממתין' : 'חדש', summary, JSON.stringify(data)]);\n      return json_({ ok: true });\n    }\n\n    if (d.action === 'hit') {\n      const type = d.type === 'sup' ? 'sup' : 'sec';\n      hitSheet_().appendRow([new Date(), type, String(d.id || '').slice(0, 60), String(d.v || '').slice(0, 20)]);\n      return json_({ ok: true });\n    }\n\n    // --- מכאן רק עם מפתח הניהול ---\n    if (d.key !== SECRET) return json_({ ok: false, error: 'מפתח שגוי' });\n\n    if (d.action === 'stats') return json_({ ok: true, stats: stats_() });\n\n    if (d.action === 'list') {\n      const rows = subsSheet_().getDataRange().getValues(), out = [];\n      for (let i = 1; i < rows.length; i++) if (rows[i][4] !== 'לא') out.push({ date: fmt_(rows[i][0]), email: rows[i][1], source: rows[i][3] });\n      return json_({ ok: true, subscribers: out });\n    }\n    if (d.action === 'send') return send_(d);\n\n    if (d.action === 'records') {\n      if (!KINDS[d.kind]) return json_({ ok: false, error: 'סוג לא מוכר' });\n      const rows = recSheet_(d.kind).getDataRange().getValues(), out = [];\n      for (let i = rows.length - 1; i >= 1; i--) {\n        let data = {}; try { data = JSON.parse(rows[i][4]); } catch (err) {}\n        out.push(Object.assign(data, { id: String(rows[i][0]), date: fmt_(rows[i][1]), status: rows[i][2] }));\n      }\n      return json_({ ok: true, records: out });\n    }\n    if (d.action === 'setStatus' || d.action === 'remove') {\n      if (!KINDS[d.kind]) return json_({ ok: false, error: 'סוג לא מוכר' });\n      const sh = recSheet_(d.kind), r = rowOf_(sh, d.id);\n      if (!r) return json_({ ok: false, error: 'לא נמצא' });\n      if (d.action === 'remove') sh.deleteRow(r); else sh.getRange(r, 3).setValue(String(d.status || ''));\n      return json_({ ok: true });\n    }\n    if (d.action === 'addContent') {\n      if (CONTENT_KINDS.indexOf(d.kind) < 0) return json_({ ok: false, error: 'סוג לא מוכר' });\n      const item = d.item || {}; item.id = String(item.id || newId_());\n      conSheet_().appendRow([item.id, new Date(), d.kind, String(item.title || item.name || ''), JSON.stringify(item)]);\n      return json_({ ok: true, id: item.id });\n    }\n    if (d.action === 'updateContent') {\n      const sh = conSheet_(), r = rowOf_(sh, d.id);\n      if (!r) return json_({ ok: false, error: 'לא נמצא' });\n      const item = d.item || {}; item.id = String(d.id);\n      sh.getRange(r, 4, 1, 2).setValues([[String(item.title || item.name || ''), JSON.stringify(item)]]);\n      return json_({ ok: true });\n    }\n    if (d.action === 'uploadImage') {\n      const m = /^data:(image\\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(d.data || ''));\n      if (!m) return json_({ ok: false, error: 'קובץ לא תקין' });\n      const bytes = Utilities.base64Decode(m[2]);\n      if (bytes.length > 4 * 1024 * 1024) return json_({ ok: false, error: 'התמונה גדולה מדי' });\n      const file = folder_().createFile(Utilities.newBlob(bytes, m[1], 'ad-' + newId_() + (m[1] === 'image/png' ? '.png' : '.jpg')));\n      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);\n      return json_({ ok: true, url: 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w1200' });\n    }\n    if (d.action === 'removeContent') {\n      const sh = conSheet_(), r = rowOf_(sh, d.id);\n      if (!r) return json_({ ok: false, error: 'לא נמצא' });\n      sh.deleteRow(r);\n      return json_({ ok: true });\n    }\n    return json_({ ok: false, error: 'פעולה לא מוכרת' });\n  } catch (err) {\n    return json_({ ok: false, error: String(err) });\n  }\n}\n\nfunction doGet(e) {\n  const p = e.parameter || {};\n  // תוכן שנוסף מהאדמין – כל הגולשות רואות אותו\n  if (p.action === 'content') {\n    const rows = conSheet_().getDataRange().getValues(), items = {};\n    CONTENT_KINDS.forEach(k => items[k] = []);\n    for (let i = 1; i < rows.length; i++) {\n      try { const it = JSON.parse(rows[i][4]); if (items[rows[i][2]]) items[rows[i][2]].push(it); } catch (err) {}\n    }\n    return json_({ ok: true, items: items });\n  }\n  // הסרה מרשימת התפוצה (הקישור שבסוף כל מייל)\n  if (p.action === 'unsub') {\n    const email = String(p.email || '').toLowerCase(), sh = subsSheet_(), rows = sh.getDataRange().getValues();\n    for (let i = 1; i < rows.length; i++) if (String(rows[i][1]).toLowerCase() === email) sh.getRange(i + 1, 5).setValue('לא');\n    return HtmlService.createHtmlOutput('<div dir=\"rtl\" style=\"font-family:Arial,sans-serif;padding:48px;font-size:20px\">הוסרת מרשימת התפוצה של מדליק. תודה, ושיהיה חג אורים שמח.</div>');\n  }\n  return json_({ ok: true });\n}\n\nfunction send_(d) {\n  const rows = subsSheet_().getDataRange().getValues();\n  let to = [];\n  if (d.test) to = [String(d.test)];\n  else for (let i = 1; i < rows.length; i++) if (rows[i][4] !== 'לא') to.push(rows[i][1]);\n  const subject = String(d.subject || '').trim(), body = String(d.body || '');\n  if (!subject || !body) return json_({ ok: false, error: 'חסר נושא או הודעה' });\n  const quota = MailApp.getRemainingDailyQuota();\n  let sent = 0, skipped = 0;\n  for (const email of to) {\n    if (sent >= quota) { skipped++; continue; }\n    const unsub = ScriptApp.getService().getUrl() + '?action=unsub&email=' + encodeURIComponent(email);\n    const html = '<div dir=\"rtl\" style=\"font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#071a38\">' + esc_(body).replace(/\\n/g, '<br>') +\n      '<hr style=\"margin-top:32px;border:0;border-top:1px solid #ddd\"><p style=\"font-size:12px;color:#666\">קיבלת מייל זה כי נרשמת לרשימת התפוצה של מדליק. <a href=\"' + unsub + '\">להסרה מהרשימה</a></p></div>';\n    MailApp.sendEmail({ to: email, subject: subject, htmlBody: html, body: body + '\\n\\nלהסרה מהרשימה: ' + unsub, name: 'מדליק' });\n    sent++;\n  }\n  return json_({ ok: true, sent: sent, skipped: skipped });\n}\n";
const API = () => String(window.MADLIK_API || '').trim();
function subscribe(email, source, name){
  email = String(email||'').trim();
  store.push('subscribers', {email, source, name:name||''});
  if(!API()) return;
  try{ fetch(API(), {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'subscribe', email, source, name:name||''})}).catch(()=>{}); }catch(e){}
}
const API2 = () => String(window.MADLIK_API2 || '').trim();
const apiPost2 = body => fetch(API2(), {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body)}).then(r=>r.json());
const apiPost = body => fetch(API(), {method:'POST', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body)}).then(r=>r.json());
// טפסים ותוכן: נשמרים בשרת של גוגל כשהוא מחובר, ואחרת רק בדפדפן הזה
const ADMIN_PAGE = !!window.MADLIK_ADMIN_PAGE; // דף הניהול נפתח רק מהקובץ הייעודי, ולא מהאתר הציבורי
const adminKey = () => { try{ return (sessionStorage.getItem('madlik_key')||'').trim(); }catch(e){ return ''; } };
function record(kind, data){
  store.push(kind, Object.assign(kind==='subs' ? {status:'ממתין'} : {}, data));
  if(!API()) return;
  try{ fetch(API(), {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'submit', kind, data})}).catch(()=>{}); }catch(e){}
}
// ספירת כניסות: לכל מדור ולכל בעל עסק. נשלח לשרת כשהוא מחובר, ותמיד נשמר גם בדפדפן הזה
const SECTIONS = {home:'עמוד הבית', games:'משחקים על המסך שניתנים גם להדפסה', game:'משחקים על המסך שניתנים גם להדפסה', create:'פעילויות להדפסה', creator:'פעילויות להדפסה', studio:'סטודיו מיתוג', edit:'סטודיו מיתוג', design:'סטודיו מיתוג', recipes:'מתכונים', recipe:'מתכונים', suppliers:'בעלי עסקים', supplier:'בעלי עסקים', advertise:'רוצים לפרסם?', submit:'שליחת רעיון', me:'האזור שלי', search:'חיפוש'};
const visitorId = () => { let v = store.get('vid', ''); if(!v){ v = Math.random().toString(36).slice(2, 12); store.set('vid', v); } return v; };
let lastHit = '';
// לחיצה על "הטלפון שלנו" בעמוד עסק: נספרת לכל עסק. לשרת נשלחת כ"sup" עם הקידומת tel:, כך שגם שרת ישן לא ירשום כניסות מדומות
function countClick(kind, id){
  if(ADMIN_PAGE || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;
  const st = store.get('stats', {sec:{}, sup:{}}), today = new Date().toISOString().slice(0,10);
  st[kind] = st[kind] || {};
  const o = st[kind][id] = st[kind][id] || {total:0, today:0, day:today, week:[]};
  if(o.day !== today){ o.day = today; o.today = 0; }
  o.total++; o.today++; o.week = (o.week||[]).filter(t => Date.now()-t < 7*864e5).concat(Date.now()).slice(-500);
  store.set('stats', st);
  if(API()) try{ fetch(API(), {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'hit', type:'sup', id:kind + ':' + id, v:visitorId()})}).catch(()=>{}); }catch(e){}
}
// כפתורי הכרטיס: "הטלפון שלנו" מחייג ונספר, והכפתור הראשי לאתר העסק נספר
document.addEventListener('click', e => {
  const t = e.target.closest('[data-tel]'), w = e.target.closest('[data-web]');
  if(!t && !w) return;
  if(ADMIN_PAGE){ e.preventDefault(); return; }
  if(w){ countClick('web', w.dataset.web); return; }
  e.preventDefault();
  const s = findIn('suppliers', t.dataset.tel); if(!s || !s.phone) return;
  countClick('tel', s.id);
  t.outerHTML = '<a class="sup-tel open" href="tel:' + esc(s.phone) + '" dir="ltr">' + esc(s.phone) + '</a>';
  location.href = 'tel:' + s.phone;
});
function countHit(name, params, path){
  if(!SECTIONS[name] || path === lastHit) return; lastHit = path;
  if(/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return; // כניסות מהמחשב של הפיתוח לא נספרות
  let sec = SECTIONS[name];
  if(name === 'creator') sec = (canPlay(params[0])||params[0]==='battle') ? 'משחקים על המסך שניתנים גם להדפסה' : 'פעילויות להדפסה';
  if(name === 'game'){ const g = findIn('games', params[0]); if(g && !isScreenGame(g)) sec = 'פעילויות להדפסה'; }
  const hits = [['sec', sec]]; if(name === 'supplier' && params[0]) hits.push(['sup', params[0]]);
  const st = store.get('stats', {sec:{}, sup:{}}), today = new Date().toISOString().slice(0,10);
  hits.forEach(([type, id]) => {
    const o = st[type][id] = st[type][id] || {total:0, today:0, day:today, week:[]};
    if(o.day !== today){ o.day = today; o.today = 0; }
    o.total++; o.today++; o.week = (o.week||[]).filter(t => Date.now()-t < 7*864e5).concat(Date.now()).slice(-500);
    if(API()) try{ fetch(API(), {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'hit', type, id, v:visitorId()})}).catch(()=>{}); }catch(e){}
  });
  store.set('stats', st);
}
let remote = store.get('remote_content', null);
function refreshRemote(){
  if(!API()) return Promise.resolve();
  return fetch(API()+'?action=content').then(r=>r.json()).then(r=>{ if(r.ok){ remote = r.items; store.set('remote_content', remote); } });
}
function loadRemote(){
  const before = JSON.stringify(remote);
  refreshRemote().then(()=>{ if(JSON.stringify(remote) !== before && !/^#\/admin/.test(location.hash)) render(); }).catch(()=>{});
}
const addedContent = k => API() ? ((remote && remote[k]) || []) : store.get('extra_'+k, []);
const ADMIN_COLS = {
  subs: [['date','תאריך'],['cat','קטגוריה'],['title','כותרת'],['text','תוכן'],['name','שם'],['email','מייל'],['status','סטטוס']],
  leads: [['date','תאריך'],['supplier','עסק'],['name','שם'],['phone','טלפון'],['email','מייל'],['count','משתתפים'],['msg','פרטים']],
  ads: [['date','תאריך'],['biz','עסק'],['name','קשר'],['phone','טלפון'],['pkg','חבילה'],['cat','תחום'],['region','אזור']],
  users: [['date','תאריך'],['name','שם'],['email','מייל'],['marketing','דיוור']],
  contact: [['date','תאריך'],['name','שם'],['phone','טלפון'],['email','מייל'],['msg','הודעה'],['page','מאיפה']]
};
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
// קרדיט קבוע על כל מה שמדפיסים או שומרים: בכל דף, ואם אין דפים אז שורה אחת בסוף
const SITE_HOST = 'madlik.autoclick.co.il';
function withCredit(html){
  const t = document.createElement('div'); t.innerHTML = html;
  const line = '<div class="sheet-credit">הורדה מאתר מדליק · <bdi dir="ltr">' + SITE_HOST + '</bdi></div>';
  const sheets = t.querySelectorAll('.sheet');
  if(sheets.length) sheets.forEach(s => { if(!s.querySelector('.sheet-credit')) s.insertAdjacentHTML('beforeend', line); });
  else if(!t.querySelector('.sheet-credit')) t.insertAdjacentHTML('beforeend', line.replace('sheet-credit', 'sheet-credit solo'));
  return t.innerHTML;
}
function printHTML(html, o){
  const root = document.getElementById('printRoot');
  root.innerHTML = (o && o.credit === false) ? html : withCredit(html); // במדור המיתוג אין קרדיט
  if(o && o.page) root.insertAdjacentHTML('afterbegin', '<style>@page{size:' + o.page + ';margin:' + (o.margin || 0) + 'mm}</style>');
  setTimeout(()=>{ window.print(); }, 300);
}
window.addEventListener('afterprint', ()=>{ document.getElementById('printRoot').innerHTML=''; });

// תוכן = תוכן בסיס + מה שנוסף בניהול
const content = k => {
  const base = D[k]||[], add = addedContent(k);
  if(k === 'suppliers'){ const real = add.filter(x => x.active !== false); return real.length ? real : base; } // כשיש עסק אמיתי אחד לפחות, כרטיסי הדוגמה מוסתרים
  return base.concat(add);
};
const findIn = (k,id) => content(k).find(x=>x.id===id);

/* ---------- מועדפים ---------- */
const favs = () => store.get('favs', {games:[],recipes:[],suppliers:[]});
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
// משחק על המסך = אפשר לשחק בו באתר. כל השאר: פעילויות להדפסה
const isScreenGame = g => !!g.battle || (g.format||[]).includes('על המסך');
const customRib = '<span class="cust-rib" aria-label="אפשר להתאים אישית"><i>🎨</i> התאמה אישית</span>';
const gameCard = (g,i=0) => `<a class="card" href="#/game/${esc(g.id)}">${favBtn('games',g.id)}${(g.battle||g.words||g.quartets)?customRib:''}<div class="card-top" style="--bg:${bgs[i%5]}">${gameArt(g)}</div><div class="card-body"><h3>${esc(g.title)}</h3><p>${esc(g.short)}</p><div class="tags"><span class="tag">${esc(g.type)}</span><span class="tag">${esc(g.min)}–${esc(g.max)} משתתפים</span>${(g.format||[]).map(f=>`<span class="tag">${esc(f)}</span>`).join('')}</div></div></a>`;
const recipeCard = (r,i=0) => `<a class="card" href="#/recipe/${esc(r.id)}">${favBtn('recipes',r.id)}<div class="card-top" style="--bg:${bgs[(i+2)%5]}">${art(r)}</div><div class="card-body"><h3>${esc(r.title)}</h3><div class="tags"><span class="tag">${esc(r.cat)}</span><span class="tag"> ${esc(r.time)} דק׳</span><span class="tag">${esc(r.level)}</span><span class="tag">${esc(r.diet)}</span></div></div></a>`;
const safeImg = p => /^(img\/[\w\-\/.%]+|https:\/\/[^\s"'<>]+)$/i.test(String(p || '')) ? String(p) : '';
const safeUrl = u => { u = String(u || '').trim(); if(!u) return ''; if(!/^https?:\/\//i.test(u)) u = 'https://' + u.replace(/^\/+/, ''); return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ''; };
const supPic = s => safeImg(s.img) ? `<img class="biz-img" src="${esc(safeImg(s.img))}" alt="${esc(s.name)}" loading="lazy">` : '';
const supCard = (s,i=0) => { const id = esc(s.id), site = safeUrl(s.site);
  const go = site ? `<a class="sup-go" href="${esc(site)}" target="_blank" rel="noopener noreferrer sponsored" data-web="${id}">לאתר שלנו <i>←</i></a>` : `<a class="sup-go" href="#/supplier/${id}">לטופס פנייה <i>←</i></a>`;
  return `<article class="card sup-card">${s.featured?'<span class="badge-featured">מומלץ</span>':''}${favBtn('suppliers',s.id)}<a class="card-top" href="#/supplier/${id}" style="--bg:${bgs[(i+3)%5]}" aria-label="${esc(s.name)}">${supPic(s) || (window.MadlikBizArt && MadlikBizArt.get(s)) || art(s)}</a><div class="card-body"><a class="sup-name" href="#/supplier/${id}"><h3>${esc(s.name)}</h3></a><p>${esc(s.text)}</p><div class="tags"><span class="tag">${esc(s.cat)}</span><span class="tag"> ${esc(s.region)}</span><span class="tag">${esc(s.price)}</span></div></div><div class="sup-actions">${s.phone ? `<button type="button" class="sup-tel" data-tel="${id}">הטלפון שלנו</button>` : ''}${go}</div></article>`; };
const tplCard = t => `<a class="card" href="#/studio/${esc(t.id)}" data-tpl="${esc(t.id)}"><div class="card-top tpl-top" style="--bg:#f3e9da">${art(t)}</div><div class="card-body"><h3>${esc(t.title)}</h3><p>${t.w}×${t.h} מ״מ</p></div></a>`;
const creatorCard = c => `<a class="card" href="#/create/${esc(c.id)}">${customRib}<div class="card-top" style="--bg:#fff3d6">${gameArt(c)}</div><div class="card-body"><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p><div class="tags">${c.isNew?'<span class="tag tag-new">חדש!</span>':''}<span class="tag tag-gold">חינם</span></div></div></a>`;
const gameArt = x => (window.MadlikArt && MadlikArt.get(x)) || art(x);
const art = x => { const n = String(x.title||x.name||'').replace(/["'״׳]/g,'').trim(); return `<span class="card-letter">${esc(n[0]||'•')}</span>`; };
const pageHead = (title, text, crumb) => `<div class="page-head"><div class="wrap">${crumb?`<div class="breadcrumb"><a href="#/">ראשי</a> › ${crumb}</div>`:''}<h1${String(title).length>22?' class="long"':''}>${title}</h1>${text?`<p>${text}</p>`:''}</div></div>`;

/* ---------- עמודים ---------- */
const pages = {};

const glyphs = {
  games:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="32" height="32" rx="8"/><circle cx="17" cy="17" r="2.4" fill="currentColor"/><circle cx="31" cy="31" r="2.4" fill="currentColor"/><circle cx="24" cy="24" r="2.4" fill="currentColor"/><circle cx="31" cy="17" r="2.4" fill="currentColor"/><circle cx="17" cy="31" r="2.4" fill="currentColor"/></svg>',
  create:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10 38l4-12L32 8l8 8-18 18z"/><path d="M28 12l8 8M14 26l8 8"/><path d="M8 42h32"/></svg>',
  studio:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M24 6C13 6 6 14 6 23c0 9 7 15 14 15 3 0 3-3 2-5s0-5 3-5h6c6 0 11-4 11-10C42 12 34 6 24 6z"/><circle cx="15" cy="21" r="2.5"/><circle cx="22" cy="14" r="2.5"/><circle cx="31" cy="15" r="2.5"/></svg>',
  recipes:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><ellipse cx="22" cy="28" rx="16" ry="6"/><path d="M6 28v2c0 4 7 7 16 7s16-3 16-7v-2M38 27l8-3"/><path d="M16 18c0-3 3-3 3-6M23 18c0-3 3-3 3-6M30 18c0-3 3-3 3-6"/></svg>',
  suppliers:'<svg class="glyph" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 18L24 6l18 12z"/><path d="M10 18v18M18 18v18M30 18v18M38 18v18M6 40h36M4 44h40"/></svg>'
};
function wshow(w, kicker, title, text, href, btn, cards){
  const art = window.MadlikWorlds ? window.MadlikWorlds.art(w) : '';
  return `<section class="wshow" data-w="${w}">
    <div class="wshow-in">
      <div class="wshow-text">
        <div class="head-art head-art-${w} wshow-art" aria-hidden="true">${art}</div>
        <span class="wshow-kicker">${kicker}</span>
        <h2>${title}</h2>
        <p>${text}</p>
        <a class="btn btn-gold" href="${href}">${btn} ←</a>
      </div>
      <div class="cards wshow-cards">${cards}</div>
    </div>
  </section>`;
}
pages.home = () => {
  const fx = window.MadlikFX;
  const games = content('games').slice(0,8), recipes = content('recipes').slice(0,8);
  const words = ['סביבון','לביבות','סופגניות','שמונה נרות','פך שמן','נס גדול','משחקים','מיתוג','מתכונים'];
  const band = (cls,dir) => `<div class="band ${cls}" data-dir="${dir}" aria-hidden="true"><div class="band-track">${[0,1].map(()=>[...words,...words].map(w=>`<span>${w}</span>`).join('')).join('')}</div></div>`;
  const hl = ['בצחוק,','במשחק','בשולחן','ובתמונה','מוכן.'];
  const stm = 'ערב לביבות טוב לא נגמר בלביבות. הוא נגמר בצחוק, במשחק שכולם נכנסו אליו, בשולחן שמישהו טרח עליו ובתמונה שכולם רוצים. אספנו את כל זה במקום אחד, כדי שתבואו עם כוס תה ותצאו עם ערב מוכן.'.split(' ').map(w=>`<span class="w${hl.includes(w)?' hl':''}">${w}</span>`).join(' ');
  const ring = txt => { const ch = [...txt], n = ch.length; return ch.map((c,i)=>`<text transform="rotate(${(-(i/n)*360).toFixed(2)} 80 80) translate(80 24)" text-anchor="middle">${c}</text>`).join(''); };
  const pile = (id,theme,font,over) => { const t = D.templates.find(x=>x.id===id); return designHTML(t, Object.assign({theme, font:font||'frank', deco:''}, t.fields, over||{}), ''); };
  const p2 = n => String(n).padStart(2,'0');
  const ads = content('suppliers').filter(b=>b.homeAd).map(b=>`<a class="ad-card" href="#/supplier/${esc(b.id)}"><b>${esc(b.name)}</b><span>${esc(b.text)}</span><em>${esc(b.cat)} · ${esc(b.region)} ←</em></a>`)
    .concat(['<a class="ad-card ad-cta" href="#/advertise"><b>ראית את זה?</b><span>ראו את זה עוד אלפי אנשים, מוזמן לפרסם באחת התכניות השוות!</span><em>לכל התכניות וטופס יצירת קשר ←</em></a>']);
  return `
  <section class="hero" id="hero">
    <div class="hero-top"><span>חנוכה תשפ״ז</span><span>הכול בחינם</span><span>גללו ותראו מה קורה ↓</span></div>
    <h1 class="hero-word"><span class="sr-only">מדליק – האתר לערב לביבות: משחקים, מתכונים, מיתוג ובעלי עסקים</span><img class="hero-logo" src="img/logo-mark.png" alt="מדליק – כל מה שצריך לערב לביבות"></h1>
    <svg class="badge" viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="78" fill="#fbf1dc" stroke="#071a38" stroke-width="3"/>${ring('כל מה שצריך לערב לביבות • שמדליק שמחה בלבבות • ')}<circle cx="80" cy="80" r="27" fill="#ff6a00" stroke="#071a38" stroke-width="3"/><path d="M80 62c3 6 9 10 9 18a9 9 0 0 1-18 0c0-4 2-6 4-9 1 3 2 4 4 4-1-5 0-9 1-13z" fill="#071a38"/></svg>
        <aside class="ad-rail" aria-label="מודעות">
      <button type="button" class="ad-x" aria-label="סגירת הבאנר">×</button><img class="ad-logo" src="img/logo-mark.png" alt="">
      ${Date.now() < BIZ_NOTICE_UNTIL ? '<div class="ad-open" role="note" aria-label="פתיחת פרסום ביום שלישי 10.11.26"><b>פתיחת פרסום</b><span>ביום שלישי</span><i>10.11.26</i></div>' : ''}
      <div class="ad-stack">${ads.join('')}</div>
      ${ads.length>1?`<div class="ad-dots">${ads.map(()=>'<i></i>').join('')}</div>`:''}
    </aside>
    <div class="hero-copy">
      <p class="tagline">כל מה שצריך לערב לביבות<br><em>שמדליק שמחה בלבבות</em></p>
    </div>
  </section>
  ${band('', 1)}
  <div class="statement"><p>${stm}</p></div>
  ${wshow('games','משחקים על המסך שניתנים גם להדפסה','משחקים דיגיטליים אטרקטיביים על המסך','קרב המילים, אליאס, זיכרון, חידון חנוכה ועוד. מקרינים על המסך ומשחקים, עם צלילים וניקוד.','#/games','לכל המשחקים על המסך',D.creators.filter(c=>canPlay(c.id)||c.id==='battle').slice(0,3).map(creatorCard).join(''))}
  ${wshow('create','פעילויות להדפסה','פעילויות להדפסה בהתאמה אישית','בינגו, רביעיות, תפזורת ועוד. מכניסים את המילים שלכם ומקבלים דף מעוצב להדפסה.','#/create','לכל הפעילויות להדפסה',D.creators.filter(c=>!canPlay(c.id)&&c.id!=='battle').slice(0,3).map(creatorCard).join(''))}
  ${wshow('studio','סטודיו מיתוג','המיתוג של הערב','בוחרים שפה עיצובית, כותבים את המילים שלכם, ומזיזים הכול איפה שרוצים.','#/studio','לסטודיו',(D.styles||[]).slice(0,3).map(styleCard).concat(D.templates.filter(t=>t.repeat).slice(0,3)).slice(0,3).map(x=>typeof x==='string'?x:tplCard(x)).join(''))}
  ${wshow('recipes','מתכונים','טעימות לערב','לביבות, סופגניות ומגשי אירוח. הכמויות מתחשבות לבד.','#/recipes','לכל המתכונים',content('recipes').slice(0,3).map(recipeCard).join(''))}
  ${wshow('biz','בעלי עסקים','בעלי עסקים שישדרגו לכם את האירוע','אולמות, קייטרינג, מפעילים ועוד. לפי אזור ולפי מחיר.','#/suppliers','לעסקים',content('suppliers').slice(0,3).map(supCard).join(''))}
  <section class="final">
    <a class="big-link" href="#/games">מתחילים לשחק <i>←</i></a>
    <a class="big-link" href="#/submit">יש לך רעיון? <i>←</i></a>
    <a class="big-link" href="#/advertise">יש לך עסק? <i>←</i></a>
  </section>`;
};
pages.home.after = () => {
  const cards = [...document.querySelectorAll('.ad-card')], dots = [...document.querySelectorAll('.ad-dots i')]; let k = 0;
  const show = n => { k = n; cards.forEach((c,i)=>c.classList.toggle('on', i===n)); dots.forEach((d,i)=>d.classList.toggle('on', i===n)); };
  show(0); clearInterval(window.__adTimer);
  const rail = document.querySelector('.ad-rail');
  try{ if(rail && sessionStorage.getItem('madlik_ad_closed') === '1') rail.remove(); }catch(e){}
  const xb = document.querySelector('.ad-x'); if(xb) xb.onclick = () => { clearInterval(window.__adTimer); try{ sessionStorage.setItem('madlik_ad_closed', '1'); }catch(e){} const r = document.querySelector('.ad-rail'); if(r){ r.classList.add('gone'); setTimeout(() => r.remove(), 450); } };
  if(rail && 'IntersectionObserver' in window){ const io = new IntersectionObserver(es => es.forEach(e => rail.classList.toggle('in', e.isIntersecting)), {threshold:.35}); io.observe(rail); } else if(rail) rail.classList.add('in');
  if(cards.length > 1) window.__adTimer = setInterval(()=>show((k+1)%cards.length), 5000);
};

pages.search = (p,q) => {
  const term = (q.q||'').trim(); const m = x => JSON.stringify(x).includes(term);
  const g = content('games').filter(m), r = content('recipes').filter(m), s = content('suppliers').filter(m);
  const block = (t,arr,fn) => arr.length?`<h2>${t}</h2><div class="cards" style="margin-bottom:30px">${arr.map(fn).join('')}</div>`:'';
  return pageHead('תוצאות חיפוש', `חיפשת: "${esc(term)}"`, 'חיפוש') + `<div class="wrap">${(g.length+r.length+s.length)?block('משחקים',g,gameCard)+block('מתכונים',r,recipeCard)+block('בעלי עסקים',s,supCard):'<div class="empty">לא נמצאו תוצאות. נסה מילה אחרת.</div>'}</div>`;
};

/* משחקים */
pages.games = () => {
  const all = content('games').filter(isScreenGame);
  const types = [...new Set(all.map(g=>g.type))], formats = [...new Set(all.flatMap(g=>g.format||[]))], ages = [...new Set(all.map(g=>g.age))];
  return pageHead('משחקים על המסך שניתנים גם להדפסה', 'מקרינים על המסך ומשחקים: קבוצות, טיימר, צלילים וניקוד. ואפשר גם להדפיס. ובכל משחק אפשר לשים את המילים שלכם.', 'משחקים על המסך שניתנים גם להדפסה') + `
  <div class="wrap">
    <h2 class="sec-h">בונים משחק משלכם ומשחקים על המסך</h2>
    <div class="cards">${D.creators.filter(c=>canPlay(c.id)||c.id==='battle').map(creatorCard).join('')}</div>
    <h2 class="sec-h">משחקים מוכנים על המסך</h2>
    <form class="filters" id="gf" onsubmit="return false">
      <input type="search" name="q" placeholder="חיפוש משחק...">
      <select name="type"><option value="">כל הסוגים</option>${types.map(t=>`<option>${esc(t)}</option>`).join('')}</select>
      <select name="format"><option value="">כל הצורות</option>${formats.map(t=>`<option>${esc(t)}</option>`).join('')}</select>
      <select name="age"><option value="">כל הגילאים</option>${ages.map(t=>`<option>${esc(t)}</option>`).join('')}</select>
      <input type="number" name="n" min="1" placeholder="מספר משתתפים" style="width:150px">
      <label class="check" style="display:flex;align-items:center;gap:6px"><input type="checkbox" name="noequip"> בלי ציוד</label>
    </form>
    <div class="cards" id="gl"></div>
    <div class="box center" style="margin-top:30px"><h3>מחפשים משהו להדפיס?</h3><a class="btn btn-gold" href="#/create">לפעילויות להדפסה בהתאמה אישית</a></div>
  </div>`;
};
pages.games.after = () => {
  const f = document.getElementById('gf'), l = document.getElementById('gl');
  const run = () => {
    const v = Object.fromEntries(new FormData(f)); const n = +v.n;
    const res = content('games').filter(isScreenGame).filter(g => (!v.q || JSON.stringify(g).includes(v.q)) && (!v.type || g.type===v.type) && (!v.format || (g.format||[]).includes(v.format)) && (!v.age || g.age===v.age) && (!n || (n>=g.min && n<=g.max)) && (!v.noequip || !g.equip));
    l.innerHTML = res.length ? res.map(gameCard).join('') : '<div class="empty">אין משחק שמתאים לכל המסננים. נסה להוריד אחד.</div>';
  };
  f.oninput = run; run();
};

pages.game = ([id]) => {
  const g = findIn('games', id); if(!g) return notFound();
  let play = '';
  if(g.words) play = `<a class="btn btn-gold" href="#/create/${g.creator||(g.id.startsWith('bingo')?'bingo':g.id.startsWith('memory')?'memory':'elias')}?d=${enc({title:g.title, words:g.words.join('\n'), size:g.size||5, count:10})}"> להדפסה / לשחק על המסך</a>`;
  if(g.quartets) play = `<a class="btn btn-gold" href="#/create/quartets?d=${enc({title:g.title, groups:g.quartets.map(q=>q.t+': '+q.i.join(', ')).join('\n')})}"> להדפסת הקלפים</a>`;
  if(g.qa) play = `<button class="btn btn-gold" id="triviaPlay"> מצב הקרנה</button>`;
  if(g.battle) play = `<a class="btn btn-gold" href="#/create/battle">⚔️ לשחק עכשיו</a>`;
  return pageHead(esc(g.title), esc(g.short), `${isScreenGame(g)?'<a href="#/games">משחקים על המסך שניתנים גם להדפסה</a>':'<a href="#/create">פעילויות להדפסה</a>'} › ${esc(g.title)}`) + `
  <div class="wrap detail">
    <div>
      <div class="box"><h2>איך משחקים?</h2><p>${esc(g.how)}</p><div class="btn-row">${play}<button class="btn btn-light" id="printHow">הדפסת ההוראות</button><button class="btn btn-light" data-fav="games|${esc(g.id)}">${isFav('games',g.id)?'♥':'♡'} שמירה</button><button class="btn btn-light" id="share"> שיתוף</button></div></div>
      ${g.qa?`<div class="box"><h3>השאלות</h3><ol>${g.qa.map(([q,a])=>`<li>${esc(q)} <span class="muted">– ${esc(a)}</span></li>`).join('')}</ol></div>`:''}
      ${g.words?`<div class="box"><h3>המילים במשחק</h3><div class="tags">${g.words.map(w=>`<span class="tag">${esc(w)}</span>`).join('')}</div></div>`:''}
    </div>
    <aside class="box"><ul class="meta-list"><li><span>סוג</span><b>${esc(g.type)}</b></li><li><span>משתתפים</span><b>${esc(g.min)}–${esc(g.max)}</b></li><li><span>גיל</span><b>${esc(g.age)}</b></li><li><span>זמן</span><b>${esc(g.time)}</b></li><li><span>ציוד</span><b>${g.equip?'צריך':'לא צריך'}</b></li></ul></aside>
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
  el.innerHTML = '<button class="close-x" aria-label="סגירה">×</button><div class="ov-body" style="display:flex;flex-direction:column;align-items:center"></div><div class="gp-credit">משחקים באתר מדליק · <bdi dir="ltr">' + SITE_HOST + '</bdi></div>';
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
  cards:{title:'כרטיסיות שאלות', words:'מה הזיכרון הכי מתוק שלך מחנוכה?\nאיזה מילוי סופגנייה את הכי אוהבת?\nאם היית נר – איזה נר היית?\nמה מדליק לך את הלב?\nמה המסורת המשפחתית שלכם בחנוכה?\nאיזה שיר חנוכה את הכי אוהבת?'},
  memory:{title:'זיכרון חנוכה', words:'סביבון\nלביבה\nסופגנייה\nחנוכייה\nשמש\nפך שמן\nמכבים\nנר'},
  wordsearch:{title:'תפזורת חנוכה', words:'סביבון\nלביבה\nסופגניה\nחנוכיה\nשמש\nמכבים\nשמן\nנס', size:12}
};
const GP = window.GamesPro || {DEFAULTS:{}, NEW:[], PLAYABLE:[], fields:()=>null, autoRules(){}};
Object.assign(creatorDefaults, GP.DEFAULTS);
const canPlay = type => ['memory','cards'].includes(type) || GP.PLAYABLE.includes(type);
const PRINT_FILES = [
  {href:'kids/coloring.html', ico:'🖍️', title:'דפי צביעה ומנדלות לחנוכה', text:'דפי צביעה ומנדלות מוכנים. פותחים ומדפיסים.', bg:'#ffe3ec'},
  {href:'kids/booklet.html', ico:'📖', title:'חוברת פעילות: מסע האור', text:'חוברת פעילות לילדים לחנוכה, מוכנה להדפסה.', bg:'#e3ecff'}
];
const printFileCard = x => `<a class="card" href="${x.href}" target="_blank" rel="noopener"><div class="card-top" style="--bg:${x.bg}"><span style="font-size:4.5rem;line-height:1">${x.ico}</span></div><div class="card-body"><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p><div class="tags"><span class="tag tag-new">חדש!</span><span class="tag tag-gold">חינם</span></div></div></a>`;
pages.create = () => pageHead('פעילויות להדפסה בהתאמה אישית', 'בוחרים פעילות, מכניסים את המילים שלכם, ומקבלים דף מעוצב להדפסה או ל־PDF. הכול בחינם.', 'פעילויות להדפסה') + `<div class="wrap">
  <h2 class="sec-h">מעצבים פעילות משלכם</h2><div class="cards">${D.creators.filter(c=>!canPlay(c.id)&&c.id!=='battle').map(creatorCard).join('')}</div>
  <h2 class="sec-h">דפי צביעה וחוברת פעילות</h2><div class="cards">${PRINT_FILES.map(printFileCard).join('')}</div>
  <h2 class="sec-h">פעילויות מוכנות</h2><div class="cards">${content('games').filter(g=>!isScreenGame(g)&&!['quartets-hanukkah','bingo-hanukkah','who-am-i'].includes(g.id)).map(gameCard).join('')}</div>
  <div class="box center" style="margin-top:30px"><h3>רוצים לשחק על המסך?</h3><a class="btn btn-gold" href="#/games">למשחקים הדיגיטליים על המסך</a></div></div>`;

function getGameState(type, q){
  const s = Object.assign({palette:0, font:'frank'}, creatorDefaults[type], q.d ? dec(q.d) : {});
  return s;
}
pages.creator = ([type], q) => {
  const c = D.creators.find(x=>x.id===type); if(!c) return notFound();
  const s = getGameState(type, q);
  const wordsField = GP.fields(type, s) || (type==='quartets'
    ? `<label>רביעיות <span class="hint">שורה לכל רביעייה: נושא: פריט, פריט, פריט, פריט</span><textarea name="groups" rows="8">${esc(s.groups)}</textarea></label>`
    : `<label>${type==='cards'?'שאלות':'מילים'} <span class="hint">אחת בכל שורה</span><textarea name="words" rows="10">${esc(s.words)}</textarea></label>`);
  return pageHead(esc(c.title), esc(c.text), `${(canPlay(type)||type==='battle')?'<a href="#/games">משחקים על המסך שניתנים גם להדפסה</a>':'<a href="#/create">פעילויות להדפסה</a>'} › ${esc(c.title)}`) + `
  <div class="wrap builder">
    <form class="box form builder-panel" id="cf">
      ${GP.RULES && GP.RULES[type]?'<button type="button" class="rules-btn" id="doRules"><span class="q">?</span><span>איך משחקים? הוראות מלאות<small>כל החוקים, שלב אחר שלב</small></span></button>':''}
      <label>כותרת<input name="title" value="${esc(s.title)}"></label>
      ${wordsField}
      ${type==='bingo'?`<div class="two-col"><label>מספר לוחות<input type="number" name="count" min="1" max="200" value="${esc(s.count)}"></label><label>גודל<select name="size"><option value="4" ${s.size==4?'selected':''}>4×4</option><option value="5" ${s.size==5?'selected':''}>5×5</option></select></label></div>`:''}
      ${type==='wordsearch'?`<label>גודל הלוח<select name="size">${[10,12,14].map(n=>`<option ${s.size==n?'selected':''}>${n}</option>`).join('')}</select></label>`:''}
      <div><b>צבעים</b><div class="swatches">${gPalettes.map((p,i)=>`<button type="button" class="swatch ${s.palette==i?'on':''}" data-pal="${i}" style="background:linear-gradient(135deg,${p.c} 50%,${p.bg} 50%)" aria-label="צבע ${i+1}"></button>`).join('')}</div></div>
      <label>גופן<select name="font">${D.fonts.map(f=>`<option value="${f.id}" ${s.font===f.id?'selected':''}>${f.name}</option>`).join('')}</select></label>
      <div class="btn-row">
        <button type="button" class="btn btn-gold" id="doPrint"> הדפסה / PDF</button>
        ${canPlay(type)?'<button type="button" class="btn" id="doPlay"> לשחק על המסך</button>':''}
        <button type="button" class="btn btn-light" id="doShare"> קישור לשיתוף</button>
        <button type="button" class="btn btn-light" id="doSave">♡ שמירה</button>
      </div>
      <p class="hint">להורדה כ-PDF: בחלון ההדפסה בחר "שמירה כ-PDF".</p>
    </form>
    <div class="preview-area" id="pv"></div>
  </div>`;
};
pages.creator.after = ([type], q) => {
  const f = document.getElementById('cf'), pv = document.getElementById('pv');
  const s = getGameState(type, q);
  let cache = null; // כדי שהבינגו/תפזורת לא יתערבבו בכל הקלדה
  const read = () => { const v = Object.fromEntries(new FormData(f)); f.querySelectorAll('input[type=checkbox][name]').forEach(cb => v[cb.name] = cb.checked); Object.assign(s, v); return s; };
  const draw = (reshuffle) => { read(); if(reshuffle || !cache) cache = null; pv.innerHTML = withCredit(renderGame(type, s, cache || (cache = {}))); };
  f.oninput = () => draw(false);
  f.onclick = e => { const b = e.target.closest('[data-pal]'); if(!b) return; s.palette = +b.dataset.pal; f.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('on', x===b)); draw(false); };
  draw(true);
  const link = () => { read(); return `#/create/${type}?d=${enc(s)}`; };
  document.getElementById('doPrint').onclick = () => printHTML(pv.innerHTML);
  document.getElementById('doShare').onclick = () => copyLink(link());
  document.getElementById('doSave').onclick = () => { store.push('saved', {kind:'משחק', title:s.title, link:link()}); toast('נשמר באזור האישי ♡'); };
  const startPlay = () => { read(); if(GP.PLAYABLE.includes(type) && window.GamesPlay) return GamesPlay.start(type, s, cache || (cache = {})); type==='memory' ? playMemory(lines(s.words)) : playCards(lines(s.words), false); };
  const play = document.getElementById('doPlay');
  if(play) play.onclick = startPlay;
  pv.addEventListener('click', e => { if(e.target.closest('[data-play]')) startPlay(); });
  const rb = document.getElementById('doRules');
  if(rb) rb.onclick = () => GP.showRules(type, {onPlay: canPlay(type) ? startPlay : null});
  GP.autoRules(type, canPlay(type) ? startPlay : null);
};

function gameVars(s){ const p = gPalettes[s.palette||0], fnt = (D.fonts.find(x=>x.id===s.font)||D.fonts[0]).css; return `--gc1:${p.c};--gbg:${p.bg};--gf:${fnt}`; }
const pzMen = '<svg class="pz-men" viewBox="0 0 54 40" aria-hidden="true"><path d="M4 14 q0 20 23 20 q23 0 23 -20" fill="none" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/><path d="M27 34 v5 M17 39 h20" stroke="#ffd23f" stroke-width="3" stroke-linecap="round"/>' + [4,11,18,27,36,43,50].map(x=>'<rect x="'+(x-1.4)+'" y="'+(x===27?4:11)+'" width="2.8" height="'+(x===27?22:15)+'" rx="1" fill="#fff"/><ellipse cx="'+x+'" cy="'+(x===27?2.5:9.5)+'" rx="2.2" ry="3.2" fill="#ffb703"/>').join('') + '</svg>';
const pzHead = t => `<span class="pz-c a">✦</span><span class="pz-c b">✦</span><span class="pz-c c">✦</span><span class="pz-c d">✦</span><div class="pz-head">${pzMen}<h2>${esc(t)}</h2>${pzMen}</div>`;
const isEmo = c => /^[\p{Extended_Pictographic}‍️\s]+$/u.test(c);
function renderGame(type, s, cache){
  const v = gameVars(s), title = pzHead(s.title), foot = '<small>מדליק</small>';
  const sheets = (items, per, cols, cellFn) => chunk(items, per).map(pg=>`<div class="sheet" style="${v}">${title}<div class="g-cards" style="grid-template-columns:repeat(${cols},1fr)">${pg.map(cellFn).join('')}</div></div>`).join('') || '<div class="empty">הכנס מילים כדי לראות תצוגה</div>';
  if(GP.NEW.includes(type)) return GP.render(type, s, cache, v, title);
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
    return cache.boards.map((b,bi)=>{ const cells = b.slice(); if(n===5) cells.splice(12,0,'🔥'); return `<div class="sheet" style="${v};--n:${n}">${title}<div class="bingo">${cells.map((c,i)=>`<div class="${n===5&&i===12?'free':isEmo(c)?'emo':''}">${esc(c)}</div>`).join('')}</div><p class="pz-note">מסמנים כל תמונה שמזהים · שורה מלאה = בינגו! <span class="pz-badge">לוח ${bi+1}</span></p></div>`; }).join('');
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

const styleCard = s => `<a class="card" href="#/studio/edit?style=${esc(s.id)}&fmt=invite"><div class="card-top style-top"><img src="${esc(s.img)}" alt="" loading="lazy"></div><div class="card-body"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p><div class="tags"><span class="tag tag-gold">שפה עיצובית</span></div></div></a>`;
pages.studio = () => {
  const styles = (D.styles || []).filter(s => !s.legacy), fmts = window.MadlikEditor.FORMATS, mine = store.get('designs', []);
  const T = D.templates, by = ids => ids.map(i => T.find(t => t.id === i)).filter(Boolean), used = new Set();
  const grp = (h, p, ids) => { const l = by(ids); l.forEach(x => used.add(x.id)); return l.length ? `<div class="st-grp"><h3 class="st-h3">${h}</h3>${p ? `<p class="muted" style="margin:0 0 14px">${p}</p>` : ''}<div class="cards">${l.map(tplCard).join('')}</div></div>` : ''; };
  const products = grp('מדבקות עגולות, 3 גדלים', 'מקבלים דף שלם של מדבקות, מוכנות לגזירה.', ['sticker-s','sticker','sticker-l'])
    + grp('מדבקות מלבניות, 3 גדלים', 'דף שלם של מדבקות מלבניות.', ['rect-s','rect-m','rect-l'])
    + grp('דגלונים לקיסם', 'שני עיגולים עם קו קיפול: מדפיסים, גוזרים ומקפלים סביב הקיסם.', ['pick-flag'])
    + grp('בקבוקים וכוסות', 'מדבקות לבקבוק גדול וקטן, ותבנית להדבקה על כוס קרטון.', ['bottle','bottle-small','cup-wrap','oil-label'])
    + grp('הזמנה, תכניה, פלייסמנט ושילוט', 'דפים להדפסה על A4 או A5.', ['invite','schedule','placemat','entrance-sign','sign','menu','poster','certificate'])
    + grp('עוד כרטיסים ותוויות', '', T.filter(t => t.repeat && !used.has(t.id)).map(t => t.id));
  return pageHead('סטודיו מיתוג', 'בוחרים שפה עיצובית, בוחרים מה להדפיס, עורכים את הטקסט, ורואים את הדף בדיוק כמו בהדפסה.', 'סטודיו מיתוג') + `
  <div class="wrap">
    <section class="st-sec"><h2 class="st-h"><i>1</i>איזו שפה עיצובית מדברת אליך?</h2>
      <div class="st-styles" role="radiogroup" aria-label="שפה עיצובית">
        ${styles.map((s,i)=>`<label class="st-card"><input type="radio" name="stl" value="${esc(s.id)}" ${i===0?'checked':''}><span class="st-img"><img src="${esc(s.thumb||s.img)}" loading="lazy" alt="תצוגה של הסגנון ${esc(s.name)}"></span><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></label>`).join('')}
        <label class="st-card"><input type="radio" name="stl" value="plain" ${styles.length?'':'checked'}><span class="st-img plain-img"><i></i></span><b>צבע אחד, בלי תמונה</b><small>בוחרים ערכת צבעים פשוטה</small></label>
      </div></section>
    <section class="st-sec"><h2 class="st-h"><i>2</i>מה רוצים להדפיס?</h2>${products}</section>
    <section class="st-sec"><h2 class="st-h">עורך חופשי</h2><p class="muted" style="margin:0 0 14px">רוצים להזיז כל דבר בעצמכם? פותחים דף ריק בשפה שבחרתם.</p>
      <div class="st-fmts" role="radiogroup" aria-label="גודל">${fmts.map(f=>`<label class="st-fmt"><input type="radio" name="fmt" value="${f.id}" ${f.id==='invite'?'checked':''}><span>${f.n}</span></label>`).join('')}</div>
      <div class="st-go"><a class="btn btn-gold" id="stGo" href="#/studio/edit?style=${styles[0]?esc(styles[0].id):'plain'}&fmt=invite">פותחים את העורך ←</a></div></section>
    ${mine.length ? `<section class="st-sec"><h2 class="st-h">העיצובים שלי</h2><div class="st-mine">${mine.map(d=>`<a href="#/studio/edit?load=${esc(d.id)}">${esc(d.title)}</a>`).join('')}</div></section>` : ''}
  </div>`;
};
pages.studio.after = () => {
  const go = document.getElementById('stGo'), sty = id => (D.styles || []).find(x => x.id === id);
  const upd = () => {
    const sEl = document.querySelector('[name=stl]:checked'), f = document.querySelector('[name=fmt]:checked'), v = sEl ? sEl.value : 'plain', st = sty(v);
    go.setAttribute('href', `#/studio/edit?style=${v}&fmt=${f ? f.value : 'invite'}`);
    document.querySelectorAll('a[data-tpl]').forEach(c => {
      c.setAttribute('href', '#/studio/' + c.dataset.tpl + (st ? '?style=' + encodeURIComponent(v) : ''));
      const top = c.querySelector('.tpl-top'); if(!top) return;
      top.classList.toggle('has-bg', !!st); top.style.backgroundImage = st ? 'url(' + (st.thumb || st.img) + ')' : '';
    });
  };
  document.querySelectorAll('[name=stl],[name=fmt]').forEach(i => i.onchange = upd); upd();
};

pages.edit = () => `<div class="wrap ed-page"><div id="edHost"></div></div>`;
pages.edit.after = (p, q) => {
  const ME = window.MadlikEditor; let state = null, o = {};
  if(q.load) state = ME.loadDesign(q.load);
  else if(q.d) state = ME.decState(q.d);
  else if(q.style || q.fmt) o = {style:q.style || 'plain', fmt:q.fmt || 'invite'};
  else state = ME.draft();
  if(state && !state.assets) state.assets = {};
  ME.mount(document.getElementById('edHost'), state && state.layers ? {state} : o);
};

pages.design = ([id], q) => {
  const t = D.templates.find(x=>x.id===id); if(!t) return notFound();
  const styles = (D.styles || []).filter(x => !x.legacy);
  const s = Object.assign({theme:'gold-blue', font: q.style ? 'suez' : 'frank', deco:'❖', style: q.style || ''}, t.fields, q.d?dec(q.d):{});
  const fl = {pre:'שורה עליונה', title:'כותרת', sub:'תת־כותרת', body:'פרטים', foot:'שורה תחתונה'};
  return pageHead(esc(t.title), 'בוחרים שפה, משלימים את הטקסט, והדף מוכן בדיוק כמו שיודפס.', `<a href="#/studio">סטודיו</a> › ${esc(t.title)}`) + `
  <div class="wrap builder">
    <form class="box form builder-panel ed-lite" id="df">
      <div><b>שפה עיצובית</b><div class="st-pick" id="stPick">${styles.map(x=>`<button type="button" class="stp ${s.style===x.id?'on':''}" data-style="${esc(x.id)}" title="${esc(x.name)}"><img src="${esc(x.thumb||x.img)}" alt="${esc(x.name)}" loading="lazy"></button>`).join('')}<button type="button" class="stp stp-plain ${s.style?'':'on'}" data-style="" title="בלי תמונה">בלי</button></div></div>
      ${Object.keys(fl).map(k=> (k==='body' ? `<label>${fl[k]}<textarea name="body" rows="4">${esc(s.body)}</textarea></label>` : `<label>${fl[k]}<input name="${k}" value="${esc(s[k])}"></label>`)).join('')}
      <div id="themeBox"><b>ערכת צבעים</b><div class="swatches">${D.themes.map(th=>`<button type="button" class="swatch ${s.theme===th.id?'on':''}" data-theme="${th.id}" title="${th.name}" style="background:linear-gradient(135deg,${th.bg} 55%,${th.acc} 55%)"></button>`).join('')}</div></div>
      <div class="two-col">
        <div class="tp-font"><b>גופן</b><button type="button" class="fcard" id="tpFont"><span class="fcard-pv" id="tpPv">חנוכה שמח</span><span class="fcard-m"><b id="tpName"></b><small id="tpCat"></small></span><span class="fcard-go">ספריית גופנים · ${window.MadlikFonts ? window.MadlikFonts.LIST.length : 300} ‹</span></button><div class="brow"><button type="button" class="bold-c" id="tpBold" aria-pressed="false" aria-label="מודגש" title="מודגש"><b>ב</b></button><span class="brow-t"><b>מודגש</b><small id="tpBoldT">כבוי</small></span></div></div>
        <label>קישוט<select name="deco">${D.decos.map(d=>`<option ${s.deco===d?'selected':''} value="${d}">${d||'בלי'}</option>`).join('')}</select></label>
      </div>
      <label>לוגו או תמונה <span class="hint">לא חובה</span><input type="file" accept="image/*" id="logoIn"></label>
      <label>גודל התצוגה <input type="range" id="zm" min="40" max="260" value="100"></label>
      <div class="btn-row">
        <button type="button" class="btn btn-gold" id="dPrint"> הדפסה / PDF</button>
        <button type="button" class="btn" id="dPng"> הורדה כתמונה</button>
        <button type="button" class="btn btn-light" id="dShare"> שיתוף</button>
        <button type="button" class="btn btn-light" id="dSave">♡ שמירה</button>
      </div>
      <p class="hint">${t.repeat?'מה שרואים בתצוגה הוא הדף המלא כפי שיודפס, עם כל המדבקות.':'להורדה כ-PDF: בחלון ההדפסה בחר "שמירה כ-PDF".'} הלוגו לא נשמר בקישור השיתוף.</p>
    </form>
    <div class="preview-area" id="dv"></div>
  </div>`;
};
pages.design.after = ([id], q) => {
  const t = D.templates.find(x=>x.id===id); if(!t) return;
  const f = document.getElementById('df'), dv = document.getElementById('dv');
  const s = Object.assign({theme:'gold-blue', font: q.style ? 'suez' : 'frank', deco:'❖', style: q.style || ''}, t.fields, q.d?dec(q.d):{});
  let logo = '', zoomK = 1;
  const read = () => Object.assign(s, Object.fromEntries(new FormData(f)));
  const draw = () => {
    read(); const sh = sheetHTML(t, s, logo); dv.innerHTML = sh.html;
    const el = dv.firstElementChild, fit = Math.min(1, (dv.clientWidth - 24) / el.offsetWidth);
    el.style.zoom = fit * zoomK;
    document.getElementById('themeBox').style.display = s.style ? 'none' : '';
  };
  const F = window.MadlikFonts;
  const syncFont = () => {
    const lf = D.fonts.find(x => x.id === s.font), meta = F && F.BY[s.font], bold = (s.fw || 0) >= 600;
    const css = lf ? lf.css : "'" + s.font + "',sans-serif";
    const pv = document.getElementById('tpPv'); pv.style.fontFamily = css; pv.style.fontWeight = s.fw || 400; pv.textContent = meta && !meta.he ? 'Happy Hanukkah' : 'חנוכה שמח';
    document.getElementById('tpName').textContent = lf ? lf.name : s.font; document.getElementById('tpCat').textContent = meta ? (meta.he ? 'עברית · ' : '') + F.CAT[meta.c] : 'גופן מובנה';
    const bb = document.getElementById('tpBold'); bb.classList.toggle('on', bold); bb.setAttribute('aria-pressed', bold); document.getElementById('tpBoldT').textContent = bold ? 'פעיל' : 'כבוי';
  };
  syncFont();
  document.getElementById('tpFont').onclick = () => { if(!F) return; read(); F.open({font:s.font, text:s.title, weight:s.fw, bold:(s.fw || 0) >= 600, he:true,
    onPick: n => { s.font = n; syncFont(); draw(); F.ensure(n).then(draw); }, onBold: on => { s.fw = on ? 700 : 400; syncFont(); draw(); }}); };
  document.getElementById('tpBold').onclick = () => { s.fw = (s.fw || 0) >= 600 ? 400 : 700; syncFont(); draw(); };
  f.oninput = draw;
  f.onclick = e => {
    const sb = e.target.closest('[data-style]');
    if(sb){ s.style = sb.dataset.style; f.querySelectorAll('.stp').forEach(x => x.classList.toggle('on', x === sb)); draw(); return; }
    const b = e.target.closest('[data-theme]'); if(!b) return; s.theme = b.dataset.theme; f.querySelectorAll('.swatch').forEach(x=>x.classList.toggle('on', x===b)); draw();
  };
  document.getElementById('zm').oninput = e => { zoomK = e.target.value / 100; draw(); };
  document.getElementById('logoIn').onchange = e => { const file = e.target.files[0]; if(!file) return; if(file.size > 5e6) return toast('הקובץ גדול מדי (עד 5MB)'); const r = new FileReader(); r.onload = () => { logo = r.result; draw(); }; r.readAsDataURL(file); };
  const onResize = () => document.body.contains(f) ? draw() : window.removeEventListener('resize', onResize);
  window.addEventListener('resize', onResize);
  draw();
  document.getElementById('dPrint').onclick = () => { read(); const go = () => { const sh = sheetHTML(t, s, logo); printHTML(sh.html, {credit:false, page:sh.page, margin:0}); }; (F && F.BY[s.font] ? F.ensure(s.font) : Promise.resolve()).then(go); };
  document.getElementById('dShare').onclick = () => { read(); copyLink(`#/studio/${t.id}?d=${enc(s)}`); };
  document.getElementById('dSave').onclick = () => { read(); store.push('saved', {kind:'עיצוב', title:t.title+' – '+s.title, link:`#/studio/${t.id}?d=${enc(s)}`}); toast('נשמר באזור האישי ♡'); };
  document.getElementById('dPng').onclick = () => {
    const go = () => { const d = dv.firstElementChild; const z = d.style.zoom; d.style.zoom = 1;
      window.html2canvas(d, {scale:2, backgroundColor:'#ffffff'}).then(cv=>{ d.style.zoom = z; const a = document.createElement('a'); a.download = 'madlik-'+t.id+'.png'; a.href = cv.toDataURL('image/png'); a.click(); }); };
    if(window.html2canvas) return go();
    toast('מכינה את התמונה...');
    const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; sc.onload = go; sc.onerror = () => toast('לא הצלחתי לטעון – נסה הדפסה ל-PDF'); document.head.appendChild(sc);
  };
};

/* דף מלא כפי שיודפס: מדבקות רבות על דף A4, או פריט בודד במרכז הדף */
function sheetHTML(t, s, logo){
  const land = t.land || (!t.repeat && t.w > t.h), pw = land ? 297 : 210, ph = land ? 210 : 297, tw = t.pair ? t.w*2+6 : t.w, m = t.repeat ? 10 : 0;
  const one = designHTML(t, s, logo);
  let inner = one;
  if(t.repeat){
    const cols = Math.max(1, Math.floor((pw - 2*m) / (tw + 4))), rows = Math.max(1, Math.floor((ph - 2*m) / (t.h + 4)));
    inner = `<div class="sheet-labels" style="grid-template-columns:repeat(${cols},${tw}mm)">${Array(cols*rows).fill(one).join('')}</div>`;
  }
  return {page: land ? 'A4 landscape' : 'A4', html: `<div class="pv-page ${t.repeat ? 'rep' : ''}" style="width:${pw}mm;height:${ph - .5}mm;padding:${m}mm">${inner}</div>`};
}

function designHTML(t, s, logo){
  const st = s.style ? (D.styles || []).find(x => x.id === s.style && x.tpl) : null;
  const lf = D.fonts.find(x=>x.id===s.font), fnt = lf ? lf.css : (window.MadlikFonts && window.MadlikFonts.BY[s.font] ? `'${s.font}','Assistant',sans-serif` : D.fonts[0].css);
  if(!lf && window.MadlikFonts && window.MadlikFonts.BY[s.font]) window.MadlikFonts.ensure(s.font);
  const fs = Math.min(t.w, t.h)/32, small = Math.min(t.w,t.h) < 80, em = t.fs || fs*(small?1.6:1);
  const logoImg = logo ? `<img class="d-logo" src="${logo}" alt="">` : '';
  let one;
  if(st){
    const k = st.tpl, zoom = Math.max(2, (t.w/t.h)/1.414*1.3), pl = small ? k.pl : k.plb;
    const wide = !small && t.w / t.h > 1.1 && st.landscape === false;
    const bg = small ? `background:#222 url(${st.img}) ${k.focus[0]}% ${k.focus[1]}%/auto ${Math.round(zoom*100)}% no-repeat` : (wide ? `background:#efe3cf url(${st.img}) center/contain no-repeat` : `background:#222 url(${st.img}) center/cover no-repeat`);
    const just = small ? 'center' : (k.pos === 'bottom' ? 'flex-end' : k.pos === 'top' ? 'flex-start' : 'center');
    const pad = small ? '' : ';padding:7% 6%';
    one = `<div class="design styled ${t.round?'round':''}" style="width:${t.w}mm;height:${t.h}mm;font-size:${em}mm;--d-ink:${k.ink};--d-title:${k.title};--d-acc:${k.acc};--d-font:${fnt}${s.fw?';font-weight:'+s.fw:''};${bg};justify-content:${just}${pad}${t.css?';'+t.css:''}">
      <div class="d-plate" style="background:${pl||'transparent'};border-radius:${small?'1.1em':'4mm'};padding:${pl?(small?'.45em .8em':'1.2em 2.2em'):'0'}">
        ${logoImg}${s.pre?`<div class="d-pre">${esc(s.pre)}</div>`:''}
        <div class="d-title">${esc(s.title)}</div>
        ${s.sub?`<div class="d-sub">${esc(s.sub)}</div>`:''}
        ${s.body&&!small?`<div class="d-body">${esc(s.body)}</div>`:''}
        ${s.foot&&!small?`<div class="d-foot">${esc(s.foot)}</div>`:''}
      </div></div>`;
  } else {
    const th = D.themes.find(x=>x.id===s.theme)||D.themes[0];
    one = `<div class="design ${t.round?'round':''}" style="width:${t.w}mm;height:${t.h}mm;font-size:${em}mm;--d-bg:${th.bg};--d-ink:${th.ink};--d-title:${th.title};--d-acc:${th.acc};--d-font:${fnt}${s.fw?';font-weight:'+s.fw:''};--d-r:${t.round?'50%':'6px'}${t.css?';'+t.css:''}">
    ${t.nofr?'':'<div class="d-frame"></div>'}
    ${logo?logoImg:(s.deco&&!small?`<div class="d-deco">${esc(s.deco)}</div>`:'')}
    ${s.pre?`<div class="d-pre">${esc(s.pre)}</div>`:''}
    <div class="d-title">${esc(s.title)}</div>
    ${s.sub?`<div class="d-sub">${esc(s.sub)}</div>`:''}
    ${s.body&&!small?`<div class="d-body">${esc(s.body)}</div>`:''}
    ${s.foot&&!small?`<div class="d-foot">${esc(s.foot)}</div>`:''}
  </div>`;
  }
  return t.pair ? `<div class="d-pair">${one}<i class="d-fold"></i>${one}</div>` : one;
}

/* מתכונים */
pages.recipes = () => {
  const cats = [...new Set(content('recipes').map(r=>r.cat))];
  return pageHead('מתכונים לערב לביבות', 'לביבות, סופגניות, מגשי אירוח ושתייה – עם חישוב כמויות לפי מספר הסועדים.', 'מתכונים') + `
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
        <div class="servings">מספר סועדים: <button id="sMinus" aria-label="פחות">−</button><strong id="sNum">${r.serves}</strong><button id="sPlus" aria-label="יותר">+</button></div>
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
  document.getElementById('rPrint').onclick = () => printHTML(`<div class="sheet" style="aspect-ratio:auto"><h1>${esc(r.title)}</h1><p>${n} סועדים · ${esc(r.time)} דק׳ · ${esc(r.level)}</p><h2>מצרכים</h2><ul>${list().map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h2>אופן ההכנה</h2><ol>${r.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><p style="color:#c49a45;text-align:center">מדליק · כל מה שצריך לערב לביבות</p></div>`);
  draw();
};

/* בעלי עסקים */
const ADS_EMAIL = 'rivki1806@gmail.com';
const PLANS = [
  {id:'Basic', name:'Basic', price:'300 ₪', text:'רואים אותך בעמוד העסקים.', cls:'p1'},
  {id:'Premium', name:'Premium', price:'400 ₪', text:'הפרסומת שלך גם בעמוד העסקים וגם עולה בעמוד הראשי בהרצה.', cls:'p2'},
  {id:'Pro', name:'Pro', price:'הצעה משתלמת', text:'ביצירת קשר.', cls:'p3'}
];
function adBlock(){
  return `<section class="ad-block" id="adBlock">
    <h2 class="ad-title">רוצים לפרסם?<br><span>בחרו תכנית</span></h2>
    <div class="plans">${PLANS.map(p=>`<button type="button" class="plan ${p.cls}" data-plan="${p.id}"><span class="plan-name">${p.name}</span><b class="plan-price">${p.price}</b><span class="plan-text">${p.text}</span><span class="plan-cta">אני רוצה את זה ←</span></button>`).join('')}</div>
    <h3 class="ad-sub">ואחרי שבחרתם, צרו איתנו קשר</h3>
    <form class="box form ad-form" id="af">
      <div class="two-col"><label>שם העסק<input name="biz" required></label><label>איש/אשת קשר<input name="name" required></label></div>
      <div class="two-col"><label>טלפון<input name="phone" type="tel" required></label><label>מייל<input name="email" type="email" required></label></div>
      <div class="two-col"><label>תחום<input name="cat" placeholder="למשל: קייטרינג"></label><label>אזור<input name="region"></label></div>
      <label>איזו תכנית מעניינת אתכם?<select name="pkg"><option>עוד לא יודעים</option>${PLANS.map(p=>`<option>${p.id}</option>`).join('')}</select></label>
      <label>על העסק<textarea name="msg"></textarea></label>
      <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off">
      <button class="btn btn-gold">שליחה</button>
      <p class="hint">ההודעה מגיעה ישירות אלינו, ונחזור אליכם בהקדם.</p>
    </form>
  </section>`;
}
function sendToOwner(d){
  const body = Object.assign({_subject:'בקשת פרסום חדשה במדליק: '+(d.biz||''), _template:'table', _captcha:'false'}, d);
  return fetch('https://formsubmit.co/ajax/'+ADS_EMAIL, {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body:JSON.stringify(body)})
    .then(r=>r.json()).then(r=>{ if(!(r.success===true || r.success==='true')) throw new Error(r.message||'שליחה נכשלה'); });
}
function adBlockAfter(){
  const f = document.getElementById('af'); if(!f) return;
  document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => { f.pkg.value = b.dataset.plan; f.scrollIntoView({behavior:'smooth', block:'center'}); setTimeout(()=>f.biz.focus({preventScroll:true}), 500); });
  f.onsubmit = e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(f)); if(data._honey) return; delete data._honey;
    const btn = f.querySelector('.btn-gold'); btn.disabled = true; btn.textContent = 'שולחים...';
    record('ads', data);
    sendToOwner(data)
      .then(()=>{ f.reset(); toast('תודה! קיבלנו, ונחזור אליכם בקרוב'); })
      .catch(()=>toast('לא הצלחנו לשלוח. אפשר לכתוב לנו ישירות ל־'+ADS_EMAIL))
      .finally(()=>{ btn.disabled = false; btn.textContent = 'שליחה'; });
  };
}

pages.suppliers = () => {
  const all = content('suppliers'), cats = [...new Set(all.map(s=>s.cat))], regions = ['צפון','חיפה','שרון','מרכז','ירושלים','שפלה','דרום'];
  return pageHead('בעלי עסקים שישדרגו לכם את האירוע', 'אולמות, קייטרינג, מפעילים, עיצוב וקינוחים. לפי אזור, סוג ומחיר.', 'בעלי עסקים') + `
  <div class="wrap">
    <a class="ad-strip" href="#/advertise" data-scroll="adBlock"><b>רוצים לפרסם?</b><span>צרו איתנו קשר</span><i>←</i></a>
    <form class="filters" id="sf" onsubmit="return false"><input type="search" name="q" placeholder="חיפוש עסק..."><select name="cat"><option value="">כל סוגי השירות</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select><select name="region"><option value="">כל הארץ</option>${regions.map(c=>`<option>${c}</option>`).join('')}</select><select name="price"><option value="">כל טווחי המחיר</option><option>₪</option><option>₪₪</option><option>₪₪₪</option></select></form>
    <div class="cards" id="sl"></div>
    ${adBlock()}
  </div>`;
};
pages.suppliers.after = () => {
  showBizNotice();
  const f = document.getElementById('sf'), l = document.getElementById('sl');
  const run = () => { const v = Object.fromEntries(new FormData(f)); const res = content('suppliers').filter(s=>(!v.q||JSON.stringify(s).includes(v.q))&&(!v.cat||s.cat===v.cat)&&(!v.region||s.region===v.region)&&(!v.price||s.price===v.price)).sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)); l.innerHTML = res.length ? res.map(supCard).join('') : '<div class="empty">אין עדיין עסקים שמתאימים. נסו אזור אחר.</div>'; };
  f.oninput = run; run();
  const st = document.querySelector('[data-scroll]'); if(st) st.onclick = e => { e.preventDefault(); document.getElementById('adBlock').scrollIntoView({behavior:'smooth', block:'start'}); };
  adBlockAfter();
};

pages.supplier = ([id]) => {
  const s = findIn('suppliers', id); if(!s) return notFound();
  return pageHead(esc(s.name), esc(s.text), `<a href="#/suppliers">בעלי עסקים</a> › ${esc(s.name)}`) + `
  <div class="wrap detail">
    <div class="box"><h2>שליחת פנייה</h2>
      <form class="form" id="lf"><div class="two-col"><label>שם<input name="name" required></label><label>טלפון<input name="phone" type="tel" required></label></div><label>מייל<input name="email" type="email"></label><div class="two-col"><label>תאריך האירוע<input name="date" type="date"></label><label>מספר משתתפים<input name="count" type="number" min="1"></label></div><label>פרטים<textarea name="msg"></textarea></label><button class="btn btn-gold">שליחה</button></form>
    </div>
    <aside class="box">${supPic(s) ? `<div class="biz-pic">${supPic(s)}</div>` : ''}<ul class="meta-list"><li><span>תחום</span><b>${esc(s.cat)}</b></li><li><span>אזור</span><b>${esc(s.region)}</b></li><li><span>מחיר</span><b>${esc(s.price)}</b></li><li><span>טלפון</span><b><button type="button" class="tel-btn" id="telBtn">הטלפון שלנו</button></b></li><li><span>מייל</span><b><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></b></li></ul><div class="btn-row">${safeUrl(s.site) ? `<a class="btn btn-gold" href="${esc(safeUrl(s.site))}" target="_blank" rel="noopener noreferrer sponsored" data-web="${esc(s.id)}">לאתר שלנו ←</a>` : ''}<button class="btn btn-light" data-fav="suppliers|${esc(s.id)}">${isFav('suppliers',s.id)?'♥':'♡'} שמירה</button></div></aside>
  </div>`;
};
pages.supplier.after = ([id]) => {
  const tb = document.getElementById('telBtn');
  if(tb) tb.onclick = () => { const s = findIn('suppliers', id); if(!s) return; countClick('tel', id); tb.outerHTML = '<a class="tel-btn open" href="tel:' + esc(s.phone) + '" dir="ltr">' + esc(s.phone) + '</a>'; location.href = 'tel:' + s.phone; };
  const f = document.getElementById('lf'); if(!f) return; f.onsubmit = e => { e.preventDefault(); record('leads', Object.assign({supplier:findIn('suppliers',id).name}, Object.fromEntries(new FormData(f)))); f.reset(); toast('הפנייה נשלחה! בעל העסק יחזור אלייך בהקדם'); }; };

pages.advertise = () => pageHead('רוצים לפרסם?', 'בחרו אחת משלוש התכניות, ואחר כך צרו איתנו קשר.', 'פרסום') + `<div class="wrap">${adBlock()}</div>`;
pages.advertise.after = adBlockAfter;

pages.submit = () => pageHead('שליחת רעיון', 'משחק, מתכון או רעיון לאתר. אם הוא יתאים, נוסיף אותו ונכתוב את שמך.', 'שליחת רעיון') + `
  <div class="wrap"><div class="box"><form class="form" id="sbf">
    <label>קטגוריה<select name="cat"><option>משחק</option><option>מתכון</option><option>עיצוב מיתוג</option><option>אחר</option></select></label>
    <label>כותרת<input name="title" required></label>
    <label>התוכן<textarea name="text" required placeholder="תארי את הרעיון, איך משחקים, המצרכים..."></textarea></label>
    <div class="two-col"><label>שם<input name="name"></label><label>מייל<input name="email" type="email"></label></div>
    <label class="check"><input type="checkbox" name="credit" checked> אשמח שיופיע קרדיט עם השם שלי</label>
    <button class="btn btn-gold">שליחה</button></form></div></div>`;
pages.submit.after = () => { const f = document.getElementById('sbf'); f.onsubmit = e => { e.preventDefault(); record('subs', Object.fromEntries(new FormData(f))); f.reset(); toast('תודה! הרעיון נשלח לאישור '); }; };

/* אזור אישי */
pages.me = () => {
  const f = favs(), user = store.get('user', null), saved = store.get('saved', []), shop = store.get('shop', []);
  const favList = (k,fn) => (f[k]||[]).map(id=>findIn(k,id)).filter(Boolean).map(fn).join('');
  const all = favList('games',gameCard)+favList('recipes',recipeCard)+favList('suppliers',supCard);
  return pageHead('האזור שלי', user?`שלום ${esc(user.name)} `:'כאן נשמרים המועדפים, המשחקים והעיצובים שלך.', 'האזור שלי') + `
  <div class="wrap">
    ${user?'':`<div class="box"><h2>פתיחת אזור אישי</h2><form class="form" id="uf"><div class="two-col"><label>שם<input name="name" required></label><label>מייל<input name="email" type="email" required></label></div><label class="check"><input type="checkbox" name="marketing"> אשמח לקבל במייל משחקים, תבניות ועדכונים חדשים</label><button class="btn btn-gold">פתיחה</button></form></div>`}
    <section class="section"><h2>המועדפים שלי</h2>${all?`<div class="cards">${all}</div>`:'<div class="empty">עוד לא שמרת כלום. לחצי על ♡ ליד משחק, מתכון או עסק.</div>'}</section>
    <section class="box"><h2>משחקים ועיצובים ששמרתי</h2>${saved.length?`<table class="table"><tr><th>סוג</th><th>שם</th><th>נשמר</th><th></th></tr>${saved.map(x=>`<tr><td>${esc(x.kind)}</td><td><a href="${esc(x.link)}">${esc(x.title)}</a></td><td>${esc(x.date)}</td><td><button class="btn btn-sm btn-light" data-del-saved="${esc(x.id)}">מחיקה</button></td></tr>`).join('')}</table>`:'<p class="muted">עוד אין. ביצירת משחק או עיצוב לחצי "שמירה".</p>'}</section>
    <section class="box"><h2> רשימת הקניות</h2>${shop.length?`<ul style="list-style:none;padding:0" id="shopL">${shop.map((x,i)=>`<li><label class="check"><input type="checkbox" data-shop="${i}" ${x.done?'checked':''}> <span style="${x.done?'text-decoration:line-through;opacity:.6':''}">${esc(x.t)}</span> <span class="muted" style="font-size:.85rem">(${esc(x.from)})</span></label></li>`).join('')}</ul><div class="btn-row"><button class="btn btn-light" id="shopPrint"> הדפסה</button><button class="btn btn-light" id="shopClear">ניקוי הרשימה</button></div>`:'<p class="muted">הרשימה ריקה. במתכון לחצי "הוספה לרשימת הקניות".</p>'}</section>
  </div>`;
};
pages.me.after = () => {
  const uf = document.getElementById('uf');
  if(uf) uf.onsubmit = e => { e.preventDefault(); const v = Object.fromEntries(new FormData(uf)); store.set('user', {name:v.name, email:v.email}); record('users', {name:v.name, email:v.email, marketing:v.marketing?'כן':'לא'}); if(v.marketing) subscribe(v.email, 'אזור אישי', v.name); toast('האזור האישי נפתח '); render(); };
  app.onclick = e => {
    const d = e.target.closest('[data-del-saved]'); if(d){ store.set('saved', store.get('saved',[]).filter(x=>x.id!==d.dataset.delSaved)); render(); }
  };
  app.onchange = e => { const c = e.target.closest('[data-shop]'); if(!c) return; const s = store.get('shop',[]); s[c.dataset.shop].done = c.checked; store.set('shop', s); render(); };
  const sp = document.getElementById('shopPrint'); if(sp) sp.onclick = () => printHTML(`<div class="sheet" style="aspect-ratio:auto"><h1>רשימת קניות לערב הלביבות</h1><ul style="font-size:1.2rem;line-height:2">${store.get('shop',[]).map(x=>`<li> ${esc(x.t)}</li>`).join('')}</ul></div>`);
  const sc = document.getElementById('shopClear'); if(sc) sc.onclick = () => { store.set('shop', []); render(); };
};

/* ניהול */
function adminTable(tab, rows, cols){ return rows.length ? `<div style="overflow:auto"><table class="table"><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}<th></th></tr>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c[0]])}</td>`).join('')}<td>${tab==='subs'&&r.status==='ממתין'?`<button class="btn btn-sm btn-gold" data-approve="${esc(r.id)}">סימון כמאושר</button> `:''}<button class="btn btn-sm btn-light" data-del="${tab}|${esc(r.id)}">מחיקה</button></td></tr>`).join('')}</table></div>` : '<div class="empty">אין עדיין נתונים.</div>'; }
pages.admin = () => {
  if(!ADMIN_PAGE) return notFound();
  if(!sessionStorage.getItem('madlik_admin')) return pageHead('ניהול מדליק', '', 'ניהול') + `<div class="wrap"><div class="box" style="max-width:440px;margin:auto"><form class="form" id="loginF">${API() ? '<label>מפתח ניהול<input type="password" name="p" required autocomplete="off"></label><button class="btn btn-gold">כניסה</button><p class="hint">המפתח הסודי שקבעת בסקריפט של גוגל. הוא נבדק בשרת, ואינו נשמר באתר.</p>' : '<div class="notice">עדיין לא מחוברים לשרת של גוגל. בלי השרת אי אפשר לראות כניסות של גולשים אחרים או הודעות שנשלחו. אחרי הכניסה, בלשונית "רשימת תפוצה" יש הוראות חיבור.</div><button class="btn btn-gold">כניסה לניהול</button>'}</form></div></div>`;
  const tab = location.hash.split('tab=')[1] || 'stats', live = !!API();
  const tabs = {stats:'כניסות', biz:'עסקים מפרסמים', subs:'רעיונות שנשלחו', leads:'פניות לבעלי עסקים', ads:'בקשות פרסום', contact:'יצירת קשר', news:'רשימת תפוצה', users:'משתמשים', add:'הוספת תוכן'};
  const tbl = (rows, cols) => adminTable(tab, rows, cols);
  let body = '';
  if(tab==='biz') body = bizTabHTML();
  if(tab==='news') body = newsTabHTML();
  if(tab==='stats') body = live ? '<div id="sList"><div class="empty">טוענת...</div></div>' : statsHTML(localStats(), store.get('leads',[]), false);
  if(ADMIN_COLS[tab]) body = live ? '<div id="rList"><div class="empty">טוענת...</div></div>' : tbl(store.get(tab,[]), ADMIN_COLS[tab]);
  if(tab==='add') body = `<div class="two-col">
    <div class="box"><h3>עסקים מפרסמים</h3><p>הוספה ועריכה של עסקים, עם תמונה וקישור, עברו ללשונית <a href="#/admin?tab=biz"><b>עסקים מפרסמים</b></a>.</p></div>
    <form class="box form" data-add="games"><h3>משחק חדש</h3><label>שם<input name="title" required></label><div class="two-col"><label>סוג<input name="type" value="מילים"></label><label>גיל<input name="age" value="כל הגילאים"></label></div><div class="two-col"><label>מינימום משתתפים<input type="number" name="min" value="4"></label><label>מקסימום<input type="number" name="max" value="50"></label></div><label>תיאור קצר<input name="short"></label><label>איך משחקים<textarea name="how"></textarea></label><label>מילים (לא חובה, שורה לכל מילה)<textarea name="words"></textarea></label><button class="btn btn-gold">הוספה</button></form>
    <form class="box form" data-add="recipes"><h3>מתכון חדש</h3><label>שם<input name="title" required></label><div class="two-col"><label>קטגוריה<input name="cat" value="לביבות"></label><label>כשרות<select name="diet"><option>פרווה</option><option>חלבי</option><option>בשרי</option></select></label></div><div class="two-col"><label>זמן (דקות)<input type="number" name="time" value="30"></label><label>סועדים<input type="number" name="serves" value="6"></label></div><label>רמה<select name="level"><option>קל</option><option>בינוני</option><option>מאתגר</option></select></label><label>מצרכים <span class="hint">שורה לכל מצרך: כמות | יחידה | שם</span><textarea name="ing" placeholder="2 | כוסות | קמח"></textarea></label><label>שלבי הכנה <span class="hint">שורה לכל שלב</span><textarea name="steps"></textarea></label><button class="btn btn-gold">הוספה</button></form>
  </div>
  <div class="box"><h3>תוכן שהוספת</h3>${['games','recipes','suppliers'].map(k=>addedContent(k).map(x=>`<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding:6px 0"><span>${esc(x.title||x.name)} <span class="muted">(${k})</span></span><button class="btn btn-sm btn-light" data-del-extra="${k}|${esc(x.id)}">מחיקה</button></div>`).join('')).join('') || '<p class="muted">עוד לא הוספת.</p>'}</div>`;
  return pageHead('ניהול האתר', '', 'ניהול') + `<div class="wrap">${live ? `<div class="notice" style="margin-bottom:16px">מחובר לשרת של גוגל: כל הטפסים, הנרשמים והתוכן נשמרים בגיליון שלך.</div>` : `<div class="notice" style="margin-bottom:16px">עדיין לא מחובר לשרת: מה שמופיע כאן נשמר רק בדפדפן הזה. כדי שכל הטפסים והנרשמים יגיעו אלייך, חברי את השרת של גוגל (ההוראות בלשונית "רשימת תפוצה").</div>`}<div class="tabs">${Object.entries(tabs).map(([k,v])=>`<a class="chip ${k===tab?'on':''}" href="#/admin?tab=${k}">${v}</a>`).join('')}<button class="chip" id="logout">יציאה</button></div>${body}</div>`;
};
// לשונית הכניסות: טבלת מדורים וטבלת בעלי עסקים
function localStats(){
  const st = store.get('stats', {sec:{}, sup:{}}), today = new Date().toISOString().slice(0,10), out = {sec:{}, sup:{}, tel:{}, web:{}};
  ['sec','sup'].forEach(t => Object.entries(st[t]||{}).forEach(([id,o]) => out[t][id] = {total:o.total, today:o.day===today?o.today:0, week:(o.week||[]).filter(x=>Date.now()-x<7*864e5).length, uniq:null}));
  ['tel','web'].forEach(k => Object.entries(st[k]||{}).forEach(([id,o]) => out[k][id] = {total:o.total, today:o.day===today?o.today:0, week:(o.week||[]).filter(x=>Date.now()-x<7*864e5).length}));
  return out;
}
function statsHTML(st, leads, live){
  const n = x => x==null ? '–' : Number(x).toLocaleString('he-IL');
  const table = (rows, first, extra, tel) => {
    const max = Math.max(1, ...rows.map(r=>r.o.total));
    return `<div style="overflow:auto"><table class="table stats-t"><tr><th>${first}</th><th>כניסות</th><th>היום</th><th>7 ימים</th>${live?'<th>מבקרים שונים</th>':''}${extra?`<th>${extra}</th>`:''}${tel?'<th>לחיצות על "הטלפון שלנו"</th><th>לחיצות על האתר</th>':''}</tr>${rows.map(r=>`<tr><td><b>${esc(r.name)}</b><span class="st-bar" style="--w:${Math.round(r.o.total/max*100)}%"></span></td><td><b>${n(r.o.total)}</b></td><td>${n(r.o.today)}</td><td>${n(r.o.week)}</td>${live?`<td>${n(r.o.uniq)}</td>`:''}${extra?`<td>${n(r.leads)}</td>`:''}${tel?`<td><b>${n(r.tel.total)}</b> <span class="muted">(${n(r.tel.week)} ב־7 ימים)</span></td><td><b>${n(r.web.total)}</b> <span class="muted">(${n(r.web.week)} ב־7 ימים)</span></td>`:''}</tr>`).join('')}</table></div>`;
  };
  const zero = {total:0, today:0, week:0, uniq:0};
  const secNames = [...new Set(Object.values(SECTIONS))];
  const secs = secNames.map(name => ({name, o:st.sec[name]||zero})).sort((a,b)=>b.o.total-a.o.total);
  const sups = content('suppliers').map(s => ({name:s.name, o:st.sup[s.id]||zero, leads:leads.filter(l=>l.supplier===s.name).length, tel:(st.tel && st.tel[s.id]) || {total:0, today:0, week:0}, web:(st.web && st.web[s.id]) || {total:0, today:0, week:0}})).sort((a,b)=>b.o.total-a.o.total);
  const sum = secs.reduce((a,r)=>a+r.o.total, 0);
  const A = st.all || {total:sum, today:null, week:null, uniq:null};
  const tile = (lbl, val) => `<div class="st-tile"><b>${n(val)}</b><span>${lbl}</span></div>`;
  const days = []; for(let i = 13; i >= 0; i--){ const d = new Date(Date.now() - i * 864e5), k = d.toISOString().slice(0, 10); days.push([k, (st.days && st.days[k]) || 0]); }
  const dmax = Math.max(1, ...days.map(x => x[1]));
  const chart = st.days ? `<div class="box" style="margin-bottom:20px"><h2>14 הימים האחרונים</h2><div class="st-chart">${days.map(([k, v]) => `<div title="${k}: ${v}"><i style="height:${Math.round(v / dmax * 100)}%"></i><em>${v || ''}</em><span>${k.slice(8)}</span></div>`).join('')}</div></div>` : '';
  return `${live?'':'<div class="notice" style="margin-bottom:16px">המספרים כאן הם רק מהדפדפן הזה. כשמחברים את השרת של גוגל (בלשונית "רשימת תפוצה"), כאן יופיעו הכניסות של כל הגולשים.</div>'}
    <div class="st-tiles">${tile('כניסות בסך הכול', A.total)}${tile('היום', A.today)}${tile('7 ימים אחרונים', A.week)}${tile('גולשים שונים', A.uniq)}</div>${chart}<div class="box"><h2>כניסות לפי מדור</h2><p class="muted">סה"כ ${n(sum)} כניסות לעמודים באתר. כניסות שלך מהניהול לא נספרות.</p>${table(secs, 'מדור')}</div>
    <div class="box" style="margin-top:20px"><h2>כניסות לכל בעל עסק</h2><p class="muted">כמה פעמים נכנסו לעמוד של כל עסק, כמה פניות נשלחו אליו מהאתר, וכמה פעמים לחצו על "הטלפון שלנו".</p>${table(sups, 'עסק', 'פניות', true)}</div>`;
}
/* ---------- ניהול: עסקים מפרסמים (הוספה, עריכה, תמונה וקישור) ---------- */
const BIZ_CATS = ['אולמות', 'קייטרינג', 'מפעילים', 'עיצוב ודקורציה', 'קינוחים', 'צילום'];
const BIZ_REGIONS = ['צפון', 'חיפה', 'שרון', 'מרכז', 'ירושלים', 'שפלה', 'דרום'];
function bizTabHTML(){
  const cats = [...new Set(BIZ_CATS.concat((D.suppliers || []).map(s => s.cat)))];
  return `<div class="bz-wrap">
   <div class="box bz-main"><h2 id="bzHead">הוספת עסק מפרסם</h2>
    <div class="bz-grid">
     <form class="form" id="bzForm" autocomplete="off">
      <input type="hidden" name="id">
      <label>שם העסק *<input name="name" required maxlength="60"></label>
      <div class="two-col"><label>תחום *<input name="cat" required list="bzCats" placeholder="בחרי או כתבי"><datalist id="bzCats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label><label>אזור *<select name="region">${BIZ_REGIONS.map(r => `<option>${r}</option>`).join('')}</select></label></div>
      <div class="two-col"><label>טווח מחירים<select name="price"><option>₪</option><option selected>₪₪</option><option>₪₪₪</option></select></label><label>התכנית<select name="plan"><option>Basic</option><option selected>Premium</option><option>Pro</option></select></label></div>
      <label>טקסט קצר לכרטיס <span class="hint" id="bzCount">0 מתוך 120</span><textarea name="text" rows="3" maxlength="140"></textarea></label>
      <div class="two-col"><label>טלפון, לכפתור "הטלפון שלנו"<input name="phone" type="tel" dir="ltr"></label><label>מייל לקבלת פניות<input name="email" type="email" dir="ltr"></label></div>
      <label>קישור לאתר או לטופס של העסק <span class="hint">הכפתור הכתום בכרטיס יוביל לשם. אם ריק, הוא יוביל לטופס הפנייה באתר</span><input name="site" dir="ltr" placeholder="https://"></label>
      <div class="bz-img"><b>תמונת המודעה</b> <span class="hint">1200 × 750 פיקסלים (יחס 16:10). אפשר להעלות כל תמונה, והאתר חותך אותה ומתאים</span>
        <div class="bz-drop"><input type="file" id="bzFile" accept="image/*"><span id="bzFileInfo">לא נבחרה תמונה</span></div>
        <label>או קישור לתמונה<input name="img" dir="ltr" placeholder="https://... או img/ads/..."></label></div>
      <div class="bz-checks"><label class="check"><input type="checkbox" name="featured"> מומלץ (מופיע ראשון)</label><label class="check"><input type="checkbox" name="active" checked> מוצג באתר</label></div>
      <p class="hint">עסקי Premium ו־Pro מופיעים אוטומטית גם בבאנר בעמוד הראשי. כשיש עסק מפרסם אחד לפחות, כרטיסי הדוגמה מוסתרים.</p>
      <div class="btn-row"><button class="btn btn-gold" id="bzSave">שמירה ופרסום</button><button type="button" class="btn btn-light" id="bzReset">טופס חדש</button></div>
     </form>
     <div class="bz-prev"><h3>ככה זה ייראה באתר</h3><div class="wshow adprev" data-w="biz"><div class="cards" id="bzPrev"></div></div></div>
    </div></div>
   <div class="box" style="margin-top:20px"><h2>העסקים המפרסמים</h2><div id="bzList"><div class="empty">טוענת...</div></div></div>
  </div>`;
}
function initBiz(call, live, fail){
  const call2 = body => API2() ? apiPost2(Object.assign({key:adminKey()}, body)).then(r => { if(!r.ok) throw new Error(r.error||'שגיאה'); return r; }) : Promise.reject(new Error('צריך להתקין את הקוד הנוסף של גוגל (עוד לא חוברה כתובת שנייה)'));
  const $ = id => document.getElementById(id), f = $('bzForm');
  let imgData = '', S = {sup:{}, tel:{}, web:{}}, L = [];
  const list = () => addedContent('suppliers');
  const readItem = () => { const v = Object.fromEntries(new FormData(f)); return {id:String(v.id || ''), name:String(v.name || '').trim(), cat:String(v.cat || '').trim(), region:v.region, price:v.price, plan:v.plan, text:String(v.text || '').trim(), phone:String(v.phone || '').trim(), email:String(v.email || '').trim(), site:safeUrl(v.site), img:String(v.img || '').trim(), featured:!!v.featured, active:!!v.active}; };
  const prev = () => {
    const it = readItem(); $('bzCount').textContent = it.text.length + ' מתוך 120';
    const box = $('bzPrev'); box.innerHTML = supCard(Object.assign({}, it, {id:'preview', name:it.name || 'שם העסק', text:it.text || 'כאן יופיע הטקסט הקצר של העסק', cat:it.cat || 'תחום', img:imgData ? '' : it.img}));
    if(imgData){ const top = box.querySelector('.card-top'); if(top) top.innerHTML = '<img class="biz-img" src="' + imgData + '" alt="">'; }
  };
  f.oninput = prev; prev();
  $('bzFile').onchange = e => {
    const file = e.target.files[0]; if(!file) return;
    const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => {
      const W = 1200, H = 750, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      const k = Math.max(W / im.width, H / im.height), w = im.width * k, h = im.height * k; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
      imgData = c.toDataURL('image/jpeg', .86); $('bzFileInfo').textContent = file.name + ' (' + Math.round(imgData.length * .75 / 1024) + 'KB)'; prev();
    }; im.onerror = () => toast('לא הצלחתי לקרוא את התמונה'); im.src = rd.result; };
    rd.readAsDataURL(file);
  };
  const reset = () => { f.reset(); f.elements.id.value = ''; imgData = ''; $('bzFile').value = ''; $('bzFileInfo').textContent = 'לא נבחרה תמונה'; $('bzHead').textContent = 'הוספת עסק מפרסם'; $('bzSave').textContent = 'שמירה ופרסום'; prev(); };
  $('bzReset').onclick = reset;
  const fill = it => {
    f.elements.id.value = it.id;
    ['name', 'cat', 'region', 'price', 'plan', 'text', 'phone', 'email', 'site', 'img'].forEach(k => { if(f.elements[k]) f.elements[k].value = it[k] || (k === 'plan' ? 'Premium' : ''); });
    f.elements.featured.checked = !!it.featured; f.elements.active.checked = it.active !== false; imgData = ''; $('bzFile').value = '';
    $('bzFileInfo').textContent = it.img ? 'יש תמונה (אפשר להחליף)' : 'לא נבחרה תמונה'; $('bzHead').textContent = 'עריכת עסק: ' + it.name; $('bzSave').textContent = 'שמירת השינויים'; prev(); f.scrollIntoView({behavior:'smooth', block:'start'});
  };
  const persist = (item, isNew) => {
    if(live){
      if(isNew) return call({action:'addContent', kind:'suppliers', item}).then(refreshRemote);
      const old = () => call({action:'removeContent', id:item.id}).then(() => call({action:'addContent', kind:'suppliers', item})).then(refreshRemote); // בלי הקוד הנוסף: עריכה = מחיקה והוספה מחדש עם אותו מזהה
      return API2() ? call2({action:'updateContent', id:item.id, item}).then(refreshRemote).catch(old) : old();
    }
    const ex = store.get('extra_suppliers', []), i = ex.findIndex(x => x.id === item.id); if(i >= 0) ex[i] = item; else ex.push(item); store.set('extra_suppliers', ex); return Promise.resolve();
  };
  const num = o => o ? o.total : 0;
  const draw = () => {
    const items = list(), box = $('bzList');
    if(!items.length){ box.innerHTML = '<div class="empty">עוד אין עסקים מפרסמים. כל עוד אין, באתר מוצגים כרטיסי דוגמה. הוסיפי את הראשון בטופס שלמעלה.</div>'; return; }
    box.innerHTML = '<div class="bz-rows">' + items.map(s => {
      const leads = L.filter(l => l.supplier === s.name).length, pic = safeImg(s.img) ? '<img src="' + esc(safeImg(s.img)) + '" alt="">' : '<span>' + esc((s.name || '?')[0]) + '</span>';
      return '<div class="bz-row' + (s.active === false ? ' off' : '') + '"><div class="bz-thumb">' + pic + '</div><div class="bz-info"><b>' + esc(s.name) + '</b> <em class="bz-plan">' + esc(s.plan || 'Basic') + '</em>' + (s.active === false ? ' <em class="bz-off">מוסתר</em>' : '') +
        '<small>' + esc(s.cat) + ' · ' + esc(s.region) + ' · ' + esc(s.price) + '</small><small class="bz-nums">כניסות ' + num(S.sup[s.id]) + ' · לחיצות על הטלפון ' + num(S.tel[s.id]) + ' · לחיצות על האתר ' + num(S.web[s.id]) + ' · פניות ' + leads + '</small></div>' +
        '<div class="bz-btns"><button class="btn btn-sm" data-bz="edit|' + esc(s.id) + '">עריכה</button><button class="btn btn-sm btn-light" data-bz="toggle|' + esc(s.id) + '">' + (s.active === false ? 'הצגה' : 'הסתרה') + '</button><button class="btn btn-sm btn-light" data-bz="del|' + esc(s.id) + '">מחיקה</button></div></div>';
    }).join('') + '</div>';
  };
  draw();
  f.onsubmit = async e => {
    e.preventDefault(); const it = readItem(), btn = $('bzSave');
    if(!it.name || !it.cat) return toast('חסר שם עסק או תחום');
    if(f.elements.site.value.trim() && !it.site) return toast('הקישור לאתר לא תקין');
    btn.disabled = true;
    try{
      if(imgData){ if(!live) throw new Error('העלאת תמונה דורשת חיבור לשרת של גוגל. אפשר להדביק קישור לתמונה'); const r = await call2({action:'uploadImage', data:imgData}); it.img = r.url; }
      else if(it.img && !safeImg(it.img)) throw new Error('קישור התמונה לא תקין. נתיב כמו img/ads/שם.jpg או כתובת שמתחילה ב־https');
      const isNew = !it.id; it.id = it.id || 'b' + Date.now().toString(36); it.homeAd = it.plan !== 'Basic'; it.ico = '';
      if(!it.img) delete it.img; if(!it.site) delete it.site;
      await persist(it, isNew); toast(isNew ? 'העסק נוסף ופורסם ✔' : 'השינויים נשמרו ✔'); reset(); draw();
    }catch(err){ toast('שגיאה: ' + (err.message || err)); }
    btn.disabled = false;
  };
  $('bzList').onclick = e => {
    const b = e.target.closest('[data-bz]'); if(!b) return;
    const [act, id] = b.dataset.bz.split('|'), s = list().find(x => x.id === id); if(!s) return;
    if(act === 'edit') return fill(s);
    if(act === 'toggle'){ const it = Object.assign({}, s, {active:s.active === false}); return persist(it, false).then(() => { toast(it.active ? 'העסק מוצג שוב' : 'העסק הוסתר'); draw(); }).catch(fail); }
    if(act === 'del' && confirm('למחוק את "' + s.name + '" מהאתר?')){
      const done = live ? call({action:'removeContent', id}).then(refreshRemote) : (store.set('extra_suppliers', store.get('extra_suppliers', []).filter(x => x.id !== id)), Promise.resolve());
      done.then(() => { toast('נמחק'); draw(); }).catch(fail);
    }
  };
  if(live){ Promise.all([call({action:'stats'}), call({action:'records', kind:'leads'}).catch(() => ({records:[]})), API2() ? call2({action:'webstats'}).catch(() => null) : Promise.resolve(null)]).then(([s, l, w]) => { S = Object.assign(S, s.stats); if(w && w.stats){ S.tel = Object.assign({}, S.tel, w.stats.tel); S.web = w.stats.web; } L = l.records; draw(); }).catch(() => {}); }
  else { S = localStats(); L = store.get('leads', []); draw(); }
}

function newsTabHTML(){
  const setup = API() ? '' : `<div class="box" id="nSetup"><h2>חיבור חד־פעמי של רשימת התפוצה</h2>
    <p>כדי שכל מה שנשלח באתר יגיע אלייך (נרשמים, פניות לבעלי עסקים, בקשות פרסום, רעיונות ומשתמשים), שהתוכן שתוסיפי יופיע לכל הגולשים, ושההודעות ייצאו מהג׳ימייל שלך, צריך שרת קטן וחינמי של גוגל. 5 דקות, פעם אחת:</p>
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
    <div class="box"><h2>הנרשמים</h2>
      <p id="nCount" class="muted">טוענת...</p>
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
  const cnt = $('nCount'), list = $('nList'), keyIn = {get value(){ return adminKey(); }}, st = $('nStatus'), f = $('nf');
  let subs = [];
  const draw = () => {
    cnt.textContent = subs.length + ' נרשמים' + (API() ? '' : ' (רק מהדפדפן הזה, עד שתחברי את השרת)');
    list.innerHTML = subs.length ? `<table class="table"><tr><th>מייל</th><th>תאריך</th><th>מקור</th></tr>${subs.slice(0,300).map(s=>`<tr><td>${esc(s.email)}</td><td>${esc(s.date)}</td><td>${esc(s.source)}</td></tr>`).join('')}</table>` : '<p class="muted">עוד אין נרשמים.</p>';
  };
  const load = () => {
    if(!API()){ subs = store.get('subscribers',[]).map(x=>({email:x.email, date:x.date, source:x.source})); draw(); return; }
    const k = keyIn.value.trim();
    if(!k){ cnt.textContent = 'כנסי מחדש עם מפתח הניהול כדי לראות את הרשימה'; list.innerHTML = ''; return; }
    cnt.textContent = 'טוענת...';
    apiPost({action:'list', key:k}).then(r => { if(!r.ok) throw new Error(r.error||'שגיאה'); subs = r.subscribers; draw(); })
      .catch(e => { cnt.textContent = 'לא הצלחתי לטעון: ' + e.message; });
  };
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
    if(!test && !confirm('לשלוח את ההודעה ל־' + subs.length + ' נרשמים?')) return;
    st.textContent = 'שולחת...';
    apiPost({action:'send', key:k, subject:v.subject, body:v.body, test: test ? v.testTo : ''})
      .then(r => { if(!r.ok) throw new Error(r.error||'שגיאה'); st.textContent = 'נשלח ל־' + r.sent + (r.skipped ? ' (' + r.skipped + ' לא נשלחו בגלל המכסה היומית)' : ''); toast('ההודעה נשלחה'); })
      .catch(e => { st.textContent = 'שגיאה: ' + e.message; });
  };
  load();
}
pages.admin.after = () => {
  if(!ADMIN_PAGE) return;
  const lf = document.getElementById('loginF');
  if(lf){ lf.onsubmit = async e => { e.preventDefault();
    if(!API()){ sessionStorage.setItem('madlik_admin', '1'); render(); return; }
    const k = String(lf.p.value || '').trim(), btn = lf.querySelector('button'); btn.disabled = true;
    try{ const r = await apiPost({action:'stats', key:k}); if(!r.ok) throw new Error('bad'); sessionStorage.setItem('madlik_key', k); sessionStorage.setItem('madlik_admin', '1'); render(); }
    catch(err){ toast(err.message === 'bad' ? 'המפתח שגוי' : 'לא הצלחתי להתחבר לשרת'); btn.disabled = false; }
  }; return; }
  const tab = location.hash.split('tab=')[1] || 'subs', live = !!API();
  document.getElementById('logout').onclick = () => { sessionStorage.removeItem('madlik_admin'); sessionStorage.removeItem('madlik_key'); render(); };
  const ak = document.getElementById('akey');
  if(ak){ ak.value = adminKey(); ak.onchange = () => { try{ sessionStorage.setItem('madlik_key', ak.value.trim()); }catch(e){} render(); }; }
  if(tab === 'news') initNews();
  const fail = e => toast('שגיאה: ' + e.message);
  const call = body => apiPost(Object.assign({key:adminKey()}, body)).then(r => { if(!r.ok) throw new Error(r.error||'שגיאה'); return r; });
  if(tab === 'biz') initBiz(call, live, fail);

  const sl = document.getElementById('sList');
  if(sl){
    if(!adminKey()) sl.innerHTML = '<div class="empty">כנסי מחדש עם מפתח הניהול כדי לראות את הכניסות.</div>';
    else Promise.all([call({action:'stats'}), call({action:'records', kind:'leads'}).catch(()=>({records:[]}))])
      .then(([s, l]) => { sl.innerHTML = statsHTML(s.stats, l.records, true); })
      .catch(e => { sl.innerHTML = '<div class="empty">לא הצלחתי לטעון: '+esc(e.message)+'</div>'; });
  }

  // טבלאות מהשרת
  let rows = [];
  const rl = document.getElementById('rList');
  if(rl && live){
    if(!adminKey()) rl.innerHTML = '<div class="empty">כנסי מחדש עם מפתח הניהול כדי לראות את הנתונים.</div>';
    else call({action:'records', kind:tab}).then(r => { rows = r.records; rl.innerHTML = adminTable(tab, rows, ADMIN_COLS[tab]); })
      .catch(e => { rl.innerHTML = '<div class="empty">לא הצלחתי לטעון: '+esc(e.message)+'</div>'; });
  }

  app.onclick = e => {
    const d = e.target.closest('[data-del]');
    if(d && confirm('למחוק את הרשומה?')){
      const [k,id] = d.dataset.del.split('|');
      if(live) call({action:'remove', kind:k, id}).then(()=>{ toast('נמחק'); render(); }).catch(fail);
      else { store.set(k, store.get(k,[]).filter(x=>x.id!==id)); render(); }
    }
    const x = e.target.closest('[data-del-extra]');
    if(x && confirm('למחוק מהאתר?')){
      const [k,id] = x.dataset.delExtra.split('|');
      if(live) call({action:'removeContent', id}).then(refreshRemote).then(()=>{ toast('הוסר מהאתר'); render(); }).catch(fail);
      else { store.set('extra_'+k, store.get('extra_'+k,[]).filter(i=>i.id!==id)); render(); }
    }
    const a = e.target.closest('[data-approve]');
    if(a){
      const list = live ? rows : store.get('subs',[]); const s = list.find(i=>i.id===a.dataset.approve); if(!s) return;
      if(live) call({action:'setStatus', kind:'subs', id:s.id, status:'אושר'}).then(()=>{ toast('סומן כמאושר'); render(); }).catch(fail);
      else { s.status = 'אושר'; store.set('subs', list); toast('סומן כמאושר'); render(); }
    }
  };

  // הוספת תוכן לאתר
  document.querySelectorAll('[data-add]').forEach(f => f.onsubmit = e => {
    e.preventDefault(); const k = f.dataset.add, v = Object.fromEntries(new FormData(f)); v.id = 'x'+Date.now().toString(36);
    if(k==='suppliers'){ v.featured = !!v.featured; v.homeAd = !!v.homeAd; if(!safeImg(v.img)) delete v.img; }
    if(k==='games'){ v.min = +v.min; v.max = +v.max; v.ico = ''; v.format = ['בעל פה']; v.time = ''; v.equip = false; if(v.words) v.words = lines(v.words); else delete v.words; }
    if(k==='recipes'){ v.ico = ''; v.time = +v.time; v.serves = +v.serves||1; v.ing = lines(v.ing).map(l=>{ const p = l.split('|').map(x=>x.trim()); return p.length>=3 ? [parseFloat(p[0])||0, p[1], p[2]] : [0,'',l]; }); v.steps = lines(v.steps); }
    if(live) call({action:'addContent', kind:k, item:v}).then(refreshRemote).then(()=>{ toast('נוסף לאתר ✔'); render(); }).catch(fail);
    else { const ex = store.get('extra_'+k, []); ex.push(v); store.set('extra_'+k, ex); toast('נוסף לאתר ✔'); render(); }
  });
};

function notFound(){ return pageHead('לא מצאנו את העמוד', '', '') + '<div class="wrap"><a class="btn btn-gold" href="#/">לעמוד הבית</a></div>'; }

/* ---------- ניתוב ---------- */
const routes = [
  [/^\/?$/, 'home'], [/^\/games$/, 'games'], [/^\/game\/(.+)$/, 'game'],
  [/^\/create$/, 'create'], [/^\/create\/(.+)$/, 'creator'], [/^\/studio$/, 'studio'], [/^\/studio\/edit$/, 'edit'], [/^\/studio\/(.+)$/, 'design'],
  [/^\/recipes$/, 'recipes'], [/^\/recipe\/(.+)$/, 'recipe'], [/^\/suppliers$/, 'suppliers'],
  [/^\/supplier\/(.+)$/, 'supplier'], [/^\/advertise$/, 'advertise'], [/^\/submit$/, 'submit'], [/^\/me$/, 'me'], [/^\/admin$/, 'admin']
];
function render(){
  clearInterval(window.__adTimer);
  if(window.MadlikEditor) window.MadlikEditor.unmount();
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const q = Object.fromEntries(new URLSearchParams(qs||''));
  let name = null, params = [];
  for(const [re,n] of routes){ const m = path.match(re); if(m){ name = n; params = m.slice(1).map(decodeURIComponent); break; } }
  app.onclick = null; app.onchange = null;
  app.innerHTML = name ? pages[name](params, q) : notFound();
  if(name && pages[name].after) pages[name].after(params, q);
  let isAdmin = false; try{ isAdmin = !!sessionStorage.getItem('madlik_admin'); }catch(e){}
  if(!isAdmin && !ADMIN_PAGE) countHit(name, params, path);
  if(!ADMIN_PAGE){ const T = {games:'משחקים על המסך שניתנים גם להדפסה', game:'משחק לערב לביבות', create:'פעילויות להדפסה בהתאמה אישית', creator:'יצירת משחק אישי', recipes:'מתכונים לערב לביבות', recipe:'מתכון לביבות', suppliers:'בעלי עסקים לערב לביבות', supplier:'בעל עסק לערב לביבות', studio:'סטודיו מיתוג', design:'סטודיו מיתוג', edit:'סטודיו מיתוג', advertise:'רוצים לפרסם?', submit:'שליחת רעיון', me:'האזור שלי'}; document.title = T[name] ? T[name] + ' | מדליק' : 'מדליק – כל מה שצריך לערב לביבות | משחקים, מתכונים ומיתוג'; }
  if(window.MadlikFX) window.MadlikFX.onRender(app);
  if(window.MadlikWorlds) window.MadlikWorlds.apply(name, app);
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

/* ---------- הודעה בולטת בכניסה למדור בעלי עסקים ---------- */
const BIZ_NOTICE_UNTIL = new Date('2026-11-10T00:00:00+02:00').getTime(); // מיום שלישי 10.11.26 ההודעה כבר לא רלוונטית
let bizClosedAt = 0;
function showBizNotice(){
  if(Date.now() >= BIZ_NOTICE_UNTIL || document.querySelector('.biz-notice') || Date.now() - bizClosedAt < 4000) return;
  const SECS = 8, el = document.createElement('div');
  el.className = 'biz-notice'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'bnT');
  el.innerHTML = '<div class="bn-card"><div class="bn-ico" aria-hidden="true">🤝</div>' +
    '<p class="bn-kick">בעלי עסקים</p><h2 id="bnT">שימו לב, זה מתחיל ביום שלישי</h2>' +
    '<div class="bn-date"><b>שלישי</b><span>10.11.26</span></div>' +
    '<p class="bn-text">הסכם עם העסקים שמעוניינים בפרסום חל החל מיום שלישי 10.11.26, ורק מאז תוכלו לצפות בהם ולהנות משירותם.</p>' +
    '<button type="button" class="btn btn-gold bn-ok">הבנתי, להמשיך ←</button>' +
    '<div class="bn-bar" aria-hidden="true"><i style="animation-duration:' + SECS + 's"></i></div></div>';
  document.body.appendChild(el); document.body.classList.add('bn-lock');
  let done = false;
  const close = () => { if(done) return; done = true; clearTimeout(t); document.removeEventListener('keydown', key); bizClosedAt = Date.now(); el.classList.add('out'); document.body.classList.remove('bn-lock'); setTimeout(() => el.remove(), 450); };
  const key = e => { if(e.key === 'Escape') close(); };
  document.addEventListener('keydown', key);
  el.querySelector('.bn-ok').onclick = close; el.querySelector('.bn-ok').focus({preventScroll:true});
  const t = setTimeout(close, SECS * 1000);
  window.addEventListener('hashchange', () => close(), {once:true});
}

/* ---------- יצירת קשר (נפתח מהקרדיט בתחתית) ---------- */
function openContact(){
  const old = document.querySelector('dialog.contact-dlg'); if(old){ old.close(); old.remove(); }
  const d = document.createElement('dialog'); d.className = 'contact-dlg'; d.setAttribute('aria-labelledby', 'ctT');
  d.innerHTML = '<div class="contact-in"><button type="button" class="contact-x" data-c="close" aria-label="סגירה">×</button>' +
    '<h2 id="ctT">דברו איתי</h2><p class="contact-sub">שאלה, רעיון או הצעה? כתבו ואחזור אליכם.</p>' +
    '<form class="contact-form" novalidate>' +
    '<label>שם<input name="name" autocomplete="name" required></label>' +
    '<div class="ct-two"><label>טלפון<input name="phone" type="tel" autocomplete="tel" dir="ltr"></label><label>מייל<input name="email" type="email" autocomplete="email" dir="ltr"></label></div>' +
    '<label>ההודעה<textarea name="msg" rows="4" required></textarea></label>' +
    '<p class="ct-err" role="alert"></p>' +
    '<button class="btn btn-gold" type="submit">שליחה</button></form>' +
    '<p class="contact-alt">או בטלפון: <a href="tel:0556771806" dir="ltr">055-677-1806</a></p></div>';
  document.body.appendChild(d);
  const close = () => { d.classList.add('out'); setTimeout(() => { if(d.open) d.close(); d.remove(); }, 200); };
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  d.addEventListener('click', e => { if(e.target === d || e.target.closest('[data-c=close]')) close(); });
  const f = d.querySelector('form'), err = d.querySelector('.ct-err');
  f.onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f)); Object.keys(v).forEach(k => v[k] = String(v[k]).trim());
    if(!v.name) return err.textContent = 'איך קוראים לכם?';
    if(!v.phone && !v.email) return err.textContent = 'השאירו טלפון או מייל, כדי שאוכל לחזור אליכם.';
    if(v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) return err.textContent = 'כתובת המייל לא נראית תקינה.';
    if(!v.msg) return err.textContent = 'כתבו כמה מילים בהודעה.';
    v.page = location.hash || '#/';
    record('contact', v);
    d.querySelector('.contact-in').innerHTML = '<button type="button" class="contact-x" data-c="close" aria-label="סגירה">×</button><div class="contact-ok"><div class="ct-flame">🔥</div><h2>תודה, ' + esc(v.name) + '!</h2><p>ההודעה נשלחה, ואחזור אליכם בקרוב.</p>' +
      '<button type="button" class="btn" data-c="close">סגירה</button></div>';
  };
  d.showModal(); const first = f.querySelector('input'); if(first) first.focus();
}
document.addEventListener('click', e => { const c = e.target.closest('#creditBtn'); if(c){ e.preventDefault(); openContact(); } });

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
  e.target.innerHTML = '<b>תודה, נרשמת! נעדכן אותך על כל חדשה באתר.</b>';
  setTimeout(closeBar, 3000);
};

(window.MadlikIntro || Promise.resolve()).then(render);
loadRemote();
})();
