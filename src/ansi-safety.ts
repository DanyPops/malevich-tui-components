/**
 * A host's own `truncateToWidth` (e.g. `pi-tui`'s) may embed an unconditional full SGR
 * reset (`\x1b[0m`) after truncated/ellipsis text, even for plain, uncolored content.
 * That's fine on its own, but once an *outer* component paints one background color
 * across an entire line (wrapping it once, start to end), an embedded full reset from
 * a truncated inner cell kills that background early -- everything after it renders on
 * the terminal's own default background instead of the outer paint, since nothing
 * re-establishes it afterward.
 *
 * Replacing `\x1b[0m` with every SGR reset *except* background (`\x1b[49m`) preserves
 * the original intent -- stop whatever styling the truncated/ellipsis text carried --
 * without discarding a background this function has no visibility into and that's
 * applied by a caller further up the render tree.
 *
 * Lives here (rather than in any one host-adjacent package) because it's a fix for a
 * host truncation primitive's own behavior, not a Malevich component concern -- but
 * every affected package already depends on Malevich as its shared low-level toolkit,
 * making it the natural single home instead of each consumer re-deriving or reaching
 * into a sibling application package's internals for it.
 */
export function neutralizeEmbeddedFullResets(text: string): string {
	return text.replaceAll("\x1b[0m", "\x1b[22;23;24;25;27;28;29;39m");
}
