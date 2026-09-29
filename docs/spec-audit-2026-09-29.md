# Đối chiếu spec v1.1 và bản hiện tại

Ngày rà soát: 2026-09-29. Nguồn: `docs/spec-v1.1.md`, `docs/content-rules.md` và mã trong `packages/simulation`, `apps/web`.

## Đã có

- Lộ trình bước 1–7e được đánh dấu hoàn thành trong spec và có module tương ứng: mô phỏng bán hàng, NPC, hai quầy, danh tiếng, kinh tế/ngày/ca, tuyển dụng, mệt mỏi, vị trí, lưu game, offline và PWA.
- Luật an toàn cho lượt khách mô tả triệu chứng nằm trong simulation và có cổng kiểm duyệt nội dung.
- UI có khay phục vụ, tab Nhân sự, chọn quầy, tổng kết ngày, lời chào quay lại và onboarding.

## Khoảng trống và quyết định giao diện lần này

- **Nhận diện tiệm:** trước đây tên và logo cố định. Nay người chơi sửa tên (tối đa 24 ký tự) và chọn một trong bốn hình minh hoạ tự tạo. Lựa chọn lưu cục bộ trên trình duyệt; chưa gắn với save slot hoặc đồng bộ nhiều thiết bị.
- **Tổng kết/ngày vắng mặt:** trước đây mọi số liệu mở cùng lúc. Nay kết quả tiền, số khách phục vụ và số khách bỏ về hiện trước; sổ sách/từng ca mở theo nhu cầu.
- **Hai quầy:** trước đây màn hẹp chỉ chiếu một quầy tại một thời điểm. Nay cả hai nằm cạnh nhau trong cảnh, khay vẫn có nút chọn quầy; vị trí quầy bán cho nhân viên chọn đích cụ thể.
- **Nhân viên:** lịch ca và vị trí chuyển thành mục bấm mở. Thanh tiến trình có phần tô khi giá trị lớn hơn 0.

## Còn trong spec, chưa triển khai hoặc cần kiểm chứng sâu

- Bước 8 online vẫn là tùy chọn và chưa triển khai.
- Thưởng theo xếp hạng ngày được ghi “chưa làm” ở phần 3f; đặc điểm mệt ca kép đã được triển khai ở phần 3g.
- Cần đo balance trên nhiều cấu hình giá/nâng cấp và seed bất lợi; spec hiện chỉ có bộ đo mặc định.
- Tra cứu nhãn hiệu, rà soát nội dung thủ công và điều kiện phát hành thương mại vẫn là việc trước phát hành theo `docs/content-rules.md`.
