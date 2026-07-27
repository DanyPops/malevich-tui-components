/**
 * Generalized from @danypops/enigma's MaskedInput (extension/src/
 * apikey-form.ts). Renders only mask glyphs so a typed/pasted secret
 * never reaches the visible transcript; includes bracketed-paste
 * handling so a terminal paste isn't silently dropped.
 */
import type { Component } from "../component.js";
import { legacyKeyMatcher, type KeyMatcher } from "../key-matcher.js";

const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";

export interface MaskedInputOptions {
	matchesKey?: KeyMatcher;
	/** Glyph rendered once per real character. Default "•". */
	maskChar?: string;
}

/**
 * Single-line input that tracks a real value but renders only mask
 * glyphs -- the real characters never appear in render() output, so a
 * typed or pasted secret never reaches a transcript or terminal
 * scrollback. Deliberately does not implement Focusable/IME cursor
 * positioning, matching how password-style fields in ordinary software
 * skip IME preview for the same privacy reason.
 */
export class MaskedInput implements Component {
	private value = "";
	private readonly matchesKey: KeyMatcher;
	private readonly maskChar: string;
	// Bracketed-paste buffering -- without this, a terminal paste (Ctrl+V/
	// Ctrl+Shift+V, most Linux terminals) arrives wrapped in PASTE_START/
	// PASTE_END and starts with \x1b, so the plain escape-sequence filter
	// below would otherwise silently drop the whole paste.
	private pasteBuffer = "";
	private isInPaste = false;

	constructor(opts: MaskedInputOptions = {}) {
		this.matchesKey = opts.matchesKey ?? legacyKeyMatcher;
		this.maskChar = opts.maskChar ?? "•";
	}

	getValue(): string {
		return this.value;
	}

	handleInput(data: string): void {
		if (data.includes(PASTE_START)) {
			this.isInPaste = true;
			this.pasteBuffer = "";
			data = data.replace(PASTE_START, "");
		}
		if (this.isInPaste) {
			this.pasteBuffer += data;
			const endIndex = this.pasteBuffer.indexOf(PASTE_END);
			if (endIndex !== -1) {
				const pasted = this.pasteBuffer.slice(0, endIndex).replace(/\r\n/g, "").replace(/\r/g, "").replace(/\n/g, "");
				this.value += pasted;
				this.isInPaste = false;
				const remaining = this.pasteBuffer.slice(endIndex + PASTE_END.length);
				this.pasteBuffer = "";
				if (remaining) this.handleInput(remaining);
			}
			return;
		}
		if (this.matchesKey(data, "backspace")) {
			this.value = this.value.slice(0, -1);
			return;
		}
		// Printable characters only; control/escape sequences (arrows, function
		// keys, ...) are not masked-in -- there is nothing meaningful to insert.
		if (data.length >= 1 && !data.startsWith("\x1b") && data.charCodeAt(0) >= 32) {
			this.value += data;
		}
	}

	render(width: number): string[] {
		const masked = this.maskChar.repeat(this.value.length);
		return [masked.length > width ? masked.slice(masked.length - width) : masked];
	}

	invalidate(): void {}
}
