/**
 * Generalizes the cumulative stacked-bar rendering core of pi-jittor's
 * renderChart (extension/src/usage.ts). Jittor's own data-fetching,
 * period navigation, and token/cost formatting stay there.
 */
import type { Component } from "../component.js";
import { type GlyphTheme, unicodeGlyphs } from "../glyphs.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface ChartSeries {
	key: string;
	/** Already fully formatted for display (e.g. "openai/gpt-5"); this component does no identity formatting of its own. */
	label: string;
}

export interface ChartBucket {
	start: number;
	end: number;
	/** This bucket's own (non-cumulative) total across all series. */
	total: number;
	/** This bucket's own (non-cumulative) per-series values, keyed by ChartSeries.key. */
	series: Record<string, number>;
}

export interface HistoryChartTheme {
	title: (s: string) => string;
	/** The observed/budget summary line under the title. */
	subtitle: (s: string) => string;
	/** Axis rule and tick labels. */
	axis: (s: string) => string;
	/** The budget threshold row when the total is under budget. */
	warningLine: (s: string) => string;
	/** The budget threshold row when the total has exceeded budget. */
	errorLine: (s: string) => string;
	/** The "no data"/"N more series omitted" lines. */
	muted: (s: string) => string;
	/** Per-series bar segment and legend bullet color, cycled by index. */
	series: (index: number) => (s: string) => string;
}

export interface HistoryChartOptions {
	title: string;
	buckets: ChartBucket[];
	series: ChartSeries[];
	formatValue: (value: number) => string;
	/** Appended after a formatted value, e.g. " tokens". Empty when formatValue already carries a unit prefix like "$". Default "". */
	unitSuffix?: string;
	subtitle?: string;
	budget?: number;
	noDataText: string;
	/** True when `buckets`/`series` reflect a query that hit its own row/scope limit -- rendered as "at least N" instead of a bare total. Default false. */
	truncated?: boolean;
	/** Formats a bucket boundary timestamp for the X axis. Default: Date#toLocaleString(). */
	formatAxisLabel?: (timestampMs: number) => string;
	theme: HistoryChartTheme;
	measure?: TextMeasure;
	glyphs?: GlyphTheme;
	/** Plot rows, not counting title/subtitle/axis/legend lines. Default 8. */
	height?: number;
	/** Reserved column width for Y-axis value labels. Default 8. */
	yAxisWidth?: number;
	/** Cap on legend rows before "N more series omitted". Default 6. */
	maxSeriesShown?: number;
}

function mergeBuckets(buckets: ChartBucket[], maximum: number): ChartBucket[] {
	if (buckets.length <= maximum) return buckets;
	const result: ChartBucket[] = [];
	for (let index = 0; index < maximum; index += 1) {
		const from = Math.floor((index * buckets.length) / maximum);
		const to = Math.max(from + 1, Math.floor(((index + 1) * buckets.length) / maximum));
		const selected = buckets.slice(from, to);
		const series: Record<string, number> = {};
		for (const bucket of selected) {
			for (const [key, value] of Object.entries(bucket.series)) series[key] = (series[key] ?? 0) + value;
		}
		result.push({
			start: (selected[0] as ChartBucket).start,
			end: (selected[selected.length - 1] as ChartBucket).end,
			total: selected.reduce((sum, bucket) => sum + bucket.total, 0),
			series,
		});
	}
	return result;
}

/** Renders a cumulative, stacked-by-series ASCII bar chart with a Y-axis value scale, an optional budget threshold line, X-axis time labels, and a per-series legend. Owns no data-fetching or period navigation -- purely a rendering function over already-bucketed data. */
export class HistoryChart implements Component {
	private readonly measure: TextMeasure;
	private readonly height: number;
	private readonly yAxisWidth: number;
	private readonly maxSeriesShown: number;
	private readonly glyphs: GlyphTheme;

	constructor(private readonly opts: HistoryChartOptions) {
		this.measure = opts.measure ?? asciiTextMeasure;
		this.height = opts.height ?? 8;
		this.yAxisWidth = opts.yAxisWidth ?? 8;
		this.maxSeriesShown = opts.maxSeriesShown ?? 6;
		this.glyphs = opts.glyphs ?? unicodeGlyphs;
	}

	invalidate(): void {}

	private seriesAt(bucket: ChartBucket, valueHeight: number): number {
		let cumulative = 0;
		for (let index = 0; index < this.opts.series.length; index += 1) {
			cumulative += bucket.series[(this.opts.series[index] as ChartSeries).key] ?? 0;
			if (valueHeight <= cumulative) return index;
		}
		return Math.max(0, this.opts.series.length - 1);
	}

	private axisLabels(start: number, end: number, width: number): string {
		const format = this.opts.formatAxisLabel ?? ((ms) => new Date(ms).toLocaleString());
		const labels = [format(start), format(start + (end - start) / 2), format(end)];
		const positions = [0, Math.max(0, Math.floor((width - labels[1]!.length) / 2)), Math.max(0, width - labels[2]!.length)];
		const characters = Array.from({ length: width }, () => " ");
		for (let labelIndex = 0; labelIndex < labels.length; labelIndex += 1) {
			const label = labels[labelIndex] as string;
			for (let index = 0; index < label.length && (positions[labelIndex] as number) + index < width; index += 1) {
				characters[(positions[labelIndex] as number) + index] = label[index] as string;
			}
		}
		return characters.join("");
	}

	render(width: number): string[] {
		const { opts, measure } = this;
		const unitSuffix = opts.unitSuffix ?? "";
		const safeWidth = Math.max(20, width);
		const chartColumns = Math.max(1, Math.floor((safeWidth - this.yAxisWidth - 1) / 2));
		const increments = mergeBuckets(opts.buckets, chartColumns);

		const runningSeries: Record<string, number> = {};
		let runningTotal = 0;
		const buckets = increments.map((bucket) => {
			runningTotal += bucket.total;
			for (const [key, value] of Object.entries(bucket.series)) runningSeries[key] = (runningSeries[key] ?? 0) + value;
			return { ...bucket, total: runningTotal, series: { ...runningSeries } };
		});

		const grandTotal = runningTotal;
		const barStep = buckets.length * 2 <= safeWidth - this.yAxisWidth ? 2 : 1;
		const plotWidth = buckets.length * barStep;
		const budget = typeof opts.budget === "number" && Number.isFinite(opts.budget) && opts.budget > 0 ? opts.budget : undefined;
		const maximum = Math.max(grandTotal, budget ?? 0);

		const observed = opts.truncated ? `at least ${opts.formatValue(grandTotal)}` : opts.formatValue(grandTotal);
		const budgetState =
			budget === undefined
				? `${observed}${unitSuffix} · budget not configured${opts.truncated ? " · query limit reached" : ""}`
				: grandTotal > budget
					? `${observed}${unitSuffix} / ${opts.formatValue(budget)} budget · OVER BUDGET by ${opts.truncated ? "at least " : ""}${opts.formatValue(grandTotal - budget)}`
					: opts.truncated
						? `${observed}${unitSuffix} / ${opts.formatValue(budget)} budget · state unknown · query limit reached`
						: `${observed}${unitSuffix} / ${opts.formatValue(budget)} budget · ${opts.formatValue(budget - grandTotal)} remaining`;

		const lines = [
			measure.truncateToWidth(opts.theme.title(opts.title), safeWidth, ""),
			measure.truncateToWidth(opts.theme.subtitle(budgetState), safeWidth, "…"),
			...(opts.subtitle ? [measure.truncateToWidth(opts.theme.subtitle(opts.subtitle), safeWidth, "…")] : []),
			"",
		];

		if (maximum === 0) {
			lines.push(opts.theme.muted(opts.noDataText));
			return lines.map((line) => measure.truncateToWidth(line, safeWidth, "…"));
		}

		for (let row = 0; row < this.height; row += 1) {
			const fromBottom = this.height - row - 1;
			const lower = (maximum * fromBottom) / this.height;
			const upper = (maximum * (fromBottom + 1)) / this.height;
			const thresholdRow = budget !== undefined && budget > lower && budget <= upper;
			const label = thresholdRow
				? opts.formatValue(budget)
				: row === 0
					? opts.formatValue(maximum)
					: row === Math.floor(this.height / 2)
						? opts.formatValue(maximum / 2)
						: "";
			if (thresholdRow) {
				const lineStyle = grandTotal > (budget as number) ? opts.theme.errorLine : opts.theme.warningLine;
				lines.push(
					`${label.padStart(this.yAxisWidth - 2)} ${opts.theme.axis(this.glyphs.chart.vertical)}${lineStyle(this.glyphs.chart.threshold.repeat(plotWidth))}`,
				);
				continue;
			}
			let plot = "";
			for (const bucket of buckets) {
				const scaled = (bucket.total / maximum) * this.height;
				const occupancy = Math.max(0, Math.min(1, scaled - fromBottom));
				if (occupancy <= 0) {
					plot += " ".repeat(barStep);
					continue;
				}
				const partials = this.glyphs.chart.partial;
				const block = partials[Math.max(0, Math.ceil(occupancy * partials.length) - 1)] ?? "";
				const valueHeight = Math.min(bucket.total, (maximum * (fromBottom + Math.min(occupancy, 0.5))) / this.height);
				plot += opts.theme.series(this.seriesAt(bucket, valueHeight))(block) + (barStep === 2 ? " " : "");
			}
			lines.push(`${label.padStart(this.yAxisWidth - 2)} ${opts.theme.axis(this.glyphs.chart.vertical)}${plot}`);
		}
		lines.push(
			`${"0".padStart(this.yAxisWidth - 2)} ${opts.theme.axis(`${this.glyphs.chart.bottomLeft}${this.glyphs.chart.horizontal.repeat(plotWidth)}`)}`,
		);
		lines.push(
			`${" ".repeat(this.yAxisWidth)}${opts.theme.axis(this.axisLabels(opts.buckets[0]?.start ?? 0, opts.buckets[opts.buckets.length - 1]?.end ?? 0, plotWidth))}`,
		);
		lines.push("");

		const displayedSeries = opts.series.slice(0, this.maxSeriesShown);
		for (let index = 0; index < displayedSeries.length; index += 1) {
			const series = displayedSeries[index] as ChartSeries;
			const bullet = opts.theme.series(index)(this.glyphs.chart.bullet);
			const seriesTotal = opts.buckets.reduce((sum, bucket) => sum + (bucket.series[series.key] ?? 0), 0);
			lines.push(measure.truncateToWidth(`${bullet} ${series.label}  ${opts.formatValue(seriesTotal)}`, safeWidth, "…"));
		}
		if (opts.series.length > displayedSeries.length) {
			lines.push(
				measure.truncateToWidth(opts.theme.muted(`… ${opts.series.length - displayedSeries.length} more series omitted`), safeWidth, "…"),
			);
		}

		return lines.map((line) => (measure.visibleWidth(line) <= safeWidth ? line : measure.truncateToWidth(line, safeWidth, "…")));
	}
}
