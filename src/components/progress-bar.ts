/**
 * Adapted from @dpopsuev/alef-tui's ProgressBar component (MIT, Mario
 * Zechner) -- same rendering logic, with the direct `visibleWidth` import
 * replaced by an injected TextMeasure port so this file has no dependency
 * on any specific host TUI package.
 */
import type { Component } from "../component.js";
import { type GlyphTheme, type ProgressGlyphStyle, type ProgressGlyphs, progressGlyphStyles } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

/** Renderer-neutral cell geometry calculated for a determinate progress bar. */
export interface ProgressBarGeometry {
	/** Clamped 0..1 completion ratio. */
	readonly ratio: number;
	/** Number of drawable cells, excluding any renderer-owned delimiters. */
	readonly width: number;
	/** Exact (possibly fractional) completed-cell count. */
	readonly filledCells: number;
}

export type ProgressBarGlyphs = ProgressGlyphs;
export type ProgressBarGlyphStyle = ProgressGlyphStyle;
export type ProgressBarRenderer = (geometry: Readonly<ProgressBarGeometry>) => string;

/** ProgressBar-named alias for the shared progress glyph policies. */
export const progressBarGlyphs = progressGlyphStyles;

/** Calculates normalized progress and drawable-cell geometry; chooses no glyphs or styling. */
export function calculateProgressBarGeometry(value: number, max: number, width: number): ProgressBarGeometry {
	const ratio = max > 0 && Number.isFinite(value / max) ? Math.min(1, Math.max(0, value / max)) : 0;
	const safeWidth = Math.max(0, Math.floor(width));
	return { ratio, width: safeWidth, filledCells: ratio * safeWidth };
}

export function renderProgressBar(geometry: ProgressBarGeometry, glyphs: ProgressBarGlyphs): string {
	const partials = glyphs.partial ?? [];
	let filledCells: number;
	let partial = "";
	if (partials.length > 0) {
		filledCells = Math.floor(geometry.filledCells);
		const fraction = geometry.filledCells - filledCells;
		const partialIndex = Math.floor(fraction * (partials.length + 1));
		if (partialIndex > 0) partial = partials[Math.min(partialIndex - 1, partials.length - 1)] ?? "";
	} else {
		filledCells = Math.round(geometry.filledCells);
	}
	const emptyCells = Math.max(0, geometry.width - filledCells - (partial ? 1 : 0));
	return `${glyphs.left ?? ""}${glyphs.filled.repeat(filledCells)}${partial}${glyphs.empty.repeat(emptyCells)}${glyphs.right ?? ""}`;
}

export function createProgressBarRenderer(glyphs: ProgressBarGlyphs | ProgressBarGlyphStyle = "shade"): ProgressBarRenderer {
	const resolved = typeof glyphs === "string" ? progressBarGlyphs[glyphs] : glyphs;
	return (geometry) => renderProgressBar(geometry, resolved);
}

export interface ProgressBarOptions {
	value: number;
	max?: number;
	width?: number;
	label?: string;
	/** Complete host policy. Its progress glyphs are used unless `glyphs` overrides them. */
	glyphTheme?: GlyphTheme;
	/** Built-in style name or caller-owned progress glyphs; geometry remains unchanged. */
	glyphs?: ProgressBarGlyphs | ProgressBarGlyphStyle;
	/** Full rendering strategy escape hatch, fed only the renderer-neutral geometry. */
	renderer?: ProgressBarRenderer;
	/** @deprecated Prefer glyphs. Retained for compatibility. */
	filledChar?: string;
	/** @deprecated Prefer glyphs. Retained for compatibility. */
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
		const width = barWidth ?? this.opts.width ?? 10;
		const geometry = calculateProgressBarGeometry(this.opts.value, max, width);
		if (this.opts.renderer) return this.opts.renderer(geometry);
		const configured = this.opts.glyphs ?? this.opts.glyphTheme?.progress ?? "shade";
		const base = typeof configured === "string" ? progressBarGlyphs[configured] : configured;
		const glyphs = {
			...base,
			filled: this.opts.filledChar ?? base.filled,
			empty: this.opts.emptyChar ?? base.empty,
		};
		return renderProgressBar(geometry, glyphs);
	}

	render(width: number): string[] {
		const max = this.opts.max ?? 100;
		const pct = Math.min(1, Math.max(0, this.opts.value / max));
		const pctText = `${Math.round(pct * 100)}%`;
		const label = this.opts.label ? `${this.opts.label} ` : "";
		const labelWidth = this.measure.visibleWidth(label);
		const pctWidth = this.measure.visibleWidth(pctText) + 1;
		const configured = this.opts.glyphs ?? this.opts.glyphTheme?.progress ?? "shade";
		const glyphs = typeof configured === "string" ? progressBarGlyphs[configured] : configured;
		const chromeWidth = this.opts.renderer
			? 0
			: this.measure.visibleWidth(glyphs.left ?? "") + this.measure.visibleWidth(glyphs.right ?? "");
		const barWidth = Math.max(4, (this.opts.width ?? width) - labelWidth - pctWidth - chromeWidth);
		const line = `${label}${this.format(barWidth)} ${pctText}`;
		return [this.opts.style ? this.opts.style(line) : line];
	}
}
