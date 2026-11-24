import { warmSpanishVoices } from "./audio.js";
import { showMap, initMap } from "./map.js?v=8";
import { initPokedex, openPokemon } from "./pokedex.js?v=8";
import { startWelcome } from "./welcome.js?v=8";

const welcome = document.getElementById("welcome");

function hideWelcome() {
  welcome?.classList.add("is-gone");
}

function activateView(viewName) {
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
}

window.openPokemon = openPokemon;
warmSpanishVoices();
initPokedex();
initMap();
startWelcome();
if (document.getElementById("mapView").classList.contains("active")) showMap();
window.setTimeout(hideWelcome, 2200);

document.querySelectorAll(".tab-btn").forEach((button) => {
  button.addEventListener("click", () => activateView(button.dataset.view));
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
