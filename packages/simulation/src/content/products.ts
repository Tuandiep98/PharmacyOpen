import type { ProductDef, ProductId } from './types';

// Danh mục hư cấu, chỉ gồm đồ chăm sóc cá nhân/sơ cứu không kê đơn. Giá là số cân bằng tạm thời.
// Kem chống nắng và nước rửa tay đang bán cao hơn giá tham khảo: khách nhạy giá sẽ phàn nàn về chính sách giá.
export const PRODUCTS: Record<ProductId, ProductDef> = {
  mask: { id: 'mask', name: 'Khẩu trang', brand: 'Mây Nhẹ', category: 'hygiene', price: 12, cost: 6, referencePrice: 12, shelfCapacity: 6 },
  bandage: { id: 'bandage', name: 'Băng dán cá nhân', brand: 'Dán Xinh', category: 'first-aid', price: 10, cost: 4, referencePrice: 10, shelfCapacity: 6 },
  sunscreen: { id: 'sunscreen', name: 'Kem chống nắng', brand: 'Nắng Dịu', category: 'skin-care', price: 30, cost: 15, referencePrice: 25, shelfCapacity: 4 },
  sanitizer: { id: 'sanitizer', name: 'Nước rửa tay khô', brand: 'Tay Sạch', category: 'hygiene', price: 18, cost: 8, referencePrice: 16, shelfCapacity: 5 },
  lipbalm: { id: 'lipbalm', name: 'Son dưỡng môi', brand: 'Môi Mềm', category: 'skin-care', price: 15, cost: 6, referencePrice: 15, shelfCapacity: 6 },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS) as ProductId[];
