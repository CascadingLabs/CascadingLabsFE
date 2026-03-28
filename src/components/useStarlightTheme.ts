import { createSignal, onCleanup, onMount } from 'solid-js';

export function useStarlightTheme() {
	const [isDark, setIsDark] = createSignal(true);

	onMount(() => {
		const check = () =>
			setIsDark(
				document.documentElement.getAttribute('data-theme') !== 'light',
			);
		check();
		const observer = new MutationObserver(check);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme'],
		});
		onCleanup(() => observer.disconnect());
	});

	return isDark;
}
