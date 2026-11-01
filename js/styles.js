// שפות עיצוביות לסטודיו המיתוג.
// כדי להוסיף סגנון: שמרי את התמונה בתיקייה img/styles/ והוסיפי כאן אובייקט נוסף.
(function(D){
  D.styles = [
    {
      id: 'burgundy-gold',
      name: 'בורדו וזהב',
      desc: 'יוקרתי וחם, עם חנוכייה מוזהבת',
      img: 'img/styles/burgundy-gold.webp',
      palette: ['#4e0f26','#59152c','#f0d78c','#d4a64a','#b68546','#f7f2e8','#e9d5b7','#ffffff'],
      band: {y: .885, color: '#4e0f26'},          // רצועה תחתונה כהה שבה יושב הטקסט
      title: {color: '#f3dfa4', fill: 'gold', font: 'Frank Ruhl Libre'},
      sub:   {color: '#f0d78c', font: 'Assistant'},
      plate: '#4e0f26',                            // צבע לוחית טקסט בגדלים שאינם אנכיים
      ribbon: {x: .5, y: .185, w: .46, h: .075, face: '#f8f4ea', ink: '#59152c'}
    }
  ];
})(window.MADLIK_DATA);
