import { describe, expect, it } from 'vitest';
import { buildVersionPath, getVersionInfoFromPath } from './versionRoutes';

describe('version route helpers', () => {
	it('recognizes latest product routes', () => {
		expect(
			getVersionInfoFromPath('/voidcrawl/reference/api-reference/'),
		).toEqual({
			isVersioned: false,
			currentSlug: '',
			product: 'voidcrawl',
			barePath: '/voidcrawl/reference/api-reference/',
		});
	});

	it('recognizes product-scoped archive routes', () => {
		expect(
			getVersionInfoFromPath(
				'/opensesame/versions/0.1.0/reference/api-reference/',
			),
		).toEqual({
			isVersioned: true,
			currentSlug: '0.1.0',
			product: 'opensesame',
			barePath: '/opensesame/reference/api-reference/',
		});
	});

	it('builds product-scoped archive links from latest routes', () => {
		expect(buildVersionPath('/yosoi/reference/classes/', '0.0.2a18')).toBe(
			'/yosoi/versions/0.0.2a18/reference/classes/',
		);
	});

	it('switches product-scoped archive links back to latest', () => {
		expect(
			buildVersionPath(
				'/voidcrawl/versions/v0.3.6/reference/api-reference/',
				'',
			),
		).toBe('/voidcrawl/reference/api-reference/');
	});

	it('switches between product-scoped archive versions', () => {
		expect(
			buildVersionPath('/opensesame/versions/0.1.0/quickstart/', '0.1.1'),
		).toBe('/opensesame/versions/0.1.1/quickstart/');
	});

	it('keeps legacy root-level archive support for existing snapshots', () => {
		expect(buildVersionPath('/0.0.2a18/yosoi/quickstart/', '0.0.1a18')).toBe(
			'/0.0.1a18/yosoi/quickstart/',
		);
		expect(buildVersionPath('/0.0.2a18/yosoi/quickstart/', '')).toBe(
			'/yosoi/quickstart/',
		);
	});
});
