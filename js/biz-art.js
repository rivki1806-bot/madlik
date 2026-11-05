// מדליק – איורים לכרטיסי בעלי העסקים (בלי דמויות): איור גדול בראש כל כרטיס, לפי סוג השירות
window.MadlikBizArt = (function(){
'use strict';
const N = '#3d2a1f', O = '#ff7a2e', Y = '#ffc42d', B = '#4a9be0', W = '#ffffff', CR = '#fff8ee', GO = '#f0b94a', PK = '#ff8aa0', GR = '#5cc79a';
const bg = (id, c1, c2) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="270" fill="url(#${id})"/>`;
const st = `stroke="${N}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const dots = (n, y, amp) => { let s = `<path d="M-10 ${y}Q100 ${y + amp} 200 ${y}T410 ${y}" fill="none" stroke="${N}" stroke-width="2" opacity=".45"/>`; for (let i = 0; i < n; i++){ const x = 20 + i * (360 / (n - 1)), yy = y + Math.sin(i / (n - 1) * Math.PI * 2) * amp * .5 + amp * .35; s += `<circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r="7" fill="${Y}" opacity=".35"/><circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r="3.4" fill="#fff6c4"/>`; } return s; };
const flame = (x, y, s) => `<path d="M${x} ${y - 16*s}c${6*s} ${7*s} ${8*s} ${12*s} ${8*s} ${16*s}a${8*s} ${8*s} 0 0 1-${16*s} 0c0-${5*s} ${2*s}-${9*s} ${8*s}-${16*s}z" fill="${O}" ${st} stroke-width="2"/><path d="M${x} ${y - 7*s}c${2*s} ${3*s} ${3*s} ${6*s} ${3*s} ${8*s}a${3*s} ${3*s} 0 0 1-${6*s} 0c0-${2*s} ${s}-${5*s} ${3*s}-${8*s}z" fill="${Y}"/>`;
const donut = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e8a15a" ${st}/><path d="M${x - r*.8} ${y - r*.3}a${r*.85} ${r*.75} 0 0 1 ${r*1.6} 0" fill="none" stroke="${PK}" stroke-width="${r*.5}" stroke-linecap="round"/><circle cx="${x}" cy="${y + r*.1}" r="${r*.22}" fill="#fbe6c8" stroke="${N}" stroke-width="2"/>`;
const balloon = (x, y, r, c) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r*1.18}" fill="${c}" ${st} stroke-width="2.5"/><ellipse cx="${x - r*.35}" cy="${y - r*.4}" rx="${r*.18}" ry="${r*.3}" fill="#fff" opacity=".55"/><path d="M${x} ${y + r*1.18}l-4 8h8z" fill="${c}" ${st} stroke-width="2"/><path d="M${x} ${y + r*1.18 + 8}q-8 22 4 44" fill="none" stroke="${N}" stroke-width="1.8" opacity=".6"/>`;

const S = {
  hall: () => bg('bzh', '#fff6e8', '#ffdcae') + dots(9, 30, 18) +
    [70, 200, 330].map(x => `<path d="M${x - 34} 150V80a34 34 0 0 1 68 0v70z" fill="#cfe6ff" ${st}/><path d="M${x} 46V150M${x - 34} 100H${x + 34}" stroke="${N}" stroke-width="2.4" opacity=".55"/>`).join('') +
    `<path d="M200 0V52" stroke="${N}" stroke-width="3"/><path d="M200 56a52 28 0 0 0 52 0M200 56a52 28 0 0 1-52 0" fill="none" ${st}/><path d="M150 62h100" ${st}/>` + [150, 175, 200, 225, 250].map(x => flame(x, 56, .5)).join('') +
    `<rect x="0" y="168" width="400" height="102" fill="#f6c98a"/><path d="M0 168H400" ${st}/>` +
    [90, 310].map(x => `<ellipse cx="${x}" cy="206" rx="72" ry="22" fill="#fff" ${st}/><path d="M${x - 72} 206v26q72 24 144 0v-26" fill="#fff" ${st}/><path d="M${x - 40} 190h80" stroke="${N}" stroke-width="2" opacity=".4"/>${flame(x, 196, .6)}`).join('') + [200].map(x => `<ellipse cx="${x}" cy="242" rx="58" ry="17" fill="#fff" ${st}/><path d="M${x - 58} 242v18q58 18 116 0v-18" fill="#fff" ${st}/>${flame(x, 234, .55)}`).join(''),
  catering: () => bg('bzc', '#fff3e0', '#ffd7a2') + dots(8, 26, 16) +
    `<rect x="0" y="170" width="400" height="100" fill="#fff8ee"/><path d="M0 170H400" ${st}/><path d="M0 196H400M0 226H400" stroke="${GO}" stroke-width="3" opacity=".55" stroke-dasharray="10 12"/>` +
    `<path d="M92 170a108 96 0 0 1 216 0z" fill="#e9eef7" ${st}/><path d="M122 140a88 76 0 0 1 60-56" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".85"/><circle cx="200" cy="64" r="11" fill="#e9eef7" ${st}/><rect x="70" y="170" width="260" height="14" rx="7" fill="#c9d3e3" ${st}/>` +
    [[120, 214], [200, 222], [280, 214]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="44" ry="13" fill="#fff" ${st}/><ellipse cx="${x}" cy="${y - 3}" rx="30" ry="8" fill="#f2c27a" ${st} stroke-width="2"/>${i === 1 ? `<circle cx="${x - 12}" cy="${y - 8}" r="9" fill="#e0a44a" ${st} stroke-width="2"/><circle cx="${x + 10}" cy="${y - 8}" r="9" fill="#e0a44a" ${st} stroke-width="2"/>` : ''}`).join('') +
    `<path d="M24 170l10-46h26l8 46z" fill="#cfe6ff" ${st}/><path d="M340 170l8-60h22l8 60z" fill="#ffd6a0" ${st}/><circle cx="359" cy="104" r="8" fill="${GR}" ${st} stroke-width="2.4"/>`,
  fun: () => bg('bzf', '#e8f3ff', '#c9e2ff') + dots(9, 26, 16) +
    [[60, 80, O], [110, 62, Y], [160, 84, B], [300, 70, PK], [348, 92, GR]].map(([x, y, c]) => balloon(x, y, 26, c)).join('') +
    `<rect x="196" y="104" width="12" height="100" rx="5" fill="#9aa8bd" ${st}/><rect x="170" y="196" width="64" height="14" rx="7" fill="#9aa8bd" ${st}/><rect x="180" y="62" width="44" height="58" rx="22" fill="${CR}" ${st}/><path d="M184 84h36M184 94h36" stroke="${N}" stroke-width="2.4"/><rect x="190" y="116" width="24" height="12" rx="3" fill="${N}"/>` +
    [[80, 150], [320, 150]].map(([x, y]) => `<rect x="${x - 38}" y="${y}" width="76" height="104" rx="10" fill="#4b5568" ${st}/><circle cx="${x}" cy="${y + 34}" r="20" fill="#2f3747" ${st}/><circle cx="${x}" cy="${y + 34}" r="8" fill="${Y}"/><circle cx="${x}" cy="${y + 78}" r="13" fill="#2f3747" ${st} stroke-width="2.4"/>`).join('') +
    [[40, 140, Y], [370, 120, O], [250, 150, B], [150, 160, PK]].map(([x, y, c]) => `<path d="M${x} ${y}l14 -8" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`).join(''),
  design: () => bg('bzd', '#fff1e8', '#ffd2bd') + dots(8, 24, 14) +
    [[40, 168, 30, Y], [78, 130, 34, O], [124, 100, 36, B], [176, 80, 38, PK], [232, 80, 38, GR], [284, 100, 36, Y], [330, 130, 34, O], [366, 168, 30, B], [60, 200, 22, PK], [352, 202, 22, GR]].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${st} stroke-width="2.6"/><ellipse cx="${x - r*.3}" cy="${y - r*.35}" rx="${r*.2}" ry="${r*.28}" fill="#fff" opacity=".5"/>`).join('') +
    `<rect x="0" y="228" width="400" height="42" fill="#f6d8b8"/><path d="M0 228H400" ${st}/><path d="M168 228l8 -52h48l8 52z" fill="#cfe6ff" ${st}/><path d="M200 176V132M200 150l-22 -20M200 144l24 -22" stroke="${N}" stroke-width="3" fill="none" stroke-linecap="round"/>` + [[178, 128, O], [224, 120, PK], [200, 124, Y]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="13" fill="${c}" ${st} stroke-width="2.6"/><circle cx="${x}" cy="${y}" r="4" fill="${N}" opacity=".6"/>`).join(''),
  dessert: () => bg('bzs', '#fff4e6', '#ffdcb0') + dots(8, 26, 14) +
    `<ellipse cx="200" cy="248" rx="150" ry="14" fill="#f3c78e" ${st}/><rect x="192" y="150" width="16" height="96" rx="6" fill="#e8d5b5" ${st}/><ellipse cx="200" cy="154" rx="118" ry="22" fill="#fff" ${st}/><ellipse cx="200" cy="108" rx="78" ry="17" fill="#fff" ${st}/><rect x="196" y="108" width="8" height="46" fill="#e8d5b5" ${st} stroke-width="2.4"/>` +
    [[120, 138], [160, 144], [240, 144], [280, 138]].map(([x, y]) => donut(x, y, 17)).join('') + [[165, 96], [235, 96], [200, 102]].map(([x, y]) => donut(x, y, 15)).join('') +
    `<path d="M176 244l6-34h36l6 34z" fill="#ff9a2e" ${st}/><path d="M176 210a24 20 0 0 1 48 0z" fill="#ffd6e0" ${st}/>` + flame(200, 176, .75),
  photo: () => bg('bzp', '#eef4ff', '#d3e3ff') + dots(8, 24, 12) +
    `<path d="M20 70Q200 120 380 64" fill="none" stroke="${N}" stroke-width="2.4"/>` + [[70, 86, -8, Y], [150, 98, 5, B], [250, 98, -4, O], [330, 84, 7, PK]].map(([x, y, r, c]) => `<g transform="rotate(${r} ${x} ${y + 28})"><path d="M${x} ${y - 6}v10" ${st} stroke-width="2"/><rect x="${x - 30}" y="${y}" width="60" height="68" rx="3" fill="#fff" ${st} stroke-width="2.4"/><rect x="${x - 25}" y="${y + 5}" width="50" height="44" fill="${c}" opacity=".85"/><circle cx="${x}" cy="${y + 27}" r="9" fill="#fff" opacity=".7"/></g>`).join('') +
    `<rect x="100" y="150" width="200" height="96" rx="16" fill="#4b5568" ${st}/><rect x="100" y="150" width="200" height="30" rx="16" fill="#eef1f6" ${st}/><rect x="248" y="130" width="40" height="26" rx="6" fill="#4b5568" ${st}/><rect x="124" y="136" width="48" height="18" rx="5" fill="${O}" ${st}/><circle cx="200" cy="208" r="44" fill="#2f3747" ${st}/><circle cx="200" cy="208" r="32" fill="#7fb0e6" ${st}/><circle cx="200" cy="208" r="16" fill="#1d3557" ${st} stroke-width="2.4"/><circle cx="188" cy="196" r="6" fill="#fff" opacity=".8"/><circle cx="270" cy="168" r="5" fill="${Y}" ${st} stroke-width="2"/>`,
  shop: () => bg('bzx', '#fff6ea', '#ffe0b5') + dots(8, 26, 14) +
    `<rect x="60" y="100" width="280" height="150" fill="#fff" ${st}/>` + Array.from({ length: 8 }, (_, i) => `<path d="M${60 + i * 35} 60h35l-8 44h-19z" fill="${i % 2 ? CR : O}" ${st} stroke-width="2.4"/>`).join('') + `<rect x="60" y="48" width="280" height="14" fill="${Y}" ${st}/><rect x="96" y="132" width="86" height="64" rx="6" fill="#cfe6ff" ${st}/><rect x="222" y="132" width="86" height="118" rx="6" fill="#ffd6a0" ${st}/><circle cx="296" cy="196" r="5" fill="${N}"/>`
};
const MAP = { 'אולמות': 'hall', 'קייטרינג': 'catering', 'מפעילים': 'fun', 'מפעילות': 'fun', 'עיצוב ודקורציה': 'design', 'קינוחים': 'dessert', 'צילום': 'photo' };
const cache = {};
function get(s){
  const k = MAP[s.cat] || 'shop';
  if(!cache[k]) cache[k] = `<svg class="biz-art" viewBox="0 0 400 270" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${S[k]()}</svg>`;
  return cache[k];
}
return { get };
})();
