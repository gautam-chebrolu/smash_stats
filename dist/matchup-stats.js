import {character, playerStats} from './stats.js';

// Array position is player identity: Gautam, Robert, Varad. Never sort the picks.
export function matchupKey(characters) {
  if (!Array.isArray(characters) || characters.length !== 3) return null;
  const picks = characters.map(character);
  return picks.every(Boolean) ? JSON.stringify(picks) : null;
}

export function matchupTimeline(matches) {
  const dates = new Map();
  const ordered = [...matches].sort((a, b) => a.date.localeCompare(b.date) || a.row - b.row);
  for (const match of ordered) {
    if (!dates.has(match.date)) dates.set(match.date, []);
    dates.get(match.date).push(match);
  }
  const cumulativeWins = [0, 0, 0];
  const cumulativeKills = [0, 0, 0];
  return [...dates].map(([date, games]) => {
    const players = playerStats(games).map((player, i) => {
      cumulativeWins[i] += player.wins;
      cumulativeKills[i] += player.kills;
      return {...player, cumulativeWins: cumulativeWins[i], cumulativeKills: cumulativeKills[i]};
    });
    return {date, games: games.length, decided: players[0].winGames, players};
  });
}

export function groupMatchups(matches) {
  const groups = new Map();
  let excludedGames = 0;
  for (const match of matches) {
    const key = matchupKey(match.characters);
    if (key === null) {excludedGames++; continue;}
    if (!groups.has(key)) groups.set(key, {key, characters: JSON.parse(key), matches: []});
    groups.get(key).matches.push(match);
  }
  const matchups = [...groups.values()].map(group => {
    const ordered = [...group.matches].sort((a, b) => a.date.localeCompare(b.date) || a.row - b.row);
    const players = playerStats(ordered);
    return {
      ...group, matches: ordered, games: ordered.length,
      sessions: new Set(ordered.map(match => match.date)).size,
      firstDate: ordered[0].date, lastDate: ordered.at(-1).date,
      decided: players[0].winGames, unknown: ordered.length - players[0].winGames,
      players
    };
  }).sort((a, b) => b.games - a.games || b.lastDate.localeCompare(a.lastDate) || a.key.localeCompare(b.key));
  return {matchups, completeGames: matches.length - excludedGames, excludedGames};
}

export function filterMatchups(matchups, {characters = ['', '', ''], minGames = 2, multipleSessions = false, sort = 'games'} = {}) {
  const picks = characters.map(character);
  return matchups.filter(group => group.games >= minGames && (!multipleSessions || group.sessions >= 2)
    && picks.every((pick, i) => !pick || group.characters[i] === pick))
    .sort((a, b) => {
      const primary = sort === 'recent' ? b.lastDate.localeCompare(a.lastDate)
        : sort === 'sessions' ? b.sessions - a.sessions : b.games - a.games;
      return primary || b.games - a.games || b.lastDate.localeCompare(a.lastDate) || a.key.localeCompare(b.key);
    });
}
