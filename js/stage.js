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
    ${star(cx,330,34)}
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
    const themes = ['orange','cream','blue','orange','cream','blue','orange','ink'];
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
  cursor(); magnetic();
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
