import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCSV, normalize} from '../dist/stats.js';
import {matchupKey, groupMatchups, filterMatchups, matchupTimeline} from '../dist/matchup-stats.js';
import {matchupListMarkup, matchupDetailMarkup, matchupChartMarkup} from '../dist/matchups.js';

const lineup = ['Kirby', 'Ness', 'Zelda'];
const game = (row, date, winner = 'G', characters = lineup, kills = [3,2,1]) => ({row, date, winner, characters, kills});
const snapshot = normalize(parseCSV(readFileSync(new URL('../dist/smash.csv', import.meta.url), 'utf8'))).matches;

test('all six player assignments of the same three fighters stay separate', () => {
  const permutations = [
    ['Kirby','Ness','Zelda'], ['Kirby','Zelda','Ness'],
    ['Ness','Kirby','Zelda'], ['Ness','Zelda','Kirby'],
    ['Zelda','Kirby','Ness'], ['Zelda','Ness','Kirby']
  ];
  const games = permutations.flatMap((characters, i) => [
    game(i*2+2, '2026-11-11', 'G', characters),
    game(i*2+3, '2026-11-12', 'R', characters)
  ]);
  const {matchups} = groupMatchups(games);
  assert.equal(matchups.length, 6);
  for (const group of matchups) {
    assert.equal(group.games, 2);
    assert.deepEqual(group.players.map(player => player.wins), [1,1,0]);
    assert.ok(group.matches.every(match => matchupKey(match.characters) === group.key));
    assert.equal(group.sessions, 2);
  }
});

test('mirror picks retain player positions and tuple keys cannot collide through delimiters', () => {
  assert.notEqual(matchupKey(['Kirby','Kirby','Zelda']), matchupKey(['Kirby','Zelda','Kirby']));
  assert.notEqual(matchupKey(['A|B','C','D']), matchupKey(['A','B|C','D']));
  assert.equal(matchupKey([' DK ','LInk','pokemon trainer']), matchupKey(['Donkey Kong','Link','Pokémon Trainer']));
  for (const picks of [null, [], ['Kirby','Ness'], ['Kirby','Ness',''], ['Kirby',null,'Zelda'], ['Kirby','Ness','Zelda','Ike']]) {
    assert.equal(matchupKey(picks), null);
  }
});

test('unknown winners and missing kills keep their correct denominators', () => {
  const {matchups, excludedGames, completeGames} = groupMatchups([
    game(2, '2026-11-11', 'G', lineup, [0,2,null]),
    game(3, '2026-11-11', null, lineup, [3,null,1]),
    game(4, '2026-11-12', 'R', lineup, [null,4,2]),
    game(5, '2026-11-12', 'V', ['Kirby','','Zelda'])
  ]);
  assert.equal(excludedGames, 1);
  assert.equal(completeGames, 3);
  const group = matchups[0];
  assert.equal(group.decided, 2);
  assert.equal(group.unknown, 1);
  assert.deepEqual(group.players.map(player => player.winRate), [.5,.5,0]);
  assert.deepEqual(group.players.map(player => player.avg), [1.5,3,1.5]);
  assert.deepEqual(group.players.map(player => player.killGames), [2,2,2]);
});

test('sessions are chronological and cumulative values do not mix session averages', () => {
  const games = [
    game(5,'2026-11-12','G',lineup,[2,null,1]),
    game(3,'2026-11-11',null,lineup,[3,2,null]),
    game(2,'2026-11-11','R',lineup,[0,4,2])
  ];
  const original = [...games];
  const sessions = matchupTimeline(games);
  assert.deepEqual(sessions.map(session => session.date), ['2026-11-11','2026-11-12']);
  assert.deepEqual(sessions.map(session => session.games), [2,1]);
  assert.deepEqual(sessions[0].players.map(player => player.avg), [1.5,3,2]);
  assert.deepEqual(sessions[1].players.map(player => player.avg), [2,null,1]);
  assert.deepEqual(sessions[1].players.map(player => player.cumulativeWins), [1,1,0]);
  assert.deepEqual(sessions[1].players.map(player => player.cumulativeKills), [5,6,3]);
  assert.deepEqual(games, original);
});

test('player filters, repeat threshold, sessions and sort use exact lineup groups', () => {
  const {matchups} = groupMatchups([
    game(2,'2026-11-01'), game(3,'2026-11-02'), game(4,'2026-11-03'),
    game(5,'2026-11-11','R',['Ness','Kirby','Zelda']), game(6,'2026-11-11','G',['Ness','Kirby','Zelda']),
    game(7,'2026-11-12','V',['Kirby','Ness','Marth'])
  ]);
  assert.equal(filterMatchups(matchups).length, 2);
  assert.equal(filterMatchups(matchups,{multipleSessions:true}).length, 1);
  const exact = filterMatchups(matchups,{characters:lineup});
  assert.equal(exact.length, 1);
  assert.equal(exact[0].games, 3);
  assert.equal(filterMatchups(matchups,{characters:['','Kirby','']})[0].characters[0], 'Ness');
  assert.equal(filterMatchups(matchups,{characters:['Kirby','Kirby','']}).length, 0);
  assert.equal(filterMatchups(matchups,{minGames:1,sort:'recent'})[0].lastDate, '2026-11-12');
  assert.equal(filterMatchups(matchups,{minGames:1,sort:'sessions'})[0].sessions, 3);
  assert.equal(filterMatchups(matchups,{minGames:5}).length, 0);
});

test('date cohorts recalculate matchup stats without including outside games', () => {
  const games = [game(2,'2026-11-11','G'), game(3,'2026-11-12','R')];
  assert.equal(groupMatchups(games).matchups[0].games, 2);
  const group = groupMatchups(games.filter(match => match.date === '2026-11-12')).matchups[0];
  assert.equal(group.games, 1);
  assert.deepEqual(group.players.map(player => player.wins), [0,1,0]);
  assert.equal(group.sessions, 1);
  assert.equal(filterMatchups([group]).length, 0);
});

test('snapshot lineups reconcile and the requested Kirby / Ness / Zelda example is exact', () => {
  const {matchups, completeGames, excludedGames} = groupMatchups(snapshot);
  assert.equal(completeGames,479);
  assert.equal(excludedGames,102);
  assert.equal(matchups.length,403);
  assert.equal(filterMatchups(matchups).length,51);
  assert.equal(matchups.reduce((sum,group) => sum + group.games,0), completeGames);
  const example = filterMatchups(matchups,{characters:lineup})[0];
  assert.equal(example.games,2);
  assert.ok(example.matches.every(match => match.characters.every((name,i) => name === lineup[i])));
  for (const group of matchups) {
    const end = matchupTimeline(group.matches).at(-1);
    assert.deepEqual(end.players.map(player => player.cumulativeWins), group.players.map(player => player.wins));
    assert.deepEqual(end.players.map(player => player.cumulativeKills), group.players.map(player => player.kills));
  }
});

test('charts handle empty, one-session, zero-score and missing-score lineups', () => {
  assert.match(matchupChartMarkup([]), /No sessions/);
  for (const games of [
    [game(2,'2026-11-12')],
    [game(2,'2026-11-12',null,lineup,[0,0,0])],
    [game(2,'2026-11-11','G',lineup,[null,null,null]), game(3,'2026-11-12','R',lineup,[0,3,2])],
    [game(2,'2026-11-11'), game(3,'2026-11-12'), game(4,'2026-12-11')]
  ]) {
    for (const metric of ['wins','kills']) {
      const html = matchupChartMarkup(matchupTimeline(games), metric);
      assert.doesNotMatch(html, /NaN|Infinity|undefined/);
      assert.match(html, /<svg/);
      for (const rect of html.matchAll(/<rect[^>]* x="([\d.]+)"[^>]* width="([\d.]+)"/g)) {
        assert.ok(Number(rect[1]) >= 42);
        assert.ok(Number(rect[2]) > 0);
        assert.ok(Number(rect[1]) + Number(rect[2]) <= 737.00001);
      }
    }
  }
});

test('list and report markup label each player and escape character values', () => {
  const group = groupMatchups([game(2,'2026-11-12')]).matchups[0];
  const list = matchupListMarkup([group], group.key);
  assert.match(list, /Analyze Gautam as Kirby, Robert as Ness, Varad as Zelda/);
  assert.match(list, /aria-pressed="true"/);
  assert.match(matchupDetailMarkup(group), /Games with this exact lineup/);
  const unsafe = groupMatchups([game(2,'2026-11-12','G',['<script>','"Ike"','Zelda'])]).matchups[0];
  assert.doesNotMatch(matchupListMarkup([unsafe],unsafe.key), /<script>/);
  assert.match(matchupDetailMarkup(unsafe), /&lt;script&gt;/);
  assert.match(matchupListMarkup([],null), /No matching lineups/);
  assert.deepEqual(groupMatchups([]), {matchups:[], completeGames:0, excludedGames:0});
});
