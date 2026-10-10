import { expect, test } from 'vite-plus/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { launchDocsBrowser } from './browser.mjs';
import { projectRoot } from './prepare.mjs';

test('deployed preview serves bundled latest and fetches Markdown/API pages from immutable GitHub URLs', async () => {
	const base = process.env.DOCS_PREVIEW_URL;
	if (!base) throw new Error('Set DOCS_PREVIEW_URL to the deployed Cloudflare preview.');
	const identityResponse = await fetch(new URL('/yosoi/build.json', base));
	expect(identityResponse.status).toBe(200);
	const identity = await identityResponse.json();
	if (process.env.DOCS_FRONTEND_SHA)
		expect(identity.frontendCommit).toBe(process.env.DOCS_FRONTEND_SHA);
	expect(identity.source.preview).toBe(true);
	expect(identity.source.commit).toBe(identity.bundle.sourceCommit);
	const prefix = `https://raw.githubusercontent.com/CascadingLabs/Yosoi/${identity.bundle.artifactCommit}/snapshots/${identity.source.commit}/content/`;
	let browser;
	try {
		browser = await launchDocsBrowser();
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		const errors = [];
		const rawRequests = [];
		page.on('pageerror', (error) => errors.push(error.message));
		page.on('request', (request) => {
			if (request.url().startsWith('https://raw.githubusercontent.com/'))
				rawRequests.push(request.url());
		});
		await page.goto(new URL('/yosoi/quickstart/', base).href);
		await page.getByRole('combobox', { name: 'Documentation release' }).waitFor();
		expect(await page.locator('h1').innerText()).toBe('Install and quickstart');
		expect(rawRequests).toEqual([]);
		const staticContext = await browser.newContext({ javaScriptEnabled: false });
		const staticPage = await staticContext.newPage();
		await staticPage.goto(new URL('/yosoi/quickstart/', base).href);
		expect(await staticPage.locator('main').innerText()).toContain('Fetch a page');
		await staticContext.close();
		await page
			.getByRole('combobox', { name: 'Documentation release' })
			.selectOption(identity.source.version);
		await page.locator('#docs-archive-view pre code').first().waitFor();
		expect(await page.locator('h1').innerText()).toBe('Install and quickstart');
		expect(rawRequests).toEqual([
			prefix + 'archive-manifest.json',
			prefix + 'docs/public/quickstart.md',
		]);
		await page.goto(
			new URL(`/yosoi/archive/?version=${identity.source.version}&page=api`, base).href,
		);
		await page.locator('#docs-archive-view table').waitFor();
		expect(await page.locator('#docs-archive-view').innerText()).toContain('Public items');
		expect(rawRequests.at(-1)).toBe(prefix + 'reference/en/pages/index.json');
		expect(rawRequests.some((url) => url.endsWith('bundle.tar.gz'))).toBe(false);
		expect(errors).toEqual([]);
		const screenshots = path.join(projectRoot, '.generated/preview-qa');
		await mkdir(screenshots, { recursive: true });
		await page.screenshot({ path: path.join(screenshots, 'archived-api.png') });
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(new URL('/yosoi/quickstart/', base).href);
		const releaseBox = await page
			.getByRole('combobox', { name: 'Documentation release' })
			.boundingBox();
		const searchBox = await page.locator('.starlight-docs-search').boundingBox();
		expect(releaseBox.x + releaseBox.width).toBeLessThanOrEqual(searchBox.x + 1);
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
			true,
		);
		await page.screenshot({ path: path.join(screenshots, 'latest-mobile.png') });
	} finally {
		await browser?.close();
	}
}, 60000);
