'use strict';

const fs = require('fs');
const path = require('path');

const RESULTS_PATH = path.resolve(__dirname, '..', 'benchmark-results.json');
const OUT_DIR = path.resolve(__dirname, '..', 'assets');
const OUT_PATH = path.join(OUT_DIR, 'performance.svg');

const results = JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));

const WIDTH = 900;
const HEIGHT = 520;
const MARGIN = { top: 40, right: 120, bottom: 60, left: 80 };

const PADDING = 30;
const panelWidth = (WIDTH - MARGIN.left - MARGIN.right - PADDING) / 2;
const panelHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

const grids = results.map((r) => r.grid);
const naiveMs = results.map((r) => r.naiveMs);
const optMs = results.map((r) => r.optimizedMs);
const speedups = results.map((r) => r.speedup);

const maxTime = Math.max(...naiveMs, ...optMs);
const maxSpeedup = Math.max(...speedups);

/* ---------- drawing helpers ---------- */
function esc(s) {
	return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function xScalePanel(panelIndex, i) {
	const x0 = MARGIN.left + panelIndex * (panelWidth + PADDING);
	const step = panelWidth / (grids.length - 1);
	return x0 + i * step;
}

function yTime(v, panelIndex) {
	const y0 = MARGIN.top + panelHeight;
	return y0 - (v / maxTime) * panelHeight * 0.82;
}

function ySpeedup(v) {
	const y0 = MARGIN.top + panelHeight;
	return y0 - (v / maxSpeedup) * panelHeight * 0.82;
}

const NAIVE_COLOR = '#e4572e';
const OPT_COLOR = '#2e7d32';

let svg = '';
svg += `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">`;
svg += '<rect width="100%" height="100%" fill="#ffffff"/>';
svg += '<font-face font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"/>';

// ===== Title =====
svg += `<text x="${WIDTH / 2}" y="${MARGIN.top / 2}" text-anchor="middle" font-size="18" font-weight="bold" fill="#111827">A* Pathfinding: Naive vs Optimized — Runtime by Grid Size</text>`;

// ===== Panel A: runtime line chart (left) =====
const ax0 = MARGIN.left;
const ay0 = MARGIN.top;
// axes
svg += `<line x1="${ax0}" y1="${MARGIN.top + panelHeight}" x2="${ax0 + panelWidth}" y2="${MARGIN.top + panelHeight}" stroke="#9ca3af" stroke-width="1"/>`;
svg += `<line x1="${ax0}" y1="${MARGIN.top}" x2="${ax0}" y2="${MARGIN.top + panelHeight}" stroke="#9ca3af" stroke-width="1"/>`;
svg += `<text x="${ax0 + panelWidth / 2}" y="${MARGIN.top + panelHeight + 45}" text-anchor="middle" font-size="12" fill="#374151">Grid size</text>`;
svg += `<text x="${ax0 - 40}" y="${MARGIN.top + panelHeight / 2}" text-anchor="middle" font-size="12" fill="#374151" transform="rotate(-90 ${ax0 - 40},${MARGIN.top + panelHeight / 2})">Time (ms)</text>`;
svg += `<text x="${ax0}" y="${MARGIN.top - 8}" text-anchor="start" font-size="13" font-weight="bold" fill="#111827">Execution time</text>`;

// y gridlines & ticks
const yTicks = 5;
for (let t = 0; t <= yTicks; t++) {
	const v = (maxTime / yTicks) * t;
	const y = yTime(v, 0);
	svg += `<line x1="${ax0}" y1="${y}" x2="${ax0 + panelWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
	svg += `<text x="${ax0 - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280">${v.toFixed(1)}</text>`;
}
// x ticks
for (let i = 0; i < grids.length; i++) {
	const x = xScalePanel(0, i);
	svg += `<line x1="${x}" y1="${MARGIN.top + panelHeight}" x2="${x}" y2="${MARGIN.top + panelHeight + 4}" stroke="#9ca3af" stroke-width="1"/>`;
	svg += `<text x="${x}" y="${MARGIN.top + panelHeight + 22}" text-anchor="middle" font-size="10" fill="#374151">${esc(grids[i])}</text>`;
}

// lines
function linePath(points) {
	let d = '';
	for (let i = 0; i < points.length; i++) {
		d += (i === 0 ? 'M' : 'L') + points[i].x + ',' + points[i].y;
	}
	return d;
}
const naivePts = naiveMs.map((v, i) => ({ x: xScalePanel(0, i), y: yTime(v, 0) }));
const optPts = optMs.map((v, i) => ({ x: xScalePanel(0, i), y: yTime(v, 0) }));
svg += `<path d="${linePath(naivePts)}" fill="none" stroke="${NAIVE_COLOR}" stroke-width="2.5"/>`;
svg += `<path d="${linePath(optPts)}" fill="none" stroke="${OPT_COLOR}" stroke-width="2.5"/>`;
for (const p of naivePts) svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${NAIVE_COLOR}"/>`;
for (const p of optPts) svg += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${OPT_COLOR}"/>`;
// legend
svg += `<rect x="${ax0 + panelWidth - 150}" y="${MARGIN.top + 6}" width="14" height="14" fill="${NAIVE_COLOR}"/>`;
svg += `<text x="${ax0 + panelWidth - 132}" y="${MARGIN.top + 19}" font-size="11" fill="#374151">Naive (linear scan)</text>`;
svg += `<rect x="${ax0 + panelWidth - 150}" y="${MARGIN.top + 28}" width="14" height="14" fill="${OPT_COLOR}"/>`;
svg += `<text x="${ax0 + panelWidth - 132}" y="${MARGIN.top + 41}" font-size="11" fill="#374151">Optimized (binary heap)</text>`;

// ===== Panel B: speedup bar chart (right) =====
const bx0 = ax0 + panelWidth + PADDING;
svg += `<line x1="${bx0}" y1="${MARGIN.top + panelHeight}" x2="${bx0 + panelWidth}" y2="${MARGIN.top + panelHeight}" stroke="#9ca3af" stroke-width="1"/>`;
svg += `<line x1="${bx0}" y1="${MARGIN.top}" x2="${bx0}" y2="${MARGIN.top + panelHeight}" stroke="#9ca3af" stroke-width="1"/>`;
svg += `<text x="${bx0 + panelWidth / 2}" y="${MARGIN.top + panelHeight + 45}" text-anchor="middle" font-size="12" fill="#374151">Grid size</text>`;
svg += `<text x="${bx0 - 40}" y="${MARGIN.top + panelHeight / 2}" text-anchor="middle" font-size="12" fill="#374151" transform="rotate(-90 ${bx0 - 40},${MARGIN.top + panelHeight / 2})">Speedup (×)</text>`;
svg += `<text x="${bx0}" y="${MARGIN.top - 8}" text-anchor="start" font-size="13" font-weight="bold" fill="#111827">Speedup factor</text>`;

const sTicks = 5;
for (let t = 0; t <= sTicks; t++) {
	const v = (maxSpeedup / sTicks) * t;
	const y = ySpeedup(v);
	svg += `<line x1="${bx0}" y1="${y}" x2="${bx0 + panelWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
	svg += `<text x="${bx0 - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280">${v.toFixed(1)}×</text>`;
}
for (let i = 0; i < grids.length; i++) {
	const x = xScalePanel(1, i);
	svg += `<line x1="${x}" y1="${MARGIN.top + panelHeight}" x2="${x}" y2="${MARGIN.top + panelHeight + 4}" stroke="#9ca3af" stroke-width="1"/>`;
	svg += `<text x="${x}" y="${MARGIN.top + panelHeight + 22}" text-anchor="middle" font-size="10" fill="#374151">${esc(grids[i])}</text>`;
}
const barWidth = panelWidth / grids.length * 0.55;
for (let i = 0; i < grids.length; i++) {
	const x = xScalePanel(1, i) - barWidth / 2;
	const v = speedups[i];
	const y = ySpeedup(v);
	svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${MARGIN.top + panelHeight - y}" fill="${OPT_COLOR}"/>`;
	svg += `<text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="10" font-weight="bold" fill="#111827">${v.toFixed(2)}×</text>`;
}

svg += `</svg>`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_PATH, svg);
console.log(`Chart written to ${OUT_PATH}`);
