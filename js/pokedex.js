import { cryUrlList, playCry, playCatchChime, primeCatchChime, speakSpanish, stopAllAudio } from "./audio.js?v=10";
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
const caughtPercent = document.getElementById("caughtPercent");
const caughtRatio = document.getElementById("caughtRatio");
const caughtBar = document.getElementById("caughtBar");
const caughtTrack = document.getElementById("caughtTrack");
const pokeGrid = document.getElementById("pokeGrid");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const modalBackdrop = document.getElementById("modalBackdrop");
const speakBtn = document.getElementById("speakBtn");
const ballPicker = document.getElementById("ballPicker");
const releaseBtn = document.getElementById("releaseBtn");
const releaseAsk = document.getElementById("releaseAsk");
const releaseAskText = document.getElementById("releaseAskText");
const releaseYes = document.getElementById("releaseYes");
const releaseNo = document.getElementById("releaseNo");
const releaseToast = document.getElementById("releaseToast");
const caughtNote = document.getElementById("caughtNote");
let releaseAsking = false;
let releaseToastTimer = 0;
let selectedBall = "poke";
const pokeStage = document.getElementById("pokeStage");
const throwLayer = document.getElementById("throwLayer");
const throwHint = document.getElementById("throwHint");
const throwTries = document.getElementById("throwTries");
const throwTriesText = document.getElementById("throwTriesText");
const throwTriesStars = document.getElementById("throwTriesStars");
const throwBall = document.getElementById("throwBall");
const throwQuick = document.getElementById("throwQuick");
const catchBurst = document.getElementById("catchBurst");
let catchMode = false;
let catchLock = false;
let catchToken = 0;
let ballDrag = null;
const ATTEMPT_MAX = 5;
const sessionGoals = new Map();
let throwProgress = 0;
let throwGoal = 1;
let goalReady = false;
let goalFrozen = false;


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

export function artworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

const catalogListeners = new Set();

export function onCatalogChange(listener) {
  catalogListeners.add(listener);
  listener(getCatalog(), totalExpected || catalog.length);
}

function notifyCatalog() {
  const total = totalExpected || catalog.length;
  catalogListeners.forEach((listener) => listener(getCatalog(), total));
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

export function caughtIds() {
  return [...caught].sort((a, b) => a - b);
}

export function knownPokemon(id) {
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) return null;
  const found = byId.get(numeric);
  if (found) return found;
  return {
    id: numeric,
    name: "Pokémon",
    types: [],
    cryUrls: cryUrlList(numeric),
  };
}

export function onCaughtChange(listener) {
  caughtListeners.add(listener);
}

function updateCaughtCounter() {
  const total = totalExpected || catalog.length;
  const captured = caught.size;
  const exact = total > 0 ? Math.min(100, (captured / total) * 100) : 0;
  const rounded = Math.round(exact);
  caughtCount.textContent = captured === 1 ? "¡Llevas 1!" : `¡Llevas ${captured}!`;
  caughtPercent.textContent = captured > 0 && rounded === 0 ? "<1%" : `${rounded}%`;
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

function animatedSpriteUrls(poke) {
  const id = Number(poke.id);
  const urls = [
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`,
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`,
  ];
  const slug = String(poke.name || "").toLowerCase();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    urls.push(`https://play.pokemonshowdown.com/sprites/ani/${slug}.gif`);
  }
  return urls;
}

function probeImage(url, ms) {
  return new Promise((resolve) => {
    const probe = new Image();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      resolve(ok);
    };
    const timer = window.setTimeout(() => finish(false), ms);
    probe.onload = () => {
      window.clearTimeout(timer);
      finish(true);
    };
    probe.onerror = () => {
      window.clearTimeout(timer);
      finish(false);
    };
    probe.src = url;
  });
}

const spriteJobs = new WeakMap();

export function setStableSprite(img, id) {
  setSprite(img, id);
}

export function attachAnimatedSprite(img, poke) {
  if (!img || !poke) return;
  const token = (spriteJobs.get(img) || 0) + 1;
  spriteJobs.set(img, token);
  setSprite(img, poke.id);
  const urls = animatedSpriteUrls(poke);
  (async () => {
    for (const url of urls) {
      if (spriteJobs.get(img) !== token) return;
      const ready = await probeImage(url, 2500);
      if (spriteJobs.get(img) !== token) return;
      if (!ready) continue;
      img.dataset.step = "gif";
      img.onerror = () => {
        if (spriteJobs.get(img) !== token) return;
        setSprite(img, poke.id);
      };
      img.src = url;
      return;
    }
  })();
}

function showModalSprite(img, poke) {
  attachAnimatedSprite(img, poke);
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

export function stageAnimClass(types) {
  const main = (types || []).find(Boolean);
  return ANIMATED_TYPES.has(main) ? `anim-${main}` : "anim-default";
}

function stageClass(types) {
  return `stage ${stageAnimClass(types)}`;
}

function pulseStage() {
  pokeStage.classList.remove("react");
  void pokeStage.offsetWidth;
  pokeStage.classList.add("react");
  window.setTimeout(() => pokeStage.classList.remove("react"), 560);
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
    const seenCries = new Set();
    poke.cryUrls = [pokemon.cries?.latest, pokemon.cries?.legacy, ...cryUrlList(poke.id)].filter((url) => {
      const clean = String(url || "").trim();
      if (!clean || seenCries.has(clean)) return false;
      seenCries.add(clean);
      return true;
    });
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

function randomInt(min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function stagesFor(poke) {
  if (!poke) return null;
  return (poke.evolutionChainUrl && chainCache.get(poke.evolutionChainUrl))
    || chainBySpecies.get(poke.id)
    || (poke.speciesId ? chainBySpecies.get(poke.speciesId) : null)
    || null;
}

function goalFromStages(poke, stages) {
  const stage = stages.find((item) => item.id === currentStageId(poke, stages));
  const depth = stage ? stage.depth : 0;
  if (depth <= 0) return 1;
  // Las evoluciones (2.ª etapa en adelante) sortean entre 2 y 5. El máximo es 5.
  return randomInt(2, ATTEMPT_MAX);
}

function knownGoal(poke) {
  if (!poke) return null;
  if (sessionGoals.has(poke.id)) return sessionGoals.get(poke.id);
  const stages = stagesFor(poke);
  if (!stages?.length) return null;
  const goal = goalFromStages(poke, stages);
  sessionGoals.set(poke.id, goal);
  return goal;
}

function resetEncounter() {
  throwProgress = 0;
  throwGoal = 1;
  goalReady = false;
  goalFrozen = false;
}

async function ensureGoal(poke, token) {
  const ready = knownGoal(poke);
  if (ready != null) {
    throwGoal = ready;
    goalReady = true;
    return ready;
  }
  await ensureProfile(poke);
  if (token !== catchToken || currentPoke !== poke) return null;
  if (poke.evolutionChainUrl) await loadChain(poke.evolutionChainUrl);
  if (token !== catchToken || currentPoke !== poke) return null;
  const settled = knownGoal(poke);
  if (settled != null) {
    throwGoal = settled;
    goalReady = true;
    return settled;
  }
  sessionGoals.set(poke.id, 1);
  throwGoal = 1;
  goalReady = true;
  return 1;
}

function applyKnownGoal(poke) {
  if (!poke || goalFrozen) return;
  const ready = knownGoal(poke);
  if (ready == null) return;
  throwGoal = ready;
  goalReady = true;
  paintTries();
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
  const extras = ["react", "is-catching", "is-flash", "is-absorb"].filter((name) => pokeStage.classList.contains(name));
  pokeStage.className = [stageClass(poke.types), ...extras].join(" ");
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
  clearReleaseAsk();
  clearReleaseToast();
  cancelCatch();
  currentPoke = poke;
  const token = ++modalToken;

  document.getElementById("modalNum").textContent = formatId(poke.id);
  document.getElementById("modalName").textContent = displayName(poke.name);
  fillBadges(document.getElementById("modalTypes"), poke.types);
  showWeaknesses(poke.types);
  document.getElementById("modalDesc").textContent = currentDesc(poke);

  const image = document.getElementById("modalImg");
  image.alt = titleName(poke.name);
  showModalSprite(image, poke);
  pokeStage.className = stageClass(poke.types);
  syncCatchControls();
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
    applyKnownGoal(poke);
  });
}

function clearReleaseAsk() {
  releaseAsking = false;
  releaseAsk.hidden = true;
}

function clearReleaseToast() {
  window.clearTimeout(releaseToastTimer);
  releaseToast.hidden = true;
  releaseToast.textContent = "";
}

function showReleaseToast(text) {
  window.clearTimeout(releaseToastTimer);
  releaseToast.textContent = text;
  releaseToast.hidden = false;
  releaseToastTimer = window.setTimeout(() => {
    releaseToast.hidden = true;
  }, 2400);
}

function closeModal() {
  clearReleaseAsk();
  clearReleaseToast();
  cancelCatch();
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
    notifyCatalog();

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
      notifyCatalog();
      const loaded = Math.min(offset + data.results.length, count);
      setStatus("Buscando…");
      requestRender();
      await yieldToMain();
    }

    await typePromise;
    if (signal.aborted || loadController !== controller) return;
    applyTypes();
    catalog = sortCatalog();
    notifyCatalog();
    requestRender();
    setStatus("");
  } catch (error) {
    if (signal.aborted || error.name === "AbortError") return;
    setStatus(catalog.length > KEY_POKEMON.length ? "Faltan algunos. Prueba otra vez." : "Sin internet.", true);
  }
}

function waitCatch(ms, token) {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(token === catchToken), ms);
  });
}

function paintBall() {
  throwBall.classList.remove("ball-poke", "ball-great", "ball-ultra");
  throwBall.classList.add(`ball-${selectedBall}`);
}

function restBall() {
  throwBall.classList.remove("is-shaking", "is-flying");
  throwBall.style.visibility = "";
  throwQuick.hidden = false;
  throwBall.style.left = "50%";
  throwBall.style.top = "auto";
  throwBall.style.bottom = "52px";
  throwBall.style.marginLeft = "-32px";
  throwBall.style.transform = "";
  paintBall();
}

function setThrowHint(text, near = false) {
  throwHint.hidden = !text;
  throwHint.textContent = text;
  throwHint.classList.toggle("is-near", Boolean(text) && near);
}

function paintTries() {
  if (!throwTries) return;
  if (!catchMode) {
    throwTries.hidden = true;
    return;
  }
  throwTries.hidden = false;
  if (!goalReady) {
    throwTriesText.textContent = "Preparando intento…";
    throwTriesStars.replaceChildren();
    throwTries.setAttribute("aria-label", "Preparando intento");
    return;
  }
  const goal = Math.max(1, Math.min(ATTEMPT_MAX, throwGoal));
  const done = Math.min(throwProgress, goal);
  throwTriesText.textContent = `Intento ${done} / ${goal}`;
  throwTries.setAttribute("aria-label", `Intento ${done} de ${goal}`);
  throwTriesStars.replaceChildren();
  for (let index = 0; index < goal; index += 1) {
    const star = document.createElement("span");
    star.className = index < done ? "try-star is-on" : "try-star";
    star.textContent = index < done ? "★" : "☆";
    throwTriesStars.append(star);
  }
}

function clearStars() {
  catchBurst.querySelectorAll(".catch-star").forEach((star) => star.remove());
}

function showStars() {
  clearStars();
  const colors = ["#f97316", "#fde68a", "#ffffff", "#93c5fd", "#22c55e"];
  for (let index = 0; index < 14; index += 1) {
    const star = document.createElement("span");
    const angle = (index / 14) * Math.PI * 2;
    star.className = "catch-star";
    star.style.background = colors[index % colors.length];
    star.style.setProperty("--x", `${Math.cos(angle) * 108}px`);
    star.style.setProperty("--y", `${Math.sin(angle) * 78}px`);
    catchBurst.append(star);
  }
  catchBurst.hidden = false;
}

function cancelCatch() {
  catchToken += 1;
  catchMode = false;
  catchLock = false;
  ballDrag = null;
  resetEncounter();
  pokeStage.classList.remove("is-catching", "is-flash", "is-absorb");
  throwLayer.hidden = true;
  catchBurst.hidden = true;
  throwQuick.disabled = false;
  clearStars();
  restBall();
  throwBall.classList.remove("is-back");
  setThrowHint("¡Desliza hacia arriba!");
  paintTries();
}

function selectBall(kind) {
  if (!kind || catchLock) return;
  selectedBall = kind;
  ballPicker.querySelectorAll(".ball-choice").forEach((button) => {
    const chosen = button.dataset.ball === kind;
    button.classList.toggle("is-selected", chosen);
    button.setAttribute("aria-pressed", chosen ? "true" : "false");
  });
  paintBall();
  if (currentPoke && !caught.has(currentPoke.id)) beginCatchMode();
}

function syncCatchControls() {
  if (!currentPoke) return;
  const held = caught.has(currentPoke.id);
  if (!held) clearReleaseAsk();
  caughtNote.hidden = !held;
  releaseBtn.hidden = !held || releaseAsking;
  releaseAsk.hidden = !held || !releaseAsking;
  ballPicker.hidden = releaseAsking;
  ballPicker.classList.toggle("is-held", held);
  ballPicker.querySelectorAll(".ball-choice").forEach((button) => {
    button.disabled = held;
  });
  if (held && !catchLock) {
    throwLayer.hidden = true;
    pokeStage.classList.remove("is-catching");
    return;
  }
  if (!held && !catchLock) beginCatchMode();
}

function beginCatchMode() {
  if (!currentPoke || caught.has(currentPoke.id) || catchLock) return;
  catchMode = true;
  pokeStage.classList.add("is-catching");
  throwLayer.hidden = false;
  catchBurst.hidden = true;
  throwQuick.disabled = false;
  restBall();
  applyKnownGoal(currentPoke);
  setThrowHint(throwProgress > 0 ? "¡Casi! Inténtalo de nuevo" : "¡Desliza hacia arriba!", throwProgress > 0);
  paintTries();
}

export function markCaught(id) {
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0 || caught.has(numeric)) return false;
  caught.add(numeric);
  updateCaughtCounter();
  markCaughtTag(numeric);
  if (currentPoke && currentPoke.id === numeric) syncCatchControls();
  return true;
}

function commitCatch(poke) {
  if (!markCaught(poke?.id)) return;
  if (visibleChain) renderEvolution(visibleChain, poke, false);
}

function finishCatchUi() {
  catchMode = false;
  catchLock = false;
  throwLayer.hidden = true;
  catchBurst.hidden = true;
  throwQuick.disabled = false;
  pokeStage.classList.remove("is-catching", "is-flash", "is-absorb");
  clearStars();
  restBall();
  syncCatchControls();
}

async function startCaptureSequence(token) {
  const poke = currentPoke;
  throwQuick.disabled = true;
  setThrowHint("");
  pokeStage.classList.add("is-flash");
  if (!(await waitCatch(280, token))) return;
  pokeStage.classList.remove("is-flash");
  pokeStage.classList.add("is-absorb");
  if (!(await waitCatch(420, token))) return;
  throwBall.style.transform = "none";
  throwBall.classList.add("is-shaking");
  if (!(await waitCatch(980, token))) return;
  if (token !== catchToken || currentPoke !== poke) return;
  throwBall.classList.remove("is-shaking");
  throwBall.style.visibility = "hidden";
  pokeStage.classList.remove("is-absorb");
  showStars();
  playCatchChime();
  commitCatch(poke);
  if (!(await waitCatch(1400, token))) return;
  finishCatchUi();
}

function launchThrow() {
  if (!catchMode || catchLock || !currentPoke) return;
  catchLock = true;
  throwBall.classList.add("is-flying");
  throwQuick.hidden = true;
  setThrowHint("");
  primeCatchChime();
  const token = catchToken;
  const stageBox = throwLayer.getBoundingClientRect();
  const ballBox = throwBall.getBoundingClientRect();
  const imageBox = document.getElementById("modalImg").getBoundingClientRect();
  const startX = ballBox.left - stageBox.left;
  const startY = ballBox.top - stageBox.top;
  const endX = imageBox.left - stageBox.left + imageBox.width / 2 - ballBox.width / 2;
  const endY = imageBox.top - stageBox.top + imageBox.height / 2 - ballBox.height / 2;
  const travel = Math.hypot(endX - startX, endY - startY);
  const duration = Math.max(320, Math.min(720, travel * 1.35));
  const arc = Math.max(40, Math.min(120, travel * 0.38));
  const started = performance.now();
  throwBall.style.bottom = "auto";
  throwBall.style.marginLeft = "0";
  const step = (now) => {
    if (token !== catchToken) return;
    const progress = Math.min(1, (now - started) / duration);
    const ease = 1 - (1 - progress) ** 2;
    const x = startX + (endX - startX) * ease;
    const y = startY + (endY - startY) * ease - Math.sin(Math.PI * progress) * arc;
    throwBall.style.left = `${x}px`;
    throwBall.style.top = `${y}px`;
    throwBall.style.transform = `rotate(${progress * 640}deg)`;
    if (progress < 1) requestAnimationFrame(step);
    else resolveThrow(token);
  };
  requestAnimationFrame(step);
}

async function resolveThrow(token) {
  const poke = currentPoke;
  if (token !== catchToken || !poke) return;
  if (!goalReady) {
    const goal = await ensureGoal(poke, token);
    if (goal == null || token !== catchToken || currentPoke !== poke) return;
    paintTries();
  }
  goalFrozen = true;
  throwProgress += 1;
  paintTries();
  if (throwProgress >= throwGoal) startCaptureSequence(token);
  else startNearMiss(token);
}

async function startNearMiss(token) {
  throwQuick.disabled = true;
  throwBall.classList.remove("is-flying");
  throwBall.classList.add("is-shaking");
  setThrowHint("¡Casi! Inténtalo de nuevo", true);
  if (!(await waitCatch(520, token))) return;
  if (token !== catchToken) return;
  const stageBox = throwLayer.getBoundingClientRect();
  throwBall.classList.remove("is-shaking");
  throwBall.classList.add("is-back");
  throwBall.style.transform = "";
  throwBall.style.left = `${stageBox.width / 2 - 32}px`;
  throwBall.style.top = `${Math.max(8, stageBox.height - 116)}px`;
  if (!(await waitCatch(280, token))) return;
  if (token !== catchToken) return;
  throwBall.classList.remove("is-back");
  restBall();
  catchLock = false;
  throwQuick.disabled = false;
  setThrowHint("¡Casi! Inténtalo de nuevo", true);
  paintTries();
}

function releaseBall(event) {
  if (!ballDrag || event.pointerId !== ballDrag.id) return;
  const dx = event.clientX - ballDrag.x;
  const dy = event.clientY - ballDrag.y;
  const speed = ballDrag.vy;
  const distance = Math.hypot(dx, dy);
  ballDrag = null;
  if (distance < 16 || -dy > 56 || speed < -0.4) {
    launchThrow();
    return;
  }
  restBall();
  setThrowHint("¡Un poco más arriba!");
}

function moveBall(event) {
  if (!ballDrag || event.pointerId !== ballDrag.id || catchLock) return;
  const now = performance.now();
  const dt = Math.max(now - ballDrag.time, 8);
  ballDrag.vy = (event.clientY - ballDrag.lastY) / dt;
  ballDrag.lastY = event.clientY;
  ballDrag.time = now;
  const dx = event.clientX - ballDrag.x;
  const dy = event.clientY - ballDrag.y;
  throwBall.style.bottom = "auto";
  throwBall.style.marginLeft = "0";
  throwBall.style.left = `${ballDrag.originX + dx}px`;
  throwBall.style.top = `${ballDrag.originY + dy}px`;
  throwBall.style.transform = `rotate(${dx * 0.35}deg)`;
}

export function initPokedex() {
  pokeStage.addEventListener("click", (event) => {
    if (catchLock || event.target.closest("#throwBall, #throwQuick, #catchBurst")) return;
    if (currentPoke) playCryFor(currentPoke);
  });
  pokeStage.addEventListener("keydown", (event) => {
    if (event.target !== pokeStage) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (catchMode || catchLock) return;
    if (currentPoke) playCryFor(currentPoke);
  });

  throwBall.addEventListener("pointerdown", (event) => {
    if (!catchMode || catchLock) return;
    event.preventDefault();
    event.stopPropagation();
    const stageBox = throwLayer.getBoundingClientRect();
    const ballBox = throwBall.getBoundingClientRect();
    ballDrag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastY: event.clientY,
      time: performance.now(),
      vy: 0,
      originX: ballBox.left - stageBox.left,
      originY: ballBox.top - stageBox.top,
    };
    try { throwBall.setPointerCapture(event.pointerId); } catch { /* el arrastre sigue con los eventos de la ventana */ }
  });
  throwBall.addEventListener("pointermove", moveBall);
  throwBall.addEventListener("pointerup", releaseBall);
  throwBall.addEventListener("pointercancel", (event) => {
    if (!ballDrag || event.pointerId !== ballDrag.id) return;
    ballDrag = null;
    if (!catchLock) restBall();
  });
  window.addEventListener("pointermove", moveBall);
  window.addEventListener("pointerup", releaseBall);
  throwBall.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    launchThrow();
  });
  throwQuick.addEventListener("click", (event) => {
    event.stopPropagation();
    launchThrow();
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

  ballPicker.addEventListener("click", (event) => {
    const choice = event.target.closest(".ball-choice");
    if (!choice) return;
    selectBall(choice.dataset.ball);
  });
  releaseBtn.addEventListener("click", () => {
    if (!currentPoke || catchLock || !caught.has(currentPoke.id)) return;
    releaseAsking = true;
    releaseAskText.textContent = `¿Soltar a ${titleName(currentPoke.name)}?`;
    syncCatchControls();
  });
  releaseNo.addEventListener("click", () => {
    clearReleaseAsk();
    syncCatchControls();
  });
  releaseYes.addEventListener("click", () => {
    if (!currentPoke || !caught.has(currentPoke.id)) return;
    const name = titleName(currentPoke.name);
    caught.delete(currentPoke.id);
    updateCaughtCounter();
    markCaughtTag(currentPoke.id);
    if (visibleChain) renderEvolution(visibleChain, currentPoke, false);
    clearReleaseAsk();
    syncCatchControls();
    showReleaseToast(`${name} regresó a su hábitat`);
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
