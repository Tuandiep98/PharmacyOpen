import type {
  Gender,
  Rarity,
  StaffCandidateDef,
  TraitDef,
  TraitId,
} from "./types";

// Đặc điểm nhân viên. Mô tả là thứ người chơi thấy; tác dụng cụ thể nằm trong ai.ts, reputation.ts,
// commands.ts và recruit.ts (cấp độ, mệt mỏi). Không có đặc điểm nào gây bạo lực hay miệt thị ngoại hình.
export const TRAITS: Record<TraitId, TraitDef> = {
  hardworking: {
    id: "hardworking",
    name: "Chăm chỉ",
    description: "Bổ sung kệ nhanh hơn 30%.",
    tone: "good",
    special: false,
  },
  meticulous: {
    id: "meticulous",
    name: "Cẩn thận",
    description: "Suy nghĩ lâu hơn một chút nhưng ít chọn nhầm món hơn.",
    tone: "mixed",
    special: false,
  },
  talkative: {
    id: "talkative",
    name: "Hoạt ngôn",
    description:
      "Khách thích được giải thích sẽ vui hơn; khách đang vội lại thấy phiền.",
    tone: "mixed",
    special: false,
  },
  ironman: {
    id: "ironman",
    name: "Trâu bò",
    description: "Làm cả hai ca mà không mệt.",
    tone: "good",
    special: true,
  },
  lucky: {
    id: "lucky",
    name: "Thần tài",
    description: "Khách hay boa: 20% đơn người này bán được trả gấp đôi.",
    tone: "good",
    special: true,
  },
  "silver-tongue": {
    id: "silver-tongue",
    name: "Dẻo miệng",
    description: "Nói chuyện có duyên, khách dễ cho 5 sao.",
    tone: "good",
    special: true,
  },
  "sharp-memory": {
    id: "sharp-memory",
    name: "Trí nhớ tốt",
    description: "Nhớ hết kệ hàng, gần như không đưa nhầm.",
    tone: "good",
    special: true,
  },
  "quick-hands": {
    id: "quick-hands",
    name: "Nhanh tay",
    description: "Lấy hàng và thanh toán nhanh hơn 40%.",
    tone: "good",
    special: false,
  },
  "regulars-favorite": {
    id: "regulars-favorite",
    name: "Được khách quen quý",
    description: "Khách quen được người này phục vụ vui hơn hẳn.",
    tone: "good",
    special: false,
  },
  tidy: {
    id: "tidy",
    name: "Ngăn nắp",
    description:
      "Tiệm gọn gàng khi người này trong ca: khách chờ bớt sốt ruột.",
    tone: "good",
    special: false,
  },
  lazy: {
    id: "lazy",
    name: "Siêu lười",
    description: "Hay lướt điện thoại vài giây trước khi làm việc.",
    tone: "bad",
    special: false,
  },
  "slow-learner": {
    id: "slow-learner",
    name: "Chậm hiểu",
    description: "Nghĩ lâu và hay đưa nhầm món.",
    tone: "bad",
    special: false,
  },
  "hot-tempered": {
    id: "hot-tempered",
    name: "Nóng tính",
    description: "Hay cáu gắt: khách kém hài lòng, dễ bị chê thái độ.",
    tone: "bad",
    special: false,
  },
  late: {
    id: "late",
    name: "Hay đi trễ",
    description: "Vào ca muộn vài giây, quầy có thể bỏ trống.",
    tone: "bad",
    special: false,
  },
  "sticky-fingers": {
    id: "sticky-fingers",
    name: "Cầm nhầm tiền két",
    description: "Thỉnh thoảng két thiếu vài xu sau lượt bán của người này.",
    tone: "bad",
    special: true,
  },
  reckless: {
    id: "reckless",
    name: "Tay nhanh hơn não",
    description: "Rất nhanh nhưng hay nhầm.",
    tone: "mixed",
    special: false,
  },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

export interface RarityDef {
  id: Rarity;
  name: string;
  /** Trọng số khi sinh ứng viên (tổng 100). */
  weight: number;
  speed: [number, number];
  knowledge: [number, number];
  communication: [number, number];
  /** Cộng vào lương mỗi ca. */
  wageBonus: number;
}

export const RARITIES: Record<Rarity, RarityDef> = {
  common: {
    id: "common",
    name: "Thường",
    weight: 70,
    speed: [0.8, 1.05],
    knowledge: [0.45, 0.7],
    communication: [0.5, 0.75],
    wageBonus: 0,
  },
  good: {
    id: "good",
    name: "Khá",
    weight: 22,
    speed: [0.9, 1.15],
    knowledge: [0.55, 0.8],
    communication: [0.6, 0.85],
    wageBonus: 1,
  },
  rare: {
    id: "rare",
    name: "Hiếm",
    weight: 7,
    speed: [1, 1.2],
    knowledge: [0.65, 0.85],
    communication: [0.65, 0.9],
    wageBonus: 3,
  },
  legendary: {
    id: "legendary",
    name: "Huyền thoại",
    weight: 1,
    speed: [1.1, 1.3],
    knowledge: [0.8, 0.95],
    communication: [0.8, 0.95],
    wageBonus: 6,
  },
};

export const RARITY_IDS = Object.keys(RARITIES) as Rarity[];

// Tên hư cấu phổ biến. Tên đệm theo giới tính giúp tên đọc tự nhiên.
export const FAMILY_NAMES = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Phan",
  "Vũ",
  "Đặng",
  "Bùi",
  "Đỗ",
  "Hồ",
  "Ngô",
  "Dương",
  "Lý",
];
export const GIVEN_NAMES: Record<
  Gender,
  { middle: string[]; given: string[] }
> = {
  female: {
    middle: ["Thị", "Ngọc", "Thu", "Minh", "Bảo", "Khánh", "Thanh"],
    given: [
      "Lan",
      "Mai",
      "Hà",
      "Trang",
      "Linh",
      "Ngân",
      "Vy",
      "Thảo",
      "Hương",
      "Yến",
      "My",
      "Nhung",
      "Quyên",
      "Tâm",
    ],
  },
  male: {
    middle: ["Văn", "Minh", "Quốc", "Đức", "Gia", "Hữu", "Thành"],
    given: [
      "Nam",
      "Huy",
      "Khoa",
      "Long",
      "Phúc",
      "Tuấn",
      "Bảo",
      "Hiếu",
      "Khang",
      "Sơn",
      "Tài",
      "Việt",
      "Đạt",
      "Toàn",
    ],
  },
};

/** Kiểu tóc nhân viên theo giới tính (chỉ số kiểu tóc tầng vẽ hiểu được). */
export const STAFF_HAIR_STYLES: Record<Gender, number[]> = {
  female: [1, 2, 3],
  male: [0, 5, 6],
};

// Hồ sơ cố định cho test và balance simulator (kịch bản lặp lại được). Người chơi tuyển từ danh sách
// ứng viên sinh ngẫu nhiên mỗi ngày (state.recruits), không thấy các hồ sơ này.
export const STAFF_CANDIDATES: Record<string, StaffCandidateDef> = {
  binh: {
    id: "binh",
    name: "Bình",
    role: "clerk",
    blurb: "Nhân viên mới, chăm chỉ, đang học nhận biết sản phẩm.",
    hireCost: 80,
    wage: 6,
    speed: 0.9,
    knowledge: 0.55,
    communication: 0.7,
    rarity: "common",
    traits: ["hardworking"],
    hiddenTraits: [],
    look: { gender: "male", skin: 2, hair: 1, hairStyle: 0, messy: false },
  },
  chi: {
    id: "chi",
    name: "Chi",
    role: "pharmacist",
    blurb: "Dược sĩ trẻ, hiểu sản phẩm, làm việc cẩn thận.",
    hireCost: 180,
    wage: 13,
    speed: 1,
    knowledge: 0.85,
    communication: 0.6,
    rarity: "good",
    traits: ["meticulous"],
    hiddenTraits: [],
    look: { gender: "female", skin: 0, hair: 0, hairStyle: 2, messy: false },
  },
  dung: {
    id: "dung",
    name: "Dũng",
    role: "clerk",
    blurb: "Nhiều kinh nghiệm bán lẻ, nhanh tay và nói chuyện dễ nghe.",
    hireCost: 300,
    wage: 18,
    speed: 1.25,
    knowledge: 0.7,
    communication: 0.85,
    rarity: "rare",
    traits: ["talkative"],
    hiddenTraits: [],
    look: { gender: "male", skin: 3, hair: 4, hairStyle: 5, messy: false },
  },
};

export const STAFF_CANDIDATE_IDS = Object.keys(STAFF_CANDIDATES);
