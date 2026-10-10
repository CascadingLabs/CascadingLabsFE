import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import * as tar from 'tar';
import { compareReleaseVersions, isReleaseVersion } from '../../src/lib/docs-releases.ts';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repository = 'CascadingLabs/Yosoi';
const commit = /^[a-f0-9]{40}$/;
const hash = /^[a-f0-9]{64}$/;
const safePath = (file) =>
	typeof file === 'string' &&
	/^[A-Za-z0-9._/-]+$/.test(file) &&
	!file.startsWith('/') &&
	!file.split('/').some((p) => !p || p === '.' || p === '..');

export function selectBundle(catalog) {
	const selected = catalog?.snapshots?.[catalog.latest];
	if (
		catalog?.schemaVersion !== 1 ||
		!selected ||
		!commit.test(catalog.latest) ||
		selected.sourceCommit !== catalog.latest ||
		selected.repository !== repository ||
		!commit.test(selected.artifactCommit) ||
		!hash.test(selected.sha256) ||
		selected.bundlePath !== `snapshots/${catalog.latest}/bundle.tar.gz` ||
		!isReleaseVersion(selected.version)
	)
		throw new Error('Invalid latest Yosoi docs bundle pointer');
	return selected;
}

export function bundleRegistry(catalog) {
	const latest = selectBundle(catalog);
	const versions = new Map();
	for (const item of Object.values(catalog.snapshots)) {
		const selected = selectBundle({ ...catalog, latest: item.sourceCommit });
		if (
			!hash.test(selected.manifestSha256) ||
			selected.manifestPath !== `snapshots/${selected.sourceCommit}/content/archive-manifest.json`
		)
			throw new Error('Invalid archived docs manifest pointer');
		versions.set(selected.version, {
			version: selected.version,
			tag: `v${selected.version}`,
			sourceCommit: selected.sourceCommit,
			artifactRepository: repository,
			artifactCommit: selected.artifactCommit,
			manifestPath: selected.manifestPath,
			sha256: selected.manifestSha256,
		});
	}
	// The chosen latest snapshot wins if its SDK version also has docs corrections.
	const chosen = catalog.snapshots[catalog.latest];
	versions.set(latest.version, {
		version: chosen.version,
		tag: `v${chosen.version}`,
		sourceCommit: chosen.sourceCommit,
		artifactRepository: repository,
		artifactCommit: chosen.artifactCommit,
		manifestPath: chosen.manifestPath,
		sha256: chosen.manifestSha256,
	});
	return {
		schemaVersion: 1,
		latest: latest.version,
		versions: [...versions.values()].sort((a, b) => compareReleaseVersions(b.version, a.version)),
	};
}

async function download(url, limit, fetcher, headers = {}) {
	const response = await fetcher(url, {
		signal: AbortSignal.timeout(60000),
		cache: 'no-store',
		headers,
	});
	if (!response.ok) throw new Error(`Docs download failed (${response.status})`);
	if (!response.body) throw new Error('Docs download has no body');
	const chunks = [];
	let length = 0;
	for await (const chunk of response.body) {
		length += chunk.length;
		if (length > limit) throw new Error('Docs download exceeds its size limit');
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

export function catalogRefForBuild(env = process.env) {
	const preview =
		env.DOCS_PREVIEW === '1' ||
		(env.CF_PAGES === '1' && env.CF_PAGES_BRANCH && env.CF_PAGES_BRANCH !== 'main');
	if (!preview || (env.CF_PAGES === '1' && env.CF_PAGES_BRANCH === 'main')) return 'docs-artifacts';
	const config = JSON.parse(readFileSync(path.join(root, 'docs-preview.json'), 'utf8'));
	if (config.schemaVersion !== 1 || config.catalogRef !== 'docs-artifacts-preview')
		throw new Error('Invalid preview docs catalog configuration');
	return config.catalogRef;
}

export async function resolveCatalog(
	fetcher = fetch,
	refName = catalogRefForBuild(),
	env = process.env,
) {
	// Resolve the branch through the API, avoiding raw.githubusercontent.com's moving-ref cache.
	const ref = JSON.parse(
		await download(
			`https://api.github.com/repos/${repository}/git/ref/heads/${refName}`,
			64 * 1024,
			fetcher,
			env.GH_TOKEN ? { Authorization: `Bearer ${env.GH_TOKEN}` } : {},
		),
	);
	if (!commit.test(ref.object?.sha)) throw new Error('Invalid docs artifact branch identity');
	return JSON.parse(
		await download(
			`https://raw.githubusercontent.com/${repository}/${ref.object.sha}/catalog.json`,
			4 * 1024 * 1024,
			fetcher,
		),
	);
}

export async function unpackBundle(archive, target, selected) {
	// Inspect before extracting, and reject links, duplicates, traversal and oversized files.
	let total = 0,
		problem;
	const entries = new Set();
	await tar.t({
		file: archive,
		strict: true,
		onReadEntry(entry) {
			const name = entry.path.replace(/^\.\//, '').replace(/\/$/, '');
			if (entry.path === './' && entry.type === 'Directory') return;
			if (
				!safePath(name) ||
				!['File', 'Directory'].includes(entry.type) ||
				entries.has(name) ||
				entry.size > 16 * 1024 * 1024 ||
				(total += entry.size) > 128 * 1024 * 1024
			)
				problem = new Error('Unsafe documentation bundle archive');
			entries.add(name);
		},
	});
	if (problem) throw problem;
	await mkdir(target);
	await tar.x({ file: archive, cwd: target, strict: true });
	const bundle = JSON.parse(await readFile(path.join(target, 'bundle.json'), 'utf8'));
	if (
		bundle.schemaVersion !== 1 ||
		bundle.sourceCommit !== selected.sourceCommit ||
		bundle.repository !== repository ||
		bundle.version !== selected.version ||
		!bundle.files ||
		typeof bundle.files !== 'object' ||
		Array.isArray(bundle.files)
	)
		throw new Error('Bundle identity differs from its published pointer');
	const remaining = new Set(Object.keys(bundle.files));
	const walk = async (dir, prefix = '') => {
		for (const entry of await readdir(dir, { withFileTypes: true })) {
			const name = prefix + entry.name;
			if (entry.isDirectory()) await walk(path.join(dir, entry.name), name + '/');
			else if (entry.isFile()) {
				if (name === 'bundle.json') continue;
				if (
					!remaining.delete(name) ||
					!hash.test(bundle.files[name]) ||
					sha256(await readFile(path.join(dir, entry.name))) !== bundle.files[name]
				)
					throw new Error(`Bundle file integrity failed: ${name}`);
			} else throw new Error('Bundle contains a non-regular file');
		}
	};
	await walk(target);
	if (remaining.size) throw new Error('Bundle files are missing');
	return bundle;
}

export async function consumeLatest({ fetcher = fetch, build = true } = {}) {
	// Resolve latest exactly once. All subsequent requests are immutable commit URLs.
	const catalog = await resolveCatalog(fetcher);
	const selected = selectBundle(catalog);
	const registry = bundleRegistry(catalog);
	const generated = path.join(root, '.generated');
	await mkdir(generated, { recursive: true });
	const work = await mkdtemp(path.join(generated, 'bundle-'));
	try {
		const bytes = await download(
			`https://raw.githubusercontent.com/${repository}/${selected.artifactCommit}/${selected.bundlePath}`,
			64 * 1024 * 1024,
			fetcher,
		);
		if (sha256(bytes) !== selected.sha256) throw new Error('Published docs bundle checksum failed');
		const archive = path.join(work, 'bundle.tar.gz');
		await writeFile(archive, bytes);
		const bundleRoot = path.join(work, 'source');
		await unpackBundle(archive, bundleRoot, selected);
		process.env.YOSOI_REPO_ROOT = bundleRoot;
		const { prepareDocs } = await import('./prepare.mjs');
		await prepareDocs({
			'bundle-root': bundleRoot,
			source: selected.sourceCommit,
			version: selected.version,
			'reference-artifact': path.join(bundleRoot, 'reference'),
		});
		if (catalog.preview === true) {
			const file = path.join(generated, 'yosoi/routes.json');
			const snapshot = JSON.parse(await readFile(file, 'utf8'));
			snapshot.source.preview = true;
			await writeFile(file, JSON.stringify(snapshot, null, 2) + '\n');
		}
		await writeFile(
			path.join(generated, 'yosoi/releases.json'),
			JSON.stringify(registry, null, 2) + '\n',
		);
		// Keep only the matching source-owned validation contracts for later CI checks.
		await rm(path.join(generated, 'yosoi-source'), { recursive: true, force: true });
		await cp(path.join(bundleRoot, 'scripts'), path.join(generated, 'yosoi-source/scripts'), {
			recursive: true,
		});
		await writeFile(
			path.join(generated, 'docs-build.json'),
			JSON.stringify(selected, null, 2) + '\n',
		);
		if (build) {
			const astro = await import('astro');
			await astro.build({ root });
		}
		return selected;
	} finally {
		await rm(work, { recursive: true, force: true });
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { values } = parseArgs({
		options: { 'prepare-only': { type: 'boolean' }, 'lock-only': { type: 'boolean' } },
	});
	if (values['lock-only']) {
		const catalog = await resolveCatalog();
		bundleRegistry(catalog);
		await writeFile(
			path.join(root, 'docs-bundle.lock.json'),
			JSON.stringify(selectBundle(catalog), null, 2) + '\n',
		);
	} else await consumeLatest({ build: !values['prepare-only'] });
}
