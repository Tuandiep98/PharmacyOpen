import { COLLECTIBLES, GRADE_POWER, type Grade } from "@pharmacy/simulation";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/nunito/wght.css";
import { appearanceLevel, CollectibleIcon } from "./Collectibles";
import "../features/collection/collection.css";
import "../ui/theme.css";
import "./preview-collectibles.css";

const grades: Grade[] = ["C", "B", "A", "S"];
const items = Object.values(COLLECTIBLES);

createRoot(document.getElementById("root")!).render(<main className="preview-page">
  <header><h1>Đồ sưu tầm</h1><p>Cùng một món qua bốn hạng. Hình, chất liệu và chuyển động thay đổi theo hạng và chỉ số.</p></header>
  <div className="preview-gallery">{items.map((def) => <section key={def.id} className="preview-row">
    <h2>{def.name}</h2><div className="preview-variants">{grades.map((grade) => {
      const power = GRADE_POWER[grade];
      const effects = def.effects.map(({ stat, base }) => ({ stat, value: base * (base >= 0 ? power.good : power.bad) }));
      const level = appearanceLevel({ grade, effects });
      return <div key={grade} className={`item-card finish-card-${level} grade-edge-${grade}`}>
        <div className="preview-rank">Hạng {grade} · {['Mộc mạc', 'Chỉn chu', 'Tinh xảo', 'Rực rỡ'][level]}</div>
        <span className="item-card-icon"><CollectibleIcon defId={def.id} grade={grade} effects={effects} size={78} /></span>
      </div>;
    })}</div>
  </section>)}</div>
</main>);
