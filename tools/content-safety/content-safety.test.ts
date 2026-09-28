import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findTerms, GAME_VOICE, NOWHERE, SYMPTOMS, validateContent, validateReviewText } from './validate';
import { PRODUCTS, REFERRAL_MESSAGE, REQUESTS, ARCHETYPES } from '../../packages/simulation/src/content';

const ROOT = join(import.meta.dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css|html|webmanifest)$/.test(name) ? [path] : [];
  });
}

describe('cổng an toàn nội dung', () => {
  it('nội dung game hiện tại hợp lệ', () => {
    expect(validateContent()).toEqual([]);
  });

  it('mã nguồn UI và simulation không chứa tên thuốc thật, liều dùng, chuỗi nhà thuốc thật hay lời hứa điều trị', () => {
    const files = [
      ...sourceFiles(join(ROOT, 'apps/web/src')),
      ...sourceFiles(join(ROOT, 'packages/simulation/src')),
      join(ROOT, 'apps/web/index.html'),
      join(ROOT, 'apps/web/public/manifest.webmanifest'),
    ];
    const hits = files.flatMap((file) =>
      findTerms(readFileSync(file, 'utf8'), [...NOWHERE, ...GAME_VOICE]).map((term) => `${relative(ROOT, file)}: "${term}"`),
    );
    expect(hits).toEqual([]);
  });
});

describe('bộ kiểm tra bắt được vi phạm', () => {
  it('so khớp nguyên từ, không dính vào từ khác', () => {
    expect(findTerms('Uống Paracetamol 500 mg mỗi ngày', NOWHERE)).toEqual(expect.arrayContaining(['paracetamol', 'mg']));
    expect(findTerms('Cho mình hộp khẩu trang', SYMPTOMS)).toEqual([]);
    expect(findTerms('Tôi bị ho mấy hôm', SYMPTOMS)).toEqual(['ho']);
  });

  it('báo lỗi khi yêu cầu thường mô tả triệu chứng, sản phẩm hứa chữa bệnh hoặc refer có sản phẩm "đúng"', () => {
    const issues = validateContent(
      { ...PRODUCTS, mask: { ...PRODUCTS.mask, name: 'Khẩu trang chữa khỏi cảm' } },
      {
        ...REQUESTS,
        'need-bad': { id: 'need-bad', kind: 'need', text: 'Tôi bị ho quá, bán gì cũng được', acceptable: ['mask'] },
        'refer-bad': { id: 'refer-bad', kind: 'refer', text: 'Tôi sốt cao, cho tôi thuốc', acceptable: ['mask'] },
      },
      ARCHETYPES,
      REFERRAL_MESSAGE,
    );
    const text = issues.map((i) => `${i.where}: ${i.problem}`).join('\n');
    expect(text).toContain('products.mask: từ bị cấm: "chữa khỏi"');
    expect(text).toContain('requests.need-bad: mô tả triệu chứng "ho"');
    expect(text).toContain('requests.refer-bad: yêu cầu có triệu chứng không được có sản phẩm');
  });

  it('báo lỗi khi lời bình đánh giá nói về kết quả sức khoẻ hoặc tên thuốc', () => {
    const issues = validateReviewText({ 'correct-item': ['Mua về dùng là khỏi, thuốc hay lắm', 'Uống paracetamol đỡ hẳn'] }, {});
    expect(issues.map((i) => i.problem)).toEqual(
      expect.arrayContaining(['từ bị cấm: "dùng là khỏi"', 'từ bị cấm: "thuốc hay"', 'từ bị cấm: "paracetamol"']),
    );
  });

  it('báo lỗi khi câu tư vấn chứa lời hứa điều trị', () => {
    const issues = validateContent(PRODUCTS, REQUESTS, ARCHETYPES, 'Loại này đặc trị, uống 2 lần/ngày là khỏi bệnh');
    expect(issues.map((i) => i.problem)).toEqual(
      expect.arrayContaining(['từ bị cấm: "đặc trị"', 'từ bị cấm: "khỏi bệnh"', 'từ bị cấm: "lần/ngày"']),
    );
  });
});
