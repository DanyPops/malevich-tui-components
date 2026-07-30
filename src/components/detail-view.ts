/**
 * Extracted from @danypops/pi-tickets' IssueDetailComponent -- the pure
 * line-building half of "show one record's full fields, a free-text body,
 * and a thread of dated sub-items" (a ticket's fields/description/comments;
 * equally a Task's fields/body/history, or a CI run's fields/log/stages).
 *
 * Deliberately NOT a stateful scroll-owning Component, matching Board's own
 * division of labor: dynamic terminal-row-aware scroll windowing needs a
 * host's own TUI/terminal reference (see pi-tickets' IssueDetailComponent,
 * which wraps this in its own border/footer/scroll-offset chrome) -- a
 * plain, host-agnostic function can't own that any more than Board owns
 * KanbanBoardComponent's own scroll window.
 */
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface DetailField {
	label: string;
	value: string;
}

export interface DetailSectionItem {
	/** e.g. "author · timestamp" -- omitted entirely when not given. */
	byline?: string;
	body: string;
}

export interface DetailSection {
	/** e.g. "Description:" or "Comments (3):". Omitted entirely when not given (the section still renders its body/items, just without a heading line). */
	heading?: string;
	/** Free-text body for a body-only section (e.g. a description). Mutually usable alongside `items` (heading, then body, then items) though most callers use one or the other. */
	body?: string;
	/** A dated/attributed thread (e.g. comments, history entries) -- each item gets its own leading blank line, optional byline, then wrapped body. */
	items?: DetailSectionItem[];
}

export interface DetailViewTheme {
	/** Field label:value lines. */
	field: (s: string) => string;
	/** Section heading lines ("Description:", "Comments (3):"). */
	heading: (s: string) => string;
	/** A thread item's byline (author/timestamp). */
	byline: (s: string) => string;
	/** Plain body text (a description's or thread item's own content). */
	body: (s: string) => string;
}

export interface BuildDetailLinesOptions {
	fields?: DetailField[];
	sections?: DetailSection[];
	theme: DetailViewTheme;
	measure?: TextMeasure;
}

/**
 * Builds wrapped, styled lines for a field+section detail body at a given
 * width -- the exact structure IssueDetailComponent's own buildLines had
 * (fields with no blank line between them; a blank line before every
 * section heading; a blank line between a section's heading and its body;
 * a blank line before each thread item). Callers omit empty fields/sections
 * themselves -- this function renders exactly what it's given, no
 * emptiness filtering (a field with no value, or a section with nothing to
 * show, simply isn't included in the input arrays).
 */
export function buildDetailLines(width: number, options: BuildDetailLinesOptions): string[] {
	const measure = options.measure ?? asciiTextMeasure;
	const { theme } = options;
	const wrapWith = (text: string, style: (s: string) => string): string[] =>
		(text.length === 0 ? [""] : (measure.wrapTextWithAnsi ?? asciiTextMeasure.wrapTextWithAnsi)!(style(text), width));

	const lines: string[] = [];
	for (const field of options.fields ?? []) {
		lines.push(...wrapWith(`${field.label}: ${field.value}`, theme.field));
	}
	for (const section of options.sections ?? []) {
		lines.push("");
		if (section.heading !== undefined) lines.push(...wrapWith(section.heading, theme.heading));
		if (section.body !== undefined) {
			lines.push("");
			lines.push(...wrapWith(section.body, theme.body));
		}
		for (const item of section.items ?? []) {
			lines.push("");
			if (item.byline !== undefined) lines.push(...wrapWith(item.byline, theme.byline));
			lines.push(...wrapWith(item.body, theme.body));
		}
	}
	return lines;
}
