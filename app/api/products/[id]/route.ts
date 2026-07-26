import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";


export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {

    const { id } = await context.params;


    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "ID de producto inválido",
        },
        {
          status: 400,
        }
      );
    }


    const db = await getDb();


    const product = await db
      .collection("products")
      .findOne({
        _id: new ObjectId(id),
        active: {
          $ne: false,
        },
      });



    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Producto no encontrado",
        },
        {
          status: 404,
        }
      );
    }



    // sanitize product before returning to clients
    const safe = {
      _id: String(product._id),
      name: product.name,
      title: product.title,
      description: product.description,
      price: Number(product.price ?? 0),
      comparePrice: product.comparePrice ? Number(product.comparePrice) : undefined,
      image: product.image ?? product.images?.[0] ?? undefined,
      images: product.images ?? undefined,
      category: product.category,
      slug: product.slug,
      shippingDays: product.shippingDays,
      stock: product.stock,
    };

    return NextResponse.json({
      success: true,
      product: safe,
    });



  } catch (error) {

    console.error(
      "ERROR PRODUCT ID:",
      error
    );


    return NextResponse.json(
      {
        success: false,
        message: "Error obteniendo producto",
      },
      {
        status: 500,
      }
    );

  }
}