# Idle Pharmacy — Spec v1.1 (các quyết định đã chốt)

> Bổ sung cho brief v1.0 (`idle_pharmacy_agent_spec.md`). Chỗ nào v1.1 nói khác thì theo v1.1.
> Cập nhật: 2026-09-28.

## 1. Quyết định thiết kế

| Chủ đề | v1.0 | v1.1 (chốt) | Lý do |
|---|---|---|---|
| Góc nhìn | top-down/isometric, để cấu hình | **Diorama 2D nhìn chính diện**. Nhân vật đứng ở các điểm cố định (quầy, hàng chờ, sau quầy) | Không cần sắp xếp chiều sâu isometric, không cần pathfinding, art rẻ hơn nhiều |
| Chuyển động | Vòng đời đi lại đầy đủ | **Không có animation đi bộ.** Khi đổi chỗ thì trượt nhẹ bằng CSS transition, lúc đứng yên có nhịp "thở" | Trạng thái quan trọng hơn chuyển động |
| Thể hiện trạng thái | pose idle/walk/work… | **Biểu cảm khuôn mặt** (khách: 8 biểu cảm, dược sĩ: 4), bong bóng yêu cầu/tiến độ, thanh kiên nhẫn có cả độ dài lẫn ký hiệu "!", không chỉ dựa vào màu | Nhìn là hiểu, dễ tiếp cận |
| Render | Phaser + React | **React + SVG** (bỏ Phaser) | Cảnh tĩnh ít đối tượng, không cần cầu nối hai hệ vẽ. Chỉ cân nhắc PixiJS nếu sau này cần hơn ~40 nhân vật hoặc hiệu ứng hạt |
| Vai người chơi | để ngỏ | **Người chơi là quản lý, điều khiển dược sĩ "An" bằng chạm.** NPC ở bước 3 dùng đúng các `Command` mà người chơi dùng | Hợp với game idle trên điện thoại, không cần joystick |
| Tiền | — | Số nguyên, đơn vị "xu" | Tránh sai số float, giữ tính tất định |
| RNG | seeded | mulberry32, **mỗi hệ thống một luồng riêng** (`spawn`, `customer`, sau này thêm `review`…) | Thêm random ở hệ này không làm lệch hệ khác |
| Vòng lặp | fixed timestep | Tick 100 ms. UI đọc lại khoảng 10 Hz. Mỗi khung hình chạy bù tối đa 10 tick. Tab ẩn thì dừng hẳn | Không bao giờ có vòng lặp đuổi kịp vô hạn |
| Lưu trữ (bước 5) | Dexie | **localStorage + 2 ô luân phiên** + kiểm tra cấu trúc khi tải + migration theo phiên bản | Save chỉ vài chục KB (lịch sử đã cắt gọn) nên không cần IndexedDB; ô còn lại phòng khi lần ghi mới nhất hỏng |
| Offline (bước 5) | giờ server | Dùng giờ client, chặn thời gian âm, **trần hiện tại 10 phút, chạy đúng mô phỏng thật** (không có công thức ước lượng). Người chơi tự đứng quầy thì tiệm đóng cửa khi vắng | Game chơi đơn, chưa có tài nguyên trả phí. Offline không thể lời hơn online vì dùng cùng mô phỏng |
| Chỉ số nhân viên | 11 | **4**: `knowledge`, `speed`, `communication`, `morale`, cộng thêm trait | Người chơi đọc hiểu được |
| Danh tiếng | 3 tầng | MVP: **sao công khai + hiệu suất nội bộ + danh tiếng cửa hàng**. Tầng thương hiệu và chi nhánh để sau | Chưa có chi nhánh |
| Thuốc kê đơn | có kịch bản | **Không có trong MVP** | An toàn nội dung |

## 2. Mini game bán hàng (vòng lõi)

**Bố cục:** cảnh cửa hàng ở trên, **khay phục vụ cố định** ở dưới (trên tablet ngang thì khay nằm ở cột phải).
Hàng chờ xếp ngang bên trái quầy, hiện tối đa 3 người, khách thứ 4 trở đi được gộp thành nhãn "+n". Nhờ vậy cảnh thấp và quầy không bị che.

1. Khách lên quầy. Bong bóng trên đầu gợi ý loại yêu cầu:
   - khách gọi đúng tên sản phẩm (`named`): bong bóng hiện hình sản phẩm;
   - khách kể nhu cầu sinh hoạt (`need`): bong bóng hiện "?";
   - khách mô tả triệu chứng (`refer`): bong bóng hiện "…" kèm biểu cảm không khoẻ.
2. Khay luôn hiện câu khách nói và dãy sản phẩm, **không cần bấm "Phục vụ khách"**.
3. Người chơi đưa hàng bằng **một cử chỉ**, chọn một trong ba cách:
   - kéo món từ **kệ trong cảnh** thả vào khách;
   - kéo món từ **khay** thả vào khách;
   - **chạm** vào món trên khay.

   Khi đang kéo, khách ở quầy sáng viền làm vùng thả. Bên dưới, UI gộp hai lệnh `startService` và `pickProduct`, nên vẫn qua đúng luật kiểm tra như NPC.
4. Muốn khuyên khách đi khám thì bấm nút **"Khuyên đi khám"** ngay trên dãy sản phẩm.
5. Dược sĩ lấy hàng (có thanh tiến độ). Nếu sai món, khách từ chối, hàng về lại kệ và khách mất một phần kiên nhẫn.
6. Nếu đúng món, **thanh toán diễn ra tự động** (UI gửi lệnh `checkout`, vẫn được kiểm tra), xu bay lên từ máy tính tiền.
7. Món nào hết hàng thì ô trên khay đổi thành **"+ Nhập"**, chạm một lần là nhập đầy kệ.

Chạm vào kệ trong cảnh sẽ mở chi tiết sản phẩm. Chạm vào khách đang xếp hàng hoặc vào dược sĩ sẽ mở bảng thông tin dạng overlay.

**Luật an toàn (cứng trong simulation, có test bảo vệ):**
- Với yêu cầu `refer`, lệnh `pickProduct` luôn bị từ chối với lý do `safety-referral-required`, đồng thời phát sự kiện `safetyWarning` và ghi lại fact. Người chơi hay NPC đều không bán được.
- Khuyên đi khám không đem lại tiền, nhưng là hành động đúng. Từ bước 4 sẽ có điểm hiệu suất và danh tiếng.
- Câu tư vấn dùng chung một mẫu, không chẩn đoán và không gợi ý thuốc.

## 3. Lộ trình

| Bước | Nội dung | Trạng thái |
|---|---|---|
| 1 | Nền tảng: workspace, lint/typecheck/test, app shell, bridge, RNG/đồng hồ, schema sự kiện, thương hiệu hư cấu | ✅ |
| 2 | Vertical slice: 1 phòng, 1 kệ, 1 quầy, 1 dược sĩ, 2 archetype khách, 5 sản phẩm, vòng yêu cầu → lấy hàng → thanh toán → xu | ✅ |
| 3 | Tự động hoá: tuyển 1–2 NPC, FSM + chọn việc bằng utility, nâng cấp đơn giản, cảnh báo mất khách khi hàng chờ đầy | ✅ |
| 4 | Đánh giá sao, hiệu suất nội bộ tách riêng, danh tiếng cửa hàng, khiếu nại | ✅ |
| 5 | Kinh tế idle: ngày + lương, giá bán, sổ sách, lưu/tải có phiên bản, tiến trình offline có giới hạn, PWA service worker | ✅ (hạn dùng dời sang bước 6) |
| 6 | Hạn dùng, khách quen, balance simulator | ✅ |
| 7 | Nội dung (20 sản phẩm, 5 archetype), âm thanh, onboarding | ✅ |
| 7b | Ca làm, mở/đóng cửa, chấm công, tổng kết ngày, xếp hạng sao | ✅ |
| 7c | Nhân viên: ứng viên ngẫu nhiên theo độ hiếm, đặc điểm, tay nghề, mệt mỏi/xin nghỉ, ngoại hình theo giới tính | ✅ |
| 8 | Online (tuỳ chọn) | |

## 3b. Tự động hoá (bước 3)

- **Nhân viên:** có 3 ứng viên hư cấu (Bình, Chi, Dũng), tối đa 2 NPC. Mỗi người có 3 chỉ số:
  - `speed`: tốc độ lấy hàng, thanh toán, suy nghĩ và đi bổ sung kệ;
  - `knowledge`: xác suất chọn đúng món cho yêu cầu kiểu "kể nhu cầu", và nhận ra khách cần đi khám;
  - `communication`: khách đang được người này phục vụ hao kiên nhẫn chậm hơn.

  `morale` và trait để sang bước 4–5.
- **Quầy có người đứng quầy** (`counter.operatorId`). Chỉ người được giao mới được bắt đầu phục vụ khách ở quầy đó. Lệnh `assignCounter` dùng để giao quầy cho NPC hoặc lấy lại. Khi đổi người, đơn đang làm dở vẫn do người cũ hoàn tất.
- **Mọi lệnh thao tác trên đơn đều kèm `workerId`**, và từ chối với lý do `not-your-order` nếu đơn không phải của người gửi. Nhờ vậy người chơi và NPC không thể giành đơn của nhau.
- **AI của NPC** (`packages/simulation/src/ai.ts`) chỉ gửi Command, không có đường tắt.
  - Mỗi lượt phục vụ theo FSM: Deciding (suy nghĩ) → pickProduct hoặc refer → Retrieving → Ready → checkout.
  - Khi rảnh, NPC chấm điểm các việc có thể làm: phục vụ khách ở quầy được giao được `1 + độ gấp`, bổ sung kệ được `0.3 + độ thiếu × 0.6`. Mỗi lúc chỉ một người đi bổ sung kệ, và luôn giữ lại đủ tiền mua 2 món.
  - NPC kiến thức thấp có thể định bán cho khách có triệu chứng. Luật an toàn sẽ chặn lệnh đó, và ở lần suy nghĩ sau NPC chắc chắn chuyển sang khuyên đi khám.
  - NPC không đưa lại món khách đã từ chối trong cùng lượt (`order.rejectedProductIds`).
- **Nâng cấp** (mỗi cái có đánh đổi): máy quét mã vạch, sắp kệ theo nhóm hàng, kệ rộng hơn, ghế chờ, biển hiệu sáng đèn. Tab Mở rộng hiện gợi ý điểm nghẽn dựa trên số liệu thật của ván chơi.
- **Hàng chờ đầy** thì khách mới bỏ đi ngay: phát sự kiện `customerTurnedAway` và tăng `stats.turnedAway`. UI nhắc tối đa mỗi 20 giây.
- **Chưa làm:** quầy thứ hai (cần sắp lại bố cục cảnh), lương theo ca (bước 5).

## 3c. Đánh giá, hiệu suất và danh tiếng (bước 4)

Toàn bộ logic nằm trong `packages/simulation/src/reputation.ts`. Các hàm tính toán là hàm thuần và có test riêng. Mỗi khi một khách rời tiệm, `dismissCustomer` gọi `recordInteraction` đúng một lần, với mọi kết cục:

1. **Nhật ký khách quan** (`InteractionRecord`): thời gian chờ ở hàng, người phục vụ, các món bị đưa nhầm, số lần bị chặn vì luật an toàn, kết cục, giá bán. Lưu tối đa 40 bản ghi.
2. **Hiệu suất nghiệp vụ** (0–100 mỗi lượt), chỉ dựa trên sự kiện nghiệp vụ:
   - đưa nhầm: −25;
   - bị chặn vì định bán cho khách có triệu chứng: −40;
   - khuyên đi khám không cần thiết: −40;
   - khách bỏ về khi đang được phục vụ: −30.

   Khách chưa được ai phục vụ thì không tính cho nhân viên nào.
3. **Mức hài lòng chủ quan** tính theo tính cách khách:
   - yếu tố chung: kết cục, thời gian chờ nhân với `waitWeight`, số lần đưa nhầm, mức giao tiếp của nhân viên;
   - giá: bán cao hơn `referencePrice`, nhân với `priceSensitivity`;
   - `strictness`: khách khó tính chấm thấp hơn dù được phục vụ đúng;
   - trait theo ngữ cảnh: nhân viên hoạt ngôn làm khách hay hỏi vui hơn nhưng khách vội phiền hơn.
4. **Viết đánh giá hay không:** tung xác suất có seed, xác suất luôn ≤ 0,9. Mỗi đánh giá có sao, lời bình mẫu và **mã lý do** được phân nhóm theo nơi chịu trách nhiệm: `store` / `staff` / `customer` / `praise`.
5. **Sổ danh tiếng** tách làm hai:
   - cửa hàng: dùng trung bình Bayes (điểm mặc định 3,5 với trọng số 8), nên một hai đánh giá không làm điểm dao động mạnh;
   - cá nhân: chỉ tính đánh giá tốt, hoặc đánh giá thấp có lỗi thuộc nhóm `staff`. **Đánh giá thấp chỉ vì giá, hàng chờ hay khách khó tính không tính cho nhân viên.**
6. **Lượng khách** = 1 + (điểm − 3,5) × 0,2, chặn trong khoảng [0,75; 1,3]. Danh tiếng chỉ tác động lên số khách ghé, không làm tăng giá trị mỗi đơn. Khách đông hơn mà phục vụ không kịp thì hàng chờ sẽ đầy.
7. **Khiếu nại:** tự tạo khi đánh giá ≤ 2★. Có 3 cách phản hồi, cách hợp tình huống thì khả năng khách sửa đánh giá cao hơn:
   - xin lỗi: hợp khi lỗi thuộc về nhân viên;
   - giải thích: hợp khi khách chê giá hoặc kỳ vọng quá cao;
   - tặng phiếu giảm giá: tốn 10 xu.

   Phản hồi **không bao giờ xoá đánh giá** và tối đa chỉ nâng thêm 1★. Mỗi khiếu nại chỉ phản hồi được một lần.

Nội dung mới:
- archetype "Khách khó tính";
- giá tham khảo cho từng sản phẩm (kem chống nắng và nước rửa tay đang bán cao hơn giá tham khảo, cố ý để tạo tình huống chê giá);
- 3 trait nhân viên: Chăm chỉ, Cẩn thận, Hoạt ngôn.

Cổng kiểm duyệt nội dung chặn thêm lời bình nói về kết quả sức khoẻ, ví dụ "hết sốt", "dùng là khỏi" (xem `blocklist.healthOutcome`).

## 3d. Kinh tế idle, lưu game và offline (bước 5)

- **Ngày trong game** = 3 phút (`config.dayMs`). Cuối ngày (`economy.ts#endDayIfDue`):
  - trả lương cho từng NPC (Bình 12, Chi 25, Dũng 35 xu/ngày), nợ cũ trả trước;
  - thiếu xu thì **ghi nợ** (`worker.wageOwed`), không để tiền âm. Người bị nợ làm chậm 20% cho tới khi được trả đủ — hậu quả hiện rõ trong UI;
  - chốt `DayReport` (thu, nhập hàng, lương, đầu tư, lãi, khách, sao trung bình), giữ 7 ngày gần nhất, phát sự kiện `dayEnded`.
- **Giá bán** do người chơi đặt (`setPrice`, trong khoảng [giá vốn + 1; giá tham khảo × 1,5]). Giá được chốt vào đơn lúc thanh toán.
  - cao hơn giá tham khảo: khách nhạy giá chê (`price-high`, nhóm `store`, không tính cho nhân viên);
  - thấp hơn: khách nhạy giá vui hơn (`fair-price`), nhưng có trần +0,12 nên bán rẻ không phải "nút thắng".
- **Cho nghỉ việc** (`dismissStaff`): phải trả hết nợ lương, không nghỉ được khi đang phục vụ dở; quầy trả về người chơi.
- **Lưu game** (`save.ts`): file có `format` + `version`; save cũ được nâng cấp tuần tự (`MIGRATIONS`), config mới lấy giá trị mặc định. Save hỏng, không phải save, hoặc từ phiên bản mới hơn đều bị từ chối. Test xác nhận: lưu → tải → chạy tiếp cho kết quả trùng khớp tuyệt đối với không dừng.
  - Web: tự lưu mỗi 10 giây, khi ẩn tab và khi đóng trang; 2 ô luân phiên; save hỏng được cất riêng thay vì bị ghi đè. Có xuất/nhập file JSON và "Chơi lại từ đầu" (chạm hai lần).
- **Vắng mặt** (`offline.ts#runOffline`): chạy đúng mô phỏng (cùng NPC, luật, seed) cho thời gian đã trôi; trần hiện tại **10 phút** sau cân bằng bước 6. Áp dụng cả khi mở lại game lẫn khi quay lại tab. Nếu người chơi tự đứng quầy thì tiệm đóng cửa: thời gian không trôi, không mất khách, không trả lương. Hộp thoại "Chào mừng trở lại" tóm tắt trung thực, kể cả khách bỏ về và khiếu nại.
- **PWA:** `public/sw.js` tự viết (không thêm thư viện). Trang ưu tiên mạng, tài nguyên có hash dùng cache trước. Chỉ đăng ký ở bản build.

## 3e. Nội dung, âm thanh và hướng dẫn (bước 7)

- Danh mục có **20 sản phẩm** chăm sóc cá nhân/sơ cứu không kê đơn, **5 kiểu khách**. Mỗi món có hình SVG 40×48 riêng, một yêu cầu gọi tên và một yêu cầu theo nhu cầu sinh hoạt. Các kiểu khách có xu hướng lựa chọn, mức kiên nhẫn và cảm nhận giá khác nhau; mọi yêu cầu đều có thể xuất hiện.
- Kệ trong cảnh và khay phục vụ cùng xem **5 món mỗi trang**, có bộ chọn nhóm hàng dùng chung. Tab Kho lọc cùng nhóm nhưng liệt kê đầy đủ để kiểm tra hàng, hạn dùng và giá. Chạm và kéo thả vẫn dùng chung luật simulation.
- Âm thanh Web Audio có bật/tắt; bổ sung âm báo chuyển trang và khách quen quay lại. Hàng hết hạn có âm và cảnh báo giới hạn tần suất để không làm phiền.
- Lần đầu mở game có hướng dẫn 4 bước: giới thiệu/lưu ý nội dung, đọc yêu cầu, phục vụ/chăm kệ, khuyên đi khám và giao quầy. Nút thông tin mở lại hướng dẫn; người chơi có thể bỏ qua và truy cập bản lưu nhanh.
- Save v3 tự nâng lên v4: giữ nguyên tiền, hàng cũ, giá cũ và thêm hàng mẫu/giá mặc định cho 15 món mới. Cổng kiểm duyệt nội dung và test đảm bảo cả 20 món đều có yêu cầu xuất hiện được.
- Balance simulator 12 seed × 12 ngày với danh mục mới: lợi nhuận trung bình khoảng 174–178 xu/ngày theo nhân viên; trần offline 10 phút vẫn giữ phần thưởng dự kiến dưới 650 xu.

## 3f. Ca làm, mở/đóng cửa và tổng kết ngày

Lấy cảm hứng từ quy trình mở ca, giao ca và kết ca của nhà thuốc bán lẻ (không dùng tên chuỗi thật). Logic nằm ở `packages/simulation/src/shift.ts`.

- **Nhịp ngày** (`dayMs` = 4 phút, đồng hồ hiển thị 07:00–22:00): chuẩn bị (`prepMs` 15 s) → mở cửa → ca sáng → giao ca giữa ngày → ca chiều → đóng cửa (`closingMs` 15 s, không nhận khách mới, phục vụ nốt) → chốt sổ. Pha và ca suy ra từ thời gian trong ngày nên save/offline vẫn tất định. Ngày khai trương mở cửa ngay (không có pha chuẩn bị).
- **Chuẩn bị mở cửa:** 4 việc (nhận két, ghi nhiệt độ/độ ẩm, rà hàng cận hạn, bày kệ) bằng lệnh `completePrep`; `openStore` mở sớm. Hết giờ chuẩn bị thì tự mở. NPC đang đứng quầy tự làm lần lượt các việc. Làm đủ 4 việc: khách hao kiên nhẫn chậm hơn (`prepPatienceFactor` 0,9) trong ngày.
- **Ca và chấm công:** mỗi NPC có lịch ca (`setShifts`, ít nhất một ca); vào ca được ghi vào `shiftsToday`. Lương cuối ngày = lương trọn ngày × số ca đã vào / 2 (làm đủ hai ca bằng lương cũ). Ngoài ca thì làm nốt việc dở rồi nghỉ, không nhận quầy (`worker-off-duty`); lúc giao ca, quầy tự bàn giao cho NPC đang trong ca hoặc người chơi. Người chơi (quản lý) luôn có mặt.
- **Tổng kết ngày:** thêm giá vốn hàng bán, hàng hết hạn theo giá vốn, phiếu giảm giá, **lãi ròng** = doanh thu − giá vốn − lương − phiếu − hàng hết hạn (nhập hàng là dòng tiền, không phải lỗ); `profit` giữ nghĩa dòng tiền. Có thời gian chờ trung bình, số việc chuẩn bị, số liệu từng ca, điểm tiệm lúc chốt.
- **Xếp hạng ngày 1–3★** (`dayGoals`): lãi ròng dương; phục vụ đúng ≥ 85% khách; đánh giá trong ngày (hoặc điểm tiệm nếu chưa có) ≥ 4★. **Mốc sao cửa hàng** 4,0 / 4,3 / 4,6 (cần ≥ 10 đánh giá) chúc mừng một lần. Không có thưởng tiền, không có lệch két ngẫu nhiên.
- Web: đồng hồ + pha trên HUD, bảng chuẩn bị trong cảnh, dải "đóng cửa", hộp thoại tổng kết ngày (tạm dừng mô phỏng), sổ sách lãi ròng/biên lãi, nút lịch ca ở tab Nhân sự.
- Save v4 → v5: ngày đang dở coi như đã mở; nhân viên làm đủ hai ca; `dayMs` 3 phút cũ đổi sang 4 phút; báo cáo cũ để trống số liệu ca và hiển thị như dòng tiền.
- Balance 12 seed × 12 ngày: Bình 203,8; Chi 209,8; Dũng 208,2 xu/ngày (ngày 4 phút); vắng 35 phút ước tính 510–525 xu.
- **Chưa làm:** mệt mỏi khi làm ca kép (`morale`), thưởng theo xếp hạng ngày.

## 3g. Nhân viên: tuyển dụng, đặc điểm, tay nghề và mệt mỏi

Logic nằm ở `packages/simulation/src/recruit.ts` (sinh ứng viên, cấp độ, mệt mỏi) và nội dung ở `content/staff.ts`. Mọi random dùng luồng RNG riêng `staff`.

- **Một người một ca.** Nhân viên mới làm ca đang diễn ra nếu còn chỗ, không thì ca còn lại. Tối đa 4 nhân viên, 2 người mỗi ca (`maxStaff`, `maxPerShift`). Lương tính **theo ca** (`wage` = xu/ca). Ép làm cả hai ca được nhưng mệt thêm. Đầu mỗi ca, quầy người chơi đang giữ được giao cho NPC trong ca (người chơi lấy lại được bất cứ lúc nào).
- **Ứng viên hằng ngày:** 3 ô (`recruitSlots`), đổi mới mỗi sáng; ô **khoá** được giữ sang ngày sau. Làm mới có trả phí 15 xu, mỗi ngày một lần. Tên Việt hư cấu theo giới tính; 35% là dược sĩ (hiểu hàng hơn, lương cao hơn).
- **Độ hiếm** (màu trên thẻ): Thường 70% (xám), Khá 22% (xanh lá), Hiếm 7% (xanh dương), Huyền thoại 1% (vàng). Bậc cao có khoảng chỉ số cao hơn. Hiếm/Huyền thoại có một **đặc điểm ẩn** ("???", có thể tốt hoặc xấu), lộ ra khi hết ca làm đầu tiên nhưng có tác dụng ngay. Giá tuyển và lương chỉ tính theo phần nhìn thấy.
- **Đặc điểm** (tô màu: xanh có lợi, đỏ có hại, vàng vừa lợi vừa hại): Trâu bò (hai ca không mệt), Thần tài (20% đơn khách boa gấp đôi), Dẻo miệng (+hài lòng), Trí nhớ tốt (+hiểu hàng), Nhanh tay (+40% tốc độ), Được khách quen quý, Ngăn nắp (khách chờ bớt sốt ruột), Chăm chỉ, Cẩn thận, Hoạt ngôn, Tay nhanh hơn não (nhanh mà hay nhầm), Siêu lười (hay lướt điện thoại), Chậm hiểu, Nóng tính (khách kém hài lòng, lý do đánh giá "Thái độ chưa tốt"), Hay đi trễ (vào ca muộn 6 giây), Cầm nhầm tiền két (két thiếu 1–3 xu ở 15% lượt bán, hiện ở đối soát két cuối ngày). Không có đặc điểm bạo lực; "Nóng tính" thay cho ý tưởng "cục súc".
- **Tay nghề:** mỗi lượt bán đúng +1 kinh nghiệm, 10 cấp (`LEVEL_XP`), mỗi cấp +3% tốc độ, +0,02 hiểu hàng. Đánh giá thấp do lỗi của chính người đó: 10% khả năng mất 3 kinh nghiệm, không tụt cấp.
- **Mệt mỏi và xin nghỉ:** cuối ngày nghỉ −40, làm 1 ca −10, làm 2 ca +35 (Trâu bò −10). Chạm 100 thì xin thôi việc: **tăng lương giữ chân** (+20%, ít nhất +1 xu/ca, mệt về 30) hoặc cho nghỉ; hết ngày sau chưa quyết thì tự nghỉ (trả nợ lương nếu đủ xu).
- **Ngoại hình:** giới tính quyết định kiểu tóc (nữ: tóc ngang vai/búi/dài; nam: ngắn/rẽ ngôi/cắt sát) và lông mi. Dược sĩ mặc blouse trắng có bảng tên, nhân viên bán hàng mặc tạp dề xanh; không vẽ chữ thập. 3% ra ngoại hình "luộm thuộm" (tóc dựng, áo nhàu) chỉ để vui, không ảnh hưởng chỉ số.
- Save v5 → v6: một đặc điểm cũ thành danh sách; lương trọn ngày chia đôi thành lương ca (tổng mỗi ngày không đổi); kinh nghiệm bằng số lượt đã bán; sinh danh sách ứng viên khi tải.
- Balance 12 seed × 12 ngày, một người ca sáng + một người ca chiều: 205–211 xu/ngày, vắng 35 phút ước tính 513–526 xu; nhân viên đạt khoảng cấp 7 sau 12 ngày.

## 4. Nợ kỹ thuật và điều cần làm tiếp

- Bước 6 đã thêm kho theo lô: mỗi lô có số lượng và hạn theo thời gian game; lấy hàng theo hạn gần nhất trước, hàng hết hạn rời kệ. Món đã cầm mà hết hạn trước lúc thanh toán cũng bị loại và nhân viên phải chọn lại. Save v2 được nâng lên v3; hàng cũ nhận hạn mới, không bị mất.
- Khách từng được phục vụ có hồ sơ giữ diện mạo và số lần ghé. Khách hài lòng có thể quay lại sau ít nhất 1 ngày game; xác suất quay lại mặc định 30%, lấy từ luồng RNG khách nên replay vẫn tất định. Kho hồ sơ giữ tối đa 40 người.
- `npm run balance` chạy 3 kịch bản nhân viên qua nhiều seed (mặc định 12 seed × 12 ngày), báo lợi nhuận, lượt bán, khách bỏ về, hàng hết hạn, khiếu nại và khách quen. Có thể chỉnh bằng biến `BALANCE_SEEDS` và `BALANCE_DAYS`.
- Đo 12 seed × 12 ngày: Bình 167,1; Chi 170,6; Dũng 161,5 xu/ngày. Trần vắng mặt giảm từ 1 giờ xuống **10 phút**, nên lượt 35 phút dự kiến khoảng 540–570 xu thay vì ~2000 xu. Save cũ dùng trần mặc định 1 giờ được chuyển sang mức mới. Kết quả thật phụ thuộc tồn kho và danh tiếng từng ván.
- Khiếu nại chưa xử lý tự đóng sau 2 ngày game, không xóa hay sửa đánh giá. Hộp thoại vắng mặt báo số khiếu nại còn mở.
- Cần tiếp tục đo trên nhiều cấu hình giá bán, nâng cấp và các seed bất lợi để cân bằng sâu hơn. Hạn dùng hiện là một thời hạn chung cho mọi sản phẩm, có thể tách riêng theo mặt hàng ở bước nội dung.
- `commandLog` chỉ giữ 5000 lệnh gần nhất: `replay` dùng cho debug phiên ngắn, không cho cả ván dài.
