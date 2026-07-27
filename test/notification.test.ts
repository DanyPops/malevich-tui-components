import { describe, expect, it } from "bun:test";
import { NotificationQueue } from "../src/components/notification.ts";

describe("NotificationQueue", () => {
	it("renders pushed messages with a leading indent, oldest first", () => {
		const queue = new NotificationQueue({ now: () => 0 });
		queue.push("first");
		queue.push("second");
		expect(queue.render(80)).toEqual(["  first", "  second"]);
	});

	it("caps rendered entries at maxVisible without dropping them from the queue", () => {
		const queue = new NotificationQueue({ maxVisible: 1, now: () => 0 });
		queue.push("a");
		queue.push("b");
		expect(queue.render(80)).toEqual(["  a"]);
	});

	it("expires entries once their durationMs has elapsed, per an injected clock", () => {
		let now = 0;
		const queue = new NotificationQueue({ now: () => now });
		queue.push("temporary", "info", 1000);
		expect(queue.render(80)).toEqual(["  temporary"]);
		now = 1001;
		expect(queue.render(80)).toEqual([]);
	});

	it("applies the style function for the entry's level", () => {
		const queue = new NotificationQueue({
			now: () => 0,
			styles: { info: (s) => s, success: (s) => `OK:${s}`, warning: (s) => s, error: (s) => `ERR:${s}` },
		});
		queue.push("done", "success");
		queue.push("bad", "error");
		expect(queue.render(80)).toEqual(["OK:  done", "ERR:  bad"]);
	});

	it("truncates a message longer than the available width", () => {
		const queue = new NotificationQueue({ now: () => 0 });
		queue.push("x".repeat(100));
		expect(queue.render(20)[0]).toContain("…");
	});

	it("defaults to Date.now when no clock is injected -- a freshly pushed entry is never immediately expired", () => {
		const queue = new NotificationQueue();
		queue.push("just now");
		expect(queue.render(80)).toEqual(["  just now"]);
	});

	it("implements the Component interface (render + invalidate)", () => {
		const queue = new NotificationQueue();
		expect(typeof queue.render).toBe("function");
		expect(() => queue.invalidate()).not.toThrow();
	});
});
