/**
 * A component that draws rule/tree connector characters takes this as an
 * injected port rather than hardcoding Unicode box-drawing -- so a host or
 * its user can swap in a plain-ASCII set for terminals/fonts that render
 * box-drawing characters poorly. `unicodeGlyphs` is the default every
 * component falls back to when none is given, matching this library's
 * previous (pre-port) hardcoded characters exactly, so existing rendering
 * is unaffected until a host opts into `asciiGlyphs` or its own set.
 */
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

export const unicodeGlyphs: GlyphSet = {
	line: { thin: "─", thick: "━", dotted: "┄", dashed: "╌" },
	tree: { branch: "├── ", last: "└── ", pipe: "│   ", space: "    " },
};

export const asciiGlyphs: GlyphSet = {
	line: { thin: "-", thick: "=", dotted: ".", dashed: "-" },
	tree: { branch: "|-- ", last: "`-- ", pipe: "|   ", space: "    " },
};
