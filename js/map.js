import { escapeHtml, getCatalog, isCaught, onCaughtChange, onTypesChange, pokemonTypes, setStatus, titleName } from "./pokedex.js?v=8";
import { paintTypeBadges } from "./types.js?v=5";

const SIGHTINGS = [
  { lat: 43.65, lng: -79.38, place: "Toronto", country: "Canadá", code: "CA", pokeId: 133, name: "eevee" },
  { lat: 40.71, lng: -74.01, place: "Nueva York", country: "Estados Unidos", code: "US", pokeId: 52, name: "meowth" },
  { lat: 19.90, lng: -155.58, place: "Hawái", country: "Estados Unidos", code: "US", pokeId: 4, name: "charmander" },
  { lat: 36.78, lng: -119.42, place: "Sierra Nevada", country: "Estados Unidos", code: "US", pokeId: 37, name: "vulpix" },
  { lat: 19.43, lng: -99.13, place: "Ciudad de México", country: "México", code: "MX", pokeId: 66, name: "machop" },
  { lat: 14.63, lng: -90.51, place: "Ciudad de Guatemala", country: "Guatemala", code: "GT", pokeId: 56, name: "mankey" },
  { lat: 9.93, lng: -84.08, place: "San José", country: "Costa Rica", code: "CR", pokeId: 152, name: "chikorita" },
  { lat: 8.98, lng: -79.52, place: "Selva tropical", country: "Panamá", code: "PA", pokeId: 1, name: "bulbasaur" },
  { lat: 23.11, lng: -82.37, place: "La Habana", country: "Cuba", code: "CU", pokeId: 54, name: "psyduck" },
  { lat: 4.71, lng: -74.07, place: "Bogotá", country: "Colombia", code: "CO", pokeId: 43, name: "oddish" },
  { lat: -0.74, lng: -90.32, place: "Galápagos", country: "Ecuador", code: "EC", pokeId: 129, name: "magikarp" },
  { lat: -13.16, lng: -72.54, place: "Andes", country: "Perú", code: "PE", pokeId: 95, name: "onix" },
  { lat: -16.50, lng: -68.15, place: "La Paz", country: "Bolivia", code: "BO", pokeId: 76, name: "golem" },
  { lat: -3.47, lng: -62.22, place: "Amazonia", country: "Brasil", code: "BR", pokeId: 114, name: "tangela" },
  { lat: -22.91, lng: -43.17, place: "Río de Janeiro", country: "Brasil", code: "BR", pokeId: 106, name: "hitmonlee" },
  { lat: -34.60, lng: -58.38, place: "Buenos Aires", country: "Argentina", code: "AR", pokeId: 241, name: "miltank" },
  { lat: -50.94, lng: -73.24, place: "Patagonia", country: "Argentina", code: "AR", pokeId: 221, name: "piloswine" },
  { lat: -33.45, lng: -70.67, place: "Santiago", country: "Chile", code: "CL", pokeId: 138, name: "omanyte" },
  { lat: -34.90, lng: -56.16, place: "Montevideo", country: "Uruguay", code: "UY", pokeId: 113, name: "chansey" },
  { lat: 64.15, lng: -21.94, place: "Reikiavik", country: "Islandia", code: "IS", pokeId: 131, name: "lapras" },
  { lat: 51.51, lng: -0.13, place: "Londres", country: "Reino Unido", code: "GB", pokeId: 83, name: "farfetchd" },
  { lat: 53.35, lng: -6.26, place: "Dublín", country: "Irlanda", code: "IE", pokeId: 35, name: "clefairy" },
  { lat: 48.86, lng: 2.35, place: "París", country: "Francia", code: "FR", pokeId: 132, name: "ditto" },
  { lat: 40.42, lng: -3.70, place: "Madrid", country: "España", code: "ES", pokeId: 59, name: "arcanine" },
  { lat: 38.72, lng: -9.14, place: "Lisboa", country: "Portugal", code: "PT", pokeId: 278, name: "wingull" },
  { lat: 46.82, lng: 8.23, place: "Alpes", country: "Suiza", code: "CH", pokeId: 361, name: "snorunt" },
  { lat: 41.90, lng: 12.50, place: "Roma", country: "Italia", code: "IT", pokeId: 108, name: "lickitung" },
  { lat: 52.52, lng: 13.40, place: "Berlín", country: "Alemania", code: "DE", pokeId: 81, name: "magnemite" },
  { lat: 52.37, lng: 4.90, place: "Ámsterdam", country: "Países Bajos", code: "NL", pokeId: 183, name: "marill" },
  { lat: 71.01, lng: 25.47, place: "Ártico", country: "Noruega", code: "NO", pokeId: 713, name: "avalugg" },
  { lat: 59.33, lng: 18.07, place: "Estocolmo", country: "Suecia", code: "SE", pokeId: 220, name: "swinub" },
  { lat: 37.98, lng: 23.73, place: "Atenas", country: "Grecia", code: "GR", pokeId: 38, name: "ninetales" },
  { lat: 50.06, lng: 19.94, place: "Cracovia", country: "Polonia", code: "PL", pokeId: 77, name: "ponyta" },
  { lat: 31.63, lng: -7.99, place: "Marrakech", country: "Marruecos", code: "MA", pokeId: 27, name: "sandshrew" },
  { lat: 30.04, lng: 31.24, place: "El Cairo", country: "Egipto", code: "EG", pokeId: 328, name: "trapinch" },
  { lat: -1.29, lng: 36.82, place: "Nairobi", country: "Kenia", code: "KE", pokeId: 128, name: "tauros" },
  { lat: 0.51, lng: 25.20, place: "Selva del Congo", country: "República Democrática del Congo", code: "CD", pokeId: 123, name: "scyther" },
  { lat: -18.88, lng: 47.51, place: "Antananarivo", country: "Madagascar", code: "MG", pokeId: 357, name: "tropius" },
  { lat: -33.92, lng: 18.42, place: "Ciudad del Cabo", country: "Sudáfrica", code: "ZA", pokeId: 335, name: "zangoose" },
  { lat: -2.33, lng: 34.83, place: "Serengueti", country: "Tanzania", code: "TZ", pokeId: 243, name: "raikou" },
  { lat: 6.52, lng: 3.38, place: "Lagos", country: "Nigeria", code: "NG", pokeId: 84, name: "doduo" },
  { lat: 9.03, lng: 38.74, place: "Adís Abeba", country: "Etiopía", code: "ET", pokeId: 244, name: "entei" },
  { lat: 41.01, lng: 28.98, place: "Estambul", country: "Turquía", code: "TR", pokeId: 58, name: "growlithe" },
  { lat: 28.61, lng: 77.21, place: "Delhi", country: "India", code: "IN", pokeId: 103, name: "exeggutor" },
  { lat: 27.99, lng: 86.93, place: "Himalaya", country: "Nepal", code: "NP", pokeId: 460, name: "abomasnow" },
  { lat: 39.90, lng: 116.41, place: "Pekín", country: "China", code: "CN", pokeId: 149, name: "dragonite" },
  { lat: 43.00, lng: 103.00, place: "Desierto de Gobi", country: "Mongolia", code: "MN", pokeId: 329, name: "vibrava" },
  { lat: 35.68, lng: 139.69, place: "Tokio", country: "Japón", code: "JP", pokeId: 25, name: "pikachu" },
  { lat: 37.57, lng: 126.98, place: "Seúl", country: "Corea del Sur", code: "KR", pokeId: 100, name: "voltorb" },
  { lat: 13.76, lng: 100.50, place: "Bangkok", country: "Tailandia", code: "TH", pokeId: 70, name: "weepinbell" },
  { lat: -6.21, lng: 106.85, place: "Yakarta", country: "Indonesia", code: "ID", pokeId: 279, name: "pelipper" },
  { lat: 14.60, lng: 120.98, place: "Manila", country: "Filipinas", code: "PH", pokeId: 382, name: "kyogre" },
  { lat: 21.03, lng: 105.85, place: "Hanói", country: "Vietnam", code: "VN", pokeId: 252, name: "treecko" },
  { lat: 25.20, lng: 55.27, place: "Dubái", country: "Emiratos Árabes Unidos", code: "AE", pokeId: 324, name: "torkoal" },
  { lat: -33.87, lng: 151.21, place: "Sídney", country: "Australia", code: "AU", pokeId: 115, name: "kangaskhan" },
  { lat: -18.29, lng: 147.70, place: "Gran Barrera de Coral", country: "Australia", code: "AU", pokeId: 72, name: "tentacool" },
  { lat: -41.29, lng: 174.78, place: "Wellington", country: "Nueva Zelanda", code: "NZ", pokeId: 16, name: "pidgey" },
  { lat: -17.71, lng: 178.07, place: "Suva", country: "Fiyi", code: "FJ", pokeId: 73, name: "tentacruel" },
  { lat: -6.31, lng: 143.96, place: "Tierras altas", country: "Papúa Nueva Guinea", code: "PG", pokeId: 286, name: "breloom" },
];

const TILE_SETS = {
  streets: [
    {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      options: { attribution: "Tiles &copy; Esri &copy; OpenStreetMap", maxZoom: 19 },
    },
    {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      options: {
        attribution: "&copy; OpenStreetMap",
        subdomains: "abc",
        maxZoom: 19,
      },
    },
  ],
  satellite: [
    {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      options: { attribution: "Tiles &copy; Esri", maxZoom: 19 },
    },
    {
      url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      options: { attribution: "Tiles &copy; Esri", maxZoom: 19 },
    },
  ],
};

let mapInstance = null;
let activeTiles = null;
let preferredLayer = "streets";
let radarPokeId = null;
const placedMarkers = [];

const mapElement = document.getElementById("map");
const layerSelect = document.getElementById("mapLayer");
const radarBanner = document.getElementById("radarBanner");

const PIN_FALLBACK = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <circle cx="32" cy="32" r="28" fill="#ef4444"/>
    <path d="M6 32h52" stroke="#0f172a" stroke-width="6"/>
    <circle cx="32" cy="32" r="9" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
  </svg>`
)}`;

function artworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function spriteUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function pokemonIcon(id, name, radar) {
  const numeric = Number(id);
  const label = escapeHtml(titleName(name));
  return L.divIcon({
    className: radar ? "poke-pin-wrap poke-pin-radar" : "poke-pin-wrap",
    html: `<div class="poke-pin"><span class="pin-types" aria-hidden="true"></span><img alt="${label}" width="48" height="48" data-id="${numeric}" decoding="async"><span class="poke-ball" aria-hidden="true"></span></div>`,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -30],
  });
}

function preparePin(marker, id) {
  const hook = () => {
    paintCaught(marker, id);
    paintTypes(marker, id);
    const img = marker.getElement()?.querySelector("img");
    if (!img || img.dataset.ready) return;
    img.dataset.ready = "1";
    const fail = () => {
      if (img.dataset.step !== "sprite") {
        img.dataset.step = "sprite";
        img.src = spriteUrl(id);
        return;
      }
      img.removeEventListener("error", fail);
      img.src = PIN_FALLBACK;
    };
    img.addEventListener("error", fail);
    img.src = artworkUrl(id);
  };
  marker.on("add", hook);
}

function paintCaught(marker, id) {
  marker.getElement()?.classList.toggle("is-caught", isCaught(id));
}

function paintTypes(marker, id) {
  const row = marker.getElement()?.querySelector(".pin-types");
  if (!row) return;
  paintTypeBadges(row, pokemonTypes(id), false);
}

function focusMarker(marker) {
  if (!mapInstance) return;
  document.querySelectorAll(".poke-pin-wrap.is-chosen").forEach((el) => el.classList.remove("is-chosen"));
  marker.getElement()?.classList.add("is-chosen");
  const zoom = Math.max(mapInstance.getZoom(), 6);
  mapInstance.flyTo(marker.getLatLng(), zoom, { duration: 0.45 });
}

function addSighting(spot, pokemonName, buttonLabel, radar = false, open = false) {
  const marker = L.marker([spot.lat, spot.lng], {
    icon: pokemonIcon(spot.pokeId, pokemonName, radar),
    alt: pokemonName,
    keyboard: true,
  });
  preparePin(marker, spot.pokeId);
  placedMarkers.push({ marker, id: Number(spot.pokeId) });
  marker.on("click", () => focusMarker(marker));
  marker.addTo(mapInstance).bindPopup(
    sightingMarkup(spot, pokemonName, buttonLabel),
    open ? { autoClose: false } : undefined
  );
  if (open) {
    marker.openPopup();
    focusMarker(marker);
  }
  return marker;
}

function flagEmoji(code) {
  if (!/^[a-z]{2}$/i.test(code || "")) return "🌐";
  const points = [...code.toUpperCase()].map((char) => 0x1F1E6 + char.charCodeAt(0) - 65);
  return String.fromCodePoint(...points);
}

function countryMarkup(spot) {
  const code = escapeHtml((spot.code || "").toUpperCase());
  return `
    <span class="flag-emoji" aria-hidden="true">${flagEmoji(spot.code)}</span>
    <span class="flag-badge">${code || "—"}</span>
    <span class="country-name">${escapeHtml(spot.country)}</span>
  `;
}

function sightingMarkup(spot, pokemonName, buttonLabel) {
  return `
    <div class="sighting">
      <div class="sighting-country">${countryMarkup(spot)}</div>
      <div class="sighting-place">${escapeHtml(spot.place)}</div>
      <div class="sighting-poke">${escapeHtml(pokemonName)}</div>
      <button type="button" onclick="openPokemon(${Number(spot.pokeId)})">${escapeHtml(buttonLabel)}</button>
    </div>
  `;
}

function createTileLayer(sources, index = 0) {
  const source = sources[Math.min(index, sources.length - 1)];
  const layer = L.tileLayer(source.url, source.options);
  let failures = 0;
  layer.on("tileerror", () => {
    failures += 1;
    if (failures < 6 || index >= sources.length - 1 || activeTiles !== layer) return;
    layer.off("tileerror");
    if (mapInstance && mapInstance.hasLayer(layer)) mapInstance.removeLayer(layer);
    activeTiles = createTileLayer(sources, index + 1);
    activeTiles.addTo(mapInstance);
    setStatus("Mapa de respaldo.");
  });
  return layer;
}

function applyLayer(name) {
  const sources = TILE_SETS[name] || TILE_SETS.streets;
  preferredLayer = TILE_SETS[name] ? name : "streets";
  if (!mapInstance) return;
  if (activeTiles) mapInstance.removeLayer(activeTiles);
  activeTiles = createTileLayer(sources, 0);
  activeTiles.addTo(mapInstance);
}

function createMap() {
  mapInstance = L.map(mapElement, { fadeAnimation: false }).setView([18, 10], 2);
  applyLayer(preferredLayer);
  SIGHTINGS.forEach((spot) => {
    addSighting(spot, titleName(spot.name), "Ver ficha");
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
      setStatus("El mapa no cargó. La Pokédex sí.");
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

function jitter(value) {
  return Number((value + (Math.random() - 0.5) * 0.8).toFixed(2));
}

function showRadarBanner(spot, pokemonName) {
  radarPokeId = spot.pokeId;
  radarBanner.hidden = false;
  const code = escapeHtml((spot.code || "").toUpperCase());
  radarBanner.innerHTML = `
    <div class="sighting-country">
      <span class="flag-emoji" aria-hidden="true">${flagEmoji(spot.code)}</span>
      <span class="flag-badge">${code || "—"}</span>
    </div>
    <div class="sighting-copy">
      <span class="sighting-kicker">Radar salvaje</span>
      <strong class="sighting-poke">¡${escapeHtml(pokemonName)} salvaje!</strong>
      <span class="country-name">${escapeHtml(spot.country)} · ${escapeHtml(spot.place)}</span>
    </div>
    <button type="button" id="radarOpenBtn">Ver ficha</button>
  `;
  radarBanner.querySelector("#radarOpenBtn").addEventListener("click", () => {
    if (radarPokeId) window.openPokemon(radarPokeId);
  });
}

function launchRadar() {
  showMap();
  const catalog = getCatalog();
  if (!mapInstance || !catalog.length || !SIGHTINGS.length) return;
  const spot = SIGHTINGS[Math.floor(Math.random() * SIGHTINGS.length)];
  const poke = catalog[Math.floor(Math.random() * catalog.length)];
  const sighting = {
    ...spot,
    lat: jitter(spot.lat),
    lng: jitter(spot.lng),
    pokeId: poke.id,
  };
  const pokemonName = titleName(poke.name);
  addSighting(sighting, pokemonName, "Abrir ficha", true, true);
  showRadarBanner(sighting, pokemonName);
  requestAnimationFrame(() => mapInstance.invalidateSize(false));
}

export function initMap() {
  preferredLayer = TILE_SETS[layerSelect.value] ? layerSelect.value : "streets";
  layerSelect.value = preferredLayer;
  layerSelect.addEventListener("change", () => applyLayer(layerSelect.value));
  document.getElementById("radarBtn").addEventListener("click", launchRadar);
  onCaughtChange(() => {
    placedMarkers.forEach(({ marker, id }) => paintCaught(marker, id));
  });
  onTypesChange(() => {
    placedMarkers.forEach(({ marker, id }) => paintTypes(marker, id));
  });
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
