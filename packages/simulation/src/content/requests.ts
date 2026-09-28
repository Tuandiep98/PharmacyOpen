import type { RequestDef } from './types';

export const REQUESTS: Record<string, RequestDef> = {
  'named-mask': { id: 'named-mask', kind: 'named', text: 'Cho mình một hộp khẩu trang nhé!', acceptable: ['mask'] },
  'named-bandage': { id: 'named-bandage', kind: 'named', text: 'Bạn ơi, có băng dán cá nhân không?', acceptable: ['bandage'] },
  'named-sunscreen': { id: 'named-sunscreen', kind: 'named', text: 'Lấy giúp mình tuýp kem chống nắng.', acceptable: ['sunscreen'] },
  'named-sanitizer': { id: 'named-sanitizer', kind: 'named', text: 'Mình mua một chai nước rửa tay khô.', acceptable: ['sanitizer'] },
  'named-lipbalm': { id: 'named-lipbalm', kind: 'named', text: 'Cho mình thỏi son dưỡng môi.', acceptable: ['lipbalm'] },

  'need-beach': { id: 'need-beach', kind: 'need', text: 'Mai mình đi biển, có gì giúp da đỡ bị nắng không?', acceptable: ['sunscreen'] },
  'need-dust': { id: 'need-dust', kind: 'need', text: 'Đường đi làm bụi quá, có gì để che mũi miệng không?', acceptable: ['mask'] },
  'need-scrape': { id: 'need-scrape', kind: 'need', text: 'Mình bị xước nhẹ ở ngón tay lúc làm bếp, muốn che lại.', acceptable: ['bandage'] },
  'need-picnic': { id: 'need-picnic', kind: 'need', text: 'Đi dã ngoại không có chỗ rửa tay thì mang theo gì tiện?', acceptable: ['sanitizer'] },
  'need-dry-lips': { id: 'need-dry-lips', kind: 'need', text: 'Trời hanh khô, môi mình nứt nẻ quá.', acceptable: ['lipbalm'] },

  // Triệu chứng: game không bao giờ gợi ý thuốc, hành động đúng là khuyên đi khám.
  'refer-fever': { id: 'refer-fever', kind: 'refer', text: 'Tôi sốt mấy hôm rồi chưa đỡ, bán cho tôi thuốc gì mạnh mạnh.', acceptable: [] },
  'refer-dizzy': { id: 'refer-dizzy', kind: 'refer', text: 'Dạo này tôi hay chóng mặt, có thuốc gì uống cho khỏi không?', acceptable: [] },
};

/** Câu trả lời chuẩn khi chuyển khách đi khám: chung chung, không chẩn đoán, không gợi ý thuốc. */
export const REFERRAL_MESSAGE = 'Triệu chứng này cần bác sĩ thăm khám trực tiếp. Anh/chị nên đi khám sớm nhé!';
