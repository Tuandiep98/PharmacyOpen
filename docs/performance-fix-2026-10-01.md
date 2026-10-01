# Tối ưu tải của game — 01/10/2026

Đã triển khai các ưu tiên có bằng chứng trong [bản rà soát](performance-review-2026-10-01.md). Giữ tick mô phỏng 100 ms và luật chơi; giảm công việc hiển thị, đo bố cục và wake-up không cần thiết.

## Thay đổi

- Nhân vật không còn lắc liên tục khi đứng yên; bảng hiệu giữ màu theo trạng thái mà không chạy đèn/filter liên tục. Hiệu ứng trang trí chỉ chạy một lượt. Viền chọn nhân vật/quầy dùng hình đơn giản, không nhân đôi artwork để tạo blur.
- Thanh tiến trình dùng `scaleX`; thanh kiên nhẫn SVG dùng transform. Bỏ transition kích thước và tween vòng tiến trình HUD gây repaint thường xuyên.
- Cảnh, bảng mở cửa, nút tắt và khay phục vụ được unmount khi mở tab quản lý trên màn hình dưới 820 px hoặc cao dưới 561 px. NPC vẫn hoạt động. Desktop còn nhìn thấy cảnh thì tiếp tục cập nhật.
- Root app, HUD, navigation và panel quản lý đăng ký primitive signal có cache theo revision. Timer phục vụ giữ 10 Hz, lệnh phản hồi ngay; HUD giờ cập nhật theo giây. Artwork nhân viên cache các giá trị hiển thị, không memo theo object worker mutable. Không deep-clone toàn state mỗi tick.
- Bong bóng chỉ đo lại khi vị trí/nội dung/kích thước thay đổi. ResizeObserver theo dõi bong bóng và cụm nút để xử lý font, resize và nút Đơn ship mới xuất hiện. Timer/progress không làm đo lại bố cục.
- Kéo thả gom pointermove theo một rAF; cảnh chỉ nhận sản phẩm/vùng thả, Ghost nhận tọa độ. Pointerup đọc tọa độ cuối cùng và hủy rAF còn chờ; lọc pointerId, dọn khi cancel/blur.
- Scheduler dùng timer tới deadline tick, đo elapsed bằng performance.now và giới hạn chạy bù 10 tick/lần. Pause/ẩn tab hủy loop; tiếp tục và offline giữ cơ chế hiện có.
- Autosave 10 giây chỉ ghi khi revision thay đổi; pagehide/visibility vẫn lưu để cập nhật mốc thời gian offline. Ghi lỗi sẽ thử lại. Serialization trực tiếp giữ định dạng và hai slot dự phòng; createSave vẫn trả bản sao độc lập.
- Offline chỉ chép các bộ đếm cần so sánh, thay vì clone toàn state trước chạy bù. Âm thanh suspend khi mute/ẩn; các audio node tự ngắt kết nối sau khi phát xong. Confetti dùng worker khi được hỗ trợ và số hạt có giới hạn.
- Menu có **Giảm hiệu ứng**, lưu theo thiết bị và phối hợp với prefers-reduced-motion. Floater có TTL 1,6 giây và tối đa 12 phần tử, kể cả khi cảnh bị unmount hoặc animation tắt.

## Số đo đối chứng

Dữ liệu: [performance-fix-browser-results.json](performance-fix-browser-results.json). Bản trước là production build từ commit 3832adf; bản sau chạy cùng fixture seed 42, bắt đầu ở giây 22, trên cùng Chrome headless, viewport 390×844, DPR 1, tắt âm thanh. Mỗi lượt đo 8 giây sau warm-up 1,5 giây; cảnh người chơi được đo lặp lại.

Đại lượng là **thời gian renderer main thread bận / thời gian đo**, không phải phần trăm CPU hệ thống, điện năng hay nhiệt độ điện thoại.

| Luồng                 |  Trước |   Sau | Giảm tương đối |
| --------------------- | -----: | ----: | -------------: |
| Người chơi ở cửa hàng | 12,35% | 2,28% |          81,5% |
| Người chơi, lượt lặp  | 12,06% | 2,19% |          81,8% |
| NPC ở cửa hàng        |  8,91% | 1,28% |          85,6% |
| NPC, tab Kho mobile   |  6,56% | 0,61% |          90,7% |
| Tạm dừng              |  0,87% | 0,02% |          97,7% |

Trong cửa hàng người chơi, 8 giây vẫn có 80 React commits phục vụ timer, nhưng rAF đăng ký từ 453 về 0, geometry reads từ 480 về 0; layout count từ 452 về 80, layout duration từ khoảng 92 ms về 1,8 ms. NPC chỉ đo geometry khi nội dung thay đổi. Tab Kho có 10 commits thay vì 86, không còn scene SVG hay geometry reads; NPC vẫn chạy. Pause không có running animation, React commit hoặc layout trong cửa sổ đo.

Không có exception hoặc long task trên 50 ms trong các lượt đo ngắn này. Số đo không chứng minh mức giảm nhiệt/pin trên Android/iPhone hoặc trong phiên chơi dài. Chế độ Giảm hiệu ứng không cần cải thiện thêm rõ rệt ở fixture đang đứng yên, vì các vòng trang trí nền đã được loại bỏ ở chế độ thường.

## Kiểm chứng và chạy lại

- 164 tests qua, gồm snapshot/event NPC tương đương fixed-step trực tiếp; pause/resume; hidden/offline; giới hạn tick chạy bù; autosave/ghi lỗi; selector với state mutate tại chỗ; kéo/thả/cancel/nhiều ngón; TTL và giới hạn floater; định dạng save tương đương.
- Typecheck, lint và production build qua. Kiểm tra hình cảnh trên mobile bằng screenshot.
- Browser xác nhận tab Kho cập nhật sau lệnh đổi giá, bỏ cảnh khi bị che, dựng lại khi quay về; breakpoint 375×812, 844×390 và 1280×900; pause, reduced motion của OS và nút Giảm hiệu ứng có lưu preference. Sau lượt đo đối chứng, thêm theo dõi resize của cụm shortcut và chạy kiểm tra UI ngắn trên bản cuối.

Chạy từ root repository:

```powershell
npm run check
npm run build
node tools/performance-browser-audit.mjs
```

Để đo đối chứng, lưu thư mục dist của bản trước ngoài cây source rồi truyền đường dẫn làm đối số cho script. Script dùng Chrome cài tại đường dẫn mặc định Windows; có thể đặt CHROME_PATH, cần cổng 4189 và 9237 trống. Profile Chrome được tạo riêng và tự dọn; không đọc save hoặc profile thật của người chơi.

Chưa đổi tần suất AI/RNG hoặc đưa toàn mô phỏng sang worker. Rà soát trước đo 6.000 tick offline khoảng 27 ms trên máy này; chunk/worker cần trace điện thoại để quyết định. Đây là các đề xuất có điều kiện, không phải nguồn nóng máy đã được chứng minh cần thay trong patch này.
