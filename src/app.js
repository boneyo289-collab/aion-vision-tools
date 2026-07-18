import * as formulas from './formulas.js';
import { parseCamerasCsv } from './cameras.js';
import { buildResultText, buildResultCsv } from './export.js';

const STORAGE_KEY = 'aion-vision-ui';
let LANG = 'ko';

const ERROR_MESSAGES = {
  MISSING: { ko: '값을 입력하세요', en: 'Enter a value' },
  NOT_POSITIVE: { ko: '0보다 큰 값을 입력하세요', en: 'Enter a value greater than 0' },
  WD_LE_F: { ko: '작동거리(WD)는 초점거리(f)보다 커야 합니다', en: 'Working distance (WD) must be greater than focal length (f)' },
  MARGIN_TOO_LARGE: {
    ko: '마진이 이론적 노출시간보다 크거나 같습니다 — 마진을 줄이세요',
    en: 'Margin is greater than or equal to the theoretical exposure — reduce the margin',
  },
};

const LABELS = {
  CAMERA_MODEL: { ko: '카메라 모델', en: 'Camera model' },
  CAMERA_MANUAL: { ko: '직접 입력', en: 'Manual entry' },
  CAMERA_UNAVAILABLE: { ko: '카메라 목록 없음 — 직접 입력', en: 'No camera list — manual entry' },
  COPY: { ko: '결과 복사', en: 'Copy result' },
  EXPORT: { ko: '내보내기', en: 'Export' },
  SHARE: { ko: '공유하기', en: 'Share' },
  CSV_SAVE: { ko: 'CSV 저장', en: 'Save CSV' },
  PNG_SAVE: { ko: 'PNG 저장', en: 'Save PNG' },
  COPIED: { ko: '결과가 복사되었습니다', en: 'Copied to clipboard' },
  CHAIN_EXPOSURE: { ko: '이 분해능으로 노출 →', en: 'Use resolution in exposure →' },
  CHAIN_LINESCAN: { ko: '라인스캔 →', en: 'Line scan →' },
  CHAIN_DOF: { ko: '이 배율로 DOF →', en: 'Use magnification in DOF →' },
  APP_TITLE: { ko: '머신비전 계산기', en: 'Machine Vision Calculators' },
  APP_SUB: { ko: '광학 · 타이밍 · 라인스캔', en: 'Optics · Timing · Line scan' },
  COMING_SOON: { ko: '+ 계산기 추가 예정', en: '+ More calculators coming' },
  FOOTER_SUB: { ko: '사내용 계산 도구', en: 'Internal engineering tool' },
  MODE_SPEED: { ko: '속도·분해능', en: 'Speed · Resolution' },
  MODE_FPS: { ko: 'Frame rate', en: 'Frame rate' },
  RESULTS_HEADER: { ko: '계산 결과', en: 'Results' },
};

const CSV_LABELS = {
  header: { ko: ['구분', '항목', '값', '단위'], en: ['Type', 'Item', 'Value', 'Unit'] },
  input: { ko: '입력', en: 'Input' },
  result: { ko: '결과', en: 'Result' },
};

const CALC_DEFS = {
  fov: {
    num: '01',
    kicker: '01 · Optics',
    name: { ko: 'FoV · 작동거리', en: 'FoV · Working distance' },
    desc: { ko: '시야 범위 · 픽셀당 크기', en: 'Field of view · pixel size' },
    note: {
      ko: 'WD는 렌즈 주점 기준입니다. 실제 렌즈 카탈로그의 WD(렌즈 앞면 기준)와는 차이가 있으니 최종 선정은 렌즈 사양서를 확인하세요.',
      en: 'WD is measured from the lens principal point. This differs from the WD in lens catalogs (measured from the front of the lens) — confirm the final choice against the lens datasheet.',
    },
    inputs: [
      { key: 'pxs', label: { ko: '픽셀사이즈', en: 'Pixel size' }, unit: '㎛' },
      { key: 'f', label: { ko: 'Focal Length', en: 'Focal Length' }, unit: 'mm' },
      { key: 'rw', label: { ko: '해상도 가로', en: 'Resolution H' }, unit: 'px' },
      { key: 'rh', label: { ko: '해상도 세로', en: 'Resolution V' }, unit: 'px' },
      { key: 'wd', label: { ko: '작동거리 WD', en: 'Working distance WD' }, unit: 'mm' },
    ],
    results: [
      { key: 'fovw', label: { ko: 'FoV 폭', en: 'FoV width' }, unit: 'mm' },
      { key: 'fovh', label: { ko: 'FoV 높이', en: 'FoV height' }, unit: 'mm' },
      { key: 'r', label: { ko: '분해능 R', en: 'Resolution R' }, unit: '㎛/px' },
      { key: 'm', label: { ko: '배율 M', en: 'Magnification M' }, unit: '' },
    ],
  },
  exposure: {
    num: '02',
    kicker: '02 · Timing',
    name: { ko: '최적 노출 시간', en: 'Optimal exposure time' },
    desc: { ko: '속도 또는 Frame rate → 블러 없는 노출', en: 'Speed or frame rate → blur-free exposure' },
    note: {
      ko: '마진은 카메라의 FOT/오버헤드 시간입니다. 기종마다 다르니 사양서를 확인하세요.',
      en: 'Margin is the camera FOT/overhead time. This varies by model — check the datasheet.',
    },
    inputs: [
      { key: 'speed', label: { ko: '이동속도', en: 'Object speed' }, unit: 'mm/s' },
      { key: 'r', label: { ko: '분해능 R', en: 'Resolution R' }, unit: '㎛/px' },
      { key: 'fps', label: { ko: 'Frame rate', en: 'Frame rate' }, unit: 'fps' },
      { key: 'margin', label: { ko: '마진', en: 'Margin' }, unit: '㎲' },
    ],
    results: [
      { key: 'ttheo', label: { ko: '이론적 노출시간', en: 'Theoretical exposure' }, unit: '㎲' },
      { key: 'trec', label: { ko: '권장 노출시간', en: 'Recommended exposure' }, unit: '㎲' },
    ],
  },
  focal: {
    num: '03',
    kicker: '03 · Optics',
    name: { ko: '초점거리 선정', en: 'Lens selection' },
    desc: { ko: '목표 FoV → Focal Length', en: 'Target FoV → Focal Length' },
    note: { ko: '목표 FoV는 가로 기준입니다.', en: 'Target FoV is measured horizontally.' },
    inputs: [
      { key: 'pxs', label: { ko: '픽셀사이즈', en: 'Pixel size' }, unit: '㎛' },
      { key: 'rw', label: { ko: '해상도 가로', en: 'Resolution H' }, unit: 'px' },
      { key: 'rh', label: { ko: '해상도 세로', en: 'Resolution V' }, unit: 'px' },
      { key: 'wd', label: { ko: '작동거리 WD', en: 'Working distance WD' }, unit: 'mm' },
      { key: 'fov', label: { ko: '목표 FoV', en: 'Target FoV' }, unit: 'mm' },
    ],
    results: [
      { key: 'f', label: { ko: 'Focal Length', en: 'Focal Length' }, unit: 'mm' },
      { key: 'm', label: { ko: '배율 M', en: 'Magnification M' }, unit: '' },
    ],
  },
  dof: {
    num: '04',
    kicker: '04 · Optics',
    name: { ko: '피사계 심도', en: 'Depth of field' },
    desc: { ko: '선명한 깊이 범위', en: 'In-focus depth range' },
    inputs: [
      { key: 'n', label: { ko: '조리개 N', en: 'Aperture N' }, unit: 'F' },
      { key: 'pxs', label: { ko: '픽셀사이즈', en: 'Pixel size' }, unit: '㎛' },
      { key: 'k', label: { ko: '계수 k', en: 'Coefficient k' }, unit: '' },
      { key: 'm', label: { ko: '배율 M', en: 'Magnification M' }, unit: { ko: '배', en: '×' } },
    ],
    results: [
      { key: 'half', label: { ko: '반값 DOF', en: 'Half DOF' }, unit: 'mm' },
      { key: 'total', label: { ko: '총 DOF', en: 'Total DOF' }, unit: 'mm' },
      { key: 'coc', label: { ko: 'CoC', en: 'CoC' }, unit: 'mm' },
    ],
  },
  linescan: {
    num: '05',
    kicker: '05 · Line scan',
    name: { ko: '라인스캔', en: 'Line scan' },
    desc: { ko: '라인레이트 동기화', en: 'Line-rate sync' },
    note: {
      ko: '정사각 픽셀 가정: 스캔 방향 픽셀 크기는 라인레이트가 결정합니다(가로=세로 샘플링).',
      en: 'Assumes square pixels: the line rate determines the scan-direction pixel size (H = V sampling).',
    },
    inputs: [
      { key: 'speed', label: { ko: '반송 속도', en: 'Conveyor speed' }, unit: 'mm/s' },
      { key: 'r', label: { ko: '분해능 R', en: 'Resolution R' }, unit: '㎛/px' },
    ],
    results: [
      { key: 'rate', label: { ko: '라인레이트', en: 'Line rate' }, unit: 'kHz' },
      { key: 'period', label: { ko: '라인당 시간', en: 'Time per line' }, unit: '㎲' },
    ],
  },
};

let currentScreen = 'home';
let lastFovResult = null;
let backTarget = null;
let cameras = [];
let pendingCameraSelections = {};
let toastTimer = null;
let expMode = 'speed';
const CAMERA_SCREENS = ['fov', 'focal'];

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
  document.querySelectorAll('[data-calc-desc]').forEach((el) => {
    el.textContent = CALC_DEFS[el.dataset.calcDesc].desc[LANG];
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
  document.querySelectorAll('[data-action="export-share"]').forEach((btn) => {
    btn.hidden = typeof navigator.share !== 'function';
  });
  document.querySelectorAll('[data-action="set-mode"]').forEach((el) => {
    el.classList.toggle('active', el.dataset.mode === expMode);
  });
  document.querySelectorAll('[data-mode-group]').forEach((el) => {
    el.hidden = el.dataset.modeGroup !== expMode;
  });
}

function setExpMode(mode) {
  if (mode !== 'speed' && mode !== 'fps') return;
  if (mode === expMode) return;
  expMode = mode;
  applyStaticLabels();
  runCompute('exposure');
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

function setChainEnabled(enabled) {
  ['fov-chain-exposure', 'fov-chain-linescan', 'fov-chain-dof'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
}

function setExportEnabled(calcId, enabled) {
  const copyBtn = document.getElementById(`${calcId}-copy-btn`);
  const exportBtn = document.getElementById(`${calcId}-export-btn`);
  if (copyBtn) copyBtn.disabled = !enabled;
  if (exportBtn) exportBtn.disabled = !enabled;
  if (!enabled) {
    closeExportMenu(calcId);
    hideCopyFallback(calcId);
  }
}

function computeFov() {
  const pxs = getNum('fov', 'pxs');
  const f = getNum('fov', 'f');
  const rw = getNum('fov', 'rw');
  const rh = getNum('fov', 'rh');
  const wd = getNum('fov', 'wd');

  const fail = (code) => {
    setResult('fov-result-fovw', '—');
    setResult('fov-result-fovh', '—');
    setResult('fov-result-r', '—');
    setResult('fov-result-m', '—');
    showError('fov', code);
    lastFovResult = null;
    setChainEnabled(false);
    setExportEnabled('fov', false);
  };

  const sensor = formulas.sensorSize({ pxSizeUm: pxs, pxCountH: rw, pxCountV: rh });
  if (!sensor.ok) return fail(sensor.error);

  const fovW = formulas.fovFromLens({ sensorMm: sensor.values.widthMm, f, wd });
  if (!fovW.ok) return fail(fovW.error);

  const fovH = formulas.fovFromLens({ sensorMm: sensor.values.heightMm, f, wd });
  if (!fovH.ok) return fail(fovH.error);

  const res = formulas.resolutionFromMag({ pxSizeUm: pxs, M: fovW.values.M });
  if (!res.ok) return fail(res.error);

  showError('fov', null);
  setResult('fov-result-fovw', fmt(fovW.values.fovMm, 1));
  setResult('fov-result-fovh', fmt(fovH.values.fovMm, 1));
  setResult('fov-result-r', fmt(res.values.resolutionUm, 2));
  setResult('fov-result-m', fmt(fovW.values.M, 3));
  lastFovResult = { r: res.values.resolutionUm, m: fovW.values.M };
  setChainEnabled(true);
  setExportEnabled('fov', true);
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
    setExportEnabled('exposure', false);
  };

  const out = expMode === 'speed'
    ? formulas.exposureFromSpeed({ resolutionUm: getNum('exposure', 'r'), speedMmS: getNum('exposure', 'speed'), marginUs: margin })
    : formulas.exposureFromFps({ fps: getNum('exposure', 'fps'), marginUs: margin });
  if (!out.ok) return fail(out.error);

  showError('exposure', null);
  setResult('exposure-result-ttheo', fmt(out.values.tTheoUs, 1));
  setResult('exposure-result-trec', fmt(out.values.tRecUs, 1));
  setExportEnabled('exposure', true);
}

function computeFocal() {
  const pxs = getNum('focal', 'pxs');
  const rw = getNum('focal', 'rw');
  const rh = getNum('focal', 'rh');
  const wd = getNum('focal', 'wd');
  const fovMm = getNum('focal', 'fov');

  const fail = (code) => {
    setResult('focal-result-f', '—');
    setResult('focal-result-m', '—');
    showError('focal', code);
    setExportEnabled('focal', false);
  };

  const sensor = formulas.sensorSize({ pxSizeUm: pxs, pxCountH: rw, pxCountV: rh });
  if (!sensor.ok) return fail(sensor.error);

  const out = formulas.focalFromFov({ sensorMm: sensor.values.widthMm, fovMm, wd });
  if (!out.ok) return fail(out.error);

  showError('focal', null);
  setResult('focal-result-f', fmt(out.values.f, 2));
  setResult('focal-result-m', fmt(out.values.M, 3));
  setExportEnabled('focal', true);
}

function computeDof() {
  const N = getNum('dof', 'n');
  const pxs = getNum('dof', 'pxs');
  const k = getNum('dof', 'k');
  const M = getNum('dof', 'm');

  const out = formulas.dof({ N, pxSizeUm: pxs, k, M });
  if (!out.ok) {
    setResult('dof-result-half', '—');
    setResult('dof-result-total', '—');
    setResult('dof-result-coc', '—');
    showError('dof', out.error);
    setExportEnabled('dof', false);
    return;
  }
  showError('dof', null);
  setResult('dof-result-half', '± ' + fmt(out.values.halfMm, 2));
  setResult('dof-result-total', fmt(out.values.totalMm, 2));
  setResult('dof-result-coc', fmt(out.values.cocMm, 4));
  setExportEnabled('dof', true);
}

function computeLinescan() {
  const speed = getNum('linescan', 'speed');
  const r = getNum('linescan', 'r');

  const out = formulas.lineScan({ speedMmS: speed, resolutionUm: r });
  if (!out.ok) {
    setResult('linescan-result-rate', '—');
    setResult('linescan-result-period', '—');
    showError('linescan', out.error);
    setExportEnabled('linescan', false);
    return;
  }
  showError('linescan', null);
  setResult('linescan-result-rate', fmt(out.values.lineRateKhz, 2));
  setResult('linescan-result-period', fmt(out.values.linePeriodUs, 2));
  setExportEnabled('linescan', true);
}

const COMPUTE_FNS = {
  fov: computeFov,
  exposure: computeExposure,
  focal: computeFocal,
  dof: computeDof,
  linescan: computeLinescan,
};

function runCompute(calcId) {
  const fn = COMPUTE_FNS[calcId];
  if (fn) fn();
}

function computeAll() {
  Object.keys(COMPUTE_FNS).forEach(runCompute);
}

function collectExportData(calcId) {
  const def = CALC_DEFS[calcId];
  const visibleInputs = def.inputs.filter((field) => isFieldVisible(calcId, field.key));
  const inputs = visibleInputs.map((field) => ({
    label: field.label[LANG],
    value: getInputValue(calcId, field.key),
    unit: resolveUnit(field.unit),
  }));
  const results = def.results.map((field) => ({
    label: field.label[LANG],
    value: getResultText(calcId, field.key),
    unit: resolveUnit(field.unit),
  }));
  return { def: { name: `${def.num} · ${def.name[LANG]}` }, inputs, results };
}

function getInputValue(calcId, key) {
  const el = document.getElementById(`${calcId}-${key}`);
  return el ? el.value : '';
}

function getResultText(calcId, key) {
  const el = document.getElementById(`${calcId}-result-${key}`);
  return el ? el.textContent : '';
}

function closeAllExportMenus() {
  document.querySelectorAll('.export-menu').forEach((menu) => {
    menu.hidden = true;
  });
}

function closeExportMenu(calcId) {
  const menu = document.getElementById(`${calcId}-export-menu`);
  if (menu) menu.hidden = true;
}

function toggleExportMenu(calcId) {
  const menu = document.getElementById(`${calcId}-export-menu`);
  if (!menu) return;
  const willOpen = menu.hidden;
  closeAllExportMenus();
  if (willOpen) menu.hidden = false;
}

function showToast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 1800);
}

function showCopyFallback(calcId, text) {
  const el = document.getElementById(`${calcId}-copy-fallback`);
  if (!el) return;
  el.value = text;
  el.hidden = false;
  el.focus();
  el.select();
}

function hideCopyFallback(calcId) {
  const el = document.getElementById(`${calcId}-copy-fallback`);
  if (el) el.hidden = true;
}

async function copyResult(calcId) {
  const { def, inputs, results } = collectExportData(calcId);
  const text = buildResultText(def, inputs, results);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      hideCopyFallback(calcId);
      showToast(labelText('COPIED'));
      return;
    } catch (e) {
      /* fall through to fallback textarea */
    }
  }
  showCopyFallback(calcId, text);
}

function exportResult(calcId) {
  toggleExportMenu(calcId);
}

function shareResult(calcId) {
  if (!navigator.share) return;
  const { def, inputs, results } = collectExportData(calcId);
  const text = buildResultText(def, inputs, results);
  navigator.share({ title: 'AION Vision Tools', text }).catch(() => {});
}

function exportFileName(calcId, ext) {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `aion-${calcId}-${y}${m}${day}.${ext}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCsv(calcId) {
  const { def, inputs, results } = collectExportData(calcId);
  const csv = buildResultCsv(def, inputs, results, {
    header: CSV_LABELS.header[LANG],
    input: CSV_LABELS.input[LANG],
    result: CSV_LABELS.result[LANG],
  });
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, exportFileName(calcId, 'csv'));
}

function renderResultCard(calcId) {
  const { def, inputs, results } = collectExportData(calcId);
  const scale = 2;
  const width = 750;
  const paddingX = 40;
  const inputLineHeight = 26;
  const resultLineHeight = 46;
  const font = 'system-ui, -apple-system, "Segoe UI", "Noto Sans KR", sans-serif';
  const height = 130 + inputs.length * inputLineHeight + 30 + results.length * resultLineHeight + 20;

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#141413';
  ctx.fillRect(0, 0, width, height);

  let y = 44;
  ctx.fillStyle = '#f5f4f1';
  ctx.font = `600 13px ${font}`;
  ctx.fillText('AION Vision Tools', paddingX, y);
  y += 28;
  ctx.font = `600 22px ${font}`;
  ctx.fillText(def.name, paddingX, y);
  y += 34;

  ctx.font = `13px ${font}`;
  ctx.fillStyle = '#bdbcb6';
  inputs.forEach((item) => {
    const unit = item.unit ? ` ${item.unit}` : '';
    ctx.fillText(`${item.label}: ${item.value}${unit}`, paddingX, y);
    y += inputLineHeight;
  });

  y += 14;
  ctx.strokeStyle = 'rgba(245,244,241,.25)';
  ctx.beginPath();
  ctx.moveTo(paddingX, y);
  ctx.lineTo(width - paddingX, y);
  ctx.stroke();
  y += 34;

  results.forEach((item) => {
    ctx.fillStyle = '#b5820f';
    ctx.font = `10px ${font}`;
    ctx.fillText(item.label.toUpperCase(), paddingX, y);
    y += 20;
    ctx.fillStyle = '#f5f4f1';
    ctx.font = `600 24px ${font}`;
    const unit = item.unit ? ` ${item.unit}` : '';
    ctx.fillText(`${item.value}${unit}`, paddingX, y);
    y += resultLineHeight - 20;
  });

  return canvas;
}

function exportPng(calcId) {
  const canvas = renderResultCard(calcId);
  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, exportFileName(calcId, 'png'));
  }, 'image/png');
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ screen: currentScreen, lang: LANG, expMode, inputs }));
  } catch (e) {}
}

function restore() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch (e) {}
  if (saved && (saved.lang === 'ko' || saved.lang === 'en')) LANG = saved.lang;
  if (saved && (saved.expMode === 'speed' || saved.expMode === 'fps')) expMode = saved.expMode;
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

function chainFromFov(target) {
  if (!lastFovResult) return;
  if (target === 'exposure') {
    setExpMode('speed');
    setNum('exposure', 'r', roundForInput(lastFovResult.r));
  }
  if (target === 'linescan') setNum('linescan', 'r', roundForInput(lastFovResult.r));
  if (target === 'dof') setNum('dof', 'm', roundForInput(lastFovResult.m));
  backTarget = currentScreen;
  showScreen(target);
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
  if (!e.target.closest('.export-wrap')) closeAllExportMenus();

  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const calcId = btn.closest('.screen[data-calc]')?.dataset.calc;
  if (action === 'open') {
    backTarget = null;
    showScreen(btn.dataset.target);
  } else if (action === 'home') {
    const target = backTarget;
    backTarget = null;
    showScreen(target || 'home');
  } else if (action === 'chain') chainFromFov(btn.dataset.chain);
  else if (action === 'set-lang') setLang(btn.dataset.lang);
  else if (action === 'set-mode') setExpMode(btn.dataset.mode);
  else if (action === 'copy-result' && calcId) { copyResult(calcId); closeAllExportMenus(); }
  else if (action === 'export-result' && calcId) exportResult(calcId);
  else if (action === 'export-share' && calcId) { shareResult(calcId); closeAllExportMenus(); }
  else if (action === 'export-csv' && calcId) { exportCsv(calcId); closeAllExportMenus(); }
  else if (action === 'export-png' && calcId) { exportPng(calcId); closeAllExportMenus(); }
});

const initialScreen = restore();
applyStaticLabels();
computeAll();
showScreen(initialScreen);
loadCameras();
