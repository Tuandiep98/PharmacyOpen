export type ProductId =
  | 'mask' | 'bandage' | 'sunscreen' | 'sanitizer' | 'lipbalm'
  | 'soap' | 'tissues' | 'wipes' | 'cottonpads' | 'toothbrush'
  | 'toothpaste' | 'floss' | 'cottonswab' | 'comb' | 'gauze'
  | 'tape' | 'elasticbandage' | 'moisturizer' | 'cleanser' | 'handcream';

export type ProductCategory = 'hygiene' | 'first-aid' | 'skin-care';

export interface ProductDef {
  id: ProductId;
  /** Tên hiển thị: tên loại sản phẩm chung, không dùng nhãn hiệu thật. */
  name: string;
  /** Nhãn hiệu hư cấu in trên bao bì. */
  brand: string;
  category: ProductCategory;
  /** Giá bán mặc định khi mở tiệm, đơn vị "xu" (số nguyên). Giá đang áp dụng nằm ở `SimState.prices`. */
  price: number;
  cost: number;
  /** Giá khách tham khảo ở nơi khác; bán cao hơn thì khách nhạy giá có thể phàn nàn (lỗi chính sách giá, không phải lỗi nhân viên). */
  referencePrice: number;
  shelfCapacity: number;
}

/** Đặc điểm nhân viên: tác động theo ngữ cảnh, một số có lợi, một số có hại, một số vừa lợi vừa hại. */
export type TraitId =
  | 'hardworking'
  | 'meticulous'
  | 'talkative'
  | 'ironman'
  | 'lucky'
  | 'silver-tongue'
  | 'sharp-memory'
  | 'quick-hands'
  | 'regulars-favorite'
  | 'tidy'
  | 'lazy'
  | 'slow-learner'
  | 'hot-tempered'
  | 'late'
  | 'sticky-fingers'
  | 'reckless';

/** good: có lợi, bad: có hại, mixed: vừa lợi vừa hại (giao diện tô màu theo loại này). */
export type TraitTone = 'good' | 'bad' | 'mixed';

export interface TraitDef {
  id: TraitId;
  name: string;
  description: string;
  tone: TraitTone;
  /** Đặc điểm đặc biệt chỉ ra ở ứng viên Hiếm/Huyền thoại. */
  special: boolean;
}

/** Độ hiếm của ứng viên: quyết định khoảng chỉ số và số đặc điểm. */
export type Rarity = 'common' | 'good' | 'rare' | 'legendary';

/**
 * Mã lý do của một đánh giá. Phân nhóm để quy trách nhiệm đúng chỗ:
 * - store: do chính sách/năng lực cửa hàng (giá, hàng chờ) → chỉ tính vào danh tiếng cửa hàng.
 * - staff: do người phục vụ → tính vào danh tiếng cá nhân.
 * - praise: điểm cộng.
 */
export type ReasonCode =
  | 'correct-item'
  | 'fair-price'
  | 'helpful-advice'
  | 'fast-service'
  | 'friendly-staff'
  | 'long-queue'
  | 'price-high'
  | 'slow-service'
  | 'wrong-item'
  | 'unneeded-referral'
  | 'too-chatty'
  | 'rude-staff'
  | 'strict-customer';

/**
 * named: khách gọi đúng tên sản phẩm.
 * need: khách mô tả nhu cầu sinh hoạt thường ngày (không phải triệu chứng bệnh).
 * refer: khách mô tả triệu chứng → hành động đúng duy nhất là khuyên đi khám, không bán.
 */
export type RequestKind = 'named' | 'need' | 'refer';

export interface RequestDef {
  id: string;
  kind: RequestKind;
  text: string;
  /** Sản phẩm phù hợp; luôn rỗng với kind = 'refer'. */
  acceptable: ProductId[];
}

export type StaffRole = 'pharmacist' | 'clerk';

export type Gender = 'female' | 'male';

export interface StaffLook {
  gender: Gender;
  skin: number;
  hair: number;
  /** Kiểu tóc theo giới tính, xem STAFF_HAIR_STYLES. */
  hairStyle: number;
  /** Ngoại hình "luộm thuộm" hiếm gặp: chỉ để trang trí, không ảnh hưởng chỉ số. */
  messy: boolean;
}

export interface StaffCandidateDef {
  id: string;
  name: string;
  role: StaffRole;
  blurb: string;
  hireCost: number;
  /** Lương mỗi ca đã vào làm, trả vào cuối ngày (xu). */
  wage: number;
  /** Hệ số tốc độ thao tác (1 = chuẩn). */
  speed: number;
  /** Xác suất nhận ra đúng món cho yêu cầu "need" và nhận ra khách cần đi khám, [0, 1]. */
  knowledge: number;
  /** Giao tiếp tốt thì khách hao kiên nhẫn chậm hơn khi đang được phục vụ, [0, 1]. */
  communication: number;
  rarity: Rarity;
  traits: TraitId[];
  /** Đặc điểm chưa lộ ra (hiện "???") cho tới hết ca làm đầu tiên; vẫn có tác dụng ngay. */
  hiddenTraits: TraitId[];
  look: StaffLook;
}

export type UpgradeEffect =
  | { type: 'catalog'; facility: 'warehouse' | 'storefront'; add: number }
  | { type: 'scale'; key: 'checkoutMs' | 'retrieveMs'; factor: number }
  | { type: 'shelfCapacity'; add: number }
  | { type: 'queue'; addMax: number; patienceFactor: number }
  | { type: 'spawnInterval'; factor: number }
  | { type: 'counter' };

export interface UpgradeDef {
  id: string;
  name: string;
  benefit: string;
  tradeoff: string;
  cost: number;
  effects: UpgradeEffect[];
}

export type ArchetypeId = 'hurried' | 'curious' | 'demanding' | 'careful' | 'thrifty';

export interface ArchetypeDef {
  id: ArchetypeId;
  name: string;
  description: string;
  spawnWeight: number;
  patienceMs: readonly [number, number];
  requestWeights: Partial<Record<string, number>>;
  /** Xác suất cơ bản để viết đánh giá (luôn < 1). */
  reviewProbability: number;
  /** Mức nhạy cảm với giá cao hơn giá tham khảo, [0, 1]. */
  priceSensitivity: number;
  /** Kỳ vọng cao làm mức hài lòng giảm dù phục vụ đúng, [0, 0.5]. */
  strictness: number;
  /** Hệ số khó chịu khi phải chờ lâu. */
  waitWeight: number;
  /** Thích được giải thích kỹ (nhân viên hoạt ngôn là điểm cộng) hay muốn nhanh gọn (là điểm trừ). */
  likesDetail: boolean;
}
