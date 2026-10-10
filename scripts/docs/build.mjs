import { build } from 'astro';
import { optionsFromArgs, prepareDocs, projectRoot } from './prepare.mjs';
await prepareDocs(optionsFromArgs(process.argv.slice(2)));
await build({ root: projectRoot });
