import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrderFinancials } from "../lib/order-financials";

test("calcula costos trazables y deja profit pendiente sin fee de Mercado Pago", () => {
  const previousRate = process.env.DROPSHEABLE_FEE_RATE;
  process.env.DROPSHEABLE_FEE_RATE = "3";
  const result = calculateOrderFinancials({
    subtotal: 10000,
    discountAmount: 500,
    shippingChargedToCustomer: 0,
    items: [{ price: 10000, quantity: 1, _internal: { costPrice: 6000 } }],
  });
  assert.deepEqual(result, {
    grossAmount: 10000,
    discountAmount: 500,
    shippingChargedToCustomer: 0,
    customerPaidAmount: 9500,
    supplierCost: 6000,
    dropsheableFee: 285,
    dropsheableFeeRate: 3,
    mercadoPagoFee: null,
    shippingCost: null,
    taxesOrOtherCosts: null,
    netProfit: null,
    profitMargin: null,
    profitStatus: "pending",
  });
  if (previousRate === undefined) delete process.env.DROPSHEABLE_FEE_RATE;
  else process.env.DROPSHEABLE_FEE_RATE = previousRate;
});

test("deja la comisión Dropsheable pendiente si falta la regla configurada", () => {
  const previousRate = process.env.DROPSHEABLE_FEE_RATE;
  delete process.env.DROPSHEABLE_FEE_RATE;
  const result = calculateOrderFinancials({ subtotal: 1000, discountAmount: 0, shippingChargedToCustomer: 0, items: [] });
  assert.equal(result.dropsheableFeeRate, null);
  assert.equal(result.dropsheableFee, null);
  assert.equal(result.netProfit, null);
  if (previousRate === undefined) delete process.env.DROPSHEABLE_FEE_RATE;
  else process.env.DROPSHEABLE_FEE_RATE = previousRate;
});

test("calcula profit cuando los costos reales están disponibles", () => {
  const previousRate = process.env.DROPSHEABLE_FEE_RATE;
  process.env.DROPSHEABLE_FEE_RATE = "3";
  const result = calculateOrderFinancials({
    subtotal: 10000,
    discountAmount: 0,
    shippingChargedToCustomer: 500,
    shippingCost: 500,
    taxesOrOtherCosts: 100,
    mercadoPagoFee: 400,
    items: [{ quantity: 1, _internal: { costPrice: 6000 } }],
  });
  assert.equal(result.customerPaidAmount, 10500);
  assert.equal(result.dropsheableFee, 315);
  assert.equal(result.netProfit, 3185);
  assert.equal(result.profitMargin, 30.33);
  assert.equal(result.profitStatus, "calculated");
  if (previousRate === undefined) delete process.env.DROPSHEABLE_FEE_RATE;
  else process.env.DROPSHEABLE_FEE_RATE = previousRate;
});
