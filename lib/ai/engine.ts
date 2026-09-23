import { getProduct, searchProducts, type SearchProductsInput } from "@/lib/ai/catalog-tools";
import { createAiProvider } from "@/lib/ai/gemini-provider";
import type {
  AiCartProduct,
  AiChatMessage,
  AiChatResult,
  AiConversationState,
  AiProvider,
  AiProviderIntent,
  AiSearchCriteria,
} from "@/lib/ai/types";
import type { PublicProduct } from "@/lib/catalog";

const MAX_MESSAGE_LENGTH = 600;
const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_MESSAGE_LENGTH = 300;
const MAX_PRODUCT_IDS = 8;
const MAX_TERMS = 12;
const MAX_TERM_LENGTH = 48;
const MAX_PRICE = 20_000_000;

const GENERIC_TERMS = new Set([
  "algo", "buscar", "busco", "buscame", "buscame", "comprar", "compra", "conseguir", "dale",
  "de", "del", "el", "ella", "en", "es", "esta", "este", "la", "las", "le", "lo", "los",
  "me", "mi", "mis", "para", "por", "que", "quiero", "regalar", "regalo", "regalos", "si",
  "tengo", "un", "una", "uno", "unos", "unas", "ver", "verme", "vos", "y",
]);

const BUDGET_TERMS = new Set(["ars", "k", "luca", "lucas", "mil", "peso", "pesos", "presupuesto"]);

const TERM_EXPANSIONS: Record<string, string[]> = {
  auricular: ["auriculares", "headset", "headphone"],
  auriculares: ["auricular", "headset", "headphone"],
  celular: ["telefono", "smartphone", "movil"],
  computadora: ["notebook", "laptop", "pc"],
  consola: ["gaming", "gamer"],
  gato: ["gatos", "cat"],
  gatos: ["gato", "cat"],
  notebook: ["laptop", "computadora"],
  parlante: ["parlantes", "speaker", "bluetooth"],
  parlantes: ["parlante", "speaker", "bluetooth"],
  telefono: ["celular", "smartphone", "movil"],
  zapatilla: ["zapatillas", "calzado"],
  zapatillas: ["zapatilla", "calzado"],
};

type EngineInput = {
  message: string;
  history?: unknown;
  conversation?: unknown;
  selectionProductId?: unknown;
};

type EngineDependencies = {
  provider?: AiProvider | null;
  search?: (input: SearchProductsInput) => Promise<PublicProduct[]>;
  getProduct?: (productId: string) => Promise<PublicProduct | null>;
};

function compact(value: string, maximum: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maximum);
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("es-AR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function toTerms(value: string) {
  return normalizeText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && term.length <= MAX_TERM_LENGTH)
    .filter((term) => !GENERIC_TERMS.has(term) && !BUDGET_TERMS.has(term) && !/^\d+$/.test(term));
}

function uniqueTerms(values: string[]) {
  return [...new Set(values.map((term) => normalizeText(compact(term, MAX_TERM_LENGTH))).filter((term) => term.length >= 2))]
    .slice(0, MAX_TERMS);
}

function expandTerms(terms: string[]) {
  return uniqueTerms(terms.flatMap((term) => [term, ...(TERM_EXPANSIONS[term] ?? [])]));
}

export function parseBudget(message: string): number | undefined {
  const normalized = normalizeText(message).replace(/\s+/g, " ");
  const scaled = normalized.match(/(?:\$\s*)?(\d+(?:[,.]\d+)?)\s*(lucas?|mil|k)\b/);
  if (scaled) {
    const value = Number(scaled[1].replace(",", "."));
    if (Number.isFinite(value) && value > 0) return Math.min(MAX_PRICE, Math.round(value * 1_000));
  }

  const direct = normalized.match(/(?:\$\s*|(?:hasta|menos de|maximo|presupuesto|tengo)\s+)(\d{1,3}(?:[.\s]\d{3})+|\d{4,8})(?:\s*(?:ars|pesos?))?/);
  if (!direct) return undefined;
  const value = Number(direct[1].replace(/[.\s]/g, ""));
  return Number.isFinite(value) && value > 0 ? Math.min(MAX_PRICE, value) : undefined;
}

export function isAffirmative(message: string) {
  const normalized = normalizeText(message).replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  return /^(si|dale|agregalo|agregala|agregarlo|agregarla|mandalo|mandala|confirmo|ok|okay|de una|deuna)\b/.test(normalized);
}

function isNegative(message: string) {
  const normalized = normalizeText(message).replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  return /^(no|mejor no|cancelar|cancela|dejalo|dejala|no gracias)\b/.test(normalized);
}

export function selectionIndexFromMessage(message: string): number | undefined {
  const normalized = normalizeText(message);
  if (/\b(primer[oa]?|primero|1(?:ro|ra)?)\b/.test(normalized)) return 0;
  if (/\b(segund[oa]?|segundo|2(?:do|da)?)\b/.test(normalized)) return 1;
  if (/\b(tercer[oa]?|tercero|3(?:ro|ra)?)\b/.test(normalized)) return 2;
  if (/\b(cuart[oa]?|cuarto|4(?:to|ta)?)\b/.test(normalized)) return 3;
  const numeric = normalized.match(/\b(?:el|la|opcion|numero|n)\s*(\d{1,2})\b/);
  if (!numeric) return undefined;
  const index = Number(numeric[1]) - 1;
  return Number.isInteger(index) && index >= 0 && index < MAX_PRODUCT_IDS ? index : undefined;
}

function sanitizeHistory(value: unknown): AiChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .flatMap((item): AiChatMessage[] => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const message = item as Record<string, unknown>;
      if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") return [];
      const content = compact(message.content, MAX_HISTORY_MESSAGE_LENGTH);
      return content ? [{ role: message.role, content }] : [];
    })
    .slice(-MAX_HISTORY_MESSAGES);
}

function safeOptionalText(value: unknown, maximum = MAX_TERM_LENGTH) {
  return typeof value === "string" ? compact(value, maximum) || undefined : undefined;
}

function sanitizeCriteria(value: unknown): AiSearchCriteria {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { terms: [] };
  const criteria = value as Record<string, unknown>;
  const terms = Array.isArray(criteria.terms)
    ? uniqueTerms(criteria.terms.filter((term): term is string => typeof term === "string"))
    : [];
  const maxPrice = typeof criteria.maxPrice === "number" && Number.isFinite(criteria.maxPrice) && criteria.maxPrice > 0
    ? Math.min(MAX_PRICE, Math.floor(criteria.maxPrice))
    : undefined;
  const category = safeOptionalText(criteria.category);
  const color = safeOptionalText(criteria.color);
  return {
    terms,
    ...(maxPrice ? { maxPrice } : {}),
    ...(category ? { category } : {}),
    ...(color ? { color } : {}),
  };
}

function isProductId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}

export function sanitizeConversation(value: unknown): AiConversationState {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { criteria: { terms: [] }, productIds: [] };
  const conversation = value as Record<string, unknown>;
  const productIds = Array.isArray(conversation.productIds)
    ? [...new Set(conversation.productIds.filter(isProductId))].slice(0, MAX_PRODUCT_IDS)
    : [];
  const pendingConfirmationProductId = isProductId(conversation.pendingConfirmationProductId)
    ? conversation.pendingConfirmationProductId
    : undefined;
  return {
    criteria: sanitizeCriteria(conversation.criteria),
    productIds,
    ...(pendingConfirmationProductId ? { pendingConfirmationProductId } : {}),
  };
}

function mergeCriteria(previous: AiSearchCriteria, message: string, providerIntent: AiProviderIntent): AiSearchCriteria {
  const localBudget = parseBudget(message);
  const localTerms = toTerms(message);
  const providerTerms = Array.isArray(providerIntent.keywords) ? providerIntent.keywords : [];
  const terms = expandTerms(uniqueTerms([...previous.terms, ...localTerms, ...providerTerms]));
  const category = safeOptionalText(providerIntent.category) ?? previous.category;
  const color = safeOptionalText(providerIntent.color) ?? previous.color;
  const providerBudget = typeof providerIntent.maxPrice === "number" && Number.isFinite(providerIntent.maxPrice) && providerIntent.maxPrice > 0
    ? Math.min(MAX_PRICE, Math.floor(providerIntent.maxPrice))
    : undefined;
  return {
    terms,
    ...(localBudget ?? providerBudget ?? previous.maxPrice ? { maxPrice: localBudget ?? providerBudget ?? previous.maxPrice } : {}),
    ...(category ? { category } : {}),
    ...(color ? { color } : {}),
  };
}

function hasUsefulCriteria(criteria: AiSearchCriteria) {
  return criteria.terms.some((term) => !GENERIC_TERMS.has(term)) || criteria.maxPrice !== undefined || Boolean(criteria.category);
}

function searchWasRequested(message: string) {
  const normalized = normalizeText(message);
  return /\b(busca|buscar|busco|quiero|mostra|mostrame|tenes|tene|opciones|regalo|necesito|algo)\b/.test(normalized);
}

function wantsCheckout(message: string) {
  const normalized = normalizeText(message).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  return /\b(quiero|voy a|vamos a|ir a|continuar a|seguir a)\s+(comprar|pagar|checkout)\b/.test(normalized)
    || /\b(ir al|continuar al|seguir al)\s+(carrito|checkout)\b/.test(normalized)
    || /\b(finalizar|finalizo)\s+(la\s+)?compra\b/.test(normalized)
    || /\bquiero\s+(finalizar|terminar)\b/.test(normalized)
    || normalized === "comprar";
}

function wantsCart(message: string) {
  const normalized = normalizeText(message).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  return /\b(que|como)\s+(tengo|hay)\s+en\s+el\s+carrito\b/.test(normalized)
    || /\b(ver|mostra(?:me)?|ir al|abrir)\s+(mi\s+|el\s+)?carrito\b/.test(normalized);
}

function asksForAlternative(message: string) {
  return /\b(caro|barat[oa]|parecid[oa]|similar|alternativa)\b/.test(normalizeText(message));
}

function selectionCopy(product: PublicProduct) {
  return `Sí, es ${product.name}. ¿Querés que lo agregue al carrito?`;
}

function toCartProduct(product: PublicProduct): AiCartProduct {
  return {
    _id: product._id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    ...(product.image ? { image: product.image } : {}),
    inStock: product.inStock,
    ...(product.stockQuantity !== undefined ? { stockQuantity: product.stockQuantity } : {}),
    ...(product.comparePrice !== undefined ? { comparePrice: product.comparePrice } : {}),
  };
}

function productIds(products: PublicProduct[]) {
  return products.map((product) => product._id).slice(0, MAX_PRODUCT_IDS);
}

async function hydrateProducts(ids: string[], resolver: (productId: string) => Promise<PublicProduct | null>) {
  const results = await Promise.all(ids.map((id) => resolver(id)));
  return results.filter((product): product is PublicProduct => product !== null);
}

function selectionFromMention(message: string, products: PublicProduct[]) {
  const normalizedMessage = normalizeText(message);
  return products.find((product) => {
    const name = normalizeText(product.name);
    return name.length >= 4 && (normalizedMessage.includes(name) || name.includes(normalizedMessage));
  });
}

function selectionFromDetails(message: string, products: PublicProduct[]) {
  const terms = toTerms(message).filter((term) => term !== "arriba" && term !== "opcion");
  if (!terms.length) return undefined;
  const matches = products.filter((product) => {
    const searchable = normalizeText(`${product.name} ${product.description} ${product.category}`);
    return terms.every((term) => searchable.includes(term));
  });
  return matches.length === 1 ? matches[0] : undefined;
}

function selectionFromPrice(message: string, products: PublicProduct[]) {
  const price = parseBudget(message);
  if (price === undefined) return undefined;
  const matches = products.filter((product) => product.price === price);
  return matches.length === 1 ? matches[0] : undefined;
}

function selectionFromReference(message: string, products: PublicProduct[], pendingProductId?: string) {
  const normalized = normalizeText(message);
  const pendingIndex = pendingProductId ? products.findIndex((product) => product._id === pendingProductId) : -1;
  if (/\b(anterior|previo|previa)\b/.test(normalized)) return products[pendingIndex > 0 ? pendingIndex - 1 : Math.max(0, products.length - 2)];
  if (/\b(ultimo|ultima)\b/.test(normalized)) return products.at(-1);
  if (/\b(de arriba|arriba)\b/.test(normalized)) return products[0];
  if (/\b(ese|esa|esa opcion|este|esta)\b/.test(normalized)) return pendingIndex >= 0 ? products[pendingIndex] : products[0];
  return undefined;
}

function lowerAlternativeBudget(criteria: AiSearchCriteria, selected?: PublicProduct) {
  if (!selected) return criteria.maxPrice;
  const lowerThanSelected = Math.max(1, selected.price - 1);
  return criteria.maxPrice === undefined ? lowerThanSelected : Math.min(criteria.maxPrice, lowerThanSelected);
}

function needsAlternativeSearch(criteria: AiSearchCriteria) {
  return criteria.terms.some((term) => term === "regalo" || term === "regalos" || term === "regalar") || Boolean(criteria.category);
}

export async function runAiChat(input: EngineInput, dependencies: EngineDependencies = {}): Promise<AiChatResult> {
  const message = typeof input.message === "string" ? compact(input.message, MAX_MESSAGE_LENGTH) : "";
  if (!message) throw new Error("Escribí qué estás buscando para poder ayudarte.");

  const findProduct = dependencies.getProduct ?? getProduct;
  const findProducts = dependencies.search ?? searchProducts;
  const state = sanitizeConversation(input.conversation);
  const previousCriteria = state.criteria ?? { terms: [] };
  const previousProducts = await hydrateProducts(state.productIds ?? [], findProduct);
  const baseConversation = { criteria: previousCriteria, productIds: productIds(previousProducts) };
  const explicitSelection = isProductId(input.selectionProductId) ? input.selectionProductId : undefined;

  if (state.pendingConfirmationProductId && isAffirmative(message)) {
    const product = await findProduct(state.pendingConfirmationProductId);
    if (!product) {
      return {
        reply: "Ese producto ya no está disponible. Si querés, busco una alternativa real.",
        products: [],
        conversation: baseConversation,
      };
    }
    return {
      reply: "Listo, lo agregué al carrito.",
      products: [],
      cartProduct: toCartProduct(product),
      conversation: baseConversation,
    };
  }

  if (state.pendingConfirmationProductId && isNegative(message) && !/\b(anterior|previo|previa)\b/.test(normalizeText(message))) {
    return {
      reply: "Perfecto, no lo agrego. Decime si querés que busque otra opción.",
      products: previousProducts,
      conversation: baseConversation,
    };
  }

  let providerIntent: AiProviderIntent = {};
  const provider = dependencies.provider === undefined ? createAiProvider() : dependencies.provider;
  if (provider) {
    try {
      providerIntent = await provider.extractIntent({ message, history: sanitizeHistory(input.history), criteria: previousCriteria });
    } catch (error) {
      console.warn("AVG AI provider unavailable", { errorType: error instanceof Error ? error.name : "unknown" });
    }
  }
  const criteria = mergeCriteria(previousCriteria, message, providerIntent);

  if (wantsCart(message) || providerIntent.action === "cart") {
    return {
      reply: "Dale, te llevo al carrito para que veas lo que tenés agregado.",
      products: [],
      cart: true,
      conversation: baseConversation,
    };
  }

  if (wantsCheckout(message) || providerIntent.action === "checkout") {
    return {
      reply: "Dale, te llevo al checkout para que completes tu compra.",
      products: [],
      checkout: true,
      conversation: baseConversation,
    };
  }

  const selectedProduct = state.pendingConfirmationProductId
    ? previousProducts.find((product) => product._id === state.pendingConfirmationProductId)
    : undefined;
  if (asksForAlternative(message) || providerIntent.action === "alternative") {
    const maxPrice = lowerAlternativeBudget(criteria, selectedProduct);
    const products = await findProducts({
      query: criteria.terms.join(" "),
      keywords: criteria.terms,
      ...(criteria.category ? { category: criteria.category } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      limit: 4,
    });
    return {
      reply: products.length
        ? "Dale, busqué alternativas reales parecidas y más accesibles."
        : "No encontré una alternativa real más barata con esos criterios ahora.",
      products,
      conversation: { criteria: { ...criteria, ...(maxPrice !== undefined ? { maxPrice } : {}) }, productIds: productIds(products) },
    };
  }

  if (explicitSelection) {
    if (!baseConversation.productIds.includes(explicitSelection)) {
      return {
        reply: "Elegí una de las opciones que te mostré y la reviso antes de agregarla.",
        products: previousProducts,
        conversation: baseConversation,
      };
    }
    const product = await findProduct(explicitSelection);
    if (!product) {
      return {
        reply: "Esa opción ya no está disponible. Puedo buscarte otra parecida.",
        products: previousProducts,
        conversation: baseConversation,
      };
    }
    return {
      reply: selectionCopy(product),
      products: [product],
      conversation: { ...baseConversation, pendingConfirmationProductId: product._id },
    };
  }

  const index = selectionIndexFromMessage(message);
  const productFromIndex = index === undefined ? undefined : previousProducts[index];
  const productFromMention = productFromIndex
    ?? selectionFromReference(message, previousProducts, state.pendingConfirmationProductId)
    ?? selectionFromMention(message, previousProducts)
    ?? selectionFromDetails(message, previousProducts)
    ?? selectionFromPrice(message, previousProducts);
  if (productFromMention) {
    return {
      reply: selectionCopy(productFromMention),
      products: [productFromMention],
      conversation: { ...baseConversation, pendingConfirmationProductId: productFromMention._id },
    };
  }

  const newSearch = hasUsefulCriteria(criteria) && (searchWasRequested(message) || criteria.terms.length > previousCriteria.terms.length || parseBudget(message) !== undefined || Boolean(providerIntent.category) || Boolean(providerIntent.color));
  if (!newSearch) {
    if (previousProducts.length) {
      return {
        reply: "Podés elegir una de estas opciones o contarme algún detalle más para afinar la búsqueda.",
        products: previousProducts,
        conversation: { criteria, productIds: productIds(previousProducts) },
      };
    }
    return {
      reply: "Dale. Contame para quién es, qué le gusta o qué presupuesto tenés y lo busco en el catálogo.",
      products: [],
      conversation: { criteria, productIds: [] },
    };
  }

  const products = await findProducts({
    query: criteria.terms.join(" "),
    keywords: criteria.terms,
    ...(criteria.category ? { category: criteria.category } : {}),
    ...(criteria.maxPrice !== undefined ? { maxPrice: criteria.maxPrice } : {}),
    limit: 4,
  });
  if (products.length) {
    return {
      reply: "Dale, encontré estas opciones reales que van bastante por ese lado.",
      products,
      conversation: { criteria, productIds: productIds(products) },
    };
  }

  if (needsAlternativeSearch(criteria)) {
    const alternatives = await findProducts({
      ...(criteria.category ? { category: criteria.category } : {}),
      ...(criteria.maxPrice !== undefined ? { maxPrice: criteria.maxPrice } : {}),
      limit: 4,
    });
    if (alternatives.length) {
      return {
        reply: "No encontré una coincidencia exacta, pero estas son alternativas reales que respetan lo que me dijiste.",
        products: alternatives,
        conversation: { criteria, productIds: productIds(alternatives) },
      };
    }
  }

  return {
    reply: "No encontré productos reales que coincidan con eso ahora. Si querés, probamos con otra característica, categoría o presupuesto.",
    products: [],
    conversation: { criteria, productIds: [] },
  };
}
