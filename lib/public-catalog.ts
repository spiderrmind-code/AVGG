import mongoose from "mongoose";
import Product from "@/models/Product";
import { normalizePublicProduct } from "@/lib/catalog";
import { resolveMongoConfig } from "@/lib/mongo";
import { buildPublicCatalogFilter } from "@/lib/public-catalog-category-filter";

type GetPublicCatalogOptions = {
  limit?: number;
  page?: number;
  category?: string;
  featured?: boolean;
};

async function connectDB() {
  const { uri, dbName } = resolveMongoConfig();

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
    dbName: dbName || undefined,
  });
}

export async function getPublicCatalog(
  options: GetPublicCatalogOptions = {}
) {
  await connectDB();

  const limit = Math.min(Math.max(options.limit ?? 100, 1), 100);
  const page = Math.max(options.page ?? 1, 1);
  const skip = (page - 1) * limit;

  const filter = buildPublicCatalogFilter({
    category: options.category,
    featured: options.featured,
  });

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return products
    .map((product) => normalizePublicProduct(product as unknown as Record<string, unknown>))
    .filter((product): product is NonNullable<typeof product> => product !== null)
    .map((product) => ({
      ...product,
      _id: String(product._id),
    }));
}
