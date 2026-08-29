# MVP Survivor Challenge

An Astro app for the PrizePicks MVP Survivor Challenge — pick one QB a week to clear 1.5 combined touchdowns (passing + rushing + receiving), never repeat a QB, or you're out. Shows a live pick % breakdown for the current week, plus a scrollable history page with the full survivor ladder. No backend required.

## How it works

- `src/pages/index.astro` — home page: rules + this week's pick breakdown
- `src/pages/history.astro` — past weeks, scrollable, plus the season-long survivor ladder
- `shared.js` — data loading + aggregation logic used by both pages
- `index.js` / `history.js` — page-specific rendering
- `styles.css` — brand-driven styling
- `config.js` — the one file you edit weekly (or once, if you go live)
- `public/data/sample-weeks.json` — placeholder data so the pages look right before you connect a real sheet
- `astro.config.mjs` / `webflow.json` — minimal Webflow Cloud-compatible Astro configuration

The site pulls pick data straight from a Google Sheet you publish to the web as CSV. No server, no database — Astro builds the app, and the browser fetches your sheet directly.

**One thing worth knowing:** publishing a tab this way makes that CSV link viewable by anyone who has it, no login required. That's why the setup below splits your data into an internal-only tab (with names) and a separate, name-free tab that's the only thing actually published — see "Keeping member names actually internal" below.

## 1. Set up the Google Sheet

You'll use three tabs: **Picks** (raw Typeform responses, internal only), **Results** (your weekly grading, small and fast to fill in, internal only), and **Published** (a name-free mirror of Picks — this is the only tab that ever goes public).

### Picks tab

| Week | Name | QB Pick | Result | Duplicate? |
|------|------|---------|--------|------------|
| 1 | Jordan T. | Josh Allen | *(formula)* | *(formula)* |
| 1 | Casey R. | Lamar Jackson | *(formula)* | *(formula)* |

- **Week** — the numeric week (1, 2, 3…)
- **Name** — MVP's name, pulled from your Typeform responses. Used only to enforce the no-repeat rule (see below) — the site itself never displays names.
- **QB Pick** — the quarterback they picked. No Team column — the challenge is QB-only, so it's not needed anywhere in the sheet or site.
- **Result** — a formula that pulls from the Results tab (see below), so you never type this by hand per-person
- **Duplicate?** — a formula flagging repeat picks (see below)

Each week, copy that week's Typeform responses in as new rows (don't overwrite past weeks — the site uses history to build the survivor ladder).

### Results tab (this is the only place you manually grade anything)

| Week | QB | Result | Key |
|------|-----|--------|-----|
| 1 | Josh Allen | Survived | `=A2&"\|"&B2` |
| 1 | Lamar Jackson | Survived | `=A3&"\|"&B3` |
| 1 | C.J. Stroud | Eliminated | `=A4&"\|"&B4` |

After each week's games, you fill in **one row per distinct QB that was picked** (not per person) with `Survived` or `Eliminated`. Column D is a helper key — fill it down as a formula once and it auto-fills for new rows.

### Auto-fill Result on the Picks tab

In the Picks tab's **Result** column (column D, with Week in A and QB Pick in C):

```
=IFERROR(INDEX(Results!$C:$C, MATCH(A2&"|"&C2, Results!$D:$D, 0)), "Pending")
```

This looks up that row's Week + QB combo against your Results tab and pulls the grade automatically. Anything not yet graded shows as "Pending" until you fill in the Results tab.

### Enforcing "no repeat QB"

Add one more helper column on the Picks tab (column E, "Duplicate?") to flag it for you when entering data:

```
=IF(COUNTIFS($B$2:B2,B2,$C$2:C2,C2)>1,"⚠ Repeat pick","")
```

This flags any row where that Name + QB Pick combo has already appeared earlier in the sheet — so if someone rides with a QB they already used, you'll see the warning while copying in that week's responses and can follow up with them before locking things in. This stays on your admin sheet only; the public site still never shows names, so this check happens on your side, not the members'.

### Keeping member names actually internal

You'll want **Picks** and **Results** shared only with your internal team (Google's normal "Share" — restricted to specific people, not published). That's the tab with names on it, and it should never be published.

Add a third tab, **Published**, that mirrors Picks but drops the Name and Duplicate? columns entirely — this is the *only* tab you publish to web, and it's the only one the site ever reads. Give it a header row (`Week | QB Pick | Result`), then in the first data cell:

```
=QUERY(Picks!A2:E, "select A, C, D", 0)
```

This pulls Week, QB Pick, and Result from Picks — with Name left out entirely — and stays live as you add rows to Picks. Since it never contains a name or any other personal info, the fact that its link is technically public (anyone with the link, no login) doesn't expose anything about your members — it's just pick counts and results, which the site was always going to show anyway.

**Bottom line:** restrict sharing on Picks/Results to your internal team like you'd want to anyway; publish only the derived, name-free Published tab.

### Publish the sheet as CSV

1. In Google Sheets: **File > Share > Publish to web**
2. Under "Link", choose the **Published** tab specifically (not "Entire Document", and not Picks or Results — those stay internal)
3. Under format, choose **Comma-separated values (.csv)**
4. Click **Publish**, confirm, and copy the URL it gives you (looks like `https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`)

Paste that URL into `config.js`:

```js
window.SURVIVOR_CONFIG = {
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/.../pub?output=csv",
  ...
};
```

## 2. Run locally

From this folder:

```bash
npm install
npm run dev
```

To verify the production build:

```bash
npm run build
npm run preview
```

## 3. Deploy to Webflow Cloud

This repo is configured as an Astro app for Webflow Cloud. The Webflow Cloud docs currently support Astro and Next.js apps, require the app to live in a GitHub repository, and use `package.json` to detect the framework. This repo also includes `webflow.json` to explicitly pin the framework to Astro.

In Webflow:

1. Go to your Workspace dashboard.
2. Click **New Project > App**.
3. Import this GitHub repository.
4. Select the branch you want to deploy.
5. Leave advanced framework path settings at the repo root unless you move the app later.
6. Deploy.

Per Webflow Cloud's guidance, `astro.config.mjs` does not set `base` or asset-prefix values. Webflow Cloud applies those from the environment's mount path during deployment.

## Weekly workflow once it's live

1. Send the Typeform link to MVPs before kickoff
2. Once responses are in, copy them into the **Picks** tab as new rows for that week's number, watching for any "⚠ Repeat pick" flags
3. After games finish, fill in that week's grades on the **Results** tab — one row per distinct QB, not per person
4. That's it — **Published** updates itself from the QUERY formula, and the site reads it live with no redeploy. Current week shows on the home page; everything before it moves to the History page automatically.

## Customizing

- **TD threshold, season label, lock countdown, total MVP roster size** — edit the top of `config.js`
- **Colors, type, layout** — `styles.css` uses PrizePicks brand tokens as CSS variables at the top of the file
- **Copy/rules text** — edit directly in `src/pages/index.astro` / `src/pages/history.astro`

## Notes

- If `SHEET_CSV_URL` is blank, both pages show the sample data in `public/data/sample-weeks.json` so you can preview the design before connecting real data. If your live site is showing QBs/results you don't recognize, this is almost always why — double check `SHEET_CSV_URL` in `config.js` actually has your Published tab's CSV link pasted in (and that it ends in `output=csv`, not `single=true` — that means you published the tab as a webpage instead of CSV).
- Set `TOTAL_MVPS` in `config.js` once at kickoff (e.g. the number of people who filled out your intake form). The "Still Alive" stat is then this number minus everyone eliminated so far, counted cumulatively across every week — no need to track who's who, since eliminated MVPs simply stop showing up in future weeks' rows. If `TOTAL_MVPS` is left blank, the site falls back to counting just the current week's entries instead.
- By default, the home page shows whichever week has the highest number in your Picks tab — so it naturally stays on Week 1 until you add Week 2 rows yourself. If you want a hard guarantee that nothing changes until you say so, set `CURRENT_WEEK` in `config.js` to a specific number (e.g. `1`) — the home page will lock to that week regardless of what's in the sheet, and you flip it forward manually whenever you're ready. Leave it `null` (the default) to keep auto-detecting the latest week.
- The site never renders individual names or picks — only aggregate percentages and counts, by design. The no-repeat rule is enforced on your admin sheet (via the Duplicate? flag), not by anything public-facing.
- Want automated grading later instead of the Results tab? That's possible with a scheduled GitHub Action pulling from a stats API (e.g. Sportradar) and writing back to the sheet — more setup and an ongoing API cost/dependency, but zero weekly manual work. Worth it once manual grading becomes a real bottleneck; probably not before then.
