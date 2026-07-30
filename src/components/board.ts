/**
 * Generic multi-column card board (Kanban-style): items are grouped into a
 * fixed set of columns, one card per item, with keyboard-navigable
 * selection across the whole grid. Card content is entirely caller-supplied
 * (renderItem) -- this component only owns column layout, header counts,
 * and selection movement, the same split Table draws between generic
 * tabular layout and caller-supplied cell values.
 */
import type { Component } from "../component.js";
import type { KeyMatcher } from "../key-matcher.js";
import { legacyKeyMatcher } from "../key-matcher.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { Badge } from "./badge.js";

export interface BoardColumn<T> {
	name: string;
	items: T[];
}

export interface BoardSelection {
	column: number;
	index: number;
}

export interface BoardItemRange {
	start: number;
	end: number;
}

export interface BoardTheme {
	header: (s: string) => string;
	border: (s: string) => string;
	empty: (s: string) => string;
}

export interface BoardOptions<T> {
	columns: BoardColumn<T>[];
	renderItem: (item: T, width: number, selected: boolean) => string[];
	theme: BoardTheme;
	/** Fires when Enter is pressed on a selected item. */
	onSelect?: (item: T) => void;
	/** Fires when Escape is pressed. */
	onClose?: () => void;
	emptyLabel?: string;
	minColumnWidth?: number;
	measure?: TextMeasure;
	matchesKey?: KeyMatcher;
}

/**
 * No scrolling/pagination of its own -- same as Table, a host wraps this in
 * its own viewport for a board taller than the terminal, using
 * getItemRanges() to scroll the current selection into view.
 */
export class Board<T> implements Component {
	private selection: BoardSelection;
	private ranges: BoardItemRange[][] = [];
	private readonly measure: TextMeasure;
	private readonly matchesKey: KeyMatcher;

	constructor(private readonly opts: BoardOptions<T>) {
		this.measure = opts.measure ?? asciiTextMeasure;
		this.matchesKey = opts.matchesKey ?? legacyKeyMatcher;
		const firstNonEmpty = opts.columns.findIndex((c) => c.items.length > 0);
		this.selection = { column: Math.max(0, firstNonEmpty), index: 0 };
	}

	getSelection(): BoardSelection {
		return this.selection;
	}

	getSelectedItem(): T | undefined {
		return this.opts.columns[this.selection.column]?.items[this.selection.index];
	}

	/** Row range each rendered card occupies, indexed [column][item] -- valid as of the most recent render(). */
	getItemRanges(): BoardItemRange[][] {
		return this.ranges;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const { columns, theme, renderItem, minColumnWidth = 14, emptyLabel = "(empty)" } = this.opts;
		const gap = 1;
		const columnWidth = Math.max(minColumnWidth, Math.floor((width - gap * (columns.length - 1)) / columns.length));

		const rendered = columns.map((col, c) =>
			this.renderColumn(col, columnWidth, c === this.selection.column ? this.selection.index : -1, renderItem, theme, emptyLabel),
		);
		this.ranges = rendered.map((r) => r.ranges);

		const height = Math.max(0, ...rendered.map((r) => r.lines.length));
		const lines: string[] = [];
		for (let row = 0; row < height; row++) {
			lines.push(rendered.map((r) => this.padToWidth(r.lines[row] ?? "", columnWidth)).join(" ".repeat(gap)));
		}
		return lines;
	}

	handleInput(data: string): void {
		if (this.matchesKey(data, "escape")) {
			this.opts.onClose?.();
			return;
		}
		if (this.matchesKey(data, "enter")) {
			const item = this.getSelectedItem();
			if (item) this.opts.onSelect?.(item);
			return;
		}
		if (this.matchesKey(data, "up")) this.moveVertical(-1);
		else if (this.matchesKey(data, "down")) this.moveVertical(1);
		else if (this.matchesKey(data, "left")) this.moveHorizontal(-1);
		else if (this.matchesKey(data, "right")) this.moveHorizontal(1);
	}

	private moveVertical(delta: number): void {
		const items = this.opts.columns[this.selection.column]?.items ?? [];
		if (items.length === 0) return;
		this.selection = { ...this.selection, index: Math.max(0, Math.min(items.length - 1, this.selection.index + delta)) };
	}

	/** Skips past empty columns in the direction of travel; stops at the edge instead of wrapping around. */
	private moveHorizontal(delta: number): void {
		const columns = this.opts.columns;
		let next = this.selection.column;
		for (let i = 0; i < columns.length; i++) {
			next += delta;
			if (next < 0 || next >= columns.length) return;
			const target = columns[next];
			if (target && target.items.length > 0) {
				this.selection = { column: next, index: Math.min(this.selection.index, target.items.length - 1) };
				return;
			}
		}
	}

	private padToWidth(text: string, width: number): string {
		return text + " ".repeat(Math.max(0, width - this.measure.visibleWidth(text)));
	}

	private renderColumn(
		col: BoardColumn<T>,
		width: number,
		selectedIndex: number,
		renderItem: BoardOptions<T>["renderItem"],
		theme: BoardTheme,
		emptyLabel: string,
	): { lines: string[]; ranges: BoardItemRange[] } {
		const header = new Badge({ label: col.name, style: theme.header });
		header.setValue(col.items.length);
		const lines: string[] = [...header.render(width), theme.border("─".repeat(width))];
		const ranges: BoardItemRange[] = [];

		if (col.items.length === 0) lines.push(theme.empty(`  ${emptyLabel}`));

		col.items.forEach((item, i) => {
			const start = lines.length;
			lines.push(...renderItem(item, width, i === selectedIndex));
			ranges.push({ start, end: lines.length - 1 });
			lines.push("");
		});

		return { lines, ranges };
	}
}
