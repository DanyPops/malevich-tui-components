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

interface BoxBorder {
	horizontal: string;
	vertical: string;
	topLeft: string;
	topRight: string;
	bottomLeft: string;
	bottomRight: string;
}

const BOX: Record<"rounded" | "light" | "heavy", BoxBorder> = {
	rounded: { horizontal: "─", vertical: "│", topLeft: "╭", topRight: "╮", bottomLeft: "╰", bottomRight: "╯" },
	light: { horizontal: "─", vertical: "│", topLeft: "┌", topRight: "┐", bottomLeft: "└", bottomRight: "┘" },
	heavy: { horizontal: "━", vertical: "┃", topLeft: "┏", topRight: "┓", bottomLeft: "┗", bottomRight: "┛" },
};

export interface EnvelopeOptions {
	title: string;
	collapsed?: boolean;
	borderStyle?: "rounded" | "light" | "heavy";
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
	private readonly border: BoxBorder;
	private readonly style: (s: string) => string;
	private readonly titleStyle: (s: string) => string;
	private readonly measure: TextMeasure;

	constructor(opts: EnvelopeOptions) {
		this.title = opts.title;
		this._collapsed = opts.collapsed ?? false;
		this.border = BOX[opts.borderStyle ?? "rounded"];
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
		const b = this.border;
		const indicator = this._collapsed ? "▸" : "▾";
		const titleText = this.measure.truncateToWidth(` ${indicator} ${this.title} `, width - 4, "…");
		const topPad = Math.max(0, width - this.measure.visibleWidth(titleText) - 2);
		const top = `${this.style(b.topLeft)}${this.titleStyle(titleText)}${this.style(`${b.horizontal.repeat(topPad)}${b.topRight}`)}`;

		if (this._collapsed || !this.content) {
			return [top];
		}

		const inner = width - 4;
		const contentLines = this.content.render(inner);
		const lines = [top];
		for (const line of contentLines) {
			const pad = Math.max(0, inner - this.measure.visibleWidth(line));
			lines.push(`${this.style(b.vertical)} ${line}${" ".repeat(pad)} ${this.style(b.vertical)}`);
		}
		lines.push(this.style(`${b.bottomLeft}${b.horizontal.repeat(width - 2)}${b.bottomRight}`));
		return lines;
	}
}
