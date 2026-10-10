import { expect, test } from 'vite-plus/test';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from './prepare.mjs';
import { launchDocsBrowser } from './browser.mjs';

test('reference renders a flat namespace list, kind badges, overview tables, and grouped outlines', async () => {
	const root = path.join(projectRoot, 'dist');
	const mime = {
		'.html': 'text/html',
		'.css': 'text/css',
		'.js': 'application/javascript',
		'.svg': 'image/svg+xml',
		'.png': 'image/png',
		'.woff2': 'font/woff2',
	};
	const server = createServer(async (req, res) => {
		try {
			let file = new URL(req.url, 'http://local').pathname;
			if (file.endsWith('/')) file += 'index.html';
			const target = path.resolve(root, '.' + file);
			if (!target.startsWith(root + path.sep)) throw new Error('path');
			res.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
			res.end(await readFile(target));
		} catch {
			res.writeHead(404).end();
		}
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	let browser;
	try {
		browser = await launchDocsBrowser();
		const page = await browser.newPage({
			viewport: { width: 1440, height: 1000 },
			colorScheme: 'dark',
		});
		const base = `http://127.0.0.1:${server.address().port}`;
		const response = await page.goto(base + '/yosoi/api/yosoi/locators/enum/completeness/');
		expect(response.status()).toBe(200);
		const labels = await page.locator('.sidebar summary .large').allTextContents();
		expect(labels).toContain('Locators');
		for (const kind of ['enum', 'struct', 'function', 'yosoi sdk'])
			expect(labels).not.toContain(kind);
		const selected = page.locator('.sidebar a[aria-current="page"]');
		expect(await selected.locator('.reference-kind-badge').innerText()).toBe('enum');
		expect(await page.locator('main h1').innerText()).toBe('Completeness');
		expect(
			(await page.locator('starlight-toc a').allTextContents()).map((text) => text.trim()),
		).toEqual(['Overview', 'Variants', 'Trait implementations']);
		expect(await page.locator('details.reference-implementation[open]').count()).toBe(0);
		await page
			.locator('details.reference-implementation summary')
			.filter({ hasText: 'Clone' })
			.click();
		expect(await page.locator('details.reference-implementation[open]').innerText()).toContain(
			'clone',
		);
		await page.locator('details.reference-implementation[open] summary').click();
		await page.locator('main h1').scrollIntoViewIfNeeded();
		const screenshots = path.join(projectRoot, '.generated/qa');
		await mkdir(screenshots, { recursive: true });
		await page.screenshot({ path: path.join(screenshots, 'reference-namespace.png') });
		await page.goto(base + '/yosoi/api/yosoi/module/locators/');
		expect(await page.locator('main table thead').innerText()).toContain('Summary');
		expect(
			await page
				.locator('main table a[href="/yosoi/api/yosoi/locators/enum/completeness/"]')
				.count(),
		).toBe(1);
		const nojs = await browser.newContext({ javaScriptEnabled: false });
		const staticPage = await nojs.newPage();
		await staticPage.goto(base + '/yosoi/api/yosoi/locators/enum/completeness/');
		await staticPage
			.locator('details.reference-implementation summary')
			.filter({ hasText: 'Clone' })
			.click();
		expect(
			await staticPage.locator('details.reference-implementation[open]').innerText(),
		).toContain('clone');
	} finally {
		await browser?.close();
		await new Promise((resolve) => server.close(resolve));
	}
}, 30000);
