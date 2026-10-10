import mdx from '@astrojs/mdx';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { docsSnapshotIntegration } from './scripts/docs/snapshot-integration.mjs';

export default defineConfig({
	site: 'https://cascadinglabs.com',
	output: 'static',
	markdown: {
		shikiConfig: { themes: { light: 'github-light', dark: 'github-dark' }, defaultColor: false },
	},
	integrations: [
		mdx(),
		docsSnapshotIntegration(),
		starlight({
			title: 'Yosoi',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/CascadingLabs/Yosoi' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/YreV3CzxsE' },
			],
			routeMiddleware: './src/starlight-route.ts',
			customCss: ['./src/styles/global.css'],
			pagefind: true,
			expressiveCode: false,
			pagination: true,
			lastUpdated: false,
			credits: false,
			disable404Route: true,
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			sidebar: [{ autogenerate: { directory: 'yosoi', collapsed: true } }],
			components: {
				Head: './src/components/starlight/Head.astro',
				ThemeProvider: './src/components/ThemeInit.astro',
				Header: './src/components/starlight/Header.astro',
				MobileMenuFooter: './src/components/starlight/MobileMenuFooter.astro',
				MarkdownContent: './src/components/starlight/MarkdownContent.astro',
			},
		}),
	],
	build: { concurrency: 1 },
	vite: {
		plugins: [tailwindcss()],
		// Keep PostCSS enabled; Lightning CSS handles final compatibility/minification.
		css: { transformer: 'postcss' },
		build: {
			cssMinify: 'lightningcss',
			cssTarget: ['chrome111', 'edge111', 'safari16.4', 'firefox128'],
		},
	},
	// Astro 7 uses the Rust compiler and Sätteri Markdown/MDX pipeline by default.
});
