import {
  customerName,
  dayPhase,
  facilityLevel,
  itemAt,
  isPresent,
  isTrending,
  PRODUCTS,
  type Customer,
  type DeepReadonly,
  type ProductId,
  type SimState,
  type Worker,
} from "@pharmacy/simulation";
import { memo, useLayoutEffect, useRef, useState } from "react";
import { useBrandIdentity } from "../../brand";
import { CustomerFigure } from "../../art/Character";
import { WorkerFigure, wornItemOf } from "../../art/WorkerFigure";
import { CollectibleArt } from "../../art/Collectibles";
import {
  Counter,
  CounterScanner,
  ExpandedStore,
  Plant,
  QueueLane,
  Register,
  ShelfUnit,
  shelfWidth,
  StoreSign,
  WaitingBench,
  WallAndFloor,
} from "../../art/Furniture";
import { ART, INK } from "../../art/palette";
import { ProductArt } from "../../art/Products";
import { beginProductGesture } from "../../ui/drag";
import { useUi } from "../../ui/uiStore";
import { catalogPageProducts, catalogPageSize } from "../../ui/catalog";
import { useServiceActions } from "./useServiceActions";
import { SceneOverlay, type OverlayItem } from "./SceneOverlay";
import { customerLine, customerNeed, familiarity, staffLine } from "./dialogue";
import { customerAction, workerAction } from "./idleActions";
import { PLAYER_WORKER_ID } from "@pharmacy/simulation";
import "./scene.css";

type State = DeepReadonly<SimState>;

/*
 * Bố cục cảnh (đơn vị viewBox, cao 420). Mọi vị trí suy ra từ `sceneLayout` theo số quầy, nên kệ,
 * bảng hiệu, quầy, người đứng quầy và khách luôn khớp nhau ở mọi kích thước màn hình (SVG co giãn
 * nguyên khối). Hàng chờ nằm bên trái; khách của mỗi quầy đứng ngay bên trái quầy đó.
 */
const SCENE_H = 420;
const QUEUE_SPOTS = [112, 68, 24].map((x) => ({ x, y: 394 }));
/** Chiều cao nhân vật tính từ chân tới đỉnh đầu (đơn vị cảnh, trước khi nhân scale). */
const FIGURE_TOP = 110;

// These parts only change when their primitive props change, not on every simulation tick.
const StaticHighlightDefs = memo(HighlightDefs);
const StaticWallAndFloor = memo(WallAndFloor);
const StaticExpandedStore = memo(ExpandedStore);
const StaticStoreSign = memo(StoreSign);
const StaticShelfUnit = memo(ShelfUnit);
const StaticPlant = memo(Plant);
const StaticWaitingBench = memo(WaitingBench);
const StaticCounter = memo(Counter);
const StaticCounterScanner = memo(CounterScanner);
const StaticQueueLane = memo(QueueLane);

type Spot = { x: number; y: number; scale: number };

export interface CounterLayout {
  x: number;
  w: number;
  serve: Spot;
  customer: { x: number; y: number };
  register: number;
}

export interface SceneLayout {
  width: number;
  shelfCx: number;
  counters: CounterLayout[];
}

export function sceneLayout(counterCount: number): SceneLayout {
  const two = counterCount > 1;
  const width = two ? 566 : 360;
  const boxes = two
    ? [
        { x: 190, w: 150 },
        { x: 406, w: 150 },
      ]
    : [{ x: 196, w: 162 }];
  return {
    width,
    shelfCx: two ? width / 2 : 180,
    counters: boxes.map(({ x, w }) => ({
      x,
      w,
      // Người đứng quầy lệch trái, máy quét + máy tính tiền dồn về đầu phải để không che mặt.
      serve: { x: Math.round(x + w * 0.3), y: 334, scale: 1 },
      customer: { x: x - 36, y: 392 },
      register: x + w - 48,
    })),
  };
}

/** Chỗ tiền bay lên khi bán xong ở một quầy (dùng cho hiệu ứng "+xu"). */
export function registerSpot(counterIndex: number, counterCount: number) {
  const counter =
    sceneLayout(counterCount).counters[counterIndex] ??
    sceneLayout(counterCount).counters[0]!;
  return { x: counter.register + 22, y: 246 };
}

/**
 * Người đứng quầy đứng sau quầy; những người còn lại đứng thành hàng trước kệ (lấy hàng, gói đơn,
 * chờ việc), tránh chỗ ngay sau quầy để không đè lên người đứng quầy. Thứ tự theo id nên không nhảy chỗ.
 */
function assignWorkerSpots(
  state: State,
  layout: SceneLayout,
  shelfLevel: number,
): { worker: DeepReadonly<Worker>; spot: Spot; counterIndex: number }[] {
  const visible = (w: DeepReadonly<Worker>) =>
    isPresent(state, w) || !!w.orderId || !!w.task;
  const result: {
    worker: DeepReadonly<Worker>;
    spot: Spot;
    counterIndex: number;
  }[] = [];
  const operatorIds = new Set<string>();
  state.counters.forEach((counter, index) => {
    const operator = counter.operatorId
      ? state.workers[counter.operatorId]
      : undefined;
    if (operator && visible(operator)) {
      operatorIds.add(operator.id);
      result.push({
        worker: operator,
        spot: layout.counters[index]!.serve,
        counterIndex: index,
      });
    }
  });
  const half = shelfWidth(shelfLevel) / 2 - 24;
  const spots: Spot[] = [];
  for (let x = layout.shelfCx - half; x <= layout.shelfCx + half; x += 52) {
    if (layout.counters.some((c) => Math.abs(c.serve.x - x) < 58)) continue;
    spots.push({ x, y: 300, scale: 0.85 });
  }
  for (const spot of [...spots])
    spots.push({ x: spot.x + 28, y: 314, scale: 0.88 });
  const others = Object.values(state.workers)
    .filter((w) => !operatorIds.has(w.id) && visible(w))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  others.forEach((worker, i) =>
    result.unshift({
      worker,
      spot: spots[i] ?? spots[0] ?? { x: 60, y: 300, scale: 0.85 },
      counterIndex: -1,
    }),
  );
  return result;
}

interface SlotDef {
  x: number;
  base: number;
}
function shelfSlots(count: number, cx: number): SlotDef[] {
  const columns = count / 2;
  const width = columns === 2 ? 256 : columns === 3 ? 314 : 332;
  return Array.from({ length: count }, (_, index) => ({
    x: cx - width / 2 + (width * ((index % columns) + 0.5)) / columns,
    base: index < columns ? 126 : 200,
  }));
}

/** Khung cao hơn tỉ lệ cảnh thì nới phần tường lên trên, để quầy và khay luôn sát nhau. */
function useSceneViewBox(sceneWidth: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: sceneWidth, h: SCENE_H });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry)
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const vh = Math.max(
    SCENE_H,
    size.w > 0 ? (sceneWidth * size.h) / size.w : SCENE_H,
  );
  const vy = SCENE_H - vh;
  // preserveAspectRatio="xMidYMax meet": đổi toạ độ cảnh sang pixel cho lớp chữ phủ lên trên.
  const scale = Math.min(size.w / sceneWidth, size.h / vh) || 1;
  const offsetX = (size.w - sceneWidth * scale) / 2;
  const offsetY = size.h - vh * scale;
  const toPx = (x: number, y: number) => ({
    x: offsetX + x * scale,
    y: offsetY + (y - vy) * scale,
  });
  return { ref, viewBox: `0 ${vy} ${sceneWidth} ${vh}`, toPx, scale, size };
}

export function StoreScene({
  state,
  paused = false,
}: {
  state: State;
  paused?: boolean;
}) {
  const brandIdentity = useBrandIdentity();
  const layout = sceneLayout(state.counters.length);
  const { ref, viewBox, toPx, scale, size } = useSceneViewBox(layout.width);
  const activeCounterId = useUi((s) => s.activeCounterId);
  const selection = useUi((s) => s.selection);
  const select = useUi((s) => s.select);
  const setActiveCounterId = useUi((s) => s.setActiveCounterId);
  const drag = useUi((s) => s.drag);
  const catalogCategory = useUi((s) => s.catalogCategory);
  const catalogPage = useUi((s) => s.catalogPage);
  const visibleProducts = catalogPageProducts(
    catalogCategory,
    catalogPage,
    state,
  );
  const slots = shelfSlots(catalogPageSize(state), layout.shelfCx);
  const cellWidth =
    (slots.length === 4 ? 256 : slots.length === 6 ? 314 : 332) /
    (slots.length / 2);
  const ownedLevel = (base: string) =>
    state.upgrades.filter((id) => id === base || id.startsWith(`${base}-`))
      .length;
  const shelfLevel = facilityLevel(state, "wide-shelf");
  const { give } = useServiceActions();
  const counterOfCustomer = (customerId: string) =>
    state.counters.findIndex((c) => c.customerId === customerId);
  const workerSpots = assignWorkerSpots(state, layout, shelfLevel);
  const exit = { x: layout.counters[0]!.customer.x, y: 470 };

  const spotOf = (c: DeepReadonly<Customer>) => {
    if (c.phase === "counter") {
      const at =
        layout.counters[Math.max(0, counterOfCustomer(c.id))]!.customer;
      return { ...at, scale: 1, hidden: false, seated: false };
    }
    if (c.phase === "leaving")
      return { ...exit, scale: 0.9, hidden: false, seated: false };
    const index = state.queue.indexOf(c.id);
    const benchLevel = ownedLevel("bench");
    if (index >= 0 && index < Math.min(benchLevel, 2))
      return {
        x: index === 0 ? 45 : 98,
        y: 354,
        scale: 0.72,
        hidden: false,
        seated: true,
      };
    const spot = QUEUE_SPOTS[index];
    return spot
      ? { ...spot, scale: 0.78, hidden: false, seated: false }
      : { x: -40, y: 394, scale: 0.78, hidden: true, seated: false };
  };

  // Vẽ khách xa quầy trước, khách ở quầy sau cùng để không bị che.
  const depth = (c: DeepReadonly<Customer>) =>
    c.phase === "leaving"
      ? 0
      : c.phase === "counter"
        ? 100
        : 50 - state.queue.indexOf(c.id);
  const customers = Object.values(state.customers).sort(
    (a, b) => depth(a) - depth(b),
  );
  const overflow = Math.max(0, state.queue.length - QUEUE_SPOTS.length);
  const checkingOut = (counterIndex: number) => {
    const id = state.counters[counterIndex]?.customerId;
    const customer = id ? state.customers[id] : undefined;
    return customer?.orderId
      ? state.orders[customer.orderId]?.state === "checkingOut"
      : false;
  };

  // Hai quầy trên màn hẹp: lời thoại đầy đủ chỉ ở quầy đang chọn, quầy kia hiện gọn để không chồng chữ.
  const roomy = layout.counters.length === 1 || 200 * scale >= 230;
  const overlay: OverlayItem[] = [];
  const headAt = (spot: { x: number; y: number }, s: number) =>
    toPx(spot.x, spot.y - FIGURE_TOP * s);

  for (const { worker, spot, counterIndex } of workerSpots) {
    const counter =
      counterIndex >= 0 ? state.counters[counterIndex] : undefined;
    const customer = counter?.customerId
      ? state.customers[counter.customerId]
      : undefined;
    const order = customer?.orderId
      ? state.orders[customer.orderId]
      : undefined;
    const line = counter ? staffLine(state, worker, customer, order) : null;
    const waiting =
      !!counter &&
      !!customer &&
      !customer.orderId &&
      worker.controller === "ai";
    overlay.push({
      key: `w-${worker.id}`,
      at: headAt(spot, spot.scale),
      tag: {
        text: worker.name.split(" ").pop() || worker.name,
        kind: worker.id === PLAYER_WORKER_ID ? "player" : worker.role,
      },
      bubble: line
        ? {
            ...line,
            speaker: "staff",
            compact: !roomy && counter?.id !== activeCounterId,
          }
        : worker.task
          ? { speaker: "task", task: worker.task, compact: true }
          : waiting
            ? { speaker: "staff", text: "!", compact: true, mood: "urgent" }
            : undefined,
    });
  }
  for (const c of customers) {
    const spot = spotOf(c);
    if (spot.hidden) continue;
    const name = customerName(state, c);
    const index = counterOfCustomer(c.id);
    const order = c.orderId ? state.orders[c.orderId] : undefined;
    const operatorId = index >= 0 ? state.counters[index]?.operatorId : null;
    const line =
      c.phase === "queue"
        ? null
        : customerLine(
            state,
            c,
            order,
            operatorId ? state.workers[operatorId] : undefined,
          );
    const need = c.phase === "counter" ? customerNeed(c) : null;
    overlay.push({
      key: `c-${c.id}`,
      at: headAt(spot, spot.scale * (spot.seated ? 0.85 : 1)),
      // Khách thân (ghé từ 3 lần) có bảng tên đậm màu hơn khách mới quen.
      tag: name
        ? {
            text: name,
            kind: familiarity(state, c) === "close" ? "loyal" : "regular",
          }
        : undefined,
      bubble:
        line || need
          ? {
              text: "",
              ...line,
              need,
              speaker: "customer",
              compact:
                (c.phase === "counter" &&
                  !roomy &&
                  state.counters[index]?.id !== activeCounterId) ||
                !line,
            }
          : undefined,
      fading: c.phase === "leaving",
    });
  }

  return (
    <>
      <svg
        ref={ref}
        className={`scene ${drag ? "dragging" : ""}`}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMax meet"
        role="application"
        aria-label="Cửa hàng"
      >
        <StaticHighlightDefs />
        <StaticWallAndFloor />
        <StaticExpandedStore
          warehouseLevel={facilityLevel(state, "warehouse")}
          storeLevel={facilityLevel(state, "storefront")}
          width={layout.width}
        />
        <StaticStoreSign
          name={brandIdentity.name}
          avatar={brandIdentity.avatar}
          cx={layout.shelfCx}
          width={Math.max(256, shelfWidth(shelfLevel))}
          level={ownedLevel("signboard")}
          phase={paused ? "paused" : dayPhase(state)}
        />
        <StaticShelfUnit
          level={shelfLevel}
          sorted={state.upgrades.includes("sorted-shelf")}
          cx={layout.shelfCx}
        />
        {slots.map((slot, index) => {
          const id = visibleProducts[index];
          return id ? (
            <ShelfSlot
              key={`${index}-${id}`}
              productId={id}
              x={slot.x}
              base={slot.base}
              cellWidth={cellWidth}
              count={state.stock[id].shelf}
              capacity={state.stock[id].capacity}
              trending={isTrending(state, id)}
              selected={selection?.kind === "product" && selection.id === id}
              onPointerDown={(e) =>
                beginProductGesture(e, id, {
                  onDrop: give,
                  onTap: (productId) =>
                    select({ kind: "product", id: productId }),
                  draggable: state.stock[id].shelf > 0,
                })
              }
            />
          ) : (
            <EmptySlot
              key={`empty-${index}`}
              x={slot.x}
              base={slot.base}
              cellWidth={cellWidth}
            />
          );
        })}
        <StaticPlant x={30} y={296} />
        <StaticWaitingBench level={ownedLevel("bench")} />

        {workerSpots.map(({ worker, spot }) => {
          const selected =
            selection?.kind === "worker" && selection.id === worker.id;
          const action = workerAction(worker, state.timeMs);
          return (
            <g
              key={worker.id}
              className="actor tappable"
              style={{
                transform: `translate(${spot.x}px, ${spot.y}px) scale(${spot.scale})`,
              }}
              onClick={() => select({ kind: "worker", id: worker.id })}
            >
              <g className="bob">
                {selected && (
                  <g className="hl-underlay" filter="url(#fx-ring-gold)">
                    <WorkerFigure
                      worker={worker}
                      action={action}
                      accessory={wornItemOf(state, worker.id)}
                    />
                  </g>
                )}
                <WorkerFigure
                  worker={worker}
                  action={action}
                  accessory={wornItemOf(state, worker.id)}
                />
              </g>
              <rect
                x={-30}
                y={-110}
                width={60}
                height={spot.scale < 1 ? 112 : 60}
                fill="transparent"
              />
            </g>
          );
        })}

        {layout.counters.map((c, index) => {
          const counter = state.counters[index];
          if (!counter) return null;
          const active =
            layout.counters.length > 1 && counter.id === activeCounterId;
          return (
            <g key={counter.id}>
              {active && (
                <g className="hl-underlay" filter="url(#fx-ring-gold)">
                  <StaticCounter x={c.x} w={c.w} label={`QUẦY ${index + 1}`} />
                </g>
              )}
              <StaticCounter x={c.x} w={c.w} label={`QUẦY ${index + 1}`} />
              <StaticCounterScanner
                level={ownedLevel("scanner")}
                x={c.register - 86}
              />
              <Register x={c.register} active={checkingOut(index)} />
              <CounterHitArea
                x={c.x}
                w={c.w}
                label={`Quầy ${index + 1}`}
                unstaffed={!counter.operatorId}
                onSelect={() => {
                  setActiveCounterId(counter.id);
                  select({ kind: "counter", id: counter.id });
                }}
              />
            </g>
          );
        })}

        <SceneDecor state={state} layout={layout} shelfLevel={shelfLevel} />
        <StaticQueueLane />
        {overflow > 0 && (
          <g transform="translate(4 300)">
            <rect
              width={30}
              height={18}
              rx={9}
              fill="#FFFFFF"
              stroke={INK}
              strokeWidth={1.4}
            />
            <text
              x={15}
              y={13}
              textAnchor="middle"
              fontSize={11}
              fontWeight={900}
              fill={INK}
            >
              +{overflow}
            </text>
          </g>
        )}
        {customers.map((c) => {
          const spot = spotOf(c);
          const atCounter = c.phase === "counter";
          const isSelected =
            selection?.kind === "customer" && selection.id === c.id;
          // Chỉ nhận thả hàng khi người chơi đang đứng quầy và khách chưa có ai khác phục vụ.
          const index = counterOfCustomer(c.id);
          const assignedCounter =
            index >= 0 ? state.counters[index] : undefined;
          const customerOrder = c.orderId ? state.orders[c.orderId] : undefined;
          const awaiting =
            atCounter &&
            assignedCounter?.operatorId === PLAYER_WORKER_ID &&
            (!c.orderId ||
              (customerOrder?.workerId === PLAYER_WORKER_ID &&
                customerOrder.state === "deciding"));
          const hovered = !!drag && drag.target === assignedCounter?.id;
          const ring = hovered
            ? "fx-ring-gold"
            : awaiting
              ? "fx-ring-mint"
              : isSelected
                ? "fx-ring-gold"
                : null;
          const seated = "seated" in spot && spot.seated;
          const action = customerAction(c, state.timeMs);
          return (
            <g
              key={c.id}
              className={`actor ${c.phase === "leaving" || spot.hidden ? "leaving" : "tappable"}`}
              style={{
                transform: `translate(${spot.x}px, ${spot.y}px) scale(${spot.scale * (hovered ? 1.06 : 1)})`,
              }}
              onClick={
                c.phase === "queue"
                  ? () => select({ kind: "customer", id: c.id })
                  : atCounter && assignedCounter
                    ? () => setActiveCounterId(assignedCounter.id)
                    : undefined
              }
              {...(awaiting && assignedCounter
                ? { "data-drop-target": assignedCounter.id }
                : {})}
            >
              <g className="enter">
                <g className="bob">
                  {ring && c.phase !== "leaving" && (
                    <g
                      className={`hl-underlay ${awaiting && !hovered ? (drag ? "hl-pulse-fast" : "hl-pulse") : ""}`}
                      filter={`url(#${ring})`}
                    >
                      <CustomerFigure
                        look={c.look}
                        expression={c.expression}
                        seated={seated}
                        action={action}
                      />
                    </g>
                  )}
                  <CustomerFigure
                    look={c.look}
                    expression={c.expression}
                    seated={seated}
                    action={action}
                  />
                </g>
                {c.phase !== "leaving" && (
                  <PatienceBar ratio={c.patienceMs / c.patienceMaxMs} />
                )}
                <rect
                  x={-36}
                  y={-116}
                  width={72}
                  height={126}
                  fill="transparent"
                />
              </g>
            </g>
          );
        })}
        <Floaters />
      </svg>
      <SceneOverlay items={overlay} width={size.w} />
    </>
  );
}

/**
 * Viền nổi bật ôm sát hình (không phải elip rời): nở alpha của hình ra vài đơn vị, tô màu,
 * thêm viền trắng mảnh bên trong và quầng sáng, vẽ dưới hình gốc. Vàng = đang chọn / thả vào đây,
 * xanh bạc hà = có thể thả hàng hoặc chạm để phục vụ.
 */
function HighlightDefs() {
  const ring = (id: string, color: string, glow: string) => (
    <filter
      id={id}
      x="-30%"
      y="-30%"
      width="160%"
      height="160%"
      colorInterpolationFilters="sRGB"
    >
      <feMorphology
        in="SourceAlpha"
        operator="dilate"
        radius={5}
        result="outer"
      />
      <feFlood floodColor={color} />
      <feComposite in2="outer" operator="in" result="band" />
      <feMorphology
        in="SourceAlpha"
        operator="dilate"
        radius={2}
        result="inner"
      />
      <feFlood floodColor="#FFFFFF" />
      <feComposite in2="inner" operator="in" result="white" />
      <feMorphology
        in="SourceAlpha"
        operator="dilate"
        radius={7}
        result="halo"
      />
      <feGaussianBlur in="halo" stdDeviation={4} result="soft" />
      <feFlood floodColor={glow} />
      <feComposite in2="soft" operator="in" result="glow" />
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="band" />
        <feMergeNode in="white" />
      </feMerge>
    </filter>
  );
  return (
    <defs>
      {ring("fx-ring-gold", "#FFB320", "rgba(255, 179, 32, 0.55)")}
      {ring("fx-ring-mint", "#1FC98A", "rgba(31, 201, 138, 0.5)")}
      <linearGradient id="fx-badge-hot" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#FF9F1C" />
        <stop offset="1" stopColor="#F2542D" />
      </linearGradient>
      <filter id="fx-glow-warm" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceGraphic" stdDeviation={2.2} />
      </filter>
    </defs>
  );
}

/**
 * Đồ sưu tầm đang đặt trong tiệm: trên mặt quầy (đầu trái, tránh máy tính tiền), góc phải kệ, tường
 * bên trái kệ và góc cửa phía trước. Không nhận chạm để không che thao tác kéo hàng.
 */
function SceneDecor({
  state,
  layout,
  shelfLevel,
}: {
  state: State;
  layout: SceneLayout;
  shelfLevel: number;
}) {
  const shelfHalf = shelfWidth(shelfLevel) / 2;
  const shelfLeft = layout.shelfCx - shelfHalf;
  const spots: { place: string; x: number; y: number; scale: number }[] = [
    ...layout.counters.map((c, i) => ({
      place: `counter-${i + 1}`,
      x: c.x + 17,
      y: 290,
      scale: 0.72,
    })),
    {
      place: "shelf",
      x: layout.shelfCx + shelfHalf - 4,
      y: 127,
      scale: 0.6,
    },
    shelfLeft >= 44
      ? { place: "store-wall", x: shelfLeft - 22, y: 176, scale: 0.85 }
      : { place: "store-wall", x: 17, y: 226, scale: 0.6 },
    { place: "store-floor", x: layout.width - 18, y: 418, scale: 0.9 },
  ];
  return (
    <g pointerEvents="none" aria-hidden>
      {spots.map(({ place, x, y, scale }) => {
        const item = itemAt(state, place);
        return item ? (
          <g
            key={place}
            className="scene-decor"
            transform={`translate(${x} ${y}) scale(${scale})`}
          >
            <CollectibleArt defId={item.defId} />
          </g>
        ) : null;
      })}
    </g>
  );
}

function CounterHitArea({
  x,
  w,
  label,
  unstaffed,
  onSelect,
}: {
  x: number;
  w: number;
  label: string;
  unstaffed: boolean;
  onSelect: () => void;
}) {
  return (
    <g
      className="tappable counter-hit"
      role="button"
      tabIndex={0}
      aria-label={`${label}${unstaffed ? ", chưa có người đứng" : ""}. Chạm để chọn người đứng quầy.`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <rect x={x} y={288} width={w} height={86} rx={8} fill="transparent" />
      {unstaffed && (
        <g transform={`translate(${x + w / 2} 356)`} pointerEvents="none">
          <rect
            x={-44}
            y={-11}
            width={88}
            height={22}
            rx={11}
            fill={ART.honey}
            stroke={INK}
            strokeWidth={1.6}
          />
          <text
            y={4}
            textAnchor="middle"
            fontSize={10}
            fontWeight={900}
            fill={INK}
          >
            + GIAO NGƯỜI
          </text>
        </g>
      )}
    </g>
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
  cellWidth: number;
  count: number;
  capacity: number;
  trending: boolean;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const {
    productId,
    x,
    base,
    cellWidth,
    count,
    capacity,
    selected,
    trending,
    onPointerDown,
  } = props;
  const shown = Math.min(count, cellWidth < 88 ? 2 : 3);
  const scale = cellWidth < 65 ? 0.65 : cellWidth < 88 ? 0.76 : 0.9;
  const spacing = cellWidth < 65 ? 17 : cellWidth < 88 ? 22 : 28;
  const w = 40 * scale;
  const h = 48 * scale;
  const low = count > 0 && count <= 1;
  const left = x - cellWidth / 2 + 3;
  const frame = {
    x: left,
    y: base - 60,
    width: cellWidth - 6,
    height: 60,
    rx: 7,
  };
  return (
    <g
      className={`tappable shelf-slot ${count > 0 ? "draggable" : ""} ${trending ? "shelf-trending" : ""} ${selected ? "shelf-selected" : ""}`}
      onPointerDown={onPointerDown}
      role="button"
      aria-label={`${PRODUCTS[productId].name}: còn ${count}/${capacity}${trending ? ", đang bán chạy" : ""}. Kéo vào khách để đưa hàng, chạm để xem chi tiết.`}
    >
      <rect
        {...frame}
        fill={
          selected
            ? "rgba(255, 214, 110, 0.28)"
            : trending
              ? "rgba(255, 159, 28, 0.1)"
              : "transparent"
        }
      />
      {trending && (
        <>
          <rect
            {...frame}
            fill="none"
            stroke="#FF9F1C"
            strokeWidth={4}
            opacity={0.55}
            filter="url(#fx-glow-warm)"
          />
          <rect {...frame} fill="none" stroke="#F2542D" strokeWidth={2} />
        </>
      )}
      {selected && (
        <>
          <rect {...frame} fill="none" stroke="#FFB320" strokeWidth={4} />
          <rect
            x={frame.x + 3}
            y={frame.y + 3}
            width={frame.width - 6}
            height={frame.height - 6}
            rx={5}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        </>
      )}
      {count === 0 && (
        <g opacity={0.25}>
          <ProductArt
            id={productId}
            x={x - w / 2}
            y={base - h - 1}
            scale={scale}
          />
        </g>
      )}
      {Array.from({ length: shown }, (_, i) => (
        <ProductArt
          key={i}
          id={productId}
          x={x - w / 2 + (i - (shown - 1) / 2) * spacing}
          y={base - h - 1}
          scale={scale}
        />
      ))}
      {trending && (
        <HotBadge x={left + 2} y={base - 58} compact={cellWidth < 70} />
      )}
      {/* Số lượng ở góc dưới bên phải ô kệ, căn theo mép phải khung để nhãn "HẾT" rộng hơn không tràn ra ngoài. */}
      <g
        transform={`translate(${frame.x + frame.width - (count === 0 ? 34 : 26) - 3} ${base - 17})`}
      >
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
        <text
          x={count === 0 ? 17 : 13}
          y={11}
          textAnchor="middle"
          fontSize={10}
          fontWeight={900}
          fill={count === 0 ? "#FFFFFF" : INK}
        >
          {count === 0 ? "HẾT" : low ? `!${count}` : count}
        </text>
      </g>
    </g>
  );
}

/** Nhãn "Bán chạy": dải cam có ngôi sao, viền mực như các nhãn khác; ô hẹp chỉ còn ngôi sao. */
function HotBadge({
  x,
  y,
  compact,
}: {
  x: number;
  y: number;
  compact: boolean;
}) {
  const star =
    "M0,-5.2 L1.5,-1.7 L5.2,-1.5 L2.3,0.9 L3.2,4.6 L0,2.6 L-3.2,4.6 L-2.3,0.9 L-5.2,-1.5 L-1.5,-1.7Z";
  const width = compact ? 18 : 58;
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <rect
        x={0}
        y={0}
        width={width}
        height={16}
        rx={8}
        fill="url(#fx-badge-hot)"
        stroke={INK}
        strokeWidth={1.4}
      />
      <path
        d={star}
        transform="translate(9 8)"
        fill="#FFF4C2"
        stroke={INK}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      {!compact && (
        <text
          x={17}
          y={11.5}
          fontSize={8.5}
          fontWeight={900}
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth={2}
          paintOrder="stroke"
          textLength={width - 22}
          lengthAdjust="spacingAndGlyphs"
        >
          BÁN CHẠY
        </text>
      )}
    </g>
  );
}

function EmptySlot({
  x,
  base,
  cellWidth,
}: {
  x: number;
  base: number;
  cellWidth: number;
}) {
  return (
    <g opacity={0.45}>
      <rect
        x={x - cellWidth / 2 + 4}
        y={base - 58}
        width={cellWidth - 8}
        height={40}
        rx={6}
        fill="none"
        stroke="#C9B49A"
        strokeWidth={1.6}
        strokeDasharray="5 4"
      />
      <text
        x={x}
        y={base - 25}
        textAnchor="middle"
        fontSize={9}
        fontWeight={800}
        fill="#8C7A66"
      >
        TRỐNG
      </text>
    </g>
  );
}

function PatienceBar({ ratio }: { ratio: number }) {
  const r = Math.max(0, Math.min(1, ratio));
  const color = r > 0.5 ? "#58C68A" : r > 0.25 ? "#FFC94D" : "#F2665E";
  return (
    <g transform="translate(-24 8)">
      <rect
        x={0}
        y={0}
        width={48}
        height={7}
        rx={3.5}
        fill={ART.paper}
        stroke={INK}
        strokeWidth={1.3}
      />
      <rect
        className="bar-fill"
        x={1}
        y={1}
        width={46 * r}
        height={5}
        rx={2.5}
        fill={color}
      />
      {r <= 0.25 && (
        <text x={54} y={7} fontSize={10} fontWeight={900} fill="#D64545">
          !
        </text>
      )}
    </g>
  );
}
