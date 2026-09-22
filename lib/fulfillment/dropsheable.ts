import type { Document } from "mongodb";
import type { FulfillmentProvider, FulfillmentProviderResult } from "./provider";

const missingContract = (): FulfillmentProviderResult => ({
  success: false,
  errorCode: "PROVIDER_CONTRACT_MISSING",
  error: "Dropsheable no documenta un contrato verificable para crear pedidos desde esta integración",
  retryable: false,
});

export const dropsheableProvider: FulfillmentProvider = {
  async submitOrder(_order: Document) {
    return missingContract();
  },
  async getOrderStatus(_externalOrderId: string) {
    return missingContract();
  },
};
