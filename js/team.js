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
  titleName,
} from "./pokedex.js?v=17";
import { getType, paintTypeBadges } from "./types.js?v=5";

const PARTNER_KEY = "pokemundo_partner";
const TEAM_KEY = "pokemundo_team";
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
const teamEmpty = document.getElementById("teamEmpty");
const teamBody = document.getElementById("teamBody");
const buddyPanel = document.getElementById("buddyPanel");
const squadBox = document.getElementById("squad");
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

let shownId = 0;
let gridSig = "";
let feedTimer = 0;
let feedAll = false;
let squad = [0, 0, 0];
let focusSlot = 0;
let showView = () => {};

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

function loadTeamRaw() {
  try {
    const raw = JSON.parse(localStorage.getItem(TEAM_KEY) || "null");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const slots = Array.isArray(raw.slots) ? raw.slots.slice(0, 3) : [];
    while (slots.length < 3) slots.push(0);
    return {
      slots: slots.map(positiveId),
      focus: Math.min(2, Math.max(0, Math.floor(Number(raw.focus)) || 0)),
    };
  } catch {
    return null;
  }
}

function saveTeam(slots, focus) {
  const next = slots.slice(0, 3);
  while (next.length < 3) next.push(0);
  const lead = next[focus] || next.find(Boolean) || 0;
  try {
    localStorage.setItem(TEAM_KEY, JSON.stringify({ slots: next, focus }));
    if (lead) localStorage.setItem(PARTNER_KEY, String(lead));
    else localStorage.removeItem(PARTNER_KEY);
  } catch { /* si el guardado falla, el equipo sigue en pantalla */ }
}

function settleTeam(ids) {
  const caught = new Set(ids);
  let stored = loadTeamRaw();
  if (!stored) {
    const legacy = positiveId(localStorage.getItem(PARTNER_KEY));
    stored = { slots: [caught.has(legacy) ? legacy : 0, 0, 0], focus: 0 };
  }
  const slots = [0, 0, 0];
  const used = new Set();
  stored.slots.forEach((id, index) => {
    if (!caught.has(id) || used.has(id)) return;
    slots[index] = id;
    used.add(id);
  });
  ids.forEach((id) => {
    if (used.has(id)) return;
    const hole = slots.indexOf(0);
    if (hole < 0) return;
    slots[hole] = id;
    used.add(id);
  });
  let focus = stored.focus;
  if (!slots[focus]) focus = Math.max(0, slots.findIndex(Boolean));
  saveTeam(slots, focus);
  return { slots, focus };
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
  document.querySelectorAll(`.squad-lv[data-care="${id}"]`).forEach((label) => {
    label.textContent = `Nv ${state.level}`;
  });
  return state;
}

function paintAtmosphere(slots, focus) {
  const present = slots.filter(Boolean).map((id) => knownPokemon(id));
  const lead = present.find((poke) => poke.id === slots[focus]) || present[0];
  const leadType = (lead?.types || []).find(Boolean) || "";
  const leadTone = getType(leadType);
  const extraId = present
    .flatMap((poke) => poke.types || [])
    .find((type) => type && type !== leadType);
  const extraTone = extraId ? getType(extraId) : null;
  buddyPanel.style.setProperty("--scene", leadTone.color);
  buddyPanel.style.setProperty("--scene-2", extraTone ? extraTone.color : "#1d4ed8");
  buddyPanel.dataset.scene = leadType || "mix";
}

function paintSquad(slots, focus) {
  squadBox.replaceChildren();
  slots.forEach((id, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "squad-slot";
    button.dataset.slot = String(index);
    if (!id) {
      button.classList.add("is-empty");
      button.setAttribute("aria-label", `Espacio ${index + 1} libre`);
      const label = document.createElement("span");
      label.className = "squad-empty";
      label.append(`Espacio ${index + 1}`);
      const hint = document.createElement("small");
      hint.textContent = "Elige abajo";
      label.append(hint);
      button.append(label);
      squadBox.append(button);
      return;
    }
    const poke = knownPokemon(id);
    const tone = getType((poke.types || []).find(Boolean) || "");
    button.style.setProperty("--slot", tone.color);
    if (index === focus) button.classList.add("is-focus");
    button.setAttribute("aria-pressed", index === focus ? "true" : "false");
    button.setAttribute("aria-label", `${titleName(poke.name)}, espacio ${index + 1}`);
    const picture = document.createElement("span");
    picture.className = "slot-pic";
    const image = document.createElement("img");
    image.alt = "";
    image.width = 96;
    image.height = 96;
    if (index === focus) attachAnimatedSprite(image, poke);
    else setStableSprite(image, id);
    const fx = document.createElement("div");
    fx.className = "slot-fx";
    fx.setAttribute("aria-hidden", "true");
    picture.append(image, fx);
    const meta = document.createElement("span");
    meta.className = "squad-meta";
    const name = document.createElement("span");
    name.className = "squad-name";
    name.textContent = titleName(poke.name);
    const level = document.createElement("span");
    level.className = "squad-lv";
    level.dataset.care = String(id);
    level.textContent = `Nv ${careFor(id).level}`;
    meta.append(name, level);
    button.append(picture, meta);
    squadBox.append(button);
  });
}

function paintBuddy(poke) {
  buddyName.textContent = titleName(poke.name);
  paintTypeBadges(buddyTypes, poke.types, true);
  paintCare(poke.id, shownId === poke.id);
  shownId = poke.id;
}

function paintGrid(ids, slots, focus) {
  const lead = slots[focus] || 0;
  const openSlot = slots.includes(0);
  const sig = ids.map((id) => {
    const poke = knownPokemon(id);
    const seat = slots.indexOf(id);
    return `${id}:${poke.name}:${(poke.types || []).join(".")}:${seat}:${id === lead ? 1 : 0}`;
  }).join("|");
  if (sig === gridSig) return;
  gridSig = sig;
  teamGrid.replaceChildren();
  ids.forEach((id) => {
    const poke = knownPokemon(id);
    const seat = slots.indexOf(id);
    const onTeam = seat >= 0;
    const eating = id === lead;
    const card = document.createElement("article");
    card.className = "team-card";
    if (onTeam) card.classList.add("is-partner");
    if (eating) card.classList.add("is-focus");
    card.dataset.id = String(id);

    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "team-pick";
    pick.setAttribute("aria-pressed", onTeam ? "true" : "false");

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
    mark.textContent = eating ? "Come ahora" : onTeam ? "En equipo" : openSlot ? "Sumar" : "Cambiar";

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
  const empty = ids.length === 0;
  teamEmpty.hidden = !empty;
  teamBody.hidden = empty;
  if (empty) {
    shownId = 0;
    squad = [0, 0, 0];
    focusSlot = 0;
    gridSig = "";
    squadBox.replaceChildren();
    teamGrid.replaceChildren();
    window.clearTimeout(feedTimer);
    feedMessage.hidden = true;
    feedMessage.classList.remove("is-level");
    return;
  }
  const settled = settleTeam(ids);
  squad = settled.slots;
  focusSlot = settled.focus;
  paintAtmosphere(squad, focusSlot);
  paintSquad(squad, focusSlot);
  paintBuddy(knownPokemon(squad[focusSlot]));
  paintGrid(ids, squad, focusSlot);
}

function playBuddyCry(index = focusSlot) {
  const poke = knownPokemon(squad[index]);
  if (!poke || teamBody.hidden) return;
  const image = squadBox.querySelector(`[data-slot="${index}"] img`);
  if (!image) return;
  image.classList.remove("is-cry");
  void image.offsetWidth;
  image.classList.add("is-cry");
  window.setTimeout(() => image.classList.remove("is-cry"), 700);
  playCry(poke);
}

function spawnBits(food) {
  const fx = squadBox.querySelector(".squad-slot.is-focus .slot-fx");
  if (!fx) return;
  fx.replaceChildren();
  const glyph = FOOD_GLYPH[food] || "✨";
  for (let index = 0; index < 8; index += 1) {
    const bit = document.createElement("span");
    bit.className = "buddy-bit";
    bit.textContent = index % 3 === 2 ? "✨" : glyph;
    bit.style.setProperty("--dx", `${(index - 3.5) * 18}px`);
    bit.style.animationDelay = `${index * 35}ms`;
    fx.append(bit);
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
  const gift = FOODS[food];
  const members = (feedAll ? squad.filter(Boolean) : [squad[focusSlot]]).filter(Boolean);
  if (!gift || !members.length || teamBody.hidden) return;
  stopAllAudio();
  const fed = members.map((id) => ({ id, ...growCare(id, food) }));
  fed.forEach((row) => paintCare(row.id, true));
  const leveled = fed.filter((row) => row.leveled);
  const who = fed.length > 1 ? "todo el equipo" : titleName(knownPokemon(fed[0].id).name);
  let prefix = "";
  if (leveled.length === 1) prefix = `¡Nivel ${leveled[0].state.level}! `;
  else if (leveled.length > 1) prefix = "¡El equipo sube de nivel! ";
  feedMessage.classList.toggle("is-level", leveled.length > 0);
  feedMessage.textContent = `${prefix}${gift.line(who)}`;
  feedMessage.hidden = false;
  squadBox.querySelectorAll(".squad-slot").forEach((slot) => slot.classList.remove("is-yum", "is-levelup"));
  aldoFigure.classList.remove("is-happy");
  void squadBox.offsetWidth;
  aldoFigure.classList.add("is-happy");
  fed.forEach((row) => {
    const seat = squad.indexOf(row.id);
    const slot = squadBox.querySelector(`[data-slot="${seat}"]`);
    if (!slot) return;
    slot.classList.add("is-yum");
    if (row.leveled) slot.classList.add("is-levelup");
  });
  spawnBits(food);
  window.clearTimeout(feedTimer);
  feedTimer = window.setTimeout(() => {
    feedMessage.hidden = true;
    feedMessage.classList.remove("is-level");
    squadBox.querySelectorAll(".squad-slot").forEach((slot) => slot.classList.remove("is-yum", "is-levelup"));
    aldoFigure.classList.remove("is-happy");
    squadBox.querySelectorAll(".slot-fx").forEach((fx) => fx.replaceChildren());
  }, leveled.length ? 2200 : 1700);
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

function selectSlot(index) {
  if (!squad[index]) {
    feedMessage.classList.remove("is-level");
    feedMessage.textContent = `El espacio ${index + 1} está libre. Elige uno en Tu colección.`;
    feedMessage.hidden = false;
    return;
  }
  focusSlot = index;
  saveTeam(squad, focusSlot);
  refreshTeam();
}

function assignFromCollection(id) {
  const ids = caughtIds();
  if (!ids.includes(id)) return;
  const existing = squad.indexOf(id);
  if (existing >= 0) {
    focusSlot = existing;
  } else {
    const hole = squad.indexOf(0);
    const target = hole >= 0 ? hole : focusSlot;
    squad[target] = id;
    focusSlot = target;
  }
  saveTeam(squad, focusSlot);
  refreshTeam();
}

let foodDrag = null;

function foodTargets() {
  const filled = [...squadBox.querySelectorAll(".squad-slot:not(.is-empty)")];
  if (feedAll) return filled;
  const focus = squadBox.querySelector(".squad-slot.is-focus");
  return focus ? [focus] : [];
}

function slotNear(slot, x, y) {
  const rect = slot.getBoundingClientRect();
  const pad = 36;
  return x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad;
}

function markDrop(x, y) {
  foodTargets().forEach((slot) => slot.classList.toggle("is-drop", slotNear(slot, x, y)));
}

function clearDrop() {
  squadBox.querySelectorAll(".squad-slot").forEach((slot) => slot.classList.remove("is-drop"));
}

function placeGhost(ghost, x, y) {
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
}

function beginGhost(drag, x, y) {
  const ghost = document.createElement("div");
  ghost.className = "food-ghost";
  ghost.textContent = FOOD_GLYPH[drag.food] || "✨";
  document.body.append(ghost);
  placeGhost(ghost, x, y);
  drag.ghost = ghost;
}

function endDrag(sendHome) {
  const drag = foodDrag;
  foodDrag = null;
  clearDrop();
  if (!drag?.ghost) return;
  const ghost = drag.ghost;
  if (!sendHome) {
    ghost.remove();
    return;
  }
  ghost.classList.add("is-back");
  placeGhost(ghost, drag.originX, drag.originY);
  window.setTimeout(() => ghost.remove(), 280);
}

function onFoodDown(event) {
  const button = event.target.closest("[data-food]");
  if (!button || event.button > 0) return;
  event.preventDefault();
  try { button.setPointerCapture(event.pointerId); } catch { /* sigue el arrastre igual */ }
  const rect = button.getBoundingClientRect();
  foodDrag = {
    id: event.pointerId,
    food: button.dataset.food,
    button,
    startX: event.clientX,
    startY: event.clientY,
    originX: rect.left + rect.width / 2,
    originY: rect.top + rect.height / 2,
    moved: false,
    ghost: null,
  };
}

function onFoodMove(event) {
  if (!foodDrag || event.pointerId !== foodDrag.id) return;
  const distance = Math.hypot(event.clientX - foodDrag.startX, event.clientY - foodDrag.startY);
  if (!foodDrag.moved && distance < 8) return;
  foodDrag.moved = true;
  if (!foodDrag.ghost) beginGhost(foodDrag, event.clientX, event.clientY);
  placeGhost(foodDrag.ghost, event.clientX, event.clientY);
  markDrop(event.clientX, event.clientY);
}

function onFoodUp(event) {
  if (!foodDrag || event.pointerId !== foodDrag.id) return;
  const drag = foodDrag;
  const hit = drag.moved && [...squadBox.querySelectorAll(".squad-slot.is-drop")].length > 0;
  if (!drag.moved || hit) {
    endDrag(false);
    serveFood(drag.food);
    return;
  }
  endDrag(true);
}

function onFoodCancel(event) {
  if (!foodDrag || (event && event.pointerId !== foodDrag.id)) return;
  endDrag(true);
}

export function initTeam({ showView: openView }) {
  showView = openView;
  teamEmpty.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.go));
  });
  squadBox.addEventListener("click", (event) => {
    const slot = event.target.closest("[data-slot]");
    if (!slot) return;
    const index = Number(slot.dataset.slot);
    if (event.target.closest(".slot-pic") && index === focusSlot && squad[index]) {
      playBuddyCry(index);
      return;
    }
    if (index === focusSlot) return;
    selectSlot(index);
  });
  squadBox.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const slot = event.target.closest("[data-slot]");
    if (!slot) return;
    const index = Number(slot.dataset.slot);
    if (index !== focusSlot || !squad[index]) return;
    event.preventDefault();
    playBuddyCry(index);
  });
  document.querySelector(".feed-who").addEventListener("click", (event) => {
    const button = event.target.closest("[data-who]");
    if (!button) return;
    feedAll = button.dataset.who === "all";
    document.querySelectorAll("[data-who]").forEach((item) => {
      const on = item === button;
      item.classList.toggle("is-on", on);
      item.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
  const foodRow = document.querySelector(".food-row");
  foodRow.addEventListener("pointerdown", onFoodDown);
  foodRow.addEventListener("pointermove", onFoodMove);
  foodRow.addEventListener("pointerup", onFoodUp);
  foodRow.addEventListener("pointercancel", onFoodCancel);
  teamGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".team-card");
    if (!card) return;
    const id = Number(card.dataset.id);
    if (event.target.closest("[data-open]")) {
      openPokemon(id);
      return;
    }
    assignFromCollection(id);
  });
  onCaughtChange(refreshTeam);
  onCatalogChange(refreshTeam);
  onTypesChange(refreshTeam);
  showAldo();
  refreshTeam();
}
