import {
  nextExpiry,
  priceBounds,
  PRODUCTS,
  isTrending,
  productLevel,
  stockUnitCost,
  suggestedPrice,
  type DeepReadonly,
  type ProductId,
  type SimState,
} from "@pharmacy/simulation";
import { useState } from "react";
import { BRAND } from "../../brand";
import { BoxIcon, WarningIcon } from "../../art/Icons";
import { ProductIcon } from "../../art/Products";
import { useBridge } from "../../game/useGame";
import { GameButton } from "../../ui/primitives";
import { REJECT_TEXT } from "../store/rejectText";

const CATEGORY: Record<string, string> = {
  hygiene: "Vệ sinh",
  "first-aid": "Sơ cứu",
  "skin-care": "Chăm sóc da",
};

/** Nút nhập hàng dùng chung cho sheet sản phẩm và tab Kho. */
export function RestockButton({
  state,
  productId,
  compact = false,
}: {
  state: DeepReadonly<SimState>;
  productId: ProductId;
  compact?: boolean;
}) {
  const bridge = useBridge();
  const [error, setError] = useState<string | null>(null);
  const [requestedQuantity, setRequestedQuantity] = useState<number | null>(
    null,
  );
  const missing =
    state.stock[productId].capacity - state.stock[productId].shelf;
  const unitCost = stockUnitCost(state, productId);
  const affordable = Math.min(missing, Math.floor(state.money / unitCost));
  const quantity =
    affordable === 0
      ? 0
      : Math.min(affordable, Math.max(1, requestedQuantity ?? affordable));
  const label =
    missing === 0
      ? "Kệ đầy"
      : affordable === 0
        ? "Không đủ xu"
        : `Nhập +${quantity} · ${quantity * unitCost} ${BRAND.currency}`;
  return (
    <div className={`restock-control ${compact ? "compact" : ""}`}>
      {affordable > 0 && (
        <div
          className="restock-stepper"
          role="group"
          aria-label={`Số lượng nhập ${PRODUCTS[productId].name}`}
        >
          <GameButton
            surface="inset"
            size="small"
            type="button"
            aria-label="Giảm số lượng nhập"
            disabled={quantity <= 1}
            onClick={() => setRequestedQuantity(quantity - 1)}
          >
            −
          </GameButton>
          <output
            aria-live="polite"
            aria-label={`Nhập ${quantity} trên tối đa ${affordable} món`}
          >
            {quantity}
          </output>
          <GameButton
            surface="inset"
            size="small"
            type="button"
            aria-label="Tăng số lượng nhập"
            disabled={quantity >= affordable}
            onClick={() => setRequestedQuantity(quantity + 1)}
          >
            +
          </GameButton>
        </div>
      )}
      <GameButton
        tone={compact ? "secondary" : "primary"}
        size={compact ? "small" : "regular"}
        icon={<BoxIcon size={compact ? 18 : 22} />}
        disabled={affordable === 0}
        onClick={() => {
          const r = bridge.dispatch({ type: "restock", productId, quantity });
          setError(r.ok ? null : REJECT_TEXT[r.reason]);
          if (r.ok) setRequestedQuantity(null);
        }}
      >
        {label}
      </GameButton>
      {error && (
        <div className="notice bad" role="alert">
          <WarningIcon size={18} />
          {error}
        </div>
      )}
    </div>
  );
}

export function ProductSheet({
  state,
  productId,
}: {
  state: DeepReadonly<SimState>;
  productId: ProductId;
}) {
  const p = PRODUCTS[productId];
  const { shelf, capacity } = state.stock[productId];
  const expiry = nextExpiry(state, productId);
  const trending = isTrending(state, productId);
  return (
    <article className="detail-layout product-detail">
      <header className="detail-hero">
        <div className="detail-portrait product-portrait">
          <ProductIcon id={productId} size={76} />
        </div>
        <span className="detail-eyebrow">
          {CATEGORY[p.category]} · Cấp {productLevel(productId)}
        </span>
        <h1>{p.name}</h1>
        <span className="small muted">Nhãn hư cấu “{p.brand}”</span>
        {trending && <span className="trend-tag">Bán chạy hôm nay</span>}
      </header>
      <div className="detail-scroll">
        <section className="detail-overview" aria-label="Tình trạng sản phẩm">
          <div className="detail-stat">
            <span>Trên kệ</span>
            <strong>
              {shelf}/{capacity}
            </strong>
            <small>món</small>
          </div>
          <div className="detail-stat">
            <span>Giá bán</span>
            <strong>{state.prices[productId]}</strong>
            <small>{BRAND.currency}/món</small>
          </div>
          <div className="detail-stat">
            <span>Giá nhập</span>
            <strong>{stockUnitCost(state, productId)}</strong>
            <small>{BRAND.currency}/món</small>
          </div>
        </section>
        <div className="stock-row detail-stock-row">
          <span>Hàng trên kệ</span>
          <span className="stock-pips" aria-label={`${shelf}/${capacity}`}>
            {Array.from({ length: capacity }, (_, i) => (
              <i key={i} className={i < shelf ? "on" : ""} />
            ))}
          </span>
        </div>
        <p className="small muted">
          Lô gần nhất:{" "}
          {expiry === null
            ? "chưa có hàng"
            : `còn ${Math.max(0, Math.ceil((expiry - state.timeMs) / state.config.dayMs))} ngày trong game`}
          . Hàng hết hạn sẽ tự rời kệ.
        </p>
        {trending && (
          <p className="small trend-note">
            Khách hỏi món này nhiều hơn hôm nay. Giá nhập tăng 20%; giá bán gợi
            ý {suggestedPrice(state, productId)} xu.
          </p>
        )}
        <PriceControl state={state} productId={productId} />
      </div>
      <footer className="detail-footer">
        <RestockButton state={state} productId={productId} />
      </footer>
    </article>
  );
}

/**
 * Chỉnh giá bán theo từng món. Hệ quả hiển thị rõ: bán cao hơn giá tham khảo thì khách nhạy giá chê đắt
 * (lỗi chính sách giá, không tính cho nhân viên); bán rẻ hơn thì khách vui hơn nhưng lãi mỗi món ít đi.
 */
export function PriceControl({
  state,
  productId,
}: {
  state: DeepReadonly<SimState>;
  productId: ProductId;
}) {
  const bridge = useBridge();
  const p = PRODUCTS[productId];
  const price = state.prices[productId];
  const { min, max } = priceBounds(state, productId);
  const ref = p.referencePrice;
  const set = (value: number) =>
    bridge.dispatch({ type: "setPrice", productId, price: value });
  const diff = Math.round(((price - ref) / ref) * 100);
  return (
    <section className="price-control" aria-label={`Giá bán ${p.name}`}>
      <div className="price-row">
        <span>Giá bán</span>
        <GameButton
          size="small"
          onClick={() => set(price - 1)}
          disabled={price <= min}
          aria-label="Giảm 1 xu"
        >
          −
        </GameButton>
        <b className="price-value">
          {price} {BRAND.currency}
        </b>
        <GameButton
          size="small"
          onClick={() => set(price + 1)}
          disabled={price >= max}
          aria-label="Tăng 1 xu"
        >
          +
        </GameButton>
      </div>
      <span className="small muted">
        Giá tham khảo {ref} · lãi {price - stockUnitCost(state, productId)}{" "}
        {BRAND.currency}/món nhập hôm nay · cho phép {min}–{max}
      </span>
      {diff > 0 ? (
        <span className="small warn-text">
          Cao hơn giá tham khảo {diff}%: khách nhạy giá dễ chê đắt, sao cửa hàng
          có thể giảm.
        </span>
      ) : diff < 0 ? (
        <span className="small good-text">
          Rẻ hơn giá tham khảo {-diff}%: khách nhạy giá vui hơn, nhưng lãi mỗi
          món ít đi.
        </span>
      ) : (
        <span className="small muted">Đang bằng giá tham khảo.</span>
      )}
      {price !== ref && ref >= min && ref <= max && (
        <GameButton size="small" onClick={() => set(ref)}>
          Về giá tham khảo
        </GameButton>
      )}
    </section>
  );
}
