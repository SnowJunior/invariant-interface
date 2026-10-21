import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const destination=process.argv[2];
if(!destination) throw Error('Usage: node bundle.mjs /absolute/path/invariant-lab.html');
let html=await readFile('dist/index.html','utf8');
for(const file of ['styles.css','workshop.css']) {
  const css=await readFile(`dist/${file}`,'utf8');
  html=html.replace(`<link rel="stylesheet" href="./${file}">`,`<style>\n${css}\n</style>`);
}
const sources=await Promise.all(['model.js','timeline.js','workshop.js','main.js'].map(async file=>(await readFile(`dist/js/${file}`,'utf8')).replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'')));
const script=sources.join('\n\n').replaceAll('</script','<\\/script');
html=html.replace('<script type="module" src="./js/main.js"></script>',`<script type="module">\n${script}\n</script>`);
await writeFile(resolve(destination),html);
console.log(`Standalone page written: ${resolve(destination)}`);
