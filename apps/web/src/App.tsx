import {
  dayProgress,
  playerLevel,
  STATIONS,
  TRAITS,
  UPGRADES,
  type DeepReadonly,
  type SimEvent,
  type SimState,
} from '@pharmacy/simulation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BRAND } from './brand';
import { DandelionLogo } from './art/Furniture';
import {
  BoxIcon,
  CheckIcon,
  CoinIcon,
  CrossMarkIcon,
  InfoIcon,
  MapIcon,
  MenuIcon,
  SpeakerIcon,
  StaffIcon,
  StarIcon,
  StoreIcon,
  WarningIcon,
} from './art/Icons';
import { InventoryPanel } from './features/inventory/InventoryPanel';
import { ProductSheet } from './features/inventory/ProductSheet';
import { CustomerInfo } from './features/store/CustomerInfo';
import { ServiceTray } from './features/store/ServiceTray';
import { PLAYER_WORKER_ID } from './features/store/useServiceActions';
import { ProductIcon } from './art/Products';
import { REGISTER_SPOT, StoreScene } from './features/store/StoreScene';
import { WorkerSheet } from './features/staff/WorkerSheet';
import { StaffPanel } from './features/staff/StaffPanel';
import { UpgradePanel } from './features/expansion/UpgradePanel';
import { ReviewsPanel } from './features/reviews/ReviewsPanel';
import { LedgerSheet } from './features/ledger/LedgerSheet';
import { OfflineDialog } from './features/ledger/OfflineDialog';
import { OnboardingDialog } from './features/onboarding/OnboardingDialog';
import { DaySummaryDialog } from './features/day/DaySummaryDialog';
import { OpeningPanel } from './features/day/OpeningPanel';
import { clockLabel, phaseLabel, SHIFT_LABEL } from './features/day/dayText';
import { formatRating, starText } from './ui/Stars';
import { useBridge, useGameEvents, useGameState } from './game/useGame';
import { useUi, type Tab, type Toast } from './ui/uiStore';
import { useSettings } from './ui/settings';
import { IconButton } from './ui/primitives';
import { playSfx } from './audio/sfx';
import { burst, celebrate } from './fx/confetti';

const WELCOME_KEY = 'idle-pharmacy.welcome.v1';
/** Cột mốc số lượt bán được chúc mừng (giá trị tạm, sẽ chuyển thành nhiệm vụ ở bước tiến trình). */
const SALE_MILESTONES = [5, 10, 25, 50, 100, 200, 500];

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Chế độ riêng tư/chặn lưu trữ: bỏ qua, lần sau chỉ hiện lại lời chào.
  }
}

export function App() {
  const bridge = useBridge();
  const state = useGameState();
  const [firstVisit] = useState(() => !readFlag(WELCOME_KEY));
  const [showInfo, setShowInfo] = useState(firstVisit);
  const offline = useUi((s) => s.offline);
  const setOffline = useUi((s) => s.setOffline);
  const daySummary = useUi((s) => s.daySummary);
  const setDaySummary = useUi((s) => s.setDaySummary);
  // Hộp thoại che màn hình thì tạm dừng mô phỏng.
  const paused = showInfo || offline !== null || daySummary !== null;

  useEffect(() => {
    bridge.setRunning(!paused);
  }, [bridge, paused]);
  useEffect(() => () => bridge.setRunning(false), [bridge]);

  useEventFeedback();
  const level = playerLevel(state);
  const previousLevel = useRef(level);
  useEffect(() => {
    if (level > previousLevel.current) {
      useUi.getState().pushToast('good', `Tiệm đạt cấp ${level}! Mở mục Mở rộng để nâng Kho và Cửa hàng, thêm mặt hàng mới.`);
      playSfx('milestone');
    }
    previousLevel.current = level;
  }, [level]);

  return (
    <div className="app">
      <Hud state={state} onInfo={() => setShowInfo(true)} />
      <main className="stage">
        <div className="scene-wrap">
          <StoreScene state={state} />
          <OpeningPanel state={state} />
          <Toasts />
        </div>
        <div className="side">
          <ServiceTray state={state} />
          <Inspector state={state} />
        </div>
      </main>
      <PrimaryNav state={state} />
      <DragGhost />
      {offline && !showInfo && <OfflineDialog summary={offline} onClose={() => setOffline(null)} />}
      {daySummary && !offline && !showInfo && <DaySummaryDialog report={daySummary} onClose={() => setDaySummary(null)} />}
      {showInfo && (
        <OnboardingDialog
          seed={state.seed}
          showSave={!firstVisit || state.tick > 0}
          onClose={() => {
            writeFlag(WELCOME_KEY);
            setShowInfo(false);
          }}
        />
      )}
    </div>
  );
}

function useEventFeedback() {
  const bridge = useBridge();
  const pushToast = useUi((s) => s.pushToast);
  const pushFloater = useUi((s) => s.pushFloater);
  const setDaySummary = useUi((s) => s.setDaySummary);
  const lastTurnedAwayToast = useRef(-Infinity);
  const lastExpiryToast = useRef(-Infinity);
  const handler = useCallback(
    (events: SimEvent[]) => {
      for (const e of events) {
        switch (e.type) {
          case 'customerArrived':
            playSfx(bridge.state.customers[e.customerId]?.loyaltyId ? 'return' : 'arrive');
            break;
          case 'stockExpired': {
            const now = performance.now();
            if (now - lastExpiryToast.current > 20_000) {
              lastExpiryToast.current = now;
              playSfx('warn');
              pushToast('warn', 'Có hàng đã hết hạn và được lấy khỏi kệ. Mở Kho để kiểm tra và nhập lại.');
            }
            break;
          }
          case 'saleCompleted': {
            pushFloater(`+${e.amount} ${BRAND.currency}`, REGISTER_SPOT.x, REGISTER_SPOT.y);
            if (e.tip > 0) pushFloater(`Boa +${e.tip}`, REGISTER_SPOT.x - 40, REGISTER_SPOT.y - 24);
            const sales = bridge.state.stats.sales;
            if (SALE_MILESTONES.includes(sales)) {
              playSfx('milestone');
              celebrate();
              pushToast('good', `Cột mốc: ${sales} lượt bán! Tiệm đang đông khách dần.`);
            } else {
              playSfx('sale');
            }
            break;
          }
          case 'wrongProduct':
            playSfx('wrong');
            pushToast('bad', 'Khách: “Đây không phải thứ mình cần.” Hàng đã được trả về kệ.');
            break;
          case 'safetyWarning': {
            playSfx('warn');
            const worker = bridge.state.workers[e.workerId];
            pushToast(
              'warn',
              e.workerId === PLAYER_WORKER_ID
                ? 'Không bán cho khách đang mô tả triệu chứng — hãy khuyên khách đi khám.'
                : `${worker?.name ?? 'Nhân viên'} định bán hàng cho khách có triệu chứng — hệ thống đã chặn, sẽ khuyên khách đi khám.`,
            );
            break;
          }
          case 'customerTurnedAway': {
            // Nhắc tối đa mỗi 20 giây để không làm phiền.
            const now = performance.now();
            if (now - lastTurnedAwayToast.current > 20_000) {
              lastTurnedAwayToast.current = now;
              pushToast('warn', 'Hàng chờ đầy — một khách đã bỏ đi. Giao quầy cho nhân viên hoặc nâng cấp để phục vụ kịp.');
            }
            break;
          }
          case 'staffHired': {
            const worker = bridge.state.workers[e.workerId];
            playSfx('milestone');
            burst(0.5, 0.4);
            const shift = worker?.shifts[0];
            pushToast(
              'good',
              `${worker?.name ?? 'Nhân viên mới'} đã vào làm${shift ? ` ${SHIFT_LABEL[shift].toLowerCase()}` : ''}! Xếp ca và giao quầy ở tab Nhân sự.`,
            );
            break;
          }
          case 'staffLevelUp': {
            const worker = bridge.state.workers[e.workerId];
            playSfx('milestone');
            pushToast('good', `${worker?.name ?? 'Nhân viên'} lên cấp ${e.level}: nhanh tay và hiểu hàng hơn.`);
            break;
          }
          case 'staffSkillSlipped': {
            const worker = bridge.state.workers[e.workerId];
            pushToast('info', `${worker?.name ?? 'Nhân viên'} bị chê nên hơi mất tự tin (giảm chút kinh nghiệm).`);
            break;
          }
          case 'traitRevealed': {
            const worker = bridge.state.workers[e.workerId];
            const bad = e.traits.some((id) => TRAITS[id].tone === 'bad');
            pushToast(
              bad ? 'warn' : 'good',
              `Sau ca đầu, lộ ra ${worker?.name ?? 'nhân viên'} là người "${e.traits.map((id) => TRAITS[id].name).join('", "')}".`,
            );
            break;
          }
          case 'resignationRequested': {
            const worker = bridge.state.workers[e.workerId];
            playSfx('warn');
            pushToast('warn', `${worker?.name ?? 'Nhân viên'} xin thôi việc vì làm quá sức. Mở tab Nhân sự để tăng lương giữ chân.`);
            break;
          }
          case 'staffRetained':
            pushToast('good', `Đã tăng lương lên ${e.wage} ${BRAND.currency}/ca, nhân viên ở lại.`);
            break;
          case 'stationAssigned': {
            const worker = bridge.state.workers[e.workerId];
            pushToast('info', `${worker?.name ?? 'Nhân viên'} chuyển sang ${STATIONS[e.station].name.toLowerCase()}.`);
            break;
          }
          case 'recruitInterviewed': {
            const bad = e.traits.some((id) => TRAITS[id].tone === 'bad');
            pushToast(bad ? 'warn' : 'good', `Phỏng vấn xong: ứng viên là người "${e.traits.map((id) => TRAITS[id].name).join('", "')}".`);
            break;
          }
          case 'restScheduled': {
            const worker = bridge.state.workers[e.workerId];
            pushToast(
              'info',
              e.day === null
                ? `Đã huỷ lịch nghỉ của ${worker?.name ?? 'nhân viên'}.`
                : `${worker?.name ?? 'Nhân viên'} sẽ nghỉ ngày ${e.day}: ca đó cần người khác hoặc bạn đứng quầy.`,
            );
            break;
          }
          case 'staffQuit':
            playSfx('leave');
            pushToast('bad', `${e.name} đã nghỉ việc. Tuyển người mới ở tab Nhân sự.`);
            break;
          case 'upgradeBought':
            playSfx('restock');
            burst(0.5, 0.35);
            pushToast('good', `Đã lắp: ${UPGRADES[e.upgradeId]?.name ?? 'nâng cấp'}.`);
            break;
          case 'counterAssigned': {
            const worker = bridge.state.workers[e.workerId];
            pushToast('info', e.workerId === PLAYER_WORKER_ID ? 'Bạn đứng quầy.' : `${worker?.name} đứng quầy — bạn có thể để tiệm tự chạy.`);
            break;
          }
          case 'referralCompleted':
            if (e.appropriate) {
              playSfx('refer');
              // Khen lần đầu làm đúng quy trình an toàn để người chơi nhớ hành vi này.
              if (bridge.state.stats.referrals === 1) {
                burst(0.3, 0.55);
                pushToast('good', 'Lần đầu khuyên khách đi khám — đúng quy trình an toàn!');
                break;
              }
            }
            pushToast(
              e.appropriate ? 'good' : 'info',
              e.appropriate ? 'Khách cảm ơn lời khuyên và sẽ đi khám.' : 'Khách chỉ cần mua đồ nên rời đi tay không.',
            );
            break;
          case 'reviewPosted': {
            // Sao bay lên phía trên khách vừa rời quầy.
            pushFloater(starText(e.stars), 160, 262);
            if (e.stars <= 2) playSfx('wrong');
            break;
          }
          case 'complaintOpened':
            pushToast('warn', 'Có khách vừa để lại đánh giá thấp — mở tab Đánh giá để xem lý do và phản hồi.');
            break;
          case 'complaintResolved':
            pushToast(
              e.improved ? 'good' : 'info',
              e.improved ? 'Khách đã đọc phản hồi và nâng đánh giá thêm 1 sao.' : 'Khách đã đọc phản hồi nhưng giữ nguyên đánh giá.',
            );
            break;
          case 'customerLeft':
            playSfx('leave');
            pushToast('bad', 'Một khách đã bỏ về vì chờ quá lâu.');
            break;
          case 'restocked':
            playSfx('restock');
            break;
          case 'dayEnded': {
            const r = e.report;
            playSfx('milestone');
            // Hộp thoại tổng kết ngày (tạm dừng mô phỏng tới khi người chơi sang ngày mới).
            setDaySummary(r);
            if (r.grade === 3) celebrate();
            if (r.wagesOwed > 0) {
              pushToast('warn', `Thiếu xu trả lương, còn nợ ${r.wagesOwed} ${BRAND.currency}. Nhân viên bị nợ lương làm chậm hơn.`);
            }
            break;
          }
          case 'storeOpened':
            playSfx('arrive');
            pushToast('info', e.auto ? `Tới giờ mở cửa — tiệm tự mở (${e.prepDone}/4 việc chuẩn bị).` : 'Tiệm đã mở cửa, chào đón khách!');
            break;
          case 'shiftChanged':
            pushToast(
              'info',
              `Giao ca: ${SHIFT_LABEL[e.previous.shift]} bán ${e.previous.sales} đơn, thu ${e.previous.revenue} ${BRAND.currency}. Bắt đầu ${SHIFT_LABEL[e.shift].toLowerCase()}.`,
            );
            break;
          case 'ratingMilestone':
            playSfx('milestone');
            celebrate();
            pushToast('good', `Cột mốc: điểm tiệm đạt ${formatRating(e.stars)}★! Khách truyền tai nhau ghé tiệm.`);
            break;
          case 'staffDismissed':
            pushToast('info', `${e.name} đã nghỉ việc. Có thể tuyển lại ở tab Nhân sự.`);
            break;
          case 'productReady': {
            // Khách nhận đúng món thì tự thanh toán (vẫn qua lệnh checkout có kiểm tra) để bớt một lần chạm.
            const order = bridge.state.orders[e.orderId];
            if (order?.workerId === PLAYER_WORKER_ID) {
              queueMicrotask(() => bridge.dispatch({ type: 'checkout', workerId: PLAYER_WORKER_ID, orderId: e.orderId }));
            }
            break;
          }
        }
      }
    },
    [bridge, pushToast, pushFloater, setDaySummary],
  );
  useGameEvents(handler);
}

function Hud({
  state,
  onInfo,
}: {
  state: DeepReadonly<SimState>;
  onInfo: () => void;
}) {
  const select = useUi((s) => s.select);
  const setTab = useUi((s) => s.setTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const progress = dayProgress(state);
  const owed = Object.values(state.workers).some((w) => w.wageOwed > 0);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);
  const openLedger = () => {
    setMenuOpen(false);
    setTab("store");
    select({ kind: "ledger" });
  };
  return (
    <header className="hud">
      <div className="hud-brand">
        <svg width={30} height={30} viewBox="-15 -15 30 30" aria-hidden>
          <DandelionLogo r={14} />
        </svg>
        <span>{BRAND.short}</span>
      </div>
      <div className="hud-stats">
        <button
          className={`chip chip-btn ${owed ? "alert" : ""}`}
          onClick={openLedger}
          aria-label={`${state.money} ${BRAND.currency}. Mở sổ sách`}
        >
          <CoinIcon size={20} />
          <b>
            {new Intl.NumberFormat("vi-VN", {
              notation: "compact",
              maximumFractionDigits: 1,
            }).format(state.money)}
          </b>
        </button>
        <span
          className="chip hud-time"
          aria-label={`Ngày ${state.day}, ${clockLabel(state)}, ${phaseLabel(state)}`}
        >
          <b>
            N{state.day} · {clockLabel(state)}
          </b>
          <small>{phaseLabel(state)}</small>
          <i
            className="hud-time-progress"
            style={{ width: `${progress * 100}%` }}
            aria-hidden
          />
        </span>
        <div className="hud-menu" ref={menuRef}>
          <IconButton
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Trợ giúp và cài đặt"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? "hud-menu-panel" : undefined}
          >
            <MenuIcon size={24} />
          </IconButton>
          {menuOpen && (
            <div className="hud-menu-panel" id="hud-menu-panel">
              <SoundToggle />
              <button
                className="hud-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onInfo();
                }}
              >
                <InfoIcon size={22} /> Hướng dẫn chơi
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function SoundToggle() {
  const sound = useSettings((s) => s.sound);
  const toggle = useSettings((s) => s.toggleSound);
  return (
    <button className="hud-menu-item" onClick={toggle} aria-pressed={sound}>
      <SpeakerIcon size={22} muted={!sound} /> Âm thanh: {sound ? "Bật" : "Tắt"}
    </button>
  );
}

function Inspector({ state }: { state: DeepReadonly<SimState> }) {
  const tab = useUi((s) => s.tab);
  const selection = useUi((s) => s.selection);
  const select = useUi((s) => s.select);
  const setTab = useUi((s) => s.setTab);

  let content: React.ReactNode = null;
  if (tab === 'inventory') content = <InventoryPanel state={state} />;
  else if (tab === 'staff') content = <StaffPanel state={state} />;
  else if (tab === 'expansion') content = <UpgradePanel state={state} />;
  else if (tab === 'reviews') content = <ReviewsPanel state={state} />;
  else if (selection?.kind === 'customer') content = <CustomerInfo state={state} customerId={selection.id} />;
  else if (selection?.kind === 'product') content = <ProductSheet state={state} productId={selection.id} />;
  else if (selection?.kind === 'worker') content = <WorkerSheet state={state} workerId={selection.id} />;
  else if (selection?.kind === 'ledger') content = <LedgerSheet state={state} />;

  const close = () => (tab === 'store' ? select(null) : setTab('store'));
  return (
    <aside className={`inspector ${content ? 'open' : 'empty'}`} data-size={tab === 'store' ? 'auto' : 'full'} aria-label="Chi tiết">
      {content && <div className="sheet-backdrop" onClick={close} aria-hidden />}
      {content ? (
        <div className="sheet">
          <div className="sheet-bar">
            <span className="sheet-grip" aria-hidden />
            <IconButton
              className="close"
              aria-label="Đóng"
              onClick={close}
            >
              <CrossMarkIcon size={22} />
            </IconButton>
          </div>
          <div className="sheet-body">{content}</div>
        </div>
      ) : (
        <p className="muted inspector-hint">Chạm vào kệ hàng, khách đang xếp hàng hoặc nhân viên để xem chi tiết.</p>
      )}
    </aside>
  );
}

const NAV: { tab: Tab; label: string; icon: React.ReactNode }[] = [
  { tab: 'store', label: 'Cửa hàng', icon: <StoreIcon /> },
  { tab: 'staff', label: 'Nhân sự', icon: <StaffIcon /> },
  { tab: 'inventory', label: 'Kho', icon: <BoxIcon /> },
  { tab: 'reviews', label: 'Đánh giá', icon: <StarIcon /> },
  { tab: 'expansion', label: 'Mở rộng', icon: <MapIcon /> },
];

function PrimaryNav({ state }: { state: DeepReadonly<SimState> }) {
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  const openComplaints = state.complaints.filter(
    (c) => c.status === "open",
  ).length;
  const resigning = Object.values(state.workers).filter(
    (w) => w.resigning,
  ).length;
  return (
    <nav className="bottom-nav" aria-label="Điều hướng chính">
      <div className="nav-items">
        {NAV.map((item) => {
          const badge =
            item.tab === "reviews"
              ? openComplaints
              : item.tab === "staff"
                ? resigning
                : 0;
          return (
            <button
              key={item.tab}
              className={`nav-item ${tab === item.tab ? "active" : ""}`}
              aria-current={tab === item.tab ? "page" : undefined}
              aria-label={
                badge
                  ? `${item.label}, ${badge} ${item.tab === "staff" ? "người xin nghỉ" : "khiếu nại chờ phản hồi"}`
                  : undefined
              }
              onClick={() => setTab(item.tab)}
            >
              <span className="nav-icon">
                {item.icon}
                {badge > 0 && <span className="nav-badge">{badge}</span>}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/** Hình sản phẩm bay theo ngón tay khi kéo; đặt cao hơn điểm chạm để ngón tay không che. */
function DragGhost() {
  const drag = useUi((s) => s.drag);
  if (!drag) return null;
  return (
    <div className={`drag-ghost ${drag.over ? 'over' : ''}`} style={{ left: drag.x, top: drag.y }} aria-hidden>
      <ProductIcon id={drag.productId} size={48} />
    </div>
  );
}

function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useUi((s) => s.dismissToast);
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.id), 3200);
    return () => window.clearTimeout(id);
  }, [dismiss, toast.id]);
  const icon =
    toast.tone === 'good' ? (
      <CheckIcon size={20} />
    ) : toast.tone === 'info' ? (
      <InfoIcon size={20} />
    ) : toast.tone === 'warn' ? (
      <WarningIcon size={20} />
    ) : (
      <CrossMarkIcon size={20} />
    );
  return (
    <div className={`toast ${toast.tone}`} onClick={() => dismiss(toast.id)}>
      {icon}
      <span>{toast.text}</span>
    </div>
  );
}
