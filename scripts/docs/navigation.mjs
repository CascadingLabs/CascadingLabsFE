import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as jsonc from 'jsonc-parser';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.resolve(project, process.env.YOSOI_REPO_ROOT || '../Yosoi', 'scripts/docs');
const navigation = await import(pathToFileURL(path.join(source, 'navigation.mjs')).href);
const content = await import(pathToFileURL(path.join(source, 'content.mjs')).href);
// Local preview and Yosoi CI use the same source-owned contracts.
export const resolveNavigation = navigation.resolveNavigation;
export const directoryNavigation = navigation.directoryNavigation;
export const referenceNavigation = navigation.referenceNavigation;
export const parseNavigationMetadata = (source) =>
	navigation.parseNavigationMetadata(source, jsonc);
export const {
	authoredPages,
	copyPublicTree,
	readPublicNavigation,
	rewriteMarkdownLinks,
	validateDocHeadings,
} = content;
export { jsonc };
