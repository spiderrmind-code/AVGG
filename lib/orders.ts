export type SupplierOrderStatus = "pending" | "approved" | "processing" | "shipped" | "delivered" | "cancelled";

export interface SupplierOrderSummary {
  id: string;
  status: SupplierOrderStatus;
  tracking?: string;
}

export function normalizeSupplierStatus(value?: string): SupplierOrderStatus {
  const normalized = String(value ?? "pending").toLowerCase();
  switch (normalized) {
    case "approved":
    case "pagado":
      return "approved";
    case "processing":
    case "preparando":
    case "procesando":
      return "processing";
    case "shipped":
    case "enviado":
      return "shipped";
    case "delivered":
    case "entregado":
      return "delivered";
    case "cancelled":
    case "cancelado":
      return "cancelled";
    default:
      return "pending";
  }
}
