import { lstat, readFile, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { authoredPages } from './navigation.mjs';
import { publishLiveFiles } from './live-snapshot.mjs';

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;

// Return undefined for changes that can alter the link graph. Full preparation
// then validates routes, navigation, assets, and generated reference dependencies.
export async function prepareChangedDocs({
	repo,
	destination,
	changedFiles,
	renderPage,
	rebuildNavigation,
}) {
	const files = [...new Set(changedFiles)].map((file) => file.replaceAll('\\', '/'));
	if (!files.length) return;
	if (files.some((file) => !file.startsWith('docs/public/') || !file.endsWith('.md'))) return;
	const snapshot = JSON.parse(await readFile(path.join(destination, 'routes.json'), 'utf8'));
	if (snapshot.mode !== 'working-tree-preview') return;
	const manifest = JSON.parse(
		await readFile(path.join(destination, 'source-manifest.json'), 'utf8'),
	);
	const pages = authoredPages(manifest);
	const pageMap = new Map(pages.map((page) => [page.file, page]));
	const assets = new Set(Object.keys(manifest.assets));
	const generator = await import(pathToFileURL(path.join(repo, 'scripts/docs/generate.mjs')).href);
	const updates = [];
	let metadataChanged = false;
	for (const relative of files) {
		const file = relative.slice('docs/public/'.length);
		const previous = pageMap.get(file);
		if (!previous) return;
		const source = path.join(repo, relative);
		let bytes;
		try {
			if (!(await lstat(source)).isFile()) return;
			bytes = await readFile(source);
		} catch (error) {
			if (error.code === 'ENOENT') return;
			throw error;
		}
		if (!generator.generatePreviewPage) return;
		const entry = generator.generatePreviewPage(file, bytes);
		if (!entry || entry[0] !== `/${previous.route}`) return;
		const [, page] = entry;
		// Metadata changes need new navigation, but no other page transforms.
		const { sha256: beforeHash, ...before } = manifest.pages[entry[0]];
		const { sha256: afterHash, ...after } = page;
		metadataChanged ||= json(before) !== json(after);
		if (beforeHash === afterHash) continue;
		updates.push({ file, page, route: entry[0], bytes });
	}
	if (!updates.length) return snapshot;

	const stage = await mkdtemp(path.join(path.dirname(destination), '.yosoi-edit-'));
	try {
		// Validate and render the whole edit batch before publishing any of it.
		for (const { file, page, route, bytes } of updates) {
			const output = await renderPage(bytes.toString('utf8'), page, pageMap, assets, generator);
			await mkdir(path.dirname(path.join(stage, 'docs', file)), { recursive: true });
			await writeFile(path.join(stage, 'docs', file), output);
			manifest.pages[route] = page;
			const updated = authoredPages({ pages: { [route]: page } })[0];
			snapshot.pages = snapshot.pages.map((item) => (item.file === file ? updated : item));
		}
		if (metadataChanged) Object.assign(snapshot, await rebuildNavigation(snapshot.pages));
		await writeFile(path.join(stage, 'routes.json'), json(snapshot));
		await writeFile(path.join(stage, 'source-manifest.json'), json(manifest));
		await publishLiveFiles(stage, destination);
		console.log(`Prepared ${updates.length} changed Markdown page(s); API references retained.`);
		return snapshot;
	} finally {
		await rm(stage, { recursive: true, force: true });
	}
}
