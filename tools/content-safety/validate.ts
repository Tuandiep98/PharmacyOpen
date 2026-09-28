import { z } from 'zod';
import blocklist from '../../packages/simulation/src/content/blocklist.json';
import {
  ARCHETYPES,
  PRODUCTS,
  COMPLAINT_RESPONSES,
  REASONS,
  REFERRAL_MESSAGE,
  REQUESTS,
  REVIEW_COMMENTS,
  STAFF_CANDIDATES,
  UPGRADES,
  type ArchetypeDef,
  type ProductDef,
  type RequestDef,
  type StaffCandidateDef,
  type UpgradeDef,
} from '../../packages/simulation/src/content';

export type Issue = { where: string; problem: string };

const normalize = (text: string) => text.normalize('NFC').toLowerCase();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Các từ trong `terms` xuất hiện NGUYÊN TỪ trong `text` (không khớp một phần của từ khác). */
export function findTerms(text: string, terms: readonly string[]): string[] {
  const hay = normalize(text);
  return terms.filter((term) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(normalize(term))}(?![\\p{L}\\p{N}])`, 'u').test(hay));
}

export const NOWHERE = [...blocklist.nowhere.realBrands, ...blocklist.nowhere.drugNames, ...blocklist.nowhere.dosage];
export const GAME_VOICE = blocklist.gameVoice;
export const SYMPTOMS = blocklist.symptoms;
export const HEALTH_OUTCOME = blocklist.healthOutcome;

// Danh mục chỉ cho phép nhóm hàng không kê đơn; thêm nhóm mới phải sửa schema có chủ đích.
const productSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(2).max(40),
  brand: z.string().min(2).max(24),
  category: z.enum(['hygiene', 'first-aid', 'skin-care']),
  price: z.number().int().positive(),
  cost: z.number().int().positive(),
  referencePrice: z.number().int().positive(),
  shelfCapacity: z.number().int().min(1).max(12),
});

const requestSchema = z.object({
  id: z.string().regex(/^(named|need|refer)-[a-z0-9-]+$/),
  kind: z.enum(['named', 'need', 'refer']),
  text: z.string().min(8).max(120),
  acceptable: z.array(z.string()),
});

const archetypeSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  description: z.string().min(4),
  spawnWeight: z.number().positive(),
  patienceMs: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  requestWeights: z.record(z.string(), z.number().nonnegative()),
  reviewProbability: z.number().gt(0).lt(1),
  priceSensitivity: z.number().min(0).max(1),
  strictness: z.number().min(0).max(0.5),
  waitWeight: z.number().positive().max(3),
  likesDetail: z.boolean(),
});

function schemaIssues(where: string, schema: z.ZodType, value: unknown): Issue[] {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => ({ where: `${where}.${i.path.join('.')}`, problem: i.message }));
}

export function validateContent(
  products: Record<string, ProductDef> = PRODUCTS,
  requests: Record<string, RequestDef> = REQUESTS,
  archetypes: Record<string, ArchetypeDef> = ARCHETYPES,
  referralMessage: string = REFERRAL_MESSAGE,
): Issue[] {
  const issues: Issue[] = [];
  const add = (where: string, problem: string) => issues.push({ where, problem });

  for (const [key, p] of Object.entries(products)) {
    const where = `products.${key}`;
    issues.push(...schemaIssues(where, productSchema, p));
    if (p.id !== key) add(where, `id "${p.id}" khác khoá "${key}"`);
    if (p.price <= p.cost) add(where, 'giá bán phải lớn hơn giá vốn');
    for (const hit of findTerms(`${p.name} ${p.brand}`, [...NOWHERE, ...GAME_VOICE, ...SYMPTOMS])) add(where, `từ bị cấm: "${hit}"`);
  }

  const reachable = new Set<string>();
  for (const [key, r] of Object.entries(requests)) {
    const where = `requests.${key}`;
    issues.push(...schemaIssues(where, requestSchema, r));
    if (r.id !== key) add(where, `id "${r.id}" khác khoá "${key}"`);
    if (!r.id.startsWith(`${r.kind}-`)) add(where, `id phải bắt đầu bằng "${r.kind}-"`);
    for (const hit of findTerms(r.text, NOWHERE)) add(where, `từ bị cấm: "${hit}"`);
    if (r.kind === 'refer') {
      if (r.acceptable.length) add(where, 'yêu cầu có triệu chứng không được có sản phẩm "đúng"');
      if (!findTerms(r.text, SYMPTOMS).length) add(where, 'yêu cầu refer phải mô tả một triệu chứng có trong blocklist.symptoms');
    } else {
      if (!r.acceptable.length) add(where, 'cần ít nhất một sản phẩm phù hợp');
      for (const hit of findTerms(r.text, SYMPTOMS)) add(where, `mô tả triệu chứng "${hit}" thì phải là kind = refer`);
      for (const hit of findTerms(r.text, GAME_VOICE)) add(where, `lời hứa hẹn điều trị "${hit}"`);
    }
    for (const pid of r.acceptable) {
      if (!products[pid]) add(where, `sản phẩm không tồn tại: ${pid}`);
      reachable.add(pid);
    }
  }
  for (const key of Object.keys(products)) if (!reachable.has(key)) add(`products.${key}`, 'không yêu cầu nào dẫn tới sản phẩm này');

  for (const [key, a] of Object.entries(archetypes)) {
    const where = `archetypes.${key}`;
    issues.push(...schemaIssues(where, archetypeSchema, a));
    if (a.patienceMs[0] > a.patienceMs[1]) add(where, 'patienceMs [min, max] bị đảo');
    for (const rid of Object.keys(a.requestWeights)) if (!requests[rid]) add(where, `yêu cầu không tồn tại: ${rid}`);
  }

  for (const hit of findTerms(referralMessage, [...NOWHERE, ...GAME_VOICE])) add('REFERRAL_MESSAGE', `từ bị cấm: "${hit}"`);
  issues.push(...validateStaffAndUpgrades());
  issues.push(...validateReviewText());
  return issues;
}

/** Lời bình và câu phản hồi: không tên thuốc/liều, không hứa điều trị, không nói về kết quả sức khoẻ. */
export function validateReviewText(
  comments: Record<string, readonly string[]> = REVIEW_COMMENTS,
  replies: Record<string, { reply: string; label: string }> = COMPLAINT_RESPONSES,
): Issue[] {
  const issues: Issue[] = [];
  const banned = [...NOWHERE, ...GAME_VOICE, ...HEALTH_OUTCOME];
  for (const [reason, list] of Object.entries(comments)) {
    if (!REASONS[reason as keyof typeof REASONS]) issues.push({ where: `reviews.${reason}`, problem: 'mã lý do không tồn tại' });
    if (!list.length) issues.push({ where: `reviews.${reason}`, problem: 'thiếu lời bình mẫu' });
    list.forEach((text, i) => {
      for (const hit of findTerms(text, banned)) issues.push({ where: `reviews.${reason}[${i}]`, problem: `từ bị cấm: "${hit}"` });
    });
  }
  for (const [key, r] of Object.entries(replies)) {
    for (const hit of findTerms(`${r.label} ${r.reply}`, banned)) issues.push({ where: `responses.${key}`, problem: `từ bị cấm: "${hit}"` });
  }
  return issues;
}

export function validateStaffAndUpgrades(
  staff: Record<string, StaffCandidateDef> = STAFF_CANDIDATES,
  upgrades: Record<string, UpgradeDef> = UPGRADES,
): Issue[] {
  const issues: Issue[] = [];
  const add = (where: string, problem: string) => issues.push({ where, problem });
  const unit = z.number().min(0).max(1);
  const staffSchema = z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    name: z.string().min(1).max(20),
    role: z.enum(['pharmacist', 'clerk']),
    blurb: z.string().min(4).max(100),
    hireCost: z.number().int().positive(),
    speed: z.number().min(0.5).max(2),
    knowledge: unit,
    communication: unit,
  });
  for (const [key, s] of Object.entries(staff)) {
    const where = `staff.${key}`;
    issues.push(...schemaIssues(where, staffSchema, s));
    if (s.id !== key) add(where, `id "${s.id}" khác khoá "${key}"`);
    for (const hit of findTerms(`${s.name} ${s.blurb}`, [...NOWHERE, ...GAME_VOICE])) add(where, `từ bị cấm: "${hit}"`);
  }
  for (const [key, u] of Object.entries(upgrades)) {
    const where = `upgrades.${key}`;
    if (u.id !== key) add(where, `id "${u.id}" khác khoá "${key}"`);
    if (!Number.isInteger(u.cost) || u.cost <= 0) add(where, 'giá phải là số nguyên dương');
    if (!u.tradeoff.trim()) add(where, 'mỗi nâng cấp phải nêu đánh đổi');
    if (!u.effects.length) add(where, 'nâng cấp không có hiệu ứng');
    for (const hit of findTerms(`${u.name} ${u.benefit} ${u.tradeoff}`, [...NOWHERE, ...GAME_VOICE])) add(where, `từ bị cấm: "${hit}"`);
  }
  return issues;
}
