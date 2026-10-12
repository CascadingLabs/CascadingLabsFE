import { expect, test } from 'vite-plus/test';
import { mkdtemp, mkdir, writeFile, readFile, stat, rm, cp } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { prepareChangedDocs } from './incremental.mjs';
import { repositoryRoot, rewriteMarkdown } from './prepare.mjs';
import { authoredPages } from './navigation.mjs';

test('renders only edited pages, preserves reference files, and rejects invalid batches before publication', async () => {
	const repo = repositoryRoot();
	const root = path.join(repo, '.generated/frontend-tests');
	await mkdir(root, { recursive: true });
	const fixture = await mkdtemp(path.join(root, 'incremental-'));
	const source = path.join(fixture, 'source');
	const destination = path.join(fixture, 'served');
	try {
		await cp(path.join(repo, 'scripts/docs'), path.join(source, 'scripts/docs'), {
			recursive: true,
			filter: (file) => !file.split(path.sep).includes('node_modules'),
		});
		await mkdir(path.join(source, 'docs/public/guides'), { recursive: true });
		const original = '---\ntitle: Guide\n---\n# Guide\n\nOriginal.\n';
		await writeFile(path.join(source, 'docs/public/index.md'), '---\ntitle: Home\n---\nHome.\n');
		await writeFile(path.join(source, 'docs/public/guides/example.md'), original);
		const generator = await import(
			pathToFileURL(path.join(source, 'scripts/docs/generate.mjs')).href
		);
		const manifest = generator.generatePreview({
			root: path.join(source, 'docs/public'),
			version: '0.2.0',
			repository: 'Fixture/Yosoi',
			sourceCommit: 'a'.repeat(40),
		});
		await mkdir(path.join(destination, 'docs/guides'), { recursive: true });
		await mkdir(path.join(destination, 'docs/python-api'), { recursive: true });
		await mkdir(path.join(destination, 'docs/api'), { recursive: true });
		const retained = ['docs/index.md', 'docs/python-api/session.md', 'docs/api/session.md'];
		for (const file of retained)
			await writeFile(path.join(destination, file), 'Retained reference.\n');
		await writeFile(path.join(destination, 'docs/guides/example.md'), 'Old output.\n');
		const snapshot = {
			mode: 'working-tree-preview',
			pages: authoredPages(manifest),
			source: manifest.source,
			navigation: {},
		};
		await writeFile(path.join(destination, 'routes.json'), JSON.stringify(snapshot));
		await writeFile(path.join(destination, 'source-manifest.json'), JSON.stringify(manifest));
		const before = await Promise.all(retained.map((file) => stat(path.join(destination, file))));
		const rendered = [];
		const options = {
			repo: source,
			destination,
			changedFiles: ['docs/public/guides/example.md'],
			renderPage: async (text, page) => {
				rendered.push(page.file);
				return text;
			},
			rebuildNavigation: async (pages) => ({
				navigation: { titles: pages.map((page) => page.title) },
			}),
		};
		const edited = original.replace('Original.', 'Edited.');
		await writeFile(path.join(source, 'docs/public/guides/example.md'), edited);
		await prepareChangedDocs(options);
		expect(rendered).toEqual(['guides/example.md']);
		expect(await readFile(path.join(destination, 'docs/guides/example.md'), 'utf8')).toBe(edited);
		for (let i = 0; i < retained.length; i++) {
			const after = await stat(path.join(destination, retained[i]));
			expect([after.ino, after.mtimeMs]).toEqual([before[i].ino, before[i].mtimeMs]);
		}
		await prepareChangedDocs(options);
		expect(rendered).toHaveLength(1);
		const routes = await readFile(path.join(destination, 'routes.json'), 'utf8');
		expect(JSON.parse(routes).source.commit).toBe('a'.repeat(40));
		await writeFile(
			path.join(source, 'docs/public/guides/example.md'),
			edited.replace('Edited.', 'Another edit.'),
		);
		await writeFile(
			path.join(source, 'docs/public/index.md'),
			'---\ntitle: Home\n---\n# Home\n\n# Invalid H1\n',
		);
		await expect(
			prepareChangedDocs({
				...options,
				changedFiles: [...options.changedFiles, 'docs/public/index.md'],
				renderPage: async (text, page, pages, assets) => {
					return rewriteMarkdown(
						generator.parseFrontmatter(text, page.file).body,
						page.file,
						pages,
						assets,
					);
				},
			}),
		).rejects.toThrow('use at most one leading H1');
		expect(await readFile(path.join(destination, 'docs/guides/example.md'), 'utf8')).toBe(edited);
		expect(await readFile(path.join(destination, 'routes.json'), 'utf8')).toBe(routes);
		for (const file of [
			'docs/public/added.md',
			'docs/public/_navigation.json',
			'python/yosoi/__init__.py',
		]) {
			expect(await prepareChangedDocs({ ...options, changedFiles: [file] })).toBeUndefined();
		}
		await writeFile(
			path.join(source, 'docs/public/guides/example.md'),
			edited.replace('title: Guide', 'title: Renamed'),
		);
		const renamed = await prepareChangedDocs(options);
		expect(renamed.navigation.titles).toContain('Renamed');
		expect(rendered).toEqual(['guides/example.md', 'guides/example.md']);
		await writeFile(
			path.join(source, 'docs/public/guides/example.md'),
			edited.replace('title: Guide', 'draft: true\ntitle: Guide'),
		);
		expect(await prepareChangedDocs(options)).toBeUndefined();
		await rm(path.join(source, 'docs/public/guides/example.md'));
		expect(await prepareChangedDocs(options)).toBeUndefined();
	} finally {
		await rm(fixture, { recursive: true, force: true });
	}
});
