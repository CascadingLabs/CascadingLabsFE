/** Keep the native TOC links and active-section tracking in both outline views. */
export function initializeDocsOutline() {
	const outline = document.querySelector<HTMLElement>('.docs-outline');
	const toggle = outline?.querySelector<HTMLButtonElement>('.docs-outline-toggle');
	const toc = outline?.querySelector('starlight-toc');
	if (!outline || !toggle || !toc) return;
	const root = document.documentElement;
	const syncToggle = () => {
		const expanded = root.dataset.docsOutline === 'expanded';
		const label = expanded ? 'Collapse page outline' : 'Expand page outline';
		toggle.setAttribute('aria-expanded', String(expanded));
		toggle.setAttribute('aria-label', label);
		toggle.title = label;
	};
	const labelLinks = () => {
		for (const link of toc.querySelectorAll<HTMLAnchorElement>('a')) {
			const label = link.textContent?.trim() || '';
			link.dataset.outlineLabel = label;
			link.setAttribute('aria-label', label);
			link.removeAttribute('title');
			const nested = link.closest('ul')?.parentElement?.tagName === 'LI';
			link.dataset.outlineNested = String(
				nested || Number(link.style.getPropertyValue('--depth')) > 0,
			);
		}
	};
	labelLinks();
	const positionLabel = (event: Event) => {
		const link =
			event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a') : null;
		if (!link || !toc.contains(link)) return;
		const box = link.getBoundingClientRect();
		link.style.setProperty('--docs-outline-label-x', `${box.left}px`);
		link.style.setProperty('--docs-outline-label-y', `${box.top + box.height / 2}px`);
	};
	toc.addEventListener('pointerover', positionLabel);
	toc.addEventListener('focusin', positionLabel);
	// Archived releases replace the contents list after loading their Markdown.
	new MutationObserver(labelLinks).observe(toc, {
		childList: true,
		subtree: true,
		characterData: true,
	});
	syncToggle();
	toggle.hidden = false;
	toggle.addEventListener('click', () => {
		root.dataset.docsOutline = root.dataset.docsOutline === 'expanded' ? 'compact' : 'expanded';
		try {
			localStorage.setItem('yosoi-outline', root.dataset.docsOutline);
		} catch {
			/* Session-only preference. */
		}
		syncToggle();
	});
}
