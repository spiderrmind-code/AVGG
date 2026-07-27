export async function GET() {
  try {
    // Obtener access token
    const authResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: process.env.CJ_API_KEY,
        }),
      }
    );

    const authData = await authResponse.json();

    if (!authData.result) {
      return Response.json(authData, { status: 401 });
    }

    const token = authData.data.accessToken;

    // Pedir productos
    const productsResponse = await fetch(
      "https://developers.cjdropshipping.com/api2.0/v1/product/list",
      {
        method: "GET",
        headers: {
          "CJ-Access-Token": token,
          "Content-Type": "application/json",
        },
      }
    );

    const products = await productsResponse.json();

    return Response.json(products);

  } catch (error) {
    return Response.json(
      {
        error: String(error),
      },
      { status: 500 }
    );
  }
}