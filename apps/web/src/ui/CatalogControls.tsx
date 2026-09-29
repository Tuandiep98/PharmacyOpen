import { playSfx } from "../audio/sfx";
import { CATALOG_CATEGORIES, catalogPages } from "./catalog";
import { useUi } from "./uiStore";
import type { DeepReadonly, SimState } from "@pharmacy/simulation";

/** Cùng một bộ chọn danh mục cho kệ, khay phục vụ và Kho. */
export function CatalogControls({
  pages = false,
  state,
}: {
  pages?: boolean;
  state?: DeepReadonly<SimState>;
}) {
  const category = useUi((s) => s.catalogCategory);
  const page = useUi((s) => s.catalogPage);
  const setCategory = useUi((s) => s.setCatalogCategory);
  const setPage = useUi((s) => s.setCatalogPage);
  const total = catalogPages(category, state);
  const current = Math.min(page, total - 1);
  return (
    <div className="catalog-controls" aria-label="Danh mục hàng">
      <div className="catalog-categories" role="group" aria-label="Nhóm hàng">
        {CATALOG_CATEGORIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`catalog-tab ${category === item.id ? "active" : ""}`}
            aria-pressed={category === item.id}
            onClick={() => {
              setCategory(item.id);
              playSfx("page");
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {pages && (
        <div
          className="catalog-pager"
          aria-label={`Trang hàng ${current + 1} trên ${total}`}
        >
          <button
            type="button"
            aria-label="Trang hàng trước"
            disabled={current <= 0}
            onClick={() => {
              setPage(current - 1);
              playSfx("page");
            }}
          >
            ‹
          </button>
          <span>
            {current + 1}/{total}
          </span>
          <button
            type="button"
            aria-label="Trang hàng sau"
            disabled={current >= total - 1}
            onClick={() => {
              setPage(current + 1);
              playSfx("page");
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
