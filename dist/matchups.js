import {PLAYERS, slug} from './stats.js';
import {groupMatchups, filterMatchups, matchupTimeline} from './matchup-stats.js';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const percent = value => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
const average = value => value === null ? '—' : value.toFixed(2);
const dateLabel = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'});
const shortDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {month:'short', day:'numeric'});
const fighterImage = name => `<img class="fighter-image" src="assets/thumbs/${escapeHTML(slug(name))}.png" alt="" loading="lazy" data-fallback>`;
const emptyState = message => `<div class="empty-state"><strong>No matching lineups.</strong>${message}</div>`;
const legend = () => `<div class="legend">${PLAYERS.map(player => `<span><i class="dot" style="background:${player.color}"></i>${player.name}</span>`).join('')}</div>`;

export function matchupListMarkup(groups, selectedKey) {
  if (!groups.length) return emptyState('Try clearing the fighter filters, lowering the minimum games, or expanding the match period.');
  return `<table class="matchup-list-table"><thead><tr>${PLAYERS.map(player => `<th>${player.name.toUpperCase()}'S FIGHTER</th>`).join('')}<th>GAMES</th><th>WINS · G / R / V</th><th>LAST PLAYED</th><th><span class="sr-only">Explore lineup</span></th></tr></thead>
    <tbody>${groups.map(group => `<tr class="${group.key === selectedKey ? 'matchup-selected' : ''}">
      ${group.characters.map(name => `<td><span class="match-fighter">${fighterImage(name)}<span>${escapeHTML(name)}</span></span></td>`).join('')}
      <td><strong>${group.games}</strong><small class="matchup-cell-note">${group.sessions} ${group.sessions === 1 ? 'session' : 'sessions'}</small></td>
      <td><span class="matchup-record">${group.players.map(player => `<span style="--player:${player.color}" title="${player.name}: ${player.wins} wins">${player.id} ${player.wins}</span>`).join('')}</span>${group.unknown ? `<small class="matchup-cell-note">${group.unknown} unknown ${group.unknown === 1 ? 'winner' : 'winners'}</small>` : ''}</td>
      <td class="match-date">${shortDate(group.lastDate)}</td>
      <td><button class="button-outline" data-lineup="${escapeHTML(group.key)}" aria-pressed="${group.key === selectedKey}" aria-label="Analyze ${escapeHTML(group.characters.map((name, i) => `${PLAYERS[i].name} as ${name}`).join(', '))}">Analyze ↗</button></td>
    </tr>`).join('')}</tbody></table>`;
}

export function matchupChartMarkup(sessions, metric = 'wins') {
  if (!sessions.length) return '<div class="empty-state">No sessions in this period.</div>';
  const W = 760, H = 255, L = 42, R = 23, T = 23, B = 35;
  const width = W - L - R, height = H - T - B;
  const times = sessions.map(session => new Date(`${session.date}T12:00:00`).getTime());
  const span = times.at(-1) - times[0];
  const x = i => L + (span ? (times[i] - times[0]) / span * width : width / 2);
  const value = player => metric === 'wins' ? player.cumulativeWins : player.avg;
  const values = sessions.flatMap(session => session.players.map(value)).filter(n => n !== null);
  const maxY = metric === 'wins' ? Math.max(1, Math.ceil(Math.max(0, ...values) / 4) * 4) : Math.max(1, Math.ceil(Math.max(0, ...values)));
  const y = n => T + height - n / maxY * height;
  const ticks = metric === 'wins' ? [...new Set([0, Math.ceil(maxY / 2), maxY])] : [0, maxY / 2, maxY];
  const grid = ticks.map(n => `<line x1="${L}" x2="${W - R}" y1="${y(n)}" y2="${y(n)}" stroke="#e7eae1" stroke-dasharray="3 4"/><text x="${L - 9}" y="${y(n) + 4}" text-anchor="end">${Number.isInteger(n) ? n : n.toFixed(1)}</text>`).join('');
  // Show date labels far enough apart to remain readable, preserving endpoints.
  const labels = [0];
  for (let i = 1; i < sessions.length - 1; i++) {
    if (x(i) - x(labels.at(-1)) >= 130 && x(sessions.length - 1) - x(i) >= 90) labels.push(i);
  }
  if (sessions.length > 1) labels.push(sessions.length - 1);
  const lines = PLAYERS.map((player, playerIndex) => {
    let connected = false;
    const path = sessions.map((session, i) => {
      const n = value(session.players[playerIndex]);
      if (n === null) {connected = false; return '';}
      const command = connected ? 'L' : 'M'; connected = true;
      return `${command} ${x(i)} ${y(n)}`;
    }).join(' ');
    return `<path d="${path}" fill="none" stroke="${player.color}" stroke-width="2.7" stroke-linejoin="round"/>${sessions.map((session, i) => {
      const n = value(session.players[playerIndex]);
      return n === null ? '' : `<circle cx="${x(i)}" cy="${y(n)}" r="4" fill="${player.color}" stroke="white" stroke-width="1.6"><title>${player.name} · ${dateLabel(session.date)}: ${metric === 'wins' ? `${n} cumulative wins` : `${average(n)} kills per scored game`}</title></circle>`;
    }).join('')}`;
  }).join('');
  const targets = sessions.map((session, i) => {
    const start = i === 0 ? L : (x(i - 1) + x(i)) / 2;
    const end = i === sessions.length - 1 ? W - R : (x(i) + x(i + 1)) / 2;
    return `<rect data-matchup-session="${i}" data-x="${x(i)}" tabindex="0" role="button" aria-label="${dateLabel(session.date)}. ${session.games} games. ${session.players.map(player => `${player.name}: ${player.wins} wins, ${average(player.avg)} kills per game`).join('; ')}" x="${start}" y="${T}" width="${end - start}" height="${height}" fill="transparent"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${metric === 'wins' ? 'Cumulative wins' : 'Kills per game by session'} for this exact player and fighter lineup">
    ${grid}${labels.map(i => `<text x="${x(i)}" y="${H - 10}" text-anchor="middle">${shortDate(sessions[i].date)}</text>`).join('')}${lines}
    <line class="matchup-guide" y1="${T}" y2="${T + height}" stroke="#aeb7a1" stroke-dasharray="3 3" visibility="hidden"/>${targets}
  </svg>`;
}

export function matchupDetailMarkup(group) {
  const sessions = matchupTimeline(group.matches);
  return `<div class="panel-heading"><div><div class="eyebrow">THIS EXACT LINEUP</div><h2 id="matchup-detail-title">The rematch report</h2></div><span class="matchup-date-span">${dateLabel(group.firstDate)} – ${dateLabel(group.lastDate)}</span></div>
    <div class="matchup-lineup">${group.characters.map((name, i) => `<div style="--player:${PLAYERS[i].color}">${fighterImage(name)}<span><small>${PLAYERS[i].name}</small><strong>${escapeHTML(name)}</strong></span></div>`).join('')}</div>
    <p class="matchup-detail-caption">${group.games} ${group.games === 1 ? 'game' : 'games'} · ${group.sessions} ${group.sessions === 1 ? 'session' : 'sessions'} · ${group.decided} decided · ${group.unknown} unknown winners${group.games < 5 ? ' · Small sample' : ''}</p>
    <div class="matchup-player-cards">${group.players.map(player => `<article style="--player:${player.color}"><h3><i class="dot"></i>${player.name}</h3><div class="matchup-player-metrics"><div><strong>${player.wins}</strong><span>WINS</span></div><div><strong>${percent(player.winRate)}</strong><span>WIN RATE</span></div><div><strong>${average(player.avg)}</strong><span>KILLS / GAME</span></div></div><p>${player.kills} total kills · ${player.killGames} scored ${player.killGames === 1 ? 'game' : 'games'}</p></article>`).join('')}</div>
    <div class="matchup-trend-heading"><div><h3>How this matchup changed over time</h3><p class="matchup-trend-caption"></p></div><div class="segmented" aria-label="Matchup chart metric"><button data-matchup-metric="wins">Cumulative wins</button><button data-matchup-metric="kills">Kills / game</button></div></div>
    ${legend()}<div class="matchup-chart"></div><div class="matchup-tooltip" role="status" hidden></div>
    <p class="panel-footnote">Only this exact assignment of fighters is included. Hover, tap, or focus a session to compare. Win rates exclude unknown winners; kills per game exclude missing scores.</p>
    <details class="matchup-session-details"><summary>Session-by-session results (${sessions.length})</summary><div class="table-scroll"><table><thead><tr><th>SESSION</th><th>GAMES</th>${PLAYERS.map(player => `<th>${player.name.toUpperCase()}</th>`).join('')}</tr></thead><tbody>${sessions.map(session => `<tr><td class="match-date">${dateLabel(session.date)}</td><td>${session.games}<small class="matchup-cell-note">${session.decided} decided</small></td>${session.players.map(player => `<td>${player.wins} ${player.wins === 1 ? 'win' : 'wins'} · ${percent(player.winRate)}<small class="matchup-cell-note">${average(player.avg)} kills / game</small></td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
    <details class="matchup-game-details" open><summary>Games with this exact lineup</summary><div class="matchup-game-table table-scroll"></div><div class="pagination matchup-game-pagination"><span class="matchup-game-page-info"></span><div><button class="button-outline" data-game-page="prev">← Previous</button><button class="button-outline" data-game-page="next">Next →</button></div></div></details>`;
}

export function createMatchups(container, {renderMatchTable, onImages = () => {}}) {
  const query = selector => container.querySelector(selector);
  const controls = {characters:['', '', ''], minGames:2, multipleSessions:false, sort:'games'};
  let grouped = {matchups:[], completeGames:0, excludedGames:0};
  let filtered = [], selectedKey = null, listPage = 1, gamePage = 1, metric = 'wins';
  let sessionsOpen = false, gamesOpen = true;
  const listPageSize = 12, gamePageSize = 20;
  container.innerHTML = `<div class="lab-intro"><span class="lab-icon">⇄</span><div><h2>Same players. Same fighters. Run it back.</h2><p>Gautam’s Kirby + Robert’s Ness + Varad’s Zelda is its own matchup. Swapping who plays a fighter creates a different one.</p></div></div>
    <section class="panel matchup-browser" aria-label="Find an exact lineup"><div class="matchup-roster-filters">${PLAYERS.map((player, i) => `<div class="field"><label for="matchup-pick-${player.id}"><i class="dot" style="background:${player.color}"></i> ${player.name.toUpperCase()}'S FIGHTER</label><select id="matchup-pick-${player.id}" data-matchup-player="${i}"><option value="">Any fighter</option></select></div>`).join('')}</div>
    <div class="matchup-browser-toolbar"><div class="field"><label for="matchup-min">MIN. GAMES</label><select id="matchup-min"><option value="1">1+ game</option><option value="2" selected>2+ games</option><option value="3">3+ games</option><option value="5">5+ games</option><option value="10">10+ games</option></select></div><div class="field"><label for="matchup-sort">SORT BY</label><select id="matchup-sort"><option value="games">Most played</option><option value="recent">Most recent</option><option value="sessions">Most sessions</option></select></div><label class="matchup-sessions-toggle"><input type="checkbox" id="matchup-multi-session"> Played across multiple sessions</label><button class="text-button matchup-reset">Clear filters ↺</button></div>
    <p class="matchup-coverage" role="status"></p><div class="table-context matchup-count" aria-live="polite"></div><div class="table-scroll matchup-list"></div>
    <div class="pagination matchup-list-pagination"><span class="matchup-page-info"></span><div><button class="button-outline" data-list-page="prev">← Previous</button><button class="button-outline" data-list-page="next">Next →</button></div></div></section>
    <section class="panel matchup-detail" aria-labelledby="matchup-detail-title" hidden></section>`;

  function selectedGroup() {return filtered.find(group => group.key === selectedKey);}
  function renderGames(group) {
    const ordered = [...group.matches].reverse();
    const pages = Math.max(1, Math.ceil(ordered.length / gamePageSize));
    gamePage = Math.min(gamePage, pages);
    query('.matchup-game-table').innerHTML = renderMatchTable(ordered.slice((gamePage - 1) * gamePageSize, gamePage * gamePageSize));
    query('.matchup-game-page-info').textContent = `${group.games} ${group.games === 1 ? 'game' : 'games'} · newest first · page ${gamePage} of ${pages}`;
    query('[data-game-page="prev"]').disabled = gamePage === 1;
    query('[data-game-page="next"]').disabled = gamePage === pages;
    query('[data-game-page="prev"]').onclick = () => {gamePage--; renderGames(group);};
    query('[data-game-page="next"]').onclick = () => {gamePage++; renderGames(group);};
    onImages();
  }
  function renderTrend(group) {
    const sessions = matchupTimeline(group.matches);
    const chart = query('.matchup-chart');
    chart.innerHTML = matchupChartMarkup(sessions, metric);
    query('.matchup-trend-caption').textContent = metric === 'wins'
      ? 'Cumulative wins by session, starting at the beginning of the selected period.'
      : 'Average kills per scored game in each session. Gaps indicate no recorded kill scores.';
    container.querySelectorAll('[data-matchup-metric]').forEach(button => {
      const active = button.dataset.matchupMetric === metric;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.onclick = () => {metric = button.dataset.matchupMetric; renderTrend(group);};
    });
    const tooltip = query('.matchup-tooltip'), guide = query('.matchup-guide'), svg = chart.querySelector('svg'), detail = query('.matchup-detail');
    tooltip.hidden = true;
    const hide = () => {tooltip.hidden = true; guide?.setAttribute('visibility', 'hidden');};
    chart.querySelectorAll('[data-matchup-session]').forEach(target => {
      const show = () => {
        const session = sessions[Number(target.dataset.matchupSession)];
        tooltip.innerHTML = `<b>${dateLabel(session.date)}</b><p>${session.games} ${session.games === 1 ? 'game' : 'games'} · ${session.decided} decided</p>${session.players.map(player => `<div><i class="dot" style="background:${player.color}"></i><span>${player.name}</span><strong>${metric === 'wins' ? `${player.cumulativeWins} wins` : `${average(player.avg)} K/G`}</strong><small>${player.wins} session ${player.wins === 1 ? 'win' : 'wins'} · ${percent(player.winRate)}</small></div>`).join('')}`;
        tooltip.hidden = false;
        const svgRect = svg.getBoundingClientRect(), detailRect = detail.getBoundingClientRect(), pointX = Number(target.dataset.x);
        tooltip.style.left = `${Math.max(8, Math.min(detail.clientWidth - tooltip.offsetWidth - 8, svgRect.left - detailRect.left + pointX / 760 * svgRect.width - tooltip.offsetWidth / 2))}px`;
        tooltip.style.top = `${svgRect.top - detailRect.top + 10}px`;
        guide.setAttribute('x1', pointX); guide.setAttribute('x2', pointX); guide.setAttribute('visibility', 'visible');
      };
      target.onpointerenter = show; target.onfocus = show; target.onclick = show; target.onblur = hide;
      target.onkeydown = event => {
        if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); show();}
        if (event.key === 'Escape') hide();
      };
    });
    svg?.addEventListener('pointerleave', hide);
  }
  function renderDetail() {
    const group = selectedGroup(), detail = query('.matchup-detail');
    detail.hidden = !group;
    if (!group) {detail.innerHTML = ''; return;}
    detail.innerHTML = matchupDetailMarkup(group);
    const sessionDetails = query('.matchup-session-details'), gameDetails = query('.matchup-game-details');
    sessionDetails.open = sessionsOpen; gameDetails.open = gamesOpen;
    sessionDetails.ontoggle = () => {sessionsOpen = sessionDetails.open;};
    gameDetails.ontoggle = () => {gamesOpen = gameDetails.open;};
    renderTrend(group); renderGames(group); onImages();
  }
  function renderList() {
    const pages = Math.max(1, Math.ceil(filtered.length / listPageSize));
    listPage = Math.min(listPage, pages);
    query('.matchup-list').innerHTML = matchupListMarkup(filtered.slice((listPage - 1) * listPageSize, listPage * listPageSize), selectedKey);
    query('.matchup-count').textContent = `${filtered.length} exact ${filtered.length === 1 ? 'matchup' : 'matchups'} · ${filtered.reduce((sum, group) => sum + group.games, 0)} games · select a lineup to see its report below`;
    query('.matchup-page-info').textContent = `Page ${listPage} of ${pages}`;
    query('[data-list-page="prev"]').disabled = listPage === 1;
    query('[data-list-page="next"]').disabled = listPage === pages;
    container.querySelectorAll('[data-lineup]').forEach(button => {
      button.onclick = () => {
        selectedKey = button.dataset.lineup; gamePage = 1;
        renderList(); renderDetail();
        query('.matchup-detail').scrollIntoView({block:'start', behavior:'auto'});
      };
    });
    onImages();
  }
  function applyFilters(resetPage = true) {
    if (resetPage) listPage = 1;
    filtered = filterMatchups(grouped.matchups, controls);
    if (!filtered.some(group => group.key === selectedKey)) {selectedKey = filtered[0]?.key ?? null; gamePage = 1;}
    renderList(); renderDetail();
  }
  container.querySelectorAll('[data-matchup-player]').forEach(select => {
    select.onchange = () => {controls.characters[Number(select.dataset.matchupPlayer)] = select.value; applyFilters();};
  });
  query('#matchup-min').onchange = event => {controls.minGames = Number(event.target.value); applyFilters();};
  query('#matchup-sort').onchange = event => {controls.sort = event.target.value; applyFilters();};
  query('#matchup-multi-session').onchange = event => {controls.multipleSessions = event.target.checked; applyFilters();};
  query('.matchup-reset').onclick = () => {
    controls.characters = ['', '', '']; controls.minGames = 2; controls.multipleSessions = false; controls.sort = 'games';
    container.querySelectorAll('[data-matchup-player]').forEach(select => {select.value = '';});
    query('#matchup-min').value = '2'; query('#matchup-sort').value = 'games'; query('#matchup-multi-session').checked = false;
    applyFilters();
  };
  query('[data-list-page="prev"]').onclick = () => {listPage--; renderList();};
  query('[data-list-page="next"]').onclick = () => {listPage++; renderList();};
  return {
    update(matches) {
      grouped = groupMatchups(matches);
      container.querySelectorAll('[data-matchup-player]').forEach(select => {
        const index = Number(select.dataset.matchupPlayer);
        const names = [...new Set(grouped.matchups.map(group => group.characters[index]))].sort((a, b) => a.localeCompare(b));
        // Keep a selected fighter visible when a date filter leaves it without games.
        if (controls.characters[index] && !names.includes(controls.characters[index])) names.push(controls.characters[index]);
        select.innerHTML = '<option value="">Any fighter</option>' + names.map(name => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('');
        select.value = controls.characters[index];
      });
      query('.matchup-coverage').textContent = `${grouped.completeGames} games with all three fighters recorded · ${grouped.excludedGames} games with missing picks excluded · ${grouped.matchups.length} distinct player-assigned lineups. Uses the match period above.`;
      applyFilters(false);
    }
  };
}
