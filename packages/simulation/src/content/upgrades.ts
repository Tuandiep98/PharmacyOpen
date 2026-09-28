import type { UpgradeDef } from './types';

// Mỗi nâng cấp có đánh đổi rõ ràng, không chỉ là hệ số tốc độ. Giá là giá trị cân bằng tạm thời.
export const UPGRADES: Record<string, UpgradeDef> = {
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
    benefit: 'Lấy hàng nhanh hơn 25%.',
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

export const UPGRADE_IDS = Object.keys(UPGRADES);
