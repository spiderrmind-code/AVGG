import MercadoPagoConfig, { Payment } from "mercadopago";
import { requireMercadoPagoAccessToken } from "@/lib/mercadopago-config";

export type VerifiedMercadoPagoPayment = {
  id: string;
  status: string;
  statusDetail: string | null;
  transactionAmount: number | null;
  currencyId: string | null;
  externalReference: string | null;
  preferenceId: string | null;
  dateApproved: string | null;
};

export class MercadoPagoProviderError extends Error {
  constructor(public readonly statusCode?: number) { super("Mercado Pago payment lookup failed"); }
}

export async function getMercadoPagoPayment(paymentId: string): Promise<VerifiedMercadoPagoPayment> {
  const accessToken = requireMercadoPagoAccessToken();
  try {
    const payment = await new Payment(new MercadoPagoConfig({ accessToken })).get({ id: paymentId });
    return {
      id: String(payment.id), status: String(payment.status ?? "unknown"),
      statusDetail: typeof payment.status_detail === "string" ? payment.status_detail : null,
      transactionAmount: typeof payment.transaction_amount === "number" ? payment.transaction_amount : null,
      currencyId: typeof payment.currency_id === "string" ? payment.currency_id : null,
      externalReference: typeof payment.external_reference === "string" ? payment.external_reference : null,
      preferenceId: null,
      dateApproved: typeof payment.date_approved === "string" ? payment.date_approved : null,
    };
  } catch (error) {
    const statusCode = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined;
    throw new MercadoPagoProviderError(statusCode);
  }
}

export function extractMercadoPagoPaymentId(body: unknown, url: string) {
  const queryId = new URL(url).searchParams.get("data.id");
  const candidate = body && typeof body === "object" ? (body as { data?: { id?: unknown }; id?: unknown }).data?.id ?? (body as { id?: unknown }).id : queryId;
  const value = typeof candidate === "string" || typeof candidate === "number" ? String(candidate) : "";
  return /^\d{1,32}$/.test(value) ? value : null;
}
