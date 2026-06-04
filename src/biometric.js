export function isBiometricSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export async function createPulseDetector({ onUpdate, onError } = {}) {
  if (!isBiometricSupported()) {
    onError?.(new Error("getUserMedia not supported"));
    return null;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: "user" },
      audio: false,
    });
  } catch (error) {
    onError?.(error);
    return null;
  }

  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  await video.play().catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 48;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const samples = [];
  const SAMPLE_HZ = 10;
  const WINDOW_SECONDS = 10;
  const MAX_SAMPLES = SAMPLE_HZ * WINDOW_SECONDS;
  let timer = 0;
  let running = true;
  let hrEstimate = 0;

  function sample() {
    if (!running) return;
    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(canvas.width * 0.3, canvas.height * 0.25, canvas.width * 0.4, canvas.height * 0.5).data;
      let g = 0;
      let count = 0;
      for (let i = 0; i < data.length; i += 4) {
        g += data[i + 1];
        count += 1;
      }
      const green = g / count;
      samples.push({ value: green, t: performance.now() });
      if (samples.length > MAX_SAMPLES) samples.shift();
      if (samples.length === MAX_SAMPLES) {
        hrEstimate = estimateBpm(samples);
        onUpdate?.({ bpm: hrEstimate });
      }
    } catch (error) {
      onError?.(error);
    }
    timer = window.setTimeout(sample, 1000 / SAMPLE_HZ);
  }

  function estimateBpm(window) {
    const values = window.map((s) => s.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const centered = values.map((v) => v - mean);
    const duration = (window[window.length - 1].t - window[0].t) / 1000;
    let peaks = 0;
    for (let i = 1; i < centered.length - 1; i += 1) {
      if (centered[i] > 0 && centered[i] > centered[i - 1] && centered[i] > centered[i + 1]) peaks += 1;
    }
    const bpm = (peaks / duration) * 60;
    if (bpm < 40 || bpm > 180) return 0;
    return Math.round(bpm);
  }

  sample();

  return {
    stop() {
      running = false;
      window.clearTimeout(timer);
      stream.getTracks().forEach((track) => track.stop());
    },
    get hr() { return hrEstimate; },
  };
}
