import { describe, expect, it } from "vitest";
import {
  ARCHETYPES,
  ARCHETYPE_IDS,
  createSave,
  loadSave,
  PRODUCT_IDS,
  PRODUCTS,
  REQUESTS,
  SAVE_FORMAT,
  Simulation,
} from "../src";

describe("nội dung bước 7", () => {
  it("20 mặt hàng và 5 kiểu khách đều có yêu cầu có thể xuất hiện", () => {
    expect(PRODUCT_IDS).toHaveLength(20);
    expect(ARCHETYPE_IDS).toHaveLength(5);
    const activeRequests = new Set(
      ARCHETYPE_IDS.flatMap((id) =>
        Object.entries(ARCHETYPES[id].requestWeights)
          .filter(([, weight]) => (weight ?? 0) > 0)
          .map(([id]) => id),
      ),
    );
    for (const id of PRODUCT_IDS) {
      expect(REQUESTS[`named-${id}`]?.acceptable).toContain(id);
      expect(
        [...activeRequests].some((requestId) =>
          REQUESTS[requestId]?.acceptable.includes(id),
        ),
      ).toBe(true);
      expect(PRODUCTS[id].price).toBeGreaterThan(PRODUCTS[id].cost);
    }
  });

  it("save v3 giữ hàng cũ và mở danh mục mới mà không xoá tiến trình", () => {
    const original = Simulation.create(17);
    const raw = JSON.parse(
      JSON.stringify(createSave(original.snapshot, 100)),
    ) as {
      version: number;
      state: {
        version: number;
        stock: Record<string, unknown>;
        prices: Record<string, unknown>;
        money: number;
      };
    };
    const existing = new Set([
      "mask",
      "bandage",
      "sunscreen",
      "sanitizer",
      "lipbalm",
    ]);
    for (const id of PRODUCT_IDS)
      if (!existing.has(id)) {
        delete raw.state.stock[id];
        delete raw.state.prices[id];
      }
    raw.version = 3;
    raw.state.version = 3;
    raw.state.money = 123;
    const loaded = loadSave({ ...raw, format: SAVE_FORMAT });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state.money).toBe(123);
    expect(loaded.state.stock.mask).toEqual(original.snapshot.stock.mask);
    expect(loaded.state.stock.handcream.shelf).toBe(
      PRODUCTS.handcream.shelfCapacity,
    );
    expect(loaded.state.prices.handcream).toBe(PRODUCTS.handcream.price);
  });
});
