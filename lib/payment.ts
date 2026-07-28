export { resolveAppBaseUrl as resolvePaymentOrigin } from "@/lib/app-url";
import { createHash, timingSafeEqual } from "crypto";

export function hashGuestAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authorizeOrderAccess(
  order: { customerEmail?: string; customer?: { email?: string }; userId?: string; guestAccessTokenHash?: string },
  session?: { user?: { id?: string; email?: string | null; role?: string } },
  guestAccessToken?: string
) {
  const userEmail = session?.user?.email;
  const userRole = session?.user?.role;

  if (userRole === "admin") {
    return true;
  }

  if (userEmail && order.userId) {
    return order.userId === session.user?.id;
  }

  if (userEmail && !order.userId) {
    return String(order.customerEmail ?? order.customer?.email ?? "").toLowerCase() === String(userEmail).toLowerCase();
  }

  if (typeof guestAccessToken === "string" && order.guestAccessTokenHash) {
    const supplied = Buffer.from(hashGuestAccessToken(guestAccessToken));
    const expected = Buffer.from(order.guestAccessTokenHash);
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }

  return false;
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
