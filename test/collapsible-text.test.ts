import { describe, expect, it } from "bun:test";
import { CollapsibleText } from "../src/components/collapsible-text.ts";

describe("CollapsibleText", () => {
	it("renders short text (<= collapsedLines) inline with no chrome", () => {
		const c = new CollapsibleText({ text: "a\nb", collapsedLines: 5 });
		expect(c.isLong).toBe(false);
		expect(c.render(80)).toEqual(["a", "b"]);
	});

	it("collapses long text to the first N lines behind a summary header", () => {
		const c = new CollapsibleText({ text: "1\n2\n3\n4\n5\n6\n7", collapsedLines: 3 });
		expect(c.isLong).toBe(true);
		const lines = c.render(80);
		expect(lines[0]).toBe("▸ 7 lines (+4 hidden)");
		expect(lines.slice(1)).toEqual(["1", "2", "3"]);
	});

	it("expand() shows every line behind the non-collapsed summary text", () => {
		const c = new CollapsibleText({ text: "1\n2\n3\n4", collapsedLines: 2 });
		c.expand();
		const lines = c.render(80);
		expect(lines[0]).toBe("▾ 4 lines");
		expect(lines.slice(1)).toEqual(["1", "2", "3", "4"]);
	});

	it("toggle()/collapse() flip state, and lineCount reports the real total", () => {
		const c = new CollapsibleText({ text: "1\n2\n3", collapsedLines: 1 });
		expect(c.lineCount).toBe(3);
		c.toggle();
		expect(c.collapsed).toBe(false);
		c.collapse();
		expect(c.collapsed).toBe(true);
	});

	it("applies paddingX to every rendered line", () => {
		const c = new CollapsibleText({ text: "a", paddingX: 2 });
		expect(c.render(80)).toEqual(["  a"]);
	});

	it("wraps a long line using the injected measure's wrapTextWithAnsi", () => {
		const c = new CollapsibleText({
			text: "a very long line",
			collapsedLines: 5,
			measure: { visibleWidth: (s) => s.length, truncateToWidth: (s) => s, wrapTextWithAnsi: (t) => [t.slice(0, 5), t.slice(5)] },
		});
		expect(c.render(80)).toEqual(["a ver", "y long line"]);
	});

	it("falls back to one unwrapped line when the measure has no wrapTextWithAnsi", () => {
		const c = new CollapsibleText({ text: "hello", measure: { visibleWidth: (s) => s.length, truncateToWidth: (s) => s } });
		expect(c.render(80)).toEqual(["hello"]);
	});

	it("applies headerStyle to the summary and textStyle to each content line", () => {
		const c = new CollapsibleText({
			text: "1\n2\n3",
			collapsedLines: 1,
			headerStyle: (s) => `H(${s})`,
			textStyle: (s) => `T(${s})`,
		});
		const lines = c.render(80);
		expect(lines[0]).toStartWith("H(");
		expect(lines[1]).toBe("T(1)");
	});

	it("invalidate() does not throw (no child Component to forward to)", () => {
		const c = new CollapsibleText({ text: "a" });
		expect(() => c.invalidate()).not.toThrow();
	});
});
