// מדליק – שרת קטן וחינמי בגוגל.
// שומר בגיליון: נרשמות לרשימת התפוצה, כל הטפסים מהאתר, ותוכן שנוסף מהאדמין. ושולח מיילים לנרשמות.
// 1. החליפי את המפתח כאן במפתח סודי משלך (אותיות באנגלית ומספרים).
const SECRET = 'CHANGE-ME-123';

const KINDS = { subs: 'רעיונות שנשלחו', leads: 'פניות לבעלי עסקים', ads: 'בקשות פרסום', users: 'משתמשות', contact: 'פניות יצירת קשר' };
const CONTENT_KINDS = ['games', 'recipes', 'suppliers'];
// עותק של כל פנייה לבעל עסק נשלח גם לכתובת הזו (המיילים יוצאים מהחשבון שבו הסקריפט מותקן)
const NOTIFY_COPY = 'officeautoclick@gmail.com';

function tab_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }
  return sh;
}
const subsSheet_ = () => tab_('נרשמות', ['תאריך', 'מייל', 'שם', 'מקור', 'פעילה']);
const recSheet_ = kind => tab_(KINDS[kind], ['מזהה', 'תאריך', 'סטטוס', 'סיכום', 'נתונים']);
const conSheet_ = () => tab_('תוכן באתר', ['מזהה', 'תאריך', 'סוג', 'כותרת', 'נתונים']);
const hitSheet_ = () => tab_('כניסות', ['תאריך', 'סוג', 'מזהה', 'מבקרת', 'שניות']);

// סיכום הכניסות: סה"כ, היום, 7 ימים, ומבקרות שונות – לכל מדור ולכל בעל עסק
function stats_() {
  const rows = hitSheet_().getDataRange().getValues(), now = Date.now(), DAY = 864e5;
  const today = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
  const out = { sec: {}, sup: {}, tel: {}, web: {}, game: {}, doc: {}, rec: {}, all: { total: 0, today: 0, week: 0, uniq: 0 }, days: {} }, seen = {}, seenAll = {};
  for (let i = 1; i < rows.length; i++) {
    const d = rows[i][0] instanceof Date ? rows[i][0] : new Date(rows[i][0]), type = rows[i][1], id = String(rows[i][2]), v = String(rows[i][3]);
    if (type === 'sup' && /^(tel|web):/.test(id)) { // לחיצות על "הטלפון שלנו" ועל האתר של העסק
      const kind = id.slice(0, 3), tid = id.slice(4), grp = out[kind], t = grp[tid] = grp[tid] || { total: 0, today: 0, week: 0 };
      t.total++; if (Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd') === today) t.today++; if (now - d.getTime() < 7 * DAY) t.week++;
      continue;
    }
    if (type === 'doc' || type === 'rec') { // הדפסות והורדות של מסמכים, וכניסות לכל מתכון
      const o = out[type][id] = out[type][id] || { total: 0, today: 0, week: 0, uniq: 0 };
      o.total++; if (Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd') === today) o.today++; if (now - d.getTime() < 7 * DAY) o.week++;
      const dk2 = type + '|' + id + '|' + v; if (v && !seen[dk2]) { seen[dk2] = 1; o.uniq++; }
      continue;
    }
    if (type === 'game' || type === 'gtime') { // כניסות וזמן שהייה לכל משחק
      const o = out.game[id] = out.game[id] || { total: 0, today: 0, week: 0, uniq: 0, secs: 0, timed: 0 };
      if (type === 'gtime') { const sec = Number(rows[i][4]) || 0; if (sec > 0) { o.secs += sec; o.timed++; } continue; }
      o.total++; if (Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd') === today) o.today++; if (now - d.getTime() < 7 * DAY) o.week++;
      const gk = 'game|' + id + '|' + v; if (v && !seen[gk]) { seen[gk] = 1; o.uniq++; }
      continue;
    }
    if (type !== 'sec' && type !== 'sup') continue;
    if (type === 'sec') {
      const A = out.all, dk = Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd');
      A.total++; if (dk === today) A.today++; if (now - d.getTime() < 7 * DAY) A.week++;
      if (v && !seenAll[v]) { seenAll[v] = 1; A.uniq++; }
      out.days[dk] = (out.days[dk] || 0) + 1;
    }
    const o = out[type][id] = out[type][id] || { total: 0, today: 0, week: 0, uniq: 0 };
    o.total++;
    if (Utilities.formatDate(d, 'Asia/Jerusalem', 'yyyy-MM-dd') === today) o.today++;
    if (now - d.getTime() < 7 * DAY) o.week++;
    const k = type + '|' + id + '|' + v; if (v && !seen[k]) { seen[k] = 1; o.uniq++; }
  }
  return out;
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function valid_(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmt_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm') : String(d); }
function newId_() { return Utilities.getUuid().slice(0, 8); }
function folder_() { const it = DriveApp.getFoldersByName('מדליק – מודעות'); return it.hasNext() ? it.next() : DriveApp.createFolder('מדליק – מודעות'); }
function rowOf_(sh, id) { const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues(); for (let i = 1; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 1; return 0; }

// טופס מהאתר: רק טקסט, באורך מוגבל
function clean_(o) {
  const out = {};
  Object.keys(o || {}).slice(0, 30).forEach(k => { out[String(k).slice(0, 40)] = String(o[k] == null ? '' : o[k]).slice(0, 3000); });
  return out;
}

// ---------- תשלום אוטומטי דרך SUMIT (סליקה של Upay) ----------
// את מזהה החברה ומפתח ה-API של סאמיט שומרים בהגדרות הסקריפט (Project Settings > Script properties):
// SUMIT_COMPANY_ID ו-SUMIT_API_KEY. הם לא נכתבים בקוד ולא באתר.
const PLAN_PRICES = { Basic: 300, Premium: 800 }; // כולל מע"מ
const PAID_UNTIL = '2026-12-14'; // הפרסום פעיל עד סוף חנוכה
const SITE_URL = 'https://madlik.autoclick.co.il';
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k) || ''; }
function okStatus_(r) { return !!r && (r.Status === 0 || /^Success/.test(String(r.Status))); }
function sumit_(path, body) {
  const payload = Object.assign({ Credentials: { CompanyID: Number(prop_('SUMIT_COMPANY_ID')), APIKey: prop_('SUMIT_API_KEY') } }, body);
  const res = UrlFetchApp.fetch('https://api.sumit.co.il' + path, { method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true });
  try { return JSON.parse(res.getContentText()); } catch (err) { return null; }
}
// 1. העסק מילא פרטים ולחץ "לתשלום": שומרים בקשה "ממתין לתשלום" ומחזירים כתובת של דף התשלום
function startPay_(d) {
  const plan = String(d.plan || ''), price = PLAN_PRICES[plan];
  if (!price) return json_({ ok: false, error: 'התכנית הזו לא זמינה לתשלום באתר' });
  const data = clean_({ biz: d.biz, name: d.name, phone: d.phone, email: d.email, cat: d.cat, region: d.region, msg: d.msg });
  data.pkg = plan;
  if (!data.biz || !data.name || !data.phone || !valid_(String(data.email || ''))) return json_({ ok: false, error: 'חסרים פרטים' });
  if (!prop_('SUMIT_API_KEY') || !prop_('SUMIT_COMPANY_ID')) return json_({ ok: false, error: 'התשלום עוד לא הוגדר' });
  const cache = CacheService.getScriptCache(), tk = 'pay_' + String(data.email).toLowerCase(), n = Number(cache.get(tk) || 0);
  if (n >= 5) return json_({ ok: false, error: 'נסו שוב בעוד כמה דקות' });
  cache.put(tk, String(n + 1), 600);
  const id = newId_(), summary = [data.biz, data.name, data.phone, data.email].filter(Boolean).join(' · ');
  const sh = recSheet_('ads'); sh.appendRow([id, new Date(), 'ממתין לתשלום', summary, JSON.stringify(data)]);
  const r = sumit_('/billing/payments/beginredirect/', {
    Customer: { Name: data.biz, EmailAddress: data.email, Phone: data.phone, SearchMode: 0 },
    Items: [{ Item: { Name: 'פרסום באתר מדליק – ' + plan, Description: 'פרסום עד סוף חנוכה' }, Quantity: 1, UnitPrice: price, Currency: 0 }],
    VATIncluded: true,
    ExternalIdentifier: id,
    RedirectURL: SITE_URL + '/paid/?ad=' + id,
    CancelRedirectURL: SITE_URL + '/advertise/',
    SendUpdateByEmailAddress: data.email,
    UpdateOrganizationOnSuccess: true,
    UpdateCustomerOnSuccess: true,
    DocumentDescription: 'פרסום באתר מדליק – ' + plan,
    ExpirationHours: 72
  });
  if (!okStatus_(r) || !r.Data || !r.Data.RedirectURL) {
    const row = rowOf_(sh, id); if (row) sh.getRange(row, 3).setValue('שגיאה בפתיחת תשלום');
    return json_({ ok: false, error: 'לא הצלחנו לפתוח את דף התשלום. אפשר לפנות אלינו ישירות' });
  }
  return json_({ ok: true, url: r.Data.RedirectURL });
}
// 2. הלקוח חזר מדף התשלום: מאמתים מול סאמיט, ורק אז מפרסמים את העסק
function confirmPay_(d) {
  const id = String(d.ad || ''), pid = Number(d.paymentId);
  if (!id || !pid) return json_({ ok: false, error: 'חסרים פרטים' });
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json_({ ok: false, error: 'נסו שוב בעוד רגע' });
  try {
    const sh = recSheet_('ads'), r = rowOf_(sh, id);
    if (!r) return json_({ ok: false, error: 'הבקשה לא נמצאה' });
    const row = sh.getRange(r, 1, 1, 5).getValues()[0]; let data = {}; try { data = JSON.parse(row[4]); } catch (err) {}
    if (row[2] === 'שולם') return json_({ ok: true, already: true, biz: data.biz, pkg: data.pkg });
    const rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) { try { if (String(JSON.parse(rows[i][4]).payId) === String(pid) && String(rows[i][0]) !== id) return json_({ ok: false, error: 'התשלום כבר שויך לבקשה אחרת' }); } catch (err) {} }
    const g = sumit_('/billing/payments/get/', { PaymentID: pid }), p = g && g.Data && g.Data.Payment;
    if (!okStatus_(g) || !p || !p.ValidPayment) return json_({ ok: false, error: 'התשלום לא אושר' });
    if (Number(p.Amount) !== PLAN_PRICES[data.pkg]) return json_({ ok: false, error: 'סכום התשלום לא תואם לתכנית' });
    if (p.ExternalIdentifier && String(p.ExternalIdentifier) !== id) return json_({ ok: false, error: 'התשלום לא שייך לבקשה הזו' });
    data.payId = pid; data.paidAt = fmt_(new Date());
    sh.getRange(r, 3).setValue('שולם'); sh.getRange(r, 5).setValue(JSON.stringify(data));
    // מפרסמים: כרטיס עסק פעיל עד סוף חנוכה (אפשר לערוך, להוסיף תמונה וקישור בניהול)
    const sid = 'p' + newId_(), item = { id: sid, name: data.biz, cat: data.cat || 'אחר', region: data.region || 'כל הארץ', price: '₪₪', plan: data.pkg, homeAd: data.pkg !== 'Basic', active: true, text: data.msg || data.biz, phone: data.phone, email: data.email, until: PAID_UNTIL, paid: true, ico: '' };
    conSheet_().appendRow([sid, new Date(), 'suppliers', item.name, JSON.stringify(item)]);
    try {
      MailApp.sendEmail({ to: NOTIFY_COPY, subject: 'שולם פרסום במדליק: ' + data.biz + ' (' + data.pkg + ')', htmlBody: '<div dir="rtl">התקבל תשלום על ' + PLAN_PRICES[data.pkg] + ' ₪ מ־' + esc_(data.biz) + ' (' + esc_(data.name) + ', ' + esc_(data.phone) + ', ' + esc_(data.email) + ').<br>העסק פורסם עד ' + PAID_UNTIL + '. אפשר להוסיף לו תמונה וקישור בניהול.</div>', name: 'מדליק' });
      MailApp.sendEmail({ to: data.email, subject: 'הפרסום שלך במדליק אושר', htmlBody: '<div dir="rtl">שלום ' + esc_(data.name) + ',<br>התשלום התקבל, והעסק <b>' + esc_(data.biz) + '</b> מפורסם באתר מדליק עד סוף חנוכה.<br>חשבונית תגיע אלייך ממערכת סאמיט. נשמח להוסיף לכרטיס תמונה וקישור: פשוט השיבי למייל הזה.<br>תודה, רבקי יוגב · autoclick</div>', name: 'מדליק', replyTo: NOTIFY_COPY });
    } catch (err) {}
    return json_({ ok: true, biz: data.biz, pkg: data.pkg });
  } finally { lock.releaseLock(); }
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    // --- פעולות פתוחות לכל גולשת ---
    if (d.action === 'subscribe') {
      const email = String(d.email || '').trim().toLowerCase();
      if (!valid_(email)) return json_({ ok: false, error: 'מייל לא תקין' });
      const sh = subsSheet_(), rows = sh.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).toLowerCase() === email) {
          if (rows[i][4] === 'לא') sh.getRange(i + 1, 5).setValue('כן');
          return json_({ ok: true, dup: true });
        }
      }
      sh.appendRow([new Date(), email, String(d.name || '').slice(0, 100), String(d.source || '').slice(0, 50), 'כן']);
      return json_({ ok: true });
    }
    if (d.action === 'submit') {
      if (!KINDS[d.kind]) return json_({ ok: false, error: 'סוג לא מוכר' });
      const data = clean_(d.data);
      const summary = ['name', 'biz', 'title', 'supplier', 'phone', 'email'].map(k => data[k]).filter(Boolean).join(' · ');
      recSheet_(d.kind).appendRow([newId_(), new Date(), d.kind === 'subs' ? 'ממתין' : 'חדש', summary, JSON.stringify(data)]);
      if (d.kind === 'leads') { try { notifySupplier_(data); } catch (err) {} }
      return json_({ ok: true });
    }

    if (d.action === 'hit') {
      const type = d.type === 'sup' ? 'sup' : (d.type === 'game' || d.type === 'gtime' || d.type === 'doc' || d.type === 'rec') ? d.type : 'sec';
      hitSheet_().appendRow([new Date(), type, String(d.id || '').slice(0, 60), String(d.v || '').slice(0, 20), type === 'gtime' ? Math.min(3600, Math.max(0, Math.round(Number(d.s) || 0))) : '']);
      return json_({ ok: true });
    }

    if (d.action === 'startPay') return startPay_(d);
    if (d.action === 'confirmPay') return confirmPay_(d);

    // --- מכאן רק עם מפתח הניהול ---
    if (d.key !== SECRET) return json_({ ok: false, error: 'מפתח שגוי' });

    if (d.action === 'stats') return json_({ ok: true, stats: stats_() });

    if (d.action === 'list') {
      const rows = subsSheet_().getDataRange().getValues(), out = [];
      for (let i = 1; i < rows.length; i++) if (rows[i][4] !== 'לא') out.push({ date: fmt_(rows[i][0]), email: rows[i][1], source: rows[i][3] });
      return json_({ ok: true, subscribers: out });
    }
    if (d.action === 'send') return send_(d);

    if (d.action === 'records') {
      if (!KINDS[d.kind]) return json_({ ok: false, error: 'סוג לא מוכר' });
      const rows = recSheet_(d.kind).getDataRange().getValues(), out = [];
      for (let i = rows.length - 1; i >= 1; i--) {
        let data = {}; try { data = JSON.parse(rows[i][4]); } catch (err) {}
        out.push(Object.assign(data, { id: String(rows[i][0]), date: fmt_(rows[i][1]), status: rows[i][2] }));
      }
      return json_({ ok: true, records: out });
    }
    if (d.action === 'setStatus' || d.action === 'remove') {
      if (!KINDS[d.kind]) return json_({ ok: false, error: 'סוג לא מוכר' });
      const sh = recSheet_(d.kind), r = rowOf_(sh, d.id);
      if (!r) return json_({ ok: false, error: 'לא נמצא' });
      if (d.action === 'remove') sh.deleteRow(r); else sh.getRange(r, 3).setValue(String(d.status || ''));
      return json_({ ok: true });
    }
    if (d.action === 'addContent') {
      if (CONTENT_KINDS.indexOf(d.kind) < 0) return json_({ ok: false, error: 'סוג לא מוכר' });
      const item = d.item || {}; item.id = String(item.id || newId_());
      conSheet_().appendRow([item.id, new Date(), d.kind, String(item.title || item.name || ''), JSON.stringify(item)]);
      return json_({ ok: true, id: item.id });
    }
    if (d.action === 'updateContent') {
      const sh = conSheet_(), r = rowOf_(sh, d.id);
      if (!r) return json_({ ok: false, error: 'לא נמצא' });
      const item = d.item || {}; item.id = String(d.id);
      sh.getRange(r, 4, 1, 2).setValues([[String(item.title || item.name || ''), JSON.stringify(item)]]);
      return json_({ ok: true });
    }
    if (d.action === 'uploadImage') {
      const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(d.data || ''));
      if (!m) return json_({ ok: false, error: 'קובץ לא תקין' });
      const bytes = Utilities.base64Decode(m[2]);
      if (bytes.length > 4 * 1024 * 1024) return json_({ ok: false, error: 'התמונה גדולה מדי' });
      const file = folder_().createFile(Utilities.newBlob(bytes, m[1], 'ad-' + newId_() + (m[1] === 'image/png' ? '.png' : '.jpg')));
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return json_({ ok: true, url: 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w1200' });
    }
    if (d.action === 'removeContent') {
      const sh = conSheet_(), r = rowOf_(sh, d.id);
      if (!r) return json_({ ok: false, error: 'לא נמצא' });
      sh.deleteRow(r);
      return json_({ ok: true });
    }
    return json_({ ok: false, error: 'פעולה לא מוכרת' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  const p = e.parameter || {};
  // תוכן שנוסף מהאדמין – כל הגולשות רואות אותו
  if (p.action === 'content') {
    const rows = conSheet_().getDataRange().getValues(), items = {};
    CONTENT_KINDS.forEach(k => items[k] = []);
    for (let i = 1; i < rows.length; i++) {
      try { const it = JSON.parse(rows[i][4]); if (items[rows[i][2]]) items[rows[i][2]].push(it); } catch (err) {}
    }
    return json_({ ok: true, items: items });
  }
  // הסרה מרשימת התפוצה (הקישור שבסוף כל מייל)
  if (p.action === 'unsub') {
    const email = String(p.email || '').toLowerCase(), sh = subsSheet_(), rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) if (String(rows[i][1]).toLowerCase() === email) sh.getRange(i + 1, 5).setValue('לא');
    return HtmlService.createHtmlOutput('<div dir="rtl" style="font-family:Arial,sans-serif;padding:48px;font-size:20px">הוסרת מרשימת התפוצה של מדליק. תודה, ושיהיה חג אורים שמח.</div>');
  }
  return json_({ ok: true });
}

function send_(d) {
  const rows = subsSheet_().getDataRange().getValues();
  let to = [];
  if (d.test) to = [String(d.test)];
  else for (let i = 1; i < rows.length; i++) if (rows[i][4] !== 'לא') to.push(rows[i][1]);
  const subject = String(d.subject || '').trim(), body = String(d.body || '');
  if (!subject || !body) return json_({ ok: false, error: 'חסר נושא או הודעה' });
  const quota = MailApp.getRemainingDailyQuota();
  let sent = 0, skipped = 0;
  for (const email of to) {
    if (sent >= quota) { skipped++; continue; }
    const unsub = ScriptApp.getService().getUrl() + '?action=unsub&email=' + encodeURIComponent(email);
    const html = '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#071a38">' + esc_(body).replace(/\n/g, '<br>') +
      '<hr style="margin-top:32px;border:0;border-top:1px solid #ddd"><p style="font-size:12px;color:#666">קיבלת מייל זה כי נרשמת לרשימת התפוצה של מדליק. <a href="' + unsub + '">להסרה מהרשימה</a></p></div>';
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: html, body: body + '\n\nלהסרה מהרשימה: ' + unsub, name: 'מדליק' });
    sent++;
  }
  return json_({ ok: true, sent: sent, skipped: skipped });
}

// פנייה מהטופס של בעל עסק: נשלחת למייל שהוגדר לעסק בניהול (נקבע לפי מזהה העסק בגיליון, ולא לפי כתובת שמגיעה מהאתר)
function notifySupplier_(data) {
  const sid = String(data.sid || ''); if (!sid) return;
  const rows = conSheet_().getDataRange().getValues(); let item = null;
  for (let i = 1; i < rows.length; i++) if (String(rows[i][0]) === sid && rows[i][2] === 'suppliers') { try { item = JSON.parse(rows[i][4]); } catch (err) {} break; }
  if (!item) return;
  const to = valid_(String(item.email || '')) ? String(item.email).trim() : NOTIFY_COPY;
  const body = 'הפרסום במדליק עובד! התקבלה פנייה חדשה דרך מדליק עבור ' + (item.name || '') + '\n\n' +
    'שם: ' + (data.name || '') + '\nטלפון: ' + (data.phone || '') + '\nמייל: ' + (data.email || '') +
    '\nתאריך האירוע: ' + (data.date || '') + '\nמספר משתתפים: ' + (data.count || '') + '\n\nפרטים:\n' + (data.msg || '');
  const opt = { to: to, subject: 'פנייה חדשה מ' + (data.name || 'לקוח') + ' | הפרסום במדליק עובד', body: body, name: (data.name || 'לקוח') + ' (דרך מדליק)' };
  if (to !== NOTIFY_COPY) opt.bcc = NOTIFY_COPY;
  if (valid_(String(data.email || ''))) opt.replyTo = String(data.email).trim();
  MailApp.sendEmail(opt);
}
