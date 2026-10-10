import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface DocPage {
	id: string;
	file: string;
	route: string;
	title: string;
	order: number;
	kind?: string;
	publicPath?: string;
}
export interface NavNode {
	title: string;
	route: string;
	id?: string;
	order: number;
	children: NavNode[];
	collapsed?: boolean;
	kind?: string;
}
export interface DocSnapshot {
	schemaVersion: 1;
	mode: 'commit' | 'working-tree-preview';
	source: { repository: string; commit: string; version: string; preview?: boolean };
	pages: DocPage[];
	navigation: NavNode;
	navigationSource?: { path: string; sha256: string };
	reference: {
		sourceCommit: string;
		repository: string;
		sdkVersion: string;
		pages: number;
		provenance: string;
	};
}
export const snapshotRoot = path.resolve(process.cwd(), '.generated/yosoi');
export { docHref } from './docs-path';
export function readSnapshot(): DocSnapshot {
	let snapshot: DocSnapshot;
	try {
		snapshot = JSON.parse(readFileSync(path.join(snapshotRoot, 'routes.json'), 'utf8'));
	} catch (cause) {
		throw new Error(
			'No prepared Yosoi snapshot. Run "vpr docs:prepare" or "vpr docs:dev" before starting Astro.',
			{ cause },
		);
	}
	if (snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.pages) || !snapshot.navigation)
		throw new Error('Unsupported Yosoi snapshot contract. Regenerate with vpr docs:prepare.');
	return snapshot;
}
