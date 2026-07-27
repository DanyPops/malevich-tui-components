/**
 * The one interface every Malevich component implements. Deliberately
 * defined here rather than imported from any host package: this shape is
 * structurally identical to `@earendil-works/pi-tui`'s and
 * `@dpopsuev/alef-tui`'s own `Component` interface (verified directly
 * against both sources -- same author, same license, one a fork of the
 * other), so a Malevich component satisfies either host's type system with
 * zero adapter code. TypeScript structural typing does the rest.
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
