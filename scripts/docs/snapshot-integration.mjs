import path from 'node:path';
import { readFileSync } from 'node:fs';

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
									const manifest = path.resolve(server.config.root, '.generated/yosoi/routes.json');
									const routeIds = () =>
										JSON.stringify(
											JSON.parse(readFileSync(manifest, 'utf8')).pages.map((page) => page.id),
										);
									let routes = routeIds();
									let routesChanged = false;
									let timer;
									const reload = () => {
										clearTimeout(timer);
										timer = setTimeout(() => {
											timer = undefined;
											if (routesChanged) {
												// A visited static route can retain old getStaticPaths props
												// across content-store updates. Reset server module evaluation
												// only when the route set changes, keeping Astro itself alive.
												for (const name of ['ssr', 'prerender'])
													server.environments[name]?.hot.send({ type: 'full-reload' });
												routesChanged = false;
											}
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
									server.watcher.add(manifest);
									const changed = (file) => {
										if (path.resolve(file) === manifest) {
											const next = routeIds();
											routesChanged ||= next !== routes;
											routes = next;
											reload();
										}
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
