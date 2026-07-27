/**
 * Adapted from @dpopsuev/alef-tui's Table component (MIT, Mario Zechner) --
 * same rendering logic, with the direct `visibleWidth`/`truncateToWidth`
 * import replaced by an injected TextMeasure port so this file has no
 * dependency on any specific host TUI package.
 */
import type { Component } from "../component.js";
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
}

function padCell(text: string, width: number, align: "left" | "right", measure: TextMeasure): string {
	const w = measure.visibleWidth(text);
	const gap = Math.max(0, width - w);
	return align === "right" ? " ".repeat(gap) + text : text + " ".repeat(gap);
}

/** Renders tabular data (columns and rows) with auto-sized or fixed column widths and a header separator. No scrolling/pagination of its own -- a host embeds this inside a scrollable container for large row counts. */
export class Table implements Component {
	private readonly measure: TextMeasure;

	constructor(private opts: TableOptions) {
		this.measure = opts.measure ?? asciiTextMeasure;
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

		const separator = columns.map((_, i) => "─".repeat(colWidths[i] as number)).join(" ".repeat(gap));
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
