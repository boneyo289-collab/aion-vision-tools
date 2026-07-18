function parsePositiveNum(raw) {
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseCamerasCsv(text) {
  if (typeof text !== 'string') return [];

  const stripped = text.replace(/^﻿/, '');
  const lines = stripped.split(/\r\n|\r|\n/);

  const cameras = [];
  let headerSeen = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }

    const parts = line.split(',');
    if (parts.length < 4) continue;

    const model = parts[0].trim();
    const widthPx = parsePositiveNum(parts[1]);
    const heightPx = parsePositiveNum(parts[2]);
    const pixelSizeUm = parsePositiveNum(parts[3]);

    if (!model || widthPx === null || heightPx === null || pixelSizeUm === null) continue;

    cameras.push({ model, widthPx, heightPx, pixelSizeUm });
  }

  return cameras;
}
