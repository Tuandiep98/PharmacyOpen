import type { RequestDef } from './types';

export const REQUESTS: Record<string, RequestDef> = {
  'named-mask': { id: 'named-mask', kind: 'named', text: 'Cho mình một hộp khẩu trang nhé!', acceptable: ['mask'] },
  'named-bandage': { id: 'named-bandage', kind: 'named', text: 'Bạn ơi, có băng dán cá nhân không?', acceptable: ['bandage'] },
  'named-sunscreen': { id: 'named-sunscreen', kind: 'named', text: 'Lấy giúp mình tuýp kem chống nắng.', acceptable: ['sunscreen'] },
  'named-sanitizer': { id: 'named-sanitizer', kind: 'named', text: 'Mình mua một chai nước rửa tay khô.', acceptable: ['sanitizer'] },
  'named-lipbalm': { id: 'named-lipbalm', kind: 'named', text: 'Cho mình thỏi son dưỡng môi.', acceptable: ['lipbalm'] },
  'named-soap': { id: 'named-soap', kind: 'named', text: 'Cho mình một bánh xà phòng rửa tay.', acceptable: ['soap'] },
  'named-tissues': { id: 'named-tissues', kind: 'named', text: 'Cho mình một gói khăn giấy.', acceptable: ['tissues'] },
  'named-wipes': { id: 'named-wipes', kind: 'named', text: 'Mình mua một gói khăn ướt.', acceptable: ['wipes'] },
  'named-cottonpads': { id: 'named-cottonpads', kind: 'named', text: 'Mình cần bông tẩy trang.', acceptable: ['cottonpads'] },
  'named-toothbrush': { id: 'named-toothbrush', kind: 'named', text: 'Cho mình một bàn chải đánh răng.', acceptable: ['toothbrush'] },
  'named-toothpaste': { id: 'named-toothpaste', kind: 'named', text: 'Cho mình một tuýp kem đánh răng.', acceptable: ['toothpaste'] },
  'named-floss': { id: 'named-floss', kind: 'named', text: 'Mình muốn mua chỉ nha khoa.', acceptable: ['floss'] },
  'named-cottonswab': { id: 'named-cottonswab', kind: 'named', text: 'Cho mình một hộp tăm bông.', acceptable: ['cottonswab'] },
  'named-comb': { id: 'named-comb', kind: 'named', text: 'Cho mình chiếc lược bỏ túi.', acceptable: ['comb'] },
  'named-gauze': { id: 'named-gauze', kind: 'named', text: 'Cho mình một gói gạc sạch.', acceptable: ['gauze'] },
  'named-tape': { id: 'named-tape', kind: 'named', text: 'Mình muốn mua băng dính y tế.', acceptable: ['tape'] },
  'named-elasticbandage': { id: 'named-elasticbandage', kind: 'named', text: 'Cho mình một cuộn băng thun.', acceptable: ['elasticbandage'] },
  'named-moisturizer': { id: 'named-moisturizer', kind: 'named', text: 'Mình mua sữa dưỡng ẩm.', acceptable: ['moisturizer'] },
  'named-cleanser': { id: 'named-cleanser', kind: 'named', text: 'Cho mình sữa rửa mặt.', acceptable: ['cleanser'] },
  'named-handcream': { id: 'named-handcream', kind: 'named', text: 'Mình cần kem dưỡng tay.', acceptable: ['handcream'] },

  'need-beach': { id: 'need-beach', kind: 'need', text: 'Mai mình đi biển, có gì giúp da đỡ bị nắng không?', acceptable: ['sunscreen'] },
  'need-dust': { id: 'need-dust', kind: 'need', text: 'Đường đi làm bụi quá, có gì để che mũi miệng không?', acceptable: ['mask'] },
  'need-scrape': { id: 'need-scrape', kind: 'need', text: 'Mình bị xước nhẹ ở ngón tay lúc làm bếp, muốn che lại.', acceptable: ['bandage'] },
  'need-picnic': { id: 'need-picnic', kind: 'need', text: 'Đi dã ngoại không có chỗ rửa tay thì mang theo gì tiện?', acceptable: ['sanitizer'] },
  'need-dry-lips': { id: 'need-dry-lips', kind: 'need', text: 'Trời hanh khô, môi mình nứt nẻ quá.', acceptable: ['lipbalm'] },
  'need-handwash': { id: 'need-handwash', kind: 'need', text: 'Ở nhà mình muốn có thứ tạo bọt để rửa tay.', acceptable: ['soap'] },
  'need-paper': { id: 'need-paper', kind: 'need', text: 'Mình cần gói giấy nhỏ để bỏ trong túi đi làm.', acceptable: ['tissues'] },
  'need-quick-clean': { id: 'need-quick-clean', kind: 'need', text: 'Đi chơi xa mình muốn lau tay nhanh khi không có vòi nước.', acceptable: ['wipes'] },
  'need-makeup': { id: 'need-makeup', kind: 'need', text: 'Mình cần miếng bông mềm để lau lớp trang điểm.', acceptable: ['cottonpads'] },
  'need-brush': { id: 'need-brush', kind: 'need', text: 'Mình quên đồ vệ sinh răng khi đi du lịch, cần cái để chải.', acceptable: ['toothbrush'] },
  'need-paste': { id: 'need-paste', kind: 'need', text: 'Mình có bàn chải rồi, muốn thêm thứ để đánh răng.', acceptable: ['toothpaste'] },
  'need-between-teeth': { id: 'need-between-teeth', kind: 'need', text: 'Mình muốn làm sạch kẽ răng sau bữa ăn.', acceptable: ['floss'] },
  'need-small-cotton': { id: 'need-small-cotton', kind: 'need', text: 'Mình cần que có đầu bông để làm sạch đồ dùng nhỏ.', acceptable: ['cottonswab'] },
  'need-hair': { id: 'need-hair', kind: 'need', text: 'Mình muốn chải tóc gọn lại khi ra ngoài.', acceptable: ['comb'] },
  'need-gauze': { id: 'need-gauze', kind: 'need', text: 'Túi sơ cứu ở nhà thiếu miếng vải sạch để che vết xước nhẹ.', acceptable: ['gauze'] },
  'need-tape': { id: 'need-tape', kind: 'need', text: 'Mình cần cuộn băng dính để cố định miếng gạc.', acceptable: ['tape'] },
  'need-wrap': { id: 'need-wrap', kind: 'need', text: 'Mình chuẩn bị túi sơ cứu, cần một cuộn băng thun co giãn.', acceptable: ['elasticbandage'] },
  'need-moisture': { id: 'need-moisture', kind: 'need', text: 'Trời hanh khô, mình muốn dưỡng ẩm cho da sau khi tắm.', acceptable: ['moisturizer'] },
  'need-facewash': { id: 'need-facewash', kind: 'need', text: 'Sau một ngày ngoài đường, mình muốn rửa mặt sạch sẽ.', acceptable: ['cleanser'] },
  'need-hands': { id: 'need-hands', kind: 'need', text: 'Mình muốn chăm sóc da tay sau khi rửa tay nhiều.', acceptable: ['handcream'] },

  // Triệu chứng: game không bao giờ gợi ý thuốc, hành động đúng là khuyên đi khám.
  'refer-fever': { id: 'refer-fever', kind: 'refer', text: 'Tôi sốt mấy hôm rồi chưa đỡ, bán cho tôi thuốc gì mạnh mạnh.', acceptable: [] },
  'refer-dizzy': { id: 'refer-dizzy', kind: 'refer', text: 'Dạo này tôi hay chóng mặt, có thuốc gì uống cho khỏi không?', acceptable: [] },
};

/** Câu trả lời chuẩn khi chuyển khách đi khám: chung chung, không chẩn đoán, không gợi ý thuốc. */
export const REFERRAL_MESSAGE = 'Triệu chứng này cần bác sĩ thăm khám trực tiếp. Anh/chị nên đi khám sớm nhé!';
