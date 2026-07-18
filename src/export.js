function formatLine(label, value, unit) {
  return unit ? `${label}: ${value} ${unit}` : `${label}: ${value}`;
}

export function buildResultText(def, inputs, results) {
  const lines = [];
  lines.push(`${def.name} — AION Vision Tools`);
  lines.push('');
  inputs.forEach((item) => lines.push(formatLine(item.label, item.value, item.unit)));
  lines.push('---');
  results.forEach((item) => lines.push(formatLine(item.label, item.value, item.unit)));
  return lines.join('\n');
}

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csvRow(cells) {
  return cells.map(csvCell).join(',');
}

const DEFAULT_CSV_LABELS = { header: ['구분', '항목', '값', '단위'], input: '입력', result: '결과' };

export function buildResultCsv(def, inputs, results, csvLabels) {
  const labels = { ...DEFAULT_CSV_LABELS, ...(csvLabels || {}) };
  const rows = [csvRow(labels.header)];
  inputs.forEach((item) => rows.push(csvRow([labels.input, item.label, item.value, item.unit || ''])));
  results.forEach((item) => rows.push(csvRow([labels.result, item.label, item.value, item.unit || ''])));
  return rows.join('\r\n');
}
