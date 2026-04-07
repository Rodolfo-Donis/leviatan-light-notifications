## Leviatan Telegram Agent – Technical Design

This document provides a technical view of the `leviatan-telegram-agent-workflow.json` n8n workflow: architecture, node responsibilities, data contracts, and concrete use cases.

---

### 1. Architectural overview

- **Goal**
  - Allow stakeholders to query Leviatan Light APIs from Telegram using natural language.
  - Enforce a **confidence gate** (≥ 90%) before executing an endpoint.
  - Keep Telegram conversations readable and move large datasets into **styled PDF reports**.

- **Key architectural ideas**
  - **Thin intent layer (rule‑based)**:
    - A lightweight intent routine (`Route Intent` + `Intent Confidence Check`) avoids external LLM cost.
  - **API as single source of truth**:
    - n8n only orchestrates; all business logic and data come from your Fastify API (`/suppliers/onboarding`, later others).
  - **Chat‑first UX, report‑second**:
    - Telegram messages are brief summaries.
    - Full details are delivered as a styled PDF when the dataset is large.

- **Main integration points**
  - **Telegram Bot API** (via n8n Telegram Trigger / Telegram nodes).
  - **Leviatan Light API** (Fastify, using the `AUTH_TOKEN`‑protected endpoints).
  - **n8n HTML → PDF node** for document generation.

---

### 2. Node‑level breakdown

#### 2.1 Inbound channel and normalization

- **`Telegram Trigger`**
  - Listens to `message` updates from a configured Telegram bot.
  - Raw payload shape (simplified):
    - `message.chat.id`: numeric chat identifier.
    - `message.text`: original message from the stakeholder.

- **`Normalize Message` (Function)**
  - Input: Telegram trigger item (`item.json.message`).
  - Output fields:
    - `chatId: number | undefined`
    - `text: string` – original message text.
    - `lowerText: string` – `text.toLowerCase()`.
  - Purpose:
    - Centralizes message parsing, so downstream nodes do not depend on Telegram payload structure.

#### 2.2 Intent detection and confidence gating

- **`Route Intent` (Function)**
  - Input fields:
    - `lowerText`
  - Logic:
    - Computes:
      - `intent: "supplier_onboarding" | "supplier_risk" | "unknown"`
      - `confidence: number` in \[0,1\]
      - `intentReason: string` (for debugging / future logging)
    - Rules:
      - If onboarding‑like keywords:
        - `onboard`, `onboarding`, `new supplier`
        - and no clear supplier‑risk combination:
        - → `intent = "supplier_onboarding"`, `confidence = 0.95`
      - If supplier risk keywords:
        - contains `risk` and `supplier`
        - and no explicit onboarding keywords:
        - → `intent = "supplier_risk"`, `confidence = 0.95`
      - If both onboarding and risk signals:
        - → `intent = "unknown"`, `confidence = 0.5`
      - If nothing matches:
        - → `intent = "unknown"`, `confidence = 0`, default reason.

- **`Intent Confidence Check` (If)**
  - Condition:
    - `confidence > 0.9` → **true** branch.
    - Otherwise → **false** branch.
  - Branches:
    - **True** → `Intent Switch` (normal intent routing).
    - **False** → `Ask Intent Clarification` (request explicit user confirmation).

- **`Ask Intent Clarification` (Telegram)**
  - Sends a **polite, structured clarification** message:
    - Explains that the agent only acts when it is at least 90% confident.
    - Lists currently supported routes:
      - Supplier onboarding.
      - Supplier risk.
    - Asks the stakeholder to reply with:
      - Chosen route.
      - `clientId`.
      - Optional filters (status, risk level, etc.).
  - This turns low‑confidence messages into an explicit **confirmation roundtrip**.

- **`Unknown Intent Reply` (Telegram)**
  - Used when an intent is clearly unknown (even after routing).
  - Provides examples of valid prompts and asks the stakeholder to clarify.

#### 2.3 Intent routing

- **`Intent Switch` (Switch)**
  - Switches on `intent`:
    - Case 1 (`supplier_onboarding`) → onboarding path.
    - Case 2 (`supplier_risk`) → supplier risk placeholder path (to be implemented).
    - Default → `Unknown Intent Reply`.

---

### 3. Supplier onboarding flow

This branch calls `/suppliers/onboarding` and summarizes the results.

#### 3.1 Query construction

- **`Parse Onboarding Query` (Function)**
  - Reads `text` and derives the query parameters expected by `supplierOnboardingQuerySchema`:
    - `clientId: string`
      - Regex extracts from phrases like: `client demo-client`, `client acme-123`.
      - Fallback: `"demo-client"` (safe demo tenant).
    - `status?: "IN_PROGRESS" | "AWAITING_APPROVAL" | "REJECTED"`
      - If `text` contains:
        - `"in progress"` → `IN_PROGRESS`
        - `"awaiting approval"` or `"pending approval"` → `AWAITING_APPROVAL`
        - `"rejected"` → `REJECTED`
      - If none present → no filter applied.
    - `limit: number`
      - If `text` contains `limit 20`, `limit 50`, etc. → parse as integer.
      - Else default: `50`.
    - `demo: "true" | "false"`
      - If `text` contains `"demo"` → `"true"`.
      - Otherwise → `"false"`.
  - Writes the assembled object to `json.query`, preserving `chatId`, text and intent fields.

#### 3.2 API invocation

- **`Call Onboarding API` (HTTP Request)**
  - Method: `GET`.
  - URL:
    - `{{$env["LEVIATAN_API_BASE_URL"] || "http://localhost:3000/api"}}/suppliers/onboarding`
  - Auth:
    - `Authorization` header:
      - `Bearer {{$env["LEVIATAN_API_AUTH_TOKEN"]}}` when the env var is set.
      - Matches the Fastify `AUTH_TOKEN` check in `src/main.ts`.
  - Query parameters:
    - Passes `json.query` as `clientId`, `status`, `limit`, `demo`.
  - Expected response (per `ApiEnvelope<SupplierOnboarding>`):
    - `success: true | false`
    - `data: SupplierOnboarding[]` (or `null`).
    - `meta: { clientId, endpoint, count, timestamp }`
    - `error?: { code, message, details? }`

#### 3.3 Response normalization and PDF generation

- **`Format Onboarding Summary` (Function)**
  - If `success === false`:
    - Builds an error message like:
      - `❌ Error calling onboarding endpoint: <message>`.
    - Sets:
      - `isError: true`
      - `textMessage: string`
      - `htmlTable: ""`
  - If `success === true`:
    - Reads:
      - `rows = envelope.data`
      - `meta = envelope.meta`
      - `count = rows.length`
    - Chat summary:
      - Friendly header:
        - `✅ I found <count> onboarding suppliers for client <clientId>.`
      - If `count > 15`:
        - Adds:
          - `I will show you the first 15 here and attach a PDF with the complete list so the chat stays readable.`
      - Adds one bullet per preview row (up to 15):
        - `• <name> – status: <status>, industry: <industry>, step: <onboardingStep>`
      - Result:
        - `textMessage: string`
    - PDF preparation:
      - Table header columns:
        - `Name`, `Status`, `Industry`, `Compliance`, `Step`, `Registration Date`.
      - For each row:
        - Chooses a row background color:
          - `IN_PROGRESS` → `#e8f5e9` (light green).
          - `AWAITING_APPROVAL` → `#fff8e1` (light yellow).
          - `REJECTED` → `#ffebee` (light red).
        - Renders `<tr style="background:...">` with the data cells.
      - Wraps everything in a minimal HTML template:
        - Global style:
          - Clean sans‑serif fonts, soft background, card‑style table.
        - Title:
          - `Supplier Onboarding – Client <clientId>`.
        - Summary paragraph:
          - `Total suppliers: <count>`.
      - Output fields:
        - `htmlTable: string` – full HTML doc for the PDF node.
        - `needsPdf: boolean` – `true` if `count > 15`, otherwise `false`.

- **`Onboarding Needs PDF?` (If)**
  - Condition:
    - `needsPdf === true` → **true** branch (generate PDF).
    - Otherwise → **false** branch (text‑only).

- **`Generate Onboarding PDF` (HTML to PDF)**
  - Input:
    - `html: {{$json["htmlTable"]}}`
  - Output:
    - `binary.data` – PDF document containing the table and summary.

#### 3.4 Telegram delivery

- **`Send Onboarding With PDF` (Telegram)**
  - Used when `needsPdf === true`.
  - Sends:
    - `resource: document`
    - `chatId: {{$json["chatId"]}}`
    - `document: {{$binary.data}}`
    - `additionalFields`:
      - `caption: {{$json["textMessage"]}}`
      - `fileName: "onboarding-suppliers.pdf"`
  - UX:
    - The stakeholder sees:
      - A polite, short description in chat.
      - A properly formatted PDF for deeper inspection.

- **`Send Onboarding Text Only` (Telegram)**
  - Used when `needsPdf === false` (small datasets).
  - Sends:
    - `chatId: {{$json["chatId"]}}`
    - `text: {{$json["textMessage"]}}`

---

### 4. Supplier risk path (placeholder)

- **`Supplier Risk – TODO` (Function)**
  - Currently a stub that returns:
    - `textMessage: "Supplier risk intent detected but not implemented yet."`
  - Intended future implementation:
    - Mirror the onboarding pattern:
      - `Parse Supplier Risk Query` (uses `supplierRiskQuerySchema` fields:
        - `clientId`, `riskLevel`, `complianceStatus`, `demo`).
      - `Call Supplier Risk API` (`/suppliers/risk-assessment`).
      - `Format Supplier Risk Summary`:
        - Text summary with high‑risk suppliers at the top.
        - Styled PDF (color‑coded by `riskLevel`).
      - `Needs PDF?` decision + Telegram delivery nodes.

---

### 5. Configuration and environment

- **Telegram**
  - Credential: `Leviatan Telegram Bot`.
  - Nodes using it:
    - `Telegram Trigger`
    - `Unknown Intent Reply`
    - `Ask Intent Clarification`
    - `Send Onboarding Text Only`
    - `Send Onboarding With PDF`

- **Leviatan API**
  - Required environment variables for the workflow:
    - `LEVIATAN_API_BASE_URL`
      - Example: `http://localhost:3000/api`.
    - `LEVIATAN_API_AUTH_TOKEN`
      - Must match `AUTH_TOKEN` in `.env` used by `src/main.ts`, so the onRequest hook authorizes calls.

---

### 6. Example use cases

#### 6.1 Happy path – onboarding, high confidence, small result

- **Input (Telegram)**  
  - `Get onboarding suppliers for client demo-client in progress limit 10`

- **Flow**
  - `Route Intent`:
    - Detects onboarding intent → `intent = "supplier_onboarding"`, `confidence = 0.95`.
  - `Intent Confidence Check`:
    - `0.95 > 0.9` → proceed.
  - `Parse Onboarding Query`:
    - `clientId = "demo-client"`
    - `status = "IN_PROGRESS"`
    - `limit = 10`
    - `demo = "false"`
  - `Call Onboarding API`:
    - Hits `/suppliers/onboarding` with the above query.
  - `Format Onboarding Summary`:
    - Assume `count = 8`.
    - `needsPdf = false`.
  - `Onboarding Needs PDF?`:
    - Goes to `Send Onboarding Text Only`.

- **Output (Telegram)**  
  - Polite text summary listing up to 8 suppliers, no PDF attached.

#### 6.2 Happy path – onboarding, high confidence, large result

- **Input (Telegram)**  
  - `Show all onboarding suppliers for client demo-client`

- **Flow**
  - Same as above, but assume `count = 120`.
  - `Format Onboarding Summary`:
    - `needsPdf = true`, `maxPreview = 15`.
  - `Onboarding Needs PDF?`:
    - True branch → `Generate Onboarding PDF` → `Send Onboarding With PDF`.

- **Output (Telegram)**  
  - Short text message with the first 15 suppliers.
  - Attached PDF named `onboarding-suppliers.pdf` with all 120 entries, color‑coded by status.

#### 6.3 Low confidence – clarification needed

- **Input (Telegram)**  
  - `Can you help me with suppliers for demo-client?`

- **Flow**
  - `Route Intent`:
    - May see generic “suppliers” but not specific onboarding or risk keywords.
    - → `intent = "unknown"`, `confidence ≈ 0`.
  - `Intent Confidence Check`:
    - `0 <= 0.9` → false branch.
  - `Ask Intent Clarification`:
    - Sends options:
      - Supplier onboarding.
      - Supplier risk.
    - Asks for `clientId` and filters.

- **Output (Telegram)**  
  - Clarification message explaining:
    - The agent wants at least 90% certainty.
    - What routes are available.
    - What parameters are needed.

#### 6.4 Ambiguous – both onboarding and risk keywords

- **Input (Telegram)**  
  - `Show onboarding and risk details for my suppliers in demo-client`

- **Flow**
  - `Route Intent`:
    - Detects both onboarding and risk words.
    - Sets `intent = "unknown"`, `confidence = 0.5`, reason = “ambiguous”.
  - `Intent Confidence Check`:
    - `0.5 <= 0.9` → clarification path.

- **Output (Telegram)**  
  - Same structured clarification message, prompting the stakeholder to choose one route or split their request.

---

### 7. Extension points

- **New endpoints**
  - Add new intents in `Route Intent` (and extend the confidence logic).
  - Add new branches in `Intent Switch` and corresponding parse/API/format/PDF/Telegram nodes.

- **Richer NLU**
  - Replace or complement `Route Intent` with an n8n AI node (if later you decide to incur cost).
  - Keep the **confidence check pattern** as a stable contract: only proceed when ≥ 90%.

- **Observability**
  - Optionally add:
    - A database or log node to capture:
      - raw messages
      - computed intent and confidence
      - chosen endpoint and parameters
      - errors from downstream APIs

This technical view should give you enough detail to maintain, extend, and reason about the `leviatan-telegram-agent-workflow.json` as the Leviatan Light API surface grows. 

