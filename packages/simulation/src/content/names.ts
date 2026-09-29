import type { ArchetypeId } from "./types";

/*
 * Tên gọi khách quen (hư cấu): cách xưng hô theo kiểu khách, tên theo dáng tóc. Chọn bằng băm id
 * nên không tiêu tốn RNG của mô phỏng và luôn giống nhau khi tải lại.
 */

const FEMALE = [
  "Dung",
  "Lan",
  "Mai",
  "Hoa",
  "Hạnh",
  "Thảo",
  "Ngọc",
  "Trang",
  "Hương",
  "Linh",
  "Vy",
  "Nhung",
];
const MALE = [
  "Tiến",
  "Quân",
  "Hùng",
  "Minh",
  "Nam",
  "Tuấn",
  "Long",
  "Phúc",
  "Khoa",
  "Đức",
  "Bảo",
  "Sơn",
];

/** Xưng hô: khách vội/khó tính là anh chị, khách cẩn thận là cô chú, khách tiết kiệm là bác, khách hay hỏi gọi tên. */
const HONORIFIC: Record<ArchetypeId, { female: string; male: string }> = {
  hurried: { female: "Chị", male: "Anh" },
  demanding: { female: "Chị", male: "Anh" },
  careful: { female: "Cô", male: "Chú" },
  thrifty: { female: "Bác", male: "Bác" },
  curious: { female: "", male: "" },
};

/** Dáng tóc dài / búi được vẽ như khách nữ, tóc ngắn / đội mũ như khách nam. */
export function looksFemale(hairStyle: number): boolean {
  return hairStyle === 1 || hairStyle === 2 || hairStyle === 3;
}

/** Băm chuỗi ổn định (FNV-1a), dùng để chọn biến thể nội dung mà không đụng RNG. */
export function stableHash(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Chữ cái đầu họ cho tên hiển thị kiểu mạng xã hội ("Dung N."). */
const SURNAME_INITIALS = ["N", "T", "L", "P", "H", "V", "Đ", "B", "D", "Q"];

/**
 * Tên khách mới ký dưới đánh giá: cùng tên riêng với tên gọi khi thành khách quen (cùng id), kèm chữ
 * cái đầu họ. Nhờ vậy "Dung N." viết đánh giá lần đầu, lần sau quay lại là "Chị Dung".
 */
export function reviewerNickname(id: string, hairStyle: number): string {
  const pool = looksFemale(hairStyle) ? FEMALE : MALE;
  const given = pool[stableHash(id) % pool.length]!;
  return `${given} ${SURNAME_INITIALS[stableHash(`${id}:surname`) % SURNAME_INITIALS.length]!}.`;
}

export function loyalName(
  id: string,
  archetypeId: ArchetypeId,
  hairStyle: number,
): string {
  const female = looksFemale(hairStyle);
  const pool = female ? FEMALE : MALE;
  const given = pool[stableHash(id) % pool.length]!;
  const honorific = HONORIFIC[archetypeId][female ? "female" : "male"];
  return honorific ? `${honorific} ${given}` : given;
}
