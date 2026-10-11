import { enhanceCodeVariants } from './docs-variants';

/** Attach controls after static rendering or an archive fetch. */
export function enhanceCodeBlocks(root: ParentNode) {
	enhanceCodeVariants(root);
	for (const pre of root.querySelectorAll<HTMLPreElement>('pre')) {
		const code = pre.querySelector('code');
		if (!code || pre.parentElement?.classList.contains('docs-code-block')) continue;
		const wrapper = document.createElement('div');
		wrapper.className = 'docs-code-block';
		pre.before(wrapper);
		wrapper.append(pre);
		const panel = wrapper.closest('.docs-variant-panel');
		if (panel && !panel.querySelector('.docs-variant-leading-code')) {
			wrapper.classList.add('docs-variant-leading-code');
		}
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'docs-copy-code';
		button.textContent = 'Copy';
		button.setAttribute('aria-label', 'Copy code');
		button.setAttribute('aria-live', 'polite');
		button.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(code.textContent || '');
				button.textContent = 'Copied!';
			} catch {
				button.textContent = 'Select code to copy';
				const range = document.createRange();
				range.selectNodeContents(code);
				const selection = window.getSelection();
				selection?.removeAllRanges();
				selection?.addRange(range);
			}
			setTimeout(() => {
				button.textContent = 'Copy';
			}, 2000);
		});
		wrapper.prepend(button);
	}
}
