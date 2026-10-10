import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { snapshotRoot } from '../../../lib/yosoi-snapshot';

export function getStaticPaths() {
	const manifest = JSON.parse(
		readFileSync(path.join(snapshotRoot, 'source-manifest.json'), 'utf8'),
	);
	return Object.keys(manifest.assets).map((file) => ({
		params: { asset: file.slice('assets/'.length) },
		props: { file },
	}));
}
const types: Record<string, string> = {
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.pdf': 'application/pdf',
};
export const GET: APIRoute = ({ props }) => {
	const file = path.resolve(snapshotRoot, props.file);
	if (!file.startsWith(path.join(snapshotRoot, 'assets') + path.sep))
		throw new Error('Prepared asset path escaped the asset directory.');
	return new Response(new Uint8Array(readFileSync(file)), {
		headers: { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' },
	});
};
