/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    const production = process.env.NODE_ENV === "production";
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' https://sdk.mercadopago.com https://accounts.google.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://cf.cjdropshipping.com https://oss-cf.cjdropshipping.com https://images.unsplash.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.mercadopago.com https://developers.cjdropshipping.com https://accounts.google.com",
      "frame-src https://www.mercadopago.com https://www.mercadopago.com.ar",
    ].join("; ");
    const headers = [
      { key: "Content-Security-Policy", value: contentSecurityPolicy },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
    ];
    return [{ source: "/:path*", headers }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cf.cjdropshipping.com",
      },
      {
        protocol: "https",
        hostname: "oss-cf.cjdropshipping.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

module.exports = nextConfig;
