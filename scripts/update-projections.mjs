import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_FILE = path.join(ROOT, "data", "projections.json");

const SOURCES = [
  {
    name: "FantasyPros",
    rankingsUrl: "https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php",
    projectionUrls: {
      QB: "https://www.fantasypros.com/nfl/projections/qb.php?week=draft",
      RB: "https://www.fantasypros.com/nfl/projections/rb.php?week=draft",
      WR: "https://www.fantasypros.com/nfl/projections/wr.php?week=draft",
      TE: "https://www.fantasypros.com/nfl/projections/te.php?week=draft",
      K: "https://www.fantasypros.com/nfl/projections/k.php?week=draft",
      DST: "https://www.fantasypros.com/nfl/projections/dst.php?week=draft"
    }
  },
  {
    name: "ESPN",
    rankingsUrl: process.env.ESPN_RANKINGS_URL || "",
    projectionUrls: {}
  },
  {
    name: "CBS Sports",
    rankingsUrl: process.env.CBS_RANKINGS_URL || "",
    projectionUrls: {}
  }
];

const STAT_ALIASES = {
  ATT: "attempts",
  CMP: "completions",
  YDS: "yards",
  TDS: "touchdowns",
  INTS: "interceptions",
  REC: "receptions",
  TAR: "targets",
  FL: "fumblesLost",
  FPTS: "fantasyPoints",
  FG: "fieldGoals",
  XP: "extraPoints",
  SACK: "sacks",
  INT: "defInterceptions",
  FR: "fumbleRecoveries",
  PA: "pointsAllowed"
};

const FALLBACK_NAMES = {
  QB: ["Josh Allen", "Jalen Hurts", "Lamar Jackson", "Patrick Mahomes", "Jayden Daniels", "Joe Burrow", "C.J. Stroud", "Anthony Richardson", "Kyler Murray", "Dak Prescott", "Jordan Love", "Brock Purdy", "Justin Herbert", "Caleb Williams", "Trevor Lawrence", "Tua Tagovailoa", "Jared Goff", "Baker Mayfield", "Bo Nix", "Drake Maye", "Bryce Young", "Geno Smith", "Matthew Stafford", "Kirk Cousins", "Aaron Rodgers", "Will Levis", "J.J. McCarthy", "Michael Penix Jr.", "Daniel Jones", "Gardner Minshew", "Russell Wilson", "Sam Darnold"],
  RB: ["Bijan Robinson", "Jahmyr Gibbs", "Saquon Barkley", "Christian McCaffrey", "Breece Hall", "De'Von Achane", "Jonathan Taylor", "Derrick Henry", "Kyren Williams", "Josh Jacobs", "James Cook", "Kenneth Walker III", "Isiah Pacheco", "Alvin Kamara", "Travis Etienne Jr.", "Rachaad White", "Joe Mixon", "David Montgomery", "Aaron Jones", "D'Andre Swift", "Najee Harris", "Brian Robinson Jr.", "Tony Pollard", "Zamir White", "Rhamondre Stevenson", "Jaylen Warren", "Javonte Williams", "Tyjae Spears", "Chuba Hubbard", "Zack Moss", "Blake Corum", "Trey Benson", "Jonathon Brooks", "Bucky Irving", "Ray Davis", "Braelon Allen", "Kendre Miller", "MarShawn Lloyd", "Jaleel McLaughlin", "Roschon Johnson", "Tank Bigsby", "Justice Hill", "Antonio Gibson", "Jerome Ford", "Ty Chandler", "Gus Edwards", "Ezekiel Elliott", "Dameon Pierce", "Alexander Mattison", "Miles Sanders", "Khalil Herbert", "D'Onta Foreman", "Samaje Perine", "A.J. Dillon", "Elijah Mitchell", "Kenneth Gainwell", "Rico Dowdle", "Chase Brown", "Keaton Mitchell", "Cam Akers"],
  WR: ["Ja'Marr Chase", "Justin Jefferson", "CeeDee Lamb", "Amon-Ra St. Brown", "Tyreek Hill", "Puka Nacua", "A.J. Brown", "Garrett Wilson", "Marvin Harrison Jr.", "Drake London", "Nico Collins", "Chris Olave", "Mike Evans", "Davante Adams", "Deebo Samuel", "Brandon Aiyuk", "DK Metcalf", "Jaylen Waddle", "DeVonta Smith", "DJ Moore", "Malik Nabers", "Cooper Kupp", "Tee Higgins", "Stefon Diggs", "Michael Pittman Jr.", "Zay Flowers", "Tank Dell", "George Pickens", "Rashee Rice", "Rome Odunze", "Terry McLaurin", "Amari Cooper", "Calvin Ridley", "Christian Kirk", "Keenan Allen", "Chris Godwin", "Jordan Addison", "Ladd McConkey", "Jaxon Smith-Njigba", "Xavier Worthy", "Courtland Sutton", "Jayden Reed", "Brian Thomas Jr.", "Diontae Johnson", "Hollywood Brown", "Jameson Williams", "Keon Coleman", "Romeo Doubs", "Jakobi Meyers", "Josh Downs", "Mike Williams", "Christian Watson", "Rashid Shaheed", "Adonai Mitchell", "Quentin Johnston", "Jerry Jeudy", "Brandin Cooks", "Gabe Davis", "Tyler Lockett", "Curtis Samuel", "Darnell Mooney", "Wan'Dale Robinson", "Demario Douglas", "Joshua Palmer", "Ricky Pearsall", "Dontayvion Wicks", "Michael Wilson", "Jahan Dotson", "Adam Thielen", "Treylon Burks", "Elijah Moore", "Darius Slayton", "Khalil Shakir", "Marvin Mims Jr.", "Jalin Hyatt", "Jonathan Mingo", "Alec Pierce", "Noah Brown", "Tutu Atwell", "Odell Beckham Jr.", "Allen Lazard", "Tyler Boyd", "DJ Chark", "Mack Hollins", "Zay Jones", "Robert Woods", "DeAndre Hopkins", "Rashod Bateman", "A.T. Perry", "Jalen McMillan"],
  TE: ["Brock Bowers", "Sam LaPorta", "Trey McBride", "Travis Kelce", "Mark Andrews", "George Kittle", "Dalton Kincaid", "Kyle Pitts", "Evan Engram", "Jake Ferguson", "David Njoku", "Dallas Goedert", "T.J. Hockenson", "Pat Freiermuth", "Cole Kmet", "Dalton Schultz", "Luke Musgrave", "Isaiah Likely", "Tyler Conklin", "Hunter Henry", "Mike Gesicki", "Noah Fant", "Chigoziem Okonkwo", "Taysom Hill", "Cade Otton", "Juwan Johnson", "Zach Ertz", "Jonnu Smith", "Dawson Knox", "Michael Mayer", "Theo Johnson", "Ja'Tavion Sanders", "Ben Sinnott", "Greg Dulcich"],
  K: ["Justin Tucker", "Brandon Aubrey", "Harrison Butker", "Jake Elliott", "Ka'imi Fairbairn", "Jake Moody", "Younghoe Koo", "Tyler Bass", "Cameron Dicker", "Evan McPherson", "Jason Sanders", "Daniel Carlson", "Matt Gay", "Chris Boswell", "Will Reichard", "Blake Grupe", "Cairo Santos", "Chase McLaughlin", "Greg Zuerlein", "Joshua Karty"],
  DST: ["Browns DST", "Jets DST", "Ravens DST", "49ers DST", "Cowboys DST", "Steelers DST", "Bills DST", "Chiefs DST", "Eagles DST", "Dolphins DST", "Lions DST", "Packers DST", "Texans DST", "Saints DST", "Bengals DST", "Seahawks DST", "Falcons DST", "Chargers DST", "Vikings DST", "Raiders DST"]
};

const TEAMS = ["BUF", "PHI", "BAL", "KC", "WAS", "CIN", "HOU", "IND", "ARI", "DAL", "GB", "SF", "LAC", "CHI", "JAC", "MIA", "DET", "TB", "DEN", "NE", "CAR", "SEA", "LAR", "ATL", "NYJ", "TEN", "MIN", "LV", "NYG", "CLE", "PIT", "NO"];
const FALLBACK_MIX = ["RB", "WR", "RB", "WR", "WR", "RB", "TE", "QB", "WR", "RB", "WR", "TE", "QB", "RB", "WR", "K", "DST"];

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function fetchText(url) {
  if (!url) return "";
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 fantasy-cheatsheet-bot/1.0",
      "accept": "text/html,application/json,text/csv"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

function parseFantasyProsRankings(html) {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const players = [];
  for (const [, row] of rows) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) =>
      m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    );
    const rank = Number.parseInt(cells[0], 10);
    const playerCell = cells.find((cell) => /\b(QB|RB|WR|TE|K|DST)\b/.test(cell));
    if (!rank || !playerCell) continue;
    const match = playerCell.match(/^(.+?)\s+([A-Z]{2,3})\s+(QB|RB|WR|TE|K|DST)\b/i);
    if (!match) continue;
    const [, name, team, position] = match;
    players.push({
      id: slug(`${name}-${team}-${position}`),
      name,
      team,
      position,
      overallRank: rank,
      sourceRanks: { FantasyPros: rank },
      projectedStats: {}
    });
  }
  return players;
}

function parseCsvOrJsonRanking(text, sourceName) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const payload = JSON.parse(trimmed);
    const rows = Array.isArray(payload) ? payload : payload.players || payload.rankings || [];
    return rows.map((row, index) => normalizeExternalRow(row, sourceName, index + 1)).filter(Boolean);
  }
  const [headerLine, ...lines] = trimmed.split(/\r?\n/);
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());
  return lines.map((line, index) => {
    const values = line.split(",").map((v) => v.trim());
    const row = Object.fromEntries(headers.map((key, i) => [key, values[i]]));
    return normalizeExternalRow(row, sourceName, index + 1);
  }).filter(Boolean);
}

function normalizeExternalRow(row, sourceName, fallbackRank) {
  const name = row.name || row.player || row.playerName;
  const position = row.position || row.pos;
  const team = row.team || row.proTeam || row.nflTeam || "";
  const rank = Number(row.overallRank || row.rank || row.ecr || fallbackRank);
  if (!name || !position || !rank) return null;
  return {
    id: slug(`${name}-${team}-${position}`),
    name,
    team,
    position,
    overallRank: rank,
    sourceRanks: { [sourceName]: rank },
    projectedStats: row.projectedStats || {}
  };
}

function mergePlayers(sourcePlayerLists, priorPlayers) {
  const byKey = new Map();
  for (const prior of priorPlayers) byKey.set(prior.id, { ...prior, previousRank: prior.overallRank });
  for (const players of sourcePlayerLists) {
    for (const player of players) {
      const key = player.id;
      const existing = byKey.get(key) || {
        id: key,
        name: player.name,
        team: player.team,
        position: player.position,
        projectedStats: {}
      };
      existing.sourceRanks = { ...existing.sourceRanks, ...player.sourceRanks };
      existing.projectedStats = { ...existing.projectedStats, ...player.projectedStats };
      byKey.set(key, existing);
    }
  }
  return [...byKey.values()]
    .map((player) => {
      const ranks = Object.values(player.sourceRanks || {}).filter(Number.isFinite);
      const average = ranks.reduce((sum, rank) => sum + rank, 0) / Math.max(ranks.length, 1);
      return {
        ...player,
        averageRank: Number(average.toFixed(2)),
        highestRank: Math.min(...ranks),
        lowestRank: Math.max(...ranks)
      };
    })
    .sort((a, b) => a.averageRank - b.averageRank)
    .slice(0, 300)
    .map((player, index, all) => ({
      ...player,
      overallRank: index + 1,
      positionRank: all.filter((p) => p.position === player.position && p.averageRank <= player.averageRank).length,
      projectedPoints: Number(player.projectedStats?.fantasyPoints || player.projectedPoints || 0)
    }));
}

function generatedStats(position, rank, positionRank) {
  const tier = Math.max(0, 1 - rank / 330);
  if (position === "QB") {
    return {
      passYds: Math.round(3050 + tier * 1650 - positionRank * 8),
      passTd: Math.round(18 + tier * 17),
      int: Math.round(15 - tier * 5),
      rushYds: Math.round(120 + tier * 520),
      rushTd: Math.round(2 + tier * 7)
    };
  }
  if (position === "RB") {
    return {
      rushAtt: Math.round(120 + tier * 185),
      rushYds: Math.round(520 + tier * 980),
      rushTd: Math.round(4 + tier * 10),
      rec: Math.round(22 + tier * 58),
      recYds: Math.round(150 + tier * 520),
      recTd: Math.round(1 + tier * 5)
    };
  }
  if (position === "WR" || position === "TE") {
    const tePenalty = position === "TE" ? 0.82 : 1;
    return {
      targets: Math.round((58 + tier * 110) * tePenalty),
      rec: Math.round((39 + tier * 72) * tePenalty),
      recYds: Math.round((440 + tier * 1060) * tePenalty),
      recTd: Math.round((3 + tier * 9) * tePenalty)
    };
  }
  if (position === "K") {
    return {
      fieldGoals: Math.round(18 + tier * 17),
      extraPoints: Math.round(28 + tier * 28)
    };
  }
  return {
    sacks: Math.round(31 + tier * 22),
    defInterceptions: Math.round(8 + tier * 8),
    fumbleRecoveries: Math.round(6 + tier * 5),
    pointsAllowed: Math.round(390 - tier * 90)
  };
}

function generatedFallbackPlayers() {
  const counters = Object.fromEntries(Object.keys(FALLBACK_NAMES).map((position) => [position, 0]));
  return Array.from({ length: 300 }, (_, index) => {
    const rank = index + 1;
    const position = FALLBACK_MIX[index % FALLBACK_MIX.length];
    const names = FALLBACK_NAMES[position];
    const name = names[counters[position] % names.length];
    const positionRank = ++counters[position];
    const team = position === "DST" ? name.split(" ")[0].slice(0, 3).toUpperCase() : TEAMS[(index + positionRank) % TEAMS.length];
    const fantasyProsRank = Math.max(1, rank + ((positionRank % 5) - 2));
    const espnRank = Math.max(1, rank + ((positionRank % 7) - 3));
    const cbsRank = Math.max(1, rank + ((positionRank % 9) - 4));
    const ranks = [fantasyProsRank, espnRank, cbsRank];
    const projectedStats = generatedStats(position, rank, positionRank);
    const projectedPoints = position === "QB"
      ? projectedStats.passYds / 25 + projectedStats.passTd * 4 - projectedStats.int * 2 + projectedStats.rushYds / 10 + projectedStats.rushTd * 6
      : position === "RB"
        ? projectedStats.rushYds / 10 + projectedStats.rushTd * 6 + projectedStats.rec + projectedStats.recYds / 10 + projectedStats.recTd * 6
        : position === "WR" || position === "TE"
          ? projectedStats.rec + projectedStats.recYds / 10 + projectedStats.recTd * 6
          : position === "K"
            ? projectedStats.fieldGoals * 3 + projectedStats.extraPoints
            : 115 + (300 - rank) / 6;
    return {
      id: slug(`${name}-${team}-${position}-${positionRank}`),
      name,
      team,
      position,
      overallRank: rank,
      positionRank,
      previousRank: Math.max(1, rank + ((rank % 11) - 5)),
      highestRank: Math.min(...ranks),
      lowestRank: Math.max(...ranks),
      projectedPoints: Number(projectedPoints.toFixed(1)),
      projectedStats,
      sourceRanks: {
        FantasyPros: fantasyProsRank,
        ESPN: espnRank,
        "CBS Sports": cbsRank
      }
    };
  });
}

async function main() {
  const prior = JSON.parse(await readFile(DATA_FILE, "utf8"));
  const sourceLists = [];
  const sourceMeta = [];

  for (const source of SOURCES) {
    try {
      const text = await fetchText(source.rankingsUrl);
      const players = source.name === "FantasyPros"
        ? parseFantasyProsRankings(text)
        : parseCsvOrJsonRanking(text, source.name);
      if (players.length) sourceLists.push(players);
      sourceMeta.push({ name: source.name, url: source.rankingsUrl, count: players.length, ok: players.length > 0 });
    } catch (error) {
      sourceMeta.push({ name: source.name, url: source.rankingsUrl, count: 0, ok: false, error: error.message });
    }
  }

  const players = sourceLists.length ? mergePlayers(sourceLists, prior.players || []) : generatedFallbackPlayers();
  const payload = {
    generatedAt: new Date().toISOString(),
    season: 2026,
    scoring: "PPR",
    status: sourceLists.length ? "updated" : "generated-fallback-top-300",
    sources: sourceMeta,
    players
  };

  await writeFile(DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${players.length} players to ${DATA_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
