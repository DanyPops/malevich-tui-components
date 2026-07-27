/**
 * New component, not an extraction: formalizes a scaffold found
 * independently hand-rolled in five separate real codebases (Enigma's
 * pickFromList, Jittor's panels, pi-tickets' tui.ts, packed's tui.ts,
 * pipes' pipes-tui.ts) -- a Container + DynamicBorder + Text(title) +
 * SelectList + Text(help) + DynamicBorder scaffold, matching Pi's own TUI
 * docs' "Pattern 1: Selection Dialog" example almost verbatim.
 *
 * Deliberately owns none of the list-selection logic (filtering,
 * scrolling, keyboard navigation) -- that's real, actively-maintained
 * complexity both pi-tui and alef-tui already ship natively as their own
 * SelectList. This wraps whatever inner Component the host constructs
 * (its own real SelectList, already wired with items/onSelect/onCancel)
 * in the repeated border/title/help chrome, and delegates handleInput/
 * invalidate straight through.
 */
import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface BorderedSelectPanelTheme {
	border: (s: string) => string;
	title: (s: string) => string;
	help: (s: string) => string;
}

export interface BorderedSelectPanelOptions {
	title: string;
	/** The host's own list-like Component (its native SelectList, already configured with items and onSelect/onCancel callbacks). */
	list: Component;
	helpText?: string;
	theme: BorderedSelectPanelTheme;
	measure?: TextMeasure;
}

/** Wraps a host-provided list Component in the border+title+help-text chrome duplicated across five real Pi extensions. Forwards handleInput/invalidate directly to the wrapped list -- this component owns only the chrome. */
export class BorderedSelectPanel implements Component {
	private readonly title: string;
	private readonly list: Component;
	private readonly helpText: string | undefined;
	private readonly theme: BorderedSelectPanelTheme;
	private readonly measure: TextMeasure;

	constructor(opts: BorderedSelectPanelOptions) {
		this.title = opts.title;
		this.list = opts.list;
		this.helpText = opts.helpText;
		this.theme = opts.theme;
		this.measure = opts.measure ?? asciiTextMeasure;
	}

	invalidate(): void {
		this.list.invalidate();
	}

	handleInput(data: string): void {
		this.list.handleInput?.(data);
	}

	render(width: number): string[] {
		const { theme } = this;
		const border = theme.border("─".repeat(Math.max(1, width)));
		const titleLine = theme.title(this.measure.truncateToWidth(this.title, width, "…"));

		const lines = [border, titleLine, ...this.list.render(width)];
		if (this.helpText) lines.push(theme.help(this.measure.truncateToWidth(this.helpText, width, "…")));
		lines.push(border);
		return lines;
	}
}
