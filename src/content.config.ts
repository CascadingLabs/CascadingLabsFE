import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
	docs: defineCollection({
		loader: glob({
			pattern: [
				'yosoi-docs/**/*.{md,mdx}',
				'voidcrawl-docs/voidcrawl/**/*.{md,mdx}',
				'!**/readme.md',
				'!**/README.md',
			],
			base: './docs',
			generateId: ({ entry }) => {
				return (
					entry
						.replace(/^yosoi-docs\//, '')
						.replace(/^voidcrawl-docs\//, '')
						.replace(/(\/index)?\.mdx?$/, '') || 'index'
				);
			},
		}),
		schema: docsSchema(),
	}),
};
