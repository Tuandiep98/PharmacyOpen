import type { DayPhase } from '@pharmacy/simulation';
import { useId } from 'react';
import type { BrandAvatar } from '../brand';
import { ART, INK, STROKE } from './palette';

const S = { stroke: INK, strokeWidth: STROKE, strokeLinejoin: 'round' as const };

/** Logo hư cấu: hoa bồ công anh. Cố ý KHÔNG dùng hình chữ thập (chữ thập đỏ là biểu tượng được luật bảo hộ). */
export function DandelionLogo({ x = 0, y = 0, r = 14 }: { x?: number; y?: number; r?: number }) {
  const k = r / 14;
  const rays = Array.from({ length: 12 }, (_, i) => (i * Math.PI * 2) / 12);
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <circle r={14} fill={ART.paper} {...S} />
      <path d="M0,3 Q-1,9 1,13" fill="none" stroke={ART.leaf} strokeWidth={2} strokeLinecap="round" />
      <path d="M0,10 Q-5,7 -7,9" fill="none" stroke={ART.leaf} strokeWidth={1.6} strokeLinecap="round" />
      {rays.map((a) => (
        <g key={a}>
          <path d={`M0,-2 L${Math.cos(a) * 7.5},${Math.sin(a) * 7.5 - 2}`} stroke="#91A59A" strokeWidth={0.9} />
          <circle cx={Math.cos(a) * 8.5} cy={Math.sin(a) * 8.5 - 2} r={1.6} fill={ART.honey} stroke={INK} strokeWidth={0.7} />
        </g>
      ))}
      <circle cy={-2} r={2.4} fill={ART.leaf} />
    </g>
  );
}

/** Vị trí từng hình trong sprite avatar thương hiệu (2×2 ô, xem public/brand-avatars.png). */
const AVATAR_CELL: Record<BrandAvatar, [number, number]> = { dandelion: [0, 0], sprout: [1, 0], sun: [0, 1], kite: [1, 1] };
const AVATAR_SPRITE = 1254;

/** Avatar thương hiệu người chơi đã chọn, vẽ trong SVG (cắt tròn) để bảng hiệu khớp với thanh trên cùng. */
export function BrandAvatarArt({ avatar, x, y, r }: { avatar: BrandAvatar; x: number; y: number; r: number }) {
  const clip = useId();
  const cell = AVATAR_SPRITE / 2;
  const [col, row] = AVATAR_CELL[avatar];
  return (
    <g>
      <circle cx={x} cy={y} r={r + 2} fill={ART.paper} stroke={INK} strokeWidth={STROKE} />
      <svg x={x - r} y={y - r} width={r * 2} height={r * 2} viewBox={`${col * cell} ${row * cell} ${cell} ${cell}`}>
        <clipPath id={clip}>
          <circle cx={col * cell + cell / 2} cy={row * cell + cell / 2} r={cell / 2} />
        </clipPath>
        <image href={`${import.meta.env.BASE_URL}brand-avatars.png`} width={AVATAR_SPRITE} height={AVATAR_SPRITE} clipPath={`url(#${clip})`} />
      </svg>
    </g>
  );
}

/** Bảng hiệu treo ngay trên kệ, canh giữa theo kệ; avatar và tên lấy từ nhận diện người chơi chọn. */
export function StoreSign({
  name,
  avatar,
  cx,
  width,
  level = 0,
  phase,
}: {
  name: string;
  avatar: BrandAvatar;
  cx: number;
  width: number;
  level?: number;
  /** Có thì vẽ dải chéo OPEN/CLOSED ở góc phải bảng hiệu (chừa chỗ cho tên tiệm). */
  phase?: DayPhase;
}) {
  const x = cx - width / 2;
  const textWidth = width - 76 - (phase ? 38 : 0);
  return (
    <g>
      <path d={`M${x + width * 0.22},4 V12 M${x + width * 0.78},4 V12`} stroke={INK} strokeWidth={2} />
      <rect x={x} y={10} width={width} height={40} rx={10} fill={ART.leaf} {...S} />
      {level > 0 && <path d={`M${x + 6},11 H${x + width - 6}`} stroke={level >= 2 ? '#FFD56F' : ART.honey} strokeWidth={level >= 2 ? 5 : 3} strokeLinecap="round" />}
      <rect x={x + 6} y={15} width={width - 12} height={30} rx={6} fill="none" stroke={ART.leafLight} strokeWidth={1.4} strokeDasharray="3 3" />
      <BrandAvatarArt avatar={avatar} x={x + 28} y={30} r={12} />
      <text
        x={x + 48 + textWidth / 2}
        y={36}
        textAnchor="middle"
        fontSize={16}
        fontWeight={900}
        fill="#FFFFFF"
        letterSpacing={0.3}
        textLength={name.length * 8.6 > textWidth ? textWidth : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {name}
      </text>
      {phase && <OpenBanner phase={phase} x={x + width - 22} y={30} />}
    </g>
  );
}

const BANNER: Record<DayPhase, { text: string; fill: string; ink: string; bulb: string }> = {
  open: { text: 'OPEN', fill: '#FFD56F', ink: '#6A3F06', bulb: '#FFF6C4' },
  closing: { text: 'CLOSING', fill: '#F2A65A', ink: '#5E2B0B', bulb: '#FFE1B8' },
  prep: { text: 'CLOSED', fill: '#B95D50', ink: '#FFFFFF', bulb: '#6E3A33' },
};

/**
 * Dải ruy băng chéo vắt qua góc bảng hiệu, viền bóng đèn kiểu bảng hiệu rạp hát. Đang mở thì đèn chạy
 * đuổi nhau và chữ phát sáng, sắp đóng thì nháy chậm, chưa mở thì đèn tắt (hiệu ứng ở scene.css).
 */
function OpenBanner({ phase, x, y }: { phase: DayPhase; x: number; y: number }) {
  const look = BANNER[phase];
  const half = 40;
  const bulbs = Array.from({ length: 8 }, (_, i) => -half + 12 + i * ((half * 2 - 24) / 7));
  return (
    <g className={`open-banner banner-${phase}`} transform={`translate(${x} ${y}) rotate(28)`} aria-label={look.text}>
      <path
        d={`M${-half},-11 H${half} L${half - 7},0 L${half},11 H${-half} L${-half + 7},0 Z`}
        fill={look.fill}
        {...S}
      />
      {bulbs.map((bx, i) => (
        <g key={bx} className={`banner-bulb ${i % 2 ? 'alt' : ''}`} fill={look.bulb}>
          <circle cx={bx} cy={-7.5} r={1.7} />
          <circle cx={bx} cy={7.5} r={1.7} />
        </g>
      ))}
      <text className="banner-text" x={0} y={3.6} textAnchor="middle" fontSize={phase === 'open' ? 11 : 9} fontWeight={900} fill={look.ink} letterSpacing={0.8}>
        {look.text}
      </text>
    </g>
  );
}

export function WaitingBench({ level }: { level: number }) {
  if (level < 1) return null;
  return <g aria-label="Ghế chờ">
    <rect x={8} y={304} width={level >= 2 ? 146 : 116} height={24} rx={7} fill={level >= 3 ? '#77BBA6' : ART.woodLight} {...S} />
    <rect x={8} y={331} width={level >= 2 ? 146 : 116} height={9} rx={4} fill={level >= 3 ? ART.honey : ART.wood} {...S} />
    <path d={`M20,340 V365 M${level >= 2 ? 144 : 114},340 V365`} fill="none" {...S} />
    {level >= 2 && <path d="M27,314 H135" stroke={ART.paper} strokeWidth={3} strokeLinecap="round" />}
  </g>;
}

/** Máy quét đặt trên mặt quầy, `x` là mép trái quầy. */
export function CounterScanner({ level, x }: { level: number; x: number }) {
  if (level < 1) return null;
  return <g aria-label="Máy quét mã vạch" transform={`translate(${x - 196} 0)`}>
    <path d="M252,292 L256,277 L271,278 L276,292Z" fill={level >= 2 ? ART.sky : '#6C8B83'} {...S} />
    <path d="M260,277 L264,263 L279,269 L274,283Z" fill={level >= 3 ? ART.honey : ART.leafLight} {...S} />
    <path d="M264,269 L274,272" stroke={level >= 2 ? '#FFFFFF' : ART.honey} strokeWidth={2.5} />
  </g>;
}

export function ExpandedStore({ warehouseLevel, storeLevel, width = 360 }: { warehouseLevel: number; storeLevel: number; width?: number }) {
  return <g pointerEvents="none">
    {storeLevel >= 2 && <><path d={`M0,256 H${width}`} stroke={storeLevel >= 4 ? ART.honey : ART.leafLight} strokeWidth={storeLevel >= 4 ? 9 : 5} /><path d={`M0,263 H${width}`} stroke={INK} strokeOpacity={0.25} strokeWidth={1} /></>}
    {storeLevel >= 3 && <><path d={`M8,276 H${width / 2 + 8}`} stroke={ART.leaf} strokeOpacity={0.4} strokeWidth={2} /><path d={`M${width / 2 + 10},276 H${width - 10}`} stroke={ART.leaf} strokeOpacity={0.4} strokeWidth={2} /></>}
    {warehouseLevel >= 2 && <g transform="translate(8 230)"><rect x={0} y={12} width={29} height={25} rx={3} fill={ART.woodLight} {...S} /><path d="M0,19 H29 M14,13 V37" stroke={ART.wood} strokeWidth={2} /></g>}
    {warehouseLevel >= 3 && <g transform="translate(30 225)"><rect x={0} y={8} width={25} height={29} rx={3} fill={ART.woodLight} {...S} /><path d="M0,17 H25 M12,8 V37" stroke={ART.wood} strokeWidth={2} /></g>}
    {warehouseLevel >= 4 && <path d="M13,239 H53" stroke={ART.honey} strokeWidth={3} strokeLinecap="round" />}
  </g>;
}

export function WallAndFloor() {
  return (
    <g>
      <rect x={-900} y={-600} width={2160} height={860} fill={ART.wall} />
      <g opacity={0.5}>
        {Array.from({ length: 60 }, (_, i) => (
          <path key={i} d={`M${18 + (i - 25) * 36},-600 V230`} stroke={ART.wallStripe} strokeWidth={10} />
        ))}
      </g>
      <rect x={-900} y={228} width={2160} height={32} fill={ART.mint} />
      <path d="M-900,228 H1260" stroke={INK} strokeWidth={1.6} />
      <rect x={-900} y={260} width={2160} height={400} fill={ART.floor} />
      <path d="M-900,260 H1260" stroke={INK} strokeWidth={2} />
      <g stroke={ART.floorLine} strokeWidth={1.4}>
        {Array.from({ length: 4 }, (_, i) => (
          <path key={`h${i}`} d={`M-900,${296 + i * 40} H1260`} />
        ))}
        {Array.from({ length: 40 }, (_, i) => (
          <path key={`v${i}`} d={`M${(i - 16) * 52 + 20},260 L${(i - 16) * 60 - 8},460`} />
        ))}
      </g>
    </g>
  );
}

/** Tủ kệ gỗ treo tường, 2 tầng. Các ô sản phẩm được vẽ riêng bên trên. */
export function shelfWidth(level: number): number {
  return level === 1 ? 256 : level === 2 ? 314 : 332;
}

export function ShelfUnit({ level = 1, sorted = false, cx = 180 }: { level?: number; sorted?: boolean; cx?: number }) {
  const width = shelfWidth(level);
  const x = cx - width / 2;
  const columns = Math.min(6, level + 1 + (sorted ? 1 : 0));
  const wood = level >= 3 ? '#B77A4B' : ART.wood;
  return (
    <g>
      <rect x={x} y={level >= 3 ? 50 : 58} width={width} height={level >= 3 ? 162 : 152} rx={8} fill={wood} {...S} />
      <rect x={x + 8} y={64} width={width - 16} height={66} rx={4} fill={ART.woodInner} stroke={INK} strokeWidth={1.4} />
      <rect x={x + 8} y={138} width={width - 16} height={66} rx={4} fill={ART.woodInner} stroke={INK} strokeWidth={1.4} />
      <rect x={x + 4} y={126} width={width - 8} height={9} rx={3} fill={ART.woodLight} {...S} />
      <rect x={x + 4} y={200} width={width - 8} height={9} rx={3} fill={ART.woodLight} {...S} />
      {Array.from({ length: columns - 1 }, (_, i) => <path key={i} d={`M${x + width * (i + 1) / columns},64 V130 M${x + width * (i + 1) / columns},138 V204`} stroke="#DEC9A5" strokeWidth={2} />)}
      {sorted && <><rect x={x + 8} y={54} width={width / 3} height={8} rx={4} fill={ART.sky} /><rect x={x + width / 3 + 8} y={54} width={width / 3} height={8} rx={4} fill={ART.honey} /><rect x={x + width * 2 / 3 + 8} y={54} width={width / 3 - 16} height={8} rx={4} fill={ART.coral} /></>}
      {level >= 3 && <path d={`M${x + 6},54 H${x + width - 6}`} stroke={ART.honey} strokeWidth={3} strokeLinecap="round" />}
    </g>
  );
}

/** Quầy bán: `x` là mép trái, `w` là bề ngang; mặt trước ghi số quầy thay cho logo. */
export function Counter({ x, w, label }: { x: number; w: number; label: string }) {
  return (
    <g>
      <rect x={x + 6} y={298} width={w - 12} height={74} rx={6} fill={ART.leafLight} {...S} />
      <path d={`M${x + 6},356 H${x + w - 6}`} stroke={INK} strokeWidth={1.6} />
      <rect x={x + 6} y={356} width={w - 12} height={16} rx={4} fill={ART.leaf} {...S} />
      <rect x={x} y={288} width={w} height={14} rx={5} fill={ART.paper} {...S} />
      <rect x={x + w / 2 - 38} y={316} width={76} height={26} rx={13} fill={ART.paper} stroke={ART.leaf} strokeWidth={2} />
      <text x={x + w / 2} y={334} textAnchor="middle" fontSize={14} fontWeight={900} fill={ART.leaf} letterSpacing={0.6}>
        {label}
      </text>
    </g>
  );
}

/** Máy tính tiền ở đầu phải quầy, `x` là mép trái máy. */
export function Register({ active, x }: { active: boolean; x: number }) {
  return (
    <g transform={`translate(${x - 296} 0)`}>
      <path d="M296,289 L300,262 H336 L340,289 Z" fill="#7D8BA6" {...S} />
      <rect x={303} y={250} width={30} height={16} rx={3} fill="#5B6780" {...S} />
      <rect x={306} y={253} width={24} height={10} rx={2} fill={active ? '#9BF0C9' : '#CFE9DE'} />
      <g fill="#DDE3EE">
        <rect x={304} y={270} width={6} height={4} rx={1} />
        <rect x={312} y={270} width={6} height={4} rx={1} />
        <rect x={320} y={270} width={6} height={4} rx={1} />
        <rect x={304} y={277} width={6} height={4} rx={1} />
        <rect x={312} y={277} width={6} height={4} rx={1} />
        <rect x={320} y={277} width={6} height={4} rx={1} fill="#9BF0C9" />
      </g>
    </g>
  );
}

export function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M-4,-30 C-24,-40 -26,-60 -14,-66 C-12,-50 -6,-42 -4,-30Z" fill={ART.leafLight} {...S} />
      <path d="M2,-30 C20,-44 28,-60 16,-70 C10,-54 4,-46 2,-30Z" fill={ART.leaf} {...S} />
      <path d="M0,-28 C-4,-50 0,-70 6,-78 C10,-62 6,-44 0,-28Z" fill="#6DAE7C" {...S} />
      <path d="M-14,-30 H14 L10,0 H-10 Z" fill={ART.coral} {...S} />
      <rect x={-16} y={-34} width={32} height={7} rx={3} fill="#D98773" {...S} />
    </g>
  );
}

/** Vạch xếp hàng bên trái quầy. */
export function QueueLane() {
  return (
    <g>
      <rect x={4} y={372} width={140} height={30} rx={12} fill="#EFDCC5" stroke="#D8BFA1" strokeWidth={2} strokeDasharray="6 5" />
      <text x={74} y={416} textAnchor="middle" fontSize={9} fontWeight={800} fill="#9C7F60">
        XẾP HÀNG
      </text>
    </g>
  );
}
