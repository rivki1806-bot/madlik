// שפות עיצוביות לסטודיו המיתוג.
// כדי להוסיף סגנון: שמרי את התמונה בתיקייה img/styles/ והוסיפי כאן אובייקט נוסף.
(function(D){
  D.styles = [
    {
      id: 'burgundy-gold',
      legacy: true,
      name: 'בורדו וזהב',
      desc: 'יוקרתי וחם, עם חנוכייה מוזהבת',
      img: 'img/styles/burgundy-gold.webp',
      palette: ['#4e0f26','#59152c','#f0d78c','#d4a64a','#b68546','#f7f2e8','#e9d5b7','#ffffff'],
      band: {y: .885, color: '#4e0f26'},          // רצועה תחתונה כהה שבה יושב הטקסט
      title: {color: '#f3dfa4', fill: 'gold', font: 'Frank Ruhl Libre'},
      sub:   {color: '#f0d78c', font: 'Assistant'},
      plate: '#4e0f26',                            // צבע לוחית טקסט בגדלים שאינם אנכיים
      ribbon: {x: .5, y: .185, w: .46, h: .075, face: '#f8f4ea', ink: '#59152c'}
    },
    {
      id: 'cream-florals', name: 'פרחים קרם וזהב', desc: 'עדין, חמים ויוקרתי',
      img: 'img/styles/cream-florals.jpg', thumb: 'img/styles/cream-florals-t.jpg', landscape: true,
      palette: ['#5b3a2a','#8a5232','#ffffff','#c19a52','#fbf1dc','#222222','#8a5232','#5b3a2a'],
      title: {color: '#8a5232', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#5b3a2a', font: 'Assistant'},
      plate: '#fff9f0',
      tpl: {ink: '#5b3a2a', title: '#8a5232', acc: '#c19a52', pl: 'rgba(255,249,240,.9)', plb: '', pos: 'center', focus: [6,10], dark: 0}
    },
    {
      id: 'donuts-blue', name: 'סופגניות על כחול', desc: 'כיפי וצבעוני',
      img: 'img/styles/donuts-blue.jpg', thumb: 'img/styles/donuts-blue-t.jpg', landscape: true,
      palette: ['#ffffff','#ffd23f','#ffffff','#ff8ab4','#fbf1dc','#222222','#ffd23f','#ffffff'],
      title: {color: '#ffd23f', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#ffffff', font: 'Assistant'},
      plate: '#082a62',
      tpl: {ink: '#ffffff', title: '#ffd23f', acc: '#ff8ab4', pl: 'rgba(8,42,98,.8)', plb: 'rgba(8,42,98,.6)', pos: 'bottom', focus: [12,55], dark: 1}
    },
    {
      id: 'neon-hanukkah', name: 'ניאון חנוכה', desc: 'כהה וזוהר',
      img: 'img/styles/neon-hanukkah.jpg', thumb: 'img/styles/neon-hanukkah-t.jpg', landscape: true,
      palette: ['#fff1cc','#ffc83a','#ffffff','#4aa0ff','#fbf1dc','#222222','#ffc83a','#fff1cc'],
      title: {color: '#ffc83a', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#fff1cc', font: 'Assistant'},
      plate: '#0b0b0b',
      tpl: {ink: '#fff1cc', title: '#ffc83a', acc: '#4aa0ff', pl: 'rgba(0,0,0,.65)', plb: '', pos: 'center', focus: [88,50], dark: 1}
    },
    {
      id: 'pink-hearts', name: 'חנוכה שמח בלבבות', desc: 'ורוד מתוק',
      img: 'img/styles/pink-hearts.jpg', thumb: 'img/styles/pink-hearts-t.jpg', landscape: true,
      palette: ['#ffffff','#ffffff','#ffffff','#ff5a7e','#fbf1dc','#222222','#ffffff','#ffffff'],
      title: {color: '#ffffff', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#ffffff', font: 'Assistant'},
      plate: '#e13c69',
      tpl: {ink: '#ffffff', title: '#ffffff', acc: '#ff5a7e', pl: 'rgba(225,60,105,.78)', plb: 'rgba(225,60,105,.55)', pos: 'bottom', focus: [10,25], dark: 1}
    },
    {
      id: 'donuts-coins', name: 'סופגניות ומטבעות', desc: 'צהוב וורוד שמח',
      img: 'img/styles/donuts-coins.jpg', thumb: 'img/styles/donuts-coins-t.jpg', landscape: true,
      palette: ['#4a1f2e','#d6336c','#ffffff','#f4b400','#fbf1dc','#222222','#d6336c','#4a1f2e'],
      title: {color: '#d6336c', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#4a1f2e', font: 'Assistant'},
      plate: '#ffffff',
      tpl: {ink: '#4a1f2e', title: '#d6336c', acc: '#f4b400', pl: 'rgba(255,255,255,.88)', plb: 'rgba(255,255,255,.82)', pos: 'center', focus: [72,60], dark: 0}
    },
    {
      id: 'donuts-lamps', name: 'סופגניות ונורות', desc: 'חם ואלגנטי',
      img: 'img/styles/donuts-lamps.jpg', thumb: 'img/styles/donuts-lamps-t.jpg', landscape: true,
      palette: ['#3b2314','#4a2a12','#ffffff','#a8641c','#fbf1dc','#222222','#4a2a12','#3b2314'],
      title: {color: '#4a2a12', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#3b2314', font: 'Assistant'},
      plate: '#fff1de',
      tpl: {ink: '#3b2314', title: '#4a2a12', acc: '#a8641c', pl: 'rgba(255,241,222,.88)', plb: 'rgba(255,241,222,.6)', pos: 'top', focus: [50,45], dark: 0}
    },
    {
      id: 'donuts-lilac', name: 'סופגניות על לילך', desc: 'עדין וצבעוני',
      img: 'img/styles/donuts-lilac.jpg', thumb: 'img/styles/donuts-lilac-t.jpg', landscape: true,
      palette: ['#3b2a6b','#6a3fb0','#ffffff','#ff5c8a','#fbf1dc','#222222','#6a3fb0','#3b2a6b'],
      title: {color: '#6a3fb0', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#3b2a6b', font: 'Assistant'},
      plate: '#ffffff',
      tpl: {ink: '#3b2a6b', title: '#6a3fb0', acc: '#ff5c8a', pl: 'rgba(255,255,255,.88)', plb: 'rgba(255,255,255,.85)', pos: 'center', focus: [60,35], dark: 0}
    },
    {
      id: 'jerusalem-night', name: 'ירושלים בלילה', desc: 'חנוכייה מול החומות',
      img: 'img/styles/jerusalem-night.jpg', thumb: 'img/styles/jerusalem-night-t.jpg', landscape: true,
      palette: ['#fff1cc','#ffd56a','#ffffff','#ffb03a','#fbf1dc','#222222','#ffd56a','#fff1cc'],
      title: {color: '#ffd56a', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#fff1cc', font: 'Assistant'},
      plate: '#081032',
      tpl: {ink: '#fff1cc', title: '#ffd56a', acc: '#ffb03a', pl: 'rgba(8,16,50,.78)', plb: 'rgba(8,16,50,.62)', pos: 'bottom', focus: [25,45], dark: 1}
    },
    {
      id: 'menorah-purple', name: 'חנוכייה סגולה וזהב', desc: 'חגיגי וזוהר',
      img: 'img/styles/menorah-purple.jpg', thumb: 'img/styles/menorah-purple-t.jpg', landscape: true,
      palette: ['#ffffff','#ffd66b','#ffffff','#ff9a3d','#fbf1dc','#222222','#ffd66b','#ffffff'],
      title: {color: '#ffd66b', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#ffffff', font: 'Assistant'},
      plate: '#280f46',
      tpl: {ink: '#ffffff', title: '#ffd66b', acc: '#ff9a3d', pl: 'rgba(40,15,70,.78)', plb: 'rgba(40,15,70,.58)', pos: 'bottom', focus: [50,50], dark: 1}
    },
    {
      id: 'sweet-hearts', name: 'לבבות מתוקים', desc: 'רך וחמוד',
      img: 'img/styles/sweet-hearts.jpg', thumb: 'img/styles/sweet-hearts-t.jpg', landscape: true,
      palette: ['#7a1f2e','#c1121f','#ffffff','#ff6b81','#fbf1dc','#222222','#c1121f','#7a1f2e'],
      title: {color: '#c1121f', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#7a1f2e', font: 'Assistant'},
      plate: '#ffffff',
      tpl: {ink: '#7a1f2e', title: '#c1121f', acc: '#ff6b81', pl: 'rgba(255,255,255,.88)', plb: 'rgba(255,255,255,.78)', pos: 'center', focus: [45,40], dark: 0}
    },
    {
      id: 'pink-blossom', name: 'פריחה ורודה', desc: 'רומנטי ועדין',
      img: 'img/styles/pink-blossom.jpg', thumb: 'img/styles/pink-blossom-t.jpg', landscape: true,
      palette: ['#6b3a45','#c2506a','#ffffff','#e8a0b4','#fbf1dc','#222222','#c2506a','#6b3a45'],
      title: {color: '#c2506a', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#6b3a45', font: 'Assistant'},
      plate: '#fff6f8',
      tpl: {ink: '#6b3a45', title: '#c2506a', acc: '#e8a0b4', pl: 'rgba(255,246,248,.9)', plb: '', pos: 'center', focus: [8,10], dark: 0}
    },
    {
      id: 'donuts-sky', name: 'סופגניות תכלת וזהב', desc: 'נקי ואוורירי',
      img: 'img/styles/donuts-sky.jpg', thumb: 'img/styles/donuts-sky-t.jpg', landscape: true,
      palette: ['#1f4a70','#1f5f99','#ffffff','#c9a24a','#fbf1dc','#222222','#1f5f99','#1f4a70'],
      title: {color: '#1f5f99', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#1f4a70', font: 'Assistant'},
      plate: '#ffffff',
      tpl: {ink: '#1f4a70', title: '#1f5f99', acc: '#c9a24a', pl: 'rgba(255,255,255,.88)', plb: 'rgba(255,255,255,.72)', pos: 'bottom', focus: [50,35], dark: 0}
    },
    {
      id: 'dancing-donuts', name: 'סופגניות רוקדות', desc: 'שמח, מושלם לילדים',
      img: 'img/styles/dancing-donuts.jpg', thumb: 'img/styles/dancing-donuts-t.jpg', landscape: true,
      palette: ['#0b4a50','#d6336c','#ffffff','#ff9f1c','#fbf1dc','#222222','#d6336c','#0b4a50'],
      title: {color: '#d6336c', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#0b4a50', font: 'Assistant'},
      plate: '#ffffff',
      tpl: {ink: '#0b4a50', title: '#d6336c', acc: '#ff9f1c', pl: 'rgba(255,255,255,.9)', plb: 'rgba(255,255,255,.78)', pos: 'center', focus: [22,22], dark: 0}
    },
    {
      id: 'gold-white', name: 'זהב ולבן', desc: 'יוקרתי ומינימליסטי',
      img: 'img/styles/gold-white.jpg', thumb: 'img/styles/gold-white-t.jpg', landscape: true,
      palette: ['#3a2d1a','#6e4b12','#ffffff','#c9a23a','#fbf1dc','#222222','#6e4b12','#3a2d1a'],
      title: {color: '#6e4b12', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#3a2d1a', font: 'Assistant'},
      plate: '#fffaec',
      tpl: {ink: '#3a2d1a', title: '#6e4b12', acc: '#c9a23a', pl: 'rgba(255,250,236,.9)', plb: 'rgba(255,250,236,.8)', pos: 'center', focus: [8,12], dark: 0}
    },
    {
      id: 'roses-soft', name: 'ורדים רכים', desc: 'רומנטי, בגוני קרם',
      img: 'img/styles/roses-soft.jpg', thumb: 'img/styles/roses-soft-t.jpg', landscape: true,
      palette: ['#5b3a2a','#a23a3a','#ffffff','#c49a4a','#fbf1dc','#222222','#a23a3a','#5b3a2a'],
      title: {color: '#a23a3a', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#5b3a2a', font: 'Assistant'},
      plate: '#fff8ee',
      tpl: {ink: '#5b3a2a', title: '#a23a3a', acc: '#c49a4a', pl: 'rgba(255,248,238,.9)', plb: '', pos: 'center', focus: [88,85], dark: 0}
    },
    {
      id: 'roses-red', name: 'ורדים אדומים', desc: 'עשיר ובולט',
      img: 'img/styles/roses-red.jpg', thumb: 'img/styles/roses-red-t.jpg', landscape: true,
      palette: ['#5b2a2a','#a31621','#ffffff','#c79a3f','#fbf1dc','#222222','#a31621','#5b2a2a'],
      title: {color: '#a31621', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#5b2a2a', font: 'Assistant'},
      plate: '#fff8ee',
      tpl: {ink: '#5b2a2a', title: '#a31621', acc: '#c79a3f', pl: 'rgba(255,248,238,.9)', plb: '', pos: 'center', focus: [90,88], dark: 0}
    },
    {
      id: 'music-notes', name: 'צבעוני ומוזיקלי', desc: 'שמח, לערבי שירה',
      img: 'img/styles/music-notes.jpg', thumb: 'img/styles/music-notes-t.jpg', landscape: true,
      palette: ['#1f2d5c','#e8590c','#ffffff','#1c9ad6','#fbf1dc','#222222','#e8590c','#1f2d5c'],
      title: {color: '#e8590c', fill: 'solid', font: 'Suez One'},
      sub:   {color: '#1f2d5c', font: 'Assistant'},
      plate: '#ffffff',
      tpl: {ink: '#1f2d5c', title: '#e8590c', acc: '#1c9ad6', pl: 'rgba(255,255,255,.92)', plb: '', pos: 'center', focus: [10,20], dark: 0}
    }
  ];
})(window.MADLIK_DATA);
