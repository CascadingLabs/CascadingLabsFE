import { test } from 'vite-plus/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { launchDocsBrowser } from './browser.mjs';
import { renderArchiveContent } from '../../src/lib/docs-archive';

test('Markdown variants pair explanations, preserve preference, support keyboard and deep links', async () => {
	const browser = await launchDocsBrowser();
	try {
		const page = await browser.newPage();
		await page.route('http://docs.test/**', (route) =>
			route.fulfill({
				contentType: 'text/html',
				body: '<main class="sl-markdown-content"></main>',
			}),
		);
		await page.goto('http://docs.test/');
		const source = stripTypeScriptTypes(
			await readFile(new URL('../../src/scripts/docs-variants.ts', import.meta.url), 'utf8'),
		);
		await page.addScriptTag({
			type: 'module',
			content: source + '\nwindow.enhance = enhanceCodeVariants;',
		});
		const markup = `
			<div class="sl-heading-wrapper"><h2 id="example">Example: greeting</h2></div>
			<p>Shared explanation</p>
			<div class="sl-heading-wrapper"><h3 id="rust">Rust</h3></div>
			<pre><code>rust-code</code></pre><p>Rust explanation</p>
			<div class="sl-heading-wrapper"><h3 id="python">Python</h3></div>
			<pre><code>python-code</code></pre><p>Python explanation</p>
			<h2 id="commands">Install</h2><h3 id="cargo">Cargo</h3>
			<pre><code>cargo add yosoi</code></pre><p>Cargo explanation</p>
			<h3 id="uv">uv</h3><pre><code>uv add yosoi</code></pre><p>uv explanation</p>
			<h2>Next</h2><p>Unrelated prose</p>
		`;
		await page.locator('main').evaluate((root, body) => {
			root.innerHTML = body;
			window.enhance(root);
		}, markup);
		assert.equal(await page.locator('.docs-variants').count(), 2);
		assert.equal(await page.locator('.docs-variant-icon-cargo').count(), 1);
		assert.equal(await page.locator('#cargo').getAttribute('class'), 'docs-variant-title');
		await page.getByRole('tab', { name: 'Python', exact: true }).click();
		assert.equal(await page.locator('[data-docs-variant="Rust"]').isVisible(), false);
		assert.equal(await page.locator('[data-docs-variant="Python"]').isVisible(), true);
		assert.equal(await page.getByText('Python explanation', { exact: true }).isVisible(), true);
		assert.equal(await page.getByText('Shared explanation', { exact: true }).isVisible(), true);
		assert.equal(await page.locator('[data-docs-variant="Cargo"]').isVisible(), true);
		await page.getByRole('tab', { name: 'Python', exact: true }).press('ArrowLeft');
		assert.equal(
			await page.getByRole('tab', { name: 'Rust', exact: true }).getAttribute('aria-selected'),
			'true',
		);
		await page.evaluate(() => {
			location.hash = 'python';
		});
		await page.waitForFunction(
			() => !document.querySelector('[data-docs-variant="Python"]').hidden,
		);
		assert.equal(
			await page.getByRole('tab', { name: 'Python', exact: true }).getAttribute('aria-selected'),
			'true',
		);
		await page.getByRole('tab', { name: 'Python', exact: true }).click();
		await page.evaluate(() => {
			history.replaceState(null, '', '/');
		});
		// Simulate sanitized archive replacement and invoke the same enhancement hook.
		await page.locator('main').evaluate((root, body) => {
			root.innerHTML = body;
			window.enhance(root);
			window.enhance(root);
		}, markup);
		assert.equal(await page.locator('.docs-variants').count(), 2);
		assert.equal(await page.locator('[data-docs-variant="Python"]').isVisible(), true);
		await page.getByRole('tab', { name: 'uv', exact: true }).click();
		assert.equal(await page.locator('[data-docs-variant="Python"]').isVisible(), true);
		assert.equal(await page.locator('[data-docs-variant="uv"]').isVisible(), true);
		await page.setViewportSize({ width: 390, height: 844 });
		assert.equal(
			await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
			true,
		);
		await page.locator('main').evaluate((root) => {
			root.innerHTML = '<h2>Example: incomplete</h2><h3>Rust</h3><pre>code</pre>';
			window.enhance(root);
		});
		assert.equal(await page.locator('.docs-variants').count(), 0);
		const archived = renderArchiveContent(
			{ route: 'demo', title: 'Demo', file: 'demo.md', sha256: '0'.repeat(64), format: 'markdown' },
			'## Example: archived\n\n### Rust\n\n```rust\nrust_code();\n```\n\nRust explanation\n\n### Python\n\n```python\npython_code()\n```\n\nPython explanation\n\n## Next\n',
		);
		await page.locator('main').evaluate((root, body) => {
			root.innerHTML = body;
			for (const heading of root.querySelectorAll('h2, h3')) {
				heading.id = heading.textContent.trim().toLowerCase().replaceAll(' ', '-');
			}
			window.enhance(root);
		}, archived);
		assert.equal(await page.locator('.docs-variants').count(), 1);
		await page.getByRole('tab', { name: 'Rust', exact: true }).click();
		assert.equal(await page.locator('[data-docs-variant="Rust"]').isVisible(), true);
		assert.equal(await page.getByText('Python explanation', { exact: true }).isVisible(), false);
	} finally {
		await browser.close();
	}
});
