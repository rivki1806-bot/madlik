// מדליק – סצנות אמצע משחק, חלק ב: מי אני, כרטיסיות, תפזורת, סביבון, סיפור, נכון/לא נכון ועוד
(function(){
'use strict';
const A = window.MadlikArt, S = A.S, {N, O, G, B, P, T, R, CY, GO, FP, FB, FS, tx, rc, pill, gcard, spark, flame, donut, dreidel, ring, btn, menorah} = A.H;

S.whoami = () => `<g transform="rotate(-6 56 82)">${rc(20, 40, 66, 66, 4, '#ffd23f', '#e8b800', 2)}${rc(38, 34, 30, 12, 2, 'rgba(255,255,255,.7)')}${tx(53, 92, '?', 52, N)}</g>` +
  [['אני אוכל?', 'כן', T, '✓'], ['אני מתוק?', 'כן', T, '✓'], ['אני עגול?', 'לא', R, '✕']].map(([q, a, c, m], i) => { const y = 28 + i * 38; return rc(108, y, 176, 30, 15, 'url(#gaC)', GO, 2.2) + tx(190, y + 20, q, 14, N, FP, 'font-weight="800"') + `<circle cx="262" cy="${y + 15}" r="11" fill="${c}" stroke="#fff" stroke-width="2"/>` + tx(262, y + 20, m, 13, '#fff', 'sans-serif'); }).join('');

S.qcards = () => gcard(70, 44, 140, 84, '', 9, -9).replace('url(#gaC)', '#cfd9ff') + gcard(84, 36, 140, 84, '', 9, 7).replace('url(#gaC)', '#a9bdff') +
  gcard(66, 32, 168, 92, tx(150, 82, '?', 40, O) + '<path d="M84 98h132M96 110h108" stroke="#2f6bff" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>', 10) + pill(16, 22, 56, 18, 'rgba(7,19,64,.7)', '5 / 12', 11, '#ffe9a0', GO) + btn(212, 122, 70, 22, G, '#b86a00', 'הבא ←', 12);

S.wordsearch = () => {
  const L = 'אבגדהוזחטיכלמנסעפצקרשת'; let s = rc(24, 26, 168, 116, 8, 'url(#gaC)', GO, 2.6);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++){ const row2 = r === 2 && c >= 2 && c <= 6; const l = row2 ? 'לביבה'[c - 2] : L[(r * 7 + c * 5 + 3) % 22]; s += tx(176 - c * 17.6, 46 + r * 18.4, l, 12, row2 ? R : N, FP, 'font-weight="800"'); }
  s += `<rect x="${176 - 6 * 17.6 - 9}" y="${46 + 2 * 18.4 - 14}" width="${5 * 17.6 + 10}" height="19" rx="9.5" fill="${O}" opacity=".3" stroke="${O}" stroke-width="2"/>`;
  s += `<g transform="rotate(48 112 78)"><rect x="76" y="68" width="76" height="19" rx="9.5" fill="${CY}" opacity=".25" stroke="${CY}" stroke-width="2"/></g>`;
  return s + ['לביבה', 'סביבון', 'נר', 'שמן'].map((w, i) => pill(204, 30 + i * 28, 80, 20, i < 2 ? 'rgba(61,220,151,.9)' : 'rgba(255,255,255,.92)', (i < 2 ? '✓ ' : '') + w, 11, N)).join('');
};

S.dreidel = () => dreidel(78, 98, 1.7, -16) + dreidel(214, 92, 1.3, 20) + `<path d="M40 128c26 9 66 9 94 0M178 124c18 6 50 6 74 0" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" fill="none" stroke-dasharray="3 6" stroke-linecap="round"/>` +
  [0, 1, 2].map(i => `<ellipse cx="150" cy="${112 - i * 7}" rx="24" ry="8" fill="url(#gaG)" stroke="#8a5a00" stroke-width="1.4"/>`).join('') + pill(112, 24, 76, 20, 'rgba(7,19,64,.7)', 'קופה: 12', 12, '#ffe9a0', GO) + ring(36, 44, 14, .5, '5') + spark(262, 44, 1.4) + spark(120, 66, .8, '#fff');

S.story = () => [[28, 24, '#ff7a7a', .92], [66, 48, CY, .92], [104, 72, '#ffe58a', 1]].map(([x, y, c, o], i) => `<g opacity="${o}">${i === 2 ? `<rect x="${x - 7}" y="${y - 6}" width="224" height="48" rx="18" fill="#fff6c4" opacity=".55"/>` : ''}${rc(x, y, 210, 36, 14, c, '#fff', 2)}${i < 2 ? `<path d="M${x + 16} ${y + 12}h150M${x + 16} ${y + 24}h104" stroke="${N}" stroke-opacity=".5" stroke-width="3.4" stroke-linecap="round"/>` : `<path d="M${x + 16} ${y + 12}h120" stroke="${N}" stroke-opacity=".5" stroke-width="3.4" stroke-linecap="round"/>${tx(x + 24, y + 31, '•••', 17, N, FS, 'opacity=".7"')}`}</g>`).join('') + ring(262, 56, 17, .7, '15') + tx(262, 94, 'תור: 4', 10, '#ffe9a0', FP) + spark(262, 120, 1, G);

S.truefalse = () => gcard(24, 22, 252, 36, tx(150, 46, 'חנוכה נמשך שבעה ימים', 16, N)) +
  [[24, T, '#14805a', 'נכון', '✓', '7'], [158, '#ff6b6b', '#a02c34', 'לא נכון', '✕', '5']].map(([x, c, d, l, m, n]) => `<rect x="${x}" y="72" width="118" height="68" rx="14" fill="${d}"/><rect x="${x}" y="68" width="118" height="68" rx="14" fill="${c}" stroke="#fff" stroke-width="2.2"/>${tx(x + 59, 106, m, 30, '#fff', 'sans-serif')}${tx(x + 59, 126, l, 14, '#fff')}<circle cx="${x + 100}" cy="82" r="11" fill="rgba(7,19,64,.55)"/>${tx(x + 100, 87, n, 13, '#ffe9a0', FB)}`).join('');

S.emoji = () => [[24, 'donut'], [104, 'dreidel'], [184, 'flame']].map(([x, k], i) => gcard(x, 32, 92, 58, k === 'donut' ? donut(x + 46, 62, 17) : k === 'dreidel' ? dreidel(x + 46, 78, 1.1, 8) : flame(x + 46, 76, 2.1), 10) + (i < 2 ? tx(x + 98, 68, '+', 18, G) : '')).join('') +
  [['ס', 1], ['', 0], ['י', 1], ['', 0], ['', 0], ['ן', 1]].map(([l], i) => { const x = 238 - i * 36; return `<path d="M${x - 13} 124h26" stroke="#ffe9a0" stroke-width="3" stroke-linecap="round"/>` + (l ? tx(x, 119, l, 20, G) : ''); }).join('');

S.potato = () => `<path d="M30 118Q100 20 170 70T270 118" stroke="#fff" stroke-opacity=".6" stroke-width="2.4" fill="none" stroke-dasharray="3 7" stroke-linecap="round"/><g transform="rotate(-14 168 74)"><path d="M130 76c-4-24 18-36 40-32c26 4 42 18 38 38c-4 20-26 30-50 26c-18-4-26-16-28-32z" fill="#d9a066" stroke="${N}" stroke-width="2.2"/><circle cx="154" cy="68" r="2.5" fill="${N}" opacity=".5"/><circle cx="186" cy="84" r="2.5" fill="${N}" opacity=".5"/>${flame(150, 44, 1.2)}${flame(176, 38, 1.5)}${flame(198, 48, 1)}</g>` +
  ring(40, 48, 17, .3, '3', '#ff6b6b') + tx(250, 52, '♪', 26, G, 'sans-serif') + tx(272, 80, '♫', 20, '#fff', 'sans-serif') + tx(234, 100, '♪', 18, CY, 'sans-serif');

S.pan = () => `<path d="M60 40c-6-8 6-14 0-24M96 42c-6-8 6-14 0-24M132 40c-6-8 6-14 0-24" stroke="#fff" stroke-opacity=".7" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="116" cy="94" rx="80" ry="32" fill="#3a4a6b" stroke="${N}" stroke-width="2.4"/><ellipse cx="116" cy="90" rx="68" ry="25" fill="#56688f"/><path d="M194 88l54-16" stroke="${N}" stroke-width="14" stroke-linecap="round"/><path d="M194 88l54-16" stroke="#8b5a2b" stroke-width="7" stroke-linecap="round"/>` +
  [[84, 88], [122, 84], [104, 104], [142, 100]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="20" ry="12" fill="#e0a44a" stroke="${N}" stroke-width="2"/><path d="M${x - 10} ${y - 2}c5-5 15-5 20 0" stroke="#b5731d" stroke-width="2.5" fill="none"/>`).join('') + pill(210, 24, 76, 22, 'rgba(7,19,64,.7)', '24:10', 13, '#ffe9a0', GO) + [0, 1, 2].map(i => tx(230 + i * 22, 130, '●', 18, i < 2 ? G : 'rgba(255,255,255,.3)', 'sans-serif')).join('') + tx(40, 130, '9', 24, T, FB);

S.donut = () => [[96, 78], [204, 96]].map(([x, y]) => `<path d="M${x} 24V${y - 24}" stroke="#fff" stroke-width="2.2"/>` + donut(x, y, 26)).join('') + `<circle cx="70" cy="132" r="2" fill="#e8a15a"/><circle cx="76" cy="136" r="1.6" fill="#e8a15a"/><circle cx="236" cy="132" r="2" fill="#e8a15a"/>` + pill(114, 120, 72, 22, 'rgba(7,19,64,.7)', '0:08', 13, '#ffe9a0', GO) + spark(40, 70, 1.2) + spark(266, 56, 1);

S.checklist = () => gcard(34, 20, 232, 124, [0, 1, 2, 3, 4, 5].map(i => { const x = 48 + (i % 3) * 76, y = 34 + Math.floor(i / 3) * 48, done = i !== 2 && i !== 5; return rc(x, y, 68, 40, 6, done ? '#e5fbf0' : '#fff6dc', done ? T : '#f0d58a', 1.8) + (done ? `<circle cx="${x + 52}" cy="${y + 13}" r="8.5" fill="${T}"/>${tx(x + 52, y + 18, '✓', 12, '#fff', 'sans-serif')}<path d="M${x + 8} ${y + 30}c10-8 16 4 26-3s14 2 26-2" stroke="${B}" stroke-width="2" fill="none" stroke-linecap="round"/>` : '') + `<path d="M${x + 8} ${y + 12}h30" stroke="#d6b45a" stroke-width="3" stroke-linecap="round"/>`; }).join(''), 10) + pill(100, 124, 100, 18, '#ff8a1f', '6 מתוך 10', 11, '#fff', '#fff');

S.truths = () => [[30, 'אמת', T, 0], [112, 'אמת', T, 0], [194, 'שקר', R, 1]].map(([x, l, c, big]) => gcard(x, 36, 78, 92, tx(x + 39, 92, l, 18, c) + `<path d="M${x + 14} 56h50M${x + 14} 68h38" stroke="#2f6bff" stroke-width="3.4" stroke-linecap="round"/>` + (big ? `<g transform="rotate(-14 ${x + 39} 104)">${rc(x + 8, 96, 62, 20, 4, 'none', R, 3)}${tx(x + 39, 111, 'שקר!', 15, R)}</g>` : `<circle cx="${x + 39}" cy="112" r="9" fill="${T}"/>${tx(x + 39, 117, '✓', 12, '#fff', 'sans-serif')}`), 9, big ? 4 : 0)).join('') + pill(112, 20, 76, 18, 'rgba(7,19,64,.7)', 'מי משקר?', 11, '#ffe9a0', GO);

S.stage = () => `<path d="M150 20L96 128h108z" fill="#ffe58a" opacity=".32"/><path d="M14 8h272v14H14z" fill="#d6303a" stroke="#fff" stroke-opacity=".6"/><path d="M14 22c0 40 8 76 30 112H14zM286 22c0 40-8 76-30 112h30z" fill="#e8467c" stroke="${N}" stroke-width="1.8"/>` + gcard(94, 52, 112, 46, tx(150, 82, 'מסובב סביבון', 16, N)) + ring(252, 48, 14, .55, '35') + `<ellipse cx="150" cy="130" rx="60" ry="9" fill="#ffc83a" stroke="#8a5a00" stroke-width="1.6"/>` + spark(60, 60, 1, '#fff') + spark(244, 98, .9, '#fff');

S.draw = () => `<path d="M80 128l22-92M220 128l-22-92M150 128V36" stroke="#d8dcf5" stroke-width="3" stroke-linecap="round"/>` + rc(36, 18, 228, 92, 8, 'url(#gaC)', GO, 3) +
  `<g transform="translate(150 70) scale(1.1)"><path d="M-2 -34v-8h4v8M-18 -28h36v22l-18 24l-18-24z" fill="none" stroke="${N}" stroke-width="2.4" stroke-linejoin="round"/><path d="M-18 -6l18 24l18-24" stroke="${B}" stroke-width="3" fill="none" stroke-dasharray="4 4"/></g><path d="M60 92c10-8 20 6 30-2" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
  `<g transform="rotate(32 238 64)">${rc(232, 30, 11, 52, 3, P, N, 1.6)}<path d="M232 82l5.5 11l5.5-11z" fill="#fffaf0" stroke="${N}" stroke-width="1.4"/></g>` + pill(36, 120, 66, 20, '#fff', 'סביבון?', 11.5, N, GO) + pill(110, 120, 66, 20, '#fff', 'חנוכייה?', 11.5, N, GO);

S.relay = () => menorah(150, 54, .5, [0, 1, 2, 3], []) + [[84, '#ff6b6b', 5], [114, CY, 3]].map(([y, c, n]) => rc(30, y, 240, 24, 12, 'rgba(7,19,64,.5)', 'rgba(255,255,255,.35)', 1.4) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${250 - i * 28}" cy="${y + 12}" r="8" fill="${i < n ? c : 'rgba(255,255,255,.14)'}" ${i < n ? 'stroke="#fff" stroke-width="1.4"' : ''}/>${i < n ? flame(250 - i * 28, y + 15, .5) : ''}`).join('')).join('');
})();
