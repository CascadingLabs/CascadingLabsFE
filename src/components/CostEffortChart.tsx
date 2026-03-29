import { type Component, createSignal, onCleanup, onMount } from 'solid-js';
import { useStarlightTheme } from './useStarlightTheme';

const dark = {
	line: '#444444',
	dot: '#777777',
	dotYosoi: '#5b8cc7',
	ringYosoi: '#5b8cc7',
	label: '#cccccc',
	sub: '#888888',
};

const light = {
	line: '#cccccc',
	dot: '#888888',
	dotYosoi: '#2c5282',
	ringYosoi: '#2c5282',
	label: '#333333',
	sub: '#777777',
};

const VW = 700;
const VH = 175;
const LINE_Y = 80;
const LINE_L = 90;
const LINE_R = 610;
const LEFT_X = LINE_L;
const CENTER_X = 350;
const RIGHT_X = LINE_R;

const HEADER_Y = LINE_Y - 55;
const SUB1_Y = LINE_Y + 26;
const SUB2_Y = LINE_Y + 42;

const CostEffortChart: Component = () => {
	const [scale, setScale] = createSignal(1);
	const isDark = useStarlightTheme();
	const t = () => (isDark() ? dark : light);
	let containerRef: HTMLDivElement | undefined;

	onMount(() => {
		const ro = new ResizeObserver((entries) => {
			for (const e of entries) setScale(e.contentRect.width / VW);
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
					{/* Continuum line */}
					<line
						x1={LINE_L}
						y1={LINE_Y}
						x2={LINE_R}
						y2={LINE_Y}
						stroke={t().line}
						stroke-width="2"
						stroke-linecap="round"
					/>

					{/* Scraping APIs dot — left end */}
					<circle cx={LEFT_X} cy={LINE_Y} r="6" fill={t().dot} />

					{/* Custom Scraping dot — right end */}
					<circle cx={RIGHT_X} cy={LINE_Y} r="6" fill={t().dot} />

					{/* Yosoi dot with ring */}
					<circle
						cx={CENTER_X}
						cy={LINE_Y}
						r="14"
						fill="none"
						stroke={t().ringYosoi}
						stroke-width="1.5"
						opacity="0.35"
					/>
					<circle cx={CENTER_X} cy={LINE_Y} r="7" fill={t().dotYosoi} />
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
						{/* Scraping APIs — header above, sub below */}
						<span
							style={{
								position: 'absolute',
								left: `${LEFT_X}px`,
								top: `${HEADER_Y}px`,
								transform: 'translateX(-50%)',
								color: t().label,
								'font-size': '14px',
								'font-weight': '600',
								'text-align': 'center',
								'white-space': 'nowrap',
							}}
						>
							Scraping APIs
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${LEFT_X}px`,
								top: `${SUB1_Y}px`,
								transform: 'translateX(-50%)',
								color: t().sub,
								'font-size': '11px',
								'text-align': 'center',
								'white-space': 'nowrap',
							}}
						>
							Expensive at scale
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${LEFT_X}px`,
								top: `${SUB2_Y}px`,
								transform: 'translateX(-50%)',
								color: t().sub,
								'font-size': '11px',
								'text-align': 'center',
								'white-space': 'nowrap',
							}}
						>
							Easy to use
						</span>

						{/* Custom Scraping — header above, sub below */}
						<span
							style={{
								position: 'absolute',
								left: `${RIGHT_X}px`,
								top: `${HEADER_Y}px`,
								transform: 'translateX(-50%)',
								color: t().label,
								'font-size': '14px',
								'font-weight': '600',
								'text-align': 'center',
								'white-space': 'nowrap',
							}}
						>
							Custom Scraping
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${RIGHT_X}px`,
								top: `${SUB1_Y}px`,
								transform: 'translateX(-50%)',
								color: t().sub,
								'font-size': '11px',
								'text-align': 'center',
								'white-space': 'nowrap',
							}}
						>
							Cheap at scale
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${RIGHT_X}px`,
								top: `${SUB2_Y}px`,
								transform: 'translateX(-50%)',
								color: t().sub,
								'font-size': '11px',
								'text-align': 'center',
								'white-space': 'nowrap',
							}}
						>
							Effortful and flaky
						</span>

						{/* Yosoi — header above, sub below */}
						<span
							style={{
								position: 'absolute',
								left: `${CENTER_X}px`,
								top: `${HEADER_Y}px`,
								transform: 'translateX(-50%)',
								color: t().label,
								'font-size': '14px',
								'font-weight': '600',
								'text-align': 'center',
								'white-space': 'nowrap',
							}}
						>
							Yosoi
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${CENTER_X}px`,
								top: `${SUB1_Y}px`,
								transform: 'translateX(-50%)',
								color: t().sub,
								'font-size': '11px',
								'text-align': 'center',
								'white-space': 'nowrap',
							}}
						>
							Cheap at scale
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${CENTER_X}px`,
								top: `${SUB2_Y}px`,
								transform: 'translateX(-50%)',
								color: t().sub,
								'font-size': '11px',
								'text-align': 'center',
								'white-space': 'nowrap',
							}}
						>
							Easy to use
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CostEffortChart;
