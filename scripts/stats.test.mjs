import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAYERS,parseCSV,normalize,googleRows,playerStats,fighterStats,winSpreadStats} from '../dist/stats.js';
import {renderWinSpread} from '../dist/win-spread.js';
const parsed=normalize(parseCSV(readFileSync(new URL('../dist/smash.csv',import.meta.url),'utf8')));
test('sheet dates carry forward including yearless dates',()=>{assert.equal(parsed.matches.find(m=>m.row===204).date,'2026-08-27');assert.equal(parsed.matches.at(-1).date,'2026-11-11');});
test('snapshot has 581 matches, excludes two empty/incomplete rows',()=>{assert.equal(parsed.matches.length,581);assert.deepEqual(parsed.skipped,[292,293]);assert.equal(parsed.matches.filter(m=>m.winner).length,577);});
test('winner case is normalized; wins sum only to decided games',()=>{const p=playerStats(parsed.matches);assert.deepEqual(p.map(x=>x.wins),[144,186,247]);assert.equal(p.reduce((s,x)=>s+x.wins,0),577);});
test('missing kills remain missing; zero is a recorded score',()=>{const p=playerStats(parsed.matches);assert.deepEqual(p.map(x=>x.killGames),[579,578,578]);assert.equal(parsed.matches.find(m=>m.row===104).kills[1],null);assert.equal(parsed.matches.find(m=>m.row===102).kills[1],0);});
test('character aliases merge and blank picks are excluded',()=>{const g=fighterStats(parsed.matches,'G');assert.equal(g.find(x=>x.name==='Donkey Kong').picks,22);assert.equal(g.some(x=>x.name==='DK'),false);assert.equal(g.some(x=>!x.name),false);assert.equal(fighterStats(parsed.matches).reduce((s,x)=>s+x.picks,0),1437);});
test('empty cohorts have no misleading rates',()=>{assert.equal(playerStats([])[0].avg,null);assert.equal(playerStats([])[0].winRate,null);assert.deepEqual(fighterStats([]),[]);});
test('live Google date values preserve their year and carry through blank cells',()=>{const rows=googleRows({table:{rows:[{c:[{v:'Date(2026,7,27)',f:'8/27'},{v:'v'},{v:0},{v:2},{v:5},{v:'DK'},{v:'Ness'},{v:'Zelda'}]},{c:[null,{v:'G'},{v:3},null,{v:2}]}]}});const data=normalize(rows);assert.equal(data.matches[0].date,'2026-08-27');assert.equal(data.matches[1].date,'2026-08-27');assert.deepEqual(data.matches[1].kills,[3,null,2]);assert.equal(data.matches[0].characters[0],'Donkey Kong');});
test('CSV parser handles quoted commas, escaped quotes and CRLF',()=>{assert.deepEqual(parseCSV('a,"b,c","d""e"\r\n1,2,3'),[['a','b,c','d"e'],['1','2','3']]);});

function winningGames(winner, fighters) {
  return fighters.map((name, index) => ({row:index + 2, date:'2026-11-12', winner, kills:[0,0,0], characters:PLAYERS.map(player => player.id === winner ? name : 'Kirby')}));
}

test('one winning fighter is completely concentrated',()=>{
  const result=winSpreadStats(winningGames('G',['Ike','Ike','Ike']))[0];
  assert.equal(result.effectiveFighters,1);
  assert.equal(result.concentration,1);
  assert.equal(result.topThreeShare,1);
  assert.equal(result.winningFighters,1);
});

test('equally distributed wins produce the equivalent count of fighters',()=>{
  const games=winningGames('G',['Ike','Ike','Link','Link','Kirby','Kirby','Bowser','Bowser']);
  const result=winSpreadStats(games)[0];
  assert.equal(result.effectiveFighters,4);
  assert.equal(result.topThreeShare,.75);
  assert.equal(result.fighters.at(-1).cumulativeShare,1);
  const concentrated=winSpreadStats(winningGames('G',['Ike','Ike','Ike','Ike','Ike','Ike','Ike','Link','Kirby','Bowser']))[0];
  assert.ok(concentrated.effectiveFighters<result.effectiveFighters);
  assert.equal(concentrated.topThreeShare,.9);
  assert.equal(winSpreadStats([...games,...games])[0].effectiveFighters,4);
});

test('win spread attributes only the winning player and preserves missing coverage',()=>{
  const games=[...winningGames('G',['Ike','']),...winningGames('R',['Ness']),...winningGames(null,['Zelda'])];
  const [g,r,v]=winSpreadStats(games);
  assert.equal(g.totalWins,2);
  assert.equal(g.trackedWins,1);
  assert.equal(g.missingWins,1);
  assert.equal(g.fighters[0].share,1);
  assert.deepEqual(r.fighters.map(f=>f.name),['Ness']);
  assert.equal(v.totalWins,0);
  assert.equal(v.effectiveFighters,null);
  assert.equal(v.topThreeShare,null);
});

test('empty and unrecorded winning rosters do not manufacture concentration',()=>{
  for(const player of winSpreadStats([])){
    assert.equal(player.concentration,null);
    assert.equal(player.effectiveFighters,null);
    assert.equal(player.topThreeShare,null);
    assert.deepEqual(player.fighters,[]);
  }
  const result=winSpreadStats(winningGames('V',['','']))[2];
  assert.equal(result.totalWins,2);
  assert.equal(result.missingWins,2);
  assert.equal(result.effectiveFighters,null);
});

test('win spread recalculates by cohort and retains character win rates',()=>{
  const games=[...winningGames('G',['Ike','Link']),...winningGames('R',['Ness'])];
  games[0].date='2026-11-11';
  games[2].characters[0]='Ike';
  const full=winSpreadStats(games)[0];
  assert.equal(full.effectiveFighters,2);
  assert.equal(full.fighters.find(f=>f.name==='Ike').winRate,.5);
  assert.equal(winSpreadStats(games.filter(m=>m.date==='2026-11-12'))[0].effectiveFighters,1);
});

test('snapshot win shares reconcile to tracked wins and omit unrecorded wins',()=>{
  for(const player of winSpreadStats(parsed.matches)){
    assert.equal(player.trackedWins+player.missingWins,player.totalWins);
    assert.equal(player.fighters.reduce((sum,f)=>sum+f.wins,0),player.trackedWins);
    assert.ok(Math.abs(player.fighters.reduce((sum,f)=>sum+f.share,0)-1)<1e-12);
    assert.equal(player.fighters.at(-1).cumulativeShare,1);
    assert.ok(player.effectiveFighters>=1&&player.effectiveFighters<=player.winningFighters);
  }
});

test('win spread renders full, sparse and empty cohorts without invalid SVG values',()=>{
  for(const games of [parsed.matches,winningGames('G',['Ike']),winningGames('V',['']),[]]){
    const container={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
    renderWinSpread(container,games,()=>{});
    assert.doesNotMatch(container.innerHTML,/NaN|Infinity|undefined/);
    assert.match(container.innerHTML,/Gautam/);
    assert.match(container.innerHTML,/Robert/);
    assert.match(container.innerHTML,/Varad/);
    if(games.some(m=>m.characters[PLAYERS.findIndex(p=>p.id===m.winner)]))assert.match(container.innerHTML,/<svg/);
    else assert.match(container.innerHTML,/No winning fighters to compare/);
  }
});
