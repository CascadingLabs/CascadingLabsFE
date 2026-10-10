const href = (route) => `/yosoi/${route ? `${route}/` : ''}`;
const fence = (value, language = 'rust') => {
	const delimiter = '`'.repeat(
		Math.max(3, ...(value.match(/`+/g) || []).map((text) => text.length + 1)),
	);
	return `${delimiter}${language}\n${value}\n${delimiter}`;
};
export function referenceSummary(docs = '') {
	const paragraph =
		docs
			.trim()
			.split(/\n\s*\n/)
			.find((text) => text && !/^(#|```|~~~)/.test(text.trim())) || '';
	const plain = paragraph
		.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
		.replace(/[`*_]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return plain.length > 200 ? plain.slice(0, 197).replace(/\s+\S*$/, '') + '…' : plain;
}
export function referenceMarkdown(page, manifest, descriptors) {
	const title = page.publicPath.split('::').at(-1) || page.title;
	const source = (item) =>
		item?.url
			? `[Source: ${item.file}:${item.lineStart}](${item.url})`
			: 'Source location unavailable.';
	const parts = [
		`# ${page.publicPath === manifest.sdk.crate ? 'Reference' : title}`,
		'',
		`\`${page.publicPath}\``,
		'',
		page.signature ? fence(page.signature) : '',
		page.docs || '',
		'',
		source(page.source),
	];
	if (page.reexportSource) parts.push('', `SDK re-export: ${source(page.reexportSource)}`);
	if (page.kind === 'module') {
		const prefix = `${page.publicPath}::`;
		const children = descriptors
			.filter(
				(item) =>
					item.publicPath.startsWith(prefix) &&
					!item.publicPath.slice(prefix.length).includes('::'),
			)
			.sort((a, b) => a.publicPath.localeCompare(b.publicPath));
		if (children.length)
			parts.push(
				'',
				'## Public items',
				'',
				'| Name | Kind | Summary |',
				'| --- | --- | --- |',
				...children.map(
					(item) =>
						`| [\`${item.publicPath.slice(prefix.length)}\`](${href(item.route)}) | ${item.kind === 'module' ? 'namespace' : item.kind.replaceAll('_', ' ')} | ${(item.summary || '—').replaceAll('|', '\\|')} |`,
				),
			);
	} else {
		const members = page.members || [];
		const member = (item, depth = 3) => [
			`${'#'.repeat(depth)} ${item.publicPath.split('::').at(-1)}`,
			'',
			fence(item.signature || ''),
			'',
			item.docs || '',
			'',
			source(item.source),
			'',
		];
		const groups = [
			['Variants', members.filter((item) => item.kind === 'variant')],
			['Fields', members.filter((item) => item.kind === 'struct_field')],
			[
				'Associated items',
				members.filter((item) => ['assoc_type', 'assoc_const'].includes(item.kind) && !item.trait),
			],
			['Methods', members.filter((item) => item.kind === 'function' && !item.trait)],
		];
		for (const [label, items] of groups)
			if (items.length) parts.push('', `## ${label}`, '', ...items.flatMap((item) => member(item)));
		const traits = new Map();
		for (const item of members.filter((item) => item.trait)) {
			const items = traits.get(item.trait) || [];
			items.push(item);
			traits.set(item.trait, items);
		}
		if (traits.size) {
			parts.push('', '## Trait implementations', '');
			for (const [name, items] of [...traits].sort(([a], [b]) => a.localeCompare(b)))
				parts.push(
					`<details class="reference-implementation">`,
					`<summary><code>${name.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</code></summary>`,
					'',
					...items.flatMap((item) => member(item)),
					'</details>',
					'',
				);
		}
	}
	return parts.join('\n');
}
