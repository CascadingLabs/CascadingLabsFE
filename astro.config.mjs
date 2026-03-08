// @ts-check

import lit from '@astrojs/lit';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import solidJs from '@astrojs/solid-js';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://cascadinglabs.com',
	output: 'static',
	integrations: [
		sitemap(),
		vue(),
		react({ include: ['**/react/**'] }),
		solidJs({ include: ['**/solid/**'] }),
		lit(),
	],

	vite: {
		plugins: [tailwindcss()],
	},
});
