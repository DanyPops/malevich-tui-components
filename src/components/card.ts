import type { Component } from "../component.js";
import type { GlyphTheme } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { type BoxBorderStyle, renderBox } from "./box.js";

export interface CardTheme {
	border: (text: string) => string;
	selectedBorder: (text: string) => string;
	content: (text: string) => string;
	selectedContent: (text: string) => string;
}

export interface CardOptions {
	title?: string;
	content: string[];
	footer?: string[];
	selected?: boolean;
	theme: CardTheme;
	borderStyle?: BoxBorderStyle;
	glyphs?: GlyphTheme;
	measure?: TextMeasure;
}

/** A bordered entity surface whose selected state styles the complete frame and body. */
export class Card implements Component {
	private selected: boolean;
	private readonly measure: TextMeasure;
	private readonly options: CardOptions;

	constructor(options: CardOptions) {
		this.options = options;
		this.selected = options.selected ?? false;
		this.measure = options.measure ?? asciiTextMeasure;
	}

	setSelected(selected: boolean): void {
		this.selected = selected;
	}

	invalidate(): void {}

	render(width: number): string[] {
		const lines = [
			...(this.options.title === undefined ? [] : [this.options.title]),
			...this.options.content,
			...(this.options.footer ?? []),
		];
		return renderBox({
			width,
			lines,
			borderStyle: this.options.borderStyle,
			glyphs: this.options.glyphs,
			frameStyle: this.selected ? this.options.theme.selectedBorder : this.options.theme.border,
			lineStyle: this.selected ? this.options.theme.selectedContent : this.options.theme.content,
			measure: this.measure,
			truncateLines: true,
		});
	}
}
