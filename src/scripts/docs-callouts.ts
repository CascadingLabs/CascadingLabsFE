import DOMPurify from 'dompurify';
import { Marked } from 'marked';

const markdown = new Marked({ async: false });
type Annotation = { line: number; offset: number; text: string; standalone: boolean };

/** Recognize annotation comments without interpreting strings as comments. */
export function parseCodeCallouts(source: string, language: string): Annotation[] {
	const annotations: Annotation[] = [];
	let quote = '';
	let raw = false;
	let blockDepth = 0;
	for (const [line, text] of source.split('\n').entries()) {
		for (let offset = 0; offset < text.length; offset++) {
			const rest = text.slice(offset);
			if (quote) {
				if (!raw && rest.startsWith('\\')) offset++;
				else if (rest.startsWith(quote)) {
					offset += quote.length - 1;
					quote = '';
					raw = false;
				}
				continue;
			}
			if (blockDepth) {
				if (rest.startsWith('/*')) {
					blockDepth++;
					offset++;
				} else if (rest.startsWith('*/')) {
					blockDepth--;
					offset++;
				}
				continue;
			}
			const comment =
				rest.startsWith('//') ||
				(rest.startsWith('#') && (offset === 0 || /\s/.test(text.slice(offset - 1, offset))));
			if (comment) {
				const match = /^(?:#|\/\/\/?)\s*callout:\s*(.+?)\s*$/.exec(rest);
				if (match?.[1])
					annotations.push({
						line,
						offset,
						text: match[1],
						standalone: !text.slice(0, offset).trim(),
					});
				break;
			}
			if (rest.startsWith('/*')) {
				blockDepth++;
				offset++;
				continue;
			}
			const rawStart = language === 'rust' ? /^r(#{0,255})"/.exec(rest) : null;
			if (rawStart) {
				quote = '"' + (rawStart[1] || '');
				raw = true;
				offset += rawStart[0].length - 1;
			} else if (rest.startsWith('"""') || rest.startsWith("'''")) {
				quote = rest.slice(0, 3);
				offset += 2;
			} else if (
				rest.startsWith('"') ||
				(rest.startsWith("'") && (language !== 'rust' || /^'(?:\\.|[^'\\])'/.test(rest)))
			) {
				quote = rest.slice(0, 1);
			}
		}
	}
	return annotations;
}

function trimLine(line: HTMLElement, offset: number) {
	const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode();
	let remaining = offset;
	while (node) {
		const length = node.textContent?.length || 0;
		if (remaining <= length) {
			const range = document.createRange();
			range.setStart(node, remaining);
			range.setEnd(line, line.childNodes.length);
			range.deleteContents();
			return;
		}
		remaining -= length;
		node = walker.nextNode();
	}
}

let nextId = 0;

/** Add controls to highlighted code without changing the text copied by the reader. */
export function enhanceCodeCallouts(pre: HTMLPreElement, wrapper: HTMLElement) {
	const code = pre.querySelector('code');
	if (!code || pre.dataset.docsCallouts) return;
	pre.dataset.docsCallouts = 'true';
	const language =
		pre.dataset.language ||
		[...code.classList].find((name) => name.startsWith('language-'))?.slice(9) ||
		'';
	const annotations = parseCodeCallouts(code.textContent || '', language);
	const lines = Array.from(code.querySelectorAll<HTMLElement>(':scope > .line'));
	if (!lines.length || !annotations.length) return;
	const standalone = new Set(
		annotations.filter((item) => item.standalone).map((item) => item.line),
	);
	const notes = document.createElement('ol');
	notes.className = 'docs-callout-notes';
	const placements = annotations.flatMap((item) => {
		let target = item.line;
		if (item.standalone) {
			target++;
			while (
				target < lines.length &&
				(standalone.has(target) || !lines[target]?.textContent?.trim())
			)
				target++;
		}
		const anchor = lines[target];
		const source = lines[item.line];
		if (!anchor || !source) {
			console.warn('Callout has no following code line:', item.text);
			return [];
		}
		return [{ ...item, anchor, source }];
	});
	// Strip all annotations before adding controls, so DOM offsets still refer to source text.
	for (const item of placements) {
		if (item.standalone) {
			const separator = item.source.nextSibling;
			if (separator?.nodeType === Node.TEXT_NODE && separator.textContent?.startsWith('\n')) {
				separator.textContent = separator.textContent.slice(1);
			}
			item.source.remove();
		} else trimLine(item.source, item.offset);
	}
	for (const [index, item] of placements.entries()) {
		const number = index + 1;
		const id = 'docs-callout-' + nextId++;
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'docs-callout-marker';
		button.setAttribute('aria-label', 'Code explanation ' + number);
		button.setAttribute('aria-expanded', 'false');
		button.setAttribute('aria-controls', id);
		button.setAttribute('popovertarget', id);
		const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		icon.setAttribute('viewBox', '0 0 24 24');
		icon.setAttribute('aria-hidden', 'true');
		for (const [path, className] of [
			['M5 12h14', ''],
			['M12 5v14', 'docs-callout-vertical'],
		]) {
			const stroke = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			stroke.setAttribute('d', path || '');
			if (className) stroke.setAttribute('class', className);
			icon.append(stroke);
		}
		button.append(icon);
		const popover = document.createElement('div');
		popover.id = id;
		popover.className = 'docs-callout-popover';
		popover.setAttribute('popover', 'auto');
		popover.setAttribute('role', 'region');
		popover.setAttribute('aria-label', 'Code explanation ' + number);
		const content = DOMPurify.sanitize(markdown.parseInline(item.text) as string, {
			ALLOWED_TAGS: ['code', 'em', 'strong', 'a'],
			ALLOWED_ATTR: ['href', 'title'],
			RETURN_DOM_FRAGMENT: true,
		});
		const note = document.createElement('li');
		note.append(content.cloneNode(true));
		notes.append(note);
		popover.append(content);
		const position = () => {
			const rect = button.getBoundingClientRect();
			const width = popover.getBoundingClientRect().width;
			const height = popover.getBoundingClientRect().height;
			popover.style.left = Math.max(12, Math.min(rect.left, innerWidth - width - 12)) + 'px';
			const below = rect.bottom + 10;
			popover.style.top =
				Math.max(12, below + height <= innerHeight - 12 ? below : rect.top - height - 10) + 'px';
		};
		let events: AbortController | undefined;
		popover.addEventListener('toggle', (event) => {
			const open = (event as ToggleEvent).newState === 'open';
			button.setAttribute('aria-expanded', String(open));
			events?.abort();
			if (!open) return;
			position();
			events = new AbortController();
			window.addEventListener('scroll', position, {
				capture: true,
				passive: true,
				signal: events.signal,
			});
			window.addEventListener('resize', position, { signal: events.signal });
		});
		item.anchor.append(button);
		wrapper.append(popover);
	}
	wrapper.after(notes);
}
