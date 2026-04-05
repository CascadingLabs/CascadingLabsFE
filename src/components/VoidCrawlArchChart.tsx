import { type Component, createSignal, onCleanup, onMount } from 'solid-js';
import { useStarlightTheme } from './useStarlightTheme';

const dark = {
	box: '#1a1a1a',
	boxStroke: '#333333',
	accentBg: '#1a0d2e',
	accentStroke: '#2d1a4e',
	outputBg: '#1a1a1a',
	outputStroke: '#b07adf',
	text: '#e0e0e0',
	textDim: '#999999',
	accent: '#b07adf',
	accentLabel: '#d4bfef',
	arrow: '#555555',
	arrowLabel: '#888888',
	topBar: '#b07adf',
};

const light = {
	box: '#f8f8f8',
	boxStroke: '#d0d0d0',
	accentBg: '#f0eaf8',
	accentStroke: '#5a2d91',
	outputBg: '#f8f8f8',
	outputStroke: '#5a2d91',
	text: '#0a0a0a',
	textDim: '#555555',
	accent: '#5a2d91',
	accentLabel: '#3d1d66',
	arrow: '#aaaaaa',
	arrowLabel: '#777777',
	topBar: '#5a2d91',
};

/* Layout constants */
const VW = 800;
const VH = 160;
const BW = 148;
const BH = 50;
const BOX_Y = 44;
const MARGIN = 14;
const GAP = (VW - 2 * MARGIN - 4 * BW) / 3;

const boxLeft = (i: number) => MARGIN + i * (BW + GAP);
const boxCX = (i: number) => boxLeft(i) + BW / 2;
const BOX_CY = BOX_Y + BH / 2;

type BoxStyle = 'normal' | 'accent' | 'output';

interface BoxDef {
	label: string;
	sub: string;
	style: BoxStyle;
}

const boxes: BoxDef[] = [
	{ label: 'Python', sub: 'Your Application', style: 'normal' },
	{ label: 'VoidCrawl', sub: 'Rust \u00B7 PyO3 \u00B7 Tokio', style: 'accent' },
	{ label: 'Chrome', sub: 'Headless / Headful', style: 'normal' },
	{ label: 'Web Page', sub: 'DOM \u00B7 JS \u00B7 CSS', style: 'output' },
];

const arrows = ['await', 'CDP', 'renders'];

const VoidCrawlArchChart: Component = () => {
	const [scale, setScale] = createSignal(1);
	const isDark = useStarlightTheme();
	const t = () => (isDark() ? dark : light);
	let containerRef: HTMLDivElement | undefined;

	onMount(() => {
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) {
				setScale(e.contentRect.width / VW);
			}
		});
		if (containerRef) {
			ro.observe(containerRef);
		}
		onCleanup(() => ro.disconnect());
	});

	const fill = (s: BoxStyle) => {
		const th = t();
		return s === 'accent' ? th.accentBg : s === 'output' ? th.outputBg : th.box;
	};

	const stroke = (s: BoxStyle) => {
		const th = t();
		return s === 'accent'
			? th.accentStroke
			: s === 'output'
				? th.outputStroke
				: th.boxStroke;
	};

	const labelColor = (s: BoxStyle) => {
		const th = t();
		return s === 'accent'
			? th.accentLabel
			: s === 'output'
				? th.accent
				: th.text;
	};

	return (
		<div
			ref={containerRef}
			style={{
				position: 'relative',
				width: '100%',
				'max-width': `${VW}px`,
				margin: '2rem auto',
			}}
		>
			<div
				style={{
					position: 'relative',
					'padding-bottom': `${(VH / VW) * 100}%`,
					overflow: 'hidden',
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox={`0 0 ${VW} ${VH}`}
					style={{
						position: 'absolute',
						inset: '0',
						width: '100%',
						height: '100%',
					}}
				>
					<defs>
						<marker
							id="archArrow"
							markerWidth="8"
							markerHeight="6"
							refX="8"
							refY="3"
							orient="auto"
						>
							<path d="M0,0 L8,3 L0,6Z" fill={t().arrow} />
						</marker>
					</defs>

					{/* Boxes */}
					{boxes.map((box, i) => (
						<g transform={`translate(${boxLeft(i)}, ${BOX_Y})`}>
							<rect
								width={BW}
								height={BH}
								fill={fill(box.style)}
								stroke={stroke(box.style)}
								stroke-width={box.style === 'normal' ? 1 : 1.5}
							/>
							{box.style !== 'normal' && (
								<rect width={BW} height="2" fill={t().topBar} />
							)}
						</g>
					))}

					{/* Arrows between boxes */}
					{arrows.map((_, i) => (
						<line
							x1={boxLeft(i) + BW + 5}
							y1={BOX_CY}
							x2={boxLeft(i + 1) - 5}
							y2={BOX_CY}
							stroke={t().arrow}
							stroke-width="1.5"
							marker-end="url(#archArrow)"
						/>
					))}
				</svg>

				{/* HTML text overlay */}
				<div
					style={{
						position: 'absolute',
						inset: '0',
						'pointer-events': 'none',
					}}
				>
					<div
						style={{
							position: 'absolute',
							top: '0',
							left: '0',
							width: `${VW}px`,
							height: `${VH}px`,
							'transform-origin': 'top left',
							transform: `scale(${scale()})`,
							'font-family': 'system-ui, -apple-system, sans-serif',
						}}
					>
						{/* Box labels */}
						{boxes.map((box, i) => (
							<span
								style={{
									position: 'absolute',
									left: `${boxCX(i)}px`,
									top: `${BOX_Y + BH / 2 - 2}px`,
									transform: 'translate(-50%, -50%)',
									color: labelColor(box.style),
									'font-size': '14px',
									'font-weight': '600',
									'white-space': 'nowrap',
								}}
							>
								{box.label}
							</span>
						))}

						{/* Sub-labels below boxes */}
						{boxes.map((box, i) => (
							<span
								style={{
									position: 'absolute',
									left: `${boxCX(i)}px`,
									top: `${BOX_Y + BH + 14}px`,
									transform: 'translateX(-50%)',
									color: t().textDim,
									'font-size': '11px',
									'text-align': 'center',
									'white-space': 'nowrap',
								}}
							>
								{box.sub}
							</span>
						))}

						{/* Arrow labels */}
						{arrows.map((label, i) => (
							<span
								style={{
									position: 'absolute',
									left: `${(boxLeft(i) + BW + boxLeft(i + 1)) / 2}px`,
									top: `${BOX_Y - 18}px`,
									transform: 'translateX(-50%)',
									color: t().arrowLabel,
									'font-size': '10px',
									'font-weight': '500',
									'text-align': 'center',
									'white-space': 'nowrap',
								}}
							>
								{label}
							</span>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default VoidCrawlArchChart;
