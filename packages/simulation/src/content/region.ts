/*
 * Các tiệm hư cấu trong khu vực, dùng cho bảng xếp hạng chơi đơn (ranking.ts). Khi có máy chủ, danh sách
 * này được thay bằng dữ liệu người chơi thật mà không phải đổi cách tính điểm. `tier` là quy mô/tay nghề
 * tương đối so với một tiệm trung bình cùng tuổi đời.
 */
export interface RivalShop {
  id: string;
  name: string;
  tier: number;
}

export const RIVAL_SHOPS: readonly RivalShop[] = [
  { id: "cay-bang", name: "Nhà thuốc Cây Bàng", tier: 1.4 },
  { id: "hoa-giay", name: "Tiệm Hẻm Hoa Giấy", tier: 1.27 },
  { id: "mai-ngoi", name: "Nhà thuốc Mái Ngói", tier: 1.16 },
  { id: "chuong-gio", name: "Tiệm Chuông Gió", tier: 1.07 },
  { id: "nang-som", name: "Nhà thuốc Nắng Sớm", tier: 1 },
  { id: "o-cua-xanh", name: "Tiệm Ô Cửa Xanh", tier: 0.93 },
  { id: "la-me", name: "Nhà thuốc Lá Me", tier: 0.86 },
  { id: "bac-ha", name: "Tiệm Bạc Hà Nhỏ", tier: 0.79 },
  { id: "cau-tre", name: "Nhà thuốc Cầu Tre", tier: 0.72 },
  { id: "den-long", name: "Tiệm Đèn Lồng", tier: 0.64 },
  { id: "hat-tieu", name: "Tiệm Hạt Tiêu", tier: 0.56 },
];

/** Tên khu vực hiển thị trên bảng (hư cấu). */
export const REGION_NAME = "Phường Bồ Công Anh";
