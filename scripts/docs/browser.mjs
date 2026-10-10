import { mkdtemp, rm } from 'node:fs/promises';
import { chromium } from 'playwright-core';

export async function launchDocsBrowser() {
	// Chromium's Unix socket path must stay short, including in named workspaces.
	const temp = await mkdtemp('/tmp/cl-docs-');
	let browser;
	try {
		browser = await chromium.launch({
			executablePath: process.env.DOCS_BROWSER_EXECUTABLE || '/usr/bin/chromium',
			headless: true,
			chromiumSandbox: true,
			env: { ...process.env, TMPDIR: temp },
		});
	} catch (error) {
		await rm(temp, { recursive: true, force: true });
		throw error;
	}
	browser.on('disconnected', () => {
		void rm(temp, { recursive: true, force: true });
	});
	return browser;
}
