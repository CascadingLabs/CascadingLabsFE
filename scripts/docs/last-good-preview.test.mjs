import { test, expect, vi } from 'vite-plus/test';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { lastGoodPreview } from './last-good-preview.mjs';
import { repositoryRoot } from './prepare.mjs';

test('last-good recovery is restricted to valid local preview snapshots from the selected source', async () => {
	vi.stubEnv('CI', '');
	const repo = repositoryRoot();
	const fixtures = path.join(repo, '.generated/frontend-tests');
	await mkdir(fixtures, { recursive: true });
	const root = await mkdtemp(path.join(fixtures, 'last-good-'));
	try {
		expect(await lastGoodPreview(root, repo)).toBeUndefined();
		await mkdir(path.join(root, 'docs'));
		const snapshot = {
			schemaVersion: 1,
			mode: 'working-tree-preview',
			previewSourceRoot: repo,
			pages: [],
			navigation: {},
			reference: {},
			source: { commit: 'a'.repeat(40) },
		};
		await writeFile(
			path.join(root, 'source-manifest.json'),
			JSON.stringify({ preview: true, source: snapshot.source }),
		);
		await writeFile(path.join(root, 'routes.json'), JSON.stringify(snapshot));
		expect(await lastGoodPreview(root, repo)).toEqual(snapshot);
		vi.stubEnv('CI', '1');
		expect(await lastGoodPreview(root, repo)).toBeUndefined();
		vi.stubEnv('CI', '');
		expect(await lastGoodPreview(root, `${repo}-other`)).toBeUndefined();
		expect(await lastGoodPreview(root, repo, { source: snapshot.source.commit })).toBeUndefined();
		await writeFile(
			path.join(root, 'routes.json'),
			JSON.stringify({ ...snapshot, mode: 'commit' }),
		);
		expect(await lastGoodPreview(root, repo)).toBeUndefined();
		await writeFile(path.join(root, 'routes.json'), '{broken');
		expect(await lastGoodPreview(root, repo)).toBeUndefined();
	} finally {
		vi.unstubAllEnvs();
		await rm(root, { recursive: true });
	}
});
