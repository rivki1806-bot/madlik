// מדליק – מנהל גופנים ובוחר גופנים (300 משפחות). טעינה עצלה: רק מה שרואים או בוחרים.
window.MadlikFonts = (function(){
'use strict';

const CAT = {s:'סאנס־סריף', r:'סריף', d:'כותרות ועיצוביים', h:'כתב יד', m:'מונו'};
const LIST = (window.MADLIK_FONTS || []).map(([n, c, he, sp]) => ({n, c, he: !!he, sp}));
const BY = Object.fromEntries(LIST.map(f => [f.n, f]));
const loaded = new Set();
const prev = new Set();
const enc = n => n.replace(/ /g, '+');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* עוביים זמינים לגופן */
function weights(n){
  const f = BY[n]; if(!f || !f.sp) return [400];
  if(f.sp[0] === 'v'){ const [a, b] = f.sp.slice(1).split('-').map(Number); return [100,200,300,400,500,600,700,800,900].filter(w => w >= a && w <= b); }
  return f.sp.slice(1).split(',').map(Number);
}
function wParam(n){
  const f = BY[n]; if(!f || !f.sp) return '';
  if(f.sp[0] === 'v') return ':wght@' + f.sp.slice(1).replace('-', '..');
  return ':wght@' + f.sp.slice(1).split(',').join(';');
}
function link(href){ const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); return l; }

/* טעינה מלאה (לעריכה בפועל) */
function ensure(n){
  if(!n) return Promise.resolve();
  if(!loaded.has(n)){
    loaded.add(n);
    link('https://fonts.googleapis.com/css2?family=' + enc(n) + wParam(n) + '&display=swap');
  }
  try{ return Promise.race([document.fonts.load('16px "' + n + '"'), new Promise(r => setTimeout(r, 4000))]); }catch(e){ return Promise.resolve(); }
}
function markLoaded(names){ names.forEach(n => loaded.add(n)); }

/* טעינת תצוגה מקדימה קטנה: רק האותיות של הדוגמה */
function preview(n, text, wt){
  if(loaded.has(n)) return;
  const k = n + '|' + wt + '|' + text; if(prev.has(k)) return; prev.add(k);
  const f = BY[n], ws = weights(n), w = wt && ws.includes(wt) ? wt : 400;
  const chars = [...new Set((text + n).split(''))].join('');
  link('https://fonts.googleapis.com/css2?family=' + enc(n) + (f && f.sp && w !== 400 ? ':wght@' + w : '') + '&text=' + encodeURIComponent(chars) + '&display=swap');
}

/* ---------- חלון בחירת גופן ---------- */
let modal = null;
function open(o){
  close();
  const st = {q:'', tab: o.he === false ? 'all' : 'he', cat:'', sample:(o.text || '').split('\n')[0].slice(0, 28) || 'חנוכה שמח', font:o.font, weight:o.weight || (o.bold ? 700 : 400), size:36};
  modal = document.createElement('div'); modal.className = 'fp-ov'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'ספריית הגופנים');
  modal.innerHTML = `<div class="fp">
    <header class="fp-h"><div><h2>ספריית הגופנים</h2><p class="fp-sub"><b>${LIST.length}</b> גופנים · <b>${LIST.filter(f => f.he).length}</b> עם עברית</p></div><button class="fp-x" aria-label="סגירה">×</button></header>
    <div class="fp-bar">
      <input type="search" class="fp-q" placeholder="חיפוש גופן בשם…" aria-label="חיפוש גופן">
      <input type="text" class="fp-s" value="${esc(st.sample)}" maxlength="40" aria-label="טקסט לדוגמה" placeholder="כתבו כאן לראות בכל גופן">
      <button class="fp-bold" aria-pressed="${st.weight >= 600}" title="מודגש">ב</button>
      <label class="fp-size">גודל <input type="range" min="20" max="64" value="${st.size}"></label>
    </div>
    <div class="fp-tabs" role="tablist"><button data-tab="he" role="tab">עברית</button><button data-tab="en" role="tab">אנגלית</button><button data-tab="all" role="tab">הכול</button></div>
    <div class="fp-cats"><button data-cat="">הכול</button>${Object.entries(CAT).map(([k, v]) => `<button data-cat="${k}">${v}</button>`).join('')}</div>
    <div class="fp-grid" tabindex="0"></div>
    <footer class="fp-f"><span class="fp-count"></span><span class="fp-hint">לחיצה על גופן מחליפה אותו מיד</span></footer>
  </div>`;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
  const $ = s => modal.querySelector(s), $$ = s => [...modal.querySelectorAll(s)];
  const grid = $('.fp-grid');
  let io = null;

  const isLatin = t => /[A-Za-z]/.test(t);
  const sampleFor = f => f.he ? st.sample : (isLatin(st.sample) ? st.sample : 'Happy Hanukkah');
  const match = f => (st.tab === 'all' || (st.tab === 'he') === f.he) && (!st.cat || f.c === st.cat) && (!st.q || f.n.toLowerCase().includes(st.q));

  function render(){
    if(io) io.disconnect();
    const items = LIST.filter(match);
    $('.fp-count').textContent = items.length + ' גופנים מוצגים';
    grid.scrollTop = 0;
    grid.innerHTML = items.length ? items.map(f => `<button class="fp-it${f.n === st.font ? ' on' : ''}" data-f="${esc(f.n)}" aria-pressed="${f.n === st.font}">
      <span class="fp-pv" style="font-family:'${esc(f.n)}',sans-serif;font-weight:${st.weight};font-size:${st.size}px" ${f.he ? '' : 'dir="ltr"'}>${esc(sampleFor(f))}</span>
      <span class="fp-meta"><b>${esc(f.n)}</b><small>${f.he ? '<em>עברית</em>' : ''}${CAT[f.c]}${weights(f.n).length > 1 ? ' · ' + weights(f.n).length + ' עוביים' : ''}</small></span></button>`).join('')
      : '<p class="fp-none">לא נמצא גופן בשם הזה. נסו חיפוש אחר.</p>';
    io = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting){ const b = e.target; io.unobserve(b); const f = BY[b.dataset.f]; preview(f.n, sampleFor(f), st.weight); } }), {root:grid, rootMargin:'300px'});
    $$('.fp-it').forEach(b => io.observe(b));
    $$('.fp-tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === st.tab));
    $$('.fp-cats button').forEach(b => b.classList.toggle('on', b.dataset.cat === st.cat));
  }
  function restyle(){ $$('.fp-pv').forEach(p => { p.style.fontWeight = st.weight; p.style.fontSize = st.size + 'px'; }); $$('.fp-it').forEach(b => { const f = BY[b.dataset.f]; preview(f.n, sampleFor(f), st.weight); }); }

  $('.fp-x').onclick = close;
  modal.onclick = e => { if(e.target === modal) close(); };
  modal.onkeydown = e => { if(e.key === 'Escape'){ e.stopPropagation(); close(); } };
  $('.fp-q').oninput = e => { st.q = e.target.value.trim().toLowerCase(); render(); };
  $('.fp-s').oninput = e => { st.sample = e.target.value || 'חנוכה שמח'; render(); };
  $('.fp-size input').oninput = e => { st.size = +e.target.value; restyle(); };
  $('.fp-bold').onclick = e => { st.weight = st.weight >= 600 ? 400 : 700; e.currentTarget.setAttribute('aria-pressed', st.weight >= 600); restyle(); if(o.onBold) o.onBold(st.weight >= 600); };
  $('.fp-tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if(b){ st.tab = b.dataset.tab; render(); } };
  $('.fp-cats').onclick = e => { const b = e.target.closest('[data-cat]'); if(b){ st.cat = b.dataset.cat; render(); } };
  grid.onclick = e => {
    const b = e.target.closest('[data-f]'); if(!b) return;
    st.font = b.dataset.f; $$('.fp-it').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    if(o.onPick) o.onPick(st.font); close();
  };
  render();
  setTimeout(() => { const on = $('.fp-it.on'); if(on) on.scrollIntoView({block:'center'}); $('.fp-q').focus(); }, 60);
}
function close(){ if(modal){ modal.remove(); modal = null; document.body.style.overflow = ''; } }

return {LIST, BY, CAT, weights, ensure, markLoaded, preview, open, close};
})();
