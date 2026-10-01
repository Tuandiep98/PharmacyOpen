import type { CustomerPhase } from "@pharmacy/simulation";

/**
 * SVG vẽ phần tử sau nằm phía trên phần tử trước. Khách trong hàng chờ vì thế
 * phải xếp theo đường chân: người ngồi ghế (y nhỏ) ở sau, người đứng (y lớn)
 * ở trước. Khách tại quầy vẫn luôn nằm trên cùng; người đang rời đi ở dưới.
 */
export function customerSceneDepth(
  phase: CustomerPhase,
  footY: number,
): number {
  if (phase === "leaving") return -1_000;
  if (phase === "counter") return 1_000;
  return footY;
}
