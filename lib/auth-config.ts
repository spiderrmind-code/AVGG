export function getGoogleAuthConfig(env: NodeJS.ProcessEnv = process.env) {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  return {
    googleEnabled: Boolean(clientId && clientSecret),
    googleClientId: clientId,
    googleClientSecret: clientSecret,
  };
}
