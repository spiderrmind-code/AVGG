import assert from "node:assert/strict";
import test from "node:test";
import { validateOperationalTransition } from "../lib/order-operational-status";

type RejectionReason = "payment_not_approved" | "invalid_transition" | "paid_order_cannot_be_cancelled" | "terminal_status";

function assertAllowed(current: string, requested: string, paymentStatus: string) {
  assert.deepEqual(validateOperationalTransition(current, requested, paymentStatus), { allowed: true, idempotent: false });
}

function assertRejected(current: string, requested: string, paymentStatus: string, reason: RejectionReason) {
  assert.deepEqual(validateOperationalTransition(current, requested, paymentStatus), { allowed: false, idempotent: false, reason });
}

test("allows the operational sequence and cancellation before payment", () => {
  assertAllowed("pending", "processing", "approved");
  assertAllowed("processing", "shipped", "approved");
  assertAllowed("shipped", "delivered", "approved");
  assertAllowed("pending", "cancelled", "pending");
});

test("treats a requested current state as idempotent", () => {
  for (const status of ["pending", "processing", "shipped", "delivered", "cancelled"]) {
    assert.deepEqual(validateOperationalTransition(status, status, "approved"), { allowed: true, idempotent: true });
  }
});

test("rejects operational transitions for non-approved payments", () => {
  assertRejected("pending", "processing", "pending", "payment_not_approved");
  assertRejected("pending", "processing", "failed", "payment_not_approved");
  assertRejected("processing", "shipped", "refunded", "payment_not_approved");
  assertRejected("shipped", "delivered", "charged_back", "payment_not_approved");
});

test("rejects skipped and backward transitions", () => {
  assertRejected("pending", "shipped", "approved", "invalid_transition");
  assertRejected("pending", "delivered", "approved", "invalid_transition");
  assertRejected("processing", "delivered", "approved", "invalid_transition");
  assertRejected("processing", "pending", "approved", "invalid_transition");
  assertRejected("shipped", "processing", "approved", "invalid_transition");
  assertRejected("delivered", "shipped", "approved", "terminal_status");
  assertRejected("delivered", "processing", "approved", "terminal_status");
});

test("rejects leaving terminal states", () => {
  for (const requested of ["pending", "processing", "shipped", "cancelled"]) {
    assertRejected("delivered", requested, "approved", "terminal_status");
  }
  for (const requested of ["pending", "processing", "shipped", "delivered"]) {
    assertRejected("cancelled", requested, "approved", "terminal_status");
  }
});

test("does not allow cancellation of paid orders", () => {
  assertRejected("pending", "cancelled", "approved", "paid_order_cannot_be_cancelled");
  assertRejected("processing", "cancelled", "approved", "invalid_transition");
  assertRejected("shipped", "cancelled", "approved", "invalid_transition");
  assertRejected("delivered", "cancelled", "approved", "terminal_status");
});

test("is pure, deterministic, and returns only sanitized rejection reasons", () => {
  const current = "pending";
  const requested = "processing";
  const payment = "pending";
  const first = validateOperationalTransition(current, requested, payment);
  const second = validateOperationalTransition(current, requested, payment);
  assert.deepEqual(first, second);
  assert.equal(current, "pending");
  assert.equal(requested, "processing");
  assert.equal(payment, "pending");

  const reasons = new Set<RejectionReason>();
  for (const from of ["pending", "processing", "shipped", "delivered", "cancelled"]) {
    for (const to of ["pending", "processing", "shipped", "delivered", "cancelled"]) {
      for (const status of ["pending", "approved", "refunded"]) {
        const result = validateOperationalTransition(from, to, status);
        if (!result.allowed) reasons.add(result.reason);
      }
    }
  }
  for (const reason of reasons) {
    assert.ok(["payment_not_approved", "invalid_transition", "paid_order_cannot_be_cancelled", "terminal_status"].includes(reason));
  }
});
