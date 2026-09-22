import { ObjectId, type Collection, type Document } from "mongodb";
import { notifyOperationalAlert } from "@/lib/alerts";
import { dropsheableProvider } from "./dropsheable";
import type { FulfillmentProvider, FulfillmentProviderResult } from "./provider";

const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

type FulfillmentRunResult = {
  processed: number;
  submitted: number;
  blocked: number;
  failed: number;
};

function retryAt(attempt: number) {
  return new Date(Date.now() + Math.min(MAX_RETRY_DELAY_MS, 5 * 60 * 1000 * 2 ** Math.max(0, attempt - 1)));
}

function resultUpdate(result: FulfillmentProviderResult, now: Date) {
  if (result.success) {
    return {
      $set: {
        fulfillmentStatus: result.status ?? "submitted",
        ...(result.externalOrderId ? { externalOrderId: result.externalOrderId, supplierOrderId: result.externalOrderId } : {}),
        ...(result.trackingNumber ? { trackingNumber: result.trackingNumber, tracking: result.trackingNumber } : {}),
        ...(result.trackingUrl ? { trackingUrl: result.trackingUrl } : {}),
        ...(result.carrier ? { carrier: result.carrier } : {}),
        fulfillmentSubmittedAt: now,
        fulfillmentProcessing: false,
        lastFulfillmentError: null,
        updatedAt: now,
      },
      $unset: { nextFulfillmentRetryAt: "" },
    };
  }

  const blocked = result.errorCode === "PROVIDER_CONTRACT_MISSING" || result.retryable === false;
  return {
    $set: {
      fulfillmentStatus: blocked ? "blocked" : "failed",
      fulfillmentProcessing: false,
      lastFulfillmentError: result.errorCode ?? "PROVIDER_ERROR",
      lastFulfillmentErrorMessage: result.error ?? "Error del proveedor",
      lastFulfillmentErrorAt: now,
      ...(blocked ? {} : { nextFulfillmentRetryAt: retryAt(1) }),
      updatedAt: now,
    },
  };
}

export async function processPendingFulfillment(
  orders: Collection<Document>,
  provider: FulfillmentProvider = dropsheableProvider,
  limit = 20,
): Promise<FulfillmentRunResult> {
  const now = new Date();
  const candidates = await orders.find({
    paymentStatus: "approved",
    stockApplied: true,
    fulfillmentStatus: { $in: ["pending", "failed"] },
    fulfillmentProcessing: { $ne: true },
    externalOrderId: { $exists: false },
    $or: [{ nextFulfillmentRetryAt: { $exists: false } }, { nextFulfillmentRetryAt: { $lte: now } }],
  }).sort({ fulfillmentQueuedAt: 1, createdAt: 1 }).limit(limit).toArray();

  const summary: FulfillmentRunResult = { processed: 0, submitted: 0, blocked: 0, failed: 0 };
  for (const candidate of candidates) {
    if (!candidate._id) continue;
    const id = candidate._id as ObjectId;
    const attempt = Number(candidate.fulfillmentAttempts ?? 0) + 1;
    const claim = await orders.updateOne({ _id: id, paymentStatus: "approved", stockApplied: true, fulfillmentStatus: { $in: ["pending", "failed"] }, fulfillmentProcessing: { $ne: true }, externalOrderId: { $exists: false } }, { $set: { fulfillmentProcessing: true, fulfillmentStatus: "processing", fulfillmentStartedAt: now, fulfillmentIdempotencyKey: `avg:${String(id)}`, updatedAt: now }, $inc: { fulfillmentAttempts: 1 } });
    if (!claim.matchedCount) continue;

    summary.processed += 1;
    try {
      const result = await provider.submitOrder(candidate);
      const safeResult = result.success && !result.externalOrderId ? { success: false, errorCode: "PROVIDER_INVALID_RESPONSE", error: "El proveedor no devolvió un identificador externo", retryable: true } : result;
      await orders.updateOne({ _id: id, fulfillmentProcessing: true, externalOrderId: { $exists: false } }, resultUpdate(safeResult, new Date()));
      if (safeResult.success) summary.submitted += 1;
      else if (safeResult.errorCode === "PROVIDER_CONTRACT_MISSING" || safeResult.retryable === false) summary.blocked += 1;
      else summary.failed += 1;
    } catch (error) {
      await orders.updateOne({ _id: id, fulfillmentProcessing: true, externalOrderId: { $exists: false } }, { $set: { fulfillmentStatus: "failed", fulfillmentProcessing: false, lastFulfillmentError: error instanceof Error ? error.name : "PROVIDER_ERROR", lastFulfillmentErrorAt: new Date(), nextFulfillmentRetryAt: retryAt(attempt), updatedAt: new Date() } });
      summary.failed += 1;
      notifyOperationalAlert("fulfillment_provider_error", { orderId: String(id), attempt });
    }
  }
  return summary;
}
