import mongoose, { Schema, model, Model } from "mongoose";

export interface IProduct {
  name: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  benefits?: string[];
  features?: string[];
  faq?: Array<{ question: string; answer: string }>;

  price: number; // Precio de venta
  costPrice?: number; // Precio del proveedor
  comparePrice?: number; // Precio anterior para mostrar descuento
  margin?: number;

  image: string;
  images?: string[];

  category?: string;
  slug?: string;

  supplier?: string;
  supplierId?: string;
  supplierLink?: string;

  shippingDays?: string;
  shippingInfo?: string;

  stock?: boolean;
  active?: boolean;
  featured?: boolean;
  sku?: string;

  createdAt?: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    title: {
      type: String,
    },

    description: {
      type: String,
    },

    shortDescription: {
      type: String,
    },

    benefits: [{ type: String }],

    features: [{ type: String }],

    faq: [
      {
        question: String,
        answer: String,
      },
    ],

    price: {
      type: Number,
      required: true,
    },

    costPrice: {
      type: Number,
    },

    comparePrice: {
      type: Number,
    },

    margin: {
      type: Number,
    },

    image: {
      type: String,
      required: true,
    },

    images: [
      {
        type: String,
      },
    ],

    category: {
      type: String,
    },

    slug: {
      type: String,
    },

    supplier: {
      type: String,
    },

    supplierId: {
      type: String,
    },

    supplierLink: {
      type: String,
    },

    shippingDays: {
      type: String,
      default: "10-20 días",
    },

    shippingInfo: {
      type: String,
    },

    stock: {
      type: Boolean,
      default: true,
    },

    active: {
      type: Boolean,
      default: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Product: Model<IProduct> =
  mongoose.models.Product ||
  model<IProduct>("Product", ProductSchema);

export default Product;