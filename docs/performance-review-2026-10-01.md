# Rà soát hiệu năng game — 01/10/2026

Code được rà: `3832adf` trên `main`. Phạm vi: luồng tick → publish → React → SVG/HTML/CSS, kéo thả, lưu game và chạy bù offline. Báo cáo này không thay đổi runtime hoặc luật chơi.

## Kết luận từ số đo

Trong các kịch bản nhỏ đã đo, phần mô phỏng rất rẻ. Phần hiển thị tạo tải liên tục đáng kể: animation/transition, render toàn cây ở 10 Hz và đo geometry bong bóng thoại. Cảnh bị che trong tab quản lý trên điện thoại vẫn được cập nhật. Đây là những điểm cần tối ưu trước.

Chưa đo nhiệt độ, công suất GPU, mức pin hoặc CPU toàn hệ thống trên thiết bị thật. Không thể khẳng định một điểm duy nhất gây nóng máy, hay suy ra tỷ lệ người chơi bị ảnh hưởng.

## Phương pháp và giới hạn

- Windows, Intel Core i5-8400, Node 24.16.0, Chrome headless 154.0.8037.58.
- `npm run build` thành công. Đo bản production, không dùng chi phí StrictMode của bản dev làm baseline.
- Chrome dùng profile thử nghiệm riêng; không truy cập bản lưu thật. Viewport 390 × 844, DPR 1, chế độ mobile emulation. Âm thanh tắt.
- Fixture seed 42, tiền thử nghiệm 10.000 xu, bắt đầu đo từ khoảng giây thứ 22 của game. Hai fixture: người chơi đứng quầy nhưng không thao tác; một NPC Bình đứng quầy, được xếp cả hai ca. Fixture NPC dùng hồ sơ cố định dành cho test của repo.
- Mỗi kịch bản trình duyệt chạy 8 giây sau 1,5 giây ổn định. Mỗi kịch bản nạp lại cùng fixture. Baseline và thí nghiệm tắt animation/transition được lặp lại một lần. Các thí nghiệm tắt từng nhóm khác chỉ đo một lần, dùng để định hướng, không coi là benchmark thống kê.
- Đếm React commit bằng hook DevTools; đếm callback rAF và lượt đọc `getBoundingClientRect`, `offsetWidth`, `offsetHeight` bằng instrumentation nhỏ.
- Chỉ số “luồng chính bận” = chênh lệch CDP `TaskDuration` / thời gian đo. Đây không phải phần trăm CPU Task Manager, cũng không bao gồm mọi công việc GPU, compositor hoặc browser process.
- Trong cửa sổ đo không có long task trên 50 ms hoặc lỗi runtime. Điều này không chứng minh tiết kiệm điện: nhiều tác vụ ngắn vẫn tạo tải liên tục.
- Không đo phiên chơi dài, nhiều nhân viên, bộ sưu tập đầy, DPR cao, màn hình 120 Hz, Android hoặc Safari iOS. Các số đo desktop không thay thế kiểm tra thiết bị thật.

Số liệu gốc: [trình duyệt](performance-browser-results.json), [mô phỏng](performance-simulation-results.json).

## Số liệu đáng chú ý

- Cửa hàng, người chơi không thao tác: luồng chính bận **16,39%**, lần lặp **14,46%**. Có 17 animation/transition đang chạy lúc bắt đầu đo, khoảng 60 callback rAF/giây, 10 React commit/giây và 60 lượt đọc geometry/giây.
- Tắt thử toàn bộ animation và transition bằng CSS: còn **4,09%**, lần lặp **3,82%**. React vẫn commit khoảng 10 lần/giây và vẫn đọc geometry. Mức giảm trong hai cặp đo khoảng **74–75%**; đây là tác động của thí nghiệm tắt toàn bộ chuyển động, không phải hiệu quả đã đạt được của một bản tối ưu giữ nguyên hình ảnh.
- Tắt riêng transition: **10,97%**; tắt animation bảng hiệu: **12,30%**; tắt filter: **13,30%**; tắt bob của nhân vật: **14,51%**. Các phép đo đơn này cho thấy nhiều nhóm cùng góp tải; không đủ để cộng các mức giảm hoặc quy toàn bộ vấn đề cho một filter.
- NPC ở cửa hàng: **10,45%**. Mở tab Kho trên màn hình hẹp: **8,11%**, vẫn có 18 animation/transition được trình duyệt báo đang chạy, khoảng 10–11 commit/giây và 42 lượt đọc geometry/giây. API báo animation chạy không có nghĩa mọi animation đều được vẽ ra màn hình.
- Cùng tab Kho nhưng tạm áp CSS `display:none` cho cảnh: **4,71%**. React và geometry reads vẫn tồn tại; chỉ ẩn DOM chưa giải quyết việc chạy logic giao diện.
- Tạm dừng bằng nút thật: **0,62%**, 0 callback rAF game, 0 React commit và 0 lượt đọc geometry trong cửa sổ đo. Vẫn còn 4 animation/transition. Tắt thêm chuyển động: **0,02%**. Pause hiện tại đã giảm tải mạnh.
- 6.000 tick, tương đương 10 phút game, chạy trong Node: median **19,75 ms** với người chơi không thao tác và **25,14 ms** với một NPC, qua 7 lượt mỗi fixture. NPC bán 20 đơn; cả hai tiến đến ngày 3, không bị `pendingTransfer` chặn.
- Chạy bù offline 10 phút với một NPC: **26,75 ms** trong một lượt. Tạo save, clone và stringify: trung bình **0,56–0,92 ms** qua 100 lượt; JSON khoảng 30–39 KB. Không bao gồm thời gian ghi `localStorage`.

## Các điểm cần sửa, theo thứ tự

### 1. Giảm công việc hiển thị liên tục và bỏ animation làm thay đổi layout

Nguồn: [styles.css](../apps/web/src/styles.css#L263), [scene.css](../apps/web/src/features/store/scene.css#L184), [scene.css — bảng hiệu](../apps/web/src/features/store/scene.css#L405), [StoreScene.tsx](../apps/web/src/features/store/StoreScene.tsx#L629), [collectibles.css](../apps/web/src/art/collectibles.css), [delivery.css](../apps/web/src/features/delivery/delivery.css#L132).

Mỗi nhân vật có `.bob` chạy vô hạn. Bảng hiệu nhấp nháy và animate `drop-shadow`; highlight nhân vật dùng nhiều `feMorphology`, `feComposite`, `feGaussianBlur`, đồng thời vẽ lại một bản nhân vật phía dưới. Trang bị và trạng thái giao hàng bổ sung animation riêng.

Thanh kiên nhẫn/progress dùng `transition: width 120ms`, trong khi dữ liệu cập nhật mỗi 100 ms. Khi giá trị thay đổi liên tục, transition mới bắt đầu trước khi transition cũ kết thúc. Phần HTML có thể phải layout liên tục; SVG cũng có chi phí cập nhật/vẽ riêng. Thí nghiệm bỏ transition giảm tải trong cửa sổ đã đo.

Đề xuất:

- Thanh HTML giữ chiều rộng cố định; phần fill dùng `transform: scaleX(...)` với gốc trái. Thanh SVG dùng hình đơn giản và transform phù hợp; đo lại trên Safari vì không phải mọi transform SVG đều được compositor xử lý.
- Bảng hiệu giữ glow tĩnh, hoặc chỉ nháy ngắn lúc mở/đóng cửa. Highlight ưu tiên outline/ellipse/shape đơn giản quanh người; tránh nhân đôi cả cây nhân vật chỉ để làm viền.
- Animation xuất hiện, di chuyển đến quầy và phản hồi thao tác vẫn giữ mượt; giảm chuyển động trang trí vô hạn khi nhân vật chờ. Không tăng duration rồi giả định tải sẽ giảm: animation chậm vẫn có thể được lấy mẫu mỗi frame.
- Thêm tùy chọn giảm hiệu ứng riêng của game và tôn trọng `prefers-reduced-motion` hiện có. Không cần hạ chất lượng mọi phần của game cùng lúc.
- Khi che cảnh hoặc pause, dừng animation trang trí của cảnh. Hiện `StoreScene` chỉ nhận `userPaused`, chưa nhận toàn bộ trạng thái pause vì hộp thoại.
- Khi tắt animation hoặc unmount cảnh, hiệu ứng `Floaters` cần TTL/cleanup độc lập: hiện chúng chỉ bị xóa qua `onAnimationEnd` và `floaters` không có trần. Đây là rủi ro cần xử lý khi tối ưu, không phải kết luận rò bộ nhớ ở chế độ mặc định. CSS reduced-motion hiện dùng duration 1 ms cho các hiệu ứng chung, nên không được đánh đồng với việc đặt `animation:none` toàn bộ.

Nguyên tắc tránh animate các thuộc tính kích thước được mô tả trong [Animations and performance — web.dev](https://web.dev/articles/animations-and-performance). Với SVG/filter cần xác minh bằng trace thực tế, không giả định CSS đồng nghĩa chạy hoàn toàn trên GPU.

### 2. Cảnh không nhìn thấy phải ngừng render và đo DOM

Nguồn: [App.tsx](../apps/web/src/App.tsx#L187), [theme.css](../apps/web/src/ui/theme.css#L1587).

`StoreScene`, `OpeningPanel`, `SceneShortcuts` và `ServiceTray` luôn nằm trong cây React. Trên điện thoại khi chuyển sang Kho/Nhân sự, CSS chỉ đặt `visibility:hidden` cho cảnh. Tick vẫn truyền state xuống, xử lý nhân vật, trang bị, lời thoại và layout bong bóng.

Đề xuất: dùng một trạng thái `sceneVisible` theo breakpoint và tab; unsubscribe hoặc unmount phần cảnh khi bị che hoàn toàn. Giữ mô phỏng chạy để NPC tiếp tục làm việc. Trên desktop có cảnh ở cột trái thì vẫn hiển thị và cập nhật. Khi quay lại, đọc snapshot mới nhất và tiếp tục; không phát lại hàng loạt hiệu ứng đã hết hạn. Toast, event feedback và dữ liệu chọn quầy cần sống ở tầng phù hợp, không vô tình mất cùng cảnh.

`display:none` là cải thiện nhỏ có thể làm trước; để giảm cả JavaScript cần ngừng render/đo DOM, không chỉ thay CSS.

### 3. Tách nhịp mô phỏng khỏi nhịp cập nhật từng phần UI

Nguồn: [GameBridge.ts](../apps/web/src/game/GameBridge.ts#L138), [useGame.ts](../apps/web/src/game/useGame.ts#L19), [App.tsx](../apps/web/src/App.tsx#L127).

Tick cố định 100 ms đã hợp lý cho luật game. Vấn đề là `publish()` tăng một version toàn cục; `App` đăng ký version này rồi truyền state cho gần như toàn bộ giao diện. Tiền, kho, danh sách nhân viên, đồ sưu tầm và hình SVG có thể chạy lại dù dữ liệu hiển thị của chúng không đổi. Một số nội thất tĩnh đã `memo`, nhưng phần động và panel vẫn chịu nhịp này.

Đề xuất:

- `App` chủ yếu quản lý bố cục và trạng thái hộp thoại; từng vùng đăng ký dữ liệu cần dùng.
- Tiền/kho/collection/review chỉ đổi khi dữ liệu liên quan thay đổi. HUD giờ có thể lấy giá trị đã làm tròn, cập nhật tối đa khoảng 1 Hz nếu độ chính xác hiển thị cho phép.
- Timer và thanh kiên nhẫn giữ nhịp riêng khoảng 5–10 Hz, nằm trong component nhỏ. Tư thế, biểu cảm và vị trí nhân vật cập nhật khi giá trị tương ứng đổi; di chuyển mượt bằng transition phù hợp.
- Lệnh người chơi và sự kiện thay đổi trạng thái phục vụ phải phản hồi ngay, không đợi một bộ throttle chậm áp lên toàn UI.
- Tạo view model nhỏ, bất biến và có cache; chỉ tạo lại branch đã đổi. Không deep-clone toàn bộ SimState mỗi tick để đổi lấy memoization.

**Lưu ý correctness:** [Simulation.snapshot](../packages/simulation/src/simulation.ts#L34) trả cùng một object state bị mutate tại chỗ. Thêm `memo(Component)` với prop `state` hoặc `useMemo(...,[state])` có thể khiến UI không cập nhật. Selector trả `state.workers`/một worker mutable cũng không đủ. Cần primitive snapshot, view model bất biến đã cache hoặc revision theo domain, đồng thời kiểm tra dữ liệu nào làm invalidation. [React yêu cầu snapshot của external store bất biến và có cache](https://react.dev/reference/react/useSyncExternalStore).

### 4. Chỉ tính lại vị trí bong bóng khi geometry hoặc nội dung thật sự đổi

Nguồn: [SceneOverlay.tsx](../apps/web/src/features/store/SceneOverlay.tsx#L170), [SceneOverlay.tsx](../apps/web/src/features/store/SceneOverlay.tsx#L229), [SceneOverlay.tsx](../apps/web/src/features/store/SceneOverlay.tsx#L283).

`geometry` được tạo thành mảng mới mỗi render và là dependency của `useLayoutEffect`. Vì vậy effect chạy mỗi tick, đọc kích thước bong bóng và vị trí overlay/nút tắt, rồi tính chống chồng lấn. `sameShifts` ngăn cập nhật state không cần thiết nhưng không ngăn các phép đo trước đó. Benchmark xác nhận 480 lượt đọc geometry trong 8 giây ở fixture người chơi.

Đọc geometry không luôn gây một layout mới; nếu DOM/layout đang dirty, nó có thể buộc layout đồng bộ. Không nên quy toàn bộ 60 layout/giây trong baseline cho effect này, vì animation cũng đóng góp. Cơ chế được giải thích trong [Avoid large, complex layouts and layout thrashing — web.dev](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing).

Đề xuất: cache geometry theo vị trí, nội dung thoại, compact mode, kích thước viewport và obstacle thực tế. Dùng `ResizeObserver` cho đổi kích thước; invalidation khi chữ/font tải xong, thay lời thoại hoặc số quầy đổi. Timer/progress đổi không nên làm tính lại bố cục nếu kích thước bong bóng không đổi. Gom lượt đọc trước lượt ghi; tuyệt đối bỏ effect khi cảnh không nhìn thấy.

### 5. Tách tọa độ kéo thả khỏi cảnh SVG

Nguồn: [drag.ts](../apps/web/src/ui/drag.ts#L41), [StoreScene.tsx](../apps/web/src/features/store/StoreScene.tsx#L230), [DragGhost](../apps/web/src/App.tsx#L1085).

Mỗi `pointermove` gọi hit-test và `setDrag` với object mới. `StoreScene` đăng ký toàn bộ object `drag`, nên đổi tọa độ con trỏ cũng làm cảnh chạy lại. Đây là đường gây giật khi thao tác; chưa đo trong benchmark đứng yên.

Đề xuất: gom tọa độ theo tối đa một rAF trong lúc kéo; Ghost chỉ cập nhật transform, artwork của Ghost không dựng lại theo tọa độ. Cảnh chỉ đọc `productId`, `target` và `over`, không đọc x/y. Hit-test và phản hồi trạng thái thả cập nhật khi cần. `pointerup` dùng tọa độ cuối cùng thật, flush/cancel rAF pending để tránh rơi sai quầy.

### 6. Giảm wake-up của bộ lập lịch mô phỏng

Nguồn: [GameBridge.frame](../apps/web/src/game/GameBridge.ts#L138).

Loop vẫn gọi rAF khoảng 60 lần/giây để tích lũy thời gian, dù chỉ có 10 tick/giây. Trên màn hình 120 Hz callback có thể tăng theo refresh rate. Callback tự nó nhỏ, nên xếp sau các cải thiện hiển thị đã có bằng chứng mạnh hơn.

Có thể dùng timer theo deadline 100 ms, đo elapsed bằng `performance.now()` và vẫn chạy fixed-step/catch-up có trần. Giữ `tickMs`, thứ tự RNG và luật chơi. Không đổi tick thành 500–1.000 ms chỉ để giảm CPU: timer phục vụ, kiên nhẫn, AI và kết quả game có thể thay đổi. Animation CSS/di chuyển không cần bị buộc cùng nhịp với mô phỏng.

### 7. Các tối ưu sau, tùy trace thiết bị thật

- **Autosave:** hiện chạy 10 giây/lần, kể cả state không đổi. `createSave` clone qua JSON rồi persistence stringify thêm một lượt. Save nhỏ và chi phí serialize đã đo dưới 1 ms nên chưa phải ưu tiên đầu. Có thể thêm dirty tracking và scheduler phù hợp, nhưng phải giữ timestamp offline đúng ở lifecycle/ẩn tab/pause, hai slot an toàn và giới hạn mất tiến trình. Không tự động đổi sang IndexedDB hoặc nới khoảng lưu vài phút chỉ để giảm tải.
- **Offline:** 6.000 tick chạy đồng bộ trên main thread lúc nạp/quay lại. Desktop đo khoảng 27 ms; điện thoại chậm hoặc tiệm lớn có thể thành long task. Nếu trace xác nhận, chạy theo chunk budget khoảng 4–8 ms hoặc worker. Phải chặn lệnh/re-entry trong lúc catch-up và chỉ publish khi có state nhất quán. Worker cải thiện responsiveness, không mặc nhiên làm giảm tổng năng lượng.
- **AI và bonus đồ:** `chooseTask` có thể dựng candidate list mỗi tick lúc nhân viên chờ; `collectionBonus` và `wornItemOf` lặp tìm item theo uid. Lập chỉ mục uid và gom derived data dùng chung theo tick/domain sẽ giúp tiệm lớn. Collection bị giới hạn 30 item nên ưu tiên thấp hơn render. Cache bonus phải invalidation theo thay đổi ca, nhân viên tới/nghỉ và trang bị; không cache vĩnh viễn theo tham chiếu mutable.
- **Audio/hiệu ứng cột mốc:** AudioContext được mở ở cử chỉ đầu, chưa có chính sách suspend khi mute/ẩn. Confetti là burst theo sự kiện, không phải vòng nền thường trực. Có thể suspend/resume đúng lifecycle, giới hạn hiệu ứng và dùng worker cho confetti nếu có lợi; chưa có số đo chứng minh đây là nguồn tải chính.
- **Các phép tính nhỏ:** tái sử dụng `Intl.NumberFormat`, catalog/layout dựa trên primitive dependency và các bản art trang bị không đổi. Không dành công sức micro-optimize trước những điểm trên.

## Những phần hiện tại đã làm tốt

- Tab trình duyệt ẩn hủy rAF và lưu; pause hủy loop. Cần giữ cơ chế này.
- Tick 100 ms, tối đa 10 tick chạy bù/frame; chưa thấy loop mô phỏng vô hạn.
- Snapshot không bị deep-clone mỗi frame.
- Nội thất tĩnh có memo; panel nặng được lazy-load và chỉ tab quản lý hiện tại được chọn render.
- Đơn hoàn thành được dọn, khách rời được xóa; lịch sử review/interactions/complaints/day report và loyalty có trần, collection 30 item, command log 5.000. Chưa có bằng chứng dữ liệu simulation tăng vô hạn trong luồng đã rà.
- Ranking không có polling liên tục; effect dựa vào bảng, ngày đã chốt và identity. Việc dùng mutable state trong dependency phải được xem lại nếu thiết kế snapshot đổi, nhưng không nên gọi nó là request chạy mỗi tick ở code hiện tại.

## Thứ tự triển khai và tiêu chí kiểm chứng

1. Bỏ transition kích thước và giảm filter/animation vô hạn; xử lý cleanup hiệu ứng. Đo lại với đủ animation cần thiết cho gameplay.
2. Ngừng render/đo cảnh khi bị che hoàn toàn trên mobile; giữ cảnh desktop và mô phỏng NPC đúng.
3. Tách subscription/view model và cache bố cục bong bóng; tách tọa độ drag khỏi scene.
4. Sau đó giảm wake-up scheduler, tối ưu autosave và cân nhắc chunk/worker offline theo số đo.

Mục tiêu nghiệm thu là giảm tải mà giữ phản hồi và luật game: tab Kho không đo geometry cảnh; kho/collection không render vì timer không liên quan; kéo thả phản hồi theo frame và thả đúng quầy; animation không làm layout liên tục; pause không còn chuyển động trang trí thường trực. Không đặt một phần trăm CPU chung cho mọi thiết bị.

Kiểm tra sau mỗi thay đổi: snapshot/event cùng seed với số tick cố định, online/offline nhất quán, đổi ca/hết hạn hàng đúng, tránh UI stale do memo, quay lại tab cập nhật ngay, cleanup timer/effect và autosave/lifecycle an toàn. Chạy typecheck/lint/test/build cho patch thực tế.

Đo production 10–15 phút trên ít nhất một Android phổ thông và iPhone/Safari: người chơi thao tác, NPC tự bán, tab quản lý, pause, tab nền và quay lại offline. Giữ cùng độ sáng/thiết lập/fixture để so sánh trước–sau. Theo dõi CPU/GPU, FPS/frame time, long task, DOM/heap, công suất hoặc mức pin và nhiệt độ nếu thiết bị cho phép. Benchmark hiện tại giúp chọn việc cần làm trước; chưa chứng minh mức giảm nhiệt trên các máy đó.
