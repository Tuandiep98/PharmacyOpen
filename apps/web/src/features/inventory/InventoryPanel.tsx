import { nextExpiry, PRODUCTS, PRODUCT_IDS, isProductUnlocked, isTrending, playerLevel, productLevel, stockUnitCost, type DeepReadonly, type SimState } from '@pharmacy/simulation';
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
  const visibleProducts = catalogProducts(category, state);
  const lockedProducts = PRODUCT_IDS.filter((id) => !isProductUnlocked(state, id));
  const upcoming = lockedProducts.filter((id) => productLevel(id) === productLevel(lockedProducts[0]!));
  return (
    <div className="panel">
      <PanelHeading description={
        <>
        Hàng được bán trực tiếp từ kệ. Nhập hàng sẽ lấp đầy kệ trong giới hạn số xu hiện có. Chạm vào tên món để xem chi tiết và chỉnh giá bán.
        </>
      }>Kho hàng</PanelHeading>
      <CatalogControls state={state} />
      <p className="small muted">Cấp tiệm {playerLevel(state)} · {visibleProducts.length} mặt hàng trong nhóm đang xem. Món mới cần nâng Kho và Cửa hàng để nhập bán.</p>
      <ul className="inventory-list">
        {visibleProducts.map((id) => {
          const p = PRODUCTS[id];
          const shelf = state.stock[id].shelf;
          const expiry = nextExpiry(state, id);
          const daysLeft = expiry === null ? null : Math.max(0, Math.ceil((expiry - state.timeMs) / state.config.dayMs));
          return (
            <li key={id} className={`${shelf === 0 ? 'empty' : shelf <= 1 ? 'low' : ''} ${isTrending(state, id) ? 'trending-product' : ''}`}>
              <ProductIcon id={id} size={36} />
              <button
                className="inv-info"
                onClick={() => {
                  setTab('store');
                  select({ kind: 'product', id });
                }}
              >
                <strong>{p.name} <span className="product-level">Cấp {productLevel(id)}</span> {isTrending(state, id) && <span className="trend-tag">Bán chạy</span>}</strong>
                <span className="muted small">
                  {shelf}/{state.stock[id].capacity} trên kệ · giá {state.prices[id]} · lãi {state.prices[id] - stockUnitCost(state, id)} {BRAND.currency}/món nhập hôm nay
                  {state.prices[id] > p.referencePrice && <span className="warn-text"> · cao hơn tham khảo</span>}
                  {daysLeft !== null && <span className={daysLeft <= 2 ? 'warn-text' : ''}> · lô gần nhất còn {daysLeft} ngày</span>}
                </span>
              </button>
              <RestockButton state={state} productId={id} compact />
            </li>
          );
        })}
      </ul>
      {lockedProducts.length > 0 && <section className="upcoming-stock">
        <h3>Sắp mở · cấp {productLevel(upcoming[0]!)} </h3>
        <p className="small muted">Đạt mốc bán hàng và ngày, rồi nâng cả Kho và Cửa hàng ở mục Mở rộng.</p>
        <div className="upcoming-products">{upcoming.map((id) => <span key={id}><ProductIcon id={id} size={28} />{PRODUCTS[id].name}</span>)}</div>
        <button type="button" className="link-btn" onClick={() => setTab('expansion')}>Xem các mốc mở rộng</button>
      </section>}
    </div>
  );
}
