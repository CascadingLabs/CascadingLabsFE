import { expect, test } from 'vite-plus/test';
import { paginationForSidebar, sidebarForNavigation } from '../../src/lib/docs-sidebar';
import type { NavNode } from '../../src/lib/yosoi-snapshot';
const node = (title: string, route: string, id = route): NavNode => ({
	title,
	route,
	id,
	order: 0,
	children: [],
});
const navigation: NavNode = {
	title: 'Yosoi',
	route: '',
	order: 0,
	collapsed: true,
	children: [
		{
			title: 'Getting started',
			route: '',
			order: 0,
			collapsed: true,
			children: [node('Overview', '', 'index'), node('Quick start', 'quickstart')],
		},
		{
			title: 'Terminal tools',
			route: 'cli',
			id: 'cli',
			order: 1,
			collapsed: true,
			children: [node('Map', 'cli/map'), node('Search', 'cli/search')],
		},
		{ title: 'Reference', route: 'api', id: 'api', order: 2, collapsed: true, children: [] },
	],
};

test('pagination follows visible source ordering, includes collapsed groups, and respects its boundaries', () => {
	const pages = [{ id: 'cli', file: 'cli/index.md', route: 'cli', title: 'CLI', order: 0 }];
	expect(
		paginationForSidebar(sidebarForNavigation(navigation, 'yosoi/quickstart'), pages),
	).toMatchObject({
		prev: { href: '/yosoi/', label: 'Overview' },
		next: { href: '/yosoi/cli/', label: 'CLI' },
	});
	expect(
		paginationForSidebar(sidebarForNavigation(navigation, 'yosoi'), pages).prev,
	).toBeUndefined();
	expect(
		paginationForSidebar(sidebarForNavigation(navigation, 'yosoi/api'), pages).next,
	).toBeUndefined();
	const hidden = { ...navigation, children: navigation.children.slice(0, 1) };
	expect(
		paginationForSidebar(sidebarForNavigation(hidden, 'yosoi/quickstart'), pages).next,
	).toBeUndefined();
	expect(paginationForSidebar(sidebarForNavigation(hidden, 'yosoi/api'), pages)).toEqual({
		prev: undefined,
		next: undefined,
	});
});

test('the frontend uses prepared labels/order and places overview links before directory pages', () => {
	const sidebar = sidebarForNavigation(navigation, 'yosoi/cli/map');
	expect(sidebar.map((entry) => entry.label)).toEqual([
		'Getting started',
		'Terminal tools',
		'Reference',
	]);
	const cli = sidebar[1];
	if (cli.type !== 'group') throw new Error('Expected CLI group');
	expect(cli.entries.map((entry) => entry.label)).toEqual(['Overview', 'Map', 'Search']);
	expect(cli.entries.map((entry) => (entry.type === 'link' ? entry.href : null))).toEqual([
		'/yosoi/cli/',
		'/yosoi/cli/map/',
		'/yosoi/cli/search/',
	]);
});

test('only the active branch expands by default and the current page is correctly marked', () => {
	const sidebar = sidebarForNavigation(navigation, 'yosoi/cli/map');
	expect(sidebar.map((entry) => (entry.type === 'group' ? entry.collapsed : null))).toEqual([
		true,
		false,
		true,
	]);
	const cli = sidebar[1];
	if (cli.type !== 'group') throw new Error('Expected CLI group');
	expect(cli.entries.map((entry) => entry.type === 'link' && entry.isCurrent)).toEqual([
		false,
		true,
		false,
	]);
});

test('the root document and overview-only sections remain accessible', () => {
	const sidebar = sidebarForNavigation(navigation, 'yosoi');
	const introduction = sidebar[0];
	if (introduction.type !== 'group') throw new Error('Expected introduction group');
	expect(introduction.collapsed).toBe(false);
	expect(introduction.entries[0]).toMatchObject({
		type: 'link',
		href: '/yosoi/',
		isCurrent: true,
		label: 'Overview',
	});
	const reference = sidebar[2];
	if (reference.type !== 'group') throw new Error('Expected reference group');
	expect(reference.entries[0]).toMatchObject({
		type: 'link',
		href: '/yosoi/api/',
		label: 'Overview',
	});
});

test('reference kind badges stay on links and preserve the canonical item URL', () => {
	const tree = {
		...navigation,
		children: [
			{
				title: 'Reference',
				route: 'api',
				order: 0,
				collapsed: true,
				children: [
					{
						title: 'Locators',
						route: 'api/locators',
						order: 0,
						collapsed: true,
						children: [
							{ ...node('Completeness', 'api/yosoi/locators/enum/completeness'), kind: 'enum' },
						],
					},
				],
			},
		],
	};
	const sidebar = sidebarForNavigation(tree, 'yosoi/api/yosoi/locators/enum/completeness');
	const root = sidebar[0];
	if (root.type !== 'group') throw new Error('Expected reference');
	const namespace = root.entries[0];
	if (namespace.type !== 'group') throw new Error('Expected namespace');
	expect(namespace.collapsed).toBe(false);
	expect(namespace.entries[0]).toMatchObject({
		type: 'link',
		label: 'Completeness',
		href: '/yosoi/api/yosoi/locators/enum/completeness/',
		badge: { text: 'enum', class: 'reference-kind-badge' },
	});
});
