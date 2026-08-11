/**
 * Pure formatting for a persistent context widget's own header line -- e.g. Pi's "Tasks",
 * "Notes", and "Jobs" widgets, each projected onto the same "above the editor" TUI slot by a
 * different backend (one Vehicle per widget). A bare "Tasks · pipes" header names *what* is
 * being shown but never *which* backend owns it -- indistinguishable from any other extension's
 * own widget once more than one is registered above the editor at once.
 *
 * Centralizing the "Owner · Label[ · detail...]" join here -- rather than each backend's own
 * pi-* extension hand-rolling its own template literal -- keeps every widget's header visually
 * consistent and gives the convention exactly one place to change. See
 * @danypops/vehicle-client-pi's vehicleWidgetTitle for the Vehicle-specific wrapper that resolves
 * `owner` from a Vehicle's own manifest identity before calling this.
 */
export function formatWidgetHeader(owner: string, label: string, ...detail: readonly string[]): string {
	return [owner, label, ...detail].filter((part) => part.length > 0).join(" · ");
}
