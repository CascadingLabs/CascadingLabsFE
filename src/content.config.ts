import { defineCollection, z } from 'astro:content';
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
		schema: docsSchema({
			extend: z.object({
				faqs: z
					.array(
						z.object({
							q: z.string(),
							a: z.string(),
						}),
					)
					.optional(),
				references: z
					.array(
						z.object({
							title: z.string(),
							url: z.string().url(),
						}),
					)
					.optional(),
			}),
		}),
	}),
};
