// מדליק – תמונות אמצע משחק לכרטיסי המשחקים: כל כרטיס מראה את המשחק באמצע התור, בלי דמויות
// הקובץ הזה מכיל את אבני הבניין והמסגרת. הסצנות עצמן בקבצים game-scenes-a.js ו־game-scenes-b.js
window.MadlikArt = (function(){
'use strict';
const N = '#10264d', O = '#ff6a00', G = '#ffd23f', W = '#ffffff', B = '#2f80ed', P = '#ff5c8a', T = '#3ddc97', R = '#e4572e', CY = '#4cc9f0', GO = '#f5c34f';
const FS = 'Suez One,Secular One,sans-serif', FB = 'Rubik Bubbles,Secular One,sans-serif', FP = 'Playpen Sans Hebrew,Assistant,sans-serif';
const st = `stroke="${N}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

const tx = (x, y, s, sz, fill, fam, ex) => `<text x="${x}" y="${y}" font-size="${sz}" fill="${fill}" text-anchor="middle" font-family="${fam || FS}" ${ex || ''}>${s}</text>`;
const rc = (x, y, w, h, r, fill, stroke, sw, ex) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw || 2}"` : ''} ${ex || ''}/>`;
const pill = (x, y, w, h, fill, label, sz, col, stroke) => rc(x, y, w, h, h / 2, fill, stroke || 'rgba(255,255,255,.85)', 1.6) + tx(x + w / 2, y + h * .72, label, sz || h * .6, col || N);
const gcard = (x, y, w, h, inner, r, rot) => `<g transform="rotate(${rot || 0} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r || 9}" fill="url(#gaC)" stroke="${GO}" stroke-width="2.6"/><rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${h - 6}" rx="${(r || 9) - 2}" fill="none" stroke="#fff" stroke-opacity=".9"/>${inner || ''}</g>`;
const spark = (x, y, s, c) => `<circle cx="${x}" cy="${y}" r="${3.2*s}" fill="${c || G}" opacity=".3"/><circle cx="${x}" cy="${y}" r="${1.5*s}" fill="${c || G}"/>`;
const flame = (x, y, s) => `<path d="M${x} ${y - 14*s}c${5*s} ${6*s} ${7*s} ${10*s} ${7*s} ${14*s}a${7*s} ${7*s} 0 0 1-${14*s} 0c0-${4*s} ${2*s}-${8*s} ${7*s}-${14*s}z" fill="${O}" stroke="${N}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${x} ${y - 6*s}c${2*s} ${3*s} ${3*s} ${5*s} ${3*s} ${7*s}a${3*s} ${3*s} 0 0 1-${6*s} 0c0-${2*s} ${s}-${4*s} ${3*s}-${7*s}z" fill="${G}"/>`;
const donut = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e8a15a" ${st}/><path d="M${x - r*.8} ${y - r*.3}a${r*.85} ${r*.75} 0 0 1 ${r*1.6} 0" fill="none" stroke="${P}" stroke-width="${r*.5}" stroke-linecap="round"/><circle cx="${x}" cy="${y + r*.1}" r="${r*.22}" fill="#c0392b"/>`;
const dreidel = (x, y, s, rot) => `<g transform="rotate(${rot || 0} ${x} ${y})"><rect x="${x - 2*s}" y="${y - 30*s}" width="${4*s}" height="${10*s}" rx="${2*s}" fill="${N}"/><path d="M${x - 14*s} ${y - 20*s}h${28*s}v${16*s}l-${14*s} ${18*s}l-${14*s}-${18*s}z" fill="${B}" ${st}/><text x="${x}" y="${y - 6*s}" font-size="${11*s}" font-weight="800" fill="#fff" text-anchor="middle" font-family="Assistant,sans-serif">נ</text></g>`;
const ring = (cx, cy, r, frac, label, col) => { const c = 2 * Math.PI * r; return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(7,19,64,.55)" stroke="rgba(255,255,255,.2)" stroke-width="4"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col || G}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>` + tx(cx, cy + r * .38, label, r * 1.05, '#fff', FB); };
const btn = (x, y, w, h, c1, c2, label, sz) => `<rect x="${x}" y="${y + 3}" width="${w}" height="${h}" rx="${h / 2.4}" fill="${c2}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2.4}" fill="${c1}" stroke="#fff" stroke-opacity=".85" stroke-width="1.4"/>` + tx(x + w / 2, y + h * .72, label, sz || h * .6, N);
const menorah = (cx, cy, sc, lit, out) => {
  const xs = [16, 40, 64, 88, 112, 136, 160, 184], cols = [B, W, P, T];
  let s = `<g transform="translate(${cx - 100*sc} ${cy - 62*sc}) scale(${sc})"><path d="M100 50V104" stroke="${GO}" stroke-width="6" stroke-linecap="round"/>`;
  [12, 36, 60, 84].forEach(r => { s += `<path d="M${100 - r} 50a${r} ${r*.55} 0 0 0 ${2*r} 0" fill="none" stroke="${GO}" stroke-width="6"/>`; });
  s += `<path d="M62 112h76l-14-12h-48z" fill="${GO}" ${st}/>`;
  xs.forEach((x, i) => { const on = lit.includes(i + 1), off = (out || []).includes(i + 1); s += rc(x - 5, 28, 10, 22, 2.5, cols[i % 4], N, 1.6) + (on ? flame(x, 26, .85) : off ? `<path d="M${x} 24c-4-5 4-8 0-13" fill="none" stroke="#c8d3ee" stroke-width="2" stroke-linecap="round" opacity=".7"/>` : ''); });
  s += rc(95, 14, 10, 32, 2.5, W, N, 1.6) + (lit.includes(0) ? flame(100, 12, 1) : '') + '</g>';
  return s;
};
const back = (x, y, w, h) => rc(x, y, w, h, 6, 'url(#gaBk)', GO, 2.2) + `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w * .22}" fill="url(#gaG)" stroke="#8a5a00" stroke-width="1.2"/>` + tx(x + w / 2, y + h / 2 + w * .1, '◆', w * .3, '#7a4b00', 'sans-serif');

const DEFS = `<linearGradient id="gaN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1646"/><stop offset="1" stop-color="#1b3c9c"/></linearGradient><radialGradient id="gaGlow" cx=".5" cy="1.15" r=".85"><stop offset="0" stop-color="#ffa830" stop-opacity=".6"/><stop offset="1" stop-color="#ffa830" stop-opacity="0"/></radialGradient><linearGradient id="gaC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffef9"/><stop offset="1" stop-color="#ffefba"/></linearGradient><linearGradient id="gaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a8"/><stop offset=".5" stop-color="#ffc83a"/><stop offset="1" stop-color="#ff9a05"/></linearGradient><linearGradient id="gaBk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a55d8"/><stop offset="1" stop-color="#0c1c5c"/></linearGradient>`;
const STARS = [[18, 40], [54, 60], [112, 30], [196, 44], [248, 28], [280, 66], [24, 118], [270, 120], [180, 136], [90, 140]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.6 : 2.4}" fill="#ffe9a0" opacity="${i % 2 ? .3 : .5}"/>`).join('');
const GARLAND = (() => { let s = '<path d="M-4 4Q150 24 304 4" fill="none" stroke="#e9c46a" stroke-width="1.3"/>'; const cs = [GO, W, '#5b93ff']; for (let i = 1; i < 10; i++){ const t = i / 10, x = 300 * t, y = 4 + 40 * t * (1 - t); s += `<path d="M${(x - 7).toFixed(1)} ${y.toFixed(1)}L${(x + 7).toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${(y + 13).toFixed(1)}z" fill="${cs[i % 3]}" stroke="#0a1a52" stroke-width=".8"/>`; } return s; })();
const frame = inner => `<svg class="card-art" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs>${DEFS}</defs><rect width="300" height="150" fill="url(#gaN)"/><rect width="300" height="150" fill="url(#gaGlow)"/>${STARS}${inner}${GARLAND}</svg>`;

const S = {};
const MAP = {battle:'battle', 'word-battle':'battle', elias:'elias', 'elias-hanukkah':'elias', quiz:'quiz', 'trivia-hanukkah':'quiz', 'trivia-kids':'quiz', 'trivia-adults':'quiz',
  crossword:'crossword', wheel:'wheel', cipher:'cipher', candles:'candles', 'candle-relay':'relay', quartets:'quartets', 'quartets-hanukkah':'quartets',
  bingo:'bingo', 'bingo-hanukkah':'bingo', 'bingo-kids':'bingo', whoami:'whoami', 'who-am-i':'whoami', cards:'qcards', memory:'memory', 'memory-hanukkah':'memory',
  wordsearch:'wordsearch', 'dreidel-race':'dreidel', 'dreidel-classic':'dreidel', 'family-story':'story', 'true-false':'truefalse', 'emoji-quiz':'emoji',
  'hot-potato':'potato', 'latke-chef':'pan', 'sufgania-no-hands':'donut', 'find-someone':'checklist', 'two-truths':'truths', pantomime:'stage', 'draw-guess':'draw'};
// משחק שנוסף מהניהול: בוחרים סצנה לפי סוג המשחק
const BY_TYPE = {'מילים':'elias', 'קלפים':'quartets', 'הדפסה':'bingo', 'חידון':'quiz', 'ילדים':'memory', 'ילדות':'memory', 'היכרות וגיבוש':'checklist', 'קבוצות גדולות':'dreidel'};
const cache = {};
function get(x){
  const k = MAP[x.id] || BY_TYPE[x.type]; if(!k || !S[k]) return '';
  if(!cache[k]) cache[k] = frame(S[k]());
  return cache[k];
}
const H = {N, O, G, W, B, P, T, R, CY, GO, FS, FB, FP, st, tx, rc, pill, gcard, spark, flame, donut, dreidel, ring, btn, menorah, back};
return {get, S, H, MAP, keys:() => Object.keys(S)};
})();
