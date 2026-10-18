'use strict';

const { astarNaive, astarOptimized, benchmark } = require('../src/astar');

function buildGrid(rows, cols, obstacleDensity = 0.15, seed = 12345) {
	// Deterministic pseudo-random grid so runs are reproducible.
	let state = seed;
	const rand = () => {
		state = (state * 1103515245 + 12345) & 0x7fffffff;
		return state / 0x7fffffff;
	};
	const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			if (rand() < obstacleDensity) grid[r][c] = 1;
		}
	}
	// Keep start/end free.
	grid[0][0] = 0;
	grid[rows - 1][cols - 1] = 0;
	return grid;
}

function pad(s, len) {
	return String(s).padEnd(len, ' ');
}

function runSuite() {
	const configs = [
		{ rows: 30, cols: 30 },
		{ rows: 60, cols: 60 },
		{ rows: 100, cols: 100 },
		{ rows: 150, cols: 150 },
		{ rows: 200, cols: 200 },
	];
	const start = { row: 0, col: 0 };

	const results = [];

	console.log('\n=== A* Pathfinding: Naive vs Optimized ===\n');
	console.log(
		pad('Grid', 12) +
			pad('Naive (ms)', 14) +
			pad('Optimized (ms)', 17) +
			pad('Speedup', 10) +
			pad('NodesExpanded', 16) +
			'PathLen'
	);
	console.log('-'.repeat(76));

	for (const { rows, cols } of configs) {
		const grid = buildGrid(rows, cols, 0.15);
		const end = { row: rows - 1, col: cols - 1 };

		// Warm-up.
		astarNaive(grid, start, end);
		astarOptimized(grid, start, end);

		const nRes = benchmark(astarNaive, grid, start, end);
		const oRes = benchmark(astarOptimized, grid, start, end);

		const speedup = nRes.timeMs > 0 ? (nRes.timeMs / oRes.timeMs).toFixed(2) : '∞';
		const pathLen = oRes.path ? oRes.path.length : 'no path';
		const nodesExpanded = oRes.nodesExpanded !== null ? oRes.nodesExpanded : '-';

		console.log(
			pad(`${rows}x${cols}`, 12) +
				pad(nRes.timeMs.toFixed(3), 14) +
				pad(oRes.timeMs.toFixed(3), 17) +
				pad(speedup, 10) +
				pad(nodesExpanded, 16) +
				pathLen
		);

		results.push({
			grid: `${rows}x${cols}`,
			rows,
			cols,
			naiveMs: nRes.timeMs,
			optimizedMs: oRes.timeMs,
			speedup: speedup === '∞' ? null : parseFloat(speedup),
			nodesExpanded: oRes.nodesExpanded,
			pathLen: oRes.path ? oRes.path.length : null,
			pathEqualLength: nRes.path && oRes.path ? nRes.path.length === oRes.path.length : null,
		});
	}

	const fs = require('fs');
	fs.writeFileSync('benchmark-results.json', JSON.stringify(results, null, 2));
	console.log(`\nResults written to benchmark-results.json`);
	return results;
}

runSuite();
