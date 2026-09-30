import type { Grade } from "@pharmacy/simulation";
import { ART, INK } from "./palette";
import "./succulent-art.css";

type Props = { grade: Grade; finish: number };

const edge = { stroke: INK, strokeWidth: 1.8, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

/** Hoa thị thấp nằm trong miệng chậu. Chậu, đất, lá và mép chậu có thứ tự vẽ riêng. */
export function SucculentArt({ grade, finish }: Props) {
  const bare = grade === "C";
  const lush = grade === "A" || grade === "S";
  const prized = grade === "S";
  const pot = bare ? "#AD786B" : grade === "B" ? "#BF8068" : lush && !prized ? "#CA785C" : "#D8845D";
  const leaf = bare ? "#819786" : grade === "B" ? "#70AA86" : "#65AC82";
  const leafLight = bare ? "#A5B69C" : grade === "B" ? "#9BC9A3" : prized ? "#B9DFAE" : "#A7D3A6";

  return <g className={`succulent-art succulent-${grade} succulent-finish-${finish}`}>
    <ellipse cx={0} cy={0.6} rx={9} ry={1.3} fill={INK} opacity={0.15} />

    {/* Thân chậu ở sau, miệng chậu và đất đỡ cụm lá. */}
    <path d="M-11,-13 Q-10,-5 -8,-1 Q0,2 8,-1 Q10,-5 11,-13Z" fill={pot} {...edge} />
    <path d="M4,-11 Q8,-8 7,-2 Q9,-5 9,-11Z" fill="#824C43" opacity={0.22} />
    <path d="M-8,-9 Q-8,-5 -6,-3" fill="none" stroke="#F8C6A0" strokeWidth={1.25} strokeLinecap="round" />
    <ellipse cx={0} cy={-13} rx={12} ry={3.2} fill={bare ? "#C18D77" : "#E3A179"} {...edge} />
    <ellipse cx={0} cy={-13} rx={9.4} ry={2.1} fill="#6C6150" />

    {/* Lá ngắn, mập, xếp hoa thị; đầu lá có mũi gai rất nhỏ. Gốc lá chìm vào đất. */}
    <g className="succulent-leaves">
      {bare ? <>
        <path d="M-1,-12 Q-8,-13 -10,-20 Q-6,-20 -2,-16Z" fill={leaf} {...edge} />
        <path d="M1,-12 Q8,-13 10,-20 Q6,-20 2,-16Z" fill={leafLight} {...edge} />
        <path d="M-3,-12 Q-3,-18 0,-22 Q3,-18 3,-12Z" fill="#91AB91" {...edge} />
        <path d="M-4,-12 Q-7,-15 -5,-17 Q-1,-16 0,-12Z M4,-12 Q7,-15 5,-17 Q1,-16 0,-12Z" fill="#B1BFA1" {...edge} />
      </> : <>
        <path d="M-2,-12 Q-10,-13 -14,-21 Q-9,-21 -3,-17Z" fill={leaf} {...edge} />
        <path d="M2,-12 Q10,-13 14,-21 Q9,-21 3,-17Z" fill={leaf} {...edge} />
        <path d="M-4,-12 Q-10,-17 -10,-23 Q-5,-22 -1,-16Z" fill={leafLight} {...edge} />
        <path d="M4,-12 Q10,-17 10,-23 Q5,-22 1,-16Z" fill={leafLight} {...edge} />
        <path d="M-3,-12 Q-5,-20 -2,-24 Q1,-21 1,-13Z" fill={leaf} {...edge} />
        <path d="M3,-12 Q5,-20 2,-24 Q-1,-21 -1,-13Z" fill={leaf} {...edge} />
        {lush && <>
          <path d="M-5,-12 Q-13,-14 -16,-22 Q-11,-22 -4,-17Z" fill={leafLight} {...edge} />
          <path d="M5,-12 Q13,-14 16,-22 Q11,-22 4,-17Z" fill={leafLight} {...edge} />
          <path d="M-2,-12 Q-5,-21 0,-26 Q5,-21 2,-12Z" fill={prized ? "#C0E1B4" : "#ACD4AA"} {...edge} />
          <path d="M-6,-13 Q-8,-17 -6,-20 Q-2,-19 -1,-14Z M6,-13 Q8,-17 6,-20 Q2,-19 1,-14Z" fill={leaf} {...edge} />
        </>}
        <path d="M-6,-12 Q-8,-16 -4,-18 Q-1,-17 0,-12Z M6,-12 Q8,-16 4,-18 Q1,-17 0,-12Z" fill="#B8D7A8" {...edge} />
        <path d="M-2,-12 Q-3,-16 0,-19 Q3,-16 2,-12Z" fill={leafLight} {...edge} />
      </>}
      {finish >= 1 && <path d="M-8,-19 l2,2 M8,-19 l-2,2" fill="none" stroke="#D7EBC1" strokeWidth={0.75} strokeLinecap="round" />}
      {finish >= 2 && <path d="M-1,-22 l1,3 M5,-18 l-2,2" fill="none" stroke="#EDF7D9" strokeWidth={0.8} strokeLinecap="round" />}
      {lush && <path d="M-16,-22 l-1,-1 M16,-22 l1,-1 M0,-26 v-1" fill="none" stroke={prized ? "#C77773" : "#507B61"} strokeWidth={0.9} strokeLinecap="round" />}
      {prized && <path d="M-10,-23 l-1,-1 M10,-23 l1,-1 M-2,-24 l-1,-1 M2,-24 l1,-1" fill="none" stroke="#C77773" strokeWidth={0.8} strokeLinecap="round" />}
    </g>

    {/* Mép trước che gốc lá; nhờ vậy cây nhìn như mọc trong miệng chậu. */}
    <path d="M-12,-13 Q0,-9 12,-13" fill="none" stroke={INK} strokeWidth={1.9} strokeLinecap="round" />
    <path d="M-10,-12 Q0,-9.7 10,-12" fill="none" stroke={prized ? "#F1C56E" : "#F0AF83"} strokeWidth={1.4} strokeLinecap="round" />
    {bare && <path d="M-11,-12 l2,1 -1,2 M7,-3 l1,1" fill="none" stroke="#694E44" strokeWidth={0.9} strokeLinecap="round" />}
    {grade === "B" && <path d="M-4,-6 Q0,-4 4,-6" fill="none" stroke="#F3C398" strokeWidth={1} strokeLinecap="round" />}
    {lush && <>
      <path d="M-9,-8 Q0,-6 9,-8" fill="none" stroke={prized ? ART.honey : "#F2BB87"} strokeWidth={prized ? 1.8 : 1.3} strokeLinecap="round" />
      <path d="M-3,-5 Q0,-8 3,-5 M0,-6 v3 M-5,-5 l-1,-1 M5,-5 l1,-1" fill="none" stroke={prized ? "#FFE1A0" : "#F7D4AA"} strokeWidth={1} strokeLinecap="round" />
    </>}
    {prized && <circle cx={0} cy={-4} r={1.1} fill="#FFE5A7" />}
    {finish >= 3 && !prized && <path d="M5,-9 l1,-1" fill="none" stroke="#FFF0C6" strokeWidth={1} strokeLinecap="round" />}
  </g>;
}
