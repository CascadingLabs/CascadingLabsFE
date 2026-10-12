/** Keep a visible mobile scroll control even when the browser hides native scrollbars. */
export function enhanceCodeScroll(pre: HTMLPreElement, wrapper: HTMLElement) {
	const control = document.createElement('input');
	control.type = 'range';
	control.className = 'docs-code-scroll';
	control.min = '0';
	control.step = '1';
	control.value = '0';
	control.setAttribute('aria-label', 'Scroll code horizontally');
	const sync = () => {
		const maximum = Math.max(0, pre.scrollWidth - pre.clientWidth);
		control.max = String(maximum);
		control.value = String(pre.scrollLeft);
		control.hidden = maximum <= 1;
	};
	control.addEventListener('input', () => {
		pre.scrollLeft = Number(control.value);
	});
	pre.addEventListener('scroll', sync, { passive: true });
	const observer = new ResizeObserver(sync);
	observer.observe(pre);
	const code = pre.querySelector('code');
	if (code) observer.observe(code);
	wrapper.append(control);
	sync();
}
