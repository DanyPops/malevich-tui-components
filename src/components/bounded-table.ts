/**
 * Table has no row-count bound of its own ("no scrolling/pagination of its
 * own -- a host embeds this inside a scrollable container for large row
 * counts", per its own doc comment) -- every consumer that wants Pi's
 * familiar "show the first N, note how many more remain unless expanded"
 * shape for a Table's rows was either duplicating TruncatedList's own
 * arithmetic by hand (a real instance of this: a Vehicle-client-pi generic
 * renderer did exactly that for its array-of-objects fallback) or shipping
 * a Table with no bound at all (a real instance of this too: Lector's
 * repo_cache list tool). Both are the same gap TruncatedList already closed
 * for plain formatted-string lists, applied to Table's own row shape.
 */
import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { computeTruncationBounds } from "../truncation.js";
import { Table, type TableOptions } from "./table.js";

export interface BoundedTableOptions extends TableOptions {
	/** True to show every row with no "... more" line, matching Pi's tool-row expand affordance. */
	readonly expanded: boolean;
	/** How many rows to show when collapsed. */
	readonly visibleRowCount: number;
	/** Builds the trailing "... N more (hint)" line from the real hidden count -- only called when collapsed and more rows exist. Wording (any keybinding hint) is the caller's concern, keeping this host-agnostic. */
	readonly moreLine: (hiddenCount: number) => string;
}

/**
 * A Table bounded to `visibleRowCount` rows (or every row, once `expanded`),
 * with an optional trailing "... N more" line truncated to the render
 * width. `expanded`/`visibleRowCount`/`moreLine` are fixed at construction,
 * matching the established convention elsewhere in this codebase of
 * rebuilding a fresh component on every render pass with the current
 * `expanded` value rather than mutating one in place -- setRows exists only
 * for refreshing row content (e.g. a partial result still streaming in),
 * not for changing the expand state of an existing instance.
 */
export class BoundedTable implements Component {
	private readonly measure: TextMeasure;
	private rows: Record<string, string>[];

	constructor(private readonly opts: BoundedTableOptions) {
		this.measure = opts.measure ?? asciiTextMeasure;
		this.rows = opts.rows;
	}

	setRows(rows: Record<string, string>[]): void {
		this.rows = rows;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const { displayCount, hiddenCount } = computeTruncationBounds(this.rows.length, this.opts.visibleRowCount, this.opts.expanded);
		const table = new Table({ ...this.opts, rows: this.rows.slice(0, displayCount) });
		const lines = table.render(width);
		if (hiddenCount <= 0) return lines;
		lines.push(this.measure.truncateToWidth(this.opts.moreLine(hiddenCount), width));
		return lines;
	}
}

/** Convenience wrapper matching TruncatedList's function-call style; equivalent to `new BoundedTable(options)`. */
export function renderBoundedTable(options: BoundedTableOptions): BoundedTable {
	return new BoundedTable(options);
}
