type AuthEnvironment = Partial<Pick<NodeJS.ProcessEnv, "NEXTAUTH_SECRET" | "AUTH_SECRET" | "NODE_ENV">>;

/**
 * Resolves the NextAuth signing secret consistently for the auth handler and
 * the route proxy. NEXTAUTH_SECRET is the documented canonical name; AUTH_SECRET
 * remains a backwards-compatible alias while existing deployments are migrated.
 */
export function resolveAuthSecret(environment: AuthEnvironment = process.env): string | undefined {
  const nextAuthSecret = environment.NEXTAUTH_SECRET?.trim();
  const authSecret = environment.AUTH_SECRET?.trim();

  if (nextAuthSecret && authSecret && nextAuthSecret !== authSecret) {
    throw new Error("NEXTAUTH_SECRET y AUTH_SECRET no pueden diferir");
  }

  return nextAuthSecret ?? authSecret;
}

export function requireAuthSecret(environment: AuthEnvironment = process.env): string {
  const secret = resolveAuthSecret(environment);
  if (!secret) throw new Error("Falta la variable de entorno NEXTAUTH_SECRET");
  return secret;
}
