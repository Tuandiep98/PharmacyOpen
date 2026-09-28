import { priceBounds, PRODUCTS, type DeepReadonly, type ProductId, type SimState } from '@pharmacy/simulation';
import { useState } from 'react';
import { BRAND } from '../../brand';
import { BoxIcon, WarningIcon } from '../../art/Icons';
import { ProductIcon } from '../../art/Products';
import { useBridge } from '../../game/useGame';
import { GameButton } from '../../ui/primitives';
import { REJECT_TEXT } from '../store/rejectText';

const CATEGORY: Record<string, string> = {
  hygiene: 'Vệ sinh',
  'first-aid': 'Sơ cứu',
  'skin-care': 'Chăm sóc da',
};

/** Nút nhập hàng dùng chung cho sheet sản phẩm và tab Kho. */
export function RestockButton({ state, productId, compact = false }: { state: DeepReadonly<SimState>; productId: ProductId; compact?: boolean }) {
  const bridge = useBridge();
  const [error, setError] = useState<string | null>(null);
  const p = PRODUCTS[productId];
  const missing = state.stock[productId].capacity - state.stock[productId].shelf;
  const affordable = Math.min(missing, Math.floor(state.money / p.cost));
  const label = missing === 0 ? 'Kệ đầy' : affordable === 0 ? 'Không đủ xu' : `Nhập +${affordable} · ${affordable * p.cost} ${BRAND.currency}`;
  return (
    <div className={compact ? '' : 'stack'}>
      <GameButton
        tone={compact ? 'secondary' : 'primary'}
        size={compact ? 'small' : 'regular'}
        disabled={affordable === 0}
        onClick={() => {
          const r = bridge.dispatch({ type: 'restock', productId });
          setError(r.ok ? null : REJECT_TEXT[r.reason]);
        }}
      >
        <BoxIcon size={compact ? 18 : 22} />
        {label}
      </GameButton>
      {error && !compact && (
        <div className="notice bad" role="alert">
          <WarningIcon size={18} />
          {error}
        </div>
      )}
    </div>
  );
}

export function ProductSheet({ state, productId }: { state: DeepReadonly<SimState>; productId: ProductId }) {
  const p = PRODUCTS[productId];
  const { shelf, capacity } = state.stock[productId];
  return (
    <div className="product-sheet">
      <div className="service-head">
        <div className="icon-tile">
          <ProductIcon id={productId} size={52} />
        </div>
        <div className="service-who">
          <strong>{p.name}</strong>
          <span className="muted small">
            Nhãn hư cấu “{p.brand}” · {CATEGORY[p.category]}
          </span>
          <span className="small">
            Giá bán <b>{state.prices[productId]}</b> · Giá vốn {p.cost} {BRAND.currency}
          </span>
        </div>
      </div>
      <div className="stock-row">
        <span>Trên kệ</span>
        <span className="stock-pips" aria-label={`${shelf}/${capacity}`}>
          {Array.from({ length: capacity }, (_, i) => (
            <i key={i} className={i < shelf ? 'on' : ''} />
          ))}
        </span>
        <b>
          {shelf}/{capacity}
        </b>
      </div>
      <RestockButton state={state} productId={productId} />
      <PriceControl state={state} productId={productId} />
    </div>
  );
}

/**
 * Chỉnh giá bán theo từng món. Hệ quả hiển thị rõ: bán cao hơn giá tham khảo thì khách nhạy giá chê đắt
 * (lỗi chính sách giá, không tính cho nhân viên); bán rẻ hơn thì khách vui hơn nhưng lãi mỗi món ít đi.
 */
export function PriceControl({ state, productId }: { state: DeepReadonly<SimState>; productId: ProductId }) {
  const bridge = useBridge();
  const p = PRODUCTS[productId];
  const price = state.prices[productId];
  const { min, max } = priceBounds(state, productId);
  const ref = p.referencePrice;
  const set = (value: number) => bridge.dispatch({ type: 'setPrice', productId, price: value });
  const diff = Math.round(((price - ref) / ref) * 100);
  return (
    <section className="price-control" aria-label={`Giá bán ${p.name}`}>
      <div className="price-row">
        <span>Giá bán</span>
        <GameButton size="small" onClick={() => set(price - 1)} disabled={price <= min} aria-label="Giảm 1 xu">
          −
        </GameButton>
        <b className="price-value">
          {price} {BRAND.currency}
        </b>
        <GameButton size="small" onClick={() => set(price + 1)} disabled={price >= max} aria-label="Tăng 1 xu">
          +
        </GameButton>
      </div>
      <span className="small muted">
        Giá tham khảo {ref} · lãi {price - p.cost} {BRAND.currency}/món · cho phép {min}–{max}
      </span>
      {diff > 0 ? (
        <span className="small warn-text">Cao hơn giá tham khảo {diff}%: khách nhạy giá dễ chê đắt, sao cửa hàng có thể giảm.</span>
      ) : diff < 0 ? (
        <span className="small good-text">Rẻ hơn giá tham khảo {-diff}%: khách nhạy giá vui hơn, nhưng lãi mỗi món ít đi.</span>
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
