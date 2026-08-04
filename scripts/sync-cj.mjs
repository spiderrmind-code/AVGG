import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: ".env.local" });

async function syncCJ() {
  console.log("ðŸš€ Iniciando sincronizaciÃ³n CJ...");

  const token = process.env.CJ_ACCESS_TOKEN;

  if (!token) {
    throw new Error("âŒ Falta CJ_ACCESS_TOKEN en .env.local");
  }

  // Obtener productos de CJ
  const response = await fetch(
    "https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=20",
    {
      headers: {
        "CJ-Access-Token": token,
      },
    }
  );

  const cj = await response.json();

  if (!cj.success) {
    console.log("Autenticación CJ completada");
    throw new Error("âŒ Error con CJ API");
  }

  console.log(`ðŸ“¦ Productos encontrados: ${cj.data.list.length}`);


  const products = cj.data.list.map((p) => ({
    cjId: p.pid,

    name: p.productNameEn,

    slug:
      p.productNameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      + "-" + p.pid,

    description:
      "Producto disponible en la tienda",

    image: p.productImage,

    category: p.categoryName || "General",

    costPrice: Number(p.sellPrice),

    price:
      Math.round(Number(p.sellPrice) * 3.5 * 100) / 100,

    stock: 100,

    active: true,

    provider: "Tienda",

    createdAt: new Date(),
  }));


  // Mongo usando tu variable real
  const mongoUri = process.env.MONGODB_URI ?? process.env.MONGO_URI;
  if (!mongoUri) throw new Error("Falta MONGODB_URI");
  if (!process.env.MONGODB_URI && process.env.MONGO_URI) console.warn("Usando MONGO_URI heredada; migrar a MONGODB_URI.");
  const client = new MongoClient(mongoUri);

  await client.connect();

  console.log("âœ… Mongo conectado");


  const db = client.db(
    process.env.MONGODB_DB || "AVGCONNECTS"
  );


  const collection = db.collection("products");


  for (const product of products) {

    await collection.updateOne(
      {
        cjId: product.cjId
      },
      {
        $set: product
      },
      {
        upsert: true
      }
    );

  }


  console.log(
    `âœ… ${products.length} productos sincronizados`
  );


  await client.close();
}


syncCJ()
.catch((error)=>{
  console.error("âŒ ERROR:", error.message);
  process.exit(1);
});
