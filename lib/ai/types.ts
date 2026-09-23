import type { PublicProduct } from "@/lib/catalog";

export type AiChatRole = "user" | "assistant";

export type AiChatMessage = {
  role: AiChatRole;
  content: string;
};

export type AiSearchCriteria = {
  terms: string[];
  maxPrice?: number;
  category?: string;
  color?: string;
};

/**
 * This is deliberately small and safe to round-trip through the browser. It
 * never contains a price, stock value, or a product object supplied by a model.
 */
export type AiConversationState = {
  criteria?: AiSearchCriteria;
  productIds?: string[];
  pendingConfirmationProductId?: string;
};

export type AiProviderIntent = {
  keywords?: string[];
  category?: string;
  color?: string;
  maxPrice?: number;
  action?: "search" | "alternative" | "checkout" | "cart";
};

export type AiProviderInput = {
  message: string;
  history: AiChatMessage[];
  criteria: AiSearchCriteria;
};

export interface AiProvider {
  extractIntent(input: AiProviderInput): Promise<AiProviderIntent>;
}

export type AiCartProduct = Pick<
  PublicProduct,
  "_id" | "slug" | "name" | "price" | "image" | "inStock" | "stockQuantity" | "comparePrice"
>;

export type AiChatResult = {
  reply: string;
  products: PublicProduct[];
  conversation: AiConversationState;
  cartProduct?: AiCartProduct;
  checkout?: boolean;
  cart?: boolean;
};
