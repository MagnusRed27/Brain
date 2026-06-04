export function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isVoiceSupported() {
  return Boolean(getSpeechRecognition());
}

export function createVoiceListener({ lang = "ru-RU", onResult, onError } = {}) {
  const Recognizer = getSpeechRecognition();
  if (!Recognizer) return null;

  const recognition = new Recognizer();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let listening = false;

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    onResult?.(transcript);
  };
  recognition.onerror = (event) => {
    listening = false;
    onError?.(event);
  };
  recognition.onend = () => {
    listening = false;
  };

  return {
    start() {
      if (listening) return;
      try {
        recognition.start();
        listening = true;
      } catch {
        /* already started */
      }
    },
    stop() {
      try { recognition.stop(); } catch { /* noop */ }
      listening = false;
    },
    get listening() { return listening; },
  };
}

export function speak(text, { lang = "ru-RU", rate = 1, volume = 0.7 } = {}) {
  if (!("speechSynthesis" in window)) return;
  try {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = rate;
    utter.volume = volume;
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  } catch {
    /* noop */
  }
}
