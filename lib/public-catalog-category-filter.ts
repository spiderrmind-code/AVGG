import { buildCategorySearchTerms } from "@/lib/category-routing";
import { escapeRegex, normalizeCatalogSlug } from "@/lib/catalog";

const ACCENT_VARIANT_MAP: Record<string, string[]> = {
  a: ["a", "á", "à", "â", "ä", "ã"],
  e: ["e", "é", "è", "ê", "ë"],
  i: ["i", "í", "ì", "î", "ï"],
  o: ["o", "ó", "ò", "ô", "ö", "õ"],
  u: ["u", "ú", "ù", "û", "ü"],
  n: ["n", "ñ"],
  c: ["c", "ç"],
  y: ["y", "ý"],
};

function buildAccentAwareTokenPattern(token: string) {
  return Array.from(token)
    .map((character) => {
      const variants = ACCENT_VARIANT_MAP[character] ?? [character];
      const charClass = Array.from(new Set(variants)).map(escapeRegex).join("");
      return `[${charClass}]`;
    })
    .join("");
}

function legacyCategoryPattern(slug: string) {
  const tokens = normalizeCatalogSlug(slug).split("-").filter(Boolean);
  if (tokens.length === 0) return /^$/i;
  const pattern = tokens.map((token) => buildAccentAwareTokenPattern(token)).join("[^a-z0-9]*");
  return new RegExp(`^${pattern}$`, "i");
}

export function buildPublicCategoryFilter(category: string) {
  const terms = Array.from(new Set([normalizeCatalogSlug(category), ...buildCategorySearchTerms(category).map(normalizeCatalogSlug)]));
  return {
    $or: [
      { categorySlug: { $in: terms } },
      { category: { $in: terms.map(legacyCategoryPattern) } },
    ],
  };
}

export function buildPublicCatalogFilter(options: { category?: string; featured?: boolean } = {}) {
  const filter: Record<string, unknown> = { active: { $ne: false } };

  if (options.category) {
    Object.assign(filter, buildPublicCategoryFilter(options.category));
  }

  if (options.featured !== undefined) {
    filter.featured = options.featured;
  }

  return filter;
}
