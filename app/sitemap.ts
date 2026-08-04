import type { MetadataRoute } from "next";
import { resolveAppBaseUrl } from "@/lib/app-url";
import { getDb } from "@/lib/mongo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = resolveAppBaseUrl();
  const now = new Date();
  const staticPaths = [
    "", "/nosotros", "/envios", "/cambios", "/contacto", "/faq",
    "/terminos-y-condiciones", "/politica-de-privacidad", "/politica-de-cookies",
    "/cambios-y-devoluciones", "/preguntas-frecuentes", "/ayuda",
  ];
  let dynamicEntries: MetadataRoute.Sitemap = [];

  try {
    const db = await getDb();
    const [products, categories] = await Promise.all([
      db.collection("products").find({ active: { $ne: false } }, { projection: { _id: 1, slug: 1, updatedAt: 1, createdAt: 1 } }).toArray(),
      db.collection("categorias").find({}, { projection: { slug: 1, updatedAt: 1, createdAt: 1 } }).toArray(),
    ]);
    dynamicEntries = [
      ...products.map((product) => ({
        url: `${baseUrl}/product/${encodeURIComponent(String(product.slug ?? product._id))}`,
        lastModified: product.updatedAt instanceof Date ? product.updatedAt : product.createdAt instanceof Date ? product.createdAt : now,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...categories.filter((category) => typeof category.slug === "string" && category.slug).map((category) => ({
        url: `${baseUrl}/category/${encodeURIComponent(category.slug)}`,
        lastModified: category.updatedAt instanceof Date ? category.updatedAt : category.createdAt instanceof Date ? category.createdAt : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ];
  } catch {
    // El sitemap estático sigue disponible si MongoDB no responde durante el rastreo.
  }

  return [
    ...staticPaths.map((path, index) => ({
      url: `${baseUrl}${path}`,
      lastModified: now,
      changeFrequency: index === 0 ? "weekly" as const : "monthly" as const,
      priority: index === 0 ? 1 : 0.8,
    })),
    ...dynamicEntries,
  ];
}
