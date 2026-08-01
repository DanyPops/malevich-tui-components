/**
 * Adapted from @dpopsuev/alef-tui's SeparatorLine component (MIT, Mario
 * Zechner) -- design/chars.js's SEPARATOR weight glyphs are inlined
 * directly, and the direct `truncateToWidth`/`visibleWidth` import is
 * replaced by an injected TextMeasure port.
 */
import type { Component } from "../component.js";
import { type GlyphSet, unicodeGlyphs } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export type SeparatorWeight = "thick" | "thin" | "dotted" | "dashed";

export interface SeparatorLineOptions {
	weight?: SeparatorWeight;
	label?: string;
	style?: (s: string) => string;
	/** @deprecated Prefer setLeftLabel/setRightLabel. Single-label align when only one side is set. */
	labelAlign?: "left" | "right";
	measure?: TextMeasure;
	/** Defaults to unicodeGlyphs. Pass asciiGlyphs (or a custom set) for terminals/fonts that render box-drawing poorly. */
	glyphs?: GlyphSet;
}

/** A full-width horizontal rule with optional embedded left and/or right labels, each corner always keeping at least one rule character so a label never flushes the edge. */
export class SeparatorLine implements Component {
	private readonly weight: SeparatorWeight;
	private leftLabel: string;
	private rightLabel: string;
	private readonly style: (s: string) => string;
	private readonly labelAlign: "left" | "right";
	private readonly measure: TextMeasure;
	private readonly glyphs: GlyphSet;

	constructor(opts: SeparatorLineOptions = {}) {
		this.weight = opts.weight ?? "thin";
		this.leftLabel = opts.labelAlign === "right" ? "" : (opts.label ?? "");
		this.rightLabel = opts.labelAlign === "right" ? (opts.label ?? "") : "";
		this.style = opts.style ?? ((s) => s);
		this.labelAlign = opts.labelAlign ?? "left";
		this.measure = opts.measure ?? asciiTextMeasure;
		this.glyphs = opts.glyphs ?? unicodeGlyphs;
	}

	/** @deprecated Use setLeftLabel -- kept for callers that set a single left label. */
	setLabel(label: string): void {
		if (this.labelAlign === "right") this.rightLabel = label;
		else this.leftLabel = label;
	}

	setLeftLabel(label: string): void {
		this.leftLabel = label;
	}

	setRightLabel(label: string): void {
		this.rightLabel = label;
	}

	invalidate(): void {}

	render(width: number): string[] {
		if (width <= 0) return [""];
		const char = this.glyphs.line[this.weight];
		const pad = (label: string): string => (label ? ` ${label} ` : "");

		let left = pad(this.leftLabel);
		let right = pad(this.rightLabel);
		let leftW = this.measure.visibleWidth(left);
		let rightW = this.measure.visibleWidth(right);

		if (!left && !right) return [this.style(char.repeat(width))];

		if (!left && right) {
			if (width < 2) return [this.style(char.repeat(width))];
			right = this.fitPaddedLabel(this.rightLabel, width - 2);
			rightW = this.measure.visibleWidth(right);
			const prefixLen = width - rightW - 1;
			return [this.style(char.repeat(prefixLen)) + right + this.style(char.repeat(1))];
		}

		if (left && !right) {
			if (width < 2) return [this.style(char.repeat(width))];
			left = this.fitPaddedLabel(this.leftLabel, width - 2);
			leftW = this.measure.visibleWidth(left);
			const suffixLen = width - 1 - leftW;
			return [this.style(char.repeat(1)) + left + this.style(char.repeat(suffixLen))];
		}

		const corners = 2;
		const budget = Math.max(0, width - corners);
		if (leftW + rightW > budget) {
			const leftBudget = Math.min(leftW, Math.max(0, Math.floor(budget / 2)));
			const rightBudget = Math.max(0, budget - leftBudget);
			left = this.fitPaddedLabel(this.leftLabel, leftBudget);
			right = this.fitPaddedLabel(this.rightLabel, rightBudget);
			leftW = this.measure.visibleWidth(left);
			rightW = this.measure.visibleWidth(right);
		}
		const fill = Math.max(0, width - 1 - leftW - rightW - 1);
		return [this.style(char.repeat(1)) + left + this.style(char.repeat(fill)) + right + this.style(char.repeat(1))];
	}

	private fitPaddedLabel(label: string, maxPaddedWidth: number): string {
		if (!label || maxPaddedWidth <= 0) return "";
		if (maxPaddedWidth < 3) return this.measure.truncateToWidth(label, maxPaddedWidth, "…");
		const innerMax = maxPaddedWidth - 2;
		const inner = this.measure.truncateToWidth(label, innerMax, "…");
		return inner ? ` ${inner} ` : "";
	}
}
