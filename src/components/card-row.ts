/**
 * Tiles several cards from the SAME tool side by side, using CSS `repeat(auto-fit,
 * minmax(minCardWidth, 1fr))`'s own algorithm translated to a terminal row: as many columns as
 * fit at minCardWidth, wrapping into further rows once a tool's own card count exceeds that --
 * and EVERY row, including a wrapped remainder row of just one card, stretches its own actual
 * card count to consume the full given width, never leaving dead space on the right.
 *
 * Each card's own body is blank-line-padded to the tallest card's body height in its row BEFORE
 * framing (renderBox) -- padding after framing misaligns a shorter card's own bottom border onto
 * a physical line a taller sibling's own content is still occupying.
 *
 * A different tool's own cards are never passed in the same renderCardRow call -- the caller
 * (one call per tool) is what enforces "same tool tiles together, different tool gets its own
 * row(s)", not this function.
 */
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";
import { type BoxBorderStyle, renderBox } from "./box.js";

export interface CardRowSpec {
	/** This card's own top-border label, e.g. "Papyrus · Tasks". */
	label: string;
	/** Renders this card's own body lines for the width it's actually given in the row it lands
	 * in -- already net of the border and interior content padding this function reserves. */
	render: (width: number) => string[];
	/** Styles the label text only, not the surrounding border dashes. */
	labelStyle?: (s: string) => string;
}

export interface CardRowOptions {
	measure?: TextMeasure;
	/** Blank columns between adjacent cards in the same row. Defaults to 1. */
	gap?: number;
	/** CSS `minmax(minCardWidth, 1fr)`'s own minimum -- a row wraps once fitting one more column
	 * would shrink every card below this. Defaults to 40. */
	minCardWidth?: number;
	borderStyle?: BoxBorderStyle;
	/** Styles every border segment; all cards in a call share one frame style. */
	frameStyle?: (s: string) => string;
}

const DEFAULT_GAP = 1;
const DEFAULT_MIN_CARD_WIDTH = 40;
/** One blank column reserved on each side of a card's own interior content, matching the
 * "│ content │" convention already used elsewhere in this ecosystem (e.g. vehicle-client-pi's
 * own "papyrus discuss" prompt box). */
const CONTENT_PADDING = 1;

function contentWidth(colWidth: number): number {
	return Math.max(1, colWidth - 2 - CONTENT_PADDING * 2);
}

export function renderCardRow(specs: readonly CardRowSpec[], width: number, options: CardRowOptions = {}): string[] {
	if (specs.length === 0) return [];
	const measure = options.measure ?? asciiTextMeasure;
	const gap = Math.max(0, options.gap ?? DEFAULT_GAP);
	const minCardWidth = Math.max(1, options.minCardWidth ?? DEFAULT_MIN_CARD_WIDTH);
	const borderStyle = options.borderStyle ?? "rounded";
	const frameStyle = options.frameStyle ?? ((s: string) => s);

	const maxColumns = Math.max(1, Math.floor((width + gap) / (minCardWidth + gap)));
	const columns = Math.min(specs.length, maxColumns);

	const out: string[] = [];
	for (let start = 0; start < specs.length; start += columns) {
		const rowSpecs = specs.slice(start, start + columns);
		const n = rowSpecs.length;
		const usable = Math.max(n, width - gap * (n - 1));
		const base = Math.floor(usable / n);
		const remainder = usable - base * n;
		const colWidths = rowSpecs.map((_, i) => base + (i < remainder ? 1 : 0));

		// Rendered once per card at its OWN column width and reused below -- content is
		// width-dependent (wrapping/truncation can change line count), so body height can't be
		// assumed equal across cards without actually calling render().
		const rendered = rowSpecs.map((spec, i) => spec.render(contentWidth(colWidths[i]!)));
		const bodyHeight = Math.max(...rendered.map((lines) => lines.length));

		const cards = rowSpecs.map((spec, i) => {
			const raw = rendered[i]!;
			const padded = [...raw, ...Array(Math.max(0, bodyHeight - raw.length)).fill("")];
			const lines = padded.map((line) => (line ? `${" ".repeat(CONTENT_PADDING)}${line}` : ""));
			const label = spec.labelStyle ? spec.labelStyle(spec.label) : spec.label;
			return renderBox({
				width: colWidths[i]!,
				lines,
				borderStyle,
				frameStyle,
				topLabel: `${frameStyle("─")} ${label} `,
				measure,
				truncateLines: true,
			});
		});
		const rowHeight = cards[0]!.length;
		for (let r = 0; r < rowHeight; r++) out.push(cards.map((c) => c[r] ?? "").join(" ".repeat(gap)));
	}
	return out;
}
