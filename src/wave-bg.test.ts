import { describe, expect, it } from 'vitest';
import { generateWaves } from './wave-bg';

describe('generateWaves', () => {
	const text = generateWaves(100, 40, 10, 42);
	const lines = text.split('\n');

	it('produces the correct grid dimensions', () => {
		expect(lines.length).toBe(40);
		for (const line of lines) {
			expect(line.length).toBe(100);
		}
	});

	it('is deterministic (same seed → same output)', () => {
		const a = generateWaves(100, 40, 10, 42);
		const b = generateWaves(100, 40, 10, 42);
		expect(a).toBe(b);
	});

	it('different seed produces different output', () => {
		const a = generateWaves(100, 40, 10, 42);
		const b = generateWaves(100, 40, 10, 99);
		expect(a).not.toBe(b);
	});

	it('contains only valid wave characters and spaces', () => {
		const allowed = new Set(' ~-.:=+*·');
		for (const line of lines) {
			for (const ch of line) {
				expect(allowed.has(ch)).toBe(true);
			}
		}
	});

	it('has non-space characters (waves actually rendered)', () => {
		const totalChars = text.length;
		const nonSpace = text.replace(/ |\n/g, '').length;
		expect(nonSpace).toBeGreaterThan(0);
		console.log(
			`  wave fill: ${nonSpace} chars / ${totalChars} total (${((nonSpace / totalChars) * 100).toFixed(1)}%)`,
		);
	});

	it('has wave characters distributed across rows', () => {
		let rowsWithChars = 0;
		for (const line of lines) {
			if (line.trim().length > 0) {
				rowsWithChars++;
			}
		}
		// With 10 waves over 40 rows, at least 8 rows should have content
		// (some waves share rows due to similar baseRow)
		expect(rowsWithChars).toBeGreaterThanOrEqual(8);
		console.log(`  rows with content: ${rowsWithChars} / ${lines.length}`);
	});

	it('has wave characters distributed across columns', () => {
		// Check that characters appear across the full width, not clustered
		const colHasChar = new Set<number>();
		for (const line of lines) {
			for (let c = 0; c < line.length; c++) {
				if (line[c] !== ' ') {
					colHasChar.add(c);
				}
			}
		}
		// Waves should span most of the 100 columns
		expect(colHasChar.size).toBeGreaterThan(80);
		console.log(`  columns with content: ${colHasChar.size} / 100`);
	});

	it('waves form horizontal lines (consecutive chars in rows)', () => {
		// Each wave line should produce runs of consecutive characters
		let longestRun = 0;
		for (const line of lines) {
			let run = 0;
			for (const ch of line) {
				if (ch !== ' ') {
					run++;
					if (run > longestRun) {
						longestRun = run;
					}
				} else {
					run = 0;
				}
			}
		}
		// Waves should produce runs of at least 5 consecutive chars
		expect(longestRun).toBeGreaterThanOrEqual(5);
		console.log(`  longest consecutive run: ${longestRun}`);
	});

	it('visual snapshot (small grid)', () => {
		const small = generateWaves(60, 20, 6, 42);
		console.log('\n--- wave preview ---');
		console.log(small.replace(/ +$/gm, ''));
		console.log('--- end preview ---\n');
		// Just verify it doesn't throw and has content
		expect(small.replace(/ |\n/g, '').length).toBeGreaterThan(0);
	});
});
