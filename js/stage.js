// מדליק – במה: חנוכייה שטוחה, סביבונים, סמן, וכל מה שזז בגלילה
window.MadlikFX = (function(){
'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const clamp = (v,a=0,b=1) => Math.min(b, Math.max(a, v));

/* ---------- חנוכייה שטוחה: הצבעים ממשתני CSS ---------- */
function menorah(o){
  o = o || {};
  const cx = 300, cupY = 210, radii = [55,110,165,220];
  const arms = radii.map(r=>`M${cx-r} ${cupY} A${r} ${r} 0 0 0 ${cx+r} ${cupY}`).join(' ');
  const xs = [cx-220,cx-165,cx-110,cx-55,cx+55,cx+110,cx+165,cx+220];
  // i=1 הנר הימני ביותר (ההדלקה בעברית מתחילה מימין), i=0 השמש
  const list = [{x:cx, y:cupY-50, i:0}].concat(xs.map((x,k)=>({x, y:cupY, i:8-k})));
  const star = (x,y,r) => { const p = a => [0,1,2].map(k=>{ const t=(a+k*120)*Math.PI/180; return `${(x+r*Math.sin(t)).toFixed(1)},${(y-r*Math.cos(t)).toFixed(1)}`; }).join(' ');
    return `<polygon points="${p(0)}" fill="none" style="stroke:var(--mb)" stroke-width="5"/><polygon points="${p(180)}" fill="none" style="stroke:var(--mb)" stroke-width="5"/>`; };
  const candle = c => {
    const top = c.y-64, d = c.i===0 ? .5 : 1+(c.i-1)*.28;
    const anim = o.scroll ? '' : ` style="animation-delay:${d}s,${(d+.7).toFixed(2)}s"`;
    return `<g class="candle" data-i="${c.i}">
      <rect x="${c.x-12}" y="${c.y-4}" width="24" height="10" rx="3" style="fill:var(--mb)"/>
      <rect x="${c.x-8}" y="${top}" width="16" height="62" rx="2" style="fill:var(--mc)"/>
      <path d="M${c.x} ${top} v-7" style="stroke:var(--mb)" stroke-width="2.5"/>
      <g class="flame"${anim}>
        <path d="M${c.x} ${top-5} C${c.x+15} ${top-17} ${c.x+8} ${top-36} ${c.x} ${top-58} C${c.x-8} ${top-36} ${c.x-15} ${top-17} ${c.x} ${top-5}Z" style="fill:var(--f1)"/>
        <path d="M${c.x} ${top-7} C${c.x+6} ${top-13} ${c.x+3} ${top-24} ${c.x} ${top-32} C${c.x-3} ${top-24} ${c.x-6} ${top-13} ${c.x} ${top-7}Z" style="fill:var(--f2)"/>
      </g></g>`;
  };
  return `<svg class="menorah${o.scroll?' scroll':''}" viewBox="0 0 600 560" aria-hidden="true" style="${o.vars||''}">
    <path d="${arms}" fill="none" style="stroke:var(--mb)" stroke-width="12" stroke-linecap="round"/>
    <rect x="${cx-7}" y="${cupY-50}" width="14" height="${470-cupY+50}" style="fill:var(--mb)"/>
    <path d="M${cx-18} 470 Q${cx} 455 ${cx+18} 470 L${cx+70} 528 Q${cx} 546 ${cx-70} 528Z" style="fill:var(--mb)"/>
    <rect x="${cx-76}" y="526" width="152" height="12" rx="6" style="fill:var(--mb)"/>
    ${list.map(candle).join('')}
  </svg>`;
}

/* ---------- סביבון תלת־ממדי (הסיבוב נקבע בגלילה) ---------- */
function dreidel(cls, letters){
  const L = letters || ['נ','ג','ה','פ'];
  return `<div class="dreidel-wrap ${cls}" aria-hidden="true"><div class="dreidel"><div class="spin">
    <div class="handle"></div><div class="top"></div>
    ${L.map((l,i)=>`<div class="face f${i}"><span>${l}</span></div>`).join('')}
    ${[0,1,2,3].map(i=>`<div class="tip t${i}"></div>`).join('')}
  </div></div></div>`;
}

/* ---------- מנוע גלילה: לולאה אחת לכל התנועות ---------- */
let scenes = [], relayouts = [], vel = 0, lastY = scrollY;
const persistent = [];
const abs = el => { const r = el.getBoundingClientRect(); return {top:r.top+scrollY, h:r.height}; };
const relayout = () => relayouts.forEach(f=>f());
addEventListener('resize', relayout);
addEventListener('load', relayout);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);

function frame(t){
  const y = scrollY; vel += ((y-lastY)-vel)*.18; lastY = y;
  const s = t/1000;
  for(let i=0;i<scenes.length;i++) scenes[i](y,vel,s);
  for(let i=0;i<persistent.length;i++) persistent[i](y,vel,s);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function setup(root){
  scenes = []; relayouts = [];

  // הירו: התקדמות 0..1, סביבונים מסתובבים, כותרת זזה
  const hero = root.querySelector('.hero');
  if(hero){
    const dre = [...hero.querySelectorAll('.dreidel-wrap')]; let hh = hero.offsetHeight||800;
    relayouts.push(()=>{ hh = hero.offsetHeight||800; });
    scenes.push((y,v,t)=>{
      if(y > hh*1.3) return;
      hero.style.setProperty('--p', clamp(y/hh).toFixed(4));
      hero.style.setProperty('--sy', y.toFixed(0));
      dre.forEach((d,i)=>d.style.setProperty('--ry', (t*24*(i%2?-1:1) + y*(.55+i*.25)).toFixed(1)));
    });
  }

  // פסי מילים: מהירות וכיוון לפי הגלילה
  root.querySelectorAll('.band').forEach(b=>{
    const tr = b.querySelector('.band-track'); const base = +b.dataset.dir || 1;
    let x = 0, dir = base, W = 1;
    const m = () => { W = tr.scrollWidth/2 || 1; }; relayouts.push(m); m();
    scenes.push((y,v)=>{
      if(Math.abs(v) > .8) dir = (v>0 ? 1 : -1)*base;
      x += dir*(1.1 + Math.abs(v)*.55); x = ((x%W)+W)%W;
      tr.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    });
  });

  // טקסט שמתמלא מילה אחרי מילה
  root.querySelectorAll('.statement').forEach(st=>{
    const ws = [...st.querySelectorAll('.w')]; let top = 0, h = 1;
    const m = () => { const a = abs(st); top = a.top; h = a.h; }; relayouts.push(m); m();
    scenes.push(y=>{
      const p = clamp((y + innerHeight*.78 - top)/(h + innerHeight*.3));
      const k = Math.round(p*ws.length*1.04);
      ws.forEach((w,i)=>{ const on = i < k; if(w._on !== on){ w._on = on; w.classList.toggle('on', on); } });
    });
  });

  // שמונה לילות: נר נדלק בכל צעד
  const nights = root.querySelector('.nights');
  if(nights){
    const stage = nights.querySelector('.nights-stage');
    const panels = [...nights.querySelectorAll('.n-panel')], candles = [...nights.querySelectorAll('.candle')], ticks = [...nights.querySelectorAll('.n-ticks i')];
    const themes = ['games','create','studio','recipes','ideas','biz','submit','me'];
    let top = 0, h = 1, cur = 0;
    const m = () => { const a = abs(nights); top = a.top; h = Math.max(1, a.h - innerHeight); }; relayouts.push(m); m();
    const set = n => {
      cur = n; stage.dataset.theme = themes[n-1];
      panels.forEach((p,i)=>p.classList.toggle('on', i===n-1));
      candles.forEach(c=>c.classList.toggle('lit', +c.dataset.i <= n));
      ticks.forEach((t,i)=>t.classList.toggle('on', i<n));
    };
    set(1);
    scenes.push(y=>{ const n = Math.min(8, Math.floor(clamp((y-top)/h)*8)+1); if(n !== cur) set(n); });
  }

  // גלילה אופקית: הגלילה למטה מזיזה הצידה
  root.querySelectorAll('.hs').forEach(hs=>{
    const tr = hs.querySelector('.hs-track'), bar = hs.querySelector('.hs-bar i'), cnt = hs.querySelector('.hs-count');
    let top = 0, dist = 0, last = -1;
    const m = () => { dist = Math.max(0, tr.scrollWidth - innerWidth); hs.style.height = (dist + innerHeight)+'px'; top = abs(hs).top; };
    relayouts.push(m); m();
    scenes.push(y=>{
      const p = clamp((y-top)/Math.max(1,dist));
      tr.style.transform = `translate3d(${(p*dist).toFixed(1)}px,0,0)`;
      if(bar) bar.style.transform = `scaleX(${p.toFixed(3)})`;
      if(cnt){ const n = Math.min(tr.children.length, Math.floor(p*tr.children.length)+1); if(n!==last){ last = n; cnt.textContent = String(n).padStart(2,'0'); } }
    });
  });

  // פרלקסה: כל פריט בקבוצה זז במהירות אחרת
  root.querySelectorAll('[data-parallax]').forEach(box=>{
    const items = [...box.querySelectorAll('[data-speed]')]; let c = 0;
    const m = () => { const a = abs(box); c = a.top + a.h/2; }; relayouts.push(m); m();
    scenes.push(y=>{
      const dy = (y + innerHeight/2) - c;
      if(Math.abs(dy) > innerHeight*1.4) return;
      items.forEach(el=>el.style.setProperty('--py', (-dy*(+el.dataset.speed)).toFixed(1)+'px'));
    });
  });

  [0, 500, 1600].forEach(ms => setTimeout(relayout, ms));
}

/* ---------- סמן מותאם ---------- */
function cursor(){
  if(!fine || reduce) return;
  const c = document.createElement('div'); c.className = 'cur'; document.body.appendChild(c);
  document.documentElement.classList.add('has-cursor');
  let tx = -100, ty = -100, x = tx, y = ty;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; }, {passive:true});
  document.addEventListener('pointerover', e => {
    const big = e.target.closest('[data-cursor], .card, .poster, .index a, .big-link');
    const mid = !big && e.target.closest('a, button, .chip, label, select');
    c.classList.toggle('big', !!big); c.classList.toggle('mid', !!mid);
    c.textContent = big ? (big.dataset.cursor || 'פתחי') : '';
  });
  document.addEventListener('pointerdown', ()=>c.classList.add('down'));
  document.addEventListener('pointerup', ()=>c.classList.remove('down'));
  persistent.push(()=>{ x += (tx-x)*.35; y += (ty-y)*.35; c.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`; });
}

/* ---------- סצנה בתחתית הדף: חנוכיית פליז, שולחן עץ וסביבוני נייר ---------- */
function sceneSVG(){
  const cx = 300, cupY = 210, radii = [55,110,165,220];
  const arms = radii.map(r=>`M${cx-r} ${cupY} A${r} ${r} 0 0 0 ${cx+r} ${cupY}`).join(' ');
  const xs = [cx-220,cx-165,cx-110,cx-55,cx+55,cx+110,cx+165,cx+220];
  const cs = [{x:cx, y:cupY-50, i:0}].concat(xs.map((x,k)=>({x, y:cupY, i:8-k})));
  const dly = c => (c.i===0 ? .3 : .9+(c.i-1)*.3).toFixed(2);
  const cup = c => `<path d="M${c.x-15} ${c.y-7} L${c.x+15} ${c.y-7} L${c.x+9} ${c.y+11} Q${c.x} ${c.y+14} ${c.x-9} ${c.y+11}Z" fill="url(#cupG)"/><ellipse cx="${c.x}" cy="${c.y-7}" rx="15" ry="3.6" fill="#e9c673"/><ellipse cx="${c.x}" cy="${c.y-7.4}" rx="10" ry="2.1" fill="#5d3c0e"/>`;
  const candle = c => { const top = c.y-72; return `<rect x="${c.x-8}" y="${top}" width="16" height="68" rx="2" fill="url(#waxG)"/><ellipse cx="${c.x}" cy="${top}" rx="8" ry="2.6" fill="#ffeaa3"/><path d="M${c.x} ${top} v-7" stroke="#2a1a08" stroke-width="2" stroke-linecap="round"/>`; };
  const flame = c => { const top = c.y-78; return `<g transform="translate(${c.x} ${top})"><g class="flame" style="--d:${dly(c)}s" filter="url(#fblur)"><path d="M0 0 C10 -9 10 -24 0 -50 C-10 -24 -10 -9 0 0Z" fill="url(#flameG)"/><path d="M0 -1 C4.5 -6 4.5 -14 0 -26 C-4.5 -14 -4.5 -6 0 -1Z" fill="#fffbe6" opacity=".92"/><ellipse cx="0" cy="-3" rx="3.2" ry="4.5" fill="#4d7cff" opacity=".5"/></g></g>`; };
  const halo = c => `<circle class="halo" style="--d:${dly(c)}s" cx="${c.x}" cy="${c.y-104}" r="66" fill="url(#haloG)"/>`;
  const knop = y => `<ellipse cx="${cx}" cy="${y}" rx="14" ry="8.5" fill="url(#knopG)"/><ellipse cx="${cx-4}" cy="${y-3}" rx="5" ry="2" fill="#fff4cf" opacity=".7"/>`;

  /* סביבון נייר מקופל: קובייה איזומטרית עם ידית */
  const P = a => a.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ');
  const faces = (a, c, warm) => {
    const T=[0,0], R=[.866*a,.5*a], B=[0,a], L=[-.866*a,.5*a], Bb=[0,2*a], Lb=[-.866*a,1.5*a], Rb=[.866*a,1.5*a];
    return `<polygon points="${P([L,B,Bb,Lb])}" fill="${c[1]}"/><polygon points="${P([B,R,Rb,Bb])}" fill="${c[2]}"/><polygon points="${P([T,R,B,L])}" fill="${c[0]}"/>`
      + (warm==='r' ? `<polygon points="${P([B,R,Rb,Bb])}" fill="rgba(255,150,50,.22)"/>` : '')
      + (warm==='l' ? `<polygon points="${P([L,B,Bb,Lb])}" fill="rgba(255,150,50,.22)"/>` : '')
      + `<line x1="${T[0]}" y1="${T[1]}" x2="${B[0]}" y2="${B[1]}" stroke="rgba(0,0,0,.08)" stroke-width="1"/><line x1="${B[0]}" y1="${B[1]}" x2="${Bb[0]}" y2="${Bb[1]}" stroke="rgba(0,0,0,.22)" stroke-width="1.2"/><polyline points="${P([L,B,R])}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>`;
  };
  const cube = (x, y, a, c, rot, letter, warm, d) => {
    const h = a*.2, hy = .5*a - 2*h;
    const txt = letter ? `<text transform="matrix(.866 .5 0 1 ${(-.866*a).toFixed(1)} ${(.5*a).toFixed(1)})" x="${(a*.18).toFixed(1)}" y="${(a*.8).toFixed(1)}" font-size="${(a*.66).toFixed(1)}" font-family="Suez One,serif" fill="rgba(7,26,56,.22)">${letter}</text>` : '';
    return `<g class="drop" style="--d:${d}s"><ellipse cx="${x+a*.12}" cy="${y+1}" rx="${(a*1.2).toFixed(1)}" ry="${(a*.3).toFixed(1)}" fill="#000" opacity=".42" filter="url(#sblur)"/>
      <g transform="translate(${x} ${y-2*a}) rotate(${rot} 0 ${2*a})" filter="url(#paper)">${faces(a,c,warm)}${txt}<g transform="translate(0 ${hy.toFixed(1)})">${faces(h,c,warm)}</g></g></g>`;
  };
  const cream = ['#f4ecd8','#ddd0b4','#bdae8e'], blue = ['#aed6ec','#88bad8','#5f94b8'], mint = ['#c9e5d2','#a2ceb2','#79ad90'], pale = ['#e8f2f8','#c8dde9','#a1bfd2'], sky = ['#92c7e6','#6aa8d0','#4887b2'];

  return `<svg viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax slice" role="img" aria-label="חנוכייה דולקת וסביבוני נייר על שולחן עץ">
  <defs>
    <linearGradient id="brass" gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="540" y2="0"><stop offset="0" stop-color="#5a3a0e"/><stop offset=".16" stop-color="#b98228"/><stop offset=".34" stop-color="#f0cf7a"/><stop offset=".5" stop-color="#c28d2e"/><stop offset=".68" stop-color="#8d5f18"/><stop offset=".84" stop-color="#d7a444"/><stop offset="1" stop-color="#5a3a0e"/></linearGradient>
    <linearGradient id="stemG" x1="0" x2="1"><stop offset="0" stop-color="#6d4710"/><stop offset=".3" stop-color="#f0cf7a"/><stop offset=".55" stop-color="#b98228"/><stop offset="1" stop-color="#4f3209"/></linearGradient>
    <radialGradient id="knopG" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff0c0"/><stop offset=".45" stop-color="#d6a23e"/><stop offset="1" stop-color="#5a3a0e"/></radialGradient>
    <linearGradient id="cupG" x1="0" x2="1"><stop offset="0" stop-color="#7a5114"/><stop offset=".35" stop-color="#f0cf7a"/><stop offset=".7" stop-color="#b98228"/><stop offset="1" stop-color="#5a3a0e"/></linearGradient>
    <linearGradient id="baseG" x1="0" x2="1"><stop offset="0" stop-color="#5a3a0e"/><stop offset=".25" stop-color="#e2b95a"/><stop offset=".45" stop-color="#fbe5a0"/><stop offset=".65" stop-color="#b98228"/><stop offset="1" stop-color="#4f3209"/></linearGradient>
    <linearGradient id="waxG" x1="0" x2="1"><stop offset="0" stop-color="#cf9208"/><stop offset=".4" stop-color="#ffe07a"/><stop offset="1" stop-color="#e0a812"/></linearGradient>
    <radialGradient id="flameG" cx=".5" cy=".82" r=".75"><stop offset="0" stop-color="#fff6c8"/><stop offset=".3" stop-color="#ffd25a"/><stop offset=".65" stop-color="#ff8f1a"/><stop offset="1" stop-color="#ff5a00" stop-opacity=".15"/></radialGradient>
    <radialGradient id="haloG"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset=".45" stop-color="#ff8a1f" stop-opacity=".16"/><stop offset="1" stop-color="#ff8a1f" stop-opacity="0"/></radialGradient>
    <radialGradient id="wallGlow" gradientUnits="userSpaceOnUse" cx="600" cy="230" r="540" gradientTransform="translate(0 230) scale(1 .62) translate(0 -230)"><stop offset="0" stop-color="#ffb060" stop-opacity=".30"/><stop offset=".6" stop-color="#ff9a40" stop-opacity=".08"/><stop offset="1" stop-color="#ff9a40" stop-opacity="0"/></radialGradient>
    <radialGradient id="tableGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffa850" stop-opacity=".42"/><stop offset="1" stop-color="#ff9a40" stop-opacity="0"/></radialGradient>
    <linearGradient id="tableShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".05"/><stop offset=".55" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    <linearGradient id="wallContact" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
    <linearGradient id="sideShade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".18" stop-color="#000" stop-opacity="0"/><stop offset=".82" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
    <filter id="wood" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.005 0.2" numOctaves="4" seed="9"/><feColorMatrix values="0.55 0 0 0 .26  0.34 0 0 0 .12  0.18 0 0 0 .05  0 0 0 0 1"/></filter>
    <filter id="paper" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .28 -.07" result="g"/><feComposite in="g" in2="SourceAlpha" operator="in" result="gi"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="gi"/></feMerge></filter>
    <filter id="fblur" x="-60%" y="-30%" width="220%" height="160%"><feGaussianBlur stdDeviation=".7"/></filter>
    <filter id="sblur" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="3.5"/></filter>
  </defs>


  <rect x="0" y="396" width="1200" height="32" fill="url(#wallContact)"/>
  <rect x="0" y="428" width="1200" height="132" fill="#6b4023"/>
  <rect x="0" y="428" width="1200" height="132" filter="url(#wood)"/>
  <rect x="0" y="428" width="1200" height="132" fill="url(#tableShade)"/>
  <rect x="0" y="428" width="1200" height="2.5" fill="#d3a070" opacity=".7"/>
  <rect x="0" y="428" width="1200" height="132" fill="url(#sideShade)"/>
  <ellipse class="glow" cx="600" cy="492" rx="430" ry="46" fill="url(#tableGlow)"/>

  ${cube(205,505,64,cream,-3,'נ','r',.15)}
  ${cube(199,409,52,blue,5,'ג','r',.3)}
  ${cube(194,331,40,mint,-7,'ה','r',.45)}

  <ellipse cx="600" cy="474" rx="108" ry="13" fill="#000" opacity=".5" filter="url(#sblur)"/>
  <g transform="translate(330 -14) scale(.9)">
    <path d="${arms}" fill="none" stroke="#2c1a05" stroke-width="19" stroke-linecap="round" transform="translate(3 4)" opacity=".5"/>
    <path d="${arms}" fill="none" stroke="url(#brass)" stroke-width="15" stroke-linecap="round"/>
    <path d="${arms}" fill="none" stroke="#f6dc9a" stroke-width="5" stroke-linecap="round" transform="translate(-2.5 -2.5)" opacity=".7"/>
    <path d="${arms}" fill="none" stroke="#fff8dc" stroke-width="1.6" stroke-linecap="round" transform="translate(-4 -4)" opacity=".9"/>
    <rect x="${cx-8}" y="${cupY-50}" width="16" height="${470-(cupY-50)}" fill="url(#stemG)"/>
    ${[292,347,402].map(knop).join('')}
    <path d="M${cx-18} 470 Q${cx} 452 ${cx+18} 470 L${cx+72} 528 Q${cx} 550 ${cx-72} 528Z" fill="url(#baseG)"/>
    <ellipse cx="${cx}" cy="528" rx="76" ry="12" fill="url(#baseG)"/>
    <path d="M${cx-14} 470 L${cx-62} 524" stroke="#fff0c0" stroke-width="2" opacity=".6" stroke-linecap="round"/>
    ${knop(452)}
    ${cs.map(cup).join('')}
    ${cs.map(candle).join('')}
    ${cs.map(flame).join('')}
    ${cs.map(halo).join('')}
  </g>

  ${cube(985,500,58,pale,9,'פ','l',.55)}
  ${cube(1088,514,46,sky,-11,'ש','l',.7)}
  ${cube(900,541,34,cream,15,'נ','l',.85)}
  </svg>`;
}
function mountScene(){
  const sc = document.getElementById('scene'); if(!sc) return;
  sc.innerHTML = sceneSVG();
  const svg = sc.querySelector('svg');
  const fit = () => svg.setAttribute('viewBox', innerWidth < 700 ? '150 0 900 560' : '0 0 1200 560');
  fit(); addEventListener('resize', fit);
  if(reduce || !('IntersectionObserver' in window)){ sc.classList.add('in'); return; }
  const o = new IntersectionObserver(es => { if(es[0].isIntersecting){ sc.classList.add('in'); o.disconnect(); } }, {threshold:.3});
  o.observe(sc);
}

/* ---------- מסך פתיחה ---------- */
window.MadlikIntro = new Promise(res => {
  const el = document.getElementById('intro');
  let seen = false; try{ seen = sessionStorage.getItem('madlik_intro') === '1'; sessionStorage.setItem('madlik_intro','1'); }catch(e){}
  if(!el || seen || reduce){ if(el) el.remove(); return res(); }
  setTimeout(() => { el.classList.add('out'); res(); setTimeout(()=>el.remove(), 900); }, 1700);
});

/* ---------- כפתורים מגנטיים ---------- */
function magnetic(){
  if(!fine || reduce) return;
  document.addEventListener('pointermove', e => {
    const b = e.target.closest('.btn-gold, .to-top');
    document.querySelectorAll('.magnet').forEach(x => { if(x !== b){ x.style.translate = ''; x.classList.remove('magnet'); } });
    if(!b) return;
    const r = b.getBoundingClientRect(); b.classList.add('magnet');
    b.style.translate = `${(e.clientX - r.left - r.width/2)*.2}px ${(e.clientY - r.top - r.height/2)*.3}px`;
  }, {passive:true});
}

/* ---------- הופעה בגלילה ---------- */
const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if(!e.isIntersecting) return;
  const el = e.target; io.unobserve(el); el.classList.add('in');
  if(el.classList.contains('reveal')) setTimeout(()=>el.classList.remove('reveal','in'), 1400);
}), {threshold:.12, rootMargin:'0px 0px -40px 0px'}) : null;
function reveal(root){
  if(reduce || !io) return;
  root.querySelectorAll('.cards>.card, .box, .filters, .chips, .index li, .nums div, .mask, .final .big-link').forEach(el => {
    const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
    if(!el.classList.contains('mask')) el.classList.add('reveal');
    el.style.setProperty('--d', Math.min(sib,8)*.06+'s'); io.observe(el);
  });
}

function split(root){
  root.querySelectorAll('[data-split]').forEach(el => {
    const t = el.textContent; el.textContent = '';
    [...t].forEach((ch,i) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; s.style.animationDelay = (.1 + i*.11)+'s'; s.style.setProperty('--cr', (i%2?-7:7)+'deg'); el.appendChild(s); });
  });
}

function counters(root){
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count;
    if(reduce || !('IntersectionObserver' in window)){ el.textContent = to; return; }
    const o = new IntersectionObserver(es => { if(!es[0].isIntersecting) return; o.disconnect();
      const t0 = performance.now(), dur = 1500;
      (function step(t){ const k = clamp((t-t0)/dur); el.textContent = Math.round(to*(1-Math.pow(1-k,3))); if(k<1) requestAnimationFrame(step); })(t0);
    }, {threshold:.5});
    o.observe(el);
  });
}

function onRender(main){
  split(main); counters(main); reveal(main); setup(main);
}

function init(){
  cursor(); magnetic(); mountScene();
  const h = document.querySelector('.site-header'), bar = document.getElementById('progress'), top = document.getElementById('toTop');
  const onScroll = () => {
    h.classList.toggle('scrolled', scrollY > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    if(bar) bar.style.transform = `scaleX(${max > 0 ? scrollY/max : 0})`;
    if(top) top.classList.toggle('show', scrollY > 700);
  };
  addEventListener('scroll', onScroll, {passive:true}); onScroll();
  if(top) top.onclick = () => scrollTo({top:0, behavior:'smooth'});
}
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();

return {menorah, dreidel, onRender};
})();
