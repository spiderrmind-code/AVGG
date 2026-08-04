type Decision = { allowed: true; idempotent: boolean } | { allowed: false; idempotent: false; reason: "payment_not_approved" | "invalid_transition" | "paid_order_cannot_be_cancelled" | "terminal_status" };
export function validateOperationalTransition(current: string | undefined, requested: string, payment: string | undefined): Decision {
  const status = current ?? "pending";
  if (status === requested) return { allowed: true, idempotent: true };
  if (requested === "cancelled") return status === "pending" ? payment === "approved" ? { allowed: false, idempotent: false, reason: "paid_order_cannot_be_cancelled" } : { allowed: true, idempotent: false } : { allowed: false, idempotent: false, reason: status === "delivered" || status === "cancelled" ? "terminal_status" : "invalid_transition" };
  if (payment !== "approved") return { allowed: false, idempotent: false, reason: "payment_not_approved" };
  const next: Record<string, string> = { pending: "processing", processing: "shipped", shipped: "delivered" };
  return next[status] === requested ? { allowed: true, idempotent: false } : { allowed: false, idempotent: false, reason: status === "delivered" || status === "cancelled" ? "terminal_status" : "invalid_transition" };
}
