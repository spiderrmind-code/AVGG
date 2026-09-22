import type { Collection, Document } from "mongodb";
import { normalizeCatalogSlug } from "@/lib/catalog";
import { getDropsheableProducts, getDropsheableStock } from "@/lib/dropsheable/client";

type DropsheableRecord = Record<string, unknown>;

export type DropsheableProduct = {
  ID: number;
  TitlePersonalizado?: string;
  ArticuloOriginal?: string;
  DescriptionPersonalizada?: string;
  PrecioVenta?: string | number;
  CodigoSKU?: string;
  SKU?: string;
  PicturesPersonalizadas?: string;
  Categoria?: string;
  CategoryName?: string;
  Activo?: number | boolean;
  DateCreated?: string;
  DateUpdated?: string;
  Brand?: string;
  StockMayorista?: number | string;
};

export type DropsheableStock = {
  ID: number;
  SKU?: string;
  stock_actual?: number | string;
  StockMinimo?: number | string;
};

export type MappedDropsheableProduct = {
  name: string;
  title: string;
  description: string;
  price: number;
  image?: string;
  images: string[];
  category?: string;
  slug: string;
  sku: string;
  supplier: "Dropsheable";
  supplierId: "dropsheable";
  dropsheableId: string;
  stock: boolean;
  stockQuantity?: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ExistingCategory = { name: string; slug?: string };
export type DropsheableCategoryResult = { category?: string; reason: "matched" | "no_existing_category" | "no_clear_match" };

function record(value: unknown): DropsheableRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DropsheableRecord : null;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function date(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value.trim().replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parsePictures(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
  } catch {
    return value.startsWith("http://") || value.startsWith("https://") ? [value.trim()] : [];
  }
}

function isActive(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function normalized(value: string) {
  return normalizeCatalogSlug(value).replace(/-/g, " ");
}

const CATEGORY_ALIAS_MAP: Record<string, string[]> = {
  accesorios: ["accesorio", "accesorios", "billetera", "bolso", "collar", "reloj", "joya", "pulsera", "gafas", "mochila", "cinturon", "lentes"],
  audio: ["audio", "auriculares", "speaker", "altavoz", "parlante", "bluetooth", "microfono", "headset", "soundbar"],
  celulares: ["celular", "telefono", "smartphone", "movil", "iphone", "android", "samsung", "xiaomi", "motorola"],
  deportes: ["deporte", "deportes", "fitness", "gimnasio", "running", "yoga", "pesas", "bici", "tenis", "sport"],
  electronica: ["electronica", "tecnologia", "tech", "cable", "monitor", "teclado", "mouse", "usb", "adaptador", "camara", "smart"],
  gaming: ["gaming", "gamer", "console", "playstation", "xbox", "nintendo", "switch", "teclado", "mouse", "joystick"],
  hogar: ["hogar", "home", "cocina", "decor", "lampara", "muebles", "organizacion", "escritorio", "jardin"],
  moda: ["moda", "ropa", "vestido", "remera", "camisa", "pantalon", "zapatilla", "calzado", "fashion"],
};

function normalizeCategoryText(value: string) {
  return normalizeCatalogSlug(value).replace(/-/g, " ");
}

function categoryTermsFor(category: ExistingCategory): string[] {
  const values = [category.name, category.slug].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  const terms = values.flatMap((value) => normalizeCategoryText(value).split(/\s+/)).filter((term): term is string => Boolean(term));
  const canonicalKey = terms.join(" ");
  const aliases = Object.entries(CATEGORY_ALIAS_MAP).find(([key]) => canonicalKey.includes(key) || terms.some((part: string) => part === key || part.includes(key)))?.[1] ?? [];
  return Array.from(new Set([...terms, ...aliases])).filter((term) => term.length >= 3);
}

function categoryMatchesText(category: ExistingCategory, productText: string) {
  const terms = categoryTermsFor(category);
  if (!terms.length) return 0;
  const hits = terms.filter((term) => productText.includes(term));
  if (hits.length === 0) return 0;
  if (terms.length <= 2) return hits.length;
  return hits.length >= 2 ? hits.length : 0;
}

export function classifyDropsheableProduct(product: Document, categories: ExistingCategory[]): DropsheableCategoryResult {
  const productCategory = typeof product.category === "string" ? product.category.trim() : "";
  const categoryByName = categories.find((category) => [category.name, category.slug].filter(Boolean).some((value) => normalized(value!) === normalized(productCategory)));
  if (productCategory && categoryByName) return { category: categoryByName.name, reason: "matched" };

  const textParts = [product.name, product.title, product.description, product.brand, product.sku]
    .filter((value): value is string => typeof value === "string")
    .map(normalized)
    .filter(Boolean);
  const productText = textParts.join(" ");
  const matches = categories
    .map((category) => ({ category: category.name, score: categoryMatchesText(category, productText) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  if (matches.length === 1) return { category: matches[0].category, reason: "matched" };
  if (matches.length > 1) {
    const bestScore = matches[0].score;
    const bestMatches = matches.filter((entry) => entry.score === bestScore);
    if (bestMatches.length === 1) return { category: bestMatches[0].category, reason: "matched" };
  }

  const fallbackCategory = categories[0]?.name?.trim() || undefined;
  if (fallbackCategory) {
    return { category: fallbackCategory, reason: "no_clear_match" };
  }

  return { reason: "no_existing_category" };
}

export async function classifyStoredDropsheableProduct(collection: Collection<Document>, externalId: string) {
  const product = await collection.findOne({ dropsheableId: externalId, supplierId: "dropsheable" });
  if (!product) throw new Error(`Producto Dropsheable ${externalId} no encontrado`);
  const categories = await collection.db.collection("categorias").find({ active: { $ne: false } }, { projection: { name: 1, slug: 1 } }).toArray();
  const existingCategories = categories.flatMap((category): ExistingCategory[] => typeof category.name === "string" && category.name.trim().length > 0 ? [{ name: category.name, ...(typeof category.slug === "string" ? { slug: category.slug } : {}) }] : []);
  const result = classifyDropsheableProduct(product, existingCategories);
  if (!result.category || product.category === result.category) return { ...result, updated: false, product };
  await collection.updateOne({ _id: product._id }, { $set: { category: result.category } });
  return { ...result, updated: true, product: (await collection.findOne({ _id: product._id })) ?? product };
}

export function unwrapProducts(value: unknown): DropsheableProduct[] {
  const root = record(value); const data = record(root?.data); const products = data?.productos;
  return Array.isArray(products) ? products.filter((item): item is DropsheableProduct => record(item)?.ID !== undefined) : [];
}

export function unwrapStock(value: unknown): DropsheableStock[] {
  const root = record(value); const data = record(root?.data); const stock = data?.stock;
  return Array.isArray(stock) ? stock.filter((item): item is DropsheableStock => record(item)?.ID !== undefined) : [];
}

export function mapDropsheableProduct(input: DropsheableProduct, stock?: DropsheableStock): MappedDropsheableProduct | null {
  const id = number(input.ID);
  const name = text(input.TitlePersonalizado) ?? text(input.ArticuloOriginal);
  const sku = text(input.CodigoSKU) ?? text(input.SKU);
  const price = number(input.PrecioVenta);
  if (id === undefined || !name || !sku || price === undefined || price < 0) return null;
  const images = parsePictures(input.PicturesPersonalizadas);
  const stockQuantity = stock ? number(stock.stock_actual) : undefined;
  const category = text(input.Categoria) ?? text(input.CategoryName);
  const mapped: MappedDropsheableProduct = {
    name,
    title: name,
    description: text(input.DescriptionPersonalizada) ?? "",
    price,
    images,
    ...(images[0] ? { image: images[0] } : {}),
    ...(category ? { category } : {}),
    slug: `${normalizeCatalogSlug(name)}-${id}`,
    sku,
    supplier: "Dropsheable",
    supplierId: "dropsheable",
    dropsheableId: String(id),
    ...(stockQuantity !== undefined ? { stockQuantity, stock: stockQuantity > 0 } : { stock: false }),
    active: isActive(input.Activo),
    ...(date(input.DateCreated) ? { createdAt: date(input.DateCreated) } : {}),
    ...(date(input.DateUpdated) ? { updatedAt: date(input.DateUpdated) } : {}),
  };
  return mapped;
}

export async function importDropsheableProduct(collection: Collection<Document>, externalId?: string) {
  const productsResponse = await getDropsheableProducts({ offset: 0 });
  const products = unwrapProducts(productsResponse);
  const source = externalId ? products.find((product) => String(product.ID) === externalId) : products[0];
  if (!source) throw new Error(externalId ? `Producto Dropsheable ${externalId} no está en la página consultada` : "Dropsheable no devolvió productos");
  const stock = unwrapStock(await getDropsheableStock());
  const sourceStock = stock.find((item) => item.ID === source.ID || (text(item.SKU) !== undefined && text(item.SKU) === (text(source.CodigoSKU) ?? text(source.SKU))));
  const mapped = mapDropsheableProduct(source, sourceStock);
  if (!mapped) throw new Error(`Producto Dropsheable ${source.ID} no cumple el contrato mínimo`);
  const existing = await collection.findOne({ dropsheableId: mapped.dropsheableId, supplierId: mapped.supplierId });
  const bySku = existing ?? await collection.findOne({ supplierId: mapped.supplierId, sku: mapped.sku });
  const now = new Date();
  const document = { ...mapped, updatedAt: now, ...(bySku?.createdAt ? { createdAt: bySku.createdAt } : {}) };
  let mongoId = bySku?._id;
  if (bySku) {
    await collection.updateOne({ _id: bySku._id }, { $set: document });
  } else {
    const result = await collection.insertOne({ ...document, createdAt: mapped.createdAt ?? now });
    mongoId = result.insertedId;
  }
  const stored = await collection.findOne({ _id: mongoId });
  return { action: bySku ? "updated" as const : "inserted" as const, source, sourceStock, mapped, mongoId: stored?._id, stored };
}
