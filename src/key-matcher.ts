/**
 * A component that needs to recognize a named key (not just a literal
 * character) takes this as an injected port rather than importing a
 * concrete implementation. Both `@earendil-works/pi-tui` and
 * `@dpopsuev/alef-tui` already export a correct `matchesKey(data, keyId)`
 * covering legacy terminal sequences and the Kitty keyboard protocol -- a
 * host wires its own straight through. `legacyKeyMatcher` below recognizes
 * only the small set of common legacy (non-Kitty) sequences Malevich's own
 * components actually need.
 */
export type KeyMatcher = (data: string, keyId: string) => boolean;

const LEGACY_SEQUENCES: Record<string, string[]> = {
	up: ["\x1b[A"],
	down: ["\x1b[B"],
	left: ["\x1b[D"],
	right: ["\x1b[C"],
	enter: ["\r", "\n"],
	escape: ["\x1b"],
	tab: ["\t"],
	"shift+tab": ["\x1b[Z"],
	backspace: ["\x7f", "\b"],
};

/**
 * Recognizes common legacy terminal sequences only -- no Kitty keyboard
 * protocol support, no modifier combinations. Good enough for the small,
 * fixed set of navigation keys Malevich's own components check for; a host
 * with real Kitty-protocol needs should pass its own matchesKey instead.
 */
export const legacyKeyMatcher: KeyMatcher = (data, keyId) => {
	const sequences = LEGACY_SEQUENCES[keyId];
	return sequences?.includes(data) ?? false;
};
