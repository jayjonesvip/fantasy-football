import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "projections.json");
const SEASON = 2026;
const SCORING = "PPR";
const FANTASYPROS_RANKINGS_URL = "https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php";
const PROJECTION_URLS = {
  QB: "https://www.fantasypros.com/nfl/projections/qb.php?week=draft",
  RB: "https://www.fantasypros.com/nfl/projections/rb.php?week=draft",
  WR: "https://www.fantasypros.com/nfl/projections/wr.php?week=draft",
  TE: "https://www.fantasypros.com/nfl/projections/te.php?week=draft",
  K: "https://www.fantasypros.com/nfl/projections/k.php?week=draft",
  DST: "https://www.fantasypros.com/nfl/projections/dst.php?week=draft"
};

const PROJECTION_COLUMNS = {
  QB: ["passAtt", "passCmp", "passYds", "passTd", "int", "rushAtt", "rushYds", "rushTd", "fumblesLost", "fantasyPoints"],
  RB: ["rushAtt", "rushYds", "rushTd", "rec", "recYds", "recTd", "fumblesLost", "fantasyPoints"],
  WR: ["rec", "recYds", "recTd", "rushAtt", "rushYds", "rushTd", "fumblesLost", "fantasyPoints"],
  TE: ["rec", "recYds", "recTd", "fumblesLost", "fantasyPoints"],
  K: ["fg", "fga", "xp", "fantasyPoints"],
  DST: ["sacks", "defInterceptions", "fumbleRecoveries", "forcedFumbles", "defTd", "safeties", "pointsAllowed", "yardsAllowed", "fantasyPoints"]
};

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanText(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 fantasy-football-agent/1.0",
      "accept": "text/html"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

function extractEcrData(html) {
  const marker = "var ecrData = ";
  const start = html.indexOf(marker);
  if (start === -1) throw new Error("FantasyPros ecrData payload was not found.");
  let index = start + marker.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(start + marker.length, index + 1));
    }
  }
  throw new Error("FantasyPros ecrData payload was incomplete.");
}

function parseRankings(html, priorById) {
  const ecrData = extractEcrData(html);
  const rows = ecrData.players || [];
  return rows
    .filter((row) => row.rank_ecr && row.player_name && row.player_position_id)
    .slice(0, 300)
    .map((row) => {
      const position = row.player_position_id;
      const team = row.player_team_id || "";
      const id = slug(`${row.player_name}-${team}-${position}`);
      const overallRank = Number(row.rank_ecr);
      const prior = priorById.get(id);
      return {
        id,
        fantasyProsId: row.player_id,
        name: row.player_name,
        team,
        position,
        overallRank,
        positionRank: Number(String(row.pos_rank || "").replace(position, "")) || undefined,
        previousRank: prior?.overallRank,
        highestRank: toNumber(row.rank_min),
        lowestRank: toNumber(row.rank_max),
        projectedPoints: prior?.projectedPoints || 0,
        projectedStats: {},
        sourceRanks: {
          FantasyPros: overallRank
        }
      };
    });
}

function parseProjectionPage(html, position) {
  const columns = PROJECTION_COLUMNS[position] || [];
  const projectionByName = new Map();
  const rowMatches = html.matchAll(/<tr[^>]*class="[^"]*mpb-player-[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const [, rowHtml] of rowMatches) {
    const cellHtml = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
    if (cellHtml.length < 2) continue;
    const linkMatch = cellHtml[0].match(/fp-player-name="([^"]+)"/i);
    const name = linkMatch ? cleanText(linkMatch[1]) : cleanText(cellHtml[0]).replace(/\s+[A-Z]{2,3}$/, "");
    const stats = {};
    for (let index = 0; index < columns.length; index += 1) {
      const value = toNumber(cleanText(cellHtml[index + 1]));
      if (value !== undefined) stats[columns[index]] = value;
    }
    projectionByName.set(slug(`${name}-${position}`), stats);
  }
  return projectionByName;
}

async function fetchAllProjections() {
  const projectionMaps = new Map();
  const sourceMeta = [];
  for (const [position, url] of Object.entries(PROJECTION_URLS)) {
    try {
      const html = await fetchText(url);
      const parsed = parseProjectionPage(html, position);
      projectionMaps.set(position, parsed);
      sourceMeta.push({ name: `FantasyPros ${position} projections`, url, count: parsed.size, ok: parsed.size > 0 });
    } catch (error) {
      sourceMeta.push({ name: `FantasyPros ${position} projections`, url, count: 0, ok: false, error: error.message });
    }
  }
  return { projectionMaps, sourceMeta };
}

function attachProjections(players, projectionMaps) {
  return players.map((player) => {
    const stats = projectionMaps.get(player.position)?.get(slug(`${player.name}-${player.position}`)) || {};
    return {
      ...player,
      projectedPoints: toNumber(stats.fantasyPoints) || player.projectedPoints || 0,
      projectedStats: stats
    };
  });
}

async function main() {
  const prior = JSON.parse(await readFile(DATA_FILE, "utf8").catch(() => '{"players":[]}'));
  const priorById = new Map((prior.players || []).map((player) => [player.id, player]));
  const rankingsHtml = await fetchText(FANTASYPROS_RANKINGS_URL);
  const rankedPlayers = parseRankings(rankingsHtml, priorById);
  if (rankedPlayers.length < 300) {
    throw new Error(`FantasyPros returned ${rankedPlayers.length} ranked players; expected at least 300.`);
  }

  const { projectionMaps, sourceMeta } = await fetchAllProjections();
  const players = attachProjections(rankedPlayers, projectionMaps);
  const payload = {
    generatedAt: new Date().toISOString(),
    season: SEASON,
    scoring: SCORING,
    status: "updated-from-fantasypros",
    sources: [
      { name: "FantasyPros PPR rankings", url: FANTASYPROS_RANKINGS_URL, count: rankedPlayers.length, ok: true },
      ...sourceMeta
    ],
    players
  };

  await writeFile(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${players.length} FantasyPros players to ${DATA_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
