/**
 * Structurally identical to `@earendil-works/pi-tui`'s and
 * `@dpopsuev/alef-tui`'s own `Component` interface (one is a fork of the
 * other) -- defined here so Malevich depends on neither package directly.
 */
export interface Component {
	/** Render the component to lines for the given viewport width. Each returned line must not exceed `width`. */
	render(width: number): string[];
	/** Optional handler for keyboard input when the component has focus. */
	handleInput?(data: string): void;
	/** If true, the component receives key-release events (Kitty protocol). Default false. */
	wantsKeyRelease?: boolean;
	/** Clears any cached render state. Called by the host on theme changes. */
	invalidate(): void;
}

/**
 * Components that can receive focus and display a hardware cursor. Same
 * shape as both host libraries' own `Focusable` interface.
 */
export interface Focusable {
	/** Set by the host TUI when focus changes. */
	focused: boolean;
}
