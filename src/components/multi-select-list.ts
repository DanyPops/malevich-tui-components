import type { Component } from "../component.js";
import { type GlyphTheme, unicodeGlyphs } from "../glyphs.js";
import type { KeyMatcher } from "../key-matcher.js";
import { legacyKeyMatcher } from "../key-matcher.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export type MultiSelectConfirmAction = "submit" | "toggle" | "activate";

function boundedRowCount(rows: number | undefined): number {
	return rows !== undefined && Number.isFinite(rows) ? Math.max(1, Math.floor(rows)) : 10;
}

export interface MultiSelectListItem<T> {
	readonly value: T;
	readonly label: string;
	readonly description?: string;
	readonly toggleable?: boolean;
	readonly includeInSelection?: boolean;
	readonly confirmAction?: MultiSelectConfirmAction;
	readonly shortcut?: string;
	readonly numberLabel?: string | false;
}

export type MultiSelectConfirmation<T> =
	| { readonly kind: "submit"; readonly values: T[] }
	| { readonly kind: "toggle"; readonly item: MultiSelectListItem<T>; readonly checked: boolean }
	| { readonly kind: "activate"; readonly item: MultiSelectListItem<T> };

/** Selection state without rendering or terminal input. */
export class MultiSelectListModel<T> {
	private selectedIndex = 0;
	private readonly checkedIndices = new Set<number>();
	private stateRevision = 0;

	constructor(
		private readonly items: readonly MultiSelectListItem<T>[],
		private readonly wrapNavigation = true,
	) {}

	get revision(): number {
		return this.stateRevision;
	}

	get focusedIndex(): number {
		return this.selectedIndex;
	}

	get focusedItem(): MultiSelectListItem<T> | undefined {
		return this.items[this.selectedIndex];
	}

	get checkedValues(): T[] {
		return this.items
			.filter((item, index) => this.checkedIndices.has(index) && item.includeInSelection !== false)
			.map((item) => item.value);
	}

	focus(index: number): void {
		if (this.items.length === 0 || !Number.isFinite(index)) return;
		const next = Math.max(0, Math.min(Math.floor(index), this.items.length - 1));
		if (next === this.selectedIndex) return;
		this.selectedIndex = next;
		this.stateRevision += 1;
	}

	focusNext(): void {
		this.moveFocus(1);
	}

	focusPrevious(): void {
		this.moveFocus(-1);
	}

	isChecked(index: number): boolean {
		return this.checkedIndices.has(index);
	}

	setChecked(index: number, checked: boolean): boolean | undefined {
		const item = this.items[index];
		if (!item || item.toggleable === false) return undefined;
		const previous = this.checkedIndices.has(index);
		if (checked) this.checkedIndices.add(index);
		else this.checkedIndices.delete(index);
		if (checked !== previous) this.stateRevision += 1;
		return checked;
	}

	toggle(index = this.selectedIndex): boolean | undefined {
		return this.setChecked(index, !this.checkedIndices.has(index));
	}

	confirmFocused(): MultiSelectConfirmation<T> | undefined {
		const item = this.focusedItem;
		if (!item) return undefined;
		const action = item.confirmAction ?? (item.toggleable === false ? "activate" : "submit");
		if (action === "toggle") {
			const checked = this.toggle();
			return checked === undefined ? undefined : { kind: "toggle", item, checked };
		}
		if (action === "activate") return { kind: "activate", item };
		if (action === "submit") {
			const checked = this.checkedValues;
			return { kind: "submit", values: checked.length > 0 ? checked : item.includeInSelection === false ? [] : [item.value] };
		}
		const exhaustive: never = action;
		return exhaustive;
	}

	private moveFocus(delta: -1 | 1): void {
		if (this.items.length === 0) return;
		const next = this.selectedIndex + delta;
		const resolved = this.wrapNavigation
			? (next + this.items.length) % this.items.length
			: Math.max(0, Math.min(next, this.items.length - 1));
		if (resolved === this.selectedIndex) return;
		this.selectedIndex = resolved;
		this.stateRevision += 1;
	}
}

export interface MultiSelectListTheme {
	cursor: (text: string) => string;
	checked: (text: string) => string;
	unchecked: (text: string) => string;
	selectedLabel: (text: string) => string;
	label: (text: string) => string;
	description: (text: string) => string;
	status: (text: string) => string;
}

export interface MultiSelectListOptions<T> {
	readonly items: readonly MultiSelectListItem<T>[];
	readonly theme: MultiSelectListTheme;
	readonly maxVisibleRows?: number;
	readonly measure?: TextMeasure;
	readonly glyphs?: GlyphTheme;
	readonly matchesKey?: KeyMatcher;
	readonly wrapNavigation?: boolean;
	readonly showNumbers?: boolean;
	readonly onToggle?: (item: MultiSelectListItem<T>, checked: boolean) => void;
	readonly onActivate?: (item: MultiSelectListItem<T>) => void;
	readonly onSubmit?: (values: T[]) => void;
	readonly onCancel?: () => void;
}

/** A bounded checkbox list whose viewport follows keyboard focus. */
export class MultiSelectList<T> implements Component {
	readonly model: MultiSelectListModel<T>;
	private readonly items: readonly MultiSelectListItem<T>[];
	private readonly theme: MultiSelectListTheme;
	private readonly measure: TextMeasure;
	private readonly glyphs: GlyphTheme;
	private readonly matchesKey: KeyMatcher;
	private readonly showNumbers: boolean;
	private readonly onToggle: MultiSelectListOptions<T>["onToggle"];
	private readonly onActivate: MultiSelectListOptions<T>["onActivate"];
	private readonly onSubmit: MultiSelectListOptions<T>["onSubmit"];
	private readonly onCancel: MultiSelectListOptions<T>["onCancel"];
	private maxVisibleRows: number;
	private cachedWidth?: number;
	private cachedRevision?: number;
	private cachedLines?: string[];

	constructor(options: MultiSelectListOptions<T>) {
		this.items = options.items;
		this.theme = options.theme;
		this.measure = options.measure ?? asciiTextMeasure;
		this.glyphs = options.glyphs ?? unicodeGlyphs;
		this.matchesKey = options.matchesKey ?? legacyKeyMatcher;
		this.showNumbers = options.showNumbers ?? true;
		this.maxVisibleRows = boundedRowCount(options.maxVisibleRows);
		this.onToggle = options.onToggle;
		this.onActivate = options.onActivate;
		this.onSubmit = options.onSubmit;
		this.onCancel = options.onCancel;
		this.model = new MultiSelectListModel(options.items, options.wrapNavigation);
	}

	get checkedValues(): T[] {
		return this.model.checkedValues;
	}

	focus(index: number): void {
		this.model.focus(index);
		this.invalidate();
	}

	setMaxVisibleRows(rows: number): void {
		const next = boundedRowCount(rows);
		if (next === this.maxVisibleRows) return;
		this.maxVisibleRows = next;
		this.invalidate();
	}

	setChecked(index: number, checked: boolean): void {
		const item = this.items[index];
		const next = this.model.setChecked(index, checked);
		if (!item || next === undefined) return;
		this.invalidate();
		this.onToggle?.(item, next);
	}

	invalidate(): void {
		this.cachedWidth = undefined;
		this.cachedRevision = undefined;
		this.cachedLines = undefined;
	}

	handleInput(data: string): void {
		if (this.matchesKey(data, "escape")) {
			this.onCancel?.();
			return;
		}
		if (this.items.length === 0) return;
		if (this.matchesKey(data, "up")) {
			this.model.focusPrevious();
			this.invalidate();
			return;
		}
		if (this.matchesKey(data, "down")) {
			this.model.focusNext();
			this.invalidate();
			return;
		}

		const shortcutIndex = this.items.findIndex((item) => item.shortcut === data);
		if (shortcutIndex >= 0) {
			this.model.focus(shortcutIndex);
			this.toggle(shortcutIndex);
			return;
		}
		if (data === " " || this.matchesKey(data, "space")) {
			const item = this.model.focusedItem;
			if (item?.toggleable === false) this.onActivate?.(item);
			else this.toggle(this.model.focusedIndex);
			return;
		}
		if (this.matchesKey(data, "enter")) this.dispatchConfirmation(this.model.confirmFocused());
	}

	render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width && this.cachedRevision === this.model.revision) return this.cachedLines;
		if (this.items.length === 0) return this.cache(width, []);

		const itemLines = this.items.map((item, index) => this.renderItem(item, index, width));
		const totalRows = itemLines.reduce((sum, lines) => sum + lines.length, 0);
		const hasOverflow = totalRows > this.maxVisibleRows;
		const statusRows = hasOverflow && this.maxVisibleRows > 1 ? 1 : 0;
		const contentRows = this.maxVisibleRows - statusRows;
		let startIndex = 0;
		let rowsThroughFocus = itemLines.slice(0, this.model.focusedIndex + 1).reduce((sum, lines) => sum + lines.length, 0);
		while (startIndex < this.model.focusedIndex && rowsThroughFocus > contentRows) {
			rowsThroughFocus -= itemLines[startIndex]?.length ?? 0;
			startIndex += 1;
		}

		const lines: string[] = [];
		for (let index = startIndex; index < this.items.length && lines.length < contentRows; index++) {
			lines.push(...(itemLines[index] ?? []).slice(0, contentRows - lines.length));
		}
		if (statusRows > 0)
			lines.push(this.measure.truncateToWidth(this.theme.status(`  (${this.model.focusedIndex + 1}/${this.items.length})`), width, ""));
		return this.cache(width, lines);
	}

	private toggle(index: number): void {
		this.setChecked(index, !this.model.isChecked(index));
	}

	private dispatchConfirmation(confirmation: MultiSelectConfirmation<T> | undefined): void {
		if (!confirmation) return;
		if (confirmation.kind === "toggle") {
			this.invalidate();
			this.onToggle?.(confirmation.item, confirmation.checked);
			return;
		}
		if (confirmation.kind === "activate") {
			this.onActivate?.(confirmation.item);
			return;
		}
		if (confirmation.kind === "submit") {
			this.onSubmit?.(confirmation.values);
			return;
		}
		const exhaustive: never = confirmation;
		void exhaustive;
	}

	private renderItem(item: MultiSelectListItem<T>, index: number, width: number): string[] {
		const focused = index === this.model.focusedIndex;
		const cursor = focused ? this.theme.cursor(this.glyphs.indicator.cursor) : " ";
		const number = this.showNumbers && item.numberLabel !== false ? `${item.numberLabel ?? item.shortcut ?? index + 1}. ` : "";
		const checkbox =
			item.toggleable === false
				? ""
				: this.model.isChecked(index)
					? this.theme.checked(`[${this.glyphs.indicator.checked}] `)
					: this.theme.unchecked(`[${this.glyphs.indicator.unchecked}] `);
		const label = focused ? this.theme.selectedLabel(item.label) : this.theme.label(item.label);
		const lines = [this.measure.truncateToWidth(`${cursor} ${number}${checkbox}${label}`, width, "")];
		if (item.description) {
			const indent = "    ";
			const wrap = this.measure.wrapTextWithAnsi ?? ((text: string) => [text]);
			for (const wrapped of wrap(item.description, Math.max(1, width - indent.length)))
				lines.push(this.measure.truncateToWidth(`${indent}${this.theme.description(wrapped)}`, width, ""));
		}
		return lines;
	}

	private cache(width: number, lines: string[]): string[] {
		this.cachedWidth = width;
		this.cachedRevision = this.model.revision;
		this.cachedLines = lines;
		return lines;
	}
}
