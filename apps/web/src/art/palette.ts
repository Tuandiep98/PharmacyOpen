import { LOOK_VARIANTS } from "@pharmacy/simulation";

// Bảng màu art gốc của dự án. Số phần tử phải khớp LOOK_VARIANTS trong simulation.
export const INK = "#263A36";
export const STROKE = 2;

export const ART = {
  paper: "#FFFDF6",
  wall: "#F1F3E7",
  wallStripe: "#E4EBDD",
  floor: "#E8D9B8",
  floorLine: "#D7C49E",
  wood: "#AE754F",
  woodLight: "#D59B66",
  woodInner: "#F8ECD6",
  leaf: "#236B54",
  leafLight: "#8EC9A0",
  mint: "#DCEFE3",
  honey: "#E4A93B",
  coral: "#B95D50",
  sky: "#91B5BE",
} as const;

export const SKIN = [
  "#FDE0C8",
  "#F6C9A5",
  "#E3A87E",
  "#C68660",
  "#8D5A3B",
] as const;
export const HAIR = [
  "#293631",
  "#543D30",
  "#805A3F",
  "#BE8B47",
  "#88918D",
  "#9B5143",
] as const;
export const OUTFIT = [
  "#CA7866",
  "#829FA4",
  "#E3B95D",
  "#9E8CAB",
  "#7EAF8E",
  "#C48C62",
] as const;
export const PANTS = [
  "#596C69",
  "#70665B",
  "#56695D",
  "#6C6780",
  "#596C69",
  "#776153",
] as const;

if (
  SKIN.length !== LOOK_VARIANTS.skin ||
  HAIR.length !== LOOK_VARIANTS.hair ||
  OUTFIT.length !== LOOK_VARIANTS.outfit
) {
  throw new Error("Bảng màu art không khớp LOOK_VARIANTS");
}

export function pick<T>(list: readonly T[], index: number): T {
  return list[((index % list.length) + list.length) % list.length]!;
}
