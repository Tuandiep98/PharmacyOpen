/**
 * Vị trí làm việc của nhân viên. Thêm vị trí mới: thêm id vào `StationId`, một mục ở `STATIONS`
 * và một hàm hành vi ở `STATION_BEHAVIOR` (ai.ts); giao diện tự liệt kê theo danh mục này.
 *
 * - counter: quầy bán, người đứng quầy lưu ở `counter.operatorId` (mỗi quầy một người).
 * - các vị trí còn lại lưu ở `worker.station`; người đứng quầy vẫn giữ vị trí cũ để quay về khi rời quầy.
 */
export type StationId = 'counter' | 'stock' | 'support';

/** Vị trí ngoài quầy, ghi trên từng nhân viên. */
export type BackStationId = Exclude<StationId, 'counter'>;

export interface StationDef {
  id: StationId;
  name: string;
  description: string;
  /** Số người tối đa (null = không giới hạn). Quầy bán tính theo số quầy. */
  capacity: number | null;
}

export const STATIONS: Record<StationId, StationDef> = {
  counter: { id: 'counter', name: 'Quầy bán', description: 'Nhận yêu cầu, lấy hàng và thanh toán. Mỗi quầy một người.', capacity: 1 },
  stock: {
    id: 'stock',
    name: 'Kho & nhập hàng',
    description: 'Chuyên bổ sung kệ từ sớm (kệ dưới 60%) và nhanh hơn 25%; không bị gọi ra quầy khi đổi ca.',
    capacity: 2,
  },
  support: {
    id: 'support',
    name: 'Hỗ trợ',
    description: 'Rảnh thì bổ sung kệ khi gần hết; đầu ca được ưu tiên nhận quầy.',
    capacity: null,
  },
};

export const STATION_IDS = Object.keys(STATIONS) as StationId[];
export const BACK_STATION_IDS = STATION_IDS.filter((id): id is BackStationId => id !== 'counter');
