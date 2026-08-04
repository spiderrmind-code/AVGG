"use client";

import { useCallback, useEffect, useState } from "react";

type JsonRecord = Record<string, unknown>;

type CjFulfillmentData = {
  orderId: string;
  creationEnabled: boolean;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  cjValidationStatus?: string;
  cjValidatedAt?: string;
  cjStockSnapshot?: unknown;
  cjShippingSnapshot?: unknown;
  cjMarginSnapshot?: unknown;
  supplierOrderId?: string;
  cjOrderId?: string;
  cjOrderNumber?: string;
  cjPlatformOrderId?: string;
  cjShipmentOrderId?: string;
  trackingNumber?: string;
  trackingStatus?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  cjLastSyncAt?: string;
  cjLastError?: string;
};

const creationStates = new Set(["reserved", "creating", "created", "processing", "shipped", "in_transit", "delivered"]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valueOrFallback(value: unknown) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return "Sin información";
}

function compactDetails(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.map((item) => compactDetails(item)).join(" · ") : "Sin información";
  if (!isRecord(value)) return valueOrFallback(value);
  const details = Object.entries(value)
    .filter(([, item]) => typeof item === "string" || typeof item === "number")
    .map(([key, item]) => `${key}: ${String(item)}`);
  return details.length ? details.join(" · ") : "Sin información";
}

export default function CjFulfillmentPanel({ orderId }: { orderId: string }) {
  const [data, setData] = useState<CjFulfillmentData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/orders/${orderId}/cj`);
    const body = await response.json() as CjFulfillmentData | { error?: string };
    if (!response.ok) throw new Error("error" in body ? body.error ?? "No se pudo consultar CJ" : "No se pudo consultar CJ");
    setData(body as CjFulfillmentData);
  }, [orderId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load().catch(() => setMessage("No se pudo cargar la información de CJ"));
    });
  }, [load]);

  const run = async (action: "validate" | "create" | "sync" | "reconcile") => {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/cj/${action}`, { method: "POST" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo completar la acción");
      setMessage("Acción CJ completada");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  };

  const hasCjIds = Boolean(data?.supplierOrderId || data?.cjOrderId || data?.cjPlatformOrderId || data?.cjShipmentOrderId);
  const creationEnabled = data?.creationEnabled === true;
  const eligible = data?.cjValidationStatus === "eligible";
  const canCreate = creationEnabled && eligible && !hasCjIds && !creationStates.has(data?.fulfillmentStatus ?? "");
  const canValidate = data?.paymentStatus === "approved";
  const canSync = hasCjIds;
  const canReconcile = data?.fulfillmentStatus === "unknown";

  return (
    <section className="mt-3 min-w-80 rounded-lg border border-neutral-200 bg-white p-4 text-left" aria-label="CJ Fulfillment">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-neutral-900">CJ Fulfillment</h2>
        {!creationEnabled ? <span className="text-xs font-medium text-amber-700">Creación CJ desactivada</span> : null}
      </div>
      <dl className="mt-3 grid gap-2 text-xs text-neutral-700">
        <div><dt className="font-medium">Estado de pago</dt><dd>{valueOrFallback(data?.paymentStatus)}</dd></div>
        <div><dt className="font-medium">Estado fulfillment</dt><dd>{valueOrFallback(data?.fulfillmentStatus)}</dd></div>
        <div><dt className="font-medium">Validación</dt><dd>{valueOrFallback(data?.cjValidationStatus)}</dd></div>
        <div><dt className="font-medium">Stock</dt><dd>{compactDetails(data?.cjStockSnapshot)}</dd></div>
        <div><dt className="font-medium">Almacén y logística</dt><dd>{compactDetails(data?.cjShippingSnapshot)}</dd></div>
        <div><dt className="font-medium">Costos, moneda y margen</dt><dd>{compactDetails(data?.cjMarginSnapshot)}</dd></div>
        <div><dt className="font-medium">IDs CJ</dt><dd>{[data?.supplierOrderId, data?.cjOrderId, data?.cjOrderNumber, data?.cjPlatformOrderId, data?.cjShipmentOrderId].filter((item): item is string => typeof item === "string" && item.length > 0).join(" · ") || "Sin información"}</dd></div>
        <div><dt className="font-medium">Tracking</dt><dd>{[data?.trackingNumber, data?.trackingStatus, data?.trackingCarrier, data?.trackingUrl].filter((item): item is string => typeof item === "string" && item.length > 0).join(" · ") || "Sin información"}</dd></div>
        <div><dt className="font-medium">Última sincronización</dt><dd>{valueOrFallback(data?.cjLastSyncAt)}</dd></div>
        <div><dt className="font-medium">Último error</dt><dd>{valueOrFallback(data?.cjLastError)}</dd></div>
      </dl>
      {message ? <p className="mt-3 text-xs text-neutral-700" role="status">{message}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="ui-button-secondary min-h-0 px-3 py-2 text-xs" disabled={busy || !canValidate} onClick={() => void run("validate")}>Validar con CJ</button>
        <button type="button" className="ui-button-primary min-h-0 px-3 py-2 text-xs" disabled={busy || !canCreate} onClick={() => void run("create")}>Crear pedido CJ</button>
        <button type="button" className="ui-button-secondary min-h-0 px-3 py-2 text-xs" disabled={busy || !canSync} onClick={() => void run("sync")}>Sincronizar</button>
        {canReconcile ? <button type="button" className="ui-button-secondary min-h-0 px-3 py-2 text-xs" disabled={busy} onClick={() => void run("reconcile")}>Reconciliar</button> : null}
      </div>
    </section>
  );
}
