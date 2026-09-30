import { createInitialState } from "./state";
import { pruneEquipped } from "./collection";
import type { Emit } from "./events";
import type {
  DayReport,
  DeepReadonly,
  OperationsCaseId,
  OperationsChoiceId,
  SimState,
} from "./types";

/** Một cách diễn đạt lựa chọn: chỉ gợi ý nhẹ hướng hệ quả, không lộ điểm. */
export interface OperationsChoiceText {
  title: string;
  hint: string;
}

export interface OperationsChoice {
  id: OperationsChoiceId;
  /** Nhiều cách nói cho cùng một lựa chọn; mỗi ngày bốc một câu. */
  variants: readonly OperationsChoiceText[];
  cost: number;
  score: number;
  demandFactor: number;
}

export interface OperationsCase {
  id: OperationsCaseId;
  title: string;
  story: string;
  choices: readonly OperationsChoice[];
}

/** Hư cấu hóa tình huống vận hành; không mô phỏng cách dùng thuốc hoặc kê đơn. */
export const OPERATIONS_CASES: readonly OperationsCase[] = [
  {
    id: "storage",
    title: "Nhiệt kế đang 'diễn sâu'",
    story:
      "Sổ nhiệt độ và máy đo cãi nhau. Đoàn kiểm tra vùng có thể ghé bất ngờ.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Kiểm tra và hiệu chuẩn",
            hint: "Mất chút tiền, sổ sách thì yên tâm",
          },
          {
            title: "Gọi kỹ thuật tới đo lại",
            hint: "Tốn công gọi thợ, nhưng có biên bản đàng hoàng",
          },
          {
            title: "Thay nhiệt kế mới, ghi sổ lại",
            hint: "Hơi xót ví, bù lại ai hỏi cũng trả lời được",
          },
        ],
        cost: 18,
        score: 8,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Tạm ngưng kệ nghi vấn",
            hint: "Quầy vắng hơn một chút, đổi lại đỡ lo",
          },
          {
            title: "Dồn hàng sang kệ mát bên kia",
            hint: "Chật chội, khách tìm hàng hơi lâu",
          },
          {
            title: "Treo biển 'đang sắp xếp' ở kệ đó",
            hint: "Vài khách sẽ quay ra, nhưng khỏi áy náy",
          },
        ],
        cost: 0,
        score: 3,
        demandFactor: 0.8,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Cứ mở bán, tính sau",
            hint: "Hôm nay đông vui, mong là không ai ghé kiểm",
          },
          {
            title: "Tin máy đo, sổ để mai sửa",
            hint: "Bán hàng trơn tru, sổ sách hơi lệch",
          },
          {
            title: "Vỗ nhẹ nhiệt kế rồi mở cửa",
            hint: "Nhanh gọn, miễn là không ai soi kỹ",
          },
        ],
        cost: 0,
        score: -14,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "supplier",
    title: "Lô hàng giấy tờ đi lạc",
    story:
      "Nhà cung ứng báo xe đã tới nhưng chứng từ chưa theo kịp. Điện thoại kho reo liên tục.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Đối soát chứng từ",
            hint: "Tốn phí xử lý, giấy tờ khớp từng dòng",
          },
          {
            title: "Thuê người ngồi đối chiếu",
            hint: "Mất chút tiền công, kho chắc chắn hơn",
          },
          {
            title: "Gọi nhà cung ứng gửi bản gốc",
            hint: "Phí chuyển phát hơi đau, bù lại hồ sơ gọn",
          },
        ],
        cost: 12,
        score: 7,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Giữ lô, chờ xác minh",
            hint: "Kệ hơi trống hôm nay, nhưng không ai trách",
          },
          {
            title: "Để xe chờ, bán hàng tồn trước",
            hint: "Ít món hơn, có khách sẽ sang tiệm khác",
          },
          {
            title: "Nhận nhưng khóa kho, chưa bày",
            hint: "An toàn, có điều quầy hơi thưa",
          },
        ],
        cost: 0,
        score: 4,
        demandFactor: 0.85,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Nhận vội cho kịp doanh số",
            hint: "Kệ đầy, khách đông, giấy tờ tính sau",
          },
          {
            title: "Ký nhận trước, hỏi sau",
            hint: "Nhanh như chớp, chỉ lo ai đó hỏi lại",
          },
          {
            title: "Bày luôn, giấy tờ chắc mai tới",
            hint: "Doanh số đẹp, quy trình thì... đẹp sau",
          },
        ],
        cost: 0,
        score: -13,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "staff",
    title: "Lịch ca thành tâm thư",
    story: "Nhân viên đổi ca sát giờ, nhóm chat bắt đầu thả icon bốc khói.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Thuê người hỗ trợ ca",
            hint: "Tốn thêm tiền công, cả đội thở phào",
          },
          {
            title: "Gọi bạn làm bán thời gian tới",
            hint: "Hơi tốn, bù lại ca nào cũng đủ người",
          },
          {
            title: "Trả thêm để ai đó nhận ca",
            hint: "Ví mỏng đi một chút, nhóm chat hạ nhiệt",
          },
        ],
        cost: 20,
        score: 7,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Tự gánh ca đông",
            hint: "Mệt một chút, khách phải chờ lâu hơn",
          },
          {
            title: "Rút ngắn giờ mở cửa hôm nay",
            hint: "Bớt khách, bớt căng thẳng",
          },
          {
            title: "Gộp hai quầy làm một",
            hint: "Hàng chờ dài hơn, đội vẫn ổn",
          },
        ],
        cost: 0,
        score: 2,
        demandFactor: 0.8,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Ép cả đội tăng tốc",
            hint: "Quầy chạy vèo vèo, nhóm chat im lặng lạ thường",
          },
          {
            title: "Giữ lịch cũ, ai nghỉ tự chịu",
            hint: "Mở cửa đủ giờ, không khí hơi nặng",
          },
          {
            title: "Hứa thưởng rồi... tính sau",
            hint: "Mọi người hăng hái, lời hứa thì treo đó",
          },
        ],
        cost: 0,
        score: -12,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "rumour",
    title: "Bài đăng lan nhanh hơn shipper",
    story:
      "Một khách kể chuyện chờ lâu lên nhóm khu phố; bình luận đã thành hội đồng xét xử.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Gọi khách và xử lý",
            hint: "Tốn chút quà xin lỗi, câu chuyện khép lại êm",
          },
          {
            title: "Mời khách ghé, tặng phiếu",
            hint: "Mất ít tiền, đổi lấy một bình luận dễ chịu",
          },
          {
            title: "Gửi quà kèm lời xin lỗi riêng",
            hint: "Hơi tốn, nhưng người ta nhớ cách mình cư xử",
          },
        ],
        cost: 10,
        score: 7,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Phản hồi công khai",
            hint: "Lịch sự, nhưng khách qua đường vẫn ngập ngừng",
          },
          {
            title: "Đăng lời giải thích lên nhóm",
            hint: "Đủ ý, người đọc vẫn còn bán tín bán nghi",
          },
          {
            title: "Nhắn riêng cho người đăng",
            hint: "Kín đáo, còn đám đông thì chưa nguôi",
          },
        ],
        cost: 0,
        score: 3,
        demandFactor: 0.85,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Bỏ qua, đẩy khuyến mãi",
            hint: "Khách kéo tới vì giá, chuyện cũ vẫn nằm đó",
          },
          {
            title: "Treo banner giảm giá thật to",
            hint: "Đông ngay, còn bình luận thì chưa ai trả lời",
          },
          {
            title: "Kệ, vài hôm là quên",
            hint: "Hôm nay vẫn bán tốt, mạng thì nhớ lâu lắm",
          },
        ],
        cost: 0,
        score: -12,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "outage",
    title: "Cúp điện đúng giờ vàng",
    story:
      "Cả dãy phố tối om, tủ mát bắt đầu thở dài. Điện lực hẹn 'chiều có lại'.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Thuê máy phát cho tủ mát",
            hint: "Tiền thuê không rẻ, hàng trong tủ được giữ nguyên",
          },
          {
            title: "Mua đá khô, ghi nhiệt độ từng giờ",
            hint: "Tốn kém và lích kích, sổ sách thì sạch sẽ",
          },
          {
            title: "Gửi hàng mát sang tiệm bạn",
            hint: "Mất phí gửi nhờ, đổi lại khỏi lo hỏng hàng",
          },
        ],
        cost: 16,
        score: 8,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Đóng tủ mát, chỉ bán hàng khô",
            hint: "Thiếu vài món, có khách lắc đầu đi ra",
          },
          {
            title: "Mở nửa cửa, bán bằng đèn pin",
            hint: "Lờ mờ và chậm, được cái không ai phàn nàn",
          },
          {
            title: "Dán giấy báo hàng mát tạm hết",
            hint: "Khách thưa đi, tủ mát được nghỉ ngơi",
          },
        ],
        cost: 0,
        score: 3,
        demandFactor: 0.8,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Bán hết tủ mát trước khi ấm",
            hint: "Xả hàng nhanh, đông khách, chỉ hơi lo chất lượng",
          },
          {
            title: "Cứ bán bình thường, điện sắp có",
            hint: "Quầy vẫn nhộn nhịp, tủ mát thì âm ấm",
          },
          {
            title: "Giảm giá hàng mát cho nhanh",
            hint: "Khách ùa vào vì rẻ, ai hỏi thì cười trừ",
          },
        ],
        cost: 0,
        score: -13,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "leak",
    title: "Trần nhà bắt đầu khóc",
    story:
      "Mưa đêm qua để lại một vệt nước trên trần, nhỏ giọt ngay cạnh kệ giấy.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Gọi thợ chống thấm ngay",
            hint: "Tốn tiền thợ, sáng mai trần khô ráo",
          },
          {
            title: "Dời kệ, kiểm lại hàng bị ướt",
            hint: "Mất công và mất ít hàng, bù lại kệ nào cũng sạch",
          },
          {
            title: "Thuê người vá tạm và lau khô",
            hint: "Hơi tốn, nhìn vào thấy yên tâm",
          },
        ],
        cost: 14,
        score: 7,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Đặt xô hứng, rào góc đó lại",
            hint: "Lối đi hẹp hơn, khách phải vòng vèo",
          },
          {
            title: "Cất hàng ở kệ gần đó vào kho",
            hint: "Kệ trống một mảng, có khách không thấy món cần",
          },
          {
            title: "Treo biển 'sàn trơn', bán chậm lại",
            hint: "Chậm mà chắc, quầy hơi vắng",
          },
        ],
        cost: 0,
        score: 3,
        demandFactor: 0.85,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Lau qua rồi bán tiếp",
            hint: "Không ai để ý đâu, trừ khi giọt nước rơi trúng",
          },
          {
            title: "Phủ nilon lên kệ là xong",
            hint: "Nhanh gọn, trông hơi tạm bợ",
          },
          {
            title: "Kệ nó, trời nắng tự khô",
            hint: "Quầy vẫn đông, trần thì vẫn khóc",
          },
        ],
        cost: 0,
        score: -11,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "expiry",
    title: "Lô hàng sắp tới sinh nhật cuối",
    story:
      "Kiểm kho phát hiện một lô sắp hết hạn trong tuần. Nhân viên nhìn nhau chờ quyết định.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Rút lô, gửi trả nhà cung ứng",
            hint: "Mất phí vận chuyển, kệ chỉ còn hàng mới",
          },
          {
            title: "Kiểm lại toàn kho một lượt",
            hint: "Tốn tiền công, đổi lấy danh sách hạn dùng rõ ràng",
          },
          {
            title: "Tiêu hủy đúng quy trình, có biên bản",
            hint: "Xót của một chút, hồ sơ thì không chê được",
          },
        ],
        cost: 15,
        score: 8,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Cất lô vào kho, chờ xử lý",
            hint: "Kệ vơi một mảng, bán chậm hơn",
          },
          {
            title: "Dán nhãn nhắc hạn, để kệ trong",
            hint: "Khách ít thấy món đó, nhưng minh bạch",
          },
          {
            title: "Tạm ngừng nhập thêm mặt hàng này",
            hint: "Có khách hỏi mà không có, đành hẹn lại",
          },
        ],
        cost: 0,
        score: 4,
        demandFactor: 0.85,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Đẩy lên kệ đầu, bán nhanh",
            hint: "Hàng đi vèo vèo, hạn dùng thì... kệ nó",
          },
          {
            title: "Gộp vào combo khuyến mãi",
            hint: "Khách thích combo, không ai đọc kỹ nhãn",
          },
          {
            title: "Xếp lẫn với lô mới",
            hint: "Kệ trông đầy đặn, mong không ai soi",
          },
        ],
        cost: 0,
        score: -14,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "audit",
    title: "Email tiêu đề 'KIỂM TRA ĐỘT XUẤT'",
    story:
      "Quản lý vùng báo có thể ghé trong tuần. Tủ hồ sơ thì đang là tủ đồ linh tinh.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Thuê người sắp xếp hồ sơ",
            hint: "Mất tiền công, bìa nào ra bìa nấy",
          },
          {
            title: "Mua bìa, nhãn, làm lại từ đầu",
            hint: "Tốn văn phòng phẩm, lật trang nào cũng thấy",
          },
          {
            title: "Nhờ dịch vụ rà soát trước",
            hint: "Hơi đắt, bù lại biết mình thiếu gì",
          },
        ],
        cost: 18,
        score: 7,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Đóng cửa sớm để tự dọn",
            hint: "Mất vài khách cuối ngày, tủ gọn gàng hơn",
          },
          {
            title: "Rút một người khỏi quầy đi sắp xếp",
            hint: "Quầy chậm hơn, hồ sơ khá lên",
          },
          {
            title: "Dọn dần giữa các lượt khách",
            hint: "Vừa bán vừa dọn, ai cũng hơi chờ",
          },
        ],
        cost: 0,
        score: 3,
        demandFactor: 0.8,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Nhét hết vào thùng, khóa lại",
            hint: "Nhìn thì gọn, mở ra thì hết hồn",
          },
          {
            title: "Chắc họ không tới đâu",
            hint: "Cứ bán như thường, cầu mong may mắn",
          },
          {
            title: "Chuẩn bị câu 'để em tìm lại'",
            hint: "Không tốn gì, trừ khi họ ghé thật",
          },
        ],
        cost: 0,
        score: -12,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "queue",
    title: "Hàng chờ dài tới cột điện",
    story:
      "Phòng khám bên cạnh vừa tan ca, khách xếp hàng ra tận vỉa hè. Có người bắt đầu chen.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Gọi thêm người, phát số thứ tự",
            hint: "Tốn tiền công, hàng chờ trật tự hẳn",
          },
          {
            title: "Mua máy lấy số tạm thời",
            hint: "Hơi tốn, không ai phải cãi nhau",
          },
          {
            title: "Thuê bảo vệ hướng dẫn xếp hàng",
            hint: "Mất ít tiền, vỉa hè thông thoáng",
          },
        ],
        cost: 12,
        score: 6,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Nhờ khách quay lại sau",
            hint: "Một số người đi luôn, quầy dễ thở",
          },
          {
            title: "Chỉ bán món có sẵn ở quầy",
            hint: "Nhanh hơn nhưng khách thiếu lựa chọn",
          },
          {
            title: "Giới hạn số người vào tiệm",
            hint: "Hàng ngoài vẫn dài, trong tiệm thì gọn",
          },
        ],
        cost: 0,
        score: 2,
        demandFactor: 0.8,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Ai nhanh tay người đó được",
            hint: "Bán ào ào, hơi giống chợ phiên",
          },
          {
            title: "Bỏ bớt bước kiểm đơn cho nhanh",
            hint: "Quầy chạy vèo, chỉ mong không nhầm",
          },
          {
            title: "Để khách tự lấy hàng trên kệ",
            hint: "Đông vui, trật tự thì tùy duyên",
          },
        ],
        cost: 0,
        score: -12,
        demandFactor: 1.2,
      },
    ],
  },
  {
    id: "delivery",
    title: "Shipper lạc đường lần thứ ba",
    story:
      "Đơn giao cho khách quen bị trả về vì sai địa chỉ. Khách gọi hỏi bằng giọng rất kiên nhẫn.",
    choices: [
      {
        id: "careful",
        variants: [
          {
            title: "Tự giao lại, tặng kèm quà",
            hint: "Tốn tiền xe và quà, khách quen vẫn là khách quen",
          },
          {
            title: "Đổi đơn vị giao, bù phí cho khách",
            hint: "Mất một khoản, lần sau đỡ lạc",
          },
          {
            title: "Gọi xe riêng giao ngay",
            hint: "Đắt hơn, đơn tới nơi trong một nốt nhạc",
          },
        ],
        cost: 10,
        score: 6,
        demandFactor: 1,
      },
      {
        id: "practical",
        variants: [
          {
            title: "Hẹn khách ghé tiệm lấy",
            hint: "Khách hơi phiền, vài đơn khác cũng chậm lại",
          },
          {
            title: "Tạm dừng nhận đơn giao hôm nay",
            hint: "Bớt đơn, bớt rắc rối",
          },
          {
            title: "Gọi xin lỗi, giao lại vào ngày mai",
            hint: "Lịch sự, nhưng khách phải chờ thêm",
          },
        ],
        cost: 0,
        score: 3,
        demandFactor: 0.85,
      },
      {
        id: "shortcut",
        variants: [
          {
            title: "Bảo khách là lỗi của shipper",
            hint: "Mình không mất gì, khách thì nhớ đấy",
          },
          {
            title: "Nhận thêm đơn, giao dồn một lần",
            hint: "Doanh số lên, đơn cũ thì thêm trễ",
          },
          {
            title: "Im lặng, chờ khách hủy",
            hint: "Quầy vẫn bận rộn, điện thoại thì nằm úp",
          },
        ],
        cost: 0,
        score: -11,
        demandFactor: 1.2,
      },
    ],
  },
];

export function dailyOperationsCase(
  state: DeepReadonly<SimState>,
): OperationsCase | null {
  return state.day < 2
    ? null
    : OPERATIONS_CASES[(state.seed + state.day - 2) % OPERATIONS_CASES.length]!;
}

export interface OperationsChoiceView extends OperationsChoiceText {
  id: OperationsChoiceId;
  cost: number;
}

/** Trộn số nguyên 32-bit, đủ đều để bốc câu và xáo thứ tự nút. */
function mix(value: number): number {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * Cách trình bày sự cố hôm nay: câu chữ và thứ tự nút đổi theo seed + ngày
 * (ổn định khi render lại hay tải save), điểm và lượng khách được giấu.
 */
export function dailyOperationsView(
  state: DeepReadonly<SimState>,
): OperationsChoiceView[] {
  const incident = dailyOperationsCase(state);
  if (!incident) return [];
  const base = mix(state.seed * 7919 + state.day * 104729);
  const views = incident.choices.map((choice, index) => ({
    id: choice.id,
    cost: choice.cost,
    ...choice.variants[mix(base + index * 31) % choice.variants.length]!,
  }));
  for (let i = views.length - 1; i > 0; i--) {
    const j = mix(base + 1000 + i) % (i + 1);
    [views[i], views[j]] = [views[j]!, views[i]!];
  }
  return views;
}

export type OperationsResult =
  | "ok"
  | "already-chosen"
  | "no-case"
  | "insufficient-funds"
  | "transfer-pending";

export function chooseOperations(
  state: SimState,
  id: OperationsChoiceId,
  emit: Emit,
): OperationsResult {
  if (state.operations.pendingTransfer) return "transfer-pending";
  const incident = dailyOperationsCase(state);
  if (!incident) return "no-case";
  if (state.operations.choice) return "already-chosen";
  const choice = incident.choices.find((item) => item.id === id);
  if (!choice) return "no-case";
  if (state.money < choice.cost) return "insufficient-funds";
  state.money -= choice.cost;
  state.stats.spentOnOperations =
    (Number.isFinite(state.stats.spentOnOperations)
      ? state.stats.spentOnOperations
      : 0) + choice.cost;
  state.operations.choice = id;
  state.operations.demandFactor = choice.demandFactor;
  state.operations.score = Math.max(
    0,
    Math.min(100, state.operations.score + choice.score),
  );
  emit({
    type: "operationsChosen",
    incident: incident.id,
    choice: id,
    score: state.operations.score,
  });
  return "ok";
}

/** Cuối ngày đánh giá số liệu thực tế, ngoài lựa chọn của người chơi. */
export function evaluateOperations(
  state: SimState,
  report: DayReport,
  emit: Emit,
): void {
  const incident = dailyOperationsCase(state);
  if (incident && !state.operations.choice)
    state.operations.score = Math.max(0, state.operations.score - 5);
  const delta =
    (report.grade === 3
      ? 5
      : report.grade === 2
        ? 1
        : report.grade === 1
          ? -4
          : -8) -
    (report.wagesOwed > 0 ? 8 : 0) -
    (report.prepDone !== null && report.prepDone < 4 ? 3 : 0) -
    Math.min(4, report.expiredStock) -
    Math.min(4, report.lateDeliveries + report.cancelledDeliveries);
  state.operations.score = Math.max(
    0,
    Math.min(100, state.operations.score + delta),
  );
  report.operationsScore = state.operations.score;
  report.operationsChange =
    state.operations.score - state.operations.scoreAtDayStart;
  report.incident = incident?.id ?? null;
  report.incidentChoice = state.operations.choice;
  if (
    (state.day >= 10 && state.operations.score <= 15) ||
    report.wagesOwed >= 100
  ) {
    state.operations.pendingTransfer = true;
    emit({
      type: "transferOrdered",
      score: state.operations.score,
      wagesOwed: report.wagesOwed,
    });
  }
}

/** Người chơi nhận chi nhánh nhỏ: tiến độ chi nhánh đặt lại, số lần điều chuyển giữ lại. */
export function acceptTransfer(state: SimState, emit: Emit): boolean {
  if (!state.operations.pendingTransfer) return false;
  const count = state.operations.transfers + 1;
  const fresh = createInitialState(state.seed + count * 7919, state.config);
  fresh.operations.transfers = count;
  // Bộ sưu tập là của người chơi, đi theo sang chi nhánh mới; món đeo trên nhân viên cũ được cất lại.
  fresh.collection = state.collection;
  Object.assign(state, fresh);
  pruneEquipped(state);
  emit({ type: "transferAccepted", transfers: count });
  return true;
}
