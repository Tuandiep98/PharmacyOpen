import { PRODUCT_IDS, PRODUCTS, type ProductCategory, type ProductId } from '@pharmacy/simulation';

export type CatalogCategory = 'all' | ProductCategory;
export const CATALOG_PAGE_SIZE = 5;
export const CATALOG_CATEGORIES: readonly { id: CatalogCategory; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'hygiene', label: 'Vệ sinh' },
  { id: 'first-aid', label: 'Sơ cứu' },
  { id: 'skin-care', label: 'Chăm da' },
];

export function catalogProducts(category: CatalogCategory): ProductId[] {
  return category === 'all' ? PRODUCT_IDS : PRODUCT_IDS.filter((id) => PRODUCTS[id].category === category);
}

export function catalogPages(category: CatalogCategory): number {
  return Math.max(1, Math.ceil(catalogProducts(category).length / CATALOG_PAGE_SIZE));
}

export function catalogPageProducts(category: CatalogCategory, page: number): ProductId[] {
  const safePage = Math.min(Math.max(0, page), catalogPages(category) - 1);
  return catalogProducts(category).slice(safePage * CATALOG_PAGE_SIZE, (safePage + 1) * CATALOG_PAGE_SIZE);
}
