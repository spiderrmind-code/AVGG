export const cjDryRunFixtures: Array<Record<string, unknown>> = [
  { pid: "fixture-new", productNameEn: "Nuevo", sellPrice: 10, stock: 4, productImage: "https://example.com/a.jpg", categoryName: "Unknown" },
  { pid: "fixture-existing", productNameEn: "Actualizable", sellPrice: 12, stock: 2, productImageSet: ["https://example.com/b.jpg"] },
  { pid: "fixture-existing", productNameEn: "Duplicado", sellPrice: 12, stock: 2 },
  { productNameEn: "Sin id", sellPrice: 5 },
  { pid: "fixture-cost", productNameEn: "Costo inválido", sellPrice: "bad" },
  { pid: "fixture-stock", productNameEn: "Stock desconocido", sellPrice: 8 },
];
export const cjDryRunExisting = [{ supplier: "CJ Dropshipping", cjId: "fixture-existing" }, { name: "Nuevo", slug: "nuevo" }];
