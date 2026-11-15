/* בונה עמודים אמיתיים לחיפוש בגוגל: לכל מדור, משחק, מתכון ותבנית יש כתובת משלה עם כותרת, תיאור ותוכן.
   הרצה: node tools/build-seo.js   (אחרי כל שינוי בנתונים או בגרסאות הקבצים באתר)
   כל עמוד טוען את האתר הרגיל, ומעביר אותו לעמוד המתאים בתוך האתר (כתובת #). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..'), HOST = 'https://madlik.autoclick.co.il', TODAY = new Date().toISOString().slice(0, 10);
const ctx = {}; ctx.window = ctx; vm.createContext(ctx);
['js/data.js', 'js/data-more.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));
const D = ctx.MADLIK_DATA;
const shell = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const SITE = 'מדליק';
const urls = [];

function page({url, route, title, desc, h1, body, ld, img}) {
  let h = shell;
  const full = HOST + url;
  const sw = (re, to) => { if (!re.test(h)) throw new Error('shell anchor ' + re); h = h.replace(re, () => to); };
  sw(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  sw(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
  sw(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${full}">`);
  sw(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${full}">`);
  sw(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
  sw(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
  sw(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${esc(title)}">`);
  sw(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${esc(desc)}">`);
  if (img) { h = h.replace(/<meta property="og:image" content="[^"]*">/, () => `<meta property="og:image" content="${HOST}/${img}">`).replace(/<meta name="twitter:image" content="[^"]*">/, () => `<meta name="twitter:image" content="${HOST}/${img}">`); }
  sw(/<meta charset="utf-8">/, '<meta charset="utf-8">\n<base href="/">');
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: SITE, item: HOST + '/' }].concat(url === '/' ? [] : [{ '@type': 'ListItem', position: 2, name: h1, item: full }]) };
  const lds = [crumbs].concat(ld ? [ld] : []).map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  sw(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/, lds + '\n<link rel="preconnect" href="https://fonts.googleapis.com">');
  sw(/<main id="app" tabindex="-1"><\/main>/, `<main id="app" tabindex="-1"><div style="max-width:860px;margin:30px auto;padding:0 20px;line-height:1.7"><nav aria-label="נתיב"><a href="/">מדליק</a></nav><h1>${esc(h1)}</h1>${body}</div></main>`);
  sw(/<script src="js\/data\.js/, `<script>history.replaceState(null,'','/#/${route}');</script>\n<script src="js/data.js`);
  const dir = path.join(ROOT, url.replace(/^\//, ''));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), h);
  urls.push(url);
}
const links = (items, base, label) => '<ul>' + items.map(x => `<li><a href="${base}${esc(x.id)}/">${esc(label(x))}</a></li>`).join('') + '</ul>';
const num = n => n === 0 ? '' : String(n).replace(/\.0$/, '');
const typeBy = (type) => D.games.filter(g => g.type === type);

/* מדורים */
const screenGames = D.games.filter(g => g.type !== 'הדפסה');
page({ url: '/games/', route: 'games', title: 'משחקים על המסך לערב לביבות וחנוכה | מדליק', desc: 'משחקים דיגיטליים לערב לביבות: קרב המילים, אליאס, חידון חנוכה, זיכרון, גלגל המזל ועוד. משחקים על המסך שניתנים גם להדפסה, בחינם.', h1: 'משחקים על המסך לערב לביבות', body: '<p>משחקים דיגיטליים לערב חנוכה ולערב לביבות, למשפחה, לילדים ולקבוצות. אפשר לשחק על המסך או להדפיס.</p>' + links(D.games, '/game/', g => g.title) });
page({ url: '/create/', route: 'create', title: 'פעילויות להדפסה בהתאמה אישית לחנוכה | מדליק', desc: 'בינגו, רביעיות, תפזורת, כרטיסיות ועוד: מכניסים את המילים שלכם ומקבלים פעילות להדפסה לערב חנוכה, בחינם.', h1: 'פעילויות להדפסה בהתאמה אישית', body: '<p>מכניסים את המילים והשאלות שלכם, ומקבלים פעילות מוכנה להדפסה או להפעלה על המסך.</p>' + links(D.creators, '/create/', c => c.title) });
page({ url: '/recipes/', route: 'recipes', title: 'מתכונים לערב לביבות וחנוכה | מדליק', desc: 'מתכונים לערב לביבות: קינוחים, סלטים ומגשי אירוח, עם חישוב כמויות אוטומטי לפי מספר הסועדים.', h1: 'מתכונים לערב לביבות', body: '<p>מתכונים לערב חנוכה, עם חישוב כמויות לפי מספר הסועדים.</p>' + links(D.recipes, '/recipe/', r => r.title) });
page({ url: '/studio/', route: 'studio', title: 'סטודיו מיתוג לערב לביבות: הזמנות, תפריטים ושלטים להדפסה | מדליק', desc: 'סטודיו מיתוג לערב לביבות: בוחרים שפה עיצובית, כותבים את המילים שלכם ומקבלים הזמנות, תפריטים, שלטים ומדבקות להדפסה.', h1: 'סטודיו מיתוג לערב לביבות', body: '<p>עיצובים מקצועיים להדפסה: הזמנות, תפריטים, שלטים, מדבקות ועוד. מחליפים את הטקסט, מזיזים הכול איפה שרוצים, ומדפיסים.</p>' + links(D.templates, '/studio/', t => t.title) });
page({ url: '/suppliers/', route: 'suppliers', title: 'נותני שירות לערב לביבות: אולמות, קייטרינג ומפעילים | מדליק', desc: 'נותני שירות שישדרגו לכם את האירוע: אולמות, קייטרינג, מפעילים, עיצוב וצילום. לפי אזור ולפי מחיר.', h1: 'נותני שירות שישדרגו לכם את האירוע', body: '<p>אולמות, קייטרינג, מפעילים, עיצוב ודקורציה, קינוחים וצילום. מחפשים לפי אזור ולפי מחיר, ושולחים פנייה ישירות לבעל העסק.</p>' });
page({ url: '/advertise/', route: 'advertise', title: 'פרסום לעסקים במדליק | אולמות, קייטרינג ומפעילים', desc: 'רוצים לפרסם את העסק שלכם בפני משפחות שמארגנות ערב לביבות? שלוש תכניות פרסום, כרטיס מעוצב ודוח כניסות ופניות.', h1: 'רוצים לפרסם במדליק?', body: '<p>מודעה אישית בכרטיס מעוצב, פניות שמגיעות ישר אליכם, ודוח עם צפיות, לחיצות ופניות.</p>' });
page({ url: '/cards/', route: 'cards', title: 'קלפים טיפוליים של מיניאטורה להורדה ולהדפסה | מדליק', desc: 'קלפים טיפוליים מבית מיניאטורה, יהודית לרנר: לצפייה, הורדה והדפסה, לשיחה חמה ומחבקת בערב חנוכה.', h1: 'קלפים טיפוליים של מיניאטורה', body: '<p>קלפים טיפוליים מבית מיניאטורה, יהודית לרנר, לשיחה משפחתית חמה. אפשר לצפות, להוריד ולהדפיס.</p>' });

/* משחקים */
D.games.forEach(g => {
  const facts = [g.type && 'סוג: ' + g.type, g.min && g.max && `משתתפים: ${g.min} עד ${g.max}`, g.age && 'גיל: ' + g.age, g.time && `זמן: ${g.time} דקות`, g.equip && 'ציוד: ' + g.equip].filter(Boolean);
  page({ url: `/game/${g.id}/`, route: `game/${g.id}`, title: `${g.title} | משחק לערב לביבות | מדליק`, desc: `${g.short} ${g.age ? 'מתאים לגיל ' + g.age + '. ' : ''}משחק לערב חנוכה, אפשר לשחק על המסך או להדפיס.`.slice(0, 300), h1: g.title,
    body: `<p>${esc(g.short)}</p><h2>איך משחקים?</h2><p>${esc(g.how)}</p>${facts.length ? '<ul>' + facts.map(f => `<li>${esc(f)}</li>`).join('') + '</ul>' : ''}<p><a href="/games/">לכל המשחקים</a></p>` });
});
/* יוצרי פעילויות */
D.creators.forEach(c => page({ url: `/create/${c.id}/`, route: `create/${c.id}`, title: `${c.title} | פעילות להדפסה והפעלה על המסך | מדליק`, desc: `${c.text}. מכניסים את התוכן שלכם ומקבלים משחק מוכן להדפסה או להפעלה על המסך, בחינם.`.slice(0, 300), h1: c.title, body: `<p>${esc(c.text)}</p><p><a href="/create/">לכל הפעילויות</a></p>` }));
/* מתכונים */
D.recipes.forEach(r => {
  const ing = r.ing.map(([q, u, n]) => [num(q), u, n].filter(Boolean).join(' '));
  const ld = { '@context': 'https://schema.org', '@type': 'Recipe', name: r.title, image: r.img ? [HOST + '/' + r.img] : undefined, author: { '@type': 'Person', name: (r.credit || 'מדליק').split('·')[0].trim() }, recipeCategory: r.cat, recipeYield: `${r.serves} מנות`, totalTime: `PT${r.time}M`, suitableForDiet: undefined, recipeIngredient: ing, recipeInstructions: r.steps.map(s => ({ '@type': 'HowToStep', text: s })), inLanguage: 'he' };
  page({ url: `/recipe/${r.id}/`, route: `recipe/${r.id}`, title: `${r.title} | מתכון לערב לביבות | מדליק`, desc: `${r.title}: מתכון ${r.diet || ''} ${r.level ? 'ברמה ' + r.level : ''}, ${r.time} דקות הכנה, ל־${r.serves} סועדים. עם חישוב כמויות אוטומטי.`.replace(/\s+/g, ' ').slice(0, 300), h1: r.title, img: r.img,
    body: `<p>${esc(r.cat)} · ${esc(r.diet || '')} · ${r.time} דקות · ${esc(r.level || '')} · ל־${r.serves} סועדים</p><h2>מצרכים</h2><ul>${ing.map(i => `<li>${esc(i)}</li>`).join('')}</ul><h2>אופן ההכנה</h2><ol>${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><p><a href="/recipes/">לכל המתכונים</a></p>`, ld });
});
/* תבניות הסטודיו */
D.templates.forEach(t => page({ url: `/studio/${t.id}/`, route: `studio/${t.id}`, title: `${t.title} להדפסה | סטודיו מיתוג לערב לביבות | מדליק`, desc: `${t.title} בעיצוב מקצועי להדפסה בגודל ${t.w}×${t.h} מ״מ. כותבים את המילים שלכם, מזיזים הכול איפה שרוצים, ומדפיסים.`.slice(0, 300), h1: t.title, body: `<p>${esc(t.title)} בעיצוב מקצועי להדפסה, בגודל ${t.w}×${t.h} מ״מ. עורכים את הטקסט, בוחרים שפה עיצובית ומדפיסים.</p><p><a href="/studio/">לכל התבניות</a></p>` }));

(async () => {
/* בעלי עסקים: נטענים מהשרת של גוגל (מה שהוספת בניהול). הטלפון לא נכתב בעמוד, כדי שהלחיצות עליו ימשיכו להיספר */
try {
  const cfg = fs.readFileSync(path.join(ROOT, 'js/config.js'), 'utf8'), api = (cfg.match(/MADLIK_API\s*=\s*'([^']+)'/) || [])[1];
  if (api) {
    const res = await fetch(api + '?action=content', { redirect: 'follow' }), j = await res.json();
    const sups = ((j.items && j.items.suppliers) || []).filter(s => s && !s._chunk && s.id && s.name && s.active !== false);
    sups.forEach(s => {
      const ld = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: s.name, description: s.text || undefined, areaServed: s.region || undefined, url: HOST + `/supplier/${s.id}/` };
      page({ url: `/supplier/${s.id}/`, route: `supplier/${s.id}`, title: `${s.name} | ${s.cat || 'נותני שירות'} לערב לביבות | מדליק`, desc: `${s.name}: ${s.text || ''} ${s.cat ? 'תחום: ' + s.cat + '.' : ''} ${s.region ? 'אזור: ' + s.region + '.' : ''} שליחת פנייה ישירה דרך מדליק.`.replace(/\s+/g, ' ').slice(0, 300), h1: s.name,
        body: `<p>${esc(s.text || '')}</p><ul>${s.cat ? `<li>תחום: ${esc(s.cat)}</li>` : ''}${s.region ? `<li>אזור: ${esc(s.region)}</li>` : ''}${s.price ? `<li>מחיר: ${esc(s.price)}</li>` : ''}</ul><p>אפשר לשלוח פנייה ישירות לבעל העסק דרך מדליק.</p><p><a href="/suppliers/">לכל נותני השירות</a></p>`, ld });
    });
    page({ url: '/suppliers/', route: 'suppliers', title: 'נותני שירות לערב לביבות: אולמות, קייטרינג ומפעילים | מדליק', desc: 'נותני שירות שישדרגו לכם את האירוע: אולמות, קייטרינג, מפעילים, עיצוב וצילום. לפי אזור ולפי מחיר.', h1: 'נותני שירות שישדרגו לכם את האירוע', body: '<p>אולמות, קייטרינג, מפעילים, עיצוב ודקורציה, קינוחים וצילום. מחפשים לפי אזור ולפי מחיר, ושולחים פנייה ישירות לבעל העסק.</p>' + links(sups, '/supplier/', s => s.name) });
    console.log('suppliers:', sups.map(s => s.id).join(', '));
  }
} catch (e) { console.log('suppliers skipped:', e.message); }

/* 404: כל כתובת לא מוכרת מגיעה לעמוד הבית */
fs.writeFileSync(path.join(ROOT, '404.html'), `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>מדליק</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=/"><script>location.replace('/');</script></head><body><p><a href="/">מעבר לעמוד הבית של מדליק</a></p></body></html>\n`);

/* sitemap */
const all = [...new Set(['/'].concat(urls))];
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + all.map(u => `  <url>\n    <loc>${HOST}${u}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${u === '/' ? 'weekly' : 'monthly'}</changefreq>\n    <priority>${u === '/' ? '1.0' : /^\/(games|recipes|create|studio)\/$/.test(u) ? '0.8' : '0.6'}</priority>\n  </url>`).join('\n') + '\n</urlset>\n');
console.log('pages:', all.length - 1);
})();
