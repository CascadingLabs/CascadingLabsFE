import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { isReleaseVersion } from '../../src/lib/docs-releases.ts';
import { projectRoot, repositoryRoot } from './prepare.mjs';
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function exportRelease(
	snapshotDirectory,
	outputDirectory,
	sourceCheckout = repositoryRoot(),
) {
	const snapshot = JSON.parse(await readFile(path.join(snapshotDirectory, 'routes.json'), 'utf8'));
	if (
		snapshot.mode !== 'commit' ||
		snapshot.source.commit !== snapshot.reference.sourceCommit ||
		!isReleaseVersion(snapshot.source.version)
	)
		throw new Error(
			'Release export requires matching exact-commit docs and API artifacts, with a release version. Local previews cannot be published.',
		);
	const tagged = execFileSync(
		'git',
		[
			'-C',
			sourceCheckout,
			'rev-parse',
			'--verify',
			'--end-of-options',
			`refs/tags/v${snapshot.source.version}^{commit}`,
		],
		{ encoding: 'utf8' },
	).trim();
	if (tagged !== snapshot.source.commit)
		throw new Error('SDK release tag does not match the prepared source commit.');
	await mkdir(outputDirectory);
	const source = await import(
		pathToFileURL(path.join(repositoryRoot(), 'scripts/docs/generate.mjs')).href
	);
	const pages = [];
	for (const page of snapshot.pages) {
		const markdown = await readFile(path.join(snapshotDirectory, 'docs', page.file), 'utf8');
		const { body } = source.parseFrontmatter(markdown, page.file);
		const file = `pages/${page.route || 'index'}.md`;
		await mkdir(path.dirname(path.join(outputDirectory, file)), { recursive: true });
		await writeFile(path.join(outputDirectory, file), body);
		pages.push({
			route: page.route,
			title: page.title,
			file,
			format: 'markdown',
			sha256: sha256(body),
		});
	}
	const sourceManifest = JSON.parse(
		await readFile(path.join(snapshotDirectory, 'source-manifest.json'), 'utf8'),
	);
	const assets = {};
	for (const asset of Object.keys(sourceManifest.assets)) {
		const bytes = await readFile(path.join(snapshotDirectory, asset));
		await mkdir(path.dirname(path.join(outputDirectory, asset)), { recursive: true });
		await writeFile(path.join(outputDirectory, asset), bytes);
		assets[asset] = { file: asset, sha256: sha256(bytes) };
	}
	await cp(path.join(snapshotDirectory, 'reference'), path.join(outputDirectory, 'reference'), {
		recursive: true,
	});
	await cp(path.join(snapshotDirectory, 'routes.json'), path.join(outputDirectory, 'routes.json'));
	const manifest = {
		schemaVersion: 1,
		version: snapshot.source.version,
		tag: `v${snapshot.source.version}`,
		sourceCommit: snapshot.source.commit,
		sourceRepository: snapshot.source.repository,
		navigation: snapshot.navigation,
		pages,
		assets,
	};
	const bytes = JSON.stringify(manifest, null, 2) + '\n';
	await writeFile(path.join(outputDirectory, 'manifest.json'), bytes);
	return { manifest, sha256: sha256(bytes) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { values } = parseArgs({
		options: { snapshot: { type: 'string', default: '.generated/yosoi' }, out: { type: 'string' } },
	});
	if (!values.out)
		throw new Error('Use --out PATH in a docs-artifacts checkout. Export does not commit or push.');
	const result = await exportRelease(
		path.resolve(projectRoot, values.snapshot),
		path.resolve(values.out),
	);
	console.log(
		`Exported ${result.manifest.tag}: ${result.manifest.pages.length} HTML pages; manifest SHA-256 ${result.sha256}.`,
	);
}
