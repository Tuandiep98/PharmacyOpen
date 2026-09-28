import { ARCHETYPES } from './content/archetypes';
import { PRODUCTS } from './content/products';
import { REQUESTS } from './content/requests';
import { REASONS, REVIEW_COMMENTS, type ComplaintResponse } from './content/reviews';
import type { ArchetypeDef, ReasonCode, TraitId } from './content/types';
import type { Emit } from './events';
import { loseExperience } from './recruit';
import { nextFloat, nextInt } from './rng';
import type { Complaint, Customer, CustomerOutcome, DeepReadonly, InteractionFact, Order, Review, SimState } from './types';

/*
 * Chuỗi xử lý một lượt khách (spec §5):
 *   sự kiện khách quan → điểm nghiệp vụ → mức hài lòng chủ quan (theo tính cách khách)
 *   → tung xác suất viết đánh giá (có seed) → sao + lời bình + lý do → cập nhật sổ danh tiếng
 *   cửa hàng / cá nhân → khiếu nại nếu đánh giá thấp.
 * Ba thước đo tách biệt: hiệu suất nội bộ (khách quan), sao công khai (chủ quan), danh tiếng.
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// ---------------------------------------------------------------- Hiệu suất nghiệp vụ (khách quan)

/**
 * Điểm 0–100 cho người phục vụ, CHỈ dựa trên sự kiện nghiệp vụ. Tính cách, sự khó tính của khách
 * hay chính sách giá không ảnh hưởng: khách khó tính chấm 1 sao cho lượt phục vụ đúng thì điểm vẫn 100.
 */
export function performanceScore(facts: readonly InteractionFact[]): number {
  let score = 100;
  for (const fact of facts) {
    if (fact === 'wrong-item') score -= 25;
    else if (fact === 'safety-warning') score -= 40;
    else if (fact === 'unnecessary-referral') score -= 40;
    else if (fact === 'customer-left') score -= 30;
  }
  return clamp(score, 0, 100);
}

// ---------------------------------------------------------------- Mức hài lòng (chủ quan)

export interface SatisfactionInput {
  archetype: ArchetypeDef;
  outcome: CustomerOutcome;
  served: boolean;
  queueWaitMs: number;
  serviceMs: number;
  /** Kiên nhẫn còn lại lúc rời đi, 0..1. */
  patienceRatio: number;
  wrongCount: number;
  price: number | null;
  referencePrice: number | null;
  /** traits gồm cả đặc điểm ẩn (vẫn có tác dụng). */
  server: { communication: number; traits: readonly TraitId[] } | null;
  /** Khách quen quay lại (người "Được khách quen quý" phục vụ thì vui hơn). */
  returning?: boolean;
}

const NEGATIVE_PRIORITY: ReasonCode[] = [
  'wrong-item',
  'rude-staff',
  'unneeded-referral',
  'slow-service',
  'long-queue',
  'price-high',
  'too-chatty',
  'strict-customer',
];
const PRAISE_PRIORITY: ReasonCode[] = ['helpful-advice', 'friendly-staff', 'fair-price', 'fast-service', 'correct-item'];

export function evaluateSatisfaction(input: SatisfactionInput): { satisfaction: number; reasons: ReasonCode[] } {
  const { archetype, outcome } = input;
  const reasons = new Set<ReasonCode>();
  let sat: number;

  switch (outcome) {
    case 'bought':
      sat = 0.75;
      reasons.add('correct-item');
      break;
    case 'referred':
      sat = 0.75;
      reasons.add('helpful-advice');
      break;
    case 'left-unserved':
      sat = 0.3;
      reasons.add('unneeded-referral');
      break;
    case 'left-angry':
      sat = 0.05;
      // Chưa ai phục vụ → lỗi năng lực cửa hàng (hàng chờ); đang được phục vụ mà bỏ về → phục vụ chậm.
      reasons.add(input.served ? 'slow-service' : 'long-queue');
      break;
  }

  if (outcome !== 'left-angry') {
    if (input.patienceRatio > 0.6) {
      sat += 0.1;
      reasons.add('fast-service');
    } else if (input.patienceRatio < 0.3) {
      sat -= 0.2 * archetype.waitWeight;
      reasons.add(input.queueWaitMs >= input.serviceMs ? 'long-queue' : 'slow-service');
    }
  }

  if (input.wrongCount > 0) {
    sat -= 0.15 * input.wrongCount;
    reasons.add('wrong-item');
  }

  if (outcome === 'bought' && input.price !== null && input.referencePrice !== null) {
    const diff = (input.price - input.referencePrice) / input.referencePrice;
    if (diff > 0) {
      const penalty = diff * archetype.priceSensitivity * 2;
      if (penalty > 0.03) {
        sat -= penalty;
        reasons.add('price-high');
      }
    } else if (diff < 0) {
      // Bán rẻ hơn giá tham khảo: khách nhạy giá vui hơn, nhưng có trần để giảm giá không phải "nút thắng".
      const bonus = Math.min(0.12, -diff * archetype.priceSensitivity);
      if (bonus > 0.03) {
        sat += bonus;
        reasons.add('fair-price');
      }
    }
  }

  if (input.server && input.served) {
    sat += (input.server.communication - 0.5) * 0.2;
    // Tính cách tác động theo ngữ cảnh: cùng một người hoạt ngôn, khách thích nghe giải thích thì vui,
    // khách đang vội thì phiền.
    const traits = input.server.traits;
    if (traits.includes('silver-tongue')) {
      sat += 0.15;
      reasons.add('friendly-staff');
    }
    if (traits.includes('hot-tempered')) {
      sat -= 0.2;
      reasons.add('rude-staff');
    }
    if (traits.includes('regulars-favorite') && input.returning) {
      sat += 0.15;
      reasons.add('friendly-staff');
    }
    if (traits.includes('talkative')) {
      if (archetype.likesDetail) {
        sat += 0.08;
        reasons.add('friendly-staff');
      } else {
        sat -= 0.12;
        reasons.add('too-chatty');
      }
    } else if (input.server.communication >= 0.8) {
      reasons.add('friendly-staff');
    }
  }

  sat -= archetype.strictness;
  const satisfaction = clamp(sat, 0, 1);
  const hasNegative = NEGATIVE_PRIORITY.some((r) => reasons.has(r));
  if (!hasNegative && starsFrom(satisfaction) <= 3 && archetype.strictness >= 0.2) reasons.add('strict-customer');
  return { satisfaction, reasons: [...reasons] };
}

export function starsFrom(satisfaction: number): number {
  return clamp(1 + Math.round(satisfaction * 4), 1, 5);
}

/** Khách cảm xúc càng mạnh (rất vui/rất bực) càng dễ viết đánh giá; luôn < maxProbability. */
export function reviewProbability(archetype: ArchetypeDef, satisfaction: number, maxProbability: number): number {
  return clamp(archetype.reviewProbability * (0.7 + Math.abs(satisfaction - 0.5) * 1.2), 0.02, maxProbability);
}

/** Lý do chính để chọn lời bình: đánh giá thấp lấy lỗi nặng nhất, đánh giá cao lấy lời khen. */
export function primaryReason(stars: number, reasons: readonly ReasonCode[]): ReasonCode {
  const order = stars <= 3 ? [...NEGATIVE_PRIORITY, ...PRAISE_PRIORITY] : [...PRAISE_PRIORITY, ...NEGATIVE_PRIORITY];
  return order.find((r) => reasons.includes(r)) ?? 'correct-item';
}

/**
 * Đánh giá có tính vào danh tiếng cá nhân không: có người phục vụ, và hoặc là đánh giá tốt,
 * hoặc có ít nhất một lỗi thuộc về nhân viên. Đánh giá thấp chỉ vì giá/hàng chờ/khách khó tính → không tính.
 */
export function countsForStaff(workerId: string | null, stars: number, reasons: readonly ReasonCode[]): boolean {
  if (!workerId) return false;
  return stars >= 4 || reasons.some((r) => REASONS[r].scope === 'staff');
}

// ---------------------------------------------------------------- Danh tiếng & lượng khách

/** Trung bình có làm mượt (Bayes): ít đánh giá thì gần priorRating, không dao động mạnh vì 1–2 đánh giá. */
export function bayesRating(starsSum: number, count: number, prior: number, weight: number): number {
  return (prior * weight + starsSum) / (weight + count);
}

export function storeRating(state: DeepReadonly<SimState>): number {
  const { reputation } = state.config;
  return bayesRating(state.reputation.starsSum, state.reputation.count, reputation.priorRating, reputation.priorWeight);
}

/** Danh tiếng tác động lên lượng khách ghé (không lên giá trị đơn), có trần và sàn. */
export function demandMultiplier(state: DeepReadonly<SimState>): number {
  const { reputation } = state.config;
  return clamp(1 + (storeRating(state) - reputation.priorRating) * reputation.demandSlope, reputation.demandMin, reputation.demandMax);
}

// ---------------------------------------------------------------- Ghi nhận một lượt khách

function trim<T>(list: T[], keep: number): void {
  if (list.length > keep) list.splice(0, list.length - keep);
}

function addStars(state: SimState, review: Review, delta: 1 | -1): void {
  state.reputation.starsSum += review.stars * delta;
  state.reputation.count += delta;
  const bucket = review.stars - 1;
  state.reputation.histogram[bucket] = (state.reputation.histogram[bucket] ?? 0) + delta;
  const worker = review.countsForStaff && review.workerId ? state.workers[review.workerId] : undefined;
  if (worker) {
    worker.repStarsSum += review.stars * delta;
    worker.repCount += delta;
  }
}

/** Gọi đúng một lần khi khách rời tiệm (mọi kết cục), trước khi đơn bị xoá. */
export function recordInteraction(
  state: SimState,
  customer: Customer,
  order: Order | undefined,
  outcome: CustomerOutcome,
  emit: Emit,
): void {
  const config = state.config.reputation;
  const archetype = ARCHETYPES[customer.archetypeId];
  const request = REQUESTS[customer.requestId];
  const worker = order ? state.workers[order.workerId] : undefined;
  const served = customer.servedAtMs !== null;
  const productId = outcome === 'bought' ? (order?.productId ?? null) : null;
  const product = productId ? PRODUCTS[productId] : null;

  const performance = order ? performanceScore(order.facts) : null;
  if (worker && performance !== null) {
    worker.perfSum += performance;
    worker.perfCount += 1;
  }

  const { satisfaction, reasons } = evaluateSatisfaction({
    archetype,
    outcome,
    served,
    queueWaitMs: (customer.servedAtMs ?? state.timeMs) - customer.arrivedAtMs,
    serviceMs: customer.servedAtMs === null ? 0 : state.timeMs - customer.servedAtMs,
    patienceRatio: customer.patienceMs / customer.patienceMaxMs,
    wrongCount: order?.rejectedProductIds.length ?? 0,
    price: product ? (order?.price ?? null) : null,
    referencePrice: product?.referencePrice ?? null,
    server: worker ? { communication: worker.communication, traits: [...worker.traits, ...worker.hiddenTraits] } : null,
    returning: customer.loyaltyId !== null,
  });

  const interaction = {
    id: `i${state.nextId++}`,
    customerId: customer.id,
    archetypeId: customer.archetypeId,
    requestId: customer.requestId,
    requestKind: request?.kind ?? 'named',
    workerId: worker?.id ?? null,
    outcome,
    arrivedAtMs: customer.arrivedAtMs,
    servedAtMs: customer.servedAtMs,
    endedAtMs: state.timeMs,
    productId,
    price: product ? (order?.price ?? null) : null,
    wrongProductIds: [...(order?.rejectedProductIds ?? [])],
    safetyWarnings: order?.facts.filter((f) => f === 'safety-warning').length ?? 0,
    performance,
    satisfaction,
    reasons,
    reviewId: null as string | null,
  };

  // Không phải khách nào cũng viết đánh giá (xác suất luôn < 1, có seed để tái hiện).
  const rng = state.rng.review;
  if (nextFloat(rng) < reviewProbability(archetype, satisfaction, config.reviewMaxProbability)) {
    const stars = starsFrom(satisfaction);
    const templates = REVIEW_COMMENTS[primaryReason(stars, reasons)];
    const review: Review = {
      id: `r${state.nextId++}`,
      interactionId: interaction.id,
      archetypeId: customer.archetypeId,
      workerId: interaction.workerId,
      stars,
      originalStars: stars,
      comment: templates[nextInt(rng, 0, templates.length - 1)] ?? '',
      reasons,
      countsForStaff: countsForStaff(interaction.workerId, stars, reasons),
      atMs: state.timeMs,
      response: null,
    };
    interaction.reviewId = review.id;
    addStars(state, review, 1);
    state.reviews.push(review);
    trim(state.reviews, config.keepReviews);
    emit({ type: 'reviewPosted', reviewId: review.id, stars, workerId: review.workerId });

    // Bị chê do chính lỗi của mình: thỉnh thoảng mất chút kinh nghiệm (không tụt cấp).
    const reviewed = review.workerId ? state.workers[review.workerId] : undefined;
    if (reviewed && review.countsForStaff && stars <= 2) loseExperience(state, reviewed, emit);

    if (stars <= 2) {
      const complaint: Complaint = {
        id: `k${state.nextId++}`,
        reviewId: review.id,
        status: 'open',
        response: null,
        improved: false,
        atMs: state.timeMs,
      };
      state.complaints.push(complaint);
      trim(state.complaints, config.keepComplaints);
      emit({ type: 'complaintOpened', complaintId: complaint.id, reviewId: review.id });
    }
  }

  state.interactions.push(interaction);
  trim(state.interactions, config.keepInteractions);
}

// ---------------------------------------------------------------- Phản hồi khiếu nại

/**
 * Xác suất khách sửa đánh giá lên thêm 1 sao. Phản hồi hợp lý tăng cơ hội nhưng không bao giờ chắc chắn,
 * và không bao giờ xoá đánh giá.
 */
export function responseSuccessChance(response: ComplaintResponse, reasons: readonly ReasonCode[]): number {
  const staffFault = reasons.some((r) => REASONS[r].scope === 'staff');
  switch (response) {
    case 'apologize':
      return staffFault ? 0.5 : 0.3;
    case 'explain':
      // Giải thích hợp khi vấn đề là chính sách giá hoặc khách kỳ vọng cao; lỗi của nhân viên thì giải thích bị coi là chối lỗi.
      return reasons.includes('price-high') || !staffFault ? 0.65 : 0.15;
    case 'voucher':
      return 0.7;
  }
}

export function resolveComplaint(state: SimState, complaint: Complaint, response: ComplaintResponse, emit: Emit): void {
  const review = state.reviews.find((r) => r.id === complaint.reviewId);
  let improved = false;
  if (review) {
    improved = nextFloat(state.rng.review) < responseSuccessChance(response, review.reasons);
    review.response = response;
    if (improved && review.stars < 5) {
      addStars(state, review, -1);
      review.stars += 1;
      addStars(state, review, 1);
    }
  }
  complaint.status = 'resolved';
  complaint.response = response;
  complaint.improved = improved;
  emit({ type: 'complaintResolved', complaintId: complaint.id, improved });
}
