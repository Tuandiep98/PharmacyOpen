import {
  BLIND_BAG_GRADE_ODDS,
  COLLECTIBLES,
  blindBagPrice,
  type DeepReadonly,
  type SimEvent,
  type SimState,
} from "@pharmacy/simulation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CollectibleIcon } from "../../art/Collectibles";
import { BlindBagIcon, CoinIcon } from "../../art/Icons";
import { ProductIcon } from "../../art/Products";
import { BRAND } from "../../brand";
import { playSfx } from "../../audio/sfx";
import { celebrate } from "../../fx/confetti";
import { useBridge, useGameEvents } from "../../game/useGame";
import { GameButton, PanelHeading } from "../../ui/primitives";
import { reducedMotion } from "../../ui/settings";
import { useUi } from "../../ui/uiStore";
import { REJECT_TEXT } from "../store/rejectText";
import "./blind-bag.css";

type Result = Extract<SimEvent, { type: "blindBagOpened" }>;

export function BlindBagPanel({ state }: { state: DeepReadonly<SimState> }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const pending = useRef<Result | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useGameEvents(
    useCallback((events) => {
      const opened = events.find(
        (event): event is Result => event.type === "blindBagOpened",
      );
      if (opened) pending.current = opened;
    }, []),
  );

  const price = blindBagPrice(state);
  const open = () => {
    setResult(null);
    pending.current = null;
    const response = bridge.dispatch({ type: "openBlindBag" });
    if (!response.ok) {
      pushToast("bad", REJECT_TEXT[response.reason]);
      return;
    }
    const reveal = () => {
      const prize = pending.current;
      setRolling(false);
      setResult(prize);
      if (!prize) return;
      playSfx(
        prize.grade === "S"
          ? "gachaS"
          : prize.grade === "A"
            ? "gachaA"
            : "gachaB",
      );
      if (prize.grade === "S") celebrate();
    };
    playSfx("pick");
    if (reducedMotion()) reveal();
    else {
      setRolling(true);
      timer.current = window.setTimeout(reveal, 950);
    }
  };

  return (
    <>
      <PanelHeading description="Mỗi túi có thể chứa đồ sưu tầm, vài món hàng đang bán, hoặc chẳng có gì ngoài một cú lừa nhẹ. Giá tăng theo tiến độ và số túi đã mua.">
        Túi mù cuối ngõ
      </PanelHeading>
      <section
        className={`blind-bag-machine ${rolling ? "rolling" : ""}`}
        aria-live="polite"
      >
        <div className="blind-bag-stage">
          {result ? (
            <BlindBagPrize result={result} />
          ) : (
            <div className="blind-bag-pack" aria-hidden>
              <BlindBagIcon size={74} />
              <span>?</span>
            </div>
          )}
          {rolling && <span className="sr-only">Đang xé túi…</span>}
        </div>
        {result ? (
          <GameButton
            tone="primary"
            size="large"
            onClick={() => setResult(null)}
          >
            {result.outcome === "trash" ? "Vứt đi" : "Mở túi khác"}
          </GameButton>
        ) : (
          <GameButton
            tone="sun"
            size="large"
            icon={<BlindBagIcon />}
            disabled={rolling || state.money < price}
            onClick={open}
          >
            {rolling ? "Đang xé túi…" : `Mua túi · ${price} ${BRAND.currency}`}
          </GameButton>
        )}
      </section>
      <section className="blind-bag-odds">
        <strong>Tỉ lệ công khai</strong>
        <p className="small muted">
          25% trúng gió/rác · 27% hàng bán · 48% đồ sưu tầm.
        </p>
        <p className="small muted">
          Trong lượt ra đồ: S {BLIND_BAG_GRADE_ODDS.S}% · A{" "}
          {BLIND_BAG_GRADE_ODDS.A}% · B {BLIND_BAG_GRADE_ODDS.B}% · C{" "}
          {BLIND_BAG_GRADE_ODDS.C}%.
        </p>
        <span className="small muted">
          <CoinIcon size={16} /> Đã mua {state.collection.blindBagPurchases}{" "}
          túi; túi sau đắt hơn.
        </span>
      </section>
    </>
  );
}

function BlindBagPrize({ result }: { result: Result }) {
  if (result.outcome === "collectible" && result.defId && result.grade) {
    const def = COLLECTIBLES[result.defId];
    return (
      <div className={`blind-bag-prize grade-edge-${result.grade}`}>
        <CollectibleIcon defId={result.defId} grade={result.grade} size={96} />
        <strong>
          {def?.name ?? "Đồ sưu tầm"} · hạng {result.grade}
        </strong>
        <span className="small muted">
          {result.uid
            ? "Đã vào túi đồ"
            : `Túi đồ đầy · đổi ${result.overflowCoins} ${BRAND.currency}`}
        </span>
      </div>
    );
  }
  if (result.outcome === "product" && result.productId) {
    return (
      <div className="blind-bag-prize product">
        <ProductIcon id={result.productId} size={86} />
        <strong>
          {result.label} × {result.qty}
        </strong>
        <span className="small muted">Đã xếp lên kệ</span>
      </div>
    );
  }
  return (
    <div className="blind-bag-prize trash">
      <span className="blind-bag-rubber" aria-hidden>
        〰
      </span>
      <strong>{result.label}</strong>
      <span className="small muted">Chúc bạn may mắn lần sau!</span>
    </div>
  );
}
