import { ASSETS, MODE_META } from "./config.js";
import { getV4DrillSprite } from "./assets-v4.js";

export function getSprite(mode) {
  return getV4DrillSprite(mode) || ASSETS.sprites[mode] || ASSETS.spriteFallbacks[mode] || ASSETS.sprites.circuit;
}

export function getSpriteFallback(mode) {
  return ASSETS.spriteFallbacks[mode] || ASSETS.spriteFallbacks.circuit;
}

export function getModeVisual(mode) {
  const meta = MODE_META[mode] || MODE_META.circuit;
  return {
    ...meta,
    sprite: getSprite(mode),
    spriteFallback: getSpriteFallback(mode),
  };
}

export async function checkAssetManifest() {
  const urls = [ASSETS.backgrounds.arena, ASSETS.backgrounds.arenaFallback, ...Object.values(ASSETS.sprites)];
  const checks = await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, { method: "HEAD" });
        return { url, ok: response.ok };
      } catch {
        return { url, ok: false };
      }
    })
  );
  return checks;
}
