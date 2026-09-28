import { describe, expect, it } from 'vitest';
import { PRODUCT_IDS, PRODUCTS } from '@pharmacy/simulation';
import { CATALOG_CATEGORIES, catalogPageProducts, catalogPages, catalogProducts } from '../src/ui/catalog';

describe('danh mục trên kệ và khay', () => {
  it('mọi sản phẩm đều tới được bằng điều khiển trang và nhóm hàng', () => {
    for (const category of CATALOG_CATEGORIES) {
      const pages = Array.from({ length: catalogPages(category.id) }, (_, page) => catalogPageProducts(category.id, page));
      expect(pages.every((items) => items.length > 0 && items.length <= 5)).toBe(true);
      expect(pages.flat()).toEqual(catalogProducts(category.id));
      if (category.id !== 'all') expect(pages.flat().every((id) => PRODUCTS[id].category === category.id)).toBe(true);
    }
    expect(catalogProducts('all')).toEqual(PRODUCT_IDS);
  });
});
