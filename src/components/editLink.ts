/**
 * Maps the Starlight-generated `editUrl` to the correct upstream docs repo.
 *
 * The `.generated/docs/yosoi-docs/`, `.generated/docs/voidcrawl-docs/`, and
 * `.generated/docs/opensesame-docs/` directories are materialized from the
 * standalone docs repos. We rewrite Starlight's synthesized edit URL by
 * stripping the generated prefix and prepending the upstream `/blob/main/`
 * URL - `/blob/` (not `/edit/`) so the link points at the rendered file on
 * GitHub rather than dropping the user straight into the editor.
 *
 * Starlight (>= 0.38) hands us `editUrl` as a `URL` object — not a string —
 * so callers must accept either form.
 */

const YOSOI_SEGMENT = '/.generated/docs/yosoi-docs/';
const VOIDCRAWL_SEGMENT = '/.generated/docs/voidcrawl-docs/';
const OPENSESAME_SEGMENT = '/.generated/docs/opensesame-docs/';

const YOSOI_EDIT_BASE = 'https://github.com/CascadingLabs/YosoiDocs/blob/main/';
const VOIDCRAWL_EDIT_BASE =
	'https://github.com/CascadingLabs/VoidCrawlDocs/blob/main/';
const OPENSESAME_EDIT_BASE =
	'https://github.com/CascadingLabs/OpenSesameDocs/blob/main/';

export function transformEditUrl(
	editUrl: URL | string | undefined | null,
): string | undefined {
	if (!editUrl) {
		return undefined;
	}
	const href = typeof editUrl === 'string' ? editUrl : editUrl.href;

	const opensesameIdx = href.indexOf(OPENSESAME_SEGMENT);
	if (opensesameIdx !== -1) {
		return (
			OPENSESAME_EDIT_BASE +
			href.slice(opensesameIdx + OPENSESAME_SEGMENT.length)
		);
	}

	const voidcrawlIdx = href.indexOf(VOIDCRAWL_SEGMENT);
	if (voidcrawlIdx !== -1) {
		return (
			VOIDCRAWL_EDIT_BASE + href.slice(voidcrawlIdx + VOIDCRAWL_SEGMENT.length)
		);
	}

	const yosoiIdx = href.indexOf(YOSOI_SEGMENT);
	if (yosoiIdx !== -1) {
		return YOSOI_EDIT_BASE + href.slice(yosoiIdx + YOSOI_SEGMENT.length);
	}

	return href;
}
