import {winSpreadStats} from './stats.js';

const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const percent = value => value === null ? '—' : `${(value * 100).toFixed(1)}%`;
const effective = value => value === null ? '—' : value.toFixed(1);

function summaryCard(player) {
  const coverage = `${player.trackedWins} of ${player.totalWins} wins have a fighter recorded`;
  if (!player.trackedWins) {
    return `<article class="spread-card" style="--player:${player.color}">
      <h3><i class="dot"></i>${player.name}</h3>
      <div class="spread-no-data">${player.totalWins ? 'Winning fighters not recorded' : 'No wins in this period'}</div>
      <p class="spread-coverage">${coverage}. No spread calculated.</p>
    </article>`;
  }
  return `<article class="spread-card" style="--player:${player.color}">
    <h3><i class="dot"></i>${player.name}</h3>
    <div class="spread-metrics">
      <div><strong>${effective(player.effectiveFighters)}</strong><span>EFFECTIVE FIGHTERS</span></div>
      <div><strong>${percent(player.topThreeShare)}</strong><span>WINS FROM TOP 3</span></div>
    </div>
    <div class="spread-share-label"><span>Top ${Math.min(3, player.winningFighters)} fighters</span><span>Remaining fighters</span></div>
    <div class="spread-share-bar" role="img" aria-label="${player.name}: top ${Math.min(3, player.winningFighters)} fighters account for ${percent(player.topThreeShare)} of tracked wins"><span style="width:${player.topThreeShare * 100}%"></span></div>
    <p class="spread-roster">Wins with <b>${player.winningFighters} ${player.winningFighters === 1 ? 'fighter' : 'fighters'}</b> · led by <b>${escapeHTML(player.fighters[0].name)}</b> (${percent(player.fighters[0].share)})</p>
    <p class="spread-coverage">${coverage}.${player.trackedWins < 10 ? ' Small sample.' : ''}</p>
  </article>`;
}

function winningFightersTable(players) {
  return `<details class="spread-details"><summary>See winning fighters & win rates</summary>
    <p>Each player’s fighters are ranked separately by wins. Win share uses only that player’s wins with a recorded fighter.</p>
    <div class="table-scroll"><table>
      <thead><tr><th>PLAYER</th><th>FIGHTER</th><th>WINS</th><th>SHARE OF WINS</th><th>DECIDED GAMES</th><th>WIN RATE</th></tr></thead>
      <tbody>${players.flatMap(player => player.fighters.map(fighter => `<tr>
        <td><i class="dot" style="background:${player.color};margin-right:7px"></i>${player.name}</td>
        <td><button class="text-button spread-fighter" data-spread-fighter="${escapeHTML(fighter.name)}">${escapeHTML(fighter.name)} ↗</button></td>
        <td>${fighter.wins}</td><td>${percent(fighter.share)}</td><td>${fighter.decided}</td><td>${percent(fighter.winRate)}</td>
      </tr>`)).join('')}</tbody>
    </table></div></details>`;
}

export function renderWinSpread(container, matches, onFighter) {
  const detailsOpen = container.querySelector('details')?.open || false;
  const players = winSpreadStats(matches);
  const chartPlayers = players.filter(player => player.trackedWins);
  const maxRank = Math.max(1, ...players.map(player => player.winningFighters));
  const W = 800, H = 265, L = 49, R = 22, T = 22, B = 45;
  const width = W - L - R, height = H - T - B;
  const x = rank => L + rank / maxRank * width;
  const y = share => T + (1 - share) * height;
  const pointAt = (player, rank) => player.fighters[Math.min(rank, player.winningFighters) - 1];
  const yTicks = [0, .25, .5, .75, 1].map(share => `<line x1="${L}" x2="${W - R}" y1="${y(share)}" y2="${y(share)}" stroke="#e7eae1" stroke-dasharray="3 4"/><text x="${L - 9}" y="${y(share) + 4}" text-anchor="end">${Math.round(share * 100)}%</text>`).join('');
  const ranks = [...new Set([0, 1, 3, 5, 10, 20, maxRank].filter(rank => rank <= maxRank))].sort((a, b) => a - b);
  const xTicks = ranks.map(rank => `<text x="${x(rank)}" y="${H - B + 19}" text-anchor="middle">${rank}</text>`).join('');
  const lines = chartPlayers.map(player => {
    const points = [{rank: 0, share: 0}, ...player.fighters.map((fighter, index) => ({rank: index + 1, share: fighter.cumulativeShare}))];
    if (player.winningFighters < maxRank) points.push({rank: maxRank, share: 1});
    return `<path d="${points.map((point, i) => `${i ? 'L' : 'M'} ${x(point.rank)} ${y(point.share)}`).join(' ')}" fill="none" stroke="${player.color}" stroke-width="2.8" stroke-linejoin="round"/>
      ${ranks.filter(rank => rank > 0).map(rank => `<circle cx="${x(rank)}" cy="${y(pointAt(player, rank).cumulativeShare)}" r="3.3" fill="${player.color}" stroke="white" stroke-width="1.4"><title>${player.name}: top ${rank} fighters, ${percent(pointAt(player, rank).cumulativeShare)} of tracked wins</title></circle>`).join('')}`;
  }).join('');
  const targets = Array.from({length: maxRank}, (_, index) => {
    const rank = index + 1;
    const description = chartPlayers.map(player => `${player.name}: ${percent(pointAt(player, rank).cumulativeShare)}`).join('; ');
    const start = rank === 1 ? L : x(rank) - width / maxRank / 2;
    const end = rank === maxRank ? W - R : x(rank) + width / maxRank / 2;
    return `<rect data-spread-rank="${rank}" tabindex="0" role="button" aria-label="Top ${rank} ${rank === 1 ? 'fighter' : 'fighters'}. ${description}" x="${start}" y="${T}" width="${end - start}" height="${height}" fill="transparent"/>`;
  }).join('');
  container.innerHTML = `<section class="panel spread-panel" aria-labelledby="spread-title">
    <div class="panel-heading"><div><div class="eyebrow">SPECIALIST OR ALL-ROUNDER?</div><h2 id="spread-title">How many fighters carry your wins?</h2></div>
      <div class="legend">${players.map(player => `<span><i class="dot" style="background:${player.color}"></i>${player.name}</span>`).join('')}</div>
    </div>
    <p class="spread-intro">Share of wins from each player’s strongest winning fighters. A steeper curve means wins are more concentrated.</p>
    ${chartPlayers.length ? `<div class="spread-chart"><svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Cumulative share of tracked wins by number of fighters, ranked separately for each player by wins">
      ${yTicks}${xTicks}${lines}
      <line class="spread-guide" y1="${T}" y2="${T + height}" stroke="#b6bdab" stroke-dasharray="3 3" visibility="hidden"/>
      ${targets}<text x="${L + width / 2}" y="${H - 3}" text-anchor="middle">Number of fighters, ranked by wins · hover or tap to compare</text>
    </svg></div><div class="spread-tooltip" role="status" hidden></div>` : '<div class="empty-state"><strong>No winning fighters to compare.</strong>Try a different date range, or record the winner’s fighter in the sheet.</div>'}
    <div class="spread-cards">${players.map(summaryCard).join('')}</div>
    <p class="spread-explanation"><b>Effective fighters:</b> the number of equally winning fighters that would produce the same spread. 1 means all tracked wins come from one fighter; higher means a broader spread. Calculated as 1 ÷ the sum of squared win shares.</p>
    <p class="spread-explanation">This describes where wins come from and also reflects how often you pick each fighter. Compare the win rates below to see how often those picks win. Missing winning characters are excluded. All figures follow the match period above.</p>
    ${chartPlayers.length ? winningFightersTable(players) : ''}
  </section>`;
  const details = container.querySelector('details');
  if (details) details.open = detailsOpen;
  container.querySelectorAll('[data-spread-fighter]').forEach(button => {
    button.onclick = () => onFighter(button.dataset.spreadFighter);
  });
  const tooltip = container.querySelector('.spread-tooltip');
  const guide = container.querySelector('.spread-guide');
  const svg = container.querySelector('svg');
  const panel = container.querySelector('.spread-panel');
  function hideTooltip() {
    if (tooltip) tooltip.hidden = true;
    guide?.setAttribute('visibility', 'hidden');
  }
  container.querySelectorAll('[data-spread-rank]').forEach(target => {
    const show = () => {
      const rank = Number(target.dataset.spreadRank);
      tooltip.innerHTML = `<b>Top ${rank} ${rank === 1 ? 'fighter' : 'fighters'} by wins</b>${chartPlayers.map(player => {
        const point = pointAt(player, rank);
        return `<div><i class="dot" style="background:${player.color}"></i><span>${player.name}</span><strong>${percent(point.cumulativeShare)}</strong><small>${point.cumulativeWins}/${player.trackedWins} wins</small></div>`;
      }).join('')}`;
      tooltip.hidden = false;
      const svgRect = svg.getBoundingClientRect(), panelRect = panel.getBoundingClientRect();
      tooltip.style.left = `${Math.max(8, Math.min(panel.clientWidth - tooltip.offsetWidth - 8, svgRect.left - panelRect.left + x(rank) / W * svgRect.width - tooltip.offsetWidth / 2))}px`;
      tooltip.style.top = `${svgRect.top - panelRect.top + 15}px`;
      guide.setAttribute('x1', x(rank));
      guide.setAttribute('x2', x(rank));
      guide.setAttribute('visibility', 'visible');
    };
    target.onpointerenter = show;
    target.onfocus = show;
    target.onclick = show;
    target.onblur = hideTooltip;
    target.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {event.preventDefault();show();}
      if (event.key === 'Escape') hideTooltip();
    };
  });
  svg?.addEventListener('pointerleave', hideTooltip);
}
