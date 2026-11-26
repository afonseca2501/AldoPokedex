// Claro de prueba para Aldo y Enzo.
// Cada dibujo busca primero su .webp en assets/adventure/.
// Si todavía no está, se ve la figura con su nombre.
// Esta escena no reproduce gritos ni lee texto en voz alta.

import {
  artworkUrl,
  getCatalog,
  isCaught,
  knownPokemon,
  markCaught,
  onCatalogChange,
  onCaughtChange,
  spriteUrl,
  titleName,
} from "./pokedex.js?v=22";

const HERO_KEY = "pokemundo_hero";
const STATE_KEY = "pokemundo_adventure";
const TEAM_KEY = "pokemundo_team";
const REACH = 58;
const HERO_PAD = 18;
const PAL_PAD = 12;

const SVG = {
  person: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="16" r="10" fill="#0f172a"/><path d="M16 58c2-16 10-20 16-20s14 4 16 20" fill="#0f172a"/></svg>`,
  arbol: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 56 40H8Z" fill="#14532d"/><rect x="28" y="38" width="8" height="18" fill="#78350f"/></svg>`,
  roca: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 48 22 18h22l14 30Z" fill="#57534e"/></svg>`,
  arbusto: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="22" cy="38" r="14" fill="#4d7c0f"/><circle cx="42" cy="36" r="16" fill="#65a30d"/></svg>`,
  cofre: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="26" width="48" height="28" rx="4" fill="#d97706"/><path d="M8 26h48v10H8z" fill="#fbbf24"/></svg>`,
  baya: `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="36" r="16" fill="#f59e0b"/><path d="M32 18c8-10 16-6 14 0" fill="none" stroke="#166534" stroke-width="4"/></svg>`,
  linterna: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="26" y="6" width="12" height="8" fill="#fde68a"/><path d="M20 14h24l6 16H14Z" fill="#facc15"/><rect x="24" y="30" width="16" height="24" rx="3" fill="#1d4ed8"/></svg>`,
  flauta: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="28" width="52" height="10" rx="5" fill="#f8fafc"/><circle cx="22" cy="33" r="2.2" fill="#0f172a"/><circle cx="34" cy="33" r="2.2" fill="#0f172a"/><circle cx="46" cy="33" r="2.2" fill="#0f172a"/></svg>`,
};

// Para cambiar un dibujo, deja el .webp (o .png) con este nombre.
const ASSETS = {
  "hero-aldo": { label: "Aldo", file: "assets/adventure/aldo.webp", tint: "#fdba74", shape: "person" },
  "hero-enzo": { label: "Enzo", file: "assets/adventure/enzo.webp", tint: "#93c5fd", shape: "person" },
  "zone-bosque": { label: "Bosque", file: "assets/adventure/bosque.webp" },
  "zone-playa": { label: "Playa", file: "assets/adventure/playa.webp" },
  "zone-volcan": { label: "Volcán", file: "assets/adventure/volcan.webp" },
  "zone-cueva": { label: "Cueva", file: "assets/adventure/cueva.webp" },
  "zone-nieve": { label: "Nieve", file: "assets/adventure/nieve.webp" },
  "zone-parque": { label: "Parque", file: "assets/adventure/parque.webp" },
  cofre: { label: "Cofre", file: "assets/adventure/cofre.webp", tint: "#fbbf24", shape: "cofre" },
  "item-baya": { label: "Baya", file: "assets/adventure/baya-dorada.webp", tint: "#fde68a", shape: "baya" },
  "item-linterna": { label: "Linterna", file: "assets/adventure/linterna.webp", tint: "#fef08a", shape: "linterna" },
  "item-flauta": { label: "Flauta", file: "assets/adventure/flauta.webp", tint: "#e0f2fe", shape: "flauta" },
  "obs-arbol": { label: "Árbol", file: "assets/adventure/arbol.webp", tint: "#86efac", shape: "arbol" },
  "obs-roca": { label: "Roca", file: "assets/adventure/roca.webp", tint: "#d6d3d1", shape: "roca" },
  "obs-arbusto": { label: "Arbusto", file: "assets/adventure/arbusto.webp", tint: "#bef264", shape: "arbusto" },
};

const ZONES = {
  bosque: { name: "Bosque" },
  playa: { name: "Playa" },
  volcan: { name: "Volcán" },
  cueva: { name: "Cueva" },
  nieve: { name: "Nieve" },
  parque: { name: "Parque" },
};

const ITEMS = {
  baya: { id: "baya", name: "Baya Dorada", asset: "item-baya", ask: "¡Quiero la Baya Dorada!" },
  linterna: { id: "linterna", name: "Linterna", asset: "item-linterna", ask: "¡Quiero la Linterna!" },
  flauta: { id: "flauta", name: "Flauta", asset: "item-flauta", ask: "¡Quiero la Flauta!" },
};

const LAYOUT = {
  start: { x: 12, y: 86 },
  obstacles: [
    { x: 40, y: 44, r: 8, kind: "arbol" },
    { x: 24, y: 34, r: 6.5, kind: "arbol" },
    { x: 66, y: 36, r: 6.5, kind: "roca" },
    { x: 62, y: 66, r: 6.5, kind: "arbusto" },
    { x: 34, y: 62, r: 6, kind: "arbusto" },
  ],
  spots: [
    { x: 16, y: 22, item: "baya" },
    { x: 84, y: 22, item: "linterna" },
    { x: 86, y: 48, item: "flauta" },
  ],
  chests: [
    { x: 14, y: 48, item: "baya" },
    { x: 78, y: 70, item: "linterna" },
    { x: 50, y: 74, item: "flauta" },
  ],
};

const field = document.getElementById("advField");
const blocks = document.getElementById("advBlocks");
const actors = document.getElementById("advActors");
const partyEl = document.getElementById("advParty");
const zonesEl = document.getElementById("advZones");
const heroEl = document.getElementById("advHero");
const heroImg = document.getElementById("advHeroImg");
const heroMark = document.getElementById("advHeroMark");
const status = document.getElementById("advStatus");
const bagItems = document.getElementById("advBagItems");
const bagEmpty = document.getElementById("advBagEmpty");
const burst = document.getElementById("advBurst");
const burstText = document.getElementById("advBurstText");

let heroId = "aldo";
let hero = { ...LAYOUT.start };
let facing = 1;
let goal = null;
let frame = 0;
let lastTick = 0;
let stuck = 0;
let wild = [];
let sceneReady = false;
let state = loadState();
let drag = null;
let ghost = null;
let burstTimer = 0;
let bound = false;
let party = [];
let partySig = "";
const trail = [{ ...LAYOUT.start }];

function loadState() {
  const fresh = {
    zone: "bosque",
    open: { baya: false, linterna: false, flauta: false },
    bag: [],
  };
  try {
    const raw = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
    if (ZONES[raw.zone]) fresh.zone = raw.zone;
    if (raw.open && typeof raw.open === "object") {
      Object.keys(fresh.open).forEach((id) => {
        fresh.open[id] = Boolean(raw.open[id]);
      });
    } else if (raw.chestOpen) {
      fresh.open.baya = true;
      if (raw.item === "berry" || raw.item === "baya") fresh.bag.push("baya");
    }
    if (Array.isArray(raw.bag)) {
      fresh.bag = raw.bag.filter((id) => ITEMS[id] && !fresh.bag.includes(id));
    }
    return fresh;
  } catch {
    return fresh;
  }
}

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function loadHero() {
  return localStorage.getItem(HERO_KEY) === "enzo" ? "enzo" : "aldo";
}

function setStatus(text) {
  if (status) status.textContent = text;
}

function heroName() {
  return heroId === "enzo" ? "Enzo" : "Aldo";
}

function lineForState() {
  const pending = wild.find((poke) => !isCaught(poke.id));
  if (state.bag.length && pending) {
    const item = ITEMS[pending.item];
    return state.bag.includes(pending.item)
      ? `${titleName(pending.name)} quiere la ${item.name}. Arrástrala o tócala.`
      : `Sigue hasta el cofre de la ${item.name}.`;
  }
  if (Object.values(state.open).some((open) => !open)) {
    return `Estás en ${ZONES[state.zone].name}. Toca el suelo: ${heroName()} rodea los obstáculos.`;
  }
  if (!pending) return "¡El claro celebró contigo! Mira tu colección.";
  return "Los cofres ya se abrieron. Sigue tocando para caminar.";
}

function sourcesOf(asset) {
  const file = asset.file;
  return [file, file.replace(/\.webp$/i, ".png")];
}

function mountPlaceholder(host, assetId) {
  const asset = ASSETS[assetId];
  if (!asset) return;
  host.replaceChildren();
  const img = document.createElement("img");
  img.alt = "";
  img.hidden = true;
  const figure = document.createElement("span");
  figure.className = "ph-figure";
  figure.style.setProperty("--ph", asset.tint || "#fde68a");
  figure.innerHTML = `${SVG[asset.shape] || ""}<b>${asset.label}</b>`;
  host.append(img, figure);
  let index = 0;
  const list = sourcesOf(asset);
  const fail = () => {
    index += 1;
    if (index >= list.length) {
      img.onerror = null;
      img.hidden = true;
      figure.hidden = false;
      return;
    }
    img.src = list[index];
  };
  img.onload = () => {
    img.hidden = false;
    figure.hidden = true;
  };
  img.onerror = fail;
  figure.hidden = false;
  img.src = list[0];
}

function paintAvatar() {
  const asset = ASSETS[heroId === "enzo" ? "hero-enzo" : "hero-aldo"];
  heroMark.style.setProperty("--ph", asset.tint);
  heroMark.innerHTML = `${SVG.person}<b>${asset.label}</b>`;
  let index = 0;
  const list = sourcesOf(asset);
  const fail = () => {
    index += 1;
    if (index >= list.length) {
      heroImg.onerror = null;
      heroImg.hidden = true;
      heroImg.removeAttribute("src");
      heroMark.hidden = false;
      return;
    }
    heroImg.src = list[index];
  };
  heroImg.onload = () => {
    heroImg.hidden = false;
    heroMark.hidden = true;
  };
  heroImg.onerror = fail;
  heroImg.hidden = true;
  heroMark.hidden = false;
  heroImg.src = list[0];
}

function applyHero(id, save) {
  heroId = id === "enzo" ? "enzo" : "aldo";
  if (save) localStorage.setItem(HERO_KEY, heroId);
  document.querySelectorAll(".hero-btn").forEach((button) => {
    const on = button.dataset.hero === heroId;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
  });
  heroEl.classList.toggle("is-enzo", heroId === "enzo");
  paintAvatar();
  placeHero();
}

function placeHero() {
  heroEl.style.left = `${hero.x}%`;
  heroEl.style.top = `${hero.y}%`;
  heroImg.style.transform = facing < 0 ? "scaleX(-1)" : "";
}

function fieldBox() {
  return field.getBoundingClientRect();
}

function unitOf(rect) {
  return Math.min(rect.width, rect.height);
}

function blocked(px, py, rect, pad) {
  const unit = unitOf(rect);
  return LAYOUT.obstacles.some((obs) => {
    const ox = (obs.x / 100) * rect.width;
    const oy = (obs.y / 100) * rect.height;
    return Math.hypot(px - ox, py - oy) < (obs.r / 100) * unit + pad;
  });
}

function inside(px, py, rect) {
  return px >= 20 && py >= 20 && px <= rect.width - 20 && py <= rect.height - 20;
}

function nearestFree(px, py, rect, pad) {
  if (rect.width < 40) return { x: px, y: py };
  if (inside(px, py, rect) && !blocked(px, py, rect, pad)) return { x: px, y: py };
  const limit = Math.max(rect.width, rect.height);
  for (let ring = 8; ring < limit; ring += 8) {
    for (let step = 0; step < 24; step += 1) {
      const ang = (Math.PI * 2 * step) / 24 + ring * 0.01;
      const x = px + Math.cos(ang) * ring;
      const y = py + Math.sin(ang) * ring;
      if (!inside(x, y, rect) || blocked(x, y, rect, pad)) continue;
      return { x, y };
    }
  }
  return {
    x: (LAYOUT.start.x / 100) * rect.width,
    y: (LAYOUT.start.y / 100) * rect.height,
  };
}

function nearestObstacle(px, py, rect) {
  const unit = unitOf(rect);
  let best = null;
  LAYOUT.obstacles.forEach((obs) => {
    const ox = (obs.x / 100) * rect.width;
    const oy = (obs.y / 100) * rect.height;
    const rad = (obs.r / 100) * unit;
    const gap = Math.hypot(px - ox, py - oy) - rad;
    if (!best || gap < best.gap) best = { ox, oy, gap };
  });
  return best;
}

function propose(px, py, tx, ty, travel, rect, pad) {
  const dx = tx - px;
  const dy = ty - py;
  const dist = Math.hypot(dx, dy);
  const face = dx < 0 ? -1 : 1;
  if (dist < 4) return { x: tx, y: ty, done: true, face, moved: dist };
  const step = Math.min(dist, travel);
  const nx = px + (dx / dist) * step;
  const ny = py + (dy / dist) * step;
  const options = [
    { x: nx, y: ny },
    { x: nx, y: py },
    { x: px, y: ny },
  ];
  const direct = options.find((point) => inside(point.x, point.y, rect) && !blocked(point.x, point.y, rect, pad));
  if (direct) return { ...direct, done: false, face, moved: Math.hypot(direct.x - px, direct.y - py) };
  const obs = nearestObstacle(px, py, rect);
  if (!obs) return { x: px, y: py, done: false, face, moved: 0 };
  const vx = px - obs.ox;
  const vy = py - obs.oy;
  const len = Math.hypot(vx, vy) || 1;
  const orbit = [
    { x: px + (-vy / len) * step, y: py + (vx / len) * step },
    { x: px + (vy / len) * step, y: py + (-vx / len) * step },
  ]
    .filter((point) => inside(point.x, point.y, rect) && !blocked(point.x, point.y, rect, pad))
    .sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty));
  if (!orbit.length) return { x: px, y: py, done: false, face, moved: 0 };
  return { ...orbit[0], done: false, face: orbit[0].x < px ? -1 : 1, moved: Math.hypot(orbit[0].x - px, orbit[0].y - py) };
}

function toPercent(px, py, rect) {
  return { x: (px / rect.width) * 100, y: (py / rect.height) * 100 };
}

function paintZone() {
  const id = ZONES[state.zone] ? state.zone : "bosque";
  state.zone = id;
  field.dataset.zone = id;
  document.querySelectorAll(".zone-btn").forEach((button) => {
    const on = button.dataset.zone === id;
    button.classList.toggle("is-on", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const asset = ASSETS[`zone-${id}`];
  const probe = new Image();
  probe.onload = () => {
    if (field.dataset.zone === id) field.style.backgroundImage = `url("${asset.file}")`;
  };
  probe.onerror = () => {
    if (field.dataset.zone === id) field.style.backgroundImage = "";
  };
  probe.src = asset.file;
}

function paintBlocks() {
  blocks.replaceChildren();
  const rect = fieldBox();
  const unit = rect.width > 40 ? unitOf(rect) : 360;
  LAYOUT.obstacles.forEach((obs) => {
    const el = document.createElement("div");
    el.className = `adv-block adv-block-${obs.kind}`;
    el.dataset.x = String(obs.x);
    el.dataset.y = String(obs.y);
    el.style.left = `${obs.x}%`;
    el.style.top = `${obs.y}%`;
    const size = ((obs.r * 2) / 100) * unit;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.setAttribute("aria-label", ASSETS[`obs-${obs.kind}`].label);
    mountPlaceholder(el, `obs-${obs.kind}`);
    blocks.append(el);
  });
}

function renderBag() {
  bagItems.replaceChildren();
  state.bag.forEach((id) => {
    const item = ITEMS[id];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "adv-item";
    button.dataset.item = id;
    button.textContent = item.name;
    bagItems.append(button);
  });
  bagEmpty.hidden = state.bag.length > 0;
}

function paintActors() {
  actors.replaceChildren();
  wild.forEach((poke) => {
    const spot = LAYOUT.spots.find((row) => row.item === poke.item) || LAYOUT.spots[0];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "adv-spot";
    const caught = isCaught(poke.id);
    if (!caught) button.classList.add("is-ask");
    button.dataset.x = String(spot.x);
    button.dataset.y = String(spot.y);
    button.dataset.id = String(poke.id);
    button.dataset.item = poke.item;
    button.style.left = `${spot.x}%`;
    button.style.top = `${spot.y}%`;
    button.setAttribute("aria-label", titleName(poke.name));
    const img = document.createElement("img");
    img.alt = "";
    img.width = 64;
    img.height = 64;
    img.src = spriteUrl(poke.id);
    img.addEventListener("error", () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = "1";
        img.src = artworkUrl(poke.id);
      }
    });
    button.append(img);
    if (caught) {
      const ball = document.createElement("span");
      ball.className = "adv-caught-ball";
      ball.setAttribute("aria-hidden", "true");
      button.append(ball);
    } else {
      const bubble = document.createElement("span");
      bubble.className = "adv-bubble";
      bubble.textContent = ITEMS[poke.item].ask;
      button.append(bubble);
    }
    actors.append(button);
  });

  LAYOUT.chests.forEach((chest) => {
    const open = Boolean(state.open[chest.item]);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "adv-chest";
    if (open) button.classList.add("is-open");
    button.dataset.x = String(chest.x);
    button.dataset.y = String(chest.y);
    button.dataset.item = chest.item;
    button.style.left = `${chest.x}%`;
    button.style.top = `${chest.y}%`;
    button.setAttribute("aria-label", open ? `Cofre abierto de ${ITEMS[chest.item].name}` : `Cofre de ${ITEMS[chest.item].name}`);
    mountPlaceholder(button, "cofre");
    const tag = document.createElement("span");
    tag.className = "adv-chest-tag";
    tag.textContent = ITEMS[chest.item].name;
    button.append(tag);
    actors.append(button);
  });
  renderBag();
}

function buildWild(list) {
  if (sceneReady || !Array.isArray(list) || !list.length) return;
  if (wild.length && Object.values(state.open).some(Boolean)) return;
  const pool = list.filter((poke) => poke && poke.id).sort((a, b) => a.id - b.id);
  const fresh = pool.filter((poke) => !isCaught(poke.id));
  const source = fresh.length ? fresh : pool;
  const richer = pool.some((poke) => poke.id === 3) || pool.length > 6;
  const itemIds = Object.keys(ITEMS);
  const next = source.slice(0, itemIds.length).map((poke, index) => ({ ...poke, item: itemIds[index] }));
  if (!next.length) return;
  const same = next.map((poke) => poke.id).join() === wild.map((poke) => poke.id).join();
  wild = next;
  if (!same) {
    paintActors();
    setStatus(lineForState());
  }
  if (richer) sceneReady = true;
}

function partyIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(TEAM_KEY) || "null");
    const slots = Array.isArray(raw?.slots) ? raw.slots : [];
    return [0, 1, 2].map((index) => {
      const id = Number(slots[index]);
      return Number.isInteger(id) && id > 0 ? id : 0;
    });
  } catch {
    return [0, 0, 0];
  }
}

function paintParty() {
  partyEl.replaceChildren();
  party.forEach((pal) => {
    if (!pal.id) return;
    const el = document.createElement("div");
    el.className = "adv-follower";
    el.dataset.id = String(pal.id);
    el.style.left = `${pal.x}%`;
    el.style.top = `${pal.y}%`;
    el.setAttribute("aria-hidden", "true");
    const img = document.createElement("img");
    img.alt = "";
    img.src = spriteUrl(pal.id);
    const mark = document.createElement("span");
    mark.className = "ph-figure";
    mark.hidden = true;
    mark.textContent = titleName(knownPokemon(pal.id).name);
    img.addEventListener("error", () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = "1";
        img.src = artworkUrl(pal.id);
        return;
      }
      img.hidden = true;
      mark.hidden = false;
    });
    el.append(img, mark);
    partyEl.append(el);
  });
}

function syncParty() {
  const ids = partyIds();
  const sig = ids.join(",");
  if (sig === partySig && partyEl.childElementCount) return;
  partySig = sig;
  party = ids.map((id, index) => {
    const prev = party.find((pal) => pal.id === id);
    if (prev) return prev;
    return { id, x: hero.x - 4 * (index + 1), y: Math.min(92, hero.y) };
  });
  const rect = fieldBox();
  if (rect.width > 40) {
    party.forEach((pal) => {
      if (!pal.id) return;
      const free = nearestFree((pal.x / 100) * rect.width, (pal.y / 100) * rect.height, rect, PAL_PAD);
      const point = toPercent(free.x, free.y, rect);
      pal.x = point.x;
      pal.y = point.y;
    });
  }
  paintParty();
}

function placeParty() {
  party.forEach((pal) => {
    if (!pal.id) return;
    const el = partyEl.querySelector(`[data-id="${pal.id}"]`);
    if (!el) return;
    el.style.left = `${pal.x}%`;
    el.style.top = `${pal.y}%`;
  });
}

function openChest(itemId) {
  if (!ITEMS[itemId] || state.open[itemId]) return;
  state.open[itemId] = true;
  if (!state.bag.includes(itemId)) state.bag.push(itemId);
  saveState();
  paintActors();
  setStatus(`¡Encontraste la ${ITEMS[itemId].name}! Llévasela a quien la pide.`);
}

function celebrate(text) {
  burstText.textContent = text;
  burst.hidden = false;
  window.clearTimeout(burstTimer);
  burstTimer = window.setTimeout(() => {
    burst.hidden = true;
  }, 1400);
}

function giveItem(itemId) {
  if (!state.bag.includes(itemId)) {
    setStatus("Ese objeto sigue dentro de su cofre.");
    return;
  }
  const poke = wild.find((row) => row.item === itemId && !isCaught(row.id));
  if (!poke) {
    setStatus(`La ${ITEMS[itemId].name} ya cumplió su parte.`);
    return;
  }
  const name = titleName(poke.name);
  state.bag = state.bag.filter((id) => id !== itemId);
  saveState();
  const added = markCaught(poke.id);
  paintActors();
  syncParty();
  celebrate("¡Atrapado!");
  setStatus(added ? `¡${name} se unió a tu colección!` : `${name} ya estaba contigo.`);
}

function rememberTrail() {
  const last = trail[trail.length - 1];
  if (!last || Math.hypot(last.x - hero.x, last.y - hero.y) > 1.1) trail.push({ x: hero.x, y: hero.y });
  if (trail.length > 90) trail.shift();
}

function checkChests() {
  LAYOUT.chests.forEach((chest) => {
    if (state.open[chest.item]) return;
    const rect = fieldBox();
    if (rect.width < 40) return;
    const dx = ((hero.x - chest.x) / 100) * rect.width;
    const dy = ((hero.y - chest.y) / 100) * rect.height;
    if (Math.hypot(dx, dy) <= REACH) openChest(chest.item);
  });
}

function moveFollowers(rect, elapsed) {
  const delays = [8, 16, 24];
  party.forEach((pal, index) => {
    if (!pal.id) return;
    const point = trail[Math.max(0, trail.length - 1 - delays[index])] || trail[0];
    const px = (pal.x / 100) * rect.width;
    const py = (pal.y / 100) * rect.height;
    const tx = (point.x / 100) * rect.width;
    const ty = (point.y / 100) * rect.height;
    const next = propose(px, py, tx, ty, 190 * (elapsed / 1000), rect, PAL_PAD);
    const percent = toPercent(next.x, next.y, rect);
    pal.x = percent.x;
    pal.y = percent.y;
  });
  placeParty();
}

function step(now) {
  const rect = fieldBox();
  if (rect.width < 40) {
    frame = requestAnimationFrame(step);
    return;
  }
  const elapsed = Math.min(48, lastTick ? now - lastTick : 16);
  lastTick = now;
  if (goal) {
    const px = (hero.x / 100) * rect.width;
    const py = (hero.y / 100) * rect.height;
    const next = propose(px, py, goal.x, goal.y, 210 * (elapsed / 1000), rect, HERO_PAD);
    const dist = Math.hypot(goal.x - px, goal.y - py);
    if (next.done || dist < 6) {
      const free = nearestFree(goal.x, goal.y, rect, HERO_PAD);
      const percent = toPercent(free.x, free.y, rect);
      hero.x = percent.x;
      hero.y = percent.y;
      goal = null;
      stuck = 0;
    } else if (next.moved < 0.4) {
      stuck += 1;
      if (stuck > 16) {
        const nudge = nearestFree(px + (goal.x - px) * 0.35, py + (goal.y - py) * 0.35, rect, HERO_PAD);
        goal = nudge;
        stuck = 0;
      }
    } else {
      stuck = 0;
      facing = next.face;
      const percent = toPercent(next.x, next.y, rect);
      hero.x = percent.x;
      hero.y = percent.y;
    }
    placeHero();
    rememberTrail();
    checkChests();
  }
  moveFollowers(rect, elapsed);
  frame = requestAnimationFrame(step);
}

function ensureLoop() {
  if (frame) return;
  lastTick = 0;
  frame = requestAnimationFrame(step);
}

function walkTo(px, py) {
  const rect = fieldBox();
  if (rect.width < 40) return;
  const free = nearestFree(px, py, rect, HERO_PAD);
  goal = free;
  stuck = 0;
  ensureLoop();
  if (!state.bag.length) setStatus(`${heroName()} va por el camino libre.`);
}

function pointFromEvent(event) {
  const rect = fieldBox();
  const spot = event.target.closest("[data-x]");
  if (spot) {
    return {
      x: (Number(spot.dataset.x) / 100) * rect.width,
      y: (Number(spot.dataset.y) / 100) * rect.height,
    };
  }
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function spotAt(x, y) {
  let best = null;
  actors.querySelectorAll(".adv-spot").forEach((el) => {
    const box = el.getBoundingClientRect();
    const dist = Math.hypot(x - (box.left + box.width / 2), y - (box.top + box.height / 2));
    if (dist <= REACH && (!best || dist < best.dist)) best = { el, dist };
  });
  return best ? best.el : null;
}

function moveGhost(x, y) {
  if (!ghost) return;
  ghost.style.left = `${x}px`;
  ghost.style.top = `${y}px`;
  const spot = spotAt(x, y);
  actors.querySelectorAll(".adv-spot").forEach((el) => el.classList.toggle("is-drop", el === spot && el.dataset.item === drag?.item));
}

function removeGhost() {
  ghost?.remove();
  ghost = null;
  actors.querySelectorAll(".adv-spot").forEach((el) => el.classList.remove("is-drop"));
}

function setZone(id) {
  if (!ZONES[id] || state.zone === id) return;
  state.zone = id;
  saveState();
  paintZone();
  setStatus(`Ahora exploran el entorno ${ZONES[id].name}.`);
}

function bind() {
  if (bound || !field) return;
  bound = true;
  Object.entries(ZONES).forEach(([id, zone]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "zone-btn";
    button.dataset.zone = id;
    button.textContent = zone.name;
    button.addEventListener("click", () => setZone(id));
    zonesEl.append(button);
  });
  document.querySelectorAll(".hero-btn").forEach((button) => {
    button.addEventListener("click", () => {
      applyHero(button.dataset.hero, true);
      setStatus(lineForState());
    });
  });
  field.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    const point = pointFromEvent(event);
    walkTo(point.x, point.y);
  });
  bagItems.addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-item]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, item: button.dataset.item };
    ghost = document.createElement("div");
    ghost.className = "adv-ghost";
    ghost.textContent = ITEMS[button.dataset.item].name;
    document.body.append(ghost);
    moveGhost(event.clientX, event.clientY);
  });
  window.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    moveGhost(event.clientX, event.clientY);
  });
  window.addEventListener("pointerup", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = Math.hypot(event.clientX - drag.x, event.clientY - drag.y);
    const spot = spotAt(event.clientX, event.clientY);
    const itemId = drag.item;
    drag = null;
    removeGhost();
    if (spot && spot.dataset.item && spot.dataset.item !== itemId) {
      setStatus(`Ese Pokémon quiere la ${ITEMS[spot.dataset.item].name}.`);
      return;
    }
    if ((spot && spot.dataset.item === itemId) || moved < 8) giveItem(itemId);
  });
  window.addEventListener("pointercancel", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    removeGhost();
  });
  window.addEventListener("resize", () => paintBlocks());
  onCatalogChange((list) => buildWild(list));
  onCaughtChange(() => {
    paintActors();
    syncParty();
  });
}

export function showAdventure() {
  bind();
  applyHero(loadHero(), false);
  paintZone();
  paintBlocks();
  const list = getCatalog();
  if (!wild.length && list.length) buildWild(list);
  else if (wild.length) {
    paintActors();
    setStatus(lineForState());
  } else {
    setStatus("Los Pokémon del claro están por llegar.");
  }
  const rect = fieldBox();
  if (rect.width > 40 && blocked((hero.x / 100) * rect.width, (hero.y / 100) * rect.height, rect, HERO_PAD)) {
    const free = nearestFree((hero.x / 100) * rect.width, (hero.y / 100) * rect.height, rect, HERO_PAD);
    const point = toPercent(free.x, free.y, rect);
    hero.x = point.x;
    hero.y = point.y;
  }
  placeHero();
  syncParty();
  renderBag();
  ensureLoop();
}
