import { describe, expect, it } from "bun:test";
import { asciiGlyphs } from "../src/glyphs.ts";
import { BorderedSelectPanel } from "../src/components/bordered-select-panel.ts";

const THEME = { border: (s: string) => s, title: (s: string) => s, help: (s: string) => s };

function fakeList(lines: string[] = ["item 1", "item 2"]) {
	let inputReceived: string | undefined;
	let invalidated = false;
	return {
		lines,
		get inputReceived() { return inputReceived; },
		get invalidated() { return invalidated; },
		render: () => lines,
		handleInput: (data: string) => { inputReceived = data; },
		invalidate: () => { invalidated = true; },
	};
}

describe("BorderedSelectPanel", () => {
	it("renders border, title, the wrapped list's own lines, help text, and a closing border", () => {
		const list = fakeList();
		const panel = new BorderedSelectPanel({ title: "Pick one", list, helpText: "enter • esc", theme: THEME });
		const lines = panel.render(20);
		expect(lines[0]).toBe("─".repeat(20));
		expect(lines[1]).toBe("Pick one");
		expect(lines[2]).toBe("item 1");
		expect(lines[3]).toBe("item 2");
		expect(lines[4]).toBe("enter • esc");
		expect(lines[5]).toBe("─".repeat(20));
	});

	it("omits the help-text line entirely when none is given", () => {
		const panel = new BorderedSelectPanel({ title: "T", list: fakeList(["x"]), theme: THEME });
		const lines = panel.render(10);
		expect(lines).toEqual(["─".repeat(10), "T", "x", "─".repeat(10)]);
	});

	it("forwards handleInput directly to the wrapped list, owning no selection logic itself", () => {
		const list = fakeList();
		const panel = new BorderedSelectPanel({ title: "T", list, theme: THEME });
		panel.handleInput("j");
		expect(list.inputReceived).toBe("j");
	});

	it("forwards invalidate directly to the wrapped list", () => {
		const list = fakeList();
		const panel = new BorderedSelectPanel({ title: "T", list, theme: THEME });
		panel.invalidate();
		expect(list.invalidated).toBe(true);
	});

	it("truncates a title longer than the available width", () => {
		const panel = new BorderedSelectPanel({ title: "a very long title indeed", list: fakeList([]), theme: THEME });
		expect(panel.render(10)[1]).toContain("…");
	});

	it("applies the theme's border/title/help styling functions", () => {
		const panel = new BorderedSelectPanel({
			title: "T",
			list: fakeList(["x"]),
			helpText: "h",
			theme: { border: (s) => `B(${s})`, title: (s) => `T(${s})`, help: (s) => `H(${s})` },
		});
		const lines = panel.render(5);
		expect(lines[0]).toStartWith("B(");
		expect(lines[1]).toStartWith("T(");
		expect(lines[3]).toStartWith("H(");
	});

	it("does not throw when the wrapped list has no handleInput at all", () => {
		const panel = new BorderedSelectPanel({ title: "T", list: { render: () => [], invalidate: () => {} }, theme: THEME });
		expect(() => panel.handleInput("x")).not.toThrow();
	});

	it("draws its border from an injected glyph set instead of the unicode default", () => {
		const panel = new BorderedSelectPanel({ title: "T", list: fakeList([]), theme: THEME, glyphs: asciiGlyphs });
		const lines = panel.render(5);
		expect(lines[0]).toBe("-".repeat(5));
	});

	it("omits its own top/bottom rule when framed is false, keeping title/list/help", () => {
		const panel = new BorderedSelectPanel({ title: "Pick one", list: fakeList(), helpText: "enter • esc", theme: THEME, framed: false });
		expect(panel.render(20)).toEqual(["Pick one", "item 1", "item 2", "enter • esc"]);
	});
});
