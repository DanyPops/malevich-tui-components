/**
 * Adapted from @dpopsuev/alef-tui's ScrollView component (MIT, Mario
 * Zechner) -- same logic, with the direct `truncateToWidth` import
 * replaced by an injected TextMeasure port.
 */
import type { Component } from "../component.js";
import { type GlyphTheme, unicodeGlyphs } from "../glyphs.js";
import type { KeyMatcher } from "../key-matcher.js";
import { legacyKeyMatcher } from "../key-matcher.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface ScrollViewOptions {
	maxHeight?: number;
	showScrollbar?: boolean;
	measure?: TextMeasure;
	glyphs?: GlyphTheme;
	matchesKey?: KeyMatcher;
}

/** Wraps a child Component in a fixed-height, vertically scrollable viewport with an optional thumb-position scrollbar. j/k or arrow-down/up scroll one line; g/G jump to top/bottom. */
export class ScrollView implements Component {
	private scrollOffset = 0;
	/** Populated by the last render() call -- meaningless (all zero) before the first one, matching this library's own "cached state only valid after a render" convention (e.g. renderedWidth elsewhere). */
	private lastTotalLines = 0;
	private lastVisibleLines = 0;
	private readonly maxHeight: number;
	private readonly showScrollbar: boolean;
	private readonly measure: TextMeasure;
	private readonly glyphs: GlyphTheme;
	private readonly matchesKey: KeyMatcher;

	constructor(
		private child: Component,
		opts: ScrollViewOptions = {},
	) {
		this.maxHeight = opts.maxHeight ?? 20;
		this.showScrollbar = opts.showScrollbar ?? true;
		this.measure = opts.measure ?? asciiTextMeasure;
		this.glyphs = opts.glyphs ?? unicodeGlyphs;
		this.matchesKey = opts.matchesKey ?? legacyKeyMatcher;
	}

	scrollDown(n = 1): void {
		this.scrollOffset += n;
	}

	scrollUp(n = 1): void {
		this.scrollOffset = Math.max(0, this.scrollOffset - n);
	}

	scrollToTop(): void {
		this.scrollOffset = 0;
	}

	scrollToBottom(): void {
		this.scrollOffset = Number.MAX_SAFE_INTEGER;
	}

	invalidate(): void {
		this.child.invalidate();
		this.scrollOffset = 0;
	}

	handleInput(data: string): void {
		if (data === "j" || this.matchesKey(data, "down")) {
			this.scrollDown();
			return;
		}
		if (data === "k" || this.matchesKey(data, "up")) {
			this.scrollUp();
			return;
		}
		if (data === "g") {
			this.scrollToTop();
			return;
		}
		if (data === "G") {
			this.scrollToBottom();
			return;
		}
	}

	/** The current scroll position -- only meaningful after at least one render() call; `{ offset: 0, total: 0, visible: 0 }` beforehand. Lets a wrapping component (e.g. DetailViewport) build a "X-Y/Z" scroll-position footer without re-deriving this pagination math itself. */
	scrollPosition(): { offset: number; total: number; visible: number } {
		return { offset: this.scrollOffset, total: this.lastTotalLines, visible: this.lastVisibleLines };
	}

	render(width: number): string[] {
		const allLines = this.child.render(this.showScrollbar ? width - 1 : width);
		const totalLines = allLines.length;
		this.lastTotalLines = totalLines;

		if (totalLines <= this.maxHeight) {
			this.scrollOffset = 0;
			this.lastVisibleLines = totalLines;
			return this.showScrollbar ? allLines.map((l) => `${l} `) : allLines;
		}

		const maxOffset = Math.max(0, totalLines - this.maxHeight);
		this.scrollOffset = Math.min(this.scrollOffset, maxOffset);
		this.lastVisibleLines = this.maxHeight;

		const visible = allLines.slice(this.scrollOffset, this.scrollOffset + this.maxHeight);

		if (!this.showScrollbar) return visible;

		const thumbSize = Math.max(1, Math.round((this.maxHeight / totalLines) * this.maxHeight));
		const thumbStart = Math.round((this.scrollOffset / maxOffset) * (this.maxHeight - thumbSize));

		return visible.map((line, i) => {
			const inThumb = i >= thumbStart && i < thumbStart + thumbSize;
			return `${this.measure.truncateToWidth(line, width - 1, "…")}${inThumb ? this.glyphs.scrollbar.thumb : this.glyphs.scrollbar.track}`;
		});
	}
}
