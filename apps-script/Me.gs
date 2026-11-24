// מדליק – אזור אישי בענן: כל מה שגולשת שומרת (מועדפים, משחקים, עיצובים, רשימת קניות) נשמר לפי המייל שלה,
// כך שאפשר להיכנס שוב מכל מחשב או טלפון. מייל שכבר יש לו אזור אישי מקבל קוד כניסה במייל.
// הקובץ הזה עומד לבד: מוסיפים אותו לפרויקט בגוגל, ובקובץ Code.gs יש שורה אחת שמפנה אליו (me_).

const ME_SHEET = 'אזורים אישיים';
const ME_FOLDER = 'מדליק – אזורים אישיים';
const ME_MAX = 8 * 1024 * 1024; // עד 8MB לכל אזור אישי (כולל תמונות בעיצובים)

const meSheet_ = () => tab_(ME_SHEET, ['מייל', 'שם', 'נפתח', 'עודכן', 'קובץ', 'מפתח', 'גודל']);
function meFolder_() { const it = DriveApp.getFoldersByName(ME_FOLDER); return it.hasNext() ? it.next() : DriveApp.createFolder(ME_FOLDER); }
function meRow_(email) {
  const sh = meSheet_(), last = sh.getLastRow(); if (last < 2) return 0;
  const col = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < col.length; i++) if (String(col[i][0]).toLowerCase() === email) return i + 2;
  return 0;
}
function meToken_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''); }
function meRead_(fileId) { try { return DriveApp.getFileById(fileId).getBlob().getDataAsString('UTF-8'); } catch (err) { return ''; } }
function meAuth_(d) {
  const email = String(d.email || '').trim().toLowerCase(), r = valid_(email) ? meRow_(email) : 0;
  if (!r) return null;
  const v = meSheet_().getRange(r, 1, 1, 7).getValues()[0];
  if (!d.token || String(d.token) !== String(v[5])) return null;
  return { r, email, fileId: String(v[4]), upd: Number(new Date(v[3]).getTime()) || 0 };
}
function meSendCode_(email, name) {
  const cache = CacheService.getScriptCache();
  if (cache.get('mewait_' + email)) return false; // לא שולחים יותר מקוד אחד בדקה
  const code = String(Math.floor(100000 + Math.random() * 900000));
  cache.put('mecode_' + email, JSON.stringify({ code, tries: 0 }), 15 * 60);
  cache.put('mewait_' + email, '1', 60);
  const html = '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.7;color:#222">' +
    '<h2 style="color:#e8590c;margin:0 0 10px">הקוד שלך לכניסה לאזור האישי במדליק</h2>' +
    '<p>' + (name ? 'שלום ' + esc_(name) + ',<br>' : '') + 'מישהו (כנראה את) ביקש להיכנס לאזור האישי באתר מדליק.</p>' +
    '<p style="font-size:34px;font-weight:bold;letter-spacing:6px;background:#fff4e6;border-radius:12px;padding:12px 20px;display:inline-block;direction:ltr">' + code + '</p>' +
    '<p>מקלידים את הקוד באתר. הוא בתוקף ל־15 דקות.<br>לא ביקשת? אפשר פשוט להתעלם מהמייל הזה.</p></div>';
  MailApp.sendEmail({ to: email, subject: 'מדליק – קוד כניסה לאזור האישי: ' + code, htmlBody: html, name: 'מדליק' });
  return true;
}

function me_(d) {
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const email = String(d.email || '').trim().toLowerCase();

    // פתיחת אזור אישי: מייל חדש נפתח מיד. מייל שכבר קיים: "יש לך אזור אישי, רוצה להיכנס?"
    if (d.action === 'meStart') {
      if (!valid_(email)) return json_({ ok: false, error: 'מייל לא תקין' });
      if (meRow_(email)) return json_({ ok: true, exists: true });
      const token = meToken_(), body = String(d.data || '{}');
      if (body.length > ME_MAX) return json_({ ok: false, error: 'גדול מדי' });
      const file = meFolder_().createFile(email + '.json', body, 'application/json');
      meSheet_().appendRow([email, String(d.name || '').slice(0, 100), new Date(), new Date(), file.getId(), token, body.length]);
      return json_({ ok: true, token, upd: Date.now() });
    }

    // שליחת קוד כניסה למייל קיים
    if (d.action === 'meCode') {
      const r = valid_(email) ? meRow_(email) : 0;
      if (!r) return json_({ ok: false, error: 'אין אזור אישי עם המייל הזה' });
      const name = String(meSheet_().getRange(r, 2).getValue() || '');
      const sent = meSendCode_(email, name);
      return json_({ ok: true, sent, wait: !sent });
    }

    // בדיקת הקוד: מחזירים מפתח כניסה ואת כל מה שנשמר
    if (d.action === 'meVerify') {
      const cache = CacheService.getScriptCache(), raw = cache.get('mecode_' + email);
      if (!raw) return json_({ ok: false, error: 'הקוד פג תוקף. שלחי קוד חדש' });
      const c = JSON.parse(raw);
      if (c.tries >= 5) { cache.remove('mecode_' + email); return json_({ ok: false, error: 'יותר מדי ניסיונות. שלחי קוד חדש' }); }
      if (String(d.code || '').replace(/\D/g, '') !== c.code) { c.tries++; cache.put('mecode_' + email, JSON.stringify(c), 15 * 60); return json_({ ok: false, error: 'הקוד לא נכון' }); }
      cache.remove('mecode_' + email);
      const r = meRow_(email), sh = meSheet_(), v = sh.getRange(r, 1, 1, 7).getValues()[0];
      let token = String(v[5]); if (!token) { token = meToken_(); sh.getRange(r, 6).setValue(token); }
      return json_({ ok: true, token, name: String(v[1] || ''), data: meRead_(String(v[4])) || '{}', upd: Number(new Date(v[3]).getTime()) || 0 });
    }

    // שמירה וטעינה (רק עם מפתח הכניסה)
    const a = meAuth_(d);
    if (!a) return json_({ ok: false, error: 'צריך להיכנס מחדש', relogin: true });
    if (d.action === 'meLoad') {
      if (d.since && Number(d.since) >= a.upd) return json_({ ok: true, same: true, upd: a.upd });
      return json_({ ok: true, data: meRead_(a.fileId) || '{}', upd: a.upd });
    }
    if (d.action === 'meSave') {
      const body = String(d.data || '{}');
      if (body.length > ME_MAX) return json_({ ok: false, error: 'גדול מדי' });
      try { DriveApp.getFileById(a.fileId).setContent(body); }
      catch (err) { const f = meFolder_().createFile(a.email + '.json', body, 'application/json'); meSheet_().getRange(a.r, 5).setValue(f.getId()); }
      const now = new Date(); meSheet_().getRange(a.r, 4).setValue(now); meSheet_().getRange(a.r, 7).setValue(body.length);
      return json_({ ok: true, upd: now.getTime() });
    }
    return json_({ ok: false, error: 'פעולה לא מוכרת' });
  } finally { lock.releaseLock(); }
}
