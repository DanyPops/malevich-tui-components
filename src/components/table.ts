/**
 * Adapted from @dpopsuev/alef-tui's Table component (MIT, Mario Zechner) --
 * same rendering logic, with the direct `visibleWidth`/`truncateToWidth`
 * import replaced by an injected TextMeasure port so this file has no
 * dependency on any specific host TUI package.
 */
import type { Component } from "../component.js";
import { unicodeGlyphs, type GlyphSet } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface TableColumn {
	header: string;
	key: string;
	/** Fixed column width. Omit to size the column to its widest header/cell. */
	width?: number;
	align?: "left" | "right";
}

export interface TableOptions {
	columns: TableColumn[];
	rows: Record<string, string>[];
	headerStyle?: (text: string) => string;
	cellStyle?: (text: string, key: string) => string;
	/** Defaults to ASCII-only measurement. Pass a host's real visibleWidth/truncateToWidth for correct Unicode/ANSI handling. */
	measure?: TextMeasure;
	/** Defaults to unicodeGlyphs. Pass asciiGlyphs (or a custom set) for terminals/fonts that render box-drawing poorly. */
	glyphs?: GlyphSet;
}

export interface DerivedTable {
	columns: TableColumn[];
	rows: Record<string, string>[];
}

/**
 * Given an array of unknown values, derives Table-ready columns/rows when
 * every item is a plain object (not an array, not null): the column set is
 * the union of keys across all items (insertion order of first appearance),
 * and each cell is the value as-is if it's already a string, else its JSON
 * representation. Returns undefined when the input isn't table-shaped
 * (empty, or any item isn't a plain object) -- a caller falls back to
 * whatever other rendering fits non-tabular data.
 */
export function deriveTableColumns(items: readonly unknown[]): DerivedTable | undefined {
	if (items.length === 0) return undefined;
	if (!items.every((item) => item !== null && typeof item === "object" && !Array.isArray(item))) return undefined;

	const keys = new Set<string>();
	for (const item of items as Record<string, unknown>[]) {
		for (const key of Object.keys(item)) keys.add(key);
	}
	const columns: TableColumn[] = [...keys].map((key) => ({ header: key, key }));
	const rows = (items as Record<string, unknown>[]).map((item) => {
		const row: Record<string, string> = {};
		for (const key of keys) {
			const value = item[key];
			row[key] = value === undefined ? "" : singleLine(typeof value === "string" ? value : JSON.stringify(value));
		}
		return row;
	});
	return { columns, rows };
}

/**
 * Collapses any embedded line breaks to a single space. A cell value with a real newline
 * (e.g. a multi-paragraph note body) breaks the one-array-entry-per-physical-terminal-line
 * contract every Component.render() consumer depends on: even when the raw string's own
 * character count stays within a column's width budget, the terminal starts a new physical
 * line the instant it hits the embedded newline mid-cell, and everything printed after it
 * keeps accumulating onto what the TUI framework still believes is a single, already-bounded
 * line -- the exact shape of a real crash (a notes_list result whose body field was a genuine
 * multi-line note). Table.render() applies this defensively too, for a caller that builds
 * rows directly instead of through deriveTableColumns.
 */
function singleLine(text: string): string {
	return text.replace(/\s*\n+\s*/g, " ");
}

function padCell(text: string, width: number, align: "left" | "right", measure: TextMeasure): string {
	const w = measure.visibleWidth(text);
	const gap = Math.max(0, width - w);
	return align === "right" ? " ".repeat(gap) + text : text + " ".repeat(gap);
}

const MIN_COLUMN_WIDTH = 4;

/**
 * Max-min fair-share water-filling: when the columns' natural widths don't
 * fit in the available budget, every column that's already narrower than an
 * equal share keeps its natural width, and the leftover budget that frees up
 * is redistributed evenly among whichever columns still need shrinking --
 * repeated until every column fits. Shrinking only the LAST column (the
 * previous approach here) assumed every other column was already reasonably
 * sized; that's false the moment an auto-derived table (arbitrary object
 * rows -- e.g. a full-text `body` field) puts an oversized column anywhere
 * other than last, and Pi's own renderer hard-fails (uncaughtException) the
 * instant a single rendered line exceeds the real terminal width.
 *
 * With minWidth=0 this is exact: the returned widths always sum to <=
 * budget. A caller wanting a readability floor (MIN_COLUMN_WIDTH) passes it
 * here first, but that floor can itself push the total over budget once
 * there are enough columns -- Pi's own "never exceed terminal width" rule
 * always wins, so the caller retries with minWidth=0 whenever it does.
 */
function fitColumnWidths(naturalWidths: number[], budget: number, minWidth: number): number[] {
	const n = naturalWidths.length;
	if (n === 0) return [];
	const order = naturalWidths.map((w, i) => ({ w, i })).sort((a, b) => a.w - b.w);
	const result = new Array<number>(n);
	let remaining = Math.max(0, budget);
	let remainingCount = n;
	for (const { w, i } of order) {
		const share = Math.floor(remaining / remainingCount);
		if (w <= share) {
			result[i] = w;
			remaining -= w;
		} else {
			result[i] = Math.max(minWidth, share);
			remaining -= result[i];
		}
		remainingCount -= 1;
	}
	return result;
}

/** Renders tabular data (columns and rows) with auto-sized or fixed column widths and a header separator. No scrolling/pagination of its own -- a host embeds this inside a scrollable container for large row counts. */
export class Table implements Component {
	private readonly measure: TextMeasure;
	private readonly glyphs: GlyphSet;

	constructor(private opts: TableOptions) {
		this.measure = opts.measure ?? asciiTextMeasure;
		this.glyphs = opts.glyphs ?? unicodeGlyphs;
	}

	setRows(rows: Record<string, string>[]): void {
		this.opts.rows = rows;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const { columns, rows, headerStyle, cellStyle } = this.opts;
		const measure = this.measure;
		const gap = 2;

		// Sanitized once up front (not just inside deriveTableColumns) so a caller building rows
		// directly, bypassing deriveTableColumns entirely, gets the same one-line-per-cell
		// guarantee -- natural-width sizing, truncation, and the final rendered line all agree on
		// the same already-single-line text instead of measuring/truncating raw multi-line content
		// and only cleaning it up afterward (too late to keep truncation's own math correct).
		const sanitizedRows = rows.map((row) => {
			const clean: Record<string, string> = {};
			for (const col of columns) clean[col.key] = singleLine(row[col.key] ?? "");
			return clean;
		});

		const naturalWidths = columns.map((col) => {
			if (col.width) return col.width;
			const headerW = measure.visibleWidth(col.header);
			const maxCellW = sanitizedRows.reduce((max, row) => Math.max(max, measure.visibleWidth(row[col.key] ?? "")), 0);
			return Math.max(headerW, maxCellW);
		});

		const totalWidth = naturalWidths.reduce((s, w) => s + w + gap, -gap);
		const gapTotal = Math.max(0, columns.length - 1) * gap;
		let colWidths = naturalWidths;
		if (totalWidth > width && columns.length > 0) {
			colWidths = fitColumnWidths(naturalWidths, width - gapTotal, MIN_COLUMN_WIDTH);
			// The readability floor above can itself overrun the budget once there
			// are enough columns (e.g. 50 columns * a 4-char floor already exceeds
			// a 60-char terminal on its own, before any content). Pi's hard rule
			// against overwide lines always wins over that floor.
			if (colWidths.reduce((s, w) => s + w, 0) + gapTotal > width) {
				colWidths = fitColumnWidths(naturalWidths, width - gapTotal, 0);
			}
		}

		// Absolute last resort: column-width fitting above guarantees the fit
		// whenever there's genuinely enough room for the gaps between columns
		// alone, but a truly degenerate case (more columns than the terminal
		// has room for even at zero content width per column, i.e. the fixed
		// gaps alone exceed the given width) has no valid column-width solution
		// at all. Pi's own rule (never render a line wider than the real
		// terminal) is non-negotiable -- an unreadable hard-truncated line
		// beats crashing the whole session.
		const clampLine = (line: string): string => (measure.visibleWidth(line) > width ? measure.truncateToWidth(line, width, "") : line);

		const lines: string[] = [];

		const headerLine = columns
			.map((col, i) => {
				const text = measure.truncateToWidth(col.header, colWidths[i] as number, "…");
				const padded = padCell(text, colWidths[i] as number, col.align ?? "left", measure);
				return headerStyle ? headerStyle(padded) : padded;
			})
			.join(" ".repeat(gap));
		lines.push(clampLine(headerLine));

		const separator = columns.map((_, i) => this.glyphs.line.thin.repeat(colWidths[i] as number)).join(" ".repeat(gap));
		lines.push(clampLine(separator));

		for (const row of sanitizedRows) {
			const rowLine = columns
				.map((col, i) => {
					const raw = row[col.key] ?? "";
					const text = measure.truncateToWidth(raw, colWidths[i] as number, "…");
					const padded = padCell(text, colWidths[i] as number, col.align ?? "left", measure);
					return cellStyle ? cellStyle(padded, col.key) : padded;
				})
				.join(" ".repeat(gap));
			lines.push(clampLine(rowLine));
		}

		return lines;
	}
}
