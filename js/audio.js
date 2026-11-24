// Audio en dos caminos que no se mezclan:
// playCry() solo reproduce el grito, y la ficha lo llama al tocar el escenario.
// speakSpanish() solo lee en voz alta un texto en español.

let cryAudio = null;
let cryToken = 0;
let speakTimer = 0;
let speakAttempt = 0;
let activeUtterance = null;
let chimeContext = null;
let chimeNodes = [];

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

function stopCatchChime() {
  chimeNodes.forEach((node) => {
    try { node.stop(); } catch { /* el tono ya terminó */ }
  });
  chimeNodes = [];
}

function chimeAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!chimeContext) chimeContext = new AudioContext();
  return chimeContext;
}

export function primeCatchChime() {
  const context = chimeAudio();
  if (context && context.state === "suspended") context.resume();
}

export function playCatchChime() {
  stopCatchChime();
  const context = chimeAudio();
  if (!context) return;
  if (context.state === "suspended") context.resume();
  const start = context.currentTime + 0.02;
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const when = start + index * 0.11;
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.06, when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.32);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(when);
    osc.stop(when + 0.34);
    chimeNodes.push(osc);
  });
}

export function stopAllAudio() {
  cancelSpeech();
  stopCry();
  stopCatchChime();
}

export function playCry(poke) {
  if (!poke) return;
  cancelSpeech();
  stopCry();
  stopCatchChime();
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

function spanishVoices() {
  if (!("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter((voice) => /^es([-_]|$)/i.test(voice.lang || ""));
}

function preferredSpanishVoice() {
  const voices = spanishVoices();
  return voices.find((voice) => voice.localService && !/\(.*\)/.test(voice.name))
    || voices.find((voice) => voice.localService)
    || voices[0]
    || null;
}

function createUtterance(text, voice) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.volume = 1;
  utter.rate = 1;
  utter.pitch = 1;
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang || "es-ES";
  } else {
    utter.lang = "es-ES";
  }
  return utter;
}

export function speakSpanish(text, isStillCurrent = () => true) {
  if (!text || !("speechSynthesis" in window)) return;
  stopCry();
  stopCatchChime();
  window.clearTimeout(speakTimer);
  const synth = window.speechSynthesis;
  const attemptId = ++speakAttempt;
  const voice = preferredSpanishVoice();

  const start = (chosenVoice, canRetry) => {
    if (attemptId !== speakAttempt || !isStillCurrent()) return;
    const utter = createUtterance(text, chosenVoice);
    activeUtterance = utter;
    let started = false;
    utter.onstart = () => {
      started = true;
    };
    utter.onerror = (event) => {
      if (attemptId !== speakAttempt || started) return;
      if (event.error === "interrupted" || event.error === "canceled") return;
      if (!canRetry) return;
      const fallback = spanishVoices().find((item) => item !== chosenVoice && !/\(.*\)/.test(item.name)) || null;
      start(fallback, false);
    };
    synth.resume();
    synth.speak(utter);
    synth.resume();
    speakTimer = window.setTimeout(() => {
      if (attemptId !== speakAttempt || started || synth.speaking || synth.pending) return;
      if (!isStillCurrent()) return;
      synth.resume();
      const retry = createUtterance(text, chosenVoice);
      activeUtterance = retry;
      synth.speak(retry);
      synth.resume();
    }, 180);
  };

  if (synth.speaking || synth.pending) {
    synth.cancel();
    speakTimer = window.setTimeout(() => start(voice, true), 80);
    return;
  }
  start(voice, true);
}
