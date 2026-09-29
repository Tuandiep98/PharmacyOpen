import type { UpgradeDef } from './types';

// Mỗi nâng cấp có đánh đổi rõ ràng, không chỉ là hệ số tốc độ. Giá là giá trị cân bằng tạm thời.
export const UPGRADES: Record<string, UpgradeDef> = {
  'counter-2': {
    id: 'counter-2',
    name: 'Quầy bán thứ hai',
    benefit: 'Phục vụ hai khách cùng lúc; thêm 1 chỗ nhân viên mỗi ca để đứng quầy mới.',
    tradeoff: 'Cần thêm một nhân viên; quầy trống không nhận khách.',
    cost: 260,
    effects: [{ type: 'counter' }, { type: 'staff', perShift: 1, reserve: 0 }],
  },
  scanner: {
    id: 'scanner',
    name: 'Máy quét mã vạch',
    benefit: 'Thanh toán nhanh gấp đôi.',
    tradeoff: 'Không tăng số khách phục vụ cùng lúc.',
    cost: 90,
    effects: [{ type: 'scale', key: 'checkoutMs', factor: 0.5 }],
  },
  'sorted-shelf': {
    id: 'sorted-shelf',
    name: 'Sắp kệ theo nhóm hàng',
    benefit: 'Gom hàng theo nhóm, thêm 2 ô trưng bày mỗi trang; lấy hàng nhanh hơn 25%.',
    tradeoff: 'Không giúp nếu kệ hết hàng.',
    cost: 140,
    effects: [{ type: 'scale', key: 'retrieveMs', factor: 0.75 }],
  },
  'wide-shelf': {
    id: 'wide-shelf',
    name: 'Kệ rộng hơn',
    benefit: 'Mỗi ô kệ chứa thêm 2 món, ít phải nhập hàng.',
    tradeoff: 'Lấp đầy kệ tốn nhiều xu hơn một lúc.',
    cost: 120,
    effects: [{ type: 'shelfCapacity', add: 2 }],
  },
  bench: {
    id: 'bench',
    name: 'Ghế chờ',
    benefit: 'Khách xếp hàng kiên nhẫn hơn 30%, hàng chờ thêm 1 chỗ.',
    tradeoff: 'Hàng dài hơn nghĩa là khách cuối chờ lâu hơn.',
    cost: 150,
    effects: [{ type: 'queue', addMax: 1, patienceFactor: 0.7 }],
  },
  signboard: {
    id: 'signboard',
    name: 'Biển hiệu sáng đèn',
    benefit: 'Khách ghé thường xuyên hơn 25%.',
    tradeoff: 'Nếu phục vụ không kịp, hàng chờ đầy và khách bỏ đi.',
    cost: 200,
    effects: [{ type: 'spawnInterval', factor: 0.75 }],
  },
};

// Giá tăng nhanh hơn lợi ích tuyến tính để các mốc cao là lựa chọn quản lý, không phải mua ngay khi đủ xu.
const facilityCosts = [0, 0, 65, 145, 270, 430];
/**
 * Cửa hàng rộng hơn thì có chỗ cho nhiều nhân viên hơn. Lộ trình (cùng Quầy 2) dẫn tới tự động hoá:
 * đầu game 1 người/ca → cấp 2 thêm người kho → Quầy 2 thêm người quầy → cấp 4 thêm người hỗ trợ;
 * cấp 3 và 5 thêm người dự phòng để luân phiên cho nghỉ mà ca vẫn đủ người.
 */
const storefrontStaff: Record<number, { perShift: number; reserve: number }> = {
  2: { perShift: 1, reserve: 0 },
  3: { perShift: 0, reserve: 1 },
  4: { perShift: 1, reserve: 0 },
  5: { perShift: 0, reserve: 1 },
};
for (const facility of ['warehouse', 'storefront'] as const) {
  for (let level = 2; level <= 5; level++) {
    const id = `${facility}-${level}`;
    const staff = facility === 'storefront' ? storefrontStaff[level]! : null;
    UPGRADES[id] = {
      id,
      name: facility === 'warehouse' ? 'Kho hàng' : 'Cửa hàng',
      benefit: facility === 'warehouse'
        ? `Nhập được thêm 4 loại hàng (tổng ${level * 4}).`
        : `Trưng bày thêm 4 loại hàng (tổng ${level * 4}); ${staff!.perShift ? 'thêm 1 chỗ nhân viên mỗi ca' : 'thêm 1 nhân viên dự phòng'}.`,
      tradeoff: 'Nhiều mặt hàng cần thêm vốn nhập và theo dõi hạn dùng.',
      cost: facilityCosts[level]!,
      effects: staff
        ? [{ type: 'catalog', facility, add: 4 }, { type: 'staff', ...staff }]
        : [{ type: 'catalog', facility, add: 4 }],
    };
  }
}

for (const [base, max, costs, effects] of [
  ['scanner', 3, [90, 190, 330], [0.5, 0.72, 0.8]],
  ['sorted-shelf', 3, [140, 260, 430], [0.75, 0.82, 0.88]],
  ['wide-shelf', 4, [120, 240, 390, 560], [2, 2, 2, 2]],
  ['bench', 3, [150, 300, 490], [0.7, 0.82, 0.9]],
  ['signboard', 3, [200, 380, 600], [0.75, 0.83, 0.9]],
] as const) {
  for (let level = 2; level <= max; level++) {
    const id = `${base}-${level}`;
    const old = UPGRADES[base]!;
    const value = effects[level - 1]!;
    UPGRADES[id] = {
      id, name: old.name,
      benefit: base === 'wide-shelf' ? 'Mỗi ô kệ chứa thêm 2 món và kệ đổi hình dáng.' :
        base === 'bench' ? 'Thêm 1 chỗ chờ; khách bớt sốt ruột.' :
        base === 'signboard' ? 'Thu hút thêm khách tới cửa hàng.' :
        base === 'scanner' ? 'Thanh toán nhanh hơn.' : 'Lấy hàng nhanh hơn; giữ cách trưng bày theo nhóm.',
      tradeoff: old.tradeoff,
      cost: costs[level - 1]!,
      effects: base === 'wide-shelf' ? [{ type: 'shelfCapacity', add: value }] :
        base === 'bench' ? [{ type: 'queue', addMax: 1, patienceFactor: value }] :
        base === 'signboard' ? [{ type: 'spawnInterval', factor: value }] :
        [{ type: 'scale', key: base === 'scanner' ? 'checkoutMs' : 'retrieveMs', factor: value }],
    } as UpgradeDef;
  }
}

export const UPGRADE_IDS = Object.keys(UPGRADES);
