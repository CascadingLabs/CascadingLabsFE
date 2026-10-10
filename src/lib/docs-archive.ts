import { artifactPath, type DocsRelease, rawArtifactUrl } from './docs-releases';
import type { NavNode } from './yosoi-snapshot';
import { Marked } from 'marked';
import { referenceMarkdown } from '../../scripts/docs/reference.mjs';
const markdown = new Marked({ gfm: true, async: false });
export interface ArchivePage {
	route: string;
	title: string;
	file: string;
	sha256: string;
	format?: 'markdown' | 'html' | 'rust-api';
	kind?: string;
	publicPath?: string;
}
export interface ArchiveManifest {
	schemaVersion: 1;
	version: string;
	tag: string;
	sourceCommit: string;
	navigation: NavNode;
	pages: ArchivePage[];
	assets: Record<string, { file: string; sha256: string }>;
	reference?: { sdk: { crate: string } };
}
const hashPattern = /^[a-f0-9]{64}$/;
const routePattern = /^(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/;
export function parseArchiveManifest(input: unknown, release: DocsRelease): ArchiveManifest {
	const manifest = input as ArchiveManifest;
	if (
		!manifest ||
		manifest.schemaVersion !== 1 ||
		manifest.version !== release.version ||
		manifest.tag !== release.tag ||
		manifest.sourceCommit !== release.sourceCommit ||
		!Array.isArray(manifest.pages) ||
		!manifest.assets ||
		!manifest.navigation
	)
		throw new Error('Documentation artifact does not match the selected release.');
	const routes = new Set<string>();
	for (const page of manifest.pages) {
		if (
			!page ||
			!routePattern.test(page.route) ||
			typeof page.title !== 'string' ||
			!hashPattern.test(page.sha256) ||
			routes.has(page.route)
		)
			throw new Error('Invalid archived documentation page.');
		artifactPath(page.file);
		if (page.format !== undefined && !['markdown', 'html', 'rust-api'].includes(page.format))
			throw new Error('Unsupported archived documentation format.');
		if (page.format === 'rust-api' && (!page.publicPath || !manifest.reference?.sdk?.crate))
			throw new Error('Archived API metadata is missing.');
		routes.add(page.route);
	}
	if (!routes.has('')) throw new Error('Archived docs overview is missing.');
	const visit = (node: NavNode, depth = 0) => {
		if (
			depth > 32 ||
			!node ||
			typeof node.title !== 'string' ||
			!routePattern.test(node.route) ||
			!Array.isArray(node.children) ||
			(node.id !== undefined && !routes.has(node.route))
		)
			throw new Error('Invalid archived navigation.');
		node.children.forEach((child) => visit(child, depth + 1));
	};
	visit(manifest.navigation);
	for (const [path, asset] of Object.entries(manifest.assets)) {
		artifactPath(path);
		artifactPath(asset.file);
		if (!hashPattern.test(asset.sha256)) throw new Error('Invalid archived asset.');
	}
	return manifest;
}
export function renderArchiveContent(
	page: ArchivePage,
	content: string,
	manifest?: ArchiveManifest,
): string {
	if (page.format === 'rust-api') {
		if (!manifest?.reference) throw new Error('Archived API metadata is missing.');
		content = referenceMarkdown(
			JSON.parse(content),
			manifest.reference,
			manifest.pages
				.filter((item) => item.publicPath)
				.map((item) => ({
					publicPath: item.publicPath!,
					route: item.route,
					kind: item.kind || 'unknown',
				})),
		);
	} else if (page.format !== 'markdown') return content;
	const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '').trimStart();
	const tokens = markdown.lexer(body);
	if (tokens[0]?.type === 'heading' && tokens[0].depth === 1) tokens.shift();
	return markdown.parser(tokens);
}
export async function fetchVerified(
	release: DocsRelease,
	file: string,
	expected: string,
	fetcher: typeof fetch = fetch,
): Promise<Uint8Array> {
	const response = await fetcher(rawArtifactUrl(release, file), {
		signal: AbortSignal.timeout(15000),
	});
	if (!response.ok) throw new Error(`Documentation request failed (${response.status}).`);
	const bytes = new Uint8Array(await response.arrayBuffer());
	if (bytes.byteLength > 4 * 1024 * 1024)
		throw new Error('Documentation artifact exceeds its size limit.');
	const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
	if (hash !== expected) throw new Error('Documentation artifact checksum failed.');
	return bytes;
}
export async function loadArchiveManifest(
	release: DocsRelease,
	fetcher: typeof fetch = fetch,
): Promise<ArchiveManifest> {
	return parseArchiveManifest(
		JSON.parse(
			new TextDecoder().decode(
				await fetchVerified(release, release.manifestPath, release.sha256, fetcher),
			),
		),
		release,
	);
}
