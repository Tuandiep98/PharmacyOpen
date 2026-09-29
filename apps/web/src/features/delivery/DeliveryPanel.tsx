import {
  ARCHETYPES,
  deliveryTimeLeft,
  isOpenDelivery,
  PRODUCTS,
  stockUnitCost,
  type DeepReadonly,
  type Delivery,
  type SimState,
} from "@pharmacy/simulation";
import { ParcelIcon } from "../../art/Icons";
import { ProductIcon } from "../../art/Products";
import { WorkerPortrait } from "../../art/WorkerFigure";
import { BRAND } from "../../brand";
import { useBridge } from "../../game/useGame";
import { EmptyState, GameButton, PanelHeading } from "../../ui/primitives";
import { useUi } from "../../ui/uiStore";
import { gameDuration } from "../day/dayText";
import { REJECT_TEXT } from "../store/rejectText";
import "./delivery.css";

type State = DeepReadonly<SimState>;
type D = DeepReadonly<Delivery>;

/** Còn dưới chừng này phần ngày tới hạn thì đơn được đánh dấu "sắp trễ". */
const URGENT_RATIO = 0.2;

export function deliveryUrgency(
  state: State,
  delivery: D,
): "late" | "urgent" | "ok" {
  const left = deliveryTimeLeft(state, delivery);
  if (left < 0) return "late";
  return left < state.config.dayMs * URGENT_RATIO ? "urgent" : "ok";
}

function dueText(state: State, delivery: D): string {
  const left = deliveryTimeLeft(state, delivery);
  if (left < 0) return `Trễ hẹn ${gameDuration(state, -left)}`;
  const day =
    delivery.dueDay === state.day
      ? "trong hôm nay"
      : delivery.dueDay === state.day + 1
        ? "ngày mai"
        : `ngày ${delivery.dueDay}`;
  return `Giao ${day} · còn ${gameDuration(state, left)}`;
}

/** Nút nổi trên cảnh: số đơn ship cần làm, đổi màu khi có đơn sắp trễ. Chạm mở danh sách đơn. */
export function DeliveryChip({ state }: { state: State }) {
  const select = useUi((s) => s.select);
  if (state.deliveries.length === 0) return null;
  const open = state.deliveries.filter(isOpenDelivery);
  const worst = open
    .map((d) => deliveryUrgency(state, d))
    .sort(
      (a, b) =>
        ["late", "urgent", "ok"].indexOf(a) -
        ["late", "urgent", "ok"].indexOf(b),
    )[0];
  const label =
    open.length === 0
      ? "Đang giao"
      : worst === "late"
        ? "Trễ hẹn"
        : worst === "urgent"
          ? "Sắp trễ"
          : "Cần gói";
  return (
    <GameButton
      surface="custom"
      type="button"
      className={`delivery-chip ${worst ?? "ok"}`}
      onClick={() => select({ kind: "deliveries" })}
      aria-label={`Đơn ship: ${open.length} đơn cần gói hoặc gửi, ${state.deliveries.length - open.length} đơn đang giao. ${label}.`}
    >
      <ParcelIcon size={22} />
      <b>{open.length > 0 ? open.length : state.deliveries.length}</b>
      <span>{label}</span>
    </GameButton>
  );
}

/** Danh sách đơn ship: gói từng món từ kệ, ghi phiếu & gửi, theo dõi shipper. */
export function DeliveryPanel({ state }: { state: State }) {
  const open = state.deliveries.filter(isOpenDelivery);
  const sent = state.deliveries.filter((d) => !isOpenDelivery(d));
  const byDue = (a: D, b: D) => a.dueAtMs - b.dueAtMs;
  return (
    <div className="panel delivery-panel">
      <PanelHeading description="Gói đủ món từ kệ, ghi phiếu rồi gửi; shipper tới lấy và thu tiền khi giao. Giao sau giờ đóng cửa của ngày hẹn là trễ. Nhân viên rảnh tay tự gói giúp.">
        Đơn ship
      </PanelHeading>
      {state.deliveries.length === 0 ? (
        <EmptyState icon={<ParcelIcon />} title="Chưa có đơn ship">
          Đơn online rớt về trong giờ mở cửa. Khách gặp lúc hết hàng cũng có thể
          hẹn giao sau.
        </EmptyState>
      ) : (
        <ul className="card-list delivery-list">
          {[...open].sort(byDue).map((d) => (
            <DeliveryCard key={d.id} state={state} delivery={d} />
          ))}
          {[...sent].sort(byDue).map((d) => (
            <DeliveryCard key={d.id} state={state} delivery={d} />
          ))}
        </ul>
      )}
    </div>
  );
}

function DeliveryCard({ state, delivery }: { state: State; delivery: D }) {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const run = (command: Parameters<typeof bridge.dispatch>[0]) => {
    const r = bridge.dispatch(command);
    if (!r.ok) pushToast("bad", REJECT_TEXT[r.reason]);
  };
  const urgency = deliveryUrgency(state, delivery);
  const packers = Object.values(state.workers).filter(
    (w) =>
      w.task && "deliveryId" in w.task && w.task.deliveryId === delivery.id,
  );
  const helpers = delivery.handledBy
    .map((id) => state.workers[id])
    .filter((w) => w !== undefined);
  const people = [
    ...new Map([...helpers, ...packers].map((w) => [w.id, w])).values(),
  ];
  const total = delivery.items.reduce((sum, item) => sum + item.qty, 0);
  const packed = delivery.items.reduce(
    (sum, item) => sum + item.packed.length,
    0,
  );
  const open = isOpenDelivery(delivery);

  return (
    <li className={`staff-card delivery-card ${open ? urgency : "sent"}`}>
      <div className="delivery-head">
        <ParcelIcon size={28} />
        <div className="delivery-who">
          <strong>
            {delivery.source === "online" ? "Đơn online" : "Khách hẹn giao sau"}
          </strong>
          <span className="small muted">
            {ARCHETYPES[delivery.archetypeId].name}
          </span>
        </div>
        <span className={`tag delivery-due ${open ? urgency : ""}`}>
          {open ? dueText(state, delivery) : statusText(delivery)}
        </span>
      </div>

      <ul className="delivery-items" aria-label="Món trong đơn">
        {delivery.items.map((item) => {
          const done = item.packed.length >= item.qty;
          const shelf = state.stock[item.productId].shelf;
          return (
            <li key={item.productId} className={done ? "done" : ""}>
              <ProductIcon id={item.productId} size={30} />
              <span className="delivery-item-name">
                {PRODUCTS[item.productId].name}
                <small>
                  Đã gói {item.packed.length}/{item.qty}
                  {!done && ` · kệ còn ${shelf}`}
                </small>
              </span>
              {delivery.status === "packing" &&
                !done &&
                (shelf > 0 ? (
                  <GameButton
                    size="small"
                    onClick={() =>
                      run({
                        type: "packDelivery",
                        deliveryId: delivery.id,
                        productId: item.productId,
                      })
                    }
                  >
                    Gói 1
                  </GameButton>
                ) : (
                  <GameButton
                    size="small"
                    disabled={
                      state.money < stockUnitCost(state, item.productId)
                    }
                    onClick={() =>
                      run({ type: "restock", productId: item.productId })
                    }
                  >
                    Hết · Nhập
                  </GameButton>
                ))}
            </li>
          );
        })}
      </ul>

      <div className="delivery-foot">
        {people.length > 0 && (
          <span
            className="delivery-people"
            aria-label={`Người làm đơn: ${people.map((w) => w.name).join(", ")}`}
          >
            {people.map((w) => (
              <WorkerPortrait key={w.id} worker={w} size={26} />
            ))}
          </span>
        )}
        {delivery.status === "packing" && (
          <span
            className="progress-track"
            role="progressbar"
            aria-label="Tiến độ gói hàng"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={packed}
          >
            <span
              className="progress-fill"
              style={{ width: `${(packed / total) * 100}%` }}
            />
          </span>
        )}
        {delivery.status === "packed" && (
          <GameButton
            tone="primary"
            size="small"
            onClick={() =>
              run({ type: "sendDelivery", deliveryId: delivery.id })
            }
          >
            Ghi phiếu &amp; gửi
          </GameButton>
        )}
        {!open && <ShipperProgress state={state} delivery={delivery} />}
        {open && (
          <GameButton
            tone="quiet"
            size="small"
            className="delivery-cancel"
            onClick={() =>
              run({ type: "cancelDelivery", deliveryId: delivery.id })
            }
          >
            Huỷ đơn
          </GameButton>
        )}
      </div>
    </li>
  );
}

function statusText(delivery: D): string {
  if (delivery.status === "awaiting-pickup") return "Chờ shipper tới lấy";
  return `Đang giao · thu ${delivery.price ?? 0} ${BRAND.currency}`;
}

function ShipperProgress({ state, delivery }: { state: State; delivery: D }) {
  const [start, end] =
    delivery.status === "awaiting-pickup"
      ? [
          (delivery.pickupAtMs ?? 0) - state.config.shipperPickupMs,
          delivery.pickupAtMs ?? 0,
        ]
      : [
          (delivery.deliverAtMs ?? 0) - state.config.deliveryTransitMs,
          delivery.deliverAtMs ?? 0,
        ];
  const ratio = Math.max(
    0,
    Math.min(1, (state.timeMs - start) / Math.max(1, end - start)),
  );
  return (
    <span
      className="progress-track shipper-track"
      role="progressbar"
      aria-label={statusText(delivery)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
    >
      <span className="progress-fill" style={{ width: `${ratio * 100}%` }} />
    </span>
  );
}
