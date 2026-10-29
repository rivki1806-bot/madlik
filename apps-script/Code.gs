// מדליק – שרת קטן וחינמי בגוגל.
// שומר בגיליון: נרשמות לרשימת התפוצה, כל הטפסים מהאתר, ותוכן שנוסף מהאדמין. ושולח מיילים לנרשמות.
// 1. החליפי את המפתח כאן במפתח סודי משלך (אותיות באנגלית ומספרים).
const SECRET = 'CHANGE-ME-123';

const KINDS = { subs: 'רעיונות שנשלחו', leads: 'פניות לספקים', ads: 'בקשות פרסום', users: 'משתמשות' };
const CONTENT_KINDS = ['games', 'recipes', 'ideas', 'suppliers'];

function tab_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }
  return sh;
}
const subsSheet_ = () => tab_('נרשמות', ['תאריך', 'מייל', 'שם', 'מקור', 'פעילה']);
const recSheet_ = kind => tab_(KINDS[kind], ['מזהה', 'תאריך', 'סטטוס', 'סיכום', 'נתונים']);
const conSheet_ = () => tab_('תוכן באתר', ['מזהה', 'תאריך', 'סוג', 'כותרת', 'נתונים']);

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function valid_(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmt_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm') : String(d); }
function newId_() { return Utilities.getUuid().slice(0, 8); }
function rowOf_(sh, id) { const ids = sh.getRange(1, 1, sh.getLastRow(), 1).getValues(); for (let i = 1; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 1; return 0; }

// טופס מהאתר: רק טקסט, באורך מוגבל
function clean_(o) {
  const out = {};
  Object.keys(o || {}).slice(0, 30).forEach(k => { out[String(k).slice(0, 40)] = String(o[k] == null ? '' : o[k]).slice(0, 3000); });
  return out;
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
      return json_({ ok: true });
    }

    // --- מכאן רק עם מפתח הניהול ---
    if (d.key !== SECRET) return json_({ ok: false, error: 'מפתח שגוי' });

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
