import { existsSync } from "node:fs";
import { join } from "node:path";
import { COLLECTIBLE_IDS, COLLECTIBLES, GRADE_POWER, type Grade } from "@pharmacy/simulation";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import manifest from "../../../assets/collectibles/manifest.json";
import { CollectibleArt } from "../src/art/Collectibles";

const ROOT = join(import.meta.dirname, "../../..");
const grades: Grade[] = ["C", "B", "A", "S"];

describe("bộ hình sưu tập", () => {
  it("manifest có đủ 18 ID và file nguồn", () => {
    expect(Object.keys(manifest.items).sort()).toEqual([...COLLECTIBLE_IDS].sort());
    for (const entry of Object.values(manifest.items)) {
      expect(existsSync(join(ROOT, entry.sourcePath))).toBe(true);
      expect(Object.keys(entry.grades).sort()).toEqual([...grades].sort());
    }
  });

  it("mỗi món vẽ được và có bốn biến thể hình khác nhau", () => {
    for (const id of COLLECTIBLE_IDS) {
      const def = COLLECTIBLES[id]!;
      const pictures = grades.map((grade) => {
        const power = GRADE_POWER[grade];
        const effects = def.effects.map(({ stat, base }) => ({ stat, value: base * (base >= 0 ? power.good : power.bad) }));
        return renderToStaticMarkup(createElement("svg", null, createElement(CollectibleArt, { defId: id, grade, effects })))
          .replace(/ class="[^"]*"/g, "");
      });
      for (const picture of pictures) expect(picture).toMatch(/<(path|circle|ellipse|rect)\b/);
      expect(new Set(pictures).size, id).toBe(4);
    }
  });
});
