import { MetadataRoute } from "next";
import { resolveAppBaseUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = resolveAppBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/account/", "/checkout/", "/cart/", "/wishlist/", "/login", "/register"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
