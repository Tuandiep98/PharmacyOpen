import type { AgeGroup } from "../types";

/*
 * Chuyện khách quen kể ở quầy sau khi mua xong. Chuyện đời thường, không nói về bệnh, thuốc hay kết quả
 * sức khoẻ (cổng kiểm duyệt nội dung kiểm tra). Mỗi chuyện có mở đầu, các đoạn giữa (khách kể → người bán
 * đáp) và câu kết. Kể không hết thì lần ghé sau kể tiếp từ đoạn dở.
 *
 * Ký hiệu thay thế: {me} khách tự xưng · {you} khách gọi người bán · {w} tên người bán (người chơi thì
 * dùng như {you}) · {a}/{A} người bán gọi khách · {s}/{S} người bán tự xưng.
 *
 * Độ sâu: 1 = chuyện vui thường ngày (khách quen mặt), 2 = chuyện xóm giềng, kỷ niệm (khách đã thân
 * hơn), 3 = chuyện riêng, dự định lớn (khách thân và cởi mở).
 */

export interface StoryBeat {
  say: string;
  reply: string;
}

export interface StoryDef {
  id: string;
  title: string;
  ages: AgeGroup[];
  gender?: "female" | "male";
  depth: 1 | 2 | 3;
  opening: string;
  beats: StoryBeat[];
  ending: string;
}

export const STORIES: Record<string, StoryDef> = {
  "young-exam": {
    id: "young-exam",
    title: "Mùa thi cuối kỳ",
    ages: ["young"],
    depth: 1,
    opening: "{You} ơi, tuần sau {me} thi cuối kỳ rồi, run ghê.",
    beats: [
      {
        say: "Môn khó nhất lại thi đầu tiên, {me} ôn tới khuya luôn.",
        reply: "Cố lên {a}, ôn đều là chắc tay mà.",
      },
      {
        say: "Nhóm {me} chia nhau làm đề cương, đứa nào cũng tô màu loè loẹt.",
        reply: "Nghe vui ghê, học nhóm vậy đỡ buồn ngủ ha.",
      },
      {
        say: "Thi xong {me} tính đi Đà Lạt với tụi bạn.",
        reply: "Đà Lạt mùa này đẹp lắm, nhớ mang áo ấm nha {a}.",
      },
    ],
    ending: "Thôi {me} về ôn tiếp đây, thi xong ghé kể {you} nghe!",
  },
  "young-kitten": {
    id: "young-kitten",
    title: "Bé mèo Bánh Bao",
    ages: ["young", "adult"],
    depth: 1,
    opening: "{me} mới nhận nuôi một bé mèo mướp đó {you}.",
    beats: [
      {
        say: "Nó bé xíu, tối nào cũng chui vô giày {me} ngủ.",
        reply: "{S} cũng mê mèo lắm, bé tên gì vậy {a}?",
      },
      {
        say: "{me} đặt tên là Bánh Bao, vì nó tròn vo.",
        reply: "Bánh Bao, nghe dễ thương ghê!",
      },
      {
        say: "Hôm qua nó làm đổ nguyên chậu cây của mẹ {me}.",
        reply: "Trời, chắc bị la một trận rồi ha.",
      },
    ],
    ending: "Lần sau {me} mang hình Bánh Bao cho {you} xem nha!",
  },
  "young-firstjob": {
    id: "young-firstjob",
    title: "Tuần đầu đi làm",
    ages: ["young"],
    depth: 1,
    opening: "{You} biết không, {me} vừa đi làm được tuần đầu.",
    beats: [
      {
        say: "Công ty toàn anh chị lớn, {me} còn chưa dám nói nhiều.",
        reply: "Tuần đầu ai cũng vậy mà {a}, từ từ sẽ quen.",
      },
      {
        say: "Hôm qua {me} được giao làm bảng số liệu đầu tiên.",
        reply: "Giỏi ghê, sếp khen không {a}?",
      },
      {
        say: "Sếp bảo được, mà sửa lại màu chữ cho đỡ chói.",
        reply: "Vậy là qua ải rồi đó!",
      },
    ],
    ending: "Cảm ơn {you} nghe {me} kể, tự nhiên thấy nhẹ nhõm hẳn.",
  },
  "young-band": {
    id: "young-band",
    title: "Nhóm nhạc trong hẻm",
    ages: ["young"],
    depth: 2,
    opening: "Tối nay nhóm nhạc của {me} tập ở hẻm bên kia đó.",
    beats: [
      {
        say: "{me} chơi trống, mà hàng xóm hay qua gõ cửa quá.",
        reply: "Chắc tại tiếng trống vang xa ha {a}.",
      },
      {
        say: "Tụi {me} đang tập một bài để diễn ở quán cà phê cuối tuần.",
        reply: "Vui ghê, {s} mà rảnh là đi coi liền.",
      },
      {
        say: "Bài đó {me} tự viết lời, kể về con hẻm này nè.",
        reply: "Hay quá, có tiệm mình trong bài không {a}?",
      },
    ],
    ending: "Có luôn! Hôm diễn {me} rủ {you} đi nha.",
  },
  "adult-school": {
    id: "adult-school",
    title: "Buổi đầu đi học của con",
    ages: ["adult"],
    depth: 1,
    opening: "Sáng nay con {me} đi học buổi đầu tiên đó {you}.",
    beats: [
      {
        say: "Tới cổng trường nó ôm chân {me} không chịu vô.",
        reply: "Trời, chắc {a} cũng rưng rưng ha.",
      },
      {
        say: "Cô giáo dỗ một hồi, nó quay lại vẫy tay, {me} mới dám về.",
        reply: "Cô giáo khéo ghê.",
      },
      {
        say: "Chiều nay đón, thế nào nó cũng kể cả tiếng.",
        reply: "Nghe con kể chuyện trường là vui nhất đó {a}.",
      },
    ],
    ending: "Thôi {me} đi chợ nấu món nó thích, chiều còn đón con.",
  },
  "adult-garden": {
    id: "adult-garden",
    title: "Vườn rau sân thượng",
    ages: ["adult", "senior"],
    depth: 1,
    opening: "Mấy chậu cà chua trên sân thượng nhà {me} ra trái rồi {you}.",
    beats: [
      {
        say: "Đợt đầu có ba trái, cả nhà chia nhau mỗi người một miếng.",
        reply: "Tự trồng ăn là thấy ngon nhất rồi {a}.",
      },
      {
        say: "{me} còn ươm thêm rau húng với tía tô.",
        reply: "Nghe thơm lừng luôn đó.",
      },
      {
        say: "Tuần sau thu hoạch, {me} mang cho {you} một bó.",
        reply: "Dạ {s} cảm ơn {a} trước nha!",
      },
    ],
    ending: "Nói là làm nha, tuần sau {me} ghé mang rau qua.",
  },
  "adult-move": {
    id: "adult-move",
    title: "Hàng xóm mới",
    ages: ["adult", "young"],
    depth: 1,
    opening: "Nhà {me} vừa chuyển về hẻm này được một tháng.",
    beats: [
      {
        say: "Chỗ cũ ồn quá, ở đây sáng nào cũng nghe chim hót.",
        reply: "Hẻm mình yên lắm {a}, hàng xóm cũng dễ thương.",
      },
      {
        say: "{me} còn chưa biết quán phở nào ngon quanh đây.",
        reply: "Quán đầu hẻm ngon lắm, sáng sớm là đông.",
      },
      {
        say: "Vậy mai {me} thử liền.",
        reply: "Ăn rồi ghé kể {s} nghe nha.",
      },
    ],
    ending: "Có {you} chỉ đường là {me} quen xóm nhanh ghê.",
  },
  "adult-cooking": {
    id: "adult-cooking",
    title: "Cuộc thi nấu ăn của phường",
    ages: ["adult", "senior"],
    depth: 2,
    opening: "Cuối tuần rồi {me} thi nấu ăn ở phường đó {you}.",
    beats: [
      {
        say: "{me} làm món canh chua, công thức của bà ngoại.",
        reply: "Nghe là thấy thèm rồi {a}.",
      },
      {
        say: "Lúc nêm {me} run tay, cho hơi nhiều me.",
        reply: "Vậy mà chắc vẫn ngon ha.",
      },
      {
        say: "Ban giám khảo khen, {me} được giải ba!",
        reply: "Ôi chúc mừng {a} nha!",
      },
    ],
    ending: "Lần sau có dịp {me} nấu mời cả tiệm luôn.",
  },
  "adult-wedding": {
    id: "adult-wedding",
    title: "Đám cưới em gái",
    ages: ["adult", "young"],
    depth: 2,
    opening: "Tháng sau em gái {me} lấy chồng rồi {you} ạ.",
    beats: [
      {
        say: "Cả nhà đang lo in thiệp, chọn màu cãi nhau mấy bữa.",
        reply: "Chuyện vui mà, cãi nhau chút cho rôm rả {a}.",
      },
      {
        say: "Cuối cùng chọn màu kem, ai cũng chịu.",
        reply: "Màu kem nhẹ nhàng, sang ghê.",
      },
      {
        say: "{me} được giao lo phần bánh kẹo, tối nào cũng thử bánh.",
        reply: "Việc đó {s} xin làm phụ luôn!",
      },
    ],
    ending: "Có bánh ngon {me} để dành một hộp cho {you}.",
  },
  "senior-grandkids": {
    id: "senior-grandkids",
    title: "Mấy đứa cháu về chơi",
    ages: ["senior"],
    depth: 1,
    opening: "Hè này mấy đứa cháu nội về chơi với {me} đó {you}.",
    beats: [
      {
        say: "Đứa lớn cao hơn {me} rồi, đứa nhỏ thì còn bi bô.",
        reply: "Nhà có tiếng trẻ con là vui nhà vui cửa {a} ha.",
      },
      {
        say: "Tụi nó đòi {me} dạy thả diều ngoài bãi đất trống.",
        reply: "Thả diều chiều gió là đẹp nhất đó {a}.",
      },
      {
        say: "Diều {me} tự dán bằng giấy báo mà bay cao lắm.",
        reply: "{A} khéo tay ghê!",
      },
    ],
    ending:
      "Mai tụi nó về quê ngoại, {me} lại ghé tiệm nói chuyện cho đỡ nhớ.",
  },
  "senior-dance": {
    id: "senior-dance",
    title: "Hội nhảy công viên",
    ages: ["senior", "adult"],
    gender: "female",
    depth: 1,
    opening: "Sáng nào {me} cũng tập nhảy với hội chị em ở công viên.",
    beats: [
      {
        say: "Tuần này tập bài mới, bước chân loạn hết cả lên.",
        reply: "Tập vài buổi là nhuần nhuyễn liền {a}.",
      },
      {
        say: "Hội {me} còn may đồng phục áo đỏ, nhìn rực rỡ lắm.",
        reply: "Chắc đi ngang ai cũng ngó ha.",
      },
      {
        say: "Cuối tháng hội diễn ở nhà văn hoá phường.",
        reply: "{S} mà được nghỉ là đi cổ vũ {a} liền.",
      },
    ],
    ending: "Nhớ nha, {me} diễn hàng đầu đó!",
  },
  "senior-fishing": {
    id: "senior-fishing",
    title: "Buổi câu cá với bạn già",
    ages: ["senior", "adult"],
    gender: "male",
    depth: 1,
    opening: "Chủ nhật rồi {me} đi câu cá với ông bạn già.",
    beats: [
      {
        say: "Ngồi từ sáng tới trưa, cá không cắn con nào.",
        reply: "Đi câu là vui cái không khí thôi {a} ha.",
      },
      {
        say: "Tới chiều thì ổng câu được con cá rô to bằng bàn tay.",
        reply: "Vậy là có quà mang về rồi!",
      },
      {
        say: "Ổng khoe suốt đường về, {me} nghe mệt luôn.",
        reply: "Bạn già với nhau là vậy đó {a}.",
      },
    ],
    ending: "Tuần sau {me} gỡ lại, câu con to hơn cho ổng biết.",
  },
  "senior-photos": {
    id: "senior-photos",
    title: "Xấp ảnh cũ của con hẻm",
    ages: ["senior"],
    depth: 2,
    opening: "Hôm qua dọn tủ, {me} tìm được xấp ảnh cũ.",
    beats: [
      {
        say: "Có tấm chụp hẻm này hồi còn là đường đất.",
        reply: "Thật hả {a}? Hồi đó chắc khác lắm.",
      },
      {
        say: "Chỗ tiệm mình bây giờ hồi xưa là tiệm may của bà Sáu.",
        reply: "{S} mới nghe lần đầu luôn đó.",
      },
      {
        say: "Bà Sáu may áo dài đẹp nhất xóm, ai cưới cũng tới đặt.",
        reply: "Nghe như chuyện phim vậy {a}.",
      },
      {
        say: "{me} còn giữ cái áo dài bà may cho đám cưới của {me}.",
        reply: "Chắc {a} quý cái áo đó lắm.",
      },
    ],
    ending: "Lần sau {me} mang ảnh cho {you} xem tiệm mình ngày xưa.",
  },
  "adult-market": {
    id: "adult-market",
    title: "Chợ đầu hẻm sửa mái",
    ages: ["adult", "senior"],
    depth: 2,
    opening: "Chợ đầu hẻm sắp sửa lại mái, {you} nghe chưa?",
    beats: [
      {
        say: "Mấy cô bán rau lo lắm, không biết dời đi đâu.",
        reply: "Mong là sửa nhanh cho bà con bán lại {a} ha.",
      },
      {
        say: "Hội phụ nữ đang xin chỗ tạm ở sân nhà văn hoá.",
        reply: "Chỗ đó rộng, chắc đi chợ còn tiện hơn.",
      },
      {
        say: "{me} xung phong phụ kê bàn ghế cuối tuần.",
        reply: "{A} nhiệt tình ghê, cần thêm người {s} phụ một tay.",
      },
    ],
    ending: "Được vậy thì vui quá, để {me} báo hội nha.",
  },
  "adult-running": {
    id: "adult-running",
    title: "Nhóm chạy bộ của xóm",
    ages: ["adult", "young"],
    depth: 1,
    opening: "Sáng nay {me} chạy bộ được năm cây số rồi {you}.",
    beats: [
      {
        say: "Tuần đầu {me} chạy một vòng là thở không ra hơi.",
        reply: "Vậy mà giờ năm cây số, giỏi ghê {a}.",
      },
      {
        say: "Nhóm chạy của {me} toàn người xóm mình.",
        reply: "Vậy là có bạn chạy chung rồi, đỡ lười.",
      },
    ],
    ending: "Có hôm nào {you} rảnh thì chạy chung nha!",
  },
  "young-abroad": {
    id: "young-abroad",
    title: "Chuyến đi du học",
    ages: ["young", "adult"],
    depth: 3,
    opening: "{You} ơi, {me} sắp đi du học rồi.",
    beats: [
      {
        say: "Giấy tờ lo cả năm, giờ mới có kết quả.",
        reply: "Chúc mừng {a}! Chắc cả nhà mừng lắm.",
      },
      {
        say: "Mẹ {me} vui mà cứ lén khóc, bảo xa quá.",
        reply: "Mẹ nào cũng vậy mà {a}, thương con thôi.",
      },
      {
        say: "{me} tính mỗi tuần gọi về cho mẹ hai lần.",
        reply: "Vậy mẹ yên tâm hơn nhiều đó.",
      },
      {
        say: "Đi rồi chắc {me} nhớ nhất là con hẻm này.",
        reply: "Hẻm vẫn ở đây chờ {a} về mà.",
      },
    ],
    ending: "Hôm nào về nước {me} ghé tiệm đầu tiên luôn.",
  },
  "adult-bakery": {
    id: "adult-bakery",
    title: "Giấc mơ tiệm bánh",
    ages: ["adult"],
    depth: 3,
    opening: "{me} đang tính mở một tiệm bánh nhỏ đầu ngõ.",
    beats: [
      {
        say: "Làm văn phòng mười năm, giờ muốn làm việc mình thích.",
        reply: "Nghe {a} nói là thấy háo hức giùm luôn.",
      },
      {
        say: "Mà lo lắm, không biết có ai mua không.",
        reply: "Bánh ngon thì khách tự tìm tới, như tiệm {s} nè.",
      },
      {
        say: "{me} nướng thử mấy mẻ, cả nhà ăn không kịp.",
        reply: "Vậy là tay nghề ổn rồi {a}!",
      },
      {
        say: "Ngày khai trương {me} mời {you} qua ăn thử nha.",
        reply: "Dạ {s} nhất định tới!",
      },
    ],
    ending: "Có người ủng hộ là {me} thấy có động lực liền.",
  },
  "senior-letters": {
    id: "senior-letters",
    title: "Những lá thư tay",
    ages: ["senior"],
    depth: 3,
    opening: "Cháu gái {me} ở xa vẫn viết thư tay gửi {me} đó {you}.",
    beats: [
      {
        say: "Thời buổi này mà nó vẫn chịu khó viết, chữ đẹp lắm.",
        reply: "Quý ghê {a}, bây giờ ít ai viết thư tay.",
      },
      {
        say: "Thư nào nó cũng kẹp một chiếc lá phong khô.",
        reply: "Chắc bên đó đang mùa thu ha {a}.",
      },
      {
        say: "{me} gom hết vào một cuốn sổ, lâu lâu mở ra đọc.",
        reply: "Cuốn sổ đó là báu vật rồi.",
      },
      {
        say: "{me} đang tập viết thư trả lời, lâu không viết nên chữ run.",
        reply: "Chữ run cũng là chữ của {a}, cháu đọc là mừng liền.",
      },
    ],
    ending: "Nói chuyện với {you} xong {me} muốn về viết thư liền.",
  },
};

export const STORY_IDS = Object.keys(STORIES);

/** Khách kể tiếp chuyện dở từ lần trước. */
export const STORY_RESUME = [
  "Kể tiếp chuyện hôm trước nè {you}.",
  "Hôm trước {me} kể tới đâu rồi ta… à nhớ rồi.",
  "Để {me} kể nốt chuyện lần trước cho {you} nghe.",
];

/** Kể đủ phần dự định mà chuyện chưa hết: hẹn lần sau kể tiếp. */
export const STORY_PAUSE = [
  "Thôi, còn nữa mà để lần sau {me} kể tiếp nha.",
  "Kể nữa là trễ giờ mất, lần sau {me} kể tiếp.",
  "Chuyện còn dài, hôm khác {me} ghé kể nốt.",
];

/** Người bán xin phép nhường khách sau (có người đang chờ): khách thông cảm, hẹn kể tiếp. */
export const STORY_YIELD = [
  "Ấy, có người chờ rồi, {you} bán cho khách sau đi.",
  "Thôi {me} không giữ {you} nữa, khách đang chờ kìa.",
  "Để hôm khác {me} kể tiếp, {you} lo khách đi.",
];

export const STORY_YIELD_STAFF = [
  "Dạ {s} xin phép bán cho khách sau, lần sau {a} kể tiếp nha.",
  "{A} thông cảm, {s} lo khách chút, hôm khác nghe tiếp ạ.",
];

/** Cắt ngang khi chẳng có ai chờ: khách hơi hụt hẫng. */
export const STORY_CUT = [
  "À… ừ, vậy thôi {me} về.",
  "Ờ, {you} bận thì thôi vậy.",
];
