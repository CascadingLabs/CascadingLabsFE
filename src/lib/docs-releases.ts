export interface DocsRelease {
	version: string;
	tag: string;
	sourceCommit: string;
	artifactRepository: string;
	artifactCommit: string;
	manifestPath: string;
	sha256: string;
}
export interface ReleaseRegistry {
	schemaVersion: 1;
	latest: string | null;
	versions: DocsRelease[];
}
const commit = /^[a-f0-9]{40}$/;
const digest = /^[a-f0-9]{64}$/;
const version = /^0\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-rc\.([1-9]\d*))?$/;
export function isReleaseVersion(input: unknown): input is string {
	if (typeof input !== 'string') return false;
	const match = version.exec(input);
	return match !== null && Number(match[1]) <= 100000 && Number(match[2]) <= 10000;
}

export function compareReleaseVersions(a: string, b: string): number {
	if (!isReleaseVersion(a) || !isReleaseVersion(b))
		throw new Error('Invalid docs release version.');
	const aa = version.exec(a);
	const bb = version.exec(b);
	if (!aa || !bb) throw new Error('Invalid docs release version.');
	const base = Number(aa[1]) - Number(bb[1]) || Number(aa[2]) - Number(bb[2]);
	if (base) return base;
	if (aa[3] === undefined) return bb[3] === undefined ? 0 : 1;
	if (bb[3] === undefined) return -1;
	const candidateA = BigInt(aa[3]);
	const candidateB = BigInt(bb[3]);
	return candidateA < candidateB ? -1 : candidateA > candidateB ? 1 : 0;
}
export function artifactPath(path: string): string {
	if (
		!path ||
		!/^[A-Za-z0-9._/-]+$/.test(path) ||
		path.split('/').some((part) => !part || part === '.' || part === '..')
	)
		throw new Error('Invalid documentation artifact path.');
	return path;
}
export function parseReleaseRegistry(input: unknown): ReleaseRegistry {
	const registry = input as ReleaseRegistry;
	if (!registry || registry.schemaVersion !== 1 || !Array.isArray(registry.versions))
		throw new Error('Invalid docs release registry.');
	const seen = new Set<string>();
	for (const release of registry.versions) {
		if (
			!release ||
			!isReleaseVersion(release.version) ||
			release.tag !== `v${release.version}` ||
			!commit.test(release.sourceCommit) ||
			!commit.test(release.artifactCommit) ||
			!digest.test(release.sha256) ||
			!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(release.artifactRepository) ||
			seen.has(release.version)
		)
			throw new Error('Invalid or duplicate docs release.');
		artifactPath(release.manifestPath);
		seen.add(release.version);
	}
	if (registry.latest !== null && !seen.has(registry.latest))
		throw new Error('Latest docs release is missing from the registry.');
	return registry;
}
export const archiveHref = (release: string, page = '') =>
	`/yosoi/archive/?${new URLSearchParams({ version: release, page })}`;
export function rawArtifactUrl(release: DocsRelease, file: string): string {
	return `https://raw.githubusercontent.com/${release.artifactRepository}/${release.artifactCommit}/${artifactPath(file)}`;
}

export function releaseFilePath(release: DocsRelease, file: string): string {
	const parent = release.manifestPath.split('/').slice(0, -1).join('/');
	return (parent ? `${parent}/` : '') + artifactPath(file);
}
