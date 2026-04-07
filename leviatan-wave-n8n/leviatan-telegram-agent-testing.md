## Leviatan Telegram Agent – Step‑by‑Step Testing in n8n

This guide explains how to import and test `leviatan-telegram-agent-workflow.json` in a fresh n8n project, end‑to‑end from Telegram to your Leviatan Light API.

---

### 1. Prerequisites

- **n8n instance running**
  - Local (Docker or npx) or hosted n8n.
  - You must be able to access the n8n web UI.

- **Leviatan Light API running**
  - Start the API from the project root:

```bash
npm install
npm run build
npm start
```

- **Environment alignment**
  - Ensure the API is listening on the host/port you expect (default from `main.ts` and `.env`).
  - Know the `AUTH_TOKEN` you set in the Leviatan `.env` (if any).

- **Telegram bot**
  - Create a bot with BotFather in Telegram.
  - Save the bot token (e.g. `123456789:ABC-...`).

---

### 2. Configure Leviatan API access in n8n

In n8n, we will point the workflow to your running API using environment variables.

- **2.1. Determine your base URL**
  - If running locally with default config:
    - API likely available at something similar to:
      - `http://localhost:3000/api`
    - Confirm the actual `PORT` and `API_PREFIX` in your `.env` and `src/config/env.ts`.

- **2.2. Set environment variables for the workflow**
  - Depending on how you run n8n:
    - **Docker**:
      - Add to your `docker-compose.yml` or docker `env` block:

```bash
- N8N_ENV_LEVIATAN_API_BASE_URL=http://host.docker.internal:3000/api
- N8N_ENV_LEVIATAN_API_AUTH_TOKEN=<your_auth_token_if_configured>
```

    - **Local (npx n8n)**:
      - Export env vars before starting:

```bash
export N8N_ENV_LEVIATAN_API_BASE_URL=http://localhost:3000/api
export N8N_ENV_LEVIATAN_API_AUTH_TOKEN=<your_auth_token_if_configured>
npx n8n
```

  - In the workflow, these are accessed as:
    - `{{$env["LEVIATAN_API_BASE_URL"]}}`
    - `{{$env["LEVIATAN_API_AUTH_TOKEN"]}}`

---

### 3. Set up Telegram credentials in n8n

- **3.1. Open n8n**
  - Open the n8n UI in your browser (e.g. `http://localhost:5678`).

- **3.2. Create Telegram credentials**
  - Go to **Settings → Credentials**.
  - Click **New** and choose **Telegram** as the credential type.
  - Name it exactly:
    - `Leviatan Telegram Bot`
  - Paste the Telegram bot token from BotFather.
  - Save the credential.

---

### 4. Import the workflow JSON

- **4.1. Create new workflow**
  - In n8n, click **Workflows → New**.

- **4.2. Import from file**
  - Click the three dots (⋮) near the workflow name.
  - Select **Import from file**.
  - Choose `leviatan-telegram-agent-workflow.json` from:
    - `leviatan-wave-n8n/leviatan-telegram-agent-workflow.json`
  - n8n will load all nodes and connections.

- **4.3. Verify Telegram nodes use your credential**
  - Click each Telegram node:
    - `Telegram Trigger`
    - `Unknown Intent Reply`
    - `Ask Intent Clarification`
    - `Send Onboarding Text Only`
    - `Send Onboarding With PDF`
  - In each node, under **Credentials**, ensure:
    - `Telegram API` is set to `Leviatan Telegram Bot`.

---

### 5. Basic functional test (onboarding, small dataset)

This test verifies that:
- Telegram → n8n → Leviatan API → Telegram (text summary) works.

- **5.1. Activate the workflow**
  - Turn on the **Active** switch for the workflow so the `Telegram Trigger` starts listening.

- **5.2. Open your Telegram bot chat**
  - In Telegram, search for your bot name.
  - Start the conversation (click **Start** or send any message).

- **5.3. Send a simple onboarding request**
  - Example message:
    - `Get onboarding suppliers for client demo-client in progress limit 5`

- **Expected behavior**
  - `Route Intent`:
    - Detects `supplier_onboarding` with high confidence (`0.95`).
  - `Intent Confidence Check`:
    - Passes (confidence > 0.9).
  - `Parse Onboarding Query`:
    - Builds:
      - `clientId: "demo-client"`
      - `status: "IN_PROGRESS"`
      - `limit: 5`
      - `demo: "false"` (unless you include the word `demo`).
  - `Call Onboarding API`:
    - Performs GET `/suppliers/onboarding` with those parameters.
  - `Format Onboarding Summary`:
    - `count` = number of records returned.
    - `needsPdf` = `false` for `count <= 15`.
  - `Send Onboarding Text Only`:
    - You receive a polite summary message in Telegram with up to 5 bullet lines.

If this flow succeeds, your connectivity and basic orchestrations are working.

---

### 6. Large dataset test (onboarding, PDF generation)

This test ensures the HTML → PDF path and Telegram document sending work correctly.

- **6.1. Use a broader onboarding request**
  - Example message:
    - `Show all onboarding suppliers for client demo-client`

- **Expected behavior**
  - Flow is similar to the basic test, but:
    - `limit` defaults to 50 (unless overridden).
    - `count` may be greater than 15 (depending on mock data).
  - `Format Onboarding Summary`:
    - `needsPdf = true` when `count > 15`.
    - Generates a fully styled HTML table:
      - Rows color‑coded by `status`.
  - `Generate Onboarding PDF`:
    - Converts the HTML to a PDF in `binary.data`.
  - `Send Onboarding With PDF`:
    - Sends:
      - A summary message.
      - A document called `onboarding-suppliers.pdf`.

- **Verification**
  - Open the PDF from Telegram.
  - Confirm:
    - Title shows correct `clientId`.
    - Row colors reflect status.
    - Columns contain the onboarding fields.

---

### 7. Confidence and clarification test

This test verifies the 90% confidence gate and clarification messages.

- **7.1. Send an ambiguous message**
  - Example:
    - `Can you help me with suppliers for demo-client?`

- **Expected behavior**
  - `Route Intent`:
    - Cannot confidently map to a specific route.
    - Produces low `confidence` (<= 0.9).
  - `Intent Confidence Check`:
    - Fails the threshold.
  - `Ask Intent Clarification`:
    - You receive a message listing all supported routes:
      - supplier onboarding, supplier risk, active purchase orders, approvals, picking tasks, receiving tasks, critical deliveries, tracking, pending invoices, expiring contracts, spend analytics.
    - It asks you to:
      - Choose a route.
      - Provide `clientId` and filters.

Use this to confirm that the agent does not run uncertain operations and behaves safely.

---

### 8. Error handling test

- **8.1. Break the API on purpose**
  - Stop the Leviatan API process or point `LEVIATAN_API_BASE_URL` to a non‑responsive host (temporarily).

- **8.2. Send a normal onboarding request**
  - Example:
    - `Get onboarding suppliers for client demo-client`

- **Expected behavior**
  - `Call Onboarding API` fails.
  - `Format Onboarding Summary`:
    - Sets `isError: true`.
    - Generates a text message starting with:
      - `❌ Error calling onboarding endpoint: ...`
  - Telegram:
    - You receive a clear error message instead of a crash.

Restore the correct API settings after this test.

---

### 9. Extending tests to other routes (optional)

Right now, the workflow advertises all available Leviatan routes in the clarification messages but only fully wires the **supplier onboarding** path. To test additional routes (pending invoices, PO approvals, etc.), follow this pattern:

1. **Add intent rules** in `Route Intent` for the new route (e.g. detect “pending invoices”).
2. **Extend `Intent Switch`** with a new branch for the intent.
3. **Create parse / API / format / PDF / Telegram nodes** mirroring the onboarding branch:
   - Parse query parameters based on the corresponding Zod schema in `src/domain/types.ts`.
   - Call the correct endpoint (e.g. `/invoices/pending`).
   - Build a concise text summary.
   - Generate a styled HTML table and convert it to PDF when the dataset is large.
4. **Test** using the same pattern:
   - Small dataset (no PDF).
   - Large dataset (PDF).
   - Confidence / clarification and error scenarios.

This ensures consistency across all Leviatan routes while keeping the Telegram experience clean and stakeholder‑friendly.

