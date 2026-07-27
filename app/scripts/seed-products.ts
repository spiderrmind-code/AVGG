import { getDb } from "../../lib/mongo";

const products = [
  {
    name: "Auriculares Pro X1 ANC",
    title: "Auriculares Pro X1 ANC — Cancelación de ruido y batería extendida",
    shortDescription: "Audio inmersivo con cancelación activa de ruido para trabajo, estudio y viajes.",
    description: "Diseñados para quienes buscan foco real, comodidad y un sonido claro en cualquier entorno. Ofrecen cancelación activa de ruido, batería prolongada y conexión estable.",
    benefits: ["Cancelación activa de ruido", "Batería de larga duración", "Conexión Bluetooth estable"],
    features: ["ANC", "Bluetooth 5.3", "Micrófono integrado"],
    price: 12999,
    comparePrice: 15999,
    costPrice: 8500,
    margin: 35,
    category: "Tecnología",
    image: "/placeholder-product.png",
    supplier: "AliExpress",
    supplierId: "aliexpress-001",
    shippingDays: "10-15 días",
    stock: true,
    active: true,
    featured: true,
    sku: "SKU-AURI-001",
  },
  {
    name: "Smartwatch Fitness Plus",
    title: "Smartwatch Fitness Plus   — Monitoreo diario y estilo premium",
    shortDescription: "Rastrea actividad, sueño y frecuencia cardíaca con diseño elegante y batería confiable.",
    description: "Ideal para quienes quieren llevar el control de su rutina en la muñeca. Mide actividad física, sueño, ritmo cardíaco y ofrece alertas inteligentes.",
    benefits: ["Monitoreo de actividad", "Diseño elegante", "Notificaciones inteligentes"],
    features: ["Pantalla AMOLED", "Resistencia al agua", "Monitor de sueño"],
    price: 8999,
    comparePrice: 10999,
    costPrice: 6200,
    margin: 31,
    category: "Tecnología",
    image: "/placeholder-product.png",
    supplier: "Tienda",
    supplierId: "tienda-001",
    shippingDays: "12-18 días",
    stock: true,
    active: true,
    featured: true,
    sku: "SKU-SMART-001",
  },
];

async function main() {
  const db = await getDb();
  const result = await db.collection("products").insertMany(products);
  console.log(`Productos cargados: ${result.insertedCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
