import { expect, test } from 'vite-plus/test';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchDocsBrowser, selectDocsRelease } from './browser.mjs';
import { projectRoot, repositoryRoot } from './prepare.mjs';

const hash = (body) => createHash('sha256').update(body).digest('hex');
test('latest and archived docs share responsive controls, themes, and pagination', async () => {
	const temp = path.join(repositoryRoot(), '.generated/frontend-tests');
	await mkdir(temp, { recursive: true });
	const root = await mkdtemp(path.join(temp, 'ui-'));
	let browser;
	let server;
	let output = '';
	try {
		for (const file of [
			'astro.config.mjs',
			'postcss.config.mjs',
			'package.json',
			'tsconfig.json',
			'scripts',
			'src',
		]) {
			await cp(path.join(projectRoot, file), path.join(root, file), {
				recursive: true,
				filter: (file) => file !== path.join(projectRoot, 'src/content'),
			});
		}
		await symlink(path.join(projectRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
		await cp(path.join(root, 'astro.config.mjs'), path.join(root, 'base.astro.config.mjs'));
		await writeFile(
			path.join(root, 'astro.config.mjs'),
			`import config from './base.astro.config.mjs';\nconfig.cacheDir = './.astro-cache';\nconfig.vite.cacheDir = './.vite';\nconfig.vite.server = { fs: { allow: ${JSON.stringify([root, path.join(projectRoot, 'node_modules')])} } };\nexport default config;\n`,
		);
		await mkdir(path.join(root, '.generated/yosoi'), { recursive: true });
		await mkdir(path.join(root, 'src/content/docs/yosoi'), { recursive: true });
		const pages = ['', 'map', 'search'].map((route, order) => ({
			route,
			order,
			id: route || 'index',
			title:
				route === 'search'
					? 'Search across multiple providers and inspect their responses'
					: route || 'Overview',
			file: `${route || 'index'}.md`,
		}));
		const navigation = {
			title: 'Docs',
			route: '',
			id: 'index',
			order: 0,
			children: pages.slice(1).map((page) => ({ ...page, children: [] })),
		};
		const snapshot = {
			schemaVersion: 1,
			mode: 'commit',
			source: { version: '0.2.1', commit: '1'.repeat(40), repository: 'Fixture/Yosoi' },
			pages,
			navigation,
			reference: { sourceCommit: '1'.repeat(40) },
		};
		await writeFile(path.join(root, '.generated/yosoi/routes.json'), JSON.stringify(snapshot));
		const code =
			'## Examples\n\n```sh\nyosoi map https://example.org/ --json\n```\n\n```python\nprint("<hello>")\n```\n\n```rust\nlet answer = 42;\n```\n\n```json\n{"ok": true}\n```\n\n```unknown\nplain <code>\n```\n';
		for (const page of pages)
			await writeFile(
				path.join(root, 'src/content/docs/yosoi', page.file),
				`---\ntitle: ${page.title}\n---\n\n${code}`,
			);
		const artifacts = new Map();
		const releases = ['0.2.1', '0.2.0', '0.1.2'].map((version) => {
			const manifest = {
				schemaVersion: 1,
				version,
				tag: `v${version}`,
				sourceCommit: '1'.repeat(40),
				navigation,
				pages: pages.map((page) => {
					const format = version === '0.1.2' ? 'html' : 'markdown';
					const body =
						format === 'html'
							? '<pre><code class="language-python">print("&lt;hello&gt;")</code></pre>'
							: code;
					artifacts.set(`/${version}/${page.file}`, body);
					return { ...page, format, sha256: hash(body) };
				}),
				assets: {},
			};
			const body = JSON.stringify(manifest);
			artifacts.set(`/${version}/manifest.json`, body);
			return {
				version,
				tag: `v${version}`,
				sourceCommit: '1'.repeat(40),
				artifactRepository: 'Fixture/Yosoi',
				artifactCommit: '2'.repeat(40),
				manifestPath: `${version}/manifest.json`,
				sha256: hash(body),
			};
		});
		await writeFile(
			path.join(root, '.generated/yosoi/releases.json'),
			JSON.stringify({ schemaVersion: 1, latest: '0.2.1', versions: releases }),
		);
		const probe = createServer();
		await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
		const port = probe.address().port;
		await new Promise((resolve) => probe.close(resolve));
		const env = { ...process.env, NODE_ENV: 'development', CI: '' };
		delete env.VITEST;
		server = spawn('bun', ['scripts/docs/serve.mjs', '--port', String(port)], {
			cwd: root,
			env,
			stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
		});
		server.stdout.on('data', (data) => {
			output += data;
		});
		server.stderr.on('data', (data) => {
			output += data;
		});
		await new Promise((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error(output)), 20000);
			server.on('message', (message) => {
				if (message?.type !== 'ready') return;
				clearTimeout(timeout);
				resolve();
			});
			server.once('exit', () => {
				clearTimeout(timeout);
				reject(new Error(output));
			});
		});
		browser = await launchDocsBrowser();
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		page.setDefaultTimeout(10000);
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.route('https://raw.githubusercontent.com/Fixture/Yosoi/**', (route) => {
			const key = new URL(route.request().url()).pathname.split('/').slice(4).join('/');
			const body = artifacts.get('/' + key);
			return route.fulfill({
				status: body ? 200 : 404,
				body: body || 'Missing',
				headers: { 'access-control-allow-origin': '*' },
			});
		});
		const origin = `http://127.0.0.1:${port}`;
		const response = await page.goto(origin + '/yosoi/map/', { waitUntil: 'networkidle' });
		if (response.status() !== 200)
			throw new Error(`UI fixture failed: ${output}\n${await page.locator('body').innerText()}`);
		const picker = page.locator('summary[aria-label="Documentation release"]');
		expect(await page.locator('.docs-release-select nav a').allTextContents()).toEqual([
			'Latest · 0.2.1',
			'v0.2.0',
			'v0.1.2',
		]);
		expect(
			await page.locator('.starlight-docs-brand').evaluate((link) => new URL(link.href).pathname),
		).toBe('/yosoi/');
		expect(await page.locator('.starlight-docs-brand').textContent()).toMatch(/Yosoi\s*\/\s*Docs/);
		const normalColor = await picker.evaluate((el) => getComputedStyle(el).color);
		await picker.hover();
		expect(await picker.evaluate((el) => getComputedStyle(el).color)).not.toBe(normalColor);
		expect(await picker.evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer');
		await picker.click();
		const option = page.locator('.docs-release-select a[data-docs-release="0.2.0"]');
		const normalBackground = await option.evaluate((el) => getComputedStyle(el).backgroundColor);
		await option.hover();
		expect(await option.evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer');
		expect(await option.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(
			normalBackground,
		);
		await page.keyboard.press('Escape');
		expect(await picker.getAttribute('aria-expanded')).toBe('false');
		await picker.focus();
		await page.keyboard.press('ArrowDown');
		expect(
			await page
				.locator('.docs-release-select a[data-docs-release="latest"]')
				.evaluate((el) => el === document.activeElement),
		).toBe(true);
		await page.keyboard.press('Escape');
		const pagination = () =>
			page
				.locator('.pagination-links')
				.evaluate((el) =>
					el.innerHTML
						.replace(/href="[^"]*"/g, 'href=""')
						.replace(/ data-astro-source-[a-z]+="[^"]*"/g, ''),
				);
		const latestPagination = await pagination();
		for (const width of [320, 390, 414, 490, 768, 1024, 1152, 1440, 1920]) {
			await page.setViewportSize({ width, height: 822 });
			await expect
				.poll(
					async () => {
						const search = await page
							.locator('.starlight-docs-search button[data-open-modal]')
							.boundingBox();
						const content = await page.locator('.main-pane .sl-container').first().boundingBox();
						return Math.abs(search.x + search.width / 2 - content.x - content.width / 2);
					},
					{ message: `Search is centered over the document at ${width}px` },
				)
				.toBeLessThan(2);
			const searchBox = await page
				.locator('.starlight-docs-search button[data-open-modal]')
				.boundingBox();
			const versionBox = await picker.boundingBox();
			const contentBox = await page.locator('.main-pane .sl-container').first().boundingBox();
			expect(
				Math.abs(searchBox.x + searchBox.width / 2 - contentBox.x - contentBox.width / 2),
			).toBeLessThan(2);
			expect(
				searchBox.x + searchBox.width <= versionBox.x ||
					searchBox.y + searchBox.height <= versionBox.y,
			).toBe(true);
			const prev = await page.locator('.pagination-links a[rel="prev"]').boundingBox();
			const next = await page.locator('.pagination-links a[rel="next"]').boundingBox();
			expect(Math.abs(prev.y - next.y)).toBeLessThan(2);
			const prevArrow = await page.locator('.pagination-links a[rel="prev"] svg').boundingBox();
			const nextArrow = await page.locator('.pagination-links a[rel="next"] svg').boundingBox();
			expect(Math.abs(prevArrow.y - nextArrow.y)).toBeLessThan(2);
			expect(prev.x + prev.width).toBeLessThanOrEqual(next.x);
			expect(versionBox.width).toBeGreaterThan(80);
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
				true,
			);
			await page.locator('.starlight-docs-search button[data-open-modal]').click();
			await page.locator('dialog[open]').waitFor();
			await page.keyboard.press('Escape');
			await picker.click();
			const menu = await page.locator('.docs-release-select nav').boundingBox();
			expect(menu.x).toBeGreaterThanOrEqual(0);
			expect(menu.x + menu.width).toBeLessThanOrEqual(width);
			await page.keyboard.press('Escape');
			if ([390, 490, 1440].includes(width)) {
				const screenshots = path.join(projectRoot, '.generated/qa');
				await mkdir(screenshots, { recursive: true });
				await page
					.locator('.page > .header')
					.screenshot({ path: path.join(screenshots, `header-${width}.png`) });
				await page
					.locator('.pagination-links')
					.screenshot({ path: path.join(screenshots, `pagination-${width}.png`) });
				await picker.click();
				await page
					.locator('.docs-release-select nav')
					.screenshot({ path: path.join(screenshots, `releases-${width}.png`) });
				await page.keyboard.press('Escape');
			}
		}
		await selectDocsRelease(page, '0.2.0');
		await page.locator('#docs-archive-view pre.astro-code').first().waitFor();
		expect(await pagination()).toBe(latestPagination);
		expect(await page.locator('#docs-archive-view pre.astro-code').count()).toBe(4);
		expect(await page.locator('code.language-unknown').innerText()).toBe('plain <code>\n');
		const token = page.locator('code.language-python span[style*="--shiki-light"]').first();
		await page.locator('html').evaluate((el) => (el.dataset.theme = 'light'));
		const light = await token.evaluate((el) => getComputedStyle(el).color);
		await page.locator('html').evaluate((el) => (el.dataset.theme = 'dark'));
		expect(await token.evaluate((el) => getComputedStyle(el).color)).not.toBe(light);
		await selectDocsRelease(page, '0.1.2');
		await page.locator('#docs-archive-view pre.astro-code').waitFor();
		expect(await page.locator('#docs-archive-view code').innerText()).toBe('print("<hello>")');
		expect(await pagination()).toBe(latestPagination);
		await selectDocsRelease(page, 'latest');
		await page.waitForURL(origin + '/yosoi/map/');
		for (const platform of ['MacIntel', 'Win32', 'Linux x86_64']) {
			const context = await browser.newContext();
			await context.addInitScript((platform) => {
				Object.defineProperty(navigator, 'platform', { get: () => platform });
			}, platform);
			const nativePage = await context.newPage();
			await nativePage.goto(origin + '/yosoi/map/', { waitUntil: 'networkidle' });
			const search = nativePage.locator('.starlight-docs-search button[data-open-modal]');
			const apple = platform === 'MacIntel';
			expect(await search.getAttribute('aria-keyshortcuts')).toBe(apple ? 'Meta+K' : 'Control+K');
			expect(await search.locator('kbd kbd').first().innerText()).toBe(apple ? '⌘' : 'Ctrl');
			await search.waitFor({ state: 'visible' });
			await nativePage.keyboard.press(apple ? 'Meta+k' : 'Control+k');
			await nativePage.locator('dialog[open]').waitFor();
			await context.close();
		}
		expect(errors).toEqual([]);
	} finally {
		await browser?.close();
		if (server && server.exitCode === null) {
			await new Promise((resolve) => {
				server.once('exit', resolve);
				server.kill('SIGTERM');
			});
		}
		if (!process.env.KEEP_DOCS_TEST_FIXTURE) await rm(root, { recursive: true, force: true });
	}
}, 45000);
