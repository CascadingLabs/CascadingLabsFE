import DOMPurify from 'dompurify';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { bundledLanguages } from 'shiki/langs';
import { bundledThemes } from 'shiki/themes';

let highlighter: Promise<HighlighterCore> | undefined;

/** Highlight sanitized archive code using the same themes as Astro's static pages. */
export async function highlightArchiveCode(root: ParentNode) {
	for (const pre of root.querySelectorAll('pre')) {
		const code = pre.querySelector('code');
		if (!code || pre.classList.contains('astro-code') || pre.classList.contains('shiki')) continue;
		const language = [...code.classList]
			.find((name) => name.startsWith('language-'))
			?.slice('language-'.length);
		// Untagged and unknown fences remain readable plain text.
		if (!language || !Object.hasOwn(bundledLanguages, language)) continue;
		const grammar = bundledLanguages[language as keyof typeof bundledLanguages];
		highlighter ||= createHighlighterCore({
			engine: createJavaScriptRegexEngine(),
			themes: [bundledThemes['github-light'], bundledThemes['github-dark']],
			langs: [],
		});
		const shiki = await highlighter;
		await shiki.loadLanguage(grammar);
		const highlighted = DOMPurify.sanitize(
			shiki.codeToHtml(code.textContent || '', {
				lang: language,
				themes: { light: 'github-light', dark: 'github-dark' },
				defaultColor: false,
			}),
			{ USE_PROFILES: { html: true }, RETURN_DOM_FRAGMENT: true },
		);
		const tokens = highlighted.querySelector('code');
		if (tokens) {
			code.replaceChildren(...tokens.childNodes);
			pre.classList.add('astro-code');
		}
	}
}
