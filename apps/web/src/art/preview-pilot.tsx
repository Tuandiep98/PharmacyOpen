import { COLLECTIBLES, GRADE_POWER, type Grade } from "@pharmacy/simulation";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito/wght.css";
import { CollectibleArt } from "./Collectibles";

const def = COLLECTIBLES.succulent!;
const grades: Grade[] = ["C", "B", "A", "S"];
const notes: Record<Grade, string> = {
  C: "Thưa · chậu mộc",
  B: "Đầy đặn hơn",
  A: "Lá đung đưa",
  S: "Hoa thị dày · viền vàng",
};
const gradeColor: Record<Grade, string> = {
  C: "#819287",
  B: "#4EAA72",
  A: "#4A86D0",
  S: "#D99A2B",
};

function effectsFor(grade: Grade) {
  const power = GRADE_POWER[grade];
  return def.effects.map(({ stat, base }) => ({
    stat,
    value: base * (base >= 0 ? power.good : power.bad),
  }));
}

createRoot(document.getElementById("root")!).render(
  <svg
    viewBox="0 0 840 400"
    role="img"
    aria-label="Ảnh preview Chậu sen đá bốn hạng C, B, A và S"
    style={{
      display: "block",
      width: "100%",
      maxWidth: 1000,
      height: "auto",
      margin: "auto",
      fontFamily: "Nunito Variable, sans-serif",
    }}
  >
    <rect width={840} height={400} fill="#FFFDF6" />
    <text x={36} y={47} fontSize={27} fontWeight={900} fill="#263A36">
      Chậu sen đá
    </text>
    <text x={37} y={70} fontSize={13} fill="#597067">
      Mẫu bốn hạng · nét vẽ và kích thước trong game · đang chờ review
    </text>
    {grades.map((grade, index) => {
      const x = 36 + index * 202;
      return (
        <g key={grade}>
          <rect
            x={x}
            y={92}
            width={184}
            height={222}
            rx={12}
            fill="#F7F3E9"
            stroke="#D6D4C7"
          />
          <path
            d={`M${x + 1},104 H${x + 183}`}
            stroke={gradeColor[grade]}
            strokeWidth={5}
          />
          <g transform={`translate(${x + 92} 236) scale(4.2)`}>
            <CollectibleArt
              defId="succulent"
              grade={grade}
              effects={effectsFor(grade)}
            />
          </g>
          <text
            x={x + 92}
            y={270}
            textAnchor="middle"
            fontSize={17}
            fontWeight={900}
            fill="#263A36"
          >
            Hạng {grade}
          </text>
          <text
            x={x + 92}
            y={293}
            textAnchor="middle"
            fontSize={12}
            fill="#597067"
          >
            {notes[grade]}
          </text>
        </g>
      );
    })}
    <text x={36} y={354} fontSize={13} fontWeight={800} fill="#263A36">
      Trong túi 64 px
    </text>
    <g transform="translate(185 369) scale(1.52)">
      <CollectibleArt defId="succulent" grade="S" effects={effectsFor("S")} />
    </g>
    <text x={247} y={354} fontSize={13} fontWeight={800} fill="#263A36">
      Trong cảnh 32 px
    </text>
    <g transform="translate(397 369) scale(.76)">
      <CollectibleArt defId="succulent" grade="S" effects={effectsFor("S")} />
    </g>
    <text x={560} y={354} fontSize={12} fill="#597067">
      Lá A/S chuyển động · chậu đứng yên
    </text>
  </svg>,
);
