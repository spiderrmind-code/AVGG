export async function GET() {
  return Response.json({
    cj: process.env.CJ_API_KEY ? "OK - API encontrada" : "ERROR - falta API"
  });
}