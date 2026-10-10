import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { compareReleaseVersions, parseReleaseRegistry } from '../../src/lib/docs-releases.ts';
import { parseArchiveManifest } from '../../src/lib/docs-archive.ts';

export async function registerRelease({
	artifactCheckout,
	manifestPath,
	artifactRepository,
	registryPath,
}) {
	const commit = execFileSync('git', ['-C', artifactCheckout, 'rev-parse', 'HEAD'], {
		encoding: 'utf8',
	}).trim();
	const bytes = execFileSync('git', ['-C', artifactCheckout, 'show', `${commit}:${manifestPath}`]);
	const manifest = JSON.parse(bytes.toString('utf8'));
	const release = {
		version: manifest.version,
		tag: manifest.tag,
		sourceCommit: manifest.sourceCommit,
		artifactRepository,
		artifactCommit: commit,
		manifestPath,
		sha256: createHash('sha256').update(bytes).digest('hex'),
	};
	parseArchiveManifest(manifest, release);
	for (const item of [...manifest.pages, ...Object.values(manifest.assets)]) {
		const file = path.posix.join(path.posix.dirname(manifestPath), item.file);
		const blob = execFileSync('git', ['-C', artifactCheckout, 'show', `${commit}:${file}`]);
		if (createHash('sha256').update(blob).digest('hex') !== item.sha256)
			throw new Error(`Published file checksum mismatch: ${file}`);
	}
	const registry = parseReleaseRegistry(JSON.parse(await readFile(registryPath, 'utf8')));
	if (registry.versions.some((entry) => entry.version === release.version))
		throw new Error('Released docs versions are immutable; refusing to replace a registry entry.');
	const versions = [...registry.versions, release].sort((a, b) =>
		compareReleaseVersions(b.version, a.version),
	);
	const next = parseReleaseRegistry({ schemaVersion: 1, latest: versions[0].version, versions });
	await writeFile(registryPath, JSON.stringify(next, null, 2) + '\n');
	return release;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { values } = parseArgs({
		options: {
			checkout: { type: 'string' },
			manifest: { type: 'string' },
			repository: { type: 'string' },
			registry: { type: 'string', default: 'src/data/docs-releases.json' },
		},
	});
	if (!values.checkout || !values.manifest || !values.repository)
		throw new Error(
			'Use --checkout DOCS_ARTIFACTS_CHECKOUT --manifest versions/VERSION/manifest.json --repository OWNER/REPO.',
		);
	console.log(
		await registerRelease({
			artifactCheckout: values.checkout,
			manifestPath: values.manifest,
			artifactRepository: values.repository,
			registryPath: values.registry,
		}),
	);
}
