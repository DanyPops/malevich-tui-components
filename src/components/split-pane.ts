/**
 * Adapted from @dpopsuev/alef-tui's SplitPane component (MIT, Mario
 * Zechner) -- same logic, with the direct `truncateToWidth`/`visibleWidth`
 * import replaced by an injected TextMeasure port.
 */
import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface SplitPaneOptions {
	ratio?: number;
	borderChar?: string;
	minLeftWidth?: number;
	minRightWidth?: number;
	measure?: TextMeasure;
}

/** Renders two child Components side by side, separated by a vertical border, splitting the available width by `ratio`. Falls back to rendering only the left child when the viewport is too narrow for both minimum widths. */
export class SplitPane implements Component {
	private readonly ratio: number;
	private readonly borderChar: string;
	private readonly minLeftWidth: number;
	private readonly minRightWidth: number;
	private readonly measure: TextMeasure;

	constructor(private left: Component, private right: Component, opts: SplitPaneOptions = {}) {
		this.ratio = opts.ratio ?? 0.5;
		this.borderChar = opts.borderChar ?? "│";
		this.minLeftWidth = opts.minLeftWidth ?? 10;
		this.minRightWidth = opts.minRightWidth ?? 10;
		this.measure = opts.measure ?? asciiTextMeasure;
	}

	invalidate(): void {
		this.left.invalidate();
		this.right.invalidate();
	}

	private padLine(line: string, targetWidth: number): string {
		const w = this.measure.visibleWidth(line);
		return w >= targetWidth ? line : line + " ".repeat(targetWidth - w);
	}

	render(width: number): string[] {
		if (width < this.minLeftWidth + this.minRightWidth + 1) {
			return this.left.render(width);
		}

		const leftWidth = Math.max(this.minLeftWidth, Math.floor(width * this.ratio));
		const rightWidth = Math.max(this.minRightWidth, width - leftWidth - 1);

		const leftLines = this.left.render(leftWidth);
		const rightLines = this.right.render(rightWidth);

		const maxLines = Math.max(leftLines.length, rightLines.length);
		const merged: string[] = [];

		for (let i = 0; i < maxLines; i++) {
			const l = this.padLine(leftLines[i] ?? "", leftWidth);
			const r = this.measure.truncateToWidth(rightLines[i] ?? "", rightWidth, "…");
			merged.push(`${l}${this.borderChar}${r}`);
		}

		return merged;
	}
}
