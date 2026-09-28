import { ART, INK } from './palette';

type IconProps = { size?: number; title?: string };

function Svg({ size = 24, title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
      stroke={INK}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const CoinIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} fill={ART.honey} />
    <circle cx={12} cy={12} r={6} fill="#FFE0A0" strokeWidth={1.2} />
    <path d="M12,8.5 V15.5" strokeWidth={2} />
  </Svg>
);

export const BagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5,8 H19 L18,20 H6 Z" fill={ART.mint} />
    <path d="M9,8 V6.5 a3,3 0 0 1 6,0 V8" />
  </Svg>
);

export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} fill={ART.paper} />
    <path d="M12,11 V16.5" strokeWidth={2.2} />
    <circle cx={12} cy={7.6} r={1.2} fill={INK} stroke="none" />
  </Svg>
);

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx={5} cy={12} r={1.5} fill={INK} stroke="none" />
    <circle cx={12} cy={12} r={1.5} fill={INK} stroke="none" />
    <circle cx={19} cy={12} r={1.5} fill={INK} stroke="none" />
  </Svg>
);

export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x={5} y={11} width={14} height={10} rx={2} fill={ART.wallStripe} />
    <path d="M8,11 V8 a4,4 0 0 1 8,0 V11" />
  </Svg>
);

/** Phòng khám (toà nhà + ống nghe) — không dùng chữ thập. */
export const ClinicIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4,20 V9 L12,4 L20,9 V20 Z" fill={ART.mint} />
    <path d="M10,20 V15 H14 V20" />
    <circle cx={12} cy={10.5} r={2.4} fill={ART.paper} />
    <path d="M2,20 H22" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} fill={ART.paper} />
    <path d="M12,7 V12 L15,14" />
  </Svg>
);

export const WarningIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12,3 L22,20 H2 Z" fill={ART.honey} />
    <path d="M12,9.5 V14" strokeWidth={2.2} />
    <circle cx={12} cy={17} r={1.1} fill={INK} stroke="none" />
  </Svg>
);

export const StoreIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4,10 V20 H20 V10" fill={ART.paper} />
    <path d="M3,10 L5,4 H19 L21,10 Z" fill={ART.leafLight} />
    <path d="M10,20 V14 H14 V20" />
  </Svg>
);

export const StaffIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx={12} cy={8} r={4} fill="#FDE0C8" />
    <path d="M4,21 C4,15 8,13 12,13 C16,13 20,15 20,21 Z" fill={ART.paper} />
  </Svg>
);

export const BoxIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3,8 L12,4 L21,8 V17 L12,21 L3,17 Z" fill={ART.woodLight} />
    <path d="M3,8 L12,12 L21,8 M12,12 V21" />
  </Svg>
);

export const StarIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12,3 L14.7,8.7 L21,9.4 L16.3,13.7 L17.6,20 L12,16.8 L6.4,20 L7.7,13.7 L3,9.4 L9.3,8.7 Z" fill={ART.honey} />
  </Svg>
);

export const MapIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3,6 L9,4 L15,6 L21,4 V18 L15,20 L9,18 L3,20 Z" fill={ART.mint} />
    <path d="M9,4 V18 M15,6 V20" />
  </Svg>
);

export const SpeakerIcon = ({ muted, ...p }: IconProps & { muted?: boolean }) => (
  <Svg {...p}>
    <path d="M4,9.5 H8 L13,5 V19 L8,14.5 H4 Z" fill={ART.mint} />
    {muted ? (
      <path d="M16.5,9.5 L21,14 M21,9.5 L16.5,14" strokeWidth={2} />
    ) : (
      <>
        <path d="M16,9 Q18,12 16,15" />
        <path d="M18.5,6.5 Q22.5,12 18.5,17.5" />
      </>
    )}
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} fill={ART.leafLight} />
    <path d="M7.5,12.5 L10.5,15.5 L16.5,9" strokeWidth={2.2} />
  </Svg>
);

export const CrossMarkIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx={12} cy={12} r={9} fill="#EDB6A5" />
    <path d="M8.5,8.5 L15.5,15.5 M15.5,8.5 L8.5,15.5" strokeWidth={2.2} />
  </Svg>
);

/** Ổ khoá bật/tắt: đóng = giữ ứng viên sang ngày sau. */
export const PadlockIcon = ({ open = false, ...p }: IconProps & { open?: boolean }) => (
  <Svg {...p}>
    <rect x={5} y={11} width={14} height={10} rx={2.5} fill={open ? ART.paper : ART.honey} />
    <path d={open ? 'M8,11 V8 a4,4 0 0 1 7.6,-1.7' : 'M8,11 V8 a4,4 0 0 1 8,0 V11'} />
    <circle cx={12} cy={16} r={1.4} fill={INK} strokeWidth={0} />
  </Svg>
);
