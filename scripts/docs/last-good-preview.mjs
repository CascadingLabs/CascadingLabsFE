import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

// Recovery is local-only and explicitly serves stale content until validation
// succeeds. Never substitute a cached preview for an exact-commit build.
export async function lastGoodPreview(root, repo, options = {}) {
	if (options.source || process.env.CI) return;
	try {
		const snapshot = JSON.parse(await readFile(path.join(root, 'routes.json'), 'utf8'));
		const manifest = JSON.parse(await readFile(path.join(root, 'source-manifest.json'), 'utf8'));
		if (
			snapshot.schemaVersion !== 1 ||
			snapshot.mode !== 'working-tree-preview' ||
			!Array.isArray(snapshot.pages) ||
			!snapshot.navigation ||
			!snapshot.reference ||
			manifest.preview !== true ||
			snapshot.source?.commit !== manifest.source?.commit ||
			(snapshot.previewSourceRoot && snapshot.previewSourceRoot !== repo)
		)
			return;
		if (!(await stat(path.join(root, 'docs'))).isDirectory()) return;
		return snapshot;
	} catch (error) {
		if (error.code === 'ENOENT' || error instanceof SyntaxError) return;
		throw error;
	}
}
