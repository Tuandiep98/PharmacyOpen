import {
  ARCHETYPES,
  PRODUCT_IDS,
  PRODUCTS,
  REFERRAL_MESSAGE,
  REQUESTS,
  type DeepReadonly,
  type SimState,
} from '@pharmacy/simulation';
import { BRAND } from '../../brand';
import { ClinicIcon } from '../../art/Icons';
import { ProductIcon } from '../../art/Products';
import { WorkerPortrait } from '../../art/WorkerFigure';
import { beginProductGesture } from '../../ui/drag';
import { useUi } from '../../ui/uiStore';
import { GameButton } from '../../ui/primitives';
import { Portrait } from './CustomerInfo';
import { PLAYER_WORKER_ID, useServiceActions } from './useServiceActions';

const WORKING_LABEL: Record<string, string> = {
  retrieving: 'đang lấy',
  checkingOut: 'Đang thanh toán…',
  referring: 'Đang giải thích cho khách…',
};

/**
 * Khay phục vụ luôn hiện dưới cảnh: khách ở quầy nói gì + dãy sản phẩm.
 * Kéo sản phẩm vào khách (hoặc chạm) là đưa hàng; không cần bước "bắt đầu phục vụ" riêng.
 */
export function ServiceTray({ state }: { state: DeepReadonly<SimState> }) {
  const { give, refer, restock, assignCounter } = useServiceActions();
  const dragging = useUi((s) => s.drag?.productId ?? null);
  const counter = state.counters[0]!;
  const player = state.workers[PLAYER_WORKER_ID]!;
  const operator = state.workers[counter.operatorId] ?? player;
  const playerOperates = operator.id === PLAYER_WORKER_ID;
  const staff = Object.values(state.workers).filter((w) => w.controller === 'ai');
  const customerId = counter.customerId;
  const customer = customerId ? state.customers[customerId] : undefined;
  const order = customer?.orderId ? state.orders[customer.orderId] : undefined;
  const server = order ? state.workers[order.workerId] : operator;
  const canServe =
    playerOperates &&
    !!customer &&
    (!order || (order.workerId === PLAYER_WORKER_ID && order.state === 'deciding')) &&
    (!player.orderId || player.orderId === order?.id);
  const ratio = customer ? customer.patienceMs / customer.patienceMaxMs : 0;

  let status: React.ReactNode;
  if (!customer) {
    status = (
      <span className="muted">
        {playerOperates ? 'Chưa có khách ở quầy — chuẩn bị kệ hàng nhé.' : `${operator.name} đang chờ khách ở quầy.`}
      </span>
    );
  } else if (order && order.state !== 'deciding' && order.state !== 'ready') {
    const label =
      order.state === 'retrieving' && order.productId
        ? `${server?.name ?? ''} ${WORKING_LABEL.retrieving} ${PRODUCTS[order.productId].name.toLowerCase()}…`
        : WORKING_LABEL[order.state] ?? '';
    const value = order.timerTotalMs > 0 ? 1 - order.timerMs / order.timerTotalMs : 1;
    status = (
      <div className="tray-progress" role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)}>
        <span>{label}</span>
        <span className="progress-track">
          <span className="progress-fill" style={{ width: `${value * 100}%` }} />
        </span>
      </div>
    );
  } else if (!playerOperates) {
    status = <span className="muted">{operator.name} đang phục vụ khách này…</span>;
  } else if (!canServe) {
    status = <span className="muted">Dược sĩ đang bận…</span>;
  } else {
    status = <span className="tray-hint">Kéo món vào khách, hoặc chạm để đưa</span>;
  }

  return (
    <section className="tray" aria-label="Quầy phục vụ">
      {staff.length > 0 && (
        <div className="tray-operator">
          <WorkerPortrait worker={operator} size={28} />
          <span>
            Quầy: <b>{playerOperates ? `${operator.name} (bạn)` : operator.name}</b>
          </span>
          {playerOperates ? (
            <GameButton size="small" onClick={() => assignCounter(staff[0]!.id)}>
              Giao cho {staff[0]!.name}
            </GameButton>
          ) : (
            <GameButton size="small" onClick={() => assignCounter(PLAYER_WORKER_ID)}>
              Tự phục vụ
            </GameButton>
          )}
        </div>
      )}
      <div className="tray-customer">
        {customer ? (
          <>
            <div className="tray-portrait">
              <Portrait customer={customer} size={52} />
              <span className="mini-patience" data-level={ratio > 0.5 ? 'ok' : ratio > 0.25 ? 'mid' : 'low'}>
                <span style={{ width: `${ratio * 100}%` }} />
              </span>
            </div>
            <div className="tray-speech">
              <span className="tray-who">{ARCHETYPES[customer.archetypeId].name}</span>
              <p>
                {order?.state === 'referring' ? REFERRAL_MESSAGE : `“${REQUESTS[customer.requestId]?.text ?? ''}”`}
              </p>
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
        {status}
        <GameButton className="refer" disabled={!canServe} onClick={refer} title="Khuyên khách đi khám">
          <ClinicIcon size={20} />
          <span>Khuyên đi khám</span>
        </GameButton>
      </div>

      <ul className="tray-items">
        {PRODUCT_IDS.map((id) => {
          const p = PRODUCTS[id];
          const stock = state.stock[id].shelf;
          if (stock === 0) {
            const affordable = Math.min(state.stock[id].capacity, Math.floor(state.money / p.cost));
            return (
              <li key={id}>
                <button className="item-chip empty" onClick={() => restock(id)} disabled={affordable === 0}>
                  <span className="item-icon faded">
                    <ProductIcon id={id} size={30} />
                  </span>
                  <span className="item-name">{p.name}</span>
                  <span className="item-restock">{affordable ? `+ Nhập ${affordable * p.cost} ${BRAND.currency}` : 'Thiếu xu'}</span>
                </button>
              </li>
            );
          }
          return (
            <li key={id}>
              <button
                className={`item-chip ${dragging === id ? 'lifted' : ''}`}
                disabled={!canServe}
                onPointerDown={(e) => canServe && beginProductGesture(e, id, { onDrop: give, onTap: give })}
                // Kích hoạt bằng bàn phím (Enter/Space) không có pointer event: detail = 0.
                onClick={(e) => e.detail === 0 && give(id)}
                aria-label={`Đưa ${p.name}, giá ${state.prices[id]} ${BRAND.currency}, còn ${stock}`}
              >
                <span className="item-icon">
                  <ProductIcon id={id} size={30} />
                  <span className="item-stock">{stock}</span>
                </span>
                <span className="item-name">{p.name}</span>
                <span className="item-price">
                  {state.prices[id]} {BRAND.currency}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
