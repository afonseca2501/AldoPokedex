import { warmSpanishVoices } from "./audio.js?v=10";
import { showAdventure } from "./adventure.js?v=6";
import { showMap, initMap } from "./map.js?v=12";
import { initPokedex, openPokemon } from "./pokedex.js?v=22";
import { greetAldo, initTeam, refreshTeam } from "./team.js?v=14";
import { startWelcome } from "./welcome.js?v=12";

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
