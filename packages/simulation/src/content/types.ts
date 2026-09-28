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

/** Tính cách ảnh hưởng theo ngữ cảnh, không phải hệ số cộng thẳng. */
export type TraitId = 'hardworking' | 'meticulous' | 'talkative';

export interface TraitDef {
  id: TraitId;
  name: string;
  description: string;
}

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

export interface StaffLook {
  skin: number;
  hair: number;
  hairStyle: number;
}

export interface StaffCandidateDef {
  id: string;
  name: string;
  role: StaffRole;
  blurb: string;
  hireCost: number;
  /** Lương trả vào cuối mỗi ngày trong game (xu). */
  wage: number;
  /** Hệ số tốc độ thao tác (1 = chuẩn). */
  speed: number;
  /** Xác suất nhận ra đúng món cho yêu cầu "need" và nhận ra khách cần đi khám, [0, 1]. */
  knowledge: number;
  /** Giao tiếp tốt thì khách hao kiên nhẫn chậm hơn khi đang được phục vụ, [0, 1]. */
  communication: number;
  trait: TraitId;
  look: StaffLook;
}

export type UpgradeEffect =
  | { type: 'catalog'; facility: 'warehouse' | 'storefront'; add: number }
  | { type: 'scale'; key: 'checkoutMs' | 'retrieveMs'; factor: number }
  | { type: 'shelfCapacity'; add: number }
  | { type: 'queue'; addMax: number; patienceFactor: number }
  | { type: 'spawnInterval'; factor: number };

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
