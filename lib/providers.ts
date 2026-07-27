export interface ProviderIntegration {
  supplierId: string;
  apiUrl?: string;
  apiKeyEncrypted?: string;
  status?: "active" | "paused" | "error";
  lastSync?: string;
  syncFrequency?: string;
}

export interface ProviderSyncResult {
  success: boolean;
  message: string;
}

export async function validateProviderConnection(integration: ProviderIntegration): Promise<ProviderSyncResult> {
  if (!integration.apiUrl) {
    return { success: false, message: "Falta la URL del proveedor" };
  }

  return { success: true, message: "Conexión lista para validar" };
}

export function getProviderStatusLabel(status?: string) {
  switch (status) {
    case "active":
      return "Activo";
    case "paused":
      return "Pausado";
    case "error":
      return "Error";
    default:
      return "Inactivo";
  }
}
