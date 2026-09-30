import type { CollectStat, CollectibleSlot, Grade } from "../types";

/**
 * Đồ sưu tầm rơi ra khi đạt mục tiêu ngày. Mỗi món có chỗ đặt (nhân vật đeo, quầy, kệ, trong tiệm) và
 * độ hợp với nhà thuốc: đồ hợp tiệm hay ra hạng cao và chỉ có lợi; đồ "lạc quẻ" hay ra hạng thấp và có
 * mặt hại (vd. ồn ào kéo khách nhưng khách chấm sao thấp hơn). Hiệu ứng nhỏ, có trần tổng (collection.ts).
 * Tên và mô tả là đồ vật đời thường, không gợi ý thuốc hay công dụng sức khoẻ.
 */

/** pharmacy: hợp nhà thuốc · neutral: dễ thương, trung tính · odd: không hợp tiệm (có mặt hại). */
export type CollectFit = "pharmacy" | "neutral" | "odd";

export interface CollectibleDef {
  id: string;
  name: string;
  slot: CollectibleSlot;
  /** Vị trí đeo hoặc các mặt trưng bày vật lý có thể dùng. */
  wearLayer?: "head" | "eyes" | "neck" | "chest";
  places?: string[];
  fit: CollectFit;
  description: string;
  /** Giá trị ở hạng B; hạng khác nhân theo GRADE_POWER (dấu giữ nguyên). */
  effects: { stat: CollectStat; base: number }[];
}

export const COLLECTIBLES: Record<string, CollectibleDef> = {
  "round-glasses": {
    id: "round-glasses",
    name: "Kính gọng tròn",
    slot: "wear",
    wearLayer: "eyes",
    fit: "pharmacy",
    description: "Trông chững chạc, khách thấy yên tâm khi được tư vấn.",
    effects: [{ stat: "rating", base: 0.025 }],
  },
  "care-pin": {
    id: "care-pin",
    name: "Huy hiệu Tận tâm",
    slot: "wear",
    wearLayer: "chest",
    fit: "pharmacy",
    description: "Ghim nhỏ trên ngực áo, khách nhớ mặt người bán.",
    effects: [{ stat: "returnChance", base: 0.03 }],
  },
  "neck-bow": {
    id: "neck-bow",
    name: "Nơ cổ áo",
    slot: "wear",
    wearLayer: "neck",
    fit: "neutral",
    description: "Gọn gàng, lịch sự.",
    effects: [{ stat: "rating", base: 0.018 }],
  },
  "flower-band": {
    id: "flower-band",
    name: "Băng đô hoa",
    slot: "wear",
    wearLayer: "head",
    fit: "neutral",
    description: "Tươi tắn, khách quen hay khen.",
    effects: [{ stat: "returnChance", base: 0.02 }],
  },
  "cat-ears": {
    id: "cat-ears",
    name: "Mũ tai mèo",
    slot: "wear",
    wearLayer: "head",
    fit: "odd",
    description: "Người qua đường tò mò ghé xem, nhưng khách lớn tuổi thấy kỳ kỳ.",
    effects: [
      { stat: "awareness", base: 1 },
      { stat: "rating", base: -0.02 },
    ],
  },
  "beach-shades": {
    id: "beach-shades",
    name: "Kính râm bãi biển",
    slot: "wear",
    wearLayer: "eyes",
    fit: "odd",
    description: "Hợp đi biển hơn đứng quầy.",
    effects: [
      { stat: "awareness", base: 0.5 },
      { stat: "rating", base: -0.03 },
    ],
  },
  succulent: {
    id: "succulent",
    name: "Chậu sen đá",
    slot: "counter",
    places: ["counter-1", "counter-2", "shelf", "store-floor"],
    fit: "pharmacy",
    description: "Xanh mát, khách đứng chờ thấy thư thả hơn.",
    effects: [{ stat: "queuePatience", base: 0.04 }],
  },
  "service-bell": {
    id: "service-bell",
    name: "Chuông gọi phục vụ",
    slot: "counter",
    fit: "pharmacy",
    description: "Khách biết chắc đã có người nghe mình.",
    effects: [{ stat: "queuePatience", base: 0.05 }],
  },
  "mint-jar": {
    id: "mint-jar",
    name: "Hũ kẹo bạc hà",
    slot: "counter",
    places: ["counter-1", "counter-2", "shelf"],
    fit: "neutral",
    description: "Mỗi khách một viên kẹo, lần sau nhớ đường quay lại.",
    effects: [{ stat: "returnChance", base: 0.03 }],
  },
  "lucky-cat": {
    id: "lucky-cat",
    name: "Mèo vẫy tay",
    slot: "counter",
    places: ["counter-1", "counter-2", "shelf", "store-floor"],
    fit: "neutral",
    description: "Vẫy suốt ngày, người đi ngang cũng vẫy lại.",
    effects: [
      { stat: "awareness", base: 0.8 },
      { stat: "recruitLuck", base: 0.05 },
    ],
  },
  "dried-flowers": {
    id: "dried-flowers",
    name: "Lọ hoa khô",
    slot: "shelf",
    places: ["shelf", "counter-1", "counter-2", "store-floor"],
    fit: "neutral",
    description: "Kệ hàng mềm mại hơn hẳn.",
    effects: [{ stat: "rating", base: 0.015 }],
  },
  hourglass: {
    id: "hourglass",
    name: "Đồng hồ cát",
    slot: "shelf",
    places: ["shelf", "counter-1", "counter-2"],
    fit: "pharmacy",
    description: "Nhắc cả tiệm làm việc đúng giờ, ứng viên thấy tiệm nề nếp.",
    effects: [
      { stat: "queuePatience", base: 0.03 },
      { stat: "recruitLuck", base: 0.05 },
    ],
  },
  teddy: {
    id: "teddy",
    name: "Gấu bông nhỏ",
    slot: "shelf",
    places: ["shelf", "store-floor"],
    fit: "neutral",
    description: "Trẻ con kéo tay bố mẹ vào tiệm.",
    effects: [{ stat: "returnChance", base: 0.02 }],
  },
  "money-plant": {
    id: "money-plant",
    name: "Cây kim tiền",
    slot: "store",
    places: ["store-floor", "store-wall", "shelf", "counter-1", "counter-2"],
    fit: "pharmacy",
    description: "Góc tiệm xanh tươi, nhìn là muốn ghé.",
    effects: [
      { stat: "awareness", base: 1 },
      { stat: "rating", base: 0.01 },
    ],
  },
  "notice-board": {
    id: "notice-board",
    name: "Bảng tin khu phố",
    slot: "store",
    places: ["store-wall"],
    fit: "pharmacy",
    description: "Dán lịch họp tổ dân phố, tin tìm việc, ai cũng đứng lại đọc.",
    effects: [
      { stat: "awareness", base: 1.5 },
      { stat: "recruitLuck", base: 0.08 },
    ],
  },
  "paper-lantern": {
    id: "paper-lantern",
    name: "Đèn lồng giấy",
    slot: "store",
    places: ["store-wall"],
    fit: "neutral",
    description: "Tối lên đèn, tiệm ấm áp dễ nhận ra.",
    effects: [{ stat: "awareness", base: 1 }],
  },
  "disco-lights": {
    id: "disco-lights",
    name: "Dây đèn nháy",
    slot: "store",
    places: ["store-wall"],
    fit: "odd",
    description: "Cả hẻm đều thấy, nhưng khách bảo chói mắt.",
    effects: [
      { stat: "awareness", base: 2 },
      { stat: "rating", base: -0.03 },
    ],
  },
  "candy-speaker": {
    id: "candy-speaker",
    name: "Loa kẹo kéo",
    slot: "store",
    places: ["store-floor", "shelf"],
    fit: "odd",
    description: "Mở nhạc to kéo khách, người đứng chờ thì nhức tai.",
    effects: [
      { stat: "awareness", base: 2.5 },
      { stat: "queuePatience", base: -0.06 },
    ],
  },
};

export const COLLECTIBLE_IDS = Object.keys(COLLECTIBLES);

/** Hệ số theo hạng: hạng cao làm lợi ích mạnh hơn và mặt hại nhẹ đi. */
export const GRADE_POWER: Record<Grade, { good: number; bad: number }> = {
  S: { good: 1.6, bad: 0.4 },
  A: { good: 1.25, bad: 0.7 },
  B: { good: 1, bad: 1 },
  C: { good: 0.6, bad: 1.4 },
};

/** Tỉ lệ hạng theo độ hợp tiệm (tổng 100). */
export const FIT_GRADE_WEIGHTS: Record<CollectFit, Record<Grade, number>> = {
  pharmacy: { S: 14, A: 30, B: 40, C: 16 },
  neutral: { S: 6, A: 22, B: 44, C: 28 },
  odd: { S: 2, A: 8, B: 30, C: 60 },
};

/** Tỉ lệ rơi theo độ hợp tiệm. */
export const FIT_DROP_WEIGHTS: Record<CollectFit, number> = {
  pharmacy: 40,
  neutral: 42,
  odd: 18,
};

/** Giá bán lại theo hạng. */
export const ITEM_SELL_PRICE: Record<Grade, number> = {
  S: 40,
  A: 24,
  B: 12,
  C: 5,
};

/** Trần tổng hiệu ứng mỗi chỉ số khi đặt nhiều món (cả chiều âm). */
export const STAT_CAPS: Record<CollectStat, number> = {
  returnChance: 0.12,
  rating: 0.08,
  recruitLuck: 0.3,
  queuePatience: 0.15,
  awareness: 4,
};

export const STAT_LABEL: Record<CollectStat, string> = {
  returnChance: "Khách quay lại",
  rating: "Khách chấm sao",
  recruitLuck: "Dễ gặp ứng viên giỏi",
  queuePatience: "Khách chờ kiên nhẫn",
  awareness: "Người biết tới tiệm",
};

/** Chỗ đặt món theo loại; quầy 2 chỉ dùng được khi tiệm đã có quầy 2. */
export const SLOT_PLACES: Record<Exclude<CollectibleSlot, "wear">, string[]> =
  {
    counter: ["counter-1", "counter-2"],
    shelf: ["shelf"],
    store: ["store-wall", "store-floor"],
  };

export const MAX_COLLECTION = 30;
