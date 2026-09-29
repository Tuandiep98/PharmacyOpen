import { describe, expect, it } from "vitest";
import { importSaveFile } from "../src/game/persistence";

describe("save import", () => {
  it("rejects oversized files before reading their contents", async () => {
    let read = false;
    const file = {
      size: 2 * 1024 * 1024 + 1,
      text: async () => {
        read = true;
        return "{}";
      },
    } as File;
    expect(await importSaveFile(file)).toEqual({
      ok: false,
      error: "file-too-large",
    });
    expect(read).toBe(false);
  });
});
