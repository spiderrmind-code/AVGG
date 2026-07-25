import mongoose, { Schema, model, Model } from "mongoose";

interface IBanner {
  title: string;
  image: string;
}

const BannerSchema: Schema<IBanner> = new Schema({
  title: { type: String, required: true },
  image: { type: String, required: true },
});

const Banner: Model<IBanner> = mongoose.models.Banner || model("Banner", BannerSchema);
export default Banner;
