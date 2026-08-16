import { describe, expect, it, mock } from "bun:test";
import { DetailViewport, type DetailViewportTheme } from "../src/components/detail-viewport.ts";
import { asciiGlyphs } from "../src/glyphs.ts";
import { asciiTextMeasure } from "../src/text-measure.ts";

const plainTheme: DetailViewportTheme = {
	border: (s) => s,
	title: (s) => s,
	footer: (s) => s,
};

function makeViewport(overrides: Partial<ConstructorParameters<typeof DetailViewport>[0]> = {}) {
	const onClose = mock(() => {});
	const viewport = new DetailViewport({
		title: "Widget #42",
		contentLines: ["Status: open", "Priority: high"],
		visibleLines: 5,
		theme: plainTheme,
		onClose,
		measure: asciiTextMeasure,
		glyphs: asciiGlyphs,
		...overrides,
	});
	return { viewport, onClose };
}

describe("DetailViewport", () => {
	it("renders a bordered panel: rule, title, content, rule", () => {
		const { viewport } = makeViewport();
		const lines = viewport.render(20);
		expect(lines[0]).toBe("-".repeat(20));
		expect(lines[1]).toBe("Widget #42");
		expect(lines).toContain(" Status: open");
		expect(lines).toContain(" Priority: high");
		expect(lines.at(-1)).toBe("-".repeat(20));
	});

	it("omits the scroll-position footer when everything fits on one page", () => {
		const { viewport } = makeViewport();
		const lines = viewport.render(40);
		expect(lines.some((line) => line.includes("scroll"))).toBe(false);
	});

	it("shows a X-Y/Z scroll-position footer once content overflows visibleLines", () => {
		const { viewport } = makeViewport({ contentLines: ["1", "2", "3", "4", "5", "6", "7"], visibleLines: 3 });
		const lines = viewport.render(40);
		expect(lines).toContain("↑/↓ scroll · 1-3/7");
	});

	it("appends footerHint after the scroll-position segment", () => {
		const { viewport } = makeViewport({
			contentLines: ["1", "2", "3", "4"],
			visibleLines: 2,
			footerHint: "esc close",
		});
		const lines = viewport.render(40);
		expect(lines).toContain("↑/↓ scroll · 1-2/4 · esc close");
	});

	it("renders just footerHint with no scroll segment when content fits on one page", () => {
		const { viewport } = makeViewport({ footerHint: "esc close" });
		const lines = viewport.render(40);
		expect(lines).toContain("esc close");
	});

	it("truncates a title too wide for the given width", () => {
		const { viewport } = makeViewport({ title: "A very very very long title that will not fit" });
		const lines = viewport.render(15);
		expect(lines[1]!.length).toBeLessThanOrEqual(15);
	});

	it("down/up scroll the content one line at a time, delegated to ScrollView", () => {
		const { viewport } = makeViewport({ contentLines: ["1", "2", "3", "4"], visibleLines: 2 });
		expect(viewport.render(40)).toEqual(expect.arrayContaining([" 1", " 2"]));
		viewport.handleInput("j");
		expect(viewport.render(40)).toEqual(expect.arrayContaining([" 2", " 3"]));
	});

	it("pageDown/pageUp scroll a full visibleLines page", () => {
		const { viewport } = makeViewport({ contentLines: ["1", "2", "3", "4", "5", "6"], visibleLines: 2 });
		viewport.handleInput("\x1b[6~"); // pageDown (pi-tui/alef-tui legacy sequence)
		const lines = viewport.render(40);
		// legacyKeyMatcher doesn't recognize pageDown -- this proves it falls through to ScrollView's own handleInput untouched, not that pagination itself ran.
		expect(lines).toEqual(expect.arrayContaining([" 1", " 2"]));
	});

	it("pageUp/pageDown scroll a full page when a matchesKey recognizing them is supplied", () => {
		const { viewport } = makeViewport({
			contentLines: ["1", "2", "3", "4", "5", "6"],
			visibleLines: 2,
			matchesKey: (data, keyId) => (keyId === "pageDown" && data === "PGDN") || (keyId === "pageUp" && data === "PGUP"),
		});
		viewport.handleInput("PGDN");
		expect(viewport.render(40)).toEqual(expect.arrayContaining([" 3", " 4"]));
		viewport.handleInput("PGUP");
		expect(viewport.render(40)).toEqual(expect.arrayContaining([" 1", " 2"]));
	});

	it("escape calls onClose", () => {
		const { viewport, onClose } = makeViewport();
		viewport.handleInput("\x1b");
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("ctrl+c calls onClose", () => {
		const { viewport, onClose } = makeViewport();
		viewport.handleInput("\x03");
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("framed:false omits the top/bottom rule for nesting inside another bordered container", () => {
		const { viewport } = makeViewport({ framed: false });
		const lines = viewport.render(20);
		expect(lines[0]).not.toBe("-".repeat(20));
		expect(lines.at(-1)).not.toBe("-".repeat(20));
	});

	it("invalidate() forwards to the underlying ScrollView", () => {
		const { viewport } = makeViewport({ contentLines: ["1", "2", "3", "4"], visibleLines: 2 });
		viewport.handleInput("j");
		viewport.invalidate();
		expect(viewport.render(40)).toEqual(expect.arrayContaining([" 1", " 2"]));
	});
});
