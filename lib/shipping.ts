export interface ShippingModuleState {
  carrier?: string;
  tracking?: string;
  status?: string;
  updatedAt?: Date;
}

export const SHIPPING_CARRIERS = ["Correo Argentino", "Andreani", "OCA", "Mercado Envíos"] as const;

export function createShippingModule(initial?: Partial<ShippingModuleState>): ShippingModuleState {
  return {
    carrier: initial?.carrier ?? "",
    tracking: initial?.tracking ?? "",
    status: initial?.status ?? "pending",
    updatedAt: initial?.updatedAt ?? new Date(),
  };
}
