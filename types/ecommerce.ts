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
  paymentStatus: "pending" | "approved" | "rejected";
  paymentId?: string;
  preferenceId?: string;
  initPoint?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
