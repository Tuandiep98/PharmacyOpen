import {
  ARCHETYPES,
  customerName,
  REQUESTS,
  type Customer,
  type DeepReadonly,
  type SimState,
} from "@pharmacy/simulation";
import { CustomerFigure } from "../../art/Character";
import { ClockIcon } from "../../art/Icons";

export function Portrait({
  customer,
  size = 64,
}: {
  customer: DeepReadonly<Customer>;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="-34 -112 68 68" aria-hidden>
      <circle cx={0} cy={-78} r={33} fill="#F8ECD6" />
      <CustomerFigure look={customer.look} expression={customer.expression} />
    </svg>
  );
}

/** Thông tin khách đang xếp hàng (khách ở quầy hiển thị trong khay phục vụ). */
export function CustomerInfo({
  state,
  customerId,
}: {
  state: DeepReadonly<SimState>;
  customerId: string;
}) {
  const customer = state.customers[customerId];
  if (!customer || customer.phase === "leaving")
    return <p className="muted">Khách đã rời cửa hàng.</p>;
  const archetype = ARCHETYPES[customer.archetypeId];
  const ratio = customer.patienceMs / customer.patienceMaxMs;
  const position = state.queue.indexOf(customerId);
  const request = REQUESTS[customer.requestId];
  return (
    <div className="stack">
      <div className="service-head">
        <Portrait customer={customer} />
        <div className="service-who">
          <strong>{customerName(state, customer) ?? archetype.name}</strong>
          {customerName(state, customer) && (
            <span className="small muted">{archetype.name}</span>
          )}
          {customer.loyaltyId && (
            <span className="small good-text">
              Khách quen · lần ghé{" "}
              {(state.loyalty.find((p) => p.id === customer.loyaltyId)
                ?.visits ?? 0) + 1}
            </span>
          )}
          <span className="muted small">{archetype.description}</span>
          <span
            className="patience"
            aria-label={`Kiên nhẫn ${Math.round(ratio * 100)}%`}
          >
            <ClockIcon size={16} />
            <span className="patience-track">
              <span
                className="patience-fill"
                data-level={ratio > 0.5 ? "ok" : ratio > 0.25 ? "mid" : "low"}
                style={{ width: `${ratio * 100}%` }}
              />
            </span>
          </span>
        </div>
      </div>
      <p className="muted">
        {customer.phase === "counter"
          ? "Khách đang ở quầy."
          : `Đang xếp hàng thứ ${position + 1}.${request?.kind === "named" ? " Khách đã biết mình cần mua gì." : ""}`}
      </p>
    </div>
  );
}
