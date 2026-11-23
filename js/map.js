import { escapeHtml, getCatalog, titleName } from "./pokedex.js";

const HABITATS = [
  { lat: 9.1, lng: -79.5, label: "Selva Tropical (Panamá)", pokeId: 1 },
  { lat: -3.4, lng: -62.2, label: "Amazonia (Brasil)", pokeId: 43 },
  { lat: 0.5, lng: 25.2, label: "Selva del Congo", pokeId: 123 },
  { lat: -18.9, lng: 47.5, label: "Selva de Madagascar", pokeId: 357 },
  { lat: 19.4, lng: -155.3, label: "Zona Volcánica (Hawái)", pokeId: 4 },
  { lat: 19.4, lng: -99.1, label: "Valle de México", pokeId: 66 },
  { lat: -13.5, lng: -72.0, label: "Andes (Perú)", pokeId: 95 },
  { lat: 27.9, lng: 86.9, label: "Himalaya (Nepal)", pokeId: 460 },
  { lat: 46.5, lng: 8.0, label: "Alpes (Suiza)", pokeId: 361 },
  { lat: 35.6, lng: 139.7, label: "Ciudad Eléctrica (Tokio)", pokeId: 25 },
  { lat: -1.3, lng: 36.8, label: "Sabana (Kenia)", pokeId: 128 },
  { lat: 24.0, lng: 25.0, label: "Desierto del Sahara", pokeId: 27 },
  { lat: 43.0, lng: 103.0, label: "Desierto de Gobi", pokeId: 329 },
  { lat: -18.2, lng: 147.7, label: "Gran Barrera de Coral", pokeId: 72 },
  { lat: 64.1, lng: -21.9, label: "Costa de Islandia", pokeId: 131 },
  { lat: 71.0, lng: 25.0, label: "Ártico Helado", pokeId: 713 },
  { lat: -51.0, lng: -73.0, label: "Patagonia (Argentina)", pokeId: 221 },
  { lat: 0.0, lng: -140.0, label: "Océano Pacífico Profundo", pokeId: 382 },
  { lat: -41.3, lng: 174.8, label: "Islas de Nueva Zelanda", pokeId: 16 },
  { lat: 36.8, lng: -119.4, label: "Sierra Nevada (California)", pokeId: 37 },
];

const TILES = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { attribution: "&copy; OpenStreetMap", maxZoom: 19 },
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: { attribution: "Tiles &copy; Esri", maxZoom: 19 },
  },
};

let mapInstance = null;
let activeTiles = null;
let preferredLayer = "standard";

const mapElement = document.getElementById("map");
const layerSelect = document.getElementById("mapLayer");
const statusText = document.getElementById("statusText");

function habitatPopup(habitat) {
  return `<b>${escapeHtml(habitat.label)}</b><br><button type="button" onclick="openPokemon(${habitat.pokeId})">Ver Pokémon</button>`;
}

function applyLayer(name) {
  if (!mapInstance || !TILES[name]) return;
  preferredLayer = name;
  if (activeTiles) mapInstance.removeLayer(activeTiles);
  activeTiles = L.tileLayer(TILES[name].url, TILES[name].options);
  activeTiles.addTo(mapInstance);
}

function createMap() {
  mapInstance = L.map(mapElement, { fadeAnimation: false }).setView([18, 0], 2);
  applyLayer(preferredLayer);
  HABITATS.forEach((habitat) => {
    L.marker([habitat.lat, habitat.lng]).addTo(mapInstance).bindPopup(habitatPopup(habitat));
  });
  requestAnimationFrame(() => mapInstance.invalidateSize(false));
}

function resizeMapWhenVisible(attempt = 0) {
  const mapView = document.getElementById("mapView");
  if (!mapView.classList.contains("active")) return;
  if (mapElement.clientWidth === 0 || mapElement.clientHeight === 0) {
    if (attempt < 8) requestAnimationFrame(() => resizeMapWhenVisible(attempt + 1));
    return;
  }
  if (typeof L === "undefined") {
    if (attempt < 20) {
      window.setTimeout(() => resizeMapWhenVisible(attempt + 1), 100);
    } else {
      statusText.textContent = "No se pudo cargar el mapa. La Pokédex sigue disponible.";
    }
    return;
  }
  if (!mapInstance) createMap();
  mapInstance.invalidateSize(false);
  window.setTimeout(() => {
    if (mapInstance && mapElement.clientWidth > 0) mapInstance.invalidateSize(false);
  }, 180);
}

export function showMap() {
  resizeMapWhenVisible();
}

function launchRadar() {
  showMap();
  const catalog = getCatalog();
  if (!mapInstance || !catalog.length) return;
  const poke = catalog[Math.floor(Math.random() * catalog.length)];
  const lat = Number((Math.random() * 110 - 50).toFixed(2));
  const lng = Number((Math.random() * 320 - 160).toFixed(2));
  mapInstance.setView([lat, lng], 4);
  L.marker([lat, lng])
    .addTo(mapInstance)
    .bindPopup(
      `<b>¡${escapeHtml(titleName(poke.name))} salvaje!</b><br><button type="button" onclick="openPokemon(${poke.id})">Abrir ficha</button>`
    )
    .openPopup();
  requestAnimationFrame(() => mapInstance.invalidateSize(false));
}

export function initMap() {
  preferredLayer = layerSelect.value || "standard";
  layerSelect.addEventListener("change", () => {
    preferredLayer = layerSelect.value;
    if (mapInstance) applyLayer(preferredLayer);
  });
  document.getElementById("radarBtn").addEventListener("click", launchRadar);
  window.addEventListener("resize", () => {
    if (document.getElementById("mapView").classList.contains("active")) showMap();
  });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      if (!mapInstance || !document.getElementById("mapView").classList.contains("active")) return;
      if (mapElement.clientWidth === 0 || mapElement.clientHeight === 0) return;
      mapInstance.invalidateSize(false);
    });
    observer.observe(mapElement);
  }
}
