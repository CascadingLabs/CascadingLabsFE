import { expect, test } from 'vite-plus/test';
import { mkdtemp, mkdir, writeFile, readFile, stat, rm } from 'node:fs/promises';
import path from 'node:path';
import { publishLiveSnapshot } from './live-snapshot.mjs';
import { repositoryRoot } from './prepare.mjs';

test('large live snapshots preserve unchanged files and directory identities, update and remove pages', async () => {
	const root = path.join(repositoryRoot(), '.generated/frontend-tests');
	await mkdir(root, { recursive: true });
	const work = await mkdtemp(path.join(root, 'publish-'));
	const stage = path.join(work, 'stage');
	const served = path.join(work, 'served');
	try {
		for (const directory of [stage, served]) {
			await mkdir(path.join(directory, 'docs'), { recursive: true });
			for (let i = 0; i < 1000; i++)
				await writeFile(path.join(directory, 'docs', `${i}.md`), `Page ${i}\n`);
		}
		const unchanged = path.join(served, 'docs/1.md');
		const beforeFile = await stat(unchanged);
		const beforeDirectory = await stat(path.join(served, 'docs'));
		await writeFile(path.join(stage, 'docs/0.md'), 'Updated\n');
		await writeFile(path.join(stage, 'docs/added.md'), 'Added\n');
		await rm(path.join(stage, 'docs/999.md'));
		await publishLiveSnapshot(stage, served);
		expect(await readFile(path.join(served, 'docs/0.md'), 'utf8')).toBe('Updated\n');
		expect(await readFile(path.join(served, 'docs/added.md'), 'utf8')).toBe('Added\n');
		await expect(stat(path.join(served, 'docs/999.md'))).rejects.toMatchObject({ code: 'ENOENT' });
		const afterFile = await stat(unchanged);
		expect(afterFile.ino).toBe(beforeFile.ino);
		expect(afterFile.mtimeMs).toBe(beforeFile.mtimeMs);
		expect((await stat(path.join(served, 'docs'))).ino).toBe(beforeDirectory.ino);
		const updatedBefore = await stat(path.join(served, 'docs/0.md'));
		await publishLiveSnapshot(stage, served);
		const updatedAfter = await stat(path.join(served, 'docs/0.md'));
		expect(updatedAfter.ino).toBe(updatedBefore.ino);
		expect(updatedAfter.mtimeMs).toBe(updatedBefore.mtimeMs);
	} finally {
		await rm(work, { recursive: true, force: true });
	}
});
