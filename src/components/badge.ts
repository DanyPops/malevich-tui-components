/**
 * Adapted from @dpopsuev/alef-tui's Badge component (MIT, Mario Zechner) --
 * its `badge()` count-formatting helper (design/typography.js) is inlined
 * directly rather than pulling in Alef's design system.
 */
import type { Component } from "../component.js";

/** `0` -> "0", `1_500` -> "1.5k", `12_000` -> "12k", `2_000_000` -> "2.0M". */
export function formatBadgeCount(n: number): string {
	if (n === 0) return "0";
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

export interface BadgeOptions {
	label?: string;
	style?: (s: string) => string;
}

/** A single-line `label: count` indicator, with the count abbreviated for large values (1.5k, 2.0M). */
export class Badge implements Component {
	private value = 0;
	private readonly label: string;
	private readonly style: (s: string) => string;

	constructor(opts: BadgeOptions = {}) {
		this.label = opts.label ?? "";
		this.style = opts.style ?? ((s) => s);
	}

	setValue(n: number): void {
		this.value = n;
	}

	invalidate(): void {}

	render(_width: number): string[] {
		const formatted = formatBadgeCount(this.value);
		const text = this.label ? `${this.label}: ${formatted}` : formatted;
		return [this.style(text)];
	}
}
