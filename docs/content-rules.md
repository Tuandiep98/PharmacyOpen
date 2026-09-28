# Quy tắc nội dung & checklist policy

> Đây là các biện pháp phòng ngừa đã áp dụng trong code, không phải tư vấn pháp lý. Trước khi phát hành thương mại,
> cần luật sư hoặc cơ quan quản lý xác nhận những mục có đánh dấu ⚖️.

## 1. Sở hữu trí tuệ

- [x] Tên, logo và nhãn sản phẩm đều hư cấu ("Bồ Công Anh", "Mây Nhẹ", "Dán Xinh"…), gom ở `apps/web/src/brand.ts` và `packages/simulation/src/content/products.ts` để đổi nhanh.
- [x] Không dùng tên, logo, màu nhận diện hay asset của chuỗi nhà thuốc thật (Pharmacity, Long Châu, An Khang, Guardian…).
- [x] Toàn bộ art là SVG tự vẽ trong repo (`apps/web/src/art`). Không dùng asset tải từ nguồn chưa rõ license.
- [x] Font Nunito dùng giấy phép SIL Open Font License 1.1, được phép đóng gói kèm game. Đã ghi công trong hộp thoại giới thiệu và trong [`credits.md`](credits.md).
- [ ] ⚖️ Tra cứu nhãn hiệu cho tên game và tên thương hiệu hư cấu (IP Việt Nam, WIPO Global Brand Database, và tên trùng trên App Store / Google Play) trước khi phát hành.
- [ ] Nếu sau này dùng asset CC0 hoặc CC-BY (ví dụ Kenney), ghi nguồn vào `docs/credits.md`.

## 2. Biểu tượng được bảo hộ

- [x] **Không dùng chữ thập đỏ hay trăng lưỡi liềm đỏ** ở bất kỳ đâu. Các biểu tượng này được Công ước Geneva và luật quốc gia bảo hộ (tại Việt Nam là Luật Hoạt động Chữ thập đỏ), và các chợ ứng dụng thường từ chối app dùng chúng.
- [x] Cũng không dùng chữ thập xanh làm logo. Logo hiện tại là hoa bồ công anh; icon "đi khám" là hình toà nhà.
- [x] Kiểm tra lại: khi thêm art mới, không vẽ chữ thập trên hộp sơ cứu, xe cứu thương hay đồng phục.

## 3. Nội dung y tế (quan trọng nhất)

- [x] Danh mục chỉ gồm đồ chăm sóc cá nhân và sơ cứu **không kê đơn**. Không có tên thuốc thật, hoạt chất, hàm lượng hay liều dùng.
- [x] Yêu cầu loại `need` chỉ là **nhu cầu sinh hoạt** (đi biển, đường bụi, môi khô, vết xước nhẹ), không phải bệnh.
- [x] Yêu cầu có triệu chứng (`refer`) → **hành động đúng duy nhất là khuyên đi khám**. Luật này nằm trong simulation và áp dụng cho cả NPC, có test ở `packages/simulation/tests`.
- [x] Không có kết quả điều trị ngẫu nhiên. Game không bao giờ nói kiểu "khách khỏi bệnh nhờ bạn".
- [x] Câu tư vấn là mẫu chung (`REFERRAL_MESSAGE`), không chẩn đoán.
- [x] Lần đầu mở game có hộp thoại lưu ý: đây là game hư cấu, không phải lời khuyên y tế. Có thể mở lại bằng nút (i).
- [x] **Cổng kiểm duyệt tự động** (`tools/content-safety`, chạy trong `npm test` hoặc riêng bằng `npm run content:check`). Blocklist nằm ở `packages/simulation/src/content/blocklist.json`. Các luật:
  - Tên thuốc thật, đơn vị liều (mg, ml, "lần/ngày"…) và tên chuỗi nhà thuốc thật bị cấm ở **mọi** nội dung game và mã nguồn UI.
  - Lời hứa điều trị ("chữa khỏi", "đặc trị", "khỏi bệnh"…) bị cấm trong tên sản phẩm, câu tư vấn và UI.
  - Từ chỉ triệu chứng (sốt, ho, đau, chóng mặt…) **chỉ** được xuất hiện trong yêu cầu `refer`. Mỗi yêu cầu `refer` phải có ít nhất một từ triệu chứng và không có sản phẩm "đúng".
  - Sản phẩm chỉ thuộc các nhóm được phép (vệ sinh, sơ cứu, chăm sóc da), và mỗi sản phẩm phải có ít nhất một yêu cầu dẫn tới.
- [ ] Khi thêm nội dung mới vẫn nên có người đọc lại; blocklist không thay được con người.
- [ ] Nếu làm thuốc kê đơn (sau MVP): chỉ mô phỏng **quy trình** (kiểm tra đơn hợp lệ, chuyển cho dược sĩ có chứng chỉ), không hiển thị hay gợi ý thuốc cụ thể.

## 4. Chợ ứng dụng & kiếm tiền

- [x] Không có loot box hay gacha, không có quảng cáo bắt buộc, không có dark pattern (ví dụ đếm ngược ép mua).
- [ ] Nếu thêm vật phẩm ngẫu nhiên có trả phí: phải công bố tỉ lệ (Apple Guideline 3.1.1, chính sách Google Play).
- [ ] Nếu thêm quảng cáo có thưởng: chỉ là tuỳ chọn, không cần xem để chơi tiếp tiến trình chính.
- [ ] Khai báo phân loại độ tuổi (IARC hoặc câu hỏi của Apple): game có **nhắc tới dược phẩm/y tế** nên trả lời trung thực. Mục tiêu 12+, không nhắm tới trẻ em (tránh phạm vi COPPA và Designed for Families).
- [ ] Google Play có chính sách "Health Content and Services": game không phải app sức khoẻ, nhưng mô tả trên store không được hứa hẹn lợi ích sức khoẻ.

## 5. Quyền riêng tư

- [x] MVP không thu thập dữ liệu cá nhân, không có analytics, không gọi mạng. Font được đóng gói sẵn, không tải từ Google Fonts.
- [x] `localStorage` lưu cờ "đã xem lời chào" và hai ô save game hư cấu. Không có dữ liệu cá nhân thật; mọi lần đọc/ghi đều bọc try/catch.
- [ ] Khi có cloud save hoặc analytics: cần chính sách quyền riêng tư, khai báo Data safety (Google Play) và App Privacy (Apple), và chỉ dùng telemetry tổng hợp.

## 6. Phát hành tại Việt Nam ⚖️

- [ ] Kinh doanh trò chơi điện tử tại Việt Nam chịu quy định về phân loại và cấp phép/thông báo theo Nghị định 147/2024/NĐ-CP. Nhóm G4 (game không tương tác giữa nhiều người chơi qua máy chủ) có thủ tục nhẹ hơn G1. **Cần xác minh thủ tục với cơ quan quản lý hiện hành trước khi phát hành thương mại.**
- [ ] Không hợp tác quảng bá sản phẩm dược thật trong game nếu chưa được tư vấn theo quy định về quảng cáo thuốc.
