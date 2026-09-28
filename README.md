# Tiệm thuốc Bồ Công Anh — Idle Pharmacy (prototype)

Game mô phỏng quản lý tiệm thuốc **hư cấu**, ưu tiên web và điện thoại dọc, thích ứng tablet ngang.
Không phải công cụ y tế. Xem thêm [`docs/spec-v1.1.md`](docs/spec-v1.1.md) và [`docs/content-rules.md`](docs/content-rules.md).
Quy ước giao diện và art cho các bước tiếp theo: [`docs/ui-style.md`](docs/ui-style.md).

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173
npm run check      # typecheck + lint + test (gồm cổng kiểm duyệt nội dung)
npm run content:check  # chỉ chạy kiểm duyệt nội dung (blocklist, triệu chứng → refer, tên thuốc/liều)
npm run build      # build tĩnh vào apps/web/dist (base tương đối, chạy được trên GitHub Pages)
npm run balance    # mô phỏng 3 kịch bản nhân viên qua nhiều seed để kiểm tra kinh tế
```

## Cấu trúc

```text
packages/simulation/   TypeScript thuần: không React, không DOM, không Math.random/Date.now (ESLint chặn)
  src/content/         Dữ liệu hư cấu: sản phẩm, yêu cầu khách, archetype
  src/commands.ts      Lệnh + kiểm tra dùng chung cho người chơi và NPC
  src/tick.ts          Một bước mô phỏng cố định (100 ms)
  src/ai.ts            NPC: FSM phục vụ + chọn việc theo utility, chỉ gửi Command như người chơi
  src/reputation.ts    Nhật ký lượt khách → hiệu suất nghiệp vụ / sao công khai / danh tiếng, khiếu nại
  src/economy.ts       Ngày, lương, giá bán, tổng kết ngày
  src/save.ts          Định dạng save có phiên bản + migration + kiểm tra cấu trúc
  src/offline.ts       Chạy bù thời gian vắng mặt bằng chính mô phỏng (có trần)
  src/stock.ts         Kho theo lô, lấy lô gần hết hạn trước và thu hồi hàng hết hạn
  src/loyalty.ts       Hồ sơ khách quay lại, giữ nguyên diện mạo và lịch sử ghé tiệm
  tests/               Tất định, kho không âm, luật an toàn…
apps/web/              Vite + React + SVG
  src/game/GameBridge  Vòng lặp fixed-step, dừng khi tab ẩn, tự lưu, chạy bù khi quay lại; UI chỉ đọc snapshot và gửi Command
  src/game/persistence localStorage 2 ô luân phiên, xuất/nhập file
  public/sw.js         Service worker (chơi được khi mất mạng, chỉ ở bản build)
  src/art/             Art SVG gốc: nhân vật + biểu cảm, sản phẩm, nội thất, icon
  src/features/        Cửa hàng (cảnh + mini game bán hàng), kho, nhân sự
docs/                  Spec v1.1, checklist nội dung/policy
tools/balance-sim.test.ts  Mô phỏng cân bằng nhiều seed, chạy riêng bằng npm run balance
```

Mọi số cân bằng (giá, thời gian, kiên nhẫn) là **giá trị tạm thời** nằm trong `packages/simulation/src/config.ts` và `content/`.
