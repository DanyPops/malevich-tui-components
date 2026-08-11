/**
 * A small single-line semantic/state indicator -- distinct from `Badge`, which is
 * specifically a `label: count` indicator with numeric abbreviation. `Chip` carries no
 * numeric value, just a styled label (optionally iconed, optionally wrapped), the
 * generic shape multiple hosts had been hand-rolling independently and inconsistently
 * for status/state text (`[In Progress]`, `✓ approved`, bare `clean`, `‹label›`).
 */
import type { Component } from "../component.js";

export type ChipShape = "bracket" | "chevron" | "plain";

export interface ChipFormatOptions {
	/** Prefixed to the label with a single space, e.g. an icon glyph (`✓`, `✗`, `•`). */
	icon?: string;
	/** Defaults to `"bracket"`: `[label]`. `"chevron"`: `‹label›`. `"plain"`: no wrapping at all. */
	shape?: ChipShape;
	style?: (s: string) => string;
}

/**
 * Wraps `label` per `shape` (defaults to `"bracket"`) and prefixes `icon` when given,
 * all inside `style`. Pure formatting, no rendering context needed -- usable directly
 * inline in a larger hand-built line of text, not only through the `Chip` Component
 * below.
 */
export function formatChip(label: string, opts: ChipFormatOptions = {}): string {
	const body = opts.icon ? `${opts.icon} ${label}` : label;
	const shape = opts.shape ?? "bracket";
	const wrapped = shape === "bracket" ? `[${body}]` : shape === "chevron" ? `\u2039${body}\u203a` : body;
	const style = opts.style ?? ((s: string) => s);
	return style(wrapped);
}

export interface ChipOptions extends ChipFormatOptions {
	label?: string;
}

/** A single-line semantic chip as a standalone Component, for a caller that wants one embedded in a Component tree rather than inlined by hand into an existing line of text. */
export class Chip implements Component {
	private label: string;
	private readonly opts: ChipFormatOptions;

	constructor(opts: ChipOptions = {}) {
		const { label, ...rest } = opts;
		this.label = label ?? "";
		this.opts = rest;
	}

	setLabel(label: string): void {
		this.label = label;
	}

	invalidate(): void {}

	render(_width: number): string[] {
		return [formatChip(this.label, this.opts)];
	}
}
