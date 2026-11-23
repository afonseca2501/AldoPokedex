// Audio en dos caminos que no se mezclan:
// playCry() solo reproduce el grito (archivo .ogg).
// speakSpanish() solo lee en voz alta un texto en español.

let cryAudio = null;
let cryToken = 0;
let speakTimer = 0;

export function cryUrlList(id) {
  return [
    `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,
    `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/legacy/${id}.ogg`,
  ];
}

export function warmSpanishVoices() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

function stopCry() {
  cryToken += 1;
  if (!cryAudio) return;
  cryAudio.onerror = null;
  cryAudio.pause();
  cryAudio.removeAttribute("src");
  cryAudio.load();
  cryAudio = null;
}

function cancelSpeech() {
  window.clearTimeout(speakTimer);
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

export function stopAllAudio() {
  cancelSpeech();
  stopCry();
}

export function playCry(poke) {
  if (!poke) return;
  cancelSpeech();
  stopCry();
  const token = cryToken;
  const urls = (poke.cryUrls && poke.cryUrls.length ? poke.cryUrls : cryUrlList(poke.id)).filter(Boolean);
  if (!urls.length) return;

  const audio = new Audio();
  cryAudio = audio;
  let step = 0;
  const tryUrl = () => {
    if (token !== cryToken || step >= urls.length) return;
    audio.src = urls[step];
    const pending = audio.play();
    if (pending && typeof pending.catch === "function") pending.catch(() => {});
  };
  audio.onerror = () => {
    if (token !== cryToken) return;
    step += 1;
    tryUrl();
  };
  tryUrl();
}

function spanishVoice() {
  if (!("speechSynthesis" in window)) return null;
  return window.speechSynthesis.getVoices().find((voice) => /^es(-|$)/i.test(voice.lang)) || null;
}

export function speakSpanish(text, isStillCurrent = () => true) {
  if (!text || !("speechSynthesis" in window)) return;
  stopCry();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "es-ES";
  const voice = spanishVoice();
  if (voice) utter.voice = voice;
  window.speechSynthesis.cancel();
  window.clearTimeout(speakTimer);
  speakTimer = window.setTimeout(() => {
    if (!isStillCurrent()) return;
    window.speechSynthesis.speak(utter);
  }, 50);
}
