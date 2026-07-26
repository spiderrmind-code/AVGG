import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/auth";
import { getDb } from "@/lib/mongo";

interface OrderItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface Customer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}


export async function GET() {

  try {

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: "No autenticado" },
        { status: 401 }
      );
    }

    const db = await getDb();

    const userRole =
      (session.user as { role?: string }).role;

    const filter: Record<string, unknown> = {};

    if (userRole !== "admin") {
      filter.customerEmail = session.user.email;
    }

    const orders = await db
      .collection("orders")
      .find(filter)
      .sort({
        createdAt: -1,
      })
      .toArray();

    // sanitize orders for non-admin users to avoid leaking supplier/cost info
    const sanitized = orders.map((o) => {
      if (userRole === "admin") return o;
      const copy = { ...o } as any;
      if (Array.isArray(copy.items)) {
        copy.items = copy.items.map((it: any) => {
          const safe: any = {
            _id: it._id,
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            image: it.image,
          };
          for (const field of ["_internal", "costPrice", "supplier", "supplierSku", "supplierId", "supplierLink", "margin"]) {
            delete safe[field];
          }
          return safe;
        });
      }
      for (const field of ["_internal", "costPrice", "supplier", "supplierSku", "supplierId", "supplierLink", "margin"]) {
        delete copy[field];
      }
      return copy;
    });

    return NextResponse.json({
      success: true,
      orders: sanitized,
    });


  } catch (error) {

    console.error(
      "ERROR GET ORDERS:",
      error
    );


    return NextResponse.json(
      {
        success:false,
        message:"Error obteniendo pedidos",
      },
      {
        status:500,
      }
    );

  }

}




export async function POST(
  request: Request
) {

  try {


    const body = await request.json();



    if (
      !body.customer ||
      !body.items ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {

      return NextResponse.json(
        {
          success:false,
          message:"Datos de pedido inválidos",
        },
        {
          status:400,
        }
      );

    }



    const session =
      await getServerSession(authOptions);



    const db =
      await getDb();




    const rawItems = body.items;
    const itemIds = Array.isArray(rawItems)
      ? rawItems.map((item: any) => String(item._id))
      : [];

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        {
          success:false,
          message:"El carrito está vacío",
        },
        {
          status:400,
        }
      );
    }

    if (!itemIds.every((id: string) => ObjectId.isValid(id))) {
      return NextResponse.json(
        {
          success:false,
          message:"Algún producto del carrito es inválido",
        },
        {
          status:400,
        }
      );
    }

    const products = await db
      .collection("products")
      .find({
        _id: { $in: itemIds.map((id: string) => new ObjectId(id)) },
        active: { $ne: false },
      })
      .toArray();

    if (products.length !== itemIds.length) {
      return NextResponse.json(
        {
          success:false,
          message:"Algún producto no existe o no está disponible",
        },
        {
          status:400,
        }
      );
    }

    const items: OrderItem[] = [];

    for (const item of rawItems) {
      const product = products.find(
        (product) => String(product._id) === String(item._id)
      );

      if (!product) {
        return NextResponse.json(
          {
            success: false,
            message: "Algún producto del carrito no existe",
          },
          {
            status: 400,
          }
        );
      }

      const quantity = Math.max(1, Number(item.quantity ?? 1));

      if (typeof product.stock === "number" && product.stock >= 0 && quantity > product.stock) {
        return NextResponse.json(
          {
            success: false,
            message: `No hay stock suficiente para ${product.name ?? "este producto"}`,
          },
          {
            status: 400,
          }
        );
      }

      // include supplier/internal fields in the stored order item for fulfillment
      const orderItem: OrderItem = {
        _id: String(product._id),
        name: String(product.name ?? product.title ?? "Producto"),
        price: Number(product.price ?? 0),
        quantity,
        image: String(product.image ?? product.images?.[0] ?? ""),
      };

      // attach internal dropshipping fields under an internal namespace
      (orderItem as any)._internal = {
        supplier: product.supplier ?? null,
        supplierId: product.supplierId ?? null,
        costPrice: product.costPrice ?? null,
        sku: product.sku ?? null,
        shippingDays: product.shippingDays ?? null,
        margin: product.margin ?? null,
      };

      items.push(orderItem);
    }

    const customer: Customer =
      body.customer;

    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // allow tiny rounding differences between client and server calculations
    if (Math.abs(Number(body.subtotal) - calculatedSubtotal) > 0.01) {
      return NextResponse.json(
        {
          success:false,
          message:"El subtotal no coincide con los items del pedido",
        },
        {
          status:400,
        }
      );
    }

    if (!customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) {
      return NextResponse.json(
        {
          success:false,
          message:"Email de cliente inválido",
        },
        {
          status:400,
        }
      );
    }




    const orderNumber =
      `AVG-${Date.now()}`;




    const order = {


      orderNumber,


      customer,


      customerEmail:
        session?.user?.email ??
        customer.email ??
        null,

      items,
      subtotal: calculatedSubtotal,
      total: calculatedSubtotal,
      status: "pending",



      paymentStatus:
        "pending",



      paymentId:
        null,



      preferenceId:
        null,



      initPoint:
        null,



      createdAt:
        new Date(),



      updatedAt:
        new Date(),

    };




    const result =
      await db
      .collection("orders")
      .insertOne(order);



    return NextResponse.json({
      success: true,
      orderId: String(result.insertedId),
      orderNumber,
    });



  } catch(error) {


    console.error(
      "ERROR CREATE ORDER:",
      error
    );



    return NextResponse.json(
      {
        success:false,
        message:"Error creando pedido",
      },
      {
        status:500,
      }
    );


  }

}