/**
 * Formalizes a border+title+list+help scaffold hand-rolled independently
 * in five codebases (Enigma, Jittor, pi-tickets, packed, pipes). Owns no
 * list-selection logic -- wraps a host-provided list Component (the
 * host's own SelectList) and delegates handleInput/invalidate to it.
 */
import type { Component } from "../component.js";
import { type GlyphSet, unicodeGlyphs } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { renderFramedPanel } from "./framed-panel.js";

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
	/** Defaults to unicodeGlyphs. Pass asciiGlyphs (or a custom set) for terminals/fonts that render box-drawing poorly. */
	glyphs?: GlyphSet;
	/** Defaults to true. Set false when this panel is already nested inside another framed container (e.g. an Envelope) -- its own top/bottom rule would just double up on that container's own border. */
	framed?: boolean;
}

/** Wraps a host-provided list Component in the border+title+help-text chrome duplicated across five real Pi extensions. Forwards handleInput/invalidate directly to the wrapped list -- this component owns only the chrome. */
export class BorderedSelectPanel implements Component {
	private readonly title: string;
	private readonly list: Component;
	private readonly helpText: string | undefined;
	private readonly theme: BorderedSelectPanelTheme;
	private readonly measure: TextMeasure;
	private readonly glyphs: GlyphSet;
	private readonly framed: boolean;

	constructor(opts: BorderedSelectPanelOptions) {
		this.title = opts.title;
		this.list = opts.list;
		this.helpText = opts.helpText;
		this.theme = opts.theme;
		this.measure = opts.measure ?? asciiTextMeasure;
		this.glyphs = opts.glyphs ?? unicodeGlyphs;
		this.framed = opts.framed ?? true;
	}

	invalidate(): void {
		this.list.invalidate();
	}

	handleInput(data: string): void {
		this.list.handleInput?.(data);
	}

	render(width: number): string[] {
		const { theme } = this;
		const titleLine = theme.title(this.measure.truncateToWidth(this.title, width, "…"));

		return renderFramedPanel({
			width: Math.max(1, width),
			...(this.framed ? { rule: this.glyphs.line.thin, ruleStyle: theme.border } : {}),
			titleLines: [titleLine],
			contentLines: this.list.render(width),
			footerLines: this.helpText ? [theme.help(this.measure.truncateToWidth(this.helpText, width, "…"))] : undefined,
		});
	}
}
