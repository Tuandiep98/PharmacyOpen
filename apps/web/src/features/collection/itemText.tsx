import {
  STAT_LABEL,
  type CollectibleItem,
  type CollectStat,
  type DeepReadonly,
  type SimState,
} from "@pharmacy/simulation";
import "./collection.css";

/*
 * Chữ dùng chung cho đồ sưu tầm (tên chỗ đặt, dòng hiệu ứng). Tách khỏi CollectionPanel để hộp thoại
 * tổng kết ngày và thông báo dùng được mà không kéo cả bảng Bộ sưu tập vào gói tải đầu.
 */

/** Vị trí đeo trên người, dùng chữ trung tính (cài áo, không gọi tên bộ phận cơ thể nhạy cảm). */
export const WEAR_LAYER_LABEL: Record<string, string> = { head: "đầu", eyes: "mắt", neck: "cổ", chest: "áo" };

/** Tên chỗ đặt dễ đọc. */
export function placeLabel(state: DeepReadonly<SimState>, place: string): string {
  if (place.startsWith("wear:")) {
    const [, workerId, layer] = place.split(":");
    const worker = state.workers[workerId!];
    return worker ? `${worker.name} · ${WEAR_LAYER_LABEL[layer ?? ""] ?? "đang đeo"}` : "Người đã nghỉ";
  }
  if (place.startsWith("counter-")) return `Quầy ${place.slice(8)}`;
  if (place === "shelf") return "Kệ hàng";
  if (place === "store-wall") return "Tường tiệm";
  return "Góc cửa";
}

/** Một dòng hiệu ứng: dấu +/− và mũi tên đi kèm chữ, không chỉ dựa vào màu. */
export function effectText(stat: CollectStat, value: number): string {
  const sign = value >= 0 ? "+" : "−";
  const abs = Math.abs(value);
  const amount =
    stat === "awareness"
      ? `${Math.round(abs * 10) / 10} điểm/ngày`
      : stat === "rating"
        ? `${Math.round(abs * 100)}% hài lòng`
        : `${Math.round(abs * 100)}%`;
  return `${value >= 0 ? "▲" : "▼"} ${STAT_LABEL[stat]} ${sign}${amount}`;
}

export function ItemEffects({
  item,
}: {
  item: DeepReadonly<CollectibleItem>;
}) {
  return (
    <ul className="item-effects">
      {item.effects.map((e) => (
        <li key={e.stat} className={e.value >= 0 ? "pos" : "neg"}>
          {effectText(e.stat, e.value)}
        </li>
      ))}
    </ul>
  );
}
