export type PublicOfferCandidate = { price: number; comparePrice?: number; inStock: boolean };
export type PublicOffer = { discountPercent: number; savings: number };

export function getPublicOffer(product: PublicOfferCandidate): PublicOffer | null {
  const { price, comparePrice, inStock } = product;
  if (!inStock || !Number.isFinite(price) || price <= 0 || !Number.isFinite(comparePrice) || !comparePrice || comparePrice <= price) return null;
  const savings = comparePrice - price;
  const discountPercent = Math.round((savings / comparePrice) * 100);
  return discountPercent > 0 && discountPercent < 100 ? { savings, discountPercent } : null;
}
