type VariantKind = 'code' | 'commands';
type Variant = { label: string; heading: HTMLElement; nodes: HTMLElement[] };

const variantKey = (label: string) =>
	label
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

function updateVariantUrl(kind: string, label: string) {
	const url = new URL(location.href);
	url.searchParams.set(kind, variantKey(label));
	try {
		const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
		const panel = target?.closest<HTMLElement>('[data-docs-variant]');
		const group = panel?.parentElement;
		if (target?.closest('.docs-variant-title') && group?.dataset.docsVariantKind === kind) {
			const selected = [...group.querySelectorAll<HTMLElement>('[data-docs-variant]')].find(
				(candidate) => candidate.dataset.docsVariant === label,
			);
			const heading = selected?.querySelector<HTMLElement>('h3');
			if (heading) url.hash = heading.id;
		}
	} catch {
		/* Leave malformed fragments alone. */
	}
	history.replaceState(history.state, '', url.pathname + url.search + url.hash);
}

function applyUrlPreferences() {
	for (const group of document.querySelectorAll<HTMLElement>('[data-docs-variant-kind]')) {
		const kind = group.dataset.docsVariantKind;
		if (!kind) continue;
		const requested = new URL(location.href).searchParams.get(kind);
		const label = [...group.querySelectorAll<HTMLElement>('[data-docs-variant]')]
			.map((panel) => panel.dataset.docsVariant)
			.find((label) => label && variantKey(label) === requested);
		if (label) group.dispatchEvent(new CustomEvent('docs:select-variant', { detail: label }));
	}
}

function headingIn(node: HTMLElement): HTMLElement | null {
	return node.matches('h2, h3') ? node : node.querySelector(':scope > h2, :scope > h3');
}

function preference(kind: VariantKind): string | null {
	try {
		return localStorage.getItem('yosoi-docs-' + kind);
	} catch {
		return null;
	}
}

function revealVariantHash() {
	const id = location.hash.slice(1);
	let decoded: string;
	try {
		decoded = decodeURIComponent(id);
	} catch {
		return;
	}
	const target = document.getElementById(decoded);
	const panel = target?.closest<HTMLElement>('[data-docs-variant]');
	if (!panel) return;
	const kind = panel.parentElement?.dataset.docsVariantKind;
	if (kind && panel.dataset.docsVariant) updateVariantUrl(kind, panel.dataset.docsVariant);
	panel.parentElement?.dispatchEvent(
		new CustomEvent('docs:select-variant', {
			detail: panel.dataset.docsVariant,
		}),
	);
	(target?.closest('.docs-variant-title')
		? panel.closest('.docs-variants')
		: target
	)?.scrollIntoView({
		behavior: 'instant',
		block: 'start',
	});
}

let listeningForHash = false;

/** Enhance explicit Markdown Example/Commands groups; retain ordinary headings and prose. */
export function enhanceCodeVariants(root: ParentNode) {
	for (const heading of root.querySelectorAll<HTMLElement>('h2')) {
		const title = heading.textContent?.trim() || '';
		const kind: VariantKind | undefined = /^Example(?:\s*:|$)/i.test(title)
			? 'code'
			: /^(?:Commands|Install)(?:\s*:|$)/i.test(title)
				? 'commands'
				: undefined;
		if (!kind || heading.dataset.docsVariants === 'true') continue;
		const anchor = heading.parentElement?.classList.contains('sl-heading-wrapper')
			? heading.parentElement
			: heading;
		const variants: Variant[] = [];
		let node = anchor.nextElementSibling as HTMLElement | null;
		let current: Variant | undefined;
		let invalid = false;
		while (node) {
			const childHeading = headingIn(node);
			if (childHeading?.tagName === 'H2') break;
			if (childHeading?.tagName === 'H3') {
				const label = childHeading.textContent?.trim() || '';
				if (!label) {
					invalid = true;
					break;
				}
				current = { label, heading: childHeading, nodes: [] };
				variants.push(current);
			}
			if (current) current.nodes.push(node);
			node = node.nextElementSibling as HTMLElement | null;
		}
		if (
			invalid ||
			variants.length < 2 ||
			new Set(variants.map((v) => variantKey(v.label))).size !== variants.length ||
			variants.some((v) => !v.nodes.some((n) => n.matches('pre') || n.querySelector('pre')))
		)
			continue;
		const first = variants[0];
		if (!first) continue;
		const labels = variants.map((variant) => variant.label);
		heading.dataset.docsVariants = 'true';
		const group = document.createElement('div');
		group.className = 'docs-variants';
		group.dataset.docsVariantKind = kind;
		const controls = document.createElement('div');
		controls.className = 'docs-variant-controls';
		controls.setAttribute('role', 'tablist');
		controls.setAttribute('aria-label', kind === 'code' ? 'Example language' : 'Command tooling');
		const buttons: HTMLButtonElement[] = [];
		const panels: HTMLElement[] = [];
		for (const variant of variants) {
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = variant.label;
			if (
				['rust', 'python', 'cargo', 'uv', 'windows', 'macos', 'linux'].includes(
					variantKey(variant.label),
				)
			) {
				const icon = document.createElement('span');
				icon.className = 'docs-variant-icon docs-variant-icon-' + variantKey(variant.label);
				icon.setAttribute('aria-hidden', 'true');
				button.prepend(icon);
			}
			button.setAttribute('role', 'tab');
			button.id = variant.heading.id + '-tab';
			const panel = document.createElement('div');
			panel.className = 'docs-variant-panel';
			panel.id = variant.heading.id + '-panel';
			panel.dataset.docsVariant = variant.label;
			panel.setAttribute('role', 'tabpanel');
			panel.setAttribute('aria-labelledby', button.id);
			button.setAttribute('aria-controls', panel.id);
			buttons.push(button);
			panels.push(panel);
			controls.append(button);
		}
		first.nodes[0]?.before(group);
		group.append(controls);
		for (const [index, variant] of variants.entries()) {
			const panel = panels[index];
			if (!panel) continue;
			for (const child of variant.nodes) panel.append(child);
			(variant.heading.closest('.sl-heading-wrapper') || variant.heading).classList.add(
				'docs-variant-title',
			);
			group.append(panel);
		}
		const select = (label: string) => {
			for (const [index, variant] of variants.entries()) {
				const selected = variant.label === label;
				const button = buttons[index];
				const panel = panels[index];
				if (!button || !panel) continue;
				button.setAttribute('aria-selected', String(selected));
				button.tabIndex = selected ? 0 : -1;
				panel.hidden = !selected;
			}
		};
		const activate = (label: string) => {
			const previousTop = group.getBoundingClientRect().top;
			updateVariantUrl(kind, label);
			try {
				localStorage.setItem('yosoi-docs-' + kind, label);
			} catch {
				/* Selection works without storage. */
			}
			for (const sibling of document.querySelectorAll<HTMLElement>(
				'[data-docs-variant-kind="' + kind + '"]',
			))
				sibling.dispatchEvent(new CustomEvent('docs:select-variant', { detail: label }));
			// Synchronized tabs can resize examples above this one. Keep the clicked
			// row at its current viewport position instead of treating it as a deep link.
			window.scrollBy({
				top: group.getBoundingClientRect().top - previousTop,
				behavior: 'instant',
			});
		};
		group.addEventListener('docs:select-variant', (event) => {
			const label = (event as CustomEvent<string>).detail;
			if (labels.includes(label)) select(label);
		});
		for (const [index, button] of buttons.entries()) {
			const variant = variants[index];
			if (!variant) continue;
			button.addEventListener('click', () => activate(variant.label));
			button.addEventListener('keydown', (event) => {
				let next: number | undefined;
				if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
				if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
				if (event.key === 'Home') next = 0;
				if (event.key === 'End') next = buttons.length - 1;
				if (next === undefined) return;
				event.preventDefault();
				const target = variants[next];
				if (!target) return;
				activate(target.label);
				buttons[next]?.focus({ preventScroll: true });
			});
		}
		const preferred = preference(kind);
		const requested = new URL(location.href).searchParams.get(kind);
		const fromUrl = labels.find((label) => variantKey(label) === requested);
		select(fromUrl || (preferred && labels.includes(preferred) ? preferred : first.label));
		if (fromUrl) updateVariantUrl(kind, fromUrl);
	}
	if (!listeningForHash) {
		window.addEventListener('hashchange', revealVariantHash);
		// A repeated outline click does not fire hashchange; hidden language headings
		// would otherwise send the browser back to the page top.
		document.addEventListener('click', (event) => {
			if (
				event.defaultPrevented ||
				event.button !== 0 ||
				event.metaKey ||
				event.ctrlKey ||
				event.shiftKey ||
				event.altKey
			)
				return;
			const link =
				event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a') : null;
			if (!link?.closest('starlight-toc, mobile-starlight-toc')) return;
			const url = new URL(link.href);
			if (
				url.pathname !== location.pathname ||
				url.search !== location.search ||
				url.hash !== location.hash
			)
				return;
			try {
				const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
				if (!target?.closest('.docs-variant-title')) return;
				event.preventDefault();
				revealVariantHash();
			} catch {
				/* Leave malformed fragments alone. */
			}
		});
		window.addEventListener('popstate', () => {
			applyUrlPreferences();
			revealVariantHash();
		});
		listeningForHash = true;
	}
	revealVariantHash();
}
