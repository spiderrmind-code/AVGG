export const cjFulfillmentFixtureOrder = {
  _id: "507f1f77bcf86cd799439011",
  paymentStatus: "approved",
  stockApplied: true,
  customer: {
    firstName: "Prueba",
    lastName: "Automática",
    email: "buyer@example.test",
    phone: "+540000000000",
    address: "Calle de prueba 1",
    city: "Ciudad de prueba",
    province: "Provincia de prueba",
    postalCode: "1000",
    countryCode: "AR",
  },
  items: [{
    _id: "507f1f77bcf86cd799439012",
    name: "Producto simulado",
    quantity: 2,
    _internal: { supplier: "CJ Dropshipping", supplierId: "cj", cjId: "cj-product-1", cjVariantId: "cj-variant-1", cjSku: "CJ-SKU-1" },
  }],
};
