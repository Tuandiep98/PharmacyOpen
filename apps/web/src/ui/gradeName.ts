import type { Grade } from "@pharmacy/simulation";

/**
 * Class tô tên theo hạng S/A/B/C (nhân viên, ứng viên, đồ sưu tầm). Hạng càng cao chữ càng đậm và
 * có quầng sáng. Không có hạng (người chơi) thì giữ kiểu chữ của chỗ hiển thị.
 */
export function gradeNameClass(grade: Grade | null | undefined): string {
  return grade ? `grade-name grade-name-${grade}` : "";
}
