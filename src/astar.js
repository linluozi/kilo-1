'use strict';

/**
 * A* pathfinding on a 2D grid (4-directional movement, unit cost).
 *
 * Two implementations are provided:
 *   - astarNaive        : reference implementation mirroring the original
 *                          upstream demo (linear scans, array splice, duplicate
 *                          open-set entries). Kept for correctness/perf comparison.
 *   - astarOptimized    : optimized implementation using a binary-heap priority
 *                          queue for the open set and a best-G map for O(1)
 *                          closed/best-cost lookups.
 *
 * Both return the shortest path as an array of {row,col} from start to end
 * (inclusive), or null when no path exists. The Manhattan heuristic is
 * admissible and consistent for this grid, so the returned path is optimal.
 */

const DIRECTIONS = [
	[0, 1], // Right
	[1, 0], // Down
	[0, -1], // Left
	[-1, 0], // Up
];

/** Manhattan distance heuristic (admissible & consistent for 4-dir unit grid). */
function heuristic(a, b) {
	return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function keyOf(row, col) {
	return `${row},${col}`;
}

/** Reconstruct path from goal node back to start via parent pointers. */
function reconstructPath(node) {
	const path = [];
	let temp = node;
	while (temp) {
		path.push({ row: temp.row, col: temp.col });
		temp = temp.parent;
	}
	path.reverse();
	return path;
}

/**
 * Check whether a cell is inside the grid and not an obstacle.
 * grid[row][col] === 1  => obstacle
 */
function isValidCell(grid, row, col) {
	return (
		row >= 0 &&
		row < grid.length &&
		col >= 0 &&
		col < grid[0].length &&
		grid[row][col] !== 1
	);
}

/**
 * Generate the 4-directional in-bounds, non-obstacle neighbors of a node.
 */
function getNeighbors(grid, node, end) {
	const neighbors = [];
	for (const [dr, dc] of DIRECTIONS) {
		const row = node.row + dr;
		const col = node.col + dc;
		if (isValidCell(grid, row, col)) {
			neighbors.push({
				row,
				col,
				g: node.g + 1,
				h: heuristic({ row, col }, end),
				parent: node,
			});
		}
	}
	return neighbors;
}

/* ------------------------------------------------------------------ */
/* Naive reference implementation (upstream baseline)                 */
/* ------------------------------------------------------------------ */

/**
 * Naive A*. Performance bottlenecks (intentional, left for comparison):
 *   * Linear scan to find the min-f node        -> O(openSet) per pop
 *   * indexOf + splice to remove the popped node -> O(openSet)
 *   * closedSet.some() membership test          -> O(closedSet) per neighbor
 *   * openSet.find() membership test            -> O(openSet) per neighbor
 *   * Duplicate open-set entries on better-g    -> stale entries bloat memory
 *                                                  and cause wasted re-pops.
 */
function astarNaive(grid, start, end) {
	const openSet = [];
	const closedSet = [];
	const startNode = { row: start.row, col: start.col, g: 0, h: heuristic(start, end), f: 0, parent: null };
	startNode.f = startNode.g + startNode.h;
	openSet.push(startNode);

	// A path cannot start from or end on an obstacle.
	if (!isValidCell(grid, start.row, start.col) || !isValidCell(grid, end.row, end.col)) {
		return null;
	}

	let nodesExpanded = 0;

	while (openSet.length > 0) {
		// Linear scan for the lowest total cost node.
		let currentNode = openSet[0];
		for (let i = 1; i < openSet.length; i++) {
			if (
				openSet[i].f < currentNode.f ||
				(openSet[i].f === currentNode.f && openSet[i].h < currentNode.h)
			) {
				currentNode = openSet[i];
			}
		}

		// indexOf + splice removal.
		openSet.splice(openSet.indexOf(currentNode), 1);
		closedSet.push(currentNode);
		nodesExpanded++;

		if (currentNode.row === end.row && currentNode.col === end.col) {
			const path = reconstructPath(currentNode);
			path.nodesExpanded = nodesExpanded;
			return path;
		}

		const neighbors = getNeighbors(grid, currentNode, end);
		for (const neighbor of neighbors) {
			neighbor.f = neighbor.g + neighbor.h;

			if (closedSet.some((node) => node.row === neighbor.row && node.col === neighbor.col)) {
				continue;
			}

			const openSetNode = openSet.find((node) => node.row === neighbor.row && node.col === neighbor.col);
			if (!openSetNode || neighbor.g < openSetNode.g) {
				openSet.push(neighbor);
			}
		}
	}

	return null;
}

/* ------------------------------------------------------------------ */
/* Optimized implementation                                           */
/* ------------------------------------------------------------------ */

/**
 * Min-heap priority queue ordered by (f, then h). Supports push/pop in
 * O(log n) and replaces the linear-scan open set of the naive version.
 */
class MinHeap {
	constructor() {
		this.heap = [];
	}

	size() {
		return this.heap.length;
	}

	push(node) {
		this.heap.push(node);
		this._bubbleUp(this.heap.length - 1);
	}

	pop() {
		if (this.heap.length === 0) return undefined;
		const top = this.heap[0];
		const last = this.heap.pop();
		if (this.heap.length > 0) {
			this.heap[0] = last;
			this._bubbleDown(0);
		}
		return top;
	}

	_compare(a, b) {
		if (a.f !== b.f) return a.f - b.f;
		return a.h - b.h;
	}

	_swap(i, j) {
		const tmp = this.heap[i];
		this.heap[i] = this.heap[j];
		this.heap[j] = tmp;
	}

	_bubbleUp(i) {
		while (i > 0) {
			const parent = Math.floor((i - 1) / 2);
			if (this._compare(this.heap[i], this.heap[parent]) < 0) {
				this._swap(i, parent);
				i = parent;
			} else {
				break;
			}
		}
	}

	_bubbleDown(i) {
		const n = this.heap.length;
		while (true) {
			let smallest = i;
			const left = 2 * i + 1;
			const right = 2 * i + 2;
			if (left < n && this._compare(this.heap[left], this.heap[smallest]) < 0) smallest = left;
			if (right < n && this._compare(this.heap[right], this.heap[smallest]) < 0) smallest = right;
			if (smallest === i) break;
			this._swap(i, smallest);
			i = smallest;
		}
	}
}

/**
 * Optimized A*.
 * Improvements over the naive version:
 *   * Binary-heap open set:      pop/push O(log n) vs O(n) linear scan+splice.
 *   * best-G Map:                O(1) closed/best-cost lookup (replaces
 *                                 closedSet.some + openSet.find, both O(n)).
 *   * Lazy stale-entry deletion: skip popped entries whose g is worse than
 *                                 the best known g, avoiding duplicate work.
 *   * No duplicate entries:      a cell is (re)pushed only when a strictly
 *                                 better g is found, bounding heap size.
 * Complexity: O(E log V) time, O(V) space where V = cells, E = edges.
 */
function astarOptimized(grid, start, end) {
	const open = new MinHeap();
	const bestG = new Map(); // key -> best g found so far
	const closed = new Set(); // keys of fully expanded nodes

	const startKey = keyOf(start.row, start.col);
	const startNode = {
		row: start.row,
		col: start.col,
		g: 0,
		h: heuristic(start, end),
		parent: null,
	};
	startNode.f = startNode.g + startNode.h;
	open.push(startNode);
	bestG.set(startKey, 0);

	// A path cannot start from or end on an obstacle.
	if (!isValidCell(grid, start.row, start.col) || !isValidCell(grid, end.row, end.col)) {
		return null;
	}

	let nodesExpanded = 0;

	while (open.size() > 0) {
		const current = open.pop();
		const currentKey = keyOf(current.row, current.col);

		// Lazy deletion of stale heap entries.
		if (closed.has(currentKey)) continue;
		if (current.g > (bestG.get(currentKey) || Infinity)) continue;

		closed.add(currentKey);
		nodesExpanded++;

		if (current.row === end.row && current.col === end.col) {
			const path = reconstructPath(current);
			path.nodesExpanded = nodesExpanded;
			return path;
		}

		const neighbors = getNeighbors(grid, current, end);
		for (const neighbor of neighbors) {
			const nkey = keyOf(neighbor.row, neighbor.col);
			const tentativeG = current.g + 1;

			if (closed.has(nkey)) continue;
			if (bestG.has(nkey) && tentativeG >= bestG.get(nkey)) continue;

			bestG.set(nkey, tentativeG);
			neighbor.f = tentativeG + neighbor.h;
			open.push(neighbor);
		}
	}

	return null;
}

/**
 * Run an A* implementation and return { path, timeMs, nodesExpanded }.
 * nodesExpanded is only tracked by the optimized version; for the naive
 * version it is reported as null.
 */
function benchmark(fn, grid, start, end) {
	const startTime = process.hrtime.bigint();
	const path = fn(grid, start, end);
	const endTime = process.hrtime.bigint();
	const timeMs = Number(endTime - startTime) / 1_000_000;
	return {
		path,
		timeMs,
		nodesExpanded: path && path.nodesExpanded !== undefined ? path.nodesExpanded : null,
	};
}

module.exports = {
	heuristic,
	reconstructPath,
	isValidCell,
	getNeighbors,
	astarNaive,
	astarOptimized,
	benchmark,
	MinHeap,
};
