import { artworkUrl, onCatalogChange, spriteUrl } from "./pokedex.js?v=17";

const TRAINER_SOURCES = [
  "image_aldo.webp",
  "image_aldo.png",
  "image_aldo.jpg",
  "image_aldo.jpeg",
  "images/image_aldo.webp",
  "images/image_aldo.png",
  "images/image_aldo.jpg",
  "images/image_aldo.jpeg",
  "modal/image_aldo.jpeg",
  "modal/image_aldo.jpg",
  "modal/image_aldo.png",
  "modal/image_aldo.webp",
  "public/image_aldo.webp",
  "public/image_aldo.png",
  "public/image_aldo.jpg",
  "public/image_aldo.jpeg",
];

const IMAGE_WAIT_MS = 2500;
const BATCH = 8;

const hello = document.getElementById("helloBackdrop");
const helloImg = document.getElementById("helloImg");
const helloBar = document.getElementById("helloBar");
const helloLoadText = document.getElementById("helloLoadText");
const seen = new Set();
const queue = [];
let goal = 0;
let settled = 0;
let pumping = false;

function loadUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve("ok");
    img.onerror = () => resolve("error");
    img.src = url;
  });
}

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      window.setTimeout(() => resolve("timeout"), IMAGE_WAIT_MS);
    }),
  ]);
}

function paintProgress() {
  const total = Math.max(goal, settled, 1);
  const ratio = Math.min(1, settled / total);
  helloBar.style.width = settled > 0 ? `max(${ratio * 100}%, 10px)` : "0%";
  helloLoadText.textContent = goal > 0 && settled >= goal ? "¡Listos!" : "Preparando Pokémon…";
}

function preloadOne(id) {
  const job = (async () => {
    const art = await loadUrl(artworkUrl(id));
    if (art !== "ok") await loadUrl(spriteUrl(id));
  })();
  return withTimeout(job);
}

async function pump() {
  if (pumping) return;
  pumping = true;
  while (queue.length) {
    const batch = queue.splice(0, BATCH);
    await Promise.allSettled(batch.map((id) => preloadOne(id)));
    settled += batch.length;
    paintProgress();
  }
  pumping = false;
}

function enqueue(pokemon, total) {
  goal = Math.max(goal, total || 0, pokemon.length);
  pokemon.forEach((poke) => {
    const id = Number(poke.id);
    if (!id || seen.has(id)) return;
    seen.add(id);
    queue.push(id);
  });
  paintProgress();
  pump();
}

function showTrainer() {
  let index = 0;
  const tryNext = () => {
    if (index >= TRAINER_SOURCES.length) return;
    helloImg.src = TRAINER_SOURCES[index];
    index += 1;
  };
  helloImg.addEventListener("error", tryNext);
  tryNext();
}

function closeHello() {
  hello.hidden = true;
  document.body.classList.remove("hello-open");
}

export function startWelcome() {
  document.body.classList.add("hello-open");
  hello.hidden = false;
  showTrainer();
  onCatalogChange(enqueue);
  document.getElementById("helloGo").addEventListener("click", closeHello);
}
