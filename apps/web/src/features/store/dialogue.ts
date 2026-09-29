import {
  customerName,
  looksFemale,
  PRODUCTS,
  REQUESTS,
  serviceTone,
  stableHash,
  type ArchetypeId,
  type Customer,
  type DeepReadonly,
  type Order,
  type ProductId,
  type ServiceTone,
  type SimState,
  type Worker,
} from '@pharmacy/simulation';
import { BRAND } from '../../brand';

/*
 * Lời thoại ở quầy theo nhịp: chào hỏi → hỏi hàng → chốt số lượng → thanh toán (hoặc khuyên đi khám,
 * báo hết hàng). Câu của khách tuỳ kiểu khách và độ sốt ruột; câu của người bán tuỳ giọng giao tiếp
 * (`serviceTone`, cùng tiêu chí khách dùng để chấm điểm). Biến thể chọn bằng băm id nên câu không nhảy
 * mỗi khung hình. Chỉ để hiển thị: không đổi luật chơi.
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
}

const pickOne = <T,>(list: readonly T[], seed: string): T => list[stableHash(seed) % list.length]!;

/** Cách người bán gọi khách: tên khách quen, không thì theo kiểu khách và dáng người. */
function addressOf(state: State, customer: C): string {
  const name = customerName(state, customer);
  if (name) return name;
  const female = looksFemale(customer.look.hairStyle);
  const byArchetype: Record<ArchetypeId, string> = {
    hurried: female ? 'chị' : 'anh',
    demanding: female ? 'chị' : 'anh',
    careful: female ? 'cô' : 'chú',
    thrifty: 'bác',
    curious: 'bạn',
  };
  return byArchetype[customer.archetypeId];
}

/** Người bán xưng hô với khách: "em" với anh chị, "cháu" với cô chú bác, "mình" với bạn. */
function selfOf(address: string): string {
  const lower = address.toLowerCase();
  if (lower.startsWith('cô') || lower.startsWith('chú') || lower.startsWith('bác')) return 'cháu';
  if (lower === 'bạn' || !/^(anh|chị)/.test(lower)) return 'mình';
  return 'em';
}

const cap = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const productName = (id: ProductId) => PRODUCTS[id].name.toLowerCase();

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

/** Câu khách nói ở quầy (và lúc rời đi). */
export function customerLine(state: State, customer: C, order: O | undefined): Line | null {
  const seed = customer.id;
  const request = REQUESTS[customer.requestId];
  const patience = customer.patienceMs / customer.patienceMaxMs;
  const staffCall = customer.archetypeId === 'careful' || customer.archetypeId === 'thrifty' ? 'cháu' : 'em';

  if (customer.phase === 'leaving') {
    switch (customer.outcome) {
      case 'bought': return { text: pickOne(['Cảm ơn nha!', 'Hẹn gặp lại nhé!', 'Tiện ghê, cảm ơn!'], seed), mood: 'happy' };
      case 'referred': return { text: 'Cảm ơn lời khuyên nhé.', mood: 'happy' };
      case 'backordered': return { text: 'Nhớ giao sớm cho mình nha!' };
      case 'went-elsewhere': return { text: 'Thôi để mình ghé chỗ khác.' };
      case 'left-angry': return { text: 'Chờ lâu quá, thôi vậy!', mood: 'urgent' };
      default: return { text: 'Vậy thôi, cảm ơn.' };
    }
  }
  if (customer.phase !== 'counter' || !request) return null;

  // Vừa được đưa nhầm món.
  if (order?.state === 'deciding' && order.rejectedProductIds.length > 0 && state.timeMs < customer.emoteUntilMs) {
    return { text: pickOne(['Không phải cái này đâu!', 'Ơ, mình cần món khác mà.'], seed), mood: 'urgent' };
  }
  // Sốt ruột: khách vội/khó tính hối thúc, người khác chỉ nhắc khẽ.
  if (patience < 0.4 && (!order || order.state === 'deciding' || order.state === 'retrieving')) {
    const hurry: Record<ArchetypeId, string[]> = {
      hurried: [`Nhanh giúp mình với ${staffCall} ơi!`, 'Mình đang vội lắm!'],
      demanding: ['Sao lâu vậy?', 'Làm ăn kiểu gì chậm thế?'],
      careful: [`Không vội đâu ${staffCall}, cứ từ từ.`],
      thrifty: [`Còn lâu không ${staffCall}?`],
      curious: ['Chắc hôm nay tiệm đông ha?'],
    };
    return { text: pickOne(hurry[customer.archetypeId], seed), mood: customer.archetypeId === 'careful' || customer.archetypeId === 'curious' ? 'normal' : 'urgent' };
  }

  if (!order) {
    const loyal = customerName(state, customer);
    if (loyal) return { text: pickOne([`Lại là mình đây, chào ${staffCall}!`, `Chào ${staffCall}, lâu rồi mới ghé.`], seed), mood: 'happy' };
    const greet: Record<ArchetypeId, string[]> = {
      hurried: ['Nhanh giúp mình nhé!', 'Chào, mình mua nhanh thôi.'],
      demanding: ['Có ai bán hàng không?', 'Chào, cho hỏi chút.'],
      careful: [`Chào ${staffCall}.`, `${cap(staffCall)} ơi, cho cô hỏi.`],
      thrifty: [`Chào ${staffCall}, hôm nay có gì rẻ không?`, `${cap(staffCall)} ơi!`],
      curious: ['Chào bạn!', 'Chào, cho mình hỏi xíu nha.'],
    };
    return { text: pickOne(greet[customer.archetypeId], seed) };
  }

  switch (order.state) {
    case 'deciding': {
      if (request.kind === 'named' && request.acceptable[0]) {
        return { text: `Còn ${productName(request.acceptable[0])} không ${staffCall}?` };
      }
      return { text: request.text };
    }
    case 'retrieving':
    case 'ready':
      if (customer.archetypeId === 'thrifty') return { text: 'Lấy một cái thôi, loại vừa tiền nha.' };
      return { text: pickOne(['Lấy một cái thôi nhé.', 'Cho mình một cái.', 'Một cái là đủ rồi.'], seed) };
    case 'checkingOut':
      return { text: pickOne(['Mình chuyển khoản nhé.', 'Gửi tiền mặt nè.', 'Quẹt mã cho nhanh nha.'], seed) };
    case 'referring':
      return { text: 'Ừ, vậy để mình đi khám.' };
    case 'deferring':
      return { text: 'Hết rồi à? Tiếc ghê…' };
    default:
      return null;
  }
}

const TONE_LINES: Record<ServiceTone, Record<'greet' | 'look' | 'fetch' | 'pay' | 'refer' | 'defer', string[]>> = {
  warm: {
    greet: ['Dạ chào {a}, {a} cần gì cứ nói {s} nha!', 'Chào {a} ạ, hôm nay {a} cần gì ạ?'],
    look: ['Dạ để {s} tìm giúp {a} liền ạ!', 'Có ạ, {a} đợi {s} xíu nhé!'],
    fetch: ['{s} lấy {p} cho {a} nha.', 'Đây ạ, {p} loại này dùng ổn lắm.'],
    pay: ['Của {a} {x} ạ. Tiền mặt hay chuyển khoản ạ?', '{x} ạ, cảm ơn {a} nhiều!'],
    refer: ['{a} nên đi khám sớm cho yên tâm nha.'],
    defer: ['Món này tạm hết ạ, {s} giao tận nơi sau cho {a} được không?'],
  },
  plain: {
    greet: ['Chào {a}, {a} cần gì ạ?'],
    look: ['Dạ, để {s} xem.'],
    fetch: ['{s} lấy {p} nhé.'],
    pay: ['{x} ạ. Tiền mặt hay chuyển khoản?'],
    refer: ['Cái này {a} nên đi khám ạ.'],
    defer: ['Món này hết rồi, {a} chờ giao sau không ạ?'],
  },
  curt: {
    greet: ['Cần gì?'],
    look: ['Đợi đó.'],
    fetch: ['Đây.'],
    pay: ['{x}.'],
    refer: ['Đi khám đi.'],
    defer: ['Hết rồi.'],
  },
  chatty: {
    greet: ['Chào {a}! Hôm nay trời đẹp ghê ha, {a} cần gì nè?'],
    look: ['Để {s} xem, món này dạo này nhiều người hỏi lắm luôn…'],
    fetch: ['{p} đây, nói {a} nghe loại này {s} cũng hay dùng nè!'],
    pay: ['{x} nha {a}, chuyển khoản hay tiền mặt, {s} chịu hết!'],
    refer: ['Cái này {a} đi khám đi, {s} kể {a} nghe hôm trước…'],
    defer: ['Ôi món này hết mất rồi, hay {s} giao sau cho {a} nha?'],
  },
  awkward: {
    greet: ['À… dạ… chào…'],
    look: ['Ờm… để… để {s} tìm…'],
    fetch: ['Hình như… cái này ạ?'],
    pay: ['Dạ… {x}… ạ.'],
    refer: ['Chắc… {a} đi khám thì hơn ạ…'],
    defer: ['Dạ… hình như hết rồi…'],
  },
};

/** Câu người bán nói với khách ở quầy mình (null nếu không có gì để nói). */
export function staffLine(state: State, worker: W, customer: C | undefined, order: O | undefined): Line | null {
  if (!customer || customer.phase !== 'counter') return null;
  const tone = serviceTone({ communication: worker.communication, traits: [...worker.traits, ...worker.hiddenTraits] });
  const address = addressOf(state, customer);
  const lines = TONE_LINES[tone];
  const fill = (text: string, productId?: ProductId) =>
    cap(
      text
        .replaceAll('{a}', address)
        .replaceAll('{s}', selfOf(address))
        .replaceAll('{p}', productId ? productName(productId) : 'món này')
        .replaceAll('{x}', productId ? `${state.prices[productId]} ${BRAND.currency}` : ''),
    );
  const seed = `${customer.id}${worker.id}`;
  const progress = order && order.timerTotalMs > 0 ? 1 - order.timerMs / order.timerTotalMs : undefined;
  if (!order) return null;
  if (order.workerId !== worker.id) return null;
  switch (order.state) {
    case 'deciding':
      return { text: fill(pickOne(state.timeMs - (customer.servedAtMs ?? 0) < 1500 ? lines.greet : lines.look, seed)) };
    case 'retrieving':
      return { text: fill(pickOne(lines.fetch, seed), order.productId ?? undefined), productId: order.productId ?? undefined, progress };
    case 'ready':
    case 'checkingOut':
      return { text: fill(pickOne(lines.pay, seed), order.productId ?? undefined), progress: order.state === 'checkingOut' ? progress : undefined };
    case 'referring':
      return { text: fill(pickOne(lines.refer, seed)), progress };
    case 'deferring':
      return { text: fill(pickOne(lines.defer, seed)), progress };
    default:
      return null;
  }
}
