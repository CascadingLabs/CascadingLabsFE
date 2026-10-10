import { expect, test } from 'vite-plus/test';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from './prepare.mjs';
import { launchDocsBrowser } from './browser.mjs';

test('built site renders the source-owned sidebar, static docs, themes, and indexed search', async () => {
	const root = path.join(projectRoot, 'dist');
	const types = {
		'.html': 'text/html',
		'.css': 'text/css',
		'.js': 'application/javascript',
		'.svg': 'image/svg+xml',
		'.png': 'image/png',
		'.woff2': 'font/woff2',
		'.wasm': 'application/wasm',
	};
	const server = createServer(async (req, res) => {
		try {
			let file = new URL(req.url, 'http://local').pathname;
			if (file.endsWith('/')) file += 'index.html';
			const target = path.resolve(root, '.' + decodeURIComponent(file));
			if (!target.startsWith(root + path.sep)) throw new Error('path');
			res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
			res.end(await readFile(target));
		} catch {
			res.statusCode = 404;
			res.end('Not found');
		}
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	const url = `http://127.0.0.1:${server.address().port}`;
	let browser;
	try {
		browser = await launchDocsBrowser();
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
			colorScheme: 'light',
		});
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(url + '/yosoi/quickstart/');
		const snapshot = JSON.parse(
			await readFile(path.join(projectRoot, '.generated/yosoi/routes.json'), 'utf8'),
		);
		const labels = await page
			.locator('sl-sidebar-state-persist > ul > li > details > summary .group-label')
			.allTextContents();
		expect(labels.map((label) => label.trim())).toEqual(
			snapshot.navigation.children.map((node) => node.title),
		);
		expect(await page.locator('h1').count()).toBe(1);
		expect(await page.locator('a[href="#install-the-cli"]').count()).toBeGreaterThan(0);
		expect(await page.locator('.pagination-links a[rel="prev"]').getAttribute('href')).toBe(
			'/yosoi/',
		);
		expect(await page.locator('.pagination-links a[rel="prev"]').innerText()).toContain('Go back');
		expect(await page.locator('.pagination-links a[rel="next"]').getAttribute('href')).toBe(
			'/yosoi/cli/',
		);
		expect(await page.getByRole('combobox', { name: 'Documentation release' }).inputValue()).toBe(
			'latest',
		);
		expect((await page.locator('.docs-release-select').boundingBox()).width).toBeLessThan(140);
		const screenshots = path.join(projectRoot, '.generated/qa');
		await mkdir(screenshots, { recursive: true });
		await page
			.locator('.starlight-docs-header')
			.screenshot({ path: path.join(screenshots, 'docs-header.png') });
		await page
			.locator('.pagination-links')
			.screenshot({ path: path.join(screenshots, 'docs-pagination.png') });
		await page
			.getByRole('button', { name: 'Color theme: Auto. Click to change.', exact: true })
			.click();
		await page
			.getByRole('button', { name: 'Color theme: Light. Click to change.', exact: true })
			.click();
		await page.reload();
		expect(await page.locator('html').getAttribute('data-theme-preference')).toBe('dark');
		await page.getByRole('button', { name: 'Search', exact: true }).click();
		await page.locator('dialog input').fill('quickstart');
		await page
			.locator('dialog .pagefind-ui__result-link')
			.filter({ hasText: 'quickstart' })
			.first()
			.waitFor();
		await page.keyboard.press('Escape');
		expect(await page.getByRole('link', { name: 'GitHub', exact: true }).getAttribute('href')).toBe(
			'https://github.com/CascadingLabs/Yosoi',
		);
		expect(
			await page.getByRole('link', { name: 'Discord', exact: true }).getAttribute('href'),
		).toBe('https://discord.gg/YreV3CzxsE');
		await page.setViewportSize({ width: 390, height: 844 });
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true,
		);
		await page.getByRole('button', { name: 'Menu', exact: true }).click();
		expect(
			await page.locator('#starlight__sidebar').evaluate((el) => el.matches(':popover-open')),
		).toBe(true);
		expect(errors).toEqual([]);
		const nojs = await browser.newContext({ javaScriptEnabled: false });
		const staticPage = await nojs.newPage();
		for (const route of ['/yosoi/', '/yosoi/quickstart/', '/yosoi/api/']) {
			const response = await staticPage.goto(url + route);
			expect(response.status()).toBe(200);
			expect((await staticPage.locator('main').innerText()).length).toBeGreaterThan(50);
			expect(await staticPage.content()).not.toContain('__yosoi_docs_reload');
			expect(await staticPage.locator('astro-island').count()).toBe(0);
		}
	} finally {
		await browser?.close();
		await new Promise((resolve) => server.close(resolve));
	}
}, 30000);
