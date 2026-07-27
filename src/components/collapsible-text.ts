/**
 * Adapted from @dpopsuev/alef-tui's CollapsibleText component (MIT, Mario
 * Zechner) -- same logic, with the direct `wrapTextWithAnsi` import
 * replaced by the TextMeasure port's own optional wrapTextWithAnsi method.
 */
import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

const DEFAULT_COLLAPSED_LINES = 5;

export interface CollapsibleTextOptions {
	text: string;
	paddingX?: number;
	collapsedLines?: number;
	headerStyle?: (s: string) => string;
	textStyle?: (s: string) => string;
	measure?: TextMeasure;
}

/**
 * A collapsible block for long text (e.g. tool/command output). Text at or
 * under `collapsedLines` renders inline with no chrome; longer text renders
 * collapsed to the first N lines behind a toggleable "N lines (+M hidden)"
 * header.
 */
export class CollapsibleText implements Component {
	private _collapsed = true;
	private readonly lines: string[];
	private readonly collapsedLines: number;
	private readonly paddingX: number;
	private readonly headerStyle: (s: string) => string;
	private readonly textStyle: (s: string) => string;
	private readonly measure: TextMeasure;

	constructor(opts: CollapsibleTextOptions) {
		this.lines = opts.text.split("\n");
		this.collapsedLines = opts.collapsedLines ?? DEFAULT_COLLAPSED_LINES;
		this.paddingX = opts.paddingX ?? 0;
		this.headerStyle = opts.headerStyle ?? ((s) => s);
		this.textStyle = opts.textStyle ?? ((s) => s);
		this.measure = opts.measure ?? asciiTextMeasure;
	}

	get collapsed(): boolean {
		return this._collapsed;
	}

	get isLong(): boolean {
		return this.lines.length > this.collapsedLines;
	}

	get lineCount(): number {
		return this.lines.length;
	}

	toggle(): void {
		this._collapsed = !this._collapsed;
	}

	expand(): void {
		this._collapsed = false;
	}

	collapse(): void {
		this._collapsed = true;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const pad = " ".repeat(this.paddingX);
		const contentWidth = Math.max(1, width - this.paddingX);

		if (!this.isLong) {
			return this.renderLines(this.lines, pad, contentWidth);
		}

		const indicator = this._collapsed ? "▸" : "▾";
		const hidden = this.lines.length - this.collapsedLines;
		const summary = this._collapsed
			? `${indicator} ${this.lines.length} lines (+${hidden} hidden)`
			: `${indicator} ${this.lines.length} lines`;
		const headerLine = pad + this.headerStyle(summary);

		const visible = this._collapsed ? this.lines.slice(0, this.collapsedLines) : this.lines;
		return [headerLine, ...this.renderLines(visible, pad, contentWidth)];
	}

	private renderLines(lines: string[], pad: string, contentWidth: number): string[] {
		const out: string[] = [];
		const wrap = this.measure.wrapTextWithAnsi ?? ((text) => [text]);
		for (const line of lines) {
			const styled = this.textStyle(line);
			const wrapped = wrap(styled, contentWidth);
			for (const segment of wrapped.length > 0 ? wrapped : [""]) {
				out.push(pad + segment);
			}
		}
		return out;
	}
}
