import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface TextOptions {
	text: string;
	style?: (s: string) => string;
	/** Word-wraps each source line to the render width instead of truncating it. Defaults to false (truncate). */
	wrap?: boolean;
	measure?: TextMeasure;
}

/** The plain "render a string, styled and fit to width" primitive -- for a call/result row that's just a line or two and doesn't warrant a Table/Dialog/CollapsibleText. Mutable after construction (setText) so a host can update one instance across renders instead of recreating it. */
export class Text implements Component {
	private readonly style: (s: string) => string;
	private readonly wrap: boolean;
	private readonly measure: TextMeasure;

	constructor(private opts: TextOptions) {
		this.style = opts.style ?? ((s) => s);
		this.wrap = opts.wrap ?? false;
		this.measure = opts.measure ?? asciiTextMeasure;
	}

	setText(text: string): void {
		this.opts = { ...this.opts, text };
	}

	invalidate(): void {}

	render(width: number): string[] {
		const lines = this.opts.text.split("\n");
		if (!this.wrap) {
			return lines.map((line) => this.style(this.measure.truncateToWidth(line, width, "…")));
		}
		const wrapFn = this.measure.wrapTextWithAnsi;
		const out: string[] = [];
		for (const line of lines) {
			const wrapped = wrapFn ? wrapFn(line, width) : [this.measure.truncateToWidth(line, width, "…")];
			for (const segment of wrapped.length > 0 ? wrapped : [""]) out.push(this.style(segment));
		}
		return out;
	}
}
