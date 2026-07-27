import { describe, expect, it } from "bun:test";
import { SplitPane } from "../src/components/split-pane.ts";

function fixedChild(lines: string[]) {
	return { render: () => lines, invalidate: () => {} };
}

describe("SplitPane", () => {
	it("renders both children side by side, separated by the border char", () => {
		const pane = new SplitPane(fixedChild(["L"]), fixedChild(["R"]), { minLeftWidth: 4, minRightWidth: 4 });
		const [line] = pane.render(20);
		expect(line).toContain("│");
		expect(line?.startsWith("L")).toBe(true);
		expect(line?.endsWith("R")).toBe(true);
	});

	it("pads the shorter side to fill uneven line counts", () => {
		const pane = new SplitPane(fixedChild(["1", "2"]), fixedChild(["a"]), { minLeftWidth: 4, minRightWidth: 4 });
		const lines = pane.render(20);
		expect(lines).toHaveLength(2);
		expect(lines[1]).toContain("│");
	});

	it("falls back to rendering only the left child when the viewport is too narrow for both minimums", () => {
		const pane = new SplitPane(fixedChild(["only-left"]), fixedChild(["right"]), { minLeftWidth: 10, minRightWidth: 10 });
		expect(pane.render(5)).toEqual(["only-left"]);
	});

	it("uses a custom border character", () => {
		const pane = new SplitPane(fixedChild(["L"]), fixedChild(["R"]), { minLeftWidth: 4, minRightWidth: 4, borderChar: "|" });
		expect(pane.render(20)[0]).toContain("|");
	});

	it("truncates a right-side line that overflows its column width", () => {
		const pane = new SplitPane(fixedChild(["L"]), fixedChild(["x".repeat(50)]), { minLeftWidth: 4, minRightWidth: 5 });
		const [line] = pane.render(15);
		expect(line).toContain("…");
	});

	it("invalidate() forwards to both children", () => {
		let leftInvalidated = false;
		let rightInvalidated = false;
		const pane = new SplitPane(
			{ render: () => [], invalidate: () => { leftInvalidated = true; } },
			{ render: () => [], invalidate: () => { rightInvalidated = true; } },
		);
		pane.invalidate();
		expect(leftInvalidated).toBe(true);
		expect(rightInvalidated).toBe(true);
	});
});
