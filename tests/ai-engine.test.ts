import assert from "node:assert/strict";
import test from "node:test";
import { runAiChat } from "../lib/ai/engine";
import type { PublicProduct } from "../lib/catalog";

const firstId = "64b64c9e5f3a8a1c2d3e4f50";
const secondId = "64b64c9e5f3a8a1c2d3e4f51";

function product(_id: string, name: string): PublicProduct {
  return {
    _id, slug: null, name, title: name, description: "Con gatos", price: 32_000,
    images: [], category: "Regalos", categorySlug: "regalos", inStock: true, stockQuantity: 3, featured: false,
  };
}

const first = product(firstId, "Taza de gatos");
const second = { ...product(secondId, "Almohadón de gatos"), description: "Almohadón decorativo" };

test("AVG AI preserves criteria, selects the second real product, and requires confirmation before cart", async () => {
  let capturedQuery = "";
  const search = async (input: { query?: string }) => {
    capturedQuery = input.query ?? "";
    return [first, second];
  };
  const getProduct = async (id: string) => id === firstId ? first : id === secondId ? second : null;

  const found = await runAiChat({ message: "Quiero un regalo para mi novia, le gustan los gatos y tengo hasta 50 lucas." }, { provider: null, search, getProduct });
  assert.deepEqual(found.products.map(({ _id }) => _id), [firstId, secondId]);
  assert.match(capturedQuery, /gato/);
  assert.equal(found.conversation.criteria?.maxPrice, 50_000);

  const selected = await runAiChat({ message: "Me gusta el segundo.", conversation: found.conversation }, { provider: null, search, getProduct });
  assert.equal(selected.conversation.pendingConfirmationProductId, secondId);
  assert.equal(selected.cartProduct, undefined);

  const added = await runAiChat({ message: "Sí, agregalo.", conversation: selected.conversation }, { provider: null, search, getProduct });
  assert.equal(added.cartProduct?._id, secondId);
});

test("AVG AI does not add a pending option on an ambiguous want, rejects unavailable products, and supports checkout", async () => {
  const getProduct = async (id: string) => id === firstId ? first : null;
  const search = async () => [] as PublicProduct[];
  const pending = { criteria: { terms: ["gatos"] }, productIds: [firstId], pendingConfirmationProductId: firstId };

  const ambiguous = await runAiChat({ message: "Quiero ver otra cosa.", conversation: pending }, { provider: null, search, getProduct });
  assert.equal(ambiguous.cartProduct, undefined);

  const unavailable = await runAiChat({ message: "Sí, agregalo.", conversation: { ...pending, pendingConfirmationProductId: secondId } }, { provider: null, search, getProduct });
  assert.equal(unavailable.cartProduct, undefined);
  assert.match(unavailable.reply, /no está disponible/i);

  const checkout = await runAiChat({ message: "Quiero comprar.", conversation: { criteria: { terms: [] }, productIds: [] } }, { provider: null, search, getProduct });
  assert.equal(checkout.checkout, true);
});

test("AVG AI can select a shown real product by name", async () => {
  const getProduct = async (id: string) => id === firstId ? first : id === secondId ? second : null;
  const result = await runAiChat({
    message: "Quiero el almohadón de gatos",
    conversation: { criteria: { terms: ["gatos"] }, productIds: [firstId, secondId] },
  }, { provider: null, getProduct });
  assert.equal(result.conversation.pendingConfirmationProductId, secondId);
});

test("AVG AI finds a real cheaper alternative and understands product references", async () => {
  const expensive = { ...first, price: 48_000 };
  const cheaper = { ...second, price: 21_000 };
  let maxPrice: number | undefined;
  const search = async (input: { maxPrice?: number }) => {
    maxPrice = input.maxPrice;
    return [cheaper];
  };
  const getProduct = async (id: string) => id === firstId ? expensive : id === secondId ? cheaper : null;
  const pending = { criteria: { terms: ["gatos"], maxPrice: 50_000 }, productIds: [firstId, secondId], pendingConfirmationProductId: firstId };

  const alternative = await runAiChat({ message: "Pero es caro, buscame algo parecido más barato.", conversation: pending }, { provider: null, search, getProduct });
  assert.equal(maxPrice, 47_999);
  assert.deepEqual(alternative.conversation.productIds, [secondId]);

  const selected = await runAiChat({ message: "Ese me gusta.", conversation: alternative.conversation }, { provider: null, search, getProduct });
  assert.equal(selected.conversation.pendingConfirmationProductId, secondId);

  const previous = await runAiChat({ message: "No, mejor el anterior.", conversation: { ...pending, pendingConfirmationProductId: secondId } }, { provider: null, search, getProduct });
  assert.equal(previous.conversation.pendingConfirmationProductId, firstId);
  const checkout = await runAiChat({ message: "Finalizar compra", conversation: alternative.conversation }, { provider: null, search, getProduct });
  assert.equal(checkout.checkout, true);
});

test("AVG AI resolves real descriptive references and existing cart and checkout routes", async () => {
  const plain = { ...second, name: "Almohadón decorativo" };
  const getProduct = async (id: string) => id === firstId ? first : id === secondId ? plain : null;
  const search = async () => [] as PublicProduct[];
  const conversation = { criteria: { terms: ["gatos"] }, productIds: [firstId, secondId] };

  const byDetails = await runAiChat({ message: "Quiero el de gatos", conversation }, { provider: null, search, getProduct });
  assert.equal(byDetails.conversation.pendingConfirmationProductId, firstId);
  const byPrice = await runAiChat({ message: "El que cuesta 32 lucas", conversation }, { provider: null, search, getProduct });
  assert.equal(byPrice.conversation.pendingConfirmationProductId, undefined, "does not guess when a displayed price is ambiguous");
  const cart = await runAiChat({ message: "Mostrame mi carrito", conversation }, { provider: null, search, getProduct });
  assert.equal(cart.cart, true);
  const checkout = await runAiChat({ message: "Quiero finalizar", conversation }, { provider: null, search, getProduct });
  assert.equal(checkout.checkout, true);
});
