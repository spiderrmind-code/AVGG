import { MetadataRoute } from "next";
import { resolveAppBaseUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolveAppBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/account/", "/mi-cuenta/", "/checkout/", "/cart/", "/wishlist/", "/search", "/login", "/register"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
