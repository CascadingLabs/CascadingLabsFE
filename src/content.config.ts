import { defineCollection, z } from 'astro:content';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';

export const collections = {
	i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
	docs: defineCollection({
		loader: docsLoader({
			generateId: ({ entry }) => entry.replace(/\.(md|mdx)$/, '').replace(/(^|\/)index$/, ''),
		}),
		schema: (context) =>
			docsSchema({ extend: z.object({ order: z.number().default(0) }) })(context).transform(
				(data) => ({ ...data, sidebar: { ...data.sidebar, order: data.order } }),
			),
	}),
};
