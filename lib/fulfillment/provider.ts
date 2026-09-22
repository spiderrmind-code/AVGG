import type { Document } from "mongodb";

export type FulfillmentProviderResult = {
  success: boolean;
  externalOrderId?: string;
  status?: "submitted" | "confirmed" | "preparing" | "shipped" | "in_transit" | "delivered";
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  errorCode?: string;
  error?: string;
  retryable?: boolean;
};

export interface FulfillmentProvider {
  submitOrder(order: Document): Promise<FulfillmentProviderResult>;
  getOrderStatus(externalOrderId: string): Promise<FulfillmentProviderResult>;
}
