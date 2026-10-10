import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import {
	cp,
	mkdir,
	mkdtemp,
	open,
	readFile,
	readlink,
	rename,
	symlink,
	rm,
	writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { markdownToMdast } from 'satteri';
import { toMarkdown } from 'mdast-util-to-markdown';
import { gfmToMarkdown } from 'mdast-util-gfm';
import {
	authoredPages,
	copyPublicTree,
	readPublicNavigation,
	rewriteMarkdownLinks,
	validateDocHeadings,
	resolveNavigation,
	referenceNavigation,
	jsonc,
} from './navigation.mjs';
import { referenceMarkdown, referenceSummary } from './reference.mjs';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const repositoryRoot = () =>
	path.resolve(projectRoot, process.env.YOSOI_REPO_ROOT || '../Yosoi');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const run = (program, args, cwd) =>
	execFileSync(program, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const frontmatter = (metadata) =>
	`---\n${Object.entries(metadata)
		.map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
		.join('\n')}\n---\n\n`;

export function optionsFromArgs(args) {
	return parseArgs({
		args: args.filter((arg) => arg !== '--'),
		options: {
			source: { type: 'string' },
			'api-source': { type: 'string' },
			host: { type: 'string' },
			port: { type: 'string' },
			version: { type: 'string', default: '0.1.0-preview' },
			repository: { type: 'string', default: 'CascadingLabs/Yosoi' },
			'reference-artifact': { type: 'string' },
			toolchain: { type: 'string' },
			offline: { type: 'boolean', default: false },
			'refresh-reference': { type: 'boolean', default: false },
			'docs-only': { type: 'boolean', default: false },
			help: { type: 'boolean', default: false },
		},
	}).values;
}

export async function rewriteMarkdown(body, file, pages, assets) {
	const tree = await markdownToMdast(body, { features: { gfm: true } });
	validateDocHeadings(tree, file);
	rewriteMarkdownLinks(tree, file, pages, assets);
	return toMarkdown(tree, { extensions: [gfmToMarkdown()] });
}

function navigation(pages) {
	const root = { title: 'Yosoi', route: '', order: -1, children: [] };
	for (const page of pages.filter(
		(page) => page.route !== 'api' && !page.route.startsWith('api/'),
	)) {
		let node = root;
		const segments = page.route.split('/').filter(Boolean);
		for (let i = 0; i < segments.length; i++) {
			const route = segments.slice(0, i + 1).join('/');
			let child = node.children.find((item) => item.route === route);
			if (!child) {
				child = {
					title: segments[i].replaceAll('-', ' '),
					route,
					order: Number.MAX_SAFE_INTEGER,
					children: [],
				};
				node.children.push(child);
			}
			node = child;
		}
		Object.assign(node, { title: page.title, order: page.order, id: page.id });
	}
	const sort = (node) => {
		node.children.sort(
			(a, b) =>
				(a.route === 'api' ? 1 : b.route === 'api' ? -1 : a.order - b.order) ||
				a.title.localeCompare(b.title),
		);
		node.children.forEach(sort);
	};
	sort(root);
	const reference = pages.filter((page) => page.route === 'api' || page.route.startsWith('api/'));
	if (reference.length) root.children.push(referenceNavigation(reference));
	return root;
}

export async function prepareDocs(options = {}) {
	const localFile = path.join(projectRoot, 'docs-sources.local.json');
	if (
		!options.source &&
		!options['refresh-reference'] &&
		!process.env.CI &&
		existsSync(localFile)
	) {
		const local = JSON.parse(readFileSync(localFile, 'utf8'));
		options = {
			'api-source': local.apiSource,
			'reference-artifact': local.referenceArtifact,
			...Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined)),
		};
	}
	if (process.env.CI && !options.source)
		throw new Error('CI preparation requires --source <full Yosoi commit>.');
	if (options.source && options['docs-only'])
		throw new Error('--docs-only is for local previews; CI uses complete preparation.');
	const repo = repositoryRoot();
	const supplied = options['bundle-root']
		? JSON.parse(await readFile(path.join(options['bundle-root'], 'manifest.json'), 'utf8'))
		: null;
	if (
		supplied &&
		(supplied.source?.commit !== options.source ||
			supplied.version !== options.version ||
			supplied.preview)
	)
		throw new Error('Published content manifest does not match the selected bundle');
	const sourceCommit =
		supplied?.source.commit ||
		run(
			'git',
			['rev-parse', '--verify', '--end-of-options', `${options.source || 'HEAD'}^{commit}`],
			repo,
		).trim();
	const apiCommit = /^[a-f0-9]{40}$/.test(options['api-source'] || '')
		? options['api-source']
		: options['api-source']
			? run(
					'git',
					['rev-parse', '--verify', '--end-of-options', `${options['api-source']}^{commit}`],
					repo,
				).trim()
			: sourceCommit;
	if (options.source && apiCommit !== sourceCommit)
		throw new Error('Exact-commit builds require matching documentation and API sources.');
	const repository = options.repository || 'CascadingLabs/Yosoi';
	const version = options.version || '0.1.0-preview';
	const generated = path.join(projectRoot, '.generated');
	await mkdir(generated, { recursive: true });
	const lockPath = path.join(generated, 'yosoi.prepare.lock');
	let lock;
	try {
		lock = await open(lockPath, 'wx');
	} catch (error) {
		if (error.code === 'EEXIST')
			throw new Error(
				'Another docs preparation is running. If it was interrupted, remove .generated/yosoi.prepare.lock.',
			);
		throw error;
	}
	let stage;
	try {
		stage = await mkdtemp(path.join(generated, '.yosoi-next-'));
		const destination = path.join(generated, 'yosoi');
		const docs = path.join(stage, 'docs');
		const publicTree = path.join(stage, 'public-source');
		const generator = await import(
			pathToFileURL(path.join(repo, 'scripts/docs/generate.mjs')).href
		);
		const referenceGenerator = await import(
			pathToFileURL(path.join(repo, 'scripts/docs/reference/generate.mjs')).href
		);
		let sourceRoot = path.join(repo, 'docs/public');
		if (options.source && !supplied) {
			sourceRoot = path.join(stage, 'checkout/docs/public');
			const archive = path.join(stage, 'public.tar');
			run(
				'git',
				['archive', '--format=tar', `--output=${archive}`, sourceCommit, 'docs/public'],
				repo,
			);
			await mkdir(path.join(stage, 'checkout'), { recursive: true });
			run('tar', ['-xf', archive, '-C', path.join(stage, 'checkout')], projectRoot);
		}
		const { metadata: navigationMetadata, source: navigationSource } = await readPublicNavigation(
			sourceRoot,
			jsonc,
		);
		await mkdir(publicTree, { recursive: true });
		await copyPublicTree(sourceRoot, publicTree);
		const manifest = supplied
			? generator.validateManifest(supplied, { allowPreview: false })
			: generator.generatePreview({
					root: publicTree,
					version,
					repository,
					sourceCommit,
				});
		const pages = authoredPages(manifest);
		const pageMap = new Map(pages.map((page) => [page.file, page]));
		const assets = new Set(Object.keys(manifest.assets));
		for (const page of pages) {
			const original = await readFile(path.join(publicTree, page.file), 'utf8');
			if (digest(original) !== page.sha256)
				throw new Error(`Document changed during preparation: ${page.file}`);
			const { body } = generator.parseFrontmatter(original, page.file);
			const rewritten = await rewriteMarkdown(body, page.file, pageMap, assets);
			const tree = await markdownToMdast(rewritten, { features: { gfm: true } });
			if (tree.children[0]?.type === 'heading' && tree.children[0].depth === 1)
				tree.children.shift();
			const content = toMarkdown(tree, { extensions: [gfmToMarkdown()] });
			await mkdir(path.dirname(path.join(docs, page.file)), { recursive: true });
			await writeFile(
				path.join(docs, page.file),
				frontmatter({ title: page.title, description: page.description || '', order: page.order }) +
					content,
			);
		}
		for (const asset of assets) {
			const bytes = await readFile(path.join(publicTree, asset));
			if (digest(bytes) !== manifest.assets[asset].sha256)
				throw new Error(`Asset changed during preparation: ${asset}`);
			await mkdir(path.dirname(path.join(stage, asset)), { recursive: true });
			await writeFile(path.join(stage, asset), bytes);
		}
		const cacheKey = digest(
			json({
				sourceCommit: apiCommit,
				repository,
				version,
				toolchain: referenceGenerator.toolchain,
				generator: await readFile(path.join(repo, 'scripts/docs/reference/generate.mjs'), 'utf8'),
				model: await readFile(path.join(repo, 'scripts/docs/reference/model.mjs'), 'utf8'),
				discovery: await readFile(
					path.join(repo, 'scripts/docs/reference/sdk-discovery.mjs'),
					'utf8',
				),
				policy: await readFile(path.join(repo, 'scripts/docs/reference/sdk-policy.json'), 'utf8'),
			}),
		);
		const cache = path.join(generated, 'yosoi-cache/reference', cacheKey);
		let referenceRoot = options['reference-artifact']
			? path.resolve(options['reference-artifact'])
			: cache;
		let reference;
		try {
			reference = referenceGenerator.verifyReference(referenceRoot);
		} catch (error) {
			if (options['reference-artifact']) throw error;
			if (error.code !== 'ENOENT') throw error;
		}
		if (options['refresh-reference']) reference = undefined;
		if (!reference && options['docs-only'])
			throw new Error(
				'No matching API artifact is cached. Run vpr docs:prepare once, then use the fast Markdown workflow.',
			);
		if (!reference && supplied)
			throw new Error('Published bundles require a verified API reference');
		if (!reference) {
			referenceRoot = path.join(stage, 'reference-build');
			console.log(
				`Generating Rust API reference for ${apiCommit.slice(0, 12)} (one Cargo worker)...`,
			);
			reference = referenceGenerator.generateReference({
				repo,
				source: apiCommit,
				repository,
				version,
				sdk: 'yosoi',
				out: referenceRoot,
				work: path.join(generated, 'yosoi-cache/rustdoc'),
				toolchain: options.toolchain || process.env.YOSOI_DOCS_TOOLCHAIN,
				preview: true,
				offline: options.offline,
			});
			referenceGenerator.verifyReference(referenceRoot);
			await rm(cache, { recursive: true, force: true });
			await mkdir(path.dirname(cache), { recursive: true });
			await cp(referenceRoot, cache, { recursive: true });
		}
		if (
			reference.source.commit !== apiCommit ||
			(options.source && reference.source.repository !== repository)
		)
			throw new Error('API artifact must match the selected Yosoi source commit and repository.');
		const descriptors = Object.entries(reference.pages).map(([slug, item]) => ({
			...item,
			slug,
			route: slug === 'index' ? 'api' : `api/${slug}`,
		}));
		for (const descriptor of descriptors) {
			descriptor.page = JSON.parse(
				await readFile(path.join(referenceRoot, 'en', descriptor.file), 'utf8'),
			);
			descriptor.summary = referenceSummary(descriptor.page.docs);
		}
		for (const descriptor of descriptors) {
			const page = descriptor.page;
			const file = `api/${descriptor.slug}.md`;
			const name = page.publicPath.split('::').at(-1);
			const title =
				descriptor.slug === 'index'
					? 'Reference'
					: page.kind === 'module'
						? name.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
						: name;
			const tree = await markdownToMdast(referenceMarkdown(page, reference, descriptors), {
				features: { gfm: true },
			});
			const normalize = (node) => {
				if (
					node.type === 'code' &&
					/^(rust|compile_fail|no_run|ignore|should_panic|edition20\d\d)(,|$)/.test(node.lang || '')
				) {
					node.meta = node.lang;
					node.lang = 'rust';
				}
				for (const child of node.children || []) normalize(child);
			};
			normalize(tree);
			if (tree.children[0]?.type === 'heading' && tree.children[0].depth === 1)
				tree.children.shift();
			const content = toMarkdown(tree, { extensions: [gfmToMarkdown()] });
			await mkdir(path.dirname(path.join(docs, file)), { recursive: true });
			await writeFile(
				path.join(docs, file),
				frontmatter({
					title,
					description: `${page.publicPath} Rust API reference.`,
					order: 1000,
					tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 2 },
				}) + content,
			);
			pages.push({
				id: descriptor.route,
				file,
				route: descriptor.route,
				title,
				order: 1000,
				kind: page.kind,
				publicPath: page.publicPath,
			});
		}
		await cp(referenceRoot, path.join(stage, 'reference'), { recursive: true });
		const snapshot = {
			schemaVersion: 1,
			mode: options.source ? 'commit' : 'working-tree-preview',
			source: { repository, commit: sourceCommit, version },
			pages,
			navigation: navigationSource
				? resolveNavigation(pages, navigationMetadata)
				: navigation(pages),
			...(navigationSource ? { navigationSource } : {}),
			reference: {
				sourceCommit: reference.source.commit,
				repository: reference.source.repository,
				sdkVersion: reference.sdk.version,
				pages: descriptors.length,
				provenance: 'unsigned-preview',
			},
		};
		await writeFile(path.join(stage, 'routes.json'), json(snapshot));
		await writeFile(path.join(stage, 'source-manifest.json'), json(manifest));
		await rm(publicTree, { recursive: true, force: true });
		await rm(path.join(stage, 'checkout'), { recursive: true, force: true });
		await rm(path.join(stage, 'public.tar'), { force: true });
		await rm(path.join(stage, 'reference-build'), { recursive: true, force: true });
		const mount = path.join(projectRoot, 'src/content/docs/yosoi');
		await mkdir(path.dirname(mount), { recursive: true });
		const target = '../../../.generated/yosoi/docs';
		try {
			await symlink(target, mount, 'dir');
		} catch (error) {
			if (error.code !== 'EEXIST' || (await readlink(mount)) !== target)
				throw new Error(
					'src/content/docs/yosoi must be the managed snapshot link, not authored content.',
				);
		}
		const previous = `${destination}.previous`;
		await rm(previous, { recursive: true, force: true });
		try {
			await rename(destination, previous);
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
		}
		try {
			await rename(stage, destination);
		} catch (error) {
			await rename(previous, destination).catch(() => {});
			throw error;
		}
		await rm(previous, { recursive: true, force: true });
		console.log(
			`Prepared ${pages.length} pages (${descriptors.length} API) in .generated/yosoi; ${snapshot.mode}.`,
		);
		return snapshot;
	} finally {
		if (stage) await rm(stage, { recursive: true, force: true });
		await lock.close();
		await rm(lockPath, { force: true });
	}
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const options = optionsFromArgs(process.argv.slice(2));
	if (options.help)
		console.log(
			'vpr docs:prepare [--source COMMIT] [--api-source COMMIT] [--version VERSION] [--repository Owner/Repo] [--toolchain CHANNEL] [--offline] [--reference-artifact DIRECTORY] [--refresh-reference] [--docs-only]\nSet YOSOI_REPO_ROOT for a non-neighbor checkout. No source changes, signing, publication, or deployment.',
		);
	else await prepareDocs(options);
}
