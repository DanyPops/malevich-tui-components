import { describe, expect, it } from "bun:test";
import { ScrollView } from "../src/components/scroll-view.ts";

function fixedChild(lines: string[]) {
	return { render: () => lines, invalidate: () => {} };
}

describe("ScrollView", () => {
	it("renders every line with a trailing scrollbar space when content fits within maxHeight", () => {
		const view = new ScrollView(fixedChild(["a", "b"]), { maxHeight: 5 });
		expect(view.render(80)).toEqual(["a ", "b "]);
	});

	it("omits the scrollbar column entirely when showScrollbar is false", () => {
		const view = new ScrollView(fixedChild(["a", "b"]), { maxHeight: 5, showScrollbar: false });
		expect(view.render(80)).toEqual(["a", "b"]);
	});

	it("shows only maxHeight lines when content overflows, starting at the top", () => {
		const view = new ScrollView(fixedChild(["1", "2", "3", "4", "5"]), { maxHeight: 2, showScrollbar: false });
		expect(view.render(80)).toEqual(["1", "2"]);
	});

	it("scrollDown advances the visible window", () => {
		const view = new ScrollView(fixedChild(["1", "2", "3", "4", "5"]), { maxHeight: 2, showScrollbar: false });
		view.scrollDown(2);
		expect(view.render(80)).toEqual(["3", "4"]);
	});

	it("scrollUp never goes above the top", () => {
		const view = new ScrollView(fixedChild(["1", "2", "3"]), { maxHeight: 2, showScrollbar: false });
		view.scrollUp(5);
		expect(view.render(80)).toEqual(["1", "2"]);
	});

	it("scrollToBottom clamps to the last full page", () => {
		const view = new ScrollView(fixedChild(["1", "2", "3", "4", "5"]), { maxHeight: 2, showScrollbar: false });
		view.scrollToBottom();
		expect(view.render(80)).toEqual(["4", "5"]);
	});

	it("scrollToTop resets to the first page", () => {
		const view = new ScrollView(fixedChild(["1", "2", "3", "4"]), { maxHeight: 2, showScrollbar: false });
		view.scrollToBottom();
		view.scrollToTop();
		expect(view.render(80)).toEqual(["1", "2"]);
	});

	it("handleInput: j/down-arrow scrolls down, k/up-arrow scrolls up, g/G jump to top/bottom", () => {
		const view = new ScrollView(fixedChild(["1", "2", "3", "4"]), { maxHeight: 2, showScrollbar: false });
		view.handleInput("j");
		expect(view.render(80)).toEqual(["2", "3"]);
		view.handleInput("k");
		expect(view.render(80)).toEqual(["1", "2"]);
		view.handleInput("G");
		expect(view.render(80)).toEqual(["3", "4"]);
		view.handleInput("g");
		expect(view.render(80)).toEqual(["1", "2"]);
	});

	it("invalidate() resets scroll position and forwards to the child", () => {
		let invalidated = false;
		const view = new ScrollView({ render: () => ["1", "2", "3"], invalidate: () => { invalidated = true; } }, { maxHeight: 1, showScrollbar: false });
		view.scrollDown(2);
		view.invalidate();
		expect(invalidated).toBe(true);
		expect(view.render(80)).toEqual(["1"]);
	});

	it("renders a scrollbar thumb column when content overflows", () => {
		const view = new ScrollView(fixedChild(["1", "2", "3", "4"]), { maxHeight: 2, showScrollbar: true });
		const lines = view.render(80);
		expect(lines).toHaveLength(2);
		for (const line of lines) expect(line.endsWith("█") || line.endsWith("░")).toBe(true);
	});

	it("uses a custom KeyMatcher when provided instead of the legacy default", () => {
		const view = new ScrollView(fixedChild(["1", "2", "3", "4", "5"]), {
			maxHeight: 2,
			showScrollbar: false,
			matchesKey: (data, keyId) => keyId === "down" && data === "CUSTOM_DOWN",
		});
		view.handleInput("\x1b[B");
		expect(view.render(80)).toEqual(["1", "2"]);
		view.handleInput("CUSTOM_DOWN");
		expect(view.render(80)).toEqual(["2", "3"]);
	});
});
