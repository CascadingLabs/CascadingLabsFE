// Build-time ASCII wave background generator
// Rendering concept inspired by https://github.com/chenglou/pretext
// (text as a visual medium, measured and laid out without DOM reflow)

function mulberry32(seed: number) {
	let a = seed;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function generateWaves(
	cols = 350,
	rows = 120,
	numWaves = 45,
	seed = 42,
): string {
	const WAVE_CHARS = '~-.:=+*';
	const LIGHT_CHARS = '.·:';
	const rand = mulberry32(seed);

	const grid: string[][] = Array.from({ length: rows }, () =>
		Array.from({ length: cols }, () => ' '),
	);

	for (let w = 0; w < numWaves; w++) {
		const baseRow = (w / numWaves) * rows;
		const rawFreq1 = 0.04 + rand() * 0.06;
		const rawFreq2 = 0.015 + rand() * 0.02;
		// Quantise to integer cycles so the pattern tiles seamlessly
		const cycles1 = Math.max(1, Math.round((rawFreq1 * cols) / (2 * Math.PI)));
		const cycles2 = Math.max(1, Math.round((rawFreq2 * cols) / (2 * Math.PI)));
		const freq1 = (cycles1 * 2 * Math.PI) / cols;
		const freq2 = (cycles2 * 2 * Math.PI) / cols;
		const phase1 = rand() * Math.PI * 2;
		const phase2 = rand() * Math.PI * 2;
		const amp1 = 1.0 + rand() * 1.5;
		const amp2 = 0.5 + rand() * 1.0;

		for (let col = 0; col < cols; col++) {
			// Skip ~60 % of columns for sparsity
			if (rand() < 0.6) {
				continue;
			}

			const offset =
				Math.sin(col * freq1 + phase1) * amp1 +
				Math.sin(col * freq2 + phase2) * amp2;
			const centerRow = Math.round(baseRow + offset);

			// Draw the main wave character; neighbors only 30 % of the time
			for (let dy = -1; dy <= 1; dy++) {
				const r = centerRow + dy;
				if (r < 0 || r >= rows || grid[r][col] !== ' ') {
					continue;
				}
				if (dy === 0) {
					grid[r][col] = WAVE_CHARS[Math.floor(rand() * WAVE_CHARS.length)];
				} else if (rand() < 0.3) {
					grid[r][col] = LIGHT_CHARS[Math.floor(rand() * LIGHT_CHARS.length)];
				}
			}
		}
	}

	return grid.map((r) => r.join('')).join('\n');
}
