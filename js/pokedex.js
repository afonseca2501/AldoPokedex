import { cryUrlList, playCry, speakSpanish, stopAllAudio } from "./audio.js";

const CAUGHT_KEY = "pokemundo_caught";
const PAGE_SIZE = 100;
const RENDER_CHUNK = 36;
const TYPE_ORDER = [
  "normal", "fire", "water", "grass", "electric", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
const TYPE_ES = {
  normal: "normal",
  fire: "fuego",
  water: "agua",
  grass: "planta",
  electric: "eléctrico",
  ice: "hielo",
  fighting: "lucha",
  poison: "veneno",
  ground: "tierra",
  flying: "volador",
  psychic: "psíquico",
  bug: "bicho",
  rock: "roca",
  ghost: "fantasma",
  dragon: "dragón",
  dark: "siniestro",
  steel: "acero",
  fairy: "hada",
};
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
const descJobs = new Map();

let catalog = sortCatalog();
let caught = loadCaught();
let totalExpected = 0;
let currentPoke = null;
let modalToken = 0;
let speakToken = 0;
let renderJob = 0;
let renderQueued = false;
let searchTimer = 0;
let loadController = null;

const statusText = document.getElementById("statusText");
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
  const names = (poke.types || []).filter(Boolean).map((type) => TYPE_ES[type] || type);
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

function updateCaughtCounter() {
  const total = totalExpected || catalog.length;
  const captured = caught.size;
  const exact = total > 0 ? Math.min(100, (captured / total) * 100) : 0;
  const label = exact <= 0 ? "0%" : exact < 10 ? `${exact.toFixed(1)}%` : `${Math.round(exact)}%`;
  caughtCount.textContent = `Capturados: ${captured} / ${total}`;
  caughtRatio.textContent = label;
  caughtBar.style.width = captured > 0 ? `max(${exact}%, 10px)` : "0%";
  caughtTrack.setAttribute("aria-valuemax", String(total));
  caughtTrack.setAttribute("aria-valuenow", String(captured));
  caughtTrack.setAttribute("aria-valuetext", `${captured} de ${total} Pokémon capturados`);
  localStorage.setItem(CAUGHT_KEY, JSON.stringify([...caught]));
}

function fillBadges(container, types) {
  container.replaceChildren();
  (types || []).filter(Boolean).forEach((type) => {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = TYPE_ES[type] || type;
    container.appendChild(badge);
  });
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
      pokeGrid.insertBefore(createCard(poke), cursor);
      created += 1;
    }
    if (index < items.length) requestAnimationFrame(step);
  };
  step();
}

function startRender() {
  window.clearTimeout(searchTimer);
  const job = ++renderJob;
  const items = getFiltered();
  if (!items.length) {
    pokeGrid.replaceChildren(emptyMessage());
    return;
  }
  const wanted = new Set(items.map((poke) => poke.id));
  [...pokeGrid.children].forEach((child) => {
    if (!child.classList.contains("poke-card") || !wanted.has(Number(child.dataset.id))) {
      child.remove();
    }
  });
  mergeChunked(items, job);
}

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    startRender();
  });
}

function refreshVisibleTypes() {
  pokeGrid.querySelectorAll(".poke-card").forEach((card) => {
    const poke = byId.get(Number(card.dataset.id));
    const holder = card.querySelector(".poke-types");
    if (poke && holder) fillBadges(holder, poke.types);
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

async function fetchSpanishDescription(poke) {
  let speciesUrl = `https://pokeapi.co/api/v2/pokemon-species/${poke.id}/`;
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${poke.id}/`);
    if (response.ok) {
      const data = await response.json();
      const cries = [data.cries?.latest, data.cries?.legacy].filter(Boolean);
      if (cries.length) poke.cryUrls = cries;
      const types = (data.types || []).map((entry) => entry.type?.name).filter(Boolean);
      if (types.length) poke.types = types;
      if (data.species?.url) speciesUrl = data.species.url;
    }
  } catch {
    // La ficha sigue usable con el arte estático y el resumen en español.
  }

  const response = await fetch(speciesUrl);
  if (!response.ok) return;
  const data = await response.json();
  const entry = (data.flavor_text_entries || []).find((item) => item.language?.name === "es");
  if (!entry?.flavor_text) return;
  poke.desc = cleanFlavor(entry.flavor_text);
  poke.descLang = "es";
  poke.speciesLoaded = true;
}

function ensureSpanishDescription(poke) {
  if (poke.curated && poke.desc) return Promise.resolve();
  if (poke.descLang === "es" && poke.speciesLoaded) return Promise.resolve();
  if (descJobs.has(poke.id)) return descJobs.get(poke.id);
  const job = fetchSpanishDescription(poke)
    .catch(() => {})
    .finally(() => {
      if (!poke.desc || poke.descLang !== "es") {
        poke.desc = genericSpanish(poke);
        poke.descLang = "es";
      }
      poke.speciesLoaded = true;
    });
  descJobs.set(poke.id, job);
  return job;
}

function refreshModal(poke) {
  if (!modalBackdrop.classList.contains("open") || !currentPoke || currentPoke.id !== poke.id) return;
  document.getElementById("modalDesc").textContent = currentDesc(poke);
  fillBadges(document.getElementById("modalTypes"), poke.types);
  const reacting = pokeStage.classList.contains("react");
  pokeStage.className = `${stageClass(poke.types)}${reacting ? " react" : ""}`;
  const card = pokeGrid.querySelector(`.poke-card[data-id="${poke.id}"] .poke-types`);
  if (card) fillBadges(card, poke.types);
}

export function openPokemon(id) {
  const poke = byId.get(Number(id));
  if (!poke) return;
  currentPoke = poke;
  const token = ++modalToken;

  document.getElementById("modalNum").textContent = formatId(poke.id);
  document.getElementById("modalName").textContent = displayName(poke.name);
  fillBadges(document.getElementById("modalTypes"), poke.types);
  document.getElementById("modalDesc").textContent = currentDesc(poke);

  const image = document.getElementById("modalImg");
  image.alt = titleName(poke.name);
  setSprite(image, poke.id);
  pokeStage.className = stageClass(poke.types);
  catchBtn.textContent = caught.has(poke.id) ? "Capturado ✓" : "Marcar capturado";
  modalBackdrop.classList.add("open");
  playCryFor(poke);

  ensureSpanishDescription(poke).then(() => {
    if (token !== modalToken) return;
    refreshModal(poke);
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
  if (!changed) return;
  if (typeFilter.value) startRender();
  else refreshVisibleTypes();
  if (currentPoke) refreshModal(currentPoke);
}

async function loadCatalog() {
  loadController?.abort();
  const controller = new AbortController();
  loadController = controller;
  const { signal } = controller;
  statusText.textContent = "Sincronizando con PokéAPI…";

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
      statusText.textContent = `Cargando catálogo ${loaded} / ${count}…`;
      requestRender();
      await yieldToMain();
    }

    await typePromise;
    if (signal.aborted || loadController !== controller) return;
    applyTypes();
    catalog = sortCatalog();
    requestRender();
    statusText.textContent = `Catálogo completo: ${catalog.length} Pokémon`;
  } catch (error) {
    if (signal.aborted || error.name === "AbortError") return;
    statusText.textContent = catalog.length > KEY_POKEMON.length
      ? `Catálogo parcial (${catalog.length} Pokémon). Pulsa Reintentar API.`
      : "Usando Pokémon clave de respaldo (sin conexión o API lenta).";
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

  speakBtn.addEventListener("click", async () => {
    const poke = currentPoke;
    if (!poke) return;
    const token = ++speakToken;
    speakBtn.disabled = true;
    speakBtn.textContent = "Cargando explicación…";
    try {
      await ensureSpanishDescription(poke);
      if (token !== speakToken || currentPoke !== poke) return;
      refreshModal(poke);
      speakSpanish(
        explanationText(poke),
        () => currentPoke === poke && modalBackdrop.classList.contains("open")
      );
    } finally {
      if (token === speakToken) {
        speakBtn.disabled = false;
        speakBtn.textContent = "Escuchar explicación";
      }
    }
  });

  catchBtn.addEventListener("click", () => {
    if (!currentPoke) return;
    if (caught.has(currentPoke.id)) caught.delete(currentPoke.id);
    else caught.add(currentPoke.id);
    updateCaughtCounter();
    markCaughtTag(currentPoke.id);
    catchBtn.textContent = caught.has(currentPoke.id) ? "Capturado ✓" : "Marcar capturado";
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
  document.getElementById("retryBtn").addEventListener("click", loadCatalog);

  updateCaughtCounter();
  statusText.textContent = "Pokémon clave listos. Cargando catálogo completo…";
  startRender();
  loadCatalog();
}
