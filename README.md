# Smash Club

A responsive personal Smash Ultimate dashboard for Gautam, Robert, and Varad. Buildless HTML, CSS, and JavaScript; no runtime dependencies.

Run `npm run dev` and open http://localhost:4173. Run `npm test` for data checks.

## Deploy on Vercel

Import this `smash-club` directory as the project root. The included `vercel.json` selects **Other** as the framework, skips installation and building, and serves **dist**. No environment variables or API keys are needed. The live Google Sheet refresh works directly from the deployed browser app.

If using the Vercel CLI, run `vercel --prod` from this directory. See [Vercel's configuration reference](https://vercel.com/docs/project-configuration/vercel-json).

## Data and refresh

The app reads the **Smash** tab from the supplied Google Sheet on opening, every 60 seconds while visible, and on manual refresh. Google Visualization JSONP supports browser access without a server or credentials. The sheet must remain readable through its shared link. No API key or structural changes are required. Google can briefly cache its export. When the page is closed no refresh is necessary: it fetches again when opened.

The columns must stay in this order: A date; B winner; C/D/E G/R/V kills; F/G/H G/R/V characters. Rows can be appended freely. Blank dates inherit the closest preceding filled date. Yearless dates inherit the last explicit year, initially 2026. Put an explicit year on the first date of a new year.

Every refresh normalizes winner case, trims character names, and merges aliases. Blank kills remain null. Unknown winners are excluded from win-rate denominators. Character-only rows without a result or kill scores are excluded. Missing character selections never count as a fighter. Full definitions and data coverage appear in the app's Data & methodology dialog.

The latest successful response is cached in browser localStorage. `dist/smash.csv` is the initial Nov 12, 2026 fallback, clearly labeled when used. Filters and stats operate on the currently loaded data; nothing writes to the source Sheet.

## Win concentration

The overview compares each player’s spread of wins across fighters. The interactive curve shows cumulative win share as each player’s fighters are added in descending order of wins; a steeper curve indicates more concentrated wins. Hover, tap, or focus a rank to compare players. The expandable table lists the winning fighters, win shares, and character win rates.

Each player has a **top-three win share** and **effective winning roster**: `1 / sum((fighter wins / tracked wins)²)`. One effective fighter means all tracked wins come from one fighter. Eight means the same concentration as eight fighters winning equally often. Higher values indicate broader win distribution. Wins with missing characters are excluded from the calculation and their coverage is shown; a player without tracked wins has no concentration score. All calculations follow the date filter and live refresh.

Win distribution reflects character pick frequency as well as performance. Character win rates in the breakdown help distinguish those factors. Player colors are Gautam green, Robert red, and Varad blue.

## Exact matchups

The **Matchups** tab groups games by the ordered tuple `[Gautam's fighter, Robert's fighter, Varad's fighter]`. Switching who plays a character creates a different group, even when all three fighters are the same. Character aliases are normalized before grouping; games missing any of the three picks are excluded, with coverage shown.

Filter each player's fighter independently, set a minimum game count (defaults to two), and optionally require play across multiple sessions. A session is a calendar date. Sort and browse the lineups, then choose **Analyze** to see that exact lineup's wins, win percentages, total kills, and kills per scored game for each player. The chart compares cumulative wins or kills per game across sessions; the expandable session breakdown and paginated match log show the underlying results. Unknown winners and missing kills retain the same denominator rules as the rest of the dashboard.

The global date filter applies before grouping, and the live refresh updates the lineup reports while preserving their selection and controls where possible.

Official fighter artwork is bundled from smashbros.com; rights remain with Nintendo and their respective owners. `scripts/download-art.mjs` updates roster thumbnails. Typography uses Google Fonts with local system fallbacks.

The optional `.openai/hosting.json` manifest was prepared for Sites; Vercel uses `vercel.json`. Sites publication was not completed.
# smash_stats
