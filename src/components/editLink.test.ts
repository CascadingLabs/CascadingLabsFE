import { describe, expect, it } from 'vitest';
import { transformEditUrl } from './editLink';

// The Starlight `editLink.baseUrl` configured in astro.config.mjs is
// arbitrary — it just produces a synthetic URL of the form
// `<baseUrl><entry.filePath>` where `entry.filePath` is relative to the
// project root (e.g. `docs/yosoi-docs/yosoi/index.mdx`). The transform
// only cares about the `/docs/<submodule>/` segment, so it should work
// regardless of which baseUrl is configured.
const SYNTH_BASE = 'https://github.com/CascadingLabs/Yosoi-Docs/edit/main/';

describe('transformEditUrl', () => {
	describe('yosoi pages', () => {
		it('rewrites a page in the yosoi/ subdirectory', () => {
			const input = `${SYNTH_BASE}docs/yosoi-docs/yosoi/index.mdx`;
			expect(transformEditUrl(input)).toBe(
				'https://github.com/CascadingLabs/YosoiDocs/blob/main/yosoi/index.mdx',
			);
		});

		it('rewrites a page in guides/', () => {
			const input = `${SYNTH_BASE}docs/yosoi-docs/guides/selectors.md`;
			expect(transformEditUrl(input)).toBe(
				'https://github.com/CascadingLabs/YosoiDocs/blob/main/guides/selectors.md',
			);
		});

		it('rewrites a deeply nested page', () => {
			const input = `${SYNTH_BASE}docs/yosoi-docs/guides/examples/news-portal.md`;
			expect(transformEditUrl(input)).toBe(
				'https://github.com/CascadingLabs/YosoiDocs/blob/main/guides/examples/news-portal.md',
			);
		});

		it('rewrites a top-level .mdx file', () => {
			const input = `${SYNTH_BASE}docs/yosoi-docs/roadmap.mdx`;
			expect(transformEditUrl(input)).toBe(
				'https://github.com/CascadingLabs/YosoiDocs/blob/main/roadmap.mdx',
			);
		});
	});

	describe('voidcrawl pages', () => {
		it('rewrites a page in voidcrawl/', () => {
			const input = `${SYNTH_BASE}docs/voidcrawl-docs/voidcrawl/installation.mdx`;
			expect(transformEditUrl(input)).toBe(
				'https://github.com/CascadingLabs/VoidCrawlDocs/blob/main/voidcrawl/installation.mdx',
			);
		});

		it('rewrites a page in voidcrawl/guides/', () => {
			const input = `${SYNTH_BASE}docs/voidcrawl-docs/voidcrawl/guides/async-native.mdx`;
			expect(transformEditUrl(input)).toBe(
				'https://github.com/CascadingLabs/VoidCrawlDocs/blob/main/voidcrawl/guides/async-native.mdx',
			);
		});

		it('rewrites a page in reference/ (top-level of submodule)', () => {
			const input = `${SYNTH_BASE}docs/voidcrawl-docs/reference/api-reference.md`;
			expect(transformEditUrl(input)).toBe(
				'https://github.com/CascadingLabs/VoidCrawlDocs/blob/main/reference/api-reference.md',
			);
		});
	});

	describe('input shapes', () => {
		it('accepts a URL object (Starlight gives us URL, not string)', () => {
			const input = new URL(`${SYNTH_BASE}docs/yosoi-docs/yosoi/index.mdx`);
			expect(transformEditUrl(input)).toBe(
				'https://github.com/CascadingLabs/YosoiDocs/blob/main/yosoi/index.mdx',
			);
		});

		it('returns undefined for undefined input', () => {
			expect(transformEditUrl(undefined)).toBeUndefined();
		});

		it('returns undefined for null input', () => {
			expect(transformEditUrl(null)).toBeUndefined();
		});

		it('returns the original href when no docs segment is present', () => {
			const input = 'https://example.com/some/other/path.md';
			expect(transformEditUrl(input)).toBe(input);
		});
	});

	describe('robustness to baseUrl changes', () => {
		it('works even if the synthetic base is already YosoiDocs', () => {
			// This is what the user reported seeing — the transform should
			// still produce the right output regardless of the baseUrl
			// configured in astro.config.mjs.
			const input =
				'https://github.com/CascadingLabs/YosoiDocs/edit/main/docs/yosoi-docs/yosoi/index.mdx';
			expect(transformEditUrl(input)).toBe(
				'https://github.com/CascadingLabs/YosoiDocs/blob/main/yosoi/index.mdx',
			);
		});
	});
});
