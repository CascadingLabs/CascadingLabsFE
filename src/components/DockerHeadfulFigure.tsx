import { type Component, For } from 'solid-js';
import { useStarlightTheme } from './useStarlightTheme';

const dark = {
	outerStroke: '#2e2e2e',
	outerLabel: '#6a6a6a',
	divider: '#252525',

	accent: '#b07adf',
	cardTitle: '#e4d4f2',
	cardTech: '#6a6a6a',
	cardDesc: '#9a9a9a',

	arrow: '#3a3a3a',
	arrowLabel: '#5a5a5a',

	portStem: '#2e2e2e',
	portValue: '#b07adf',
	portSub: '#5a5a5a',

	logo: '#b07adf',
};

const light = {
	outerStroke: '#d8d8d8',
	outerLabel: '#a8a8a8',
	divider: '#ececec',

	accent: '#5a2d91',
	cardTitle: '#2a1450',
	cardTech: '#a0a0a0',
	cardDesc: '#555555',

	arrow: '#cccccc',
	arrowLabel: '#999999',

	portStem: '#d8d8d8',
	portValue: '#5a2d91',
	portSub: '#999999',

	logo: '#5a2d91',
};

interface ComponentDef {
	title: string;
	tech: string;
	desc: string;
}

const components: ComponentDef[] = [
	{
		title: 'Sway',
		tech: 'Wayland compositor',
		desc: 'Creates a virtual screen in GPU memory. Chrome draws its windows here.',
	},
	{
		title: 'Chrome',
		tech: 'headful · GPU-accelerated',
		desc: "Renders into Sway's virtual screen via --ozone-platform=wayland.",
	},
	{
		title: 'wayvnc',
		tech: 'VNC server',
		desc: "Captures Sway's framebuffer and streams it to VNC clients.",
	},
];

const flows = ['draws into', 'captures from'];

const ports = [
	{ value: '/dev/dri', label: 'GPU passthrough' },
	{ value: '19222 · 19223', label: 'CDP' },
	{ value: '5900', label: 'VNC' },
];

/* Official Docker logo — simple-icons.org (CC0) */
const DOCKER_PATH =
	'M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 00-.75.748 11.376 11.376 0 00.692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 003.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z';

const DockerLogo: Component<{ fill: string }> = (props) => (
	<svg
		width="28"
		height="28"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		aria-label="Docker"
	>
		<path d={DOCKER_PATH} fill={props.fill} />
	</svg>
);

const DockerHeadfulFigure: Component = () => {
	const isDark = useStarlightTheme();
	const t = () => (isDark() ? dark : light);

	return (
		<figure
			style={{
				'max-width': '620px',
				margin: '2rem auto',
				padding: '0',
				'font-family': 'system-ui, -apple-system, sans-serif',
			}}
		>
			{/* Outer Docker container */}
			<div
				style={{
					border: `1px solid ${t().outerStroke}`,
					'border-radius': '8px',
					padding: '1.1rem 1.5rem 1.5rem',
				}}
			>
				{/* Header: logo + label */}
				<div
					style={{
						display: 'flex',
						'align-items': 'center',
						gap: '0.65rem',
						'padding-bottom': '0.9rem',
						'border-bottom': `1px solid ${t().divider}`,
						'margin-bottom': '1.1rem',
					}}
				>
					<DockerLogo fill={t().logo} />
					<span
						style={{
							color: t().outerLabel,
							'font-size': '11px',
							'font-weight': '600',
							'letter-spacing': '0.12em',
							'text-transform': 'uppercase',
						}}
					>
						Docker Container
					</span>
				</div>

				{/* Component stack */}
				<For each={components}>
					{(comp, i) => (
						<>
							{/* Simplified card — left accent bar only */}
							<div
								style={{
									'border-left': `3px solid ${t().accent}`,
									padding: '0.2rem 0 0.25rem 0.95rem',
								}}
							>
								<div
									style={{
										display: 'flex',
										'align-items': 'baseline',
										'justify-content': 'space-between',
										gap: '1rem',
										'margin-bottom': '0.3rem',
									}}
								>
									<span
										style={{
											color: t().cardTitle,
											'font-size': '14px',
											'font-weight': '600',
										}}
									>
										{comp.title}
									</span>
									<span
										style={{
											color: t().cardTech,
											'font-size': '11px',
											'font-family':
												"'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
											'white-space': 'nowrap',
										}}
									>
										{comp.tech}
									</span>
								</div>
								<div
									style={{
										color: t().cardDesc,
										'font-size': '12px',
										'line-height': '1.55',
									}}
								>
									{comp.desc}
								</div>
							</div>

							{/* Flow connector between cards */}
							{i() < components.length - 1 && (
								<div
									style={{
										display: 'flex',
										'align-items': 'center',
										gap: '0.6rem',
										padding: '0.55rem 0 0.55rem 0.95rem',
									}}
								>
									<svg
										width="10"
										height="16"
										viewBox="0 0 10 16"
										style={{ display: 'block', 'flex-shrink': '0' }}
										aria-hidden="true"
									>
										<line
											x1="5"
											y1="0"
											x2="5"
											y2="11"
											stroke={t().arrow}
											stroke-width="1.5"
										/>
										<path
											d="M1,10 L5,15 L9,10"
											fill="none"
											stroke={t().arrow}
											stroke-width="1.5"
											stroke-linejoin="round"
											stroke-linecap="round"
										/>
									</svg>
									<span
										style={{
											color: t().arrowLabel,
											'font-size': '11px',
											'font-family':
												"'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
										}}
									>
										{flows[i()]}
									</span>
								</div>
							)}
						</>
					)}
				</For>
			</div>

			{/* Exposed ports — stems drop from the container's bottom edge */}
			<div
				style={{
					display: 'grid',
					'grid-template-columns': 'repeat(3, 1fr)',
					gap: '0.5rem',
					'margin-top': '0',
				}}
			>
				<For each={ports}>
					{(port) => (
						<div
							style={{
								display: 'flex',
								'flex-direction': 'column',
								'align-items': 'center',
								'padding-top': '1.35rem',
								position: 'relative',
							}}
						>
							<div
								style={{
									position: 'absolute',
									top: '0',
									width: '1px',
									height: '16px',
									background: t().portStem,
								}}
							/>
							<span
								style={{
									color: t().portValue,
									'font-size': '12px',
									'font-weight': '600',
									'font-family':
										"'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
									'white-space': 'nowrap',
								}}
							>
								{port.value}
							</span>
							<span
								style={{
									color: t().portSub,
									'font-size': '9px',
									'margin-top': '0.25rem',
									'letter-spacing': '0.08em',
									'text-transform': 'uppercase',
									'font-weight': '600',
								}}
							>
								{port.label}
							</span>
						</div>
					)}
				</For>
			</div>
		</figure>
	);
};

export default DockerHeadfulFigure;
