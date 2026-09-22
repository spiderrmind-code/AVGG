import mongoose, { Schema, model, Model } from "mongoose";

export type PromotionType = "percentage" | "fixed";
export type PromotionStatus = "draft" | "scheduled" | "active" | "paused" | "expired";

export interface IPromotion {
  productId: mongoose.Types.ObjectId;
  basePrice: number;
  promotionalPrice: number;
  discountPercent: number;
  type: PromotionType;
  startsAt: Date;
  endsAt: Date;
  status: PromotionStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const PromotionSchema: Schema<IPromotion> = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, required: true, index: true },
    basePrice: { type: Number, required: true, min: 0 },
    promotionalPrice: { type: Number, required: true, min: 0 },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    startsAt: { type: Date, required: true, index: true },
    endsAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ["draft", "scheduled", "active", "paused", "expired"], required: true, index: true },
  },
  { timestamps: true },
);

PromotionSchema.index({ productId: 1, status: 1, startsAt: 1, endsAt: 1 });

const Promotion: Model<IPromotion> = mongoose.models.Promotion || model<IPromotion>("Promotion", PromotionSchema);

export default Promotion;