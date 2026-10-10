import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { readSnapshot } from './lib/yosoi-snapshot';
import { paginationForSidebar, sidebarForNavigation } from './lib/docs-sidebar';

export const onRequest = defineRouteMiddleware(({ locals }, next) => {
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
