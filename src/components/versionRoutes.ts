const VERSION_RE = /^\d+\.\d+\.\d+[a-zA-Z]*\d*$/;
const PRODUCTS = new Set(['yosoi', 'voidcrawl', 'opensesame']);

export interface VersionPathInfo {
	isVersioned: boolean;
	currentSlug: string;
	barePath: string;
	product: string;
}

function normalizePath(pathname: string): string {
	if (!pathname.startsWith('/')) {
		return `/${pathname}`;
	}
	return pathname;
}

function joinPath(parts: string[], trailingSlash: boolean): string {
	const joined = `/${parts.filter(Boolean).join('/')}`;
	return trailingSlash && joined !== '/' ? `${joined}/` : joined;
}

export function getVersionInfoFromPath(pathname: string): VersionPathInfo {
	const path = normalizePath(pathname);
	const segs = path.split('/').filter(Boolean);
	const product = PRODUCTS.has(segs[0] ?? '') ? segs[0] : '';

	if (product && segs[1] === 'versions' && segs[2]) {
		return {
			isVersioned: true,
			currentSlug: segs[2],
			product,
			barePath:
				joinPath([product, ...segs.slice(3)], path.endsWith('/')) ||
				`/${product}/`,
		};
	}

	const first = segs[0] ?? '';
	const isLegacyVersioned = VERSION_RE.test(first);
	return {
		isVersioned: isLegacyVersioned,
		currentSlug: isLegacyVersioned ? first : '',
		product,
		barePath: isLegacyVersioned ? path.replace(/^\/[^/]+/, '') || '/' : path,
	};
}

export function buildVersionPath(pathname: string, slug: string): string {
	const info = getVersionInfoFromPath(pathname);
	if (!slug) {
		return info.barePath;
	}
	if (!info.product) {
		return `/${slug}${info.barePath === '/' ? '' : info.barePath}`;
	}

	const productRoot = `/${info.product}`;
	const suffix =
		info.barePath === productRoot
			? ''
			: info.barePath.slice(productRoot.length);
	return `${productRoot}/versions/${slug}${suffix}`;
}
