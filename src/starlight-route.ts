import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { readSnapshot } from './lib/yosoi-snapshot';
import { paginationForSidebar, sidebarForNavigation } from './lib/docs-sidebar';

export const onRequest = defineRouteMiddleware(({ locals }, next) => {
	const { toc } = locals.starlightRoute;
	if (toc) {
		// The page title is implicit; outlines list only content headings.
		toc.items = toc.items.flatMap((item) => (item.slug === '_top' ? item.children : [item]));
	}
	const snapshot = readSnapshot();
	locals.starlightRoute.sidebar = sidebarForNavigation(
		snapshot.navigation,
		locals.starlightRoute.id,
	);
	locals.starlightRoute.pagination = paginationForSidebar(
		locals.starlightRoute.sidebar,
		snapshot.pages,
	);
	return next();
});
