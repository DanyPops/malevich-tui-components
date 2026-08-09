/** Characters used to draw one rectangular frame. */
export interface BoxGlyphs {
	horizontal: string;
	vertical: string;
	topLeft: string;
	topRight: string;
	bottomLeft: string;
	bottomRight: string;
}

/** Characters used to paint a determinate progress track. */
export interface ProgressGlyphs {
	filled: string;
	empty: string;
	/** Increasing fractions of one cell, excluding empty and fully filled. */
	partial?: readonly string[];
	left?: string;
	right?: string;
}

export type ProgressGlyphStyle = "shade" | "smooth" | "blocks" | "ascii";

/** Selectable progress-track policies, independent of progress geometry. */
export const progressGlyphStyles: Record<ProgressGlyphStyle, ProgressGlyphs> = {
	shade: { filled: "█", empty: "░" },
	smooth: { filled: "█", empty: " ", partial: ["▏", "▎", "▍", "▌", "▋", "▊", "▉"], left: "|", right: "|" },
	blocks: { filled: "■", empty: " ", left: "|", right: "|" },
	ascii: { filled: "#", empty: "-", left: "[", right: "]" },
};

/** Legacy-compatible subset used by line- and tree-only components. */
export interface GlyphSet {
	line: {
		thin: string;
		thick: string;
		dotted: string;
		dashed: string;
	};
	tree: {
		branch: string;
		last: string;
		pipe: string;
		space: string;
	};
}

/**
 * Complete renderer-owned terminal-character policy. Layout and state
 * algorithms consume semantic fields from this port instead of choosing
 * Unicode themselves. GlyphSet remains the backward-compatible line/tree
 * subset accepted by components that need only those categories.
 */
export interface GlyphTheme extends GlyphSet {
	box: {
		rounded: BoxGlyphs;
		light: BoxGlyphs;
		heavy: BoxGlyphs;
	};
	progress: ProgressGlyphs;
	scrollbar: {
		thumb: string;
		track: string;
	};
	chart: {
		partial: readonly string[];
		vertical: string;
		horizontal: string;
		bottomLeft: string;
		threshold: string;
		bullet: string;
	};
	spinner: {
		frames: readonly string[];
	};
	indicator: {
		collapsed: string;
		expanded: string;
		cursor: string;
		checked: string;
		unchecked: string;
		mask: string;
		gutter: string;
	};
}

const unicodeLightBox: BoxGlyphs = {
	horizontal: "─",
	vertical: "│",
	topLeft: "┌",
	topRight: "┐",
	bottomLeft: "└",
	bottomRight: "┘",
};

const asciiBox: BoxGlyphs = {
	horizontal: "-",
	vertical: "|",
	topLeft: "+",
	topRight: "+",
	bottomLeft: "+",
	bottomRight: "+",
};

export const unicodeGlyphs: GlyphTheme = {
	line: { thin: "─", thick: "━", dotted: "┄", dashed: "╌" },
	box: {
		rounded: { horizontal: "─", vertical: "│", topLeft: "╭", topRight: "╮", bottomLeft: "╰", bottomRight: "╯" },
		light: unicodeLightBox,
		heavy: { horizontal: "━", vertical: "┃", topLeft: "┏", topRight: "┓", bottomLeft: "┗", bottomRight: "┛" },
	},
	tree: { branch: "├── ", last: "└── ", pipe: "│   ", space: "    " },
	progress: progressGlyphStyles.shade,
	scrollbar: { thumb: "█", track: "░" },
	chart: {
		partial: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"],
		vertical: "│",
		horizontal: "─",
		bottomLeft: "└",
		threshold: "┄",
		bullet: "■",
	},
	spinner: { frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] },
	indicator: { collapsed: "▸", expanded: "▾", cursor: "→", checked: "✓", unchecked: " ", mask: "•", gutter: "▌" },
};

export const asciiGlyphs: GlyphTheme = {
	line: { thin: "-", thick: "=", dotted: ".", dashed: "-" },
	box: { rounded: asciiBox, light: asciiBox, heavy: asciiBox },
	tree: { branch: "|-- ", last: "`-- ", pipe: "|   ", space: "    " },
	progress: progressGlyphStyles.ascii,
	scrollbar: { thumb: "#", track: "." },
	chart: { partial: ["#"], vertical: "|", horizontal: "-", bottomLeft: "+", threshold: ".", bullet: "*" },
	spinner: { frames: ["|", "/", "-", "\\"] },
	indicator: { collapsed: ">", expanded: "v", cursor: ">", checked: "x", unchecked: " ", mask: "*", gutter: "|" },
};
