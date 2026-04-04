/**
 * Canvas-based wave background animation.
 * Uses @chenglou/pretext for non-DOM text measurement
 * and renders directly to <canvas> — zero layout reflow.
 *
 * 20 overlapping sine layers drive per-character displacement
 * for fluid, organic motion that builds momentum over time.
 */

import { layoutWithLines, prepareWithSegments } from '@chenglou/pretext';

const NOISE = '!@#$%^&*=~<>|/\\';
const DATA = '0123456789.';
const FONT = '9px "DM Mono", monospace';
const LINE_H = 12;
const PHI = (1 + Math.sqrt(5)) / 2;

// ── 20 sine layers (precomputed) ──
interface Layer {
	freqT: number;
	freqR: number;
	freqC: number;
	ampY: number;
	ampX: number;
	phase: number;
}

function buildLayers(): Layer[] {
	const layers: Layer[] = [];
	let sumY = 0;
	let sumX = 0;
	for (let l = 0; l < 20; l++) {
		const ampY = 1.0 / (1 + l * 0.35);
		const ampX = 0.4 / (1 + l * 0.5);
		sumY += ampY;
		sumX += ampX;
		layers.push({
			freqT: 0.05 + l * 0.02,
			freqR: 0.04 + l * 0.012,
			freqC: 0.002 + l * 0.0007,
			ampY,
			ampX,
			phase: l * PHI * Math.PI,
		});
	}
	// Normalise so total = 1
	for (const l of layers) {
		l.ampY /= sumY;
		l.ampX /= sumX;
	}
	return layers;
}

// ── Per-character state ──
interface Char {
	r: number;
	c: number;
	wave: string;
	data: string;
	resolvedWave: boolean;
	resolvedData: boolean;
}

export function initWaveAnimation(): void {
	const container = document.querySelector(
		'.hero-bg-waves',
	) as HTMLElement | null;
	if (!container) {
		return;
	}
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		return;
	}

	const rowEls = Array.from(
		container.querySelectorAll<HTMLElement>('.wave-row'),
	);
	if (!rowEls.length) {
		return;
	}

	// ── Read wave grid from SSR fallback ──
	const waveGrid: string[][] = rowEls.map((el) =>
		Array.from(el.textContent || ''),
	);
	const numRows = waveGrid.length;
	const fullCols = waveGrid[0]?.length || 0;
	// SSR doubles each row for horizontal tiling — use first half as pattern
	const patCols = fullCols / 2;

	// ── Pretext: non-DOM font measurement ──
	// Measure a reference string to derive accurate cell width
	// without triggering any DOM layout/reflow.
	const ref = prepareWithSegments('M'.repeat(10), FONT);
	const refLayout = layoutWithLines(ref, Infinity, LINE_H);
	const cellW =
		refLayout.lines.length > 0 ? refLayout.lines[0].width / 10 : 5.4; // fallback
	const cellH = LINE_H;

	// ── Build character index ──
	let dseed = 42;
	const chars: Char[] = [];
	for (let r = 0; r < numRows; r++) {
		for (let c = 0; c < patCols; c++) {
			if (waveGrid[r][c] !== ' ') {
				dseed = ((dseed * 1103515245 + 12345) & 0x7fffffff) >>> 0;
				chars.push({
					r,
					c,
					wave: waveGrid[r][c],
					data: DATA[(dseed >> 16) % DATA.length],
					resolvedWave: false,
					resolvedData: false,
				});
			}
		}
	}

	// ── Create canvas ──
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) {
		return;
	}
	canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
	container.appendChild(canvas);

	// Hide SSR fallback (keep in DOM for no-JS)
	const inner = container.querySelector('.wave-inner') as HTMLElement;
	if (inner) {
		inner.style.display = 'none';
	}

	// ── Sizing ──
	let w = 0;
	let h = 0;
	function resize(): void {
		const dpr = window.devicePixelRatio || 1;
		w = container.clientWidth;
		h = container.clientHeight;
		canvas.width = w * dpr;
		canvas.height = h * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.font = FONT;
		ctx.textBaseline = 'top';
	}
	resize();
	window.addEventListener('resize', resize);

	// ── Theme colour ──
	let fillColor = '';
	function readColor(): void {
		fillColor =
			getComputedStyle(document.documentElement)
				.getPropertyValue('--hero-fg')
				.trim() || '#e0e0e0';
	}
	readColor();
	new MutationObserver(readColor).observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['data-theme'],
	});

	// ── Layers ──
	const layers = buildLayers();
	const patternW = patCols * cellW;

	// ── Timings ──
	const P1 = 8_000;
	const P2 = 18_000;
	const P3 = 50_000;
	const t0 = performance.now();
	let lastText = 0;
	let phase2Set = false;

	function tick(now: number): void {
		const dt = now - t0;
		const s = now / 1000;

		// ── Momentum ──
		let momentum = 1;
		if (dt > P2 && dt < P3) {
			const t = (dt - P2) / (P3 - P2);
			momentum = 1 + t * t * 2;
		} else if (dt >= P3) {
			momentum = 3;
		}

		const amp = 10 * momentum;
		const breath = Math.sin(s * 0.08) * amp * 0.4;
		const driftX = (s * 5) % patternW;

		// ── Text evolution (~10 fps) ──
		if (now - lastText >= 100) {
			lastText = now;

			if (dt < P1) {
				const t = dt / P1;
				const prob = t * t * t * 0.15;
				for (const ch of chars) {
					if (!ch.resolvedWave && Math.random() < prob) {
						ch.resolvedWave = true;
					}
				}
			} else if (!phase2Set) {
				phase2Set = true;
				for (const ch of chars) {
					ch.resolvedWave = true;
				}
			} else if (dt >= P2 && dt < P3) {
				const t = (dt - P2) / (P3 - P2);
				const prob = t * t * 0.08;
				for (const ch of chars) {
					if (!ch.resolvedData && Math.random() < prob) {
						ch.resolvedData = true;
					}
				}
			}
		}

		// ── Render ──
		ctx.clearRect(0, 0, w, h);
		ctx.fillStyle = fillColor;

		for (const ch of chars) {
			// Pick current character
			let char: string;
			if (ch.resolvedData) {
				char = ch.data;
			} else if (ch.resolvedWave) {
				char = ch.wave;
			} else {
				char = NOISE[Math.floor(Math.random() * NOISE.length)];
			}

			// 20-layer displacement
			const rowPh = ch.r * 0.12 + Math.sin(ch.r * 0.37) * 0.6;
			const rowAmpScale = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(ch.r * 0.73));
			let dy = breath;
			let dx = 0;
			for (let l = 0; l < 20; l++) {
				const la = layers[l];
				const phase = rowPh + ch.r * la.freqR + ch.c * la.freqC + la.phase;
				dy += Math.sin(s * la.freqT + phase) * la.ampY * amp * rowAmpScale;
				dx += Math.sin(s * la.freqT * 0.7 + phase * 1.3) * la.ampX * amp * 0.25;
			}

			const baseX = ch.c * cellW;
			const baseY = ch.r * cellH;

			// Tile horizontally (pattern repeats)
			for (let tile = -1; tile <= 2; tile++) {
				const x = baseX + dx - driftX + tile * patternW;
				if (x < -cellW || x > w + cellW) {
					continue;
				}
				const y = baseY + dy;
				if (y < -cellH || y > h + cellH) {
					continue;
				}
				ctx.fillText(char, x, y);
			}
		}

		requestAnimationFrame(tick);
	}

	requestAnimationFrame(tick);
}
