/**
 * The rule+title+content+rule scaffold shared by Dialog, Menu, and
 * BorderedSelectPanel, previously hand-rolled once per component with a
 * slightly different line order in each. A pure Element -- callers pass
 * already-styled/measured lines, this only owns assembly.
 */
export interface FramedPanelOptions {
	width: number;
	/** The character repeated to draw the top/bottom rule, e.g. glyphs.line.thin or a literal "─". */
	rule: string;
	ruleStyle: (s: string) => string;
	/** Rendered directly under the top rule, before contentLines. */
	titleLines?: string[];
	contentLines: string[];
	/** Rendered directly above the bottom rule, after contentLines. */
	footerLines?: string[];
}

export function renderFramedPanel(opts: FramedPanelOptions): string[] {
	const rule = opts.ruleStyle(opts.rule.repeat(Math.max(1, opts.width)));
	const lines: string[] = [rule];
	if (opts.titleLines) lines.push(...opts.titleLines);
	lines.push(...opts.contentLines);
	if (opts.footerLines) lines.push(...opts.footerLines);
	lines.push(rule);
	return lines;
}
