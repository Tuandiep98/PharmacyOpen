import {
  isPresent,
  PRODUCTS,
  REQUESTS,
  type Customer,
  type DeepReadonly,
  type Order,
  type ProductId,
  type SimState,
  type Worker,
  type WorkerTask,
} from '@pharmacy/simulation';
import { useLayoutEffect, useRef, useState } from 'react';
import { BRAND } from '../../brand';
import { CustomerFigure } from '../../art/Character';
import { WorkerFigure } from '../../art/WorkerFigure';
import { Counter, Plant, QueueLane, Register, ShelfUnit, StoreSign, WallAndFloor } from '../../art/Furniture';
import { ART, INK } from '../../art/palette';
import { ProductArt } from '../../art/Products';
import { beginProductGesture } from '../../ui/drag';
import { useUi } from '../../ui/uiStore';
import { catalogPageProducts } from '../../ui/catalog';
import { PLAYER_WORKER_ID, useServiceActions } from './useServiceActions';

type State = DeepReadonly<SimState>;

// Bố cục cố định của cảnh (đơn vị viewBox). Hàng chờ nằm ngang bên trái quầy để cảnh thấp, gọn.
const SCENE_W = 360;
const SCENE_H = 420;
const COUNTER_SPOT = { x: 160, y: 392 };
const QUEUE_SPOTS = [112, 68, 24].map((x) => ({ x, y: 394 }));
const EXIT_SPOT = { x: 160, y: 470 };
export const REGISTER_SPOT = { x: 318, y: 246 };

// Vị trí nhân viên: đứng quầy, đứng chờ sau quầy, và ở kệ (đang bổ sung hàng). Không có đi bộ,
// chỉ trượt nhẹ giữa các vị trí khi đổi việc.
type Spot = { x: number; y: number; scale: number };
const SERVE_SPOT: Spot = { x: 268, y: 334, scale: 1 };
const BEHIND_SPOT: Spot = { x: 208, y: 336, scale: 0.92 };
const SHELF_SPOT: Spot = { x: 100, y: 296, scale: 0.85 };

function assignWorkerSpots(state: State): { worker: DeepReadonly<Worker>; spot: Spot }[] {
  const operatorId = state.counters[0]!.operatorId;
  // Người ngoài ca chỉ còn trong cảnh khi đang làm nốt việc dở.
  // Người đi trễ chưa tới thì chưa xuất hiện.
  const others = Object.values(state.workers).filter((w) => w.id !== operatorId && (isPresent(state, w) || !!w.orderId || !!w.task));
  // Người đang bổ sung kệ đứng ở kệ; người rảnh đứng sau quầy, người thứ hai đứng cạnh kệ.
  others.sort((a, b) => Number(!!b.task) - Number(!!a.task));
  const free = others[0]?.task ? [SHELF_SPOT, BEHIND_SPOT] : [BEHIND_SPOT, SHELF_SPOT];
  const result = others.map((worker, i) => ({ worker, spot: free[i] ?? SHELF_SPOT }));
  const operator = state.workers[operatorId];
  if (operator && (isPresent(state, operator) || operator.orderId)) result.push({ worker: operator, spot: SERVE_SPOT });
  return result;
}

interface SlotDef {
  x: number;
  base: number;
}
const SHELF_SLOTS: SlotDef[] = [
  { x: 74, base: 126 },
  { x: 180, base: 126 },
  { x: 286, base: 126 },
  { x: 74, base: 200 },
  { x: 180, base: 200 },
  { x: 286, base: 200 },
];

/** Khung cao hơn tỉ lệ cảnh thì nới phần tường lên trên, để quầy và khay luôn sát nhau. */
function useSceneViewBox() {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: SCENE_W, h: SCENE_H });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const vh = Math.max(SCENE_H, size.w > 0 ? (SCENE_W * size.h) / size.w : SCENE_H);
  return { ref, viewBox: `0 ${SCENE_H - vh} ${SCENE_W} ${vh}` };
}

export function StoreScene({ state }: { state: State }) {
  const { ref, viewBox } = useSceneViewBox();
  const selection = useUi((s) => s.selection);
  const select = useUi((s) => s.select);
  const drag = useUi((s) => s.drag);
  const catalogCategory = useUi((s) => s.catalogCategory);
  const catalogPage = useUi((s) => s.catalogPage);
  const visibleProducts = catalogPageProducts(catalogCategory, catalogPage);
  const { give } = useServiceActions();
  const counter = state.counters[0]!;
  const counterCustomerId = counter.customerId;
  const counterCustomer = counterCustomerId ? state.customers[counterCustomerId] : undefined;
  const counterOrder = counterCustomer?.orderId ? state.orders[counterCustomer.orderId] : undefined;
  const playerOperates = counter.operatorId === PLAYER_WORKER_ID;
  const workerSpots = assignWorkerSpots(state);

  const spotOf = (c: DeepReadonly<Customer>) => {
    if (c.phase === 'counter') return { ...COUNTER_SPOT, scale: 1, hidden: false };
    if (c.phase === 'leaving') return { ...EXIT_SPOT, scale: 0.9, hidden: false };
    const index = state.queue.indexOf(c.id);
    const spot = QUEUE_SPOTS[index];
    return spot ? { ...spot, scale: 0.78, hidden: false } : { x: -40, y: 394, scale: 0.78, hidden: true };
  };

  // Vẽ khách xa quầy trước, khách ở quầy sau cùng để không bị che.
  const depth = (c: DeepReadonly<Customer>) => (c.phase === 'leaving' ? 0 : c.phase === 'counter' ? 100 : 50 - state.queue.indexOf(c.id));
  const customers = Object.values(state.customers).sort((a, b) => depth(a) - depth(b));
  const overflow = Math.max(0, state.queue.length - QUEUE_SPOTS.length);

  return (
    <svg
      ref={ref}
      className={`scene ${drag ? 'dragging' : ''}`}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMax meet"
      role="application"
      aria-label="Cửa hàng"
    >
      <WallAndFloor />
      <StoreSign name={BRAND.name} />
      <ShelfUnit />
      {SHELF_SLOTS.map((slot, index) => {
        const id = visibleProducts[index];
        return id ? (
          <ShelfSlot
            key={`${index}-${id}`}
            productId={id}
            x={slot.x}
            base={slot.base}
            count={state.stock[id].shelf}
            capacity={state.stock[id].capacity}
            selected={selection?.kind === 'product' && selection.id === id}
            onPointerDown={(e) =>
              beginProductGesture(e, id, {
                onDrop: give,
                onTap: (productId) => select({ kind: 'product', id: productId }),
                draggable: state.stock[id].shelf > 0,
              })
            }
          />
        ) : (
          <EmptySlot key={`empty-${index}`} x={slot.x} base={slot.base} />
        );
      })}
      <Plant x={30} y={296} />

      {workerSpots.map(({ worker, spot }) => (
        <g
          key={worker.id}
          className="actor tappable"
          style={{ transform: `translate(${spot.x}px, ${spot.y}px) scale(${spot.scale})` }}
          onClick={() => select({ kind: 'worker', id: worker.id })}
        >
          {selection?.kind === 'worker' && selection.id === worker.id && (
            <ellipse className="select-ring" cx={0} cy={-60} rx={30} ry={36} fill="none" />
          )}
          <g className="bob">
            <WorkerFigure worker={worker} />
          </g>
          <rect x={-30} y={-110} width={60} height={spot.scale < 1 ? 112 : 60} fill="transparent" />
        </g>
      ))}
      <Counter />
      <Register active={counterOrder?.state === 'checkingOut'} />
      {workerSpots.map(({ worker, spot }) => (
        <WorkerBubble
          key={worker.id}
          x={spot.x}
          y={spot.y - 104 * spot.scale}
          order={worker.orderId ? state.orders[worker.orderId] : undefined}
          task={worker.task}
          waiting={worker.id === counter.operatorId && !worker.orderId && !!counterCustomer && !counterCustomer.orderId}
        />
      ))}

      <QueueLane />
      {overflow > 0 && (
        <g transform="translate(4 300)">
          <rect width={30} height={18} rx={9} fill="#FFFFFF" stroke={INK} strokeWidth={1.4} />
          <text x={15} y={13} textAnchor="middle" fontSize={11} fontWeight={900} fill={INK}>
            +{overflow}
          </text>
        </g>
      )}
      {customers.map((c) => {
        const spot = spotOf(c);
        const atCounter = c.phase === 'counter';
        const isSelected = selection?.kind === 'customer' && selection.id === c.id;
        // Chỉ nhận thả hàng khi người chơi đang đứng quầy và khách chưa có ai khác phục vụ.
        const awaiting =
          atCounter &&
          playerOperates &&
          (!c.orderId || (counterOrder?.workerId === PLAYER_WORKER_ID && counterOrder.state === 'deciding'));
        return (
          <g
            key={c.id}
            className={`actor ${c.phase === 'leaving' || spot.hidden ? 'leaving' : 'tappable'}`}
            style={{ transform: `translate(${spot.x}px, ${spot.y}px) scale(${spot.scale})` }}
            onClick={c.phase === 'queue' ? () => select({ kind: 'customer', id: c.id }) : undefined}
            {...(atCounter && awaiting ? { 'data-drop-target': 'counter-customer' } : {})}
          >
            <g className="enter">
              {atCounter && awaiting && (
                <ellipse
                  className={drag ? (drag.over ? 'drop-over' : 'drop-ready') : 'tap-hint'}
                  cx={0}
                  cy={-50}
                  rx={44}
                  ry={62}
                />
              )}
              {isSelected && <ellipse className="select-ring" cx={0} cy={0} rx={30} ry={8} fill="none" />}
              <g className="bob">
                <CustomerFigure look={c.look} expression={c.expression} />
              </g>
              {c.phase !== 'leaving' && <PatienceBar ratio={c.patienceMs / c.patienceMaxMs} />}
              <rect x={-36} y={-116} width={72} height={126} fill="transparent" />
            </g>
          </g>
        );
      })}
      {counterCustomer && <RequestBubble customer={counterCustomer} order={counterOrder} />}
      <Floaters />
    </svg>
  );
}

function Floaters() {
  const floaters = useUi((s) => s.floaters);
  const drop = useUi((s) => s.dropFloater);
  return (
    <g pointerEvents="none">
      {floaters.map((f) => (
        <text
          key={f.id}
          className="floater"
          x={f.x}
          y={f.y}
          textAnchor="middle"
          fontSize={16}
          fontWeight={900}
          fill={ART.honey}
          stroke="#FFFFFF"
          strokeWidth={4}
          paintOrder="stroke"
          onAnimationEnd={() => drop(f.id)}
        >
          {f.text}
        </text>
      ))}
    </g>
  );
}

function ShelfSlot(props: {
  productId: ProductId;
  x: number;
  base: number;
  count: number;
  capacity: number;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const { productId, x, base, count, capacity, selected, onPointerDown } = props;
  const cap = capacity;
  const shown = Math.min(count, 3);
  const scale = 0.9;
  const w = 40 * scale;
  const h = 48 * scale;
  const low = count > 0 && count <= 1;
  return (
    <g
      className={`tappable shelf-slot ${count > 0 ? 'draggable' : ''}`}
      onPointerDown={onPointerDown}
      role="button"
      aria-label={`${PRODUCTS[productId].name}: còn ${count}/${cap}. Kéo vào khách để đưa hàng, chạm để xem chi tiết.`}
    >
      <rect x={x - 50} y={base - 60} width={100} height={62} rx={6} fill={selected ? 'rgba(126,214,181,0.35)' : 'transparent'} />
      {count === 0 && (
        <g opacity={0.25}>
          <ProductArt id={productId} x={x - w / 2} y={base - h - 1} scale={scale} />
        </g>
      )}
      {Array.from({ length: shown }, (_, i) => (
        <ProductArt key={i} id={productId} x={x - w / 2 + (i - (shown - 1) / 2) * 28} y={base - h - 1} scale={scale} />
      ))}
      <g transform={`translate(${x + 26} ${base - 58})`}>
        <rect
          x={0}
          y={0}
          width={count === 0 ? 34 : 26}
          height={15}
          rx={7.5}
          fill={count === 0 ? ART.coral : low ? ART.honey : ART.paper}
          stroke={INK}
          strokeWidth={1.4}
        />
        <text x={count === 0 ? 17 : 13} y={11} textAnchor="middle" fontSize={10} fontWeight={900} fill={count === 0 ? '#FFFFFF' : INK}>
          {count === 0 ? 'HẾT' : low ? `!${count}` : count}
        </text>
      </g>
    </g>
  );
}

function EmptySlot({ x, base }: { x: number; base: number }) {
  return (
    <g opacity={0.45}>
      <rect x={x - 44} y={base - 58} width={88} height={40} rx={6} fill="none" stroke="#C9B49A" strokeWidth={1.6} strokeDasharray="5 4" />
      <text x={x} y={base - 25} textAnchor="middle" fontSize={9} fontWeight={800} fill="#8C7A66">
        TRỐNG
      </text>
    </g>
  );
}

function PatienceBar({ ratio }: { ratio: number }) {
  const r = Math.max(0, Math.min(1, ratio));
  const color = r > 0.5 ? '#58C68A' : r > 0.25 ? '#FFC94D' : '#F2665E';
  return (
    <g transform="translate(-24 8)">
      <rect x={0} y={0} width={48} height={7} rx={3.5} fill={ART.paper} stroke={INK} strokeWidth={1.3} />
      <rect className="bar-fill" x={1} y={1} width={46 * r} height={5} rx={2.5} fill={color} />
      {r <= 0.25 && (
        <text x={54} y={7} fontSize={10} fontWeight={900} fill="#D64545">
          !
        </text>
      )}
    </g>
  );
}

function Bubble({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: React.ReactNode }) {
  return (
    <g transform={`translate(${x - w / 2} ${y - h})`} className="bubble" pointerEvents="none">
      <path
        d={`M8,0 H${w - 8} Q${w},0 ${w},8 V${h - 8} Q${w},${h} ${w - 8},${h} H${w / 2 + 6} L${w / 2},${h + 7} L${w / 2 - 6},${h} H8 Q0,${h} 0,${h - 8} V8 Q0,0 8,0 Z`}
        fill={ART.paper}
        stroke={INK}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {children}
    </g>
  );
}

function RequestBubble({ customer, order }: { customer: DeepReadonly<Customer>; order: DeepReadonly<Order> | undefined }) {
  const request = REQUESTS[customer.requestId];
  if (!request) return null;
  if (order && order.customerId === customer.id && order.state !== 'deciding') return null;
  const x = COUNTER_SPOT.x;
  const y = COUNTER_SPOT.y - 116;
  const w = 46;
  const h = 38;
  let content: React.ReactNode;
  if (request.kind === 'named' && request.acceptable[0]) {
    content = <ProductArt id={request.acceptable[0]} x={w / 2 - 13} y={4} scale={0.62} />;
  } else if (request.kind === 'need') {
    content = (
      <text x={w / 2} y={29} textAnchor="middle" fontSize={26} fontWeight={900} fill={ART.leaf}>
        ?
      </text>
    );
  } else {
    // Khách thấy không khoẻ: hiện "…" và giọt mồ hôi, không gợi ý sản phẩm nào.
    content = (
      <g>
        <text x={w / 2 - 4} y={25} textAnchor="middle" fontSize={20} fontWeight={900} fill="#7FA7D9">
          …
        </text>
        <path d={`M${w - 11},10 q-4,6 0,8 q4,-2 0,-8z`} fill="#8FD0FF" stroke={INK} strokeWidth={1.1} />
      </g>
    );
  }
  return (
    <Bubble x={x} y={y} w={w} h={h}>
      {content}
    </Bubble>
  );
}

function WorkerBubble(props: {
  x: number;
  y: number;
  order: DeepReadonly<Order> | undefined;
  task: DeepReadonly<WorkerTask> | null;
  waiting: boolean;
}) {
  const { x, y, order, task, waiting } = props;
  if (!order && task?.kind === 'slack') {
    // "Siêu lười": cầm điện thoại, thanh tiến độ là thời gian lướt.
    const progress = task.timerTotalMs > 0 ? 1 - task.timerMs / task.timerTotalMs : 1;
    return (
      <Bubble x={x} y={y} w={40} h={40}>
        <rect x={13} y={5} width={14} height={22} rx={3} fill={ART.sky} stroke={INK} strokeWidth={1.4} />
        <path d="M17,10 H23 M17,14 H23 M17,18 H21" stroke={INK} strokeWidth={1.1} strokeLinecap="round" />
        <g transform="translate(6 31)">
          <rect x={0} y={0} width={28} height={5} rx={2.5} fill={ART.mint} />
          <rect className="bar-fill" x={0} y={0} width={28 * progress} height={5} rx={2.5} fill={ART.coral} />
        </g>
      </Bubble>
    );
  }
  if (!order && task?.kind === 'restock') {
    // Đang bổ sung kệ: hộp hàng + món cần bổ sung + thanh tiến độ.
    const progress = task.timerTotalMs > 0 ? 1 - task.timerMs / task.timerTotalMs : 1;
    return (
      <Bubble x={x} y={y} w={52} h={40}>
        <g transform="translate(5 6)">
          <path d="M1,6 L9,2 L17,6 V15 L9,19 L1,15 Z" fill="#F2C48D" stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
          <path d="M1,6 L9,10 L17,6 M9,10 V19" fill="none" stroke={INK} strokeWidth={1.1} />
        </g>
        <ProductArt id={task.productId} x={25} y={3} scale={0.46} />
        <g transform="translate(6 31)">
          <rect x={0} y={0} width={40} height={5} rx={2.5} fill={ART.mint} />
          <rect className="bar-fill" x={0} y={0} width={40 * progress} height={5} rx={2.5} fill={ART.honey} />
        </g>
      </Bubble>
    );
  }
  if (!order) {
    if (!waiting) return null;
    return (
      <Bubble x={x} y={y} w={30} h={28}>
        <text x={15} y={22} textAnchor="middle" fontSize={20} fontWeight={900} fill="#F2994A">
          !
        </text>
      </Bubble>
    );
  }
  const timed = order.state === 'retrieving' || order.state === 'checkingOut' || order.state === 'referring';
  const progress = timed && order.timerTotalMs > 0 ? 1 - order.timerMs / order.timerTotalMs : 1;
  let icon: React.ReactNode = null;
  if (order.state === 'deciding') {
    icon = (
      <text x={26} y={25} textAnchor="middle" fontSize={18} fontWeight={900} fill={INK}>
        ?
      </text>
    );
  } else if (order.state === 'referring') {
    icon = (
      <g transform="translate(14 5)">
        <path d="M2,20 V9 L12,3 L22,9 V20 Z" fill="#DDEBFF" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
        <path d="M9,20 V14 H15 V20" fill="none" stroke={INK} strokeWidth={1.5} />
      </g>
    );
  } else if (order.state === 'checkingOut') {
    icon = (
      <g transform="translate(15 5)">
        <circle cx={11} cy={11} r={9} fill="#FFD66B" stroke={INK} strokeWidth={1.5} />
        <path d="M11,7 V15" stroke={INK} strokeWidth={1.8} />
      </g>
    );
  } else if (order.productId) {
    icon = <ProductArt id={order.productId} x={14} y={2} scale={0.5} />;
  }
  return (
    <Bubble x={x} y={y} w={52} h={40}>
      {icon}
      {timed && (
        <g transform="translate(6 31)">
          <rect x={0} y={0} width={40} height={5} rx={2.5} fill={ART.mint} />
          <rect className="bar-fill" x={0} y={0} width={40 * progress} height={5} rx={2.5} fill={ART.leaf} />
        </g>
      )}
    </Bubble>
  );
}
