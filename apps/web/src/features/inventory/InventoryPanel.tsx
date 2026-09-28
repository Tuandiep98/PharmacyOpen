import { PRODUCT_IDS, PRODUCTS, type DeepReadonly, type SimState } from '@pharmacy/simulation';
import { ProductIcon } from '../../art/Products';
import { BRAND } from '../../brand';
import { useUi } from '../../ui/uiStore';
import { PanelHeading } from '../../ui/primitives';
import { RestockButton } from './ProductSheet';

export function InventoryPanel({ state }: { state: DeepReadonly<SimState> }) {
  const select = useUi((s) => s.select);
  const setTab = useUi((s) => s.setTab);
  return (
    <div className="panel">
      <PanelHeading description={
        <>
        Hàng được bán trực tiếp từ kệ. Nhập hàng sẽ lấp đầy kệ trong giới hạn số xu hiện có. Chạm vào tên món để xem chi tiết và chỉnh giá bán.
        </>
      }>Kho hàng</PanelHeading>
      <ul className="inventory-list">
        {PRODUCT_IDS.map((id) => {
          const p = PRODUCTS[id];
          const shelf = state.stock[id].shelf;
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
