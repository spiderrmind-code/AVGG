export type ReadinessResult = { ready: true } | { ready: false };

export async function checkReadiness(checkDatabase: () => Promise<void>): Promise<ReadinessResult> {
  try {
    await checkDatabase();
    return { ready: true };
  } catch {
    return { ready: false };
  }
}
