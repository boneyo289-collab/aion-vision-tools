function checkPositive(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (value === undefined || value === null || typeof value !== 'number' || Number.isNaN(value)) {
      return { ok: false, error: 'MISSING', field: name };
    }
    if (!(value > 0)) {
      return { ok: false, error: 'NOT_POSITIVE', field: name };
    }
  }
  return null;
}

function hasNonFinite(values) {
  return Object.values(values).some((v) => typeof v === 'number' && !Number.isFinite(v));
}

export function sensorSize({ pxSizeUm, pxCountH, pxCountV }) {
  const err = checkPositive({ pxSizeUm, pxCountH, pxCountV });
  if (err) return err;

  const widthMm = (pxSizeUm * pxCountH) / 1000;
  const heightMm = (pxSizeUm * pxCountV) / 1000;
  const diagonalMm = Math.sqrt(widthMm * widthMm + heightMm * heightMm);

  const values = { widthMm, heightMm, diagonalMm };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function magFromPixels({ pxSizeUm, resolutionUm }) {
  const err = checkPositive({ pxSizeUm, resolutionUm });
  if (err) return err;

  const M = pxSizeUm / resolutionUm;
  const values = { M };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function magFromFov({ sensorMm, fovMm }) {
  const err = checkPositive({ sensorMm, fovMm });
  if (err) return err;

  const M = sensorMm / fovMm;
  const values = { M };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function resolutionFromMag({ pxSizeUm, M }) {
  const err = checkPositive({ pxSizeUm, M });
  if (err) return err;

  const resolutionUm = pxSizeUm / M;
  const values = { resolutionUm };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function fovFromLens({ sensorMm, f, wd }) {
  const err = checkPositive({ sensorMm, f, wd });
  if (err) return err;
  if (!(wd > f)) return { ok: false, error: 'WD_LE_F', field: 'wd' };

  const fovMm = (sensorMm * (wd - f)) / f;
  const M = f / (wd - f);
  const values = { fovMm, M };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function focalFromFov({ sensorMm, fovMm, wd }) {
  const err = checkPositive({ sensorMm, fovMm, wd });
  if (err) return err;

  const f = (wd * sensorMm) / (fovMm + sensorMm);
  const M = f / (wd - f);
  const values = { f, M };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function wdFromMag({ f, M }) {
  const err = checkPositive({ f, M });
  if (err) return err;

  const wdMm = f * (1 + 1 / M);
  const values = { wdMm };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

function checkMargin(marginUs) {
  const margin = marginUs === undefined || marginUs === null ? 6 : marginUs;
  if (typeof margin !== 'number' || Number.isNaN(margin)) {
    return { ok: false, error: 'MISSING', field: 'marginUs' };
  }
  if (margin < 0) return { ok: false, error: 'NOT_POSITIVE', field: 'marginUs' };
  return { ok: true, margin };
}

function exposureFromTheoretical(tTheoUs, marginUs) {
  const marginCheck = checkMargin(marginUs);
  if (!marginCheck.ok) return marginCheck;

  const tRecUs = tTheoUs - marginCheck.margin;
  if (tRecUs <= 0) return { ok: false, error: 'MARGIN_TOO_LARGE', field: 'marginUs' };

  const values = { tTheoUs, tRecUs };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function exposureFromSpeed({ resolutionUm, speedMmS, marginUs }) {
  const err = checkPositive({ resolutionUm, speedMmS });
  if (err) return err;

  const tTheoUs = (resolutionUm * 1000) / speedMmS;
  return exposureFromTheoretical(tTheoUs, marginUs);
}

export function exposureFromFps({ fps, marginUs }) {
  const err = checkPositive({ fps });
  if (err) return err;

  const tTheoUs = 1e6 / fps;
  return exposureFromTheoretical(tTheoUs, marginUs);
}

export function lineScan({ speedMmS, resolutionUm }) {
  const err = checkPositive({ speedMmS, resolutionUm });
  if (err) return err;

  const lineRateKhz = speedMmS / resolutionUm;
  const linePeriodUs = 1000 / lineRateKhz;
  const values = { lineRateKhz, linePeriodUs };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function fovFromResolution({ resolutionUm, pxCount }) {
  const err = checkPositive({ resolutionUm, pxCount });
  if (err) return err;

  const fovMm = (resolutionUm * pxCount) / 1000;
  const values = { fovMm };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function dofDiffraction({ lambdaNm, NA }) {
  const err = checkPositive({ lambdaNm, NA });
  if (err) return err;

  const totalMm = (lambdaNm / 1e6) / (NA * NA);
  const halfMm = totalMm / 2;
  const values = { totalMm, halfMm };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}

export function dof({ N, pxSizeUm, k, M }) {
  const kValue = k === undefined || k === null ? 2 : k;
  const err = checkPositive({ N, pxSizeUm, k: kValue });
  if (err) return err;
  if (M === undefined || M === null || typeof M !== 'number' || Number.isNaN(M)) {
    return { ok: false, error: 'MISSING', field: 'M' };
  }
  if (M <= 0) return { ok: false, error: 'NOT_POSITIVE', field: 'M' };

  const cocMm = (kValue * pxSizeUm) / 1000;
  const halfMm = (N * cocMm * (1 + M)) / (M * M);
  const totalMm = 2 * halfMm;

  const values = { cocMm, halfMm, totalMm };
  if (hasNonFinite(values)) return { ok: false, error: 'NOT_POSITIVE' };
  return { ok: true, values };
}
