import { dev } from 'astro';
import { parseArgs } from 'node:util';
const { values } = parseArgs({
	options: {
		host: { type: 'string', default: '127.0.0.1' },
		port: { type: 'string', default: '4321' },
	},
});
const server = await dev({
	root: process.cwd(),
	server: { host: values.host, port: Number(values.port) },
	vite: { server: { strictPort: true } },
});
process.send?.({ type: 'ready' });
async function stop() {
	await server.stop();
	process.exit(0);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
