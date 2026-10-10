import assert from 'node:assert/strict';
import { test } from 'vite-plus/test';
import { optionsFromArgs, rewriteMarkdown } from './prepare.mjs';

const pages = new Map([
	['index.md', { route: '' }],
	['sdk/index.md', { route: 'sdk' }],
	['sdk/map.md', { route: 'sdk/map' }],
]);
const assets = new Set(['assets/demo.svg', 'assets/media/logo.svg']);

test('rewrites public page links, queries, fragments, and assets relative to the source page', async () => {
	const result = await rewriteMarkdown(
		'[Map](map.md?view=full#example)\n\n[Home](../index.md)\n\n![Logo](../media/logo.svg)\n',
		'sdk/index.md',
		pages,
		assets,
	);
	assert.match(result, /\/yosoi\/sdk\/map\/\?view=full#example/);
	assert.match(result, /\[Home\]\(\/yosoi\/\)/);
	assert.match(result, /\/yosoi\/assets\/media\/logo.svg/);
});

test('rewrites reference-style definitions while preserving code examples and GFM tables', async () => {
	const result = await rewriteMarkdown(
		'[Map][map]\n\n[map]: sdk/map.md\n\n```md\n[Do not rewrite](sdk/map.md)\n```\n\n| Name | Value |\n| --- | --- |\n| x | y |\n',
		'index.md',
		pages,
		assets,
	);
	assert.match(result, /\[map\]: \/yosoi\/sdk\/map\//);
	assert.match(result, /\[Do not rewrite\]\(sdk\/map.md\)/);
	assert.match(result, /\| Name\s*\| Value/);
});

test('rejects links into excluded or unpublished documents instead of exposing repository files', async () => {
	await assert.rejects(
		rewriteMarkdown('[Internal](../README.md)', 'sdk/index.md', pages, assets),
		/no published target/,
	);
	await assert.rejects(
		rewriteMarkdown('[Escape](../../internal.md)', 'index.md', pages, assets),
		/no published target/,
	);
});

test('retains external URLs and on-page fragments', async () => {
	const result = await rewriteMarkdown(
		'[Rust](https://www.rust-lang.org/)\n\n[Here](#example)',
		'index.md',
		pages,
		assets,
	);
	assert.match(result, /https:\/\/www.rust-lang.org\//);
	assert.match(result, /\[Here\]\(#example\)/);
});

test('local and exact-commit preparation use the same explicit options contract', () => {
	const options = optionsFromArgs(['--source', 'a'.repeat(40), '--version', '0.1.0', '--offline']);
	assert.equal(options.source, 'a'.repeat(40));
	assert.equal(options.version, '0.1.0');
	assert.equal(options.offline, true);
	assert.throws(() => optionsFromArgs(['--unexpected']), /Unknown option/);
});
