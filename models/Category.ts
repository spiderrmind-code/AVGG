import mongoose, { Schema, model, Model } from "mongoose";

interface ICategory {
  name: string;
}

const CategorySchema: Schema<ICategory> = new Schema({
  name: { type: String, required: true },
});

const Category: Model<ICategory> = mongoose.models.Category || model("Category", CategorySchema);
export default Category;
