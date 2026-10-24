import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

async function files(root, directory = '') {
	const result = [];
	for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
		const relative = path.join(directory, entry.name);
		if (entry.isDirectory()) result.push(...(await files(root, relative)));
		else if (entry.isFile()) result.push(relative);
	}
	return result;
}

// Preparation and validation finish before touching the served tree. Preserve
// directory identities and unchanged files so Astro's content watcher stays live.
export async function publishLiveSnapshot(stage, destination) {
	const next = await files(stage);
	const previous = await files(destination);
	const retained = new Set(next);
	await publishLiveFiles(stage, destination, next);
	for (const relative of previous) {
		if (!retained.has(relative)) await rm(path.join(destination, relative));
	}
}

// A partial preparation owns only these files; everything else stays served.
export async function publishLiveFiles(stage, destination, next = undefined) {
	next ??= await files(stage);
	for (const relative of next) {
		const source = path.join(stage, relative);
		const target = path.join(destination, relative);
		const bytes = await readFile(source);
		let current;
		try {
			current = await readFile(target);
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
		}
		if (current?.equals(bytes)) continue;
		await mkdir(path.dirname(target), { recursive: true });
		const temporary = `${target}.yosoi-next`;
		try {
			await writeFile(temporary, bytes);
			await rename(temporary, target);
		} finally {
			await rm(temporary, { force: true });
		}
	}
}
