import type { ReasonCode } from './types';

/**
 * scope quyết định đánh giá được tính vào đâu:
 * - store: lỗi chính sách/năng lực cửa hàng (giá, hàng chờ) → danh tiếng cửa hàng, KHÔNG tính cho nhân viên.
 * - staff: lỗi của người phục vụ → danh tiếng cá nhân của người đó.
 * - customer: do kỳ vọng riêng của khách → không ai bị tính lỗi nghiệp vụ.
 * - praise: điểm cộng.
 */
export type ReasonScope = 'store' | 'staff' | 'customer' | 'praise';

export const REASONS: Record<ReasonCode, { label: string; scope: ReasonScope }> = {
  'correct-item': { label: 'Đúng món', scope: 'praise' },
  'fair-price': { label: 'Giá hợp lý', scope: 'praise' },
  'helpful-advice': { label: 'Tư vấn đúng lúc', scope: 'praise' },
  'fast-service': { label: 'Nhanh', scope: 'praise' },
  'friendly-staff': { label: 'Thân thiện', scope: 'praise' },
  'long-queue': { label: 'Chờ lâu ở hàng', scope: 'store' },
  'price-high': { label: 'Giá cao', scope: 'store' },
  'slow-service': { label: 'Phục vụ chậm', scope: 'staff' },
  'wrong-item': { label: 'Đưa nhầm món', scope: 'staff' },
  'unneeded-referral': { label: 'Không bán được hàng cần', scope: 'staff' },
  'too-chatty': { label: 'Nói nhiều khi khách vội', scope: 'staff' },
  'rude-staff': { label: 'Thái độ chưa tốt', scope: 'staff' },
  'strict-customer': { label: 'Khách kỳ vọng cao', scope: 'customer' },
  'out-of-stock': { label: 'Hết hàng', scope: 'store' },
  'late-delivery': { label: 'Giao hàng trễ', scope: 'store' },
  'on-time-delivery': { label: 'Giao đúng hẹn', scope: 'praise' },
  'awkward-talk': { label: 'Nói chuyện lúng túng', scope: 'staff' },
  'patient-advice': { label: 'Tư vấn kiên nhẫn', scope: 'praise' },
};

/**
 * Lời bình mẫu theo lý do chính. Không bao giờ nhắc tới kết quả sức khoẻ của khách sau khi mua:
 * việc đó không phải thước đo năng lực nhân viên (cổng kiểm duyệt chặn các từ loại này).
 */
export const REVIEW_COMMENTS: Record<ReasonCode, string[]> = {
  'correct-item': ['Lấy đúng thứ mình cần, gọn gàng.', 'Mua nhanh, đúng món, sẽ ghé lại.', 'Nhân viên hiểu ngay mình muốn gì.'],
  'fair-price': ['Giá mềm hơn chỗ khác, sẽ quay lại.', 'Giá hợp lý, nhân viên gói nhanh.'],
  'helpful-advice': [
    'Được khuyên đi khám thay vì bán đại, thấy yên tâm.',
    'Nhân viên thẳng thắn bảo tôi nên gặp bác sĩ, rất có trách nhiệm.',
  ],
  'fast-service': ['Không phải chờ, tuyệt!', 'Vào ra chưa tới hai phút.'],
  'friendly-staff': ['Nhân viên nói chuyện dễ chịu, giải thích kỹ.', 'Được hướng dẫn tận tình, rất vui.'],
  'long-queue': ['Xếp hàng lâu quá, tiệm nên thêm người.', 'Đông mà chỉ có một quầy, chờ mệt.'],
  'price-high': ['Hàng ổn nhưng giá cao hơn chỗ khác.', 'Nhân viên được, chỉ tiếc giá hơi đắt.'],
  'slow-service': ['Tới lượt rồi vẫn phải đợi khá lâu.', 'Phục vụ hơi chậm.'],
  'wrong-item': ['Đưa nhầm món, phải nói lại mấy lần.', 'Mình hỏi một đằng, nhân viên lấy một nẻo.'],
  'unneeded-referral': ['Mình chỉ muốn mua đồ thôi mà không mua được.', 'Hỏi mua mà lại bị bảo đi chỗ khác.'],
  'too-chatty': ['Đang vội mà nhân viên nói hơi nhiều.', 'Chỉ cần lấy món thôi, không cần giải thích dài.'],
  'rude-staff': ['Nhân viên cáu gắt, mua xong không vui chút nào.', 'Hỏi thêm một câu là bị gắt, lần sau chắc thôi.'],
  'strict-customer': ['Tạm được, chưa có gì đặc biệt.', 'Bình thường, không có gì để khen.'],
  'out-of-stock': ['Tới nơi thì món mình cần lại hết hàng.', 'Tiệm hay hết hàng, phải đi chỗ khác mua.'],
  'late-delivery': ['Hẹn giao mà đợi mãi không thấy hàng.', 'Đơn giao trễ hẹn, lần sau chắc mua chỗ khác.', 'Đặt hàng xong bị huỷ, mất cả buổi chờ.'],
  'on-time-delivery': ['Giao đúng hẹn, gói hàng cẩn thận.', 'Đặt online mà nhận nhanh, tiện ghê.'],
  'awkward-talk': ['Nhân viên ấp úng, hỏi mãi mới hiểu.', 'Bạn bán hàng hơi rụt rè, trả lời không rõ.'],
  'patient-advice': ['Hỏi nhiều mà nhân viên vẫn giải thích từ tốn.', 'Được gợi ý đúng thứ mình cần, dễ hiểu lắm.'],
};

/** Mẫu câu chủ tiệm phản hồi khiếu nại. */
export const COMPLAINT_RESPONSES = {
  apologize: { label: 'Xin lỗi & ghi nhận', reply: 'Cảm ơn góp ý, tiệm xin lỗi và sẽ cải thiện ngay.' },
  explain: { label: 'Giải thích', reply: 'Cảm ơn bạn đã góp ý, tiệm xin giải thích rõ hơn về quy trình và giá của mình.' },
  voucher: { label: 'Tặng phiếu giảm giá', reply: 'Tiệm xin lỗi vì trải nghiệm chưa tốt và gửi bạn một phiếu giảm giá cho lần sau.' },
} as const;

export type ComplaintResponse = keyof typeof COMPLAINT_RESPONSES;
