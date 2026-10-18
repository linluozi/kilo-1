'use strict';

const assert = require('assert');
const { astarNaive, astarOptimized, isValidCell } = require('../src/astar');

function buildGrid(rows, cols, obstacles = []) {
	const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
	for (const [r, c] of obstacles) grid[r][c] = 1;
	return grid;
}

function validatePath(grid, start, end, path) {
	assert.ok(path, 'path should not be null when a path exists');
	assert.strictEqual(path[0].row, start.row, 'path must start at start');
	assert.strictEqual(path[0].col, start.col, 'path must start at start');
	const last = path[path.length - 1];
	assert.strictEqual(last.row, end.row, 'path must end at end');
	assert.strictEqual(last.col, end.col, 'path must end at end');
	for (let i = 1; i < path.length; i++) {
		const a = path[i - 1];
		const b = path[i];
		const dr = Math.abs(a.row - b.row);
		const dc = Math.abs(a.col - b.col);
		assert.strictEqual(dr + dc, 1, 'consecutive path cells must be 4-directionally adjacent');
		assert.ok(isValidCell(grid, b.row, b.col), `path cell (${b.row},${b.col}) must be valid`);
	}
	assert.ok(isValidCell(grid, start.row, start.col));
	assert.ok(isValidCell(grid, end.row, end.col));
	return path.length;
}

function passableGrid(rows, cols) {
	return buildGrid(rows, cols, []);
}

function main() {
	let passed = 0;

	// 1. Trivial: start == end.
	{
		const grid = passableGrid(5, 5);
		const start = { row: 2, col: 2 };
		const end = { row: 2, col: 2 };
		for (const fn of [astarNaive, astarOptimized]) {
			const path = fn(grid, start, end);
			assert.ok(path);
			assert.strictEqual(path.length, 1);
			assert.strictEqual(path[0].row, 2);
			assert.strictEqual(path[0].col, 2);
		}
		passed++;
	}

	// 2. Open grid: shortest path length == Manhattan distance.
	{
		const grid = passableGrid(10, 10);
		const start = { row: 0, col: 0 };
		const end = { row: 9, col: 9 };
		const naiveLen = validatePath(grid, start, end, astarNaive(grid, start, end));
		const optLen = validatePath(grid, start, end, astarOptimized(grid, start, end));
		assert.strictEqual(naiveLen, 19, 'open-grid optimal length');
		assert.strictEqual(optLen, 19, 'open-grid optimal length (optimized)');
		assert.strictEqual(naiveLen, optLen, 'both implementations must agree on optimal length');
		passed++;
	}

	// 3. Maze with obstacles: both agree on optimal length, path valid.
	{
		const obstacles = [
			[1, 1], [1, 2], [1, 3],
			[2, 3], [3, 3], [4, 3],
			[4, 2], [4, 1],
			[5, 5], [5, 6], [5, 7],
			[6, 5], [7, 5],
		];
		const grid = buildGrid(9, 9, obstacles);
		const start = { row: 0, col: 0 };
		const end = { row: 8, col: 8 };
		const naiveLen = validatePath(grid, start, end, astarNaive(grid, start, end));
		const optLen = validatePath(grid, start, end, astarOptimized(grid, start, end));
		assert.strictEqual(naiveLen, optLen, 'both implementations must agree on optimal length');
		passed++;
	}

	// 4. No path exists (end fully enclosed): both return null.
	{
		// Wall around end cell (7,7) in a 9x9 grid.
		const obstacles = [
			[6, 6], [6, 7], [6, 8],
			[7, 6],        [7, 8],
			[8, 6], [8, 7], [8, 8],
		];
		const grid = buildGrid(9, 9, obstacles);
		const start = { row: 0, col: 0 };
		const end = { row: 7, col: 7 };
		assert.strictEqual(astarNaive(grid, start, end), null, 'naive: no path');
		assert.strictEqual(astarOptimized(grid, start, end), null, 'optimized: no path');
		passed++;
	}

	// 5. Start or end is an obstacle: no path.
	{
		const grid = buildGrid(5, 5, [[2, 2]]);
		assert.strictEqual(astarNaive(grid, { row: 2, col: 2 }, { row: 4, col: 4 }), null);
		assert.strictEqual(astarOptimized(grid, { row: 2, col: 2 }, { row: 4, col: 4 }), null);
		passed++;
	}

	// 6. Larger open grid: both agree on optimal length.
	{
		const grid = passableGrid(50, 50);
		const start = { row: 0, col: 0 };
		const end = { row: 49, col: 49 };
		const naiveLen = validatePath(grid, start, end, astarNaive(grid, start, end));
		const optLen = validatePath(grid, start, end, astarOptimized(grid, start, end));
		assert.strictEqual(naiveLen, 99);
		assert.strictEqual(optLen, 99);
		assert.strictEqual(naiveLen, optLen);
		passed++;
	}

	console.log(`All ${passed} correctness tests passed.`);
}

main();
