export function referenceMarkdown(
	page: { publicPath: string; [key: string]: unknown },
	manifest: { sdk: { crate: string } },
	descriptors: Array<{ publicPath: string; route: string; kind: string; summary?: string }>,
): string;
export function referenceSummary(docs?: string): string;
