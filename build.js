const fs=require('fs'),path=require('path');
const src=fs.readdirSync('src').filter(f=>/^\d\d_.*\.js$/.test(f)).sort();
const js=src.map(f=>fs.readFileSync(path.join('src',f),'utf8')).join('\n');
fs.writeFileSync('game.js',js);
const shell=fs.readFileSync('src/shell.html','utf8');
fs.writeFileSync('index.html',shell.replace('//GAME',()=>js));
console.log('built index.html:',src.length,'modules,',js.split('\n').length,'lines');
