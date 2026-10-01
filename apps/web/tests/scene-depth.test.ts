import { describe, expect, it } from "vitest";
import { customerSceneDepth } from "../src/features/store/sceneDepth";

describe("thứ tự lớp khách trong cảnh", () => {
  it("vẽ khách ngồi ghế sau khách đứng xếp hàng", () => {
    const seated = customerSceneDepth("queue", 354);
    const standing = customerSceneDepth("queue", 394);
    expect(seated).toBeLessThan(standing);
  });

  it("giữ khách ở quầy trên cùng và khách rời đi dưới cùng", () => {
    expect(customerSceneDepth("counter", 360)).toBeGreaterThan(
      customerSceneDepth("queue", 394),
    );
    expect(customerSceneDepth("leaving", 470)).toBeLessThan(
      customerSceneDepth("queue", 354),
    );
  });
});
