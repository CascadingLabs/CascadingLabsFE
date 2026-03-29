export interface Version {
	slug: string;
	label: string;
}

/**
 * Add archived versions here as they are released.
 * The first entry is shown at the top of the dropdown (most recent archive).
 * "Latest" is always prepended automatically by the component.
 *
 * Convention: archived docs live at docs/yosoi-docs/<slug>/
 */
export const versions: Version[] = [
	{ slug: '0.0.1a14', label: '0.0.1a14' },
	{ slug: '0.0.1a13', label: '0.0.1a13' },
	// { slug: 'a11', label: '0.0.1-alpha.11' },
];

export const currentLabel = 'Latest';
