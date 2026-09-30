/** Thương hiệu hư cấu — đổi ở một chỗ duy nhất. Cần tra cứu nhãn hiệu trước khi phát hành thương mại. */
export const BRAND = {
  name: "Tiệm thuốc Bồ Công Anh",
  short: "Bồ Công Anh",
  currency: "xu",
} as const;

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "idle-pharmacy.identity.v1";
export const BRAND_AVATARS = [
  { id: "dandelion", label: "Bồ công anh" },
  { id: "sprout", label: "Mầm xanh" },
  { id: "sun", label: "Nắng ấm" },
  { id: "kite", label: "Cánh diều" },
] as const;
export type BrandAvatar = (typeof BRAND_AVATARS)[number]["id"];
/** Vị trí từng hình trong sprite avatar thương hiệu (2×2 ô, xem public/brand-avatars.webp). */
export const AVATAR_CELL: Record<BrandAvatar, [number, number]> = {
  dandelion: [0, 0],
  sprout: [1, 0],
  sun: [0, 1],
  kite: [1, 1],
};
export const AVATAR_SPRITE = 1254;
export type BrandIdentity = { name: string; avatar: BrandAvatar };
const defaults: BrandIdentity = { name: BRAND.name, avatar: "dandelion" };
function readIdentity(): BrandIdentity {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    ) as Partial<BrandIdentity> | null;
    if (!value) return defaults;
    const name =
      typeof value.name === "string" ? value.name.trim().slice(0, 24) : "";
    const avatar =
      BRAND_AVATARS.find((item) => item.id === value.avatar)?.id ??
      defaults.avatar;
    return { name: name || defaults.name, avatar };
  } catch {
    return defaults;
  }
}
let identity = readIdentity();
const listeners = new Set<() => void>();
export function useBrandIdentity() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => identity,
  );
}
export function saveBrandIdentity(next: BrandIdentity) {
  identity = {
    name: next.name.trim().slice(0, 24) || defaults.name,
    avatar: next.avatar,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* Trình duyệt chặn lưu trữ. */
  }
  listeners.forEach((listener) => listener());
}
