// @ts-check

import solidJs from '@astrojs/solid-js';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import remarkCallouts from './src/plugins/remark-callouts.mjs';

// https://astro.build/config
export default defineConfig({
	site: 'https://cascadinglabs.com',
	output: 'static',
	redirects: {
		'/void': '/voidcrawl/',
	},
	integrations: [
		solidJs(),
		starlight({
			editLink: {
				baseUrl: 'https://github.com/CascadingLabs/Yosoi-Docs/edit/main/',
			},
			components: {
				EditLink: './src/components/EditLink.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				Head: './src/components/Head.astro',
				Header: './src/components/Header.astro',
				PageFrame: './src/components/PageFrame.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
				Sidebar: './src/components/Sidebar.astro',
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
		plugins: [tailwindcss()],
	},
});
