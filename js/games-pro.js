// מדליק – משחקים חכמים: הוראות, ברירות מחדל, מחוללים חכמים ודפי הדפסה
window.GamesPro = (function(){
'use strict';

/* ---------- כלים ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle = a => { a = a.slice(); for(let i = a.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
const lines = s => String(s||'').split(/\n/).map(x => x.trim()).filter(Boolean);
const chunk = (a,n) => { const r = []; for(let i = 0; i < a.length; i += n) r.push(a.slice(i, i+n)); return r; };
const HEB = [...'אבגדהוזחטיכלמנסעפצקרשת'];
const FIN = {'ך':'כ','ם':'מ','ן':'נ','ף':'פ','ץ':'צ'};
const base = ch => FIN[ch] || ch;
const isHeb = ch => /[א-ת]/.test(ch);
const lettersOf = w => [...String(w)].filter(ch => isHeb(ch) || /[A-Za-z0-9]/.test(ch));
const splitPair = l => { const m = String(l).match(/^(.+?)\s+[-–—]\s+(.+)$/) || String(l).match(/^(.+?)\s*[:|]\s*(.+)$/); return m ? [m[1].trim(), m[2].trim()] : [String(l).trim(), '']; };
const LETTER_NAMES = ['א','ב','ג','ד'];

/* ---------- הוראות לכל משחק ---------- */
const RULES = {
  elias: {title:'איך משחקים אליאס?', intro:'מסבירים מילה בלי להגיד אותה, והקבוצה צריכה לנחש. כמה שיותר מילים בדקה אחת.',
    need:['לפחות 4 משתתפים, בשתי קבוצות או יותר','כרטיסי המילים (מודפסים) או המסך שלנו','טיימר של דקה. על המסך הוא כבר מובנה'],
    steps:['מתחלקים לקבוצות. מומלץ 2 עד 4 קבוצות, לפחות שניים בכל קבוצה.','בכל סבב משחקת קבוצה אחת. אחד מחברי הקבוצה הוא "המסביר".','המסביר מקבל כרטיס ומסביר את המילה. חברי הקבוצה שלו מנחשים בקול.','ניחשו? עוברים מיד לכרטיס הבא. לא מצליחים? אפשר לדלג.','כשהדקה נגמרת, המילה האחרונה פתוחה לכל הקבוצות. מי שמנחש ראשון מקבל נקודה.','התור עובר לקבוצה הבאה, ובכל סבב מסביר אחר.'],
    ok:['להסביר במילים אחרות ולתת דוגמאות','להגיד הפכים: "ההפך מקר"','מילים נרדפות: "כמו מאפה, אבל מטוגן"'],
    no:['להגיד את המילה עצמה או חלק ממנה','מילה מאותו שורש (סופגנייה ← ספוג)','לתרגם לשפה אחרת','"מתחרז עם..." או "מתחיל באות..."','פנטומימה ותנועות ידיים. רק מילים!'],
    score:['מילה שנוחשה: נקודה אחת','דילוג: מינוס נקודה (אפשר לבטל בהגדרות)','אמר מילה אסורה? הכרטיס נפסל ונספר כדילוג','מנצחת הקבוצה הראשונה שמגיעה ל־30 נקודות'],
    tip:'על המסך הכול אוטומטי: הטיימר, הניקוד, התור של כל קבוצה וגם "המילה האחרונה". מקשי קיצור: רווח = ניחשו, S = דילוג.'},
  quartets: {title:'איך משחקים רביעיות?', intro:'אוספים רביעיות של קלפים מאותו נושא. מי שאוסף הכי הרבה מנצח.',
    need:['3 עד 6 משתתפים','קלפי הרביעיות, מודפסים וגזורים'],
    steps:['מערבבים ומחלקים את כל הקלפים.','בתורו, משתתף שואל משתתף אחר על קלף שחסר לו: "יש לך את סופגנייה ממאכלי חנוכה?"','יש? הוא לוקח את הקלף וממשיך לשאול. אין? התור עובר למי שנשאל.','רביעייה שלמה מניחים על השולחן.'],
    no:['לשאול על קלף מנושא שאין לך ממנו אף קלף'], score:['כשהקלפים נגמרים, מנצח מי שיש לו הכי הרבה רביעיות'], tip:'לילדים צעירים אפשר לשחק בזוגות.'},
  bingo: {title:'איך משחקים בינגו?', intro:'כל משתתף מקבל לוח אחר. המנחה מקריא מילים, ומי שמשלים שורה צועק "בינגו!".',
    need:['לוח שונה לכל משתתף (מודפס)','עט או אסימונים לסימון','מנחה עם רשימת המילים'],
    steps:['מחלקים לכל משתתף לוח.','המנחה מקריא מילה אקראית (אפשר לגזור פתקים מהרשימה ולשלוף).','מי שהמילה מופיעה אצלו, מסמן אותה.','בלוח 5×5 הריבוע החופשי שבאמצע כבר מסומן.'],
    score:['הראשון שמשלים שורה, עמודה או אלכסון קורא "בינגו!" ומנצח','המנחה בודק מול המילים שהוקראו','אפשר להמשיך ל"לוח מלא" בשביל פרס גדול']},
  whoami: {title:'איך משחקים מי אני?', intro:'על המצח שלך יש פתק, ואתה היחיד שלא יודע מה כתוב עליו.',
    need:['פתקים מודפסים וסלוטייפ','כמה משתתפים שרוצים'],
    steps:['מדביקים לכל משתתף פתק על המצח או על הגב, בלי שיראה.','בתורו, הוא שואל שאלה שעונים עליה כן או לא: "אני אוכל?"','תשובת "כן": ממשיך לשאול. תשובת "לא": התור עובר.','חושב שהוא יודע? מנחש.'],
    no:['להציץ בפתק','לרמוז במבטים או בצחוק'], score:['הראשון שמנחש נכון מנצח. ממשיכים עד שכולם מגלים']},
  cards: {title:'איך משחקים בכרטיסיות שאלות?', intro:'שאלות פתוחות שמחממות את האווירה ושוברות את הקרח.',
    need:['כרטיסיות מודפסות או המסך'],
    steps:['מניחים את הכרטיסים הפוכים באמצע.','בתורו, כל משתתף שולף כרטיס, קורא בקול ועונה.','אפשר לבחור: לענות בעצמך או להעביר למישהו אחר.'],
    tip:'מתאים במיוחד לפתיחת ערב. בקבוצה גדולה עונים בזוגות.'},
  memory: {title:'איך משחקים זיכרון?', intro:'מחפשים זוגות של קלפים זהים.',
    need:['קלפים מודפסים, או המסך'],	    xxxxx:['xxxxxx xx xx xxxxxx xxxxxx xxxxxx.','xxxxx, xxxxxx xxx xxxxx.','xxx? xxxx xxxx xxxxx xxx. xx xxx? xxxxx xxxxx xxxx.'],	    xxxxx:['xxxx xx xxxx xxx xxxx xxxxx','xx xxxx xxxx xxxx xx xxxxxxx']},
  wordsearch: {title:'איך משחקים תפזורת?', intro:'מוצאים את המילים שהסתתרו בין האותיות.',
    need:['דף לכל משתתף ועט'],
    steps:['מחלקים דף לכל אחד.','מחפשים את המילים שברשימה: מאוזן, מאונך ובאלכסון.','מקיפים כל מילה שנמצאה ומסמנים אותה ברשימה.'],
    score:['מנצח הראשון שמוצא את כל המילים','אפשר לשחק גם על זמן: מי מצא הכי הרבה בשלוש דקות']},
  crossword: {title:'איך משחקים בתשבץ?', intro:'כותבים מילים והגדרות, והאתר משבץ אותן לבד ומצליב ביניהן.',
    need:['דף תשבץ לכל משתתף או זוג','עט. או לפתור ישר על המסך'],
    steps:['קוראים את ההגדרות. "מאוזן" נכתב מימין לשמאל, "מאונך" מלמעלה למטה.','המספר במשבצת הוא מספר ההגדרה.','כותבים אות אחת בכל משבצת.','לפתור על המסך: לוחצים על משבצת ומקלידים. לחיצה נוספת מחליפה כיוון.'],
    score:['מנצח הראשון שמסיים, וכל התשובות נכונות','דף התשובות מודפס בנפרד, בשביל המנחה'],
    tip:'כדי ליצור תשבץ: שורה לכל מילה, ואחריה מקף והגדרה. למשל: סביבון - משחק שמסתובב.'},
  quiz: {title:'איך משחקים בחידון?', intro:'חידון חנוכה אמיתי: שלוש תשובות, טיימר, וטבלת ניקוד.',
    need:['מסך או מקרן','2 עד 6 קבוצות','מנחה שמפעיל את המסך'],
    steps:['מתחלקים לקבוצות ונותנים להן שמות.','בכל שאלה מופיעות 3 תשובות. לכל קבוצה יש זמן להחליט ולכתוב את האות (א עד ג).','המנחה לוחץ "חשיפה", והתשובה הנכונה נדלקת.','המנחה מסמן אילו קבוצות צדקו, והניקוד מתעדכן.'],
    score:['100 נקודות לכל תשובה נכונה','השאלה האחרונה שווה כפול','בסוף: פודיום המנצחים'],
    tip:'לא כתבתם תשובות שגויות? האתר בונה אותן לבד מתוך התשובות של השאלות האחרות. בתשובה שהיא מספר, הוא בוחר מספרים קרובים.'},
  wheel: {title:'איך משחקים בגלגל המזל?', intro:'גלגל צבעוני שמסתובב ובוחר: שם, משימה או פרס.',
    need:['מסך'],
    steps:['כותבים בגלגל שמות, משימות או פרסים. שורה לכל אחד.','פותחים "לשחק על המסך" ולוחצים "סובבו!".','הגלגל מאט ונעצר, ומופיעה הכרזה.'],
    score:['"להוציא מהגלגל אחרי בחירה": מתאים להגרלה בלי חזרות'],
    tip:'רעיונות: מי מדליק את הנר, משימה מצחיקה, הגרלת פרסים, מי מתחיל במשחק.'},
  cipher: {title:'איך משחקים בצופן הסודי?', intro:'הודעה סודית מוצפנת, ומפענחים אותה בעזרת המפתח.',
    need:['דף לכל משתתף או קבוצה ועט','או לפענח על המסך'],
    steps:['מתחת לכל סימן כותבים את האות המתאימה לו לפי המפתח.','מי שמפענח ראשון קורא את ההודעה בקול.','על המסך: מקלידים אות אחת, והיא מתמלאת בכל המקומות עם אותו סימן.'],
    ok:['אתב״ש: צופן עברי עתיק. א↔ת, ב↔ש וכן הלאה','מספרים: כל אות היא מספר','סמלים: כל אות היא סמל','קריפטוגרמה: אין מפתח מלא, רק כמה אותיות לרמז. למבוגרים'],
    score:['מנצח הראשון שמפענח את כל ההודעה']},
  candles: {title:'איך משחקים בשמונה נרות?', intro:'מנחשים מילה, אות אחרי אות. כל טעות מכבה נר בחנוכייה.',
    need:['מסך','משתתפים או קבוצות'],
    steps:['האתר מגריל מילה, ועל המסך מופיע קו לכל אות.','מנחשים אותיות בתורות. לוחצים על האות במקלדת שעל המסך.','אות נכונה מופיעה בכל המקומות. אות שגויה מכבה נר.','אפשר לנחש את כל המילה בכל רגע.'],
    score:['גיליתם את המילה לפני ששמונת הנרות כבו? החנוכייה נדלקת מחדש, ונקודה לקבוצה שגילתה','כבו כל הנרות? המילה נחשפת, ועוברים למילה הבאה'],
    tip:'אפשר להוסיף רמז: שורה לכל מילה, ואחריה מקף ורמז.'}
};
const hideKey = t => 'madlik_rules_hide_' + t;
const isHidden = t => { try{ return localStorage.getItem(hideKey(t)) === '1'; }catch(e){ return false; } };
const setHidden = (t,v) => { try{ v ? localStorage.setItem(hideKey(t),'1') : localStorage.removeItem(hideKey(t)); }catch(e){} };

function showRules(type, o){
  o = o || {}; const R = RULES[type]; if(!R) return;
  const old = document.querySelector('dialog.rules'); if(old){ old.close(); old.remove(); }
  const li = a => (a||[]).map(x => `<li>${x}</li>`).join('');
  const d = document.createElement('dialog'); d.className = 'rules'; d.setAttribute('aria-labelledby','rulesT');
  d.innerHTML = `<div class="rules-in">
    <button class="rules-x" data-r="close" aria-label="סגירת ההוראות">×</button>
    <div class="rules-head"><span class="rules-badge">הוראות המשחק</span><h2 id="rulesT">${R.title}</h2><p>${R.intro}</p></div>
    ${R.promo ? `<div class="rules-promo"><span class="rp-ico" aria-hidden="true">🎨</span><div><b>${R.promo.title}</b><p>${R.promo.text}</p>
      <div class="rp-btns"><button type="button" data-r="words">✍️ כותבים מילים משלכם</button><button type="button" data-r="print">🖨️ גרסה להדפסה</button>${o.onPlay ? '<button type="button" data-r="play">🎮 אינטרקטיבי על המסך</button>' : ''}</div></div></div>` : ''}
    <div class="rules-grid">
      ${R.need ? `<section class="r-need"><h3><i>◆</i>מה צריך</h3><ul>${li(R.need)}</ul></section>` : ''}
      <section class="r-steps"><h3><i>➜</i>מהלך המשחק</h3><ol>${li(R.steps)}</ol></section>
      ${R.ok ? `<section class="r-ok"><h3><i>✓</i>${type === 'cipher' ? 'סוגי צפנים' : 'מותר'}</h3><ul>${li(R.ok)}</ul></section>` : ''}
      ${R.no ? `<section class="r-no"><h3><i>✕</i>אסור</h3><ul>${li(R.no)}</ul></section>` : ''}
      ${R.score ? `<section class="r-score"><h3><i>🏆</i>ניקוד וניצחון</h3><ul>${li(R.score)}</ul></section>` : ''}
    </div>
    ${R.tip ? `<p class="rules-tip"><b>טיפ:</b> ${R.tip}</p>` : ''}
    <div class="rules-foot">
      <label class="rules-hide"><input type="checkbox" id="rulesHide" ${isHidden(type)?'checked':''}> לא לפתוח את החלון הזה אוטומטית</label>
      <div class="rules-btns"><button class="btn" data-r="close">הבנתי, בואו נכין</button>${o.onPlay ? '<button class="btn btn-gold" data-r="play">לשחק על המסך עכשיו ←</button>' : ''}</div>
    </div></div>`;
  document.body.appendChild(d);
  const close = () => { const h = d.querySelector('#rulesHide'); setHidden(type, h && h.checked); d.classList.add('out'); setTimeout(() => { if(d.open) d.close(); d.remove(); }, 220); };
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  d.addEventListener('click', e => { if(e.target === d){ close(); return; } const b = e.target.closest('[data-r]'); if(!b) return; if(b.dataset.r === 'close') close(); if(b.dataset.r === 'play'){ close(); setTimeout(o.onPlay, 240); }
    if(b.dataset.r === 'words' || b.dataset.r === 'print'){ close(); const f = document.getElementById('cf');
      if(!f){ location.hash = '#/create/' + type; return; }
      setTimeout(() => { if(b.dataset.r === 'print'){ const p = document.getElementById('doPrint'); if(p) p.click(); return; } const t = f.querySelector('textarea'); if(t){ t.scrollIntoView({block:'center', behavior:'smooth'}); t.focus({preventScroll:true}); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1600); } }, 260); } });
  d.showModal(); const first = d.querySelector('.rules-btns .btn'); if(first) first.focus();
}
function autoRules(type, onPlay){ if(RULES[type] && !isHidden(type)) setTimeout(() => { if(document.querySelector('#cf')) showRules(type, {onPlay}); }, 420); }

/* ---------- ברירות מחדל ושדות למשחקים החדשים ---------- */
const NEW = ['crossword','quiz','wheel','cipher','candles'];
const PLAYABLE = ['elias','crossword','quiz','wheel','cipher','candles'];
const DEFAULTS = {
  crossword: {title:'תשבץ חנוכה', key:true, words:'סביבון - משחק עם ארבע אותיות שמסתובב\nלביבה - מטגנים אותה בשמן\nחנוכייה - יש בה שמונה קנים ושמש\nמכבים - הגיבורים שניצחו את היוונים\nסופגנייה - מאפה עם ריבה ואבקת סוכר\nשמש - הנר שמדליק את שאר הנרות\nכסלו - החודש שבו מתחיל החג\nשמן - הנס היה בפך של...\nמתתיהו - אבי החשמונאים\nנרות - מדליקים אותם בחלון'},
  quiz: {title:'חידון חנוכה', secs:20, words:'באיזה תאריך מתחילים שמונת ימי חנוכה? | כ"ז כסלו | *כ"ה כסלו | כ"ח כסלו\nמה עושים לזכר נס פך השמן? | שרים שירי חנוכה | *מדליקים נרות | משחקים בסביבונים\nכיצד צריך להעמיד את הנרות? | *בשורה ישרה | בעיגול | בריבוע\nמה הדין המיוחד של אור הנרות? | מצווה להשתמש בו. | בשעת הצורך מותר להשתמש בו. | *אסור להשתמש בו.\nבאיזה צד של פתח הבית מעמידים את החנוכייה? | *בשמאל מול המזוזה | בימין ליד המזוזה | מחוץ לפתח\nכמה זמן לכל הפחות צריכים הנרות להישאר דלוקים? | רבע שעה | שעתיים | *חצי שעה\nכמה ברכות מברכים ביום הראשון? | *שלוש ברכות | ארבע ברכות | שתי ברכות\nאיזה פיוט אומרים אחרי הדלקת הנרות? | *הנרות הללו | חנוכייה לי יש | נר לי דקיק\nמתי מדליקים נרות חנוכה ביום שישי? | אחרי הדלקת נרות שבת | תלוי במנהגים השונים | *לפני הדלקת נרות שבת\nמה מוסיפים בתפילת שמונה עשרה ובברכת המזון? | מעוז צור | *על הניסים, בימי מתתיהו | על הניסים בימי מרדכי ואסתר\nמה מוסיפים לתפילת שחרית? | *הלל שלם | תחנון | הושענות\nאילו שמנים כשרים להדלקת נרות חנוכה? | *כל השמנים כשרים | רק נרות | רק שמן זית\nחותמו של מי היה על פך השמן? | הלוי | *הכהן הגדול | המלך\nמי היה המלך בחנוכה? | פרעה | *אנטיוכוס | אחשוורוש\nלכמה זמן הספיק פך השמן? | יום אחד | תשעה ימים | *שמונה ימים\nמתי מדליקים את החנוכייה? | בשקיעה | בצאת הכוכבים | *יש כאלה בשקיעה ויש כאלה בצאת הכוכבים\nמהם המאכלים בחנוכה? | מאכלי חלב | מאכלים עם שמן | *2 התשובות נכונות'},
  wheel: {title:'גלגל המשימות', remove:false, words:'לשיר שיר חנוכה\nלספר זיכרון מחנוכה\nלסובב סביבון\nלאכול לביבה בלי ידיים\nלחקות מכבי\nלהדליק את הנר הבא\nלברך את כולם\nלבחור את המשחק הבא'},
  cipher: {title:'הצופן הסודי', msg:'נס גדול היה פה', kind:'atbash', hints:3},
  candles: {title:'שמונה נרות', words:'סופגנייה - מאפה עם ריבה\nחנוכייה - יש בה תשעה קנים\nפך שמן - ממנו הדליקו במקדש\nמתתיהו - אבי החשמונאים\nסביבון - נ ג ה פ\nלביבות - מטגנים אותן בשמן\nמכבים - הגיבורים של החג'}
};
const CIPHERS = [['atbash','אתב״ש (צופן עברי עתיק)'],['numbers','מספרים לפי הסדר (קל)'],['numbers-mix','מספרים מעורבבים'],['symbols','סמלים'],['crypto','קריפטוגרמה (למבוגרים)']];
function fields(type, s){
  if(type === 'crossword') return `<label>מילים והגדרות <span class="hint">שורה לכל מילה: מילה - הגדרה</span><textarea name="words" rows="11">${esc(s.words)}</textarea></label>
    <label class="check"><input type="checkbox" name="key" ${s.key !== false && s.key !== 'false' ? 'checked' : ''}> להוסיף דף תשובות למנחה</label>`;
  if(type === 'quiz') return `<label>שאלות <span class="hint">שורה לכל שאלה: שאלה | תשובה | תשובה | תשובה. מסמנים את התשובה הנכונה בכוכבית *</span><textarea name="words" rows="11">${esc(s.words)}</textarea></label>
    <label>זמן לכל שאלה<select name="secs">${[10,20,30,45].map(n => `<option ${+s.secs === n ? 'selected' : ''} value="${n}">${n} שניות</option>`).join('')}</select></label>`;
  if(type === 'wheel') return `<label>מה יש בגלגל <span class="hint">שורה לכל פריט: שם, משימה או פרס</span><textarea name="words" rows="10">${esc(s.words)}</textarea></label>
    <label class="check"><input type="checkbox" name="remove" ${s.remove === true || s.remove === 'on' ? 'checked' : ''}> להוציא מהגלגל אחרי שנבחר (הגרלה בלי חזרות)</label>`;
  if(type === 'cipher') return `<label>ההודעה הסודית<textarea name="msg" rows="3">${esc(s.msg)}</textarea></label>
    <label>סוג הצופן<select name="kind">${CIPHERS.map(([v,n]) => `<option value="${v}" ${s.kind === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    ${s.kind === 'crypto' ? `<label>כמה אותיות לגלות כרמז<input type="number" name="hints" min="0" max="10" value="${esc(s.hints)}"></label>` : ''}`;
  if(type === 'candles') return `<label>מילים לניחוש <span class="hint">שורה לכל מילה או ביטוי. רמז אחרי מקף (לא חובה)</span><textarea name="words" rows="10">${esc(s.words)}</textarea></label>`;
  return null;
}

/* ---------- תשבץ: שיבוץ חכם ---------- */
function layout(order){
  const G = new Map(), key = (r,c) => r + ',' + c, get = (r,c) => G.get(key(r,c));
  const placed = []; let inter = 0, minR = 0, maxR = 0, minC = 0, maxC = 0;
  const fits = (L, r, c, dir) => {
    const dr = dir, dc = 1 - dir;
    if(get(r - dr, c - dc) || get(r + dr*L.length, c + dc*L.length)) return -1;
    let n = 0;
    for(let i = 0; i < L.length; i++){
      const rr = r + dr*i, cc = c + dc*i, cell = get(rr, cc);
      if(cell){ if(cell.b !== base(L[i]) || cell.d[dir]) return -1; n++; }
      else if(get(rr + dc, cc + dr) || get(rr - dc, cc - dr)) return -1;
    }
    return n;
  };
  const put = (e, r, c, dir) => {
    const dr = dir, dc = 1 - dir;
    for(let i = 0; i < e.L.length; i++){
      const rr = r + dr*i, cc = c + dc*i, k = key(rr, cc); let cell = G.get(k);
      if(!cell){ cell = {ch:e.L[i], b:base(e.L[i]), d:[false,false]}; G.set(k, cell); }
      else if(FIN[cell.ch] && !FIN[e.L[i]]) cell.ch = e.L[i];
      cell.d[dir] = true; minR = Math.min(minR, rr); maxR = Math.max(maxR, rr); minC = Math.min(minC, cc); maxC = Math.max(maxC, cc);
    }
    placed.push({e, r, c, dir});
  };
  const areaWith = (r, c, dir, len) => { const r2 = r + dir*(len-1), c2 = c + (1-dir)*(len-1);
    return (Math.max(maxR, r2) - Math.min(minR, r) + 1) * (Math.max(maxC, c2) - Math.min(minC, c) + 1); };
  const pending = order.slice(); put(pending.shift(), 0, 0, 0);
  let progress = true;
  while(pending.length && progress){
    progress = false;
    for(let idx = 0; idx < pending.length; idx++){
      const e = pending[idx]; let best = null;
      for(const p of placed){
        for(let j = 0; j < p.e.L.length; j++){
          const pr = p.r + p.dir*j, pc = p.c + (1-p.dir)*j, cell = get(pr, pc);
          for(let i = 0; i < e.L.length; i++){
            if(base(e.L[i]) !== cell.b) continue;
            const dir = 1 - p.dir, r = pr - dir*i, c = pc - (1-dir)*i, n = fits(e.L, r, c, dir);
            if(n < 1) continue;
            const sc = n*30 - areaWith(r, c, dir, e.L.length)*.08 + Math.random()*2;
            if(!best || sc > best.sc) best = {r, c, dir, n, sc};
          }
        }
      }
      if(best){ put(e, best.r, best.c, best.dir); inter += best.n; pending.splice(idx, 1); idx--; progress = true; }
    }
  }
  return {G, placed, inter, area:(maxR-minR+1)*(maxC-minC+1), minR, maxR, minC, maxC, unplaced:pending};
}
function buildCrossword(text){
  const entries = lines(text).map(splitPair).map(([w, clue]) => ({raw:w, clue: clue || '(הגדרה)', L:lettersOf(w)})).filter(e => e.L.length >= 2);
  if(!entries.length) return null;
  let best = null; const tries = Math.min(70, 12 + entries.length*5);
  for(let t = 0; t < tries; t++){
    const order = t === 0 ? entries.slice().sort((a,b) => b.L.length - a.L.length) : shuffle(entries).sort((a,b) => (b.L.length - a.L.length) + (Math.random() - .5)*5);
    const res = layout(order), sc = res.placed.length*1000 + res.inter*12 - res.area;
    if(!best || sc > best.sc){ best = res; best.sc = sc; }
  }
  const rows = best.maxR - best.minR + 1, cols = best.maxC - best.minC + 1;
  const cells = Array.from({length:rows}, () => Array(cols).fill(null));
  best.G.forEach((cell, k) => { const [r, c] = k.split(',').map(Number); cells[r - best.minR][c - best.minC] = {ch:cell.ch, b:cell.b}; });
  const starts = [...new Set(best.placed.map(p => (p.r - best.minR) + ',' + (p.c - best.minC)))].map(s => s.split(',').map(Number)).sort((a,b) => a[0] - b[0] || a[1] - b[1]);
  starts.forEach(([r, c], i) => { cells[r][c].num = i + 1; });
  const across = [], down = [];
  best.placed.forEach(p => { const r = p.r - best.minR, c = p.c - best.minC; const item = {n:cells[r][c].num, clue:p.e.clue, len:p.e.L.length, r, c, dir:p.dir, ans:p.e.L};
    (p.dir === 0 ? across : down).push(item); });
  across.sort((a,b) => a.n - b.n); down.sort((a,b) => a.n - b.n);
  return {rows, cols, cells, across, down, unplaced:best.unplaced.map(e => e.raw)};
}
function cwGridHTML(cw, answers, cs){
  return `<div class="cw-grid" style="--cols:${cw.cols};--cs:${cs}px">${cw.cells.map(row => row.map(c => c ? `<div class="cw-c">${c.num ? `<b>${c.num}</b>` : ''}${answers ? `<span>${esc(c.ch)}</span>` : ''}</div>` : '<div class="cw-x"></div>').join('')).join('')}</div>`;
}
function cwCluesHTML(cw){
  const l = a => a.map(x => `<li><b>${x.n}.</b> ${esc(x.clue)} <i>(${x.len})</i></li>`).join('');
  return `<div class="cw-clues"><div><h4>מאוזן</h4><ol>${l(cw.across)}</ol></div><div><h4>מאונך</h4><ol>${l(cw.down)}</ol></div></div>`;
}

/* ---------- חידון: מסיחים חכמים ---------- */
const POOL = ['שמונה','מתתיהו','יהודה','השמש','כסלו','טבת','פך שמן','סביבון','לביבה','סופגנייה','אנטיוכוס','מודיעין','ירושלים','חנוכייה','יוונים','בית המקדש','שמן זית','ריבה'];
function buildQuiz(text){
  const rows = lines(text).map(l => l.split('|').map(x => x.trim()).filter(Boolean)).filter(p => p.length >= 2);
  const answers = rows.map(p => p.find((x, k) => k > 0 && x.startsWith('*')) ? p.find((x, k) => k > 0 && x.startsWith('*')).slice(1).trim() : p[1]);
  return rows.map((p, i) => {
    const marked = p.slice(1).findIndex(x => x.startsWith('*'));
    if(marked >= 0){ const opts = p.slice(1, 4).map(x => x.replace(/^\*\s*/, '')); return {q:p[0], opts, ans:Math.min(marked, opts.length - 1)}; }
    const correct = p[1], isNum = /^\d+$/.test(correct); let wrong = p.slice(2, 4).filter(x => x !== correct);
    if(isNum){ const n = +correct; for(const c of shuffle([n-1,n+1,n-2,n+2,n+4,n*2,Math.round(n/2)]).filter(x => x > 0 && x !== n).map(String)){ if(wrong.length >= 2) break; if(!wrong.includes(c)) wrong.push(c); } }
    for(const a of shuffle(answers.filter((a, j) => j !== i && a !== correct && /^\d+$/.test(a) === isNum))){ if(wrong.length >= 2) break; if(!wrong.includes(a)) wrong.push(a); }
    for(const a of shuffle(POOL)){ if(wrong.length >= 2) break; if(a !== correct && !wrong.includes(a)) wrong.push(a); }
    const opts = shuffle([correct].concat(wrong.slice(0, 2)));
    return {q:p[0], opts, ans:opts.indexOf(correct)};
  });
}

/* ---------- גלגל ---------- */
const WHEEL_COLORS = ['#ff6b6b','#ffd23f','#3ddc97','#4cc9f0','#a685e2','#ff8fab','#2f6bff','#f6a04d'];
function wheelSVG(items, cls){
  const n = Math.max(1, items.length), a = 2*Math.PI/n, fs = Math.max(4.2, Math.min(9, 13 - n*.42));
  const pt = t => `${(100*Math.cos(t)).toFixed(2)} ${(100*Math.sin(t)).toFixed(2)}`;
  const slices = items.map((it, i) => {
    const t1 = -Math.PI/2 + i*a, t2 = t1 + a, mid = (t1 + a/2) * 180/Math.PI, flip = mid > 90 && mid < 270 ? ' rotate(180 58 0)' : '';
    const col = WHEEL_COLORS[i % WHEEL_COLORS.length], ink = ['#ffd23f','#3ddc97','#4cc9f0','#f6a04d'].includes(col) ? '#14213d' : '#ffffff';
    const label = it.length > 18 ? it.slice(0, 17) + '…' : it;
    return (n === 1 ? `<circle r="100" fill="${col}"/>` : `<path d="M0 0 L${pt(t1)} A100 100 0 ${a > Math.PI ? 1 : 0} 1 ${pt(t2)} Z" fill="${col}" stroke="#fff" stroke-width="1.2"/>`)
      + `<text transform="rotate(${mid.toFixed(2)}) translate(58 0)${flip}" text-anchor="middle" dominant-baseline="middle" font-size="${fs}" font-weight="700" fill="${ink}" font-family="Assistant,sans-serif">${esc(label)}</text>`;
  }).join('');
  return `<svg class="${cls||''}" viewBox="-104 -104 208 208" aria-hidden="true"><circle r="103" fill="#14213d"/><g class="wh-rot">${slices}</g><circle r="13" fill="#fff" stroke="#14213d" stroke-width="3"/><circle r="5" fill="#ff6a00"/></svg>`;
}

/* ---------- צופן ---------- */
const SYMS = ['♦','●','▲','■','◆','♥','☾','✿','◈','✚','◐','▼','◀','▶','⬟','⬣','◉','♣','♠','☀','⬢','◑'];
function buildCipher(s){
  const kind = s.kind || 'atbash', map = {};
  if(kind === 'atbash') HEB.forEach((ch, i) => map[ch] = HEB[21 - i]);
  else if(kind === 'numbers') HEB.forEach((ch, i) => map[ch] = String(i + 1));
  else if(kind === 'numbers-mix'){ const nums = shuffle(HEB.map((_, i) => String(i + 1))); HEB.forEach((ch, i) => map[ch] = nums[i]); }
  else if(kind === 'symbols'){ const sy = shuffle(SYMS); HEB.forEach((ch, i) => map[ch] = sy[i]); }
  else { let p; do { p = shuffle(HEB); } while(p.some((x, i) => x === HEB[i])); HEB.forEach((ch, i) => map[ch] = p[i]); }
  const tokens = [...String(s.msg || '')].map(ch => isHeb(ch) ? {ch, b:base(ch), code:map[base(ch)]} : {sp:ch});
  const used = [...new Set(tokens.filter(t => t.b).map(t => t.b))];
  const hints = kind === 'crypto' ? shuffle(used).slice(0, Math.max(0, Math.min(used.length - 1, +s.hints || 0))) : [];
  return {kind, map, tokens, hints};
}
function cipherWords(cp){ const words = [[]]; cp.tokens.forEach(t => { if(t.sp === ' ' || t.sp === '\n') words.push([]); else words[words.length-1].push(t); }); return words.filter(w => w.length); }
function cipherKeyHTML(cp){
  if(cp.kind === 'crypto') return cp.hints.length ? `<div class="cp-key"><b>רמזים:</b> ${cp.hints.map(b => `<span class="cp-k"><i>${esc(cp.map[b])}</i>=<u>${b}</u></span>`).join('')}</div>` : '<div class="cp-key"><b>בלי רמזים.</b> בהצלחה!</div>';
  if(cp.kind === 'atbash') return `<div class="cp-key cp-pairs">${HEB.slice(0, 11).map((ch, i) => `<span class="cp-k"><u>${ch}</u>↔<u>${HEB[21-i]}</u></span>`).join('')}</div>`;
  return `<div class="cp-key">${HEB.map(ch => `<span class="cp-k"><u>${ch}</u><i>${esc(cp.map[ch])}</i></span>`).join('')}</div>`;
}
function cipherMsgHTML(cp, answers){
  return `<div class="cp-msg">${cipherWords(cp).map(w => `<span class="cp-w">${w.map(t => t.b ? `<span class="cp-l"><i>${esc(t.code)}</i><u>${answers || cp.hints.includes(t.b) ? esc(t.ch) : '&nbsp;'}</u></span>` : `<span class="cp-p">${esc(t.sp)}</span>`).join('')}</span>`).join('')}</div>`;
}

/* ---------- שמונה נרות ---------- */
function candleEntries(text){ return lines(text).map(splitPair).map(([w, hint]) => ({w, hint, L:lettersOf(w)})).filter(e => e.L.length); }
function menorahHTML(cls){ const fx = window.MadlikFX; return fx ? `<div class="cd-men ${cls||''}">${fx.menorah({scroll:true})}</div>` : ''; }

/* ---------- תצוגה והדפסה ---------- */
function render(type, s, cache, v, title){
  const sheet = (inner, extra) => `<div class="sheet gp-sheet ${extra||''}" style="${v}">${title}${inner}<p class="gp-brand">מדליק · כל מה שצריך לערב לביבות</p></div>`;
  const empty = t => `<div class="empty">${t}</div>`;
  if(type === 'crossword'){
    if(cache.key !== s.words){ cache.key = s.words; cache.cw = buildCrossword(s.words); }
    const cw = cache.cw; if(!cw) return empty('כתוב לפחות שתי מילים, שורה לכל מילה: מילה - הגדרה');
    const cs = Math.max(18, Math.min(42, Math.floor(690 / Math.max(cw.cols, 1))));
    const note = cw.unplaced.length ? `<div class="gp-note no-print">לא הצלחתי לשלב את: <b>${cw.unplaced.map(esc).join(', ')}</b>. אין להן אות משותפת עם שאר המילים. נסה מילה אחרת או הוסף מילים.</div>` : `<div class="gp-note ok no-print">כל ${cw.across.length + cw.down.length} המילים שובצו, עם ${cw.across.length} מאוזן ו־${cw.down.length} מאונך.</div>`;
    const key = s.key !== false && s.key !== 'false';
    return note + sheet(cwGridHTML(cw, false, cs) + cwCluesHTML(cw)) + (key ? sheet(`<h3 class="gp-key-t">דף תשובות למנחה</h3>` + cwGridHTML(cw, true, cs)) : '');
  }
  if(type === 'quiz'){
    if(cache.key !== s.words){ cache.key = s.words; cache.qz = buildQuiz(s.words); }
    const qz = cache.qz; if(!qz.length) return empty('כתוב שאלה בכל שורה: שאלה | תשובה נכונה');
    const pages = chunk(qz.map((q, i) => ({q, i})), 6).map(pg => sheet(`<div class="qz-list">${pg.map(({q, i}) => `<div class="qz-q"><p><b>${i+1}.</b> ${esc(q.q)}</p><ol class="qz-o">${q.opts.map((o, k) => `<li><i>${LETTER_NAMES[k]}</i>${esc(o)}</li>`).join('')}</ol></div>`).join('')}</div>`)).join('');
    return pages + sheet(`<h3 class="gp-key-t">תשובות למנחה</h3><div class="qz-keys">${qz.map((q, i) => `<span><b>${i+1}</b> ${LETTER_NAMES[q.ans]} · ${esc(q.opts[q.ans])}</span>`).join('')}</div>`);
  }
  if(type === 'wheel'){
    const items = lines(s.words); if(!items.length) return empty('כתוב לפחות פריט אחד, שורה לכל פריט');
    return sheet(`<div class="wh-print">${wheelSVG(items, 'wh-svg')}<i class="wh-pin"></i></div><ol class="wh-list">${items.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`);
  }
  if(type === 'cipher'){
    const k = (s.msg||'') + '|' + s.kind + '|' + s.hints;
    if(cache.key !== k){ cache.key = k; cache.cp = buildCipher(s); }
    const cp = cache.cp; if(!cp.tokens.some(t => t.b)) return empty('כתוב הודעה בעברית');
    return sheet(`<h3 class="gp-key-t">מפתח הצופן</h3>${cipherKeyHTML(cp)}<h3 class="gp-key-t">ההודעה הסודית</h3>${cipherMsgHTML(cp, false)}`) + sheet(`<h3 class="gp-key-t">הפתרון למנחה</h3>${cipherMsgHTML(cp, true)}`);
  }
  if(type === 'candles'){
    const es = candleEntries(s.words); if(!es.length) return empty('כתוב לפחות מילה אחת');
    return sheet(`<div class="cd-print">${menorahHTML('lit-all')}</div><h3 class="gp-key-t">רשימת המילים למנחה</h3><ol class="cd-list">${es.map(e => `<li><b>${esc(e.w)}</b> <i>(${e.L.length} אותיות)</i>${e.hint ? ` · רמז: ${esc(e.hint)}` : ''}</li>`).join('')}</ol><p class="hint">המשחק עצמו נעשה על המסך: לוחצים "לשחק על המסך".</p>`);
  }
  return '';
}

return {RULES, showRules, autoRules, NEW, PLAYABLE, DEFAULTS, fields, render,
  util:{esc, shuffle, lines, chunk, HEB, FIN, base, isHeb, lettersOf, splitPair, LETTER_NAMES, buildCrossword, buildQuiz, buildCipher, cipherWords, cipherKeyHTML, wheelSVG, WHEEL_COLORS, candleEntries, menorahHTML, cwCluesHTML}};
})();
