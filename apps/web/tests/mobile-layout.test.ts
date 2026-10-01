import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps the portrait scene height stable when service chat content changes", () => {
  const css = readFileSync(
    new URL("../src/ui/theme.css", import.meta.url),
    "utf8",
  );
  expect(css).toContain("flex: 0 0 clamp(180px, 40dvh, 320px)");
  expect(css).toContain("height: clamp(180px, 40dvh, 320px)");
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
