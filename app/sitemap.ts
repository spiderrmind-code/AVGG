import type { MetadataRoute } from "next";
import { resolveAppBaseUrl } from "@/lib/app-url";
export default function sitemap(): MetadataRoute.Sitemap { const baseUrl = resolveAppBaseUrl(); const now = new Date(); return ["", "/turnos", "/contacto"].map((path, index) => ({ url: `${baseUrl}${path}`, lastModified: now, changeFrequency: index === 0 ? "weekly" : "monthly", priority: index === 0 ? 1 : 0.8 })); }
