/**
 * Adapted from @dpopsuev/alef-tui's Dialog component (MIT, Mario Zechner) --
 * same rendering logic, with the direct `truncateToWidth` import replaced
 * by an injected TextMeasure port.
 */
import type { Component } from "../component.js";
import { unicodeGlyphs, type GlyphSet } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface DialogAction {
	label: string;
	key: string;
	action: () => void;
}

export interface DialogTheme {
	border: (s: string) => string;
	title: (s: string) => string;
	body: (s: string) => string;
	dim: (s: string) => string;
}

export interface DialogOptions {
	title: string;
	body: string;
	actions: DialogAction[];
	theme: DialogTheme;
	/** Defaults to ASCII-only measurement. */
	measure?: TextMeasure;
	/** Defaults to unicodeGlyphs. Pass asciiGlyphs (or a custom set) for terminals/fonts that render box-drawing poorly. */
	glyphs?: GlyphSet;
}

/** A bordered title+body+action-hints dialog. Dispatches to the matching DialogAction on a key press (case-insensitive), or the "n"/"Esc"-keyed action (if any) on Escape. */
export class Dialog implements Component {
	private readonly title: string;
	private readonly body: string;
	private readonly actions: DialogAction[];
	private readonly theme: DialogTheme;
	private readonly measure: TextMeasure;
	private readonly glyphs: GlyphSet;

	constructor(opts: DialogOptions) {
		this.title = opts.title;
		this.body = opts.body;
		this.actions = opts.actions;
		this.theme = opts.theme;
		this.measure = opts.measure ?? asciiTextMeasure;
		this.glyphs = opts.glyphs ?? unicodeGlyphs;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const { theme } = this;
		const lines: string[] = [];
		const inner = Math.max(10, width - 4);

		const rule = this.glyphs.line.thin.repeat(width);
		lines.push(theme.border(rule));
		lines.push(theme.title(`  ${this.title}`));
		lines.push("");

		for (const line of this.body.split("\n")) {
			lines.push(theme.body(`  ${this.measure.truncateToWidth(line, inner, "…")}`));
		}

		lines.push("");
		const hints = this.actions.map((a) => `[${a.key}] ${a.label}`).join("  ");
		lines.push(theme.dim(`  ${hints}`));
		lines.push(theme.border(rule));

		return lines;
	}

	handleInput(data: string): void {
		for (const action of this.actions) {
			if (data === action.key || data.toLowerCase() === action.key.toLowerCase()) {
				action.action();
				return;
			}
		}
		if (data === "\x1b") {
			const cancel = this.actions.find((a) => a.key === "n" || a.key === "Esc");
			cancel?.action();
		}
	}
}
