import * as formulas from './formulas.js';
import { solveOptics } from './optics-core.js';
import { parseCamerasCsv } from './cameras.js';
import { ACCESS_SHA256 } from './access-config.js';

const STORAGE_KEY = 'aion-vision-ui';
const ACCESS_STORAGE_KEY = 'aion.access';
const ACCESS_TTL_MS = 1 * 60 * 60 * 1000;
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
  MODE_FOV_TFOV: { ko: '목표 FOV', en: 'Target FOV' },
  MODE_FOV_RES: { ko: '목표 분해능', en: 'Target resolution' },
  MODE_FOV_MAG: { ko: '배율', en: 'Magnification' },
  MODE_FOV_LENS: { ko: '렌즈 (f·WD)', en: 'Lens (f · WD)' },
  MODE_DOF_COC: { ko: 'CoC·배율', en: 'CoC · Magnification' },
  MODE_DOF_WAVE: { ko: '파장·NA', en: 'Wavelength · NA' },
  MODE_FOCAL_WD: { ko: 'WD 구하기', en: 'Find WD' },
  MODE_FOCAL_FL: { ko: 'Focal Length 구하기', en: 'Find Focal Length' },
  MODE_MAG_PIXELS: { ko: '픽셀사이즈·분해능', en: 'Pixel size · Resolution' },
  MODE_MAG_FOV: { ko: '센서크기·FOV', en: 'Sensor size · FOV' },
  RESULTS_HEADER: { ko: '계산 결과', en: 'Results' },
  ACCESS_TITLE: { ko: '암호를 입력하세요', en: 'Enter password' },
  ACCESS_PLACEHOLDER: { ko: '암호', en: 'Password' },
  ACCESS_SUBMIT: { ko: '확인', en: 'Submit' },
  ACCESS_ERROR: { ko: '암호가 올바르지 않습니다', en: 'Incorrect password' },
};

const CALC_DEFS = {
  fov: {
    num: '01',
    kicker: '01 · Optics',
    name: { ko: '광학 — FOV·분해능·배율·WD/Focal', en: 'Optics — FOV · Resolution · Magnification · WD/Focal' },
    note: {
      ko: 'WD는 렌즈 주점 기준입니다. 실제 렌즈 카탈로그의 WD(렌즈 앞면 기준)와는 차이가 있으니 최종 선정은 렌즈 사양서를 확인하세요. Focal Length·WD는 선택 입력입니다 — 하나만 채우면 나머지를 계산합니다(렌즈 모드는 둘 다 입력).',
      en: 'WD is measured from the lens principal point. This differs from the WD in lens catalogs (measured from the front of the lens) — confirm the final choice against the lens datasheet. Focal Length and WD are optional — fill in just one to derive the other (the Lens mode uses both).',
    },
    inputs: [
      { key: 'pxs', label: { ko: '픽셀사이즈', en: 'Pixel size' }, unit: '㎛' },
      { key: 'f', label: { ko: 'Focal Length', en: 'Focal Length' }, unit: 'mm' },
      { key: 'rw', label: { ko: '해상도 가로', en: 'Resolution H' }, unit: 'px' },
      { key: 'rh', label: { ko: '해상도 세로', en: 'Resolution V' }, unit: 'px' },
      { key: 'wd', label: { ko: 'WD', en: 'WD' }, unit: 'mm' },
      { key: 'ftgt', label: { ko: '목표 FOV', en: 'Target FOV' }, unit: 'mm' },
      { key: 'res', label: { ko: '분해능', en: 'Resolution' }, unit: '㎛/px' },
      { key: 'm', label: { ko: '배율', en: 'Magnification' }, unit: { ko: '배', en: '×' } },
    ],
    results: [
      { key: 'major', label: { ko: 'FOV 장축', en: 'FOV major axis' }, unit: 'mm' },
      { key: 'minor', label: { ko: 'FOV 단축', en: 'FOV minor axis' }, unit: 'mm' },
      { key: 'r', label: { ko: '분해능', en: 'Resolution' }, unit: '㎛/px' },
      { key: 'm', label: { ko: '배율', en: 'Magnification' }, unit: '' },
      { key: 'wd', label: { ko: 'WD', en: 'WD' }, unit: 'mm' },
      { key: 'f', label: { ko: 'Focal Length', en: 'Focal Length' }, unit: 'mm' },
      { key: 'sensorw', label: { ko: '센서 가로', en: 'Sensor width' }, unit: 'mm' },
      { key: 'sensorh', label: { ko: '센서 세로', en: 'Sensor height' }, unit: 'mm' },
      { key: 'sensordiag', label: { ko: '센서 대각', en: 'Sensor diagonal' }, unit: 'mm' },
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
    name: { ko: 'LineRate 계산', en: 'LineRate Calculation' },
    note: {
      ko: '정사각 픽셀 가정: 스캔 방향 픽셀 크기는 LineRate가 결정합니다(가로=세로 샘플링).',
      en: 'Assumes square pixels: the LineRate determines the scan-direction pixel size (H = V sampling).',
    },
    inputs: [
      { key: 'speed', label: { ko: '이동 속도', en: 'Travel speed' }, unit: 'mm/s' },
      { key: 'r', label: { ko: '분해능', en: 'Resolution' }, unit: '㎛/px' },
    ],
    results: [
      { key: 'rate', label: { ko: 'LineRate', en: 'LineRate' }, unit: 'kHz' },
      { key: 'period', label: { ko: 'LineRate 간격', en: 'LineRate interval' }, unit: '㎲' },
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
  fov: ['tfov', 'res', 'mag', 'lens'],
  focal: ['wd', 'fl'],
  dof: ['coc', 'wave'],
  mag: ['pixels', 'fov'],
};
const modeState = {
  exposure: 'speed',
  fov: 'tfov',
  focal: 'wd',
  dof: 'coc',
  mag: 'pixels',
};

let lastResults = { fov: null, focal: null, dof: null, mag: null };

const CHAINS = [
  { from: 'fov', fromMode: 'lens', valueKey: 'r', to: 'exposure', toMode: 'speed', toField: 'r', label: { ko: '→ Exposure', en: '→ Exposure' } },
  { from: 'fov', fromMode: 'lens', valueKey: 'r', to: 'linescan', toField: 'r', label: { ko: '→ LineRate', en: '→ LineRate' } },
  { from: 'fov', fromMode: 'lens', valueKey: 'm', to: 'dof', toMode: 'coc', toField: 'm', label: { ko: '→ 심도', en: '→ DOF' } },
  { from: 'fov', fromMode: 'res', valueKey: 'major', to: 'focal', toField: 'fov', label: { ko: '→ WD', en: '→ WD' } },
  { from: 'fov', fromMode: 'res', valueKey: 'major', to: 'mag', toMode: 'fov', toField: 'fov', label: { ko: '→ 배율', en: '→ Magnification' } },
  { from: 'focal', fromMode: 'wd', valueKey: 'm', to: 'dof', toMode: 'coc', toField: 'm', label: { ko: '→ 심도', en: '→ DOF' } },
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
  document.querySelectorAll('[data-label-placeholder]').forEach((el) => {
    el.placeholder = labelText(el.dataset.labelPlaceholder);
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

const FOV_RESULT_KEYS = ['major', 'minor', 'r', 'm', 'wd', 'f', 'sensorw', 'sensorh', 'sensordiag'];

function buildFovKnown() {
  const mode = modeState.fov;
  const known = {};
  const set = (field, value) => {
    if (Number.isFinite(value)) known[field] = value;
  };

  set('pxSizeUm', getNum('fov', 'pxs'));
  set('pxCountH', getNum('fov', 'rw'));
  set('pxCountV', getNum('fov', 'rh'));

  const f = getNum('fov', 'f');
  const wd = getNum('fov', 'wd');
  const bothLensKnown = Number.isFinite(f) && Number.isFinite(wd);
  // 배율 모드는 solver의 M 결정 경로가 ③(sensor+f+wd) → ④(M 직접) 순이라, f·WD가 둘 다 채워져
  // 있으면 사용자가 입력한 M보다 f·WD 조합이 먼저 매칭돼 M을 가로챈다 — 그 경우에만 제외한다
  // (목표FOV/목표분해능은 ①·②가 ③보다 먼저 매칭되므로 영향 없음, 렌즈 모드는 항상 포함)
  if (mode !== 'mag' || !bothLensKnown) {
    set('f', f);
    set('wd', wd);
  }

  if (mode === 'res') {
    set('resolutionUm', getNum('fov', 'res'));
  } else if (mode === 'tfov') {
    set('fovMm', getNum('fov', 'ftgt'));
  } else if (mode === 'mag') {
    set('M', getNum('fov', 'm'));
  }

  return known;
}

function computeFov() {
  const known = buildFovKnown();
  const result = solveOptics(known);

  if (!result.ok) {
    FOV_RESULT_KEYS.forEach((key) => setResult(`fov-result-${key}`, '—'));
    showError('fov', result.error);
    lastResults.fov = null;
    return;
  }

  const v = result.values;
  const w = v.fovWidthMm;
  const h = v.fovHeightMm;
  let major;
  let minor;
  if (Number.isFinite(w) && Number.isFinite(h)) {
    major = Math.max(w, h);
    minor = Math.min(w, h);
  } else if (Number.isFinite(w)) {
    major = w;
  } else if (Number.isFinite(h)) {
    major = h;
  }

  showError('fov', null);
  setResult('fov-result-major', fmt(major, 1));
  setResult('fov-result-minor', fmt(minor, 1));
  setResult('fov-result-r', fmt(v.resolutionUm, 2));
  setResult('fov-result-m', fmt(v.M, 4));
  setResult('fov-result-wd', fmt(v.wdMm, 1));
  setResult('fov-result-f', fmt(v.f, 1));
  setResult('fov-result-sensorw', fmt(v.sensorWidthMm, 2));
  setResult('fov-result-sensorh', fmt(v.sensorHeightMm, 2));
  setResult('fov-result-sensordiag', fmt(v.sensorDiagonalMm, 2));
  lastResults.fov = { major, minor, r: v.resolutionUm, m: v.M, wd: v.wdMm, f: v.f };
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

export async function hashHex(str) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isUnlockValid(record, nowMs) {
  return !!record && typeof record.until === 'number' && record.until > nowMs;
}

function readAccessRecord() {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_STORAGE_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function unlockAccess() {
  try {
    localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify({ until: Date.now() + ACCESS_TTL_MS }));
  } catch (e) {}
}

function showGate(show) {
  const el = document.getElementById('access-gate');
  if (el) el.hidden = !show;
}

function showAccessError(show) {
  const el = document.getElementById('access-error');
  if (el) el.classList.toggle('visible', show);
}

async function submitAccess() {
  const input = document.getElementById('access-password');
  const value = input ? input.value : '';
  const hash = await hashHex(value);
  if (hash === ACCESS_SHA256) {
    unlockAccess();
    showAccessError(false);
    showGate(false);
  } else {
    showAccessError(true);
  }
}

function initAccessGate() {
  if (!ACCESS_SHA256) {
    console.info('[access-gate] ACCESS_SHA256 미설정 — 게이트 비활성(fail-open)');
    return;
  }
  if (isUnlockValid(readAccessRecord(), Date.now())) return;
  showGate(true);
}

if (typeof document !== 'undefined') {
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
    } else if (action === 'access-submit') submitAccess();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'access-password') submitAccess();
  });

  const initialScreen = restore();
  applyStaticLabels();
  updateDateBadges();
  computeAll();
  initAccessGate();
  showScreen(initialScreen);
  loadCameras();
}
