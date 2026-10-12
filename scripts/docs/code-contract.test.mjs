import { test, expect } from 'vite-plus/test';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { codeToHtml } from 'shiki';
import { parseCodeCallouts } from '../../src/scripts/docs-callouts';
import { launchDocsBrowser } from './browser.mjs';

test('annotation contract accepts native comments and preserves string literals', () => {
	const snapshot = Object.fromEntries(
		['rust', 'python', 'bash', 'powershell'].map((language) => {
			const prefix = language === 'rust' ? '///' : '#';
			const code = `${prefix} callout: Explain the next line.\nvalue = "# callout: literal"; ${prefix} callout: Explain this line.`;
			return [language, parseCodeCallouts(code, language)];
		}),
	);
	expect(snapshot).toMatchInlineSnapshot(`
		{
		  "bash": [
		    {
		      "line": 0,
		      "offset": 0,
		      "standalone": true,
		      "text": "Explain the next line.",
		    },
		    {
		      "line": 1,
		      "offset": 30,
		      "standalone": false,
		      "text": "Explain this line.",
		    },
		  ],
		  "powershell": [
		    {
		      "line": 0,
		      "offset": 0,
		      "standalone": true,
		      "text": "Explain the next line.",
		    },
		    {
		      "line": 1,
		      "offset": 30,
		      "standalone": false,
		      "text": "Explain this line.",
		    },
		  ],
		  "python": [
		    {
		      "line": 0,
		      "offset": 0,
		      "standalone": true,
		      "text": "Explain the next line.",
		    },
		    {
		      "line": 1,
		      "offset": 30,
		      "standalone": false,
		      "text": "Explain this line.",
		    },
		  ],
		  "rust": [
		    {
		      "line": 0,
		      "offset": 0,
		      "standalone": true,
		      "text": "Explain the next line.",
		    },
		    {
		      "line": 1,
		      "offset": 30,
		      "standalone": false,
		      "text": "Explain this line.",
		    },
		  ],
		}
	`);
	expect(
		parseCodeCallouts('let x = r#"// callout: literal"#;\n/* // callout: literal */', 'rust'),
	).toEqual([]);
	expect(parseCodeCallouts('"""\n# callout: literal\n"""', 'python')).toEqual([]);
});

test('arbitrary Markdown labels, callouts, copy, themes and mobile scrolling share one renderer', async () => {
	const script = execFileSync('bun', ['build', 'src/scripts/docs-code.ts', '--target=browser'], {
		encoding: 'utf8',
		maxBuffer: 4 * 1024 * 1024,
	});
	const css = (await readFile('src/styles/global.css', 'utf8')).replace(/^@import[^\n]*\n/gm, '');
	const snippet =
		'# callout: Inspect `results` before continuing.\nresults = "' +
		'long-code-'.repeat(30) +
		'" # callout: Keep **partial** evidence distinct.\n';
	const variants = await Promise.all(
		['Python', 'PowerShell', 'Shell'].map(async (label) => {
			const language = label === 'Shell' ? 'bash' : label.toLowerCase();
			const highlighted = await codeToHtml(snippet, {
				lang: language,
				themes: { light: 'github-light', dark: 'github-dark' },
				defaultColor: false,
			});
			return (
				`<h3 id="${language}">${label}</h3>` +
				highlighted.replace('<code>', `<code class="language-${language}">`)
			);
		}),
	);
	const browser = await launchDocsBrowser();
	try {
		const page = await browser.newPage({ viewport: { width: 490, height: 808 } });
		await page.route('http://docs.test/**', (route) =>
			route.fulfill({
				contentType: 'text/html',
				body: `<html data-has-sidebar><style>${css}</style><main class="sl-markdown-content"><h2 id="example">Example: outputs</h2>${variants.join('')}</main></html>`,
			}),
		);
		await page.goto('http://docs.test/?code=powershell&keep=yes#example');
		await page.addScriptTag({
			type: 'module',
			content: script + '\nwindow.enhance = enhanceCodeBlocks;',
		});
		await page.evaluate(() => {
			window.enhance(document.querySelector('main'));
			Object.defineProperty(navigator, 'clipboard', {
				value: {
					writeText: async (text) => {
						window.copied = text;
					},
				},
			});
		});
		expect(
			await page
				.getByRole('tab', { name: 'PowerShell', exact: true })
				.getAttribute('aria-selected'),
		).toBe('true');
		const length = await page.evaluate(() => history.length);
		await page.getByRole('tab', { name: 'Shell', exact: true }).click();
		expect(new URL(page.url()).search).toBe('?code=shell&keep=yes');
		expect(new URL(page.url()).hash).toBe('#example');
		expect(await page.evaluate(() => history.length)).toBe(length);
		const panel = page.locator('[data-docs-variant="Shell"]');
		await panel.getByRole('button', { name: 'Copy code' }).click();
		expect(await page.evaluate(() => window.copied)).toBe(
			'results = "' + 'long-code-'.repeat(30) + '" \n',
		);
		const control = panel.getByRole('slider', { name: 'Scroll code horizontally' });
		expect(await control.isVisible()).toBe(true);
		await control.press('End');
		expect(await panel.locator('pre').evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
		await control.press('Home');
		expect(await panel.locator('pre').evaluate((el) => el.scrollLeft)).toBe(0);
		const colors = [];
		for (const theme of ['light', 'dark']) {
			await page.evaluate((theme) => {
				document.documentElement.dataset.theme = theme;
				document.documentElement.dataset.themePreference = theme;
			}, theme);
			const marker = panel.getByRole('button', { name: 'Code explanation 1' });
			await marker.click();
			const popover = page.locator('.docs-callout-popover:popover-open');
			await popover.waitFor();
			expect(await popover.getByRole('button').count()).toBe(0);
			const appearance = await popover.evaluate((el) => ({
				color: getComputedStyle(el).backgroundColor,
				left: el.getBoundingClientRect().left,
				right: el.getBoundingClientRect().right,
			}));
			colors.push(appearance.color);
			expect(appearance.left).toBeGreaterThanOrEqual(0);
			expect(appearance.right).toBeLessThanOrEqual(490);
			await page.keyboard.press('Escape');
			await popover.waitFor({ state: 'hidden' });
		}
		expect(colors[0]).not.toBe(colors[1]);
		await page.emulateMedia({ media: 'print' });
		expect(await panel.locator('.docs-callout-notes').isVisible()).toBe(true);
		expect(await control.isVisible()).toBe(false);
		await page.emulateMedia({ media: 'screen' });
		await page.reload();
		await page.addScriptTag({
			type: 'module',
			content: script + '\nwindow.enhance = enhanceCodeBlocks;',
		});
		await page.evaluate(() => window.enhance(document.querySelector('main')));
		expect(
			await page.getByRole('tab', { name: 'Shell', exact: true }).getAttribute('aria-selected'),
		).toBe('true');
		await page.goto('http://docs.test/?code=powershell#python');
		await page.addScriptTag({
			type: 'module',
			content: script + '\nwindow.enhance = enhanceCodeBlocks;',
		});
		await page.evaluate(() => window.enhance(document.querySelector('main')));
		expect(
			await page
				.getByRole('tab', { name: 'PowerShell', exact: true })
				.getAttribute('aria-selected'),
		).toBe('true');
		expect(new URL(page.url()).hash).toBe('#powershell');
	} finally {
		await browser.close();
	}
});
