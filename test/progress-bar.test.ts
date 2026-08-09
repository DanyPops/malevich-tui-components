import { describe, expect, it } from "bun:test";
import { calculateProgressBarGeometry, createProgressBarRenderer, ProgressBar, renderProgressBar } from "../src/components/progress-bar.ts";

describe("ProgressBar", () => {
	it("renders a filled/empty bar proportional to value/max, plus a percentage", () => {
		// No opts.width here: render()'s own `width` parameter sizes the bar,
		// leaving no label/pct-text budget ambiguity to account for.
		const bar = new ProgressBar({ value: 50, max: 100 });
		const [line] = bar.render(14); // 14 - 0 (label) - 4 ("50%" + 1 space) = 10 bar chars
		expect(line).toContain("50%");
		expect(line).toContain("█".repeat(5));
		expect(line).toContain("░".repeat(5));
	});

	it("format() treats opts.width as the bar's own character count directly, distinct from render()'s total-line width", () => {
		// opts.width means "bar glyph count" in format(), but "total available
		// line width" in render() (label + bar + pct text share that budget there).
		const bar = new ProgressBar({ value: 1, max: 2, width: 10 });
		expect(bar.format()).toBe(`${"█".repeat(5)}${"░".repeat(5)}`);
	});

	it("defaults max to 100 when omitted", () => {
		const bar = new ProgressBar({ value: 25, width: 4 });
		expect(bar.render(80)[0]).toContain("25%");
	});

	it("clamps a value above max to 100%", () => {
		const bar = new ProgressBar({ value: 999, max: 100, width: 4 });
		expect(bar.render(80)[0]).toContain("100%");
	});

	it("clamps a negative value to 0%", () => {
		const bar = new ProgressBar({ value: -5, max: 100, width: 4 });
		expect(bar.render(80)[0]).toContain("0%");
	});

	it("prefixes the label when provided", () => {
		const bar = new ProgressBar({ value: 1, max: 2, label: "budget", width: 4 });
		expect(bar.render(80)[0]).toStartWith("budget ");
	});

	it("setValue/setLabel mutate in place for the next render", () => {
		const bar = new ProgressBar({ value: 0, max: 100, width: 4, label: "a" });
		bar.setValue(100);
		bar.setLabel("b");
		const [line] = bar.render(80);
		expect(line).toStartWith("b ");
		expect(line).toContain("100%");
	});

	it("setMax mutates in place, matching setValue/setLabel -- one long-lived instance can be reused across a new batch's own total instead of reconstructing it", () => {
		const bar = new ProgressBar({ value: 1, max: 2, width: 4 });
		expect(bar.render(80)[0]).toContain("50%");
		bar.setMax(4);
		expect(bar.render(80)[0]).toContain("25%"); // same value (1), new max (4) -- 25%, not 50%
	});

	it("applies a custom style function to the whole rendered line", () => {
		const bar = new ProgressBar({ value: 1, max: 1, width: 4, style: (t) => `<${t}>` });
		expect(bar.render(80)[0]).toStartWith("<");
		expect(bar.render(80)[0]).toEndWith(">");
	});

	it("supports custom filled/empty characters", () => {
		const bar = new ProgressBar({ value: 1, max: 1, width: 3, filledChar: "#", emptyChar: "-" });
		expect(bar.format()).toBe("###");
	});

	it("format() renders just the bar glyphs, no label or percentage", () => {
		const bar = new ProgressBar({ value: 0, max: 2, width: 4 });
		expect(bar.format()).toBe("░░░░");
	});

	it("keeps geometry independent from selectable block rendering", () => {
		const geometry = calculateProgressBarGeometry(7, 10, 10);
		expect(geometry).toEqual({ ratio: 0.7, width: 10, filledCells: 7 });
		expect(renderProgressBar(geometry, { filled: "■", empty: " ", left: "|", right: "|" })).toBe("|■■■■■■■   |");
		expect(createProgressBarRenderer("ascii")(geometry)).toBe("[#######---]");
	});

	it("supports smooth fractional blocks without changing geometry math", () => {
		const bar = new ProgressBar({ value: 1, max: 3, width: 8, glyphs: "smooth" });
		expect(bar.format()).toBe("|██▋     |");
	});

	it("accepts a caller-owned renderer strategy", () => {
		const bar = new ProgressBar({ value: 1, max: 2, width: 4, renderer: ({ filledCells, width }) => `${filledCells}/${width}` });
		expect(bar.format()).toBe("2/4");
	});

	it("uses a custom TextMeasure when provided", () => {
		let measured = 0;
		const bar = new ProgressBar({
			value: 1,
			max: 1,
			label: "x",
			measure: {
				visibleWidth: (s) => {
					measured++;
					return s.length;
				},
				truncateToWidth: (s) => s,
			},
		});
		bar.render(80);
		expect(measured).toBeGreaterThan(0);
	});

	it("implements the Component interface (render + invalidate)", () => {
		const bar = new ProgressBar({ value: 0 });
		expect(typeof bar.render).toBe("function");
		expect(() => bar.invalidate()).not.toThrow();
	});
});
