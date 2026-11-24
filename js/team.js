import { playCry, stopAllAudio } from "./audio.js?v=7";
import {
  attachAnimatedSprite,
  caughtIds,
  knownPokemon,
  onCaughtChange,
  onCatalogChange,
  onTypesChange,
  openPokemon,
  setStableSprite,
  stageAnimClass,
  titleName,
} from "./pokedex.js?v=17";
import { paintTypeBadges } from "./types.js?v=5";

const PARTNER_KEY = "pokemundo_partner";
const CARE_KEY = "pokemundo_care";
const LEVEL_GOAL = 100;
const ENERGY_MAX = 100;
const FOODS = {
  berry: {
    energy: 18,
    progress: 24,
    line: (name) => `¡Qué fresca! A ${name} le encantó la baya.`,
  },
  fruit: {
    energy: 14,
    progress: 26,
    line: (name) => `¡Vitaminas! A ${name} le encantó la fruta.`,
  },
  veggie: {
    energy: 20,
    progress: 20,
    line: (name) => `¡Fuerza! A ${name} le encantó la verdura.`,
  },
  cookie: {
    energy: 16,
    progress: 30,
    line: (name) => `¡Premio dulce! A ${name} le encantó la galleta.`,
  },
  snack: {
    energy: 12,
    progress: 28,
    line: (name) => `¡Antojo! A ${name} le encantó el snack.`,
  },
  juice: {
    energy: 28,
    progress: 22,
    line: (name) => `¡Más energía! A ${name} le encantó el jugo.`,
  },
  water: {
    energy: 22,
    progress: 16,
    line: (name) => `¡Hidratado! A ${name} le encantó el agua.`,
  },
  shake: {
    energy: 24,
    progress: 24,
    line: (name) => `¡Recarga! A ${name} le encantó el batido.`,
  },
};
const FOOD_GLYPH = {
  berry: "🍓",
  fruit: "🍎",
  veggie: "🥕",
  cookie: "🍪",
  snack: "🍿",
  juice: "🧃",
  water: "💧",
  shake: "🥤",
};
const ALDO_SOURCES = [
  "Aldo2.webp",
  "images/Aldo2.webp",
  "public/Aldo2.webp",
  "Aldo2.png",
  "images/Aldo2.png",
];
const ANIM_CLASSES = ["anim-fire", "anim-water", "anim-electric", "anim-grass", "anim-default"];

const teamEmpty = document.getElementById("teamEmpty");
const teamBody = document.getElementById("teamBody");
const buddyStage = document.getElementById("buddyStage");
const buddyImg = document.getElementById("buddyImg");
const buddyFx = document.getElementById("buddyFx");
const buddyName = document.getElementById("buddyName");
const buddyTypes = document.getElementById("buddyTypes");
const feedMessage = document.getElementById("feedMessage");
const careLevel = document.getElementById("careLevel");
const energyTrack = document.getElementById("energyTrack");
const energyBar = document.getElementById("energyBar");
const levelTrack = document.getElementById("levelTrack");
const levelBar = document.getElementById("levelBar");
const teamGrid = document.getElementById("teamGrid");
const aldoFigure = document.getElementById("aldoFigure");
const aldoBuddy = document.getElementById("aldoBuddy");
const aldoMiss = document.getElementById("aldoMiss");

let shownPartner = 0;
let gridSig = "";
let feedTimer = 0;
let showView = () => {};

function savedPartner() {
  const id = Number(localStorage.getItem(PARTNER_KEY));
  return Number.isInteger(id) && id > 0 ? id : 0;
}

function storePartner(id) {
  if (id) localStorage.setItem(PARTNER_KEY, String(id));
  else localStorage.removeItem(PARTNER_KEY);
}

function loadCareMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(CARE_KEY) || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return raw;
  } catch {
    return {};
  }
}

function careFor(id) {
  const row = loadCareMap()[String(id)] || {};
  const level = Math.max(1, Math.floor(Number(row.level)) || 1);
  const energy = Math.min(ENERGY_MAX, Math.max(0, Number(row.energy) || 0));
  const progress = Math.min(LEVEL_GOAL - 1, Math.max(0, Number(row.progress) || 0));
  return { level, energy, progress };
}

function saveCare(id, state) {
  const all = loadCareMap();
  all[String(id)] = {
    level: Math.max(1, Math.floor(state.level) || 1),
    energy: Math.min(ENERGY_MAX, Math.max(0, state.energy)),
    progress: Math.min(LEVEL_GOAL - 1, Math.max(0, state.progress)),
  };
  try {
    localStorage.setItem(CARE_KEY, JSON.stringify(all));
  } catch { /* si el guardado falla, la comida igual se celebra */ }
}

function paintMeter(bar, track, value, max) {
  const safe = Math.min(max, Math.max(0, value));
  bar.style.width = `${(safe / max) * 100}%`;
  track.setAttribute("aria-valuemax", String(max));
  track.setAttribute("aria-valuenow", String(Math.round(safe)));
}

function paintCare(id, animate) {
  const state = careFor(id);
  careLevel.textContent = `Nivel ${state.level}`;
  if (!animate) {
    energyBar.style.transition = "none";
    levelBar.style.transition = "none";
  }
  paintMeter(energyBar, energyTrack, state.energy, ENERGY_MAX);
  paintMeter(levelBar, levelTrack, state.progress, LEVEL_GOAL);
  if (!animate) {
    requestAnimationFrame(() => {
      energyBar.style.transition = "";
      levelBar.style.transition = "";
    });
  }
  const chip = teamGrid.querySelector(`.team-card[data-id="${id}"] .team-level`);
  if (chip) chip.textContent = `Nivel ${state.level}`;
  return state;
}

function settlePartner(ids) {
  const saved = savedPartner();
  if (saved && ids.includes(saved)) return saved;
  const next = ids[0] || 0;
  storePartner(next);
  return next;
}

function paintBuddy(poke) {
  const anim = stageAnimClass(poke.types);
  buddyStage.dataset.id = String(poke.id);
  buddyName.textContent = titleName(poke.name);
  buddyImg.alt = titleName(poke.name);
  paintTypeBadges(buddyTypes, poke.types, true);
  ANIM_CLASSES.forEach((name) => buddyStage.classList.remove(name));
  buddyStage.classList.add(anim);
  paintCare(poke.id, shownPartner === poke.id);
  if (shownPartner === poke.id) return;
  shownPartner = poke.id;
  buddyImg.classList.remove("is-cry");
  attachAnimatedSprite(buddyImg, poke);
}

function paintGrid(ids, partner) {
  const sig = ids.map((id) => {
    const poke = knownPokemon(id);
    return `${id}:${poke.name}:${(poke.types || []).join(".")}:${id === partner ? 1 : 0}`;
  }).join("|");
  if (sig === gridSig) return;
  gridSig = sig;
  teamGrid.replaceChildren();
  ids.forEach((id) => {
    const poke = knownPokemon(id);
    const principal = id === partner;
    const card = document.createElement("article");
    card.className = principal ? "team-card is-partner" : "team-card";
    card.dataset.id = String(id);

    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "team-pick";
    pick.setAttribute("aria-pressed", principal ? "true" : "false");

    const image = document.createElement("img");
    image.alt = "";
    image.width = 96;
    image.height = 96;
    image.loading = "lazy";
    image.decoding = "async";
    setStableSprite(image, id);

    const name = document.createElement("span");
    name.className = "team-name";
    name.textContent = titleName(poke.name);

    const mark = document.createElement("span");
    mark.className = "team-mark";
    mark.textContent = principal ? "Principal" : "Elegir";

    const level = document.createElement("span");
    level.className = "team-level";
    level.textContent = `Nivel ${careFor(id).level}`;

    pick.append(image, name, level, mark);

    const open = document.createElement("button");
    open.type = "button";
    open.className = "team-open";
    open.dataset.open = "1";
    open.textContent = "Ver ficha";

    card.append(pick, open);
    teamGrid.append(card);
  });
}

let greetTimer = 0;

// Unos segundos al entrar en Mis Pokémon. Después Aldo se queda quieto.
export function greetAldo() {
  if (teamBody.hidden) return;
  aldoFigure.classList.remove("is-entering");
  void aldoFigure.offsetWidth;
  aldoFigure.classList.add("is-entering");
  window.clearTimeout(greetTimer);
  greetTimer = window.setTimeout(() => aldoFigure.classList.remove("is-entering"), 3300);
}

export function refreshTeam() {
  const ids = caughtIds();
  const partner = settlePartner(ids);
  const empty = ids.length === 0;
  teamEmpty.hidden = !empty;
  teamBody.hidden = empty;
  if (empty) {
    shownPartner = 0;
    gridSig = "";
    teamGrid.replaceChildren();
    window.clearTimeout(feedTimer);
    feedMessage.hidden = true;
    feedMessage.classList.remove("is-level");
    buddyStage.classList.remove("is-yum", "is-levelup");
    return;
  }
  paintBuddy(knownPokemon(partner));
  paintGrid(ids, partner);
}

function playBuddyCry() {
  const poke = knownPokemon(buddyStage.dataset.id);
  if (!poke || teamBody.hidden) return;
  buddyImg.classList.remove("is-cry");
  void buddyImg.offsetWidth;
  buddyImg.classList.add("is-cry");
  window.setTimeout(() => buddyImg.classList.remove("is-cry"), 700);
  playCry(poke);
}

function spawnBits(food) {
  buddyFx.replaceChildren();
  const glyph = FOOD_GLYPH[food] || "✨";
  for (let index = 0; index < 8; index += 1) {
    const bit = document.createElement("span");
    bit.className = "buddy-bit";
    bit.textContent = index % 3 === 2 ? "✨" : glyph;
    bit.style.setProperty("--dx", `${(index - 3.5) * 26}px`);
    bit.style.animationDelay = `${index * 35}ms`;
    buddyFx.append(bit);
  }
}

function growCare(id, food) {
  const gift = FOODS[food];
  if (!gift) return null;
  const state = careFor(id);
  state.energy = Math.min(ENERGY_MAX, state.energy + gift.energy);
  state.progress += gift.progress;
  let leveled = false;
  if (state.progress >= LEVEL_GOAL) {
    state.level += Math.floor(state.progress / LEVEL_GOAL);
    state.progress %= LEVEL_GOAL;
    leveled = true;
  }
  saveCare(id, state);
  return { state, leveled };
}

// La comida no reproduce el grito ni lee la explicación. El grito solo sale al tocar el escenario.
function serveFood(food) {
  const poke = knownPokemon(buddyStage.dataset.id);
  const gift = FOODS[food];
  if (!poke || !gift || teamBody.hidden) return;
  stopAllAudio();
  const grown = growCare(poke.id, food);
  paintCare(poke.id, true);
  const name = titleName(poke.name);
  feedMessage.classList.toggle("is-level", grown.leveled);
  feedMessage.textContent = grown.leveled
    ? `¡Nivel ${grown.state.level}! ${gift.line(name)}`
    : gift.line(name);
  feedMessage.hidden = false;
  buddyStage.classList.remove("is-yum", "is-levelup");
  aldoFigure.classList.remove("is-happy");
  void buddyStage.offsetWidth;
  buddyStage.classList.add("is-yum");
  aldoFigure.classList.add("is-happy");
  if (grown.leveled) buddyStage.classList.add("is-levelup");
  spawnBits(food);
  window.clearTimeout(feedTimer);
  feedTimer = window.setTimeout(() => {
    feedMessage.hidden = true;
    feedMessage.classList.remove("is-level");
    buddyStage.classList.remove("is-yum", "is-levelup");
    aldoFigure.classList.remove("is-happy");
    buddyFx.replaceChildren();
  }, grown.leveled ? 2200 : 1700);
}

function showAldo() {
  let index = 0;
  const tryNext = () => {
    if (index >= ALDO_SOURCES.length) {
      aldoBuddy.hidden = true;
      aldoMiss.hidden = false;
      return;
    }
    aldoBuddy.hidden = false;
    aldoBuddy.src = ALDO_SOURCES[index];
    index += 1;
  };
  aldoBuddy.addEventListener("error", tryNext);
  tryNext();
}

function choosePartner(id) {
  const ids = caughtIds();
  if (!ids.includes(id)) return;
  storePartner(id);
  refreshTeam();
}

export function initTeam({ showView: openView }) {
  showView = openView;
  teamEmpty.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.go));
  });
  buddyStage.addEventListener("click", () => playBuddyCry());
  buddyStage.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    playBuddyCry();
  });
  document.querySelector(".food-row").addEventListener("click", (event) => {
    const button = event.target.closest("[data-food]");
    if (!button) return;
    serveFood(button.dataset.food);
  });
  teamGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".team-card");
    if (!card) return;
    const id = Number(card.dataset.id);
    if (event.target.closest("[data-open]")) {
      openPokemon(id);
      return;
    }
    choosePartner(id);
  });
  onCaughtChange(refreshTeam);
  onCatalogChange(refreshTeam);
  onTypesChange(refreshTeam);
  showAldo();
  refreshTeam();
}
