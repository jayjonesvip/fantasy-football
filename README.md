# Fantasy Draft Board

Single-page fantasy football research app backed by `data/projections.json`.

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
    "FantasyPros": 19,
    "ESPN": 24,
    "CBS Sports": 21
  }
}
```

## Daily Update

`scripts/update-projections.mjs` is designed for GitHub Actions and pulls directly from FantasyPros every day:

- Overall PPR ranks: `https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php`
- Position projections: FantasyPros draft projection pages for QB, RB, WR, TE, K, and DST

No ESPN or CBS repository variables are needed for the default workflow.

Run locally:

```bash
npm run update:data
```

Serve locally:

```bash
npm run serve
```

Open `http://localhost:4173`.
