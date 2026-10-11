import { expect, test } from 'vite-plus/test';
import { markdownToHtml } from 'satteri';
import { referenceMarkdown, referenceSummary } from './reference.mjs';
import { referenceNavigation, referenceGroups } from './navigation.mjs';
const item = (name, kind, namespace = 'locators') => ({
	id: `api/${namespace}/${kind}/${name.toLowerCase()}`,
	route: `api/${namespace}/${kind}/${name.toLowerCase()}`,
	title: name,
	kind,
	publicPath: `yosoi::${namespace}::${name}`,
	order: 0,
});

test('reference retains source explanations for enum variants and their fields', () => {
	const page = {
		publicPath: 'yosoi::Example',
		kind: 'enum',
		docs: 'An outcome whose evidence may be incomplete.',
		members: [
			{
				publicPath: 'yosoi::Example::Partial',
				kind: 'variant',
				signature: 'Partial { lost: u64 }',
				docs: 'Some evidence was omitted.',
				fields: [
					{
						publicPath: 'yosoi::Example::Partial::lost',
						kind: 'struct_field',
						signature: 'lost: u64',
						docs: 'Number of omitted evidence items.',
						source: { file: 'src/lib.rs', lineStart: 12, url: 'https://example.test/source#L12' },
					},
				],
			},
		],
	};
	const markdown = referenceMarkdown(page, { sdk: { crate: 'yosoi' } }, []);
	expect(markdown).toContain('### Partial');
	expect(markdown).toContain('Some evidence was omitted.');
	expect(markdown).toContain('#### lost');
	expect(markdown).toContain('Number of omitted evidence items.');
	expect(markdown).toContain('[Source: src/lib.rs:12](https://example.test/source#L12)');
});

test('reference preserves symbol URLs with grouped and legacy source navigation', () => {
	const pages = [
		{
			id: 'api',
			route: 'api',
			title: 'Reference',
			kind: 'module',
			publicPath: 'yosoi',
			order: 0,
		},
		{
			id: 'api/yosoi/module/locators',
			route: 'api/yosoi/module/locators',
			title: 'locators',
			kind: 'module',
			publicPath: 'yosoi::locators',
			order: 0,
		},
		item('Zulu', 'struct'),
		item('Alpha', 'enum'),
		item('locate', 'function'),
		{ ...item('locator', 'module'), publicPath: 'yosoi::locators::locator' },
		item('build', 'function', 'locators::locator'),
	];
	const tree = referenceNavigation(pages);
	if (!referenceGroups) {
		// Published snapshots before grouped navigation retain alphabetical namespace lists.
		expect(tree.children.map((node) => node.title)).toEqual(['Locators']);
		const locators = tree.children[0];
		expect(locators.route).toBe('api/yosoi/module/locators');
		expect(locators.children.map((node) => node.title)).toEqual([
			'Alpha',
			'locate',
			'Locator',
			'Zulu',
		]);
		expect(locators.children[0]).toMatchObject({ route: pages[3].route, kind: 'enum' });
		expect(locators.children[2].children[0].title).toBe('build');
		return;
	}
	expect(tree.children.map((node) => node.title)).toEqual(['Modules']);
	const locators = tree.children[0].children[0];
	expect(locators.route).toBe('api/yosoi/module/locators');
	expect(locators.children.map((node) => node.title)).toEqual(['Modules', 'Types', 'Functions']);
	expect(locators.children[1].children.map((node) => node.title)).toEqual(['Alpha', 'Zulu']);
	expect(locators.children[1].children[0]).toMatchObject({
		route: pages[3].route,
		kind: 'enum',
	});
	expect(locators.children[0].children[0].children[0].children[0].title).toBe('build');
});
test('namespace overview tables include stable links, item kinds, and escaped summaries', () => {
	const page = {
		kind: 'module',
		publicPath: 'yosoi::locators',
		signature: 'pub mod locators',
		docs: 'Locate documents.',
		members: [],
	};
	const descriptors = [{ ...item('Completeness', 'enum'), summary: 'A | B' }];
	const markdown = referenceMarkdown(
		page,
		{ sdk: { crate: 'yosoi' } },
		descriptors,
		referenceGroups,
	);
	expect(markdown).toContain(referenceGroups ? '## Types' : '## Public items');
	// Injection remains independently testable when the published source lacks grouping.
	expect(
		referenceMarkdown(page, { sdk: { crate: 'yosoi' } }, descriptors, (children) => [
			{ title: 'Types', children },
		]),
	).toContain('## Types');
	// Browser archive rendering has no access to the Node-only source loader.
	expect(referenceMarkdown(page, { sdk: { crate: 'yosoi' } }, descriptors)).toContain(
		'## Public items',
	);
	expect(markdown).toContain('| Name | Kind | Summary |');
	expect(markdown).toContain('/yosoi/api/locators/enum/completeness/');
	expect(markdown).toContain('A \\| B');
	expect(referenceSummary('A **clear** [description](https://example.test).\n\nMore detail.')).toBe(
		'A clear description.',
	);
});
test('enum members retain their anchors inside sections and trait methods render as closed details', async () => {
	const page = {
		kind: 'enum',
		publicPath: 'yosoi::locators::Completeness',
		signature: 'pub enum Completeness',
		docs: 'Evidence certainty.',
		members: [
			{
				kind: 'variant',
				publicPath: 'yosoi::locators::Completeness::Complete',
				signature: 'Complete',
				docs: '',
			},
			{
				kind: 'function',
				publicPath: 'yosoi::locators::Completeness::new',
				signature: 'fn new() -> Self',
				docs: 'Construct a value.',
			},
			{
				kind: 'function',
				publicPath: 'yosoi::locators::Completeness::clone',
				signature: 'fn clone(&self) -> Self',
				docs: '',
				trait: 'Clone',
			},
		],
	};
	const markdown = referenceMarkdown(page, { sdk: { crate: 'yosoi' } }, []);
	expect(markdown).toContain('## Variants');
	expect(markdown).toContain('### Complete');
	expect(markdown).toContain('## Methods');
	expect(markdown).toContain('## Trait implementations');
	const { html } = await markdownToHtml(markdown, { features: { gfm: true } });
	expect(html).toContain('<details class="reference-implementation">');
	expect(html).toContain('<summary><code>Clone</code></summary>');
	expect(html).not.toContain('<details open');
	expect(html).toContain('clone');
});
