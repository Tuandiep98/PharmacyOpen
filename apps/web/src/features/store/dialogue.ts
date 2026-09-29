import {
  customerName,
  looksFemale,
  PRODUCTS,
  REQUESTS,
  serviceTone,
  stableHash,
  type ArchetypeId,
  type Customer,
  type CustomerOutcome,
  type DeepReadonly,
  type LoyaltyProfile,
  type Order,
  type ProductId,
  type ServiceTone,
  type SimState,
  type Worker,
} from '@pharmacy/simulation';
import { BRAND } from '../../brand';

/*
 * Lời thoại ở quầy theo nhịp: chào hỏi → hỏi hàng → chốt số lượng → chuyện phiếm lúc chờ → thanh toán
 * (hoặc khuyên đi khám, báo hết hàng). Câu của khách tuỳ kiểu khách, độ quen và độ sốt ruột; câu của
 * người bán tuỳ giọng giao tiếp (`serviceTone`, cùng tiêu chí khách dùng để chấm điểm).
 *
 * Xưng hô theo vai vế: khách vội/khó tính là anh chị (người bán xưng "em"), khách cẩn thận là cô chú,
 * khách tiết kiệm là bác (người bán xưng "cháu"), khách hay hỏi ngang hàng ("bạn" – "mình"). Khách khó
 * tính xưng "tôi" cho có khoảng cách. Khách quen gọi người bán bằng tên.
 *
 * Chọn câu: mỗi (khách, nhịp) nhớ câu đã chọn nên không nhảy mỗi khung hình; mỗi kho câu nhớ vài câu vừa
 * dùng để khách sau không lặp lại câu khách trước. Chỉ để hiển thị: không đổi luật chơi.
 */

type State = DeepReadonly<SimState>;
type C = DeepReadonly<Customer>;
type O = DeepReadonly<Order>;
type W = DeepReadonly<Worker>;

export interface Line {
  text: string;
  productId?: ProductId;
  /** 0..1: tiến độ việc người bán đang làm (lấy hàng, thanh toán…). */
  progress?: number;
  mood?: 'normal' | 'urgent' | 'happy';
  /** Lời của khách quen: bong bóng có màu riêng. */
  regular?: boolean;
}

// ---------- Chọn câu không lặp ----------

const chosen = new Map<string, string>();
const recentByPool = new Map<string, string[]>();
const MEMO_LIMIT = 800;

/**
 * Chọn một câu trong `list` cho `key`, ổn định qua các lần vẽ. Câu mới tránh những câu vừa dùng gần đây
 * trong cùng kho (nhớ khoảng nửa kho) để hai khách liên tiếp hiếm khi nói y hệt nhau.
 */
function pick(pool: string, list: readonly string[], key: string): string {
  const memoKey = `${pool}|${key}`;
  const hit = chosen.get(memoKey);
  if (hit !== undefined && list.includes(hit)) return hit;
  const recent = recentByPool.get(pool) ?? [];
  const start = stableHash(memoKey) % list.length;
  let choice = list[start]!;
  for (let i = 0; i < list.length; i++) {
    const candidate = list[(start + i) % list.length]!;
    if (!recent.includes(candidate)) {
      choice = candidate;
      break;
    }
  }
  recent.push(choice);
  while (recent.length > Math.ceil(list.length / 2)) recent.shift();
  recentByPool.set(pool, recent);
  chosen.set(memoKey, choice);
  if (chosen.size > MEMO_LIMIT) chosen.delete(chosen.keys().next().value!);
  return choice;
}

// ---------- Xưng hô ----------

interface Voice {
  /** Người bán gọi khách (vd. "chị"). */
  honor: string;
  /** Người bán tự xưng với khách. */
  staffSelf: string;
  /** Khách tự xưng. */
  me: string;
  /** Khách gọi người bán. */
  you: string;
}

function voiceOf(customer: C): Voice {
  const female = looksFemale(customer.look.hairStyle);
  switch (customer.archetypeId) {
    case 'hurried': {
      const honor = female ? 'chị' : 'anh';
      return { honor, staffSelf: 'em', me: honor, you: 'em' };
    }
    case 'demanding':
      return { honor: female ? 'chị' : 'anh', staffSelf: 'em', me: 'tôi', you: 'em' };
    case 'careful': {
      const honor = female ? 'cô' : 'chú';
      return { honor, staffSelf: 'cháu', me: honor, you: 'cháu' };
    }
    case 'thrifty':
      return { honor: 'bác', staffSelf: 'cháu', me: 'bác', you: 'cháu' };
    case 'curious':
      return { honor: 'bạn', staffSelf: 'mình', me: 'mình', you: 'bạn' };
  }
}

/** Giữa câu thì danh xưng viết thường: "Chị Dung" → "chị Dung". */
const inSentence = (name: string) => name.replace(/^(Anh|Chị|Cô|Chú|Bác) /, (m) => m.toLowerCase());
const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const productName = (id: ProductId) => PRODUCTS[id].name.toLowerCase();
const shortName = (worker: W) => worker.name.split(' ').pop() || worker.name;

// ---------- Khách quen ----------

export type Familiarity = 'new' | 'known' | 'close';

function profileOf(state: State, customer: C): DeepReadonly<LoyaltyProfile> | undefined {
  return customer.loyaltyId ? state.loyalty.find((p) => p.id === customer.loyaltyId) : undefined;
}

/** Khách mới, khách quen mặt (ghé 1–2 lần) hay khách thân (từ 3 lần). */
export function familiarity(state: State, customer: C): Familiarity {
  const profile = profileOf(state, customer);
  if (!profile) return 'new';
  return profile.visits >= 3 ? 'close' : 'known';
}

// ---------- Kho câu của khách ----------
// {me}: khách tự xưng · {you}: khách gọi người bán · {w}: tên người bán · {p}: tên món

const GREET: Record<ArchetypeId, string[]> = {
  hurried: [
    '{You} ơi, {me} mua nhanh thôi nha!',
    'Nhanh giúp {me} với {you} ơi!',
    'Chào {you}, {me} đang gấp chút.',
    '{me} ghé tạt qua thôi, lẹ giúp {me} nha.',
    'Kịp không {you}? {me} còn phải đón con.',
    'Chào {you}, {me} tranh thủ giờ nghỉ trưa.',
    '{You} ơi, xe {me} đang đậu ngoài kia.',
  ],
  demanding: [
    'Có ai bán hàng không?',
    'Chào, cho {me} hỏi chút.',
    '{You} ơi, ra đây {me} hỏi.',
    'Tiệm này mới mở à? {me} xem thử.',
    'Nói nhanh gọn giúp {me} nhé.',
    '{me} hỏi một lần thôi đấy.',
    'Quầy này có ai trực không vậy?',
  ],
  careful: [
    'Chào {you}.',
    '{You} ơi, cho {me} hỏi chút.',
    '{me} ghi sẵn giấy rồi đây, {you} xem giúp.',
    'Để {me} đeo kính đã… rồi, {you} ơi.',
    'Chào {you}, {me} hỏi kỹ chút không phiền chứ?',
    '{You} cho {me} hỏi, tiệm mình có món này không?',
  ],
  thrifty: [
    'Chào {you}, hôm nay có gì rẻ không?',
    '{You} ơi!',
    '{You} ơi, dạo này giá có lên không?',
    'Có khuyến mãi gì không {you}?',
    '{me} đi chợ về, ghé mua chút đồ.',
    'Chào {you}, {me} xem giá trước đã nha.',
  ],
  curious: [
    'Chào {you}!',
    'Chào, cho mình hỏi xíu nha.',
    'Tiệm dễ thương ghê, mình vào xem chút.',
    'Hi {you}, mình mới dọn về gần đây.',
    'Ủa tiệm mới bày lại kệ hả? Đẹp ghê.',
    'Chào {you}, hỏi thăm chút được không?',
  ],
};

const GREET_KNOWN = [
  'Lại là {me} đây, chào {you}!',
  'Chào {you}, lâu rồi mới ghé.',
  '{You} còn nhớ {me} không?',
  '{me} lại ghé nè {you}.',
  'Hôm trước {me} mua ở đây thấy ổn nên quay lại.',
  'Chào {you}, tiệm vẫn vậy ha.',
];

const GREET_CLOSE = [
  '{w} ơi, {me} tới rồi nè!',
  'Chào {w}, hôm nay tiệm đông không?',
  '{w} ơi, như mọi khi nha.',
  'Ghé thăm {w} với cả tiệm đây.',
  '{me} đi ngang là phải ghé {w} một chút.',
  '{w} khoẻ không? Dạo này bận ghê ha.',
  'Tiệm của {w} lúc nào cũng gọn gàng ghê.',
];

/** Khách quen nhắc lại lần ghé trước. */
const RECALL: Partial<Record<CustomerOutcome, string[]>> = {
  bought: ['Lần trước {you} tư vấn kỹ ghê, {me} nhớ mãi.', 'Món lần trước dùng hợp lắm {you} ạ.'],
  referred: ['Hôm trước nghe {you} dặn, {me} đi khám rồi đó.', 'Cảm ơn {you} hôm trước nhắc {me} đi khám nha.'],
  backordered: ['Hàng hôm trước giao tới tận nhà, tiện ghê.', 'Đơn ship lần trước {me} nhận rồi nha {you}.'],
  'went-elsewhere': ['Lần trước tiệm hết hàng, hôm nay còn chứ {you}?', 'Hôm trước {me} ghé mà tiệm hết món, nay thử lại.'],
};

const ASK_NAMED: Record<ArchetypeId, string[]> = {
  hurried: ['Còn {p} không {you}?', 'Lấy {me} {p}, nhanh nha!', '{p} còn không, {me} lấy liền.'],
  demanding: ['Có {p} không?', 'Đưa {me} {p}, loại tốt ấy.', '{p} ở đây có không đấy?'],
  careful: ['Còn {p} không {you}?', '{You} xem giúp {me} còn {p} không.', '{me} cần {p}, {you} tìm giúp nhé.'],
  thrifty: ['Còn {p} không {you}? Bao nhiêu một cái?', '{p} tiệm bán giá sao {you}?', 'Lấy {me} {p}, loại vừa tiền thôi.'],
  curious: ['Tiệm có {p} không {you}?', '{p} bên mình còn không ta?', 'Cho mình hỏi {p} có không nè?'],
};

const ASK_NAMED_REGULAR = ['Như mọi khi, {p} nha {you}.', 'Cho {me} {p} như lần trước nhé.', '{p} quen thuộc của {me} đó {you}.'];

const QUANTITY: Record<ArchetypeId, string[]> = {
  hurried: ['Một cái thôi, lẹ nha.', 'Một cái đủ rồi {you}.', 'Lấy một, {me} đi liền.'],
  demanding: ['Một cái. Hàng mới chứ?', 'Lấy một, xem hạn giúp {me}.', 'Một cái thôi, đừng lấy hộp móp.'],
  careful: ['Lấy một cái thôi {you} nhé.', '{You} xem hạn dùng giúp {me} với.', 'Một cái là đủ rồi.'],
  thrifty: ['Lấy một cái thôi, loại vừa tiền nha.', 'Một cái thôi, để {me} xem đã.', 'Mua một, lần sau {me} ghé tiếp.'],
  curious: ['Một cái thôi nè.', 'Cho mình một cái nha.', 'Lấy một, dùng thử trước đã.'],
};

/** Chuyện phiếm lúc chờ người bán lấy hàng. */
const CHITCHAT: Record<ArchetypeId, string[]> = {
  hurried: [
    'Đường giờ này kẹt xe quá trời.',
    'Sáng giờ {me} chạy việc chưa ngồi được chút nào.',
    'Trễ giờ đón con rồi, may tiệm gần.',
    'Công ty {me} họp liên miên cả tuần.',
    'Hôm nay nắng chói mắt luôn {you} ơi.',
  ],
  demanding: [
    'Tiệm bên kia bán chậm lắm, nên {me} qua đây.',
    'Kệ này xếp lại hợp lý hơn đấy.',
    'Nhạc tiệm mở nhỏ thôi là vừa.',
    'Lần sau nhớ dán giá rõ ràng nhé.',
    'Nhân viên đông mà vẫn chờ, lạ thật.',
  ],
  careful: [
    'Dạo này mưa nắng thất thường quá {you} ha.',
    'Cháu nội {me} mới vào lớp một rồi đó.',
    'Sáng nay {me} đi tập dưỡng sinh về.',
    '{me} thích tiệm này sạch sẽ, gọn gàng.',
    'Chợ sáng nay rau rẻ lắm {you} ạ.',
  ],
  thrifty: [
    'Chợ giờ cái gì cũng lên giá hết.',
    'Tháng này tiền điện nhà {me} tăng quá trời.',
    'Hôm qua bên kia bán mắc hơn đó.',
    'Có tích điểm không {you}? Để {me} lấy thẻ.',
    'Nhà {me} có vườn rau, bữa nào mang cho {you} ăn.',
  ],
  curious: [
    'Cái kệ này mới đóng hả, đẹp ghê.',
    'Tiệm mở lâu chưa {you}?',
    'Bạn làm ở đây có vui không?',
    'Tối qua xem bóng đá không? Hay dữ luôn.',
    'Gần đây có quán cà phê nào ngon không {you}?',
    'Logo tiệm dễ thương ghê, ai vẽ vậy?',
  ],
};

const CHITCHAT_REGULAR = [
  '{w} dạo này có đi chơi đâu không?',
  'Nhà {me} vừa sơn lại cổng, hôm nào ghé chơi.',
  'Tuần trước {me} về quê, mang ít trái cây cho tiệm nè.',
  'Tiệm đông khách hơn hồi trước nhiều ha {w}.',
  'Con {me} khen tiệm này hoài đó {you}.',
  '{w} làm ở đây lâu chưa nhỉ, thấy quen ghê.',
  'Mưa mấy bữa nay, tiệm có vắng không {you}?',
];

const PAY: Record<ArchetypeId, string[]> = {
  hurried: ['Quẹt mã cho nhanh nha.', '{me} chuyển khoản liền.', 'Không cần túi đâu {you}.'],
  demanding: ['Tính tiền đi.', 'Có hoá đơn không?', 'Thối đúng tiền giúp {me}.'],
  careful: ['Gửi tiền mặt nè {you}.', '{You} đếm lại giúp {me} nhé.', 'Cho {me} xin cái túi nhỏ.'],
  thrifty: ['Bớt chút được không {you}?', 'Làm tròn giúp {me} nha.', 'Tiền lẻ đây, đủ không {you}?'],
  curious: ['Mình chuyển khoản nhé.', 'Quét mã được không {you}?', 'Có tích điểm không ta?'],
};

const HURRY: Record<ArchetypeId, string[]> = {
  hurried: ['Nhanh giúp {me} với {you} ơi!', '{me} đang vội lắm!', 'Sắp trễ giờ rồi {you} ơi!', 'Còn lâu không {you}?'],
  demanding: ['Sao lâu vậy?', 'Làm ăn kiểu gì chậm thế?', '{me} chờ nãy giờ rồi đấy.', 'Có ai lo cho {me} không?'],
  careful: ['Không vội đâu {you}, cứ từ từ.', '{me} chờ được, {you} cứ làm.', 'Từ từ thôi kẻo nhầm {you} ạ.'],
  thrifty: ['Còn lâu không {you}?', '{me} đứng mỏi chân rồi.', 'Lâu quá, hay để bữa khác?'],
  curious: ['Chắc hôm nay tiệm đông ha?', 'Không sao, mình ngắm kệ chút.', 'Bạn bận ghê ha.'],
};

const WRONG = ['Không phải cái này đâu!', 'Ơ, {me} cần món khác mà.', '{You} lấy nhầm rồi.', 'Cái này {me} không cần.'];

const LEAVE: Record<CustomerOutcome, string[]> = {
  bought: ['Cảm ơn nha!', 'Hẹn gặp lại nhé!', 'Tiện ghê, cảm ơn!', 'Bữa sau {me} ghé tiếp.', 'Cảm ơn {you} nhiều!', 'Tiệm dễ thương ghê.'],
  referred: ['Cảm ơn lời khuyên nhé.', 'Ừ, {me} đi khám liền.', 'May mà {you} nhắc.', 'Cảm ơn {you} đã dặn kỹ.'],
  backordered: ['Nhớ giao sớm cho {me} nha!', '{me} chờ hàng nhé {you}.', 'Có hàng thì báo {me} nha.'],
  'went-elsewhere': ['Thôi để {me} ghé chỗ khác.', 'Tiếc ghê, lần sau vậy.', 'Hết thì thôi, {me} đi tiệm khác.'],
  'left-unserved': ['Vậy thôi, cảm ơn.', '{me} chỉ định mua đồ thôi mà…', 'Thôi {me} về vậy.'],
  'left-angry': ['Chờ lâu quá, thôi vậy!', 'Thôi, {me} không chờ nổi nữa!', 'Mất thời gian ghê!', 'Lần sau khỏi ghé.'],
};

const LEAVE_REGULAR = ['Mai mốt {me} lại ghé nha {w}!', 'Giữ sức khoẻ nha {w}!', 'Cảm ơn {you}, lần sau gặp.', 'Bye {w}, bán đắt hàng nha!'];

const REFERRING = ['Ừ, vậy để {me} đi khám.', 'Vậy à, {me} đi khám cho chắc.', 'Ừ, nghe {you} vậy.'];
const DEFERRING = ['Hết rồi à? Tiếc ghê…', 'Vậy giao sau được không {you}?', 'Hết rồi hả, bao giờ có?'];

// ---------- Câu của khách ----------

/**
 * Một dòng "khách đang cần gì", luôn hiện trên đầu bong bóng khách ở quầy: yêu cầu gọi tên thì là tên
 * món kèm hình; kể nhu cầu thì là nhãn tóm tắt (không lộ món đúng); có triệu chứng thì chỉ báo không khoẻ.
 */
export function customerNeed(customer: C): Line | null {
  const request = REQUESTS[customer.requestId];
  if (!request) return null;
  if (request.kind === 'named' && request.acceptable[0]) {
    const id = request.acceptable[0];
    return { text: PRODUCTS[id].name, productId: id };
  }
  return { text: request.short ?? request.text };
}

/** Câu khách nói ở quầy (và lúc rời đi). `worker`: người đang đứng quầy của khách, để khách quen gọi tên. */
export function customerLine(state: State, customer: C, order: O | undefined, worker?: W): Line | null {
  const request = REQUESTS[customer.requestId];
  const patience = customer.patienceMs / customer.patienceMaxMs;
  const voice = voiceOf(customer);
  const profile = profileOf(state, customer);
  const tier = familiarity(state, customer);
  const regular = tier !== 'new';
  const staffWorker = worker ?? (order ? state.workers[order.workerId] : undefined);
  const staffName = staffWorker ? shortName(staffWorker) : voice.you;
  const say = (pool: string, list: readonly string[], extra: Omit<Line, 'text'> = {}, product?: ProductId): Line => ({
    ...extra,
    regular,
    text: cap(
      pick(pool, list, customer.id)
        .replaceAll('{You}', cap(voice.you))
        .replaceAll('{you}', voice.you)
        .replaceAll('{me}', voice.me)
        .replaceAll('{w}', staffName)
        .replaceAll('{p}', product ? productName(product) : 'món này'),
    ),
  });
  const a = customer.archetypeId;

  if (customer.phase === 'leaving') {
    const outcome = customer.outcome;
    if (!outcome) return say('leave.default', ['Vậy thôi, cảm ơn.', 'Thôi {me} về nha.']);
    const mood = outcome === 'bought' || outcome === 'referred' ? 'happy' : outcome === 'left-angry' ? 'urgent' : 'normal';
    if (regular && outcome === 'bought') return say('leave.regular', [...LEAVE[outcome], ...LEAVE_REGULAR], { mood });
    return say(`leave.${outcome}`, LEAVE[outcome], { mood });
  }
  if (customer.phase !== 'counter' || !request) return null;

  // Vừa được đưa nhầm món.
  if (order?.state === 'deciding' && order.rejectedProductIds.length > 0 && state.timeMs < customer.emoteUntilMs) {
    return say(`wrong.${order.rejectedProductIds.length}`, WRONG, { mood: 'urgent' });
  }
  // Mất kiên nhẫn: khách vội/khó tính hối thúc, người khác chỉ nhắc khẽ.
  if (patience < 0.4 && (!order || order.state === 'deciding' || order.state === 'retrieving')) {
    return say(`hurry.${a}`, HURRY[a], { mood: a === 'careful' || a === 'curious' ? 'normal' : 'urgent' });
  }

  if (!order) {
    if (!regular) return say(`greet.${a}`, GREET[a]);
    const recall = (profile && RECALL[profile.lastOutcome]) ?? [];
    return tier === 'close'
      ? say('greet.close', [...GREET_CLOSE, ...recall], { mood: 'happy' })
      : say('greet.known', [...GREET_KNOWN, ...recall], { mood: 'happy' });
  }

  const progress = order.timerTotalMs > 0 ? 1 - order.timerMs / order.timerTotalMs : 0;
  switch (order.state) {
    case 'deciding': {
      if (request.kind === 'named' && request.acceptable[0]) {
        const productId = request.acceptable[0];
        return regular ? say('ask.regular', [...ASK_NAMED[a], ...ASK_NAMED_REGULAR], {}, productId) : say(`ask.${a}`, ASK_NAMED[a], {}, productId);
      }
      return { text: request.text, regular };
    }
    case 'retrieving':
      // Nửa đầu chốt số lượng, nửa sau tán gẫu trong lúc chờ.
      if (progress < 0.45) return say(`qty.${a}`, QUANTITY[a]);
      return regular ? say('chat.regular', [...CHITCHAT[a], ...CHITCHAT_REGULAR]) : say(`chat.${a}`, CHITCHAT[a]);
    case 'ready':
    case 'checkingOut':
      return say(`pay.${a}`, PAY[a]);
    case 'referring':
      return say('referring', REFERRING);
    case 'deferring':
      return say('deferring', DEFERRING);
    default:
      return null;
  }
}

// ---------- Câu của người bán ----------
// {a}: gọi khách · {n}: tên khách quen (hoặc như {a}) · {s}: người bán tự xưng · {p}: tên món · {x}: giá

type StaffBeat = 'greet' | 'look' | 'fetch' | 'pay' | 'refer' | 'defer';

const TONE_LINES: Record<ServiceTone, Record<StaffBeat, string[]>> = {
  warm: {
    greet: ['Dạ chào {a}, {a} cần gì cứ nói {s} nha!', 'Chào {a} ạ, hôm nay {a} cần gì ạ?', 'Dạ {s} chào {a}, {a} cứ thong thả ạ.', 'Chào {a}, mời {a} vào ạ!'],
    look: ['Dạ để {s} tìm giúp {a} liền ạ!', 'Có ạ, {a} đợi {s} xíu nhé!', 'Dạ {s} nghe rồi, {a} chờ chút ạ.', '{A} ngồi nghỉ chút, {s} tìm ngay ạ.'],
    fetch: ['{S} lấy {p} cho {a} nha.', 'Đây ạ, {p} loại này dùng ổn lắm.', 'Dạ {p} đây, {s} xem hạn rồi ạ.', '{S} lấy hộp mới cho {a} nha.'],
    pay: ['Của {a} {x} ạ. Tiền mặt hay chuyển khoản ạ?', '{x} ạ, cảm ơn {a} nhiều!', 'Dạ tổng {x}, {s} bỏ túi cho {a} nha.', '{x} ạ, {a} đi đường cẩn thận nha.'],
    refer: ['{A} nên đi khám sớm cho yên tâm nha.', 'Cái này {s} không bán được, {a} đi khám giúp {s} nha.', '{A} ghé phòng khám gần đây cho chắc ạ.'],
    defer: ['Món này tạm hết ạ, {s} giao tận nơi sau cho {a} được không?', 'Dạ tiếc quá, hết hàng rồi ạ. {S} gửi ship cho {a} nha?'],
  },
  plain: {
    greet: ['Chào {a}, {a} cần gì ạ?', 'Dạ, {a} cần mua gì ạ?', 'Chào {a}.'],
    look: ['Dạ, để {s} xem.', '{A} chờ chút ạ.', 'Dạ, có ạ.'],
    fetch: ['{S} lấy {p} nhé.', '{p} đây ạ.', 'Của {a} đây ạ.'],
    pay: ['{x} ạ. Tiền mặt hay chuyển khoản?', 'Tổng {x} ạ.', 'Của {a} {x}.'],
    refer: ['Cái này {a} nên đi khám ạ.', '{A} đi khám thì hơn ạ.'],
    defer: ['Món này hết rồi, {a} chờ giao sau không ạ?', 'Hết hàng rồi ạ, {a} đặt ship không?'],
  },
  curt: {
    greet: ['Cần gì?', 'Gì đấy?', 'Mua gì?'],
    look: ['Đợi đó.', 'Chờ.', 'Ừ, để xem.'],
    fetch: ['Đây.', 'Cầm đi.', 'Cái này.'],
    pay: ['{x}.', '{x}, nhanh.', 'Trả {x}.'],
    refer: ['Đi khám đi.', 'Không bán, đi khám.'],
    defer: ['Hết rồi.', 'Hết. Chờ ship không?'],
  },
  chatty: {
    greet: ['Chào {a}! Hôm nay trời đẹp ghê ha, {a} cần gì nè?', 'Ơ chào {a}! Áo {a} mặc hôm nay xinh ghê!', 'Chào {a}, {a} đi đâu về mà vui vậy?'],
    look: ['Để {s} xem, món này dạo này nhiều người hỏi lắm luôn…', 'Có liền! Mà {a} biết không, sáng nay…', 'Chờ {s} chút, hôm nay kho hơi bừa ha ha.'],
    fetch: ['{p} đây, nói {a} nghe loại này {s} cũng hay dùng nè!', '{p} nè {a}, hàng mới về hôm qua đó!', 'Đây đây, {s} lựa hộp đẹp nhất cho {a}!'],
    pay: ['{x} nha {a}, chuyển khoản hay tiền mặt, {s} chịu hết!', '{x} thôi à, rẻ ghê chưa {a}!', '{x} nha, {a} ghé thường xuyên nha!'],
    refer: ['Cái này {a} đi khám đi, {s} kể {a} nghe hôm trước…', 'Nghe {s} nè, {a} đi khám cho chắc nha!'],
    defer: ['Ôi món này hết mất rồi, hay {s} giao sau cho {a} nha?', 'Trời, vừa bán hết luôn! {S} ship tận nhà cho {a} nha?'],
  },
  awkward: {
    greet: ['À… dạ… chào…', 'Dạ… {a} cần… gì ạ?', 'Ơ… chào {a}…'],
    look: ['Ờm… để… để {s} tìm…', 'Dạ… chờ… chút ạ…', 'Hình như… ở kệ trên…'],
    fetch: ['Hình như… cái này ạ?', 'Dạ… {p}… đúng không ạ?', 'Cái… này ạ…'],
    pay: ['Dạ… {x}… ạ.', '{x}… ạ… hình như vậy.', 'Dạ… {a} trả… {x} ạ.'],
    refer: ['Chắc… {a} đi khám thì hơn ạ…', 'Dạ… cái này… phải đi khám ạ…'],
    defer: ['Dạ… hình như hết rồi…', 'Hết… rồi ạ… xin lỗi {a}…'],
  },
};

/** Người bán chào khách quen: gọi tên, hỏi thăm (giọng cộc/lúng túng vẫn giữ tính cách). */
const TONE_REGULAR: Record<ServiceTone, Partial<Record<StaffBeat, string[]>>> = {
  warm: {
    greet: ['Ơ {n}! Lâu quá không gặp, {a} dạo này sao rồi ạ?', 'Dạ chào {n}, {s} nhớ {a} mà!', 'Chào {n} ạ, lại gặp {a} rồi vui ghê!', '{N} tới rồi! {A} cần gì như mọi khi ạ?'],
    pay: ['{x} ạ, {s} gói kỹ cho {n} nha.', '{x} ạ, cảm ơn {n} lúc nào cũng ủng hộ tiệm!'],
  },
  plain: {
    greet: ['Chào {n}, {a} lấy gì hôm nay ạ?', 'Dạ chào {n}.', '{N} lại ghé ạ.'],
    pay: ['{x} ạ, cảm ơn {n}.'],
  },
  curt: { greet: ['Lại {a} à. Cần gì?', '{N} hả. Mua gì?'] },
  chatty: {
    greet: ['Trời ơi {n}! Hôm nay {a} ghé đúng lúc {s} đang nhắc luôn!', '{N} ơi, dạo này {a} đi đâu mất tiêu vậy?', 'A, {n}! Nhà {a} dạo này vẫn vui chứ?'],
    pay: ['{x} nha {n}, lần sau ghé {s} kể chuyện tiếp!', '{x}, {n} quen rồi {s} gói thêm túi xinh nè!'],
  },
  awkward: { greet: ['À… {n}… chào {a} ạ…', 'Dạ… {s} nhớ {a}… hình như…'] },
};

/** Câu người bán nói với khách ở quầy mình (null nếu không có gì để nói). */
export function staffLine(state: State, worker: W, customer: C | undefined, order: O | undefined): Line | null {
  if (!customer || customer.phase !== 'counter' || !order || order.workerId !== worker.id) return null;
  const tone = serviceTone({ communication: worker.communication, traits: [...worker.traits, ...worker.hiddenTraits] });
  const voice = voiceOf(customer);
  const name = customerName(state, customer);
  const called = name ? inSentence(name) : voice.honor;
  const regular = familiarity(state, customer) !== 'new';
  const poolOf = (beat: StaffBeat): [string, readonly string[]] => {
    const special = regular ? TONE_REGULAR[tone][beat] : undefined;
    return special ? [`staff.${tone}.${beat}.regular`, special] : [`staff.${tone}.${beat}`, TONE_LINES[tone][beat]];
  };
  const fill = (beat: StaffBeat, productId?: ProductId) => {
    const [pool, list] = poolOf(beat);
    return cap(
      pick(pool, list, `${customer.id}${worker.id}`)
        .replaceAll('{N}', cap(called))
        .replaceAll('{n}', called)
        .replaceAll('{A}', cap(voice.honor))
        .replaceAll('{a}', voice.honor)
        .replaceAll('{S}', cap(voice.staffSelf))
        .replaceAll('{s}', voice.staffSelf)
        .replaceAll('{p}', productId ? productName(productId) : 'món này')
        .replaceAll('{x}', productId ? `${state.prices[productId]} ${BRAND.currency}` : ''),
    );
  };
  const progress = order.timerTotalMs > 0 ? 1 - order.timerMs / order.timerTotalMs : undefined;
  const productId = order.productId ?? undefined;
  switch (order.state) {
    case 'deciding':
      return { text: fill(state.timeMs - (customer.servedAtMs ?? 0) < 1500 ? 'greet' : 'look') };
    case 'retrieving':
      return { text: fill('fetch', productId), productId, progress };
    case 'ready':
    case 'checkingOut':
      return { text: fill('pay', productId), progress: order.state === 'checkingOut' ? progress : undefined };
    case 'referring':
      return { text: fill('refer'), progress };
    case 'deferring':
      return { text: fill('defer'), progress };
    default:
      return null;
  }
}
