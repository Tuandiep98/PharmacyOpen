import type { ArchetypeDef, ArchetypeId } from './types';

// Tính cách khách là xu hướng, không phải định kiến: cùng một cách phục vụ, mỗi nhóm khách cảm nhận khác nhau.
export const ARCHETYPES: Record<ArchetypeId, ArchetypeDef> = {
  hurried: {
    id: 'hurried',
    name: 'Khách vội',
    description: 'Biết mình cần gì, muốn mua nhanh rồi đi.',
    spawnWeight: 3,
    patienceMs: [18000, 26000],
    reviewProbability: 0.25,
    priceSensitivity: 0.3,
    strictness: 0.05,
    waitWeight: 1.5,
    likesDetail: false,
    requestWeights: {
      'named-mask': 3, 'named-bandage': 3, 'named-sunscreen': 2, 'named-sanitizer': 3, 'named-lipbalm': 2,
      'need-dust': 1, 'need-picnic': 1,
      'refer-fever': 0.6,
    },
  },
  curious: {
    id: 'curious',
    name: 'Khách hay hỏi',
    description: 'Kể nhu cầu và muốn được gợi ý, kiên nhẫn hơn.',
    spawnWeight: 2,
    patienceMs: [34000, 48000],
    reviewProbability: 0.35,
    priceSensitivity: 0.5,
    strictness: 0,
    waitWeight: 0.8,
    likesDetail: true,
    requestWeights: {
      'named-sunscreen': 1, 'named-lipbalm': 1,
      'need-beach': 3, 'need-dust': 2, 'need-scrape': 3, 'need-picnic': 2, 'need-dry-lips': 3,
      'refer-dizzy': 0.8, 'refer-fever': 0.4,
    },
  },
  demanding: {
    id: 'demanding',
    name: 'Khách khó tính',
    description: 'Kỳ vọng cao, để ý giá và hay viết đánh giá — kể cả khi được phục vụ đúng.',
    spawnWeight: 1.2,
    patienceMs: [24000, 34000],
    reviewProbability: 0.6,
    priceSensitivity: 0.9,
    strictness: 0.3,
    waitWeight: 1.2,
    likesDetail: false,
    requestWeights: {
      'named-sunscreen': 3, 'named-sanitizer': 2, 'named-mask': 1, 'named-lipbalm': 1,
      'need-beach': 2, 'need-picnic': 1,
      'refer-fever': 0.5,
    },
  },
};

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];
