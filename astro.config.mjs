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
					label: 'Reference',
					items: [
						{ label: 'Configuration', slug: 'yosoi/configuration' },
						{ label: 'API Reference', slug: 'api-reference' },
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
