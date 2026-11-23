import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { TYPE_ORDER, getType, weaknessesOf } from "../js/types.js";

const OUTPUT = "dist";
const SITE_FILES = ["index.html", "css", "js", "image_aldo.webp"];
const OPTIONAL_FILES = ["modal"];

const files = [
  "js/types.js",
  "js/audio.js",
  "js/pokedex.js",
  "js/map.js",
  "js/main.js",
  "js/welcome.js",
];

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const id of TYPE_ORDER) {
  const type = getType(id);
  const missing = ["name", "color", "border", "text", "icon"].filter((key) => !type[key]);
  if (missing.length || !type.icon.includes("<svg")) {
    console.error(`Tipo incompleto: ${id}`);
    process.exit(1);
  }
}

const samples = [
  [["fire"], ["water", "ground", "rock"]],
  [["water"], ["grass", "electric"]],
  [["electric"], ["ground"]],
  [["grass", "poison"], ["fire", "ice", "flying", "psychic"]],
  [["fire", "flying"], ["rock", "water", "electric"]],
  [["water", "ground"], ["grass"]],
  [["ghost", "dark"], ["fairy"]],
];

for (const [types, expected] of samples) {
  const got = weaknessesOf(types).join(",");
  if (got !== expected.join(",")) {
    console.error(`Debilidades incorrectas para ${types.join("/")}: ${got}`);
    process.exit(1);
  }
}

rmSync(OUTPUT, { recursive: true, force: true });
mkdirSync(OUTPUT, { recursive: true });
for (const entry of SITE_FILES) {
  if (!existsSync(entry)) {
    console.error(`Falta el archivo del sitio: ${entry}`);
    process.exit(1);
  }
  cpSync(entry, `${OUTPUT}/${entry}`, { recursive: true });
}
for (const entry of OPTIONAL_FILES) {
  if (existsSync(entry)) cpSync(entry, `${OUTPUT}/${entry}`, { recursive: true });
}

console.log(`Compilación lista: ${files.length} módulos y ${TYPE_ORDER.length} tipos con color e ícono.`);
console.log(`Salida estática: ${OUTPUT}/`);
