import { type GlyphTheme, unicodeGlyphs } from "../glyphs.js";

/**
 * A tiny, testable indeterminate-progress ticker for a surface with no
 * discrete step count (a single in-flight async call, unlike ProgressBar's
 * own known N-of-M position). tick() is the pure, synchronously-testable
 * core; start()/stop() wire it to a real interval for genuine on-screen
 * animation. Renders no chrome of its own -- a host embeds glyph() inline
 * wherever it needs a spinner (a table cell, a status line, a dialog).
 */
export interface SpinnerOptions {
	/** Animation frames. Defaults to the standard braille "dots" cycle. */
	frames?: readonly string[];
	glyphs?: GlyphTheme;
	/** Frame interval in milliseconds. Defaults to 80. */
	intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 80;

export class Spinner {
	private readonly frames: readonly string[];
	private readonly intervalMs: number;
	private index = 0;
	private timer: ReturnType<typeof setInterval> | undefined;

	constructor(opts: SpinnerOptions = {}) {
		this.frames = opts.frames ?? opts.glyphs?.spinner.frames ?? unicodeGlyphs.spinner.frames;
		this.intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
	}

	/** Current animation frame. */
	glyph(): string {
		return this.frames[this.index] ?? "";
	}

	/** Advances one frame. Pure and synchronous -- the deterministic unit under test; start() is just this wired to a real timer. */
	tick(): void {
		this.index = (this.index + 1) % this.frames.length;
	}

	/** Wires tick() to a real interval, calling onTick after each advance so a host can requestRender(). Idempotent -- calling start() again restarts cleanly rather than stacking a second interval. */
	start(onTick: () => void): void {
		this.stop();
		this.timer = setInterval(() => {
			this.tick();
			onTick();
		}, this.intervalMs);
	}

	/** Safe to call even if never started, or more than once. */
	stop(): void {
		if (this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}
}
