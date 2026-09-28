# Ngôn ngữ giao diện Bồ Công Anh

## Hướng thiết kế

Tiệm nhỏ như một trang truyện tương tác: nền giấy sáng, kệ gỗ mật ong, bảng hiệu men xanh lá. Cảnh cửa hàng là trọng tâm; HUD và các bảng thông tin giúp người chơi quyết định nhanh, không che cảnh lâu hơn cần thiết. Toàn bộ hình vẽ là SVG gốc trong repo.

## Token

CSS lấy từ `apps/web/src/ui/theme.css`; SVG lấy từ `apps/web/src/art/palette.ts`.

| Vai trò | Màu | Dùng cho |
|---|---|---|
| Giấy | `#FFFDF6` | khay, bảng chi tiết, hộp thoại |
| Nền | `#F4F0E5` | nền ngoài cảnh |
| Mực | `#263A36` | chữ chính, nét SVG |
| Xanh lá | `#236B54` | hành động chính, quầy, trạng thái tốt |
| Xanh nhạt | `#DCEFE3` | lựa chọn, nền nhấn |
| Mật ong | `#E4A93B` | xu, tiến trình ngày, lưu ý nhẹ |
| Gạch | `#A9433C` | lỗi, hàng hết, hành động nguy hiểm |

Màu trạng thái phải đi kèm chữ hoặc biểu tượng. Không tạo thêm màu nhấn cho mỗi tab. Nét SVG chính rộng khoảng 2 đơn vị; bề mặt HTML dùng viền 1.5 px và góc 12–16 px. Thứ tự thị giác: cảnh → yêu cầu khách → sản phẩm/hành động → HUD → dữ liệu phụ.

## Thành phần và trạng thái

- `GameButton` cho hành động có chữ; `IconButton` cho nút chỉ có biểu tượng và bắt buộc có `aria-label`.
- `PanelHeading` cho tiêu đề bảng; `EmptyState` cho danh sách trống. Thành phần mới đặt trong `apps/web/src/ui/` khi dùng ở ít nhất hai nơi.
- Mọi nút có trạng thái hover, nhấn, vô hiệu và focus bàn phím. Vùng chạm tối thiểu 44 × 44 px. Không dựa riêng vào kéo thả; luôn giữ cách chạm.
- Ở điện thoại, khay phục vụ nằm dưới cảnh và điều hướng ở đáy. Ở tablet ngang, khay nằm bên cạnh. Tránh chữ dưới 11 px ở vùng cần đọc thường xuyên.
- Khi người chơi tự đứng quầy, khay hiện lời khách, sản phẩm và hành động phục vụ. Khi NPC đứng quầy, thu khay thành dải trạng thái gồm tên người, việc đang làm, tiến độ và nút lấy lại quầy; không hiện thao tác bán hàng bị vô hiệu. Bảng chi tiết trống không chiếm chỗ.
- Danh mục dùng `CatalogControls`: cùng nhóm hàng và trang điều khiển cả kệ trong cảnh lẫn khay. Chỉ hiện món đã mở; mỗi trang có 4/6/8/10 ô theo cấp kệ, cộng 2 ô khi sắp kệ theo nhóm. Tab Kho liệt kê món đã mở trong nhóm và xem trước nhóm sắp mở. Không thu nhỏ hình để nhét cả 20 món vào một hàng.
- Vật dụng nâng cấp theo cấp: trong mục Mở rộng chỉ hiện cấp kế tiếp, kèm giá, lợi ích, điều kiện cấp tiệm và mức hiện tại. Cấp vật dụng phải có thay đổi nhìn thấy trong diorama; riêng Kho và Cửa hàng mở thêm quyền nhập/trưng bày. Nhãn Bán chạy luôn đi kèm chữ, không chỉ có màu vàng.
- Hướng dẫn chơi nằm trong `OnboardingDialog`, có thể mở lại từ nút thông tin, cho phép bỏ qua và có lối vào bản lưu trực tiếp. Các bước hướng dẫn dùng hình sản phẩm và icon cùng hệ art của game.
- Tab Nhân sự ưu tiên trạng thái quầy và việc đang làm. Trên thẻ nhân viên chỉ hiện các số liệu ngắn; kỹ năng và lương mở theo nhu cầu.
- Chuyển động chỉ báo thao tác hoặc trạng thái; tôn trọng `prefers-reduced-motion`.

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
