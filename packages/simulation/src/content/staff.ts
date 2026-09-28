import type { StaffCandidateDef, TraitDef, TraitId } from './types';

export const TRAITS: Record<TraitId, TraitDef> = {
  hardworking: { id: 'hardworking', name: 'Chăm chỉ', description: 'Bổ sung kệ nhanh hơn 30%.' },
  meticulous: {
    id: 'meticulous',
    name: 'Cẩn thận',
    description: 'Suy nghĩ lâu hơn một chút nhưng ít chọn nhầm món hơn.',
  },
  talkative: {
    id: 'talkative',
    name: 'Hoạt ngôn',
    description: 'Khách thích được giải thích sẽ vui hơn; khách đang vội lại thấy phiền.',
  },
};

// Ứng viên có thể tuyển. Chỉ số trong [0, 1] (speed là hệ số, 1 = chuẩn). Giá trị cân bằng tạm thời.
// Tuổi, giới tính không quyết định năng lực: chỉ số được đặt riêng cho từng người.
export const STAFF_CANDIDATES: Record<string, StaffCandidateDef> = {
  binh: {
    id: 'binh',
    name: 'Bình',
    role: 'clerk',
    blurb: 'Nhân viên mới, chăm chỉ, đang học nhận biết sản phẩm.',
    hireCost: 80,
    wage: 12,
    speed: 0.9,
    knowledge: 0.55,
    communication: 0.7,
    trait: 'hardworking',
    look: { skin: 2, hair: 1, hairStyle: 0 },
  },
  chi: {
    id: 'chi',
    name: 'Chi',
    role: 'pharmacist',
    blurb: 'Dược sĩ trẻ, hiểu sản phẩm, làm việc cẩn thận.',
    hireCost: 180,
    wage: 25,
    speed: 1,
    knowledge: 0.85,
    communication: 0.6,
    trait: 'meticulous',
    look: { skin: 0, hair: 0, hairStyle: 2 },
  },
  dung: {
    id: 'dung',
    name: 'Dũng',
    role: 'clerk',
    blurb: 'Nhiều kinh nghiệm bán lẻ, nhanh tay và nói chuyện dễ nghe.',
    hireCost: 300,
    wage: 35,
    speed: 1.25,
    knowledge: 0.7,
    communication: 0.85,
    trait: 'talkative',
    look: { skin: 3, hair: 4, hairStyle: 3 },
  },
};

export const STAFF_CANDIDATE_IDS = Object.keys(STAFF_CANDIDATES);
