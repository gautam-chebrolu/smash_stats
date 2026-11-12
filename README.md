# Smash Club

A responsive personal Smash Ultimate dashboard for Gautam, Robert, and Varad. Buildless HTML, CSS, and JavaScript; no runtime dependencies.

Run `npm run dev` and open http://localhost:4173. Run `npm test` for data checks.

The app reads the **Smash** tab from the supplied Google Sheet on opening, every 60 seconds while visible, and on manual refresh. Google Visualization JSONP supports browser access without a server or credentials. The sheet must remain readable through its shared link. No API key or structural changes are required. Google can briefly cache its export. When the page is closed no refresh is necessary: it fetches again when opened.

The columns must stay in this order: A date; B winner; C/D/E G/R/V kills; F/G/H G/R/V characters. Rows can be appended freely. Blank dates inherit the closest preceding filled date. Yearless dates inherit the last explicit year, initially 2026. Put an explicit year on the first date of a new year.

Every refresh normalizes winner case, trims character names, and merges aliases. Blank kills remain null. Unknown winners are excluded from win-rate denominators. Character-only rows without a result or kill scores are excluded. Missing character selections never count as a fighter. Full definitions and data coverage appear in the app's Data & methodology dialog.

The latest successful response is cached in browser localStorage. `dist/smash.csv` is the initial Nov 12, 2026 fallback, clearly labeled when used. Filters and stats operate on the currently loaded data; nothing writes to the source Sheet.

Official fighter artwork is bundled from smashbros.com; rights remain with Nintendo and their respective owners. `scripts/download-art.mjs` updates roster thumbnails. Typography uses Google Fonts with local system fallbacks.

The `.openai/hosting.json` manifest is configured for static Sites deployment from `dist/`.
