/**
 * Composes three pieces that already existed separately but were never
 * wired together: buildDetailLines (detail-view.ts, the pure field/section
 * line builder), ScrollView (the stateful scroll-offset-owning wrapper
 * detail-view.ts's own doc comment says a pure function can't own), and
 * renderFramedPanel (the border/title/content/footer scaffold). Found
 * hand-rolled near-identically instead, across at least 5 real codebases
 * (papyrus's ArtifactDetailViewport/TaskDetailViewport, pi-tickets'
 * IssueDetailComponent, pi-pipes' RunDetailViewport, pi-packed's own
 * detail view, pi-jittor's ContextViewport as an extended variant) --
 * each reimplementing the same offsetY/renderedWidth/MIN-MAX-RESERVED-rows
 * clamp/render/handleInput shape, delegating only the inner line-building
 * to buildDetailLines. The one piece that was actually missing --
 * ScrollView exposing no way to read back its own scroll position for a
 * "X-Y/Z" footer -- is scrollPosition() on ScrollView itself.
 */
import { type Component, statelessComponent } from "../component.js";
import { type GlyphSet, unicodeGlyphs } from "../glyphs.js";
import type { KeyMatcher } from "../key-matcher.js";
import { legacyKeyMatcher } from "../key-matcher.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { renderFramedPanel } from "./framed-panel.js";
import { ScrollView } from "./scroll-view.js";

export interface DetailViewportTheme {
	border: (s: string) => string;
	title: (s: string) => string;
	footer: (s: string) => string;
}

export interface DetailViewportOptions {
	title: string;
	/** Already-styled/wrapped content lines -- typically buildDetailLines' own output, but any pre-built line array works (a plain-text log excerpt, hand-formatted lines, ...). */
	contentLines: string[];
	/**
	 * How many body rows are visible at once. The host computes this from its
	 * own terminal reference (e.g. `Math.max(MIN, Math.min(MAX,
	 * tui.terminal.rows - RESERVED))`) -- the same "host owns the terminal,
	 * this library only owns layout" split ScrollView's own doc comment
	 * already draws; DetailViewport doesn't read a terminal reference itself.
	 */
	visibleLines: number;
	theme: DetailViewportTheme;
	onClose: () => void;
	/** Extra footer text appended after the scroll-position segment (e.g. "esc close", a URL). Omit for no extra hint. */
	footerHint?: string;
	measure?: TextMeasure;
	glyphs?: GlyphSet;
	matchesKey?: KeyMatcher;
	/** Defaults to true (a standalone viewport with its own top/bottom rule). Set false when nested inside another already-bordered container, where a second rule would double up. */
	framed?: boolean;
}

/**
 * A bordered, titled, scrollable detail viewport: escape/ctrl+c closes,
 * up/down/j/k/g/G scroll (delegated to ScrollView), pageUp/pageDown scroll
 * a full page. Owns no domain content -- `contentLines` is entirely the
 * caller's own (typically buildDetailLines' output), matching every other
 * component in this library that separates line-building from chrome.
 */
export class DetailViewport implements Component {
	private readonly scrollView: ScrollView;
	private readonly measure: TextMeasure;
	private readonly glyphs: GlyphSet;
	private readonly matchesKey: KeyMatcher;
	private readonly framed: boolean;

	constructor(private readonly opts: DetailViewportOptions) {
		this.measure = opts.measure ?? asciiTextMeasure;
		this.glyphs = opts.glyphs ?? unicodeGlyphs;
		this.matchesKey = opts.matchesKey ?? legacyKeyMatcher;
		this.framed = opts.framed ?? true;
		this.scrollView = new ScrollView(
			statelessComponent(() => opts.contentLines),
			{ maxHeight: opts.visibleLines, showScrollbar: false, measure: this.measure, matchesKey: this.matchesKey },
		);
	}

	invalidate(): void {
		this.scrollView.invalidate();
	}

	render(width: number): string[] {
		const contentWidth = Math.max(1, width - 2);
		const body = this.scrollView.render(contentWidth).map((line) => ` ${line}`);
		const { offset, total, visible } = this.scrollView.scrollPosition();
		const scrollHint = total > visible ? `↑/↓ scroll · ${offset + 1}-${Math.min(offset + visible, total)}/${total}` : undefined;
		const footerText = [scrollHint, this.opts.footerHint].filter(Boolean).join(" · ");
		const titleLine = this.measure.truncateToWidth(this.opts.theme.title(this.opts.title), width, "");
		return renderFramedPanel({
			width,
			...(this.framed ? { rule: this.glyphs.line.thin, ruleStyle: this.opts.theme.border } : {}),
			titleLines: [titleLine],
			contentLines: body,
			footerLines: footerText ? [this.opts.theme.footer(footerText)] : undefined,
		});
	}

	handleInput(data: string): void {
		// "\x03" (Ctrl+C) is a literal, universal terminal byte, not a named key
		// requiring Kitty-protocol disambiguation the way pageUp/pageDown do --
		// checked directly rather than solely via matchesKey, since
		// legacyKeyMatcher (the default when a host doesn't inject its own) has
		// no "ctrl+c" entry at all and would otherwise silently never close.
		if (this.matchesKey(data, "escape") || data === "\x03") {
			this.opts.onClose();
			return;
		}
		if (this.matchesKey(data, "pageUp")) {
			this.scrollView.scrollUp(this.opts.visibleLines);
			return;
		}
		if (this.matchesKey(data, "pageDown")) {
			this.scrollView.scrollDown(this.opts.visibleLines);
			return;
		}
		this.scrollView.handleInput(data);
	}
}
