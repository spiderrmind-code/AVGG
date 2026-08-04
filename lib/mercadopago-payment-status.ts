export type MercadoPagoPaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "partially_refunded"
  | "charged_back"
  | "unknown";

export type MercadoPagoOrderStatus = "payment_pending" | "paid_pending_stock" | "payment_failed" | "cancelled";

export function normalizeMercadoPagoPaymentStatus(status: string): MercadoPagoPaymentStatus {
  switch (status.trim().toLowerCase()) {
    case "approved": return "approved";
    case "rejected": return "rejected";
    case "cancelled": return "cancelled";
    case "refunded": return "refunded";
    case "partially_refunded": return "partially_refunded";
    case "charged_back": return "charged_back";
    case "pending":
    case "in_process":
    case "authorized": return "pending";
    default: return "unknown";
  }
}

export function getMercadoPagoOrderStatus(paymentStatus: MercadoPagoPaymentStatus): MercadoPagoOrderStatus {
  switch (paymentStatus) {
    case "approved": return "paid_pending_stock";
    case "cancelled": return "cancelled";
    case "rejected":
    case "refunded":
    case "partially_refunded":
    case "charged_back": return "payment_failed";
    case "pending":
    case "unknown": return "payment_pending";
  }
}

/** Prevent stale notifications from undoing a terminal payment outcome. */
export function canTransitionMercadoPagoPaymentStatus(current: string | undefined, next: MercadoPagoPaymentStatus): boolean {
  const currentStatus = normalizeMercadoPagoPaymentStatus(current ?? "unknown");
  if (currentStatus === next) return true;
  if (currentStatus === "charged_back") return false;
  if (currentStatus === "refunded") return next === "charged_back";
  if (currentStatus === "partially_refunded") return next === "refunded" || next === "charged_back";
  if (currentStatus === "approved") return next === "partially_refunded" || next === "refunded" || next === "charged_back";
  if (currentStatus === "cancelled") return next === "approved";
  if (currentStatus === "rejected") return next === "approved";
  return true;
}
