/**
 * Adapted from @dpopsuev/alef-tui's Collapsible component (MIT, Mario
 * Zechner) -- zero dependencies beyond Component, no adaptation needed.
 */
import type { Component } from "../component.js";
import { type GlyphTheme, unicodeGlyphs } from "../glyphs.js";

export interface CollapsibleOptions {
	header: string;
	collapsed?: boolean;
	headerStyle?: (s: string) => string;
	glyphs?: GlyphTheme;
}

/** A header line with a ▸/▾ indicator that toggles a wrapped content Component between hidden and shown. */
export class Collapsible implements Component {
	private _collapsed: boolean;
	private header: string;
	private readonly headerStyle: (s: string) => string;
	private readonly glyphs: GlyphTheme;
	private content: Component | null = null;

	constructor(opts: CollapsibleOptions) {
		this.header = opts.header;
		this._collapsed = opts.collapsed ?? true;
		this.headerStyle = opts.headerStyle ?? ((s) => s);
		this.glyphs = opts.glyphs ?? unicodeGlyphs;
	}

	get collapsed(): boolean {
		return this._collapsed;
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

	setContent(component: Component): void {
		this.content = component;
	}

	setHeader(text: string): void {
		this.header = text;
	}

	invalidate(): void {
		this.content?.invalidate();
	}

	render(width: number): string[] {
		const indicator = this._collapsed ? this.glyphs.indicator.collapsed : this.glyphs.indicator.expanded;
		const headerLine = this.headerStyle(`${indicator} ${this.header}`);
		if (this._collapsed || !this.content) return [headerLine];
		return [headerLine, ...this.content.render(width)];
	}
}
