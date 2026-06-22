#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = path.join(root, 'docs-sources.lock.json');
const localPath = path.join(root, 'docs-sources.local.json');
const generatedRoot = path.join(root, '.generated');
const generatedDocs = path.join(generatedRoot, 'docs');
const cacheRoot = path.join(generatedRoot, 'source-cache');
const manifestPath = path.join(generatedRoot, 'docs-manifest.json');

function runGit(args, options = {}) {
	const result = spawnSync('git', args, {
		cwd: options.cwd ?? root,
		encoding: 'utf8',
		stdio: options.quiet ? 'pipe' : 'inherit',
	});
	if (result.status !== 0) {
		const stderr = result.stderr?.trim();
		throw new Error(
			`git ${args.join(' ')} failed${stderr ? `: ${stderr}` : ''}`,
		);
	}
	return result.stdout?.trim() ?? '';
}

async function readJson(filePath, fallback = undefined) {
	if (!existsSync(filePath)) {
		return fallback;
	}
	return JSON.parse(await readFile(filePath, 'utf8'));
}

function mergeSource(product, locked, local) {
	return {
		product,
		...locked,
		...(local ?? {}),
	};
}

function resolveSourcePath(source) {
	if (!source.path) {
		return undefined;
	}
	return path.resolve(root, source.path);
}

function currentCommit(cwd) {
	return runGit(['rev-parse', 'HEAD'], { cwd, quiet: true });
}

async function cloneOrUpdate(source) {
	const checkoutPath = path.join(cacheRoot, source.product);
	if (!existsSync(path.join(checkoutPath, '.git'))) {
		await rm(checkoutPath, { recursive: true, force: true });
		await mkdir(cacheRoot, { recursive: true });
		runGit(['clone', source.repo, checkoutPath]);
	}
	runGit(['fetch', '--tags', '--prune', 'origin'], { cwd: checkoutPath });
	runGit(['checkout', '--detach', source.ref], { cwd: checkoutPath });
	return checkoutPath;
}

async function materialize(source) {
	const explicitPath = resolveSourcePath(source);
	if (explicitPath) {
		if (!existsSync(explicitPath)) {
			throw new Error(
				`${source.product} local docs path does not exist: ${explicitPath}`,
			);
		}
		return {
			path: explicitPath,
			mode: 'local',
			commit: existsSync(path.join(explicitPath, '.git'))
				? currentCommit(explicitPath)
				: null,
		};
	}

	const checkoutPath = await cloneOrUpdate(source);
	return {
		path: checkoutPath,
		mode: 'locked',
		commit: currentCommit(checkoutPath),
	};
}

async function copySource(source, materialized) {
	const target = path.join(generatedDocs, source.directory);
	await rm(target, { recursive: true, force: true });
	await mkdir(path.dirname(target), { recursive: true });
	await cp(materialized.path, target, {
		recursive: true,
		filter: (entry) => !entry.split(path.sep).includes('.git'),
	});
	return target;
}

async function rewriteRendererImports(directory) {
	const entries = await readdir(directory);
	for (const entry of entries) {
		const entryPath = path.join(directory, entry);
		const info = await stat(entryPath);
		if (info.isDirectory()) {
			await rewriteRendererImports(entryPath);
			continue;
		}
		if (!/\.(md|mdx)$/.test(entry)) {
			continue;
		}

		const original = await readFile(entryPath, 'utf8');
		const rewritten = original.replace(
			/from ['"](?:\.\.\/)+src\/components\/([^'"]+)['"]/g,
			"from '@site-components/$1'",
		);
		if (rewritten !== original) {
			await writeFile(entryPath, rewritten);
		}
	}
}

async function main() {
	const lock = await readJson(lockPath);
	if (!lock?.sources) {
		throw new Error('docs-sources.lock.json must contain a sources object');
	}
	const local = await readJson(localPath, { sources: {} });
	const manifest = {
		schemaVersion: 1,
		generatedAt: new Date().toISOString(),
		sources: {},
	};

	await rm(generatedDocs, { recursive: true, force: true });
	await mkdir(generatedDocs, { recursive: true });

	for (const [product, lockedSource] of Object.entries(lock.sources)) {
		const source = mergeSource(product, lockedSource, local.sources?.[product]);
		if (!source.repo || !source.ref || !source.directory) {
			throw new Error(
				`${product} source must define repo, ref, and directory in docs-sources.lock.json`,
			);
		}

		const materialized = await materialize(source);
		const target = await copySource(source, materialized);
		await rewriteRendererImports(target);
		manifest.sources[product] = {
			repo: source.repo,
			lockedRef: lockedSource.ref,
			directory: source.directory,
			sourceMode: materialized.mode,
			sourcePath: path.relative(root, materialized.path),
			commit: materialized.commit,
			target: path.relative(root, target),
			editBaseUrl: source.editBaseUrl,
		};
	}

	await mkdir(generatedRoot, { recursive: true });
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((error) => {
	console.error(error.message);
	process.exit(1);
});
