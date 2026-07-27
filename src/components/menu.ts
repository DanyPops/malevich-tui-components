/**
 * Adapted from @dpopsuev/alef-tui's Menu component (MIT, Mario Zechner) --
 * `matchesKey`/`truncateToWidth` imports replaced by injected
 * KeyMatcher/TextMeasure ports.
 */
import type { Component } from "../component.js";
import type { KeyMatcher } from "../key-matcher.js";
import { legacyKeyMatcher } from "../key-matcher.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface MenuItem {
	label: string;
	key?: string;
	description?: string;
	action: () => void;
}

export interface MenuTheme {
	border: (s: string) => string;
	selected: (s: string) => string;
	normal: (s: string) => string;
	dim: (s: string) => string;
	title: (s: string) => string;
}

export interface MenuOptions {
	items: MenuItem[];
	title?: string;
	theme: MenuTheme;
	onClose?: () => void;
	measure?: TextMeasure;
	matchesKey?: KeyMatcher;
}

/** A bordered, keyboard-navigable list of labeled actions, each optionally bound to a direct shortcut key. Up/Down or j/k move the selection, Enter runs it, Escape/q closes. */
export class Menu implements Component {
	private selectedIndex = 0;
	private readonly items: MenuItem[];
	private readonly theme: MenuTheme;
	private readonly title: string;
	private readonly onClose?: () => void;
	private readonly measure: TextMeasure;
	private readonly matchesKey: KeyMatcher;

	constructor(opts: MenuOptions) {
		this.items = opts.items;
		this.theme = opts.theme;
		this.title = opts.title ?? "";
		this.onClose = opts.onClose;
		this.measure = opts.measure ?? asciiTextMeasure;
		this.matchesKey = opts.matchesKey ?? legacyKeyMatcher;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const { theme, items, selectedIndex } = this;
		const lines: string[] = [];

		if (this.title) lines.push(theme.title(this.title));
		lines.push(theme.border("─".repeat(width)));

		for (let i = 0; i < items.length; i++) {
			const item = items[i] as MenuItem;
			const isSel = i === selectedIndex;
			const prefix = isSel ? "  > " : "    ";
			const keyHint = item.key ? theme.dim(` [${item.key}]`) : "";
			const desc = item.description ? theme.dim(` — ${item.description}`) : "";
			const line = this.measure.truncateToWidth(`${prefix}${item.label}${keyHint}${desc}`, width, "…");
			lines.push(isSel ? theme.selected(line) : theme.normal(line));
		}

		lines.push(theme.border("─".repeat(width)));
		return lines;
	}

	handleInput(data: string): void {
		if (this.matchesKey(data, "down") || data === "j") {
			this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
			return;
		}
		if (this.matchesKey(data, "up") || data === "k") {
			this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
			return;
		}
		if (data === "\r") {
			this.items[this.selectedIndex]?.action();
			return;
		}
		if (data === "\x1b" || data === "q") {
			this.onClose?.();
			return;
		}
		for (const item of this.items) {
			if (item.key && data === item.key) {
				item.action();
				return;
			}
		}
	}
}
