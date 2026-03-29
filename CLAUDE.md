see @AGENTS.md

refer to context7 for astro docs like /withastro/astro without having to be needed

## Reference system rules

- All inline reference symbols (e.g. `[△](#ref-1)`) must render as superscript. Use `<sup>` in markdown or rely on the CSS that applies `vertical-align: super` automatically.
- In the reference list at the bottom of a page, the leading symbol (△, ○, etc.) should only be a clickable back-link if an inline reference in the text actually points to it. If nothing references it, leave the symbol as plain text (no underline, no link behavior).