import { warmSpanishVoices } from "./audio.js";
import { showMap, initMap } from "./map.js?v=4";
import { initPokedex, openPokemon } from "./pokedex.js?v=4";

function activateView(viewName) {
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

document.querySelectorAll(".tab-btn").forEach((button) => {
  button.addEventListener("click", () => activateView(button.dataset.view));
});
