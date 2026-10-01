import { COLLECTIBLES, GRADE_POWER, type Grade } from "@pharmacy/simulation";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito/wght.css";
import { CollectibleArt } from "./Collectibles";

const grades: Grade[] = ["C", "B", "A", "S"];
const items = Object.values(COLLECTIBLES);
const rowHeight = 94;
const smallStart = 116 + items.length * rowHeight;
const height = smallStart + 252;

function effectsFor(def: (typeof items)[number], grade: Grade) {
  const power = GRADE_POWER[grade];
  return def.effects.map(({ stat, base }) => ({
    stat,
    value: base * (base >= 0 ? power.good : power.bad),
  }));
}

createRoot(document.getElementById("root")!).render(
  <svg
    viewBox={`0 0 850 ${height}`}
    role="img"
    aria-label="Ảnh tổng 18 vật phẩm, mỗi vật phẩm có bốn hạng C B A S"
    style={{
      display: "block",
      width: "100%",
      maxWidth: 1000,
      height: "auto",
      margin: "auto",
      fontFamily: "Nunito Variable, sans-serif",
    }}
  >
    <rect width={850} height={height} fill="#FFFDF6" />
    <text x={24} y={39} fontSize={25} fontWeight={900} fill="#263A36">
      Bộ sưu tập · 18 món
    </text>
    <text x={24} y={61} fontSize={12} fill="#597067">
      Bản vẽ bốn hạng theo nét game · đang chờ review
    </text>
    {grades.map((grade, index) => (
      <text
        key={grade}
        x={336 + index * 128}
        y={84}
        textAnchor="middle"
        fontSize={14}
        fontWeight={900}
        fill="#263A36"
      >
        Hạng {grade}
      </text>
    ))}
    {items.map((def, row) => {
      const y = 104 + row * rowHeight;
      return (
        <g key={def.id}>
          <rect
            x={14}
            y={y}
            width={822}
            height={rowHeight - 3}
            rx={6}
            fill={row % 2 ? "#F8F6EE" : "#F0F3E9"}
          />
          <text x={24} y={y + 45} fontSize={14} fontWeight={800} fill="#263A36">
            {def.name}
          </text>
          {grades.map((grade, index) => (
            <g
              key={grade}
              transform={`translate(${336 + index * 128} ${y + 72}) scale(1.7)`}
            >
              <CollectibleArt
                defId={def.id}
                grade={grade}
                effects={effectsFor(def, grade)}
              />
            </g>
          ))}
        </g>
      );
    })}
    <text
      x={24}
      y={smallStart + 18}
      fontSize={17}
      fontWeight={900}
      fill="#263A36"
    >
      Kiểm tra trong cảnh · 32 px
    </text>
    {items.map((def, index) => {
      const x = 24 + (index % 6) * 138;
      const y = smallStart + 28 + Math.floor(index / 6) * 70;
      return (
        <g key={`small-${def.id}`}>
          <svg x={x} y={y} width={32} height={32} viewBox="-20 -38 40 42">
            <CollectibleArt
              defId={def.id}
              grade="S"
              effects={effectsFor(def, "S")}
            />
          </svg>
          <text x={x + 38} y={y + 18} fontSize={10} fill="#263A36">
            {def.name}
          </text>
        </g>
      );
    })}
  </svg>,
);
