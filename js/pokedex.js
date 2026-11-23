import { cryUrlList, playCry, speakSpanish, stopAllAudio } from "./audio.js";
import { TYPE_ORDER, getType, paintTypeBadges, typeName, weaknessesOf } from "./types.js?v=5";

const CAUGHT_KEY = "pokemundo_caught";
const PAGE_SIZE = 100;
const RENDER_CHUNK = 36;
const ANIMATED_TYPES = new Set(["fire", "water", "electric", "grass"]);
const PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill="#ef4444"/>
    <path d="M4 50a46 46 0 0 0 92 0" fill="#f8fafc"/>
    <rect x="4" y="46" width="92" height="8" fill="#0f172a"/>
    <circle cx="50" cy="50" r="14" fill="#0f172a" stroke="#f8fafc" stroke-width="4"/>
    <circle cx="50" cy="50" r="6" fill="#f8fafc"/>
  </svg>`
)}`;

const KEY_POKEMON = [
  { id: 1, name: "bulbasaur", types: ["grass", "poison"], desc: "Lleva una semilla en su lomo desde que nace y crece absorbiendo nutrientes." },
  { id: 4, name: "charmander", types: ["fire"], desc: "La llama de la punta de su cola indica su estado de ánimo y energía." },
  { id: 7, name: "squirtle", types: ["water"], desc: "Al retraerse en su caparazón, lanza chorros de agua con gran precisión." },
  { id: 25, name: "pikachu", types: ["electric"], desc: "Acumula electricidad en sus mejillas y la libera en descargas rápidas." },
  { id: 382, name: "kyogre", types: ["water"], desc: "Pokémon legendario asociado a las profundidades oceánicas y las lluvias." },
  { id: 713, name: "avalugg", types: ["ice"], desc: "Su cuerpo cubierto de hielo denso resiste impactos pesados en zonas frías." },
].map((poke) => ({
  ...poke,
  curated: true,
  descLang: "es",
  speciesLoaded: true,
  cryUrls: cryUrlList(poke.id),
}));

const byId = new Map(KEY_POKEMON.map((poke) => [poke.id, poke]));
const typeById = new Map();
const profileJobs = new Map();
const speciesJobs = new Map();
const chainJobs = new Map();
const chainCache = new Map();
const chainBySpecies = new Map();

let catalog = sortCatalog();
let caught = loadCaught();
let totalExpected = 0;
let currentPoke = null;
let modalToken = 0;
let speakToken = 0;
let renderJob = 0;
let renderQueued = false;
let renderLimit = RENDER_CHUNK;
let revealQueued = false;
let listObserver = null;
let sentinel = null;
let searchTimer = 0;
let loadController = null;

const statusText = document.getElementById("statusText");
const retryBtn = document.getElementById("retryBtn");

export function setStatus(message, retry = false) {
  statusText.textContent = message || "";
  retryBtn.hidden = !retry;
}
const caughtCount = document.getElementById("caughtCount");
const caughtRatio = document.getElementById("caughtRatio");
const caughtBar = document.getElementById("caughtBar");
const caughtTrack = document.getElementById("caughtTrack");
const pokeGrid = document.getElementById("pokeGrid");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const modalBackdrop = document.getElementById("modalBackdrop");
const speakBtn = document.getElementById("speakBtn");
const catchBtn = document.getElementById("catchBtn");
const pokeStage = document.getElementById("pokeStage");

function artworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function idFromUrl(url) {
  const match = String(url || "").match(/\/pokemon\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

function speciesIdFromUrl(url) {
  const match = String(url || "").match(/\/pokemon-species\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

function sortCatalog() {
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function compactTypes(slots) {
  return (slots || []).filter(Boolean);
}

function loadCaught() {
  try {
    const raw = JSON.parse(localStorage.getItem(CAUGHT_KEY) || "[]");
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.map(Number).filter((id) => Number.isInteger(id) && id > 0));
  } catch {
    return new Set();
  }
}

export function displayName(name) {
  return String(name || "Pokémon").replace(/-/g, " ");
}

export function titleName(name) {
  return displayName(name).replace(/(^|\s)\S/g, (chunk) => chunk.toUpperCase());
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

export function getCatalog() {
  return catalog;
}

function formatId(id) {
  return `#${String(id).padStart(3, "0")}`;
}

function yieldToMain() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function genericSpanish(poke) {
  const title = titleName(poke.name);
  const names = (poke.types || []).filter(Boolean).map((type) => typeName(type));
  if (names.length === 0) return `${title} es un Pokémon registrado en la Pokédex.`;
  if (names.length === 1) return `${title} es un Pokémon de tipo ${names[0]}.`;
  return `${title} es un Pokémon de tipo ${names[0]} y ${names[1]}.`;
}

function currentDesc(poke) {
  if (poke.desc && poke.descLang === "es") return poke.desc;
  return genericSpanish(poke);
}

function explanationText(poke) {
  const title = titleName(poke.name);
  const body = currentDesc(poke);
  if (body.toLowerCase().startsWith(title.toLowerCase())) return body;
  return `${title}. ${body}`;
}

function cleanFlavor(text) {
  return String(text).replace(/[\f\n\r]+/g, " ").replace(/\s+/g, " ").trim();
}

const caughtListeners = new Set();

export function isCaught(id) {
  return caught.has(Number(id));
}

export function onCaughtChange(listener) {
  caughtListeners.add(listener);
}

function updateCaughtCounter() {
  const total = totalExpected || catalog.length;
  const captured = caught.size;
  const exact = total > 0 ? Math.min(100, (captured / total) * 100) : 0;
  caughtCount.textContent = captured === 1 ? "¡Llevas 1!" : `¡Llevas ${captured}!`;
  caughtRatio.textContent = `${captured} / ${total}`;
  caughtBar.style.width = captured > 0 ? `max(${exact}%, 10px)` : "0%";
  caughtTrack.setAttribute("aria-valuemax", String(total));
  caughtTrack.setAttribute("aria-valuenow", String(captured));
  caughtTrack.setAttribute("aria-valuetext", `${captured} de ${total} Pokémon capturados`);
  localStorage.setItem(CAUGHT_KEY, JSON.stringify([...caught]));
  caughtListeners.forEach((listener) => listener());
}

const typeListeners = new Set();

export function pokemonTypes(id) {
  return (byId.get(Number(id))?.types || []).filter(Boolean);
}

export function onTypesChange(listener) {
  typeListeners.add(listener);
}

function notifyTypes() {
  typeListeners.forEach((listener) => listener());
}

function markType(element, types) {
  TYPE_ORDER.forEach((type) => element.classList.remove(`type-${type}`));
  const main = (types || []).find(Boolean);
  if (!main) {
    element.style.borderColor = "";
    return;
  }
  element.classList.add(`type-${main}`);
  element.style.borderColor = getType(main).color;
}

function fillBadges(container, types) {
  paintTypeBadges(container, types, true);
}

function showWeaknesses(types) {
  const list = document.getElementById("weakTypes");
  const none = document.getElementById("weakNone");
  const known = (types || []).filter(Boolean);
  if (!known.length) {
    list.replaceChildren();
    none.hidden = false;
    none.textContent = "Cargando…";
    return;
  }
  const weak = weaknessesOf(known);
  if (!weak.length) {
    list.replaceChildren();
    none.hidden = false;
    none.textContent = "¡Ninguno!";
    return;
  }
  none.hidden = true;
  paintTypeBadges(list, weak, true);
}

function setSprite(img, id) {
  img.dataset.step = "art";
  img.onerror = () => {
    if (img.dataset.step === "art") {
      img.dataset.step = "sprite";
      img.src = spriteUrl(id);
      return;
    }
    img.onerror = null;
    img.src = PLACEHOLDER;
  };
  img.src = artworkUrl(id);
}

function createCard(poke) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "poke-card";
  card.dataset.id = String(poke.id);
  markType(card, poke.types);

  const tag = document.createElement("span");
  tag.className = "caught-tag";
  tag.textContent = "✓";
  tag.hidden = !caught.has(poke.id);

  const number = document.createElement("div");
  number.className = "poke-num";
  number.textContent = formatId(poke.id);

  const image = document.createElement("img");
  image.alt = "";
  image.width = 92;
  image.height = 92;
  image.loading = "lazy";
  image.decoding = "async";
  setSprite(image, poke.id);

  const name = document.createElement("div");
  name.className = "poke-name";
  name.textContent = displayName(poke.name);

  const types = document.createElement("div");
  types.className = "poke-types";
  fillBadges(types, poke.types);

  card.append(tag, number, image, name, types);
  card.addEventListener("click", () => openPokemon(poke.id));
  return card;
}

function getFiltered() {
  const query = searchInput.value.trim().toLowerCase();
  const type = typeFilter.value;
  return catalog.filter((poke) => {
    if (type && !(poke.types || []).includes(type)) return false;
    if (!query) return true;
    if (poke.name.toLowerCase().includes(query)) return true;
    const numeric = query.replace(/^#/, "");
    return /^\d+$/.test(numeric) && poke.id === Number(numeric);
  });
}

function nextCard(node) {
  let cursor = node ? node.nextElementSibling : null;
  while (cursor && !cursor.classList.contains("poke-card")) cursor = cursor.nextElementSibling;
  return cursor;
}

function emptyMessage() {
  const note = document.createElement("p");
  note.className = "empty";
  note.textContent = "Ningún Pokémon coincide con la búsqueda.";
  return note;
}

function ensureSentinel() {
  if (sentinel) return sentinel;
  sentinel = document.createElement("div");
  sentinel.className = "list-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  if (typeof IntersectionObserver === "undefined") {
    window.addEventListener("scroll", maybeRevealMore, { passive: true });
    return sentinel;
  }
  listObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) maybeRevealMore();
  }, { root: null, rootMargin: "0px 0px 600px 0px", threshold: 0 });
  listObserver.observe(sentinel);
  return sentinel;
}

function mountSentinel() {
  pokeGrid.append(ensureSentinel());
}

function sentinelInRange() {
  if (!sentinel || !sentinel.isConnected) return false;
  const rect = sentinel.getBoundingClientRect();
  return rect.top <= window.innerHeight + 600 && rect.bottom >= 0;
}

function maybeRevealMore() {
  if (revealQueued) return;
  revealQueued = true;
  requestAnimationFrame(() => {
    revealQueued = false;
    const items = getFiltered();
    if (renderLimit >= items.length || !sentinelInRange()) return;
    renderLimit = Math.min(items.length, renderLimit + RENDER_CHUNK);
    paintVisible();
  });
}

function mergeChunked(items, job) {
  let index = 0;
  let cursor = pokeGrid.querySelector(".poke-card");
  const step = () => {
    if (job !== renderJob) return;
    let created = 0;
    while (index < items.length && created < RENDER_CHUNK) {
      const poke = items[index];
      index += 1;
      if (cursor && Number(cursor.dataset.id) === poke.id) {
        cursor = nextCard(cursor);
        continue;
      }
      const anchor = cursor || (sentinel && sentinel.isConnected ? sentinel : null);
      pokeGrid.insertBefore(createCard(poke), anchor);
      created += 1;
    }
    if (index < items.length) {
      requestAnimationFrame(step);
      return;
    }
    if (job !== renderJob) return;
    mountSentinel();
    maybeRevealMore();
  };
  step();
}

function paintVisible() {
  const job = ++renderJob;
  const items = getFiltered();
  if (!items.length) {
    pokeGrid.replaceChildren(emptyMessage());
    return;
  }
  const slice = items.slice(0, renderLimit);
  const wanted = new Set(slice.map((poke) => poke.id));
  [...pokeGrid.children].forEach((child) => {
    if (child === sentinel) return;
    if (!child.classList.contains("poke-card") || !wanted.has(Number(child.dataset.id))) {
      child.remove();
    }
  });
  mergeChunked(slice, job);
}

function startRender() {
  window.clearTimeout(searchTimer);
  renderLimit = RENDER_CHUNK;
  requestRender();
}

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    paintVisible();
  });
}

function refreshVisibleTypes() {
  pokeGrid.querySelectorAll(".poke-card").forEach((card) => {
    const poke = byId.get(Number(card.dataset.id));
    const holder = card.querySelector(".poke-types");
    if (!poke || !holder) return;
    fillBadges(holder, poke.types);
    markType(card, poke.types);
  });
}

function stageClass(types) {
  const main = (types || [])[0];
  return ANIMATED_TYPES.has(main) ? `stage anim-${main}` : "stage anim-default";
}

function pulseStage() {
  pokeStage.classList.add("react");
  window.setTimeout(() => pokeStage.classList.remove("react"), 350);
}

function playCryFor(poke) {
  if (!poke) return;
  pulseStage();
  playCry(poke);
}

function fetchJson(url) {
  return fetch(url).then((response) => (response.ok ? response.json() : null)).catch(() => null);
}

function loadSpeciesJson(id) {
  if (!id) return Promise.resolve(null);
  if (speciesJobs.has(id)) return speciesJobs.get(id);
  const job = fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
  speciesJobs.set(id, job);
  job.then((data) => {
    if (!data) speciesJobs.delete(id);
  });
  return job;
}

function flattenChain(node, depth, stages) {
  if (!node?.species) return;
  const id = speciesIdFromUrl(node.species.url);
  if (id) stages.push({ id, name: node.species.name, depth });
  (node.evolves_to || []).forEach((next) => flattenChain(next, depth + 1, stages));
}

function rememberChain(stages) {
  stages.forEach((stage) => chainBySpecies.set(stage.id, stages));
  return stages;
}

function loadChain(url) {
  if (!url) return Promise.resolve(null);
  if (chainCache.has(url)) return Promise.resolve(chainCache.get(url));
  if (chainJobs.has(url)) return chainJobs.get(url);
  const job = fetchJson(url)
    .then((data) => {
      if (!data?.chain) return null;
      const stages = [];
      flattenChain(data.chain, 0, stages);
      if (!stages.length) return null;
      chainCache.set(url, stages);
      return rememberChain(stages);
    })
    .finally(() => chainJobs.delete(url));
  chainJobs.set(url, job);
  return job;
}

async function attachSpecies(poke) {
  if (poke.evolutionChainUrl && poke.speciesLoaded && poke.descLang === "es") return;
  const pokemon = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${poke.id}/`);
  if (pokemon) {
    if (pokemon.name) poke.name = pokemon.name;
    const cries = [pokemon.cries?.latest, pokemon.cries?.legacy].filter(Boolean);
    if (cries.length) poke.cryUrls = cries;
    const types = (pokemon.types || []).map((entry) => entry.type?.name).filter(Boolean);
    if (types.length) poke.types = types;
    poke.speciesId = speciesIdFromUrl(pokemon.species?.url) || poke.id;
  } else if (!poke.speciesId) {
    poke.speciesId = poke.id;
  }

  const species = await loadSpeciesJson(poke.speciesId || poke.id);
  if (!species) return;
  if (species.evolution_chain?.url) poke.evolutionChainUrl = species.evolution_chain.url;
  const entry = (species.flavor_text_entries || []).find((item) => item.language?.name === "es");
  if (entry?.flavor_text && !(poke.curated && poke.desc)) {
    poke.desc = cleanFlavor(entry.flavor_text);
    poke.descLang = "es";
  }
  poke.speciesLoaded = true;
}

function ensureProfile(poke) {
  if (poke.evolutionChainUrl && poke.speciesLoaded && poke.descLang === "es") return Promise.resolve();
  if (profileJobs.has(poke.id)) return profileJobs.get(poke.id);
  const job = attachSpecies(poke)
    .catch(() => {})
    .finally(() => {
      if (!poke.desc || poke.descLang !== "es") {
        poke.desc = genericSpanish(poke);
        poke.descLang = "es";
      }
      poke.speciesLoaded = true;
      profileJobs.delete(poke.id);
    });
  profileJobs.set(poke.id, job);
  return job;
}

function ensureSpanishDescription(poke) {
  return ensureProfile(poke);
}

const evoStatus = document.getElementById("evoStatus");
const evoTrack = document.getElementById("evoTrack");
let visibleChain = null;

function showEvolutionLoading() {
  visibleChain = null;
  evoStatus.hidden = false;
  evoStatus.textContent = "Cargando evolución…";
  evoTrack.hidden = true;
  evoTrack.replaceChildren();
}

function currentStageId(poke, stages) {
  if (stages.some((stage) => stage.id === poke.id)) return poke.id;
  if (poke.speciesId && stages.some((stage) => stage.id === poke.speciesId)) return poke.speciesId;
  return poke.id;
}

function createEvoCard(stage, isCurrent) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "evo-card";
  button.dataset.id = String(stage.id);
  if (isCurrent) button.classList.add("is-current");
  if (caught.has(stage.id)) button.classList.add("is-caught");
  const stageTypes = byId.get(stage.id)?.types || [];
  markType(button, stageTypes);
  const label = [
    formatId(stage.id),
    titleName(stage.name),
    ...stageTypes.map((type) => typeName(type)),
    isCurrent ? "actual" : "",
    caught.has(stage.id) ? "capturado" : "",
  ].filter(Boolean).join(", ");
  button.setAttribute("aria-label", label);
  if (isCurrent) button.setAttribute("aria-current", "true");

  const image = document.createElement("img");
  image.alt = "";
  image.width = 76;
  image.height = 76;
  setSprite(image, stage.id);

  const number = document.createElement("div");
  number.className = "evo-id";
  number.textContent = formatId(stage.id);

  const name = document.createElement("div");
  name.className = "evo-name";
  name.textContent = displayName(stage.name);

  const types = document.createElement("div");
  types.className = "evo-types";
  paintTypeBadges(types, stageTypes, false);

  const marks = document.createElement("div");
  marks.className = "evo-marks";
  if (isCurrent) {
    const now = document.createElement("span");
    now.className = "evo-now";
    now.textContent = "Actual";
    marks.append(now);
  }
  if (caught.has(stage.id)) {
    const got = document.createElement("span");
    got.className = "evo-got";
    got.textContent = "✓";
    marks.append(got);
  }

  button.append(image, number, name, types, marks);
  button.addEventListener("click", () => {
    if (currentPoke && currentPoke.id === stage.id) return;
    openPokemon(stage.id);
  });
  return button;
}

function renderEvolution(stages, poke, center) {
  visibleChain = stages;
  const previousScroll = evoTrack.scrollLeft;
  if (!stages) {
    evoTrack.hidden = true;
    evoTrack.replaceChildren();
    evoStatus.hidden = false;
    evoStatus.textContent = "No se pudo cargar la línea evolutiva.";
    return;
  }
  if (stages.length < 2) {
    evoTrack.hidden = true;
    evoTrack.replaceChildren();
    evoStatus.hidden = false;
    evoStatus.textContent = "Este Pokémon no tiene evoluciones.";
    return;
  }

  const groups = [];
  stages.forEach((stage) => {
    if (!groups[stage.depth]) groups[stage.depth] = [];
    groups[stage.depth].push(stage);
  });
  const activeId = currentStageId(poke, stages);
  evoStatus.hidden = true;
  evoTrack.hidden = false;
  evoTrack.replaceChildren();
  groups.forEach((group, index) => {
    if (!group) return;
    if (index > 0) {
      const arrow = document.createElement("span");
      arrow.className = "evo-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      evoTrack.append(arrow);
    }
    const wrap = document.createElement("div");
    wrap.className = "evo-stage";
    group.forEach((stage) => wrap.append(createEvoCard(stage, stage.id === activeId)));
    evoTrack.append(wrap);
  });
  if (!center) {
    evoTrack.scrollLeft = previousScroll;
    return;
  }
  const current = evoTrack.querySelector(".is-current");
  if (!current) return;
  const delta = current.getBoundingClientRect().left - evoTrack.getBoundingClientRect().left;
  evoTrack.scrollLeft += delta - 8;
}

function refreshModal(poke) {
  if (!modalBackdrop.classList.contains("open") || !currentPoke || currentPoke.id !== poke.id) return;
  document.getElementById("modalNum").textContent = formatId(poke.id);
  document.getElementById("modalName").textContent = displayName(poke.name);
  document.getElementById("modalDesc").textContent = currentDesc(poke);
  fillBadges(document.getElementById("modalTypes"), poke.types);
  showWeaknesses(poke.types);
  const reacting = pokeStage.classList.contains("react");
  pokeStage.className = `${stageClass(poke.types)}${reacting ? " react" : ""}`;
  const card = pokeGrid.querySelector(`.poke-card[data-id="${poke.id}"]`);
  if (!card) return;
  const types = card.querySelector(".poke-types");
  const name = card.querySelector(".poke-name");
  if (types) fillBadges(types, poke.types);
  if (name) name.textContent = displayName(poke.name);
}

function ensureEntry(id) {
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  const existing = byId.get(numeric);
  if (existing) return existing;
  const poke = {
    id: numeric,
    name: `pokémon ${numeric}`,
    types: [],
    desc: "",
    descLang: "",
    curated: false,
    speciesLoaded: false,
    cryUrls: cryUrlList(numeric),
  };
  byId.set(numeric, poke);
  catalog = sortCatalog();
  return poke;
}

export function openPokemon(id) {
  const poke = ensureEntry(id);
  if (!poke) return;
  currentPoke = poke;
  const token = ++modalToken;

  document.getElementById("modalNum").textContent = formatId(poke.id);
  document.getElementById("modalName").textContent = displayName(poke.name);
  fillBadges(document.getElementById("modalTypes"), poke.types);
  showWeaknesses(poke.types);
  document.getElementById("modalDesc").textContent = currentDesc(poke);

  const image = document.getElementById("modalImg");
  image.alt = titleName(poke.name);
  setSprite(image, poke.id);
  pokeStage.className = stageClass(poke.types);
  catchBtn.textContent = caught.has(poke.id) ? "¡Atrapado!" : "¡Atrapar!";
  const knownChain = (poke.evolutionChainUrl && chainCache.get(poke.evolutionChainUrl)) || chainBySpecies.get(poke.id);
  if (knownChain) renderEvolution(knownChain, poke, true);
  else showEvolutionLoading();
  modalBackdrop.classList.add("open");
  stopAllAudio();

  ensureProfile(poke).then(async () => {
    if (token !== modalToken) return;
    refreshModal(poke);
    const stages = await loadChain(poke.evolutionChainUrl);
    if (token !== modalToken) return;
    renderEvolution(stages, poke, true);
  });
}

function closeModal() {
  stopAllAudio();
  modalBackdrop.classList.remove("open");
}

function markCaughtTag(id) {
  const tag = pokeGrid.querySelector(`.poke-card[data-id="${id}"] .caught-tag`);
  if (tag) tag.hidden = !caught.has(id);
}

function upsertFromIndex(item) {
  const id = idFromUrl(item.url);
  if (!id) return;
  const types = compactTypes(typeById.get(id));
  const existing = byId.get(id);
  if (existing) {
    existing.name = item.name || existing.name;
    if (types.length) existing.types = types;
    return;
  }
  byId.set(id, {
    id,
    name: item.name,
    types,
    desc: "",
    descLang: "",
    curated: false,
    speciesLoaded: false,
    cryUrls: cryUrlList(id),
  });
}

async function loadTypes(signal) {
  await Promise.all(TYPE_ORDER.map(async (type) => {
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/type/${type}`, { signal });
      if (!response.ok) return;
      const data = await response.json();
      for (const row of data.pokemon || []) {
        const id = idFromUrl(row.pokemon?.url);
        if (!id) continue;
        let slots = typeById.get(id);
        if (!slots) {
          slots = [];
          typeById.set(id, slots);
        }
        slots[(row.slot || 1) - 1] = type;
      }
    } catch (error) {
      if (error.name === "AbortError") throw error;
    }
  }));
}

function applyTypes() {
  let changed = false;
  for (const poke of byId.values()) {
    const types = compactTypes(typeById.get(poke.id));
    if (!types.length) continue;
    if ((poke.types || []).join() !== types.join()) {
      poke.types = types;
      changed = true;
    }
  }
  if (changed) {
    if (typeFilter.value) startRender();
    else refreshVisibleTypes();
    if (currentPoke) refreshModal(currentPoke);
  }
  notifyTypes();
}

async function loadCatalog() {
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  const { signal } = controller;
  setStatus("Buscando…");

  try {
    const head = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1", { signal });
    if (!head.ok) throw new Error("No se pudo leer el catálogo");
    const headData = await head.json();
    const count = Number(headData.count) || 0;
    if (!count) throw new Error("Catálogo vacío");
    totalExpected = count;
    updateCaughtCounter();

    const typePromise = loadTypes(signal);
    for (let offset = 0; offset < count; offset += PAGE_SIZE) {
      if (signal.aborted) return;
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon?limit=${PAGE_SIZE}&offset=${offset}`,
        { signal }
      );
      if (!response.ok) throw new Error("Página no disponible");
      const data = await response.json();
      if (!data.results?.length) break;
      data.results.forEach(upsertFromIndex);
      catalog = sortCatalog();
      const loaded = Math.min(offset + data.results.length, count);
      setStatus("Buscando…");
      requestRender();
      await yieldToMain();
    }

    await typePromise;
    if (signal.aborted || loadController !== controller) return;
    applyTypes();
    catalog = sortCatalog();
    requestRender();
    setStatus("");
  } catch (error) {
    if (signal.aborted || error.name === "AbortError") return;
    setStatus(catalog.length > KEY_POKEMON.length ? "Faltan algunos. Prueba otra vez." : "Sin internet.", true);
  }
}

export function initPokedex() {
  pokeStage.addEventListener("click", () => {
    if (currentPoke) playCryFor(currentPoke);
  });
  pokeStage.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (currentPoke) playCryFor(currentPoke);
  });

  speakBtn.addEventListener("click", () => {
    const poke = currentPoke;
    if (!poke) return;
    speakToken += 1;
    const token = speakToken;
    refreshModal(poke);
    speakSpanish(
      explanationText(poke),
      () => token === speakToken && currentPoke === poke && modalBackdrop.classList.contains("open")
    );
    ensureSpanishDescription(poke).then(() => {
      if (token !== speakToken || currentPoke !== poke) return;
      refreshModal(poke);
    });
  });

  catchBtn.addEventListener("click", () => {
    if (!currentPoke) return;
    const already = caught.has(currentPoke.id);
    if (already) {
      const name = titleName(currentPoke.name);
      if (!window.confirm(`¿Soltar a ${name}?`)) return;
      caught.delete(currentPoke.id);
    } else {
      caught.add(currentPoke.id);
    }
    updateCaughtCounter();
    markCaughtTag(currentPoke.id);
    catchBtn.textContent = caught.has(currentPoke.id) ? "¡Atrapado!" : "¡Atrapar!";
    if (!already) {
      catchBtn.classList.remove("caught-pop");
      void catchBtn.offsetWidth;
      catchBtn.classList.add("caught-pop");
    }
    if (visibleChain) renderEvolution(visibleChain, currentPoke, false);
  });

  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalBackdrop.classList.contains("open")) closeModal();
  });
  searchInput.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(startRender, 150);
  });
  typeFilter.addEventListener("change", startRender);
  retryBtn.addEventListener("click", loadCatalog);

  updateCaughtCounter();
  setStatus("Buscando…");
  startRender();
  loadCatalog();
}
