import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import fallback from '../data/docs-releases.json';
import { parseReleaseRegistry } from './docs-releases';

export function readReleaseRegistry() {
	const file = path.resolve('.generated/yosoi/releases.json');
	return parseReleaseRegistry(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
}
