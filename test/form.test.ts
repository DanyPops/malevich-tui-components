import { describe, expect, it } from "bun:test";
import { Form } from "../src/components/form.ts";
import { MaskedInput } from "../src/components/masked-input.ts";

const THEME = { label: (s: string) => s, focusedLabel: (s: string) => s, help: (s: string) => s, error: (s: string) => s };

const TAB = "\t";
const SHIFT_TAB = "\x1b[Z";
const ENTER = "\r";
const ESCAPE = "\x1b";

function type(target: { handleInput(data: string): void }, text: string): void {
	for (const ch of text) target.handleInput(ch);
}

/** A minimal plain-text FormFieldInput, standing in for a host's real Input component. */
function textField() {
	let value = "";
	return {
		getValue: () => value,
		handleInput: (data: string) => { if (data.length === 1 && data.charCodeAt(0) >= 32) value += data; },
		render: () => [value],
	};
}

describe("Form", () => {
	it("starts focused on the first field and moves forward on Tab, backward on Shift+Tab", () => {
		const a = textField();
		const b = textField();
		const form = new Form({ theme: THEME, fields: [{ key: "a", label: "A", input: a }, { key: "b", label: "B", input: b }] });
		type(form, "1");
		form.handleInput(TAB);
		type(form, "2");
		form.handleInput(SHIFT_TAB);
		type(form, "3");
		expect(a.getValue()).toBe("13");
		expect(b.getValue()).toBe("2");
	});

	it("Enter on a non-last field advances focus instead of submitting", () => {
		let submitted = false;
		const form = new Form({
			theme: THEME,
			fields: [{ key: "a", label: "A", input: textField() }, { key: "b", label: "B", input: textField() }],
		});
		form.onSubmit = () => { submitted = true; };
		form.handleInput(ENTER);
		expect(submitted).toBe(false);
	});

	it("Enter on the last field submits with every field's value keyed by its config key", () => {
		const a = textField();
		const b = textField();
		type(a, "x");
		type(b, "y");
		const form = new Form({ theme: THEME, fields: [{ key: "first", label: "A", input: a }, { key: "second", label: "B", input: b }] });
		let result: unknown;
		form.onSubmit = (r) => { result = r; };
		form.handleInput(TAB);
		form.handleInput(ENTER);
		expect(result).toEqual({ first: "x", second: "y" });
	});

	it("refuses to submit while a required field is empty, without calling onSubmit", () => {
		let called = false;
		const form = new Form({ theme: THEME, fields: [{ key: "a", label: "A", input: textField() }] });
		form.onSubmit = () => { called = true; };
		form.handleInput(ENTER);
		expect(called).toBe(false);
		expect(form.render(80).join("\n")).toContain("required");
	});

	it("allows submission with an empty field marked required: false", () => {
		let result: unknown;
		const form = new Form({
			theme: THEME,
			fields: [{ key: "a", label: "A", input: textField(), required: false }],
		});
		form.onSubmit = (r) => { result = r; };
		form.handleInput(ENTER);
		expect(result).toEqual({ a: "" });
	});

	it("Escape invokes onCancel from any field, without calling onSubmit", () => {
		let submitted = false;
		let canceled = false;
		const form = new Form({ theme: THEME, fields: [{ key: "a", label: "A", input: textField() }] });
		form.onSubmit = () => { submitted = true; };
		form.onCancel = () => { canceled = true; };
		type(form, "x");
		form.handleInput(ESCAPE);
		expect(canceled).toBe(true);
		expect(submitted).toBe(false);
	});

	it("composes with MaskedInput -- the masked field's real value never appears in render() output", () => {
		const form = new Form({
			theme: THEME,
			fields: [{ key: "name", label: "Name", input: textField() }, { key: "secret", label: "Secret", input: new MaskedInput() }],
		});
		form.handleInput(TAB);
		type(form, "super-secret-value");
		expect(form.render(120).join("\n")).not.toContain("super-secret-value");
	});

	it("uses the default help text when none is given, or a custom one when provided", () => {
		const defaultForm = new Form({ theme: THEME, fields: [{ key: "a", label: "A", input: textField() }] });
		expect(defaultForm.render(120).join("\n")).toContain("shift+tab previous");

		const customForm = new Form({ theme: THEME, fields: [{ key: "a", label: "A", input: textField() }], helpText: "custom help" });
		expect(customForm.render(120).join("\n")).toContain("custom help");
	});

	it("uses a custom KeyMatcher when provided instead of the legacy default", () => {
		const a = textField();
		const b = textField();
		const form = new Form({
			theme: THEME,
			fields: [{ key: "a", label: "A", input: a }, { key: "b", label: "B", input: b }],
			matchesKey: (data, keyId) => keyId === "tab" && data === "CUSTOM_TAB",
		});
		form.handleInput("CUSTOM_TAB");
		type(form, "x");
		expect(b.getValue()).toBe("x");
	});

	it("implements the Component interface (render + invalidate)", () => {
		const form = new Form({ theme: THEME, fields: [{ key: "a", label: "A", input: textField() }] });
		expect(typeof form.render).toBe("function");
		expect(() => form.invalidate()).not.toThrow();
	});
});
