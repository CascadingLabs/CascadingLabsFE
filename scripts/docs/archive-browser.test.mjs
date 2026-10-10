import { expect, test } from 'vite-plus/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { launchDocsBrowser } from './browser.mjs';
import { projectRoot } from './prepare.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
test('archive shell fetches Markdown from a real GitHub source commit and renders only the requested page', async () => {
	const source = '80911cec268a96576f513ed1b65da0f0c8623b3e';
	const raw = `https://raw.githubusercontent.com/CascadingLabs/Yosoi/${source}/docs/public/index.md`;
	const response = await fetch(raw, { signal: AbortSignal.timeout(10000) });
	expect(response.status).toBe(200);
	const content = await response.text();
	await mkdir(path.join(projectRoot, '.generated'), { recursive: true });
	const root = await mkdtemp(path.join(projectRoot, '.generated/archive-spike-'));
	const manifest = {
		schemaVersion: 1,
		version: '0.1.0',
		tag: 'v0.1.0',
		sourceCommit: source,
		navigation: { title: 'Yosoi', route: '', id: 'index', order: 0, children: [] },
		pages: [
			{ route: '', title: 'Yosoi', file: 'index.md', format: 'markdown', sha256: hash(content) },
			{
				route: 'quickstart',
				title: 'Quickstart',
				file: 'quickstart.md',
				format: 'markdown',
				sha256: '0'.repeat(64),
			},
		],
		assets: {},
	};
	const release = {
		version: '0.1.0',
		tag: 'v0.1.0',
		sourceCommit: source,
		artifactRepository: 'CascadingLabs/Yosoi',
		artifactCommit: source,
		manifestPath: 'docs/public/archive-spike-manifest.json',
		sha256: hash(JSON.stringify(manifest)),
	};
	await writeFile(
		path.join(root, 'entry.ts'),
		`
    import { renderArchive } from ${JSON.stringify(path.join(projectRoot, 'src/scripts/docs-archive.ts'))};
    await renderArchive(document.querySelector('#spike'), ${JSON.stringify({ schemaVersion: 1, latest: '0.1.0', versions: [release] })});
  `,
	);
	await mkdir(path.join(root, 'assets'));
	execFileSync(
		'bun',
		[
			'build',
			path.join(root, 'entry.ts'),
			'--outdir',
			path.join(root, 'assets'),
			'--target',
			'browser',
		],
		{ cwd: projectRoot },
	);
	const html =
		'<h1>Archive</h1><main><div id="spike">Loading…</div></main><sl-sidebar-state-persist><ul></ul></sl-sidebar-state-persist><starlight-toc><ul></ul></starlight-toc><div class="pagination-links"></div><script type="module" src="/entry.js"></script>';
	const server = createServer(async (req, res) => {
		if (req.url?.startsWith('/entry.js')) {
			res.setHeader('Content-Type', 'application/javascript');
			res.end(await readFile(path.join(root, 'assets/entry.js')));
		} else {
			res.setHeader('Content-Type', 'text/html');
			res.end(html);
		}
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	let browser;
	try {
		browser = await launchDocsBrowser();
		const page = await browser.newPage();
		page.setDefaultTimeout(8000);
		const requested = [];
		const errors = [];
		page.on('request', (req) => {
			if (req.url().includes('raw.githubusercontent.com')) requested.push(req.url());
		});
		page.on('pageerror', (error) => errors.push(error.message));
		await page.route('**/archive-spike-manifest.json', (route) =>
			route.fulfill({
				contentType: 'application/json',
				body: JSON.stringify(manifest),
				headers: { 'access-control-allow-origin': '*' },
			}),
		);
		// The manifest is a local fixture; the Markdown request goes to real GitHub.
		await page.goto(`http://127.0.0.1:${server.address().port}/?version=0.1.0`);
		await page.locator('#spike table').waitFor();
		expect(await page.locator('#spike').innerText()).toContain('Discover URLs on a site');
		expect(await page.locator('#spike h1').count()).toBe(0);
		expect(await page.locator('#spike').innerText()).not.toContain('description:');
		expect(
			await page.getByRole('link', { name: 'Install and quickstart' }).getAttribute('href'),
		).toBe('/yosoi/archive/?version=0.1.0&page=quickstart');
		expect(requested).toEqual([
			`https://raw.githubusercontent.com/CascadingLabs/Yosoi/${source}/${release.manifestPath}`,
			raw,
		]);
		expect(await page.locator('starlight-toc a').count()).toBe(2);
		// Exercise controls and delayed fragment navigation with deterministic Markdown.
		const controls =
			'# Controls\n\n## Search\n\n```python\nprint("<hello>")\n```\n\n' +
			'## Review locally\n\n[Search](#search)\n\n## Search\n\nRepeated heading.\n';
		manifest.pages[0].sha256 = hash(controls);
		release.sha256 = hash(JSON.stringify(manifest));
		await writeFile(
			path.join(root, 'entry.ts'),
			`
    import { renderArchive } from ${JSON.stringify(path.join(projectRoot, 'src/scripts/docs-archive.ts'))};
    await renderArchive(document.querySelector('#spike'), ${JSON.stringify({ schemaVersion: 1, latest: '0.1.0', versions: [release] })});
  `,
		);
		execFileSync(
			'bun',
			[
				'build',
				path.join(root, 'entry.ts'),
				'--outdir',
				path.join(root, 'assets'),
				'--target',
				'browser',
			],
			{ cwd: projectRoot },
		);
		await page.route(raw, (route) =>
			route.fulfill({ body: controls, headers: { 'access-control-allow-origin': '*' } }),
		);
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
		await page.goto(
			`http://127.0.0.1:${server.address().port}/?version=0.1.0&test=controls#review-locally`,
		);
		await page.getByRole('link', { name: 'Link to Review locally', exact: true }).waitFor();
		expect(
			await page.locator('#spike h2').evaluateAll((items) => items.map((item) => item.id)),
		).toEqual(['search', 'review-locally', 'search-1']);
		await page.getByRole('button', { name: 'Copy code', exact: true }).click();
		expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('print("<hello>")\n');
		expect(await page.getByRole('button', { name: 'Copy code', exact: true }).innerText()).toBe(
			'Copied!',
		);
		await page.getByRole('link', { name: 'Link to Search', exact: true }).first().click();
		expect(new URL(page.url()).hash).toBe('#search');
		expect(new URL(page.url()).searchParams.get('version')).toBe('0.1.0');
		await page.getByRole('link', { name: 'Link to Search', exact: true }).nth(1).click();
		expect(new URL(page.url()).hash).toBe('#search-1');
		await page.setViewportSize({ width: 390, height: 844 });
		await page.screenshot({ path: path.join(root, 'archive-mobile.png') });
		expect(errors).toEqual([]);
		// Missing resources show a usable error rather than rendering the latest as old docs.
		await page.route(raw, (route) => route.fulfill({ status: 404, body: '' }));
		await page.reload();
		await page.getByRole('alert').waitFor();
		expect(await page.getByRole('alert').innerText()).toContain('404');
	} finally {
		await browser?.close();
		await new Promise((resolve) => server.close(resolve));
		await rm(root, { recursive: true, force: true });
	}
}, 30000);
