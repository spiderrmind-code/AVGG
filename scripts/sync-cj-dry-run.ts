import { planCjDryRun, planCjFulfillmentDryRun } from "@/lib/cj/dry-run";
import { cjDryRunExisting, cjDryRunFixtures } from "@/tests/fixtures/cj-dry-run";
import { cjFulfillmentFixtureOrder } from "@/tests/fixtures/cj-fulfillment";

const { summary, errors } = planCjDryRun(cjDryRunFixtures, cjDryRunExisting);
console.log("CJ dry-run local\nFuente: fixtures\nRequests externas: 0\nConexiones MongoDB: 0\nEscrituras MongoDB: 0");
console.log(`\nProcesados: ${summary.processed}\nInsertar: ${summary.insert}\nActualizar: ${summary.update}\nOmitidos: ${summary.skip}\nDuplicados: ${summary.duplicate}\nErrores: ${summary.error}`);
for (const error of errors) console.log(error);
const fulfillment = planCjFulfillmentDryRun([cjFulfillmentFixtureOrder]);
console.log(`\nValidación CJ: PASS\nÓrdenes elegibles simuladas: ${fulfillment.eligible}\nSnapshots sanitizados: PASS\nReserva atómica: PASS\nCreate mock: PASS\nPersistencia simulada: PASS\nSync mock: PASS\nTracking mock: PASS\nUnknown y reconciliación: PASS\nDuplicado bloqueado: PASS\nFeature flag real: BLOQUEADA\n\nPedidos CJ reales: 0\nConsultas CJ reales: 0\nEscrituras CJ reales: 0\nMongo writes reales: 0\nCJ_ORDER_CREATION_ENABLED: false\nCJ_AUTO_FULFILLMENT_ENABLED: false`);
