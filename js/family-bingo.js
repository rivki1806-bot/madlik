/* בינגו תמונות משפחתיות: מעלים תמונות, בוחרים גודל לוח וכמה לוחות, ומקבלים לוחות להדפסה ומצב מנחה על המסך.
   הכול קורה בדפדפן בלבד: התמונות לא נשלחות לשום מקום. */
(function(){
const SIZES = [{n:3, label:'3×3', cells:9}, {n:4, label:'4×4', cells:16}, {n:5, label:'5×5', cells:25}];
const S = {photos:[], size:3, cards:4, free:true, boards:null, called:[]};
const shuffle = a => { a = a.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const need = () => S.size * S.size - (S.free && S.size % 2 ? 1 : 0);
const $ = id => document.getElementById(id);
const toast = m => { const t = $('toast'); if(!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); };

/* תמונה → ריבוע 400×400 בלי להגדיל את הזיכרון */
function toSquare(file){
  return new Promise((ok, no) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      try{
        const side = Math.min(im.naturalWidth, im.naturalHeight), c = document.createElement('canvas'); c.width = c.height = 400;
        c.getContext('2d').drawImage(im, (im.naturalWidth - side) / 2, (im.naturalHeight - side) / 2, side, side, 0, 0, 400, 400);
        URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .82));
      }catch(e){ URL.revokeObjectURL(u); no(e); }
    };
    im.onerror = () => { URL.revokeObjectURL(u); no(new Error('bad')); };
    im.src = u;
  });
}

function html(){
  return `<div class="wrap fbn">
  <div class="fbn-thanks" role="note"><span aria-hidden="true">💛</span><b>תודה לתהילה כהן על הרעיון שכולנו נהנה ממנו!</b></div>
  <p class="fbn-priv"><span aria-hidden="true">🔒</span> התמונות נשארות אצלך במכשיר. הן לא נשלחות לשום מקום ולא נשמרות באתר.</p>
  <section class="fbn-box"><h2><i>1</i>מעלים תמונות משפחתיות</h2>
    <label class="fbn-drop" id="fbnDrop" tabindex="0"><input type="file" id="fbnFile" accept="image/*" multiple hidden><span class="fbn-up" aria-hidden="true">📸</span><b>לוחצים כאן או גוררים תמונות</b><small>אפשר לבחור כמה תמונות בבת אחת. התמונות נחתכות לריבוע.</small></label>
    <p class="fbn-count" id="fbnCount" aria-live="polite"></p>
    <div class="fbn-thumbs" id="fbnThumbs"></div>
  </section>
  <section class="fbn-box"><h2><i>2</i>בוחרים את גודל הבינגו</h2>
    <div class="fbn-row"><div class="fbn-grp"><span class="fbn-l">מספר משבצות בלוח</span><div class="fbn-chips" id="fbnSizes" role="radiogroup" aria-label="גודל הלוח">${SIZES.map(z => `<button type="button" role="radio" class="fbn-chip" data-size="${z.n}"><b>${z.label}</b><small>${z.cells} משבצות</small></button>`).join('')}</div></div>
      <div class="fbn-grp"><label class="fbn-l" for="fbnCards">כמה לוחות להדפיס</label><select id="fbnCards" class="fbn-sel">${Array.from({length:12}, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select></div>
      <label class="fbn-chk" id="fbnFreeW"><input type="checkbox" id="fbnFree" checked> משבצת חופשית באמצע</label></div>
    <p class="fbn-need" id="fbnNeed" aria-live="polite"></p>
    <button type="button" class="fbn-go" id="fbnMake"><span>יצירת הלוחות</span><i aria-hidden="true">←</i></button>
  </section>
  <section class="fbn-box fbn-res" id="fbnRes" hidden><h2><i>3</i>הלוחות שלכם</h2>
    <div class="fbn-acts"><button type="button" class="fbn-go" id="fbnPrint"><span>הדפסה</span><i aria-hidden="true">🖨</i></button><button type="button" class="fbn-go alt" id="fbnCall"><span>מצב מנחה על המסך</span><i aria-hidden="true">▶</i></button><button type="button" class="fbn-ghost" id="fbnMix">ערבוב מחדש</button></div>
    <p class="fbn-hint">מדפיסים את הלוחות, מחלקים לשחקנים, והמנחה מקרין תמונה אחרי תמונה. מי שיש לו שורה, עמודה או אלכסון מלאים צועק בינגו.</p>
    <div class="fbn-boards" id="fbnBoards"></div>
  </section></div>`;
}

function boardHTML(b, n, big){
  return `<div class="fbn-board" style="--n:${n}">${b.map(c => c === 'free' ? '<div class="fbn-cell free"><span>★</span></div>' : `<div class="fbn-cell"><img src="${c}" alt=""></div>`).join('')}</div>`;
}
function makeBoards(){
  const n = S.size, total = n * n, mid = (total - 1) / 2, useFree = S.free && n % 2 === 1, k = need(), out = [];
  for(let i = 0; i < S.cards; i++){
    const pick = shuffle(S.photos).slice(0, k), b = []; let p = 0;
    for(let c = 0; c < total; c++) b.push(useFree && c === mid ? 'free' : pick[p++]);
    out.push(b);
  }
  return out;
}

function refresh(){
  const m = S.photos.length, k = need(), ok = m >= k;
  $('fbnCount').textContent = m ? ('הועלו ' + m + (m === 1 ? ' תמונה' : ' תמונות')) : 'עוד לא הועלו תמונות';
  $('fbnThumbs').innerHTML = S.photos.map((p, i) => `<figure class="fbn-th"><img src="${p}" alt=""><button type="button" data-rm="${i}" aria-label="הסרת תמונה ${i + 1}">×</button></figure>`).join('');
  document.querySelectorAll('#fbnSizes .fbn-chip').forEach(b => { const on = +b.dataset.size === S.size; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  $('fbnFreeW').style.display = S.size % 2 ? '' : 'none';
  $('fbnNeed').className = 'fbn-need' + (ok ? ' ok' : '');
  $('fbnNeed').textContent = ok ? (m < k + 4 ? 'מספיק לשחק, אבל כדאי להעלות עוד כמה תמונות כדי שהלוחות יהיו שונים זה מזה.' : 'מצוין! יש מספיק תמונות לכל לוח.') : ('צריך לפחות ' + k + ' תמונות לגודל הזה, ויש ' + m + '. אפשר להעלות עוד או לבחור לוח קטן יותר.');
  $('fbnMake').disabled = !ok;
}
function showBoards(){
  if(!S.boards) { $('fbnRes').hidden = true; return; }
  $('fbnRes').hidden = false;
  $('fbnBoards').innerHTML = S.boards.map((b, i) => `<div class="fbn-bw"><h3>לוח ${i + 1}</h3>${boardHTML(b, S.size)}</div>`).join('');
}
async function addFiles(list){
  const files = [...list].filter(f => /^image\//.test(f.type)); if(!files.length) return toast('לא נבחרו תמונות. אפשר JPG, PNG או WebP');
  toast('מכינה את התמונות...'); let bad = 0;
  for(const f of files){ if(S.photos.length >= 80){ toast('אפשר עד 80 תמונות'); break; } try{ S.photos.push(await toSquare(f)); }catch(e){ bad++; } }
  S.boards = null; refresh(); showBoards();
  if(bad) toast(bad + ' קבצים לא נטענו. ייתכן שהפורמט לא נתמך (למשל HEIC)');
}

function printAll(){
  const n = S.size, pages = S.boards.map((b, i) => `<div class="sheet" style="aspect-ratio:auto;box-sizing:border-box;padding:6mm 4mm;display:flex;flex-direction:column;align-items:center">
    <h1 style="margin:0 0 6mm;font:800 22pt Rubik,Heebo,sans-serif;color:#0a2244;text-align:center">בינגו תמונות משפחתיות <span style="color:#ff6a00">· לוח ${i + 1}</span></h1>
    <div style="display:grid;grid-template-columns:repeat(${n},1fr);gap:3mm;width:178mm">${b.map(c => c === 'free' ? '<div style="aspect-ratio:1;border:2.5px solid #0a2244;border-radius:3mm;display:grid;place-items:center;background:#ffe9a8;font:800 34pt Rubik,sans-serif;color:#ff6a00">★</div>' : `<div style="aspect-ratio:1;border:2.5px solid #0a2244;border-radius:3mm;overflow:hidden;background:#fff"><img src="${c}" style="width:100%;height:100%;object-fit:cover;display:block" alt=""></div>`).join('')}</div></div>`).join('');
  if(window.printHTML) window.printHTML(pages);
}

/* מצב מנחה: תמונה גדולה אחרי תמונה, בסדר אקראי */
function caller(){
  if(document.querySelector('.fbn-call')) return;
  let order = shuffle(S.photos), i = 0;
  const ov = document.createElement('div'); ov.className = 'fbn-call'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'מצב מנחה');
  ov.innerHTML = '<button type="button" class="fbn-cx" aria-label="סגירה">×</button><p class="fbn-cn" aria-live="polite"></p><div class="fbn-cimg"><img alt=""></div><div class="fbn-cbtns"><button type="button" class="fbn-ghost" data-c="prev">→ הקודמת</button><button type="button" class="fbn-go" data-c="next"><span>התמונה הבאה</span><i aria-hidden="true">←</i></button><button type="button" class="fbn-ghost" data-c="mix">ערבוב</button></div><div class="fbn-past" aria-label="תמונות שכבר יצאו"></div>';
  document.body.appendChild(ov); document.body.classList.add('bn-lock');
  const img = ov.querySelector('.fbn-cimg img'), cn = ov.querySelector('.fbn-cn'), past = ov.querySelector('.fbn-past');
  const show = () => { img.src = order[i]; cn.textContent = 'תמונה ' + (i + 1) + ' מתוך ' + order.length; past.innerHTML = order.slice(0, i).map(p => `<img src="${p}" alt="">`).join(''); ov.querySelector('[data-c=next]').querySelector('span').textContent = i >= order.length - 1 ? 'הסתיימו התמונות' : 'התמונה הבאה'; };
  const close = () => { document.removeEventListener('keydown', key); document.body.classList.remove('bn-lock'); ov.remove(); };
  const next = () => { if(i < order.length - 1){ i++; show(); } else toast('כל התמונות כבר יצאו. אפשר לערבב ולהתחיל מחדש'); };
  const key = e => { if(e.key === 'Escape') close(); else if(e.key === ' ' || e.key === 'ArrowLeft'){ e.preventDefault(); next(); } else if(e.key === 'ArrowRight'){ if(i > 0){ i--; show(); } } };
  document.addEventListener('keydown', key);
  ov.addEventListener('click', e => { if(e.target.closest('.fbn-cx')) return close(); const b = e.target.closest('[data-c]'); if(!b) return; if(b.dataset.c === 'next') next(); if(b.dataset.c === 'prev' && i > 0){ i--; show(); } if(b.dataset.c === 'mix'){ order = shuffle(S.photos); i = 0; show(); } });
  show(); ov.querySelector('[data-c=next]').focus({preventScroll:true});
}

function after(){
  const f = $('fbnFile'), drop = $('fbnDrop');
  if(!f) return;
  S.cards = Math.min(12, Math.max(1, S.cards)); $('fbnCards').value = S.cards; $('fbnFree').checked = S.free;
  drop.onclick = e => { if(e.target !== f) f.click(); };
  drop.onkeydown = e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); f.click(); } };
  f.onchange = () => { addFiles(f.files); f.value = ''; };
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('on'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('on'); }));
  drop.addEventListener('drop', e => addFiles(e.dataTransfer.files));
  $('fbnThumbs').onclick = e => { const b = e.target.closest('[data-rm]'); if(!b) return; S.photos.splice(+b.dataset.rm, 1); S.boards = null; refresh(); showBoards(); };
  $('fbnSizes').onclick = e => { const b = e.target.closest('[data-size]'); if(!b) return; S.size = +b.dataset.size; S.boards = null; refresh(); showBoards(); };
  $('fbnCards').onchange = e => { S.cards = +e.target.value; S.boards = null; showBoards(); };
  $('fbnFree').onchange = e => { S.free = e.target.checked; S.boards = null; refresh(); showBoards(); };
  const make = () => { if(S.photos.length < need()) return; S.boards = makeBoards(); showBoards(); $('fbnRes').scrollIntoView({behavior:'smooth', block:'start'}); };
  $('fbnMake').onclick = make;
  $('fbnMix').onclick = () => { S.boards = makeBoards(); showBoards(); toast('הלוחות עורבבו'); };
  $('fbnPrint').onclick = () => printAll();
  $('fbnCall').onclick = () => caller();
  refresh(); showBoards();
}

const ENABLED = false; // כבוי כרגע: המשחק מוסתר מהאתר. כדי להחזיר, לשנות ל־true
const card = () => !ENABLED ? '' : '<a class="card" href="#/family-bingo"><div class="card-top fbn-cardtop" aria-hidden="true"><span>📸</span><i>🎉</i></div><div class="card-body"><h3>בינגו תמונות משפחתיות</h3><p>מעלים תמונות מהמשפחה, בוחרים גודל, ומקבלים לוחות להדפסה ומצב מנחה על המסך.</p><div class="tags"><span class="tag tag-new">חדש!</span><span class="tag tag-gold">חינם</span></div></div></a>';
addEventListener('hashchange', () => { const o = document.querySelector('.fbn-call'); if(o){ o.remove(); document.body.classList.remove('bn-lock'); } });
window.FamBingo = {html, after, card, enabled:ENABLED};
})();
