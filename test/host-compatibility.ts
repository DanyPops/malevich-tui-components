/**
 * Compile-time contract, not a runtime test: proves a Malevich component
 * satisfies a real host TUI library's own `Component` type, rather than
 * merely asserting structural compatibility in a comment. Checked by
 * `bun x tsc --noEmit` (included in tsconfig.json) -- if this file fails to
 * compile, the compatibility claim is false and the build fails.
 *
 * @earendil-works/pi-tui is a devDependency purely for this file; Malevich
 * itself declares no dependency on it (or on @dpopsuev/alef-tui) at all.
 */
import type { Component as PiComponent } from "@earendil-works/pi-tui";
import { Badge, BorderedSelectPanel, Collapsible, CollapsibleText, Dialog, Envelope, Menu, NotificationQueue, ProgressBar, ScrollView, SeparatorLine, SplitPane, Table, Toast, TreeView } from "../src/index.ts";

const table = new Table({ columns: [{ header: "Engine", key: "engine" }], rows: [] });
const progressBar = new ProgressBar({ value: 0 });
const dialog = new Dialog({ title: "t", body: "b", actions: [], theme: { border: (s) => s, title: (s) => s, body: (s) => s, dim: (s) => s } });
const toast = new Toast({ message: "m", theme: { text: (s) => s, dim: (s) => s }, durationMs: -1 });
const notifications = new NotificationQueue();
const scrollView = new ScrollView(table);
const splitPane = new SplitPane(table, progressBar);
const collapsible = new Collapsible({ header: "h" });
const collapsibleText = new CollapsibleText({ text: "t" });
const treeView = new TreeView({ nodes: [] });
const menu = new Menu({ items: [], theme: { border: (s) => s, selected: (s) => s, normal: (s) => s, dim: (s) => s, title: (s) => s } });
const badge = new Badge();
const separatorLine = new SeparatorLine();
const envelope = new Envelope({ title: "t" });
const panel = new BorderedSelectPanel({ title: "t", list: table, theme: { border: (s) => s, title: (s) => s, help: (s) => s } });

// If a component's shape ever drifts from pi-tui's own Component interface,
// one of these assignments stops compiling -- the whole point of this file.
const componentsToCheck: PiComponent[] = [table, progressBar, dialog, toast, notifications, scrollView, splitPane, collapsible, collapsibleText, treeView, menu, badge, separatorLine, envelope, panel];
void componentsToCheck;
