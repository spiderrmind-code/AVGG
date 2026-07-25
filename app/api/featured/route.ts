export async function GET() {
  const res = await fetch("http://localhost:3000/data/featured.json");

  return new Response(await res.text(), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
}