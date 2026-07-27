/**
 * A component that needs to measure/truncate text to a column width takes
 * this as an injected port rather than importing a concrete implementation.
 * Both `@earendil-works/pi-tui` and `@dpopsuev/alef-tui` already export a
 * correct, Unicode-width-aware, ANSI-stripping pair of functions matching
 * this exact shape (`visibleWidth`/`truncateToWidth`) -- a host wires its
 * own straight through. `asciiTextMeasure` below is the dependency-free
 * fallback for plain ASCII content (short labels, numbers) where pulling in
 * a real host's implementation isn't warranted.
 */
export interface TextMeasure {
	visibleWidth(text: string): number;
	truncateToWidth(text: string, maxWidth: number, ellipsis?: string): string;
}

/**
 * Correct only for plain ASCII (one character = one column) -- no East
 * Asian Width, no ANSI-escape stripping, no combining characters. Good
 * enough for short machine-generated labels (engine names, numbers,
 * timestamps); a host with real Unicode/ANSI content should pass its own
 * `visibleWidth`/`truncateToWidth` instead.
 */
export const asciiTextMeasure: TextMeasure = {
	visibleWidth: (text) => text.length,
	truncateToWidth: (text, maxWidth, ellipsis = "…") => {
		if (maxWidth <= 0) return "";
		if (text.length <= maxWidth) return text;
		if (ellipsis.length >= maxWidth) return text.slice(0, maxWidth);
		return text.slice(0, maxWidth - ellipsis.length) + ellipsis;
	},
};
