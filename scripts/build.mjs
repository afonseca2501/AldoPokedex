import { spawnSync } from "node:child_process";
import { TYPE_ORDER, getType } from "../js/types.js";

const files = [
  "js/types.js",
  "js/audio.js",
  "js/pokedex.js",
  "js/map.js",
  "js/main.js",
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

console.log(`Compilación lista: ${files.length} módulos y ${TYPE_ORDER.length} tipos con color e ícono.`);
