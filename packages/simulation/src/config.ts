import type { SimConfig } from './types';

// Số cân bằng tạm thời — sẽ tinh chỉnh bằng balance simulator.
export const DEFAULT_CONFIG: SimConfig = {
  tickMs: 100,
  startingMoney: 50,
  firstSpawnMs: 1500,
  spawnIntervalMs: [6000, 11000],
  maxStaff: 2,
  aiThinkMs: 1500,
  aiRestockMs: 3000,
  aiRestockThreshold: 0.34,
  reputation: {
    priorRating: 3.5,
    priorWeight: 8,
    demandSlope: 0.2,
    demandMin: 0.75,
    demandMax: 1.3,
    reviewMaxProbability: 0.9,
    voucherCost: 10,
    keepInteractions: 40,
    keepReviews: 60,
    keepComplaints: 20,
  },
  // Một ngày trong game = 4 phút chơi thật (07:00–22:00): chuẩn bị, hai ca, đóng cửa.
  dayMs: 240_000,
  prepMs: 15_000,
  closingMs: 15_000,
  prepPatienceFactor: 0.9,
  priceMaxFactor: 1.5,
  owedWageSpeedFactor: 0.8,
  offlineCapMs: 10 * 60_000,
  keepDayReports: 7,
  stockShelfLifeMs: 12 * 180_000,
  returningCustomerChance: 0.3,
  maxQueue: 4,
  retrieveMs: 2500,
  checkoutMs: 1500,
  referMs: 2000,
  leaveMs: 1400,
  patienceRate: { queue: 1, deciding: 0.6, working: 0.3 },
  wrongItemPenalty: 0.2,
  emoteMs: 1800,
};

/** Bản sao sâu để mỗi ván có config riêng (nâng cấp sửa trực tiếp config của ván). */
export function cloneConfig(config: SimConfig): SimConfig {
  return {
    ...config,
    spawnIntervalMs: [config.spawnIntervalMs[0], config.spawnIntervalMs[1]],
    patienceRate: { ...config.patienceRate },
    reputation: { ...config.reputation },
  };
}
