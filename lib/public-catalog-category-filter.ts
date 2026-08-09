import { buildCategorySearchTerms } from "@/lib/category-routing";
import { escapeRegex, normalizeCatalogSlug } from "@/lib/catalog";

function legacyCategoryPattern(slug: string) {
  return new RegExp(`^${slug.split("-").map(escapeRegex).join("[^a-z0-9]*")}$`, "i");
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
