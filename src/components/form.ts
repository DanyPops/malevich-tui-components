/**
 * Generalized from @danypops/enigma's ApiKeyRegistrationForm (a fixed
 * 3-field form) into an N-field form keyed by a Record result. Owns no
 * text-input implementation -- a host passes its own Input (or
 * Malevich's MaskedInput) per field; this owns focus navigation,
 * validation, and layout only.
 */
import type { Component } from "../component.js";
import { type KeyMatcher, legacyKeyMatcher } from "../key-matcher.js";
import { asciiTextMeasure, type TextMeasure } from "../text-measure.js";

export interface FormFieldInput {
	getValue(): string;
	handleInput(data: string): void;
	render(width: number): string[];
}

export interface FormFieldConfig {
	/** Key this field's value is stored under in the onSubmit result. */
	key: string;
	label: string;
	input: FormFieldInput;
	/** Submission is refused while this field is empty (after trimming). Default true. */
	required?: boolean;
}

export interface FormTheme {
	label: (s: string) => string;
	focusedLabel: (s: string) => string;
	help: (s: string) => string;
	error: (s: string) => string;
}

export interface FormOptions {
	theme: FormTheme;
	fields: FormFieldConfig[];
	matchesKey?: KeyMatcher;
	measure?: TextMeasure;
	/** Defaults to a generic Tab/Enter/Escape hint. */
	helpText?: string;
}

const DEFAULT_HELP_TEXT = "tab/enter next field • shift+tab previous • enter on last field submits • esc cancel";

/**
 * Tab/Enter move to the next field (Enter on the last field submits);
 * Shift+Tab moves back; Escape cancels from anywhere. Submission is
 * refused, with an inline error message rather than a call to onSubmit,
 * while any required field is still empty -- the caller never sees a
 * half-filled result.
 */
export class Form implements Component {
	private readonly fields: FormFieldConfig[];
	private focusIndex = 0;
	private errorMessage: string | undefined;
	private readonly theme: FormTheme;
	private readonly matchesKey: KeyMatcher;
	private readonly measure: TextMeasure;
	private readonly helpText: string;

	onSubmit?: (result: Record<string, string>) => void;
	onCancel?: () => void;

	constructor(opts: FormOptions) {
		this.theme = opts.theme;
		this.fields = opts.fields;
		this.matchesKey = opts.matchesKey ?? legacyKeyMatcher;
		this.measure = opts.measure ?? asciiTextMeasure;
		this.helpText = opts.helpText ?? DEFAULT_HELP_TEXT;
	}

	handleInput(data: string): void {
		if (this.matchesKey(data, "escape")) {
			this.onCancel?.();
			return;
		}
		if (this.matchesKey(data, "shift+tab")) {
			this.focusIndex = Math.max(0, this.focusIndex - 1);
			return;
		}
		if (this.matchesKey(data, "tab") || this.matchesKey(data, "enter")) {
			if (this.focusIndex < this.fields.length - 1) {
				this.focusIndex++;
			} else {
				this.trySubmit();
			}
			return;
		}
		this.fields[this.focusIndex]?.input.handleInput(data);
	}

	private trySubmit(): void {
		const result: Record<string, string> = {};
		for (const field of this.fields) {
			const value = field.input.getValue().trim();
			if ((field.required ?? true) && !value) {
				this.errorMessage = "All required fields must be filled in.";
				return;
			}
			result[field.key] = value;
		}
		this.errorMessage = undefined;
		this.onSubmit?.(result);
	}

	render(width: number): string[] {
		const lines: string[] = [];
		this.fields.forEach((field, i) => {
			const marker = i === this.focusIndex ? "> " : "  ";
			const prefix = `${marker}${field.label}: `;
			const rendered = field.input.render(Math.max(1, width - this.measure.visibleWidth(prefix)))[0] ?? "";
			const styled = i === this.focusIndex ? this.theme.focusedLabel(prefix) : this.theme.label(prefix);
			lines.push(`${styled}${rendered}`);
		});
		if (this.errorMessage) lines.push(this.theme.error(this.errorMessage));
		lines.push(this.theme.help(this.helpText));
		return lines;
	}

	invalidate(): void {}
}
