export const PLAYERS = [{id:'G',name:'Gautam',color:'#648b50'},{id:'R',name:'Robert',color:'#ce5552'},{id:'V',name:'Varad',color:'#6389c6'}];
export function googleRows(payload){return [['Date','Winner','G','R','V','G Character','R Character','V Character'],...payload.table.rows.map(row=>Array.from({length:8},(_,i)=>{const cell=row.c[i];if(!cell)return '';const v=cell.v??'';if(i===0&&typeof v==='string'){const date=v.match(/^Date\((\d+),(\d+),(\d+)(?:,.*)?\)$/);if(date)return `${Number(date[2])+1}/${date[3]}/${date[1]}`;}return v;}))];}
const canonical = ['Mario','Donkey Kong','Link','Samus','Dark Samus','Yoshi','Kirby','Fox','Pikachu','Luigi','Ness','Captain Falcon','Jigglypuff','Peach','Daisy','Bowser','Ice Climbers','Sheik','Zelda','Dr. Mario','Pichu','Falco','Marth','Lucina','Young Link','Ganondorf','Mewtwo','Roy','Chrom','Mr. Game & Watch','Meta Knight','Pit','Dark Pit','Zero Suit Samus','Wario','Snake','Ike','Pokémon Trainer','Diddy Kong','Lucas','Sonic','King Dedede','Olimar','Lucario','R.O.B.','Toon Link','Wolf','Villager','Mega Man','Wii Fit Trainer','Rosalina & Luma','Little Mac','Greninja','Palutena','Pac-Man','Robin','Shulk','Bowser Jr.','Duck Hunt','Ryu','Ken','Cloud','Corrin','Bayonetta','Inkling','Ridley','Simon','Richter','King K. Rool','Isabelle','Incineroar','Piranha Plant','Joker','Hero','Banjo & Kazooie','Terry','Byleth','Min Min','Steve','Sephiroth','Pyra / Mythra','Kazuya','Sora'];
const aliases = {'dk':'Donkey Kong','pokemon trainer':'Pokémon Trainer','mr. game and watch':'Mr. Game & Watch','rosalina':'Rosalina & Luma','lemmy':'Bowser Jr.'};
export function character(value){const s=String(value||'').trim().replace(/\s+/g,' ');return aliases[s.toLowerCase()]||canonical.find(x=>x.toLowerCase()===s.toLowerCase())||s;}
export function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}row.push(cell);if(row.some(Boolean))rows.push(row);return rows;}
export function normalize(rows){let date='',year=2026;const matches=[],skipped=[];rows.forEach((row,index)=>{if(index===0&&String(row[0]).toLowerCase()==='date')return;const raw=row[0];if(raw){if(raw instanceof Date){year=raw.getFullYear();date=`${year}-${String(raw.getMonth()+1).padStart(2,'0')}-${String(raw.getDate()).padStart(2,'0')}`;}else{const parts=String(raw).trim().split('/');if(parts.length>=2){if(parts[2])year=Number(parts[2])+(Number(parts[2])<100?2000:0);date=`${year}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;}}}const winner=String(row[1]||'').trim().toUpperCase();const kills=row.slice(2,5).map(v=>v===null||v===undefined||String(v).trim()===''?null:Number(v));while(kills.length<3)kills.push(null);const chars=[5,6,7].map(i=>character(row[i]));if(!date||(!['G','R','V'].includes(winner)&&kills.every(v=>v===null))){skipped.push(index+1);return;}matches.push({row:index+1,date,winner:['G','R','V'].includes(winner)?winner:null,kills:kills.map(v=>Number.isFinite(v)&&v>=0?v:null),characters:chars});});return {matches,skipped};}
export function playerStats(matches){return PLAYERS.map((p,i)=>{const recorded=matches.filter(m=>m.kills[i]!==null);const decided=matches.filter(m=>m.winner);const wins=matches.filter(m=>m.winner===p.id).length;const kills=recorded.reduce((a,m)=>a+m.kills[i],0);const picks=new Map();matches.forEach(m=>{if(m.characters[i])picks.set(m.characters[i],(picks.get(m.characters[i])||0)+1);});return {...p,wins,kills,killGames:recorded.length,winGames:decided.length,winRate:decided.length?wins/decided.length:null,avg:recorded.length?kills/recorded.length:null,best:recorded.length?Math.max(...recorded.map(m=>m.kills[i])):null,main:[...picks].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]||null};});}
export function fighterStats(matches,player='all'){const records=new Map();matches.forEach(m=>PLAYERS.forEach((p,i)=>{if(player!=='all'&&p.id!==player)return;const name=m.characters[i];if(!name)return;if(!records.has(name))records.set(name,{name,picks:0,wins:0,decided:0,kills:0,killGames:0,players:new Set()});const r=records.get(name);r.picks++;r.players.add(p.id);if(m.winner){r.decided++;if(m.winner===p.id)r.wins++;}if(m.kills[i]!==null){r.kills+=m.kills[i];r.killGames++;}}));const total=[...records.values()].reduce((a,r)=>a+r.picks,0);return [...records.values()].map(r=>({...r,winRate:r.decided?r.wins/r.decided:null,avg:r.killGames?r.kills/r.killGames:null,pickRate:total?r.picks/total:0}));}
export function winSpreadStats(matches) {
  return PLAYERS.map(player => {
    const fighters = fighterStats(matches, player.id)
      .filter(fighter => fighter.wins > 0)
      .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name));
    const totalWins = matches.filter(match => match.winner === player.id).length;
    const trackedWins = fighters.reduce((sum, fighter) => sum + fighter.wins, 0);
    let cumulativeWins = 0;
    const ranked = fighters.map(fighter => {
      cumulativeWins += fighter.wins;
      return {...fighter, share: fighter.wins / trackedWins, cumulativeWins, cumulativeShare: cumulativeWins / trackedWins};
    });
    const concentration = trackedWins ? ranked.reduce((sum, fighter) => sum + fighter.share ** 2, 0) : null;
    return {
      ...player, fighters: ranked, totalWins, trackedWins,
      missingWins: totalWins - trackedWins,
      winningFighters: ranked.length,
      topThreeShare: trackedWins ? ranked[Math.min(2, ranked.length - 1)].cumulativeShare : null,
      concentration,
      effectiveFighters: concentration === null ? null : 1 / concentration
    };
  });
}
export const slug = name => ({'Pokémon Trainer':'pokemon_trainer','Mr. Game & Watch':'mr_game_and_watch','Rosalina & Luma':'rosalina_and_luma','R.O.B.':'rob','Pac-Man':'pac_man','Bowser Jr.':'bowser_jr','Dr. Mario':'dr_mario','King K. Rool':'king_k_rool','Pyra / Mythra':'pyra','Banjo & Kazooie':'banjo_and_kazooie'}[name]||name.toLowerCase().replaceAll(' ','_').replaceAll('.',''));
