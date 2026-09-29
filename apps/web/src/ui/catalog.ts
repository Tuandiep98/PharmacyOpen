import {
  PRODUCT_IDS,
  PRODUCTS,
  unlockedProducts,
  type DeepReadonly,
  type SimState,
  type ProductCategory,
  type ProductId,
} from "@pharmacy/simulation";

export type CatalogCategory = "all" | ProductCategory;
export const CATALOG_PAGE_SIZE = 5;
export function catalogPageSize(state?: DeepReadonly<SimState>): number {
  if (!state) return CATALOG_PAGE_SIZE;
  const shelfLevel =
    1 +
    state.upgrades.filter(
      (id) => id === "wide-shelf" || id.startsWith("wide-shelf-"),
    ).length;
  return Math.min(
    12,
    4 +
      (shelfLevel - 1) * 2 +
      (state.upgrades.includes("sorted-shelf") ? 2 : 0),
  );
}
export const CATALOG_CATEGORIES: readonly {
  id: CatalogCategory;
  label: string;
}[] = [
  { id: "all", label: "Tất cả" },
  { id: "hygiene", label: "Vệ sinh" },
  { id: "first-aid", label: "Sơ cứu" },
  { id: "skin-care", label: "Chăm da" },
];

export function catalogProducts(
  category: CatalogCategory,
  state?: DeepReadonly<SimState>,
): ProductId[] {
  const ids = state ? unlockedProducts(state) : PRODUCT_IDS;
  if (category !== "all")
    return ids.filter((id) => PRODUCTS[id].category === category);
  if (!state?.upgrades.includes("sorted-shelf")) return ids;
  const order: ProductCategory[] = ["hygiene", "first-aid", "skin-care"];
  return [...ids].sort(
    (a, b) =>
      order.indexOf(PRODUCTS[a].category) - order.indexOf(PRODUCTS[b].category),
  );
}

export function catalogPages(
  category: CatalogCategory,
  state?: DeepReadonly<SimState>,
): number {
  return Math.max(
    1,
    Math.ceil(catalogProducts(category, state).length / catalogPageSize(state)),
  );
}

export function catalogPageProducts(
  category: CatalogCategory,
  page: number,
  state?: DeepReadonly<SimState>,
): ProductId[] {
  const safePage = Math.min(
    Math.max(0, page),
    catalogPages(category, state) - 1,
  );
  const size = catalogPageSize(state);
  return catalogProducts(category, state).slice(
    safePage * size,
    (safePage + 1) * size,
  );
}
