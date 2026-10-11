import { watch, existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { optionsFromArgs, prepareDocs, projectRoot, repositoryRoot } from './prepare.mjs';

const options = optionsFromArgs(process.argv.slice(2));
// Reject duplicate previews before preparation can replace an active server's snapshot.
const portProbe = createServer();
await new Promise((resolve, reject) => {
	portProbe.once('error', reject);
	portProbe.listen(Number(options.port || 4321), options.host || '127.0.0.1', () => {
		portProbe.close((error) => (error ? reject(error) : resolve()));
	});
});
await prepareDocs(options);
const clients = new Set();
let revision = 0;
const events = createServer((req, res) => {
	if (req.url !== '/__yosoi_docs_reload') {
		res.writeHead(404).end();
		return;
	}
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Access-Control-Allow-Origin': '*',
		Connection: 'keep-alive',
	});
	res.write(`data: ${revision}\n\n`);
	clients.add(res);
	res.once('close', () => clients.delete(res));
});
await new Promise((resolve, reject) => {
	events.once('error', reject);
	events.listen(0, options.host || '127.0.0.1', resolve);
});
let server;
async function startServer(nextRevision) {
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
			env: {
				...process.env,
				YOSOI_DOCS_EVENTS_PORT: String(events.address().port),
				YOSOI_DOCS_REVISION: String(nextRevision),
			},
		},
	);
	await new Promise((resolve, reject) => {
		const child = server;
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
}
try {
	await startServer(revision);
} catch (error) {
	events.close();
	throw error;
}
async function stopServer() {
	if (server.exitCode !== null || server.signalCode !== null) return;
	const stopped = new Promise((resolve) => server.once('exit', resolve));
	server.kill('SIGTERM');
	await stopped;
}
let timer;
let running = false;
let pending = false;
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
			try {
				await stopServer();
				if (closing) break;
				await prepareDocs({ ...options, 'docs-only': true });
				if (closing) break;
				await startServer(revision + 1);
				revision++;
				for (const client of clients) client.write(`data: ${revision}\n\n`);
				console.log('Yosoi snapshot refreshed.');
			} catch (error) {
				console.error(`Docs refresh failed; fix the source and save again. ${error.message}`);
				if (!closing && (server.exitCode !== null || server.signalCode !== null)) {
					try {
						await startServer(revision);
					} catch (restartError) {
						console.error(`Could not restart the last prepared snapshot: ${restartError.message}`);
					}
				}
			}
		} while (pending && !closing);
	} finally {
		running = false;
	}
}
const onSourceChange = () => {
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
	.map((directory) => watch(directory, { recursive: true }, onSourceChange));
console.log(
	'Watching Yosoi/docs/public and Python declarations. Changes refresh the prepared snapshot and browser; Rust API compilation stays cached.',
);
async function stop() {
	if (closing) return;
	closing = true;
	clearTimeout(timer);
	for (const watcher of watchers) watcher.close();
	await activeRefresh;
	await stopServer();
	for (const client of clients) client.end();
	await new Promise((resolve) => events.close(resolve));
	process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
