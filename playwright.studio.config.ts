import { randomBytes } from "node:crypto";
import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

const baseWebServer = baseConfig.webServer;
if (!baseWebServer || Array.isArray(baseWebServer)) {
  throw new Error("Studio Playwright config requires one web server configuration.");
}

export default defineConfig({
  ...baseConfig,
  use: { ...baseConfig.use, baseURL: "http://127.0.0.1:3101" },
  testMatch: "**/studio-preview.spec.ts",
  webServer: {
    ...baseWebServer,
    command: "npm run build && npm run start -- --port 3101",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
    env: {
      STUDIO_NEXT_DIST_DIR: "studio-next-e2e",
      STUDIO_DEPLOYMENT: "true",
      NEXT_PUBLIC_STUDIO_DEPLOYMENT: "true",
      STUDIO_PRIVACY_APPROVED: "false",
      NEXT_PUBLIC_STUDIO_PRIVACY_APPROVED: "false",
      STUDIO_RETENTION_POLICY_APPROVED: "false",
      NEXT_PUBLIC_STUDIO_RETENTION_POLICY_APPROVED: "false",
      STUDIO_DATA_COLLECTION_ENABLED: "false",
      NEXT_PUBLIC_STUDIO_DATA_COLLECTION_ENABLED: "false",
      STUDIO_APPOINTMENT_REQUESTS_ENABLED: "false",
      NEXT_PUBLIC_STUDIO_APPOINTMENT_REQUESTS_ENABLED: "false",
      STUDIO_NEXTAUTH_SECRET: randomBytes(32).toString("base64url"),
      NEXTAUTH_URL: "http://127.0.0.1:3100",
      NEXT_PUBLIC_SITE_URL: "https://13-studio-tattoo.vercel.app",
      NEXT_PUBLIC_WHATSAPP_NUMBER: "542212203747",
    },
  },
});
