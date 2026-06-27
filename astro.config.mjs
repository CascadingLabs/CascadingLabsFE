// @ts-check

import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';
import solidJs from '@astrojs/solid-js';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import remarkCallouts from './src/plugins/remark-callouts.mjs';

const siteComponentsPath = fileURLToPath(
	new URL('./src/components', import.meta.url),
);

// https://astro.build/config
export default defineConfig({
	site: 'https://cascadinglabs.com',
	output: 'static',
	redirects: {
		'/void': '/voidcrawl/',
		'/guides/fingerprinting-technology/': '/guides/fingerprinting/',
	},
	integrations: [
		sitemap({
			changefreq: 'weekly',
			priority: 0.7,
			lastmod: new Date(),
		}),
		solidJs(),
		starlight({
			editLink: {
				baseUrl: 'https://github.com/CascadingLabs/YosoiDocs/edit/main/',
			},
			components: {
				EditLink: './src/components/EditLink.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				Head: './src/components/Head.astro',
				Header: './src/components/Header.astro',
				PageFrame: './src/components/PageFrame.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
				Sidebar: './src/components/Sidebar.astro',
				SocialIcons: './src/components/SocialIcons.astro',
			},
			favicon: '/yosoi-icon.svg',
			title: 'Yosoi',
			description: 'AI-powered CSS selector discovery for web scraping.',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/CascadingLabs/Yosoi',
				},
				{
					icon: 'discord',
					label: 'Discord',
					href: 'https://discord.gg/YreV3CzxsE',
				},
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Overview', slug: 'yosoi' },
						{ label: 'Installation', slug: 'yosoi/installation' },
						{ label: 'Quick Start', slug: 'yosoi/quickstart' },
						{ label: 'Roadmap', slug: 'roadmap' },
						{ label: 'Contributing', slug: 'contributing' },
					],
				},
				{
					label: 'Guides',
					collapsed: true,
					items: [
						{
							label: 'Understanding the Web',
							slug: 'guides/understanding-the-web',
						},
						{ label: 'Selectors', slug: 'guides/selectors' },
						{ label: 'Multi-Item Extraction', slug: 'guides/multi-item' },
						{ label: 'List Fields', slug: 'guides/list-fields' },
						{ label: 'Validators', slug: 'guides/validators' },
						{ label: 'Custom Types', slug: 'guides/custom-types' },
						{ label: 'Concurrent Scraping', slug: 'guides/concurrent' },
						{ label: 'Debugging', slug: 'guides/debugging' },
						{ label: 'Fetchers', slug: 'guides/fetchers' },
						{ label: 'DOMLoader', slug: 'guides/dom-loader' },
						{ label: 'A3Node', slug: 'guides/a3node' },
						{ label: 'MCP Discovery', slug: 'guides/mcp-discovery' },
						{
							label: 'Page Identity & Reuse',
							slug: 'guides/page-identity-reuse',
						},
						{
							label: 'Fingerprinting',
							slug: 'guides/fingerprinting',
						},
						{ label: 'JS Fields', slug: 'guides/js-fields' },
						{ label: 'File Downloads', slug: 'guides/file-downloads' },
						{ label: 'Proxying', slug: 'guides/proxying' },
						{ label: 'Scaling', slug: 'guides/scaling' },
						{
							label: 'Examples',
							collapsed: true,
							items: [
								{ label: 'Overview', slug: 'guides/examples' },
								{ label: 'News Portal', slug: 'guides/examples/news-portal' },
								{
									label: 'E-Commerce Catalogue',
									slug: 'guides/examples/e-commerce',
								},
								{
									label: 'Sports Scores',
									slug: 'guides/examples/sports-scores',
								},
								{
									label: 'Concurrent Scraping',
									slug: 'guides/examples/concurrent',
								},
								{
									label: 'Manual Selectors',
									slug: 'guides/examples/manual-selectors',
								},
								{ label: 'JSON Output', slug: 'guides/examples/json-output' },
								{
									label: 'Nested Contracts',
									slug: 'guides/examples/nested-contracts',
								},
							],
						},
					],
				},
				{
					label: 'Policy',
					collapsed: true,
					items: [
						{ label: 'Overview', slug: 'policy' },
						{ label: 'Policy Files', slug: 'policy/files' },
						{
							label: 'Layering & Precedence',
							slug: 'policy/layering',
						},
						{ label: 'CLI Commands', slug: 'policy/cli' },
						{ label: 'Atom Reads & Trust', slug: 'policy/trust' },
						{ label: 'Model Policy', slug: 'policy/model' },
						{ label: 'Scrape Policy', slug: 'policy/scrape' },
						{ label: 'Page Policy', slug: 'policy/page' },
						{ label: 'Crawl Policy', slug: 'policy/crawl' },
						{ label: 'Output Policy', slug: 'policy/output' },
						{ label: 'Download Policy', slug: 'policy/downloads' },
						{ label: 'Discovery Policy', slug: 'policy/discovery' },
						{ label: 'Telemetry Policy', slug: 'policy/telemetry' },
						{ label: 'Fingerprint Policy', slug: 'policy/fingerprint' },
						{ label: 'Full Example', slug: 'policy/full-example' },
					],
				},
				{
					label: 'Observability',
					collapsed: true,
					items: [
						{ label: 'Overview', slug: 'observability' },
						{
							label: 'Langfuse Quickstart',
							slug: 'observability/langfuse-quickstart',
						},
						{
							label: 'Instrumenting Pipelines',
							slug: 'observability/instrumenting-pipelines',
						},
						{
							label: 'Reading Traces',
							slug: 'observability/reading-traces',
						},
						{
							label: 'Evals & Tagging',
							slug: 'observability/evals-and-tagging',
						},
					],
				},
				{
					label: 'Reference',
					collapsed: true,
					items: [
						{ label: 'Configuration', slug: 'yosoi/configuration' },
						{
							label: 'API Reference',
							items: [
								{ label: 'Classes', slug: 'reference/classes' },
								{ label: 'Functions', slug: 'reference/functions' },
								{ label: 'Types', slug: 'reference/types' },
								{ label: 'Provider Helpers', slug: 'reference/helpers' },
								{
									label: 'Selector Cache Types',
									slug: 'reference/selector-cache',
								},
							],
						},
					],
				},
				{
					label: 'QScrape',
					items: [{ label: 'Overview', slug: 'yosoi/qscrape' }],
				},
				{
					label: 'VoidCrawl',
					items: [
						{
							label: 'Getting Started',
							items: [
								{
									label: 'Overview',
									slug: 'voidcrawl',
								},
								{
									label: 'Installation',
									slug: 'voidcrawl/installation',
								},
								{
									label: 'Quick Start',
									slug: 'voidcrawl/quickstart',
								},
								{
									label: 'Yosoi Integration',
									slug: 'yosoi/voidcrawl',
								},
								{
									label: 'Contributing',
									slug: 'voidcrawl/contributing',
								},
							],
						},
						{
							label: 'Guides',
							collapsed: true,
							items: [
								{
									label: 'Understanding the DOM',
									slug: 'voidcrawl/guides/understanding-the-dom',
								},
								{
									label: 'Browser Pool',
									slug: 'voidcrawl/guides/browser-pool',
								},
								{
									label: 'Async Native',
									slug: 'voidcrawl/guides/async-native',
								},
								{
									label: 'Docker & VNC',
									slug: 'voidcrawl/guides/docker',
								},
								{
									label: 'Built-in Actions',
									slug: 'voidcrawl/guides/builtin-actions',
								},
								{
									label: 'Custom JS Actions',
									slug: 'voidcrawl/guides/custom-js-actions',
								},
								{
									label: 'Stealth Mode',
									slug: 'voidcrawl/guides/stealth',
								},
								{
									label: 'Geolocation & Emulation',
									slug: 'voidcrawl/guides/emulation',
								},
								{
									label: 'Accessibility Tree',
									slug: 'voidcrawl/guides/accessibility-tree',
								},
								{
									label: 'MCP Server',
									slug: 'voidcrawl/guides/mcp-server',
								},
								{
									label: 'Native Chrome Profiles',
									slug: 'voidcrawl/guides/profiles',
								},
								{
									label: 'Screenshot API',
									slug: 'voidcrawl/guides/screenshot-api',
								},
								{
									label: 'Captcha Handling',
									slug: 'voidcrawl/guides/captcha-handling',
								},
								{
									label: 'Anti-Bot Vendors',
									slug: 'voidcrawl/guides/anti-bot-vendors',
								},
								{
									label: 'File Downloads',
									slug: 'voidcrawl/guides/downloads',
								},
								{
									label: 'Cookbook',
									slug: 'voidcrawl/guides/cookbook',
								},
								{
									label: 'Examples',
									collapsed: true,
									items: [
										{
											label: 'Overview',
											slug: 'voidcrawl/guides/examples',
										},
										{
											label: 'Basic Navigation',
											slug: 'voidcrawl/guides/examples/basic-navigation',
										},
										{
											label: 'DOM Interaction',
											slug: 'voidcrawl/guides/examples/dom-interaction',
										},
										{
											label: 'JavaScript Eval',
											slug: 'voidcrawl/guides/examples/javascript-eval',
										},
										{
											label: 'Screenshots',
											slug: 'voidcrawl/guides/examples/screenshots',
										},
										{
											label: 'Stealth Mode',
											slug: 'voidcrawl/guides/examples/stealth-mode',
										},
										{
											label: 'Actions Demo',
											slug: 'voidcrawl/guides/examples/actions-demo',
										},
										{
											label: 'Docker Headful',
											slug: 'voidcrawl/guides/examples/docker-headful',
										},
										{
											label: 'Multi-Page',
											slug: 'voidcrawl/guides/examples/multi-page',
										},
									],
								},
							],
						},
						{
							label: 'Reference',
							collapsed: true,
							items: [
								{
									label: 'API Reference',
									slug: 'voidcrawl/reference/api-reference',
								},
								{
									label: 'Docker Config',
									slug: 'voidcrawl/reference/docker-config',
								},
							],
						},
					],
				},
			],
			customCss: ['./src/styles/global.css'],
			expressiveCode: {
				defaultProps: {
					frame: 'none',
				},
			},
		}),
	],

	experimental: {
		rustCompiler: true,
	},

	markdown: {
		smartypants: true,
		remarkPlugins: [remarkCallouts],
	},

	vite: {
		resolve: {
			alias: {
				'@site-components': siteComponentsPath,
			},
		},
		plugins: [tailwindcss()],
	},
});
