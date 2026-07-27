export async function GET() {
  try {
    const response = await fetch(
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

    const data = await response.json();

    return Response.json(data);

  } catch (error) {
    return Response.json(
      {
        error: String(error),
      },
      { status: 500 }
    );
  }
}