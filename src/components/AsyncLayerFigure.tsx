import { type Component, For } from 'solid-js';
import { useStarlightTheme } from './useStarlightTheme';

const dark = {
	normalBg: '#1a1a1a',
	normalStroke: '#333333',
	accentBg: '#1a0d2e',
	accentStroke: '#2d1a4e',
	accentTopBar: '#b07adf',
	outputBg: '#0d1a1a',
	outputStroke: '#2a5a5a',
	outputTopBar: '#3a8a8a',
	label: '#e0e0e0',
	accentLabel: '#d4bfef',
	outputLabel: '#7ecece',
	sub: '#777777',
	arrowLine: '#333333',
	arrowText: '#666666',
	arrowHead: '#444444',
};

const light = {
	normalBg: '#f8f8f8',
	normalStroke: '#d0d0d0',
	accentBg: '#f0eaf8',
	accentStroke: '#5a2d91',
	accentTopBar: '#5a2d91',
	outputBg: '#eaf4f4',
	outputStroke: '#2a7a7a',
	outputTopBar: '#2a7a7a',
	label: '#1a1a1a',
	accentLabel: '#3d1d66',
	outputLabel: '#1a5a5a',
	sub: '#999999',
	arrowLine: '#cccccc',
	arrowText: '#999999',
	arrowHead: '#bbbbbb',
};

type LayerStyle = 'normal' | 'accent' | 'output';

interface Layer {
	title: string;
	sub: string;
	style: LayerStyle;
}

const layers: Layer[] = [
	{ title: 'Python', sub: 'asyncio event loop', style: 'normal' },
	{ title: 'PyO3 Bridge', sub: 'pyo3-async-runtimes', style: 'accent' },
	{ title: 'Tokio Runtime', sub: 'shared · auto-started', style: 'accent' },
	{ title: 'Chrome', sub: 'DevTools Protocol', style: 'output' },
];

const connectors = [
	'await tab.navigate(url)',
	'future_into_py()  —  Rust Future → Python awaitable',
	'CDP WebSocket I/O',
];

const AsyncLayerFigure: Component = () => {
	const isDark = useStarlightTheme();
	const t = () => (isDark() ? dark : light);

	const boxBg = (s: LayerStyle) => {
		const th = t();
		return s === 'accent'
			? th.accentBg
			: s === 'output'
				? th.outputBg
				: th.normalBg;
	};

	const boxStroke = (s: LayerStyle) => {
		const th = t();
		return s === 'accent'
			? th.accentStroke
			: s === 'output'
				? th.outputStroke
				: th.normalStroke;
	};

	const topBar = (s: LayerStyle) => {
		const th = t();
		return s === 'accent'
			? th.accentTopBar
			: s === 'output'
				? th.outputTopBar
				: null;
	};

	const labelColor = (s: LayerStyle) => {
		const th = t();
		return s === 'accent'
			? th.accentLabel
			: s === 'output'
				? th.outputLabel
				: th.label;
	};

	return (
		<figure
			style={{
				'max-width': '520px',
				margin: '2rem auto',
				padding: '0',
				'font-family': 'system-ui, -apple-system, sans-serif',
			}}
		>
			<For each={layers}>
				{(layer, i) => (
					<>
						{/* Layer box */}
						<div
							style={{
								border: `1px solid ${boxStroke(layer.style)}`,
								'border-radius': '4px',
								background: boxBg(layer.style),
								overflow: 'hidden',
							}}
						>
							{topBar(layer.style) && (
								<div
									style={{
										height: '3px',
										background: topBar(layer.style) as string,
									}}
								/>
							)}
							<div
								style={{
									padding: '0.85rem 1.25rem',
									display: 'flex',
									'align-items': 'baseline',
									gap: '0.75rem',
								}}
							>
								<span
									style={{
										color: labelColor(layer.style),
										'font-size': '13px',
										'font-weight': '600',
										'white-space': 'nowrap',
									}}
								>
									{layer.title}
								</span>
								<span
									style={{
										color: t().sub,
										'font-size': '11px',
										'font-family':
											"'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
										'white-space': 'nowrap',
									}}
								>
									{layer.sub}
								</span>
							</div>
						</div>

						{/* Connector between boxes */}
						{i() < layers.length - 1 && (
							<div
								style={{
									display: 'flex',
									'align-items': 'stretch',
									gap: '0.75rem',
									padding: '0 0 0 1.5rem',
								}}
							>
								{/* Vertical line + arrowhead */}
								<div
									style={{
										display: 'flex',
										'flex-direction': 'column',
										'align-items': 'center',
										'flex-shrink': '0',
										width: '12px',
									}}
								>
									<div
										style={{
											width: '1px',
											flex: '1',
											background: t().arrowLine,
											'min-height': '18px',
										}}
									/>
									<svg
										width="9"
										height="7"
										viewBox="0 0 9 7"
										style={{ display: 'block', 'flex-shrink': '0' }}
									>
										<path
											d="M0.5,0 L4.5,6 L8.5,0"
											fill="none"
											stroke={t().arrowHead}
											stroke-width="1.5"
											stroke-linejoin="round"
											stroke-linecap="round"
										/>
									</svg>
								</div>

								{/* Label */}
								<span
									style={{
										color: t().arrowText,
										'font-size': '11px',
										'font-family':
											"'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
										'align-self': 'center',
										padding: '0.35rem 0',
										'white-space': 'nowrap',
									}}
								>
									{connectors[i()]}
								</span>
							</div>
						)}
					</>
				)}
			</For>
		</figure>
	);
};

export default AsyncLayerFigure;
