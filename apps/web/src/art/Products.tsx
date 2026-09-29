import type { ProductId } from "@pharmacy/simulation";
import { ART, INK } from "./palette";

/** Vật phẩm gốc 40×48, cùng góc nhìn và nét mực; đáy nằm ở y=47. */
const stroke = {
  stroke: INK,
  strokeWidth: 1.8,
  strokeLinejoin: "round" as const,
  strokeLinecap: "round" as const,
};

function MaskPack() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={16} ry={2} fill={INK} opacity={0.12} />
      <path
        d="M4,12 Q4,8 8,8 H32 Q36,8 36,12 V43 Q36,46 33,46 H7 Q4,46 4,43Z"
        fill="#EAF1EE"
        {...stroke}
      />
      <path
        d="M4,13 Q4,8 8,8 H32 Q36,8 36,13 V18 H4Z"
        fill="#729EA4"
        {...stroke}
      />
      <path d="M11,8 V5 H29 V8" fill="none" {...stroke} />
      <path
        d="M10,26 Q20,22 30,26 L28,37 Q20,41 12,37Z"
        fill={ART.paper}
        {...stroke}
      />
      <path
        d="M10,28 Q5,29 8,35 M30,28 Q35,29 32,35"
        fill="none"
        {...stroke}
        strokeWidth={1.2}
      />
      <path
        d="M15,29 H25 M15,33 H25"
        fill="none"
        stroke="#729EA4"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <path d="M8,22 H16" stroke={INK} strokeOpacity={0.35} strokeWidth={1.2} />
    </g>
  );
}

function BandagePack() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={16} ry={2} fill={INK} opacity={0.12} />
      <path
        d="M5,12 L33,10 Q36,10 36,14 L35,43 Q35,46 32,46 H8 Q5,46 5,43Z"
        fill="#F8E6C9"
        {...stroke}
      />
      <path
        d="M5,12 L33,10 Q36,10 36,14 V19 L5,21Z"
        fill="#C58E61"
        {...stroke}
      />
      <path
        d="M10,16 H25"
        stroke={ART.paper}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <g transform="rotate(-23 20 32)">
        <rect
          x={7}
          y={28}
          width={26}
          height={10}
          rx={5}
          fill="#DEAF82"
          {...stroke}
        />
        <rect
          x={15}
          y={29.5}
          width={10}
          height={7}
          rx={2}
          fill={ART.paper}
          stroke={INK}
          strokeWidth={1}
        />
        <g fill="#A46D52">
          <circle cx={11} cy={31} r={0.8} />
          <circle cx={11} cy={35} r={0.8} />
          <circle cx={29} cy={31} r={0.8} />
          <circle cx={29} cy={35} r={0.8} />
        </g>
      </g>
    </g>
  );
}

function SunscreenTube() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={13} ry={2} fill={INK} opacity={0.12} />
      <path d="M10,4 H30 L27,38 H13Z" fill="#F0CF7F" {...stroke} />
      <path d="M10,4 H30 L29,10 H11Z" fill="#C97D52" {...stroke} />
      <path d="M14,38 H26 V46 H14Z" fill="#C97D52" {...stroke} />
      <path
        d="M15,13 L13,34"
        stroke={ART.paper}
        strokeWidth={2.2}
        strokeOpacity={0.65}
        strokeLinecap="round"
      />
      <circle
        cx={20}
        cy={25}
        r={5}
        fill={ART.honey}
        stroke={INK}
        strokeWidth={1.4}
      />
      <g stroke="#A76437" strokeWidth={1.4} strokeLinecap="round">
        <path d="M20,16 V18 M20,32 V34 M11,25 H13 M27,25 H29 M14,19 L16,21 M24,29 L26,31 M26,19 L24,21 M16,29 L14,31" />
      </g>
    </g>
  );
}

function SanitizerBottle() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={15} ry={2} fill={INK} opacity={0.12} />
      <path
        d="M17,5 V3 H30 Q33,3 33,6 H25"
        fill="none"
        {...stroke}
        strokeWidth={2.4}
      />
      <rect
        x={16}
        y={6}
        width={10}
        height={9}
        rx={2}
        fill={ART.leaf}
        {...stroke}
      />
      <path
        d="M10,17 Q10,14 13,14 H27 Q30,14 30,17 L33,39 Q33,46 27,46 H13 Q7,46 7,39Z"
        fill="#A9D4C1"
        {...stroke}
      />
      <path
        d="M9,29 H31 L32,39 Q32,45 27,45 H13 Q8,45 8,39Z"
        fill="#76B7A0"
        opacity={0.8}
      />
      <rect
        x={11}
        y={22}
        width={18}
        height={16}
        rx={3}
        fill={ART.paper}
        {...stroke}
        strokeWidth={1.2}
      />
      <path
        d="M20,25 C17,30 17,33 20,34 C23,33 23,30 20,25Z"
        fill={ART.leaf}
        stroke={INK}
        strokeWidth={1}
      />
      <path d="M13,40 H27" stroke={INK} strokeOpacity={0.3} strokeWidth={1} />
    </g>
  );
}

function LipBalmStick() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={12} ry={2} fill={INK} opacity={0.12} />
      <path d="M16,7 Q20,3 24,7 V15 H16Z" fill="#BE7773" {...stroke} />
      <path d="M13,14 H27 V28 H13Z" fill="#D68D89" {...stroke} />
      <path
        d="M12,28 H28 V43 Q28,46 25,46 H15 Q12,46 12,43Z"
        fill={ART.paper}
        {...stroke}
      />
      <path
        d="M12,29 H28 V36 H12Z"
        fill="#E5B6A7"
        {...stroke}
        strokeWidth={1.2}
      />
      <path
        d="M17,39 H23"
        stroke={ART.coral}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <path
        d="M16,17 V25"
        stroke="#F5CBC0"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
}

function Carton({
  fill,
  band,
  children,
}: {
  fill: string;
  band: string;
  children: React.ReactNode;
}) {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={15} ry={2} fill={INK} opacity={0.12} />
      <rect x={5} y={8} width={30} height={38} rx={4} fill={fill} {...stroke} />
      <path d="M5 14h30v7H5z" fill={band} stroke={INK} strokeWidth={1.2} />
      {children}
    </g>
  );
}

function Tube({
  fill,
  band,
  children,
}: {
  fill: string;
  band: string;
  children: React.ReactNode;
}) {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={13} ry={2} fill={INK} opacity={0.12} />
      <path d="M10 5h20l-3 33H13z" fill={fill} {...stroke} />
      <path d="M10 5h20v6H10z" fill={band} {...stroke} />
      <rect
        x={14}
        y={38}
        width={12}
        height={8}
        rx={2}
        fill={band}
        {...stroke}
      />
      {children}
    </g>
  );
}

function PumpBottle({
  fill,
  label,
  children,
}: {
  fill: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={15} ry={2} fill={INK} opacity={0.12} />
      <rect
        x={10}
        y={13}
        width={20}
        height={33}
        rx={6}
        fill={fill}
        {...stroke}
      />
      <path d="M18 13V7h11v3h-7" fill="none" {...stroke} strokeWidth={2.2} />
      <rect
        x={12}
        y={23}
        width={16}
        height={16}
        rx={3}
        fill={label}
        stroke={INK}
        strokeWidth={1.1}
      />
      {children}
    </g>
  );
}

function SoapBar() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={16} ry={2} fill={INK} opacity={0.12} />
      <rect
        x={4}
        y={15}
        width={32}
        height={30}
        rx={7}
        fill="#E6BDA4"
        {...stroke}
      />
      <path d="M4 24h32v12H4z" fill="#F5D7C5" stroke={INK} strokeWidth={1.1} />
      <circle
        cx={19}
        cy={30}
        r={5}
        fill={ART.paper}
        stroke={INK}
        strokeWidth={1.1}
      />
      <circle
        cx={29}
        cy={10}
        r={4}
        fill="#DCEFE3"
        stroke={INK}
        strokeWidth={1}
      />
      <circle
        cx={34}
        cy={5}
        r={2}
        fill="#DCEFE3"
        stroke={INK}
        strokeWidth={0.8}
      />
    </g>
  );
}

function TissueBox() {
  return (
    <Carton fill="#E8F0E7" band="#7EAF9B">
      <path
        d="M13 8c-2-5 1-7 4-5 2-3 6-2 6 2 4-1 6 2 4 5"
        fill={ART.paper}
        {...stroke}
        strokeWidth={1.2}
      />
      <path
        d="M10 30h20M12 34h16"
        stroke={ART.leaf}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Carton>
  );
}

function WipesPack() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={17} ry={2} fill={INK} opacity={0.12} />
      <path
        d="M5 25Q5 20 10 20h20q5 0 5 5v18q0 3-4 3H9q-4 0-4-3z"
        fill="#B8D9CD"
        {...stroke}
      />
      <rect
        x={12}
        y={22}
        width={16}
        height={10}
        rx={3}
        fill={ART.paper}
        {...stroke}
        strokeWidth={1.1}
      />
      <path
        d="M16 27h8M11 38h18"
        stroke={ART.leaf}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </g>
  );
}

function CottonPadsPack() {
  return (
    <Carton fill="#F4E5D8" band="#CB9D8C">
      <circle
        cx={20}
        cy={32}
        r={8}
        fill={ART.paper}
        {...stroke}
        strokeWidth={1.2}
      />
      <path
        d="M14 33q6-7 12 0"
        fill="none"
        stroke="#D4C2AC"
        strokeWidth={1.1}
      />
    </Carton>
  );
}

function ToothbrushPack() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={13} ry={2} fill={INK} opacity={0.12} />
      <rect
        x={10}
        y={4}
        width={20}
        height={42}
        rx={5}
        fill="#DFEEE9"
        {...stroke}
      />
      <path d="M19 39V17h3v22" fill="#6BA9AA" {...stroke} strokeWidth={1} />
      <rect
        x={17}
        y={10}
        width={7}
        height={8}
        rx={2}
        fill={ART.paper}
        {...stroke}
        strokeWidth={1}
      />
      <path d="M18 10V7m2 3V7m2 3V7" stroke={INK} strokeWidth={0.9} />
    </g>
  );
}

function ToothpasteTube() {
  return (
    <Tube fill="#F1E7D2" band="#7BA5AD">
      <path
        d="M17 18q-3 5 3 12 6-7 3-12"
        fill={ART.paper}
        {...stroke}
        strokeWidth={1.1}
      />
      <path d="M16 34h8" stroke="#7BA5AD" strokeWidth={1.5} />
    </Tube>
  );
}

function FlossCase() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={14} ry={2} fill={INK} opacity={0.12} />
      <rect
        x={8}
        y={15}
        width={24}
        height={30}
        rx={10}
        fill="#E8D7B9"
        {...stroke}
      />
      <path d="M10 24h20" stroke={INK} strokeWidth={1.2} />
      <circle
        cx={20}
        cy={34}
        r={5}
        fill={ART.paper}
        {...stroke}
        strokeWidth={1}
      />
      <path
        d="M20 28v-7q7-7 13-3"
        fill="none"
        stroke={ART.leaf}
        strokeWidth={1.2}
      />
    </g>
  );
}

function CottonSwabBox() {
  return (
    <Carton fill="#DCEDE8" band="#9DBEB2">
      <path d="M12 26l16 12M28 26L12 38" stroke={INK} strokeWidth={1.3} />
      <g fill={ART.paper} stroke={INK} strokeWidth={0.8}>
        <circle cx={12} cy={26} r={2} />
        <circle cx={28} cy={38} r={2} />
        <circle cx={28} cy={26} r={2} />
        <circle cx={12} cy={38} r={2} />
      </g>
    </Carton>
  );
}

function PocketComb() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={16} ry={2} fill={INK} opacity={0.12} />
      <rect
        x={4}
        y={14}
        width={32}
        height={31}
        rx={4}
        fill="#EFD8C0"
        {...stroke}
      />
      <path d="M8 27h24v6H8z" fill="#A6785D" {...stroke} strokeWidth={1.1} />
      <path
        d="M10 33v8m4-8v8m4-8v8m4-8v8m4-8v8m4-8v8"
        stroke={INK}
        strokeWidth={1.2}
      />
    </g>
  );
}

function GauzePack() {
  return (
    <Carton fill="#EEECE1" band="#A6BDB2">
      <rect
        x={11}
        y={26}
        width={18}
        height={14}
        rx={2}
        fill={ART.paper}
        {...stroke}
        strokeWidth={1}
      />
      <path
        d="M11 30h18m-18 4h18m-12-8v14m6-14v14"
        stroke="#C4D6CF"
        strokeWidth={0.8}
      />
    </Carton>
  );
}

function TapeRoll() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={16} ry={2} fill={INK} opacity={0.12} />
      <rect
        x={5}
        y={20}
        width={30}
        height={25}
        rx={4}
        fill="#E5C99F"
        {...stroke}
      />
      <circle
        cx={20}
        cy={32}
        r={10}
        fill="#E4B879"
        {...stroke}
        strokeWidth={1.2}
      />
      <circle
        cx={20}
        cy={32}
        r={4}
        fill={ART.paper}
        {...stroke}
        strokeWidth={1.1}
      />
    </g>
  );
}

function ElasticBandageRoll() {
  return (
    <g>
      <ellipse cx={20} cy={46} rx={16} ry={2} fill={INK} opacity={0.12} />
      <rect
        x={5}
        y={20}
        width={30}
        height={26}
        rx={4}
        fill="#E8D0AF"
        {...stroke}
      />
      <path d="M9 22h22v22H9z" fill="#EBD8B8" stroke={INK} strokeWidth={1} />
      <path
        d="M10 26h20m-20 5h20m-20 5h20m-20 5h20"
        stroke="#B48D6B"
        strokeWidth={1.2}
      />
      <ellipse
        cx={20}
        cy={19}
        rx={14}
        ry={4}
        fill="#F1DFC4"
        {...stroke}
        strokeWidth={1.1}
      />
    </g>
  );
}

function MoisturizerBottle() {
  return (
    <PumpBottle fill="#DDD7E9" label={ART.paper}>
      <path
        d="M20 27c-4 5-3 8 0 9 3-1 4-4 0-9z"
        fill="#A39BC7"
        stroke={INK}
        strokeWidth={1}
      />
    </PumpBottle>
  );
}

function CleanserBottle() {
  return (
    <PumpBottle fill="#BBDDD6" label={ART.paper}>
      <path
        d="M16 33q4-8 8 0-4 6-8 0z"
        fill="#7AB7AC"
        stroke={INK}
        strokeWidth={1}
      />
    </PumpBottle>
  );
}

function HandCreamTube() {
  return (
    <Tube fill="#EECAC3" band="#C88982">
      <path
        d="M20 21c-6-5-9 4 0 11 9-7 6-16 0-11z"
        fill={ART.paper}
        stroke={INK}
        strokeWidth={1.1}
      />
    </Tube>
  );
}

const PRODUCT_DRAWINGS: Record<ProductId, () => React.JSX.Element> = {
  mask: MaskPack,
  bandage: BandagePack,
  sunscreen: SunscreenTube,
  sanitizer: SanitizerBottle,
  lipbalm: LipBalmStick,
  soap: SoapBar,
  tissues: TissueBox,
  wipes: WipesPack,
  cottonpads: CottonPadsPack,
  toothbrush: ToothbrushPack,
  toothpaste: ToothpasteTube,
  floss: FlossCase,
  cottonswab: CottonSwabBox,
  comb: PocketComb,
  gauze: GauzePack,
  tape: TapeRoll,
  elasticbandage: ElasticBandageRoll,
  moisturizer: MoisturizerBottle,
  cleanser: CleanserBottle,
  handcream: HandCreamTube,
};

export function ProductArt({
  id,
  x = 0,
  y = 0,
  scale = 1,
}: {
  id: ProductId;
  x?: number;
  y?: number;
  scale?: number;
}) {
  const Drawing = PRODUCT_DRAWINGS[id];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <Drawing />
    </g>
  );
}

export function ProductIcon({
  id,
  size = 40,
  title,
}: {
  id: ProductId;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size * 1.2}
      viewBox="0 0 40 48"
      role="img"
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <ProductArt id={id} />
    </svg>
  );
}
