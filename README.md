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

`scripts/update-projections.mjs` is designed for GitHub Actions. FantasyPros is wired directly. ESPN and CBS are configurable because their public pages move often and are frequently rendered or protected; set repository variables `ESPN_RANKINGS_URL` and `CBS_RANKINGS_URL` to a JSON or CSV export/feed when available.

Run locally:

```bash
npm run update:data
```

Serve locally:

```bash
npm run serve
```

Open `http://localhost:4173`.
