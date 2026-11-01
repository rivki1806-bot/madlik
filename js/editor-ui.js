// מדליק – פאנל ההגדרות של עורך העיצוב: גופנים, צבעים, אפקטים, סידור ושכבות
window.MadlikEditorUI = (function(){
'use strict';

let tab = 'props', fontQ = '';
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

/* ---------- בניית חלקים ---------- */
const rng = (esc, label, key, min, max, step, val, unit) =>
  `<label class="pc"><span>${label}</span><input type="range" data-k="${key}" min="${min}" max="${max}" step="${step}" value="${val}" aria-label="${label}"><output>${val}${unit || ''}</output></label>`;
const clr = (label, key, val) => `<label class="pc pc-c"><span>${label}</span><input type="color" data-k="${key}" value="${toHex(val)}" aria-label="${label}"></label>`;
const sec = (title, body, open) => `<details class="ps" ${open === false ? '' : 'open'}><summary>${title}</summary><div class="ps-b">${body}</div></details>`;

function swatches(c, target){
  const st = c.styleById(c.S.style), pal = (st ? st.palette : []).concat(c.SWATCHES.filter(x => !(st && st.palette.includes(x))));
  return `<div class="sw-row" role="group" aria-label="צבעים מהירים">${pal.map(x => `<button class="sw" data-sw="${x}" data-for="${target}" style="background:${x}" aria-label="צבע ${x}" title="${x}"></button>`).join('')}</div>`;
}

function fontList(c, l){
  const q = fontQ.trim().toLowerCase(); let html = '';
  c.FONTS.forEach(([g, list]) => {
    const items = list.filter(n => !q || n.toLowerCase().includes(q) || g.includes(q));
    if(!items.length) return;
    html += `<div class="fg">${g}</div>` + items.map(n => `<button class="fb${l.font === n ? ' on' : ''}" data-font="${n}" style="font-family:'${n}',sans-serif" aria-pressed="${l.font === n}"><span>אבגד שלום</span><small>${n}</small></button>`).join('');
  });
  return html || '<p class="muted">לא נמצא גופן בשם הזה.</p>';
}

function textPanel(c, l){
  const sh = (l.sh && l.sh[0]) || {x:0, y:0, b:0, c:'#000000'};
  return sec('גופן', `<input type="search" class="fq" id="fq" placeholder="חיפוש גופן..." value="${c.esc(fontQ)}" aria-label="חיפוש גופן"><div class="flist" id="flist" role="listbox" aria-label="רשימת גופנים">${fontList(c, l)}</div>`)
  + sec('גודל וסגנון', `
    ${rng(c.esc, 'גודל', 'size', 8, 400, 1, l.size, 'px')}
    <div class="tg" role="group" aria-label="עיצוב טקסט">
      <button data-t="bold" aria-pressed="${!!l.bold}" aria-label="מודגש"><b>ב</b></button>
      <button data-t="italic" aria-pressed="${!!l.italic}" aria-label="נטוי"><i>נ</i></button>
      <button data-t="u" aria-pressed="${!!l.u}" aria-label="קו תחתון"><u>ק</u></button>
      <button data-t="s" aria-pressed="${!!l.s}" aria-label="קו חוצה"><s>ח</s></button>
      <span class="sep"></span>
      <button data-al="right" aria-pressed="${l.align === 'right'}" aria-label="יישור לימין">ימין</button>
      <button data-al="center" aria-pressed="${l.align === 'center'}" aria-label="מרכוז">מרכז</button>
      <button data-al="left" aria-pressed="${l.align === 'left'}" aria-label="יישור לשמאל">שמאל</button>
    </div>`)
  + sec('צבע ומילוי', `
    ${clr('צבע הטקסט', 'color', l.color)}${swatches(c, 'color')}
    <div class="chips" role="group" aria-label="מילוי מיוחד"><button data-fill="solid" class="${l.fill === 'solid' ? 'on' : ''}">צבע אחיד</button>${Object.entries(c.GRADS).map(([id, g]) => `<button data-fill="${id}" class="${l.fill === id ? 'on' : ''}" style="background:${g[1]};color:#111">${g[0]}</button>`).join('')}</div>`)
  + sec('ריווח', `${rng(c.esc, 'מרווח בין אותיות', 'ls', -5, 40, 1, l.ls)}${rng(c.esc, 'מרווח בין שורות', 'lh', .7, 2.6, .05, l.lh)}${rng(c.esc, 'שקיפות', 'op', .1, 1, .05, l.op == null ? 1 : l.op)}`, false)
  + sec('אפקטים', `
    <div class="chips" role="group" aria-label="אפקטים מוכנים">${Object.entries(c.FX).map(([id, f]) => `<button data-fx="${id}">${f[0]}</button>`).join('')}</div>
    <h4>צל</h4>${rng(c.esc, 'הזזה אופקית', 'sh.0.x', -40, 40, 1, sh.x)}${rng(c.esc, 'הזזה אנכית', 'sh.0.y', -40, 40, 1, sh.y)}${rng(c.esc, 'טשטוש', 'sh.0.b', 0, 80, 1, sh.b)}${clr('צבע הצל', 'sh.0.c', sh.c)}
    <h4>קו מתאר</h4>${rng(c.esc, 'עובי', 'stroke.w', 0, 14, .5, (l.stroke && l.stroke.w) || 0)}${clr('צבע הקו', 'stroke.c', (l.stroke && l.stroke.c) || '#ffffff')}
    <div class="tg"><button data-t="hollow" aria-pressed="${!!l.hollow}">טקסט חלול</button></div>
    <h4>סימון רקע</h4>${clr('צבע הסימון', 'hl', l.hl || '#ffe45e')}<div class="tg"><button data-hl="on">הפעלה</button><button data-hl="off">ביטול</button></div>`, false);
}
function imagePanel(c, l){
  return sec('תמונה', `${rng(c.esc, 'שקיפות', 'op', .1, 1, .05, l.op == null ? 1 : l.op)}${rng(c.esc, 'עיגול פינות', 'r', 0, 500, 1, l.r || 0)}
    <div class="tg"><button data-t="flip" aria-pressed="${!!l.flip}">היפוך</button><button data-a2="replace">החלפת תמונה</button></div><input type="file" id="repFile" accept="image/*" hidden>`);
}
function shapePanel(c, l){
  return sec('צורה', `${clr('צבע מילוי', 'fill', l.fill)}${swatches(c, 'fill')}${clr('צבע מסגרת', 'bc', l.bc)}${rng(c.esc, 'עובי מסגרת', 'bw', 0, 40, 1, l.bw)}
    ${l.kind === 'rect' || l.kind === 'frame' ? rng(c.esc, 'עיגול פינות', 'r', 0, 200, 1, l.r) : ''}${rng(c.esc, 'רוחב', 'w', 10, 1600, 1, l.w)}${rng(c.esc, 'גובה', 'h', 2, 1600, 1, l.h)}${rng(c.esc, 'שקיפות', 'op', .05, 1, .05, l.op == null ? 1 : l.op)}`);
}
function arrangePanel(c, l){
  return sec('סידור', `
    <div class="chips" role="group" aria-label="יישור לדף"><button data-arr="h">מרכז אופקי</button><button data-arr="v">מרכז אנכי</button><button data-arr="top">למעלה</button><button data-arr="bottom">למטה</button></div>
    <div class="chips" role="group" aria-label="סדר שכבות"><button data-arr="front">קדימה</button><button data-arr="back">אחורה</button><button data-arr="dup">שכפול</button><button data-arr="lock" aria-pressed="${!!l.lock}">${l.lock ? 'שחרור נעילה' : 'נעילה'}</button><button data-arr="del" class="danger">מחיקה</button></div>
    ${rng(c.esc, 'סיבוב', 'rot', -180, 180, 1, Math.round(l.rot || 0), '°')}`, false);
}
function emptyPanel(c){
  const st = c.styleById(c.S.style);
  return `<div class="empty-p"><h3>מתחילים לעצב</h3>
    <p>לוחצים על טקסט כדי לערוך אותו, או מוסיפים משהו חדש:</p>
    <div class="tiles"><button data-addp="title"><b>כ</b>כותרת</button><button data-addp="sub"><b>מ</b>כותרת משנה</button><button data-addp="body"><b>פ</b>פסקה</button><button data-addp="image"><b>▣</b>תמונה</button></div>
    ${st ? '' : `<label class="pc pc-c"><span>צבע הרקע</span><input type="color" data-bg="1" value="${toHex(c.S.bg)}" aria-label="צבע הרקע"></label>${swatches(c, 'bg')}`}
    ${st && st.ribbon && c.isPortrait() ? '<button class="ribbon-btn" data-a2="ribbon">החלפת הכיתוב שעל הסרט</button>' : ''}
    <ul class="tips"><li>לחיצה כפולה על טקסט: עריכה</li><li>הידית שמעל התיבה: סיבוב</li><li>חצים במקלדת: הזזה עדינה (עם Shift: מהירה)</li><li>Ctrl+Z: ביטול</li></ul>
    <button class="btn-ghost" data-a2="reset">התחלה מחדש</button></div>`;
}
function layersPanel(c){
  const rows = c.S.layers.slice().reverse().map(l => {
    const name = l.type === 'text' ? (l.text.split('\n')[0] || 'טקסט').slice(0, 24) : l.type === 'image' ? 'תמונה' : 'צורה: ' + ({rect:'מלבן', circle:'עיגול', line:'קו', star:'כוכב', heart:'לב', frame:'מסגרת'}[l.kind] || '');
    return `<li class="lr${c.S.sel === l.id ? ' on' : ''}"><button class="lr-n" data-sel="${l.id}" aria-pressed="${c.S.sel === l.id}">${c.esc(name)}</button><button data-lr="up:${l.id}" aria-label="קדימה">▲</button><button data-lr="down:${l.id}" aria-label="אחורה">▼</button><button data-lr="lock:${l.id}" aria-pressed="${!!l.lock}" aria-label="נעילה">${l.lock ? '🔒' : '🔓'}</button><button data-lr="del:${l.id}" aria-label="מחיקה">✕</button></li>`;
  }).join('');
  return `<ul class="layers" aria-label="שכבות">${rows || '<li class="muted">אין שכבות</li>'}</ul>`;
}

/* ---------- בניית הפאנל ---------- */
function build(c){
  const l = c.cur(), panel = c.panel;
  const tabs = `<div class="pt" role="tablist"><button role="tab" data-tab="props" aria-selected="${tab === 'props'}">עיצוב</button><button role="tab" data-tab="layers" aria-selected="${tab === 'layers'}">שכבות (${c.S.layers.length})</button></div>`;
  let body;
  if(tab === 'layers') body = layersPanel(c);
  else if(!l) body = emptyPanel(c);
  else body = (l.type === 'text' ? textPanel(c, l) : l.type === 'image' ? imagePanel(c, l) : shapePanel(c, l)) + arrangePanel(c, l);
  const keep = panel.scrollTop;
  panel.innerHTML = tabs + `<div class="pb">${body}</div>`;
  panel.scrollTop = keep;
  bind(c);
}
function sync(c){
  const l = c.cur(); if(!l) return;
  c.$$(c.panel, '[data-k]').forEach(el => {
    if(el === document.activeElement) return;
    const v = getP(l, el.dataset.k); if(v == null) return;
    el.value = el.type === 'color' ? toHex(v) : v;
    const o = el.nextElementSibling; if(o && o.tagName === 'OUTPUT') o.textContent = el.value + (el.dataset.k === 'rot' ? '°' : el.dataset.k === 'size' ? 'px' : '');
  });
}

/* ---------- אירועים ---------- */
function bind(c){
  const p = c.panel; let pushT = 0;
  const apply = () => { const l = c.cur(); if(l){ c.paint(l); c.drawSel(); } };
  const commit = () => { clearTimeout(pushT); pushT = setTimeout(() => c.push(), 250); };
  p.oninput = e => {
    const t = e.target, l = c.cur();
    if(t.dataset.bg){ c.S.bg = t.value; c.fullRender(); return; }
    if(t.id === 'fq'){ fontQ = t.value; const fl = c.$(p, '#flist'); if(fl && l) fl.innerHTML = fontList(c, l); return; }
    if(!l || !t.dataset.k) return;
    const key = t.dataset.k; let v = t.type === 'range' ? parseFloat(t.value) : t.value;
    if(key.startsWith('sh.') && !(l.sh && l.sh[0])) l.sh = [{x:0, y:4, b:10, c:'#000000'}];
    if(key === 'stroke.w' && !l.stroke) l.stroke = {w:0, c:'#ffffff'};
    setP(l, key, v);
    if(key === 'hl') l.hl = v;
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
    if(b.dataset.font){ l.font = b.dataset.font; try{ document.fonts.load(`16px "${l.font}"`); }catch(x){} apply(); c.push(); build(c); c.say('הגופן הוחלף ל' + l.font); return; }
    if(b.dataset.t){ const k = b.dataset.t; l[k] = !l[k]; if(k === 'hollow' && l.hollow && !(l.stroke && l.stroke.w)) l.stroke = {w:3, c:l.color}; apply(); c.push(); build(c); return; }
    if(b.dataset.al){ l.align = b.dataset.al; apply(); c.push(); build(c); return; }
    if(b.dataset.fill){ l.fill = b.dataset.fill; if(l.fill !== 'solid') l.hollow = false; apply(); c.push(); build(c); return; }
    if(b.dataset.fx){ const f = c.FX[b.dataset.fx]; if(f){ f[1](l); apply(); c.push(); build(c); c.say('אפקט: ' + f[0]); } return; }
    if(b.dataset.hl){ l.hl = b.dataset.hl === 'on' ? (c.$(p, '[data-k=hl]') ? c.$(p, '[data-k=hl]').value : '#ffe45e') : ''; apply(); c.push(); build(c); return; }
    if(b.dataset.sw){ const t = b.dataset.for; if(t === 'bg'){ c.S.bg = b.dataset.sw; c.fullRender(); c.push(); } else { if(l.type === 'text' && t === 'color'){ l.color = b.dataset.sw; l.fill = 'solid'; l.hollow = false; } else l[t] = b.dataset.sw; apply(); c.push(); build(c); } return; }
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
