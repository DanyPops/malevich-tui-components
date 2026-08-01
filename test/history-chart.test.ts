import { describe, expect, it } from "bun:test";
import { type ChartBucket, type ChartSeries, HistoryChart, type HistoryChartTheme } from "../src/components/history-chart.ts";

const THEME: HistoryChartTheme = {
	title: (s) => s,
	subtitle: (s) => s,
	axis: (s) => s,
	warningLine: (s) => s,
	errorLine: (s) => s,
	muted: (s) => s,
	series: (i) => (s) => `[${i}]${s}`,
};

const SERIES: ChartSeries[] = [{ key: "a", label: "Series A" }];

function bucket(start: number, end: number, total: number): ChartBucket {
	return { start, end, total, series: { a: total } };
}

describe("HistoryChart", () => {
	it("renders the title and a cumulative-total summary line", () => {
		const chart = new HistoryChart({
			title: "Usage",
			buckets: [bucket(0, 1000, 10), bucket(1000, 2000, 20)],
			series: SERIES,
			formatValue: (v) => `${v}`,
			noDataText: "none",
			theme: THEME,
		});
		const lines = chart.render(40);
		expect(lines[0]).toBe("Usage");
		expect(lines[1]).toContain("30"); // cumulative total across both buckets
	});

	it("renders the no-data message when the cumulative total and budget are both zero", () => {
		const chart = new HistoryChart({
			title: "T",
			buckets: [bucket(0, 1, 0)],
			series: SERIES,
			formatValue: (v) => `${v}`,
			noDataText: "Nothing yet.",
			theme: THEME,
		});
		expect(chart.render(40).join("\n")).toContain("Nothing yet.");
	});

	it("reports budget state: not configured, under budget, and over budget", () => {
		const notConfigured = new HistoryChart({
			title: "T",
			buckets: [bucket(0, 1, 10)],
			series: SERIES,
			formatValue: (v) => `${v}`,
			noDataText: "n",
			theme: THEME,
		});
		expect(notConfigured.render(40)[1]).toContain("budget not configured");

		const underBudget = new HistoryChart({
			title: "T",
			buckets: [bucket(0, 1, 10)],
			series: SERIES,
			formatValue: (v) => `${v}`,
			noDataText: "n",
			theme: THEME,
			budget: 100,
		});
		expect(underBudget.render(40)[1]).toContain("remaining");

		const overBudget = new HistoryChart({
			title: "T",
			buckets: [bucket(0, 1, 150)],
			series: SERIES,
			formatValue: (v) => `${v}`,
			noDataText: "n",
			theme: THEME,
			budget: 100,
		});
		expect(overBudget.render(40)[1]).toContain("OVER BUDGET");
	});

	it('prefixes the observed total with "at least" when truncated', () => {
		const chart = new HistoryChart({
			title: "T",
			buckets: [bucket(0, 1, 10)],
			series: SERIES,
			formatValue: (v) => `${v}`,
			noDataText: "n",
			theme: THEME,
			truncated: true,
		});
		expect(chart.render(80)[1]).toContain("at least 10");
		expect(chart.render(80)[1]).toContain("query limit reached");
	});

	it("renders an optional subtitle line beneath the budget summary", () => {
		const chart = new HistoryChart({
			title: "T",
			buckets: [bucket(0, 1, 10)],
			series: SERIES,
			formatValue: (v) => `${v}`,
			noDataText: "n",
			theme: THEME,
			subtitle: "extra detail",
		});
		expect(chart.render(40)[2]).toBe("extra detail");
	});

	it("renders a per-series legend line with its own total and a cycled series style", () => {
		const chart = new HistoryChart({
			title: "T",
			buckets: [{ start: 0, end: 1, total: 30, series: { a: 10, b: 20 } }],
			series: [
				{ key: "a", label: "Alpha" },
				{ key: "b", label: "Beta" },
			],
			formatValue: (v) => `${v}`,
			noDataText: "n",
			theme: THEME,
		});
		const output = chart.render(60).join("\n");
		expect(output).toContain("Alpha");
		expect(output).toContain("10");
		expect(output).toContain("Beta");
		expect(output).toContain("20");
	});

	it("caps the legend at maxSeriesShown and reports how many were omitted", () => {
		const series = Array.from({ length: 5 }, (_, i) => ({ key: `s${i}`, label: `Series ${i}` }));
		const chart = new HistoryChart({
			title: "T",
			buckets: [{ start: 0, end: 1, total: 5, series: Object.fromEntries(series.map((s) => [s.key, 1])) }],
			series,
			formatValue: (v) => `${v}`,
			noDataText: "n",
			theme: THEME,
			maxSeriesShown: 2,
		});
		const output = chart.render(80).join("\n");
		expect(output).toContain("3 more series omitted");
	});

	it("downsamples more buckets than fit the available plot width, without throwing", () => {
		const buckets = Array.from({ length: 100 }, (_, i) => bucket(i * 1000, (i + 1) * 1000, 1));
		const chart = new HistoryChart({ title: "T", buckets, series: SERIES, formatValue: (v) => `${v}`, noDataText: "n", theme: THEME });
		expect(() => chart.render(30)).not.toThrow();
	});

	it("every rendered line stays within the requested width", () => {
		const chart = new HistoryChart({
			title: "A title long enough to matter for truncation checks",
			buckets: [bucket(0, 1000, 12345)],
			series: SERIES,
			formatValue: (v) => `$${v}`,
			noDataText: "n",
			theme: THEME,
			budget: 9999,
		});
		for (const line of chart.render(25)) expect(line.length).toBeLessThanOrEqual(25);
	});

	it("uses a custom formatAxisLabel for the X-axis tick labels", () => {
		// A wide plot with several buckets so the start/mid/end labels land in
		// distinct columns instead of overwriting each other.
		const buckets = Array.from({ length: 10 }, (_, i) => bucket(i * 1000, (i + 1) * 1000, 1));
		const chart = new HistoryChart({
			title: "T",
			buckets,
			series: SERIES,
			formatValue: (v) => `${v}`,
			noDataText: "n",
			theme: THEME,
			formatAxisLabel: (ms) => `T${ms}`,
		});
		const output = chart.render(80).join("\n");
		expect(output).toContain("T0");
		expect(output).toContain("T10000");
	});

	it("implements the Component interface (render + invalidate)", () => {
		const chart = new HistoryChart({ title: "T", buckets: [], series: [], formatValue: (v) => `${v}`, noDataText: "n", theme: THEME });
		expect(typeof chart.render).toBe("function");
		expect(() => chart.invalidate()).not.toThrow();
	});
});
