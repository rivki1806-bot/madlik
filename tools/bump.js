// העלאת מספר גרסה לפני העלאה לאתר, כדי שכל הגולשות יקבלו את הקבצים החדשים.
// שימוש: node tools/bump.js            (מעלה את app.js ואת מספר הגרסה)
//        node tools/bump.js css/home-new.css js/battle.js   (מעלה גם קבצים נוספים)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const root = path.join(__dirname, '..');
const app = path.join(root, 'js/app.js');
let src = fs.readFileSync(app, 'utf8');
const m = src.match(/const APP_V = (\d+);/); if(!m) throw new Error('APP_V not found');
const v = +m[1] + 1;
fs.writeFileSync(app, src.replace(/const APP_V = \d+;/, 'const APP_V = ' + v + ';'));
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({v}) + '\n');
const files = ['js/app.js'].concat(process.argv.slice(2));
const htmls = execSync('git ls-files "*.html"', {cwd: root}).toString().split('\n').filter(f => f && !f.startsWith('_private'));
for(const h of htmls){
  const p = path.join(root, h); let t = fs.readFileSync(p, 'utf8'), t0 = t;
  for(const f of files){ const esc = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); t = t.replace(new RegExp(esc + '\\?v=(\\d+)', 'g'), (_, n) => f + '?v=' + (f === 'js/app.js' ? v : +n + 1)); }
  if(t !== t0) fs.writeFileSync(p, t);
}
console.log('גרסה ' + v);
