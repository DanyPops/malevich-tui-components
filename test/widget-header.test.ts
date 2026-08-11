import { describe, expect, it } from "bun:test";
import { formatWidgetHeader } from "../src/widget-header.ts";

describe("formatWidgetHeader", () => {
	it("joins owner and label with the shared separator", () => {
		expect(formatWidgetHeader("Papyrus", "Notes")).toBe("Papyrus · Notes");
	});

	it("appends any further detail segments in order", () => {
		expect(formatWidgetHeader("Papyrus", "Tasks", "pipes")).toBe("Papyrus · Tasks · pipes");
		expect(formatWidgetHeader("Pipes", "Jobs", "1 subscribed")).toBe("Pipes · Jobs · 1 subscribed");
	});

	it("drops empty segments instead of leaving a dangling separator", () => {
		expect(formatWidgetHeader("Papyrus", "Tasks", "")).toBe("Papyrus · Tasks");
		expect(formatWidgetHeader("", "Tasks")).toBe("Tasks");
	});
});
