1 — Core idea / success criteria

Minimum viable product to win the challenge:

User can Sign in with Google (OAuth) and connect multiple Gmail accounts (dev-mode — add tester email in Google Cloud Console).

User can create/edit/delete custom categories (name + description).

New emails are imported and automatically categorized by AI against category descriptions and summarized; the original message is archived in Gmail (i.e., removed from INBOX).

App UI shows categories; clicking a category shows imported messages (AI summary shown); allows selecting messages and bulk actions: Delete (delete from Gmail) or Unsubscribe (automation).

Clicking an email shows original contents.

Unsubscribe attempts to follow unsubscribe links, fill simple forms and complete the unsubscribe action (best-effort agent).

App is deployed (Render / Fly.io), with repo link and functioning app url.

Tests exist (unit + integration) and run in CI.

If all above are present, you’ll satisfy the spec.

2 — Tech stack (recommended, pragmatic for 48–72h)

Frontend / fullstack framework: Next.js (TypeScript, App Router) — quick, deployable, server-side API routes.

Auth: NextAuth.js (Google provider) or custom OAuth flow if needed; NextAuth simplifies session management.

Backend runtime & jobs: Node.js (TypeScript).

DB: Postgres (Render/Fly provides Postgres); use Prisma for schema + migrations.

Background queue: BullMQ (Redis) or Bee-Queue (Redis). Use Render-managed Redis or small Redis on Fly.

Worker for AI classification + summarization: Node worker that consumes queue jobs.

AI provider: OpenAI (GPT-4o/GPT-4) or Anthropic (Claude); design provider-agnostic AIClient interface. (You’ll plug provider API key in env).

Gmail integration: Google Gmail REST API (via googleapis Node client).

Inbox change detection:

Preferred: Gmail push notifications via Pub/Sub (best for production). For dev/test or simplicity, use Gmail history.list polling (short interval like 15–30s) with startHistoryId tracking. Polling is simpler to implement in 48h.

Unsubscribe agent: Playwright headless browser (server-side) to follow links and interact. Use Playwright’s headless Chromium.

UI: React + Tailwind CSS for fast clean UI.

Tests: Jest + React Testing Library for frontend components, Supertest for API routes; integration tests for worker job flows, and Playwright E2E for unsubscribe flows.

Deploy: Render (or Fly.io) — both straightforward for Next.js + worker + Postgres + Redis.

Monitoring/logs: Sentry optional; use simple logging.

3 — High-level architecture / components

Next.js app (frontend + API routes)

Routes: /api/auth/* (NextAuth), /api/gmail/connect, /api/categories, /api/emails, /api/unsubscribe, /api/webhook/gmail-pubsub (if using push).

Background worker(s) (runs as separate process)

Jobs: processNewMessage, classifyAndSummarize, unsubscribeJob

Redis (queue)

Postgres (persistent storage)

Stores: users, accounts (connected Gmail accounts), categories, messages, message metadata, job logs, unsubscribes.

Playwright worker for unsubscribe automation (invoked by unsubscribeJob).

AI layer abstraction used by worker to call classification/summarization prompts.

Flow summary:

User signs in -> OAuth tokens stored encrypted in DB.

Background poller or Pub/Sub webhook receives new message meta -> enqueue processNewMessage.

processNewMessage fetches message payload via Gmail API, calls classifyAndSummarize which uses AI to determine category (based on user categories descriptions) and to summarize content, then stores it and archives the message in Gmail (remove INBOX label).

UI shows categories and messages; selecting messages triggers unsubscribeJob or delete via Gmail API.

4 — DB schema (Prisma-style simplified)
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  createdAt    DateTime @default(now())
  accounts     Account[]
  categories   Category[]
}

model Account {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id])
  provider       String   // "google"
  providerAccountId String
  accessToken    String   // encrypted
  refreshToken   String?  // encrypted
  tokenExpiry    DateTime?
  gmailProfileId String?  // Gmail profile userId
  createdAt      DateTime @default(now())
}

model Category {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  name        String
  description String   // used to guide AI classification
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  messages    Message[]
}

model Message {
  id               String   @id @default(cuid())
  accountId        String
  account          Account  @relation(fields: [accountId], references: [id])
  gmailMessageId   String   // Google messageId
  threadId         String?
  categoryId       String?  // assigned category
  subject          String?
  from             String?
  to               String?
  snippet          String?
  bodyText         String?  // cleaned text
  bodyHtml         String?  // html
  aiSummary        String?
  aiClassification Json?    // optional scores, reasons
  importedAt       DateTime @default(now())
  archived         Boolean  @default(false)
  unsubscribed     Boolean  @default(false)
}

5 — API endpoints (sketch)

Auth handled by NextAuth.

Important endpoints:

GET /api/accounts — list connected Gmail accounts

POST /api/accounts/connect — start OAuth flow (NextAuth/Google)

GET /api/categories — list categories

POST /api/categories — create category {name, description}

PUT /api/categories/:id — update

DELETE /api/categories/:id — delete

GET /api/categories/:id/emails — list messages for category (pagination + summaries)

GET /api/messages/:id — get original content (HTML/text)

POST /api/messages/bulk — bulk actions {action: 'delete'|'unsubscribe', messageIds: [...]} -> enqueues jobs

POST /api/unsubscribe — start unsubscribe for single message (used by bulk)

POST /api/webhook/gmail — optional pubsub webhook for Gmail push

Return shapes are JSON with message summary and metadata.

6 — Gmail scopes & OAuth setup (dev notes)

Use Google Cloud project and OAuth client ID. For dev/testing you will add the user’s Gmail as a test user in OAuth consent screen.

Required scopes (minimum):

https://www.googleapis.com/auth/gmail.modify — read/write and archive messages (modify labels)

https://www.googleapis.com/auth/gmail.readonly — read only (not enough because we need to remove INBOX; so use gmail.modify)

email, profile, openid for user info

Steps (brief):

Create a Google Cloud project.

Configure OAuth consent screen, app type External, mark as "testing" and add your tester email(s) to Test Users.

Create OAuth 2.0 Client ID (Web app), set authorized redirect URIs to your deployed app (https://your-app.com/api/auth/callback/google).

Use NextAuth with Google provider or googleapis OAuth2Client to get tokens.

Store refresh token securely (encrypt at rest).

Important: Gmail scopes cause Google to require security review for public apps. For the challenge: keep the app in dev mode and add the judge/test Gmail to test users.

7 — Message ingestion: two practical options

Option A — Polling (fast to implement, robust in dev):

After connecting an account, call users.getProfile to get historyId.

Poll users.history.list with startHistoryId every ~15–30s to check for new messages.

For each new messageAdded, fetch message via users.messages.get with format=full or raw.

Enqueue processNewMessage.

Option B — Push notifications (Gmail → Pub/Sub → webhook):

More involved to set up (Pub/Sub topic + subscription + webhook endpoint), but lower latency and scale.

Can be added later if time allows.

I recommend Polling for the 48-hour build.

8 — Classification & summarization prompts (AI design)

Design a single classification prompt that receives:

message subject, snippet, full text

list of the user's categories (name + description) — include a short instruction to pick best match and give confidence.
Return structured JSON: {categoryId, reason, confidenceScore}.

Summarization prompt:

Short 2–3 sentence summary of the email (include call-to-action if present, sender, and whether it’s newsletter/transactional).

For long emails, produce a 40–80 word digest.

Important: include system/instructional examples to reduce hallucination. Use structured output enforcement (e.g., You MUST return JSON).

Example classification prompt (pseudocode):

System: You are an assistant that classifies emails into the user's custom categories. Output only valid JSON: { "category": "<category name>", "categoryId": "<id>", "confidence": 0.0-1.0, "explanation": "..." }

Input:
- Subject: ...
- From: ...
- Body: ...
- Categories: [{id, name, description}, ... ]

Task: Choose the best category. If none match, return "Uncategorized" with low confidence.

9 — Archiving messages in Gmail

After message is imported and stored in DB, call:

gmail.users.messages.modify({
  userId: 'me',
  id: gmailMessageId,
  resource: { removeLabelIds: ['INBOX'] } // keeps message, archives it
})


(Use gmail.modify with removeLabelIds: ['INBOX'] — this archives.)

If user chooses Delete action later: call gmail.users.messages.trash or gmail.users.messages.delete depending on desired behavior.

10 — Unsubscribe agent design (best-effort)

Unsubscribing reliably is tricky because sites differ. Proposed approach:

Scan message headers and HTML for unsubscribe links:

Look for <a> anchor text containing "unsubscribe", "manage your subscription", List-Unsubscribe header (RFC 2369) — Gmail often surfaces it.

Extract link(s). If mailto: link: generate an email to that mailto with body if needed (but rarely used). If http(s): proceed.

Automated Playwright agent:

Launch headless Playwright.

Navigate to unsubscribe URL.

Wait for page load; attempt to detect common UI elements:

Forms with inputs labeled 'email', checkboxes 'unsubscribe', submit buttons (text contains 'unsubscribe', 'confirm', 'submit', 'stop', 'opt out', 'manage'), toggles, or links 'confirm unsub'.

If form present: fill known fields (use the recipient email address), check likely checkboxes, click submit.

If JavaScript dialog or multi-step: attempt to follow buttons labeled 'confirm'/'yes'.

After submit detect page contains keywords like 'you have been unsubscribed', 'confirmed', 'success', or HTTP 200 with no error.

Report success/failure back to DB and UI.

Safety & rate limits:

Respect robots.txt? Not strictly required for a user-directed action but be conservative.

Throttle Playwright tasks (one worker per account) and respect timeouts (e.g., 30s).

Handle CAPTCHAs: if CAPTCHA encountered, mark as failed and show manual unsubscribe instruction.

Alternative manual fallback:

If agent fails, provide the link in the UI for user to click manually and show instructions.

This agent will be best-effort and must be labeled as such in UI.

11 — Security & privacy considerations

Encrypt OAuth tokens at rest (e.g., with libsodium or AWS KMS if available) or at least environment secret key encryption.

Only request minimum scopes (gmail.modify).

Show privacy notice in UI: “We will archive emails in your Gmail; we store message summaries and metadata — not sell data.”

Delete stored emails on user request (implement account disconnect + data wipe).

Rate-limit/queuing to avoid hitting Google API quotas.

12 — Tests (recommended)

Unit tests: classification prompt helpers, DB logic (Prisma), API route validation.

Integration tests:

Simulate Gmail message fetch + classification + archiving (mock Gmail with fixtures).

Worker job flow.

E2E tests:

Next.js UI login flow (mock OAuth in CI), category creation, message listing.

Playwright test for unsubscribe agent using a local test page that simulates a subscription page (avoid live external sites in CI).

Use Jest + Supertest; run tests in CI (github actions).

Ask AI (Claude) to write tests for you — include test coverage thresholds.

13 — CI / Deployment

GitHub Actions:

pull_request and main pipelines:

lint, typecheck, unit tests

build

integration tests (with local Postgres/Redis via services)

Deploy to Render:

Web service: Next.js (Node) — build & static

Worker: separate service (Node) for background queue consumer

Redis & Postgres: Render managed services

Environment variables:

DATABASE_URL, REDIS_URL, GOOGLE_CLIENT_ID/SECRET, AI_API_KEY, NEXTAUTH_URL, ENCRYPTION_KEY, etc.

Add health endpoints and basic metrics.

14 — Prioritized 48-hour plan (goal) + 72-hour fallback

I'll present a prioritized checklist with time blocks. This is aggressive — use AI (Claude) to generate code rapidly.

Day 0 (Planning & setup) — 2–4 hours

Create repo skeleton (Next.js TypeScript).

Set up Prisma + Postgres locally.

Create Google Cloud OAuth client; configure redirect URIs (dev).

Setup NextAuth config for Google.

Implement Prisma models, run migrate.

Set up Redis locally.

Day 1 (Core auth + categories + DB + minimal UI) — 8–10 hours

Implement NextAuth Google sign-in; persist tokens to Account.

Implement Category CRUD API and UI pages (list, create).

Implement accounts page to connect additional Gmail accounts.

Implement messages DB model and simple message listing UI.

Day 2 (Message ingestion + AI classification + archiving) — 10–12 hours

Implement polling worker:

On connect, save historyId.

Poll Gmail history.list or messages.list for new messages.

Implement processNewMessage job:

Fetch full message (body), extract text, save snapshot.

Call AI classify & summarize (callouts to AIClient).

Save classification, summary, category assignment.

Call Gmail messages.modify to remove INBOX.

Implement UI: clicking category shows messages with AI summary and "select all" + bulk actions.

Day 3 (Unsubscribe automation + bulk actions + read full email view) — 6–8 hours

Implement bulk delete (Gmail trash/delete) API and UI.

Implement unsubscribe flow:

Extract unsubscribe link via headers / HTML parse.

Implement Playwright agent job for unsubscribe; hook to bulk action.

Implement message detail view (show original html or sanitized text).

Add basic tests (unit + one integration).

Deploy to Render and verify OAuth redirect and test user flow.

Remaining time — polishing, tests, deployment — 6–10 hours

Add more tests (mock Gmail responses).

Improve UI UX, error handling.

Add monitoring, add README and deployment instructions.

Final QA with the test Gmail provided.

15 — Example implementations & pseudo-code snippets
AI client interface (TypeScript)
// ai/aiClient.ts
export interface AIClient {
  classifyEmail(args: {subject: string, from: string, text: string, categories: {id:string, name:string, description:string}[] }): Promise<{categoryId?: string, confidence: number, reason: string}>;
  summarizeEmail(args: {subject: string, from: string, text: string}): Promise<string>;
}

Process new message flow (pseudo)
async function processNewMessage(account, gmailMessageId) {
  const raw = await gmail.users.messages.get({id: gmailMessageId, userId: 'me', format: 'full'});
  const {subject, from, bodyText, bodyHtml, snippet} = extractMessage(raw);
  const categories = await db.category.findMany({where: {userId: account.userId}});
  const classification = await aiClient.classifyEmail({subject, from, text: bodyText, categories});
  const summary = await aiClient.summarizeEmail({subject, from, text: bodyText});
  const message = await db.message.create({data: {
    accountId: account.id,
    gmailMessageId,
    subject, from, snippet,
    bodyText, bodyHtml,
    aiSummary: summary,
    aiClassification: classification,
    categoryId: classification.categoryId
  }});
  // archive in Gmail
  await gmail.users.messages.modify({id: gmailMessageId, userId: 'me', resource: {removeLabelIds:['INBOX']}});
}

Unsubscribe job (pseudo)
async function unsubscribeMessage(messageId) {
  const message = await db.message.findUnique({where:{id: messageId}});
  const unsubUrl = findUnsubscribeUrl(message);
  if(!unsubUrl) return {success:false, reason:'no-unsubscribe-link'};
  try {
    const pw = await playright.launch();
    const page = await pw.newPage();
    await page.goto(unsubUrl, {timeout: 30000});
    // heuristics: look for button or form with text 'unsubscribe'
    const btn = await page.locator('text=/unsubscribe|opt out|unsubscribe me/i').first();
    if(btn) { await btn.click(); await page.waitForTimeout(1000); }
    // check for confirmation text
    const content = await page.content();
    const success = /unsubscribed|success|you have been unsubscribed/i.test(content);
    await pw.close();
    await db.message.update({where:{id:messageId}, data:{unsubscribed: success}});
    return {success};
  } catch (err) {
    return {success:false, reason: String(err)};
  }
}

16 — Delivery artifacts to include in repo

README.md with setup, Google OAuth setup, env vars, and deploy steps.

prisma/schema.prisma and migrations.

src/ai/* interface + OpenAI/Anthropic impl.

src/workers/* queue consumer and job handlers.

src/pages/* Next.js UI pages (accounts, categories, emails, message view).

tests/* unit and integration tests.

docker-compose.yml (optional local dev: Next.js, Postgres, Redis).

playwright/ local test pages that simulate unsub pages (for CI E2E).

17 — Risks & mitigations

Google security review: use OAuth test user flow; add judge email as test user. Keep app in dev/testing mode.

AI classification mistakes: show confidence and allow manual reassign; allow category override in UI with re-training example (store corrections to retrain).

Unsubscribe fragility: label as best effort, provide fallback manual link; handle CAPTCHAs by failing gracefully.

Gmail quotas: use exponential backoff and queue; batch operations where possible.

18 — Example environment variables
DATABASE_URL=postgres://...
REDIS_URL=redis://...
NEXTAUTH_URL=https://your-app.onrender.com
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT=https://your-app.onrender.com/api/auth/callback/google
AI_PROVIDER=openai
OPENAI_API_KEY=...
ENCRYPTION_KEY=...

19 — What to ask the judge / what I'll need from you

(Do not ask now; I include so the future implementer knows what to request from judge)

Provide the Gmail address that will be used as a test user on Google Cloud for OAuth consent screen (must be added as a Test User).

Confirm preferred deployment (Render or Fly.io) and whether you want custom domain.

Provide any AI provider preference or API keys (OpenAI / Anthropic).

20 — Final deliverables checklist (for submission)

Deployed app URL (Render/Fly) — fully functional

GitHub repo link with commit history

README with instructions to run locally and deploy, plus instructions how to add judge as OAuth test user

Tests green in CI

Short video/screenshots showing:

Google Sign-in

Adding a category

Email ingestion and summarization

Bulk unsubscribe working (or failed but handled)

Archive action observed in Gmail (showing message removed from Inbox)

Note about guidelines: app uses Gmail test user and stores tokens encrypted.


