import { type Component, createSignal, onCleanup, onMount } from 'solid-js';
import { useStarlightTheme } from './useStarlightTheme';

const dark = {
	axis: '#444444',
	axisLabel: '#999999',
	hint: '#666666',
	grid: '#282828',
	zone: 'rgba(44, 82, 130, 0.18)',
	dot: '#777777',
	dotYosoi: '#5b8cc7',
	ringYosoi: '#5b8cc7',
	label: '#cccccc',
	sub: '#888888',
	labelYosoi: '#90b8e0',
	subYosoi: '#5b8cc7',
};

const light = {
	axis: '#cccccc',
	axisLabel: '#666666',
	hint: '#aaaaaa',
	grid: '#eeeeee',
	zone: 'rgba(44, 82, 130, 0.12)',
	dot: '#888888',
	dotYosoi: '#2c5282',
	ringYosoi: '#2c5282',
	label: '#333333',
	sub: '#777777',
	labelYosoi: '#1e3a5f',
	subYosoi: '#2c5282',
};

/* Plot area */
const PL = 80;
const PT = 40;
const PW = 550;
const PH = 300;

const plotX = (frac: number) => PL + frac * PW;
const plotY = (frac: number) => PT + (1 - frac) * PH;

const CostEffortChart: Component = () => {
	const [scale, setScale] = createSignal(1);
	const isDark = useStarlightTheme();
	const t = () => (isDark() ? dark : light);
	let containerRef: HTMLDivElement | undefined;

	onMount(() => {
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) setScale(e.contentRect.width / 700);
		});
		if (containerRef) ro.observe(containerRef);
		onCleanup(() => ro.disconnect());
	});

	return (
		<div
			ref={containerRef}
			style={{
				position: 'relative',
				width: '100%',
				'max-width': '700px',
				margin: '2rem auto',
			}}
		>
			<div
				style={{
					position: 'relative',
					'padding-bottom': '57.14%',
					overflow: 'hidden',
				}}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 700 400"
					style={{
						position: 'absolute',
						inset: '0',
						width: '100%',
						height: '100%',
					}}
				>
					{/* Ideal zone — bottom-left quadrant */}
					<rect
						x={PL}
						y={PT + PH * 0.5}
						width={PW * 0.5}
						height={PH * 0.5}
						fill={t().zone}
					/>

					{/* Grid midlines */}
					<line
						x1={PL}
						y1={PT + PH * 0.5}
						x2={PL + PW}
						y2={PT + PH * 0.5}
						stroke={t().grid}
						stroke-width="1"
					/>
					<line
						x1={PL + PW * 0.5}
						y1={PT}
						x2={PL + PW * 0.5}
						y2={PT + PH}
						stroke={t().grid}
						stroke-width="1"
					/>

					{/* Axes */}
					<line
						x1={PL}
						y1={PT + PH}
						x2={PL + PW}
						y2={PT + PH}
						stroke={t().axis}
						stroke-width="1.5"
					/>
					<line
						x1={PL}
						y1={PT}
						x2={PL}
						y2={PT + PH}
						stroke={t().axis}
						stroke-width="1.5"
					/>

					{/* LLM Scraping APIs — low effort, high cost */}
					<circle cx={plotX(0.15)} cy={plotY(0.85)} r="5" fill={t().dot} />

					{/* Bespoke Scraping — high effort, medium cost */}
					<circle cx={plotX(0.8)} cy={plotY(0.4)} r="5" fill={t().dot} />

					{/* Yosoi — low effort, near-zero cost */}
					<circle
						cx={plotX(0.15)}
						cy={plotY(0.08)}
						r="16"
						fill="none"
						stroke={t().ringYosoi}
						stroke-width="1.5"
						opacity="0.35"
					/>
					<circle cx={plotX(0.15)} cy={plotY(0.08)} r="7" fill={t().dotYosoi} />
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
							width: '700px',
							height: '400px',
							'transform-origin': 'top left',
							transform: `scale(${scale()})`,
							'font-family': 'system-ui, -apple-system, sans-serif',
						}}
					>
						{/* X-axis */}
						<span
							style={{
								position: 'absolute',
								left: `${PL + PW / 2}px`,
								top: `${PT + PH + 20}px`,
								transform: 'translateX(-50%)',
								color: t().axisLabel,
								'font-size': '12px',
								'font-weight': '500',
								'text-align': 'center',
								'max-width': `${PW}px`,
							}}
						>
							Manual Effort &amp; Maintenance
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${PL + 10}px`,
								top: `${PT + PH + 6}px`,
								color: t().hint,
								'font-size': '10px',
							}}
						>
							Low
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${PL + PW - 28}px`,
								top: `${PT + PH + 6}px`,
								color: t().hint,
								'font-size': '10px',
							}}
						>
							High
						</span>

						{/* Y-axis */}
						<span
							style={{
								position: 'absolute',
								left: `${PL - 46}px`,
								top: `${PT + PH / 2}px`,
								transform: 'translate(-50%, -50%) rotate(-90deg)',
								color: t().axisLabel,
								'font-size': '12px',
								'font-weight': '500',
								'white-space': 'nowrap',
							}}
						>
							Cost at Scale
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${PL - 20}px`,
								top: `${PT + PH - 15}px`,
								transform: 'translateX(-50%)',
								color: t().hint,
								'font-size': '10px',
							}}
						>
							Low
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${PL - 20}px`,
								top: `${PT + 5}px`,
								transform: 'translateX(-50%)',
								color: t().hint,
								'font-size': '10px',
							}}
						>
							High
						</span>

						{/* LLM Scraping APIs */}
						<span
							style={{
								position: 'absolute',
								left: `${plotX(0.15) + 18}px`,
								top: `${plotY(0.85) - 10}px`,
								color: t().label,
								'font-size': '13px',
								'font-weight': '600',
								'max-width': '180px',
							}}
						>
							LLM Scraping APIs
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${plotX(0.15) + 18}px`,
								top: `${plotY(0.85) + 7}px`,
								color: t().sub,
								'font-size': '11px',
								'max-width': '180px',
							}}
						>
							Expensive per page
						</span>

						{/* Bespoke Scraping */}
						<span
							style={{
								position: 'absolute',
								left: `${plotX(0.8) - 18}px`,
								top: `${plotY(0.4) - 10}px`,
								transform: 'translateX(-100%)',
								color: t().label,
								'font-size': '13px',
								'font-weight': '600',
								'max-width': '180px',
								'text-align': 'right',
							}}
						>
							Bespoke Scraping
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${plotX(0.8) - 18}px`,
								top: `${plotY(0.4) + 7}px`,
								transform: 'translateX(-100%)',
								color: t().sub,
								'font-size': '11px',
								'max-width': '180px',
								'text-align': 'right',
							}}
						>
							Breaks on site redesigns
						</span>

						{/* Yosoi */}
						<span
							style={{
								position: 'absolute',
								left: `${plotX(0.15) + 26}px`,
								top: `${plotY(0.08) - 38}px`,
								color: t().labelYosoi,
								'font-size': '14px',
								'font-weight': '700',
								'max-width': '180px',
							}}
						>
							Yosoi
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${plotX(0.15) + 26}px`,
								top: `${plotY(0.08) - 19}px`,
								color: t().subYosoi,
								'font-size': '11px',
								'max-width': '180px',
							}}
						>
							Optimal cost
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CostEffortChart;
