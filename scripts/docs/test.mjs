import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Keep test fixtures/configuration and native bundler scratch files outside the app watcher.
const temp = path.resolve(
	root,
	process.env.YOSOI_REPO_ROOT || '../Yosoi',
	'.generated/frontend-tests/runtime',
);
await mkdir(temp, { recursive: true });
execFileSync('vp', ['test', 'run', ...process.argv.slice(2)], {
	cwd: root,
	stdio: 'inherit',
	env: { ...process.env, TMPDIR: temp },
});
