export interface ProductOffer {
  discountPercent?: number;
  previousPrice?: number;
  offerPrice?: number;
  startDate?: string;
  endDate?: string;
}

export function getActiveOffer(product: ProductOffer): ProductOffer | null {
  const discountPercent = Number(product.discountPercent ?? 0);
  const offerPrice = Number(product.offerPrice ?? 0);
  const previousPrice = Number(product.previousPrice ?? 0);
  const startDate = product.startDate ? new Date(product.startDate) : null;
  const endDate = product.endDate ? new Date(product.endDate) : null;
  const now = new Date();

  if (!discountPercent && !offerPrice) return null;
  if (startDate && startDate > now) return null;
  if (endDate && endDate < now) return null;

  return {
    discountPercent: Number.isFinite(discountPercent) ? discountPercent : 0,
    previousPrice: Number.isFinite(previousPrice) ? previousPrice : 0,
    offerPrice: Number.isFinite(offerPrice) ? offerPrice : 0,
    startDate: product.startDate,
    endDate: product.endDate,
  };
}
