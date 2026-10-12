import path from 'node:path';

// Coalesce publication, content-store and CSS-triggered reloads while keeping
// Astro's HTTP server and Vite transport alive. Never installed in production.
export function docsSnapshotIntegration() {
	return {
		name: 'yosoi-prepared-snapshot',
		hooks: {
			'astro:config:setup': ({ command, updateConfig }) => {
				if (command !== 'dev') return;
				updateConfig({
					vite: {
						plugins: [
							{
								name: 'yosoi-snapshot-reload',
								configureServer(server) {
									const hot = server.environments.client.hot;
									const send = hot.send.bind(hot);
									let timer;
									const reload = () => {
										clearTimeout(timer);
										timer = setTimeout(() => {
											timer = undefined;
											send({ type: 'full-reload', path: '*' });
										}, 750);
									};
									hot.send = (...args) => {
										if (args[0]?.type === 'full-reload') reload();
										else {
											if (timer) reload();
											send(...args);
										}
									};
									const manifest = path.resolve(server.config.root, '.generated/yosoi/routes.json');
									server.watcher.add(manifest);
									const changed = (file) => {
										if (path.resolve(file) === manifest) reload();
									};
									server.watcher.on('change', changed);
									server.watcher.on('add', changed);
									server.httpServer?.once('close', () => {
										clearTimeout(timer);
										server.watcher.off('change', changed);
										server.watcher.off('add', changed);
									});
								},
							},
						],
					},
				});
			},
		},
	};
}
