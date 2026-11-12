import {mkdir,readFile,writeFile} from 'node:fs/promises';
import https from 'node:https';
import {parseCSV,normalize,fighterStats,slug} from '../dist/stats.js';
const names=fighterStats(normalize(parseCSV(await readFile(new URL('../dist/smash.csv',import.meta.url),'utf8'))).matches).map(f=>f.name);
const dir=new URL('../dist/assets/thumbs/',import.meta.url);await mkdir(dir,{recursive:true});
function download(url){return new Promise((resolve,reject)=>{https.get(url,res=>{if(res.statusCode!==200){res.resume();reject(new Error(String(res.statusCode)));return;}const chunks=[];res.on('data',d=>chunks.push(d));res.on('end',()=>resolve(Buffer.concat(chunks)));}).on('error',reject);});}
const failed=[];for(let i=0;i<names.length;i+=5){await Promise.all(names.slice(i,i+5).map(async name=>{try{const data=await download(`https://www.smashbros.com/assets_v2/img/fighter/thumb_a/${slug(name)}.png`);await writeFile(new URL(`${slug(name)}.png`,dir),data);}catch(e){failed.push({name,error:e.message});}}));}console.log(JSON.stringify({downloaded:names.length-failed.length,failed}));
