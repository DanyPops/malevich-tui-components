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

/**
 * Composes a host's own truncateToWidth (e.g. pi-tui's) with neutralizeEmbeddedFullResets --
 * the one canonical way to get an ANSI-safe truncated string, instead of every consumer
 * independently re-deriving this exact two-step pairing (found live, independently reimplemented
 * across at least three call sites in two separate repos, only one of which happened to guard
 * against a stale host resolution).
 *
 * `hostTruncateToWidth` is typed `unknown`, not a function signature, and checked at the call
 * site rather than trusted: a long-running process can hold an in-memory copy of the host
 * resolved from before some behavior existed there, while a more recently reloaded caller still
 * assumes it's present. Falls back to the untruncated text rather than throwing -- a rare
 * cosmetic regression (a line running long) is strictly better than a crash three frames deep
 * inside a render call, with nothing above it in the render tree to contain the failure.
 *
 * neutralizeEmbeddedFullResets itself needs no equivalent guard here: it's this module's own
 * top-level function, always defined by the time any code that successfully imported
 * safeTruncateToWidth could be running at all. The risk this function was written to guard
 * against is entirely on the host-supplied half, never on Malevich's own internals -- a
 * consumer that imports safeTruncateToWidth by name from a copy of Malevich stale enough to
 * predate this export needs its own guard around that import, the same way any caller of any
 * named export from any package does; no exporting package can protect a different, already-
 * resolved stale copy's missing binding.
 */
export function safeTruncateToWidth(
	hostTruncateToWidth: unknown,
	text: string,
	maxWidth: number,
	ellipsis?: string,
	pad?: boolean,
): string {
	const truncated =
		typeof hostTruncateToWidth === "function"
			? (hostTruncateToWidth as (value: string, width: number, ellipsisArg?: string, padArg?: boolean) => string)(
					text,
					maxWidth,
					ellipsis,
					pad,
				)
			: text;
	return neutralizeEmbeddedFullResets(truncated);
}
