// @ts-check

import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://cascadinglabs.com',
	output: 'static',
	integrations: [
		starlight({
			components: {
				SiteTitle: './src/components/SiteTitle.astro',
				Head: './src/components/Head.astro',
				PageFrame: './src/components/PageFrame.astro',
				ThemeSelect: './src/components/ThemeSelect.astro',
			},
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
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'Multi-Item Extraction', slug: 'guides/multi-item' },
						{ label: 'List Fields', slug: 'guides/list-fields' },
						{ label: 'Validators', slug: 'guides/validators' },
						{ label: 'Custom Types', slug: 'guides/custom-types' },
						{ label: 'Concurrent Scraping', slug: 'guides/concurrent' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Configuration', slug: 'yosoi/configuration' },
						{
							label: 'API Reference',
							items: [
								{ label: 'Classes', slug: 'reference/classes' },
								{ label: 'Functions', slug: 'reference/functions' },
								{ label: 'Types', slug: 'reference/types' },
								{ label: 'Provider Helpers', slug: 'reference/helpers' },
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

	vite: {
		plugins: [tailwindcss()],
	},
});
