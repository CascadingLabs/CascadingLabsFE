import type { Component } from 'solid-js';
import { useStarlightTheme } from './useStarlightTheme';

const dark = {
	bg: '#151515',
	border: '#2e2e2e',
	text: '#d4d4d4',
	textDim: '#777777',
	label: '#b07adf',
	arrow: '#444444',
	arrowText: '#666666',
	divider: '#2e2e2e',
};

const light = {
	bg: '#f6f6f6',
	border: '#d0d0d0',
	text: '#1a1a1a',
	textDim: '#888888',
	label: '#5a2d91',
	arrow: '#bbbbbb',
	arrowText: '#888888',
	divider: '#e0e0e0',
};

const HtmlDomFigure: Component = () => {
	const isDark = useStarlightTheme();
	const t = () => (isDark() ? dark : light);

	return (
		<figure
			style={{
				'max-width': '640px',
				margin: '2rem auto',
				border: `1px solid ${t().border}`,
				'border-radius': '6px',
				overflow: 'hidden',
				'font-family':
					"'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
				'font-size': '13px',
				'line-height': '1.6',
				background: t().bg,
				padding: '0',
			}}
		>
			{/* Server HTML row */}
			<div
				style={{
					display: 'flex',
					'align-items': 'flex-start',
					gap: '1.5rem',
					padding: '1.25rem 1.5rem 1rem',
				}}
			>
				<span
					style={{
						color: t().label,
						'font-weight': '600',
						'white-space': 'nowrap',
						'flex-shrink': '0',
						'padding-top': '1px',
					}}
				>
					Server HTML:
				</span>
				<code
					style={{
						color: t().text,
						'white-space': 'pre',
						'font-size': '13px',
						background: 'none',
						padding: '0',
						border: 'none',
					}}
				>
					{
						'<body>\n  <div id="root"></div>\n  <script src="/static/js/main.c8f2a1d.js"></script>\n</body>'
					}
				</code>
			</div>

			{/* Arrow */}
			<div
				style={{
					display: 'flex',
					'flex-direction': 'column',
					'align-items': 'center',
					padding: '0.1rem 0 0.25rem',
					gap: '0.1rem',
				}}
			>
				<svg
					width="2"
					height="20"
					viewBox="0 0 2 20"
					style={{ display: 'block' }}
				>
					<line
						x1="1"
						y1="0"
						x2="1"
						y2="20"
						stroke={t().arrow}
						stroke-width="1.5"
						stroke-dasharray="4 2"
					/>
				</svg>
				<span
					style={{
						color: t().arrowText,
						'font-size': '11px',
						'font-family': 'system-ui, -apple-system, sans-serif',
						'font-weight': '500',
						'letter-spacing': '0.02em',
					}}
				>
					Browser parses
				</span>
				<svg
					width="12"
					height="14"
					viewBox="0 0 12 14"
					style={{ display: 'block' }}
				>
					<line
						x1="6"
						y1="0"
						x2="6"
						y2="8"
						stroke={t().arrow}
						stroke-width="1.5"
					/>
					<path
						d="M2,8 L6,13 L10,8"
						fill="none"
						stroke={t().arrow}
						stroke-width="1.5"
						stroke-linejoin="round"
						stroke-linecap="round"
					/>
				</svg>
			</div>

			{/* DOM after JS row */}
			<div
				style={{
					display: 'flex',
					'align-items': 'flex-start',
					gap: '1.5rem',
					padding: '0.75rem 1.5rem 1.25rem',
				}}
			>
				<span
					style={{
						color: t().label,
						'font-weight': '600',
						'white-space': 'nowrap',
						'flex-shrink': '0',
						'padding-top': '1px',
					}}
				>
					DOM after JS:
				</span>
				<code
					style={{
						color: t().text,
						'white-space': 'pre',
						'font-size': '13px',
						background: 'none',
						padding: '0',
						border: 'none',
					}}
				>
					{
						'<body>\n  <div id="root">\n    <nav class="Nav sc-aXZVg kWIkMi">\n      <a href="/">Home</a>\n      <a href="/products">Products</a>\n    </nav>\n    <main>\n      <ul class="sc-bdVTJa bKTGaB">\n        <li class="sc-hKMtZM gUzRaI" data-id="42">\n          <img src="/cdn/42.webp" alt="Widget Pro" />\n          <span class="price">$29.99</span>\n        </li>\n      </ul>\n    </main>\n  </div>\n</body>'
					}
				</code>
			</div>
		</figure>
	);
};

export default HtmlDomFigure;
