import DOMPurify from 'dompurify';
import { enhanceCodeBlocks } from './docs-code';
import {
	archiveHref,
	parseReleaseRegistry,
	rawArtifactUrl,
	releaseFilePath,
} from '../lib/docs-releases';
import { fetchVerified, loadArchiveManifest, renderArchiveContent } from '../lib/docs-archive';
import { paginationForSidebar, sidebarForNavigation } from '../lib/docs-sidebar';
import type { NavNode } from '../lib/yosoi-snapshot';
import { referenceKindLabel } from '../lib/docs-path';

const view = document.querySelector<HTMLElement>('#docs-archive-view');
let outlineEvents: AbortController | undefined;
if (view) void renderArchive(view);
export async function renderArchive(
	view: HTMLElement,
	releases: unknown = JSON.parse(
		view.dataset.releases || '{"schemaVersion":1,"latest":null,"versions":[]}',
	),
) {
	try {
		const registry = parseReleaseRegistry(releases);
		const url = new URL(location.href);
		const release = registry.versions.find(
			(item) => item.version === url.searchParams.get('version'),
		);
		if (!release) throw new Error('This documentation release is unavailable.');
		const manifest = await loadArchiveManifest(release);
		const requested = url.searchParams.get('page') || '';
		const page =
			manifest.pages.find((item) => item.route === requested) ||
			manifest.pages.find((item) => !item.route)!;
		const html = new TextDecoder().decode(
			await fetchVerified(release, releaseFilePath(release, page.file), page.sha256),
		);
		const fragment = DOMPurify.sanitize(renderArchiveContent(page, html, manifest), {
			USE_PROFILES: { html: true },
			RETURN_DOM_FRAGMENT: true,
		});
		for (const anchor of fragment.querySelectorAll<HTMLAnchorElement>('a[href]')) {
			const href = anchor.getAttribute('href')!;
			if (href.startsWith('/yosoi/')) {
				const target = new URL(href, location.origin);
				const route = target.pathname.slice('/yosoi/'.length).replace(/\/$/, '');
				if (manifest.pages.some((item) => item.route === route))
					anchor.href = archiveHref(release.version, route) + target.hash;
			} else if (!href.startsWith('#') && !/^(?:[a-z]+:|\/)/i.test(href)) {
				const target = new URL(href, `https://archive.invalid/${page.file}`);
				const linked = manifest.pages.find((item) => '/' + item.file === target.pathname);
				if (linked) anchor.href = archiveHref(release.version, linked.route) + target.hash;
			}
		}
		for (const image of fragment.querySelectorAll<HTMLImageElement>('img[src]')) {
			const src = image.getAttribute('src')!;
			if (src.startsWith('/yosoi/assets/')) {
				const asset = manifest.assets[src.slice('/yosoi/'.length)];
				if (asset) image.src = rawArtifactUrl(release, releaseFilePath(release, asset.file));
				else image.removeAttribute('src');
			} else if (!/^(?:[a-z]+:|\/)/i.test(src)) {
				const target = new URL(src, `https://archive.invalid/${page.file}`);
				const asset = Object.values(manifest.assets).find(
					(item) => '/' + item.file === target.pathname,
				);
				if (asset) image.src = rawArtifactUrl(release, releaseFilePath(release, asset.file));
				else image.removeAttribute('src');
			}
		}
		view.replaceChildren(fragment);
		if (page.route !== requested) {
			const note = document.createElement('p');
			note.textContent = `This page is unavailable in ${release.tag}. Showing the overview.`;
			view.prepend(note);
		}
		const title = document.querySelector('main h1');
		if (title) title.textContent = page.title;
		document.title = `${page.title} | Yosoi ${release.tag}`;
		const sidebar = document.querySelector('sl-sidebar-state-persist > ul');
		// Borrow Starlight's rendered templates, including its scoped CSS classes and caret.
		const scoped = <K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] =>
			(sidebar?.querySelector(tag)?.cloneNode(false) ||
				document.createElement(tag)) as HTMLElementTagNameMap[K];
		const summaryTemplate = sidebar?.querySelector('summary');
		const link = (node: NavNode, label = node.title) => {
			const li = scoped('li');
			const a = scoped('a');
			a.removeAttribute('aria-current');
			a.href = archiveHref(release.version, node.route);
			const name = document.createElement('span');
			name.textContent = label;
			a.replaceChildren(name);
			if (node.kind) {
				a.classList.add('reference-item');
				const badge = document.createElement('span');
				badge.className = 'reference-kind-badge';
				badge.textContent = referenceKindLabel(node.kind)!;
				a.append(badge);
			} else a.classList.remove('reference-item');
			if (node.route === page.route) a.setAttribute('aria-current', 'page');
			li.append(a);
			return li;
		};
		const group = (node: NavNode): HTMLLIElement => {
			if (!node.children.length && node.collapsed === undefined) return link(node);
			const li = scoped('li');
			const details = scoped('details');
			const active = (child: NavNode): boolean =>
				(child.id !== undefined && child.route === page.route) || child.children.some(active);
			details.open = active(node) || node.collapsed === false;
			const summary = (summaryTemplate?.cloneNode(true) ||
				document.createElement('summary')) as HTMLElement;
			const label = summary.querySelector('.group-label') || document.createElement('span');
			label.classList.add('group-label');
			label.textContent = node.title;
			if (!label.parentNode) summary.append(label);
			const ul = scoped('ul');
			if (node.id !== undefined) ul.append(link(node, 'Overview'));
			ul.append(...node.children.map(group));
			details.append(summary, ul);
			li.append(details);
			return li;
		};
		sidebar?.replaceChildren(
			...(manifest.navigation.id !== undefined ? [link(manifest.navigation)] : []),
			...manifest.navigation.children.map(group),
		);
		const headings = [...view.querySelectorAll<HTMLHeadingElement>('h2,h3')];
		const used = new Map<string, number>();
		const reserved = new Set([...view.querySelectorAll('[id]')].map((item) => item.id));
		const outline = headings.map((heading) => {
			const label = heading.textContent || 'Section';
			const base =
				heading.textContent
					?.toLowerCase()
					.replace(/[^\p{L}\p{N}]+/gu, '-')
					.replace(/^-|-$/g, '') || 'section';
			if (!heading.id) {
				let count = used.get(base) || 0;
				let id = base + (count ? `-${count}` : '');
				while (reserved.has(id)) id = base + `-${++count}`;
				used.set(base, count + 1);
				heading.id = id;
				reserved.add(id);
			}
			const permalink = document.createElement('a');
			permalink.className = 'docs-heading-link';
			permalink.href = '#' + encodeURIComponent(heading.id);
			permalink.textContent = '#';
			permalink.setAttribute('aria-label', `Link to ${label}`);
			heading.append(' ', permalink);
			const li = document.createElement('li');
			const a = document.createElement('a');
			a.href = permalink.getAttribute('href')!;
			a.textContent = label;
			a.style.setProperty('--depth', heading.tagName === 'H3' ? '1' : '0');
			li.append(a);
			return li;
		});
		for (const toc of document.querySelectorAll('starlight-toc, mobile-starlight-toc')) {
			const list = toc.querySelector('ul');
			const template = list?.querySelector('a');
			list?.replaceChildren(
				...outline.map((item) => {
					const copy = item.cloneNode(true) as HTMLLIElement;
					// Keep Starlight's scoped outline styling for both layouts.
					copy.className = list.querySelector('li')?.className || '';
					copy.querySelector('a')!.className = template?.className || '';
					copy.querySelector('a')!.addEventListener('click', () => {
						const details = toc.querySelector('details');
						if (details) details.open = false;
					});
					return copy;
				}),
			);
		}
		// Starlight captures its static headings before the archive fetch completes.
		// Track the loaded headings without relying on its private observer lifecycle.
		outlineEvents?.abort();
		outlineEvents = new AbortController();
		let scheduled = false;
		const updateOutline = () => {
			scheduled = false;
			const top =
				(headings[0] ? parseFloat(getComputedStyle(headings[0]).scrollMarginTop) || 0 : 0) +
				(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
			const active =
				headings.filter((heading) => heading.getBoundingClientRect().top <= top + 1).at(-1) ||
				headings[0];
			for (const toc of document.querySelectorAll('starlight-toc, mobile-starlight-toc')) {
				for (const link of toc.querySelectorAll<HTMLAnchorElement>('a')) {
					if (active && link.hash === '#' + encodeURIComponent(active.id)) {
						link.setAttribute('aria-current', 'true');
						const display = toc.querySelector('.display-current');
						if (display) display.textContent = link.textContent;
					} else link.removeAttribute('aria-current');
				}
			}
		};
		const scheduleOutline = () => {
			if (!scheduled) {
				scheduled = true;
				requestAnimationFrame(updateOutline);
			}
		};
		window.addEventListener('scroll', scheduleOutline, {
			passive: true,
			signal: outlineEvents.signal,
		});
		window.addEventListener('resize', scheduleOutline, { signal: outlineEvents.signal });
		scheduleOutline();
		enhanceCodeBlocks(view);
		if (location.hash) {
			try {
				document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
			} catch {
				/* Ignore malformed URL fragments. */
			}
		}
		const footer = document.querySelector('.pagination-links');
		const pages = manifest.pages.map((item) => ({ ...item, id: item.route || 'index', order: 0 }));
		const pagination = paginationForSidebar(
			sidebarForNavigation(manifest.navigation, ['yosoi', page.route].filter(Boolean).join('/')),
			pages,
		);
		const controls = (['prev', 'next'] as const).flatMap((direction) => {
			const target = pagination[direction];
			if (!target) return [];
			const a = document.createElement('a');
			a.className = [...(footer?.classList || [])]
				.filter((name) => name.startsWith('astro-'))
				.join(' ');
			a.rel = direction;
			const route = new URL(target.href, location.origin).pathname
				.slice('/yosoi/'.length)
				.replace(/\/$/, '');
			a.href = archiveHref(release.version, route);
			a.textContent = `${direction === 'prev' ? 'Go back' : 'Next'} · ${target.label}`;
			return [a];
		});
		footer?.replaceChildren(...controls);
		const search = document.querySelector<HTMLButtonElement>('.starlight-docs-search button');
		if (search) search.setAttribute('aria-label', 'Search latest documentation');
	} catch (error) {
		const message = document.createElement('p');
		message.setAttribute('role', 'alert');
		message.textContent = `${error instanceof Error ? error.message : 'Unable to load release documentation.'} Try reloading, or read the latest documentation.`;
		const latest = document.createElement('a');
		latest.href = '/yosoi/';
		latest.textContent = 'Latest documentation';
		view.replaceChildren(message, latest);
	}
}
