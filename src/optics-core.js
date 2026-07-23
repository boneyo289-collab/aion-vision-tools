import {
  sensorSize,
  magFromPixels,
  magFromFov,
  resolutionFromMag,
  fovFromLens,
  focalFromFov,
  wdFromMag,
  fovFromResolution,
} from './formulas.js';

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

export function solveOptics(known = {}) {
  const { pxSizeUm, pxCountH, pxCountV, f, wd, M: mIn, resolutionUm: rIn, fovMm: fovIn } = known;

  const hasPxSize = isNum(pxSizeUm);
  const hasSensor = hasPxSize && isNum(pxCountH) && isNum(pxCountV);

  let sensor;
  if (hasSensor) {
    const s = sensorSize({ pxSizeUm, pxCountH, pxCountV });
    if (!s.ok) return s;
    sensor = s.values;
  }

  let M;
  let fovWidthFromPath;

  if (hasPxSize && isNum(rIn)) {
    const r = magFromPixels({ pxSizeUm, resolutionUm: rIn });
    if (!r.ok) return r;
    M = r.values.M;
  } else if (sensor && isNum(fovIn)) {
    const r = magFromFov({ sensorMm: sensor.widthMm, fovMm: fovIn });
    if (!r.ok) return r;
    M = r.values.M;
    fovWidthFromPath = fovIn;
  } else if (sensor && isNum(f) && isNum(wd)) {
    const r = fovFromLens({ sensorMm: sensor.widthMm, f, wd });
    if (!r.ok) return r;
    M = r.values.M;
    fovWidthFromPath = r.values.fovMm;
  } else if (isNum(mIn)) {
    if (!(mIn > 0)) return { ok: false, error: 'NOT_POSITIVE', field: 'M' };
    M = mIn;
  }

  const values = {};
  if (M !== undefined) values.M = M;

  let R = rIn;
  if (M !== undefined && hasPxSize) {
    const r = resolutionFromMag({ pxSizeUm, M });
    if (!r.ok) return r;
    R = r.values.resolutionUm;
  }
  if (isNum(R)) values.resolutionUm = R;

  if (sensor) {
    values.sensorWidthMm = sensor.widthMm;
    values.sensorHeightMm = sensor.heightMm;
    values.sensorDiagonalMm = sensor.diagonalMm;
  }

  if (isNum(R) && isNum(pxCountH)) {
    const fh = fovFromResolution({ resolutionUm: R, pxCount: pxCountH });
    if (!fh.ok) return fh;
    values.fovWidthMm = fh.values.fovMm;
  } else if (isNum(fovWidthFromPath)) {
    values.fovWidthMm = fovWidthFromPath;
  }
  if (isNum(R) && isNum(pxCountV)) {
    const fv = fovFromResolution({ resolutionUm: R, pxCount: pxCountV });
    if (!fv.ok) return fv;
    values.fovHeightMm = fv.values.fovMm;
  }

  if (isNum(f) && !isNum(wd) && M !== undefined) {
    const w = wdFromMag({ f, M });
    if (!w.ok) return w;
    values.f = f;
    values.wdMm = w.values.wdMm;
  } else if (isNum(wd) && !isNum(f) && sensor && isNum(values.fovWidthMm)) {
    const fc = focalFromFov({ sensorMm: sensor.widthMm, fovMm: values.fovWidthMm, wd });
    if (!fc.ok) return fc;
    values.f = fc.values.f;
    values.wdMm = wd;
  } else {
    if (isNum(f)) values.f = f;
    if (isNum(wd)) values.wdMm = wd;
  }

  return { ok: true, values };
}
