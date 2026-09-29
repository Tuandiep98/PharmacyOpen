import {
  ARCHETYPES,
  customerName,
  PRODUCTS,
  REFERRAL_MESSAGE,
  REQUESTS,
  isTrending,
  isOnDuty,
  stockUnitCost,
  type DeepReadonly,
  type SimState,
} from "@pharmacy/simulation";
import { BRAND } from "../../brand";
import { ClinicIcon, ParcelIcon } from "../../art/Icons";
import { ProductIcon } from "../../art/Products";
import { WorkerPortrait } from "../../art/WorkerFigure";
import { beginProductGesture } from "../../ui/drag";
import { useUi } from "../../ui/uiStore";
import { GameButton } from "../../ui/primitives";
import { Portrait } from "./CustomerInfo";
import { PLAYER_WORKER_ID, useServiceActions } from "./useServiceActions";
import { workerProgress } from "../staff/workerStatus";
import { CounterStaffPicker, SwapAvatar } from "../staff/CounterAssign";
import { ActivityBadge } from "../staff/ActivityBadge";
import { useState } from "react";
import { CatalogControls } from "../../ui/CatalogControls";
import { catalogPageProducts } from "../../ui/catalog";

const WORKING_LABEL: Record<string, string> = {
  retrieving: "đang lấy",
  checkingOut: "Đang thanh toán…",
  referring: "Đang giải thích cho khách…",
  deferring: "Đang báo tạm hết hàng…",
};

/**
 * Khi người chơi đứng quầy, khay hiện yêu cầu và sản phẩm; khi NPC đứng quầy,
 * chỉ hiện tóm tắt hoạt động để dành chỗ cho cảnh và các việc khác.
 * Kéo sản phẩm vào khách (hoặc chạm) là đưa hàng; không cần bước "bắt đầu phục vụ" riêng.
 */
export function ServiceTray({ state }: { state: DeepReadonly<SimState> }) {
  const { give, refer, defer, restock, assignCounter } = useServiceActions();
  const dragging = useUi((s) => s.drag?.productId ?? null);
  const catalogCategory = useUi((s) => s.catalogCategory);
  const catalogPage = useUi((s) => s.catalogPage);
  const visibleProducts = catalogPageProducts(
    catalogCategory,
    catalogPage,
    state,
  );
  const activeCounterId = useUi((s) => s.activeCounterId);
  const setActiveCounterId = useUi((s) => s.setActiveCounterId);
  const counter =
    state.counters.find((c) => c.id === activeCounterId) ?? state.counters[0]!;
  // Bộ chọn người mở theo từng quầy; đổi quầy thì tự đóng.
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const swapOpen = swapFor === counter.id;
  const toggleSwap = () => setSwapFor(swapOpen ? null : counter.id);
  const counterTabs = state.counters.length > 1 && (
    <div className="counter-tabs" role="group" aria-label="Chọn quầy">
      {state.counters.map((c, i) => (
        <GameButton
          surface="custom"
          key={c.id}
          type="button"
          aria-pressed={c.id === counter.id}
          className={c.id === counter.id ? "active" : ""}
          onClick={() => setActiveCounterId(c.id)}
        >
          Quầy {i + 1}
          {c.customerId ? " · Có khách" : !c.operatorId ? " · Chưa mở" : ""}
        </GameButton>
      ))}
    </div>
  );
  const player = state.workers[PLAYER_WORKER_ID]!;
  const operator = counter.operatorId
    ? state.workers[counter.operatorId]
    : undefined;
  const playerOperates = operator?.id === PLAYER_WORKER_ID;
  const staffOnDuty = Object.values(state.workers).some(
    (w) => w.controller === "ai" && isOnDuty(state, w),
  );
  const counterLabel =
    state.counters.length > 1
      ? ` ${state.counters.findIndex((c) => c.id === counter.id) + 1}`
      : "";
  const customerId = counter.customerId;
  const customer = customerId ? state.customers[customerId] : undefined;
  const order = customer?.orderId ? state.orders[customer.orderId] : undefined;
  const server = order ? state.workers[order.workerId] : operator;
  const canServe =
    playerOperates &&
    !!customer &&
    (!order ||
      (order.workerId === PLAYER_WORKER_ID && order.state === "deciding")) &&
    (!player.orderId || player.orderId === order?.id);
  const ratio = customer ? customer.patienceMs / customer.patienceMaxMs : 0;

  if (!operator) {
    return (
      <section
        className="auto-counter unstaffed-counter"
        aria-label="Quầy chưa có người"
      >
        {counterTabs}
        <div className="auto-counter-info">
          <strong>Quầy{counterLabel} chưa có người đứng</strong>
          <span>Chạm một người để giao quầy và bắt đầu nhận khách.</span>
        </div>
        <CounterStaffPicker state={state} counterId={counter.id} />
      </section>
    );
  }
  if (!playerOperates) {
    const progress = workerProgress(state, operator);
    const waiting = state.queue.length;
    return (
      <section
        className="auto-counter npc-counter"
        aria-label="Quầy tự phục vụ"
      >
        {counterTabs}
        {staffOnDuty ? (
          <SwapAvatar
            worker={operator}
            size={48}
            open={swapOpen}
            onToggle={toggleSwap}
            counterLabel={`quầy${counterLabel}`}
          />
        ) : (
          <WorkerPortrait worker={operator} size={48} />
        )}
        <div className="auto-counter-info" aria-live="polite">
          <span className="npc-title">
            <strong>{operator.name}</strong>
            <span>đứng quầy{counterLabel}</span>
          </span>
          <span className="npc-activity">
            <ActivityBadge state={state} worker={operator} />
            {waiting > 0 && (
              <span className="queue-chip">{waiting} khách chờ</span>
            )}
          </span>
          <span
            className="progress-track"
            role="progressbar"
            aria-label={`Tiến độ công việc của ${operator.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round((progress ?? 0) * 100)}
            data-idle={progress === null || undefined}
          >
            <span
              className="progress-fill"
              style={{ width: `${(progress ?? 0) * 100}%` }}
            />
          </span>
        </div>
        <GameButton
          size="small"
          onClick={() => assignCounter(PLAYER_WORKER_ID, counter.id)}
        >
          Tự đứng quầy
        </GameButton>
        {staffOnDuty && swapOpen && (
          <CounterStaffPicker
            state={state}
            counterId={counter.id}
            includePlayer={false}
          />
        )}
      </section>
    );
  }

  let status: React.ReactNode;
  if (!customer) {
    status = null;
  } else if (order && order.state !== "deciding" && order.state !== "ready") {
    const label =
      order.state === "retrieving" && order.productId
        ? `${server?.name ?? ""} ${WORKING_LABEL.retrieving} ${PRODUCTS[order.productId].name.toLowerCase()}…`
        : (WORKING_LABEL[order.state] ?? "");
    const value =
      order.timerTotalMs > 0 ? 1 - order.timerMs / order.timerTotalMs : 1;
    status = (
      <div
        className="tray-progress"
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value * 100)}
      >
        <span>{label}</span>
        <span className="progress-track">
          <span
            className="progress-fill"
            style={{ width: `${value * 100}%` }}
          />
        </span>
      </div>
    );
  } else if (!canServe) {
    status = <span className="muted">Dược sĩ đang bận…</span>;
  } else {
    status = (
      <span className="tray-hint">Kéo món vào khách, hoặc chạm để đưa</span>
    );
  }

  return (
    <section className="tray" aria-label="Quầy phục vụ">
      {counterTabs}
      {staffOnDuty && (
        <div className="tray-operator">
          <SwapAvatar
            worker={operator}
            size={32}
            open={swapOpen}
            onToggle={toggleSwap}
            counterLabel={`quầy${counterLabel}`}
          />
          <span>
            Quầy{counterLabel} · <b>{operator.name}</b>
          </span>
        </div>
      )}
      {staffOnDuty && swapOpen && (
        <CounterStaffPicker
          state={state}
          counterId={counter.id}
          includePlayer={false}
        />
      )}
      <div className="tray-customer">
        {customer ? (
          <>
            <div className="tray-portrait">
              <Portrait customer={customer} size={52} />
              <span
                className="mini-patience"
                data-level={ratio > 0.5 ? "ok" : ratio > 0.25 ? "mid" : "low"}
              >
                <span style={{ width: `${ratio * 100}%` }} />
              </span>
            </div>
            <div className="tray-speech">
              <span className="tray-who">
                {customerName(state, customer)
                  ? `${customerName(state, customer)} · Khách quen · `
                  : ""}
                {ARCHETYPES[customer.archetypeId].name}
              </span>
              <p>
                {order?.state === "referring"
                  ? REFERRAL_MESSAGE
                  : `“${REQUESTS[customer.requestId]?.text ?? ""}”`}
              </p>
              <div className="tray-speech-status">{status}</div>
            </div>
          </>
        ) : (
          <div className="tray-empty">
            <span className="dot-pulse" aria-hidden />
            Đang chờ khách…
          </div>
        )}
      </div>

      <div className="tray-status">
        <div className="tray-actions">
          <GameButton
            className="refer"
            disabled={!canServe}
            onClick={() => refer(counter.id)}
            title="Khuyên khách đi khám"
          >
            <ClinicIcon size={20} />
            <span>Khuyên đi khám</span>
          </GameButton>
          <GameButton
            className="defer"
            disabled={!canServe}
            onClick={() => defer(counter.id)}
            title="Món khách cần đang hết: hẹn giao sau bằng đơn ship, hoặc khách đi mua chỗ khác"
          >
            <ParcelIcon size={20} />
            <span>Báo hết hàng</span>
          </GameButton>
        </div>
      </div>

      <CatalogControls pages state={state} />
      <ul className="tray-items">
        {visibleProducts.map((id) => {
          const p = PRODUCTS[id];
          const stock = state.stock[id].shelf;
          if (stock === 0) {
            const affordable = Math.min(
              state.stock[id].capacity,
              Math.floor(state.money / stockUnitCost(state, id)),
            );
            return (
              <li key={id}>
                <GameButton
                  surface="custom"
                  className={`item-chip empty ${isTrending(state, id) ? "trending-product" : ""}`}
                  onClick={() => restock(id)}
                  disabled={affordable === 0}
                >
                  <span className="item-icon faded">
                    <ProductIcon id={id} size={30} />
                  </span>
                  <span className="item-name">{p.name}</span>
                  <span className="item-restock">
                    {affordable
                      ? `+ Nhập ${affordable * stockUnitCost(state, id)} ${BRAND.currency}`
                      : "Thiếu xu"}
                  </span>
                </GameButton>
              </li>
            );
          }
          return (
            <li key={id}>
              <GameButton
                surface="custom"
                className={`item-chip ${dragging === id ? "lifted" : ""} ${isTrending(state, id) ? "trending-product" : ""}`}
                disabled={!canServe}
                onPointerDown={(e) =>
                  canServe &&
                  beginProductGesture(e, id, {
                    onDrop: give,
                    onTap: (productId) => give(productId, counter.id),
                  })
                }
                // Kích hoạt bằng bàn phím (Enter/Space) không có pointer event: detail = 0.
                onClick={(e) => e.detail === 0 && give(id, counter.id)}
                aria-label={`Đưa ${p.name}, giá ${state.prices[id]} ${BRAND.currency}, còn ${stock}`}
              >
                <span className="item-icon">
                  <ProductIcon id={id} size={30} />
                  <span className="item-stock">{stock}</span>
                </span>
                <span className="item-name">
                  {p.name}
                  {isTrending(state, id) && (
                    <small className="trend-tag">Bán chạy</small>
                  )}
                </span>
                <span className="item-price">
                  {state.prices[id]} {BRAND.currency}
                </span>
              </GameButton>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
