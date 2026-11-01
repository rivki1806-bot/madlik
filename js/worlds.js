// מדליק – עולמות: לכל מדור אווירה, איור מונפש וחלקיקים צפים משלו
window.MadlikWorlds = (function(){
'use strict';
const SEC = {home:'home', games:'games', game:'games', create:'create', creator:'create', studio:'studio', design:'studio',
  recipes:'recipes', recipe:'recipes', suppliers:'biz', supplier:'biz', advertise:'biz', me:'me', submit:'submit', admin:'admin', edit:'edit', search:'search'};
const WORLDS = ['games','create','studio','recipes','biz','me','submit'];

/* ---------- איורים לראש כל עמוד ---------- */
const art = {
  recipes(){
    const fleck = (x,y) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#9a5a14" opacity=".65"/>`;
    let stack = '';
    [0,1,2].forEach(i => {
      const cy = 192 - i*24, rx = 80 - i*4;
      stack += `<path d="M${160-rx} ${cy} v14 a${rx} 20 0 0 0 ${2*rx} 0 v-14z" fill="#b87722"/><ellipse cx="160" cy="${cy}" rx="${rx}" ry="20" fill="#e0a13f"/><ellipse cx="160" cy="${cy-1}" rx="${rx-12}" ry="13" fill="#ecb85a" opacity=".75"/>`
        + [[-40,-4],[-10,4],[26,-6],[48,3],[2,-9],[-26,6]].map(p=>fleck(160+p[0]*rx/80, cy+p[1])).join('');
    });
    return `<svg viewBox="0 0 320 270" class="art-svg">
      <ellipse cx="160" cy="236" rx="146" ry="26" fill="#d9c7a6"/><ellipse cx="160" cy="230" rx="146" ry="26" fill="#fffaf0"/><ellipse cx="160" cy="230" rx="108" ry="18" fill="#f1e5cf"/>
      ${stack}
      <path d="M128 118 q8 -24 32 -24 q26 0 32 24 q-16 12 -32 9 q-18 3 -32 -9z" fill="#fffdf6" stroke="#e6dcc8" stroke-width="1.5"/>
      <g stroke="#6b8f3a" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M160 100 l-8 -22"/><path d="M160 100 l3 -26"/><path d="M160 100 l13 -20"/><path d="M152 80 l-7 -3 M163 74 l-6 -5 M173 80 l7 -4"/></g>
      <g class="steam" fill="none" stroke="#bfa98a" stroke-width="6" stroke-linecap="round"><path class="s1" d="M118 96 q-16 -22 0 -42 q16 -20 0 -42"/><path class="s2" d="M160 70 q-16 -22 0 -42 q16 -20 0 -42"/><path class="s3" d="M204 96 q-16 -22 0 -42 q16 -20 0 -42"/></g>
      <g fill="#6b8f3a"><ellipse cx="44" cy="232" rx="10" ry="4.5" transform="rotate(-24 44 232)"/><ellipse cx="288" cy="236" rx="10" ry="4.5" transform="rotate(20 288 236)"/></g>
      <g fill="#e4572e"><circle cx="58" cy="238" r="5"/><circle cx="272" cy="240" r="5"/></g>
    </svg>`;
  },
  games(){
    const P = {1:[[50,50]],2:[[28,28],[72,72]],3:[[26,26],[50,50],[74,74]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,24],[72,24],[28,50],[72,50],[28,76],[72,76]]};
    const face = (n,c) => `<i class="df ${c}">${P[n].map(p=>`<s style="left:${p[0]}%;top:${p[1]}%"></s>`).join('')}</i>`;
    return `<div class="die3d"><div class="die">${face(1,'d1')}${face(6,'d6')}${face(2,'d2')}${face(5,'d5')}${face(3,'d3')}${face(4,'d4')}</div></div>
      <div class="pcard pc1"><b></b><u></u></div><div class="pcard pc2"><b></b><u></u></div><div class="pcard pc3"><b></b><u></u></div>`;
  },
  create(){
    return `<svg viewBox="0 0 320 240" class="art-svg">
      <path class="squig" pathLength="1" d="M20 190 C 60 120, 100 230, 140 150 S 220 110, 300 170" fill="none" stroke="#2f6bff" stroke-width="5" stroke-linecap="round"/>
      <g class="doodle" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="3.5">
        <path stroke="#ff8fab" d="M62 52 l8 20 22 2 -17 14 6 21 -19 -12 -19 12 6 -21 -17 -14 22 -2z"/>
        <path stroke="#f0b800" d="M236 40 q14 -22 28 0 q14 22 28 0"/><circle stroke="#2f6bff" cx="200" cy="64" r="11"/>
        <path stroke="#4cc9a0" d="M120 40 l0 34 M103 57 l34 0"/>
      </g></svg>
      <div class="pencil"><svg viewBox="0 0 92 16"><rect x="0" y="1" width="12" height="14" rx="3" fill="#ff8fab"/><rect x="12" y="1" width="8" height="14" fill="#c9ced6"/><rect x="20" y="1" width="50" height="14" fill="#ffd23f"/><path d="M70 1 L86 8 L70 15Z" fill="#f2c9a0"/><path d="M82 6.2 L91 8 L82 9.8Z" fill="#33363d"/></svg></div>`;
  },
  studio(){
    const cols = ['#00b7eb','#ec008c','#ffed00','#f4f4f8','#262a38'], nm = ['C','M','Y','W','K'];
    return `<div class="fan">${cols.map((c,i)=>`<i class="sw" style="--i:${i};--c:${c}"><span>${nm[i]}</span></i>`).join('')}<u class="rivet"></u></div><div class="regmark"></div>`;
  },
  biz(){
    const n = 28, w = 1400/n; let st = '';
    for(let i=0;i<n;i++){ const x = i*w, c = i%2 ? '#fdf3df' : '#ff6f59'; st += `<rect x="${x.toFixed(1)}" y="0" width="${(w+.5).toFixed(1)}" height="56" fill="${c}"/><path d="M${x.toFixed(1)} 56 a${(w/2).toFixed(1)} ${(w/2).toFixed(1)} 0 0 0 ${w.toFixed(1)} 0z" fill="${c}"/>`; }
    return `<svg viewBox="0 0 1400 90" preserveAspectRatio="none" class="awning-svg"><rect x="0" y="0" width="1400" height="10" fill="#0a3f48"/>${st}<rect x="0" y="52" width="1400" height="5" fill="rgba(0,0,0,.12)"/></svg>
      <div class="opensign"><i></i><b>פתוח</b></div>`;
  },
  me(){
    return `<svg viewBox="0 0 200 180" class="art-svg"><path class="heart-d" pathLength="1" d="M100 160 C 20 105, 10 50, 55 35 C 80 27, 95 42, 100 55 C 105 42, 120 27, 145 35 C 190 50, 180 105, 100 160Z" fill="rgba(255,180,200,.55)" stroke="#7b57c9" stroke-width="5" stroke-linejoin="round"/><g stroke="#7b57c9" stroke-width="3" stroke-linecap="round" class="spark"><path d="M168 24 v16 M160 32 h16"/><path d="M30 126 v12 M24 132 h12"/></g></svg>`;
  },
  submit(){
    return `<svg viewBox="0 0 320 220" class="art-svg"><path class="trail" d="M10 190 C 80 190, 100 60, 190 90 S 280 40, 310 20" fill="none" stroke="#1b2b55" stroke-width="3" stroke-dasharray="4 11" stroke-linecap="round" opacity=".55"/></svg>
      <div class="plane"><svg viewBox="0 0 64 40"><path d="M2 6 L62 20 L2 34 L16 20Z" fill="#fff" stroke="#1b2b55" stroke-width="2.5" stroke-linejoin="round"/><path d="M16 20 L62 20" stroke="#d6403a" stroke-width="2.5"/></svg></div>`;
  }
};

/* ---------- חלקיקים צפים ברקע ---------- */
const AMB = {
  games:  {n:18, cls:'confetti fall', colors:['#ffd23f','#ff6b6b','#3ddc97','#4cc9f0','#ffffff'], size:[10,20], dur:[14,26]},
  recipes:{n:14, cls:'leaf fall',     colors:['#6b8f3a','#8fb04f','#e4572e','#f6c453'], size:[16,30], dur:[16,28]},
  create: {n:14, cls:'star rise',     colors:['#ffd23f','#ff8fab','#2f6bff','#4cc9a0'], size:[16,30], dur:[16,28]},
  studio: {n:18, cls:'dot pulse',     colors:['#ec008c','#00b7eb','#ffed00'], size:[10,34], dur:[6,11]},
  biz:    {n:10, cls:'balloon rise',  colors:['#ff6f59','#ffd166','#fdf3df','#06d6a0'], size:[26,46], dur:[18,30]},
  me:     {n:16, cls:'heart rise',    colors:['#ffb4c8','#7b57c9','#ff8fab','#b9e4d0'], size:[16,34], dur:[14,24]},
  submit: {n:10, cls:'plane glide',   colors:['#d6403a','#1b4fb3','#ffffff','#1b2b55'], size:[22,40], dur:[14,24]}
};
let ambEl = null;
function ambient(sec){
  if(!ambEl){ ambEl = document.createElement('div'); ambEl.className = 'amb'; ambEl.setAttribute('aria-hidden','true'); document.body.appendChild(ambEl); }
  const cfg = AMB[sec];
  ambEl.innerHTML = '';
  if(!cfg){ ambEl.className = 'amb'; return; }
  ambEl.className = 'amb ' + cfg.cls;
  const r = (a,b) => a + Math.random()*(b-a);
  let html = '';
  for(let i=0;i<cfg.n;i++){
    const s = r(cfg.size[0], cfg.size[1]), d = r(cfg.dur[0], cfg.dur[1]);
    html += `<i class="v${i%3}" style="--x:${r(2,98).toFixed(1)}%;--y:${r(6,94).toFixed(1)}%;--s:${s.toFixed(0)}px;--d:${d.toFixed(1)}s;--dl:${(-r(0,d)).toFixed(1)}s;--c:${cfg.colors[i%cfg.colors.length]};--dx:${r(-14,14).toFixed(1)}vw;--r:${r(-360,360).toFixed(0)}deg"></i>`;
  }
  ambEl.innerHTML = html;
}

/* ---------- הפעלה אחרי כל רינדור ---------- */
function apply(name, root){
  const sec = SEC[name] || 'home', world = WORLDS.includes(sec);
  document.body.dataset.sec = sec;
  if(world) document.body.dataset.world = sec; else delete document.body.dataset.world;
  ambient(world ? sec : null);
  const head = root.querySelector('.page-head');
  if(head && world && art[sec]) head.insertAdjacentHTML('beforeend', `<div class="head-art head-art-${sec}" aria-hidden="true">${art[sec]()}</div>`);
  root.querySelectorAll('.cards>.card').forEach((c,i)=>c.style.setProperty('--i', i));
  // מצרכים שמסמנים בלחיצה, כמו ברשימת קניות על דף
  root.querySelectorAll('.ing-list').forEach(ul => { ul.onclick = e => { const li = e.target.closest('li'); if(li) li.classList.toggle('done'); }; });
}

return {apply, art:sec => art[sec] ? art[sec]() : ''};
})();
