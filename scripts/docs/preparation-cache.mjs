import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';

const digest = (value) => createHash('sha256').update(value).digest('hex');

export async function cachedText(directory, input, generate) {
	const target = path.join(directory, digest(input));
	try {
		return await readFile(target, 'utf8');
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
	}
	const result = await generate();
	await mkdir(directory, { recursive: true });
	await writeFile(target, result);
	return result;
}

async function pythonInputs(directory) {
	const inputs = [];
	for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		if (entry.name.startsWith('.') || entry.name === '__pycache__') continue;
		const file = path.join(directory, entry.name);
		if (entry.isDirectory()) inputs.push([entry.name, await pythonInputs(file)]);
		else if (entry.isFile() && /\.(py|pyi)$/.test(entry.name))
			inputs.push([entry.name, await readFile(file, 'utf8')]);
	}
	return inputs;
}

export async function cachedPythonReference({ repo, target, cache, source, repository, generate }) {
	let inputs;
	try {
		inputs = [
			await pythonInputs(path.join(repo, 'python/yosoi')),
			await readFile(path.join(repo, 'scripts/docs/python_reference.py'), 'utf8'),
			source,
			repository,
		];
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
		return generate(repo, target, source, repository);
	}
	const directory = path.join(cache, digest(JSON.stringify(inputs)));
	try {
		await readFile(path.join(directory, '.complete'));
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
		generate(repo, target, source, repository);
		await rm(directory, { recursive: true, force: true });
		await cp(path.join(target, 'python-api'), directory, { recursive: true });
		await writeFile(path.join(directory, '.complete'), 'ready');
		return;
	}
	await cp(directory, path.join(target, 'python-api'), {
		recursive: true,
		filter: (file) => path.basename(file) !== '.complete',
	});
}
