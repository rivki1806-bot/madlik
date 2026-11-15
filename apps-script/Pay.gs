// מדליק – תשלום אוטומטי דרך SUMIT (סליקה של Upay). קובץ נפרד בפרויקט, לצד Code.gs.
// הקובץ משתמש בפונקציות של Code.gs, ולכן שני הקבצים צריכים להיות באותו פרויקט.
// את SUMIT_COMPANY_ID ו-SUMIT_API_KEY שומרים בהגדרות הסקריפט (Project Settings > Script properties), לא בקוד.

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
