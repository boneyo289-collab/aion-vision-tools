import * as formulas from './formulas.js';
import { parseCamerasCsv } from './cameras.js';

const STORAGE_KEY = 'aion-vision-ui';
let LANG = 'ko';

const ERROR_MESSAGES = {
  MISSING: { ko: '값을 입력하세요', en: 'Enter a value' },
  NOT_POSITIVE: { ko: '0보다 큰 값을 입력하세요', en: 'Enter a value greater than 0' },
  WD_LE_F: { ko: 'WD는 Focal Length보다 커야 합니다', en: 'WD must be greater than the Focal Length' },
  MARGIN_TOO_LARGE: {
    ko: '마진이 이론적 노출시간보다 크거나 같습니다 — 마진을 줄이세요',
    en: 'Margin is greater than or equal to the theoretical exposure — reduce the margin',
  },
};

const LABELS = {
  CAMERA_MODEL: { ko: '카메라 모델', en: 'Camera model' },
  CAMERA_MANUAL: { ko: '직접 입력', en: 'Manual entry' },
  CAMERA_UNAVAILABLE: { ko: '카메라 목록 없음 — 직접 입력', en: 'No camera list — manual entry' },
  APP_TITLE: { ko: '머신비전 계산기', en: 'Machine Vision Calculators' },
  APP_SUB: { ko: '광학 · 타이밍 · 라인스캔', en: 'Optics · Timing · Line scan' },
  COMING_SOON: { ko: '+ 계산기 추가 예정', en: '+ More calculators coming' },
  FOOTER_SUB: { ko: '사내용 계산 도구', en: 'Internal engineering tool' },
  MODE_SPEED: { ko: '속도·분해능', en: 'Speed · Resolution' },
  MODE_FPS: { ko: 'Frame rate', en: 'Frame rate' },
  MODE_FOV_LENS: { ko: '렌즈·WD', en: 'Lens · WD' },
  MODE_FOV_RES: { ko: '분해능·픽셀수', en: 'Resolution · Pixel count' },
  MODE_DOF_COC: { ko: 'CoC·배율', en: 'CoC · Magnification' },
  MODE_DOF_WAVE: { ko: '파장·NA', en: 'Wavelength · NA' },
  MODE_FOCAL_WD: { ko: 'WD 구하기', en: 'Find WD' },
  MODE_FOCAL_FL: { ko: 'Focal Length 구하기', en: 'Find Focal Length' },
  MODE_MAG_PIXELS: { ko: '픽셀사이즈·분해능', en: 'Pixel size · Resolution' },
  MODE_MAG_FOV: { ko: '센서크기·FOV', en: 'Sensor size · FOV' },
  RESULTS_HEADER: { ko: '계산 결과', en: 'Results' },
};

const CALC_DEFS = {
  fov: {
    num: '01',
    kicker: '01 · Optics',
    name: { ko: 'FOV 계산', en: 'FOV Calculation' },
    note: {
      ko: 'WD는 렌즈 주점 기준입니다. 실제 렌즈 카탈로그의 WD(렌즈 앞면 기준)와는 차이가 있으니 최종 선정은 렌즈 사양서를 확인하세요.',
      en: 'WD is measured from the lens principal point. This differs from the WD in lens catalogs (measured from the front of the lens) — confirm the final choice against the lens datasheet.',
    },
    inputs: [
      { key: 'pxs', label: { ko: '픽셀사이즈', en: 'Pixel size' }, unit: '㎛' },
      { key: 'f', label: { ko: 'Focal Length', en: 'Focal Length' }, unit: 'mm' },
      { key: 'rw', label: { ko: '해상도 가로', en: 'Resolution H' }, unit: 'px' },
      { key: 'rh', label: { ko: '해상도 세로', en: 'Resolution V' }, unit: 'px' },
      { key: 'wd', label: { ko: 'WD', en: 'WD' }, unit: 'mm' },
      { key: 'res', label: { ko: '분해능', en: 'Resolution' }, unit: '㎛/px' },
    ],
    results: [
      { key: 'major', label: { ko: 'FOV 장축', en: 'FOV major axis' }, unit: 'mm' },
      { key: 'minor', label: { ko: 'FOV 단축', en: 'FOV minor axis' }, unit: 'mm' },
      { key: 'r', label: { ko: '분해능', en: 'Resolution' }, unit: '㎛/px' },
      { key: 'm', label: { ko: '배율', en: 'Magnification' }, unit: '' },
    ],
  },
  mag: {
    num: '04',
    kicker: '04 · Optics',
    name: { ko: '배율 계산', en: 'Magnification Calculation' },
    inputs: [
      { key: 'pxs', label: { ko: '픽셀사이즈', en: 'Pixel size' }, unit: '㎛' },
      { key: 'res', label: { ko: '분해능', en: 'Resolution' }, unit: '㎛/px' },
      { key: 's', label: { ko: '센서 크기', en: 'Sensor size' }, unit: 'mm' },
      { key: 'fov', label: { ko: 'FOV', en: 'FOV' }, unit: 'mm' },
    ],
    results: [
      { key: 'm', label: { ko: '배율', en: 'Magnification' }, unit: '' },
    ],
  },
  exposure: {
    num: '05',
    kicker: '05 · Timing',
    name: { ko: '최적 Exposure time 계산', en: 'Optimal Exposure Time' },
    note: {
      ko: '마진은 카메라의 FOT/오버헤드 시간입니다. 기종마다 다르니 사양서를 확인하세요.',
      en: 'Margin is the camera FOT/overhead time. This varies by model — check the datasheet.',
    },
    inputs: [
      { key: 'speed', label: { ko: '이동속도', en: 'Object speed' }, unit: 'mm/s' },
      { key: 'r', label: { ko: '분해능', en: 'Resolution' }, unit: '㎛/px' },
      { key: 'fps', label: { ko: 'Frame rate', en: 'Frame rate' }, unit: 'fps' },
      { key: 'margin', label: { ko: '마진', en: 'Margin' }, unit: '㎲' },
    ],
    results: [
      { key: 'ttheo', label: { ko: '이론적 노출시간', en: 'Theoretical exposure' }, unit: '㎲' },
      { key: 'trec', label: { ko: '권장 노출시간', en: 'Recommended exposure' }, unit: '㎲' },
    ],
  },
  focal: {
    num: '02',
    kicker: '02 · Optics',
    name: { ko: 'WD 계산', en: 'WD Calculation' },
    note: {
      ko: '목표 FOV는 가로 기준입니다. WD는 렌즈 주점 기준입니다.',
      en: 'Target FOV is measured horizontally. WD is measured from the lens principal point.',
    },
    inputs: [
      { key: 'pxs', label: { ko: '픽셀사이즈', en: 'Pixel size' }, unit: '㎛' },
      { key: 'f', label: { ko: 'Focal Length', en: 'Focal Length' }, unit: 'mm' },
      { key: 'rw', label: { ko: '해상도 가로', en: 'Resolution H' }, unit: 'px' },
      { key: 'rh', label: { ko: '해상도 세로', en: 'Resolution V' }, unit: 'px' },
      { key: 'fov', label: { ko: '목표 FOV', en: 'Target FOV' }, unit: 'mm' },
      { key: 'wd', label: { ko: 'WD', en: 'WD' }, unit: 'mm' },
    ],
    results: [
      { key: 'wd', label: { ko: 'WD', en: 'WD' }, unit: 'mm' },
      { key: 'm', label: { ko: '배율', en: 'Magnification' }, unit: '' },
      { key: 'f', label: { ko: 'Focal Length', en: 'Focal Length' }, unit: 'mm' },
    ],
  },
  dof: {
    num: '03',
    kicker: '03 · Optics',
    name: { ko: '심도 (DOF) 계산', en: 'DOF Calculation' },
    inputs: [
      { key: 'n', label: { ko: '조리개', en: 'Aperture' }, unit: 'F' },
      { key: 'pxs', label: { ko: '픽셀사이즈', en: 'Pixel size' }, unit: '㎛' },
      { key: 'k', label: { ko: '허용 CoC', en: 'Allowable CoC' }, unit: 'px' },
      { key: 'm', label: { ko: '배율', en: 'Magnification' }, unit: { ko: '배', en: '×' } },
      { key: 'lambda', label: { ko: '파장', en: 'Wavelength' }, unit: 'nm' },
      { key: 'na', label: { ko: 'NA', en: 'NA' }, unit: '' },
    ],
    results: [
      { key: 'half', label: { ko: '± DOF', en: '± DOF' }, unit: '㎛' },
      { key: 'total', label: { ko: '총 DOF', en: 'Total DOF' }, unit: '㎛' },
      { key: 'coc', label: { ko: 'CoC', en: 'CoC' }, unit: 'mm' },
    ],
  },
  linescan: {
    num: '06',
    kicker: '06 · Line scan',
    name: { ko: 'Linerate 계산', en: 'Line Rate Calculation' },
    note: {
      ko: '정사각 픽셀 가정: 스캔 방향 픽셀 크기는 라인레이트가 결정합니다(가로=세로 샘플링).',
      en: 'Assumes square pixels: the line rate determines the scan-direction pixel size (H = V sampling).',
    },
    inputs: [
      { key: 'speed', label: { ko: '반송 속도', en: 'Conveyor speed' }, unit: 'mm/s' },
      { key: 'r', label: { ko: '분해능', en: 'Resolution' }, unit: '㎛/px' },
    ],
    results: [
      { key: 'rate', label: { ko: '라인레이트', en: 'Line rate' }, unit: 'kHz' },
      { key: 'period', label: { ko: '라인당 시간', en: 'Time per line' }, unit: '㎲' },
    ],
  },
};

let currentScreen = 'home';
let backTarget = null;
let cameras = [];
let pendingCameraSelections = {};
const CAMERA_SCREENS = ['fov', 'focal'];

const MODE_OPTIONS = {
  exposure: ['speed', 'fps'],
  fov: ['lens', 'res'],
  focal: ['wd', 'fl'],
  dof: ['coc', 'wave'],
  mag: ['pixels', 'fov'],
};
const modeState = {
  exposure: 'speed',
  fov: 'lens',
  focal: 'wd',
  dof: 'coc',
  mag: 'pixels',
};

let lastResults = { fov: null, focal: null, dof: null, mag: null };

const CHAINS = [
  { from: 'fov', fromMode: 'lens', valueKey: 'r', to: 'exposure', toMode: 'speed', toField: 'r', label: { ko: '→ Exposure', en: '→ Exposure' } },
  { from: 'fov', fromMode: 'lens', valueKey: 'r', to: 'linescan', toField: 'r', label: { ko: '→ Linerate', en: '→ Linerate' } },
  { from: 'fov', fromMode: 'lens', valueKey: 'r', to: 'mag', toMode: 'pixels', toField: 'res', label: { ko: '→ 배율', en: '→ Magnification' } },
  { from: 'fov', fromMode: 'lens', valueKey: 'm', to: 'dof', toMode: 'coc', toField: 'm', label: { ko: '→ 심도', en: '→ DOF' } },
  { from: 'fov', valueKey: 'major', to: 'focal', toField: 'fov', label: { ko: '→ WD', en: '→ WD' } },
  { from: 'fov', valueKey: 'major', to: 'mag', toMode: 'fov', toField: 'fov', label: { ko: '→ 배율', en: '→ Magnification' } },
  { from: 'focal', fromMode: 'wd', valueKey: 'm', to: 'dof', toMode: 'coc', toField: 'm', label: { ko: '→ 심도', en: '→ DOF' } },
  { from: 'focal', fromMode: 'fl', valueKey: 'f', to: 'fov', toMode: 'lens', toField: 'f', label: { ko: '→ FOV', en: '→ FOV' } },
  { from: 'focal', fromMode: 'fl', valueKey: 'm', to: 'dof', toMode: 'coc', toField: 'm', label: { ko: '→ 심도', en: '→ DOF' } },
  { from: 'mag', valueKey: 'm', to: 'dof', toMode: 'coc', toField: 'm', label: { ko: '→ 심도', en: '→ DOF' } },
];

function errorText(code) {
  return (ERROR_MESSAGES[code] || ERROR_MESSAGES.NOT_POSITIVE)[LANG];
}

function labelText(code) {
  return LABELS[code][LANG];
}

function resolveUnit(unit) {
  return typeof unit === 'object' && unit !== null ? unit[LANG] : unit;
}

function applyStaticLabels() {
  document.documentElement.lang = LANG;

  document.querySelectorAll('[data-label]').forEach((el) => {
    el.textContent = labelText(el.dataset.label);
  });
  document.querySelectorAll('[data-calc-name]').forEach((el) => {
    el.textContent = CALC_DEFS[el.dataset.calcName].name[LANG];
  });
  document.querySelectorAll('[data-calc-kicker]').forEach((el) => {
    el.textContent = CALC_DEFS[el.dataset.calcKicker].kicker;
  });
  document.querySelectorAll('[data-calc-note]').forEach((el) => {
    el.textContent = CALC_DEFS[el.dataset.calcNote].note[LANG];
  });
  document.querySelectorAll('[data-field-label]').forEach((el) => {
    const [calcId, kind, key] = el.dataset.fieldLabel.split(':');
    const list = kind === 'input' ? CALC_DEFS[calcId].inputs : CALC_DEFS[calcId].results;
    const field = list.find((f) => f.key === key);
    if (field) el.textContent = field.label[LANG];
  });
  document.querySelectorAll('[data-field-unit]').forEach((el) => {
    const [calcId, kind, key] = el.dataset.fieldUnit.split(':');
    const list = kind === 'input' ? CALC_DEFS[calcId].inputs : CALC_DEFS[calcId].results;
    const field = list.find((f) => f.key === key);
    if (field) el.textContent = resolveUnit(field.unit);
  });
  document.querySelectorAll('[data-action="set-lang"]').forEach((el) => {
    el.classList.toggle('active', el.dataset.lang === LANG);
  });
  document.querySelectorAll('[data-action="set-mode"]').forEach((el) => {
    const calcId = el.closest('.screen[data-calc]')?.dataset.calc;
    el.classList.toggle('active', calcId != null && el.dataset.mode === modeState[calcId]);
  });
  document.querySelectorAll('[data-mode-group]').forEach((el) => {
    const calcId = el.closest('.screen[data-calc]')?.dataset.calc;
    el.hidden = calcId == null || el.dataset.modeGroup !== modeState[calcId];
  });
}

function updateDateBadges() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const text = `${y}-${m}-${day}`;
  document.querySelectorAll('[data-role="today-date"]').forEach((el) => {
    el.textContent = text;
  });
}

function setMode(calcId, mode) {
  const options = MODE_OPTIONS[calcId];
  if (!options || !options.includes(mode)) return;
  if (modeState[calcId] === mode) return;
  modeState[calcId] = mode;
  applyStaticLabels();
  runCompute(calcId);
  persist();
}

function isFieldVisible(calcId, key) {
  const el = document.getElementById(`${calcId}-${key}`);
  if (!el) return false;
  const group = el.closest('[data-mode-group]');
  return !group || !group.hidden;
}

function setLang(lang) {
  if (lang !== 'ko' && lang !== 'en') return;
  if (lang === LANG) return;
  LANG = lang;
  applyStaticLabels();
  CAMERA_SCREENS.forEach((calcId) => {
    const sel = document.getElementById(`${calcId}-camera`);
    if (!sel) return;
    const currentVal = sel.value;
    populateCameraSelect(calcId);
    const hasOption = Array.from(sel.options).some((o) => o.value === currentVal);
    if (hasOption) sel.value = currentVal;
  });
  computeAll();
  persist();
}

function getNum(calcId, key) {
  const el = document.getElementById(`${calcId}-${key}`);
  return el ? parseFloat(el.value) : NaN;
}

function setNum(calcId, key, value) {
  const el = document.getElementById(`${calcId}-${key}`);
  if (el) el.value = value;
}

function fmt(value, decimals) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toFixed(decimals);
}

function setResult(id, text) {
  const el = document.getElementById(id);
  if (!el) return;
  const changed = el.textContent !== text;
  el.textContent = text;
  if (changed) {
    el.classList.remove('result-flash');
    void el.offsetWidth;
    el.classList.add('result-flash');
  }
}

function showError(calcId, code) {
  const el = document.getElementById(`${calcId}-error`);
  if (!el) return;
  if (code) {
    el.textContent = errorText(code);
    el.classList.add('visible');
  } else {
    el.textContent = '';
    el.classList.remove('visible');
  }
}

function chainsFor(calcId) {
  const mode = modeState[calcId];
  return CHAINS.filter((c) => c.from === calcId && (c.fromMode === undefined || c.fromMode === mode));
}

function renderChainButtons(calcId) {
  const container = document.querySelector(`#screen-${calcId} [data-chain-container]`);
  if (!container) return;
  container.innerHTML = '';
  const results = lastResults[calcId];
  chainsFor(calcId).forEach((chain) => {
    const value = results ? results[chain.valueKey] : undefined;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn chain-btn';
    btn.textContent = chain.label[LANG];
    btn.disabled = typeof value !== 'number' || !Number.isFinite(value);
    btn.addEventListener('click', () => runChain(chain));
    container.appendChild(btn);
  });
}

function runChain(chain) {
  const results = lastResults[chain.from];
  const value = results ? results[chain.valueKey] : undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  if (chain.toMode) setMode(chain.to, chain.toMode);
  setNum(chain.to, chain.toField, roundForInput(value));
  backTarget = currentScreen;
  showScreen(chain.to);
}

function computeFov() {
  if (modeState.fov === 'res') return computeFovRes();
  return computeFovLens();
}

function computeFovLens() {
  const pxs = getNum('fov', 'pxs');
  const f = getNum('fov', 'f');
  const rw = getNum('fov', 'rw');
  const rh = getNum('fov', 'rh');
  const wd = getNum('fov', 'wd');

  const fail = (code) => {
    setResult('fov-result-major', '—');
    setResult('fov-result-minor', '—');
    setResult('fov-result-r', '—');
    setResult('fov-result-m', '—');
    showError('fov', code);
    lastResults.fov = null;
  };

  const sensor = formulas.sensorSize({ pxSizeUm: pxs, pxCountH: rw, pxCountV: rh });
  if (!sensor.ok) return fail(sensor.error);

  const fovW = formulas.fovFromLens({ sensorMm: sensor.values.widthMm, f, wd });
  if (!fovW.ok) return fail(fovW.error);

  const fovH = formulas.fovFromLens({ sensorMm: sensor.values.heightMm, f, wd });
  if (!fovH.ok) return fail(fovH.error);

  const res = formulas.resolutionFromMag({ pxSizeUm: pxs, M: fovW.values.M });
  if (!res.ok) return fail(res.error);

  const major = Math.max(fovW.values.fovMm, fovH.values.fovMm);
  const minor = Math.min(fovW.values.fovMm, fovH.values.fovMm);

  showError('fov', null);
  setResult('fov-result-major', fmt(major, 1));
  setResult('fov-result-minor', fmt(minor, 1));
  setResult('fov-result-r', fmt(res.values.resolutionUm, 2));
  setResult('fov-result-m', fmt(fovW.values.M, 3));
  lastResults.fov = { r: res.values.resolutionUm, m: fovW.values.M, major, minor };
}

function computeFovRes() {
  const resolutionUm = getNum('fov', 'res');
  const rw = getNum('fov', 'rw');
  const rh = getNum('fov', 'rh');

  const fail = (code) => {
    setResult('fov-result-major', '—');
    setResult('fov-result-minor', '—');
    showError('fov', code);
    lastResults.fov = null;
  };

  const fovW = formulas.fovFromResolution({ resolutionUm, pxCount: rw });
  if (!fovW.ok) return fail(fovW.error);

  const fovH = formulas.fovFromResolution({ resolutionUm, pxCount: rh });
  if (!fovH.ok) return fail(fovH.error);

  const major = Math.max(fovW.values.fovMm, fovH.values.fovMm);
  const minor = Math.min(fovW.values.fovMm, fovH.values.fovMm);

  showError('fov', null);
  setResult('fov-result-major', fmt(major, 1));
  setResult('fov-result-minor', fmt(minor, 1));
  lastResults.fov = { major, minor };
}

function populateCameraSelect(calcId) {
  const sel = document.getElementById(`${calcId}-camera`);
  if (!sel) return;

  sel.innerHTML = '';
  const manualOpt = document.createElement('option');
  manualOpt.value = '';
  manualOpt.textContent = labelText('CAMERA_MANUAL');
  sel.appendChild(manualOpt);

  if (cameras.length === 0) {
    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.disabled = true;
    noneOpt.textContent = labelText('CAMERA_UNAVAILABLE');
    sel.appendChild(noneOpt);
    return;
  }

  cameras.forEach((cam, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = cam.model;
    sel.appendChild(opt);
  });
}

function restoreCameraSelection(calcId) {
  const sel = document.getElementById(`${calcId}-camera`);
  const pending = pendingCameraSelections[calcId];
  if (!sel || pending === undefined) return;
  const hasOption = Array.from(sel.options).some((o) => o.value === pending);
  if (hasOption) sel.value = pending;
  delete pendingCameraSelections[calcId];
}

async function loadCameras() {
  try {
    const res = await fetch('data/cameras.csv');
    if (!res.ok) throw new Error('fetch failed');
    const text = await res.text();
    cameras = parseCamerasCsv(text);
  } catch (e) {
    cameras = [];
  }
  CAMERA_SCREENS.forEach((calcId) => {
    populateCameraSelect(calcId);
    restoreCameraSelection(calcId);
  });
}

function applyCameraSelection(calcId, value) {
  if (value === '') return;
  const cam = cameras[Number(value)];
  if (!cam) return;
  setNum(calcId, 'rw', cam.widthPx);
  setNum(calcId, 'rh', cam.heightPx);
  setNum(calcId, 'pxs', cam.pixelSizeUm);
  runCompute(calcId);
}

function computeExposure() {
  const margin = getNum('exposure', 'margin');

  const fail = (code) => {
    setResult('exposure-result-ttheo', '—');
    setResult('exposure-result-trec', '—');
    showError('exposure', code);
  };

  const out = modeState.exposure === 'speed'
    ? formulas.exposureFromSpeed({ resolutionUm: getNum('exposure', 'r'), speedMmS: getNum('exposure', 'speed'), marginUs: margin })
    : formulas.exposureFromFps({ fps: getNum('exposure', 'fps'), marginUs: margin });
  if (!out.ok) return fail(out.error);

  showError('exposure', null);
  setResult('exposure-result-ttheo', fmt(out.values.tTheoUs, 1));
  setResult('exposure-result-trec', fmt(out.values.tRecUs, 1));
}

function computeFocal() {
  if (modeState.focal === 'fl') return computeFocalFl();
  return computeFocalWd();
}

function computeFocalWd() {
  const pxs = getNum('focal', 'pxs');
  const f = getNum('focal', 'f');
  const rw = getNum('focal', 'rw');
  const rh = getNum('focal', 'rh');
  const fovMm = getNum('focal', 'fov');

  const fail = (code) => {
    setResult('focal-result-wd', '—');
    setResult('focal-result-m', '—');
    showError('focal', code);
    lastResults.focal = null;
  };

  const sensor = formulas.sensorSize({ pxSizeUm: pxs, pxCountH: rw, pxCountV: rh });
  if (!sensor.ok) return fail(sensor.error);

  const mag = formulas.magFromFov({ sensorMm: sensor.values.widthMm, fovMm });
  if (!mag.ok) return fail(mag.error);

  const wd = formulas.wdFromMag({ f, M: mag.values.M });
  if (!wd.ok) return fail(wd.error);

  showError('focal', null);
  setResult('focal-result-wd', fmt(wd.values.wdMm, 1));
  setResult('focal-result-m', fmt(mag.values.M, 3));
  lastResults.focal = { wd: wd.values.wdMm, m: mag.values.M };
}

function computeFocalFl() {
  const pxs = getNum('focal', 'pxs');
  const rw = getNum('focal', 'rw');
  const rh = getNum('focal', 'rh');
  const wd = getNum('focal', 'wd');
  const fovMm = getNum('focal', 'fov');

  const fail = (code) => {
    setResult('focal-result-f', '—');
    setResult('focal-result-m', '—');
    showError('focal', code);
    lastResults.focal = null;
  };

  const sensor = formulas.sensorSize({ pxSizeUm: pxs, pxCountH: rw, pxCountV: rh });
  if (!sensor.ok) return fail(sensor.error);

  const focal = formulas.focalFromFov({ sensorMm: sensor.values.widthMm, fovMm, wd });
  if (!focal.ok) return fail(focal.error);

  showError('focal', null);
  setResult('focal-result-f', fmt(focal.values.f, 1));
  setResult('focal-result-m', fmt(focal.values.M, 3));
  lastResults.focal = { f: focal.values.f, m: focal.values.M };
}

function computeDof() {
  const mode = modeState.dof;
  const out = mode === 'wave'
    ? formulas.dofDiffraction({ lambdaNm: getNum('dof', 'lambda'), NA: getNum('dof', 'na') })
    : formulas.dof({ N: getNum('dof', 'n'), pxSizeUm: getNum('dof', 'pxs'), k: getNum('dof', 'k'), M: getNum('dof', 'm') });

  if (!out.ok) {
    setResult('dof-result-half', '—');
    setResult('dof-result-total', '—');
    setResult('dof-result-coc', '—');
    showError('dof', out.error);
    return;
  }
  showError('dof', null);
  setResult('dof-result-half', fmt(out.values.halfMm * 1000, 1));
  setResult('dof-result-total', fmt(out.values.totalMm * 1000, 1));
  if (mode === 'coc') {
    setResult('dof-result-coc', fmt(out.values.cocMm, 4));
  }
}

function computeLinescan() {
  const speed = getNum('linescan', 'speed');
  const r = getNum('linescan', 'r');

  const out = formulas.lineScan({ speedMmS: speed, resolutionUm: r });
  if (!out.ok) {
    setResult('linescan-result-rate', '—');
    setResult('linescan-result-period', '—');
    showError('linescan', out.error);
    return;
  }
  showError('linescan', null);
  setResult('linescan-result-rate', fmt(out.values.lineRateKhz, 2));
  setResult('linescan-result-period', fmt(out.values.linePeriodUs, 2));
}

function computeMag() {
  const mode = modeState.mag;
  const fail = (code) => {
    setResult('mag-result-m', '—');
    showError('mag', code);
    lastResults.mag = null;
  };

  const out = mode === 'fov'
    ? formulas.magFromFov({ sensorMm: getNum('mag', 's'), fovMm: getNum('mag', 'fov') })
    : formulas.magFromPixels({ pxSizeUm: getNum('mag', 'pxs'), resolutionUm: getNum('mag', 'res') });
  if (!out.ok) return fail(out.error);

  showError('mag', null);
  setResult('mag-result-m', fmt(out.values.M, 4));
  lastResults.mag = { m: out.values.M };
}

const COMPUTE_FNS = {
  fov: computeFov,
  exposure: computeExposure,
  focal: computeFocal,
  dof: computeDof,
  linescan: computeLinescan,
  mag: computeMag,
};

function runCompute(calcId) {
  const fn = COMPUTE_FNS[calcId];
  if (fn) fn();
  renderChainButtons(calcId);
}

function computeAll() {
  Object.keys(COMPUTE_FNS).forEach(runCompute);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const target = document.getElementById(`screen-${id}`);
  if (!target) return;
  target.classList.add('active');
  currentScreen = id;
  runCompute(id);
  persist();
}

function persist() {
  const inputs = {};
  document.querySelectorAll('.screen[data-calc] .input').forEach((el) => {
    inputs[el.id] = el.value;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen: currentScreen, lang: LANG, modeState, inputs }));
  } catch (e) {}
}

function restore() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch (e) {}
  if (saved && (saved.lang === 'ko' || saved.lang === 'en')) LANG = saved.lang;
  if (saved && saved.modeState) {
    Object.keys(MODE_OPTIONS).forEach((calcId) => {
      const m = saved.modeState[calcId];
      if (m && MODE_OPTIONS[calcId].includes(m)) modeState[calcId] = m;
    });
  }
  if (saved && saved.inputs) {
    for (const [id, value] of Object.entries(saved.inputs)) {
      const cameraMatch = CAMERA_SCREENS.find((calcId) => id === `${calcId}-camera`);
      if (cameraMatch) {
        pendingCameraSelections[cameraMatch] = value;
        continue;
      }
      const el = document.getElementById(id);
      if (el) el.value = value;
    }
  }
  return saved && saved.screen ? saved.screen : 'home';
}

function roundForInput(value) {
  return String(Math.round(value * 10000) / 10000);
}

document.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.classList || !el.classList.contains('input')) return;
  const screen = el.closest('.screen[data-calc]');
  if (!screen) return;
  const calcId = screen.dataset.calc;

  if (el.id === `${calcId}-camera`) {
    applyCameraSelection(calcId, el.value);
    persist();
    return;
  }
  if (['rw', 'rh', 'pxs'].some((key) => el.id === `${calcId}-${key}`)) {
    const sel = document.getElementById(`${calcId}-camera`);
    if (sel && sel.value !== '') sel.value = '';
  }

  runCompute(calcId);
  persist();
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  if (action === 'open') {
    backTarget = null;
    showScreen(btn.dataset.target);
  } else if (action === 'home') {
    const target = backTarget;
    backTarget = null;
    showScreen(target || 'home');
  } else if (action === 'set-lang') setLang(btn.dataset.lang);
  else if (action === 'set-mode') {
    const calcId = btn.closest('.screen[data-calc]')?.dataset.calc;
    if (calcId) setMode(calcId, btn.dataset.mode);
  }
});

const initialScreen = restore();
applyStaticLabels();
updateDateBadges();
computeAll();
showScreen(initialScreen);
loadCameras();
