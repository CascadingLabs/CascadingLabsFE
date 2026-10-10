import { expect, test } from 'vite-plus/test';
import { mkdtemp, mkdir, cp, writeFile, rm, symlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRoot, repositoryRoot } from './prepare.mjs';
import { launchDocsBrowser } from './browser.mjs';

const availablePort = async () => {
	const socket = createServer();
	await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
	const port = socket.address().port;
	await new Promise((resolve) => socket.close(resolve));
	return port;
};
function ready(child) {
	return new Promise((resolve, reject) => {
		let output = '';
		const timer = setTimeout(() => {
			cleanup();
			reject(new Error('Docs dev did not become ready. ' + output.slice(-1800)));
		}, 20000);
		const data = (chunk) => {
			output += chunk;
			const match = output.match(/Local\s+(http:\/\/127\.0\.0\.1:\d+\/)/);
			if (match) {
				cleanup();
				resolve(match[1]);
			}
		};
		const exit = () => {
			cleanup();
			reject(new Error('Docs dev exited before startup. ' + output.slice(-1800)));
		};
		const cleanup = () => {
			clearTimeout(timer);
			child.stdout.off('data', data);
			child.stderr.off('data', data);
			child.off('exit', exit);
		};
		child.stdout.on('data', data);
		child.stderr.on('data', data);
		child.once('exit', exit);
	});
}
async function stop(child) {
	if (!child || child.exitCode !== null) return;
	await new Promise((resolve) => {
		const timer = setTimeout(() => {
			child.kill('SIGKILL');
			resolve();
		}, 5000);
		child.once('exit', () => {
			clearTimeout(timer);
			resolve();
		});
		child.kill('SIGTERM');
	});
}

test('vpr dev refreshes the open browser for Markdown, metadata, and added files', async () => {
	// Keep fixture configuration outside the running app's watched tree.
	const work = path.join(repositoryRoot(), '.generated/frontend-tests');
	await mkdir(work, { recursive: true });
	const fixture = await mkdtemp(path.join(work, 'live-'));
	const frontend = path.join(fixture, 'frontend');
	const source = path.join(fixture, 'source');
	let browser;
	let child;
	let page;
	let output = '';
	try {
		await mkdir(frontend);
		await mkdir(path.join(source, 'docs/public'), { recursive: true });
		await mkdir(path.join(source, 'scripts'), { recursive: true });
		await cp(path.join(repositoryRoot(), 'scripts/docs'), path.join(source, 'scripts/docs'), {
			recursive: true,
			filter: (file) => !file.split(path.sep).includes('node_modules'),
		});
		for (const file of ['astro.config.mjs', 'postcss.config.mjs', 'package.json', 'tsconfig.json'])
			await cp(path.join(projectRoot, file), path.join(frontend, file));
		await cp(path.join(frontend, 'astro.config.mjs'), path.join(frontend, 'base.astro.config.mjs'));
		await writeFile(
			path.join(frontend, 'astro.config.mjs'),
			`import config from './base.astro.config.mjs';\nconfig.cacheDir = './.astro-cache';\nconfig.vite.cacheDir = './.vite';\nconfig.vite.server = { fs: { allow: ${JSON.stringify([frontend, path.join(projectRoot, 'node_modules')])} } };\nexport default config;\n`,
		);
		await cp(path.join(projectRoot, 'src'), path.join(frontend, 'src'), {
			recursive: true,
			filter: (file) => file !== path.join(projectRoot, 'src/content/docs/yosoi'),
		});
		await cp(path.join(projectRoot, 'public'), path.join(frontend, 'public'), { recursive: true });
		await cp(path.join(projectRoot, 'scripts'), path.join(frontend, 'scripts'), {
			recursive: true,
		});
		await symlink(
			path.join(projectRoot, 'node_modules'),
			path.join(frontend, 'node_modules'),
			'dir',
		);

		const historical = new Map();
		const hash = (text) => createHash('sha256').update(text).digest('hex');
		function releaseFixture(version, identity, content) {
			const artifactCommit = identity.repeat(40);
			const pages = Object.entries(content).map(([route, html]) => ({
				route,
				title: route ? `${version} ${route}` : `${version} overview`,
				file: `pages/${route || 'index'}.html`,
				sha256: hash(html),
			}));
			const navigation = {
				title: 'Yosoi',
				route: '',
				order: -1,
				children: [
					{
						title: `Docs ${version}`,
						route: '',
						id: 'index',
						order: 0,
						collapsed: false,
						children: pages
							.filter((p) => p.route)
							.map((p) => ({
								title: p.title,
								route: p.route,
								id: p.route,
								order: 1,
								children: [],
							})),
					},
				],
			};
			const manifest = JSON.stringify({
				schemaVersion: 1,
				version,
				tag: `v${version}`,
				sourceCommit: identity.repeat(40),
				navigation,
				pages,
				assets: {},
			});
			const prefix = `https://raw.githubusercontent.com/Fixture/Yosoi/${artifactCommit}/versions/${version}/`;
			historical.set(prefix + 'manifest.json', manifest);
			for (const page of pages) historical.set(prefix + page.file, content[page.route]);
			return {
				version,
				tag: `v${version}`,
				sourceCommit: identity.repeat(40),
				artifactRepository: 'Fixture/Yosoi',
				artifactCommit,
				manifestPath: `versions/${version}/manifest.json`,
				sha256: hash(manifest),
			};
		}
		const v1 = releaseFixture('0.1.0', '1', {
			'': '<p>First release.</p><h2>Older tools</h2><a href="/yosoi/legacy/">Legacy page</a><img src="invalid" onerror="window.archiveInjected=true"><script>window.archiveInjected=true</script>',
			legacy: '<p>Legacy document.</p>',
		});
		const v2 = releaseFixture('0.2.0', '2', {
			'': '<p>Second release.</p><h2>New tools</h2>',
			new: '<p>New document.</p>',
		});
		await writeFile(
			path.join(frontend, 'src/data/docs-releases.json'),
			JSON.stringify({ schemaVersion: 1, latest: '0.2.0', versions: [v2, v1] }),
		);

		const meta = (title) => ({
			schemaVersion: 1,
			sections: [
				{ title, pages: ['index.md'] },
				{ title: 'Guides', directory: 'guides' },
				{ title: 'Reference', generated: 'rust-api' },
			],
		});
		await writeFile(
			path.join(source, 'docs/public/index.md'),
			'---\ntitle: Live test\n---\n# Live test\n\nInitial content.\n',
		);
		await writeFile(
			path.join(source, 'docs/public/_navigation.json'),
			JSON.stringify(meta('Start')),
		);
		await mkdir(path.join(source, 'docs/public/guides'));
		await writeFile(
			path.join(source, 'docs/public/guides/index.md'),
			'---\ntitle: Guides\n---\n# Guides\n\nGuide overview.\n',
		);
		await mkdir(path.join(source, 'crates/yosoi'), { recursive: true });
		const manifest = path.join(source, 'crates/yosoi/Cargo.toml');
		await writeFile(manifest, '[package]\nname = "yosoi"\nversion = "0.1.0"\n');
		execFileSync('git', ['init', '-q', source]);
		execFileSync('git', ['-C', source, 'add', '.']);
		execFileSync('git', [
			'-C',
			source,
			'-c',
			'user.name=Docs Fixture',
			'-c',
			'user.email=fixture@example.invalid',
			'-c',
			'commit.gpgsign=false',
			'-c',
			'core.hooksPath=/dev/null',
			'commit',
			'-qm',
			'fixture',
		]);
		const commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], {
			encoding: 'utf8',
		}).trim();
		const generator = await import(
			pathToFileURL(path.join(source, 'scripts/docs/reference/generate.mjs')).href
		);
		const model = await import(
			pathToFileURL(path.join(source, 'scripts/docs/reference/model.mjs')).href
		);
		const artifact = path.join(fixture, 'reference');
		generator.writeReference({
			pages: {
				index: {
					schemaVersion: 1,
					id: 'module:yosoi',
					publicPath: 'yosoi',
					kind: 'module',
					title: 'SDK',
					signature: 'pub crate yosoi',
					docs: 'A fixture reference.',
					source: null,
					reexportSource: null,
					aliases: [],
					members: [],
					examples: [],
					docsDigest: model.sha256('A fixture reference.'),
				},
			},
			context: {
				repository: 'Fixture/Yosoi',
				commit,
				checkout: source,
				version: '0.1.0-preview',
				target: 'test',
				features: [],
			},
			sdk: { name: 'yosoi', crate: 'yosoi', version: '0.1.0', manifestPath: manifest },
			compiler: { rustdocVersion: 'fixture', compilerCommit: generator.toolchain.compilerCommit },
			formatVersion: generator.toolchain.rustdocJsonFormat,
			output: artifact,
			preview: true,
		});
		await writeFile(
			path.join(frontend, 'docs-sources.local.json'),
			JSON.stringify({ apiSource: commit, referenceArtifact: artifact }),
		);
		const port = await availablePort();
		// Astro skips its request middleware under VITEST; this child is a real dev server.
		const env = {
			...process.env,
			CI: '',
			NO_COLOR: '1',
			NODE_ENV: 'development',
			YOSOI_REPO_ROOT: source,
		};
		delete env.VITEST;
		child = spawn('bun', ['scripts/docs/dev.mjs', '--port', String(port)], {
			cwd: frontend,
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		child.stdout.on('data', (chunk) => {
			output += chunk;
		});
		child.stderr.on('data', (chunk) => {
			output += chunk;
		});
		const url = await ready(child);
		browser = await launchDocsBrowser();
		page = await browser.newPage();
		const browserErrors = [];
		page.on('pageerror', (error) => {
			browserErrors.push(error.message);
			output += `\nBrowser: ${error.message}\n`;
		});
		await page.route('https://raw.githubusercontent.com/Fixture/Yosoi/**', (route) => {
			const body = historical.get(route.request().url());
			return route.fulfill({
				status: body ? 200 : 404,
				contentType: route.request().url().endsWith('.json') ? 'application/json' : 'text/html',
				headers: { 'Access-Control-Allow-Origin': '*' },
				body: body || 'Missing artifact',
			});
		});
		const response = await page.goto(url + 'yosoi/');
		expect(response.status()).toBe(200);
		await page.getByText('Initial content.', { exact: true }).waitFor({ timeout: 10000 });
		await writeFile(
			path.join(source, 'docs/public/index.md'),
			'---\ntitle: Live test\n---\n# Live test\n\nEdited content.\n',
		);
		await page.getByText('Edited content.', { exact: true }).waitFor();
		await writeFile(
			path.join(source, 'docs/public/_navigation.json'),
			JSON.stringify(meta('Getting started')),
		);
		await page.locator('.sidebar summary').filter({ hasText: 'Getting started' }).waitFor();
		const added = path.join(source, 'docs/public/guides/added.md');
		await writeFile(added, '---\ntitle: Added page\n---\n# Added page\n\nA discovered page.\n');
		await page.locator('.sidebar a[href="/yosoi/guides/added/"]').waitFor({ state: 'attached' });
		await page.locator('.sidebar summary').filter({ hasText: 'Guides' }).click();
		await page.getByRole('link', { name: 'Added page', exact: true }).click();
		await page.getByText('A discovered page.', { exact: true }).waitFor();
		expect(page.url()).toContain('/yosoi/guides/added/');
		const rejected = new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				cleanup();
				reject(new Error('Invalid navigation was not rejected'));
			}, 10000);
			const data = (chunk) => {
				if (chunk.toString().includes('Docs refresh failed')) {
					cleanup();
					resolve();
				}
			};
			function cleanup() {
				clearTimeout(timer);
				child.stderr.off('data', data);
			}
			child.stderr.on('data', data);
		});
		await writeFile(path.join(source, 'docs/public/_navigation.json'), '{invalid');
		await rejected;
		expect(await page.getByText('A discovered page.', { exact: true }).isVisible()).toBe(true);
		await writeFile(
			path.join(source, 'docs/public/_navigation.json'),
			JSON.stringify(meta('Recovered')),
		);
		await page.locator('.sidebar summary').filter({ hasText: 'Recovered' }).waitFor();
		const introduction = page.locator('.sidebar summary').filter({ hasText: 'Recovered' });
		if (!(await introduction.evaluate((el) => el.parentElement.open))) await introduction.click();
		await page.getByRole('link', { name: 'Live test', exact: true }).click();
		await page.getByText('Edited content.', { exact: true }).waitFor();
		await rm(added);
		await page.locator('.sidebar a[href="/yosoi/guides/added/"]').waitFor({ state: 'detached' });
		expect((await page.request.get(url + 'yosoi/guides/added/')).status()).toBe(404);
		await writeFile(
			path.join(source, 'docs/public/_navigation.json'),
			`{
			"schemaVersion": 1,
			"sections": [
				{ "title": "Sections removed", "pages": ["index.md"] },
				// { "title": "Guides", "directory": "guides" },
				// { "title": "Reference", "generated": "rust-api" }
			]
		}`,
		);
		await page.locator('.sidebar summary').filter({ hasText: 'Sections removed' }).waitFor();
		expect(await page.locator('.sidebar summary').filter({ hasText: 'Guides' }).count()).toBe(0);
		expect(await page.locator('.sidebar summary').filter({ hasText: 'Reference' }).count()).toBe(0);
		expect((await page.request.get(url + 'yosoi/guides/')).status()).toBe(200);
		expect((await page.request.get(url + 'yosoi/api/')).status()).toBe(200);
		const picker = page.getByRole('combobox', { name: 'Documentation release' });
		expect(await picker.inputValue()).toBe('latest');
		expect((await picker.boundingBox()).width).toBeLessThan(110);
		await picker.selectOption('0.1.0');
		await page.getByText('First release.', { exact: true }).waitFor();
		expect(await page.locator('main h1').innerText()).toBe('0.1.0 overview');
		expect(await page.evaluate(() => window.archiveInjected)).toBeUndefined();
		expect(await page.locator('starlight-toc a').allTextContents()).toContain('Older tools');
		await page
			.locator('#docs-archive-view')
			.getByRole('link', { name: 'Legacy page', exact: true })
			.click();
		await page.getByText('Legacy document.', { exact: true }).waitFor();
		expect(await page.locator('.pagination-links a[rel="prev"]').innerText()).toContain('Go back');
		await page.getByRole('combobox', { name: 'Documentation release' }).selectOption('0.2.0');
		await page.getByText('Second release.', { exact: true }).waitFor();
		expect(
			await page.getByText('This page is unavailable in v0.2.0. Showing the overview.').isVisible(),
		).toBe(true);
		expect(await page.locator('.sidebar a[href*="page=legacy"]').count()).toBe(0);
		await page.locator('.pagination-links a[rel="next"]').click();
		await page.getByText('New document.', { exact: true }).waitFor();
		await page.getByRole('combobox', { name: 'Documentation release' }).selectOption('latest');
		await page.getByText('Edited content.', { exact: true }).waitFor();
		expect(page.url()).toBe(url + 'yosoi/');
	} catch (error) {
		throw new Error(
			`${error.message}\nFixture: ${fixture}\nDev output:\n${output.slice(-4000)}\nPage:\n${page ? (await page.locator('body').innerText()).slice(0, 3000) : 'not opened'}`,
			{ cause: error },
		);
	} finally {
		await browser?.close();
		await stop(child);
		if (!process.env.KEEP_DOCS_TEST_FIXTURE) await rm(fixture, { recursive: true, force: true });
	}
}, 90000);
