// מדליק – סצנות אמצע משחק, חלק א: זיכרון, קרב המילים, אליאס, חידון, תשבץ, גלגל, צופן, שמונה נרות, בינגו
(function(){
'use strict';
const A = window.MadlikArt, S = A.S, {N, O, G, B, P, T, R, CY, GO, FP, FB, FS, tx, rc, pill, gcard, spark, flame, donut, dreidel, ring, btn, menorah, back} = A.H;

S.memory = () => {
  let s = '';
  const cw = 34, ch = 44, gx = 6, x0 = 33, ys = [40, 92], face = {1: 'donut', 8: 'donut', 3: 'spark', 10: 'spark', 5: 'dreidel'};
  for (let i = 0; i < 12; i++){
    const x = x0 + (i % 6) * (cw + gx), y = ys[Math.floor(i / 6)], f = face[i], matched = [1, 8, 3, 10].includes(i);
    if (!f){ s += back(x, y, cw, ch); continue; }
    const cx = x + cw / 2, cy = y + ch / 2;
    s += (matched ? `<rect x="${x - 3}" y="${y - 3}" width="${cw + 6}" height="${ch + 6}" rx="9" fill="#3ddc97" opacity=".45"/>` : '') + rc(x, y, cw, ch, 6, 'url(#gaC)', matched ? T : GO, 2.4) + (f === 'donut' ? donut(cx, cy, 11) : f === 'spark' ? flame(cx, cy + 8, 1.6) : dreidel(cx, cy + 6, .85, 8));
  }
  return s + pill(14, 17, 74, 18, 'rgba(7,19,64,.7)', 'זוגות 2/6', 11, '#ffe9a0', GO) + menorah(232, 30, .22, [0, 1, 2, 3]);
};

S.battle = () => pill(14, 22, 72, 20, '#ff6b6b', 'הלביבות', 12) + pill(228, 22, 58, 20, 'rgba(7,19,64,.7)', '3 נק׳', 11, '#ffe9a0', GO) + ring(150, 36, 15, .62, '18') +
  gcard(48, 58, 204, 56, tx(150, 101, 'סביבון', 34, G, FS, 'opacity=".6"') + tx(150, 98, 'סביבון', 34, N)) + pill(60, 51, 52, 15, O, 'טאבו', 10, '#fff') +
  ['לסובב', 'משחק', 'נס'].map((w, i) => pill(62 + i * 60, 124, 54, 16, '#ffe1d6', w, 10, '#a83a1c', '#ffb49a')).join('');

S.elias = () => pill(14, 22, 72, 20, '#ffd23f', 'הסופגניות', 12) + pill(228, 22, 58, 20, 'rgba(7,19,64,.7)', '7', 12, '#ffe9a0', GO) + ring(150, 36, 15, .35, '41', '#ff6b6b') +
  gcard(58, 58, 184, 48, tx(150, 93, 'לביבה', 32, N)) + btn(62, 116, 80, 24, '#7bf0b8', '#14805a', '✓ ניחשו', 13) + btn(158, 116, 80, 24, '#ffe58a', '#a87300', 'דילוג', 13);

S.quiz = () => rc(24, 22, 252, 7, 3.5, 'rgba(255,255,255,.18)') + rc(24, 22, 150, 7, 3.5, 'url(#gaG)') +
  tx(150, 52, 'כמה ימים נמשך חנוכה?', 14, '#fff', FS, 'stroke="#10264d" stroke-width=".6"') +
  [[24, 62, '#ff6b6b', 'א', '8', 1], [156, 62, CY, 'ב', '12', 0], [24, 104, G, 'ג', '6', 0], [156, 104, T, 'ד', '10', 0]].map(([x, y, c, l, a, ok]) =>
    `<g opacity="${ok ? 1 : .5}">${ok ? `<rect x="${x - 4}" y="${y - 4}" width="128" height="40" rx="14" fill="#fff6c4" opacity=".7"/>` : ''}${rc(x, y, 120, 32, 11, c, '#fff', 2)}<circle cx="${x + 103}" cy="${y + 16}" r="10" fill="rgba(255,255,255,.55)"/>${tx(x + 103, y + 21, l, 13, N)}${tx(x + 46, y + 22, a, 17, N, FB)}</g>`).join('');

S.crossword = () => {
  const X = c => 205 - 22 * c, Y = r => 30 + 22 * r;
  const cells = [[5, 2, 'ל'], [4, 2, 'ב'], [3, 2, 'י'], [2, 2, ''], [1, 2, 'ה'], [3, 1, 'ש'], [3, 3, ''], [5, 3, 'נ'], [5, 4, 'ס']];
  let s = '';
  cells.forEach(([c, r, l]) => { const cur = c === 2 && r === 2; s += (cur ? `<rect x="${X(c) - 3}" y="${Y(r) - 3}" width="28" height="28" rx="5" fill="#ffd23f" opacity=".6"/>` : '') + rc(X(c), Y(r), 22, 22, 3, cur ? '#ffe58a' : 'url(#gaC)', N, 1.8) + (l ? tx(X(c) + 11, Y(r) + 17, l, 16, N) : ''); });
  s += tx(X(5) + 5, Y(2) + 8, '1', 7, R, FP) + tx(X(3) + 5, Y(1) + 8, '2', 7, R, FP);
  return s + gcard(10, 40, 76, 56, '<path d="M20 58h56M20 70h46M20 82h52" stroke="#2f6bff" stroke-width="3.5" stroke-linecap="round"/>', 8, -4) + btn(222, 98, 66, 22, G, '#b86a00', 'בדיקה', 12) +
    `<g transform="rotate(30 262 70)">${rc(256, 38, 11, 54, 3, O, N, 1.6)}<path d="M256 92l5.5 11l5.5-11z" fill="#fffaf0" stroke="${N}" stroke-width="1.4"/></g>`;
};

S.wheel = () => {
  const cols = [O, G, B, P, T, '#ffffff', '#a685e2', CY]; let s = `<circle cx="150" cy="88" r="62" fill="url(#gaG)" stroke="#8a5a00" stroke-width="2"/>`;
  for (let i = 0; i < 16; i++){ const a = i * Math.PI / 8; s += `<circle cx="${(150 + 57 * Math.cos(a)).toFixed(1)}" cy="${(88 + 57 * Math.sin(a)).toFixed(1)}" r="2.4" fill="${i % 2 ? '#fffbe0' : '#ff9a05'}"/>`; }
  s += `<g transform="rotate(-16 150 88)">${cols.map((c, i) => { const a1 = i * Math.PI / 4, a2 = (i + 1) * Math.PI / 4, r = 50; return `<path d="M150 88L${(150 + r * Math.cos(a1)).toFixed(1)} ${(88 + r * Math.sin(a1)).toFixed(1)}A${r} ${r} 0 0 1 ${(150 + r * Math.cos(a2)).toFixed(1)} ${(88 + r * Math.sin(a2)).toFixed(1)}z" fill="${c}" stroke="${N}" stroke-width="1.6"/>`; }).join('')}</g><circle cx="150" cy="88" r="9" fill="${N}" stroke="${GO}" stroke-width="2.5"/>`;
  return s + `<path d="M140 18h20l-10 22z" fill="#e8353b" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>` + `<path d="M222 70a58 58 0 0 1 8 34M232 62a68 68 0 0 1 10 44" stroke="#fff" stroke-opacity=".5" stroke-width="2.5" fill="none" stroke-linecap="round"/>` + btn(14, 100, 60, 22, G, '#b86a00', 'סובבו!', 12) + pill(14, 62, 74, 18, 'rgba(255,255,255,.92)', 'לשיר שיר', 10.5, N, GO) + spark(270, 40, 1.2) + spark(28, 40, .9, '#fff');
};

S.cipher = () => {
  let s = ['א↔ת', 'ב↔ש', 'ג↔ר', 'ד↔ק'].map((k, i) => pill(36 + i * 62, 20, 54, 16, 'rgba(255,255,255,.93)', k, 10.5, N, GO)).join('');
  const rows = [[['ת', 'ל'], ['ש', 'ב'], ['נ', ''], ['ש', 'ב'], ['ס', 'ה']], [['פ', ''], ['ר', ''], ['צ', 'ו'], ['ע', '']]];
  rows.forEach((row, ri) => row.forEach(([code, l], i) => { const x = 252 - i * 44 - (ri ? 22 : 0), y = ri ? 118 : 74, cur = ri === 0 && i === 2; s += (cur ? `<rect x="${x - 21}" y="${y - 24}" width="40" height="54" rx="8" fill="#ffd23f" opacity=".5"/>` : '') + tx(x - 1, y - 4, code, 20, '#ffb347') + `<path d="M${x - 18} ${y + 16}h34" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>` + (l ? tx(x - 1, y + 12, l, 20, G) : ''); }));
  return s;
};

S.candles = () => menorah(150, 66, .74, [0, 2, 3, 5, 7], [1, 4, 6, 8]) + [['ל', 1], ['ב', 1], ['', 0], ['ב', 1], ['ה', 1]].map(([l], i) => { const x = 215 - i * 33; return `<path d="M${x - 11} 110h24" stroke="#ffe9a0" stroke-width="3" stroke-linecap="round"/>` + (l ? tx(x + 1, 107, l, 20, G) : ''); }).join('') +
  ['אבגדהוזחט', 'יכלמנסעפצ'].map((row, ri) => [...row].map((k, i) => { const dim = ri === 1 && [2, 6].includes(i), hit = ri === 0 && [1, 4].includes(i); return rc(60 + i * 20, 117 + ri * 15, 16, 12, 3, hit ? '#7bf0b8' : dim ? 'rgba(255,255,255,.2)' : '#fff', 'none') + tx(68 + i * 20, 126.5 + ri * 15, k, 9, dim ? 'rgba(255,255,255,.5)' : N, FP); }).join('')).join('');

S.bingo = () => {
  let s = `<g transform="rotate(-4 150 88)">${rc(78, 24, 144, 118, 9, 'url(#gaC)', GO, 2.6)}${rc(78, 24, 144, 20, 9, O, GO, 2.6)}`;
  [...'בינגו'].forEach((l, i) => { s += tx(204 - i * 28.8, 39, l, 14, '#fff'); });
  const stamp = [0, 3, 6, 7, 12, 14, 18, 19, 23], marks = [CY, P, G, T, B];
  for (let i = 0; i < 25; i++){ const x = 82 + (i % 5) * 28.4, y = 48 + Math.floor(i / 5) * 18.4; s += rc(x, y, 26, 16, 3, '#fff6dc', 'none') + (stamp.includes(i) ? `<circle cx="${x + 13}" cy="${y + 8}" r="7.2" fill="${marks[i % 5]}" stroke="#fff" stroke-width="1.4" opacity=".95"/>` : tx(x + 13, y + 12, '◆', 8, '#f2d28a', 'sans-serif')); }
  return s + '</g>' + `<circle cx="38" cy="76" r="22" fill="url(#gaC)" stroke="${GO}" stroke-width="3"/>` + tx(38, 86, '34', 22, R, FB) + `<circle cx="262" cy="108" r="16" fill="url(#gaC)" stroke="${GO}" stroke-width="3" opacity=".9"/>` + tx(262, 115, '7', 17, B, FB);
};

S.quartets = () => {
  const ic = [() => donut(0, 0, 9), () => dreidel(0, 10, .65), () => flame(0, 6, 1), () => flame(0, 8, 1.5), () => donut(0, 0, 9)], rot = [-30, -15, 0, 15, 30];
  let s = '';
  [0, 1, 3, 4, 2].forEach(i => { const lift = i === 2 ? -14 : 0; s += `<g transform="translate(150 188) rotate(${rot[i]}) translate(0 ${-124 + lift})"><rect x="-27" y="-38" width="54" height="76" rx="8" fill="url(#gaC)" stroke="${i === 2 ? G : GO}" stroke-width="${i === 2 ? 3.4 : 2.6}"/><g transform="translate(0 -6)">${ic[i]()}</g><path d="M-16 20h32M-12 28h24" stroke="${B}" stroke-width="3" stroke-linecap="round"/></g>`; });
  return s + pill(14, 22, 80, 18, 'rgba(7,19,64,.7)', 'רביעיות 2', 11, '#ffe9a0', GO) + `<path d="M224 38h56a8 8 0 0 1 8 8v14a8 8 0 0 1-8 8h-8l-8 8v-8h-40a8 8 0 0 1-8-8V46a8 8 0 0 1 8-8z" fill="#fff" stroke="${GO}" stroke-width="2"/>` + tx(256, 58, 'יש לך סופגנייה?', 9, N, FP);
};
})();
