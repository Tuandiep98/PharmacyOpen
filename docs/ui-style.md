# Ngôn ngữ giao diện Bồ Công Anh

## Hướng thiết kế

Tiệm nhỏ như một trang truyện tương tác: nền giấy sáng, kệ gỗ mật ong, bảng hiệu men xanh lá. Cảnh cửa hàng là trọng tâm; HUD và các bảng thông tin giúp người chơi quyết định nhanh, không che cảnh lâu hơn cần thiết. Art cảnh là SVG gốc trong repo; bốn hình đại diện thương hiệu là một sprite PNG được tạo riêng.

## Token

CSS lấy từ `apps/web/src/ui/theme.css`; SVG lấy từ `apps/web/src/art/palette.ts`.

| Vai trò   | Màu       | Dùng cho                              |
| --------- | --------- | ------------------------------------- |
| Giấy      | `#FFFDF6` | khay, bảng chi tiết, hộp thoại        |
| Nền       | `#F4F0E5` | nền ngoài cảnh                        |
| Mực       | `#263A36` | chữ chính, nét SVG                    |
| Xanh lá   | `#236B54` | hành động chính, quầy, trạng thái tốt |
| Xanh nhạt | `#DCEFE3` | lựa chọn, nền nhấn                    |
| Mật ong   | `#E4A93B` | xu, tiến trình ngày, lưu ý nhẹ        |
| Gạch      | `#A9433C` | lỗi, hàng hết, hành động nguy hiểm    |

Màu trạng thái phải đi kèm chữ hoặc biểu tượng. Không tạo thêm màu nhấn cho mỗi tab. Nét SVG chính rộng khoảng 2 đơn vị; bề mặt HTML dùng viền 1.5 px và góc 12–16 px. Thứ tự thị giác: cảnh → yêu cầu khách → sản phẩm/hành động → HUD → dữ liệu phụ.

## Thành phần và trạng thái

- `GameButton` cho hành động có chữ; `IconButton` cho nút chỉ có biểu tượng và bắt buộc có `aria-label`.
- `PanelHeading` cho tiêu đề bảng; `EmptyState` cho danh sách trống. Thành phần mới đặt trong `apps/web/src/ui/` khi dùng ở ít nhất hai nơi.
- Mọi nút có trạng thái hover, nhấn, vô hiệu và focus bàn phím. Vùng chạm tối thiểu 44 × 44 px. Không dựa riêng vào kéo thả; luôn giữ cách chạm.
- Ở điện thoại, khay phục vụ nằm dưới cảnh và điều hướng năm mục ở đáy. Trên tablet, nhóm năm mục giữ chiều rộng tối đa 600 px để không bị kéo giãn. Từ 1100 px, điều hướng chuyển thành thanh dọc 80 px bên trái; thứ tự mục và badge giữ nguyên. Ở tablet ngang, khay nằm bên cạnh. Tránh chữ dưới 11 px ở vùng cần đọc thường xuyên.
- HUD chỉ giữ logo, tiền và ngày/giờ/ca; tiền mở Sổ sách. Cấp tiệm nằm trong Mở rộng, điểm sao trong Đánh giá. Âm thanh và hướng dẫn chơi nằm trong menu ở góc phải. Cần kiểm tra HUD không tràn ngang ở độ rộng 320 px và khi tiền có nhiều chữ số.
- Khi người chơi tự đứng quầy, khay hiện lời khách, sản phẩm và hành động phục vụ. Khi NPC đứng quầy, thu khay thành dải trạng thái gồm tên người, việc đang làm, tiến độ và nút lấy lại quầy; không hiện thao tác bán hàng bị vô hiệu. Bảng chi tiết trống không chiếm chỗ.
- Danh mục dùng `CatalogControls`: cùng nhóm hàng và trang điều khiển cả kệ trong cảnh lẫn khay. Chỉ hiện món đã mở; mỗi trang có 4/6/8/10 ô theo cấp kệ, cộng 2 ô khi sắp kệ theo nhóm. Tab Kho liệt kê món đã mở trong nhóm và xem trước nhóm sắp mở. Không thu nhỏ hình để nhét cả 20 món vào một hàng.
- Vật dụng nâng cấp theo cấp: trong mục Mở rộng chỉ hiện cấp kế tiếp, kèm giá, lợi ích, điều kiện cấp tiệm và mức hiện tại. Cấp vật dụng phải có thay đổi nhìn thấy trong diorama; riêng Kho và Cửa hàng mở thêm quyền nhập/trưng bày. Nhãn Bán chạy luôn đi kèm chữ, không chỉ có màu vàng.
- Hướng dẫn chơi nằm trong `OnboardingDialog`, có thể mở lại từ menu HUD, cho phép bỏ qua và có lối vào bản lưu trực tiếp. Các bước hướng dẫn dùng hình sản phẩm và icon cùng hệ art của game.
- Đơn ship: nút thùng hàng nổi ở góc phải cảnh hiện số đơn cần gói/gửi kèm chữ trạng thái (Cần gói / Sắp trễ / Trễ hẹn / Đang giao) và đổi màu vàng/đỏ; chạm mở bảng Đơn ship (`features/delivery/DeliveryPanel.tsx`). Mỗi đơn là một thẻ: nguồn đơn, hạn giao theo giờ trong game, từng món với nút “Gói 1” (hết kệ thì “Hết · Nhập”), chân dung người đang gói, nút chính “Ghi phiếu & gửi”, rồi tiến độ shipper. Khay phục vụ đặt “Báo hết hàng” cạnh “Khuyên đi khám”.
- Tab Nhân sự ưu tiên trạng thái quầy và việc đang làm. Trên thẻ nhân viên chỉ hiện các số liệu ngắn; kỹ năng và lương mở theo nhu cầu.
- Chuyển động chỉ báo thao tác hoặc trạng thái; tôn trọng `prefers-reduced-motion`.

## Giới hạn chiều cao và ưu tiên số liệu

- Mọi màn hình chơi và dialog/overlay phải nằm trong **một viewport hiện tại** (`100dvh`), tính cả nút hành động chính và safe area. Trên màn hình thấp, cuộn **vùng nội dung bên trong**; giữ hành động chính nhìn thấy và chạm được, không để nút nằm dưới mép màn hình. Kiểm tra ít nhất 320 × 568, 375 × 667, 390 × 844 và tablet ngang; kiểm tra cả bàn phím hiện khi sửa tên.
- Tổng kết ngày và lời chào quay lại ưu tiên ba số: kết quả xu/lãi, khách đã phục vụ, khách bỏ về. Chữ số chính lớn, đậm, dạng số có độ rộng ổn định; tăng/tốt dùng xanh, giảm/xấu dùng đỏ và luôn có nhãn chữ. Sổ sách, từng ca và số liệu phụ nằm sau thao tác “Xem chi tiết”. Không dùng màu đơn lẻ để truyền đạt ý nghĩa.
- Với hai quầy, cả hai quầy phải nhận biết được trong cảnh ở điện thoại; bộ chọn quầy phải có vùng chạm ≥ 44 px, trạng thái khách/người đứng và chỉ rõ quầy đang chọn. Giao người đứng quầy phải cho chọn số quầy cụ thể.
- Giao quầy dùng một bộ chọn chung `CounterStaffPicker` (`features/staff/CounterAssign.tsx`): ô vuông ≥ 44 px gồm chân dung, cấp, tên ngắn và việc đang làm; người đang đứng quầy đó hiện “✓ Đang trực” (một dòng, không xuống hàng), người bận có thanh tiến độ. Chạm mặt quầy trong cảnh mở thẻ quầy (`CounterCard`) có bộ chọn này; khay phục vụ và tab Nhân sự dùng lại đúng component, không thêm nút “Giao cho …” riêng.
- Việc đang làm của một người hiện bằng `ActivityBadge` (`features/staff/ActivityBadge.tsx`): icon + chữ + nền theo nhóm (phục vụ xanh lá, làm việc mật ong, chờ khách xanh nhạt, lướt điện thoại đỏ, ngoài ca viền đứt). Dùng chung cho dải NPC đứng quầy, thẻ quầy, thẻ nhân viên và dialog nhân viên. Dải NPC đứng quầy gồm chân dung 48 px, tên + “đứng quầy N”, huy hiệu, số khách chờ và thanh tiến độ luôn giữ chỗ để không nhảy chiều cao.
- Dialog chi tiết (sản phẩm, nhân viên, bản thân) đóng bằng nút tròn ✕ 44 px ở góc trên phải; footer chỉ giữ hành động chính, không thêm nút “Đóng” full-width. Nút “Tiếp tục” khi tạm dừng là nút gọn giữa màn hình, không giãn hết chiều ngang.
- Tab quản lý (Nhân sự, Kho, Đánh giá, Mở rộng) là màn hình toàn phần trên điện thoại dọc (< 820 px) và điện thoại xoay ngang (cao ≤ 560 px); cảnh và khay bị ẩn phía sau để bong bóng, toast không lộ lên. Trên tablet ngang/màn rộng, cảnh giữ bên trái và tab chiếm trọn cột phải (ẩn khay). `.scene-wrap` dùng `isolation: isolate` để z-index của lớp chữ/toast không vượt ra ngoài cảnh; không đặt `-webkit-overflow-scrolling` lên `.side` (Safari iOS tạo stacking context riêng).
- Tạm thời game chỉ chạy light mode: các khối dark mode đang tắt bằng `@media not all`; bật lại khi bảng màu tối được rà soát.
- Trên thẻ nhân viên, lịch ca và vị trí chỉ hiện tóm tắt; chạm mới mở lựa chọn. Thanh cấp độ/mệt có nền và phần tô đúng tỉ lệ giá trị, kèm số đọc được.

## Cảnh, bảng tên, lời thoại và điểm nhấn

- Bố cục cảnh lấy từ `sceneLayout(counterCount)` trong `StoreScene.tsx`: kệ và bảng hiệu canh giữa cảnh, mỗi quầy có vị trí người đứng quầy (lệch trái), máy quét + máy tính tiền (đầu phải) và chỗ khách đứng (ngay bên trái quầy). Không đặt toạ độ cứng ở nơi khác; thêm quầy thì sửa hàm này.
- Người không đứng quầy đứng thành hàng trước kệ, tránh vùng ±58 đơn vị quanh người đứng quầy.
- Bảng hiệu và mọi logo tiệm dùng avatar thương hiệu người chơi chọn (`BrandAvatarArt` trong SVG, `BrandAvatarImage` trong HTML). Mặt quầy ghi “QUẦY 1”, “QUẦY 2”, không vẽ logo.
- Chữ trên cảnh (bảng tên, bong bóng thoại) là lớp HTML `SceneOverlay`, không vẽ bằng SVG, để luôn ≥ 11 px dù cảnh co nhỏ. Lớp này không nhận chạm.
- Bảng tên: viên thuốc viền mực 2 px, bóng đặc; màu theo vai trò: bạn (mật ong), dược sĩ (xanh lá), nhân viên bán hàng (xanh dương), khách quen (nền hồng nhạt, chữ gạch). Nhân viên hiện một chữ (tên riêng); khách quen hiện cách gọi, vd. “Chị Dung”.
- Bảng tên không được chồng nhau: `SceneOverlay` xếp trước khi vẽ — người ở quầy giữ tên đầy đủ (lên tầng trên nếu cần); khách xếp hàng rút gọn “Cô Hương” → “Hương” → “H”, và bỏ bảng tên nếu vẫn bị che. Bảng tên luôn trong khung cảnh.
- Bong bóng không được bị cắt ở mép cảnh (hai quầy làm cảnh thu nhỏ): sau khi vẽ, bong bóng được đẩy vào trong khung, đuôi dời ngược lại để vẫn chỉ đúng đầu nhân vật; bong bóng gọn của quầy không chọn hẹp hơn (≤ 150 px) và được nhấc lên nếu đè bong bóng quầy đang chọn (kèm đường chấm nối xuống đầu nhân vật). Bong bóng né cả nút Đơn ship: nhấc lên, không được thì dịch ngang. Màn hẹp/thấp chỉ hiện toast mới nhất, tối đa hai dòng.
- Bong bóng khách ở quầy luôn có dòng đầu “CẦN …” một dòng (tên món + hình nếu khách gọi tên; nhãn `short` của yêu cầu nếu kể nhu cầu — không lộ món đúng; khách có triệu chứng chỉ ghi không khoẻ). Quầy không được chọn trên màn hẹp chỉ hiện dòng này. Đổi câu thì chữ hiện dần; bảng tên và bong bóng trượt theo nhân vật cùng nhịp 450 ms.
- Điện thoại dọc: khay giữ chiều cao tự nhiên (thấy khách, hai nút và hàng hoá), cảnh nhận phần còn lại nhưng không dưới ~34% màn hình; khay quá cao thì cuộn bên trong. Khi tự đứng quầy, gợi ý/tiến độ nằm trong thẻ khách, “Khuyên đi khám” và “Báo hết hàng” là một hàng hai nút.
- Bong bóng thoại: khách mọc sang trái, người bán mọc sang phải; nền người bán xanh nhạt, khách giấy trắng, sốt ruột nền đỏ nhạt. Lời thoại ở `features/store/dialogue.ts`, theo nhịp chào → hỏi hàng → số lượng → thanh toán, đổi theo kiểu khách và giọng giao tiếp của người bán (`serviceTone`, cùng tiêu chí khách chấm điểm). Hai quầy trên màn hẹp thì chỉ quầy đang chọn hiện câu đầy đủ.
- Điểm nhấn ôm sát hình bằng bộ lọc SVG (`fx-ring-gold`, `fx-ring-mint`): vàng = đang chọn / đang thả vào; xanh bạc hà nhấp nháy = khách chờ bạn phục vụ hoặc thả hàng được. Không dùng elip hay khung nét đứt rời khỏi chủ thể.
- Ô “Bán chạy”: khung cam đỏ có quầng sáng + nhãn cam có ngôi sao và chữ “BÁN CHẠY” (ô hẹp chỉ còn ngôi sao). Ô đang chọn: viền vàng 4 px + viền trắng trong.
- HUD: avatar + tên tiệm (co bằng dấu ba chấm, ẩn dưới 340 px), xu, chip ngày gồm icon buổi (sáng/trưa/chiều/tối) trong vòng tiến trình ngày; chạm chip để thả xuống giờ và ca.
- Đổi người đứng quầy: nút tròn có mũi tên xoay đè góc chân dung người đang trực (cả chân dung là vùng chạm ≥ 44 px), mở bộ chọn ngay bên dưới.

## Nhân vật và icon

Nhân vật chibi nhìn thẳng, cùng tỷ lệ đầu/thân, nét xanh đậm, bảng màu áo trầm vừa. Gốc SVG nằm ở giữa hai bàn chân `(0,0)`; đầu ở khoảng `(0,-78)`, toàn hình cao khoảng 110 đơn vị. Biểu cảm cần đọc được ở chân dung 56 px; giữ nhiều sắc độ da/tóc. Khách khác nhau nhờ tóc, áo và phụ kiện; nhân viên phân biệt được bằng blouse hoặc tạp dề. Không thay ngoại hình theo logic mô phỏng ngoài `look` và vai trò hiện có.

Thứ tự lớp vẽ nhân vật: tóc phía sau → thân/áo → đầu/tóc mái → khuôn mặt. Tóc dài không được phủ lên áo hoặc phụ kiện ở ngực.

Mặt hàng dùng khung SVG `40×48`, đáy ở `y=47`, mỗi món có dáng bao bì riêng và một dấu hiệu nhận diện ở giữa. Art trong kệ, khay và bảng kho đều lấy từ cùng `ProductArt`/`ProductIcon`. Minh hoạ nâng cấp dùng `UpgradeArt`, khung `96×72`, vẽ đúng đồ vật được mua; khi thêm nâng cấp mới phải thêm tranh tương ứng.

Icon giao diện 24 × 24, cùng nét bo tròn 2 px, tô phẳng có chọn lọc. Không dùng chữ thập bảo hộ hoặc biểu tượng gợi thuốc thật.

## Tham chiếu

- [Cozy Quest UI](https://gamecontentdeals.com/assets/2d/cozy-quest-ui-mobile-rpg-idle-game-interface/): tham khảo cách đồng bộ HUD, kho và cửa hàng; không sao chép tài sản.
- [Cozy Farming Game UI Kit](https://nexavisuals.artstation.com/store/XoW97/cozy-farming-game-ui-kit-complete-edition-5-packs-296-designs): tham khảo độ nhất quán của icon và khung trong một game ấm áp.
- [Apple: Designing for games](https://developer.apple.com/design/human-interface-guidelines/designing-for-games/) và [Android: Accessibility](https://developer.android.com/guide/topics/ui/accessibility/views/apps-views): thao tác cảm ứng, khả năng nhận biết và vùng chạm.
- [Two Point Hospital](https://www.twopointstudios.com/en/games/two-point-hospital/) và [Usagi Shima](https://store.steampowered.com/app/3144010/Usagi_Shima_Bunny_Island/): tham khảo cách nhân vật và đồ vật dễ nhận ra ở kích thước nhỏ; SVG trong dự án được vẽ mới.
- [Mech Arena Progress Path](https://mecharena-support.plarium.com/hc/en-us/articles/26714386938908-Progress-Path): tham khảo cách công bố mốc XP và tính năng sẽ mở; game dùng mốc bán hàng + ngày thay cho XP riêng.
