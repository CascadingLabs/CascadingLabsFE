import { expect, test } from 'vite-plus/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as tar from 'tar';
import { bundleRegistry, catalogRefForBuild, selectBundle, unpackBundle } from './bundle.mjs';
import { projectRoot, repositoryRoot } from './prepare.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';
const pointer = (source = '1'.repeat(40), version = '0.1.0') => ({
	sourceCommit: source,
	version,
	repository: 'CascadingLabs/Yosoi',
	artifactCommit: '2'.repeat(40),
	bundlePath: `snapshots/${source}/bundle.tar.gz`,
	sha256: '3'.repeat(64),
	manifestPath: `snapshots/${source}/content/archive-manifest.json`,
	manifestSha256: '4'.repeat(64),
});
test('RC bundle pointers and archive registry retain candidate identities and SemVer ordering', () => {
	const versions = ['0.1.0-rc.2', '0.1.0-rc.10', '0.1.0'];
	const snapshots = Object.fromEntries(
		versions.map((version, index) => {
			const item = pointer(String(index + 1).repeat(40), version);
			return [item.sourceCommit, item];
		}),
	);
	const catalog = { schemaVersion: 1, latest: '1'.repeat(40), snapshots };
	expect(selectBundle(catalog).version).toBe('0.1.0-rc.2');
	expect(bundleRegistry(catalog).versions.map((item) => item.version)).toEqual([
		'0.1.0',
		'0.1.0-rc.10',
		'0.1.0-rc.2',
	]);
});
test('Cloudflare previews use their own catalog while production always uses the production catalog', () => {
	expect(catalogRefForBuild({ CF_PAGES: '1', CF_PAGES_BRANCH: 'docs-crossrepo-frontend' })).toBe(
		'docs-artifacts-preview',
	);
	expect(catalogRefForBuild({ CF_PAGES: '1', CF_PAGES_BRANCH: 'main', DOCS_PREVIEW: '1' })).toBe(
		'docs-artifacts',
	);
	expect(catalogRefForBuild({})).toBe('docs-artifacts');
});
test('latest is a commit-pinned pointer; SDK versions and docs revisions are independent', () => {
	const old = pointer('5'.repeat(40));
	const latest = pointer();
	const catalog = {
		schemaVersion: 1,
		latest: latest.sourceCommit,
		snapshots: { [old.sourceCommit]: old, [latest.sourceCommit]: latest },
	};
	expect(selectBundle(catalog)).toEqual(latest);
	expect(bundleRegistry(catalog).versions).toHaveLength(1);
	expect(bundleRegistry(catalog).versions[0].sourceCommit).toBe(latest.sourceCommit);
	for (const field of [
		{ artifactCommit: 'main' },
		{ bundlePath: '../bundle.tar.gz' },
		{ repository: 'Other/Repo' },
	])
		expect(() =>
			selectBundle({ ...catalog, snapshots: { [latest.sourceCommit]: { ...latest, ...field } } }),
		).toThrow();
});

test('published importer downloads only latest, verifies it, and prepares static Markdown/API without Git or Rust', async () => {
	await mkdir(path.join(projectRoot, '.generated'), { recursive: true });
	const work = await mkdtemp(path.join(projectRoot, '.generated/bundle-test-'));
	try {
		const source = pointer().sourceCommit;
		const content = path.join(work, 'content');
		const write = async (file, bytes) => {
			await mkdir(path.dirname(path.join(content, file)), { recursive: true });
			await writeFile(path.join(content, file), bytes);
		};
		const markdown =
			'---\ntitle: Latest fixture\n---\n# Latest fixture\n\nLatest bundle content.\n';
		await write('docs/public/index.md', markdown);
		await write(
			'docs/public/_navigation.json',
			json({
				schemaVersion: 1,
				sections: [
					{ title: 'Start', pages: ['index.md'] },
					{ title: 'Reference', generated: 'rust-api' },
				],
			}),
		);
		const manifest = {
			schemaVersion: 1,
			version: '0.1.0',
			source: { commit: source, repository: 'CascadingLabs/Yosoi', root: 'docs/public' },
			pages: {
				'/': {
					title: 'Latest fixture',
					file: 'index.md',
					format: 'markdown',
					order: 0,
					sha256: hash(markdown),
				},
			},
			assets: {},
		};
		await write('manifest.json', json(manifest));
		for (const file of [
			'generate.mjs',
			'content.mjs',
			'navigation.mjs',
			'reference/generate.mjs',
			'reference/model.mjs',
			'reference/sdk-discovery.mjs',
			'reference/toolchain.json',
			'reference/sdk-policy.json',
		]) {
			await mkdir(path.dirname(path.join(content, 'scripts/docs', file)), { recursive: true });
			await cp(
				path.join(repositoryRoot(), 'scripts/docs', file),
				path.join(content, 'scripts/docs', file),
			);
		}
		const apiPage = json({ publicPath: 'yosoi', kind: 'module', docs: 'A fixture API.' });
		await write('reference/en/pages/index.json', apiPage);
		const api = {
			schemaVersion: 1,
			kind: 'rust-api-reference',
			version: '0.1.0',
			source: { commit: source, repository: 'CascadingLabs/Yosoi' },
			sdk: { crate: 'yosoi', version: '0.1.0' },
			locales: ['en'],
			pages: {
				index: {
					file: 'pages/index.json',
					publicPath: 'yosoi',
					kind: 'module',
					localeHashes: { en: hash(apiPage) },
				},
			},
		};
		const provenance = json({ sourceCommit: source, contentDigest: hash(json(api)) });
		await write('reference/provenance.json', provenance);
		await write(
			'reference/manifest.json',
			json({
				...api,
				provenance: {
					file: 'provenance.json',
					sha256: hash(provenance),
					status: 'unsigned-preview',
				},
			}),
		);
		const files = {};
		const walk = async (dir, prefix = '') => {
			for (const entry of await readdir(dir, { withFileTypes: true })) {
				const file = prefix + entry.name;
				if (entry.isDirectory()) await walk(path.join(dir, entry.name), file + '/');
				else files[file] = hash(await readFile(path.join(dir, entry.name)));
			}
		};
		await walk(content);
		await write(
			'bundle.json',
			json({
				schemaVersion: 1,
				version: '0.1.0',
				sourceCommit: source,
				repository: 'CascadingLabs/Yosoi',
				files,
			}),
		);
		const archive = path.join(work, 'bundle.tar.gz');
		await tar.c({ cwd: content, file: archive, gzip: true }, ['.']);
		const bytes = await readFile(archive);
		const selected = { ...pointer(), sha256: hash(bytes) };
		const old = pointer('6'.repeat(40), '0.0.9');
		const catalog = {
			schemaVersion: 1,
			latest: source,
			snapshots: { [old.sourceCommit]: old, [source]: selected },
		};
		// Exercise the real importer in an isolated frontend, without replacing CI's prepared docs.
		const frontend = path.join(work, 'frontend');
		await mkdir(path.join(frontend, 'scripts/docs'), { recursive: true });
		await mkdir(path.join(frontend, 'src/lib'), { recursive: true });
		await cp(
			path.join(projectRoot, 'src/lib/docs-releases.ts'),
			path.join(frontend, 'src/lib/docs-releases.ts'),
		);
		for (const file of ['bundle.mjs', 'prepare.mjs', 'navigation.mjs', 'reference.mjs'])
			await cp(
				path.join(projectRoot, 'scripts/docs', file),
				path.join(frontend, 'scripts/docs', file),
			);
		const entry = path.join(frontend, 'run.mjs');
		await writeFile(
			entry,
			`
      import { consumeLatest } from './scripts/docs/bundle.mjs';
      import { readFileSync, writeFileSync } from 'node:fs';
      const urls = [];
      const catalog = ${JSON.stringify(catalog)};
      const bytes = process.env.BAD_BUNDLE ? 'wrong bytes' : readFileSync(${JSON.stringify(archive)});
      const fetcher = async (url) => { urls.push(url); return new Response(url.includes('api.github.com') ? JSON.stringify({object:{sha:'7'.repeat(40)}}) : url.endsWith('catalog.json') ? JSON.stringify(catalog) : bytes); };
      await consumeLatest({fetcher, build:false});
      writeFileSync('requests.json', JSON.stringify(urls));
    `,
		);
		execFileSync('bun', [entry], {
			cwd: frontend,
			env: { ...process.env, DOCS_PREVIEW: '', CF_PAGES: '' },
		});
		const urls = JSON.parse(await readFile(path.join(frontend, 'requests.json'), 'utf8'));
		expect(urls).toEqual([
			'https://api.github.com/repos/CascadingLabs/Yosoi/git/ref/heads/docs-artifacts',
			`https://raw.githubusercontent.com/CascadingLabs/Yosoi/${'7'.repeat(40)}/catalog.json`,
			`https://raw.githubusercontent.com/CascadingLabs/Yosoi/${selected.artifactCommit}/${selected.bundlePath}`,
		]);
		const snapshot = JSON.parse(
			await readFile(path.join(frontend, '.generated/yosoi/routes.json'), 'utf8'),
		);
		expect(snapshot.source.commit).toBe(source);
		expect(snapshot.pages.map((page) => page.route)).toEqual(['', 'api']);
		expect(await readFile(path.join(frontend, '.generated/yosoi/docs/index.md'), 'utf8')).toContain(
			'Latest bundle content.',
		);
		expect(() =>
			execFileSync('bun', [entry], {
				cwd: frontend,
				env: { ...process.env, DOCS_PREVIEW: '', CF_PAGES: '', BAD_BUNDLE: '1' },
				stdio: 'pipe',
			}),
		).toThrow(/checksum/);
		await symlink('/etc/passwd', path.join(content, 'link'));
		const unsafe = path.join(work, 'unsafe.tar.gz');
		await tar.c({ cwd: content, file: unsafe, gzip: true }, ['link']);
		await expect(unpackBundle(unsafe, path.join(work, 'unsafe'), selected)).rejects.toThrow(
			/Unsafe/,
		);
	} finally {
		await rm(work, { recursive: true, force: true });
	}
});
