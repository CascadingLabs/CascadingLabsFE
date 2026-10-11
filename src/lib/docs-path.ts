export const docHref = (route: string) => `/yosoi/${route ? `${route}/` : ''}`;
export const referenceLanguageBadge = (route: string) => {
	const language = route === 'api' ? 'rust' : route === 'python-api' ? 'python' : undefined;
	return language
		? {
				text: '',
				variant: 'default' as const,
				class: `reference-language-icon reference-language-${language}`,
			}
		: undefined;
};
export const referenceLinkAttributes = (kind: string, label: string) => ({
	class: 'reference-item',
	'data-kind': kind,
	title: `${label} (${kind.replaceAll('_', ' ')})`,
	'aria-label': `${label}, ${kind.replaceAll('_', ' ')}`,
});
export const referenceKindLabel = (kind?: string) =>
	kind
		? (
				{
					function: 'fn',
					type_alias: 'type',
					proc_macro: 'macro',
					reexport: 'export',
					constant: 'const',
				} as Record<string, string>
			)[kind] || kind
		: undefined;
