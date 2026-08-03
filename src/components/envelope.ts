/**
 * Adapted from @dpopsuev/alef-tui's Envelope component (MIT, Mario
 * Zechner) -- design/chars.js's BOX border-glyph sets are inlined
 * directly (only the corner/edge glyphs Envelope actually uses, not
 * alef-tui's full tee/cross box-drawing set), and the direct
 * `truncateToWidth`/`visibleWidth` import is replaced by an injected
 * TextMeasure port.
 */
import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { type BoxBorderStyle, renderBox } from "./box.js";

export interface EnvelopeOptions {
	title: string;
	collapsed?: boolean;
	borderStyle?: BoxBorderStyle;
	style?: (s: string) => string;
	titleStyle?: (s: string) => string;
	/** Defaults to ASCII-only measurement (raw string length, blind to ANSI escape codes). Unsafe the moment content is styled -- pad computation for the right border will land at a different column on every line depending on how much styling that line happens to carry. Pass a host's real visibleWidth/truncateToWidth (e.g. pi-tui's or alef-tui's) whenever content might contain real ANSI. */
	measure?: TextMeasure;
}

/** A bordered, collapsible box with the title embedded in the top border. Collapsed, only the title bar renders; expanded, the wrapped content Component renders inside the border. */
export class Envelope implements Component {
	private _collapsed: boolean;
	private title: string;
	private content: Component | null = null;
	private readonly borderStyle: BoxBorderStyle;
	private readonly style: (s: string) => string;
	private readonly titleStyle: (s: string) => string;
	private readonly measure: TextMeasure;

	constructor(opts: EnvelopeOptions) {
		this.title = opts.title;
		this._collapsed = opts.collapsed ?? false;
		this.borderStyle = opts.borderStyle ?? "rounded";
		this.style = opts.style ?? ((s) => s);
		this.titleStyle = opts.titleStyle ?? ((s) => s);
		this.measure = opts.measure ?? asciiTextMeasure;
	}

	get collapsed(): boolean {
		return this._collapsed;
	}
	toggle(): void {
		this._collapsed = !this._collapsed;
	}
	setContent(c: Component): void {
		this.content = c;
	}
	setTitle(t: string): void {
		this.title = t;
	}

	invalidate(): void {
		this.content?.invalidate();
	}

	render(width: number): string[] {
		const indicator = this._collapsed ? "▸" : "▾";
		const titleText = this.measure.truncateToWidth(` ${indicator} ${this.title} `, width - 4, "…");
		if (this._collapsed || !this.content) {
			return renderBox({
				width,
				lines: [],
				borderStyle: this.borderStyle,
				frameStyle: this.style,
				topLabel: titleText,
				topLabelStyle: this.titleStyle,
				measure: this.measure,
			}).slice(0, 1);
		}

		const inner = width - 4;
		return renderBox({
			width,
			lines: this.content.render(inner).map((line) => ` ${line} `),
			borderStyle: this.borderStyle,
			frameStyle: this.style,
			topLabel: titleText,
			topLabelStyle: this.titleStyle,
			measure: this.measure,
		});
	}
}
