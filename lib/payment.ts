export function resolvePaymentOrigin(origin?: string, fallbackOrigin?: string, envOrigin?: string) {
  const candidates = [origin, fallbackOrigin, envOrigin, "http://localhost:3000"].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  const normalized = candidates[0]?.trim();
  if (!normalized) {
    return "http://localhost:3000";
  }

  try {
    const url = new URL(normalized);
    return `${url.protocol}//${url.host}`;
  } catch {
    return normalized.replace(/\/+$/, "");
  }
}

export function canInitializePayment(order: { status?: string; paymentStatus?: string }) {
  const status = String(order?.status ?? "").toLowerCase();
  const paymentStatus = String(order?.paymentStatus ?? "").toLowerCase();

  return status === "pending" && paymentStatus !== "approved";
}

export function getWebhookOrderUpdate(status?: string) {
  const normalized = String(status ?? "").toLowerCase();

  if (normalized === "approved") {
    return { paymentStatus: "approved", status: "paid" };
  }

  if (normalized === "rejected") {
    return { paymentStatus: "rejected", status: "cancelled" };
  }

  return { paymentStatus: "pending", status: "pending" };
}
