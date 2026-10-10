import { readFileSync } from 'node:fs';
import path from 'node:path';
import { readSnapshot } from '../../lib/yosoi-snapshot';

export function GET() {
	const snapshot = readSnapshot();
	let bundle = null;
	try {
		const selected = JSON.parse(readFileSync(path.resolve('.generated/docs-build.json'), 'utf8'));
		if (selected.sourceCommit === snapshot.source.commit) bundle = selected;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
	}
	return Response.json({
		frontendCommit: process.env.CF_PAGES_COMMIT_SHA || null,
		source: snapshot.source,
		bundle,
	});
}
