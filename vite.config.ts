import { defineConfig } from 'vite-plus';

// Astro owns the application config; this file configures Vite+ tooling.
export default defineConfig({
	test: {
		include: ['scripts/docs/**/*.test.{mjs,ts}'],
		maxWorkers: 1,
		fileParallelism: false,
	},
	lint: {
		ignorePatterns: ['dist/**', '.astro/**', 'public/**'],
	},
	fmt: {
		useTabs: true,
		singleQuote: true,
		ignorePatterns: ['dist/**', '.astro/**', 'public/**', 'bun.lock'],
	},
});
