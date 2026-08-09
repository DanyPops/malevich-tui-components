/**
 * Extracted from pi-papyrus's ContextViewport -- the pure segment-flattening
 * and stacked-usage-bar rendering half of "show where a context window's
 * tokens went, broken into segments and their items, honestly
 * distinguishing real usage from estimates".
 *
 * Deliberately NOT a stateful scroll-owning Component, matching
 * buildDetailLines' own division of labor: scroll windowing needs a host's
 * own TUI/terminal reference (a pi-jittor ContextViewport wraps these
 * functions in its own border/footer/scroll-offset chrome, the same way
 * pi-tickets' IssueDetailComponent wraps buildDetailLines).
 */
import { type GlyphTheme, unicodeGlyphs } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface ContextSegmentItem {
	label: string;
	estimatedTokens: number;
	/** Real tree children (e.g. message-history branches, task containment) -- rendered indented directly under this item, biggest-first. */
	children?: ContextSegmentItem[];
}

export interface ContextSegment {
	/** Identifies this segment for per-segment coloring (ContextRowsTheme/ContextBarTheme's colorFor) and as ContextRow.key -- any string a caller chooses, not a fixed enum, since different producers own different segment sets. */
	key: string;
	label: string;
	estimatedTokens: number;
	items?: ContextSegmentItem[];
	/** True for a segment that hasn't been measured yet (its estimatedTokens is a placeholder, not a real zero) -- kept visible rather than hidden, the same honesty concern an overshoot/unaccounted total exists to surface elsewhere. */
	unknown?: boolean;
}

/**
 * One row in a unified scrollable view. Every segment that has any real
 * (nonzero) content is fully expanded inline -- there is no separate
 * "select a segment, then drill in" step. `key` drives this row's color;
 * `isHeader` distinguishes a segment's own summary line from its item rows
 * underneath it.
 */
export interface ContextRow {
	key: string;
	isHeader: boolean;
	text: string;
	/** Nesting depth for indentation -- 0 for a segment header or a top-level item, deeper for real tree children. */
	depth: number;
}

function percentOf(part: number, whole: number): string {
	return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—";
}

/** Recursively flattens one item and its real tree children into indented rows, sorted biggest-first at each level -- a parent always immediately precedes its own children, never scrambled by a global sort. */
function flattenItem(item: ContextSegmentItem, key: string, depth: number, rows: ContextRow[]): void {
	rows.push({ key, isHeader: false, depth, text: `${item.estimatedTokens.toString().padStart(6)} tok  ${item.label}` });
	const children = (item.children ?? []).filter((child) => child.estimatedTokens > 0).sort((a, b) => b.estimatedTokens - a.estimatedTokens);
	for (const child of children) flattenItem(child, key, depth + 1, rows);
}

/**
 * Flattens every segment with real content into one linear row list,
 * filtering out anything genuinely zero rather than displaying a
 * misleading "0 tok  0.0%" row -- a segment or item with literally nothing
 * in it carries no information and is pure noise in a view meant to show
 * where tokens actually go. A segment marked `unknown` stays visible even
 * at zero (not yet measured is not the same claim as measured-and-empty).
 * `totalTokens` (when given) is the real ground-truth denominator for each
 * segment's percentage; omitted, the sum of segment estimates is used
 * instead, for callers with no real total available.
 */
export function buildContextRows(segments: readonly ContextSegment[], totalTokens?: number | null): ContextRow[] {
	const rows: ContextRow[] = [];
	const denominator = totalTokens ?? segments.reduce((sum, segment) => sum + segment.estimatedTokens, 0);
	for (const segment of segments) {
		const items = (segment.items ?? []).filter((item) => item.estimatedTokens > 0).sort((a, b) => b.estimatedTokens - a.estimatedTokens);
		if (segment.estimatedTokens <= 0 && items.length === 0 && !segment.unknown) continue;
		rows.push({
			key: segment.key,
			isHeader: true,
			depth: 0,
			text: `${segment.label} — ${segment.estimatedTokens} tok (${percentOf(segment.estimatedTokens, denominator)})`,
		});
		for (const item of items) flattenItem(item, segment.key, 1, rows);
	}
	return rows;
}

export interface ContextRowsTheme {
	/** Per-segment fill/gutter color, keyed by ContextRow.key -- a caller with a fixed segment set can use a Record lookup; one with a dynamic/contributed set needs a real function (e.g. cycling a palette or falling back to a default for an unrecognized key). */
	colorFor: (key: string) => (s: string) => string;
	/** A segment header row's own text style, applied on top of colorFor's gutter color. */
	header: (s: string) => string;
	/** Leading gutter character per row. Default "▌". */
	gutter?: string;
}

/** Renders each row with its colored gutter, indentation, and header styling -- plain strings, truncated to `width`. Owns no scrolling or border chrome. */
export function renderContextRowLines(
	rows: readonly ContextRow[],
	width: number,
	theme: ContextRowsTheme,
	measure: TextMeasure = asciiTextMeasure,
	glyphs: GlyphTheme = unicodeGlyphs,
): string[] {
	const gutter = theme.gutter ?? glyphs.indicator.gutter;
	return rows.map((row) => {
		const indent = "  ".repeat(row.depth);
		const text = row.isHeader ? theme.header(row.text) : `${indent}${row.text}`;
		return measure.truncateToWidth(`${theme.colorFor(row.key)(gutter)} ${text}`, width, "");
	});
}

/**
 * Distributes `totalCells` proportionally across `weights` (parallel arrays), guaranteeing
 * every genuinely-positive weight gets at least one cell when there is room for all of them
 * to (totalCells >= weights.length) -- a real, nonzero segment must stay visible even when
 * dwarfed by a much larger one, not round away to nothing. The largest resulting cell count
 * absorbs whatever rounding leaves over or short, so the sum always equals totalCells exactly.
 */
function distributeCells(weights: readonly number[], totalCells: number): number[] {
	const sum = weights.reduce((a, b) => a + b, 0);
	if (sum <= 0 || totalCells <= 0 || weights.length === 0) return weights.map(() => 0);
	let cells = weights.map((weight) => Math.round((weight / sum) * totalCells));
	if (totalCells >= weights.length) cells = cells.map((count) => (count === 0 ? 1 : count));
	const diff = totalCells - cells.reduce((a, b) => a + b, 0);
	if (diff !== 0) {
		const maxIndex = cells.indexOf(Math.max(...cells));
		cells[maxIndex] = (cells[maxIndex] ?? 0) + diff;
	}
	return cells;
}

export interface ContextBarTheme {
	/** Per-segment fill color, keyed by ContextSegment.key. See ContextRowsTheme.colorFor. */
	colorFor: (key: string) => (s: string) => string;
	/** The unused/remaining portion of the window. */
	empty: (s: string) => string;
}

/**
 * Renders the context window as one horizontal stacked bar: one colored run of block
 * characters per USED segment, followed by a dim run of "░" cells for the remaining,
 * genuinely EMPTY context window. A zero-token breakdown (nothing observed yet) renders an
 * entirely dim track rather than a divide-by-zero, since 0 used really does mean the whole
 * window is empty right now.
 *
 * `capacity` is the real denominator (e.g. the model's effective usable budget, matching the
 * percentage shown alongside this bar). `usedTokens` is the real, ground-truth used amount the
 * used-vs-unused split is measured against -- NOT the sum of `segments`' own estimates, which
 * can independently overshoot the real total (segment estimates are approximations; the real
 * total, when known, is not). `usedTokens` defaults to the segment sum only when omitted, for
 * callers with no real total available. Segments split the USED portion proportionally to their
 * own estimated share of each other (via distributeCells, which also guarantees a tiny nonzero
 * segment stays visible rather than rounding to nothing next to a much larger one).
 */
export function renderContextUsageBar(
	theme: ContextBarTheme,
	segments: readonly ContextSegment[],
	width: number,
	capacity?: number,
	usedTokens?: number,
	glyphs: GlyphTheme = unicodeGlyphs,
): string {
	const estimatedSum = segments.reduce((sum, segment) => sum + segment.estimatedTokens, 0);
	if (estimatedSum <= 0 || width <= 0) return theme.empty(glyphs.progress.empty.repeat(Math.max(0, width)));
	const realUsed = usedTokens ?? estimatedSum;
	const usedWidth = capacity !== undefined ? Math.max(0, Math.min(width, Math.round((realUsed / capacity) * width))) : width;

	const nonZero = segments.filter((segment) => segment.estimatedTokens > 0);
	const cellCounts = distributeCells(
		nonZero.map((segment) => segment.estimatedTokens),
		usedWidth,
	);
	let output = "";
	nonZero.forEach((segment, index) => {
		const cells = cellCounts[index] ?? 0;
		if (cells > 0) output += theme.colorFor(segment.key)(glyphs.progress.filled.repeat(cells));
	});
	const emptyWidth = width - usedWidth;
	if (emptyWidth > 0) output += theme.empty(glyphs.progress.empty.repeat(emptyWidth));
	return output;
}
