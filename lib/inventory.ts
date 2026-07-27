export type InventoryStatus = "available" | "low-stock" | "out-of-stock" | "paused";

export function getInventoryStatus(stock?: number | boolean | null): InventoryStatus {
  if (stock === false || stock === 0) return "out-of-stock";
  if (typeof stock === "number" && stock <= 3) return "low-stock";
  return "available";
}
