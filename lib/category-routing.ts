const CATEGORY_SYNONYMS: Record<string, string[]> = {
  tecnologia: ["tecnologia", "tech", "electro", "gadget", "electronica"],
  hogar: ["hogar", "home", "decor", "cocina", "muebles"],
  accesorios: ["accesorios", "accessories", "accesorio", "fashion"],
  lifestyle: ["lifestyle", "estilo", "bienestar", "moda", "oficina"],
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildCategorySearchTerms(slug: string) {
  const normalizedSlug = normalizeText(slug);
  const terms = new Set<string>();

  if (!normalizedSlug) {
    return [];
  }

  const directTokens = normalizedSlug.split(/\s+/).filter(Boolean);

  for (const token of directTokens) {
    terms.add(token);
    terms.add(token.replace(/s$/, ""));
    terms.add(token.replace(/es$/, ""));
    terms.add(token.replace(/as$/, ""));
  }

  const canonicalKey = directTokens.join(" ");
  const synonyms = CATEGORY_SYNONYMS[canonicalKey] ?? CATEGORY_SYNONYMS[directTokens[0] ?? ""];
  if (synonyms) {
    synonyms.forEach((synonym) => terms.add(synonym));
  }

  if (normalizedSlug.includes("tecnologia") || normalizedSlug.includes("tech")) {
    ["tecnologia", "tech", "electro", "gadget", "electronica"].forEach((term) => terms.add(term));
  }

  if (normalizedSlug.includes("hogar") || normalizedSlug.includes("home")) {
    ["hogar", "home", "decor", "cocina", "muebles"].forEach((term) => terms.add(term));
  }

  if (normalizedSlug.includes("accesorio") || normalizedSlug.includes("accessory")) {
    ["accesorios", "accessories", "accesorio", "fashion"].forEach((term) => terms.add(term));
  }

  if (normalizedSlug.includes("lifestyle") || normalizedSlug.includes("estilo")) {
    ["lifestyle", "estilo", "bienestar", "moda", "oficina"].forEach((term) => terms.add(term));
  }

  return Array.from(terms).filter(Boolean);
}
