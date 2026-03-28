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
	integrations: [
		solidJs(),
		starlight({
			editLink: {
				baseUrl: 'https://github.com/CascadingLabs/Yosoi-Docs/edit/main/',
			},
			components: {
				SiteTitle: './src/components/SiteTitle.astro',
				Head: './src/components/Head.astro',
				Header: './src/components/Header.astro',
				PageFrame: './src/components/PageFrame.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
			favicon: '/yosoi-favicon.svg',
			title: 'Yosoi',
			description: 'AI-powered CSS selector discovery for web scraping.',
			social: [
				{
					icon: 'github',
					label: 'GitHub',
					href: 'https://github.com/CascadingLabs/Yosoi',
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
					items: [
						{ label: 'Overview', slug: 'qscrape' },
						{
							label: 'qscrape.dev',
							link: 'https://qscrape.dev',
							attrs: { target: '_blank', class: 'sl-external-link' },
						},
						{
							label: 'GitHub',
							link: 'https://github.com/CascadingLabs/QScrape',
							attrs: { target: '_blank', class: 'sl-github-link' },
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
		remarkPlugins: [remarkCallouts],
	},

	vite: {
		plugins: [tailwindcss()],
	},
});
