import { expect, test } from 'vite-plus/test';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from './prepare.mjs';
import { launchDocsBrowser } from './browser.mjs';

test('built Markdown exposes code copy, release permalinks and responsive outlines', async () => {
	const root = path.join(projectRoot, 'dist');
	const server = createServer(async (req, res) => {
		try {
			let file = new URL(req.url, 'http://local').pathname;
			if (file.endsWith('/')) file += 'index.html';
			const target = path.resolve(root, '.' + decodeURIComponent(file));
			if (!target.startsWith(root + path.sep)) throw new Error('path');
			const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
			res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
			res.end(await readFile(target));
		} catch {
			res.writeHead(404).end();
		}
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const base = process.env.DOCS_CONTROLS_URL || `http://127.0.0.1:${server.address().port}`;
	let browser;
	try {
		browser = await launchDocsBrowser();
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		page.setDefaultTimeout(10000);
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.goto(base + '/yosoi/archive/?version=0.1.0&page=python%2Fworkflows#search');
		const search = page.getByRole('link', { name: 'Link to Search', exact: true });
		await search.waitFor();
		expect(
			await page.locator('#search').evaluate((el) => el.getBoundingClientRect().top),
		).toBeGreaterThan(64);
		expect(
			await page.locator('#search').evaluate((el) => el.getBoundingClientRect().top),
		).toBeLessThan(200);
		const code = page.locator('#docs-archive-view pre code').last();
		await page.getByRole('button', { name: 'Copy code', exact: true }).last().click();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
			await code.textContent(),
		);
		await search.click();
		expect(new URL(page.url()).hash).toBe('#search');
		expect(new URL(page.url()).searchParams.get('page')).toBe('python/workflows');
		await page.setViewportSize({ width: 390, height: 844 });
		await page.locator('mobile-starlight-toc summary').click();
		const outline = page.locator('mobile-starlight-toc a[href="#review-locally"]');
		await outline.click();
		expect(new URL(page.url()).hash).toBe('#review-locally');
		expect(await page.locator('mobile-starlight-toc details').getAttribute('open')).toBeNull();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true,
		);
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto(base + '/yosoi/archive/?version=0.1.0&page=python%2Fworkflows#search');
		await search.waitFor();
		await page.evaluate(() => document.fonts.ready);
		await page.locator('#search').evaluate((el) => el.scrollIntoView());
		await expect
			.poll(() => page.locator('starlight-toc a[href="#search"]').getAttribute('aria-current'))
			.toBe('true');
		for (const theme of ['light', 'dark']) {
			await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
			const colors = await code.evaluate((el) => ({
				color: getComputedStyle(el).color,
				background: getComputedStyle(el.closest('pre')).backgroundColor,
			}));
			expect(colors.color).not.toBe(colors.background);
		}
		await mkdir(path.join(projectRoot, '.generated/qa'), { recursive: true });
		await page.screenshot({ path: path.join(projectRoot, '.generated/qa/archive-controls.png') });
		await page
			.locator('#docs-archive-view')
			.getByRole('link', { name: 'compatibility', exact: true })
			.click();
		await page.getByRole('heading', { name: 'Python compatibility status', exact: true }).waitFor();
		expect(new URL(page.url()).searchParams.get('version')).toBe('0.1.0');
		await page.goto(base + '/yosoi/python/workflows/');
		await page.getByRole('button', { name: 'Copy code', exact: true }).first().waitFor();
		expect(errors).toEqual([]);
	} finally {
		await browser?.close();
		await new Promise((resolve) => server.close(resolve));
	}
}, 30000);
