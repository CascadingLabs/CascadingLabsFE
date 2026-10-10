import type { StarlightRouteData } from '@astrojs/starlight/route-data';
import type { DocPage, NavNode } from './yosoi-snapshot';
import { docHref, referenceKindLabel } from './docs-path';
type SidebarEntry = StarlightRouteData['sidebar'][number];
const containsCurrent = (entry: SidebarEntry): boolean =>
	entry.type === 'link' ? entry.isCurrent : entry.entries.some(containsCurrent);

export function sidebarForNavigation(navigation: NavNode, currentId: string): SidebarEntry[] {
	const link = (node: NavNode, label = node.title): SidebarEntry => ({
		type: 'link',
		label,
		href: docHref(node.route),
		isCurrent: currentId === ['yosoi', node.route].filter(Boolean).join('/'),
		attrs: node.kind ? { class: 'reference-item' } : {},
		badge: node.kind
			? { text: referenceKindLabel(node.kind)!, variant: 'note', class: 'reference-kind-badge' }
			: undefined,
	});
	const entry = (node: NavNode): SidebarEntry => {
		if (!node.children.length && node.collapsed === undefined) return link(node);
		const entries = [...(node.id ? [link(node, 'Overview')] : []), ...node.children.map(entry)];
		return {
			type: 'group',
			label: node.title,
			entries,
			collapsed: (node.collapsed ?? navigation.collapsed ?? true) && !entries.some(containsCurrent),
			badge: undefined,
		};
	};
	return [...(navigation.id ? [link(navigation)] : []), ...navigation.children.map(entry)];
}

export function paginationForSidebar(
	sidebar: SidebarEntry[],
	pages: DocPage[],
): StarlightRouteData['pagination'] {
	const links = (entries: SidebarEntry[]): Extract<SidebarEntry, { type: 'link' }>[] =>
		entries.flatMap((entry) => (entry.type === 'link' ? [entry] : links(entry.entries)));
	const ordered = links(sidebar);
	const index = ordered.findIndex((entry) => entry.isCurrent);
	if (index < 0) return { prev: undefined, next: undefined };
	const titles = new Map(pages.map((page) => [docHref(page.route), page.title]));
	const link = (entry: (typeof ordered)[number] | undefined) =>
		entry && { ...entry, label: titles.get(entry.href) || entry.label };
	return { prev: link(ordered[index - 1]), next: link(ordered[index + 1]) };
}
