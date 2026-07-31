/**
 * Adapted from @dpopsuev/alef-tui's ProgressBar component (MIT, Mario
 * Zechner) -- same rendering logic, with the direct `visibleWidth` import
 * replaced by an injected TextMeasure port so this file has no dependency
 * on any specific host TUI package.
 */
import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface ProgressBarOptions {
	value: number;
	max?: number;
	width?: number;
	label?: string;
	filledChar?: string;
	emptyChar?: string;
	style?: (text: string) => string;
	/** Defaults to ASCII-only measurement. Pass a host's real visibleWidth for correct Unicode/ANSI handling. */
	measure?: TextMeasure;
}

/** Renders a single-line `label filled/empty-bar pct%` meter. Value/label are mutable after construction (setValue/setLabel) so a host can update one instance across renders instead of recreating it. */
export class ProgressBar implements Component {
	private readonly measure: TextMeasure;

	constructor(private opts: ProgressBarOptions) {
		this.measure = opts.measure ?? asciiTextMeasure;
	}

	setValue(value: number): void {
		this.opts.value = value;
	}

	setLabel(label: string): void {
		this.opts.label = label;
	}

	setMax(max: number): void {
		this.opts.max = max;
	}

	invalidate(): void {}

	/** Renders just the filled/empty bar glyphs at the given width (or the configured default), with no label/percentage text. */
	format(barWidth?: number): string {
		const max = this.opts.max ?? 100;
		const filledChar = this.opts.filledChar ?? "█";
		const emptyChar = this.opts.emptyChar ?? "░";
		const pct = Math.min(1, Math.max(0, this.opts.value / max));
		const w = barWidth ?? this.opts.width ?? 10;
		const filledCount = Math.round(w * pct);
		return filledChar.repeat(filledCount) + emptyChar.repeat(w - filledCount);
	}

	render(width: number): string[] {
		const max = this.opts.max ?? 100;
		const pct = Math.min(1, Math.max(0, this.opts.value / max));
		const pctText = `${Math.round(pct * 100)}%`;
		const label = this.opts.label ? `${this.opts.label} ` : "";
		const labelWidth = this.measure.visibleWidth(label);
		const pctWidth = this.measure.visibleWidth(pctText) + 1;
		const barWidth = Math.max(4, (this.opts.width ?? width) - labelWidth - pctWidth);
		const line = `${label}${this.format(barWidth)} ${pctText}`;
		return [this.opts.style ? this.opts.style(line) : line];
	}
}
