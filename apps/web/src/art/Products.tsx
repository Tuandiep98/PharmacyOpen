import type { ProductId } from '@pharmacy/simulation';
import { ART, INK } from './palette';

/** Vật phẩm gốc 40×48, cùng góc nhìn và nét mực; đáy nằm ở y=47. */
const stroke = { stroke: INK, strokeWidth: 1.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function MaskPack() {
  return <g>
    <ellipse cx={20} cy={46} rx={16} ry={2} fill={INK} opacity={0.12} />
    <path d="M4,12 Q4,8 8,8 H32 Q36,8 36,12 V43 Q36,46 33,46 H7 Q4,46 4,43Z" fill="#EAF1EE" {...stroke} />
    <path d="M4,13 Q4,8 8,8 H32 Q36,8 36,13 V18 H4Z" fill="#729EA4" {...stroke} />
    <path d="M11,8 V5 H29 V8" fill="none" {...stroke} />
    <path d="M10,26 Q20,22 30,26 L28,37 Q20,41 12,37Z" fill={ART.paper} {...stroke} />
    <path d="M10,28 Q5,29 8,35 M30,28 Q35,29 32,35" fill="none" {...stroke} strokeWidth={1.2} />
    <path d="M15,29 H25 M15,33 H25" fill="none" stroke="#729EA4" strokeWidth={1.3} strokeLinecap="round" />
    <path d="M8,22 H16" stroke={INK} strokeOpacity={0.35} strokeWidth={1.2} />
  </g>;
}

function BandagePack() {
  return <g>
    <ellipse cx={20} cy={46} rx={16} ry={2} fill={INK} opacity={0.12} />
    <path d="M5,12 L33,10 Q36,10 36,14 L35,43 Q35,46 32,46 H8 Q5,46 5,43Z" fill="#F8E6C9" {...stroke} />
    <path d="M5,12 L33,10 Q36,10 36,14 V19 L5,21Z" fill="#C58E61" {...stroke} />
    <path d="M10,16 H25" stroke={ART.paper} strokeWidth={1.4} strokeLinecap="round" />
    <g transform="rotate(-23 20 32)">
      <rect x={7} y={28} width={26} height={10} rx={5} fill="#DEAF82" {...stroke} />
      <rect x={15} y={29.5} width={10} height={7} rx={2} fill={ART.paper} stroke={INK} strokeWidth={1} />
      <g fill="#A46D52"><circle cx={11} cy={31} r={.8} /><circle cx={11} cy={35} r={.8} /><circle cx={29} cy={31} r={.8} /><circle cx={29} cy={35} r={.8} /></g>
    </g>
  </g>;
}

function SunscreenTube() {
  return <g>
    <ellipse cx={20} cy={46} rx={13} ry={2} fill={INK} opacity={0.12} />
    <path d="M10,4 H30 L27,38 H13Z" fill="#F0CF7F" {...stroke} />
    <path d="M10,4 H30 L29,10 H11Z" fill="#C97D52" {...stroke} />
    <path d="M14,38 H26 V46 H14Z" fill="#C97D52" {...stroke} />
    <path d="M15,13 L13,34" stroke={ART.paper} strokeWidth={2.2} strokeOpacity={.65} strokeLinecap="round" />
    <circle cx={20} cy={25} r={5} fill={ART.honey} stroke={INK} strokeWidth={1.4} />
    <g stroke="#A76437" strokeWidth={1.4} strokeLinecap="round">
      <path d="M20,16 V18 M20,32 V34 M11,25 H13 M27,25 H29 M14,19 L16,21 M24,29 L26,31 M26,19 L24,21 M16,29 L14,31" />
    </g>
  </g>;
}

function SanitizerBottle() {
  return <g>
    <ellipse cx={20} cy={46} rx={15} ry={2} fill={INK} opacity={0.12} />
    <path d="M17,5 V3 H30 Q33,3 33,6 H25" fill="none" {...stroke} strokeWidth={2.4} />
    <rect x={16} y={6} width={10} height={9} rx={2} fill={ART.leaf} {...stroke} />
    <path d="M10,17 Q10,14 13,14 H27 Q30,14 30,17 L33,39 Q33,46 27,46 H13 Q7,46 7,39Z" fill="#A9D4C1" {...stroke} />
    <path d="M9,29 H31 L32,39 Q32,45 27,45 H13 Q8,45 8,39Z" fill="#76B7A0" opacity={.8} />
    <rect x={11} y={22} width={18} height={16} rx={3} fill={ART.paper} {...stroke} strokeWidth={1.2} />
    <path d="M20,25 C17,30 17,33 20,34 C23,33 23,30 20,25Z" fill={ART.leaf} stroke={INK} strokeWidth={1} />
    <path d="M13,40 H27" stroke={INK} strokeOpacity={.3} strokeWidth={1} />
  </g>;
}

function LipBalmStick() {
  return <g>
    <ellipse cx={20} cy={46} rx={12} ry={2} fill={INK} opacity={0.12} />
    <path d="M16,7 Q20,3 24,7 V15 H16Z" fill="#BE7773" {...stroke} />
    <path d="M13,14 H27 V28 H13Z" fill="#D68D89" {...stroke} />
    <path d="M12,28 H28 V43 Q28,46 25,46 H15 Q12,46 12,43Z" fill={ART.paper} {...stroke} />
    <path d="M12,29 H28 V36 H12Z" fill="#E5B6A7" {...stroke} strokeWidth={1.2} />
    <path d="M17,39 H23" stroke={ART.coral} strokeWidth={1.8} strokeLinecap="round" />
    <path d="M16,17 V25" stroke="#F5CBC0" strokeWidth={2} strokeLinecap="round" />
  </g>;
}

const PRODUCT_DRAWINGS: Record<ProductId, () => React.JSX.Element> = {
  mask: MaskPack,
  bandage: BandagePack,
  sunscreen: SunscreenTube,
  sanitizer: SanitizerBottle,
  lipbalm: LipBalmStick,
};

export function ProductArt({ id, x = 0, y = 0, scale = 1 }: { id: ProductId; x?: number; y?: number; scale?: number }) {
  const Drawing = PRODUCT_DRAWINGS[id];
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><Drawing /></g>;
}

export function ProductIcon({ id, size = 40, title }: { id: ProductId; size?: number; title?: string }) {
  return <svg width={size} height={size * 1.2} viewBox="0 0 40 48" role="img" aria-label={title} aria-hidden={title ? undefined : true}><ProductArt id={id} /></svg>;
}
