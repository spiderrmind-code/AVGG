require("dotenv").config({ path: ".env.local" });

const { MongoClient } = require("mongodb");

async function syncCJ() {
  console.log("🚀 Iniciando sincronización CJ...");

  const token = process.env.CJ_ACCESS_TOKEN;

  if (!token) {
    throw new Error("❌ Falta CJ_ACCESS_TOKEN en .env.local");
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
    console.log(cj);
    throw new Error("❌ Error con CJ API");
  }

  console.log(`📦 Productos encontrados: ${cj.data.list.length}`);


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
      "Producto importado desde CJ Dropshipping",

    image: p.productImage,

    category: p.categoryName || "General",

    costPrice: Number(p.sellPrice),

    price:
      Math.round(Number(p.sellPrice) * 3.5 * 100) / 100,

    stock: 100,

    active: true,

    provider: "CJ Dropshipping",

    createdAt: new Date(),
  }));


  // Mongo usando tu variable real
  const client = new MongoClient(process.env.MONGO_URI);

  await client.connect();

  console.log("✅ Mongo conectado");


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
    `✅ ${products.length} productos sincronizados`
  );


  await client.close();
}


syncCJ()
.catch((error)=>{
  console.error("❌ ERROR:", error.message);
  process.exit(1);
});