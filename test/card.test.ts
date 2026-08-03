import { describe, expect, it } from "bun:test";
import { renderToTerminal } from "@danypops/pi-tui-harness";
import { visibleWidth } from "@earendil-works/pi-tui";
import { Card } from "../src/components/card.ts";

const measure = {
	visibleWidth,
	truncateToWidth: (text: string, maxWidth: number, ellipsis = "…") => {
		if (visibleWidth(text) <= maxWidth) return text;
		if (maxWidth <= ellipsis.length) return ellipsis.slice(0, maxWidth);
		return `${text.slice(0, maxWidth - ellipsis.length)}${ellipsis}`;
	},
};

const theme = {
	border: (text: string) => `[${text}]`,
	selectedBorder: (text: string) => `<${text}>`,
	content: (text: string) => `{${text}}`,
	selectedContent: (text: string) => `!${text}!`,
};

describe("Card", () => {
	it("renders title, content, and footer inside a full border", () => {
		const card = new Card({ title: "Package", content: ["name@1.0.0"], footer: ["installed"], theme, measure });
		expect(card.render(18)).toEqual([
			"[┌────────────────┐]",
			"[│]{Package         }[│]",
			"[│]{name@1.0.0      }[│]",
			"[│]{installed       }[│]",
			"[└────────────────┘]",
		]);
	});

	it("switches the complete card to selected border and content styles", () => {
		const card = new Card({ title: "Package", content: ["body"], selected: true, theme, measure });
		expect(card.render(14)).toEqual(["<┌────────────┐>", "<│>!Package     !<│>", "<│>!body        !<│>", "<└────────────┘>"]);
		card.setSelected(false);
		expect(card.render(14)[0]).toBe("[┌────────────┐]");
	});

	it("truncates every line and preserves the requested visible width", () => {
		const plain = (text: string) => text;
		const card = new Card({
			title: "an extremely long package title",
			content: ["also much too long"],
			theme: { border: plain, selectedBorder: plain, content: plain, selectedContent: plain },
			measure,
		});
		for (const line of card.render(12)) expect(visibleWidth(line)).toBe(12);
		expect(card.render(12).join("\n")).toContain("…");
	});

	it("styles closing border glyphs independently after content resets terminal styling", () => {
		const reset = (text: string) => `\u001b[31m${text}\u001b[0m`;
		const border = (text: string) => `\u001b[36m${text}\u001b[0m`;
		const card = new Card({ content: ["body"], theme: { ...theme, border, content: reset }, measure });
		const body = card.render(12)[1]!;
		expect(body).toEndWith(`${border("│")}`);
		expect(visibleWidth(body)).toBe(12);
	});

	it("renders selected border and body attributes in a real terminal", async () => {
		const ansiTheme = {
			border: (text: string) => `\u001b[36m${text}\u001b[0m`,
			selectedBorder: (text: string) => `\u001b[33m${text}\u001b[0m`,
			content: (text: string) => text,
			selectedContent: (text: string) => `\u001b[7m${text}\u001b[27m`,
		};
		const terminal = await renderToTerminal(new Card({ content: ["body"], selected: true, theme: ansiTheme, measure }).render(12));
		for (const [row, column] of [
			[0, 0],
			[0, 11],
			[1, 0],
			[1, 11],
			[2, 0],
			[2, 11],
		] as const) {
			expect(terminal.cellAt(row, column)?.fgPaletteIndex).toBe(3);
		}
		expect(terminal.cellAt(1, 1)?.inverse).toBe(true);
		expect(terminal.cellAt(1, 10)?.inverse).toBe(true);
		terminal.dispose();
	});
});
