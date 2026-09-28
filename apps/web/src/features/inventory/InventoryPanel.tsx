import { nextExpiry, PRODUCTS, type DeepReadonly, type SimState } from '@pharmacy/simulation';
import { ProductIcon } from '../../art/Products';
import { BRAND } from '../../brand';
import { useUi } from '../../ui/uiStore';
import { PanelHeading } from '../../ui/primitives';
import { RestockButton } from './ProductSheet';
import { CatalogControls } from '../../ui/CatalogControls';
import { catalogProducts } from '../../ui/catalog';

export function InventoryPanel({ state }: { state: DeepReadonly<SimState> }) {
  const select = useUi((s) => s.select);
  const setTab = useUi((s) => s.setTab);
  const category = useUi((s) => s.catalogCategory);
  const visibleProducts = catalogProducts(category);
  return (
    <div className="panel">
      <PanelHeading description={
        <>
        Hàng được bán trực tiếp từ kệ. Nhập hàng sẽ lấp đầy kệ trong giới hạn số xu hiện có. Chạm vào tên món để xem chi tiết và chỉnh giá bán.
        </>
      }>Kho hàng</PanelHeading>
      <CatalogControls />
      <p className="small muted">{visibleProducts.length} mặt hàng trong nhóm đang xem.</p>
      <ul className="inventory-list">
        {visibleProducts.map((id) => {
          const p = PRODUCTS[id];
          const shelf = state.stock[id].shelf;
          const expiry = nextExpiry(state, id);
          const daysLeft = expiry === null ? null : Math.max(0, Math.ceil((expiry - state.timeMs) / state.config.dayMs));
          return (
            <li key={id} className={shelf === 0 ? 'empty' : shelf <= 1 ? 'low' : ''}>
              <ProductIcon id={id} size={36} />
              <button
                className="inv-info"
                onClick={() => {
                  setTab('store');
                  select({ kind: 'product', id });
                }}
              >
                <strong>{p.name}</strong>
                <span className="muted small">
                  {shelf}/{state.stock[id].capacity} trên kệ · giá {state.prices[id]} · lãi {state.prices[id] - p.cost} {BRAND.currency}/món
                  {state.prices[id] > p.referencePrice && <span className="warn-text"> · cao hơn tham khảo</span>}
                  {daysLeft !== null && <span className={daysLeft <= 2 ? 'warn-text' : ''}> · lô gần nhất còn {daysLeft} ngày</span>}
                </span>
              </button>
              <RestockButton state={state} productId={id} compact />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
