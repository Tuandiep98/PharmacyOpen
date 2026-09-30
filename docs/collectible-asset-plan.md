# Bộ sưu tập: hướng art mới và quy trình thử nghiệm

Tài liệu này điều chỉnh plan “Hand-Drawn Idle Game Asset & Lottie Generation Rules” do người dùng cung cấp cho **bộ sưu tập của Bồ Công Anh**. Mẫu Chậu sen đá đã xác lập phong cách, sau đó người dùng yêu cầu mở rộng ra cả 18 món. Các chỉ dẫn trong plan gốc về bắt đầu Phase 1 rồi dừng, cấm đổi art direction, hay tự động áp dụng cho mọi asset không được đưa sang repo.

## Phong cách cho item sưu tập

- Cảm giác: đồ chơi vẽ tay trong tiệm Bồ Công Anh, vui và dễ đọc cùng nhân vật. Ưu tiên dáng đọc được ở 32–64 px; tránh chất tranh quá thật, nét mờ hoặc chi tiết nhỏ biến thành nhiễu.
- Dùng viền đậm xanh mực `#263A36`, mảng màu gọn và hơi bất đối xứng như art game hiện có. Có thể dùng SVG nhiều lớp hoặc ảnh vẽ tay, chọn cách nào giữ được sự đồng bộ ở kích thước trong cảnh. Với item có chuyển động từng bộ phận, tách rõ các lớp thực sự chuyển động thay vì lay cả hình.
- Màu chính lấy từ `apps/web/src/art/palette.ts`: giấy `#FFFDF6`, đất `#E8D9B8`, san hô `#B95D50`, mật ong `#E4A93B`, lá `#236B54`, lá sáng `#8EC9A0`. Mỗi item có thể thêm sắc độ phụ theo chất liệu.
- Nền của file vật phẩm trong suốt. Khung hạng, badge, bóng đổ UI và chữ thuộc component game, không vẽ vào asset. Tránh chữ, logo nhà thuốc thật, dấu thập và công dụng y tế.

## Dữ liệu và hạng

- Giữ nguyên `id` của `packages/simulation/src/content/collectibles.ts`, hạng S/A/B/C, chỉ số và cơ chế trang bị; art được ánh xạ từ ID qua manifest. Không đổi ID khi thay tranh.
- C/B/A/S phải khác nhau ngay ở hình dáng và chất liệu, không chỉ đổi viền thẻ hay độ bão hòa. C ít chi tiết hoặc có vết mộc; B đầy đặn, chỉn chu; A có cấu tạo phong phú và bắt đầu có chuyển động phù hợp; S hoàn thiện nhất và có hiệu ứng đặc trưng gắn với bản chất món đồ.
- Hiệu ứng phụ thuộc vật phẩm: cây lay lá, chuông rung phần chuông, đèn sáng phần bóng. Phần đế hoặc bộ phận cố định không chuyển động theo nếu không có lý do. Không buộc mọi item phải lấp lánh.
- Chỉ số ảnh hưởng mức hoàn thiện hoặc điểm nhấn trong mỗi hạng; giữ silhouette và cấp hạng rõ ràng. Không dùng chung một bộ hạt sáng cho mọi món.

## Mẫu đầu tiên: Chậu sen đá

- Dùng `succulent` làm ID ổn định; đặt được ở quầy, kệ, góc tiệm như gameplay hiện tại. Minh họa SVG chia riêng lá, đất, thân chậu và mép trước, dùng ở túi đồ và cảnh thật.
- Kiểm tra thứ tự vẽ theo góc nhìn: thân chậu phía sau, đất nằm trong miệng, hoa thị có gốc cắm vào đất, mép trước của chậu che gốc lá. Kiểm tra ở 32 px, 64 px và ảnh preview phóng to.
- C: hoa thị thấp, lá thưa, chậu mộc sứt nhẹ. B: nhiều lá ngắn hơn, chậu gọn. A: hoa thị dày, đầu lá có mũi gai nhỏ, trang trí chậu; chỉ lá đung đưa. S: thêm lớp lá ngắn và viền mật ong, đầu lá phớt màu. Không dùng giọt nước hay lấp lánh. Chậu giữ yên ở A/S.
- Ảnh tĩnh vẫn có đủ chi tiết khi người chơi bật giảm chuyển động. CSS/SVG đáp ứng chuyển động theo bộ phận tốt hơn Lottie raster cho item mẫu này; không bắt buộc dùng Lottie hoặc GIF chỉ vì plan gốc nhắc tới.
- Chậu sen đá được đánh dấu `approved` sau khi người dùng chấp nhận hướng hình; 17 món mới ở `review` để xem trên bảng tổng.

## Mở rộng cho cả bộ sưu tập

- `assets/collectibles/manifest.json` ghi nguồn vẽ, phiên bản, khác biệt C/B/A/S và chuyển động của đủ 18 ID. Bản vẽ đeo, để quầy/kệ và trang trí tiệm được tách ở `TieredWearableArt.tsx`, `TieredCounterArt.tsx`, `TieredStoreArt.tsx`.
- Mỗi món giữ vị trí chân hoặc điểm neo cũ trong cảnh và trên nhân vật. C là bản thưa/mộc; B đủ hình; A tăng cấu tạo, vật liệu; S hoàn thiện và có chuyển động riêng khi hợp lý. Độ hoàn thiện từ chỉ số chỉ điều chỉnh chi tiết trong hạng, không đổi gameplay.
- `collectibles-preview.html` là bảng hình 18×4 và hàng kiểm tra icon 32 px, dùng để phát hiện vẽ sai lớp, cắt hình hoặc các hạng quá giống nhau.

## Quy trình cho các món tiếp theo

1. Chốt item và nhu cầu đặt/đeo từ `COLLECTIBLES`; tạo manifest, nguồn và phiên bản mới. Lưu prompt nếu dùng sinh ảnh. Không ghi đè asset đã duyệt.
2. Sinh hoặc vẽ art; kiểm tra riêng 64 px, 128 px và kích thước thật trong cảnh. Xem cạnh các món đã duyệt.
3. Chọn chuyển động theo đặc tính: lá lay, chuông ngân, đèn ấm, vải nhẹ. Không tự gắn hiệu ứng bay hoặc lấp lánh cho tất cả.
4. Chọn SVG/CSS cho các bộ phận cần chuyển động riêng. Nếu dùng Lottie, giữ JSON nhỏ, asset ảnh ngoài JSON, một loop khép kín, lazy load và `destroy()` khi component rời trang. Đo tải trang và FPS trước khi nhân rộng.
5. Kiểm tra file, alpha, đường dẫn, reduced motion, fallback, kích thước tải và build. Người dùng review trước khi đổi `status` từ `review` sang `approved`.

## Tài liệu kỹ thuật

- Art: `apps/web/src/art/SucculentArt.tsx` và ba module `Tiered*Art.tsx`, SVG trong suốt, cùng `viewBox`/tọa độ với các item hiện có. `assets/collectibles/manifest.json` ghi nguồn, phiên bản và khác biệt từng hạng.
- Nguồn: asset tạo riêng cho game; khi dùng imagegen, lưu prompt cùng version. Asset bên ngoài chỉ dùng khi ghi rõ tác giả, URL và giấy phép.
