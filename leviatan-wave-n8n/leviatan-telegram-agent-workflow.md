## Leviatan Telegram Agent – n8n Workflow

This template connects a Telegram bot with the Leviatan Light API so that a stakeholder can use natural language in Telegram (e.g. “get onboarding suppliers for client demo-client”) and receive a friendly, summarized response. When the result set is large, the workflow automatically generates a PDF and sends it as a document instead of dumping a long list into chat.

### High‑level flow

- **Telegram Trigger**
  - Watches for new `message` updates from your Telegram bot.
  - You must configure the bot token via n8n credentials (`Leviatan Telegram Bot`).

- **Normalize Message (Function)**
  - Extracts:
    - `chatId`: used for replies.
    - `text`: original message.
    - `lowerText`: lower‑cased text for simple intent routing.

- **Route Intent (Function)**
  - Very small, rule‑based NLU layer.
  - Sets `intent` based on keywords:
    - `supplier_onboarding`: if the text mentions “onboard”, “onboarding”, or “new supplier”.
    - `supplier_risk`: if the text mentions “risk” and “supplier”.
    - anything else → `unknown`.

- **Intent Switch (Switch)**
  - Branch 1: `supplier_onboarding` → onboarding path.
  - Branch 2: `supplier_risk` → placeholder node to be implemented later.
  - Default: everything else → `Unknown Intent Reply`.

- **Unknown Intent Reply (Telegram)**
  - Sends a friendly message with examples of supported requests, so the stakeholder can adjust their wording.

### Supplier Onboarding path

- **Parse Onboarding Query (Function)**
  - Interprets the natural language and builds the query object expected by `/suppliers/onboarding` (`supplierOnboardingQuerySchema`):
    - `clientId`:
      - Extracted via regex from phrases like `client demo-client`, `client abc123`, etc.
      - If not found, defaults to `demo-client` as a safe demo tenant.
    - `status`:
      - Maps phrases in the message:
        - “in progress” → `IN_PROGRESS`
        - “awaiting approval” / “pending approval” → `AWAITING_APPROVAL`
        - “rejected” → `REJECTED`
      - If not present, no status filter is applied.
    - `limit`:
      - If the text contains `limit 50`, `limit 100`, etc. it uses that value.
      - Otherwise defaults to `50` (well below the backend hard maximum of 500).
    - `demo`:
      - If the text contains “demo” it sets `demo: "true"`, otherwise `"false"`.
  - Stores the query under `json.query` so it can be passed directly as query string parameters.

- **Call Onboarding API (HTTP Request)**
  - Method: `GET`.
  - URL: `{{$env["LEVIATAN_API_BASE_URL"] || "http://localhost:3000/api"}}/suppliers/onboarding`
    - Set `LEVIATAN_API_BASE_URL` in n8n to match your running Fastify instance and API prefix.
  - Auth:
    - Adds `Authorization: Bearer <token>` header when `LEVIATAN_API_AUTH_TOKEN` is set, matching the `AUTH_TOKEN` used in `src/main.ts`.
  - Querystring:
    - Sends `json.query` as `clientId`, `status`, `limit`, and `demo` query parameters.
  - Response:
    - Expects the standard Leviatan `ApiEnvelope<SupplierOnboarding>` shape (`success`, `data`, `meta`, `error`).

- **Format Onboarding Summary (Function)**
  - If `success === false`:
    - Builds a compact error message like `Error calling onboarding endpoint: <message>`.
    - Sets `isError: true` and `textMessage` for Telegram.
  - If `success === true`:
    - Reads `data` and `meta`.
    - Builds a human‑friendly summary:
      - `✅ Found <count> onboarding suppliers for client <clientId>.`
      - Lists up to 15 preview entries with:
        - supplier name
        - status
        - industry
        - onboarding step
    - If more than 15 rows exist:
      - Adds a line stating a PDF will contain the full list.
      - Sets `needsPdf: true`.
    - Constructs an HTML table with all rows:
      - Columns: Name, Status, Industry, Compliance, Step, Registration Date.
      - Includes minimal styling for readability in PDF.
    - Outputs:
      - `textMessage`: friendly summary for chat.
      - `htmlTable`: complete HTML document for PDF generation.
      - `needsPdf`: boolean flag used by the next decision node.

- **Onboarding Needs PDF? (If)**
  - If `needsPdf === true`:
    - Route to **Generate Onboarding PDF**.
  - Else:
    - Route directly to **Send Onboarding Text Only**.

- **Generate Onboarding PDF (HTML to PDF)**
  - Uses `htmlTable` as input HTML.
  - Produces a `binary.data` PDF stream containing the full onboarding supplier list, formatted as a table.

- **Send Onboarding With PDF (Telegram)**
  - Sends a document message:
    - `chatId` from the original Telegram message.
    - `document` from `binary.data`.
    - `fileName`: `onboarding-suppliers.pdf`.
    - `caption`: the same `textMessage` summary used for the chat‑only path.
  - This makes large result sets friendly for Telegram: short summary in the message, full detail in the attached PDF.

- **Send Onboarding Text Only (Telegram)**
  - For small responses (≤ 15 rows), sends just the summary text without a PDF attachment.

### Supplier risk placeholder

- **Supplier Risk – TODO (Function)**
  - Currently just echoes a placeholder message: `Supplier risk intent detected but not implemented yet.`
  - To implement this intent:
    - Copy the pattern from the onboarding branch:
      - Add a parser for `supplierRiskQuerySchema` fields (`clientId`, `riskLevel`, `complianceStatus`, `demo`).
      - Add an HTTP request node for `/suppliers/risk-assessment`.
      - Add a formatter node that:
        - Summarizes risk scores in text.
        - Builds an HTML table for full detail.
        - Reuses the same PDF / Telegram split pattern.

### Configuration checklist

- **1. Telegram credentials**
  - In n8n, create a Telegram credential named `Leviatan Telegram Bot`.
  - Set the bot token from BotFather.
  - Open the workflow and ensure every Telegram node (`Telegram Trigger`, `Unknown Intent Reply`, `Send Onboarding Text Only`, `Send Onboarding With PDF`) is using that credential.

- **2. Leviatan API configuration**
  - In the n8n workflow environment (or per‑workflow settings) define:
    - `LEVIATAN_API_BASE_URL` – for example `http://localhost:3000/api` or your deployed URL + API prefix.
    - `LEVIATAN_API_AUTH_TOKEN` – must match `AUTH_TOKEN` in your `.env`, so the Fastify `onRequest` hook accepts the request.

- **3. HTML to PDF node**
  - Ensure the `HTML to PDF` node type is available in your n8n instance.
  - The template uses the default configuration; you can adjust page size, margins, or orientation as desired.

### Example prompts for stakeholders

- “Get onboarding suppliers for client demo-client”
- “Show onboarding suppliers for client demo-client in progress”
- “List onboarding suppliers for client acme-123 awaiting approval limit 30”
- “Get demo onboarding suppliers for client demo-client”

The workflow will:

1. Detect that this is a **supplier onboarding** request.
2. Infer the `clientId`, optional `status`, `limit`, and `demo` flag.
3. Call `/suppliers/onboarding` with the correct query.
4. Summarize the results in friendly language.
5. If many rows are returned, send a concise message + PDF instead of flooding the Telegram chat.

