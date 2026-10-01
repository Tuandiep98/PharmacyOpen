import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("lets the portrait scene fill remaining height with a stable minimum", () => {
  const css = readFileSync(
    new URL("../src/ui/theme.css", import.meta.url),
    "utf8",
  );
  expect(css).toContain("flex: 1 1 0");
  expect(css).toContain("min-height: clamp(180px, 34dvh, 320px)");
});

it("stacks staff-alert actions by card width so names stay readable", () => {
  const css = readFileSync(
    new URL("../src/features/staff/staff.css", import.meta.url),
    "utf8",
  );
  expect(css).toContain("container-type: inline-size");
  expect(css).toContain("grid-column: 1 / -1");
  expect(css).toContain("@container (min-width: 520px)");
});

it("keeps Túi mù out of the three-item Mở rộng switcher", () => {
  const panel = readFileSync(
    new URL("../src/features/expansion/UpgradePanel.tsx", import.meta.url),
    "utf8",
  );
  const shortcuts = readFileSync(
    new URL("../src/features/store/SceneShortcuts.tsx", import.meta.url),
    "utf8",
  );
  expect(panel).not.toContain('id: "blindbag"');
  expect(shortcuts).toContain('label: "Túi mù"');
  expect(shortcuts.indexOf('label: "Túi mù"')).toBeGreaterThan(
    shortcuts.indexOf('label: "Bộ sưu tập"'),
  );
});

it("keeps recruit details mounted and reveals them inside the scroll area", () => {
  const panel = readFileSync(
    new URL("../src/features/staff/RecruitPanel.tsx", import.meta.url),
    "utf8",
  );
  expect(panel).toContain("hidden={!open}");
  expect(panel).toContain("scrollIntoView");
  expect(panel).toContain('block: "nearest"');
});

it("lets the portrait scene fill remaining height instead of leaving a blank tail", () => {
  const theme = readFileSync(
    new URL("../src/ui/theme.css", import.meta.url),
    "utf8",
  );
  const day = readFileSync(
    new URL("../src/features/day/day.css", import.meta.url),
    "utf8",
  );
  expect(theme).toContain("flex: 1 1 0");
  expect(theme).toContain("min-height: clamp(180px, 34dvh, 320px)");
  expect(theme).not.toContain("height: clamp(180px, 40dvh, 320px)");
  expect(day).toContain("--opening-panel-top: clamp(20px, 4dvh, 38px)");
});
