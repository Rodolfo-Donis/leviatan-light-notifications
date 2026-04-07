import type { FastifyReply, FastifyRequest } from "fastify";
import { ContractMockAdapter } from "./adapters/contract.mock.adapter.js";
import { DeliveryMockAdapter } from "./adapters/delivery.mock.adapter.js";
import { InvoiceMockAdapter } from "./adapters/invoice.mock.adapter.js";
import { POMockAdapter } from "./adapters/po.mock.adapter.js";
import { SpendMockAdapter } from "./adapters/spend.mock.adapter.js";
import { SupplierMockAdapter } from "./adapters/supplier.mock.adapter.js";
import { WarehouseMockAdapter } from "./adapters/warehouse.mock.adapter.js";
import { loadEnv } from "./config/env.js";
import { createServer } from "./config/server.js";
import { ContractController } from "./controllers/contract.controller.js";
import { DeliveryController } from "./controllers/delivery.controller.js";
import { InvoiceController } from "./controllers/invoice.controller.js";
import { POController } from "./controllers/po.controller.js";
import { SpendController } from "./controllers/spend.controller.js";
import { SupplierController } from "./controllers/supplier.controller.js";
import { WarehouseController } from "./controllers/warehouse.controller.js";
import type { AdapterTimingConfig } from "./domain/types.js";
import { buildErrorEnvelope } from "./domain/types.js";
import { registerContractRoutes } from "./routes/contract.routes.js";
import { registerDeliveryRoutes } from "./routes/delivery.routes.js";
import { registerInvoiceRoutes } from "./routes/invoice.routes.js";
import { registerPORoutes } from "./routes/po.routes.js";
import { registerSpendRoutes } from "./routes/spend.routes.js";
import { registerSupplierRoutes } from "./routes/supplier.routes.js";
import { registerWarehouseRoutes } from "./routes/warehouse.routes.js";
import { ContractsExpiringUseCase } from "./usecases/contracts-expiring.usecase.js";
import { CriticalDeliveriesUseCase } from "./usecases/critical-deliveries.usecase.js";
import { DeliveryTrackingUseCase } from "./usecases/delivery-tracking.usecase.js";
import { InvoicesPendingUseCase } from "./usecases/invoices-pending.usecase.js";
import { POApprovalsUseCase } from "./usecases/po-approvals.usecase.js";
import { PickingTasksUseCase } from "./usecases/picking-tasks.usecase.js";
import { PurchaseOrdersUseCase } from "./usecases/purchase-orders.usecase.js";
import { ReceivingTasksUseCase } from "./usecases/receiving-tasks.usecase.js";
import { SpendAnalyticsUseCase } from "./usecases/spend-analytics.usecase.js";
import { SupplierOnboardingUseCase } from "./usecases/supplier-onboarding.usecase.js";
import { SupplierRiskUseCase } from "./usecases/supplier-risk.usecase.js";

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const timing: AdapterTimingConfig = {
    mockDelayMs: env.MOCK_DELAY_MS,
    enableMockDelay: env.ENABLE_MOCK_DELAY,
  };
  // adapters: data access layer
  const supplierAdapter = new SupplierMockAdapter(timing);
  const poAdapter = new POMockAdapter(timing);
  const warehouseAdapter = new WarehouseMockAdapter(timing);
  const deliveryAdapter = new DeliveryMockAdapter(timing);
  const invoiceAdapter = new InvoiceMockAdapter(timing);
  const contractAdapter = new ContractMockAdapter(timing);
  const spendAdapter = new SpendMockAdapter(timing);
  // usecases: business logic layer
  const supplierOnboardingUseCase = new SupplierOnboardingUseCase(supplierAdapter);
  const supplierRiskUseCase = new SupplierRiskUseCase(supplierAdapter);
  const purchaseOrdersUseCase = new PurchaseOrdersUseCase(poAdapter);
  const poApprovalsUseCase = new POApprovalsUseCase(poAdapter);
  const pickingTasksUseCase = new PickingTasksUseCase(warehouseAdapter);
  const receivingTasksUseCase = new ReceivingTasksUseCase(warehouseAdapter);
  const criticalDeliveriesUseCase = new CriticalDeliveriesUseCase(deliveryAdapter);
  const deliveryTrackingUseCase = new DeliveryTrackingUseCase(deliveryAdapter);
  const invoicesPendingUseCase = new InvoicesPendingUseCase(invoiceAdapter);
  const contractsExpiringUseCase = new ContractsExpiringUseCase(contractAdapter);
  const spendAnalyticsUseCase = new SpendAnalyticsUseCase(spendAdapter);
  // controllers: presentation layer
  const supplierController = new SupplierController(supplierOnboardingUseCase, supplierRiskUseCase);
  const poController = new POController(purchaseOrdersUseCase, poApprovalsUseCase);
  const warehouseController = new WarehouseController(pickingTasksUseCase, receivingTasksUseCase);
  const deliveryController = new DeliveryController(criticalDeliveriesUseCase, deliveryTrackingUseCase);
  const invoiceController = new InvoiceController(invoicesPendingUseCase);
  const contractController = new ContractController(contractsExpiringUseCase);
  const spendController = new SpendController(spendAnalyticsUseCase);
  const app = await createServer(env);
  if (env.AUTH_TOKEN !== undefined && env.AUTH_TOKEN.length > 0) {
    const token = env.AUTH_TOKEN;
    app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
      const expected = `Bearer ${token}`;
      const authHeader = request.headers.authorization;
      if (authHeader !== expected) {
        await reply.status(401).send(
          buildErrorEnvelope({
            clientId: "unknown",
            endpoint: request.url,
            code: "UNAUTHORIZED",
            message: "Missing or invalid Authorization header",
          }),
        );
        return;
      }
    });
  }
  await app.register(
    async (instance) => {
      registerSupplierRoutes(instance, supplierController);
      registerPORoutes(instance, poController);
      registerWarehouseRoutes(instance, warehouseController);
      registerDeliveryRoutes(instance, deliveryController);
      registerInvoiceRoutes(instance, invoiceController);
      registerContractRoutes(instance, contractController);
      registerSpendRoutes(instance, spendController);
    },
    { prefix: env.API_PREFIX },
  );
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  app.log.info(`Listening on port ${env.PORT} with API prefix ${env.API_PREFIX}`);
}

bootstrap().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal startup error: ${message}\n`);
  process.exit(1);
});
