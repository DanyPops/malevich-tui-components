import { describe, expect, it } from "bun:test";
import { Text } from "../src/components/text.ts";

describe("Text", () => {
	it("renders a single-line string as-is", () => {
		const text = new Text({ text: "hello" });
		expect(text.render(80)).toEqual(["hello"]);
	});

	it("renders each source line separately", () => {
		const text = new Text({ text: "one\ntwo" });
		expect(text.render(80)).toEqual(["one", "two"]);
	});

	it("truncates a line longer than the render width by default", () => {
		const text = new Text({ text: "a very long line indeed" });
		expect(text.render(10)).toEqual(["a very lo…"]);
	});

	it("word-wraps instead of truncating when wrap is true", () => {
		const text = new Text({ text: "one two three four", wrap: true });
		const lines = text.render(10);
		expect(lines.length).toBeGreaterThan(1);
		expect(lines.join(" ")).toContain("one");
		expect(lines.join(" ")).toContain("four");
	});

	it("applies the given style function to every rendered line", () => {
		const text = new Text({ text: "a\nb", style: (s) => `<${s}>` });
		expect(text.render(80)).toEqual(["<a>", "<b>"]);
	});

	it("setText() replaces the rendered content without constructing a new Text", () => {
		const text = new Text({ text: "old" });
		text.setText("new");
		expect(text.render(80)).toEqual(["new"]);
	});

	it("implements the Component interface (render + invalidate)", () => {
		const text = new Text({ text: "x" });
		expect(typeof text.render).toBe("function");
		expect(() => text.invalidate()).not.toThrow();
	});
});
