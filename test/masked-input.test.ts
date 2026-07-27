import { describe, expect, it } from "bun:test";
import { MaskedInput } from "../src/components/masked-input.ts";

function type(target: { handleInput(data: string): void }, text: string): void {
	for (const ch of text) target.handleInput(ch);
}

describe("MaskedInput", () => {
	it("tracks the real value but never renders it -- only mask glyphs, one per character", () => {
		const input = new MaskedInput();
		type(input, "sk-secret");
		expect(input.getValue()).toBe("sk-secret");
		const rendered = input.render(80)[0] ?? "";
		expect(rendered).not.toContain("sk-secret");
		expect(rendered).toBe("•".repeat("sk-secret".length));
	});

	it("backspace removes the last character from the real value and shortens the mask", () => {
		const input = new MaskedInput();
		type(input, "abc");
		input.handleInput("\x7f");
		expect(input.getValue()).toBe("ab");
		expect(input.render(80)[0]).toBe("••");
	});

	it("ignores escape sequences (e.g. arrow keys) instead of inserting them as characters", () => {
		const input = new MaskedInput();
		input.handleInput("\x1b[D");
		expect(input.getValue()).toBe("");
	});

	it("accepts a bracketed-paste sequence as one chunk", () => {
		const input = new MaskedInput();
		input.handleInput("\x1b[200~sk-pasted-secret-value\x1b[201~");
		expect(input.getValue()).toBe("sk-pasted-secret-value");
	});

	it("buffers a bracketed paste split across multiple handleInput calls", () => {
		const input = new MaskedInput();
		input.handleInput("\x1b[200~sk-pas");
		input.handleInput("ted-secre");
		input.handleInput("t-value\x1b[201~");
		expect(input.getValue()).toBe("sk-pasted-secret-value");
	});

	it("strips a trailing newline from a pasted value", () => {
		const input = new MaskedInput();
		input.handleInput("\x1b[200~sk-secret\n\x1b[201~");
		expect(input.getValue()).toBe("sk-secret");
	});

	it("processes input typed immediately after a paste ends in the same chunk", () => {
		const input = new MaskedInput();
		input.handleInput("\x1b[200~pasted\x1b[201~typed");
		expect(input.getValue()).toBe("pastedtyped");
	});

	it("uses a custom mask character when provided", () => {
		const input = new MaskedInput({ maskChar: "*" });
		type(input, "ab");
		expect(input.render(80)[0]).toBe("**");
	});

	it("uses a custom KeyMatcher when provided instead of the legacy default", () => {
		const input = new MaskedInput({ matchesKey: (data, keyId) => keyId === "backspace" && data === "CUSTOM_BS" });
		type(input, "ab");
		input.handleInput("CUSTOM_BS");
		expect(input.getValue()).toBe("a");
	});

	it("implements the Component interface (render + invalidate)", () => {
		const input = new MaskedInput();
		expect(typeof input.render).toBe("function");
		expect(() => input.invalidate()).not.toThrow();
	});
});
