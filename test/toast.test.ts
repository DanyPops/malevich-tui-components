import { describe, expect, it } from "bun:test";
import { Toast, type ToastScheduler } from "../src/components/toast.ts";

const THEME = { text: (s: string) => s, dim: (s: string) => s };

/** A fake scheduler that never fires on its own -- the test drives expiry explicitly via fire(). */
function fakeScheduler(): ToastScheduler & { fire(): void; cleared: boolean } {
	let pendingCallback: (() => void) | undefined;
	return {
		cleared: false,
		setTimeout(callback) {
			pendingCallback = callback;
			return "handle";
		},
		clearTimeout() {
			this.cleared = true;
			pendingCallback = undefined;
		},
		fire() {
			pendingCallback?.();
		},
	};
}

describe("Toast", () => {
	it("renders the message with a leading indent", () => {
		const toast = new Toast({ message: "Saved.", theme: THEME, scheduler: fakeScheduler() });
		expect(toast.render(80)).toEqual(["  Saved."]);
	});

	it("renders a wrapped Component's own output instead of a plain message", () => {
		const content = { render: () => ["custom"], invalidate: () => {} };
		const toast = new Toast({ content, theme: THEME, scheduler: fakeScheduler() });
		expect(toast.render(80)).toEqual(["custom"]);
	});

	it("truncates a message longer than the available width", () => {
		const toast = new Toast({ message: "x".repeat(100), theme: THEME, scheduler: fakeScheduler() });
		expect(toast.render(20)[0]).toContain("…");
	});

	it("expires (renders nothing) once the scheduled timer fires", () => {
		const scheduler = fakeScheduler();
		const toast = new Toast({ message: "hi", theme: THEME, scheduler });
		expect(toast.isExpired).toBe(false);
		scheduler.fire();
		expect(toast.isExpired).toBe(true);
		expect(toast.render(80)).toEqual([]);
	});

	it("calls onExpire when the timer fires", () => {
		const scheduler = fakeScheduler();
		let expired = false;
		const _toast = new Toast({
			message: "hi",
			theme: THEME,
			scheduler,
			onExpire: () => {
				expired = true;
			},
		});
		scheduler.fire();
		expect(expired).toBe(true);
	});

	it("dismiss() clears the pending timer and marks expired immediately", () => {
		const scheduler = fakeScheduler();
		const toast = new Toast({ message: "hi", theme: THEME, scheduler });
		toast.dismiss();
		expect(toast.isExpired).toBe(true);
		expect(scheduler.cleared).toBe(true);
	});

	it("never schedules a timer when durationMs is 0 or negative -- never auto-expires", () => {
		let scheduled = false;
		const scheduler: ToastScheduler = {
			setTimeout: () => {
				scheduled = true;
				return undefined;
			},
			clearTimeout: () => {},
		};
		new Toast({ message: "hi", theme: THEME, scheduler, durationMs: -1 });
		expect(scheduled).toBe(false);
	});

	it("invalidate() forwards to a wrapped content Component", () => {
		let invalidated = false;
		const content = {
			render: () => [],
			invalidate: () => {
				invalidated = true;
			},
		};
		const toast = new Toast({ content, theme: THEME, scheduler: fakeScheduler() });
		toast.invalidate();
		expect(invalidated).toBe(true);
	});
});
