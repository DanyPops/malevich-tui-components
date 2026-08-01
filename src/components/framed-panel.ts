/**
 * The rule+title+content+rule scaffold shared by Dialog, Menu, and
 * BorderedSelectPanel, previously hand-rolled once per component with a
 * slightly different line order in each. A pure Element -- callers pass
 * already-styled/measured lines, this only owns assembly.
 */
export interface FramedPanelOptions {
	width: number;
	/** The character repeated to draw the top/bottom rule, e.g. glyphs.line.thin or a literal "─".
	 * Omit entirely (along with ruleStyle) to skip both rules -- for a panel already nested inside
	 * another framed container, where its own rule would just double up on that container's border. */
	rule?: string;
	ruleStyle?: (s: string) => string;
	/** Rendered directly under the top rule, before contentLines. */
	titleLines?: string[];
	contentLines: string[];
	/** Rendered directly above the bottom rule, after contentLines. */
	footerLines?: string[];
}

export function renderFramedPanel(opts: FramedPanelOptions): string[] {
	const rule = opts.rule !== undefined ? (opts.ruleStyle ?? ((s: string) => s))(opts.rule.repeat(Math.max(1, opts.width))) : undefined;
	const lines: string[] = [];
	if (rule !== undefined) lines.push(rule);
	if (opts.titleLines) lines.push(...opts.titleLines);
	lines.push(...opts.contentLines);
	if (opts.footerLines) lines.push(...opts.footerLines);
	if (rule !== undefined) lines.push(rule);
	return lines;
}
