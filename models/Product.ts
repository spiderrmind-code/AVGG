import mongoose, { Schema, model, Model } from "mongoose";

export interface IProduct {
  name: string;
  description?: string;

  price: number; // Precio de venta
  costPrice?: number; // Precio del proveedor

  comparePrice?: number; // Precio anterior para mostrar descuento

  image: string;
  images?: string[];

  category?: string;

  supplier?: string;
  supplierId?: string;

  shippingDays?: string;

  stock?: boolean;

  featured?: boolean;

  createdAt?: Date;
}

const ProductSchema: Schema<IProduct> = new Schema(
  {
    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

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

    supplier: {
      type: String,
    },

    supplierId: {
      type: String,
    },

    shippingDays: {
      type: String,
      default: "10-20 días",
    },

    stock: {
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