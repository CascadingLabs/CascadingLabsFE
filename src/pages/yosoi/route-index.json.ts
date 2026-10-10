import type { APIRoute } from 'astro';
import { readSnapshot } from '../../lib/yosoi-snapshot';
export const GET: APIRoute = () =>
	new Response(JSON.stringify(readSnapshot().pages.map((page) => page.route)), {
		headers: { 'Content-Type': 'application/json' },
	});
