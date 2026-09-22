import mongoose from "mongoose";
import Product from "@/models/Product";

type GetPublicCatalogOptions = {
  limit?: number;
  page?: number;
  category?: string;
  featured?: boolean;
};

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Falta MONGO_URI o MONGODB_URI en .env.local");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return;
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || undefined,
  });
}

export async function getPublicCatalog(
  options: GetPublicCatalogOptions = {}
) {
  await connectDB();

  const limit = Math.min(Math.max(options.limit ?? 100, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    active: { $ne: false },
  };

  if (options.category) {
    filter.category = options.category;
  }

  if (options.featured !== undefined) {
    filter.featured = options.featured;
  }

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return products.map((product) => ({
    ...product,
    _id: product._id.toString(),
  }));
}