import type { Grade } from "@pharmacy/simulation";
import type { ReactNode } from "react";
import { ART, INK } from "./palette";

type Props = { defId: string; grade: Grade; finish: number };
const edge = { stroke: INK, strokeWidth: 1.8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const tier: Record<Grade, number> = { C: 0, B: 1, A: 2, S: 3 };

export function TieredCounterArt({ defId, grade, finish }: Props): ReactNode {
  const rank = tier[grade];
  switch (defId) {
    case "service-bell":
      return <g className="tier-bell">
        <rect x={-13} y={-5} width={26} height={5} rx={2} fill={rank === 0 ? "#A78761" : ART.woodLight} {...edge} />
        <g className="bell-dome">
          <path d={rank === 0 ? "M-9,-5 Q-9,-17 0,-17 Q9,-17 9,-5Z" : "M-11,-5 Q-10,-21 0,-21 Q10,-21 11,-5Z"} fill={rank === 0 ? "#B79761" : rank === 1 ? "#DDBE68" : "#EBC963"} {...edge} />
          <path d="M-7,-8 Q-6,-15 -2,-17" fill="none" stroke="#FFF0B8" strokeWidth={rank >= 2 ? 1.6 : 0.9} strokeLinecap="round" />
          {rank >= 1 && <rect x={-2} y={-25} width={4} height={5} rx={1.5} fill={rank === 3 ? "#F6D98C" : "#EBC963"} {...edge} />}
          {rank >= 2 && <path d="M-8,-5 Q0,-9 8,-5" fill="none" stroke="#FFF1BD" strokeWidth={1.2} />}
          {rank === 3 && <><path d="M-5,-18 Q-2,-21 1,-20 M-6,-10 Q0,-13 6,-10" fill="none" stroke="#FFFBE0" strokeWidth={1.4} strokeLinecap="round" /><circle cx={0} cy={-14} r={1.5} fill="#FFF4BF" /></>}
        </g>
        {rank === 0 && <path d="M8,-6 l2,1 M-6,-10 l1,-1" stroke="#775E4D" strokeWidth={1} />}
      </g>;
    case "mint-jar": {
      const candy = [[-4, -7], [4, -8], [0, -13], [-5, -17], [5, -17], [-1, -21], [4, -22]].slice(0, [1, 3, 5, 7][rank]);
      return <g className="tier-mint-jar">
        <rect x={-10} y={-25} width={20} height={25} rx={5} fill={rank === 0 ? "#C6D3CD" : "#E4F3EE"} {...edge} />
        <g className="jar-candy">{candy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={rank === 0 ? 2.4 : 2.8} fill={i % 2 ? "#FFFDF6" : "#8FCDB4"} stroke={INK} strokeWidth={0.8} />)}</g>
        <path d="M-7,-20 V-6" fill="none" stroke="#FFFDF6" strokeWidth={rank >= 2 ? 1.5 : 1} strokeLinecap="round" />
        <rect x={-9} y={-29} width={18} height={5} rx={1.8} fill={rank === 0 ? "#718C7D" : ART.leaf} {...edge} />
        {rank >= 2 && <rect x={-5} y={-14} width={10} height={6} rx={2} fill="#FFF7DB" stroke={INK} strokeWidth={0.8} />}
        {rank === 3 && <path d="M-8,-28 h16 M-5,-11 h10" stroke="#D6E8AF" strokeWidth={0.9} />}
        {finish >= 3 && <path d="M7,-22 v5" stroke="#FFFDF6" strokeWidth={0.8} />}
      </g>;
    }
    case "lucky-cat":
      return <g className="tier-lucky-cat">
        <path d="M-10,0 Q-13,-14 -8,-18 H8 Q13,-14 10,0Z" fill={rank === 0 ? "#D2CBBB" : ART.paper} {...edge} />
        <path d="M-8,-27 L-7,-33 L-2,-29 M8,-27 L7,-33 L2,-29" fill={rank === 0 ? "#D2CBBB" : ART.paper} {...edge} />
        <circle cx={0} cy={-22} r={8.5} fill={rank === 0 ? "#D2CBBB" : ART.paper} {...edge} />
        <path d="M-4,-23 h1 M3,-23 h1 M-2,-19 Q0,-17 2,-19" fill="none" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
        {rank >= 1 && <circle cx={0} cy={-8} r={3.8} fill={ART.honey} {...edge} />}
        {rank >= 2 && <><path d="M-10,-15 Q0,-12 10,-15" fill="none" stroke={ART.coral} strokeWidth={2} /><path d="M-7,-27 l2,1 M7,-27 l-2,1" stroke="#EDADB6" strokeWidth={1.4} /></>}
        {rank === 3 && <><circle cx={0} cy={-8} r={1.4} fill="#FFF2B8" /><path d="M-7,-8 Q-5,-4 -3,-5 M-2,-27 l2,-2 2,2" fill="none" stroke="#E9BE67" strokeWidth={1.2} /></>}
        {rank === 0 && <path d="M-9,-5 l2,2" stroke="#9B8A78" strokeWidth={1} />}
        <g className="cat-paw"><path d="M10,-12 Q16,-16 15,-26" fill="none" {...edge} /><circle cx={15} cy={-27} r={2.8} fill={rank === 0 ? "#D2CBBB" : ART.paper} {...edge} /></g>
      </g>;
    case "dried-flowers": {
      const stalks = ([[0, -29], [-7, -26], [7, -27], [-4, -33], [4, -32], [-10, -29], [10, -30]] as [number, number][]).slice(0, [1, 3, 5, 7][rank]);
      return <g className="tier-dried-flowers">
        <path d="M-7,0 Q-10,-7 -6,-13 H6 Q10,-7 7,0Z" fill={rank === 0 ? "#A7B2A9" : rank === 3 ? "#9EC6C1" : ART.sky} {...edge} />
        <g className="flower-stems">
          {stalks.map(([x, y], i) => <g key={i}>
            <path d={`M${x * .3},-13 Q${x * .65},-20 ${x},${y}`} fill="none" stroke="#69816F" strokeWidth={1.3} />
            <circle cx={x} cy={y} r={rank === 0 ? 2.3 : 2.8} fill={i % 2 ? "#E2C790" : "#E8AF98"} stroke={INK} strokeWidth={0.8} />
            {rank >= 2 && <circle cx={x} cy={y} r={1.1} fill="#FFF0CC" />}
          </g>)}
        </g>
        {rank >= 1 && <path d="M-5,-8 Q0,-5 5,-8" fill="none" stroke="#E3F0DC" strokeWidth={1.1} />}
        {rank >= 2 && <path d="M-3,-12 Q0,-9 3,-12" fill="none" stroke={ART.honey} strokeWidth={1.8} />}
        {rank === 3 && <path d="M-2,-9 l-4,3 4,-1 M2,-9 l4,3 -4,-1" fill="#F3D6B1" {...edge} />}
      </g>;
    }
    case "hourglass":
      return <g className="tier-hourglass">
        <rect x={-10} y={-4} width={20} height={4} rx={1.3} fill={rank === 0 ? "#92775D" : ART.wood} {...edge} />
        <path d="M-7,-28 Q-7,-19 0,-16 Q-7,-13 -7,-4 H7 Q7,-13 0,-16 Q7,-19 7,-28Z" fill={rank === 0 ? "#C9D5D0" : "#E8F3EF"} {...edge} />
        <path d="M-5,-5 Q0,-10 5,-5Z" fill={ART.honey} />
        <path d={rank === 0 ? "M-2,-25 H2 L0,-22Z" : "M-5,-26 H5 L0,-18Z"} fill={rank === 0 ? "#C6A96F" : ART.honey} />
        {rank >= 2 && <path className="hourglass-sand" d="M0,-17 V-10" stroke={ART.honey} strokeWidth={1} strokeDasharray="2 1" />}
        <rect x={-10} y={-32} width={20} height={4} rx={1.3} fill={rank === 0 ? "#92775D" : ART.wood} {...edge} />
        {rank >= 1 && <path d="M-7,-29 h14 M-7,-3 h14" stroke="#EBC58B" strokeWidth={1} />}
        {rank >= 2 && <path d="M-6,-25 Q-6,-19 -3,-18 M-6,-7 Q-5,-10 -3,-12" fill="none" stroke="#FFFDF6" strokeWidth={1} />}
        {rank === 3 && <><circle cx={-8} cy={-30} r={1} fill="#F7D976" /><circle cx={8} cy={-30} r={1} fill="#F7D976" /><path d="M-8,-2 h16 M-9,-28 v24 M9,-28 v24" fill="none" stroke="#F7D976" strokeWidth={1.1} /></>}
      </g>;
    case "teddy":
      return <g className="tier-teddy">
        <ellipse cx={0} cy={-8} rx={rank === 0 ? 8 : 10} ry={rank === 0 ? 7 : 8} fill={rank === 0 ? "#AD8B69" : "#C9935F"} {...edge} />
        <circle cx={-7} cy={-27} r={rank === 0 ? 2.8 : 3.5} fill="#BD8F62" {...edge} />
        <circle cx={7} cy={-27} r={rank === 0 ? 2.8 : 3.5} fill="#BD8F62" {...edge} />
        <circle cx={0} cy={-21} r={rank === 0 ? 7 : 8} fill={rank === 0 ? "#AD8B69" : "#C9935F"} {...edge} />
        <ellipse cx={0} cy={-18} rx={3.4} ry={2.6} fill="#E9C79F" />
        <circle cx={-3} cy={-23} r={0.9} fill={INK} /><circle cx={3} cy={-23} r={0.9} fill={INK} />
        {rank >= 1 && <path d="M-2,-17 Q0,-15 2,-17" fill="none" stroke={INK} strokeWidth={0.8} />}
        {rank === 0 && <path d="M5,-26 l3,3 M-4,-7 l2,1" fill="none" stroke="#6C5F52" strokeWidth={0.9} />}
        {rank >= 2 && <><path d="M-4,-14 Q0,-11 4,-14" fill="none" stroke={ART.coral} strokeWidth={1.8} /><path d="M-3,-13 l-2,3 4,-1 M3,-13 l2,3 -4,-1" fill={ART.coral} {...edge} /></>}
        {rank === 3 && <><path d="M-6,-27 Q-4,-30 -2,-28 M2,-28 Q4,-30 6,-27" fill="none" stroke="#F4D6AF" strokeWidth={0.9} /><path d="M0,-5 Q-4,-8 -3,-10 Q-1,-11 0,-9 Q1,-11 3,-10 Q4,-8 0,-5Z" fill="#F0C7A1" /></>}
        <g className="teddy-paw"><ellipse cx={rank === 0 ? 7 : 10} cy={-8} rx={3} ry={4.2} fill={rank === 0 ? "#AD8B69" : "#C9935F"} {...edge} /></g>
      </g>;
    default:
      return null;
  }
}
