import { expect, test } from 'vite-plus/test';
import { markdownToHtml } from 'satteri';
import { referenceMarkdown, referenceSummary } from './reference.mjs';
import { referenceNavigation } from './navigation.mjs';
const item = (name, kind, namespace = 'locators') => ({
	id: `api/${namespace}/${kind}/${name.toLowerCase()}`,
	route: `api/${namespace}/${kind}/${name.toLowerCase()}`,
	title: name,
	kind,
	publicPath: `yosoi::${namespace}::${name}`,
	order: 0,
});

test('reference lists namespace items alphabetically with kinds rather than kind folders', () => {
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
	expect(tree.children.map((node) => node.title)).toEqual(['Locators']);
	const locators = tree.children[0];
	expect(locators.route).toBe('api/yosoi/module/locators');
	expect(locators.children.map((node) => node.title)).toEqual([
		'Alpha',
		'locate',
		'Locator',
		'Zulu',
	]);
	expect(locators.children.find((node) => node.title === 'Alpha')).toMatchObject({
		route: pages[3].route,
		kind: 'enum',
	});
	expect(locators.children.find((node) => node.title === 'Locator').children[0].title).toBe(
		'build',
	);
});
test('namespace overview tables include stable links, item kinds, and escaped summaries', () => {
	const page = {
		kind: 'module',
		publicPath: 'yosoi::locators',
		signature: 'pub mod locators',
		docs: 'Locate documents.',
		members: [],
	};
	const markdown = referenceMarkdown(page, { sdk: { crate: 'yosoi' } }, [
		{ ...item('Completeness', 'enum'), summary: 'A | B' },
	]);
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
