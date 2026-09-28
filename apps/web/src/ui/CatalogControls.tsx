import { playSfx } from '../audio/sfx';
import { CATALOG_CATEGORIES, catalogPages } from './catalog';
import { useUi } from './uiStore';

/** Cùng một bộ chọn danh mục cho kệ, khay phục vụ và Kho. */
export function CatalogControls({ pages = false }: { pages?: boolean }) {
  const category = useUi((s) => s.catalogCategory);
  const page = useUi((s) => s.catalogPage);
  const setCategory = useUi((s) => s.setCatalogCategory);
  const setPage = useUi((s) => s.setCatalogPage);
  const total = catalogPages(category);
  return <div className="catalog-controls" aria-label="Danh mục hàng">
    <div className="catalog-categories" role="group" aria-label="Nhóm hàng">
      {CATALOG_CATEGORIES.map((item) => <button
        key={item.id}
        type="button"
        className={`catalog-tab ${category === item.id ? 'active' : ''}`}
        aria-pressed={category === item.id}
        onClick={() => { setCategory(item.id); playSfx('page'); }}
      >{item.label}</button>)}
    </div>
    {pages && <div className="catalog-pager" aria-label={`Trang hàng ${page + 1} trên ${total}`}>
      <button type="button" aria-label="Trang hàng trước" disabled={page <= 0} onClick={() => { setPage(page - 1); playSfx('page'); }}>‹</button>
      <span>{page + 1}/{total}</span>
      <button type="button" aria-label="Trang hàng sau" disabled={page >= total - 1} onClick={() => { setPage(page + 1); playSfx('page'); }}>›</button>
    </div>}
  </div>;
}
