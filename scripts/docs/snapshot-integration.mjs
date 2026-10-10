// A local reload channel survives fresh Astro processes. Never injected in production.
export function docsSnapshotIntegration() {
	return {
		name: 'yosoi-prepared-snapshot',
		hooks: {
			'astro:config:setup': ({ command, injectScript }) => {
				const port = Number(process.env.YOSOI_DOCS_EVENTS_PORT);
				const revision = Number(process.env.YOSOI_DOCS_REVISION);
				if (
					command !== 'dev' ||
					!Number.isInteger(port) ||
					port < 1 ||
					port > 65535 ||
					!Number.isSafeInteger(revision)
				)
					return;
				injectScript(
					'head-inline',
					`(() => {
					const url = new URL(location.origin);
					url.port = ${port};
					url.pathname = '/__yosoi_docs_reload';
					const events = new EventSource(url);
					events.onmessage = (event) => {
						if (Number(event.data) > ${revision}) location.reload();
					};
					addEventListener('pagehide', () => events.close(), { once: true });
				})();`,
				);
			},
		},
	};
}
