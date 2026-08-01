/**
 * Real unified-diff rendering (the `diff -u`/`git diff` format: `diff
 * --git`/`index`/`---`/`+++` file headers, `@@ -a,b +c,d @@` hunk headers,
 * then ` `/`+`/`-`-prefixed body lines) -- distinct from pi-coding-agent's
 * own built-in diff renderer, which operates on Pi's internal
 * pre-reformatted "-123 content"/"+123 content" representation from its
 * own edit pipeline, not a real unified diff string. Lector's git_diff and
 * apply_patch both hand back real unified-diff text (see
 * @danypops/lector's GitDiffResult/parseUnifiedDiff), which had zero
 * add/remove coloring before this -- plain text, indistinguishable +/-
 * lines.
 *
 * Line-level coloring only, no intra-line word diffing -- that needs a
 * real diffing library and Malevich stays dependency-free for something
 * this component doesn't strictly need. A host wanting intra-line
 * highlighting still composes its own on top of `classifyDiffLine`.
 */
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export type DiffLineKind = "add" | "remove" | "context" | "hunk" | "header" | "other";

export interface DiffTheme {
	add?: (s: string) => string;
	remove?: (s: string) => string;
	context?: (s: string) => string;
	hunk?: (s: string) => string;
	header?: (s: string) => string;
}

const IDENTITY = (s: string): string => s;

/**
 * Classifies one raw diff line. Order matters: `+++`/`---` (file headers)
 * must be checked before the bare `+`/`-` add/remove check, or a naive
 * single-character prefix test misreads `+++ b/file.ts` as an added line
 * whose content is `++ b/file.ts`. A truly empty line is real git diff
 * output for a blank context line (git doesn't bother emitting a trailing
 * space for it), so it classifies as context, not other.
 */
export function classifyDiffLine(line: string): DiffLineKind {
	if (line.startsWith("@@")) return "hunk";
	if (line.startsWith("+++") || line.startsWith("---")) return "header";
	if (line.startsWith("diff --git") || line.startsWith("index ")) return "header";
	if (line.startsWith("+")) return "add";
	if (line.startsWith("-")) return "remove";
	if (line.startsWith(" ") || line.length === 0) return "context";
	return "other";
}

function styleFor(kind: DiffLineKind, theme: DiffTheme): (s: string) => string {
	switch (kind) {
		case "add":
			return theme.add ?? IDENTITY;
		case "remove":
			return theme.remove ?? IDENTITY;
		case "context":
			return theme.context ?? IDENTITY;
		case "hunk":
			return theme.hunk ?? IDENTITY;
		case "header":
			return theme.header ?? IDENTITY;
		default:
			return IDENTITY;
	}
}

/**
 * Styles and width-truncates real unified-diff text, one output line per
 * input line. Every returned line is truncated to `width` (never wrapped
 * -- wrapping a diff line breaks its +/- alignment on the continuation
 * row, so a too-long line is truncated with an ellipsis instead, same
 * tradeoff Table makes for an oversized cell). A trailing newline is
 * stripped first, matching @danypops/lector's own parseUnifiedDiff, so it
 * doesn't manufacture a spurious empty final line no real diff tool emits.
 */
export function renderDiffLines(width: number, diffText: string, theme: DiffTheme = {}, measure: TextMeasure = asciiTextMeasure): string[] {
	if (diffText.length === 0) return [];
	const lines = diffText.replace(/\n$/, "").split("\n");
	return lines.map((line) => measure.truncateToWidth(styleFor(classifyDiffLine(line), theme)(line), width));
}
