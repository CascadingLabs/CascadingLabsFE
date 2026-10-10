import { expect, test } from 'vite-plus/test';
import { createHash } from 'node:crypto';
import {
	parseReleaseRegistry,
	compareReleaseVersions,
	isReleaseVersion,
	rawArtifactUrl,
	releaseFilePath,
	archiveHref,
	type DocsRelease,
} from '../../src/lib/docs-releases';
import {
	fetchVerified,
	loadArchiveManifest,
	parseArchiveManifest,
} from '../../src/lib/docs-archive';

const hash = (data: string) => createHash('sha256').update(data).digest('hex');
const release: DocsRelease = {
	version: '0.1.0',
	tag: 'v0.1.0',
	sourceCommit: '1'.repeat(40),
	artifactRepository: 'CascadingLabs/Yosoi',
	artifactCommit: '2'.repeat(40),
	manifestPath: 'versions/0.1.0/manifest.json',
	sha256: '3'.repeat(64),
};
const manifest = {
	schemaVersion: 1,
	version: '0.1.0',
	tag: 'v0.1.0',
	sourceCommit: release.sourceCommit,
	navigation: { title: 'Yosoi', route: '', id: 'index', order: 0, children: [] },
	pages: [
		{ route: '', title: 'Old overview', file: 'pages/index.html', sha256: hash('<p>Old docs</p>') },
	],
	assets: {},
};

test('numbered RC docs are valid and sort before the corresponding final release', () => {
	const candidate = { ...release, version: '0.1.0-rc.2', tag: 'v0.1.0-rc.2' };
	expect(
		parseReleaseRegistry({ schemaVersion: 1, latest: candidate.version, versions: [candidate] })
			.latest,
	).toBe(candidate.version);
	for (const invalid of [
		'0.1.0-rc.0',
		'0.1.0-rc.01',
		'0.1.0rc2',
		'0.01.0',
		'0.100001.0',
		'0.1.10001',
	])
		expect(isReleaseVersion(invalid)).toBe(false);
	expect(['0.1.0-rc.10', '0.1.0', '0.1.0-rc.2', '0.2.0-rc.1'].sort(compareReleaseVersions)).toEqual(
		['0.1.0-rc.2', '0.1.0-rc.10', '0.1.0', '0.2.0-rc.1'],
	);
});

test('release registry pins source/artifact commits and rejects duplicates, moving refs, and traversal', () => {
	expect(
		parseReleaseRegistry({ schemaVersion: 1, latest: '0.1.0', versions: [release] }).latest,
	).toBe('0.1.0');
	expect(parseReleaseRegistry({ schemaVersion: 1, latest: null, versions: [] }).versions).toEqual(
		[],
	);
	for (const versions of [
		[{ ...release, artifactCommit: 'main' }],
		[{ ...release, manifestPath: '../manifest.json' }],
		[release, release],
		[{ ...release, tag: 'latest' }],
	])
		expect(() => parseReleaseRegistry({ schemaVersion: 1, latest: '0.1.0', versions })).toThrow();
	expect(() =>
		parseReleaseRegistry({ schemaVersion: 1, latest: '0.2.0', versions: [release] }),
	).toThrow();
	expect(rawArtifactUrl(release, releaseFilePath(release, 'pages/index.html'))).toBe(
		`https://raw.githubusercontent.com/CascadingLabs/Yosoi/${release.artifactCommit}/versions/0.1.0/pages/index.html`,
	);
	expect(archiveHref('0.1.0', 'cli/map')).toBe('/yosoi/archive/?version=0.1.0&page=cli%2Fmap');
});
test('an archived version owns its navigation/page inventory and must match its release identity', () => {
	expect(parseArchiveManifest(manifest, release).pages[0].title).toBe('Old overview');
	expect(() =>
		parseArchiveManifest({ ...manifest, sourceCommit: '4'.repeat(40) }, release),
	).toThrow();
	expect(() =>
		parseArchiveManifest(
			{ ...manifest, pages: [{ ...manifest.pages[0], file: '../secret' }] },
			release,
		),
	).toThrow();
	expect(() =>
		parseArchiveManifest(
			{ ...manifest, navigation: { ...manifest.navigation, route: 'new', id: 'new' } },
			release,
		),
	).toThrow();
});
test('transport verifies immutable manifest/page bytes and rejects mismatched hashes or missing resources', async () => {
	const json = JSON.stringify(manifest);
	const selected = { ...release, sha256: hash(json) };
	const urls: string[] = [];
	const fetcher = async (input: RequestInfo | URL) => {
		urls.push(String(input));
		return new Response(json);
	};
	expect((await loadArchiveManifest(selected, fetcher)).pages[0].title).toBe('Old overview');
	expect(urls[0]).toContain(`/${release.artifactCommit}/versions/0.1.0/manifest.json`);
	await expect(
		fetchVerified(release, release.manifestPath, release.sha256, fetcher),
	).rejects.toThrow(/checksum/);
	await expect(
		fetchVerified(
			release,
			release.manifestPath,
			release.sha256,
			async () => new Response('', { status: 404 }),
		),
	).rejects.toThrow(/404/);
});
