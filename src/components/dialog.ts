/**
 * Adapted from @dpopsuev/alef-tui's Dialog component (MIT, Mario Zechner) --
 * same rendering logic, with the direct `truncateToWidth` import replaced
 * by an injected TextMeasure port.
 */
import type { Component } from "../component.js";
import { type GlyphSet, unicodeGlyphs } from "../glyphs.js";
import type { KeyMatcher } from "../key-matcher.js";
import { legacyKeyMatcher } from "../key-matcher.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { renderFramedPanel } from "./framed-panel.js";

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
	matchesKey?: KeyMatcher;
	/** Defaults to true (a standalone dialog with its own top/bottom rule).
	 * Set false when rendering as another already-bordered container's own
	 * content (e.g. an Envelope's setContent) -- two rules landing back to
	 * back read as a redundant double border. */
	framed?: boolean;
}

/** A bordered title+body+action-hints dialog. Dispatches to the matching DialogAction on a key press (case-insensitive), or the "n"/"Esc"-keyed action (if any) on Escape. */
export class Dialog implements Component {
	private readonly title: string;
	private readonly body: string;
	private readonly actions: DialogAction[];
	private readonly theme: DialogTheme;
	private readonly measure: TextMeasure;
	private readonly glyphs: GlyphSet;
	private readonly matchesKey: KeyMatcher;
	private readonly framed: boolean;

	constructor(opts: DialogOptions) {
		this.title = opts.title;
		this.body = opts.body;
		this.actions = opts.actions;
		this.theme = opts.theme;
		this.measure = opts.measure ?? asciiTextMeasure;
		this.glyphs = opts.glyphs ?? unicodeGlyphs;
		this.matchesKey = opts.matchesKey ?? legacyKeyMatcher;
		this.framed = opts.framed ?? true;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const { theme } = this;
		const inner = Math.max(10, width - 4);

		const bodyLines: string[] = [""];
		for (const line of this.body.split("\n")) {
			bodyLines.push(theme.body(`  ${this.measure.truncateToWidth(line, inner, "…")}`));
		}
		bodyLines.push("");
		const hints = this.actions.map((a) => `[${a.key}] ${a.label}`).join("  ");
		bodyLines.push(theme.dim(`  ${hints}`));

		return renderFramedPanel({
			width,
			...(this.framed ? { rule: this.glyphs.line.thin, ruleStyle: theme.border } : {}),
			titleLines: [theme.title(`  ${this.title}`)],
			contentLines: bodyLines,
		});
	}

	handleInput(data: string): void {
		for (const action of this.actions) {
			if (data === action.key || data.toLowerCase() === action.key.toLowerCase()) {
				action.action();
				return;
			}
		}
		if (this.matchesKey(data, "escape")) {
			const cancel = this.actions.find((a) => a.key === "n" || a.key === "Esc");
			cancel?.action();
		}
	}
}
