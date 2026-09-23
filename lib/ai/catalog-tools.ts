import { ObjectId, type Document, type Filter } from "mongodb";
import { normalizeCatalogSlug, normalizePublicProduct, type PublicProduct } from "@/lib/catalog";

/**
 * Server-only catalogue tools for the AI route.  They deliberately return the
 * same public product contract used by the storefront, never raw MongoDB docs.
 */

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
const MAX_CANDIDATES = 100;
const MAX_QUERY_LENGTH = 160;
const MAX_KEYWORDS = 8;
const MAX_KEYWORD_LENGTH = 80;
const MAX_CATEGORY_LENGTH = 80;

const SEARCH_FIELDS = [
  "name",
  "title",
  "description",
  "category",
  "categorySlug",
  "sku",
  "brand",
  "features",
  "benefits",
  "color",
  "colors",
  "tags",
] as const;

const STOP_WORDS = new Set([
  "a", "al", "algo", "con", "como", "de", "del", "el", "en", "es", "la", "las", "lo", "los", "me", "mi", "para", "por", "que", "quiero", "un", "una", "unos", "unas", "y",
]);

const ACCENT_VARIANTS: Record<string, string> = {
  a: "aáàâäã",
  e: "eéèêë",
  i: "iíìîï",
  o: "oóòôöõ",
  u: "uúùûü",
  n: "nñ",
  c: "cç",
  y: "yýÿ",
};

export type SearchProductsInput = {
  query?: string;
  keywords?: string[];
  category?: string;
  maxPrice?: number;
  limit?: number;
};

type SanitizedSearchInput = {
  query?: string;
  keywords: string[];
  category?: string;
  maxPrice?: number;
  limit: number;
};

function text(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized && normalized.length <= maxLength ? normalized : undefined;
}

function numberInRange(value: unknown, maximum: number) {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+(?:[.,]\d+)?$/.test(value.trim())
      ? Number(value.trim().replace(",", "."))
      : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : undefined;
}

function normalizedText(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function searchTerms(value: string) {
  return normalizedText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length >= 2 && !STOP_WORDS.has(term));
}

function regexPattern(value: string) {
  return Array.from(value).map((character) => {
    const normalized = normalizedText(character);
    const variants = ACCENT_VARIANTS[normalized];
    if (variants) return `[${variants}]`;
    return character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("");
}

function asTextValues(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function fieldMatches(document: Document, field: string, term: string) {
  const needle = normalizedText(term);
  return asTextValues(document[field]).some((value) => normalizedText(value).includes(needle));
}

function sanitizeSearchInput(input: SearchProductsInput = {}): SanitizedSearchInput {
  const record = input as Record<string, unknown>;
  const query = text(record.query, MAX_QUERY_LENGTH);
  const sourceKeywords = Array.isArray(record.keywords)
    ? record.keywords
    : typeof record.keywords === "string"
      ? [record.keywords]
      : [];
  const keywords = Array.from(new Set(sourceKeywords
    .map((keyword) => text(keyword, MAX_KEYWORD_LENGTH))
    .filter((keyword): keyword is string => Boolean(keyword))))
    .slice(0, MAX_KEYWORDS);
  const category = text(record.category, MAX_CATEGORY_LENGTH);
  const maxPrice = numberInRange(record.maxPrice, 1_000_000_000);
  const requestedLimit = numberInRange(record.limit, MAX_LIMIT);

  return {
    ...(query ? { query } : {}),
    keywords,
    ...(category ? { category } : {}),
    ...(maxPrice !== undefined ? { maxPrice } : {}),
    limit: requestedLimit === undefined ? DEFAULT_LIMIT : Math.max(1, Math.floor(requestedLimit)),
  };
}

function buildTextClause(terms: string[]): Filter<Document> | undefined {
  if (!terms.length) return undefined;
  return {
    $or: terms.flatMap((term) => {
      const pattern = regexPattern(term);
      return SEARCH_FIELDS.map((field) => ({ [field]: { $regex: pattern, $options: "i" } }));
    }),
  } as Filter<Document>;
}

function buildCategoryClause(category: string): Filter<Document> {
  const rawPattern = regexPattern(category);
  const slugPattern = regexPattern(normalizeCatalogSlug(category));
  return {
    $or: [
      { category: { $regex: rawPattern, $options: "i" } },
      { categorySlug: { $regex: slugPattern, $options: "i" } },
    ],
  } as Filter<Document>;
}

function rankProduct(product: PublicProduct, document: Document, terms: string[], category?: string, query?: string) {
  let score = product.featured ? 2 : 0;
  const titleFields = ["name", "title"];
  const descriptiveFields = ["description", "features", "benefits", "color", "colors", "tags"];

  if (query && titleFields.some((field) => fieldMatches(document, field, query))) score += 24;
  for (const term of terms) {
    if (titleFields.some((field) => fieldMatches(document, field, term))) score += 12;
    if (fieldMatches(document, "category", term) || fieldMatches(document, "categorySlug", term)) score += 8;
    if (descriptiveFields.some((field) => fieldMatches(document, field, term))) score += 6;
    if (fieldMatches(document, "brand", term) || fieldMatches(document, "sku", term)) score += 4;
  }

  if (category && (fieldMatches(document, "category", category) || fieldMatches(document, "categorySlug", normalizeCatalogSlug(category)))) {
    score += 28;
  }

  return score;
}

async function getCatalogDb() {
  const { default: mongoose } = await import("mongoose");
  const uri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  if (!uri) throw new Error("MongoDB no est\u00e1 configurado");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
  } else if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
  }
  if (!mongoose.connection.db) throw new Error("MongoDB no est\u00e1 disponible");
  return mongoose.connection.db;
}

/**
 * Searches only active, purchasable catalogue products and returns public,
 * canonical values. Inputs are bounded before becoming MongoDB predicates.
 */
export async function searchProducts(input: SearchProductsInput = {}): Promise<PublicProduct[]> {
  const safe = sanitizeSearchInput(input);
  const terms = Array.from(new Set([
    ...(safe.query ? searchTerms(safe.query) : []),
    ...safe.keywords.flatMap(searchTerms),
  ])).slice(0, MAX_KEYWORDS);

  const filter: Filter<Document> = { active: { $ne: false } };
  const clauses = [
    buildTextClause(terms),
    ...(safe.category ? [buildCategoryClause(safe.category)] : []),
  ].filter((clause): clause is Filter<Document> => Boolean(clause));
  if (clauses.length) filter.$and = clauses;
  if (safe.maxPrice !== undefined) filter.price = { $lte: safe.maxPrice };

  const db = await getCatalogDb();
  const documents = await db.collection("products")
    .find(filter)
    .sort({ featured: -1, createdAt: -1 })
    .limit(MAX_CANDIDATES)
    .toArray();

  return documents
    .flatMap((document) => {
      const product = normalizePublicProduct(document);
      if (!product || !product.inStock || (safe.maxPrice !== undefined && product.price > safe.maxPrice)) return [];
      return [{ product, score: rankProduct(product, document, terms, safe.category, safe.query) }];
    })
    .sort((left, right) => right.score - left.score || Number(right.product.featured) - Number(left.product.featured) || left.product.price - right.product.price || left.product.name.localeCompare(right.product.name, "es"))
    .slice(0, safe.limit)
    .map(({ product }) => product);
}

/**
 * Resolves a real MongoDB product id for a pending cart action. Out-of-stock
 * and inactive documents are intentionally indistinguishable from not found.
 */
export async function getProduct(productId: string): Promise<PublicProduct | null> {
  const id = text(productId, 24);
  if (!id || !/^[a-f\d]{24}$/i.test(id) || !ObjectId.isValid(id)) return null;

  const db = await getCatalogDb();
  const document = await db.collection("products").findOne({
    _id: new ObjectId(id),
    active: { $ne: false },
  });
  const product = document ? normalizePublicProduct(document) : null;
  return product?.inStock ? product : null;
}
