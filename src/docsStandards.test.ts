import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '..');
const sourceDocsRoot = path.resolve(repoRoot, 'docs', 'yosoi-docs');
const generatedDocsRoot = path.resolve(
	repoRoot,
	'.generated',
	'docs',
	'yosoi-docs',
);
const docsRoot = existsSync(sourceDocsRoot)
	? sourceDocsRoot
	: generatedDocsRoot;

type DocFile = {
	relativePath: string;
	source: string;
};

function walkDocs(dir: string, base = dir): DocFile[] {
	return readdirSync(dir).flatMap((entry) => {
		const fullPath = path.join(dir, entry);
		const stats = statSync(fullPath);
		if (stats.isDirectory()) {
			if (entry === '.git' || entry === 'node_modules') {
				return [];
			}
			return walkDocs(fullPath, base);
		}
		if (!/\.(md|mdx)$/.test(entry)) {
			return [];
		}
		return [
			{
				relativePath: path.relative(base, fullPath).replaceAll(path.sep, '/'),
				source: readFileSync(fullPath, 'utf8'),
			},
		];
	});
}

function splitFrontmatter(source: string): {
	frontmatter: string;
	body: string;
} {
	if (!source.startsWith('---\n')) {
		return { frontmatter: '', body: source };
	}
	const end = source.indexOf('\n---', 4);
	if (end === -1) {
		return { frontmatter: '', body: source };
	}
	const bodyStart = source.indexOf('\n', end + 4);
	return {
		frontmatter: source.slice(4, end),
		body: source.slice(bodyStart + 1),
	};
}

function extractFaqQuestions(source: string): string[] {
	return [...source.matchAll(/<summary>(.*?)<\/summary>/gs)].map((match) =>
		normalizeText(match[1]),
	);
}

function extractFrontmatterFaqQuestions(frontmatter: string): string[] {
	const questions: string[] = [];
	for (const match of frontmatter.matchAll(/^\s*-\s*q:\s*(.+)$/gm)) {
		questions.push(stripYamlScalar(match[1]));
	}
	return questions;
}

function stripYamlScalar(value: string): string {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		try {
			return JSON.parse(trimmed);
		} catch {
			return trimmed.slice(1, -1);
		}
	}
	return trimmed;
}

function normalizeText(value: string): string {
	return value
		.replace(/<sup>.*?<\/sup>/gs, '')
		.replace(/<[^>]+>/g, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

function routeForDoc(relativePath: string): string {
	return relativePath
		.replace(/\.(md|mdx)$/, '')
		.replace(/(^|\/)index$/, '')
		.replace(/\/$/, '');
}

describe('Yosoi docs standards', () => {
	const docs = walkDocs(docsRoot).filter(
		(doc) => !doc.relativePath.startsWith('.github/'),
	);
	const routes = new Set(docs.map((doc) => routeForDoc(doc.relativePath)));

	function astroConfigSource(): string {
		return readFileSync(path.join(repoRoot, 'astro.config.mjs'), 'utf8');
	}

	it('mirrors visible FAQs into frontmatter for FAQ JSON-LD', () => {
		const failures: string[] = [];

		for (const doc of docs) {
			const visibleQuestions = extractFaqQuestions(doc.source);
			if (visibleQuestions.length === 0) {
				continue;
			}

			const { frontmatter } = splitFrontmatter(doc.source);
			const metadataQuestions = extractFrontmatterFaqQuestions(frontmatter);
			if (
				metadataQuestions.length !== visibleQuestions.length ||
				!visibleQuestions.every((question) =>
					metadataQuestions.includes(question),
				)
			) {
				failures.push(
					`${doc.relativePath}: expected frontmatter faqs for ${visibleQuestions.join(
						' | ',
					)}`,
				);
			}
		}

		expect(failures).toEqual([]);
	});

	it('keeps FAQ JSON-LD centralized in Head.astro', () => {
		const offenders = docs
			.filter((doc) => /"@type":\s*"FAQPage"/.test(doc.source))
			.map((doc) => doc.relativePath);

		expect(offenders).toEqual([]);
	});

	it('uses the shared Yosoi figure style for authored figures', () => {
		const failures: string[] = [];

		for (const doc of docs) {
			for (const match of doc.source.matchAll(/<figure\b[^>]*>/g)) {
				const figureStart = match[0];
				const figureBlock = doc.source.slice(
					match.index,
					doc.source.indexOf('</figure>', match.index) + '</figure>'.length,
				);
				if (!/class=["'][^"']*\bys-figure\b/.test(figureStart)) {
					failures.push(`${doc.relativePath}: figure missing ys-figure class`);
				}
				if (!/<figcaption\b/.test(figureBlock)) {
					failures.push(`${doc.relativePath}: figure missing figcaption`);
				}
			}
		}

		expect(failures).toEqual([]);
	});

	it('keeps the fingerprinting rename and target pages wired', () => {
		const combined = docs.map((doc) => doc.source).join('\n');
		const astroConfig = astroConfigSource();

		expect(routes.has('guides/fingerprinting')).toBe(true);
		expect(routes.has('guides/page-identity-reuse')).toBe(true);
		expect(combined).not.toContain('Fingerprinting Technology');
		expect(combined).not.toContain('fingerprinting-technology');
		expect(astroConfig).toContain(
			"'/guides/fingerprinting-technology/': '/guides/fingerprinting/'",
		);
	});

	it('keeps Yosoi sidebar slugs backed by docs pages', () => {
		const astroConfig = astroConfigSource();
		const slugs = [...astroConfig.matchAll(/slug:\s*['"]([^'"]+)['"]/g)].map(
			(match) => match[1],
		);
		const yosoiOwnedSlug =
			/^(guides|observability|reference|yosoi)(\/|$)|^(roadmap|contributing)$/;
		const missing = slugs
			.filter((slug) => yosoiOwnedSlug.test(slug))
			.filter((slug) => !routes.has(slug));

		expect(missing).toEqual([]);
	});

	it('blocks stale Yosoi docs labels and examples', () => {
		const stalePatterns = [
			/Fingerprinting Technology/,
			/fingerprinting-technology/,
			/Yosoi-Docs/,
			/Feature and documentation planned/,
			/More integrations TBD/,
			/Pipeline\(debug=True\)/,
			/static fetcher won't see/,
			/raw HTML \(for now\)/,
			/native DOM fetcher .*not available yet/i,
			/create_fetcher\((['"])browser\1\)/,
			/yosoi\.vc/,
			/Pipeline\(config,/,
			/multiple `--url` flags/,
		];
		const failures = docs.flatMap((doc) =>
			stalePatterns
				.filter((pattern) => pattern.test(doc.source))
				.map((pattern) => `${doc.relativePath}: ${pattern}`),
		);

		expect(failures).toEqual([]);
	});
});
