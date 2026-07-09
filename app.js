const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DST"];
const POSITION_STATS = {
  QB: ["passYds", "passTd", "int", "rushYds", "rushTd"],
  RB: ["rushYds", "rushTd", "rec", "recYds", "recTd"],
  WR: ["targets", "rec", "recYds", "recTd"],
  TE: ["targets", "rec", "recYds", "recTd"],
  K: ["fieldGoals", "extraPoints"],
  DST: ["sacks", "defInterceptions", "fumbleRecoveries", "pointsAllowed"]
};
const STAT_LABELS = {
  passYds: "Pass Yds",
  passTd: "Pass TD",
  int: "INT",
  rushYds: "Rush Yds",
  rushTd: "Rush TD",
  rec: "Rec",
  recYds: "Rec Yds",
  recTd: "Rec TD",
  targets: "Tgt",
  fieldGoals: "FG",
  extraPoints: "XP",
  sacks: "Sack",
  defInterceptions: "Def INT",
  fumbleRecoveries: "FR",
  pointsAllowed: "PA"
};

const state = {
  data: null,
  position: "ALL",
  query: "",
  sort: "overallRank"
};

const els = {
  playerCount: document.querySelector("#playerCount"),
  updatedAt: document.querySelector("#updatedAt"),
  sourceCount: document.querySelector("#sourceCount"),
  positionTabs: document.querySelector("#positionTabs"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
  dataNotice: document.querySelector("#dataNotice"),
  viewTitle: document.querySelector("#viewTitle"),
  viewMeta: document.querySelector("#viewMeta"),
  themeToggle: document.querySelector("#themeToggle"),
  printOverall: document.querySelector("#printOverall"),
  printPosition: document.querySelector("#printPosition"),
  emptyState: document.querySelector("#emptyState")
};

async function loadData() {
  const response = await fetch("data/projections.json", { cache: "no-store" });
  state.data = await response.json();
  renderChrome();
  render();
}

function renderChrome() {
  els.playerCount.textContent = state.data.players.length;
  els.sourceCount.textContent = state.data.sources.filter((source) => source.ok !== false).length || state.data.sources.length;
  els.updatedAt.textContent = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
    .format(new Date(state.data.generatedAt));
  els.positionTabs.innerHTML = POSITIONS.map((position) =>
    `<button class="tab ${position === state.position ? "active" : ""}" data-position="${position}" role="tab">${position}</button>`
  ).join("");
  const isFallback = String(state.data.status || "").includes("fallback");
  els.dataNotice.hidden = !isFallback;
  els.dataNotice.textContent = isFallback
    ? "Development dataset shown: 300 generated players are loaded while live source exports are unavailable. Connect authorized ESPN/CBS/FantasyPros feeds in the updater for verified daily rankings."
    : "";
}

function getVisiblePlayers() {
  const query = state.query.trim().toLowerCase();
  return [...state.data.players]
    .filter((player) => state.position === "ALL" || player.position === state.position)
    .filter((player) => {
      if (!query) return true;
      return [player.name, player.team, player.position].some((value) => String(value).toLowerCase().includes(query));
    })
    .sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name);
      return Number(b[state.sort] || 0) === Number(a[state.sort] || 0)
        ? a.overallRank - b.overallRank
        : Number(a[state.sort] || 0) - Number(b[state.sort] || 0);
    });
}

function statsForView(players) {
  if (state.position !== "ALL") return POSITION_STATS[state.position] || [];
  const used = new Set();
  for (const player of players) {
    for (const stat of POSITION_STATS[player.position] || Object.keys(player.projectedStats || {})) {
      if (used.size < 8) used.add(stat);
    }
  }
  return [...used];
}

function rankDelta(player) {
  if (!player.previousRank) return "";
  const delta = player.previousRank - player.overallRank;
  if (delta === 0) return "0";
  return `<span class="${delta > 0 ? "up" : "down"}">${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)}</span>`;
}

function formatStat(value) {
  if (value === undefined || value === null || value === "") return "-";
  if (Number.isFinite(Number(value))) return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
  return value;
}

function render() {
  const players = getVisiblePlayers();
  const stats = statsForView(players);
  els.viewTitle.textContent = state.position === "ALL" ? "Overall Top 300" : `${state.position} Cheat Sheet`;
  els.viewMeta.textContent = `${players.length} players shown · ${state.data.status}`;
  els.tableHead.innerHTML = `
    <tr>
      <th class="rank">Ovr</th>
      <th>Player</th>
      <th>Team</th>
      <th>Pos</th>
      <th>Pos Rk</th>
      <th>Prev</th>
      <th>Move</th>
      <th>High</th>
      <th>Low</th>
      <th>Pts</th>
      ${stats.map((stat) => `<th>${STAT_LABELS[stat] || stat}</th>`).join("")}
    </tr>
  `;
  els.tableBody.innerHTML = players.length ? players.map((player) => `
    <tr>
      <td class="rank">${player.overallRank}</td>
      <td class="player">${player.name}</td>
      <td>${player.team || "-"}</td>
      <td><span class="chip chip-${player.position}">${player.position === "DST" ? "DEF" : player.position}</span></td>
      <td>${player.position === "DST" ? "DEF" : player.position}${player.positionRank || "-"}</td>
      <td>${player.previousRank || "-"}</td>
      <td>${rankDelta(player)}</td>
      <td>${player.highestRank || "-"}</td>
      <td>${player.lowestRank || "-"}</td>
      <td>${formatStat(player.projectedPoints)}</td>
      ${stats.map((stat) => `<td>${formatStat(player.projectedStats?.[stat])}</td>`).join("")}
    </tr>
  `).join("") : els.emptyState.innerHTML;
}

els.positionTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-position]");
  if (!button) return;
  state.position = button.dataset.position;
  renderChrome();
  render();
});

els.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

els.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

els.themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("fantasy-theme", next);
});

els.printOverall.addEventListener("click", () => {
  state.position = "ALL";
  renderChrome();
  render();
  window.print();
});

els.printPosition.addEventListener("click", () => {
  if (state.position === "ALL") state.position = "QB";
  renderChrome();
  render();
  window.print();
});

document.documentElement.dataset.theme = localStorage.getItem("fantasy-theme") || "light";
loadData().catch((error) => {
  els.tableBody.innerHTML = `<tr><td colspan="12" class="empty">${error.message}</td></tr>`;
});
