import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export type BoxBorderStyle = "rounded" | "light" | "heavy";

export interface BoxBorder {
	horizontal: string;
	vertical: string;
	topLeft: string;
	topRight: string;
	bottomLeft: string;
	bottomRight: string;
}

const BOX: Record<BoxBorderStyle, BoxBorder> = {
	rounded: { horizontal: "─", vertical: "│", topLeft: "╭", topRight: "╮", bottomLeft: "╰", bottomRight: "╯" },
	light: { horizontal: "─", vertical: "│", topLeft: "┌", topRight: "┐", bottomLeft: "└", bottomRight: "┘" },
	heavy: { horizontal: "━", vertical: "┃", topLeft: "┏", topRight: "┓", bottomLeft: "┗", bottomRight: "┛" },
};

export interface RenderBoxOptions {
	width: number;
	lines: string[];
	borderStyle?: BoxBorderStyle;
	frameStyle?: (text: string) => string;
	lineStyle?: (text: string) => string;
	topLabel?: string;
	topLabelStyle?: (text: string) => string;
	measure?: TextMeasure;
	truncateLines?: boolean;
}

/** Assembles a rectangular box while styling every border segment independently from its content. */
export function renderBox(options: RenderBoxOptions): string[] {
	const width = Math.max(2, options.width);
	const innerWidth = Math.max(0, width - 2);
	const border = BOX[options.borderStyle ?? "light"];
	const frameStyle = options.frameStyle ?? ((text: string) => text);
	const lineStyle = options.lineStyle ?? ((text: string) => text);
	const topLabelStyle = options.topLabelStyle ?? ((text: string) => text);
	const measure = options.measure ?? asciiTextMeasure;

	let top: string;
	if (options.topLabel !== undefined) {
		const label = measure.truncateToWidth(options.topLabel, Math.max(0, width - 2), "…");
		const fill = Math.max(0, width - measure.visibleWidth(label) - 2);
		top = `${frameStyle(border.topLeft)}${topLabelStyle(label)}${frameStyle(`${border.horizontal.repeat(fill)}${border.topRight}`)}`;
	} else {
		top = frameStyle(`${border.topLeft}${border.horizontal.repeat(innerWidth)}${border.topRight}`);
	}

	const lines = [top];
	for (const rawLine of options.lines) {
		const line = options.truncateLines ? measure.truncateToWidth(rawLine, innerWidth, "…") : rawLine;
		const pad = " ".repeat(Math.max(0, innerWidth - measure.visibleWidth(line)));
		lines.push(`${frameStyle(border.vertical)}${lineStyle(`${line}${pad}`)}${frameStyle(border.vertical)}`);
	}
	lines.push(frameStyle(`${border.bottomLeft}${border.horizontal.repeat(innerWidth)}${border.bottomRight}`));
	return lines;
}
