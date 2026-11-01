// מדליק – עורך עיצוב: טקסט חופשי, גרירה, סיבוב, אפקטים, תמונות וצורות, והורדה
window.MadlikEditor = (function(){
'use strict';

const W = 1000;                                     // רוחב הקנבס הלוגי; כל המידות ביחס אליו
const D = () => window.MADLIK_DATA || {};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const uid = () => 'l' + Math.random().toString(36).slice(2,8);
const $ = (r,s) => r.querySelector(s);
const $$ = (r,s) => [...r.querySelectorAll(s)];
const lsGet = (k,d) => { try{ const v = localStorage.getItem('madlik_'+k); return v ? JSON.parse(v) : d; }catch(e){ return d; } };
const lsSet = (k,v) => { try{ localStorage.setItem('madlik_'+k, JSON.stringify(v)); return true; }catch(e){ return false; } };

/* ---------- גופנים ---------- */
const FONTS = [
  ['קלאסיים', ['Frank Ruhl Libre','David Libre','Miriam Libre','Noto Serif Hebrew','Bellefair','Tinos','Bona Nova','Noto Rashi Hebrew']],
  ['מודרניים', ['Assistant','Heebo','Rubik','Alef','Open Sans','Arimo','Noto Sans Hebrew','IBM Plex Sans Hebrew','Cousine','Fredoka','Varela Round','M PLUS Rounded 1c']],
  ['כותרות', ['Secular One','Suez One','Karantina','Amatic SC']],
  ['כתב יד', ['Gveret Levin','Playpen Sans Hebrew']],
  ['עיצוביים', ['Rubik Bubbles','Rubik Dirt','Rubik Distressed','Rubik Glitch','Rubik Gemstones','Rubik Marker Hatch','Rubik Maze','Rubik Microbe','Rubik Moonrocks','Rubik Pixels','Rubik Puddles','Rubik Spray Paint','Rubik Vinyl','Rubik Wet Paint','Rubik Beastly','Rubik Burned','Rubik 80s Fade','Rubik Iso','Rubik Lines','Rubik Scribble','Rubik Storm','Rubik Doodle Shadow','Rubik Doodle Triangles','Rubik Broken Fax','Rubik Glitch Pop','Rubik Maps']]
];
const WEIGHTS = new Set(['Assistant','Heebo','Rubik','Alef','Open Sans','Frank Ruhl Libre','David Libre','Miriam Libre','Noto Serif Hebrew','Noto Sans Hebrew','Tinos','Arimo','Cousine','IBM Plex Sans Hebrew','Fredoka','Playpen Sans Hebrew']);
let fontsLinked = false;
function loadFonts(){
  if(fontsLinked) return; fontsLinked = true;
  const q = FONTS.flatMap(g=>g[1]).map(n => 'family=' + n.replace(/ /g,'+') + (WEIGHTS.has(n) ? ':wght@400;700' : ''));
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?' + q.join('&') + '&display=swap';
  document.head.appendChild(l);
}

/* ---------- גדלים, מילויים ואפקטים ---------- */
const FORMATS = [
  {id:'poster', n:'פוסטר A4', w:210, h:297},
  {id:'invite', n:'הזמנה A5', w:148, h:210},
  {id:'menu',   n:'תפריט A5', w:148, h:210},
  {id:'sign',   n:'שלט לרוחב A4', w:297, h:210},
  {id:'square', n:'ריבוע', w:210, h:210},
  {id:'card',   n:'כרטיס ברכה', w:148, h:105}
];
const GRADS = {
  gold:   ['זהב',      'linear-gradient(180deg,#fff3c4 0%,#ecc660 42%,#a8761c 100%)'],
  rose:   ['רוז גולד', 'linear-gradient(180deg,#ffe4dc 0%,#e8a79a 48%,#b86a63 100%)'],
  silver: ['כסף',      'linear-gradient(180deg,#ffffff 0%,#c4cad6 50%,#7e8696 100%)'],
  sunset: ['שקיעה',    'linear-gradient(90deg,#ff6a00,#ff3d81)'],
  ocean:  ['ים',       'linear-gradient(90deg,#2f80ed,#14c4d4)'],
  wine:   ['יין',      'linear-gradient(180deg,#a8325e,#4e0f26)']
};
const FX = {
  plain:  ['רגיל',        l => { l.sh = []; l.stroke = {w:0,c:'#ffffff'}; l.hollow = false; if(l.fill !== 'solid') l.fill = 'solid'; }],
  soft:   ['צל רך',       l => { l.sh = [{x:0,y:5,b:16,c:'rgba(0,0,0,.38)'}]; }],
  hard:   ['צל קשה',      l => { l.sh = [{x:6,y:6,b:0,c:'rgba(0,0,0,.55)'}]; }],
  lift:   ['הבלטה',       l => { l.sh = [{x:1,y:1,b:0,c:'rgba(0,0,0,.45)'},{x:3,y:3,b:0,c:'rgba(0,0,0,.3)'},{x:5,y:6,b:8,c:'rgba(0,0,0,.25)'}]; }],
  glow:   ['הילה',        l => { const c = l.fill === 'solid' ? l.color : '#ffd36a'; l.sh = [{x:0,y:0,b:16,c},{x:0,y:0,b:40,c}]; }],
  neon:   ['ניאון',       l => { l.fill = 'solid'; l.color = '#ffffff'; l.sh = [{x:0,y:0,b:6,c:'#ffffff'},{x:0,y:0,b:22,c:'#ff2d95'},{x:0,y:0,b:46,c:'#ff2d95'}]; }],
  outline:['קו מתאר',     l => { l.hollow = true; l.fill = 'solid'; l.stroke = {w:3,c: l.color}; l.sh = []; }],
  retro:  ['רטרו',        l => { l.fill = 'solid'; l.color = '#ffd23f'; l.sh = [{x:4,y:4,b:0,c:'#e4572e'},{x:8,y:8,b:0,c:'#1a56b0'}]; }],
  gold:   ['זהב',         l => { l.fill = 'gold'; l.hollow = false; l.sh = [{x:0,y:3,b:10,c:'rgba(60,30,0,.45)'}]; }],
  silver: ['כסף',         l => { l.fill = 'silver'; l.hollow = false; l.sh = [{x:0,y:3,b:10,c:'rgba(0,0,0,.4)'}]; }]
};
const SWATCHES = ['#ffffff','#f7f2e8','#111111','#4e0f26','#d4a64a','#e4572e','#ff6a00','#1a56b0','#2f80ed','#14a38a','#7b57c9','#ec008c'];
const PRESETS = {
  title: {text:'כותרת', size:84, w:760, font:'Frank Ruhl Libre', bold:true},
  sub:   {text:'כותרת משנה', size:44, w:700, font:'Assistant', bold:false},
  body:  {text:'כאן כותבים את הפרטים.\nאפשר לגרור, לסובב ולשנות הכול.', size:30, w:640, font:'Assistant', bold:false}
};

/* ---------- ברירות מחדל לכל סגנון וגודל ---------- */
function styleById(id){ return (D().styles || []).find(s => s.id === id) || null; }
function fmtById(id){ return FORMATS.find(f => f.id === id) || FORMATS[0]; }
const TEXTS = {
  poster:['ערב לביבות','כולן מוזמנות · הכניסה חופשית'],
  invite:['ערב לביבות','כ״ז בכסלו · 20:00 · האולם הקהילתי'],
  menu:  ['התפריט שלנו','לביבות · סופגניות · שתייה חמה'],
  sign:  ['ברוכות הבאות','לערב הלביבות השנתי'],
  square:['ערב לביבות','חנוכה תשפ״ז'],
  card:  ['תודה רבה!','שהדלקתן איתנו את הערב']
};
function newText(o){
  return Object.assign({id:uid(), type:'text', text:'טקסט', x:W/2, y:300, w:700, rot:0, font:'Assistant', size:44, bold:false, italic:false, u:false, s:false, align:'center',
    color:'#111111', fill:'solid', ls:0, lh:1.15, op:1, sh:[], stroke:{w:0,c:'#ffffff'}, hollow:false, hl:'', lock:false}, o||{});
}
function newShape(kind, o){
  const base = {id:uid(), type:'shape', kind, x:W/2, y:400, w:260, h:260, rot:0, fill:'#d4a64a', bc:'#ffffff', bw:0, r:0, op:1, lock:false};
  if(kind === 'line'){ base.w = 520; base.h = 6; }
  if(kind === 'frame'){ base.w = 700; base.h = 500; base.fill = 'transparent'; base.bw = 6; base.bc = '#d4a64a'; base.r = 14; }
  if(kind === 'rect'){ base.w = 520; base.h = 240; base.r = 14; }
  return Object.assign(base, o||{});
}
function defaultLayers(style, fmt){
  const H = Math.round(W * fmt.h / fmt.w), [t, d] = TEXTS[fmt.id] || TEXTS.poster, out = [];
  const portrait = H / W >= 1.25;
  const st = style || {title:{color:'#222',font:'Frank Ruhl Libre',fill:'solid'}, sub:{color:'#444',font:'Assistant'}, plate:'#ffffff'};
  const ts = st.title || {}, ss = st.sub || {};
  if(style && !portrait) out.push(newShape('rect', {x:W/2, y:H*.8, w:W*.84, h:H*.3, fill:style.plate, op:.88, r:22, lock:false}));
  const ty = style ? (portrait ? H*.925 : H*.77) : H*.4, dy = style ? (portrait ? H*.972 : H*.865) : H*.52;
  const ts1 = portrait ? 74 : Math.round(H*.12);
  out.push(newText({text:t, x:W/2, y:ty, w:W*.86, size:ts1, font:ts.font||'Frank Ruhl Libre', bold:true, color:ts.color||'#222', fill:ts.fill||'solid', sh: ts.fill==='gold' ? [{x:0,y:3,b:10,c:'rgba(0,0,0,.45)'}] : []}));
  out.push(newText({text:d, x:W/2, y:dy, w:W*.86, size:portrait ? 32 : Math.round(H*.052), font:ss.font||'Assistant', color:ss.color||'#444'}));
  return out;
}

/* ---------- CSS של שכבה ---------- */
function textCss(l){
  const c = [`font-family:'${l.font}','Assistant',sans-serif`, `font-size:${l.size}px`, `font-weight:${l.bold?700:400}`, `font-style:${l.italic?'italic':'normal'}`,
    `text-align:${l.align}`, `letter-spacing:${l.ls}px`, `line-height:${l.lh}`, `text-decoration:${[l.u?'underline':'',l.s?'line-through':''].join(' ').trim()||'none'}`];
  const grad = l.fill && l.fill !== 'solid' && GRADS[l.fill];
  const shadows = (l.sh||[]).map(s => `${s.x}px ${s.y}px ${s.b}px ${s.c}`);
  if(grad){
    c.push(`background-image:${grad[1]}`, 'background-clip:text', '-webkit-background-clip:text', '-webkit-text-fill-color:transparent', 'color:transparent');
    if(shadows.length) c.push('filter:' + (l.sh||[]).map(s => `drop-shadow(${s.x}px ${s.y}px ${Math.max(0,s.b/2)}px ${s.c})`).join(' '));
  } else {
    c.push(`color:${l.hollow ? 'transparent' : l.color}`);
    if(shadows.length) c.push('text-shadow:' + shadows.join(','));
  }
  if(l.stroke && l.stroke.w) c.push(`-webkit-text-stroke:${l.stroke.w}px ${l.stroke.c}`, 'paint-order:stroke fill');
  return c.join(';');
}

/* ---------- מצב העורך ---------- */
let M = null;   // המופע הפעיל

function mount(host, opts){
  unmount();
  loadFonts();
  opts = opts || {};
  const styles = D().styles || [];
  const S = {style: opts.style || (styles[0] && styles[0].id) || 'plain', fmt: opts.fmt || 'poster', bg:'#fbf1dc', layers:[], sel:null, zoom:1, grid:false, assets:{}};
  const hist = [], redoS = [];
  let H = 1414, k = .5, editing = null, dragged = false;

  /* --- טעינת מצב: מקישור, משמורת, או ברירת מחדל --- */
  const loaded = opts.state || null;
  if(loaded){ Object.assign(S, {style:loaded.style, fmt:loaded.fmt, bg:loaded.bg||S.bg, layers:loaded.layers||[], assets:loaded.assets||{}}); if(loaded.id) S.id = loaded.id; }
  else { S.layers = defaultLayers(styleById(S.style), fmtById(S.fmt)); }
  host.innerHTML = shell(styles);
  const root = host.firstElementChild, stage = $(root,'#edStage'), scaler = $(root,'.ed-scaler'), cv = $(root,'#edCanvas'), panel = $(root,'#edPanel'), live = $(root,'.ed-live');
  const say = t => { live.textContent = ''; setTimeout(()=>{ live.textContent = t; }, 30); };

  /* --- שכבות --- */
  const layer = id => S.layers.find(l => l.id === id);
  const cur = () => layer(S.sel);
  const snapshot = () => JSON.stringify({style:S.style, fmt:S.fmt, bg:S.bg, layers:S.layers});
  function push(){ const s = snapshot(); if(hist[hist.length-1] === s) return; hist.push(s); if(hist.length > 80) hist.shift(); redoS.length = 0; persist(); syncBtns(); }
  function restore(s){ const o = JSON.parse(s); S.style = o.style; S.fmt = o.fmt; S.bg = o.bg; S.layers = o.layers; if(!layer(S.sel)) S.sel = null; fullRender(); }
  function undo(){ if(hist.length < 2) return; redoS.push(hist.pop()); restore(hist[hist.length-1]); persist(); say('בוטלה פעולה'); }
  function redo(){ if(!redoS.length) return; const s = redoS.pop(); hist.push(s); restore(s); persist(); say('הפעולה שוחזרה'); }
  let persistT = 0;
  function persist(){ clearTimeout(persistT); persistT = setTimeout(() => { lsSet('ed_draft', {style:S.style, fmt:S.fmt, bg:S.bg, layers:S.layers, assets:S.assets}); }, 400); }

  /* --- ציור --- */
  function dims(){ const f = fmtById(S.fmt); H = Math.round(W * f.h / f.w); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
  function paintBg(){
    const st = styleById(S.style);
    cv.style.background = st ? `${st.band ? st.band.color : '#fff'} url(${st.img}) center/cover no-repeat` : S.bg;
  }
  function layerEl(l){
    const d = document.createElement('div'); d.className = 'ly ly-' + l.type; d.dataset.id = l.id; d.tabIndex = -1;
    if(l.type === 'text'){ const t = document.createElement('div'); t.className = 'ly-in'; d.appendChild(t); }
    else if(l.type === 'image'){ const im = document.createElement('img'); im.alt = ''; im.draggable = false; d.appendChild(im); }
    else d.appendChild(document.createElement('i'));
    return d;
  }
  function paint(l, d){
    d = d || $(cv, `.ly[data-id="${l.id}"]`); if(!d) return;
    d.style.left = l.x + 'px'; d.style.top = l.y + 'px'; d.style.width = l.w + 'px';
    d.style.transform = `translate(-50%,-50%) rotate(${l.rot||0}deg)`; d.style.opacity = l.op == null ? 1 : l.op;
    d.classList.toggle('locked', !!l.lock);
    if(l.type === 'text'){
      const t = d.firstChild; t.style.cssText = textCss(l);
      if(d !== editing && t.textContent !== l.text) t.textContent = l.text;
      d.style.background = l.hl || 'transparent'; d.style.padding = l.hl ? `${(l.size*.12).toFixed(1)}px ${(l.size*.4).toFixed(1)}px` : '0'; d.style.borderRadius = (l.size*.22).toFixed(1) + 'px';
    } else if(l.type === 'image'){
      const im = d.firstChild, src = S.assets[l.src]; if(im.getAttribute('src') !== src) im.src = src || '';
      im.style.borderRadius = (l.r||0) + 'px'; im.style.transform = l.flip ? 'scaleX(-1)' : 'none';
    } else {
      const i = d.firstChild; d.style.height = l.h + 'px';
      i.style.cssText = `display:block;width:100%;height:100%;background:${l.fill};border:${l.bw}px solid ${l.bc};border-radius:${l.kind==='circle'?'50%':l.r+'px'};box-sizing:border-box`;
      if(l.kind === 'star'){ i.style.clipPath = 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'; i.style.border = '0'; }
      if(l.kind === 'heart'){ i.style.border = '0'; i.style.borderRadius = '0'; i.style.webkitMask = i.style.mask = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 21s-8-5.4-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.6-8 11-8 11z'/%3E%3C/svg%3E\") center/contain no-repeat"; }
    }
  }
  function fullRender(){
    dims(); paintBg();
    cv.classList.toggle('grid', S.grid);
    $$(cv, '.ly').forEach(e => e.remove());
    S.layers.forEach(l => { const d = layerEl(l); cv.insertBefore(d, $(cv,'.selbox')); paint(l, d); });
    fit(); drawSel(); buildPanel(); syncBtns();
  }
  function fit(){
    const r = stage.getBoundingClientRect(); const pad = 28;
    const base = Math.min((r.width - pad*2) / W, (r.height - pad*2) / H);
    k = Math.max(.12, base * S.zoom);
    scaler.style.width = W * k + 'px'; scaler.style.height = H * k + 'px';
    cv.style.transform = `scale(${k})`; cv.style.setProperty('--k', k);
    const zl = $(root,'#edZl'); if(zl) zl.textContent = Math.round(S.zoom*100) + '%';
  }

  /* --- בחירה ומסגרת עם ידיות --- */
  function select(id){ S.sel = id; drawSel(); buildPanel(); const l = cur(); if(l) say('נבחרה שכבה: ' + (l.type === 'text' ? l.text.split('\n')[0] : l.type === 'image' ? 'תמונה' : 'צורה')); }
  function drawSel(){
    const sb = $(cv,'.selbox'), l = cur(), d = l && $(cv, `.ly[data-id="${l.id}"]`);
    if(!l || !d){ sb.hidden = true; return; }
    sb.hidden = false; sb.classList.toggle('locked', !!l.lock);
    const w = d.offsetWidth, h = d.offsetHeight;
    sb.style.cssText = `left:${l.x - w/2}px;top:${l.y - h/2}px;width:${w}px;height:${h}px;transform:rotate(${l.rot||0}deg)`;
  }
  const toLocal = e => { const r = cv.getBoundingClientRect(); return {x:(e.clientX - r.left) / k, y:(e.clientY - r.top) / k}; };

  /* --- גרירה, שינוי גודל וסיבוב --- */
  const guideV = $(cv,'.guide-v'), guideH = $(cv,'.guide-h');
  function snapTo(l, nx, ny){
    const xs = [W/2, 60, W-60].concat(S.layers.filter(o => o.id !== l.id).map(o => o.x));
    const ys = [H/2, 60, H-60].concat(S.layers.filter(o => o.id !== l.id).map(o => o.y));
    let gx = null, gy = null;
    for(const x of xs) if(Math.abs(nx - x) < 8/k*.5 + 4){ nx = x; gx = x; break; }
    for(const y of ys) if(Math.abs(ny - y) < 8/k*.5 + 4){ ny = y; gy = y; break; }
    guideV.hidden = gx == null; if(gx != null) guideV.style.left = gx + 'px';
    guideH.hidden = gy == null; if(gy != null) guideH.style.top = gy + 'px';
    return [nx, ny];
  }
  function beginDrag(e, l){
    const p0 = toLocal(e), o = {x:l.x, y:l.y}; dragged = false;
    const mv = ev => { const p = toLocal(ev); if(Math.abs(p.x-p0.x) + Math.abs(p.y-p0.y) > 3) dragged = true; if(!dragged) return;
      [l.x, l.y] = snapTo(l, o.x + p.x - p0.x, o.y + p.y - p0.y); paint(l); drawSel(); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); guideV.hidden = guideH.hidden = true; if(dragged){ push(); buildPanel(); } };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }
  function beginHandle(e, l, h){
    e.preventDefault(); e.stopPropagation();
    const c = {x:l.x, y:l.y}, p0 = toLocal(e), d0 = Math.hypot(p0.x-c.x, p0.y-c.y) || 1, w0 = l.w, h0 = l.h, s0 = l.size, th = (l.rot||0) * Math.PI/180;
    const a0 = Math.atan2(p0.y-c.y, p0.x-c.x) * 180/Math.PI, r0 = l.rot || 0;
    const mv = ev => {
      const p = toLocal(ev);
      if(h === 'rot'){ let r = r0 + (Math.atan2(p.y-c.y, p.x-c.x) * 180/Math.PI - a0); const n = Math.round(r/15)*15; if(Math.abs(r-n) < 3) r = n; l.rot = Math.round(r*10)/10; }
      else if(h === 'e' || h === 'w'){
        const ux = Math.cos(th), uy = Math.sin(th), dl = (p.x-p0.x)*ux + (p.y-p0.y)*uy, sgn = h === 'e' ? 1 : -1;
        const nw = clamp(w0 + sgn*dl, 40, W*1.6); const shift = (nw - w0) * sgn / 2; l.w = Math.round(nw); l.x = c.x + shift*ux; l.y = c.y + shift*uy;
      } else {
        const f = (Math.hypot(p.x-c.x, p.y-c.y) || 1) / d0;
        l.w = Math.round(clamp(w0 * f, 30, W*1.6)); if(l.type === 'shape') l.h = Math.round(clamp(h0 * f, 2, H*1.6)); if(l.type === 'text') l.size = Math.round(clamp(s0 * f, 6, 600));
      }
      paint(l); drawSel(); syncPanelVals();
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); push(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }
  cv.addEventListener('pointerdown', e => {
    if(editing && editing.contains(e.target)) return;
    const hnd = e.target.closest('[data-h]');
    if(hnd){ const l = cur(); if(l && !l.lock) beginHandle(e, l, hnd.dataset.h); return; }
    const ly = e.target.closest('.ly');
    if(editing) endEdit();
    if(!ly){ select(null); return; }
    const l = layer(ly.dataset.id); if(!l) return;
    if(S.sel !== l.id) select(l.id);
    if(!l.lock){ e.preventDefault(); beginDrag(e, l); }
  });
  cv.addEventListener('dblclick', e => { const ly = e.target.closest('.ly-text'); if(ly){ const l = layer(ly.dataset.id); if(l && !l.lock) startEdit(l, ly); } });
  function startEdit(l, d){
    editing = d; const t = d.firstChild; t.contentEditable = 'plaintext-only'; if(t.contentEditable !== 'plaintext-only') t.contentEditable = 'true';
    d.classList.add('editing'); t.focus(); const r = document.createRange(); r.selectNodeContents(t); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    t.oninput = () => { l.text = t.innerText.replace(/\n$/,''); drawSel(); persist(); };
    t.onblur = () => endEdit(); t.onkeydown = ev => { if(ev.key === 'Escape'){ ev.preventDefault(); t.blur(); } };
    say('עריכת טקסט. Escape לסיום');
  }
  function endEdit(){
    if(!editing) return; const d = editing, l = layer(d.dataset.id); editing = null; const t = d.firstChild;
    t.contentEditable = 'false'; t.oninput = t.onblur = t.onkeydown = null; d.classList.remove('editing');
    if(l){ l.text = t.innerText.replace(/\n$/,'') || ' '; paint(l, d); push(); drawSel(); buildPanel(); }
  }

  /* --- הוספה, מחיקה, סדר --- */
  function add(l){ S.layers.push(l); const d = layerEl(l); cv.insertBefore(d, $(cv,'.selbox')); paint(l, d); d.classList.add('pop'); select(l.id); push(); }
  function addText(kind){ const p = PRESETS[kind], st = styleById(S.style), pal = st && st.palette, dark = !!st;
    const l = newText(Object.assign({}, p, {x:W/2, y:H*.4 + S.layers.filter(o=>o.type==='text').length*30, color: dark ? (kind==='title' ? st.title.color : st.sub.color) : '#111111'}));
    if(dark && kind === 'title' && st.title.fill === 'gold'){ l.fill = 'gold'; l.sh = [{x:0,y:3,b:10,c:'rgba(0,0,0,.45)'}]; }
    add(l); say('נוסף טקסט. לחיצה כפולה לעריכה'); setTimeout(() => { const d = $(cv, `.ly[data-id="${l.id}"]`); if(d) startEdit(l, d); }, 60); }
  function addShape(kind){ const st = styleById(S.style); const l = newShape(kind, {fill: kind==='frame' ? 'transparent' : (st ? st.palette[3] : '#d4a64a'), bc: st ? st.palette[3] : '#d4a64a', y:H*.5}); add(l); say('נוספה צורה'); }
  function remove(l){ if(!l) return; S.layers = S.layers.filter(o => o !== l); const d = $(cv, `.ly[data-id="${l.id}"]`); if(d) d.remove(); S.sel = null; drawSel(); buildPanel(); push(); say('השכבה נמחקה'); }
  function dup(l){ if(!l) return; const c = JSON.parse(JSON.stringify(l)); c.id = uid(); c.x += 24; c.y += 24; add(c); say('השכבה שוכפלה'); }
  function order(l, dir){ const i = S.layers.indexOf(l), j = i + dir; if(j < 0 || j >= S.layers.length) return; S.layers.splice(i,1); S.layers.splice(j,0,l); fullRender(); push(); }
  function alignPage(l, how){ if(how==='h') l.x = W/2; if(how==='v') l.y = H/2; if(how==='top') l.y = Math.max(60, (l.type==='text' ? 0 : l.h/2) + 80); if(how==='bottom') l.y = H - 80; paint(l); drawSel(); push(); }
  function pickImage(file){
    if(!file) return; const rd = new FileReader();
    rd.onload = () => { const im = new Image(); im.onload = () => {
      const m = 1400, f = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width*f); c.height = Math.round(im.height*f);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      const url = file.type === 'image/png' || file.type === 'image/webp' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .9);
      const aid = 'a' + Math.random().toString(36).slice(2,7); S.assets[aid] = url;
      const w = Math.min(420, c.width); add({id:uid(), type:'image', src:aid, x:W/2, y:H*.45, w, rot:0, op:1, r:0, flip:false, lock:false}); say('התמונה נוספה');
    }; im.src = rd.result; }; rd.readAsDataURL(file);
  }

  /* --- ממשק עליון --- */
  function syncBtns(){ const u = $(root,'[data-a=undo]'), r = $(root,'[data-a=redo]'); if(u) u.disabled = hist.length < 2; if(r) r.disabled = !redoS.length;
    const gr = $(root,'[data-a=grid]'); if(gr) gr.setAttribute('aria-pressed', S.grid); }
  $(root,'#edFile').onchange = e => { pickImage(e.target.files[0]); e.target.value = ''; };
  $(root,'#edStyle').onchange = e => { S.style = e.target.value; paintBg(); buildPanel(); push(); say('הסגנון הוחלף'); };
  $(root,'#edFmt').onchange = e => {
    const old = H; S.fmt = e.target.value; dims(); const f = H / old;
    S.layers.forEach(l => { l.y = Math.round(l.y * f); }); fullRender(); push(); say('הגודל הוחלף');
  };
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-a],[data-add],[data-shape],[data-act]'); if(!b || !root.contains(b)) return;
    if(b.dataset.add){ addText(b.dataset.add); closeMenus(); return; }
    if(b.dataset.shape){ addShape(b.dataset.shape); closeMenus(); return; }
    const a = b.dataset.a;
    if(a === 'undo') undo(); else if(a === 'redo') redo();
    else if(a === 'image') $(root,'#edFile').click();
    else if(a === 'grid'){ S.grid = !S.grid; cv.classList.toggle('grid', S.grid); syncBtns(); }
    else if(a === 'zin'){ S.zoom = clamp(S.zoom * 1.2, .4, 3); fit(); drawSel(); }
    else if(a === 'zout'){ S.zoom = clamp(S.zoom / 1.2, .4, 3); fit(); drawSel(); }
    else if(a === 'fit'){ S.zoom = 1; fit(); drawSel(); }
    else if(a === 'magic') magic();
    else if(a === 'save') save();
    else if(a === 'share') share();
    else if(a === 'png'){ closeMenus(); exportPNG(); }
    else if(a === 'print'){ closeMenus(); printDesign(); }
    else if(a === 'reset') resetAll();
  });
  function addRibbon(){
    const st = styleById(S.style); if(!st || !st.ribbon) return; const r = st.ribbon;
    const patch = newShape('rect', {x:r.x*W, y:r.y*H, w:r.w*W, h:r.h*H, fill:r.face, r:8});
    const txt = newText({text:'הכיתוב שלכם', x:r.x*W, y:r.y*H, w:r.w*W*.94, size:Math.round(r.h*H*.56), font:'Frank Ruhl Libre', bold:true, color:r.ink});
    S.layers.push(patch, txt); fullRender(); select(txt.id); push(); say('נוסף כיתוב על הסרט. לחיצה כפולה לעריכה');
  }
  function resetAll(){ if(confirm('להתחיל מחדש? העיצוב הנוכחי יימחק.')){ S.layers = defaultLayers(styleById(S.style), fmtById(S.fmt)); S.sel = null; fullRender(); push(); } }
  function closeMenus(){ $$(root,'details.ed-menu').forEach(d => d.open = false); }
  document.addEventListener('click', docClick); function docClick(e){ if(!root.contains(e.target)) closeMenus(); }

  /* --- הפתעה: שילוב מקצועי בלחיצה --- */
  const COMBOS = [
    ['Frank Ruhl Libre','gold'], ['Suez One','gold'], ['Secular One','retro'], ['Karantina','soft'], ['Amatic SC','plain'], ['Gveret Levin','soft'],
    ['Rubik','hard'], ['Bellefair','glow'], ['Playpen Sans Hebrew','soft'], ['Rubik Bubbles','hard'], ['Fredoka','lift'], ['Miriam Libre','silver']
  ];
  function magic(){
    const targets = cur() && cur().type === 'text' ? [cur()] : S.layers.filter(l => l.type === 'text'); if(!targets.length){ say('אין טקסט לשדרג'); return; }
    const st = styleById(S.style), pal = st ? st.palette : SWATCHES;
    targets.forEach((l, i) => { const c = COMBOS[Math.floor(Math.random()*COMBOS.length)]; l.font = i === 0 ? c[0] : 'Assistant'; l.bold = i === 0;
      FX.plain[1](l); if(i === 0) FX[c[1]][1](l); if(l.fill === 'solid' && c[1] !== 'neon' && c[1] !== 'retro') l.color = pal[2 + Math.floor(Math.random()*3)] || l.color; paint(l); });
    drawSel(); buildPanel(); push(); say('שודרג! אם לא אהבת, לוחצים שוב או מבטלים');
  }

  /* --- שמירה ושיתוף --- */
  function save(){
    const list = lsGet('designs', []), id = S.id || ('d' + Date.now().toString(36)); S.id = id;
    const title = (S.layers.find(l => l.type === 'text') || {text:'עיצוב'}).text.split('\n')[0].slice(0,40);
    const entry = {id, title, date:new Date().toLocaleString('he-IL'), state:{style:S.style, fmt:S.fmt, bg:S.bg, layers:S.layers, assets:S.assets}};
    const i = list.findIndex(x => x.id === id); if(i >= 0) list[i] = entry; else list.unshift(entry);
    if(!lsSet('designs', list.slice(0,12))){ entry.state.assets = {}; lsSet('designs', list.slice(0,6)); say('נשמר בלי התמונות (אין מקום בדפדפן)'); }
    const saved = lsGet('saved', []).filter(x => x.link !== '#/studio/edit?load='+id);
    saved.unshift({id:'s'+id, date:entry.date, kind:'עיצוב', title, link:'#/studio/edit?load='+id}); lsSet('saved', saved);
    toast('העיצוב נשמר באזור האישי'); say('העיצוב נשמר');
  }
  const encState = o => encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(o)))));
  function share(){
    const o = {style:S.style, fmt:S.fmt, bg:S.bg, layers:S.layers.filter(l => l.type !== 'image')};
    const url = location.href.split('#')[0] + '#/studio/edit?d=' + encState(o);
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('הקישור הועתק (בלי תמונות שהעלית)'), () => prompt('העתיקי את הקישור:', url));
  }
  function toast(t){ const el = document.getElementById('toast'); if(!el) return; el.textContent = t; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 2600); }

  /* --- ייצוא --- */
  function cleanClone(scale){
    const c = cv.cloneNode(true); $$(c, '.selbox,.guide-v,.guide-h').forEach(x => x.remove()); c.classList.remove('grid'); c.removeAttribute('id');
    c.style.transform = scale ? `scale(${scale})` : 'none'; c.style.transformOrigin = '0 0'; return c;
  }
  function loadScript(src){ return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  async function exportPNG(){
    select(null); say('מכינה את התמונה...'); toast('מכינה את התמונה...');
    const hold = document.createElement('div'); hold.style.cssText = `position:fixed;left:-20000px;top:0;width:${W}px;height:${H}px;direction:ltr`;
    const c = cleanClone(0); hold.appendChild(c); document.body.appendChild(hold);
    try{
      await document.fonts.ready;
      let url;
      try{
        if(!window.htmlToImage) await loadScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js');
        url = await window.htmlToImage.toPng(c, {pixelRatio:2.4, cacheBust:true, width:W, height:H});
      }catch(err){
        if(!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
        url = (await window.html2canvas(c, {scale:2.4, backgroundColor:null, useCORS:true})).toDataURL('image/png');
      }
      const a = document.createElement('a'); a.href = url; a.download = 'madlik-design.png'; a.click(); toast('התמונה ירדה'); celebrate();
    }catch(err){ toast('לא הצלחתי ליצור תמונה. אפשר להדפיס ולשמור כ־PDF'); }
    hold.remove();
  }
  function printDesign(){
    select(null); const f = fmtById(S.fmt), kk = (f.w * 96 / 25.4) / W;
    const root2 = document.getElementById('printRoot'); const c = cleanClone(kk);
    root2.innerHTML = ''; const box = document.createElement('div'); box.className = 'ed-print'; box.style.cssText = `width:${f.w}mm;height:${f.h}mm`; box.appendChild(c); root2.appendChild(box);
    const st = document.createElement('style'); st.id = 'edPageStyle'; st.textContent = `@page{size:${f.w}mm ${f.h}mm;margin:0}`; document.head.appendChild(st);
    const done = () => { const s = document.getElementById('edPageStyle'); if(s) s.remove(); removeEventListener('afterprint', done); }; addEventListener('afterprint', done);
    setTimeout(() => window.print(), 250); celebrate();
  }
  function celebrate(){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div'); box.className = 'confetti-burst'; const cols = ['#ff6a00','#ffd23f','#2f80ed','#ec008c','#14a38a','#ffffff'];
    box.innerHTML = Array.from({length:36}, (_,i) => `<i style="--a:${(i/36)*360}deg;--d:${(120+Math.random()*180).toFixed(0)}px;--c:${cols[i%cols.length]};--t:${(.7+Math.random()*.6).toFixed(2)}s"></i>`).join('');
    document.body.appendChild(box); setTimeout(() => box.remove(), 1600);
  }

  /* --- מקלדת --- */
  function onKey(e){
    if(!document.body.contains(root)) return;
    const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    const mod = e.ctrlKey || e.metaKey;
    if(mod && e.key.toLowerCase() === 'z' && !typing){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if(mod && e.key.toLowerCase() === 'y' && !typing){ e.preventDefault(); redo(); return; }
    if(typing) return;
    const l = cur();
    if(mod && e.key.toLowerCase() === 'd' && l){ e.preventDefault(); dup(l); return; }
    if(!l) return;
    if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); remove(l); }
    else if(e.key === 'Escape') select(null);
    else if(e.key === 'Enter' && l.type === 'text'){ e.preventDefault(); const d = $(cv, `.ly[data-id="${l.id}"]`); if(d) startEdit(l, d); }
    else if(e.key.startsWith('Arrow') && !l.lock){ e.preventDefault(); const st = e.shiftKey ? 10 : 1; if(e.key === 'ArrowLeft') l.x -= st; if(e.key === 'ArrowRight') l.x += st; if(e.key === 'ArrowUp') l.y -= st; if(e.key === 'ArrowDown') l.y += st; paint(l); drawSel(); clearTimeout(onKey._t); onKey._t = setTimeout(push, 400); }
  }
  document.addEventListener('keydown', onKey);
  const ro = new ResizeObserver(() => { fit(); drawSel(); }); ro.observe(stage);

  /* --- ייצוב: ממשק הצד (בקובץ הבא בחלק 2) --- */
  const ctx = {S, root, cv, panel, stage, layer, cur, paint, drawSel, push, remove, dup, order, alignPage, select, fullRender, say, add, addText, addShape, pickImage, startEdit, fmtById, styleById, GRADS, FX, SWATCHES, FONTS, PRESETS, FORMATS, esc, clamp, $, $$, W, getH: () => H};
  ctx.reset = resetAll; ctx.addRibbon = addRibbon; ctx.isPortrait = () => H / W >= 1.25; ctx.buildPanel = buildPanel; ctx.syncPanelVals = syncPanelVals;
  function buildPanel(){ if(M && M.ui) M.ui.build(ctx); }
  function syncPanelVals(){ if(M && M.ui) M.ui.sync(ctx); }

  M = {S, ctx, destroy(){ document.removeEventListener('keydown', onKey); document.removeEventListener('click', docClick); ro.disconnect(); clearTimeout(persistT); }, ui: null};
  M.ui = window.MadlikEditorUI;
  $(root,'#edStyle').value = S.style; $(root,'#edFmt').value = S.fmt;
  fullRender(); hist.push(snapshot()); syncBtns();
  return M;
}

function shell(styles){
  const fm = FORMATS.map(f => `<option value="${f.id}">${f.n}</option>`).join('');
  const st = `<option value="plain">דף חלק</option>` + styles.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  return `<div class="ed" dir="rtl">
  <div class="ed-live" role="status" aria-live="polite"></div>
  <div class="ed-top" role="toolbar" aria-label="כלי עיצוב">
    <div class="ed-grp"><button data-a="undo" title="ביטול (Ctrl+Z)" aria-label="ביטול פעולה">↶ ביטול</button><button data-a="redo" title="שחזור (Ctrl+Y)" aria-label="שחזור פעולה">↷ שחזור</button></div>
    <div class="ed-grp"><button class="ed-pri" data-add="title"><b>+</b> כותרת</button><button data-add="sub"><b>+</b> כותרת משנה</button><button data-add="body"><b>+</b> פסקה</button><button data-a="image"><b>+</b> תמונה</button><input type="file" id="edFile" accept="image/*" hidden>
      <details class="ed-menu"><summary><b>+</b> צורה</summary><div class="ed-pop"><button data-shape="rect">מלבן</button><button data-shape="circle">עיגול</button><button data-shape="line">קו</button><button data-shape="star">כוכב</button><button data-shape="heart">לב</button><button data-shape="frame">מסגרת</button></div></details></div>
    <div class="ed-grp"><label>סגנון <select id="edStyle" aria-label="שפה עיצובית">${st}</select></label><label>גודל <select id="edFmt" aria-label="גודל הדף">${fm}</select></label></div>
    <div class="ed-grp"><button data-a="magic" class="ed-magic" title="שילוב גופן ואפקט אקראי">✦ שדרגי אותי</button><button data-a="grid" aria-pressed="false" title="הצגת רשת">רשת</button><button data-a="zout" aria-label="הקטנה">−</button><span id="edZl" class="ed-zl">100%</span><button data-a="zin" aria-label="הגדלה">+</button><button data-a="fit" title="התאמה למסך">התאמה</button></div>
    <div class="ed-grp end"><button data-a="save">שמירה</button><button data-a="share">קישור</button>
      <details class="ed-menu"><summary class="ed-dl">הורדה</summary><div class="ed-pop"><button data-a="png">תמונה (PNG)</button><button data-a="print">PDF / הדפסה</button></div></details></div>
  </div>
  <div class="ed-main">
    <section class="ed-stage" id="edStage" aria-label="אזור העיצוב"><div class="ed-scaler"><div class="ed-canvas" id="edCanvas"><div class="guide-v" hidden></div><div class="guide-h" hidden></div>
      <div class="selbox" hidden><i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i><i data-h="w"></i><i data-h="e"></i><i data-h="rot"></i></div></div></div>
      <p class="ed-hint">לחיצה כפולה על טקסט כדי לערוך · גוררים כדי להזיז · הידית העליונה מסובבת</p></section>
    <aside class="ed-panel" id="edPanel" aria-label="הגדרות"></aside>
  </div></div>`;
}

function unmount(){ if(M){ M.destroy(); M = null; } }
function decState(s){ try{ return JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(s))))); }catch(e){ return null; } }
function loadDesign(id){ const d = lsGet('designs', []).find(x => x.id === id); return d ? Object.assign({id:d.id}, d.state) : null; }
function draft(){ return lsGet('ed_draft', null); }

return {mount, unmount, decState, loadDesign, draft, FORMATS};
})();
