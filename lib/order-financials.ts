export type OrderFinancials = {
  grossAmount: number;
  discountAmount: number;
  shippingChargedToCustomer: number;
  customerPaidAmount: number;
  supplierCost: number | null;
  dropsheableFee: number | null;
  dropsheableFeeRate: number | null;
  mercadoPagoFee: number | null;
  shippingCost: number | null;
  taxesOrOtherCosts: number | null;
  netProfit: number | null;
  profitMargin: number | null;
  profitStatus: "pending" | "calculated";
};

type OrderItem = { price?: unknown; quantity?: unknown; _internal?: { costPrice?: unknown } };

type FinancialInput = {
  subtotal: number;
  discountAmount: number;
  shippingChargedToCustomer: number;
  shippingCost?: number | null;
  taxesOrOtherCosts?: number | null;
  mercadoPagoFee?: number | null;
  items: OrderItem[];
};

function amount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Number(value.toFixed(2)) : null;
}

function feeRate() {
  const raw = process.env.DROPSHEABLE_FEE_RATE?.trim();
  if (!raw) return null;
  const configured = Number(raw);
  return Number.isFinite(configured) && configured >= 0 && configured <= 100 ? configured : null;
}

function supplierCost(items: OrderItem[]) {
  let total = 0;
  for (const item of items) {
    const cost = amount(item._internal?.costPrice);
    const quantity = typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : null;
    if (cost === null || quantity === null) return null;
    total += cost * quantity;
  }
  return Number(total.toFixed(2));
}

export function calculateOrderFinancials(input: FinancialInput): OrderFinancials {
  const grossAmount = amount(input.subtotal) ?? 0;
  const discountAmount = amount(input.discountAmount) ?? 0;
  const shippingChargedToCustomer = amount(input.shippingChargedToCustomer) ?? 0;
  const customerPaidAmount = Number((grossAmount - discountAmount + shippingChargedToCustomer).toFixed(2));
  const dropsheableFeeRate = feeRate();
  const dropsheableFee = dropsheableFeeRate === null ? null : Number((customerPaidAmount * dropsheableFeeRate / 100).toFixed(2));
  const supplierCostValue = supplierCost(input.items);
  const mercadoPagoFee = amount(input.mercadoPagoFee);
  const shippingCost = amount(input.shippingCost);
  const taxesOrOtherCosts = amount(input.taxesOrOtherCosts);
  const netProfit = [supplierCostValue, dropsheableFee, mercadoPagoFee, shippingCost, taxesOrOtherCosts].every((value) => value !== null)
    ? Number((customerPaidAmount - supplierCostValue! - dropsheableFee! - mercadoPagoFee! - shippingCost! - taxesOrOtherCosts!).toFixed(2))
    : null;

  return {
    grossAmount,
    discountAmount,
    shippingChargedToCustomer,
    customerPaidAmount,
    supplierCost: supplierCostValue,
    dropsheableFee,
    dropsheableFeeRate,
    mercadoPagoFee,
    shippingCost,
    taxesOrOtherCosts,
    netProfit,
    profitMargin: netProfit === null || customerPaidAmount <= 0 ? null : Number((netProfit / customerPaidAmount * 100).toFixed(2)),
    profitStatus: netProfit === null ? "pending" : "calculated",
  };
}

export function updateOrderFinancials(financials: OrderFinancials | undefined, mercadoPagoFee: number | null): OrderFinancials | undefined {
  if (!financials) return undefined;
  const netProfit = [financials.supplierCost, financials.dropsheableFee, mercadoPagoFee, financials.shippingCost, financials.taxesOrOtherCosts].every((value) => value !== null)
    ? Number((financials.customerPaidAmount - financials.supplierCost! - financials.dropsheableFee! - mercadoPagoFee! - financials.shippingCost! - financials.taxesOrOtherCosts!).toFixed(2))
    : null;
  return { ...financials, mercadoPagoFee, netProfit, profitMargin: netProfit === null || financials.customerPaidAmount <= 0 ? null : Number((netProfit / financials.customerPaidAmount * 100).toFixed(2)), profitStatus: netProfit === null ? "pending" : "calculated" };
}
