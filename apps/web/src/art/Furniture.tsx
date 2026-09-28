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

export function StoreSign({ name }: { name: string }) {
  return (
    <g>
      <path d="M110,4 V12 M250,4 V12" stroke={INK} strokeWidth={2} />
      <rect x={52} y={10} width={256} height={40} rx={10} fill={ART.leaf} {...S} />
      <rect x={58} y={15} width={244} height={30} rx={6} fill="none" stroke={ART.leafLight} strokeWidth={1.4} strokeDasharray="3 3" />
      <DandelionLogo x={80} y={30} r={13} />
      <text x={200} y={36} textAnchor="middle" fontSize={16} fontWeight={900} fill="#FFFFFF" letterSpacing={0.3}>
        {name}
      </text>
    </g>
  );
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
export function ShelfUnit() {
  return (
    <g>
      <rect x={14} y={58} width={332} height={152} rx={8} fill={ART.wood} {...S} />
      <rect x={22} y={64} width={316} height={66} rx={4} fill={ART.woodInner} stroke={INK} strokeWidth={1.4} />
      <rect x={22} y={138} width={316} height={66} rx={4} fill={ART.woodInner} stroke={INK} strokeWidth={1.4} />
      <rect x={18} y={126} width={324} height={9} rx={3} fill={ART.woodLight} {...S} />
      <rect x={18} y={200} width={324} height={9} rx={3} fill={ART.woodLight} {...S} />
      <path d="M126,64 V130 M234,64 V130 M126,138 V204 M234,138 V204" stroke="#DEC9A5" strokeWidth={2} />
    </g>
  );
}

export function Counter() {
  return (
    <g>
      <rect x={202} y={298} width={150} height={74} rx={6} fill={ART.leafLight} {...S} />
      <path d="M202,356 H352" stroke={INK} strokeWidth={1.6} />
      <rect x={202} y={356} width={150} height={16} rx={4} fill={ART.leaf} {...S} />
      <rect x={196} y={288} width={162} height={14} rx={5} fill={ART.paper} {...S} />
      <DandelionLogo x={226} y={328} r={14} />
      <text x={295} y={326} textAnchor="middle" fontSize={10} fontWeight={800} fill={ART.leaf}>
        QUẦY
      </text>
      <text x={295} y={339} textAnchor="middle" fontSize={10} fontWeight={800} fill={ART.leaf}>
        THANH TOÁN
      </text>
    </g>
  );
}

export function Register({ active }: { active: boolean }) {
  return (
    <g>
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
