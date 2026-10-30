export function getGoogleAuthConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  studioDeployment = false,
) {
  const clientId = (studioDeployment ? env.STUDIO_GOOGLE_CLIENT_ID : env.GOOGLE_CLIENT_ID)?.trim();
  const clientSecret = (studioDeployment ? env.STUDIO_GOOGLE_CLIENT_SECRET : env.GOOGLE_CLIENT_SECRET)?.trim();

  return {
    googleEnabled: Boolean(clientId && clientSecret),
    googleClientId: clientId,
    googleClientSecret: clientSecret,
  };
}
