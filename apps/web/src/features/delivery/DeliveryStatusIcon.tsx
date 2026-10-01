import { ART } from "../../art/palette";

export type DeliveryStatus = "pack" | "urgent" | "late" | "sent";

/**
 * Icon động cho nút Đơn ship, thay chữ trạng thái (kiểu Lottie nhưng là SVG + CSS, không cần thư viện):
 * - pack: nắp hộp mở/đóng — còn đơn cần gói;
 * - urgent: đồng hồ nhỏ quay kim, hộp lắc nhẹ — sắp trễ;
 * - late: dấu "!" đỏ nhấp nháy, hộp rung — trễ hẹn;
 * - sent: hộp nảy trên đường, vệt gió lùi lại — đang giao.
 * Người dùng bật giảm chuyển động thì đứng yên (xem delivery.css).
 */
export function DeliveryStatusIcon({
  status,
  size = 28,
}: {
  status: DeliveryStatus;
  size?: number;
}) {
  return (
    <svg
      className={`dstat dstat-${status}`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {status === "sent" && (
        <g className="dstat-wind" stroke={ART.wood} strokeWidth={1.6}>
          <path d="M2,14 H7" />
          <path d="M1,19 H5" />
          <path d="M3,24 H8" />
        </g>
      )}
      {status === "sent" && (
        <path
          className="dstat-road"
          d="M4,29.5 H30"
          strokeDasharray="3 3"
          strokeWidth={1.4}
        />
      )}
      <g className="dstat-box">
        <path d="M7,12 L17,8 L27,12 V23 L17,27 L7,23 Z" fill="#F2C48D" />
        <path d="M7,12 L17,16 L27,12 M17,16 V27" />
        <path
          d="M11.5,10.2 L21.5,14.2 V17.5"
          stroke={ART.wood}
          strokeWidth={2}
        />
        {status === "pack" && (
          <>
            <path
              className="dstat-flap-l"
              d="M7,12 L17,8 L13,5 L3,9 Z"
              fill="#F7D6AC"
            />
            <path
              className="dstat-flap-r"
              d="M27,12 L17,8 L21,5 L31,9 Z"
              fill="#F7D6AC"
            />
          </>
        )}
      </g>
      {status === "urgent" && (
        <g className="dstat-badge" transform="translate(24.5 7.5)">
          <circle r={6} fill="#FFE6A8" stroke="#B9791A" />
          <path
            className="dstat-hand"
            d="M0,0 V-3.6"
            stroke="#8A5A10"
            strokeWidth={1.6}
          />
          <path d="M0,0 H2.4" stroke="#8A5A10" strokeWidth={1.6} />
        </g>
      )}
      {status === "late" && (
        <g className="dstat-badge dstat-alert" transform="translate(24.5 7.5)">
          <circle r={6} fill="#E5534B" stroke="#8E2F28" />
          <path d="M0,-3 V0.6" stroke="#fff" strokeWidth={2} />
          <circle cy={3} r={1} fill="#fff" stroke="none" />
        </g>
      )}
    </svg>
  );
}
