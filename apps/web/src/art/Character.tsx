import type {
  CustomerExpression,
  CustomerLook,
  StaffLook,
  StaffRole,
  WorkerExpression,
} from "@pharmacy/simulation";
import { ART, HAIR, INK, OUTFIT, PANTS, SKIN, pick } from "./palette";

export type FaceExpression = CustomerExpression | WorkerExpression;
const line = {
  fill: "none",
  stroke: INK,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Mặt luôn nằm ở tâm (0,-78), đủ nét để đọc ở chân dung 56 px. */
export function Face({ expression }: { expression: FaceExpression }) {
  const eyes = (
    <>
      <ellipse cx={-8} cy={-77} rx={2.1} ry={3} fill={INK} />
      <ellipse cx={8} cy={-77} rx={2.1} ry={3} fill={INK} />
    </>
  );
  const closed = (
    <>
      <path d="M-12,-77 Q-8,-82 -4,-77" {...line} />
      <path d="M4,-77 Q8,-82 12,-77" {...line} />
    </>
  );
  let marks: React.ReactNode;
  switch (expression) {
    case "happy":
      marks = (
        <>
          {closed}
          <path d="M-6,-68 Q0,-59 6,-68Z" fill={INK} />
        </>
      );
      break;
    case "grateful":
      marks = (
        <>
          {closed}
          <path d="M-5,-67 Q0,-62 5,-67" {...line} />
          <path
            d="M18,-91 C18,-96 23,-96 25,-92 C27,-96 32,-96 32,-91 C32,-87 25,-83 25,-83 C25,-83 18,-87 18,-91Z"
            fill="#C97878"
            stroke={INK}
            strokeWidth={1.2}
          />
        </>
      );
      break;
    case "thinking":
      marks = (
        <>
          {eyes}
          <path d="M4,-84 Q8,-87 12,-85 M-3,-66 L4,-67" {...line} />
        </>
      );
      break;
    case "confused":
      marks = (
        <>
          {eyes}
          <path d="M-11,-84 Q-7,-86 -4,-83 M-5,-67 Q0,-70 5,-66" {...line} />
          <path
            d="M19,-99 Q21,-105 26,-103 Q31,-101 27,-96 L24,-93"
            {...line}
          />
          <circle cx={24} cy={-89} r={1.2} fill={INK} />
        </>
      );
      break;
    case "impatient":
      marks = (
        <>
          {eyes}
          <path d="M-12,-85 L-4,-82 M12,-85 L4,-82 M-5,-66 H5" {...line} />
          <Tear />
        </>
      );
      break;
    case "angry":
      marks = (
        <>
          {eyes}
          <path
            d="M-13,-86 L-4,-82 M13,-86 L4,-82 M-6,-64 Q0,-71 6,-64"
            {...line}
          />
          <path
            d="M19,-96 l4,3 3,-3 2,4"
            fill="none"
            stroke={ART.coral}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      );
      break;
    case "unwell":
      marks = (
        <>
          <path
            d="M-12,-77 Q-8,-74 -4,-77 M4,-77 Q8,-74 12,-77 M-5,-66 Q-2,-69 0,-66 Q2,-63 5,-66"
            {...line}
          />
          <Tear />
        </>
      );
      break;
    case "focused":
      marks = (
        <>
          {eyes}
          <path d="M-12,-84 H-5 M5,-84 H12 M-4,-67 Q0,-65 4,-67" {...line} />
        </>
      );
      break;
    case "worried":
      marks = (
        <>
          {eyes}
          <path d="M-12,-83 L-5,-86 M12,-83 L5,-86" {...line} />
          <ellipse cy={-66} rx={2} ry={3} fill={INK} />
          <Tear />
        </>
      );
      break;
    default:
      marks = (
        <>
          {eyes}
          <path d="M-5,-67 Q0,-63 5,-67" {...line} />
        </>
      );
  }
  return (
    <g>
      <ellipse cx={-15} cy={-69} rx={4} ry={2} fill="#D98079" opacity={0.35} />
      <ellipse cx={15} cy={-69} rx={4} ry={2} fill="#D98079" opacity={0.35} />
      {marks}
    </g>
  );
}

function Tear() {
  return (
    <path
      d="M21,-86 Q16,-77 21,-76 Q26,-77 21,-86Z"
      fill="#95BFCA"
      stroke={INK}
      strokeWidth={1}
    />
  );
}

function Body({
  shirt,
  pants,
  skin,
  variant = 0,
  seated = false,
  children,
}: {
  shirt: string;
  pants: string;
  skin: string;
  variant?: number;
  seated?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <g>
      <ellipse cy={-1} rx={24} ry={5} fill={INK} opacity={0.12} />
      {seated ? (
        <>
          <path
            d="M-18,-25 Q-29,-19 -28,-8 L-11,-7 L-4,-20 M4,-20 L12,-7 L29,-8 Q30,-18 18,-25Z"
            fill={pants}
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path d="M-30,-7 H-10 M10,-7 H30" {...line} strokeWidth={2.5} />
        </>
      ) : (
        <>
          <path
            d="M-15,-26 L-13,-6 Q-13,-3 -20,-2 L-21,1 H-2 L-3,-27Z M3,-27 L2,-2 H21 L20,-5 Q14,-8 15,-26Z"
            fill={pants}
            stroke={INK}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <path d="M-21,-2 H-2 M2,-2 H21" {...line} strokeWidth={2.5} />
        </>
      )}
      <path
        d="M-17,-53 Q-24,-53 -28,-44 L-27,-27 Q-23,-23 -20,-29 L-18,-39 L-20,-23 Q0,-17 20,-23 L18,-39 L20,-29 Q23,-23 27,-27 L28,-44 Q24,-53 17,-53Z"
        fill={shirt}
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M-25,-28 Q-23,-24 -20,-27 M20,-27 Q23,-24 25,-28"
        fill="none"
        stroke={skin}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path
        d="M-17,-49 Q0,-54 17,-49"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.34}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      {variant % 3 === 0 && (
        <path d="M-11,-31 Q0,-27 11,-31" {...line} strokeWidth={1.4} />
      )}
      {variant % 3 === 1 && (
        <path d="M-8,-27 V-39 H7 V-27" {...line} strokeWidth={1.5} />
      )}
      {variant % 3 === 2 && (
        <path
          d="M-14,-50 L-8,-40 L-17,-37 M14,-50 L8,-40 L17,-37"
          {...line}
          strokeWidth={1.4}
        />
      )}
      {children}
    </g>
  );
}

function BackHair({ hair, style }: { hair: string; style: number }) {
  if (style === 1 || style === 3) {
    return (
      <path
        d={
          style === 1
            ? "M-24,-86 Q-29,-59 -23,-48 Q0,-44 23,-48 Q29,-59 24,-86Z"
            : "M-25,-85 Q-31,-62 -27,-41 Q0,-34 27,-41 Q31,-62 25,-85Z"
        }
        fill={hair}
        stroke={INK}
        strokeWidth={2}
      />
    );
  }
  if (style === 2)
    return (
      <circle
        cx={21}
        cy={-96}
        r={11}
        fill={hair}
        stroke={INK}
        strokeWidth={2}
      />
    );
  return null;
}

function Head({
  skin,
  hair,
  style,
  cap,
}: {
  skin: string;
  hair: string;
  style: number;
  cap?: string;
}) {
  return (
    <g>
      <ellipse
        cx={-23}
        cy={-77}
        rx={4}
        ry={5}
        fill={skin}
        stroke={INK}
        strokeWidth={2}
      />
      <ellipse
        cx={23}
        cy={-77}
        rx={4}
        ry={5}
        fill={skin}
        stroke={INK}
        strokeWidth={2}
      />
      <path
        d="M-23,-86 Q-22,-102 0,-102 Q22,-102 23,-86 L21,-69 Q17,-56 0,-55 Q-17,-56 -21,-69Z"
        fill={skin}
        stroke={INK}
        strokeWidth={2}
      />
      <path
        d="M-17,-92 Q-10,-99 0,-98"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity={0.28}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {style === 0 && (
        <path
          d="M-23,-80 Q-29,-104 -7,-107 Q6,-110 20,-99 Q25,-93 22,-82 Q14,-84 9,-94 Q0,-84 -12,-85 L-23,-80Z"
          fill={hair}
          stroke={INK}
          strokeWidth={2}
        />
      )}
      {style === 1 && (
        <path
          d="M-23,-79 Q-25,-102 -6,-106 Q18,-109 23,-86 Q15,-95 6,-94 Q-3,-85 -13,-91Z"
          fill={hair}
          stroke={INK}
          strokeWidth={2}
        />
      )}
      {style === 2 && (
        <path
          d="M-23,-80 Q-28,-103 -6,-106 Q13,-109 23,-88 Q12,-90 8,-98 Q0,-87 -12,-88Z"
          fill={hair}
          stroke={INK}
          strokeWidth={2}
        />
      )}
      {style === 3 && (
        <path
          d="M-22,-81 Q-22,-105 0,-106 Q23,-105 23,-82 Q12,-88 2,-99 Q-3,-86 -22,-81Z"
          fill={hair}
          stroke={INK}
          strokeWidth={2}
        />
      )}
      {/* Kiểu tóc nam của nhân viên: 5 = rẽ ngôi, 6 = cắt ngắn sát. */}
      {style === 5 && (
        <path
          d="M-23,-81 Q-26,-104 -3,-107 Q20,-108 24,-86 Q21,-92 12,-96 Q2,-99 -9,-94 Q-17,-90 -23,-81Z"
          fill={hair}
          stroke={INK}
          strokeWidth={2}
        />
      )}
      {style === 6 && (
        <path
          d="M-22,-85 Q-21,-103 0,-104 Q21,-103 22,-85 Q12,-94 0,-95 Q-12,-94 -22,-85Z"
          fill={hair}
          stroke={INK}
          strokeWidth={2}
        />
      )}
      {style === 4 && (
        <>
          <path
            d="M-22,-83 Q-22,-102 0,-104 Q21,-103 22,-83Z"
            fill={hair}
            stroke={INK}
            strokeWidth={2}
          />
          <path
            d="M-25,-89 Q-22,-107 0,-109 Q23,-108 25,-89Z"
            fill={cap ?? ART.woodLight}
            stroke={INK}
            strokeWidth={2}
          />
          <path
            d="M-16,-89 Q8,-93 29,-86 Q8,-82 -16,-85Z"
            fill={cap ?? ART.woodLight}
            stroke={INK}
            strokeWidth={2}
          />
        </>
      )}
    </g>
  );
}

function CustomerAccessory({ variant }: { variant: number }) {
  switch (variant % 6) {
    case 0:
      return (
        <path
          d="M-18,-50 Q0,-42 17,-49 L14,-43 Q0,-38 -14,-43Z"
          fill={ART.paper}
          stroke={INK}
          strokeWidth={1.4}
        />
      );
    case 1:
      return (
        <>
          <path
            d="M-16,-48 Q0,-37 16,-48"
            fill="none"
            stroke={ART.honey}
            strokeWidth={4}
          />
          <circle cy={-37} r={2.2} fill={ART.honey} />
        </>
      );
    case 2:
      return (
        <>
          <path
            d="M-15,-51 L-8,-38 L2,-43 L13,-53"
            fill="none"
            stroke={ART.paper}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <path
            d="M-10,-35 L-8,-23"
            fill="none"
            stroke={ART.paper}
            strokeWidth={5}
          />
        </>
      );
    case 3:
      return (
        <>
          <path
            d="M-17,-42 Q0,-35 17,-42"
            fill="none"
            stroke={ART.paper}
            strokeWidth={3}
          />
          <circle cy={-37} r={2.4} fill={ART.honey} />
        </>
      );
    case 4:
      return (
        <>
          <path
            d="M18,-47 L29,-39 L25,-26 H18"
            fill={ART.woodLight}
            stroke={INK}
            strokeWidth={1.5}
          />
          <path d="M16,-49 L27,-40" {...line} strokeWidth={1.4} />
        </>
      );
    default:
      return (
        <path
          d="M-18,-49 Q0,-44 18,-49"
          fill="none"
          stroke={ART.paper}
          strokeWidth={2}
        />
      );
  }
}

export function CustomerFigure({
  look,
  expression,
  seated = false,
}: {
  look: CustomerLook;
  expression: FaceExpression;
  seated?: boolean;
}) {
  const skin = pick(SKIN, look.skin);
  const shirt = pick(OUTFIT, look.outfit);
  const hair = pick(HAIR, look.hair);
  return (
    <g>
      <BackHair hair={hair} style={look.hairStyle} />
      <Body
        shirt={shirt}
        pants={pick(PANTS, look.outfit)}
        skin={skin}
        variant={look.outfit}
        seated={seated}
      >
        <CustomerAccessory variant={look.outfit} />
      </Body>
      <Head skin={skin} hair={hair} style={look.hairStyle} cap={shirt} />
      <Face expression={expression} />
    </g>
  );
}

function Uniform({
  role,
  skin,
  pants,
}: {
  role: StaffRole;
  skin: string;
  pants: string;
}) {
  const pharmacist = role === "pharmacist";
  return (
    <Body
      shirt={pharmacist ? ART.paper : ART.leafLight}
      pants={pants}
      skin={skin}
    >
      {pharmacist ? (
        <>
          <path
            d="M-12,-52 L-2,-38 L-9,-34 M12,-52 L2,-38 L9,-34 M0,-39 V-22"
            {...line}
            stroke={ART.sky}
            strokeWidth={2.4}
          />
          <path d="M-15,-30 H-5 M7,-34 H16" {...line} strokeWidth={1.5} />
          <rect
            x={6}
            y={-46}
            width={11}
            height={7}
            rx={1.5}
            fill={ART.leaf}
            stroke={INK}
            strokeWidth={1.1}
          />
          <path d="M8,-43 H15" stroke={ART.paper} strokeWidth={1} />
        </>
      ) : (
        <>
          <path
            d="M-12,-47 L-14,-24 Q0,-19 14,-24 L12,-47Z"
            fill={ART.leaf}
            stroke={INK}
            strokeWidth={1.5}
          />
          <path
            d="M-12,-47 L-18,-53 M12,-47 L18,-53"
            {...line}
            strokeWidth={1.6}
          />
          <path
            d="M-8,-32 Q0,-28 8,-32"
            fill="none"
            stroke={ART.leafLight}
            strokeWidth={1.5}
          />
          <circle
            cx={0}
            cy={-40}
            r={3}
            fill={ART.honey}
            stroke={INK}
            strokeWidth={1}
          />
        </>
      )}
    </Body>
  );
}

export function StaffFigure({
  look,
  role,
  expression,
}: {
  look: StaffLook;
  role: StaffRole;
  expression: FaceExpression;
}) {
  const skin = pick(SKIN, look.skin);
  const hair = pick(HAIR, look.hair);
  return (
    <g>
      <BackHair hair={hair} style={look.hairStyle} />
      <Uniform role={role} skin={skin} pants="#56695D" />
      {look.messy && <MessyClothes />}
      <Head skin={skin} hair={hair} style={look.hairStyle} cap={ART.leaf} />
      {look.messy && <MessyHair hair={hair} />}
      <Face expression={expression} />
      {look.gender === "female" && <Lashes />}
    </g>
  );
}

/** Lông mi nhỏ ở đuôi mắt: nhận ra giới tính mà không đổi khuôn mặt chung. */
function Lashes() {
  return (
    <path
      d="M-11,-80 L-14,-83 M-9,-81 L-11,-85 M11,-80 L14,-83 M9,-81 L11,-85"
      {...line}
      strokeWidth={1.4}
    />
  );
}

/** Ngoại hình "luộm thuộm" hiếm gặp: tóc dựng, áo nhàu có vết bẩn. Chỉ để vui, không phải chê ngoại hình. */
function MessyHair({ hair }: { hair: string }) {
  return (
    <path
      d="M-18,-100 L-22,-111 L-12,-104 L-8,-116 L-2,-105 L5,-117 L8,-104 L17,-112 L15,-99"
      fill={hair}
      stroke={INK}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  );
}

function MessyClothes() {
  return (
    <g>
      <path
        d="M-13,-44 Q-9,-41 -12,-37 M9,-33 Q13,-30 10,-26 M-3,-30 Q1,-27 -2,-24"
        {...line}
        strokeWidth={1.2}
      />
      <ellipse
        cx={-6}
        cy={-35}
        rx={3.5}
        ry={2.5}
        fill="#A98B6A"
        opacity={0.7}
      />
      <path
        d="M-20,-23 L-17,-19 L-14,-23"
        fill={ART.paper}
        stroke={INK}
        strokeWidth={1.2}
      />
    </g>
  );
}

/** An có kiểu tóc và áo blouse riêng để nhận ra ngay trên quầy. */
export function PharmacistFigure({
  expression,
}: {
  expression: FaceExpression;
}) {
  const skin = SKIN[1];
  return (
    <g>
      <Uniform role="pharmacist" skin={skin} pants="#596C69" />
      <Head skin={skin} hair={HAIR[0]} style={0} />
      <path
        d="M-22,-89 Q-13,-103 -2,-101 Q5,-97 9,-99"
        fill="none"
        stroke={HAIR[0]}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Face expression={expression} />
    </g>
  );
}
