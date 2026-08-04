import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("CJ admin panel keeps identifiers read-only and exposes guarded actions", async () => {
  const source = await readFile(path.join(process.cwd(), "app/admin/components/CjFulfillmentPanel.tsx"), "utf8");
  for (const label of ["CJ Fulfillment", "Validar con CJ", "Crear pedido CJ", "Sincronizar", "Reconciliar", "Creación CJ desactivada"]) assert.match(source, new RegExp(label));
  assert.match(source, /disabled=\{busy \|\| !canCreate\}/);
  assert.match(source, /disabled=\{busy \|\| !canValidate\}/);
  assert.match(source, /canReconcile/);
  assert.doesNotMatch(source, /<input/);
  assert.match(source, /creationEnabled/);
});

test("operations admin mounts the CJ panel on the existing orders view", async () => {
  const source = await readFile(path.join(process.cwd(), "app/admin/operations/page.tsx"), "utf8");
  assert.match(source, /CjFulfillmentPanel/);
  assert.match(source, /orderId=\{order\._id\}/);
});
