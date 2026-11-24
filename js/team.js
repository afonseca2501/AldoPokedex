import { playCry, stopAllAudio } from "./audio.js?v=6";
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
} from "./pokedex.js?v=16";
import { paintTypeBadges } from "./types.js?v=5";

const PARTNER_KEY = "pokemundo_partner";
const FOOD_LINES = {
  berry: (name) => `¡A ${name} le encantó la baya!`,
  cookie: (name) => `¡A ${name} le encantó la galleta!`,
  juice: (name) => `¡A ${name} le encantó el jugo!`,
};
const FOOD_GLYPH = { berry: "🍓", cookie: "🍪", juice: "🧃" };
const ANIM_CLASSES = ["anim-fire", "anim-water", "anim-electric", "anim-grass", "anim-default"];

const teamEmpty = document.getElementById("teamEmpty");
const teamBody = document.getElementById("teamBody");
const buddyStage = document.getElementById("buddyStage");
const buddyImg = document.getElementById("buddyImg");
const buddyFx = document.getElementById("buddyFx");
const buddyName = document.getElementById("buddyName");
const buddyTypes = document.getElementById("buddyTypes");
const feedMessage = document.getElementById("feedMessage");
const teamGrid = document.getElementById("teamGrid");

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

    pick.append(image, name, mark);

    const open = document.createElement("button");
    open.type = "button";
    open.className = "team-open";
    open.dataset.open = "1";
    open.textContent = "Ver ficha";

    card.append(pick, open);
    teamGrid.append(card);
  });
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
    buddyStage.classList.remove("is-yum");
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

// La comida no reproduce el grito ni lee la explicación. El grito solo sale al tocar el escenario.
function serveFood(food) {
  const poke = knownPokemon(buddyStage.dataset.id);
  if (!poke || teamBody.hidden) return;
  stopAllAudio();
  const name = titleName(poke.name);
  const line = FOOD_LINES[food] || ((label) => `¡A ${label} le encantó!`);
  feedMessage.textContent = line(name);
  feedMessage.hidden = false;
  buddyStage.classList.remove("is-yum");
  void buddyStage.offsetWidth;
  buddyStage.classList.add("is-yum");
  spawnBits(food);
  window.clearTimeout(feedTimer);
  feedTimer = window.setTimeout(() => {
    feedMessage.hidden = true;
    buddyStage.classList.remove("is-yum");
    buddyFx.replaceChildren();
  }, 1700);
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
  refreshTeam();
}
