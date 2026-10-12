import { watch, existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { optionsFromArgs, prepareDocs, projectRoot, repositoryRoot } from './prepare.mjs';
import { lastGoodPreview } from './last-good-preview.mjs';

const options = optionsFromArgs(process.argv.slice(2));
// Reject duplicate previews before preparation can replace an active server's snapshot.
const portProbe = createServer();
await new Promise((resolve, reject) => {
	portProbe.once('error', reject);
	portProbe.listen(Number(options.port || 4321), options.host || '127.0.0.1', () => {
		portProbe.close((error) => (error ? reject(error) : resolve()));
	});
});
let server;
let previewCommit;
const stoppingServers = new WeakSet();
async function startServer() {
	server = spawn(
		'bun',
		[
			'scripts/docs/serve.mjs',
			'--host',
			options.host || '127.0.0.1',
			'--port',
			options.port || '4321',
		],
		{
			cwd: projectRoot,
			stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
		},
	);
	const child = server;
	child.once('exit', () => {
		if (stoppingServers.has(child) || closing) return;
		console.error('Docs server stopped. Restart with vpr dev.');
		void stop(1);
	});
	await new Promise((resolve, reject) => {
		const ready = (message) => {
			if (message?.type !== 'ready') return;
			cleanup();
			resolve();
		};
		const failed = () => {
			cleanup();
			reject(new Error('Astro exited before becoming ready.'));
		};
		const cleanup = () => {
			child.off('message', ready);
			child.off('exit', failed);
		};
		child.on('message', ready);
		child.once('exit', failed);
		child.once('error', reject);
	});
	process.send?.({ type: 'ready', serverPid: child.pid });
}
async function stopServer() {
	if (!server) return;
	if (server.exitCode !== null || server.signalCode !== null) return;
	stoppingServers.add(server);
	const stopped = new Promise((resolve) => server.once('exit', resolve));
	server.kill('SIGTERM');
	await stopped;
}
let timer;
let running = true;
let pending = false;
const changedFiles = new Set();
let closing = false;
let activeRefresh = Promise.resolve();

async function refresh() {
	if (running || closing) {
		pending = !closing;
		return;
	}
	running = true;
	try {
		do {
			pending = false;
			const batch = [...changedFiles];
			changedFiles.clear();
			try {
				const snapshot = await prepareDocs({
					...options,
					'docs-only': true,
					live: true,
					changedFiles: batch,
					previewCommit,
				});
				previewCommit ??= snapshot.source.commit;
				if (closing) break;
				if (!server) await startServer();

				console.log('Yosoi preview updated.');
			} catch (error) {
				for (const file of batch) changedFiles.add(file);
				console.error(`Docs refresh failed: ${error.message}`);
				console.error(
					'Fix the source or its remaining links and save. The watcher will retry; no restart is needed.',
				);
			}
		} while (pending && !closing);
	} finally {
		running = false;
	}
}
const onSourceChange = (file) => {
	changedFiles.add(file);
	clearTimeout(timer);
	timer = setTimeout(() => {
		if (running) {
			pending = true;
			return;
		}
		activeRefresh = refresh();
	}, 250);
};
const watchers = ['docs/public', 'python/yosoi']
	.map((directory) => path.join(repositoryRoot(), directory))
	.filter(existsSync)
	.map((directory) =>
		watch(directory, { recursive: true }, (_event, filename) => {
			const relative = filename?.toString();
			if (relative?.split(/[\\/]/).some((part) => part === '__pycache__' || part.startsWith('.')))
				return;
			if (directory.endsWith('python/yosoi') && relative && !/\.(py|pyi)$/.test(relative)) return;
			onSourceChange(
				relative
					? path.relative(repositoryRoot(), path.join(directory, relative))
					: path.relative(repositoryRoot(), directory),
			);
		}),
	);
console.log(
	'Watching Yosoi/docs/public and Python declarations. Markdown edits prepare only changed pages; structural and declaration changes reconcile the snapshot.',
);
async function stop(exitCode = 0) {
	if (closing) return;
	closing = true;
	clearTimeout(timer);
	for (const watcher of watchers) watcher.close();
	await activeRefresh;
	await stopServer();
	process.exit(exitCode);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
try {
	let snapshot;
	try {
		snapshot = await prepareDocs(options);
	} catch (error) {
		if (options.source || process.env.CI) throw error;
		console.error(`Docs preparation failed: ${error.message}`);
		snapshot = await lastGoodPreview(
			path.join(projectRoot, '.generated/yosoi'),
			repositoryRoot(),
			options,
		);
		console.error(
			snapshot
				? 'Serving the last good preview. Current edits are not served yet. Fix the source or its remaining links and save; no restart is needed.'
				: 'No valid preview is available yet. Fix the source or its remaining links and save; the watcher will start the server when preparation succeeds.',
		);
		// A correction must reconcile the entire source, including edits made
		// before this watcher started and therefore absent from its event batch.
		changedFiles.add('docs/public');
	}
	if (snapshot) {
		previewCommit = snapshot.source.commit;
		await startServer();
	}
	running = false;
	if (pending) activeRefresh = refresh();
} catch (error) {
	console.error(error.message);
	await stop(1);
}
