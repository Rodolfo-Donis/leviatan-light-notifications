# Procurement API PoC (Fastify + TypeScript)

Multi-tenant procurement read API with mock Ariba/Coupa-shaped payloads, unified JSON envelopes for n8n, and optional bearer auth.

## Quickstart

1. **Install**

   ```bash
   npm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Adjust `PORT`, `API_PREFIX` (default `/api/v1`), `MOCK_DELAY_MS`, `ENABLE_MOCK_DELAY`, and optionally set `AUTH_TOKEN` to require `Authorization: Bearer <token>` on every request.

3. **Run**

   ```bash
   npm run dev
   ```

   Or build and run production output:

   ```bash
   npm run build && npm start
   ```

4. **Example requests** (replace `API_PREFIX` if you changed it; default base is `http://localhost:3000/api/v1`)

   ```bash
   curl -s "http://localhost:3000/api/v1/suppliers/onboarding?clientId=tenant-acme&status=IN_PROGRESS&limit=20"

   curl -s "http://localhost:3000/api/v1/suppliers/risk-assessment?clientId=tenant-acme&riskLevel=HIGH&complianceStatus=COMPLIANT"

   curl -s "http://localhost:3000/api/v1/purchase-orders/active?clientId=tenant-acme&status=OPEN&fromDate=2026-01-01T00:00:00.000Z&toDate=2026-12-31T23:59:59.999Z"

   curl -s "http://localhost:3000/api/v1/purchase-orders/approvals?clientId=tenant-globex&pendingFor=vp&amountGte=100000"

   curl -s "http://localhost:3000/api/v1/warehouse/picking-tasks?clientId=tenant-acme&priority=HIGH&status=PENDING"

   curl -s "http://localhost:3000/api/v1/warehouse/receiving-tasks?clientId=tenant-globex&expectedDateStart=2026-04-01T00:00:00.000Z&expectedDateEnd=2026-04-30T23:59:59.999Z"

   curl -s "http://localhost:3000/api/v1/deliveries/critical?clientId=tenant-acme&weekRange=current"

   curl -s "http://localhost:3000/api/v1/deliveries/tracking?clientId=tenant-acme&poNumbers=PO-ACME-10421,PO-ACME-10422"

   curl -s "http://localhost:3000/api/v1/invoices/pending?clientId=tenant-globex&matchStatus=EXCEPTION&dueDateStart=2026-04-01T00:00:00.000Z"

   curl -s "http://localhost:3000/api/v1/contracts/expiring?clientId=tenant-acme&daysUntilExpiry=90"

   curl -s "http://localhost:3000/api/v1/spend/analytics?clientId=tenant-acme&period=QUARTER&category=Indirect"
   ```

## Demo mode (`?demo=true`)

Append `demo=true` to any endpoint query string to receive a **curated, stakeholder-friendly slice** of mock data (for example, at least one high-risk supplier, one escalated approval, one overdue delivery where applicable). Filters still apply to tenant (`clientId`), but row selection is biased toward visually rich scenarios for demos.

Example:

```bash
curl -s "http://localhost:3000/api/v1/suppliers/risk-assessment?clientId=tenant-acme&demo=true"
```

## Architecture

Routes validate with Zod, delegate to use cases, and call mock adapters that mirror future Ariba/Coupa HTTP integrations. Only adapters import `src/data/*.mock.ts` files.

The original brief listed ten use case files; **`src/usecases/delivery-tracking.usecase.ts`** was added so `/deliveries/tracking` stays thin at the controller and matches the same port/adapter pattern as the other routes. **`SupplierRisk`** includes `complianceStatus` so `/suppliers/risk-assessment?complianceStatus=` can be implemented without a second cross-domain join in this PoC.
