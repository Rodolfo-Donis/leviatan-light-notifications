import { z } from "zod";

/** Shared API response metadata (flat for n8n). */
export interface ResponseMeta {
  readonly clientId: string;
  readonly timestamp: string;
  readonly count: number;
  readonly endpoint: string;
}

export interface ErrorBody {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface SuccessEnvelope<T> {
  readonly success: true;
  readonly data: T[];
  readonly meta: ResponseMeta;
}

export interface ErrorEnvelope {
  readonly success: false;
  readonly data: null;
  readonly meta: ResponseMeta;
  readonly error: ErrorBody;
}

export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export interface SupplierOnboarding {
  readonly id: string;
  readonly name: string;
  readonly status: "IN_PROGRESS" | "AWAITING_APPROVAL" | "REJECTED";
  readonly registrationDate: string;
  readonly contactEmail: string;
  readonly industry: string;
  readonly complianceStatus: "COMPLIANT" | "NON_COMPLIANT";
  readonly onboardingStep: string;
  readonly clientId: string;
}

export interface SupplierRisk {
  readonly supplierId: string;
  readonly riskScore: number;
  readonly riskLevel: "HIGH" | "MEDIUM" | "LOW";
  readonly esgScore: number;
  readonly financialHealth: string;
  readonly lastAuditDate: string;
  readonly flags: readonly string[];
  /** Coupa/Ariba-style compliance snapshot used for procurement filtering in PoC. */
  readonly complianceStatus: "COMPLIANT" | "NON_COMPLIANT";
  readonly clientId: string;
}

export interface PurchaseOrder {
  readonly poNumber: string;
  readonly supplierId: string;
  readonly lineItemsCount: number;
  readonly totalAmount: number;
  readonly currency: string;
  readonly status: "OPEN" | "PARTIALLY_RECEIVED" | "CLOSED";
  readonly createdDate: string;
  readonly expectedDeliveryDate: string;
  readonly approver: string;
  readonly clientId: string;
}

export interface POApproval {
  readonly approvalId: string;
  readonly poNumber: string;
  readonly currentApprover: string;
  readonly pendingSince: string;
  readonly escalationLevel: number;
  readonly amount: number;
  readonly clientId: string;
}

export interface PickingTask {
  readonly taskId: string;
  readonly poNumber: string;
  readonly sku: string;
  readonly quantity: number;
  readonly warehouseZone: string;
  readonly status: "PENDING" | "IN_PROGRESS";
  readonly priority: "HIGH" | "MEDIUM" | "LOW";
  readonly assignedTo: string;
  readonly clientId: string;
}

export interface ReceivingTask {
  readonly receiptId: string;
  readonly poNumber: string;
  readonly expectedQty: number;
  readonly receivedQty: number;
  readonly status: string;
  readonly dockLocation: string;
  readonly expectedArrival: string;
  readonly clientId: string;
}

export interface CriticalDelivery {
  readonly deliveryId: string;
  readonly poNumber: string;
  readonly supplierName: string;
  readonly eta: string;
  readonly carrier: string;
  readonly riskLevel: "HIGH" | "MEDIUM" | "LOW";
  readonly delayReason: string;
  readonly clientId: string;
}

export interface DeliveryTracking {
  readonly trackingId: string;
  readonly poNumber: string;
  readonly currentLocation: string;
  readonly status: string;
  readonly lastUpdate: string;
  readonly estimatedArrival: string;
  readonly clientId: string;
}

export interface PendingInvoice {
  readonly invoiceId: string;
  readonly poNumber: string;
  readonly supplierId: string;
  readonly amount: number;
  readonly matchStatus: "2WAY" | "3WAY" | "EXCEPTION";
  readonly exceptionReason: string;
  readonly dueDate: string;
  readonly clientId: string;
}

export interface ExpiringContract {
  readonly contractId: string;
  readonly supplierId: string;
  readonly title: string;
  readonly startDate: string;
  readonly expiryDate: string;
  readonly autoRenew: boolean;
  readonly spendYTD: number;
  readonly clientId: string;
}

export interface SpendAnalyticRow {
  readonly period: string;
  readonly category: string;
  readonly supplier: string;
  readonly costCenter: string;
  readonly amount: number;
  readonly currency: string;
  readonly variancePercent: number;
  readonly clientId: string;
}

/** Adapter contracts — implementations live under `src/adapters/`. */
export interface SupplierPort {
  fetchOnboardingSuppliers(): Promise<readonly SupplierOnboarding[]>;
  fetchSupplierRisks(): Promise<readonly SupplierRisk[]>;
}

export interface PurchaseOrderPort {
  fetchPurchaseOrders(): Promise<readonly PurchaseOrder[]>;
  fetchPOApprovals(): Promise<readonly POApproval[]>;
}

export interface WarehousePort {
  fetchPickingTasks(): Promise<readonly PickingTask[]>;
  fetchReceivingTasks(): Promise<readonly ReceivingTask[]>;
}

export interface DeliveryPort {
  fetchCriticalDeliveries(): Promise<readonly CriticalDelivery[]>;
  fetchDeliveryTracking(): Promise<readonly DeliveryTracking[]>;
}

export interface InvoicePort {
  fetchPendingInvoices(): Promise<readonly PendingInvoice[]>;
}

export interface ContractPort {
  fetchExpiringContracts(): Promise<readonly ExpiringContract[]>;
}

export interface SpendPort {
  fetchSpendAnalytics(): Promise<readonly SpendAnalyticRow[]>;
}

export interface AdapterTimingConfig {
  readonly mockDelayMs: number;
  readonly enableMockDelay: boolean;
}

export const supplierOnboardingQuerySchema = z.object({
  clientId: z.string().min(1),
  status: z.enum(["IN_PROGRESS", "AWAITING_APPROVAL", "REJECTED"]).optional(),
  limit: z.coerce.number().int().positive().max(500).default(20),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const supplierRiskQuerySchema = z.object({
  clientId: z.string().min(1),
  riskLevel: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  complianceStatus: z.enum(["COMPLIANT", "NON_COMPLIANT"]).optional(),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const purchaseOrdersActiveQuerySchema = z.object({
  clientId: z.string().min(1),
  status: z.enum(["OPEN", "PARTIALLY_RECEIVED", "CLOSED"]).optional(),
  fromDate: z.string().min(1).optional(),
  toDate: z.string().min(1).optional(),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const poApprovalsQuerySchema = z.object({
  clientId: z.string().min(1),
  pendingFor: z.string().optional(),
  amountGte: z.coerce.number().nonnegative().optional(),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const pickingTasksQuerySchema = z.object({
  clientId: z.string().min(1),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS"]).optional(),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const receivingTasksQuerySchema = z.object({
  clientId: z.string().min(1),
  expectedDateStart: z.string().min(1).optional(),
  expectedDateEnd: z.string().min(1).optional(),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const criticalDeliveriesQuerySchema = z.object({
  clientId: z.string().min(1),
  weekRange: z.literal("current").default("current"),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const deliveryTrackingQuerySchema = z.object({
  clientId: z.string().min(1),
  poNumbers: z.string().min(1),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const pendingInvoicesQuerySchema = z.object({
  clientId: z.string().min(1),
  matchStatus: z.enum(["2WAY", "3WAY", "EXCEPTION"]).optional(),
  dueDateStart: z.string().min(1).optional(),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const expiringContractsQuerySchema = z.object({
  clientId: z.string().min(1),
  daysUntilExpiry: z.coerce.number().int().positive().max(3650).default(90),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const spendAnalyticsQuerySchema = z.object({
  clientId: z.string().min(1),
  period: z.enum(["MONTH", "QUARTER", "YEAR"]),
  category: z.string().optional(),
  demo: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type SupplierOnboardingQuery = z.infer<typeof supplierOnboardingQuerySchema>;
export type SupplierRiskQuery = z.infer<typeof supplierRiskQuerySchema>;
export type PurchaseOrdersActiveQuery = z.infer<typeof purchaseOrdersActiveQuerySchema>;
export type POApprovalsQuery = z.infer<typeof poApprovalsQuerySchema>;
export type PickingTasksQuery = z.infer<typeof pickingTasksQuerySchema>;
export type ReceivingTasksQuery = z.infer<typeof receivingTasksQuerySchema>;
export type CriticalDeliveriesQuery = z.infer<typeof criticalDeliveriesQuerySchema>;
export type DeliveryTrackingQuery = z.infer<typeof deliveryTrackingQuerySchema>;
export type PendingInvoicesQuery = z.infer<typeof pendingInvoicesQuerySchema>;
export type ExpiringContractsQuery = z.infer<typeof expiringContractsQuerySchema>;
export type SpendAnalyticsQuery = z.infer<typeof spendAnalyticsQuerySchema>;

export function buildResponseMeta(input: {
  readonly clientId: string;
  readonly endpoint: string;
  readonly count: number;
}): ResponseMeta {
  return {
    clientId: input.clientId,
    endpoint: input.endpoint,
    count: input.count,
    timestamp: new Date().toISOString(),
  };
}

export function buildSuccessEnvelope<T>(
  data: readonly T[],
  input: { readonly clientId: string; readonly endpoint: string },
): SuccessEnvelope<T> {
  const rows = [...data];
  return {
    success: true,
    data: rows,
    meta: buildResponseMeta({
      clientId: input.clientId,
      endpoint: input.endpoint,
      count: rows.length,
    }),
  };
}

export function buildErrorEnvelope(
  input: {
    readonly clientId: string;
    readonly endpoint: string;
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  },
): ErrorEnvelope {
  const error: ErrorBody = {
    code: input.code,
    message: input.message,
  };
  if (input.details !== undefined) {
    return {
      success: false,
      data: null,
      meta: buildResponseMeta({
        clientId: input.clientId,
        endpoint: input.endpoint,
        count: 0,
      }),
      error: { ...error, details: input.details },
    };
  }
  return {
    success: false,
    data: null,
    meta: buildResponseMeta({
      clientId: input.clientId,
      endpoint: input.endpoint,
      count: 0,
    }),
    error,
  };
}
