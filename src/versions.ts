export interface Version {
	slug: string;
	label: string;
}

/**
 * Add archived versions here as they are released.
 * The first entry is shown at the top of the dropdown (most recent archive).
 * "Latest" is always prepended automatically by the component.
 *
 * Convention: archived docs are published under /<product>/versions/<version>/.
 */
export const versions: Version[] = [
	{ slug: '0.0.2a18', label: '0.0.2a18' },
	{ slug: '0.0.1a18', label: '0.0.1a18' },
];

export const currentLabel = 'Latest';
