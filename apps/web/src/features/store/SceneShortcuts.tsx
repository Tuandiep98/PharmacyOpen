import type { DeepReadonly, SimState } from "@pharmacy/simulation";
import type { ReactNode } from "react";
import {
  BlindBagIcon,
  CapsuleIcon,
  GiftIcon,
  RecruitIcon,
} from "../../art/Icons";
import { IconButton } from "../../ui/primitives";
import { useUi } from "../../ui/uiStore";
import { DeliveryChip } from "../delivery/DeliveryPanel";

type Target = Parameters<ReturnType<typeof useUi.getState>["openView"]>[0];

/**
 * Góc phải cảnh: cột nút vuông dùng chung của app — Đơn ship (khi có đơn, số đơn là badge) và các nút tắt
 * mở thẳng Tuyển dụng, Ghép đồ, Bộ sưu tập và Túi mù. Xếp dọc sát mép phải để không che bảng hiệu và kệ hàng.
 */
export function SceneShortcuts({ state }: { state: DeepReadonly<SimState> }) {
  const openView = useUi((s) => s.openView);
  const items = state.collection.items.length;
  const shortcuts: {
    label: string;
    icon: ReactNode;
    target: Target;
    badge?: number;
  }[] = [
    {
      label: "Tuyển dụng",
      icon: <RecruitIcon />,
      target: { tab: "staff", view: "recruit" },
    },
    {
      label: "Ghép đồ",
      icon: <CapsuleIcon />,
      target: { tab: "expansion", view: "fusion" },
      badge: Math.floor(items / 3),
    },
    {
      label: "Bộ sưu tập",
      icon: <GiftIcon />,
      target: { tab: "expansion", view: "collection" },
    },
    {
      label: "Túi mù",
      icon: <BlindBagIcon />,
      target: { tab: "blindbag" },
    },
  ];
  return (
    <div className="scene-quick">
      <nav className="scene-quick-list" aria-label="Mở nhanh">
        <DeliveryChip state={state} />
        {shortcuts.map(({ label, icon, target, badge }) => (
          <IconButton
            key={label}
            surface="raised"
            className="scene-quick-btn"
            aria-label={badge ? `${label} (${badge})` : label}
            title={label}
            onClick={() => openView(target)}
          >
            {icon}
            {badge ? (
              <span className="scene-quick-badge" aria-hidden>
                {badge}
              </span>
            ) : null}
          </IconButton>
        ))}
      </nav>
    </div>
  );
}
