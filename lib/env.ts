type Environment = Record<string, string | undefined>;

export type PublicUrlSource = "NEXT_PUBLIC_SITE_URL" | "NEXT_PUBLIC_APP_URL" | "NEXTAUTH_URL" | "VERCEL_PROJECT_PRODUCTION_URL" | "VERCEL_URL";

const publicUrlSources: PublicUrlSource[] = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_APP_URL", "NEXTAUTH_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"];

export function getPublicUrlEnvironment(env: Environment = process.env): { source: PublicUrlSource; value: string } | null {
  for (const source of publicUrlSources) {
    const value = env[source]?.trim();
    if (value) return { source, value };
  }
  return null;
}

export function requireServerEnvironment(name: string, env: Environment = process.env): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno de servidor "${name}"`);
  return value;
}

export function productionEnvironmentIssues(env: Environment = process.env): string[] {
  const issues: string[] = [];
  for (const name of ["MONGODB_URI", "MONGODB_DB", "NEXTAUTH_SECRET", "MERCADOPAGO_ACCESS_TOKEN", "MERCADOPAGO_MODE", "MERCADOPAGO_WEBHOOK_SECRET"]) {
    if (!env[name]?.trim()) issues.push(name);
  }
  if (!getPublicUrlEnvironment(env)) issues.push("PUBLIC_APP_URL");
  return issues;
}
