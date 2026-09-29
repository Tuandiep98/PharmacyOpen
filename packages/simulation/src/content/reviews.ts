import type { ReasonCode, ReviewerFamiliarity } from "./types";

/**
 * scope quyết định đánh giá được tính vào đâu:
 * - store: lỗi chính sách/năng lực cửa hàng (giá, hàng chờ) → danh tiếng cửa hàng, KHÔNG tính cho nhân viên.
 * - staff: lỗi của người phục vụ → danh tiếng cá nhân của người đó.
 * - customer: do kỳ vọng riêng của khách → không ai bị tính lỗi nghiệp vụ.
 * - praise: điểm cộng.
 */
export type ReasonScope = "store" | "staff" | "customer" | "praise";

export const REASONS: Record<
  ReasonCode,
  { label: string; scope: ReasonScope }
> = {
  "correct-item": { label: "Đúng món", scope: "praise" },
  "fair-price": { label: "Giá hợp lý", scope: "praise" },
  "helpful-advice": { label: "Tư vấn đúng lúc", scope: "praise" },
  "fast-service": { label: "Nhanh", scope: "praise" },
  "friendly-staff": { label: "Thân thiện", scope: "praise" },
  "long-queue": { label: "Chờ lâu ở hàng", scope: "store" },
  "price-high": { label: "Giá cao", scope: "store" },
  "slow-service": { label: "Phục vụ chậm", scope: "staff" },
  "wrong-item": { label: "Đưa nhầm món", scope: "staff" },
  "unneeded-referral": { label: "Không bán được hàng cần", scope: "staff" },
  "too-chatty": { label: "Nói nhiều khi khách vội", scope: "staff" },
  "rude-staff": { label: "Thái độ chưa tốt", scope: "staff" },
  "strict-customer": { label: "Khách kỳ vọng cao", scope: "customer" },
  "out-of-stock": { label: "Hết hàng", scope: "store" },
  "late-delivery": { label: "Giao hàng trễ", scope: "store" },
  "on-time-delivery": { label: "Giao đúng hẹn", scope: "praise" },
  "awkward-talk": { label: "Nói chuyện lúng túng", scope: "staff" },
  "patient-advice": { label: "Tư vấn kiên nhẫn", scope: "praise" },
};

/**
 * Lời bình mẫu theo lý do chính. Không bao giờ nhắc tới kết quả sức khoẻ của khách sau khi mua:
 * việc đó không phải thước đo năng lực nhân viên (cổng kiểm duyệt chặn các từ loại này).
 */
export const REVIEW_COMMENTS: Record<ReasonCode, string[]> = {
  "correct-item": [
    "Lấy đúng thứ mình cần, gọn gàng.",
    "Mua nhanh, đúng món, sẽ ghé lại.",
    "Nhân viên hiểu ngay mình muốn gì.",
    "Nói một lần là lấy đúng, không phải giải thích.",
    "Hàng đúng loại, còn hạn dài, gói cẩn thận.",
    "Kệ bày dễ nhìn, nhân viên lấy đúng món trong nháy mắt.",
  ],
  "fair-price": [
    "Giá mềm hơn chỗ khác, sẽ quay lại.",
    "Giá hợp lý, nhân viên gói nhanh.",
    "Đi mấy tiệm quanh đây, chỗ này giá dễ chịu nhất.",
    "Giá niêm yết rõ ràng, không bị hét giá.",
    "Mua được giá tốt, thấy đáng đồng tiền.",
  ],
  "helpful-advice": [
    "Được khuyên đi khám thay vì bán đại, thấy yên tâm.",
    "Nhân viên thẳng thắn bảo tôi nên gặp bác sĩ, rất có trách nhiệm.",
    "Không cố bán hàng mà dặn mình đi khám cho chắc, quý thật.",
    "Tiệm có tâm: chuyện cần bác sĩ thì nói rõ, không bán bừa.",
  ],
  "fast-service": [
    "Không phải chờ, tuyệt!",
    "Vào ra chưa tới hai phút.",
    "Nhanh gọn, đúng lúc đang vội.",
    "Vừa tới đã có người phục vụ ngay.",
    "Thanh toán nhanh, không phải đứng lâu.",
  ],
  "friendly-staff": [
    "Nhân viên nói chuyện dễ chịu, giải thích kỹ.",
    "Được hướng dẫn tận tình, rất vui.",
    "Bạn bán hàng tươi cười, hỏi han chu đáo.",
    "Nhân viên chào hỏi niềm nở, thấy thân thiết ghê.",
    "Cách nói chuyện nhẹ nhàng, mua xong thấy vui cả ngày.",
  ],
  "long-queue": [
    "Xếp hàng lâu quá, tiệm nên thêm người.",
    "Đông mà chỉ có một quầy, chờ mệt.",
    "Hàng chờ dài, không có chỗ ngồi đợi.",
    "Giờ cao điểm mà ít người trực quầy.",
    "Đứng chờ mãi mới tới lượt.",
  ],
  "price-high": [
    "Hàng ổn nhưng giá cao hơn chỗ khác.",
    "Nhân viên được, chỉ tiếc giá hơi đắt.",
    "Cùng món mà đắt hơn tiệm đầu hẻm.",
    "Giá hơi chát so với mặt bằng chung.",
    "Mua thì mua, nhưng giá nên xem lại.",
  ],
  "slow-service": [
    "Tới lượt rồi vẫn phải đợi khá lâu.",
    "Phục vụ hơi chậm.",
    "Nhân viên tìm hàng mãi mới ra.",
    "Lấy một món mà mất cả buổi.",
    "Thanh toán chậm, đứng chờ mỏi cả chân.",
  ],
  "wrong-item": [
    "Đưa nhầm món, phải nói lại mấy lần.",
    "Mình hỏi một đằng, nhân viên lấy một nẻo.",
    "Lấy sai loại, đổi đi đổi lại mất thời gian.",
    "Nhân viên chưa nắm hàng, đưa nhầm hai lần.",
    "Nói rõ tên món rồi mà vẫn lấy nhầm.",
  ],
  "unneeded-referral": [
    "Mình chỉ muốn mua đồ thôi mà không mua được.",
    "Hỏi mua mà lại bị bảo đi chỗ khác.",
    "Chỉ cần mua món quen thuộc mà bị từ chối, khó hiểu.",
    "Nhân viên chưa nghe hết đã bảo đi chỗ khác.",
  ],
  "too-chatty": [
    "Đang vội mà nhân viên nói hơi nhiều.",
    "Chỉ cần lấy món thôi, không cần giải thích dài.",
    "Nhân viên vui tính nhưng kể chuyện hơi lâu.",
    "Mình vội mà cứ bị hỏi han mãi.",
  ],
  "rude-staff": [
    "Nhân viên cáu gắt, mua xong không vui chút nào.",
    "Hỏi thêm một câu là bị gắt, lần sau chắc thôi.",
    "Thái độ cộc lốc, không chào hỏi gì.",
    "Mặt nhân viên khó đăm đăm, ngại hỏi thêm.",
  ],
  "strict-customer": [
    "Tạm được, chưa có gì đặc biệt.",
    "Bình thường, không có gì để khen.",
    "Ổn, nhưng chưa tới mức ấn tượng.",
    "Được cái này thì thiếu cái kia, tạm chấp nhận.",
  ],
  "out-of-stock": [
    "Tới nơi thì món mình cần lại hết hàng.",
    "Tiệm hay hết hàng, phải đi chỗ khác mua.",
    "Kệ trống mấy ngăn, nên nhập hàng đều hơn.",
    "Món phổ biến mà cũng hết, hơi tiếc.",
  ],
  "late-delivery": [
    "Hẹn giao mà đợi mãi không thấy hàng.",
    "Đơn giao trễ hẹn, lần sau chắc mua chỗ khác.",
    "Đặt hàng xong bị huỷ, mất cả buổi chờ.",
    "Giao trễ mà không ai báo trước.",
  ],
  "on-time-delivery": [
    "Giao đúng hẹn, gói hàng cẩn thận.",
    "Đặt online mà nhận nhanh, tiện ghê.",
    "Shipper tới đúng giờ, hàng nguyên vẹn.",
    "Đặt buổi sáng, chiều đã có hàng.",
  ],
  "awkward-talk": [
    "Nhân viên ấp úng, hỏi mãi mới hiểu.",
    "Bạn bán hàng hơi rụt rè, trả lời không rõ.",
    "Nhân viên còn lóng ngóng, chắc mới vào làm.",
    "Hỏi gì cũng ờ à, không chắc chắn lắm.",
  ],
  "patient-advice": [
    "Hỏi nhiều mà nhân viên vẫn giải thích từ tốn.",
    "Được gợi ý đúng thứ mình cần, dễ hiểu lắm.",
    "Kể nhu cầu lan man mà nhân viên vẫn kiên nhẫn nghe.",
    "Được so sánh mấy loại rồi mới chọn, rất kỹ.",
  ],
};

/**
 * Câu mở đầu theo độ quen: khách thân kể mình gắn bó với tiệm, khách mới kể vì sao ghé.
 * Không phải đánh giá nào cũng có (khách mới thường vào thẳng vấn đề).
 */
export const REVIEW_OPENERS: Record<ReviewerFamiliarity, string[]> = {
  new: [
    "Lần đầu ghé tiệm.",
    "Đi ngang thấy bảng hiệu nên ghé thử.",
    "Mới chuyển tới gần đây, ghé thử.",
    "Được bạn giới thiệu nên ghé.",
    "Tiện đường đi làm nên tạt vào.",
  ],
  known: [
    "Ghé lại lần nữa sau lần trước.",
    "Thỉnh thoảng vẫn ghé tiệm.",
    "Đã mua ở đây vài lần.",
    "Lần trước thấy ổn nên quay lại.",
    "Bắt đầu quen tiệm này rồi.",
  ],
  close: [
    "Khách ruột của tiệm đây.",
    "Ghé tiệm thường xuyên lắm rồi.",
    "Quen mặt cả nhân viên luôn.",
    "Nhà ở gần nên tuần nào cũng ghé.",
    "Ủng hộ tiệm từ hồi mới mở.",
  ],
};

export type StarCount = 1 | 2 | 3 | 4 | 5;

/**
 * Câu kết theo số sao và độ quen. Khách thân chê thì góp ý nhẹ và vẫn hẹn quay lại; khách mới chê
 * thì dứt khoát hơn. Khách thân khen thì nói về sự gắn bó.
 */
export const REVIEW_CLOSERS: Record<
  ReviewerFamiliarity,
  Record<StarCount, string[]>
> = {
  new: {
    1: [
      "Chắc không quay lại.",
      "Thất vọng ngay lần đầu.",
      "Không giới thiệu cho ai.",
    ],
    2: ["Hơi thất vọng.", "Chưa muốn quay lại lắm.", "Mong tiệm cải thiện."],
    3: ["Tạm ổn.", "Có thể sẽ ghé lại xem sao.", "Không tệ, không xuất sắc."],
    4: ["Sẽ quay lại.", "Ấn tượng tốt cho lần đầu.", "Đáng ghé thử."],
    5: ["Mười điểm!", "Sẽ giới thiệu cho bạn bè.", "Từ nay có tiệm quen rồi."],
  },
  known: {
    1: [
      "Lần này tệ hơn hẳn mấy lần trước.",
      "Không giống tiệm mình từng biết.",
    ],
    2: ["Lần trước tốt hơn nhiều.", "Mong lần sau như cũ.", "Hơi hụt hẫng."],
    3: ["Vẫn như mọi lần, tạm được.", "Ổn, chưa có gì mới."],
    4: [
      "Vẫn tốt như lần trước.",
      "Chắc sẽ thành khách quen.",
      "Ổn định, yên tâm ghé.",
    ],
    5: [
      "Lần nào cũng hài lòng.",
      "Càng ghé càng thích.",
      "Từ giờ chỉ mua ở đây.",
    ],
  },
  close: {
    1: [
      "Ủng hộ tiệm lâu rồi nên mới nói thẳng.",
      "Buồn thật, tiệm quen mà hôm nay vậy.",
    ],
    2: [
      "Góp ý thật lòng vì quý tiệm.",
      "Hôm nay chưa ổn, mình vẫn sẽ ghé.",
      "Mong tiệm để ý hơn nha.",
    ],
    3: [
      "Hôm nay hơi lệch, bình thường tốt hơn.",
      "Quen rồi nên thông cảm, lần sau cố nha.",
    ],
    4: ["Vẫn là tiệm ruột của mình.", "Quen lâu vẫn chất lượng như vậy."],
    5: [
      "Tiệm ruột, không đổi được.",
      "Như người nhà, lần nào ghé cũng vui.",
      "Mong tiệm mở mãi.",
    ],
  },
};

/**
 * Câu kết giọng mạng xã hội của khách trẻ (khách hay hỏi, khách vội), thay cho câu kết thường.
 * Tự viết theo lối nói đang phổ biến trên mạng; chia theo mức sao: tốt (4–5), vừa (3), tệ (1–2).
 */
export const REVIEW_TRENDY_CLOSERS: Record<"good" | "mid" | "bad", string[]> = {
  good: [
    "Đỉnh chóp, chấm 10 không có nhưng!",
    "Ưng cái bụng ghê.",
    "Tiệm xịn xò, recommend mạnh.",
    "Nhân viên dễ thương xỉu.",
    "Chill phết, sẽ quay lại dài dài.",
    "Keo lỳ, quá ổn luôn.",
    "Đúng gu, lưu ngay vào danh sách tiệm ruột.",
    "Hết nước chấm!",
    "Mãi mê tiệm này.",
  ],
  mid: [
    "Cũng ổn áp, không có gì để flex.",
    "Tạm được, chưa tới mức wow.",
    "Bình thường thôi, chưa đúng gu mình lắm.",
    "Ổn áp nhưng chưa đủ đô để nghiện.",
  ],
  bad: [
    "Hơi xu cà na nha.",
    "U là trời, trải nghiệm hơi toang.",
    "Chê nha, chưa ưng được cái gì luôn.",
    "Mất vibe ghê.",
    "Toang thật sự.",
  ],
};

/** Khách mua đúng món đang bán chạy trong ngày (nhãn "Bán chạy" trên kệ). */
export const REVIEW_TRENDING_PRODUCT = [
  "Món đang hot trên mạng, may mà tiệm còn hàng.",
  "Thấy ai cũng rủ nhau mua món này nên ghé thử.",
  "Món hot được bày ngay kệ đầu, dễ thấy ghê.",
  "Đang có trend món này, tiệm nhập hàng nhanh thật.",
];

/** Mẫu câu chủ tiệm phản hồi khiếu nại. */
export const COMPLAINT_RESPONSES = {
  apologize: {
    label: "Xin lỗi & ghi nhận",
    reply: "Cảm ơn góp ý, tiệm xin lỗi và sẽ cải thiện ngay.",
  },
  explain: {
    label: "Giải thích",
    reply:
      "Cảm ơn bạn đã góp ý, tiệm xin giải thích rõ hơn về quy trình và giá của mình.",
  },
  voucher: {
    label: "Tặng phiếu giảm giá",
    reply:
      "Tiệm xin lỗi vì trải nghiệm chưa tốt và gửi bạn một phiếu giảm giá cho lần sau.",
  },
} as const;

export type ComplaintResponse = keyof typeof COMPLAINT_RESPONSES;
