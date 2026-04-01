import { type Component, createSignal, onCleanup, onMount } from 'solid-js';
import { useStarlightTheme } from './useStarlightTheme';

const dark = {
	box: '#1a1a1a',
	boxStroke: '#333333',
	accentBg: '#0d1b2a',
	accentStroke: '#1e3a5f',
	outputBg: '#1a1a1a',
	outputStroke: '#5b8cc7',
	text: '#e0e0e0',
	textDim: '#999999',
	textMuted: '#666666',
	accent: '#5b8cc7',
	accentLabel: '#90b8e0',
	arrow: '#555555',
	dashed: '#5b8cc7',
	divider: '#2a2a2a',
	skipText: '#555555',
	topBar: '#5b8cc7',
	aiBg: '#1e3a5f',
};

const light = {
	box: '#f8f8f8',
	boxStroke: '#d0d0d0',
	accentBg: '#edf2f7',
	accentStroke: '#2c5282',
	outputBg: '#f8f8f8',
	outputStroke: '#2c5282',
	text: '#0a0a0a',
	textDim: '#555555',
	textMuted: '#999999',
	accent: '#2c5282',
	accentLabel: '#1e3a5f',
	arrow: '#aaaaaa',
	dashed: '#2c5282',
	divider: '#d0d0d0',
	skipText: '#999999',
	topBar: '#2c5282',
	aiBg: '#2c5282',
};

/* Layout constants */
const VW = 740;
const VH = 430;
const LX = 185;
const RX = 555;
const BW = 190;
const BH = 42;
const ROW_H = 60;
const START_Y = 52;

const rowY = (i: number) => START_Y + i * ROW_H;
const rowCY = (i: number) => rowY(i) + BH / 2;
const L_AX = LX - BW / 2 + 8; // left column arrow lane (near left edge)
const R_AX = RX + BW / 2 - 8; // right column arrow lane (near right edge)

type BoxType = 'normal' | 'accent' | 'output';

interface StepDef {
	label: string;
	type: BoxType;
}

const leftSteps: StepDef[] = [
	{ label: 'Define Contract', type: 'normal' },
	{ label: 'Fetch HTML', type: 'normal' },
	{ label: 'AI Discovery', type: 'accent' },
	{ label: 'Verify & Cache', type: 'normal' },
	{ label: 'Extract Data', type: 'normal' },
	{ label: 'Structured Output', type: 'output' },
];

const rightSteps: (StepDef | null)[] = [
	{ label: 'Define Contract', type: 'normal' },
	{ label: 'Fetch HTML', type: 'normal' },
	null,
	{ label: 'Load Cached Selectors', type: 'normal' },
	{ label: 'Extract Data', type: 'normal' },
	{ label: 'Structured Output', type: 'output' },
];

const PipelineChart: Component = () => {
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

	const boxFill = (type: BoxType) => {
		const th = t();
		return type === 'accent'
			? th.accentBg
			: type === 'output'
				? th.outputBg
				: th.box;
	};

	const boxStroke = (type: BoxType) => {
		const th = t();
		return type === 'accent'
			? th.accentStroke
			: type === 'output'
				? th.outputStroke
				: th.boxStroke;
	};

	const textColor = (type: BoxType) => {
		const th = t();
		return type === 'accent'
			? th.accentLabel
			: type === 'output'
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
							id="seqArrow"
							markerWidth="8"
							markerHeight="6"
							refX="8"
							refY="3"
							orient="auto"
						>
							<path d="M0,0 L8,3 L0,6Z" fill={t().arrow} />
						</marker>
						<marker
							id="seqArrowAccent"
							markerWidth="8"
							markerHeight="6"
							refX="8"
							refY="3"
							orient="auto"
						>
							<path d="M0,0 L8,3 L0,6Z" fill={t().dashed} />
						</marker>
					</defs>

					{/* Left column boxes */}
					{leftSteps.map((step, i) => (
						<g transform={`translate(${LX - BW / 2}, ${rowY(i)})`}>
							<rect
								width={BW}
								height={BH}
								fill={boxFill(step.type)}
								stroke={boxStroke(step.type)}
								stroke-width={step.type === 'normal' ? 1 : 1.5}
							/>
							{step.type !== 'normal' && (
								<rect width={BW} height="2" fill={t().topBar} />
							)}
						</g>
					))}

					{/* Left column arrows (consecutive, along left edge) */}
					{[0, 1, 2, 3, 4].map((i) => (
						<line
							x1={L_AX}
							y1={rowY(i) + BH + 2}
							x2={L_AX}
							y2={rowY(i + 1) - 2}
							stroke={t().arrow}
							stroke-width="1.5"
							marker-end="url(#seqArrow)"
						/>
					))}

					{/* Right column boxes (row 2 skipped) */}
					{rightSteps.map((step, i) => {
						if (!step) {
							return null;
						}
						return (
							<g transform={`translate(${RX - BW / 2}, ${rowY(i)})`}>
								<rect
									width={BW}
									height={BH}
									fill={boxFill(step.type)}
									stroke={boxStroke(step.type)}
									stroke-width={step.type === 'normal' ? 1 : 1.5}
								/>
								{step.type !== 'normal' && (
									<rect width={BW} height="2" fill={t().topBar} />
								)}
							</g>
						);
					})}

					{/* Right column arrows (along right edge) */}
					{/* Row 0 → 1 */}
					<line
						x1={R_AX}
						y1={rowY(0) + BH + 2}
						x2={R_AX}
						y2={rowY(1) - 2}
						stroke={t().arrow}
						stroke-width="1.5"
						marker-end="url(#seqArrow)"
					/>
					{/* Row 1 → 3 (skip — dashed) */}
					<line
						x1={R_AX}
						y1={rowY(1) + BH + 2}
						x2={R_AX}
						y2={rowY(3) - 2}
						stroke={t().arrow}
						stroke-width="1.5"
						stroke-dasharray="6,4"
						marker-end="url(#seqArrow)"
					/>
					{/* Row 3 → 4 */}
					<line
						x1={R_AX}
						y1={rowY(3) + BH + 2}
						x2={R_AX}
						y2={rowY(4) - 2}
						stroke={t().arrow}
						stroke-width="1.5"
						marker-end="url(#seqArrow)"
					/>
					{/* Row 4 → 5 */}
					<line
						x1={R_AX}
						y1={rowY(4) + BH + 2}
						x2={R_AX}
						y2={rowY(5) - 2}
						stroke={t().arrow}
						stroke-width="1.5"
						marker-end="url(#seqArrow)"
					/>

					{/* Horizontal cache arrow: left row 3 → right row 3 */}
					<line
						x1={LX + BW / 2 + 5}
						y1={rowCY(3)}
						x2={RX - BW / 2 - 5}
						y2={rowCY(3)}
						stroke={t().dashed}
						stroke-width="1.5"
						stroke-dasharray="6,3"
						marker-end="url(#seqArrowAccent)"
					/>
				</svg>

				{/* HTML text overlay — translatable by Google Translate */}
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
						{/* Left column header */}
						<span
							style={{
								position: 'absolute',
								left: `${LX}px`,
								top: '14px',
								transform: 'translateX(-50%)',
								color: t().text,
								'font-size': '15px',
								'font-weight': '600',
								'white-space': 'nowrap',
							}}
						>
							First Run
						</span>

						{/* Right column header */}
						<span
							style={{
								position: 'absolute',
								left: `${RX}px`,
								top: '14px',
								transform: 'translateX(-50%)',
								color: t().text,
								'font-size': '15px',
								'font-weight': '600',
								'white-space': 'nowrap',
							}}
						>
							Every Run After
						</span>

						{/* Left step labels */}
						{leftSteps.map((step, i) => (
							<span
								style={{
									position: 'absolute',
									left: `${LX}px`,
									top: `${rowY(i) + BH / 2 - 20}px`,
									transform: 'translate(-50%, -50%)',
									color: textColor(step.type),
									'font-size': '13px',
									'font-weight': step.type === 'normal' ? '500' : '600',
									width: `${BW - 12}px`,
									'text-align': 'center',
									display: 'flex',
									'align-items': 'center',
									'justify-content': 'center',
									'line-height': '1.2',
								}}
							>
								{step.label}
							</span>
						))}

						{/* Right step labels */}
						{rightSteps.map((step, i) => {
							if (!step) {
								return null;
							}
							return (
								<span
									style={{
										position: 'absolute',
										left: `${RX}px`,
										top: `${rowY(i) + BH / 2 - 20}px`,
										transform: 'translate(-50%, -50%)',
										color: textColor(step.type),
										'font-size': '13px',
										'font-weight': step.type === 'normal' ? '500' : '600',
										width: `${BW - 12}px`,
										'text-align': 'center',
										display: 'flex',
										'align-items': 'center',
										'justify-content': 'center',
										'line-height': '1.2',
									}}
								>
									{step.label}
								</span>
							);
						})}

						{/* Skip label — right column row 2 */}
						<span
							style={{
								position: 'absolute',
								left: `${RX}px`,
								top: `${rowY(2) + BH / 2 - 20}px`,
								transform: 'translate(-50%, -50%)',
								color: t().skipText,
								'font-size': '11px',
								'font-style': 'italic',
								width: `${BW - 12}px`,
								'text-align': 'center',
							}}
						>
							No LLM needed
						</span>

						{/* Cache arrow label */}
						<span
							style={{
								position: 'absolute',
								left: `${(LX + RX) / 2}px`,
								top: `${rowY(3) + BH / 2 - 36}px`,
								transform: 'translateX(-50%)',
								color: t().dashed,
								'font-size': '10px',
								'font-weight': '500',
								'text-align': 'center',
								'max-width': `${RX - LX - BW + 20}px`,
							}}
						>
							cached selectors
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default PipelineChart;
