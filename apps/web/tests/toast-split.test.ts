import { describe, expect, it } from "vitest";
import { splitToast } from "../src/ui/Toasts";

describe("tách thông báo thành tiêu đề / nội dung / xu", () => {
  it("số xu ở cuối thành nhãn riêng", () => {
    expect(splitToast("Đơn ship đã giao đúng hẹn: +30 xu.")).toEqual({
      title: "Đơn ship đã giao đúng hẹn",
      coins: "+30",
    });
  });
  it("gạch ngang dài tách tiêu đề và nội dung", () => {
    expect(
      splitToast(
        "Có khách vừa để lại đánh giá thấp — mở tab Đánh giá để xem lý do.",
      ),
    ).toEqual({
      title: "Có khách vừa để lại đánh giá thấp",
      body: "Mở tab Đánh giá để xem lý do.",
      coins: undefined,
    });
  });
  it("người nói trước dấu hai chấm thành tiêu đề", () => {
    const r = splitToast(
      "Khách: “Đây không phải thứ mình cần.” Hàng đã được trả về kệ.",
    );
    expect(r.title).toBe("Khách");
    expect(r.body).toContain("Hàng đã được trả về kệ");
  });
  it("câu thường giữ nguyên làm tiêu đề", () => {
    expect(splitToast("Đã cất Nơ cổ áo vào bộ sưu tập.").title).toBe(
      "Đã cất Nơ cổ áo vào bộ sưu tập",
    );
  });
});
