import { expect, test } from 'vite-plus/test';
import { mkdir, mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { repositoryRoot } from './prepare.mjs';
import { exportRelease } from './export-release.mjs';
import { registerRelease } from './register-release.mjs';

test('release export/register uses a tagged source and committed artifact blobs, and rejects preview publication', async () => {
	const base = path.join(repositoryRoot(), '.generated/publication-tests');
	await mkdir(base, { recursive: true });
	const root = await mkdtemp(path.join(base, 'fixture-'));
	const git = (repo, ...args) =>
		execFileSync(
			'git',
			[
				'-C',
				repo,
				'-c',
				'user.name=Docs Fixture',
				'-c',
				'user.email=fixture@example.invalid',
				'-c',
				'commit.gpgsign=false',
				'-c',
				'core.hooksPath=/dev/null',
				...args,
			],
			{ encoding: 'utf8' },
		).trim();
	try {
		const sdk = path.join(root, 'sdk');
		const artifacts = path.join(root, 'artifacts');
		const snapshot = path.join(root, 'snapshot');
		await mkdir(sdk);
		git(sdk, 'init', '-q');
		await writeFile(path.join(sdk, 'SDK'), 'Release source');
		git(sdk, 'add', '.');
		git(sdk, 'commit', '-qm', 'sdk');
		git(sdk, 'tag', 'v0.1.0');
		const source = git(sdk, 'rev-parse', 'HEAD');
		await mkdir(path.join(snapshot, 'docs'), { recursive: true });
		await mkdir(path.join(snapshot, 'reference'));
		const routes = {
			mode: 'commit',
			source: { version: '0.1.0', commit: source, repository: 'Fixture/Yosoi' },
			reference: { sourceCommit: source },
			pages: [{ route: '', title: 'Overview', file: 'index.md', id: 'index', order: 0 }],
			navigation: { title: 'Yosoi', route: '', id: 'index', order: 0, children: [] },
		};
		await writeFile(path.join(snapshot, 'routes.json'), JSON.stringify(routes));
		await writeFile(path.join(snapshot, 'source-manifest.json'), '{"assets":{}}');
		await writeFile(
			path.join(snapshot, 'docs/index.md'),
			'---\ntitle: Overview\n---\n\nA tagged release.\n',
		);
		await mkdir(artifacts);
		git(artifacts, 'init', '-q');
		await mkdir(path.join(artifacts, 'versions'));
		const output = path.join(artifacts, 'versions/0.1.0');
		await exportRelease(snapshot, output, sdk);
		git(artifacts, 'add', '.');
		git(artifacts, 'commit', '-qm', 'docs artifact');
		const registry = path.join(root, 'registry.json');
		await writeFile(registry, '{"schemaVersion":1,"latest":null,"versions":[]}');
		const release = await registerRelease({
			artifactCheckout: artifacts,
			manifestPath: 'versions/0.1.0/manifest.json',
			artifactRepository: 'Fixture/Yosoi',
			registryPath: registry,
		});
		expect(release.sourceCommit).toBe(source);
		expect(release.artifactCommit).toBe(git(artifacts, 'rev-parse', 'HEAD'));
		expect(release.artifactCommit).not.toBe(source);
		expect(JSON.parse(await readFile(registry, 'utf8')).latest).toBe('0.1.0');
		git(sdk, 'tag', 'v0.1.0-rc.2');
		await writeFile(
			path.join(snapshot, 'routes.json'),
			JSON.stringify({ ...routes, source: { ...routes.source, version: '0.1.0-rc.2' } }),
		);
		await exportRelease(snapshot, path.join(artifacts, 'versions/0.1.0-rc.2'), sdk);
		git(artifacts, 'add', '.');
		git(artifacts, 'commit', '-qm', 'candidate docs artifact');
		const candidate = await registerRelease({
			artifactCheckout: artifacts,
			manifestPath: 'versions/0.1.0-rc.2/manifest.json',
			artifactRepository: 'Fixture/Yosoi',
			registryPath: registry,
		});
		expect(candidate.version).toBe('0.1.0-rc.2');
		expect(
			JSON.parse(await readFile(registry, 'utf8')).versions.map((item) => item.version),
		).toEqual(['0.1.0', '0.1.0-rc.2']);
		await expect(
			registerRelease({
				artifactCheckout: artifacts,
				manifestPath: 'versions/0.1.0/manifest.json',
				artifactRepository: 'Fixture/Yosoi',
				registryPath: registry,
			}),
		).rejects.toThrow(/immutable/);
		await expect(exportRelease(snapshot, output, sdk)).rejects.toThrow();
		await writeFile(
			path.join(snapshot, 'routes.json'),
			JSON.stringify({ ...routes, mode: 'working-tree-preview' }),
		);
		await expect(
			exportRelease(snapshot, path.join(artifacts, 'versions/preview'), sdk),
		).rejects.toThrow(/Local previews/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
