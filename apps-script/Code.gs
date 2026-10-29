// מדליק – שרת קטן וחינמי בגוגל: שומר נרשמות בגיליון ושולח להן מיילים.
// 1. החליפי את המפתח כאן במפתח סודי משלך (אותיות באנגלית ומספרים).
const SECRET = 'CHANGE-ME-123';

const SHEET = 'נרשמות';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(['תאריך', 'מייל', 'שם', 'מקור', 'פעילה']); }
  return sh;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function valid_(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmt_(d) { return d instanceof Date ? Utilities.formatDate(d, 'Asia/Jerusalem', 'dd/MM/yyyy HH:mm') : String(d); }

// נרשמות חדשות, רשימה ושליחה
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.action === 'subscribe') {
      const email = String(d.email || '').trim().toLowerCase();
      if (!valid_(email)) return json_({ ok: false, error: 'מייל לא תקין' });
      const sh = sheet_(), rows = sh.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).toLowerCase() === email) {
          if (rows[i][4] === 'לא') sh.getRange(i + 1, 5).setValue('כן');
          return json_({ ok: true, dup: true });
        }
      }
      sh.appendRow([new Date(), email, String(d.name || ''), String(d.source || ''), 'כן']);
      return json_({ ok: true });
    }
    if (d.key !== SECRET) return json_({ ok: false, error: 'מפתח שגוי' });
    if (d.action === 'list') {
      const rows = sheet_().getDataRange().getValues(), out = [];
      for (let i = 1; i < rows.length; i++) if (rows[i][4] !== 'לא') out.push({ date: fmt_(rows[i][0]), email: rows[i][1], source: rows[i][3] });
      return json_({ ok: true, subscribers: out });
    }
    if (d.action === 'send') return send_(d);
    return json_({ ok: false, error: 'פעולה לא מוכרת' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// הסרה מהרשימה (הקישור שבסוף כל מייל)
function doGet(e) {
  const p = e.parameter || {};
  if (p.action === 'unsub') {
    const email = String(p.email || '').toLowerCase(), sh = sheet_(), rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) if (String(rows[i][1]).toLowerCase() === email) sh.getRange(i + 1, 5).setValue('לא');
    return HtmlService.createHtmlOutput('<div dir="rtl" style="font-family:Arial,sans-serif;padding:48px;font-size:20px">הוסרת מרשימת התפוצה של מדליק. תודה, ושיהיה חג אורים שמח.</div>');
  }
  return json_({ ok: true });
}

function send_(d) {
  const rows = sheet_().getDataRange().getValues();
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
