import { visit } from 'unist-util-visit';

const CALLOUT_TYPES = {
	note: { label: 'Note' },
	tip: { label: 'Tip' },
	warning: { label: 'Warning' },
	caution: { label: 'Caution' },
	important: { label: 'Important' },
};

const CALLOUT_RE = /^\[!(\w+)]\s*/i;

export default function remarkCallouts() {
	return (tree) => {
		visit(tree, 'blockquote', (node, index, parent) => {
			const first = node.children?.[0];
			if (!first || first.type !== 'paragraph') return;

			const firstInline = first.children?.[0];
			if (!firstInline || firstInline.type !== 'text') return;

			const match = firstInline.value.match(CALLOUT_RE);
			if (!match) return;

			const type = match[1].toLowerCase();
			const config = CALLOUT_TYPES[type];
			if (!config) return;

			// Strip the [!Note] prefix from the first text node
			firstInline.value = firstInline.value.slice(match[0].length);

			// If the text node is now empty, remove it
			if (!firstInline.value) {
				first.children.shift();
			}

			// Wrap in a div with a callout class
			parent.children[index] = {
				type: 'html',
				value: toCalloutHtml(type, config.label, node, first),
			};
		});
	};
}

function toCalloutHtml(type, label, node, firstParagraph) {
	// Collect all text content from the paragraph children
	const textParts = firstParagraph.children.map((child) => {
		if (child.type === 'text') return escapeHtml(child.value);
		if (child.type === 'inlineCode')
			return `<code>${escapeHtml(child.value)}</code>`;
		if (child.type === 'strong')
			return `<strong>${child.children.map((c) => escapeHtml(c.value)).join('')}</strong>`;
		if (child.type === 'emphasis')
			return `<em>${child.children.map((c) => escapeHtml(c.value)).join('')}</em>`;
		if (child.type === 'link')
			return `<a href="${escapeHtml(child.url)}">${child.children.map((c) => escapeHtml(c.value)).join('')}</a>`;
		return '';
	});

	return `<div class="cl-callout cl-callout--${type}"><p class="cl-callout__label">${escapeHtml(label)}</p><p>${textParts.join('')}</p></div>`;
}

function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}
