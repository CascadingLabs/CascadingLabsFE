/** Restore deep links after code tabs and fonts change the static page's height. */
export async function initializeDocsNavigation() {
	// Archived content has its own asynchronous navigation lifecycle.
	if (document.getElementById('docs-archive-view')) return;
	if (location.hash === '#_top') {
		history.replaceState(history.state, '', location.pathname + location.search);
	}
	if (document.readyState !== 'complete') {
		await new Promise<void>((resolve) =>
			window.addEventListener('load', () => resolve(), { once: true }),
		);
	}
	await document.fonts.ready;
	const alignHash = () => {
		try {
			const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
			const panel = target?.closest<HTMLElement>('[data-docs-variant]');
			const anchor = target?.closest('.docs-variant-title')
				? panel?.closest('.docs-variants')
				: target;
			anchor?.scrollIntoView({ behavior: 'instant', block: 'start' });
		} catch {
			/* Ignore malformed URL fragments. */
		}
	};
	// Wait for the final enhanced layout before restoring the requested heading.
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	alignHash();
	await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	let scheduled = false;
	const syncHash = () => {
		scheduled = false;
		const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('starlight-toc a'));
		const headings = links.flatMap((link) => {
			try {
				const heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
				const panel = heading?.closest<HTMLElement>('[data-docs-variant]');
				if (panel && !panel.getClientRects().length) return [];
				const anchor = heading?.closest('.docs-variant-title')
					? panel?.closest('.docs-variants')
					: heading;
				return heading && anchor?.getClientRects().length ? [{ heading, anchor }] : [];
			} catch {
				return [];
			}
		});
		const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
		const active = headings
			.filter(({ anchor }) => {
				const margin = parseFloat(getComputedStyle(anchor).scrollMarginTop) || 0;
				return anchor.getBoundingClientRect().top <= padding + margin + 1;
			})
			.at(-1);
		const hash = active ? '#' + encodeURIComponent(active.heading.id) : '';
		if (hash !== location.hash) {
			history.replaceState(history.state, '', location.pathname + location.search + hash);
		}
	};
	window.addEventListener(
		'scroll',
		() => {
			if (scheduled) return;
			scheduled = true;
			requestAnimationFrame(syncHash);
		},
		{ passive: true },
	);
	window.addEventListener('hashchange', alignHash);
}
