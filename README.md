# FantasyToolbelt

Single-page fantasy football research app backed by FantasyPros ranking JSON files for Standard, Half PPR, and PPR scoring.

## Data Contract

Each player supports common rank fields plus flexible projected stat categories:

```json
{
  "name": "Josh Allen",
  "team": "BUF",
  "position": "QB",
  "overallRank": 21,
  "positionRank": 1,
  "previousRank": 18,
  "highestRank": 16,
  "lowestRank": 28,
  "projectedPoints": 391.7,
  "projectedStats": {
    "passYds": 4118,
    "passTd": 31,
    "rushYds": 566
  },
  "sourceRanks": {
    "FantasyPros": 19
  }
}
```

## Daily Update

`scripts/update-projections.mjs` is designed for GitHub Actions and pulls directly from FantasyPros every day:

- Standard ranks: `https://www.fantasypros.com/nfl/rankings/consensus-cheatsheets.php`
- Half PPR ranks: `https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php`
- PPR ranks: `https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php`
- Position projections: FantasyPros draft projection pages for QB, RB, WR, TE, K, and DST

The app loads `data/projections-ppr.json`, `data/projections-half-ppr.json`, or `data/projections-standard.json` from the scoring dropdown near the grid. `data/projections.json` remains a PPR compatibility alias.

Run locally:

```bash
npm run update:data
```

Serve locally:

```bash
npm run serve
```

Open `http://localhost:4173`.

Production domain: `https://fantasytoolbelt.com/`
