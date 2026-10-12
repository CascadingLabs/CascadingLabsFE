import { test } from 'vite-plus/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { launchDocsBrowser } from './browser.mjs';

test('language and tooling navigation keeps the tab row below the fixed header', async () => {
	const browser = await launchDocsBrowser();
	try {
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		const source = stripTypeScriptTypes(
			await readFile(new URL('../../src/scripts/docs-variants.ts', import.meta.url), 'utf8'),
		);
		const navigation = stripTypeScriptTypes(
			await readFile(new URL('../../src/scripts/docs-navigation.ts', import.meta.url), 'utf8'),
		);
		const group = (id, title, labels, wrapped) =>
			`<h2 id="${id}">${title}</h2>` +
			labels
				.map((label, index) => {
					const heading = `<h3 id="${label.toLowerCase()}">${label}</h3>`;
					return `${wrapped ? `<div class="sl-heading-wrapper">${heading}</div>` : heading}<pre style="height: ${index ? 900 : 1400}px">${label} code</pre>`;
				})
				.join('');
		await page.route('http://docs.test/**', (route) =>
			route.fulfill({
				contentType: 'text/html',
				body: `<style>
			html { scroll-padding-top: 88px; overflow-anchor: none; }
			body { margin: 0; }
			header { position: fixed; top: 0; height: 64px; width: 100%; background: white; z-index: 2; }
			starlight-toc { position: fixed; top: 100px; right: 0; z-index: 3; }
			starlight-toc a { display: block; }
			main { padding: 400px 200px 100vh 20px; }
			.docs-variant-title, [hidden] { display: none; }
			.docs-variant-controls { display: flex; height: 44px; }
			pre { margin: 0; }
		</style><header>Fixed header</header>
		<starlight-toc><a href="#rust">Rust outline</a><a href="#python">Python outline</a><a href="#cargo">Cargo outline</a><a href="#uv">uv outline</a></starlight-toc>
		<main>${group('example', 'Example', ['Rust', 'Python'], true)}${group('install', 'Install', ['Cargo', 'uv'], false)}</main>`,
			}),
		);
		await page.goto('http://docs.test/');
		await page.addScriptTag({
			type: 'module',
			content: source + '\nwindow.enhance = enhanceCodeVariants;',
		});
		await page.addScriptTag({
			type: 'module',
			content: navigation + '\nwindow.initialize = initializeDocsNavigation;',
		});
		await page.evaluate(async () => {
			window.enhance(document.querySelector('main'));
			await window.initialize();
		});
		const aligned = async (label) => {
			await page.waitForFunction((label) => {
				const panel = document.querySelector(`[data-docs-variant="${label}"]`);
				return (
					panel &&
					!panel.hidden &&
					Math.abs(panel.closest('.docs-variants').getBoundingClientRect().top - 88) < 1
				);
			}, label);
			const tab = page.getByRole('tab', { name: label, exact: true });
			assert.ok((await tab.boundingBox()).y >= 64, `${label} tabs remain below the header`);
		};
		for (const label of ['Python', 'Rust', 'Rust', 'Cargo', 'uv', 'uv']) {
			await page.getByRole('link', { name: `${label} outline`, exact: true }).click();
			await aligned(label);
		}
		await page.getByRole('tab', { name: 'Cargo', exact: true }).click();
		await aligned('Cargo');
		await page.getByRole('tab', { name: 'Cargo', exact: true }).press('ArrowRight');
		await aligned('uv');
		await page.setViewportSize({ width: 390, height: 844 });
		await page.getByRole('link', { name: 'Python outline', exact: true }).click();
		await aligned('Python');
	} finally {
		await browser.close();
	}
});

test('deep links survive late layout changes and scrolling replaces the URL fragment', async () => {
	const browser = await launchDocsBrowser();
	try {
		const page = await browser.newPage();
		await page.route('http://docs.test/**', (route) =>
			route.fulfill({
				contentType: 'text/html',
				body: `<style>
				html { scroll-padding-top: 64px; overflow-anchor: none; }
				h2 { scroll-margin-top: 24px; }
				main { padding-bottom: 100vh; }
				#examples { height: 1800px; }
				section { height: 400px; }
			</style>
			<starlight-toc><a href="#rationale">Rationale</a><a href="#motivation">Motivation</a></starlight-toc>
			<main><div id="examples"></div><h2 id="rationale">Rationale</h2><section></section>
			<h2 id="motivation">Motivation</h2><section></section></main>`,
			}),
		);
		await page.goto('http://docs.test/?release=latest#motivation');
		// Simulate tab enhancement shrinking content after the browser's native fragment jump.
		await page.evaluate(() => {
			document.getElementById('examples').style.height = '200px';
		});
		assert.ok(
			await page.locator('#motivation').evaluate((el) => el.getBoundingClientRect().top < 0),
		);
		const source = stripTypeScriptTypes(
			await readFile(new URL('../../src/scripts/docs-navigation.ts', import.meta.url), 'utf8'),
		);
		await page.addScriptTag({
			type: 'module',
			content: source + '\nwindow.initialize = initializeDocsNavigation;',
		});
		await page.evaluate(() => window.initialize());
		assert.ok(
			Math.abs(
				(await page.locator('#motivation').evaluate((el) => el.getBoundingClientRect().top)) - 88,
			) < 1,
		);
		const length = await page.evaluate(() => history.length);
		await page.evaluate(() => {
			history.replaceState({ preserved: true }, '', location.href);
		});
		for (const id of ['rationale', 'motivation']) {
			await page.locator(`#${id}`).evaluate((el) => el.scrollIntoView());
			await page.waitForFunction((id) => location.hash === '#' + id, id);
			assert.deepEqual(
				await page.evaluate(() => ({
					length: history.length,
					state: history.state,
					search: location.search,
				})),
				{ length, state: { preserved: true }, search: '?release=latest' },
			);
		}
		await page.evaluate(() => window.scrollTo(0, 0));
		await page.waitForFunction(() => location.hash === '');
		assert.deepEqual(
			await page.evaluate(() => ({
				length: history.length,
				state: history.state,
				search: location.search,
			})),
			{ length, state: { preserved: true }, search: '?release=latest' },
		);
		await page.evaluate(() => {
			location.hash = 'rationale';
		});
		await page.waitForFunction(
			() => Math.abs(document.getElementById('rationale').getBoundingClientRect().top - 88) < 1,
		);
	} finally {
		await browser.close();
	}
});
