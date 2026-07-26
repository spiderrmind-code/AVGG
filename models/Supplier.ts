import mongoose, { Schema, model, Model } from "mongoose";

export interface ISupplier {
  name: string;
  platform: "AliExpress" | "CJ Dropshipping" | "Local" | "Otro";
  email?: string;
  contact?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const SupplierSchema: Schema<ISupplier> = new Schema(
  {
    name: { type: String, required: true },
    platform: { type: String, required: true },
    email: { type: String },
    contact: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

const Supplier: Model<ISupplier> = mongoose.models.Supplier || model<ISupplier>("Supplier", SupplierSchema);

export default Supplier;
