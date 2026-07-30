/**
 * A host theme often maps several distinct semantic tokens (e.g. a "muted
 * border" color and a "dim" color) to the exact same underlying color when
 * it hasn't bothered defining every token distinctly. Styling with the more
 * specific token then looks identical to styling with plain text -- not
 * wrong, just visually flat. This is the generic algorithm behind that
 * fix: try each candidate in preference order, keep the first one that's
 * actually different from a baseline (the styled-as-plain-text version of
 * the same string), and fall back to a final default if none of them are.
 *
 * Operates on already-styled strings -- no knowledge of what a "theme" or
 * a "token" is, so a host wires its own theme's styling calls into the
 * candidate list.
 */
export function firstDistinctStyle(baseline: string, candidates: ReadonlyArray<string | undefined>, fallback: string): string {
	for (const candidate of candidates) {
		if (candidate !== undefined && candidate !== baseline) return candidate;
	}
	return fallback;
}
