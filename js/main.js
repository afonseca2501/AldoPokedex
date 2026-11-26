import { warmSpanishVoices } from "./audio.js?v=10";
import { showAdventure } from "./adventure.js?v=7";
import { showMap, initMap } from "./map.js?v=13";
import { initPokedex, openPokemon } from "./pokedex.js?v=23";
import { greetAldo, initTeam, refreshTeam } from "./team.js?v=15";
import { startWelcome } from "./welcome.js?v=13";

const welcome = document.getElementById("welcome");
const ADVENTURE_READY = false;

function openView(viewName) {
  if (!ADVENTURE_READY && viewName === "adventureView") return "dexView";
  return viewName;
}

function hideWelcome() {
  welcome?.classList.add("is-gone");
}

function activateView(viewName) {
  viewName = openView(viewName);
  hideWelcome();
  document.querySelectorAll(".tab-btn").forEach((tab) => {
    const active = tab.dataset.view === viewName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === viewName);
  });
  if (viewName === "mapView") showMap();
  if (ADVENTURE_READY && viewName === "adventureView") showAdventure();
  if (viewName === "teamView") {
    refreshTeam();
    greetAldo();
  }
}

window.openPokemon = openPokemon;
warmSpanishVoices();
initPokedex();
initMap();
initTeam({ showView: activateView });
if (ADVENTURE_READY) showAdventure();
startWelcome();
if (document.getElementById("mapView").classList.contains("active")) showMap();
window.setTimeout(hideWelcome, 2200);

document.querySelectorAll(".tab-btn").forEach((button) => {
  button.addEventListener("click", () => activateView(button.dataset.view));
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

const BAR_KEY = "pokemundo_bar";
const hideBarBtn = document.getElementById("hideBar");
const showBarBtn = document.getElementById("showBar");
const appHeader = document.getElementById("appHeader");
const topClip = document.querySelector(".top-clip");

function barIsUp() {
  return document.documentElement.classList.contains("bar-up");
}

function rememberBar(up) {
  try {
    sessionStorage.setItem(BAR_KEY, up ? "up" : "down");
  } catch (error) { /* la barra igual cambia en pantalla */ }
}

function paintBarButtons(up) {
  hideBarBtn?.setAttribute("aria-expanded", up ? "false" : "true");
  showBarBtn?.setAttribute("aria-expanded", up ? "false" : "true");
}

function setBarUp(up) {
  const root = document.documentElement;
  if (topClip && appHeader) {
    if (up) {
      topClip.style.maxHeight = `${appHeader.offsetHeight}px`;
      void topClip.offsetHeight;
      root.classList.add("bar-up");
      topClip.style.maxHeight = "0px";
    } else {
      root.classList.remove("bar-up");
      topClip.style.maxHeight = `${appHeader.offsetHeight}px`;
    }
  } else {
    root.classList.toggle("bar-up", up);
  }
  paintBarButtons(up);
  rememberBar(up);
  window.setTimeout(() => window.dispatchEvent(new Event("resize")), 420);
}

const BAR_SWIPE = 16;
let barDrag = null;
let ignoreBarClick = false;

function suppressBarClick() {
  ignoreBarClick = true;
  window.setTimeout(() => { ignoreBarClick = false; }, 450);
}

hideBarBtn?.addEventListener("click", () => {
  if (ignoreBarClick) { ignoreBarClick = false; return; }
  setBarUp(true);
});
showBarBtn?.addEventListener("click", () => {
  if (ignoreBarClick) { ignoreBarClick = false; return; }
  setBarUp(false);
});

function beginBarDrag(event, role) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  if (role === "header" && (barIsUp() || event.target.closest(".tab-btn"))) return;
  if (role === "show" && !barIsUp()) return;
  barDrag = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    lastX: event.clientX,
    lastY: event.clientY,
    role,
    fromHandle: Boolean(event.target.closest("#hideBar")),
  };
  try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) { /* el dedo sigue con los eventos de la ventana */ }
}

function moveBarDrag(event) {
  if (!barDrag || barDrag.id !== event.pointerId) return;
  barDrag.lastX = event.clientX;
  barDrag.lastY = event.clientY;
  const dx = barDrag.lastX - barDrag.x;
  const dy = barDrag.lastY - barDrag.y;
  if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) event.preventDefault();
}

function finishBarDrag(event) {
  if (!barDrag || barDrag.id !== event.pointerId) return;
  const dx = barDrag.lastX - barDrag.x;
  const dy = barDrag.lastY - barDrag.y;
  const role = barDrag.role;
  const fromHandle = barDrag.fromHandle;
  barDrag = null;
  const tap = event.type !== "pointercancel" && Math.hypot(dx, dy) <= 10;
  if (tap && role === "show") { suppressBarClick(); setBarUp(false); return; }
  if (tap && fromHandle) { suppressBarClick(); setBarUp(true); return; }
  if (Math.abs(dy) < BAR_SWIPE || Math.abs(dy) <= Math.abs(dx)) return;
  if (role === "header" && dy < 0) { suppressBarClick(); setBarUp(true); }
  if (role === "show" && dy > 0) { suppressBarClick(); setBarUp(false); }
}

function bindBarPointer(target, role) {
  if (!target) return;
  target.addEventListener("pointerdown", (event) => beginBarDrag(event, role));
  target.addEventListener("pointermove", moveBarDrag, { passive: false });
  target.addEventListener("pointerup", finishBarDrag);
  target.addEventListener("pointercancel", finishBarDrag);
}

bindBarPointer(appHeader, "header");
bindBarPointer(showBarBtn, "show");
window.addEventListener("pointermove", moveBarDrag, { passive: false });
window.addEventListener("pointerup", finishBarDrag);
window.addEventListener("pointercancel", finishBarDrag);

paintBarButtons(barIsUp());
if (!barIsUp() && topClip && appHeader) {
  topClip.style.maxHeight = `${appHeader.offsetHeight}px`;
}
