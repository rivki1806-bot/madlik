// מדליק – פאנל ההגדרות של עורך העיצוב: גופנים, צבעים, אפקטים, סידור ושכבות
window.MadlikEditorUI = (function(){
'use strict';

let tab = 'props';
const getP = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
function setP(o, p, v){
  const ps = p.split('.'); let a = o;
  for(let i = 0; i < ps.length - 1; i++){ if(a[ps[i]] == null) a[ps[i]] = isNaN(ps[i+1]) ? {} : []; a = a[ps[i]]; }
  a[ps[ps.length-1]] = v;
}
function toHex(c){
  if(!c || c === 'transparent') return '#ffffff';
  if(/^#[0-9a-f]{6}$/i.test(c)) return c;
  if(/^#[0-9a-f]{3}$/i.test(c)) return '#' + c.slice(1).split('').map(x => x + x).join('');
  const m = String(c).match(/rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  return m ? '#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('') : '#000000';
}
const ic = n => `<svg class="ic" aria-hidden="true"><use href="#ic-${n}"/></svg>`;
const pct = (v, min, max) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100)).toFixed(1);
const QUICK = ['Rubik','Suez One','Secular One','Heebo','Frank Ruhl Libre','Karantina','Gveret Levin','Assistant','Varela Round','Amatic SC'];

/* ---------- בניית חלקים ---------- */
const rng = (esc, label, key, min, max, step, val, unit) =>
  `<label class="pc"><span>${label}</span><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${val}" style="--p:${pct(val, min, max)}%" aria-label="${label}"><output>${val}${unit || ''}</output></label>`;
const clr = (label, key, val) => `<label class="pc pc-c"><span>${label}</span><span class="cpick" style="--c:${toHex(val)}"><input type="color" data-k="${key}" value="${toHex(val)}" aria-label="${label}"><code>${toHex(val)}</code></span></label>`;
const sec = (title, body, open, icon, tone) => `<details class="ps ps-${tone || 'a'}" ${open === false ? '' : 'open'}><summary><span class="ps-ic">${ic(icon || 'sparkle')}</span><b>${title}</b><i class="ps-ch">${ic('chev')}</i></summary><div class="ps-b">${body}</div></details>`;

function swatches(c, target, cur){
  const st = c.styleById(c.S.style), pal = (st ? st.palette : []).concat(c.SWATCHES.filter(x => !(st && st.palette.includes(x))));
  const now = String(cur || '').toLowerCase();
  return `<div class="sw-row" role="group" aria-label="צבעים מהירים">${pal.map(x => `<button class="sw${x.toLowerCase() === now ? ' on' : ''}" data-sw="${x}" data-for="${target}" style="--c:${x}" aria-label="צבע ${x}" title="${x}"></button>`).join('')}</div>`;
}

/* תצוגה מקדימה לכל אפקט: "אבג" עם האפקט עצמו */
function fxTiles(c){
  return Object.entries(c.FX).map(([id, f]) => {
    const t = {font:'Rubik', size:26, bold:true, weight:700, italic:false, u:false, s:false, align:'center', color:'#ffffff', fill:'solid', ls:0, lh:1, sh:[], stroke:{w:0, c:'#ffffff'}, hollow:false};
    try{ f[1](t); }catch(e){}
    return `<button class="fx" data-fx="${id}" title="${f[0]}"><span class="fx-pv"><span style="${c.textCss(t)}">אבג</span></span><small>${f[0]}</small></button>`;
  }).join('');
}

function fontSection(c, l){
  const F = window.MadlikFonts, meta = F && F.BY[l.font], ws = F ? F.weights(l.font) : [400];
  const wt = l.weight || (l.bold ? 700 : 400);
  const names = {100:'דק מאוד', 200:'דק', 300:'קליל', 400:'רגיל', 500:'בינוני', 600:'חצי עבה', 700:'מודגש', 800:'עבה', 900:'שמן'};
  const wchips = ws.length > 1 ? `<div class="wchips" role="group" aria-label="עובי">${ws.map(w => `<button data-w="${w}" class="${wt === w ? 'on' : ''}" style="font-weight:${w}">${names[w]}</button>`).join('')}</div>` : '';
  return `<button class="fcard" data-a3="fonts" aria-label="פתיחת ספריית הגופנים">
      <span class="fcard-pv" style="font-family:'${c.esc(l.font)}',sans-serif;font-weight:${wt}">${meta && !meta.he ? 'Happy Hanukkah' : 'חנוכה שמח'}</span>
      <span class="fcard-m"><b>${c.esc(l.font)}</b><small>${meta ? (meta.he ? 'עברית · ' : '') + F.CAT[meta.c] : 'גופן'}</small></span>
      <span class="fcard-go">ספריית גופנים · ${F ? F.LIST.length : 300} ${ic('chev')}</span></button>
    ${meta && !meta.he && /[֐-׿]/.test(l.text || '') ? '<p class="fnote">גופן זה לאנגלית בלבד, ולכן לא ישנה את הטקסט בעברית. כתבו טקסט באנגלית כדי לראות אותו.</p>' : ''}
    <div class="brow"><button class="bold-c${wt >= 600 ? ' on' : ''}" data-t="bold" aria-pressed="${wt >= 600}" aria-label="מודגש" title="מודגש"><b>ב</b></button><span class="brow-t"><b>מודגש</b><small>${wt >= 600 ? 'פעיל' : 'כבוי'}</small></span>
      <button class="it-c${l.italic ? ' on' : ''}" data-t="italic" aria-pressed="${!!l.italic}" aria-label="נטוי" title="נטוי"><i>נ</i></button>
      <button class="it-c${l.u ? ' on' : ''}" data-t="u" aria-pressed="${!!l.u}" aria-label="קו תחתון" title="קו תחתון"><u>ק</u></button>
      <button class="it-c${l.s ? ' on' : ''}" data-t="s" aria-pressed="${!!l.s}" aria-label="קו חוצה" title="קו חוצה"><s>ח</s></button></div>
    ${wchips}
    <div class="qf" role="group" aria-label="גופנים מועדפים"><span class="qf-t">מועדפים</span>${QUICK.map(n => `<button class="${l.font === n ? 'on' : ''}" data-font="${n}" style="font-family:'${n}',sans-serif" title="${n}">אבג</button>`).join('')}</div>`;
}

function textPanel(c, l){
  const sh = (l.sh && l.sh[0]) || {x:0, y:0, b:0, c:'#000000'};
  return sec('גופן', fontSection(c, l), true, 'type', 'a')
  + sec('גודל ויישור', `
    ${rng(c.esc, 'גודל', 'size', 8, 400, 1, l.size, 'px')}
    <div class="seg" role="group" aria-label="יישור">
      <button data-al="right" aria-pressed="${l.align === 'right'}" aria-label="יישור לימין">${ic('alr')}<span>ימין</span></button>
      <button data-al="center" aria-pressed="${l.align === 'center'}" aria-label="מרכוז">${ic('alc')}<span>מרכז</span></button>
      <button data-al="left" aria-pressed="${l.align === 'left'}" aria-label="יישור לשמאל">${ic('all')}<span>שמאל</span></button>
    </div>`, true, 'sub', 'b')
  + sec('צבע ומילוי', `
    ${clr('צבע הטקסט', 'color', l.color)}${swatches(c, 'color', l.fill === 'solid' ? l.color : '')}
    <div class="gf" role="group" aria-label="מילוי מיוחד"><button data-fill="solid" class="${l.fill === 'solid' ? 'on' : ''}"><i class="gf-s" style="background:${toHex(l.color)}"></i><span>אחיד</span></button>${Object.entries(c.GRADS).map(([id, g]) => `<button data-fill="${id}" class="${l.fill === id ? 'on' : ''}"><i class="gf-s" style="background:${g[1]}"></i><span>${g[0]}</span></button>`).join('')}</div>`, true, 'palette', 'c')
  + sec('ריווח ושקיפות', `${rng(c.esc, 'מרווח בין אותיות', 'ls', -5, 40, 1, l.ls)}${rng(c.esc, 'מרווח בין שורות', 'lh', .7, 2.6, .05, l.lh)}${rng(c.esc, 'שקיפות', 'op', .1, 1, .05, l.op == null ? 1 : l.op)}`, false, 'move', 'd')
  + sec('אפקטים', `
    <div class="fxg" role="group" aria-label="אפקטים מוכנים">${fxTiles(c)}</div>
    <h4>צל</h4>${rng(c.esc, 'הזזה אופקית', 'sh.0.x', -40, 40, 1, sh.x)}${rng(c.esc, 'הזזה אנכית', 'sh.0.y', -40, 40, 1, sh.y)}${rng(c.esc, 'טשטוש', 'sh.0.b', 0, 80, 1, sh.b)}${clr('צבע הצל', 'sh.0.c', sh.c)}
    <h4>קו מתאר</h4>${rng(c.esc, 'עובי', 'stroke.w', 0, 14, .5, (l.stroke && l.stroke.w) || 0)}${clr('צבע הקו', 'stroke.c', (l.stroke && l.stroke.c) || '#ffffff')}
    <div class="tg"><button class="pill" data-t="hollow" aria-pressed="${!!l.hollow}">טקסט חלול</button></div>
    <h4>סימון רקע</h4>${clr('צבע הסימון', 'hl', l.hl || '#ffe45e')}<div class="tg"><button class="pill" data-hl="on">הפעלה</button><button class="pill" data-hl="off">ביטול</button></div>`, false, 'sparkle', 'e');
}
function imagePanel(c, l){
  return sec('תמונה', `${rng(c.esc, 'שקיפות', 'op', .1, 1, .05, l.op == null ? 1 : l.op)}${rng(c.esc, 'עיגול פינות', 'r', 0, 500, 1, l.r || 0)}
    <div class="tg"><button class="pill" data-t="flip" aria-pressed="${!!l.flip}">היפוך</button><button class="pill" data-a2="replace">החלפת תמונה</button></div><input type="file" id="repFile" accept="image/*" hidden>`, true, 'image', 'b');
}
function shapePanel(c, l){
  return sec('צורה', `${clr('צבע מילוי', 'fill', l.fill)}${swatches(c, 'fill', l.fill)}${clr('צבע מסגרת', 'bc', l.bc)}${rng(c.esc, 'עובי מסגרת', 'bw', 0, 40, 1, l.bw)}
    ${l.kind === 'rect' || l.kind === 'frame' ? rng(c.esc, 'עיגול פינות', 'r', 0, 200, 1, l.r) : ''}${rng(c.esc, 'רוחב', 'w', 10, 1600, 1, l.w)}${rng(c.esc, 'גובה', 'h', 2, 1600, 1, l.h)}${rng(c.esc, 'שקיפות', 'op', .05, 1, .05, l.op == null ? 1 : l.op)}`, true, 'shape', 'c');
}
function arrangePanel(c, l){
  return sec('סידור ופעולות', `
    <div class="acts" role="group" aria-label="יישור לדף">
      <button data-arr="h">${ic('alc')}<span>מרכז אופקי</span></button><button data-arr="v">${ic('aligns')}<span>מרכז אנכי</span></button>
      <button data-arr="top">${ic('fit')}<span>למעלה</span></button><button data-arr="bottom">${ic('fit')}<span>למטה</span></button></div>
    <div class="acts" role="group" aria-label="שכבות">
      <button data-arr="front">${ic('front')}<span>קדימה</span></button><button data-arr="back">${ic('back')}<span>אחורה</span></button>
      <button data-arr="dup">${ic('copy')}<span>שכפול</span></button><button data-arr="lock" aria-pressed="${!!l.lock}">${ic('lock')}<span>${l.lock ? 'שחרור' : 'נעילה'}</span></button>
      <button data-arr="del" class="danger">${ic('trash')}<span>מחיקה</span></button></div>
    ${rng(c.esc, 'סיבוב', 'rot', -180, 180, 1, Math.round(l.rot || 0), '°')}`, false, 'arrange', 'd');
}
function emptyPanel(c){
  const st = c.styleById(c.S.style);
  return `<div class="empty-p"><div class="ep-hero"><span class="ep-bubble">${ic('wand')}</span><h3>מתחילים לעצב</h3>
    <p>לוחצים על טקסט כדי לערוך אותו, או מוסיפים משהו חדש:</p></div>
    <div class="tiles"><button data-addp="title" class="t1"><span>${ic('title')}</span><b>כותרת</b><small>גדולה ובולטת</small></button><button data-addp="sub" class="t2"><span>${ic('sub')}</span><b>כותרת משנה</b><small>שורת הסבר</small></button><button data-addp="body" class="t3"><span>${ic('body')}</span><b>פסקה</b><small>פרטים וטקסט</small></button><button data-addp="image" class="t4"><span>${ic('image')}</span><b>תמונה</b><small>לוגו או צילום</small></button></div>
    ${st ? '' : `<div class="ep-bg"><label class="pc pc-c"><span>צבע הרקע</span><span class="cpick" style="--c:${toHex(c.S.bg)}"><input type="color" data-bg="1" value="${toHex(c.S.bg)}" aria-label="צבע הרקע"><code>${toHex(c.S.bg)}</code></span></label>${swatches(c, 'bg', c.S.bg)}</div>`}
    ${st && st.ribbon && c.isPortrait() ? '<button class="ribbon-btn" data-a2="ribbon">החלפת הכיתוב שעל הסרט</button>' : ''}
    <ul class="tips"><li>${ic('hand')}לחיצה כפולה על טקסט: עריכה</li><li>${ic('arrange')}הידית שמעל התיבה: סיבוב</li><li>${ic('move')}חצים במקלדת: הזזה עדינה (Shift: מהירה)</li><li>${ic('undo')}Ctrl+Z: ביטול</li></ul>
    <button class="btn-ghost" data-a2="reset">${ic('undo')}התחלה מחדש</button></div>`;
}
function layersPanel(c){
  const rows = c.S.layers.slice().reverse().map(l => {
    const name = l.type === 'text' ? (l.text.split('\n')[0] || 'טקסט').slice(0, 24) : l.type === 'image' ? 'תמונה' : 'צורה: ' + ({rect:'מלבן', circle:'עיגול', line:'קו', star:'כוכב', heart:'לב', frame:'מסגרת'}[l.kind] || '');
    const kind = l.type === 'text' ? 'type' : l.type === 'image' ? 'image' : 'shape';
    return `<li class="lr${c.S.sel === l.id ? ' on' : ''}"><button class="lr-n" data-sel="${l.id}" aria-pressed="${c.S.sel === l.id}">${ic(kind)}<span>${c.esc(name)}</span></button><button data-lr="up:${l.id}" aria-label="קדימה" title="קדימה">▲</button><button data-lr="down:${l.id}" aria-label="אחורה" title="אחורה">▼</button><button data-lr="lock:${l.id}" aria-pressed="${!!l.lock}" aria-label="נעילה" title="נעילה">${ic('lock')}</button><button data-lr="del:${l.id}" class="danger" aria-label="מחיקה" title="מחיקה">${ic('trash')}</button></li>`;
  }).join('');
  return `<ul class="layers" aria-label="שכבות">${rows || '<li class="muted">אין שכבות</li>'}</ul>`;
}

/* ---------- בניית הפאנל ---------- */
function build(c){
  const l = c.cur(), panel = c.panel;
  const tabs = `<div class="pt" role="tablist"><button role="tab" data-tab="props" aria-selected="${tab === 'props'}">${ic('palette')}<span>עיצוב</span></button><button role="tab" data-tab="layers" aria-selected="${tab === 'layers'}">${ic('layers')}<span>שכבות</span><em>${c.S.layers.length}</em></button></div>`;
  let body;
  if(tab === 'layers') body = layersPanel(c);
  else if(!l) body = emptyPanel(c);
  else body = (l.type === 'text' ? textPanel(c, l) : l.type === 'image' ? imagePanel(c, l) : shapePanel(c, l)) + arrangePanel(c, l);
  const keep = panel.scrollTop;
  const open = [...panel.querySelectorAll('details.ps')].map(d => d.open);
  panel.innerHTML = tabs + `<div class="pb">${body}</div>`;
  if(open.length) [...panel.querySelectorAll('details.ps')].forEach((d, i) => { if(i < open.length) d.open = open[i]; });
  panel.scrollTop = keep;
  bind(c);
}
function sync(c){
  const l = c.cur(); if(!l) return;
  c.$$(c.panel, '[data-k]').forEach(el => {
    if(el === document.activeElement) return;
    const v = getP(l, el.dataset.k); if(v == null) return;
    el.value = el.type === 'color' ? toHex(v) : v;
    if(el.type === 'range') el.style.setProperty('--p', pct(+el.value, +el.min, +el.max) + '%');
    if(el.type === 'color'){ const cp = el.parentElement; cp.style.setProperty('--c', el.value); const cd = cp.querySelector('code'); if(cd) cd.textContent = el.value; }
    const o = el.nextElementSibling; if(o && o.tagName === 'OUTPUT') o.textContent = el.value + (el.dataset.k === 'rot' ? '°' : el.dataset.k === 'size' ? 'px' : '');
  });
}

/* ---------- אירועים ---------- */
function bind(c){
  const p = c.panel; let pushT = 0;
  const apply = () => { const l = c.cur(); if(l){ c.paint(l); c.drawSel(); } };
  const commit = () => { clearTimeout(pushT); pushT = setTimeout(() => c.push(), 250); };
  const F = window.MadlikFonts;
  const setFont = (l, name) => {
    l.font = name; apply();
    if(F) F.ensure(name).then(() => { apply(); build(c); });
    c.push(); build(c); c.say('הגופן הוחלף ל' + name);
  };
  const setBold = (l, on) => { l.bold = on; l.weight = on ? 700 : 400; apply(); c.push(); build(c); };
  p.oninput = e => {
    const t = e.target, l = c.cur();
    if(t.dataset.bg){ c.S.bg = t.value; c.fullRender(); const cp = t.parentElement; cp.style.setProperty('--c', t.value); const cd = cp.querySelector('code'); if(cd) cd.textContent = t.value; return; }
    if(!l || !t.dataset.k) return;
    const key = t.dataset.k; let v = t.type === 'range' ? parseFloat(t.value) : t.value;
    if(key.startsWith('sh.') && !(l.sh && l.sh[0])) l.sh = [{x:0, y:4, b:10, c:'#000000'}];
    if(key === 'stroke.w' && !l.stroke) l.stroke = {w:0, c:'#ffffff'};
    setP(l, key, v);
    if(key === 'hl') l.hl = v;
    if(t.type === 'range') t.style.setProperty('--p', pct(+t.value, +t.min, +t.max) + '%');
    if(t.type === 'color'){ const cp = t.parentElement; cp.style.setProperty('--c', t.value); const cd = cp.querySelector('code'); if(cd) cd.textContent = t.value; }
    const o = t.nextElementSibling; if(o && o.tagName === 'OUTPUT') o.textContent = t.value + (key === 'rot' ? '°' : key === 'size' ? 'px' : '');
    apply(); commit();
  };
  p.onclick = e => {
    const l = c.cur(), b = e.target.closest('button'); if(!b) return;
    if(b.dataset.tab){ tab = b.dataset.tab; build(c); return; }
    if(b.dataset.sel){ c.select(b.dataset.sel); return; }
    if(b.dataset.lr){ const [a, id] = b.dataset.lr.split(':'), t = c.layer(id); if(!t) return;
      if(a === 'up') c.order(t, 1); else if(a === 'down') c.order(t, -1); else if(a === 'lock'){ t.lock = !t.lock; c.push(); build(c); c.paint(t); } else if(a === 'del') c.remove(t); build(c); return; }
    if(b.dataset.addp){ if(b.dataset.addp === 'image') c.root.querySelector('#edFile').click(); else c.addText(b.dataset.addp); return; }
    if(b.dataset.a2 === 'reset'){ c.reset(); return; }
    if(b.dataset.a2 === 'ribbon'){ c.addRibbon(); return; }
    if(!l) return;
    if(b.dataset.a3 === 'fonts' && F){ F.open({font:l.font, text:l.text, weight:l.weight, bold:l.bold, he:true, onPick:n => { const cl = c.cur(); if(cl) setFont(cl, n); }, onBold:on => { const cl = c.cur(); if(cl){ cl.bold = on; cl.weight = on ? 700 : 400; apply(); c.push(); } }}); return; }
    if(b.dataset.font){ setFont(l, b.dataset.font); return; }
    if(b.dataset.w){ l.weight = +b.dataset.w; l.bold = l.weight >= 600; apply(); c.push(); build(c); return; }
    if(b.dataset.t){ const k = b.dataset.t;
      if(k === 'bold'){ setBold(l, !(l.weight ? l.weight >= 600 : l.bold)); return; }
      l[k] = !l[k]; if(k === 'hollow' && l.hollow && !(l.stroke && l.stroke.w)) l.stroke = {w:3, c:l.color}; apply(); c.push(); build(c); return; }
    if(b.dataset.al){ l.align = b.dataset.al; apply(); c.push(); build(c); return; }
    if(b.dataset.fill){ l.fill = b.dataset.fill; if(l.fill !== 'solid') l.hollow = false; apply(); c.push(); build(c); return; }
    if(b.dataset.fx){ const f = c.FX[b.dataset.fx]; if(f){ f[1](l); apply(); c.push(); build(c); c.say('אפקט: ' + f[0]); } return; }
    if(b.dataset.hl){ l.hl = b.dataset.hl === 'on' ? (c.$(p, '[data-k=hl]') ? c.$(p, '[data-k=hl]').value : '#ffe45e') : ''; apply(); c.push(); build(c); return; }
    if(b.dataset.sw){ const t = b.dataset.for; if(t === 'bg'){ c.S.bg = b.dataset.sw; c.fullRender(); c.push(); build(c); } else { if(l.type === 'text' && t === 'color'){ l.color = b.dataset.sw; l.fill = 'solid'; l.hollow = false; } else l[t] = b.dataset.sw; apply(); c.push(); build(c); } return; }
    if(b.dataset.a2 === 'replace'){ const f = c.$(p, '#repFile'); f.onchange = ev => replaceImage(c, l, ev.target.files[0]); f.click(); return; }
    if(b.dataset.arr){ const a = b.dataset.arr;
      if(a === 'h' || a === 'v' || a === 'top' || a === 'bottom') c.alignPage(l, a);
      else if(a === 'front') c.order(l, 1); else if(a === 'back') c.order(l, -1);
      else if(a === 'dup') c.dup(l); else if(a === 'del') c.remove(l);
      else if(a === 'lock'){ l.lock = !l.lock; c.push(); c.paint(l); c.drawSel(); build(c); }
      return; }
  };
}
function replaceImage(c, l, file){
  if(!file) return; const rd = new FileReader();
  rd.onload = () => { const im = new Image(); im.onload = () => {
    const f = Math.min(1, 1400 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.round(im.width*f); cv.height = Math.round(im.height*f);
    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
    const aid = 'a' + Math.random().toString(36).slice(2,7); c.S.assets[aid] = file.type === 'image/png' ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', .9);
    l.src = aid; c.paint(l); c.drawSel(); c.push(); };
    im.src = rd.result; };
  rd.readAsDataURL(file);
}

return {build, sync};
})();
