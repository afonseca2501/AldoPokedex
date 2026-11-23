function icon(body) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

const TYPES = {
  normal: {
    name: "normal",
    color: "#d6d3a8",
    border: "#44403c",
    text: "#1c1917",
    icon: icon(`<circle cx="12" cy="12" r="7" fill="currentColor"/>`),
  },
  fire: {
    name: "fuego",
    color: "#ff7a18",
    border: "#7c2d12",
    text: "#1c1917",
    icon: icon(`<path fill="currentColor" d="M12 2c1 3 3 4 3 7a3 3 0 0 1-6 0c0-1 .6-2 1-3-2 1.5-3 3.5-3 6a5 5 0 0 0 10 0c0-4-3-7-5-10z"/>`),
  },
  water: {
    name: "agua",
    color: "#3b82f6",
    border: "#1e3a8a",
    text: "#ffffff",
    icon: icon(`<path fill="currentColor" d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/>`),
  },
  grass: {
    name: "planta",
    color: "#4ade80",
    border: "#14532d",
    text: "#052e16",
    icon: icon(`<path fill="currentColor" d="M5 19C5 10 12 4 20 4 20 13 13 19 5 19z"/><path d="M8 16c2-2 5-5 8-8" fill="none" stroke="#052e16" stroke-width="1.6" stroke-linecap="round"/>`),
  },
  electric: {
    name: "eléctrico",
    color: "#fde047",
    border: "#a16207",
    text: "#1c1917",
    icon: icon(`<path fill="currentColor" d="M13 2 4 14h7l-1 8 10-14h-7z"/>`),
  },
  ice: {
    name: "hielo",
    color: "#67e8f9",
    border: "#155e75",
    text: "#083344",
    icon: icon(`<path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/>`),
  },
  fighting: {
    name: "lucha",
    color: "#ef4444",
    border: "#7f1d1d",
    text: "#ffffff",
    icon: icon(`<path fill="currentColor" d="M8 11V7.5a1.7 1.7 0 0 1 3.4 0V11M12 10V6.5a1.7 1.7 0 0 1 3.4 0V12M8.2 11h8.2a2.6 2.6 0 0 1 2.6 2.6v1.6A4.8 4.8 0 0 1 14.2 20H10a4.8 4.8 0 0 1-4.8-4.8v-1.6A2.6 2.6 0 0 1 8.2 11z"/>`),
  },
  poison: {
    name: "veneno",
    color: "#c084fc",
    border: "#581c87",
    text: "#2e1065",
    icon: icon(`<circle cx="8" cy="15" r="3" fill="currentColor"/><circle cx="15" cy="13" r="4" fill="currentColor"/><circle cx="12" cy="6" r="2.2" fill="currentColor"/>`),
  },
  ground: {
    name: "tierra",
    color: "#f5d061",
    border: "#854d0e",
    text: "#1c1917",
    icon: icon(`<path fill="currentColor" d="M2 19 9 7l4 6 3-4 6 10H2z"/>`),
  },
  flying: {
    name: "volador",
    color: "#c4b5fd",
    border: "#5b21b6",
    text: "#1e1b4b",
    icon: icon(`<path fill="currentColor" d="M3 14c4-1 7-5 8-9 2 3 6 5 11 6-4 1-8 2-10 6-2-1-6-2-9-3z"/>`),
  },
  psychic: {
    name: "psíquico",
    color: "#fb7185",
    border: "#9f1239",
    text: "#1c1917",
    icon: icon(`<ellipse cx="12" cy="12" rx="9" ry="5.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/>`),
  },
  bug: {
    name: "bicho",
    color: "#bef264",
    border: "#3f6212",
    text: "#1c1917",
    icon: icon(`<circle cx="12" cy="14" r="5" fill="currentColor"/><circle cx="12" cy="7" r="2.3" fill="currentColor"/><path d="M7 11 4 8M17 11l3-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`),
  },
  rock: {
    name: "roca",
    color: "#eab308",
    border: "#713f12",
    text: "#1c1917",
    icon: icon(`<path fill="currentColor" d="M7 3h10l4 6-9 12L3 9l4-6z"/>`),
  },
  ghost: {
    name: "fantasma",
    color: "#8b5cf6",
    border: "#2e1065",
    text: "#ffffff",
    icon: icon(`<path fill="currentColor" d="M6 21V11a6 6 0 0 1 12 0v10l-2.2-2.2L13.5 21l-1.5-2.4L10.5 21 8.2 18.8 6 21z"/>`),
  },
  dragon: {
    name: "dragón",
    color: "#7c3aed",
    border: "#2e1065",
    text: "#ffffff",
    icon: icon(`<path fill="currentColor" d="M4 16c1.5-5 5-9 10-9 2 0 4 1 5 2-1.4.2-2.4 1-3 2 2 .4 3.4 1.6 4 3.2H9c-1.6 0-3.2-.6-5-1.2z"/><path fill="currentColor" d="M16 4c1 1.4 1.2 2.8.6 4"/>`),
  },
  dark: {
    name: "siniestro",
    color: "#a8a29e",
    border: "#292524",
    text: "#1c1917",
    icon: icon(`<path fill="currentColor" d="M15 3a8.5 8.5 0 1 0 6 14A7.2 7.2 0 1 1 15 3z"/>`),
  },
  steel: {
    name: "acero",
    color: "#e2e8f0",
    border: "#334155",
    text: "#0f172a",
    icon: icon(`<path fill="currentColor" d="M8 3h8l5 5v8l-5 5H8l-5-5V8l5-5z"/><circle cx="12" cy="12" r="3" fill="#334155"/>`),
  },
  fairy: {
    name: "hada",
    color: "#f9a8d4",
    border: "#9d174d",
    text: "#831843",
    icon: icon(`<path fill="currentColor" d="M12 2.5 14.2 9 21 10.2 16 14.2l1.5 6.6L12 17.4 6.5 20.8 8 14.2 3 10.2 9.8 9 12 2.5z"/>`),
  },
};

export const TYPE_ORDER = [
  "normal", "fire", "water", "grass", "electric", "ice",
  "fighting", "poison", "ground", "flying", "psychic", "bug",
  "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

export function getType(id) {
  const known = TYPES[id];
  if (known) return { id, ...known };
  return {
    id: id || "desconocido",
    name: id || "desconocido",
    color: "#334155",
    border: "#0f172a",
    text: "#f8fafc",
    icon: icon(`<circle cx="12" cy="12" r="6" fill="currentColor"/>`),
  };
}

export function typeName(id) {
  return getType(id).name;
}

export function paintTypeBadges(container, types, labeled = true) {
  container.replaceChildren();
  (types || []).filter(Boolean).forEach((id) => {
    const info = getType(id);
    const badge = document.createElement("span");
    badge.className = labeled ? `badge type-${info.id}` : `type-chip type-${info.id}`;
    badge.style.background = info.color;
    badge.style.color = info.text;
    badge.style.borderColor = info.border;
    if (!labeled) badge.setAttribute("aria-label", info.name);
    const mark = document.createElement("span");
    mark.className = "type-icon";
    mark.setAttribute("aria-hidden", "true");
    mark.innerHTML = info.icon;
    badge.append(mark);
    if (labeled) {
      const label = document.createElement("span");
      label.textContent = info.name;
      badge.append(label);
    }
    container.append(badge);
  });
}
