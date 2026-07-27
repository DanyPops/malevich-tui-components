/**
 * Adapted from @dpopsuev/alef-tui's NotificationQueue component (MIT,
 * Mario Zechner) -- same logic, with the direct `truncateToWidth` import
 * replaced by an injected TextMeasure port, and Date.now() replaced by an
 * injected clock so expiry is deterministic in tests.
 */
import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface NotificationEntry {
	message: string;
	level: "info" | "success" | "warning" | "error";
	expiresAt: number;
}

export interface NotificationOptions {
	maxVisible?: number;
	styles?: Record<NotificationEntry["level"], (s: string) => string>;
	measure?: TextMeasure;
	/** Defaults to Date.now. Inject a fake clock for deterministic tests. */
	now?: () => number;
}

/** A capped, auto-expiring queue of leveled notifications, newest-pushed-last, oldest-expired-first. Rendering itself is what evicts expired entries -- there is no separate timer. */
export class NotificationQueue implements Component {
	private queue: NotificationEntry[] = [];
	private readonly maxVisible: number;
	private readonly styles: Record<NotificationEntry["level"], (s: string) => string>;
	private readonly measure: TextMeasure;
	private readonly now: () => number;

	constructor(opts: NotificationOptions = {}) {
		this.maxVisible = opts.maxVisible ?? 3;
		this.styles = opts.styles ?? {
			info: (s) => s,
			success: (s) => s,
			warning: (s) => s,
			error: (s) => s,
		};
		this.measure = opts.measure ?? asciiTextMeasure;
		this.now = opts.now ?? Date.now;
	}

	push(message: string, level: NotificationEntry["level"] = "info", durationMs = 5000): void {
		this.queue.push({ message, level, expiresAt: this.now() + durationMs });
	}

	invalidate(): void {}

	render(width: number): string[] {
		const now = this.now();
		this.queue = this.queue.filter((n) => n.expiresAt > now);
		return this.queue.slice(0, this.maxVisible).map((n) => {
			const text = this.measure.truncateToWidth(`  ${n.message}`, width, "…");
			return this.styles[n.level](text);
		});
	}
}
