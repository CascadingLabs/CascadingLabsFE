export const docHref = (route: string) => `/yosoi/${route ? `${route}/` : ''}`;
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
