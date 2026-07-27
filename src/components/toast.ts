/**
 * Adapted from @dpopsuev/alef-tui's Toast component (MIT, Mario Zechner) --
 * same auto-dismiss logic, with the direct `truncateToWidth` import
 * replaced by an injected TextMeasure port, and the raw setTimeout/
 * clearTimeout calls replaced by an injected scheduler so tests never wait
 * on a real timer.
 */
import type { Component } from "../component.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface ToastTheme {
	text: (s: string) => string;
	dim: (s: string) => string;
}

export interface ToastScheduler {
	setTimeout(callback: () => void, ms: number): unknown;
	clearTimeout(handle: unknown): void;
}

const realScheduler: ToastScheduler = {
	setTimeout: (callback, ms) => setTimeout(callback, ms),
	clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export interface ToastOptions {
	message?: string;
	content?: Component;
	/** Milliseconds until auto-dismiss. 0 (or omitted default of 3000) still applies -- pass a negative value to disable auto-dismiss entirely. */
	durationMs?: number;
	theme: ToastTheme;
	onExpire?: () => void;
	measure?: TextMeasure;
	/** Defaults to the real setTimeout/clearTimeout. Inject a fake for deterministic tests. */
	scheduler?: ToastScheduler;
}

/** A single auto-dismissing message (or wrapped Component) toast. */
export class Toast implements Component {
	private message: string | undefined;
	private content: Component | undefined;
	private expired = false;
	private timer: unknown;
	private readonly theme: ToastTheme;
	private readonly measure: TextMeasure;
	private readonly scheduler: ToastScheduler;

	constructor(opts: ToastOptions) {
		this.message = opts.message;
		this.content = opts.content;
		this.theme = opts.theme;
		this.measure = opts.measure ?? asciiTextMeasure;
		this.scheduler = opts.scheduler ?? realScheduler;
		const duration = opts.durationMs ?? 3000;
		if (duration > 0) {
			this.timer = this.scheduler.setTimeout(() => {
				this.expired = true;
				opts.onExpire?.();
			}, duration);
		}
	}

	get isExpired(): boolean {
		return this.expired;
	}

	dismiss(): void {
		if (this.timer !== undefined) this.scheduler.clearTimeout(this.timer);
		this.expired = true;
	}

	invalidate(): void {
		this.content?.invalidate();
	}

	render(width: number): string[] {
		if (this.expired) return [];
		if (this.content) return this.content.render(width);
		return [this.theme.text(this.measure.truncateToWidth(`  ${this.message ?? ""}`, width, "…"))];
	}
}
