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
			row[key] = value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value);
		}
		return row;
	});
	return { columns, rows };
}

function padCell(text: string, width: number, align: "left" | "right", measure: TextMeasure): string {
	const w = measure.visibleWidth(text);
	const gap = Math.max(0, width - w);
	return align === "right" ? " ".repeat(gap) + text : text + " ".repeat(gap);
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

		const colWidths = columns.map((col) => {
			if (col.width) return col.width;
			const headerW = measure.visibleWidth(col.header);
			const maxCellW = rows.reduce((max, row) => Math.max(max, measure.visibleWidth(row[col.key] ?? "")), 0);
			return Math.max(headerW, maxCellW);
		});

		const totalWidth = colWidths.reduce((s, w) => s + w + gap, -gap);
		if (totalWidth > width && colWidths.length > 0) {
			const last = colWidths.length - 1;
			colWidths[last] = Math.max(4, width - (totalWidth - (colWidths[last] as number)));
		}

		const lines: string[] = [];

		const headerLine = columns
			.map((col, i) => {
				const text = measure.truncateToWidth(col.header, colWidths[i] as number, "…");
				const padded = padCell(text, colWidths[i] as number, col.align ?? "left", measure);
				return headerStyle ? headerStyle(padded) : padded;
			})
			.join(" ".repeat(gap));
		lines.push(headerLine);

		const separator = columns.map((_, i) => this.glyphs.line.thin.repeat(colWidths[i] as number)).join(" ".repeat(gap));
		lines.push(separator);

		for (const row of rows) {
			const rowLine = columns
				.map((col, i) => {
					const raw = row[col.key] ?? "";
					const text = measure.truncateToWidth(raw, colWidths[i] as number, "…");
					const padded = padCell(text, colWidths[i] as number, col.align ?? "left", measure);
					return cellStyle ? cellStyle(padded, col.key) : padded;
				})
				.join(" ".repeat(gap));
			lines.push(rowLine);
		}

		return lines;
	}
}
