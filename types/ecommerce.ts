import type { ObjectId } from "mongodb";

export interface ProductDocument {
  _id?: string | ObjectId;
  title?: string;
  name?: string;
  description?: string;
  price: number;
  comparePrice?: number;
  image?: string;
  images?: string[];
  category?: string;
  shippingDays?: string;
  stock?: boolean;
  featured?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CartItem {
  _id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface CheckoutCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode?: string;
}

export interface OrderDocument {
  _id?: string | ObjectId;
  orderNumber: string;
  customer: CheckoutCustomer;
  customerEmail?: string | null;
  items: CartItem[];
  subtotal: number;
  total: number;
  status?: string;
  paymentStatus: "pending" | "approved" | "rejected" | "cancelled" | "refunded" | "partially_refunded" | "charged_back" | "unknown";
  paymentId?: string;
  preferenceId?: string;
  initPoint?: string;
  /** Estado del pedido en el proveedor, independiente del estado operativo de la tienda. */
  fulfillmentStatus?: "ready" | "requesting" | "submitted" | "processing" | "shipped" | "delivered" | "failed" | "unknown";
  fulfillmentProcessing?: boolean;
  fulfillmentRequestedAt?: Date;
  fulfilledAt?: Date;
  fulfillmentError?: "provider_error" | "timeout_uncertain" | null;
  /** Identificador genérico del proveedor; para CJ contiene su id de pedido. */
  supplierOrderId?: string;
  carrier?: string;
  tracking?: string;
  trackingUrl?: string;
  lastTrackingSyncAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SupplierDocument {
  _id?: string | ObjectId;
  name?: string;
  description?: string;
  logo?: string;
  country?: string;
  city?: string;
  address?: string;
  contact?: string;
  email?: string;
  phone?: string;
  website?: string;
  status?: "active" | "paused" | "blocked";
  type?: "manual" | "csv" | "api";
  externalId?: string | null;
  apiUrl?: string | null;
  syncStatus?: string;
  lastSync?: Date | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
