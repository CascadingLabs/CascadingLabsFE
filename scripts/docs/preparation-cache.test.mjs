import { expect, test } from 'vite-plus/test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { cachedText, cachedPythonReference } from './preparation-cache.mjs';
import { repositoryRoot } from './prepare.mjs';

test('reuses generated Python pages until declarations, generator or provenance change', async () => {
	const root = path.join(repositoryRoot(), '.generated/frontend-tests');
	await mkdir(root, { recursive: true });
	const work = await mkdtemp(path.join(root, 'cache-'));
	try {
		await mkdir(path.join(work, 'python/yosoi'), { recursive: true });
		await mkdir(path.join(work, 'scripts/docs'), { recursive: true });
		const declaration = path.join(work, 'python/yosoi/__init__.py');
		const generator = path.join(work, 'scripts/docs/python_reference.py');
		await writeFile(declaration, 'class Session: pass');
		await writeFile(generator, 'generator v1');
		let generated = 0;
		const generate = (_repo, _target) => {
			generated++;
			// The real generator is synchronous; use the same contract here.
		};
		const { mkdirSync, writeFileSync } = await import('node:fs');
		const options = {
			repo: work,
			target: path.join(work, 'out'),
			cache: path.join(work, 'cache'),
			source: 'source',
			repository: 'Fixture/Yosoi',
			generate: (...args) => {
				generate(...args);
				mkdirSync(path.join(args[1], 'python-api'), { recursive: true });
				writeFileSync(path.join(args[1], 'python-api/index.md'), `generation ${generated}`);
			},
		};
		await cachedPythonReference(options);
		await rm(options.target, { recursive: true });
		await cachedPythonReference(options);
		expect(generated).toBe(1);
		expect(await readFile(path.join(options.target, 'python-api/index.md'), 'utf8')).toBe(
			'generation 1',
		);
		await writeFile(declaration, 'class Session: changed');
		await cachedPythonReference(options);
		expect(generated).toBe(2);
		await writeFile(generator, 'generator v2');
		await cachedPythonReference(options);
		expect(generated).toBe(3);
		await cachedPythonReference({ ...options, source: 'new-source' });
		expect(generated).toBe(4);
		let transforms = 0;
		const transform = async () => {
			transforms++;
			return 'rendered';
		};
		await cachedText(path.join(work, 'text'), 'input', transform);
		await cachedText(path.join(work, 'text'), 'input', transform);
		expect(transforms).toBe(1);
		await cachedText(path.join(work, 'text'), 'changed input', transform);
		expect(transforms).toBe(2);
	} finally {
		await rm(work, { recursive: true, force: true });
	}
});
