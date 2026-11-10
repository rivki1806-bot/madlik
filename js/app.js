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
const GAS_CODE = "// מדליק – שרת קטן וחינמי בגוגל.\n// שומר בגיליון: נרשמות לרשימת התפוצה, כל הטפסים מהאתר, ותוכן שנוסף מהאדמין. ושולח מיילים לנרשמות.\n// 1. החליפי את המפתח כאן במפתח סודי משלך (אותיות באנגלית ומספרים).\nconst SECRET = 'CHANGE-ME-123';\n\nconst KINDS = { subs: 'רעיונות שנשלחו', leads: 'פניות לבעלי עסקים', ads: 'בקשות פרסום', users: 'משתמשות', contact: 'פניות יצירת קשר' };\nconst CONTENT_KINDS = ['games', 'recipes', 'suppliers'];\n// עותק של כל פנייה לבעל עסק נשלח גם לכתובת הזו (המיילים יוצאים מהחשבון שבו הסקריפט מותקן)\nconst NOTIFY_COPY = 'officeautoclick@gmail.com';\n\nfunction tab_(name, head) {\n  const ss = SpreadsheetApp.getActiveSpreadsheet();\n  let sh = ss.getSheetByName(name);\n  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }\n  return sh;\n}\nconst subsSheet_ = () => tab_('נרשמות', ['תאריך', 'מייל', 'שם', 'מקור', 'פעילה']);\nconst recSheet_ = kind => tab_(KINDS[kind], ['מזהה', 'תאריך', 'סטטוס', 'סיכום', 'נתונים']);\nconst conSheet_ = () => tab_('תוכן באתר', ['מזהה', 'תאריך', 'סוג', 'כותרת', 'נתונים']);\nconst hitSheet_ = () => tab_('כניסות', ['תאריך', 'סוג', 'מזהה', 'מבקרת']);\n\n// סיכום הכניסות: סה\"כ, היום, 7 ימים, ומבקרות שונות – לכל מדור ולכל בעל עסק\nfunction stats_() {\n  const rows = hitSheet_().getDataRange().getValues(), now = Date.now(), DAY = 864e5;\n  const today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');\n  const out = { sec: {}, sup: {}, tel: {}, web: {}, all: { total: 0, today: 0, week: 0, uniq: 0 }, days: {} }, seen = {}, seenAll = {};\n  for (let i = 1; i < rows.length; i++) {\n    const d = rows[i][0] instanceof Date ? rows[i][0] : new Date(rows[i][0]), type = rows[i][1], id = String(rows[i][2]), v = String(rows[i][3]);\n    if (type === 'sup' && /^(tel|web):/.test(id)) { // לחיצות על \"הטלפון שלנו\" ועל האתר של העסק\n      const kind = id.slice(0, 3), tid = id.slice(4), grp = out[kind], t = grp[tid] = grp[tid] || { total: 0, today: 0, week: 0 };\n      t.total++; if (Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd') === today) t.today++; if (now - d.getTime() < 7 * DAY) t.week++;\n      continue;\n    }\n    if (type !== 'sec' && type !== 'sup') continue;\n    if (type === 'sec') {\n      const A = out.all, dk = Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd');\n      A.total++; if (dk === today) A.today++; if (now - d.getTime() < 7 * DAY) A.week++;\n      if (v && !seenAll[v]) { seenAll[v] = 1; A.uniq++; }\n      out.days[dk] = (out.days[dk] || 0) + 1;\n    }\n    const o = out[type][id] = out[type][id] || { total: 0, today: 0, week: 0, uniq: 0 };\n    o.total++;\n    if (Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd') === today) o.today++;\n    if (now - d.getTime() < 7 * DAY) o.week++;\n    const k = type + '|' + id + '|' + v; if (v && !seen[k]) { seen[k] = 1; o.uniq++; }\n  }\n  return out;\n}\n\nfunction json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }\nfunction valid_(e) { return /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(e); }\nfunction esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }\nfunction fmt_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm') : String(d); }\nfunction newId_() { return Utilities.getUuid().slice(0, 8); }\nfunction folder_() { const it = DriveApp.getFoldersByName('מדליק – מודעות'); return it.hasNext() ? it.next() : DriveApp.createFolder('מדליק – מודעות'); }\nfunction rowOf_(sh, id) { const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues(); for (let i = 1; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 1; return 0; }\n\n// טופס מהאתר: רק טקסט, באורך מוגבל\nfunction clean_(o) {\n  const out = {};\n  Object.keys(o || {}).slice(0, 30).forEach(k => { out[String(k).slice(0, 40)] = String(o[k] == null ? '' : o[k]).slice(0, 3000); });\n  return out;\n}\n\nfunction doPost(e) {\n  try {\n    const d = JSON.parse(e.postData.contents);\n\n    // --- פעולות פתוחות לכל גולשת ---\n    if (d.action === 'subscribe') {\n      const email = String(d.email || '').trim().toLowerCase();\n      if (!valid_(email)) return json_({ ok: false, error: 'מייל לא תקין' });\n      const sh = subsSheet_(), rows = sh.getDataRange().getValues();\n      for (let i = 1; i < rows.length; i++) {\n        if (String(rows[i][1]).toLowerCase() === email) {\n          if (rows[i][4] === 'לא') sh.getRange(i + 1, 5).setValue('כן');\n          return json_({ ok: true, dup: true });\n        }\n      }\n      sh.appendRow([new Date(), email, String(d.name || '').slice(0, 100), String(d.source || '').slice(0, 50), 'כן']);\n      return json_({ ok: true });\n    }\n    if (d.action === 'submit') {\n      if (!KINDS[d.kind]) return json_({ ok: false, error: 'סוג לא מוכר' });\n      const data = clean_(d.data);\n      const summary = ['name', 'biz', 'title', 'supplier', 'phone', 'email'].map(k => data[k]).filter(Boolean).join(' · ');\n      recSheet_(d.kind).appendRow([newId_(), new Date(), d.kind === 'subs' ? 'ממתין' : 'חדש', summary, JSON.stringify(data)]);\n      if (d.kind === 'leads') { try { notifySupplier_(data); } catch (err) {} }\n      return json_({ ok: true });\n    }\n\n    if (d.action === 'hit') {\n      const type = d.type === 'sup' ? 'sup' : 'sec';\n      hitSheet_().appendRow([new Date(), type, String(d.id || '').slice(0, 60), String(d.v || '').slice(0, 20)]);\n      return json_({ ok: true });\n    }\n\n    // --- מכאן רק עם מפתח הניהול ---\n    if (d.key !== SECRET) return json_({ ok: false, error: 'מפתח שגוי' });\n\n    if (d.action === 'stats') return json_({ ok: true, stats: stats_() });\n\n    if (d.action === 'list') {\n      const rows = subsSheet_().getDataRange().getValues(), out = [];\n      for (let i = 1; i < rows.length; i++) if (rows[i][4] !== 'לא') out.push({ date: fmt_(rows[i][0]), email: rows[i][1], source: rows[i][3] });\n      return json_({ ok: true, subscribers: out });\n    }\n    if (d.action === 'send') return send_(d);\n\n    if (d.action === 'records') {\n      if (!KINDS[d.kind]) return json_({ ok: false, error: 'סוג לא מוכר' });\n      const rows = recSheet_(d.kind).getDataRange().getValues(), out = [];\n      for (let i = rows.length - 1; i >= 1; i--) {\n        let data = {}; try { data = JSON.parse(rows[i][4]); } catch (err) {}\n        out.push(Object.assign(data, { id: String(rows[i][0]), date: fmt_(rows[i][1]), status: rows[i][2] }));\n      }\n      return json_({ ok: true, records: out });\n    }\n    if (d.action === 'setStatus' || d.action === 'remove') {\n      if (!KINDS[d.kind]) return json_({ ok: false, error: 'סוג לא מוכר' });\n      const sh = recSheet_(d.kind), r = rowOf_(sh, d.id);\n      if (!r) return json_({ ok: false, error: 'לא נמצא' });\n      if (d.action === 'remove') sh.deleteRow(r); else sh.getRange(r, 3).setValue(String(d.status || ''));\n      return json_({ ok: true });\n    }\n    if (d.action === 'addContent') {\n      if (CONTENT_KINDS.indexOf(d.kind) < 0) return json_({ ok: false, error: 'סוג לא מוכר' });\n      const item = d.item || {}; item.id = String(item.id || newId_());\n      conSheet_().appendRow([item.id, new Date(), d.kind, String(item.title || item.name || ''), JSON.stringify(item)]);\n      return json_({ ok: true, id: item.id });\n    }\n    if (d.action === 'updateContent') {\n      const sh = conSheet_(), r = rowOf_(sh, d.id);\n      if (!r) return json_({ ok: false, error: 'לא נמצא' });\n      const item = d.item || {}; item.id = String(d.id);\n      sh.getRange(r, 4, 1, 2).setValues([[String(item.title || item.name || ''), JSON.stringify(item)]]);\n      return json_({ ok: true });\n    }\n    if (d.action === 'uploadImage') {\n      const m = /^data:(image\\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(d.data || ''));\n      if (!m) return json_({ ok: false, error: 'קובץ לא תקין' });\n      const bytes = Utilities.base64Decode(m[2]);\n      if (bytes.length > 4 * 1024 * 1024) return json_({ ok: false, error: 'התמונה גדולה מדי' });\n      const file = folder_().createFile(Utilities.newBlob(bytes, m[1], 'ad-' + newId_() + (m[1] === 'image/png' ? '.png' : '.jpg')));\n      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);\n      return json_({ ok: true, url: 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w1200' });\n    }\n    if (d.action === 'removeContent') {\n      const sh = conSheet_(), r = rowOf_(sh, d.id);\n      if (!r) return json_({ ok: false, error: 'לא נמצא' });\n      sh.deleteRow(r);\n      return json_({ ok: true });\n    }\n    return json_({ ok: false, error: 'פעולה לא מוכרת' });\n  } catch (err) {\n    return json_({ ok: false, error: String(err) });\n  }\n}\n\nfunction doGet(e) {\n  const p = e.parameter || {};\n  // תוכן שנוסף מהאדמין – כל הגולשות רואות אותו\n  if (p.action === 'content') {\n    const rows = conSheet_().getDataRange().getValues(), items = {};\n    CONTENT_KINDS.forEach(k => items[k] = []);\n    for (let i = 1; i < rows.length; i++) {\n      try { const it = JSON.parse(rows[i][4]); if (items[rows[i][2]]) items[rows[i][2]].push(it); } catch (err) {}\n    }\n    return json_({ ok: true, items: items });\n  }\n  // הסרה מרשימת התפוצה (הקישור שבסוף כל מייל)\n  if (p.action === 'unsub') {\n    const email = String(p.email || '').toLowerCase(), sh = subsSheet_(), rows = sh.getDataRange().getValues();\n    for (let i = 1; i < rows.length; i++) if (String(rows[i][1]).toLowerCase() === email) sh.getRange(i + 1, 5).setValue('לא');\n    return HtmlService.createHtmlOutput('<div dir=\"rtl\" style=\"font-family:Arial,sans-serif;padding:48px;font-size:20px\">הוסרת מרשימת התפוצה של מדליק. תודה, ושיהיה חג אורים שמח.</div>');\n  }\n  return json_({ ok: true });\n}\n\nfunction send_(d) {\n  const rows = subsSheet_().getDataRange().getValues();\n  let to = [];\n  if (d.test) to = [String(d.test)];\n  else for (let i = 1; i < rows.length; i++) if (rows[i][4] !== 'לא') to.push(rows[i][1]);\n  const subject = String(d.subject || '').trim(), body = String(d.body || '');\n  if (!subject || !body) return json_({ ok: false, error: 'חסר נושא או הודעה' });\n  const quota = MailApp.getRemainingDailyQuota();\n  let sent = 0, skipped = 0;\n  for (const email of to) {\n    if (sent >= quota) { skipped++; continue; }\n    const unsub = ScriptApp.getService().getUrl() + '?action=unsub&email=' + encodeURIComponent(email);\n    const html = '<div dir=\"rtl\" style=\"font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#071a38\">' + esc_(body).replace(/\\n/g, '<br>') +\n      '<hr style=\"margin-top:32px;border:0;border-top:1px solid #ddd\"><p style=\"font-size:12px;color:#666\">קיבלת מייל זה כי נרשמת לרשימת התפוצה של מדליק. <a href=\"' + unsub + '\">להסרה מהרשימה</a></p></div>';\n    MailApp.sendEmail({ to: email, subject: subject, htmlBody: html, body: body + '\\n\\nלהסרה מהרשימה: ' + unsub, name: 'מדליק' });\n    sent++;\n  }\n  return json_({ ok: true, sent: sent, skipped: skipped });\n}\n\n// פנייה מהטופס של בעל עסק: נשלחת למייל שהוגדר לעסק בניהול (נקבע לפי מזהה העסק בגיליון, ולא לפי כתובת שמגיעה מהאתר)\nfunction notifySupplier_(data) {\n  const sid = String(data.sid || ''); if (!sid) return;\n  const rows = conSheet_().getDataRange().getValues(); let item = null;\n  for (let i = 1; i < rows.length; i++) if (String(rows[i][0]) === sid && rows[i][2] === 'suppliers') { try { item = JSON.parse(rows[i][4]); } catch (err) {} break; }\n  if (!item) return;\n  const to = valid_(String(item.email || '')) ? String(item.email).trim() : NOTIFY_COPY;\n  const body = 'הפרסום במדליק עובד! התקבלה פנייה חדשה דרך מדליק עבור ' + (item.name || '') + '\\n\\n' +\n    'שם: ' + (data.name || '') + '\\nטלפון: ' + (data.phone || '') + '\\nמייל: ' + (data.email || '') +\n    '\\nתאריך האירוע: ' + (data.date || '') + '\\nמספר משתתפים: ' + (data.count || '') + '\\n\\nפרטים:\\n' + (data.msg || '');\n  const opt = { to: to, subject: 'פנייה חדשה מ' + (data.name || 'לקוח') + ' | הפרסום במדליק עובד', body: body, name: (data.name || 'לקוח') + ' (דרך מדליק)' };\n  if (to !== NOTIFY_COPY) opt.bcc = NOTIFY_COPY;\n  if (valid_(String(data.email || ''))) opt.replyTo = String(data.email).trim();\n  MailApp.sendEmail(opt);\n}\n";
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
  if(kind==='leads' && data.sid && !/^(localhost|127.0.0.1|[::1])$/.test(location.hostname)){ // מייל לבעל העסק דרך FormSubmit (בלי קוד נוסף בגוגל). עותק תמיד אל officeautoclick
    try{ const s = findIn('suppliers', data.sid) || {}, biz = /^[^@s]+@[^@s]+.[^@s]+$/.test(String(s.email||'')) ? String(s.email).trim() : '';
      const body = {_subject:'פנייה חדשה מ' + (data.name||'לקוח') + ' | הפרסום במדליק עובד', _template:'table', _captcha:'false', 'הודעה ממדליק':'הפרסום במדליק עובד! התקבלה פנייה חדשה מלקוח דרך האתר', 'עסק':data.supplier||'', 'שם':data.name||'', 'טלפון':data.phone||'', 'מייל':data.email||'', 'תאריך האירוע':data.date||'', 'משתתפים':data.count||'', 'פרטים':data.msg||''};
      if(biz) body._cc = biz; if(/^[^@s]+@[^@s]+.[^@s]+$/.test(String(data.email||''))) body._replyto = data.email;
      fetch('https://formsubmit.co/ajax/officeautoclick@gmail.com', {method:'POST', headers:{'Content-Type':'application/json', 'Accept':'application/json'}, body:JSON.stringify(body)}).catch(()=>{}); }catch(e){}
  }
  if(!API()) return;
  try{ fetch(API(), {method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify({action:'submit', kind, data})}).catch(()=>{}); }catch(e){}
}
// ספירת כניסות: לכל מדור ולכל בעל עסק. נשלח לשרת כשהוא מחובר, ותמיד נשמר גם בדפדפן הזה
const SECTIONS = {cards:'פעילויות להדפסה', home:'עמוד הבית', games:'משחקים על המסך שניתנים גם להדפסה', game:'משחקים על המסך שניתנים גם להדפסה', create:'פעילויות להדפסה', creator:'פעילויות להדפסה', studio:'סטודיו מיתוג', edit:'סטודיו מיתוג', design:'סטודיו מיתוג', recipes:'מתכונים', recipe:'מתכונים', suppliers:'נותני שירות', supplier:'נותני שירות', advertise:'רוצים לפרסם?', submit:'שליחת רעיון', me:'האזור שלי', search:'חיפוש'};
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
  t.outerHTML = '<span class="sup-tel open" dir="ltr">' + esc(s.phone) + '</span>';
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
/* תמונות מהניהול נשמרות בחתיכות בגיליון (בלי קוד נוסף של גוגל): כאן מחברים אותן חזרה לתמונה אחת */
function assembleImgs(items){
  const sup = (items && items.suppliers) || [], ch = {}, keep = [];
  sup.forEach(s => { if(s && s._chunk){ (ch[s._chunk] = ch[s._chunk] || [])[s.i] = s.d; } else keep.push(s); });
  keep.forEach(s => { if(typeof s.img === 'string' && s.img.indexOf('chunk:') === 0){ const id = s.img.slice(6), parts = ch[id] || []; s._imgId = id; s._imgN = parts.length; s.img = parts.length && Array.from(parts, x => x || '').every(Boolean) ? parts.join('') : ''; } });
  items.suppliers = keep; return items;
}
function refreshRemote(){
  if(!API()) return Promise.resolve();
  return fetch(API()+'?action=content').then(r=>r.json()).then(r=>{ if(r.ok){ remote = assembleImgs(r.items); store.set('remote_content', remote); } });
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

/* ---------- קלפים טיפוליים מבית מיניאטורה (יהודית לרנר) ---------- */
const MINI = Array.from({length:20}, (_, i) => { const n = String(i + 1).padStart(2, '0'); return {n, full:'img/miniatura/card-' + n + '.webp', thumb:'img/miniatura/t-' + n + '.webp'}; });
const miniFeature = () => '<div class="wrap mn-feat-wrap"><a class="mn-feat" href="#/cards" aria-label="קלפים טיפוליים מבית מיניאטורה, יהודית לרנר. לצפייה, הורדה והדפסה">' +
  '<span class="mn-fan" aria-hidden="true">' + [[2, -17, -150, 34], [7, -8, -75, 10], [11, 0, 0, 0], [15, 8, 75, 10], [19, 17, 150, 34]].map(([k, r, x, y], i) => '<i style="--r:' + r + ';--x:' + x + ';--y:' + y + ';--d:' + (i * .12).toFixed(2) + 's;--z:' + (i === 2 ? 5 : 3 - Math.abs(i - 2)) + '"><img src="' + MINI[k].thumb + '" alt="" loading="lazy"></i>').join('') + '</span>' +
  '<span class="mn-txt"><span class="mn-tag"><b></b>חדש להורדה ולהדפסה</span><h2>קלפים טיפוליים</h2><p>מבית <b>מיניאטורה</b> · יהודית לרנר</p><span class="mn-cta">לצפייה, הורדה והדפסה <i>←</i></span></span>' +
  '<s class="mn-sp s1"></s><s class="mn-sp s2"></s><s class="mn-sp s3"></s><s class="mn-sp s4"></s></a></div>';
const miniDownload = c => {
  const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0);
    cv.toBlob(b => { if(!b) return toast('לא הצלחתי להכין את הקובץ'); const u = URL.createObjectURL(b), l = document.createElement('a'); l.href = u; l.download = 'miniatura-card-' + c.n + '.jpg'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); toast('הקלף ירד למחשב'); }, 'image/jpeg', .93); };
  im.onerror = () => toast('לא הצלחתי להוריד את הקלף'); im.src = c.full;
};
const miniPrint = (list, sheet) => {
  const imgs = list.map(c => { const im = new Image(); im.src = c.full; return im.decode ? im.decode().catch(() => {}) : Promise.resolve(); });
  toast('מכינה להדפסה...');
  Promise.all(imgs).then(() => {
    if(!sheet){ printHTML('<div style="width:297mm;height:209mm;display:grid;place-items:center;background:#fff"><img src="' + list[0].full + '" style="width:236mm;height:auto;border-radius:4mm" alt=""></div>', {credit:false, page:'A4 landscape', margin:0}); return; }
    const pages = []; for(let i = 0; i < list.length; i += 8) pages.push(list.slice(i, i + 8));
    printHTML(pages.map(p => '<div style="width:210mm;height:296mm;box-sizing:border-box;padding:10mm;display:grid;grid-template-columns:repeat(2,92mm);grid-auto-rows:63mm;gap:4mm;justify-content:center;align-content:start;background:#fff;page-break-after:always">' + p.map(c => '<img src="' + c.full + '" style="width:92mm;height:63mm;object-fit:cover;border-radius:2.5mm" alt="">').join('') + '</div>').join(''), {credit:false, page:'A4', margin:0});
  });
};
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
const REC_LOGOS = {goldie:{img:'img/goldie-logo.webp', name:'גולדי כהן', brand:'גולד CAKE'}};
const recLogo = (r, cls) => REC_LOGOS[r.logo] ? '<img class="' + (cls || 'rec-logo') + '" src="' + REC_LOGOS[r.logo].img + '" alt="לוגו ' + esc(REC_LOGOS[r.logo].brand) + '" loading="lazy">' : '';
const recipeCard = (r,i=0) => `<a class="card" href="#/recipe/${esc(r.id)}">${favBtn('recipes',r.id)}<div class="card-top" style="--bg:${bgs[(i+2)%5]}">${safeImg(r.img) ? `<img class="rec-img" src="${esc(safeImg(r.img))}" alt="${esc(r.title)}" loading="lazy">${recLogo(r)}` : art(r)}</div><div class="card-body"><h3>${esc(r.title)}</h3><div class="tags"><span class="tag">${esc(r.cat)}</span><span class="tag"> ${esc(r.time)} דק׳</span><span class="tag">${esc(r.level)}</span><span class="tag">${esc(r.diet)}</span></div></div></a>`;
const safeImg = p => /^(img\/[\w\-\/.%]+|https:\/\/[^\s"'<>]+|data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+\/=]+)$/i.test(String(p || '')) ? String(p) : '';
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
    <h1 class="hero-word"><span class="sr-only">מדליק – האתר לערב לביבות: משחקים, מתכונים, מיתוג ונותני שירות</span><img class="hero-logo" src="img/logo-mark.png" alt="מדליק – כל מה שצריך לערב לביבות"></h1>
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
  <div class="statement"><p>${stm}</p></div>
  ${wshow('games','משחקים על המסך שניתנים גם להדפסה','משחקים דיגיטליים אטרקטיביים על המסך','קרב המילים, אליאס, זיכרון, חידון חנוכה ועוד. מקרינים על המסך ומשחקים, עם צלילים וניקוד.','#/games','לכל המשחקים על המסך',D.creators.filter(c=>canPlay(c.id)||c.id==='battle').slice(0,3).map(creatorCard).join(''))}
  ${wshow('create','פעילויות להדפסה','פעילויות להדפסה בהתאמה אישית','בינגו, רביעיות, תפזורת ועוד. מכניסים את המילים שלכם ומקבלים דף מעוצב להדפסה.','#/create','לכל הפעילויות להדפסה',D.creators.filter(c=>!canPlay(c.id)&&c.id!=='battle').slice(0,3).map(creatorCard).join(''))}
  ${wshow('studio','סטודיו מיתוג','המיתוג של הערב','בוחרים שפה עיצובית, כותבים את המילים שלכם, ומזיזים הכול איפה שרוצים.','#/studio','לסטודיו',(D.styles||[]).slice(0,3).map(styleCard).concat(D.templates.filter(t=>t.repeat).slice(0,3)).slice(0,3).map(x=>typeof x==='string'?x:tplCard(x)).join(''))}
  ${wshow('recipes','מתכונים','טעימות לערב','לביבות, סופגניות ומגשי אירוח. הכמויות מתחשבות לבד.','#/recipes','לכל המתכונים',content('recipes').slice(0,3).map(recipeCard).join(''))}
  ${wshow('biz','נותני שירות','נותני שירות שישדרגו לכם את האירוע','אולמות, קייטרינג, מפעילים ועוד. לפי אזור ולפי מחיר.','#/suppliers','לעסקים',content('suppliers').slice(0,3).map(supCard).join(''))}
  <section class="final">
    <a class="big-link" href="#/games">מתחילים לשחק <i>←</i></a>
    <a class="big-link" href="#/submit">יש לך רעיון? <i>←</i></a>
    <a class="big-link" href="#/advertise">יש לך עסק? <i>←</i></a>
  </section>`;
};
pages.home.after = () => {
  /* החלון הקופץ של נותני שירות: גם כשמגיעים למדור נותני השירות בעמוד הבית */
  const bizSec = document.querySelector('.wshow[data-w="biz"]');
  if('IntersectionObserver' in window && bizSec){
    const io = new IntersectionObserver(es => { if(es.some(e => e.isIntersecting)){ io.disconnect(); showBizNotice(); } }, {threshold:.45});
    io.observe(bizSec);
  }
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
  return pageHead('תוצאות חיפוש', `חיפשת: "${esc(term)}"`, 'חיפוש') + `<div class="wrap">${(g.length+r.length+s.length)?block('משחקים',g,gameCard)+block('מתכונים',r,recipeCard)+block('נותני שירות',s,supCard):'<div class="empty">לא נמצאו תוצאות. נסה מילה אחרת.</div>'}</div>`;
};

/* משחקים */
/* ---------- עמוד המשחקים: נקי ושקט ---------- */
pages.games = () => {
  const all = content('games').filter(isScreenGame);
  const types = [...new Set(all.map(g=>g.type))], formats = [...new Set(all.flatMap(g=>g.format||[]))], ages = [...new Set(all.map(g=>g.age))];
  const tools = D.creators.filter(c=>canPlay(c.id)||c.id==='battle');
  return `<div class="gp"><div class="wrap gp-wrap">
    <header class="gp-top"><h1>משחקים על המסך</h1><span class="gp-line"></span></header>
    <div class="cards gp-tools">${tools.map(creatorCard).join('')}</div>
    <div class="cards gp-list" id="gl"></div>
  </div></div>`;
};
pages.games.after = () => {
  const l = document.getElementById('gl');
  l.innerHTML = content('games').filter(isScreenGame).map(gameCard).join('');
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
pages.create = () => pageHead('פעילויות להדפסה בהתאמה אישית', 'בוחרים פעילות, מכניסים את המילים שלכם, ומקבלים דף מעוצב להדפסה או ל־PDF. הכול בחינם.', 'פעילויות להדפסה') + miniFeature() + `<div class="wrap pc-list">
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
const TOURS = {
  studio: [
    {ic:'👋', sel:'.hl-credit', t:'ברוכות הבאות לסטודיו', d:'העיצובים כאן נוצרו במיוחד למדליק על ידי גרפיקאית מקצועית. בשלושה צעדים מקבלים מיתוג מוכן להדפסה.'},
    {ic:'🎨', tight:1, sel:'.st-sec .st-h', t:'שלב 1: בוחרים עיצוב', d:'גוללים בין התמונות ולוחצים על העיצוב שאהבתם. אחרי הלחיצה הדף קופץ לבחירת מוצר.'},
    {ic:'✨', sel:'.tp-strip', t:'כל התבניות בשורה אחת', d:'אפשר לגלול הצידה ולדלג מתבנית לתבנית בכל רגע, והעיצוב שבחרתם נשמר.'},
    {ic:'🧁', tight:1, sel:'#stProd .st-h', t:'שלב 2: בוחרים מוצר', d:'מדבקות, הזמנות, פלייסמנט ועוד. כל ציור מראה איך ייראה הדף כפי שיודפס.'},
    {ic:'👇', sel:'#stProd .mp-card', t:'לוחצים על מוצר', d:'לוחצים על הכרטיס ועוברים לעריכה. שם כותבים, גוררים ומורידים.'},
    {ic:'🖌️', sel:'.st-fmts', t:'רוצים דף ריק?', d:'בעורך החופשי בוחרים גודל דף ומעצבים הכול בעצמכם, בעיצוב שבחרתם.'}
  ],
  design: [
    {ic:'🧰', sel:'.tp-tabs', t:'חמישה כלים בשורה אחת', d:'טקסט, גופן, צבע, רקע ותצוגה. לוחצים על כלי ועוברים אליו. מתחילים מהטקסט.'},
    {ic:'✏️', sel:'[data-fld=title]', t:'קודם כותבים', d:'מחליפים את הכותרת במילים שלכם. אפשר להשאיר שורות ריקות. התוצאה מתעדכנת מיד בתצוגה.'},
    {ic:'🔤', sel:'.tp-tab[data-tab=font]', t:'גופן וגודל', d:'יש כאן 300 גופנים. טיפ: כותרת בגופן עבה ושאר הטקסט בגופן פשוט נראים הכי מסודרים.'},
    {ic:'🌈', sel:'.tp-tab[data-tab=color]', t:'צבעים וקריאות', d:'צובעים את הכותרת ואת שאר הטקסט. אם קשה לקרוא על התמונה, מחזקים את הלוחית או מוסיפים צל.'},
    {ic:'🖼️', sel:'.tp-tab[data-tab=bg]', t:'הרקע והעיצוב', d:'מחליפים שפה עיצובית, מקרבים את התמונה ומכהים או מבהירים אותה, כדי שהטקסט יבלוט.'},
    {ic:'👆', sel:'.tp-vtools', t:'גוררים כדי למקם', d:'לוחצים על הכיתוב או על התמונה וגוררים למקום הכי יפה. כך מזיזים את העיצוב בתוך המוצר. אפשר גם להגדיל ולהקטין.'},
    {ic:'↩️', sel:'.tp-top', t:'טעות? אין בעיה', d:'ביטול ושחזור מחזירים כל פעולה. כפתור איפוס מחזיר הכול להתחלה.'},
    {ic:'🖨️', sel:'.tp-dock', t:'מורידים או מדפיסים', d:'כשהכול נראה טוב: הדפסה, הורדה כתמונה או שמירה באזור האישי. מה שרואים בתצוגה הוא מה שיודפס.'}
  ]
};
function runTour(key, force){
  const steps = (TOURS[key] || []).filter(s => document.querySelector(s.sel));
  const seenKey = 'tour_' + key + '_v2';
  if(!steps.length || document.querySelector('.tour-ov')) return;
  if(!force && store.get(seenKey, false)) return;
  let i = 0; const ov = document.createElement('div'); ov.className = 'tour-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'סיור קצר');
  ov.innerHTML = '<i class="tour-dim d1"></i><i class="tour-dim d2"></i><i class="tour-dim d3"></i><i class="tour-dim d4"></i><div class="tour-hole"></div><i class="tour-ping"></i><div class="tour-box"><i class="tour-spark s1"></i><i class="tour-spark s2"></i><i class="tour-spark s3"></i><div class="tour-head"><span class="tour-ic" aria-hidden="true"></span><div><span class="tour-n"></span><h3></h3></div></div><p></p><div class="tour-dots" aria-hidden="true"></div><div class="tour-btns"><button type="button" class="tour-skip">דלגו על הסיור</button><button type="button" class="tour-next tour-go"><span></span><i aria-hidden="true">←</i></button></div></div>';
  document.body.appendChild(ov);
  const hole = ov.querySelector('.tour-hole'), ping = ov.querySelector('.tour-ping'), box = ov.querySelector('.tour-box'), $q = s => ov.querySelector(s);
  const end = () => { store.set(seenKey, true); window.removeEventListener('resize', place); window.removeEventListener('scroll', place); document.removeEventListener('keydown', key_); ov.remove(); };
  const place = () => {
    const el = document.querySelector(steps[i].sel); if(!el) return;
    let r = el.getBoundingClientRect(); if(steps[i].tight){ const g = document.createRange(); g.selectNodeContents(el); const q = g.getBoundingClientRect(); if(q.width) r = q; }
    const pad = steps[i].tight ? 14 : 8, vh = innerHeight, vw = innerWidth;
    const top = Math.max(6, r.top - pad), h = Math.min(vh - 12, r.height + pad * 2);
    Object.assign(hole.style, {top: top + 'px', left: Math.max(6, r.left - pad) + 'px', width: Math.min(vw - 12, r.width + pad * 2) + 'px', height: h + 'px'});
    const bh = box.offsetHeight, below = top + h + 14 + bh < vh;
    box.style.top = (below ? top + h + 18 : Math.max(10, top - bh - 18)) + 'px';
    const bl = Math.max(10, Math.min(vw - box.offsetWidth - 10, r.left + r.width / 2 - box.offsetWidth / 2));
    box.style.left = bl + 'px'; box.classList.toggle('up', !below);
    box.style.setProperty('--tx', Math.max(26, Math.min(box.offsetWidth - 26, r.left + r.width / 2 - bl)) + 'px');
    { const L = Math.max(6, r.left - pad), W = Math.min(vw - 12, r.width + pad * 2), q = ov.querySelectorAll('.tour-dim');
      Object.assign(q[0].style, {top:'0', left:'0', right:'0', height:top + 'px'}); Object.assign(q[1].style, {top:(top + h) + 'px', left:'0', right:'0', bottom:'0'});
      Object.assign(q[2].style, {top:top + 'px', left:'0', width:L + 'px', height:h + 'px'}); Object.assign(q[3].style, {top:top + 'px', left:(L + W) + 'px', right:'0', height:h + 'px'}); }
    ping.style.top = (top + h / 2 - 9) + 'px'; ping.style.left = Math.max(12, Math.min(vw - 30, r.left + r.width - 4)) + 'px';
  };
  const show = () => {
    const s = steps[i], el = document.querySelector(s.sel);
    el.scrollIntoView({block:'center', behavior:'instant'});
    $q('.tour-ic').textContent = s.ic || '✨'; $q('.tour-dots').innerHTML = steps.map((_, k) => '<b class="' + (k === i ? 'on' : k < i ? 'done' : '') + '"></b>').join(''); box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    $q('.tour-n').textContent = 'שלב ' + (i + 1) + ' מתוך ' + steps.length; $q('h3').textContent = s.t; $q('p').textContent = s.d;
    $q('.tour-next span').textContent = i === steps.length - 1 ? 'הבנתי, מתחילים' : 'הבא'; $q('.tour-next i').textContent = i === steps.length - 1 ? '✓' : '←';
    setTimeout(place, 60); setTimeout(place, 450); $q('.tour-next').focus({preventScroll:true});
  };
  const key_ = e => { if(e.key === 'Escape') end(); };
  document.addEventListener('keydown', key_); window.addEventListener('resize', place); window.addEventListener('scroll', place, {passive:true});
  $q('.tour-next').onclick = () => { if(i >= steps.length - 1) return end(); i++; show(); };
  $q('.tour-skip').onclick = end; show();
}
const startTourSoon = key => {
  if(store.get('tour_' + key + '_v2', false)) return;
  let tries = 0; const go = () => { if(document.getElementById('intro') && document.getElementById('intro').offsetParent !== null && tries++ < 40) return setTimeout(go, 300); setTimeout(() => runTour(key), 500); }; go();
};
document.addEventListener('click', e => { const b = e.target.closest('[data-tour]'); if(b) runTour(b.dataset.tour, true); });
const STRIP_ORDER = ['sticker-s','sticker','sticker-l','rect-s','rect-m','rect-l','pick-flag','bottle','bottle-small','cup-wrap','oil-label','invite','schedule','placemat','entrance-sign','sign','menu','poster','certificate','seat','nametag','thanks','gift-tag','topper','table-number'];
const tplStrip = (cur, style) => {
  const T = D.templates, ids = STRIP_ORDER.filter(i => T.some(t => t.id === i)).concat(T.filter(t => !STRIP_ORDER.includes(t.id)).map(t => t.id));
  const nm = t => String(t.title).replace(/\s*\(.*\)\s*/, '');
  return '<nav class="tp-strip" aria-label="כל התבניות. אפשר לדלג בין תבנית לתבנית"><span class="tp-strip-l">תבניות</span><div class="tp-strip-row">' + ids.map(i => { const t = T.find(x => x.id === i), ar = Math.max(.45, Math.min(2.4, t.w / t.h));
    return '<a class="tp-chip' + (t.id === cur ? ' on' : '') + '" data-tpl="' + esc(t.id) + '" href="#/studio/' + esc(t.id) + (style ? '?style=' + encodeURIComponent(style) : '') + '"' + (t.id === cur ? ' aria-current="page"' : '') + '><i class="tp-shape' + (t.round ? ' round' : '') + '" style="--ar:' + ar.toFixed(2) + '"></i><span>' + esc(nm(t)) + '</span></a>'; }).join('') + '</div><button type="button" class="tour-again" data-tour="' + (cur ? 'design' : 'studio') + '">סיור קצר</button></nav>';
};
const stripStyle = (root, id) => { const st = (D.styles || []).find(x => x.id === id), img = st ? (st.thumb || st.img) : '';
  root.querySelectorAll('.tp-chip').forEach(c => { const sh = c.querySelector('.tp-shape'); if(sh) sh.style.backgroundImage = img ? 'url(' + img + ')' : ''; c.setAttribute('href', '#/studio/' + c.dataset.tpl + (id ? '?style=' + encodeURIComponent(id) : '')); }); };
const mpCard = t => {
  const land = t.land || (!t.repeat && t.w > t.h), pw = land ? 297 : 210, ph = land ? 210 : 297, tw = t.pair ? t.w * 2 + 6 : t.w, m = t.repeat ? 10 : 0;
  let cols = 1, rows = 1, cells = 1;
  if(t.repeat){ cols = Math.max(1, Math.floor((pw - 2 * m) / (tw + 4))); rows = Math.max(1, Math.floor((ph - 2 * m) / (t.h + 4))); cells = cols * rows; }
  const nm = String(t.title).replace(/\s*\(.*\)\s*/, ''), mm = (t.w % 10 ? (t.w / 10).toFixed(1) : t.w / 10) + '×' + (t.h % 10 ? (t.h / 10).toFixed(1) : t.h / 10) + ' ס״מ';
  const page = t.repeat
    ? '<span class="mp-page' + (land ? ' land' : '') + '" style="aspect-ratio:' + pw + '/' + ph + ';padding:' + (m / pw * 100).toFixed(1) + '%"><span class="mp-cells" style="grid-template-columns:repeat(' + cols + ',1fr);gap:' + (4 / pw * 100).toFixed(2) + 'cqw">' + Array(cells).fill('<i class="mp-c' + (t.round ? ' round' : '') + '" style="aspect-ratio:' + tw + '/' + t.h + '"></i>').join('') + '</span></span>'
    : '<span class="mp-page' + (land ? ' land' : '') + '" style="aspect-ratio:' + pw + '/' + ph + '"><i class="mp-c one" style="width:' + (Math.min(92, tw / pw * 100)).toFixed(1) + '%;aspect-ratio:' + tw + '/' + t.h + '"></i></span>';
  const info = t.repeat ? 'דף A4 עם ' + cells + ' מדבקות' : 'דף ' + (Math.max(t.w, t.h) > 210 ? 'A4' : Math.max(t.w, t.h) > 148 ? 'A5' : 'קטן');
  return '<a class="mp-card" data-tpl="' + esc(t.id) + '" href="#/studio/' + esc(t.id) + '">' + page + '<b>' + esc(nm) + '</b><small>' + mm + ' · ' + info + '</small></a>';
};
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
  const mpIds = STRIP_ORDER.filter(i => T.some(t => t.id === i)).concat(T.filter(t => !STRIP_ORDER.includes(t.id)).map(t => t.id));
  return pageHead('סטודיו מיתוג', 'בוחרים שפה עיצובית, בוחרים מה להדפיס, עורכים את הטקסט, ורואים את הדף בדיוק כמו בהדפסה.', 'סטודיו מיתוג') + `
  <section class="hl-credit" aria-label="על העיצובים"><span class="hl-logo"><img src="img/hila-logo.gif" alt="הלוגו המונפש של חיהלה דוידוביץ" width="1684" height="364"></span><p>חיהלה דוידוביץ, גרפיקאית מקצועית עם טאצ' ייחודי, עיצבה במיוחד עבור אתר מדליק עיצובים מרהיבים למיתוג מדליק :)</p></div></section>
  ${tplStrip('', styles[0] ? styles[0].id : 'plain')}
  <div class="wrap">
    <section class="st-sec"><h2 class="st-h"><i>1</i>איזו שפה עיצובית מדברת אליך?</h2>
      <div class="st-styles" role="radiogroup" aria-label="שפה עיצובית">
        ${styles.map((s,i)=>`<label class="st-card"><input type="radio" name="stl" value="${esc(s.id)}" ${i===0?'checked':''}><span class="st-img"><img src="${esc(s.thumb||s.img)}" loading="lazy" alt="תצוגה של הסגנון ${esc(s.name)}"></span><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></label>`).join('')}
        <label class="st-card"><input type="radio" name="stl" value="plain" ${styles.length?'':'checked'}><span class="st-img plain-img"><i></i></span><b>צבע אחד, בלי תמונה</b><small>בוחרים ערכת צבעים פשוטה</small></label>
      </div></section>
    <section class="st-sec" id="stProd" tabindex="-1"><h2 class="st-h"><i>2</i>מה רוצים להדפיס?</h2><p class="muted" style="margin:0 0 16px">הציור מראה איך ייראה הדף כפי שיודפס, עם העיצוב שבחרת.</p>
      <div class="mp-grid">${mpIds.map(i => mpCard(T.find(t => t.id === i))).join('')}</div></section>
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
    stripStyle(document, st ? v : '');
    const g = document.querySelector('.mp-grid'); if(g){ g.style.setProperty('--bg', st ? 'url(' + new URL(st.thumb || st.img, document.baseURI).href + ')' : 'none'); g.classList.toggle('plainbg', !st); g.querySelectorAll('.mp-card').forEach(c => c.setAttribute('href', '#/studio/' + c.dataset.tpl + (st ? '?style=' + encodeURIComponent(v) : ''))); }
  };
  document.querySelectorAll('[name=stl],[name=fmt]').forEach(i => i.onchange = upd); upd(); startTourSoon('studio');
  document.querySelectorAll('[name=stl]').forEach(i => i.addEventListener('change', () => { const p = document.getElementById('stProd'); if(!p) return; setTimeout(() => { window.scrollTo({top: Math.max(0, p.getBoundingClientRect().top + scrollY - 130), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); p.focus({preventScroll:true}); }, 120); }));
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

const TP_SWATCHES = ['#ffffff','#111111','#f7f2e8','#4e0f26','#d4a64a','#e4572e','#ff6a00','#1a56b0','#2f80ed','#14a38a','#7b57c9','#ec008c'];
const tpDefault = q => ({theme:'gold-blue', font: q.style ? 'suez' : 'frank', style: q.style || '', fsz:100, bz:100, tcol:'', icol:'', pos:'', bx:'', by:'', ls:0, lh:100, po:100, pcol:'', pt:'', bb:0, tsh:0, tx:0, ty:0, lx:0, ly:0, lz:100});
const tpStyle = s => s.style ? (D.styles || []).find(x => x.id === s.style && x.tpl) : null;
const tpDefColors = s => { const st = tpStyle(s), th = D.themes.find(x => x.id === s.theme) || D.themes[0]; return st ? {t: st.tpl.title, i: st.tpl.ink} : {t: th.title, i: th.ink}; };
const TPI = {
  text: '<path d="M5 6V5h14v1M12 5v14M9 19h6"/>',
  font: '<path d="M3 19 8 6l5 13M5 14.5h6"/><path d="M16 19v-8m0 2.2a2.7 2.7 0 1 1 0 .1"/>',
  color: '<path d="M12 3a9 9 0 1 0 0 18c1.6 0 2-1 1.5-2s0-2.5 1.5-2.5h2a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  bg: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  view: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
};
const tpIc = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TPI[n]}</svg>`;
const TP_TABS = [
  {id:'text',  name:'טקסט',  col:'#ff7a2e', title:'עריכת הטקסט', sub:'כותבים את המילים שיופיעו על המוצר. אפשר גם ללחוץ ישר על טקסט בתצוגה.', mode:'לחיצה על טקסט בתצוגה פותחת אותו לעריכה'},
  {id:'font',  name:'גופן',  col:'#ff3d81', title:'גופן וסגנון כתב', sub:'בוחרים גופן מתוך 300, קובעים עובי, גודל וריווח.', mode:'משנים את המראה של האותיות'},
  {id:'color', name:'צבע',   col:'#10b981', title:'צבעי הטקסט', sub:'צובעים את הכותרת ואת שאר הטקסט, ומתאימים את הרקע שמאחורי הכתוב.', mode:'בוחרים צבע לטקסט ולרקע שמאחוריו'},
  {id:'bg',    name:'רקע',   col:'#3b82f6', title:'עריכת הרקע', sub:'מחליפים שפה עיצובית, גוררים את התמונה ומתקרבים אליה.', mode:'גוררים את התמונה להזזה · גלגל העכבר לזום'},
  {id:'view',  name:'תצוגה', col:'#8b5cf6', title:'לוגו ותצוגה', sub:'מוסיפים לוגו ומשנים את גודל התצוגה. ההדפסה לא מושפעת מגודל התצוגה.', mode:'התצוגה זהה להדפסה'}
];

pages.design = ([id], q) => {
  const t = D.templates.find(x=>x.id===id); if(!t) return notFound();
  const styles = (D.styles || []).filter(x => !x.legacy);
  const s = Object.assign(tpDefault(q), t.fields, q.d ? dec(q.d) : {});
  const small = Math.min(t.w, t.h) < 80;
  const pal = (() => { const st = tpStyle(s); return (st ? st.palette.slice(0, 5) : []).concat(TP_SWATCHES).filter((c, i, a) => a.indexOf(c) === i); })();
  const fld = (k, label, hint, kind, off) => `<label data-fld="${k}" class="${off ? 'tp-off' : ''}"><span class="fl">${label}<em>${hint}</em></span>${kind === 'area' ? `<textarea name="${k}" rows="3" ${off ? 'disabled' : ''}>${esc(s[k])}</textarea>` : `<input name="${k}" value="${esc(s[k])}" ${off ? 'disabled' : ''}>`}</label>`;
  const rng = (key, label, min, max, val, unit, tip) => `<label class="pc"><span>${label}${tip ? `<em class="tp-tipi" title="${tip}">?</em>` : ''}</span><input type="range" data-sk="${key}" min="${min}" max="${max}" step="1" value="${val}" aria-label="${label}"><output>${val}${unit || '%'}</output></label>`;
  const head = tb => `<div class="tp-ph"><span class="tp-pi">${tpIc(tb.id)}</span><div><h3>${tb.title}</h3><p>${tb.sub}</p></div></div>`;
  const T = Object.fromEntries(TP_TABS.map(x => [x.id, x]));
  return pageHead(esc(t.title), 'בוחרים שפה, משלימים את הטקסט, גוררים את הרקע למקום הנכון, והדף מוכן בדיוק כמו שיודפס.', `<a href="#/studio">סטודיו</a> › ${esc(t.title)}`) + tplStrip(t.id, s.style || '') + `
  <div class="wrap builder">
    <form class="box form builder-panel ed-lite" id="df">
      <div class="tp-top"><button type="button" class="tp-ib" id="tpUndo" disabled title="ביטול (Ctrl+Z)">↶ ביטול</button><button type="button" class="tp-ib" id="tpRedo" disabled title="שחזור (Ctrl+Y)">↷ שחזור</button><button type="button" class="tp-ib" id="tpReset" title="חזרה להתחלה">איפוס הכול</button></div>
      <nav class="tp-tabs" role="tablist" aria-label="סוגי עריכה">${TP_TABS.map((tb, i) => `<button type="button" role="tab" class="tp-tab${i ? '' : ' on'}" data-tab="${tb.id}" aria-selected="${!i}" style="--tc:${tb.col}"><span class="tp-ti">${tpIc(tb.id)}</span><b>${tb.name}</b></button>`).join('')}</nav>

      <div class="tp-pane" data-pane="text" style="--tc:${T.text.col}">${head(T.text)}
        ${fld('pre', 'שורה עליונה', 'קטנה, מעל הכותרת')}${fld('title', 'כותרת', 'השורה הגדולה והבולטת')}${fld('sub', 'תת־כותרת', 'מתחת לכותרת')}
        ${fld('body', 'פרטים', 'כמה שורות של טקסט', 'area', small)}${fld('foot', 'שורה תחתונה', 'בתחתית המוצר', '', small)}
        ${small ? '<p class="tp-note">זה מוצר קטן, ולכן מוצגות בו רק שלוש שורות: עליונה, כותרת ותת־כותרת.</p>' : ''}</div>

      <div class="tp-pane" data-pane="font" style="--tc:${T.font.col}" hidden>${head(T.font)}
        <div class="tp-font"><button type="button" class="fcard" id="tpFont"><span class="fcard-pv" id="tpPv">חנוכה שמח</span><span class="fcard-m"><b id="tpName"></b><small id="tpCat"></small></span><span class="fcard-go">ספריית גופנים · ${window.MadlikFonts ? window.MadlikFonts.LIST.length : 300} ‹</span></button><div class="brow"><button type="button" class="bold-c" id="tpBold" aria-pressed="false" aria-label="מודגש" title="מודגש"><b>ב</b></button><span class="brow-t"><b>מודגש</b><small id="tpBoldT">כבוי</small></span></div></div>
        <div class="tp-grp"><h4>גודל וריווח</h4>${rng('fsz', 'גודל הטקסט', 50, 200, +s.fsz || 100, '%')}${rng('ls', 'מרווח בין אותיות', 0, 30, +s.ls || 0, '', 'ריווח רחב נותן מראה יוקרתי ואוורירי')}${rng('lh', 'מרווח בין שורות', 70, 200, +s.lh || 100, '%')}</div>
        <div class="tp-grp"><h4>קריאות</h4><div class="tg"><button type="button" class="pill" id="tpShadow" aria-pressed="false">צל לטקסט</button><span class="tp-tip">מוסיף צל עדין שעוזר לקרוא על תמונה עמוסה</span></div></div></div>

      <div class="tp-pane" data-pane="color" style="--tc:${T.color.col}" hidden>${head(T.color)}
        <div class="tp-grp"><h4>מה צובעים?</h4><div class="seg tp-seg" role="group" aria-label="מה לצבוע"><button type="button" data-ct="tcol" aria-pressed="true">הכותרת</button><button type="button" data-ct="icol" aria-pressed="false">שאר הטקסט</button></div>
          <label class="pc pc-c"><span>צבע</span><span class="cpick" style="--c:#ffffff"><input type="color" id="tpColor" value="#ffffff" aria-label="צבע הטקסט"><code>#ffffff</code></span></label>
          <div class="sw-row" id="tpSw" role="group" aria-label="צבעים מהירים">${pal.map(c => `<button type="button" class="sw" data-sw="${c}" style="--c:${c}" aria-label="צבע ${c}" title="${c}"></button>`).join('')}<button type="button" class="tp-def" id="tpColDef" title="חזרה לצבע של השפה העיצובית">ברירת מחדל</button></div></div>
        <div class="tp-grp" id="tpPlateBox"><h4>הרקע שמאחורי הטקסט</h4><label class="pc pc-c"><span>צבע הרקע</span><span class="cpick" style="--c:#ffffff"><input type="color" id="tpPcol" value="#ffffff" aria-label="צבע הרקע שמאחורי הטקסט"><code>#ffffff</code></span></label><div class="sw-row" id="tpPsw" role="group" aria-label="צבעים מהירים לרקע הטקסט">${pal.map(c => `<button type="button" class="sw" data-psw="${c}" style="--c:${c}" aria-label="צבע ${c}" title="${c}"></button>`).join('')}<button type="button" class="tp-def" id="tpPcDef" title="חזרה לרקע של השפה העיצובית">ברירת מחדל</button></div>${rng('pt', 'שקיפות הרקע', 0, 100, +s.pt || 0, '%', '0% = רקע אטום לגמרי, 100% = שקוף לגמרי ורואים רק את התמונה')}
          <div class="seg tp-seg" id="tpPosBox" role="group" aria-label="מיקום הטקסט"><button type="button" data-pos="top">למעלה</button><button type="button" data-pos="center">במרכז</button><button type="button" data-pos="bottom">למטה</button><button type="button" data-pos="">אוטומטי</button></div></div></div>

      <div class="tp-pane" data-pane="bg" style="--tc:${T.bg.col}" hidden>${head(T.bg)}
        <div class="tp-grp"><h4>שפה עיצובית</h4><div class="st-pick" id="stPick">${styles.map(x=>`<button type="button" class="stp ${s.style===x.id?'on':''}" data-style="${esc(x.id)}" title="${esc(x.name)}"><img src="${esc(x.thumb||x.img)}" alt="${esc(x.name)}" loading="lazy"></button>`).join('')}<button type="button" class="stp stp-plain ${s.style?'':'on'}" data-style="" title="בלי תמונה">בלי</button></div></div>
        <div id="bgBox" class="tp-grp"><h4>מיקום ותמונה</h4>${rng('bz', 'זום הרקע', 100, 320, +s.bz || 100, '%', 'אפשר גם לגלול עם גלגל העכבר מעל התמונה')}${rng('bb', 'בהירות הרקע', -60, 60, +s.bb || 0, '', 'שלילי מכהה את התמונה, חיובי מבהיר אותה')}
          <div class="tp-bgrow"><span class="tp-tip">גוררים את התמונה בתצוגה כדי להזיז אותה בתוך המוצר</span><button type="button" class="tp-ib" id="tpBgReset">איפוס רקע</button></div></div>
        <div id="themeBox" class="tp-grp"><h4>ערכת צבעים</h4><div class="swatches">${D.themes.map(th=>`<button type="button" class="swatch ${s.theme===th.id?'on':''}" data-theme="${th.id}" title="${th.name}" style="background:linear-gradient(135deg,${th.bg} 55%,${th.acc} 55%)"></button>`).join('')}</div></div></div>

      <div class="tp-pane" data-pane="view" style="--tc:${T.view.col}" hidden>${head(T.view)}
        <div class="tp-grp"><label><span class="fl">לוגו או תמונה<em>לא חובה, מופיע בראש הטקסט</em></span><input type="file" accept="image/*" id="logoIn"></label></div>
        <div class="tp-grp"><label class="pc"><span>גודל התצוגה</span><input type="range" id="zm" min="40" max="260" value="100" aria-label="גודל התצוגה"><output id="zmO">100%</output></label></div>
        <ul class="tp-keys"><li><kbd>Ctrl</kbd>+<kbd>Z</kbd> ביטול</li><li><kbd>Ctrl</kbd>+<kbd>Y</kbd> שחזור</li><li>גלגל העכבר על התמונה (בלשונית רקע): זום</li></ul></div>

      <div class="tp-dock">
        <button type="button" class="btn btn-gold" id="dPrint"> הדפסה / PDF</button>
        <button type="button" class="btn" id="dPng"> הורדה כתמונה</button>
        <button type="button" class="btn btn-light" id="dShare"> שיתוף</button>
        <button type="button" class="btn btn-light" id="dSave">♡ שמירה</button>
      </div>
    </form>
    <div class="tp-stage"><div class="tp-mode" id="tpMode"></div>
      <div class="tp-vtools"><button type="button" class="tp-vb tp-add" id="tpAddLogo">＋ לוגו / תמונה</button><span class="tp-zs"><button type="button" class="tp-vb" id="tpZout" aria-label="הקטנת התצוגה">−</button><b id="tpZl">100%</b><button type="button" class="tp-vb" id="tpZin" aria-label="הגדלת התצוגה">+</button><button type="button" class="tp-vb" id="tpZfit">התאמה</button></span></div>
      <div class="tp-viewport"><div class="preview-area" id="dv" data-mode="text"></div>
        <div class="tp-ovl" id="tpOvl" hidden><div class="tp-sel" id="tpSel"><i class="tp-hd" data-h="se" title="גוררים לשינוי גודל"></i></div><div class="tp-float" id="tpFloat"></div></div></div>
      <p class="tp-hint"><span>${t.repeat ? 'הדף המלא כפי שיודפס, עם כל המדבקות' : 'הדף כפי שיודפס'}</span><span id="tpModeH"></span></p>
  </div>
  </div>`;
};

pages.design.after = ([id], q) => {
  const t = D.templates.find(x=>x.id===id); if(!t) return;
  const f = document.getElementById('df'), dv = document.getElementById('dv'), F = window.MadlikFonts;
  const s = Object.assign(tpDefault(q), t.fields, q.d ? dec(q.d) : {});
  const init = JSON.stringify(s);
  let logo = '', zoomK = 1, ctarget = 'tcol', tab = 'text';
  const $ = x => document.getElementById(x);
  const pctv = (v, a, b) => Math.max(0, Math.min(100, (v - a) / (b - a) * 100)).toFixed(1) + '%';
  const read = () => Object.assign(s, Object.fromEntries(new FormData(f)));
  const TB = Object.fromEntries(TP_TABS.map(x => [x.id, x]));

  /* ---------- לשוניות ---------- */
  function setTab(n){
    tab = n; const tb = TB[n];
    f.querySelectorAll('.tp-tab').forEach(b => { const on = b.dataset.tab === n; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    f.querySelectorAll('.tp-pane').forEach(p => { p.hidden = p.dataset.pane !== n; });
    dv.dataset.mode = n; const m = $('tpMode'); m.style.setProperty('--tc', tb.col); m.innerHTML = `<span class="tp-mi">${tpIc(n)}</span><b>${tb.name}</b><span>${tb.mode}</span>`;
    $('tpModeH').textContent = n === 'bg' ? 'גוררים את התמונה · גלגל העכבר לזום' : n === 'text' ? 'לחיצה על טקסט פותחת אותו לעריכה' : 'התצוגה מתעדכנת מיד';
    showBoxes();
  }

  /* ---------- היסטוריה ---------- */
  let hist = [JSON.stringify(s)], hi = 0, pushT = 0;
  const histBtns = () => { $('tpUndo').disabled = hi < 1; $('tpRedo').disabled = hi >= hist.length - 1; };
  const push = () => { clearTimeout(pushT); pushT = setTimeout(() => { read(); const j = JSON.stringify(s); if(j === hist[hi]) return; hist = hist.slice(0, hi + 1); hist.push(j); hi = hist.length - 1; histBtns(); }, 350); };
  const restore = j => { Object.keys(s).forEach(k => delete s[k]); Object.assign(s, JSON.parse(j)); syncUI(); draw(); histBtns(); };

  /* ---------- סנכרון ---------- */
  const setRange = (el, v) => { if(!el) return; el.value = v; el.style.setProperty('--p', pctv(+v, +el.min, +el.max)); const o = el.nextElementSibling; if(o && o.tagName === 'OUTPUT') o.textContent = Math.round(v) + (el.dataset.sk === 'ls' || el.dataset.sk === 'bb' ? '' : '%'); };
  function syncFont(){
    const lf = D.fonts.find(x => x.id === s.font), meta = F && F.BY[s.font], bold = (+s.fw || 0) >= 600;
    const css = lf ? lf.css : "'" + s.font + "',sans-serif";
    const pv = $('tpPv'); pv.style.fontFamily = css; pv.style.fontWeight = s.fw || 400; pv.textContent = meta && !meta.he ? 'Happy Hanukkah' : 'חנוכה שמח';
    $('tpName').textContent = lf ? lf.name : s.font; $('tpCat').textContent = meta ? (meta.he ? 'עברית · ' : '') + F.CAT[meta.c] : 'גופן מובנה';
    const bb = $('tpBold'); bb.classList.toggle('on', bold); bb.setAttribute('aria-pressed', bold); $('tpBoldT').textContent = bold ? 'פעיל' : 'כבוי';
    const sh = $('tpShadow'); sh.setAttribute('aria-pressed', !!+s.tsh);
  }
  const plateBase = () => { const st = tpStyle(s); if(!st) return null; const b = Math.min(t.w, t.h) < 80 ? st.tpl.pl : st.tpl.plb; const m = String(b || '').match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?\s*\)/); return {c: m ? [+m[1], +m[2], +m[3]] : [255, 255, 255], a: b ? (m && m[4] != null ? +m[4] : 1) : .7}; };
  const ptDef = () => { const b = plateBase(); return b ? Math.round((1 - Math.min(1, b.a * ((+s.po || 100) / 100))) * 100) : 30; };
  const hex2 = n => ('0' + Math.max(0, Math.min(255, n)).toString(16)).slice(-2);
  function syncPlate(){
    const inp = $('tpPcol'); if(!inp) return; const b = plateBase(), def = b ? '#' + hex2(b.c[0]) + hex2(b.c[1]) + hex2(b.c[2]) : '#ffffff';
    const cur = /^#[0-9a-f]{6}$/i.test(s.pcol || '') ? s.pcol : def; inp.value = cur; const cp = inp.parentElement; cp.style.setProperty('--c', cur); cp.querySelector('code').textContent = s.pcol ? cur : cur + ' (ברירת מחדל)';
    $('tpPsw').querySelectorAll('.sw').forEach(x => x.classList.toggle('on', !!s.pcol && x.dataset.psw.toLowerCase() === s.pcol.toLowerCase()));
  }
  function syncColor(){
    const d = tpDefColors(s), cur = s[ctarget] || (ctarget === 'tcol' ? d.t : d.i), inp = $('tpColor');
    inp.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#000000'; const cp = inp.parentElement; cp.style.setProperty('--c', inp.value); cp.querySelector('code').textContent = s[ctarget] ? inp.value : inp.value + ' (ברירת מחדל)';
    f.querySelectorAll('[data-ct]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ct === ctarget));
    $('tpSw').querySelectorAll('.sw').forEach(b => b.classList.toggle('on', !!s[ctarget] && b.dataset.sw.toLowerCase() === s[ctarget].toLowerCase()));
  }
  function showBoxes(){
    const st = tpStyle(s), small = Math.min(t.w, t.h) < 80;
    $('themeBox').style.display = s.style ? 'none' : ''; $('bgBox').style.display = st ? '' : 'none';
    $('tpPlateBox').style.display = st ? '' : 'none'; $('tpPosBox').style.display = st && !small ? '' : 'none';
  }
  function syncUI(){
    ['pre','title','sub','body','foot'].forEach(k => { const el = f.elements[k]; if(el && !el.disabled) el.value = s[k] == null ? '' : s[k]; });
    const DEF = {fsz:100, ls:0, lh:100, po:100, bz:100, bb:0, pt:ptDef()};
    f.querySelectorAll('[data-sk]').forEach(r => { const v = s[r.dataset.sk]; setRange(r, v == null || v === '' ? DEF[r.dataset.sk] : +v); });
    stripStyle(document, s.style || '');
    f.querySelectorAll('.stp').forEach(b => b.classList.toggle('on', b.dataset.style === (s.style || '')));
    f.querySelectorAll('.swatch').forEach(b => b.classList.toggle('on', b.dataset.theme === s.theme));
    f.querySelectorAll('[data-pos]').forEach(b => b.setAttribute('aria-pressed', (s.pos || '') === b.dataset.pos));
    syncFont(); syncColor(); syncPlate(); showBoxes();
  }

  /* ---------- ציור הדף ---------- */
  const draw = () => {
    read(); const sh = sheetHTML(t, s, logo); dv.innerHTML = sh.html;
    const el = dv.firstElementChild, fit = Math.min(1, (dv.clientWidth - 96) / el.offsetWidth, (Math.max(420, innerHeight * .72)) / el.offsetHeight) * .82;
    el.style.zoom = Math.max(.05, fit * zoomK); placeOverlay();
  };
  let raf = 0; const drawSoon = () => { if(raf) return; raf = requestAnimationFrame(() => { raf = 0; draw(); }); };

  /* ---------- עריכה ישירה על התצוגה: גרירה, שינוי גודל, עריכה במקום ---------- */
  let sel = null, selIdx = 0, editing = null, editEnd = null;
  const TXT = '.d-pre,.d-title,.d-sub,.d-body,.d-foot';
  const designs = () => [...dv.querySelectorAll('.design')];
  const unionRect = els => { let r = null; els.forEach(e => { const b = e.getBoundingClientRect(); if(!b.width) return; r = r ? {left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom)} : {left: b.left, top: b.top, right: b.right, bottom: b.bottom}; }); return r; };
  const objRect = () => {
    const d = designs()[selIdx] || designs()[0]; if(!d) return null;
    if(sel === 'logo'){ const l = d.querySelector('.d-logo'); if(!l) return null; const b = l.getBoundingClientRect(); return {left: b.left, top: b.top, right: b.right, bottom: b.bottom}; }
    const pl = d.querySelector('.d-plate'); if(pl){ const b = pl.getBoundingClientRect(); return {left: b.left, top: b.top, right: b.right, bottom: b.bottom}; }
    return unionRect([...d.querySelectorAll(TXT)]);
  };
  function floatHTML(){
    if(sel === 'logo') return '<button type="button" data-fa="lm" title="הקטנה">−</button><button type="button" data-fa="lp" title="הגדלה">+</button><button type="button" data-fa="rep">החלפה</button><button type="button" data-fa="reset" title="איפוס מיקום וגודל">⟲</button><button type="button" data-fa="del" class="danger">מחיקה</button>';
    const d = tpDefColors(s), col = s.tcol || d.t;
    return `<button type="button" data-fa="szm" title="הקטנת הטקסט">A−</button><button type="button" data-fa="szp" title="הגדלת הטקסט">A+</button><button type="button" data-fa="bold" aria-pressed="${(+s.fw || 0) >= 600}" title="מודגש"><b>ב</b></button><button type="button" data-fa="font" title="החלפת גופן">גופן</button><button type="button" data-fa="color" title="צבע הטקסט"><i class="fcol" style="background:${col}"></i></button><button type="button" data-fa="reset" title="איפוס מיקום">⟲</button>`;
  }
  function placeOverlay(){
    const ov = $('tpOvl'); if(!sel || editing){ ov.hidden = true; return; }
    const r = objRect(); if(!r){ ov.hidden = true; return; }
    const v = $('tpOvl').parentElement.getBoundingClientRect(), box = $('tpSel'), fl = $('tpFloat');
    box.style.cssText = `left:${r.left - v.left}px;top:${r.top - v.top}px;width:${r.right - r.left}px;height:${r.bottom - r.top}px`;
    fl.innerHTML = floatHTML(); ov.hidden = false;
    const fh = fl.offsetHeight || 44, fw = fl.offsetWidth || 260;
    let top = r.top - v.top - fh - 12; if(top < 4) top = r.bottom - v.top + 12;
    let left = (r.left + r.right) / 2 - v.left - fw / 2; left = Math.max(4, Math.min(v.width - fw - 4, left));
    fl.style.top = top + 'px'; fl.style.left = left + 'px';
  }
  const select = (type, idx) => { sel = type; selIdx = idx || 0; placeOverlay(); };
  dv.addEventListener('scroll', () => placeOverlay());
  window.addEventListener('scroll', () => placeOverlay(), {passive: true});

  const applyTextOff = () => dv.querySelectorAll('.d-tg').forEach(el => { el.style.transform = (s.tx || s.ty) ? `translate(${s.tx}mm,${s.ty}mm)` : ''; });
  const applyLogo = () => dv.querySelectorAll('.d-logo').forEach(el => { el.style.setProperty('--lx', (s.lx || 0) + 'mm'); el.style.setProperty('--ly', (s.ly || 0) + 'mm'); });
  const logoWidth = () => ((Math.min(t.w, t.h) < 80 ? 46 : 28) * (+s.lz || 100) / 100);

  let drag = null;
  dv.addEventListener('pointerdown', e => {
    if(e.button || (e.target.isContentEditable)) return;
    if(editEnd && !e.target.closest('.editing')) editEnd();
    const d = e.target.closest('.design'); if(!d) return;
    const idx = designs().indexOf(d), pxmm = d.getBoundingClientRect().width / t.w;
    let kind = null;
    if(e.target.closest('.d-logo')) kind = 'logo';
    else if(e.target.closest(TXT + ',.d-plate')) kind = 'text';
    else if(tpStyle(s) && d.classList.contains('styled')) kind = 'bg';
    if(!kind){ sel = null; placeOverlay(); return; }
    const info = kind === 'bg' ? bgInfo(t, s, tpStyle(s)) : null;
    drag = {kind, idx, x: e.clientX, y: e.clientY, pxmm, moved: false, id: e.pointerId, info, px: info && info.px, py: info && info.py, ox: kind === 'logo' ? +s.lx || 0 : +s.tx || 0, oy: kind === 'logo' ? +s.ly || 0 : +s.ty || 0};
    try{ dv.setPointerCapture(e.pointerId); }catch(x){}
  });
  dv.addEventListener('pointermove', e => {
    if(!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if(!drag.moved && Math.hypot(dx, dy) < 4) return;
    if(!drag.moved){ drag.moved = true; dv.classList.add('dragging'); if(drag.kind !== 'bg') select(drag.kind, drag.idx); }
    const dxm = dx / drag.pxmm, dym = dy / drag.pxmm;
    if(drag.kind === 'bg'){
      const i = drag.info;
      const nx = (t.w - i.iw) < -.01 ? Math.max(0, Math.min(100, drag.px + dxm / (t.w - i.iw) * 100)) : drag.px;
      const ny = (t.h - i.ih) < -.01 ? Math.max(0, Math.min(100, drag.py + dym / (t.h - i.ih) * 100)) : drag.py;
      s.bx = Math.round(nx * 10) / 10; s.by = Math.round(ny * 10) / 10;
      dv.querySelectorAll('.design.styled').forEach(el => { el.style.backgroundPosition = s.bx + '% ' + s.by + '%'; });
    } else if(drag.kind === 'text'){
      s.tx = Math.round((drag.ox + dxm) * 10) / 10; s.ty = Math.round((drag.oy + dym) * 10) / 10; applyTextOff(); placeOverlay();
    } else {
      s.lx = Math.round((drag.ox + dxm) * 10) / 10; s.ly = Math.round((drag.oy + dym) * 10) / 10; applyLogo(); placeOverlay();
    }
  });
  const endDrag = () => {
    if(!drag) return; const d = drag; drag = null; dv.classList.remove('dragging');
    try{ dv.releasePointerCapture(d.id); }catch(x){}
    if(d.moved){ push(); return; }
    if(d.kind === 'bg'){ sel = null; placeOverlay(); return; }
    select(d.kind, d.idx);
    if(d.kind === 'text' && tab !== 'text' && tab !== 'font' && tab !== 'color') setTab('text');
  };
  dv.addEventListener('pointerup', endDrag); dv.addEventListener('pointercancel', endDrag);

  /* שינוי גודל בידית הפינתית */
  let rs = null;
  $('tpSel').addEventListener('pointerdown', e => {
    if(!e.target.closest('.tp-hd')) return; e.preventDefault(); e.stopPropagation();
    const r = objRect(); if(!r) return; const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    rs = {cx, cy, d0: Math.max(10, Math.hypot(e.clientX - cx, e.clientY - cy)), v0: sel === 'logo' ? (+s.lz || 100) : (+s.fsz || 100), id: e.pointerId};
    try{ e.target.setPointerCapture(e.pointerId); }catch(x){}
  });
  $('tpSel').addEventListener('pointermove', e => {
    if(!rs) return; const k = Math.hypot(e.clientX - rs.cx, e.clientY - rs.cy) / rs.d0;
    if(sel === 'logo'){ s.lz = Math.round(Math.max(20, Math.min(500, rs.v0 * k))); dv.querySelectorAll('.d-logo').forEach(el => el.style.setProperty('--lw', logoWidth() + '%')); placeOverlay(); }
    else { s.fsz = Math.round(Math.max(30, Math.min(300, rs.v0 * k))); setRange(f.querySelector('[data-sk=fsz]'), s.fsz); drawSoon(); }
  });
  const endRs = () => { if(rs){ rs = null; push(); } };
  $('tpSel').addEventListener('pointerup', endRs); $('tpSel').addEventListener('pointercancel', endRs);

  /* סרגל הכלים הצף */
  $('tpFloat').addEventListener('click', e => {
    const b = e.target.closest('[data-fa]'); if(!b) return; const a = b.dataset.fa;
    if(a === 'szm' || a === 'szp'){ s.fsz = Math.max(30, Math.min(300, (+s.fsz || 100) + (a === 'szp' ? 8 : -8))); setRange(f.querySelector('[data-sk=fsz]'), s.fsz); draw(); push(); }
    else if(a === 'bold'){ s.fw = (+s.fw || 0) >= 600 ? 400 : 700; syncFont(); draw(); push(); }
    else if(a === 'font'){ $('tpFont').click(); }
    else if(a === 'color'){ ctarget = 'tcol'; setTab('color'); syncColor(); }
    else if(a === 'lm' || a === 'lp'){ s.lz = Math.max(20, Math.min(500, (+s.lz || 100) + (a === 'lp' ? 12 : -12))); draw(); push(); }
    else if(a === 'rep'){ $('logoIn').click(); }
    else if(a === 'del'){ logo = ''; $('logoIn').value = ''; sel = null; draw(); push(); }
    else if(a === 'reset'){ if(sel === 'logo'){ s.lx = 0; s.ly = 0; s.lz = 100; } else { s.tx = 0; s.ty = 0; } draw(); push(); }
  });

  /* עריכת טקסט במקום: לחיצה כפולה */
  dv.addEventListener('dblclick', e => {
    const m = e.target.closest(TXT); if(!m || m.isContentEditable) return;
    const name = m.className.match(/d-(pre|title|sub|body|foot)/)[1];
    editing = m; sel = null; placeOverlay();
    m.contentEditable = 'true'; m.classList.add('editing'); m.focus();
    const rg = document.createRange(); rg.selectNodeContents(m); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(rg);
    const onIn = () => { s[name] = m.innerText.replace(/\n+$/, ''); const inp = f.elements[name]; if(inp && !inp.disabled) inp.value = s[name]; };
    const onKeyEd = ev => { if(ev.key === 'Enter' && name !== 'body' && !ev.shiftKey){ ev.preventDefault(); m.blur(); } else if(ev.key === 'Escape'){ m.blur(); } };
    m.addEventListener('input', onIn); m.addEventListener('keydown', onKeyEd);
    const finish = () => { if(editEnd !== finish) return; editEnd = null; m.removeEventListener('input', onIn); m.removeEventListener('keydown', onKeyEd); m.removeEventListener('blur', finish); editing = null; onIn(); draw(); push(); select('text', selIdx); };
    editEnd = finish; m.addEventListener('blur', finish);
  });

  /* זום בגלגל העכבר: בלשונית הרקע */
  dv.addEventListener('wheel', e => {
    if(tab !== 'bg' || !tpStyle(s) || !e.target.closest('.design.styled')) return;
    e.preventDefault(); s.bz = Math.max(100, Math.min(320, (+s.bz || 100) - e.deltaY * .2));
    setRange(f.querySelector('[data-sk=bz]'), s.bz); drawSoon(); push();
  }, {passive: false});

  /* זום התצוגה עצמה */
  const setZoom = k => { zoomK = Math.max(.4, Math.min(2.6, k)); const z = $('zm'); z.value = Math.round(zoomK * 100); z.style.setProperty('--p', pctv(+z.value, 40, 260)); $('zmO').textContent = z.value + '%'; $('tpZl').textContent = z.value + '%'; draw(); };
  $('tpZin').onclick = () => setZoom(zoomK * 1.2); $('tpZout').onclick = () => setZoom(zoomK / 1.2); $('tpZfit').onclick = () => setZoom(1);
  $('tpAddLogo').onclick = () => $('logoIn').click();

/* ---------- אירועי הטופס ---------- */
  f.oninput = e => {
    const el = e.target;
    if(el.dataset.sk){ s[el.dataset.sk] = +el.value; setRange(el, +el.value); draw(); push(); return; }
    if(el.id === 'tpColor'){ s[ctarget] = el.value; syncColor(); draw(); push(); return; }
    if(el.id === 'tpPcol'){ s.pcol = el.value; syncPlate(); draw(); push(); return; }
    if(el.id === 'zm' || el.id === 'logoIn') return;
    draw(); push();
  };
  f.onclick = e => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.tab){ setTab(b.dataset.tab); return; }
    if(b.dataset.style !== undefined){ s.style = b.dataset.style; s.bx = ''; s.by = ''; s.bz = 100; if(s.style && !D.fonts.find(x => x.id === s.font) && !(F && F.BY[s.font])) s.font = 'suez'; syncUI(); draw(); push(); return; }
    if(b.dataset.theme){ s.theme = b.dataset.theme; syncUI(); draw(); push(); return; }
    if(b.dataset.ct){ ctarget = b.dataset.ct; syncColor(); return; }
    if(b.dataset.sw){ s[ctarget] = b.dataset.sw; syncColor(); draw(); push(); return; }
    if(b.dataset.psw){ s.pcol = b.dataset.psw; syncPlate(); draw(); push(); return; }
    if(b.id === 'tpPcDef'){ s.pcol = ''; s.pt = ''; syncUI(); draw(); push(); return; }
    if(b.id === 'tpColDef'){ s[ctarget] = ''; syncColor(); draw(); push(); return; }
    if(b.id === 'tpShadow'){ s.tsh = +s.tsh ? 0 : 1; syncFont(); draw(); push(); return; }
    if(b.dataset.pos !== undefined){ s.pos = b.dataset.pos; syncUI(); draw(); push(); return; }
    if(b.id === 'tpBgReset'){ s.bx = ''; s.by = ''; s.bz = 100; s.bb = 0; syncUI(); draw(); push(); return; }
    if(b.id === 'tpUndo'){ if(hi > 0){ hi--; restore(hist[hi]); } return; }
    if(b.id === 'tpRedo'){ if(hi < hist.length - 1){ hi++; restore(hist[hi]); } return; }
    if(b.id === 'tpReset'){ if(confirm('לחזור להתחלה? כל השינויים יימחקו.')){ restore(init); push(); } return; }
  };
  $('tpFont').onclick = () => { if(!F) return; read(); F.open({font:s.font, text:s.title, weight:s.fw, bold:(+s.fw || 0) >= 600, he:true,
    onPick: n => { s.font = n; syncFont(); draw(); F.ensure(n).then(draw); push(); }, onBold: on => { s.fw = on ? 700 : 400; syncFont(); draw(); push(); }}); };
  $('tpBold').onclick = () => { s.fw = (+s.fw || 0) >= 600 ? 400 : 700; syncFont(); draw(); push(); };
  $('zm').oninput = e => setZoom(e.target.value / 100);
  $('logoIn').onchange = e => { const file = e.target.files[0]; if(!file) return; if(file.size > 5e6) return toast('הקובץ גדול מדי (עד 5MB)'); const r = new FileReader(); r.onload = () => { logo = r.result; s.lx = 0; s.ly = 0; sel = 'logo'; selIdx = 0; draw(); push(); }; r.readAsDataURL(file); };
  const onKey = e => {
    if(!document.body.contains(f)){ document.removeEventListener('keydown', onKey); return; }
    const tg = e.target, typing = tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT'), mod = e.ctrlKey || e.metaKey;
    if(!typing && !editing && sel && !mod){
      const st = e.shiftKey ? 5 : 1, ar = {ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st]}[e.key];
      if(ar){ e.preventDefault(); if(sel === 'logo'){ s.lx = (+s.lx || 0) + ar[0]; s.ly = (+s.ly || 0) + ar[1]; applyLogo(); } else { s.tx = (+s.tx || 0) + ar[0]; s.ty = (+s.ty || 0) + ar[1]; applyTextOff(); } placeOverlay(); push(); return; }
      if((e.key === 'Delete' || e.key === 'Backspace') && sel === 'logo'){ e.preventDefault(); logo = ''; $('logoIn').value = ''; sel = null; draw(); push(); return; }
      if(e.key === 'Escape'){ sel = null; placeOverlay(); return; }
    }
    if(typing || !mod) return;
    if(e.key.toLowerCase() === 'z' && !e.shiftKey){ e.preventDefault(); $('tpUndo').click(); }
    else if(e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)){ e.preventDefault(); $('tpRedo').click(); }
  };
  document.addEventListener('keydown', onKey);
  const onResize = () => document.body.contains(f) ? draw() : window.removeEventListener('resize', onResize);
  window.addEventListener('resize', onResize);
  f.querySelectorAll('input[type=range]').forEach(r => r.style.setProperty('--p', pctv(+r.value, +r.min, +r.max)));
  syncUI(); setTab('text'); draw(); histBtns(); startTourSoon('design');

  $('dPrint').onclick = () => { read(); const go = () => { const sh = sheetHTML(t, s, logo); printHTML(sh.html, {credit:false, page:sh.page, margin:0}); }; (F && F.BY[s.font] ? F.ensure(s.font) : Promise.resolve()).then(go); };
  $('dShare').onclick = () => { read(); copyLink(`#/studio/${t.id}?d=${enc(s)}`); };
  $('dSave').onclick = () => { read(); store.push('saved', {kind:'עיצוב', title:t.title+' – '+s.title, link:`#/studio/${t.id}?d=${enc(s)}`}); toast('נשמר באזור האישי ♡'); };
  $('dPng').onclick = () => {
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

/* גודל ומיקום הרקע בתוך המוצר (מידות במ״מ), משמש גם לציור וגם לגרירה */
function bgInfo(t, s, st){
  const k = st.tpl, small = Math.min(t.w, t.h) < 80, ar = st.landscape === false ? 0.747 : 1.414;
  const bz = (+s.bz || 100) / 100, wide = !small && t.w / t.h > 1.1 && st.landscape === false;
  const has = s.bx !== '' && s.bx != null && s.by !== '' && s.by != null;
  const px = has ? +s.bx : (small ? k.focus[0] : 50), py = has ? +s.by : (small ? k.focus[1] : 50);
  let mode, ih, iw;
  if(small){ ih = t.h * Math.max(2, (t.w / t.h) / ar * 1.3) * bz; iw = ih * ar; mode = 'h'; }
  else if(wide){ ih = t.h * bz; iw = ih * ar; mode = 'h'; }
  else if(t.w / t.h > ar){ iw = t.w * bz; ih = iw / ar; mode = 'w'; }
  else { ih = t.h * bz; iw = ih * ar; mode = 'h'; }
  const size = mode === 'h' ? `auto ${(ih / t.h * 100).toFixed(1)}%` : `${(iw / t.w * 100).toFixed(1)}% auto`;
  return {px, py, iw, ih, size, wide, small};
}

/* שינוי שקיפות של לוחית: מכפילים את ערך האלפא שבצבע */
function plateAlpha(c, f){
  const m = String(c || '').match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?\s*\)/);
  if(!m) return c; const a = Math.max(0, Math.min(1, (m[4] == null ? 1 : +m[4]) * f));
  return a <= .01 ? 'transparent' : `rgba(${m[1]},${m[2]},${m[3]},${a.toFixed(3)})`;
}

function designHTML(t, s, logo){
  const st = tpStyle(s);
  const lf = D.fonts.find(x=>x.id===s.font), fnt = lf ? lf.css : (window.MadlikFonts && window.MadlikFonts.BY[s.font] ? `'${s.font}','Assistant',sans-serif` : D.fonts[0].css);
  if(!lf && window.MadlikFonts && window.MadlikFonts.BY[s.font]) window.MadlikFonts.ensure(s.font);
  const fs = Math.min(t.w, t.h)/32, small = Math.min(t.w,t.h) < 80, em = (t.fs || fs*(small?1.6:1)) * ((+s.fsz || 100) / 100);
  const lsv = +s.ls || 0, lhv = +s.lh || 100;
  let typo = s.fw ? ';font-weight:' + s.fw : '';
  if(lsv) typo += `;--d-ls:${(lsv / 100).toFixed(3)}em`;
  if(lhv !== 100) typo += `;--d-lh:${(1.4 * lhv / 100).toFixed(2)};--d-lt:${(1.1 * lhv / 100).toFixed(2)}`;
  const tshadow = +s.tsh ? ' tsh' : '';
  const logoImg = logo ? `<img class="d-logo" src="${logo}" alt="" draggable="false" style="--lw:${(small ? 46 : 28) * (+s.lz || 100) / 100}%;--lx:${+s.lx || 0}mm;--ly:${+s.ly || 0}mm">` : '';
  const tg = (+s.tx || +s.ty) ? `transform:translate(${+s.tx || 0}mm,${+s.ty || 0}mm)` : '';
  let one;
  if(st){
    const k = st.tpl, base = small ? k.pl : k.plb, g = bgInfo(t, s, st);
    let pl = base ? plateAlpha(base, (s.po == null || s.po === '' ? 100 : +s.po) / 100) : '';
    const hasC = /^#[0-9a-f]{6}$/i.test(s.pcol || ''), hasT = s.pt !== '' && s.pt != null && !isNaN(+s.pt);
    if(hasC || hasT){
      const bm = String(base || '').match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)(?:[ ,/]+([\d.]+))?\s*\)/);
      const rgb = hasC ? [parseInt(s.pcol.slice(1, 3), 16), parseInt(s.pcol.slice(3, 5), 16), parseInt(s.pcol.slice(5, 7), 16)] : bm ? [+bm[1], +bm[2], +bm[3]] : [255, 255, 255];
      const al = hasT ? 1 - Math.max(0, Math.min(100, +s.pt)) / 100 : Math.min(1, (base ? (bm && bm[4] != null ? +bm[4] : 1) : .7) * ((s.po == null || s.po === '' ? 100 : +s.po) / 100));
      pl = al <= .01 ? 'transparent' : 'rgba(' + rgb.join(',') + ',' + al.toFixed(3) + ')';
    }
    const bgc = g.wide ? '#efe3cf' : '#222', bb = +s.bb || 0;
    const bright = bb ? `;box-shadow:inset 0 0 0 300mm ${bb < 0 ? 'rgba(0,0,0,' + (-bb / 100).toFixed(2) + ')' : 'rgba(255,255,255,' + (bb / 100).toFixed(2) + ')'}` : '';
    const bg = `background:${bgc} url(${st.img}) ${g.px}% ${g.py}%/${g.size} no-repeat`;
    const pos = s.pos || k.pos, just = small ? 'center' : (pos === 'bottom' ? 'flex-end' : pos === 'top' ? 'flex-start' : 'center');
    const pad = small ? '' : ';padding:7% 6%', tc = s.tcol || k.title, ic = s.icol || k.ink;
    one = `<div class="design styled${tshadow} ${t.round?'round':''}" style="width:${t.w}mm;height:${t.h}mm;font-size:${em}mm;--d-ink:${ic};--d-title:${tc};--d-acc:${s.icol || k.acc};--d-font:${fnt}${typo};${bg}${bright};justify-content:${just}${pad}${t.css?';'+t.css:''}">
      ${logoImg}<div class="d-plate d-tg" style="background:${pl||'transparent'};border-radius:${small?'1.1em':'4mm'};padding:${pl&&pl!=='transparent'?(small?'.45em .8em':'1.2em 2.2em'):'0'};${tg}">
        ${s.pre?`<div class="d-pre">${esc(s.pre)}</div>`:''}
        <div class="d-title">${esc(s.title)}</div>
        ${s.sub?`<div class="d-sub">${esc(s.sub)}</div>`:''}
        ${s.body&&!small?`<div class="d-body">${esc(s.body)}</div>`:''}
        ${s.foot&&!small?`<div class="d-foot">${esc(s.foot)}</div>`:''}
      </div></div>`;
  } else {
    const th = D.themes.find(x=>x.id===s.theme)||D.themes[0], tc = s.tcol || th.title, ic = s.icol || th.ink;
    one = `<div class="design${tshadow} ${t.round?'round':''}" style="width:${t.w}mm;height:${t.h}mm;font-size:${em}mm;--d-bg:${th.bg};--d-ink:${ic};--d-title:${tc};--d-acc:${s.icol || th.acc};--d-font:${fnt}${typo};--d-r:${t.round?'50%':'6px'}${t.css?';'+t.css:''}">
    ${t.nofr?'':'<div class="d-frame"></div>'}
    ${logoImg}<div class="d-txt d-tg" style="${tg}">
    ${s.pre?`<div class="d-pre">${esc(s.pre)}</div>`:''}
    <div class="d-title">${esc(s.title)}</div>
    ${s.sub?`<div class="d-sub">${esc(s.sub)}</div>`:''}
    ${s.body&&!small?`<div class="d-body">${esc(s.body)}</div>`:''}
    ${s.foot&&!small?`<div class="d-foot">${esc(s.foot)}</div>`:''}
  </div></div>`;
  }
  return t.pair ? `<div class="d-pair">${one}<i class="d-fold"></i>${one}</div>` : one;
}

/* מתכונים */
pages.recipes = () => {
  const cats = [...new Set(content('recipes').map(r=>r.cat))];
  return `<div class="kg kg-list"><div class="wrap kg-wrap">
    <header class="kg-lh"><h1>מתכונים</h1><p>לביבות, סופגניות, מגשי אירוח ושתייה – עם חישוב כמויות לפי מספר הסועדים.</p></header>
    <section class="gk-credit" aria-label="על המתכונים"><img class="gk-logo" src="img/goldie-logo.webp" alt="לוגו גולד CAKE" width="195" height="390"><div class="gk-col"><p><b>גולדי כהן</b>, בעלת קייטרינג חלבי אהוב – <b>גולד קייק</b>, פרגנה לנו כמה מתכונים לטעימה, בלעדי לאתר מדליק :)</p><p class="gk-soon" role="note"><span class="gk-fl" aria-hidden="true">🔥</span><span class="gk-st"><b>מתכונים נוספים יעלו לקראת חנוכה</b> – בכל אופן, לשמור משהו לערב לביבות<i class="gk-dots" aria-hidden="true"><u></u><u></u><u></u></i></span></p></section>
    <form class="kg-filters" id="rf" onsubmit="return false"><input type="search" name="q" placeholder="חיפוש מתכון או מצרך" aria-label="חיפוש מתכון"><select name="cat" aria-label="קטגוריה"><option value="">כל הקטגוריות</option>${cats.map(c=>`<option>${esc(c)}</option>`).join('')}</select><select name="diet" aria-label="חלבי או פרווה"><option value="">חלבי / פרווה</option><option>חלבי</option><option>פרווה</option><option>בשרי</option></select><select name="level" aria-label="רמת קושי"><option value="">כל הרמות</option><option>קל</option><option>בינוני</option><option>מאתגר</option></select></form>
    <div class="cards kg-cards" id="rl"></div></div></div>`;
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
const KG_ICONS = ['<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v7M8 10c0 6 1.5 9 4 11 2.5-2 4-5 4-11M10.5 10c0 5 .8 8 1.5 11M13.5 10c0 5-.8 8-1.5 11"/></svg>', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3c-2.2 0-3.5 2-3.5 4.2S6.800 11 9 11s3.500-1.600 3.500-3.800S11.200 3 9 3zM9 11v10"/></svg>', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l8-8M12 12l6-9 3 3-9 6z"/></svg>', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h14v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3zM3 10h18M9 7c0-2 1-3 3-3s3 1 3 3"/></svg>'];
pages.recipe = ([id]) => {
  const r = findIn('recipes', id); if(!r) return notFound();
  const img = safeImg(r.img), plug = r.plug && safeUrl(r.plug.url) ? r.plug : null, lg = REC_LOGOS[r.logo], max = Math.max(30, r.serves * 4);
  return `<div class="kg"><div class="wrap kg-wrap"><article class="kg-card">
    <a class="kg-x" href="#/recipes" aria-label="סגירה וחזרה לכל המתכונים" title="סגירה">×</a>
    <nav class="kg-bc" aria-label="מיקום"><a href="#/">ראשי</a> › <a href="#/recipes">מתכונים</a> › ${esc(r.title)}</nav>
    <header class="kg-head"><span class="kg-cat">${esc(r.cat)}</span><h1>${esc(r.title)}</h1>
      <p class="kg-meta">זמן הכנה: ${esc(r.time)} דק׳ · קושי: ${esc(r.level)} · ${esc(r.diet)}</p>
      ${lg ? `<div class="kg-by"><img src="${lg.img}" alt="לוגו ${esc(lg.brand)}"><span>מתכון מאת <b>${esc(lg.name)}</b><small>${esc(lg.brand)}</small></span></div>` : ''}
      <div class="kg-acts"><button class="btn btn-light" data-fav="recipes|${esc(r.id)}">${isFav('recipes',r.id)?'♥':'♡'} מועדפים</button><button class="btn btn-light" id="rPrint">הדפסה</button><button class="btn btn-light" id="rShare">שיתוף</button></div></header>
    <div class="kg-top${img ? '' : ' noimg'}">
      <aside class="kg-calc"><h2>מחשבון כמויות</h2>
        <div class="kg-srv"><span>מספר סועדים:</span><div class="kg-sl"><button type="button" id="sMinus" aria-label="פחות">−</button><input type="range" id="sRange" min="1" max="${max}" value="${r.serves}" aria-label="מספר סועדים"><button type="button" id="sPlus" aria-label="יותר">+</button></div><strong><span id="sNum">${r.serves}</span> סועדים</strong></div>
        <ul class="ing-list kg-ing" id="ing"></ul>
        <button type="button" class="kg-btn" id="toShop">הוספה לרשימת הקניות</button>
      </aside>
      ${img ? `<figure class="kg-photo"><img src="${esc(img)}" alt="${esc(r.title)}">${recLogo(r, 'rd-logo')}</figure>` : ''}
    </div>
    <section class="kg-steps"><h2>הכנה</h2><ol>${r.steps.map((x, i) => `<li>${KG_ICONS[i % 4]}<span>${esc(x)}</span></li>`).join('')}</ol>${r.tip ? `<p class="kg-tip">${esc(r.tip)}</p>` : ''}</section>
    ${plug ? `<aside class="kg-plug"><span class="kg-plug-ico" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 36h36M10 36a14 14 0 0 1 28 0M24 14v-3M21 11h6"/></svg></span><div class="kg-plug-t"><span>${esc(plug.kicker||'')}</span><h3>${esc(plug.title)}</h3><p>${esc(plug.text||'')}</p></div><a class="kg-plug-go" href="${esc(safeUrl(plug.url))}" target="_blank" rel="noopener noreferrer sponsored" data-web="rec-${esc(r.id)}">${esc(plug.btn||'לאתר')} <i>←</i></a></aside>` : ''}
    ${r.credit ? `<p class="kg-credit">המתכון באדיבות ${esc(r.credit)}</p>` : ''}
  </article></div></div>`;
};
pages.recipe.after = ([id]) => {
  const r = findIn('recipes', id); if(!r) return;
  let n = r.serves; const ing = document.getElementById('ing'), num = document.getElementById('sNum');
  const list = () => r.ing.map(([q,u,name])=>`${fmtQty(q*n/r.serves)} ${u} ${name}`.replace(/\s+/g, ' ').trim());
  const escKey = e => { if(e.key === 'Escape' && location.hash.indexOf('#/recipe/') === 0 && !document.querySelector('.fb-ov,.mn-lb,.tour-ov')) location.hash = '#/recipes'; };
  document.removeEventListener('keydown', window.__kgEsc || (() => {})); window.__kgEsc = escKey; document.addEventListener('keydown', escKey);
  const rg = document.getElementById('sRange');
  const draw = () => { num.textContent = n; ing.innerHTML = list().map(x=>`<li>${esc(x)}</li>`).join(''); if(rg){ rg.value = n; rg.style.setProperty('--p', ((n - rg.min) / (rg.max - rg.min) * 100) + '%'); } };
  document.getElementById('sMinus').onclick = () => { if(n>1){ n--; draw(); } };
  document.getElementById('sPlus').onclick = () => { if(n < (rg ? +rg.max : 99)){ n++; draw(); } };
  if(rg) rg.oninput = () => { n = +rg.value; draw(); };
  document.getElementById('toShop').onclick = () => { const s = store.get('shop', []); list().forEach(x=>s.push({t:x, from:r.title, done:false})); store.set('shop', s); toast('נוסף לרשימת הקניות באזור האישי '); };
  document.getElementById('rShare').onclick = () => copyLink('#/recipe/'+r.id);
  document.getElementById('rPrint').onclick = () => printHTML(`<div class="sheet" style="aspect-ratio:auto"><h1>${esc(r.title)}</h1><p>${n} סועדים · ${esc(r.time)} דק׳ · ${esc(r.level)}</p><h2>מצרכים</h2><ul>${list().map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h2>אופן ההכנה</h2><ol>${r.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>${REC_LOGOS[r.logo] ? `<p style="text-align:center"><img src="${REC_LOGOS[r.logo].img}" alt="" style="height:26mm;border-radius:3mm"><br>מתכון מאת ${esc(REC_LOGOS[r.logo].name)} · ${esc(REC_LOGOS[r.logo].brand)}</p>` : ''}<p style="color:#c49a45;text-align:center">מדליק · כל מה שצריך לערב לביבות</p></div>`);
  draw();
};

/* נותני שירות */
const ADS_EMAIL = 'rivki1806@gmail.com';
const PLANS = [
  {id:'Basic', name:'Basic', price:'300 ₪', text:'רואים אותך בעמוד העסקים.', cls:'p1'},
  {id:'Premium', name:'Premium', price:'800 ₪', text:'הפרסומת שלך גם בעמוד העסקים וגם עולה בעמוד הראשי בהרצה.', cls:'p2'},
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
  return pageHead('נותני שירות שישדרגו לכם את האירוע', 'אולמות, קייטרינג, מפעילים, עיצוב וקינוחים. לפי אזור, סוג ומחיר.', 'נותני שירות') + `
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
  const run = () => { const v = Object.fromEntries(new FormData(f)); const res = content('suppliers').filter(s=>(!v.q||JSON.stringify(s).includes(v.q))&&(!v.cat||s.cat===v.cat)&&(!v.region||s.region===v.region||s.region==='כל הארץ')&&(!v.price||s.price===v.price)).sort((a,b)=>(b.featured?1:0)-(a.featured?1:0)); l.innerHTML = res.length ? res.map(supCard).join('') : '<div class="empty">אין עדיין עסקים שמתאימים. נסו אזור אחר.</div>'; };
  f.oninput = run; run();
  const st = document.querySelector('[data-scroll]'); if(st) st.onclick = e => { e.preventDefault(); document.getElementById('adBlock').scrollIntoView({behavior:'smooth', block:'start'}); };
  adBlockAfter();
};

pages.supplier = ([id]) => {
  const s = findIn('suppliers', id); if(!s) return notFound();
  return pageHead(esc(s.name), esc(s.text), `<a href="#/suppliers">נותני שירות</a> › ${esc(s.name)}`) + `
  <div class="wrap detail">
    <div class="box"><h2>שליחת פנייה</h2>
      <form class="form" id="lf"><div class="two-col"><label>שם<input name="name" required></label><label>טלפון<input name="phone" type="tel" required></label></div><label>מייל<input name="email" type="email"></label><div class="two-col"><label>תאריך האירוע<input name="date" type="date"></label><label>מספר משתתפים<input name="count" type="number" min="1"></label></div><label>פרטים<textarea name="msg"></textarea></label><button class="btn btn-gold">שליחה</button></form>
    </div>
    <aside class="box">${supPic(s) ? `<div class="biz-pic">${supPic(s)}</div>` : ''}<ul class="meta-list"><li><span>תחום</span><b>${esc(s.cat)}</b></li><li><span>אזור</span><b>${esc(s.region)}</b></li><li><span>מחיר</span><b>${esc(s.price)}</b></li><li><span>טלפון</span><b><button type="button" class="tel-btn" id="telBtn">הטלפון שלנו</button></b></li></ul><div class="btn-row">${safeUrl(s.site) ? `<a class="btn btn-gold" href="${esc(safeUrl(s.site))}" target="_blank" rel="noopener noreferrer sponsored" data-web="${esc(s.id)}">לאתר שלנו ←</a>` : ''}<button class="btn btn-light" data-fav="suppliers|${esc(s.id)}">${isFav('suppliers',s.id)?'♥':'♡'} שמירה</button></div></aside>
  </div>`;
};
pages.supplier.after = ([id]) => {
  const tb = document.getElementById('telBtn');
  if(tb) tb.onclick = () => { const s = findIn('suppliers', id); if(!s) return; countClick('tel', id); tb.outerHTML = '<span class="tel-btn open" dir="ltr">' + esc(s.phone) + '</span>'; };
  const f = document.getElementById('lf'); if(!f) return; f.onsubmit = e => { e.preventDefault(); record('leads', Object.assign({supplier:findIn('suppliers',id).name, sid:id}, Object.fromEntries(new FormData(f)))); f.reset(); toast('הפנייה נשלחה! בעל העסק יחזור אלייך בהקדם'); }; };

/* קישור ייעודי לסמינר מעלות: כניסה עם מייל ואישור דיוור (פעם אחת). רק בקישור הזה */
pages.maalot = () => {
  if(store.get('maalot_ok', false)){ setTimeout(() => { location.replace('#/'); }, 0); return ''; }
  return `<div class="maalot-gate" role="dialog" aria-modal="true" aria-labelledby="mgT"><form class="mg-card" id="mgForm">
    <img class="mg-logo" src="img/logo-mark.png" alt="מדליק">
    <h1 id="mgT">ברוכות הבאות למדליק</h1>
    <p class="mg-remove"><b>תוכלו להסיר את עצמכם בכל עת, בקלות.</b> קישור הסרה בלחיצה אחת בכל מייל שנשלח.</p><p class="mg-sub">כל מה שצריך לערב לביבות. כדי להיכנס, כתבו מייל ואשרו קבלת דיוור.</p>
    <label>מייל<input type="email" name="email" required autocomplete="email" placeholder="name@example.com" dir="ltr"></label>
    <label class="mg-ok"><input type="checkbox" name="ok" required><span>אני מאשרת קבלת דיוור (מיילים עם עדכונים, חדשות והצעות) ממרכז הכשרה מעלות ומאתר מדליק, בהתאם לחוק התקשורת (בזק ושידורים). </span></label>
    <button class="btn btn-gold" type="submit">כניסה לאתר ←</button>
    <small class="mg-note">האישור נדרש פעם אחת בלבד.</small>
  </form></div>`;
};
pages.maalot.after = () => {
  const f = document.getElementById('mgForm'); if(!f) return;
  f.onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f)), email = String(v.email || '').trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('כתבו כתובת מייל תקינה');
    if(!v.ok) return toast('צריך לאשר קבלת דיוור כדי להיכנס');
    subscribe(email, 'סמינר מעלות - אישר דיוור מעלות', '');
    store.set('maalot_ok', true); store.set('subscribedEmail', email);
    const nb = document.getElementById('newsBar'); if(nb) nb.classList.add('hidden');
    location.hash = '#/';
  };
};

const miniPdf = async btn => {
  const load = (src, test) => new Promise((ok, no) => { if(test()) return ok(); const sc = document.createElement('script'); sc.src = src; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
  btn.disabled = true; toast('מכינה את קובץ ה־PDF...');
  try{
    await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => window.jspdf);
    const pdf = new window.jspdf.jsPDF({orientation:'p', unit:'mm', format:'a4'}), W = 92, H = 62.6, gx = 4, gy = 4, x0 = (210 - 2 * W - gx) / 2, y0 = (297 - 4 * H - 3 * gy) / 2;
    for(let i = 0; i < MINI.length; i++){
      if(i && i % 8 === 0) pdf.addPage();
      const im = await new Promise((ok, no) => { const m = new Image(); m.onload = () => ok(m); m.onerror = no; m.src = MINI[i].full; });
      const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0);
      const k = i % 8; pdf.addImage(cv.toDataURL('image/jpeg', .9), 'JPEG', x0 + (k % 2) * (W + gx), y0 + Math.floor(k / 2) * (H + gy), W, H);
    }
    pdf.save('miniatura-cards.pdf'); toast('הקובץ ירד למחשב');
  }catch(e){ toast('לא הצלחתי ליצור PDF. אפשר ללחוץ על "הדפסת כל הקלפים" ולבחור "שמירה כ־PDF"'); }
  btn.disabled = false;
};
pages.cards = () => `<div class="mn-page"><div class="wrap mn-wrap">
  <div class="breadcrumb"><a href="#/">ראשי</a> › <a href="#/create">פעילויות להדפסה</a> › קלפים טיפוליים</div>
  <section class="mn-gd" aria-label="דף הסבר לערכה"><button type="button" class="mn-gd-thumb" id="mnGuideOpen" aria-label="לצפייה בדף ההסבר בגדול"><img src="img/miniatura/guide-t.webp" alt="דף הסבר לערכת הקלפים: החושך המתוק הזה" width="520" height="736"><span>לצפייה בגדול</span></button>
    <div class="mn-gd-t"><span class="mn-k">דף הסבר לערכה · להדפסה</span><h2>החושך המתוק הזה</h2><p>דף ההסבר המלא של הערכה, בעיצוב המקורי: הוראות הדפסה והכנה לכבוד חנוכה, ואפשרויות למשחק ולשיח קבוצתי או משפחתי.</p>
      <div class="mn-acts"><button type="button" class="mn-btn gold" id="mnGuidePrint"><b>הדפסת דף ההסבר</b><small>דף A4 מלא</small></button><button type="button" class="mn-btn" id="mnGuidePdf"><b>הורדה</b><small>קובץ PDF</small></button></div></div></section>
  <header class="mn-head"><div><span class="mn-k">מבית מיניאטורה · יהודית לרנר</span><h1>קלפים טיפוליים</h1><p>${MINI.length} קלפים להורדה ולהדפסה. לוחצים על קלף כדי להגדיל אותו.</p></div>
    <div class="mn-acts"><button type="button" class="mn-btn gold" id="mnPdf"><b>הורדת כל הקלפים</b><small>קובץ PDF להדפסה</small></button><button type="button" class="mn-btn" id="mnPrintAll"><b>הדפסת כל הקלפים</b><small>8 קלפים בדף</small></button></div></header>
  <div class="mn-grid" id="mnGrid">${MINI.map((c, i) => `<button type="button" class="mn-card" data-i="${i}" style="--i:${i}" aria-label="קלף ${i + 1} מתוך ${MINI.length}"><img src="${c.thumb}" alt="קלף טיפולי ${i + 1}" loading="lazy"><span class="mn-num">${i + 1}</span></button>`).join('')}</div>
  <p class="mn-credit">קלפים טיפוליים מבית מיניאטורה · יהודית לרנר · כל הזכויות שמורות</p>
</div></div>`;
pages.cards.after = () => {
  let cur = 0, lb = null;
  const close = () => { if(!lb) return; lb.classList.add('out'); const x = lb; lb = null; document.removeEventListener('keydown', key); document.body.classList.remove('bn-lock'); setTimeout(() => x.remove(), 250); };
  const show = i => { cur = (i + MINI.length) % MINI.length; const c = MINI[cur]; lb.querySelector('img').src = c.full; lb.querySelector('.mn-lb-n').textContent = (cur + 1) + ' / ' + MINI.length; const d = lb.querySelector('.mn-dl'); d.href = c.full; d.dataset.n = c.n; };
  const key = e => { if(e.key === 'Escape') close(); if(e.key === 'ArrowLeft') show(cur + 1); if(e.key === 'ArrowRight') show(cur - 1); };
  const open = i => {
    lb = document.createElement('div'); lb.className = 'mn-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'צפייה בקלף');
    lb.innerHTML = '<button type="button" class="mn-x" aria-label="סגירה">×</button><button type="button" class="mn-nav prev" aria-label="הקודם">›</button><button type="button" class="mn-nav next" aria-label="הבא">‹</button><figure><img alt="קלף טיפולי"><figcaption><span class="mn-lb-n"></span><a class="mn-btn gold mn-dl" href="#"><b>הורדה</b><small>קובץ תמונה</small></a><button type="button" class="mn-btn mn-pr"><b>הדפסה</b><small>דף מלא</small></button></figcaption></figure>';
    document.body.appendChild(lb); document.body.classList.add('bn-lock'); document.addEventListener('keydown', key); show(i);
    lb.onclick = e => { if(e.target === lb || e.target.closest('.mn-x')) close(); else if(e.target.closest('.next')) show(cur + 1); else if(e.target.closest('.prev')) show(cur - 1); else if(e.target.closest('.mn-pr')) miniPrint([MINI[cur]], false); else if(e.target.closest('.mn-dl')){ e.preventDefault(); miniDownload(MINI[cur]); } };
    lb.querySelector('.mn-x').focus({preventScroll:true});
  };
  document.getElementById('mnGrid').onclick = e => { const b = e.target.closest('.mn-card'); if(b) open(+b.dataset.i); };
  document.getElementById('mnPrintAll').onclick = () => miniPrint(MINI, true);
  const GUIDE = 'img/miniatura/guide.webp';
  const guideImg = () => new Promise((ok, no) => { const m = new Image(); m.onload = () => ok(m); m.onerror = no; m.src = GUIDE; });
  document.getElementById('mnGuideOpen').onclick = () => {
    const v = document.createElement('div'); v.className = 'mn-lb mn-lb-g'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'דף ההסבר');
    v.innerHTML = '<button type="button" class="mn-x" aria-label="סגירה">×</button><figure><img src="' + GUIDE + '" alt="דף הסבר לערכת הקלפים"></figure>';
    document.body.appendChild(v); document.body.classList.add('bn-lock');
    const end = () => { document.removeEventListener('keydown', k); document.body.classList.remove('bn-lock'); v.classList.add('out'); setTimeout(() => v.remove(), 250); };
    const k = e => { if(e.key === 'Escape') end(); }; document.addEventListener('keydown', k);
    v.onclick = e => { if(e.target === v || e.target.closest('.mn-x')) end(); }; v.querySelector('.mn-x').focus({preventScroll:true});
  };
  document.getElementById('mnGuidePrint').onclick = async () => { toast('מכינה להדפסה...'); try{ await guideImg(); }catch(e){} printHTML('<div style="width:210mm;height:296mm;background:#fff;display:grid;place-items:center"><img src="' + GUIDE + '" style="width:210mm;height:296mm;object-fit:contain" alt=""></div>', {credit:false, page:'A4', margin:0}); };
  document.getElementById('mnGuidePdf').onclick = async e => {
    const btn = e.currentTarget; btn.disabled = true; toast('מכינה את קובץ ה־PDF...');
    try{
      await new Promise((ok, no) => { if(window.jspdf) return ok(); const sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; sc.onload = ok; sc.onerror = no; document.head.appendChild(sc); });
      const im = await guideImg(), cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext('2d').drawImage(im, 0, 0);
      const pdf = new window.jspdf.jsPDF({orientation:'p', unit:'mm', format:'a4'}); pdf.addImage(cv.toDataURL('image/jpeg', .92), 'JPEG', 0, 0, 210, 297); pdf.save('miniatura-guide.pdf'); toast('הקובץ ירד למחשב');
    }catch(err){ toast('לא הצלחתי ליצור PDF. אפשר ללחוץ על "הדפסת דף ההסבר" ולבחור "שמירה כ־PDF"'); }
    btn.disabled = false;
  };
  document.getElementById('mnPdf').onclick = e => miniPdf(e.currentTarget);
};

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
  const tabs = {stats:'כניסות', biz:'עסקים מפרסמים', subs:'רעיונות שנשלחו', leads:'פניות לנותני שירות', ads:'בקשות פרסום', contact:'יצירת קשר', news:'רשימת תפוצה', users:'משתמשים', add:'הוספת תוכן'};
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
// לשונית הכניסות: טבלת מדורים וטבלת נותני שירות
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
const BIZ_REGIONS = ['כל הארץ', 'צפון', 'חיפה', 'שרון', 'מרכז', 'ירושלים', 'שפלה', 'דרום'];
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
  let imgData = '', S = {sup:{}, tel:{}, web:{}}, L = [], cur = null;
  const uploadImg = async data => { const id = 'i' + Date.now().toString(36), parts = data.match(/[\s\S]{1,40000}/g) || []; for(let i = 0; i < parts.length; i++) await call({action:'addContent', kind:'suppliers', item:{id:id + '-' + i, _chunk:id, i, d:parts[i], name:''}}); return {id, n:parts.length}; };
  const dropImg = (id, n) => Promise.all(Array.from({length:n || 0}, (_, i) => call({action:'removeContent', id:id + '-' + i}).catch(() => {})));
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
      const W = 1000, H = 625, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
      const k = Math.max(W / im.width, H / im.height), w = im.width * k, h = im.height * k; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
      let q = .82; imgData = c.toDataURL('image/jpeg', q); while(imgData.length > 150000 && q > .4){ q -= .06; imgData = c.toDataURL('image/jpeg', q); } $('bzFileInfo').textContent = file.name + ' (' + Math.round(imgData.length * .75 / 1024) + 'KB)'; prev();
    }; im.onerror = () => toast('לא הצלחתי לקרוא את התמונה'); im.src = rd.result; };
    rd.readAsDataURL(file);
  };
  const reset = () => { f.reset(); f.elements.id.value = ''; imgData = ''; cur = null; $('bzFile').value = ''; $('bzFileInfo').textContent = 'לא נבחרה תמונה'; $('bzHead').textContent = 'הוספת עסק מפרסם'; $('bzSave').textContent = 'שמירה ופרסום'; prev(); };
  $('bzReset').onclick = reset;
  const fill = it => {
    f.elements.id.value = it.id;
    cur = it._imgId ? {id:it._imgId, n:it._imgN} : null;
    ['name', 'cat', 'region', 'price', 'plan', 'text', 'phone', 'email', 'site', 'img'].forEach(k => { if(f.elements[k]) f.elements[k].value = (k === 'img' && cur) ? '' : (it[k] || (k === 'plan' ? 'Premium' : '')); });
    f.elements.featured.checked = !!it.featured; f.elements.active.checked = it.active !== false; imgData = ''; $('bzFile').value = '';
    $('bzFileInfo').textContent = (it.img || cur) ? 'יש תמונה (אפשר להחליף)' : 'לא נבחרה תמונה'; $('bzHead').textContent = 'עריכת עסק: ' + it.name; $('bzSave').textContent = 'שמירת השינויים'; prev(); f.scrollIntoView({behavior:'smooth', block:'start'});
  };
  const persist = (item, isNew) => {
    if(item._imgId && String(item.img || '').indexOf('data:') === 0) item.img = 'chunk:' + item._imgId;
    if(live){
      if(isNew) return call({action:'addContent', kind:'suppliers', item}).then(refreshRemote);
      const old = () => call({action:'removeContent', id:item.id}).then(() => call({action:'addContent', kind:'suppliers', item})).then(refreshRemote); // בלי הקוד הנוסף: עריכה = מחיקה והוספה מחדש עם אותו מזהה
      return API2() ? call2({action:'updateContent', id:item.id, item}).then(refreshRemote).catch(old) : old();
    }
    const ex = store.get('extra_suppliers', []), i = ex.findIndex(x => x.id === item.id); if(i >= 0) ex[i] = item; else ex.push(item); store.set('extra_suppliers', ex); return Promise.resolve();
  };
  const num = o => o ? o.total : 0;
  const day = (o, k) => o ? (o[k] || 0) : 0;
  const bizData = s => { const lds = L.filter(l => l.sid === s.id || l.supplier === s.name);
    return {s, lds, rows:[['צפיות במודעה', num(S.sup[s.id]), day(S.sup[s.id], 'today'), day(S.sup[s.id], 'week')], ['מבקרות שונות', day(S.sup[s.id], 'uniq'), '', ''], ['לחיצות על הטלפון', num(S.tel[s.id]), day(S.tel[s.id], 'today'), day(S.tel[s.id], 'week')], ['לחיצות על האתר', num(S.web[s.id]), day(S.web[s.id], 'today'), day(S.web[s.id], 'week')], ['פניות שנשלחו בטופס', lds.length, '', '']]}; };
  const csvCell = x => '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"';
  const download = (name, txt) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + txt], {type:'text/csv;charset=utf-8'})); a.download = name; a.click(); };
  const bizCsv = items => {
    const head = ['שם העסק', 'תחום', 'אזור', 'צפיות במודעה', 'מבקרות שונות', 'לחיצות על הטלפון', 'לחיצות על האתר', 'פניות בטופס'];
    const lines = [head.map(csvCell).join(',')];
    items.forEach(s => { const d = bizData(s); lines.push([s.name, s.cat, s.region, d.rows[0][1], d.rows[1][1], d.rows[2][1], d.rows[3][1], d.rows[4][1]].map(csvCell).join(',')); });
    if(items.length === 1){
      const d = bizData(items[0]);
      lines.push('', ['פירוט', 'סה״כ', 'היום', '7 ימים אחרונים'].map(csvCell).join(','));
      d.rows.forEach(r => lines.push(r.map(csvCell).join(',')));
      lines.push('', ['פניות: תאריך', 'שם', 'טלפון', 'מייל', 'תאריך האירוע', 'משתתפים', 'פרטים'].map(csvCell).join(','));
      d.lds.forEach(l => lines.push([l.date, l.name, l.phone, l.email, '', l.count, l.msg].map(csvCell).join(',')));
    }
    download(items.length === 1 ? 'madlik-' + (items[0].name || 'business') + '.csv' : 'madlik-businesses.csv', lines.join('\n'));
  };
  const bizPdf = s => {
    const d = bizData(s), today = new Date().toLocaleDateString('he-IL');
    const w = window.open('', '_blank'); if(!w) return toast('הדפדפן חסם את החלון. אפשרי חלונות קופצים ונסי שוב');
    const box = r => '<div class="n"><b>' + r[1] + '</b><span>' + r[0] + '</span>' + (r[2] !== '' ? '<small>היום ' + r[2] + ' · 7 ימים ' + r[3] + '</small>' : '') + '</div>';
    w.document.write('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>דוח פרסום – ' + esc(s.name) + '</title><style>' +
      "body{font-family:'Heebo','Segoe UI',Arial,sans-serif;color:#0a2244;margin:0;padding:36px 44px;max-width:820px;margin-inline:auto}.top{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0a2244;padding-bottom:16px}.top img{height:56px}h1{font-size:26px;margin:26px 0 4px}p.s{margin:0 0 26px;color:#6c7893}.g{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.n{border:1px solid #d9dfeb;border-radius:16px;padding:18px 20px;break-inside:avoid}.n b{display:block;font-size:42px;line-height:1.1;color:#ff6a00}.n span{font-weight:600}.n small{display:block;color:#6c7893;margin-top:4px}table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}th,td{text-align:right;border-bottom:1px solid #e3e7ef;padding:8px 6px}h2{font-size:18px;margin:30px 0 0}.f{margin-top:36px;color:#6c7893;font-size:12px;border-top:1px solid #e3e7ef;padding-top:12px}@media print{body{padding:0}}" +
      '</style></head><body><div class="top"><img src="' + location.origin + location.pathname.replace(/[^/]*$/, '') + 'img/logo-mark.png" alt="מדליק"><div>דוח פרסום · ' + today + '</div></div>' +
      '<h1>' + esc(s.name) + '</h1><p class="s">' + esc(s.cat) + ' · ' + esc(s.region) + ' · סיכום הפרסום באתר מדליק</p>' +
      '<div class="g">' + d.rows.map(box).join('') + '</div>' +
      (d.lds.length ? '<h2>הפניות האחרונות</h2><table><tr><th>תאריך</th><th>שם</th><th>טלפון</th><th>פרטים</th></tr>' + d.lds.slice(0, 15).map(l => '<tr><td>' + esc(l.date) + '</td><td>' + esc(l.name) + '</td><td>' + esc(l.phone) + '</td><td>' + esc(String(l.msg || '').slice(0, 90)) + '</td></tr>').join('') + '</table>' : '') +
      '<div class="f">הנתונים נספרים מאז תחילת הפרסום באתר מדליק · madlik.autoclick.co.il</div><script>setTimeout(function(){window.print()},500)<\/script></body></html>');
    w.document.close();
  };
  const draw = () => {
    const items = list(), box = $('bzList');
    if(!items.length){ box.innerHTML = '<div class="empty">עוד אין עסקים מפרסמים. כל עוד אין, באתר מוצגים כרטיסי דוגמה. הוסיפי את הראשון בטופס שלמעלה.</div>'; return; }
    box.innerHTML = '<div class="bz-tools"><button class="btn btn-sm" data-bz="csvall|">ייצוא כל העסקים לאקסל</button></div><div class="bz-rows">' + items.map(s => {
      const leads = L.filter(l => l.sid === s.id || l.supplier === s.name).length, pic = safeImg(s.img) ? '<img src="' + esc(safeImg(s.img)) + '" alt="">' : '<span>' + esc((s.name || '?')[0]) + '</span>';
      return '<div class="bz-row' + (s.active === false ? ' off' : '') + '"><div class="bz-thumb">' + pic + '</div><div class="bz-info"><b>' + esc(s.name) + '</b> <em class="bz-plan">' + esc(s.plan || 'Basic') + '</em>' + (s.active === false ? ' <em class="bz-off">מוסתר</em>' : '') +
        '<small>' + esc(s.cat) + ' · ' + esc(s.region) + ' · ' + esc(s.price) + '</small><small class="bz-nums">כניסות ' + num(S.sup[s.id]) + ' · לחיצות על הטלפון ' + num(S.tel[s.id]) + ' · לחיצות על האתר ' + num(S.web[s.id]) + ' · פניות ' + leads + '</small></div>' +
        '<div class="bz-btns"><button class="btn btn-sm" data-bz="edit|' + esc(s.id) + '">עריכה</button><button class="btn btn-sm btn-light" data-bz="csv|' + esc(s.id) + '">אקסל</button><button class="btn btn-sm btn-light" data-bz="pdf|' + esc(s.id) + '">דוח PDF</button><button class="btn btn-sm btn-light" data-bz="toggle|' + esc(s.id) + '">' + (s.active === false ? 'הצגה' : 'הסתרה') + '</button><button class="btn btn-sm btn-light" data-bz="del|' + esc(s.id) + '">מחיקה</button></div></div>';
    }).join('') + '</div>';
  };
  draw();
  f.onsubmit = async e => {
    e.preventDefault(); const it = readItem(), btn = $('bzSave');
    if(!it.name || !it.cat) return toast('חסר שם עסק או תחום');
    if(f.elements.site.value.trim() && !it.site) return toast('הקישור לאתר לא תקין');
    btn.disabled = true;
    try{
      if(imgData){ if(!live) throw new Error('העלאת תמונה דורשת חיבור לשרת של גוגל. אפשר להדביק קישור לתמונה'); const u = await uploadImg(imgData); if(cur) await dropImg(cur.id, cur.n); it.img = 'chunk:' + u.id; it._imgId = u.id; it._imgN = u.n; }
      else if(cur && !it.img){ it.img = 'chunk:' + cur.id; it._imgId = cur.id; it._imgN = cur.n; }
      else if(it.img && !safeImg(it.img)) throw new Error('קישור התמונה לא תקין. נתיב כמו img/ads/שם.jpg או כתובת שמתחילה ב־https');
      const isNew = !it.id; it.id = it.id || 'b' + Date.now().toString(36); it.homeAd = it.plan !== 'Basic'; it.ico = '';
      if(!it.img) delete it.img; if(!it.site) delete it.site;
      await persist(it, isNew); toast(isNew ? 'העסק נוסף ופורסם ✔' : 'השינויים נשמרו ✔'); reset(); draw();
    }catch(err){ toast('שגיאה: ' + (err.message || err)); }
    btn.disabled = false;
  };
  $('bzList').onclick = e => {
    const b = e.target.closest('[data-bz]'); if(!b) return;
    const [act, id] = b.dataset.bz.split('|'), s = list().find(x => x.id === id);
    if(act === 'csvall') return bizCsv(list());
    if(!s) return;
    if(act === 'csv') return bizCsv([s]);
    if(act === 'pdf') return bizPdf(s);
    if(act === 'edit') return fill(s);
    if(act === 'toggle'){ const it = Object.assign({}, s, {active:s.active === false}); return persist(it, false).then(() => { toast(it.active ? 'העסק מוצג שוב' : 'העסק הוסתר'); draw(); }).catch(fail); }
    if(act === 'del' && confirm('למחוק את "' + s.name + '" מהאתר?')){
      const done = live ? call({action:'removeContent', id}).then(() => s._imgId ? dropImg(s._imgId, s._imgN) : 0).then(refreshRemote) : (store.set('extra_suppliers', store.get('extra_suppliers', []).filter(x => x.id !== id)), Promise.resolve());
      done.then(() => { toast('נמחק'); draw(); }).catch(fail);
    }
  };
  if(live){ Promise.all([call({action:'stats'}), call({action:'records', kind:'leads'}).catch(() => ({records:[]})), API2() ? call2({action:'webstats'}).catch(() => null) : Promise.resolve(null)]).then(([s, l, w]) => { S = Object.assign(S, s.stats); if(w && w.stats){ S.tel = Object.assign({}, S.tel, w.stats.tel); S.web = w.stats.web; } L = l.records; draw(); }).catch(() => {}); }
  else { S = localStats(); L = store.get('leads', []); draw(); }
}

function newsTabHTML(){
  const setup = API() ? '' : `<div class="box" id="nSetup"><h2>חיבור חד־פעמי של רשימת התפוצה</h2>
    <p>כדי שכל מה שנשלח באתר יגיע אלייך (נרשמים, פניות לנותני שירות, בקשות פרסום, רעיונות ומשתמשים), שהתוכן שתוסיפי יופיע לכל הגולשים, ושההודעות ייצאו מהג׳ימייל שלך, צריך שרת קטן וחינמי של גוגל. 5 דקות, פעם אחת:</p>
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
      <div class="btn-row"><button class="btn btn-sm" id="nReload">רענון</button><button class="btn btn-sm" id="nCopy">העתקת כתובות</button><button class="btn btn-sm" id="nCsv">הורדה ל־CSV</button><button class="btn btn-sm btn-light" id="nMaalot">מעלות בלבד</button></div>
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
  let subs = [], onlyM = false;
  const view = () => onlyM ? subs.filter(s => /מעלות/.test(s.source || '')) : subs;
  const draw = () => {
    const sv = view(); $('nMaalot').textContent = onlyM ? 'כל הנרשמים' : 'מעלות בלבד';
    cnt.textContent = (onlyM ? 'מאשרי דיוור מעלות: ' : '') + sv.length + ' נרשמים' + (API() ? '' : ' (רק מהדפדפן הזה, עד שתחברי את השרת)');
    list.innerHTML = sv.length ? `<table class="table"><tr><th>תאריך ושעת אישור</th><th>מייל</th><th>מקור</th></tr>${sv.slice(0,300).map(s=>`<tr><td><b>${esc(s.date)}</b></td><td>${esc(s.email)}</td><td>${esc(s.source)}</td></tr>`).join('')}</table>` : '<p class="muted">עוד אין נרשמים.</p>';
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
  $('nMaalot').onclick = () => { onlyM = !onlyM; draw(); };
  $('nCopy').onclick = () => { if(!subs.length) return toast('אין כתובות'); (navigator.clipboard ? navigator.clipboard.writeText(subs.map(s=>s.email).join(', ')) : Promise.reject()).then(()=>toast('הכתובות הועתקו'), ()=>toast('לא הצלחתי להעתיק')); };
  $('nCsv').onclick = () => { const txt = '﻿תאריך ושעת אישור,מייל,מקור\n' + view().map(r=>[r.date,r.email,r.source].map(x=>`"${String(x||'').replace(/"/g,'""')}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt],{type:'text/csv'})); a.download = 'madlik-subscribers.csv'; a.click(); };
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
  [/^\/supplier\/(.+)$/, 'supplier'], [/^\/advertise$/, 'advertise'], [/^\/submit$/, 'submit'], [/^\/me$/, 'me'], [/^\/admin$/, 'admin'], [/^\/maalot$/, 'maalot'], [/^\/cards$/, 'cards']
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
  if(!ADMIN_PAGE){ const T = {games:'משחקים על המסך שניתנים גם להדפסה', game:'משחק לערב לביבות', create:'פעילויות להדפסה בהתאמה אישית', creator:'יצירת משחק אישי', recipes:'מתכונים לערב לביבות', recipe:'מתכון לביבות', suppliers:'נותני שירות לערב לביבות', supplier:'בעל עסק לערב לביבות', studio:'סטודיו מיתוג', design:'סטודיו מיתוג', edit:'סטודיו מיתוג', advertise:'רוצים לפרסם?', submit:'שליחת רעיון', me:'האזור שלי'}; document.title = T[name] ? T[name] + ' | מדליק' : 'מדליק – כל מה שצריך לערב לביבות | משחקים, מתכונים ומיתוג'; }
  if(window.MadlikFX) window.MadlikFX.onRender(app);
  if(window.MadlikWorlds) window.MadlikWorlds.apply(name, app);
  document.querySelectorAll('.main-nav a').forEach(a=>a.classList.toggle('active', path!=='/' && ('#'+path).startsWith(a.getAttribute('href'))));
  document.getElementById('mainNav').classList.remove('open');
}
let lastPath = location.hash.split('?')[0], navTok = 0;
window.addEventListener('hashchange', () => {
  const p = location.hash.split('?')[0], same = p === lastPath; lastPath = p;
  render(); if(!same) window.scrollTo({top:0, left:0, behavior:'instant'});
});

/* ---------- הודעה בולטת בכניסה למדור נותני שירות ---------- */
const BIZ_NOTICE_UNTIL = new Date('2026-11-10T00:00:00+02:00').getTime(); // מיום שלישי 10.11.26 ההודעה כבר לא רלוונטית
let bizClosedAt = 0;
function showBizNotice(){
  if(Date.now() >= BIZ_NOTICE_UNTIL || document.querySelector('.biz-notice') || Date.now() - bizClosedAt < 4000) return;
  const SECS = 8, el = document.createElement('div');
  el.className = 'biz-notice'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'bnT');
  el.innerHTML = '<div class="bn-card"><div class="bn-ico" aria-hidden="true">🤝</div>' +
    '<p class="bn-kick">נותני שירות</p><h2 id="bnT">שימו לב, זה מתחיל ביום שלישי</h2>' +
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

/* ---------- עיגול בצד בכל עמוד: "נהניתם? הכנסו ושתפו אותנו!" ---------- */
(function feedbackBubble(){
  if(ADMIN_PAGE) return;
  const FB_AREAS = ['משחקים', 'מתכונים', 'סטודיו מיתוג', 'פעילויות להדפסה', 'קלפים טיפוליים', 'נותני שירות'];
  let hideUntil = 0; try{ hideUntil = +sessionStorage.getItem('madlik_fb_hide') || 0; }catch(e){}
  const doneAt = store.get('fb_done', 0); if(doneAt && Date.now() - doneAt < 7 * 864e5) return;
  if(hideUntil) return;
  const b = document.createElement('div'); b.className = 'fb-wrap';
  b.innerHTML = '<button type="button" class="fb-bubble" aria-label="נהניתם? הכנסו ושתפו אותנו!"><span class="fb-ring" aria-hidden="true"></span><span class="fb-ring r2" aria-hidden="true"></span><span class="fb-txt"><b>נהניתם?</b><span>הכנסו ושתפו אותנו!</span></span><i class="fb-h h1" aria-hidden="true">♥</i><i class="fb-h h2" aria-hidden="true">♥</i><i class="fb-h h3" aria-hidden="true">♥</i></button><button type="button" class="fb-hide" aria-label="הסתרת העיגול">×</button>';
  document.body.appendChild(b);
  b.querySelector('.fb-hide').onclick = () => { b.remove(); try{ sessionStorage.setItem('madlik_fb_hide', '1'); }catch(e){} };
  b.querySelector('.fb-bubble').onclick = () => {
    if(document.querySelector('.fb-ov')) return;
    const ov = document.createElement('div'); ov.className = 'fb-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-labelledby', 'fbT');
    ov.innerHTML = '<form class="fb-card" novalidate><button type="button" class="fb-x" aria-label="סגירה">×</button><div class="fb-ico" aria-hidden="true">😊</div><h2 id="fbT">נהניתי – תודה!</h2><p class="fb-sub">ממה נהניתם? אפשר לסמן, ולהוסיף במילים שלכם.</p>' +
      '<div class="fb-chips" role="group" aria-label="ממה נהניתם">' + FB_AREAS.map(x => '<button type="button" aria-pressed="false">' + x + '</button>').join('') + '</div>' +
      '<label class="fb-f"><span>ספרו לנו בכמה מילים (לא חובה)</span><textarea name="msg" rows="3" placeholder="ממה נהניתם?"></textarea></label>' +
      '<label class="fb-f fb-name"><span>לא חייבים – רק אם רוצים לגלות לנו, מה השם שלך?</span><input name="name" autocomplete="name" placeholder="השם שלך"></label>' +
      '<button type="submit" class="fb-send"><span>שליחה</span><i aria-hidden="true">←</i></button></form>';
    document.body.appendChild(ov); document.body.classList.add('bn-lock');
    const f = ov.querySelector('form'), close = () => { document.removeEventListener('keydown', key); document.body.classList.remove('bn-lock'); ov.classList.add('out'); setTimeout(() => ov.remove(), 250); };
    const key = e => { if(e.key === 'Escape') close(); }; document.addEventListener('keydown', key);
    ov.onclick = e => { if(e.target === ov || e.target.closest('.fb-x')) close(); const c = e.target.closest('.fb-chips button'); if(c) c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'); };
    f.querySelector('textarea').focus({preventScroll:true});
    f.onsubmit = e => {
      e.preventDefault();
      const chips = [...f.querySelectorAll('.fb-chips [aria-pressed=true]')].map(x => x.textContent), msg = f.elements.msg.value.trim(), name = f.elements.name.value.trim();
      record('contact', {name, msg:'משוב: נהניתי' + (chips.length ? ' מ' + chips.join(', ') : '') + (msg ? ' · ' + msg : ''), page:location.hash || '#/'});
      store.set('fb_done', Date.now());
      f.innerHTML = '<div class="fb-thanks"><div class="fb-ico big" aria-hidden="true">💛</div><h2>תודה רבה' + (name ? ', ' + esc(name) : '') + '!</h2><p>שמחים שנהניתם. נשמח לראות אתכם שוב.</p></div>';
      b.remove(); setTimeout(close, 2600);
    };
  };
})();
})();
