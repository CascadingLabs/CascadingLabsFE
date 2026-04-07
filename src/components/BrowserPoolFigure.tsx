import { type Component, createSignal, onCleanup, onMount } from 'solid-js';
import { useStarlightTheme } from './useStarlightTheme';

const dark = {
	outerStroke: '#2e2e2e',
	outerLabel: '#4a4a4a',
	sessionBg: '#1a0d2e',
	sessionStroke: '#4a2d80',
	sessionTopBar: '#b07adf',
	sessionLabel: '#d4bfef',
	sessionPort: '#6a6a6a',
	queueBg: '#111827',
	queueStroke: '#b07adf',
	queueTopBar: '#b07adf',
	queueLabel: '#b07adf',
	queueContent: '#c8c8c8',
	queueMeta: '#4a4a4a',
	arrow: '#3a3a3a',
	semaphore: '#4a4a4a',
};

const light = {
	outerStroke: '#d8d8d8',
	outerLabel: '#c0c0c0',
	sessionBg: '#f0eaf8',
	sessionStroke: '#7a4db8',
	sessionTopBar: '#5a2d91',
	sessionLabel: '#3d1d66',
	sessionPort: '#9a9a9a',
	queueBg: '#f4f0fb',
	queueStroke: '#5a2d91',
	queueTopBar: '#5a2d91',
	queueLabel: '#5a2d91',
	queueContent: '#1a1a1a',
	queueMeta: '#b0b0b0',
	arrow: '#c8c8c8',
	semaphore: '#b0b0b0',
};

/* ── canvas ──────────────────────────────────────────────── */
const VW = 680;
const VH = 284;

/* ── session boxes ───────────────────────────────────────── */
const S_W = 158;
const S_H = 76;
const S_Y = 52;
const GAP = 60;

const S0_X = 43;
const S1_X = S0_X + S_W + GAP; // 246
const SN_X = S1_X + S_W + GAP; // 464

const S0_CX = S0_X + S_W / 2; // 107
const S1_CX = S1_X + S_W / 2; // 325
const SN_CX = SN_X + S_W / 2; // 543
const S_BOTTOM = S_Y + S_H; // 128

/* ── merge connector ─────────────────────────────────────── */
const MERGE_Y = S_BOTTOM + 40; // 168
const ARROW_X = (S0_CX + SN_CX) / 2; // 325  (= S1_CX)

/* ── ready queue ─────────────────────────────────────────── */
const Q_W = 440;
const Q_X = ARROW_X - Q_W / 2;
const Q_Y = MERGE_Y + 12; // gap between merge crossbar and queue top
const Q_H = 72;

/* levers: vertical position of text inside the queue box ── */
const Q_TITLE_DY = 0; // px from Q_Y → title
const Q_TABS_DY = 25; // px from Q_Y → tab list

/* ─────────────────────────────────────────────────────────── */

const BrowserPoolFigure: Component = () => {
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
					overflow: 'visible',
				}}
			>
				{/* ── SVG structural layer ── */}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox={`0 0 ${VW} ${VH}`}
					style={{
						position: 'absolute',
						inset: '0',
						width: '100%',
						height: '100%',
						overflow: 'visible',
					}}
				>
					<defs>
						<marker
							id="poolArrow"
							markerWidth="7"
							markerHeight="5"
							refX="7"
							refY="2.5"
							orient="auto"
						>
							<path d="M0,0 L7,2.5 L0,5Z" fill={t().arrow} />
						</marker>
					</defs>

					{/* Outer BrowserPool border */}
					<rect
						x="2"
						y="2"
						width={VW - 4}
						height={VH - 4}
						rx="5"
						fill="none"
						stroke={t().outerStroke}
						stroke-width="1"
					/>

					{/* ── Session 0 ── */}
					<rect
						x={S0_X}
						y={S_Y}
						width={S_W}
						height={S_H}
						rx="3"
						fill={t().sessionBg}
						stroke={t().sessionStroke}
						stroke-width="1.5"
					/>
					<rect
						x={S0_X}
						y={S_Y}
						width={S_W}
						height="3"
						rx="3"
						fill={t().sessionTopBar}
					/>

					{/* ── Session 1 ── */}
					<rect
						x={S1_X}
						y={S_Y}
						width={S_W}
						height={S_H}
						rx="3"
						fill={t().sessionBg}
						stroke={t().sessionStroke}
						stroke-width="1.5"
					/>
					<rect
						x={S1_X}
						y={S_Y}
						width={S_W}
						height="3"
						rx="3"
						fill={t().sessionTopBar}
					/>

					{/* ── Session N (ghost — 35% opacity of real session) ── */}
					<g opacity="0.35">
						<rect
							x={SN_X}
							y={S_Y}
							width={S_W}
							height={S_H}
							rx="3"
							fill={t().sessionBg}
							stroke={t().sessionStroke}
							stroke-width="1.5"
							stroke-dasharray="6 3"
						/>
						<rect
							x={SN_X}
							y={S_Y}
							width={S_W}
							height="3"
							rx="3"
							fill={t().sessionTopBar}
						/>
					</g>

					{/* ── Merge connector ── */}
					{/* S0 leg */}
					<line
						x1={S0_CX}
						y1={S_BOTTOM}
						x2={S0_CX}
						y2={MERGE_Y}
						stroke={t().arrow}
						stroke-width="1.5"
					/>
					{/* S1 leg */}
					<line
						x1={S1_CX}
						y1={S_BOTTOM}
						x2={S1_CX}
						y2={MERGE_Y}
						stroke={t().arrow}
						stroke-width="1.5"
					/>
					{/* SN leg (ghost — same low opacity) */}
					<line
						x1={SN_CX}
						y1={S_BOTTOM}
						x2={SN_CX}
						y2={MERGE_Y}
						stroke={t().arrow}
						stroke-width="1.5"
						opacity="0.35"
					/>
					{/* Horizontal crossbar */}
					<line
						x1={S0_CX}
						y1={MERGE_Y}
						x2={SN_CX}
						y2={MERGE_Y}
						stroke={t().arrow}
						stroke-width="1.5"
					/>
					{/* Arrow into queue */}
					<line
						x1={ARROW_X}
						y1={MERGE_Y}
						x2={ARROW_X}
						y2={Q_Y - 2}
						stroke={t().arrow}
						stroke-width="1.5"
						marker-end="url(#poolArrow)"
					/>

					{/* ── Ready Queue box ── */}
					<rect
						x={Q_X}
						y={Q_Y}
						width={Q_W}
						height={Q_H}
						rx="3"
						fill={t().queueBg}
						stroke={t().queueStroke}
						stroke-width="1.5"
					/>
					<rect
						x={Q_X}
						y={Q_Y}
						width={Q_W}
						height="3"
						rx="3"
						fill={t().queueTopBar}
					/>
				</svg>

				{/* ── HTML text overlay ── */}
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
						{/* Outer "BROWSERPOOL" label */}
						<span
							style={{
								position: 'absolute',
								left: '16px',
								top: '14px',
								color: t().outerLabel,
								'font-size': '10px',
								'font-weight': '600',
								'letter-spacing': '0.1em',
								'text-transform': 'uppercase',
							}}
						>
							BrowserPool
						</span>

						{/* Session 0 */}
						<span
							style={{
								position: 'absolute',
								left: `${S0_CX}px`,
								top: `${S_Y + 20}px`,
								transform: 'translateX(-50%)',
								color: t().sessionLabel,
								'font-size': '13px',
								'font-weight': '600',
								'white-space': 'nowrap',
							}}
						>
							Session 0
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${S0_CX}px`,
								top: `${S_Y + 41}px`,
								transform: 'translateX(-50%)',
								color: t().sessionPort,
								'font-size': '11px',
								'font-family':
									"'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
								'white-space': 'nowrap',
							}}
						>
							port 9222
						</span>

						{/* Session 1 */}
						<span
							style={{
								position: 'absolute',
								left: `${S1_CX}px`,
								top: `${S_Y + 20}px`,
								transform: 'translateX(-50%)',
								color: t().sessionLabel,
								'font-size': '13px',
								'font-weight': '600',
								'white-space': 'nowrap',
							}}
						>
							Session 1
						</span>
						<span
							style={{
								position: 'absolute',
								left: `${S1_CX}px`,
								top: `${S_Y + 41}px`,
								transform: 'translateX(-50%)',
								color: t().sessionPort,
								'font-size': '11px',
								'font-family':
									"'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
								'white-space': 'nowrap',
							}}
						>
							port 9223
						</span>

						{/* Session N (ghost label) */}
						<span
							style={{
								position: 'absolute',
								left: `${SN_CX}px`,
								top: `${S_Y + 24}px`,
								transform: 'translateX(-50%)',
								color: t().sessionLabel,
								'font-size': '20px',
								'letter-spacing': '5px',
								opacity: '0.35',
								'white-space': 'nowrap',
							}}
						>
							···
						</span>

						{/* Queue: title */}
						<span
							style={{
								position: 'absolute',
								left: `${ARROW_X}px`,
								top: `${Q_Y + Q_TITLE_DY}px`,
								transform: 'translateX(-50%)',
								color: t().queueLabel,
								'font-size': '12.5px',
								'font-weight': '700',
								'letter-spacing': '0.02em',
								'white-space': 'nowrap',
							}}
						>
							Ready Queue (deque)
						</span>

						{/* Queue: tab list */}
						<span
							style={{
								position: 'absolute',
								left: `${ARROW_X}px`,
								top: `${Q_Y + Q_TABS_DY}px`,
								transform: 'translateX(-50%)',
								color: t().queueContent,
								'font-size': '11.5px',
								'font-family':
									"'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
								'white-space': 'nowrap',
							}}
						>
							[ Tab0, Tab1, Tab2, Tab3, ... ]
						</span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default BrowserPoolFigure;
