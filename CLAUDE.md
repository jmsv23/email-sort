# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An AI-powered Gmail inbox management application that automatically categorizes, summarizes, and helps users unsubscribe from emails. Users can connect multiple Gmail accounts via OAuth, create custom categories, and have new emails automatically classified by AI and archived from their inbox.

## Tech Stack

- **Framework**: Next.js (TypeScript, App Router) with React + Tailwind CSS
- **Auth**: NextAuth.js with Google OAuth provider
- **Database**: Postgres with Prisma ORM
- **Background Jobs**: BullMQ or Bee-Queue with Redis
- **AI Provider**: Gemini 2.5 pro
- **Gmail Integration**: Google Gmail REST API via googleapis Node client
- **Unsubscribe Agent**: Playwright headless browser for automation
- **Testing**: Jest + React Testing Library + Supertest + Playwright E2E
- **Deployment**: Render or Fly.io

## Development Commands

```bash
# Install dependencies
npm install

# Database setup
npx prisma migrate dev
npx prisma generate

# Run locally (dev mode)
npm run dev

# Run worker process (separate terminal)
npm run worker

# Tests
npm test                 # Unit tests
npm run test:integration # Integration tests
npm run test:e2e        # E2E tests with Playwright

# Linting & type checking
npm run lint
npm run typecheck

# Build for production
npm run build
```

## High-Level Architecture

### Core Components

1. **Next.js App** (frontend + API routes)
   - Routes: `/api/auth/*` (NextAuth), `/api/gmail/connect`, `/api/categories`, `/api/emails`, `/api/unsubscribe`, `/api/webhook/gmail-pubsub`

2. **Background Worker** (separate process)
   - Jobs: `processNewMessage`, `classifyAndSummarize`, `unsubscribeJob`

3. **Redis Queue** - Job management

4. **Postgres Database** - Stores users, accounts, categories, messages, job logs

5. **Playwright Worker** - Unsubscribe automation

6. **AI Layer** - Abstraction for classification/summarization prompts

### Data Flow

1. User signs in → OAuth tokens stored encrypted in DB
2. Background poller or Pub/Sub webhook receives new message → enqueues `processNewMessage`
3. `processNewMessage` fetches message via Gmail API → calls `classifyAndSummarize` (AI) → stores message → archives in Gmail (removes INBOX label)
4. UI shows categories and messages with AI summaries
5. User selects messages → triggers `unsubscribeJob` or delete via Gmail API

## Database Schema (Prisma)

### User
- `id`, `email`, `name`, `createdAt`
- Relations: `accounts[]`, `categories[]`

### Account
- `id`, `userId`, `provider`, `providerAccountId`
- `accessToken` (encrypted), `refreshToken` (encrypted), `tokenExpiry`
- `gmailProfileId`, `createdAt`

### Category
- `id`, `userId`, `name`, `description` (used for AI classification)
- `createdAt`, `updatedAt`
- Relations: `messages[]`

### Message
- `id`, `accountId`, `gmailMessageId`, `threadId`, `categoryId`
- `subject`, `from`, `to`, `snippet`, `bodyText`, `bodyHtml`
- `aiSummary`, `aiClassification` (JSON with scores/reasons)
- `importedAt`, `archived`, `unsubscribed`

## Message Ingestion Strategy

**Recommended: Polling** (fastest to implement for 48-72h build)
- After connecting account, call `users.getProfile` to get `historyId`
- Poll `users.history.list` with `startHistoryId` every 15-30s
- For each new message, fetch via `users.messages.get` with `format=full`
- Enqueue `processNewMessage` job

**Alternative: Gmail Push Notifications** (Pub/Sub) - lower latency, more complex setup

## AI Classification & Summarization

### Classification Prompt Design
- Input: message subject, snippet, full text + user's categories (name + description)
- Output: Structured JSON `{categoryId, reason, confidenceScore}`
- System instruction: Force valid JSON output, pick best category match or "Uncategorized" if no match

### Summarization Prompt Design
- Generate 2-3 sentence summary (40-80 words)
- Include: sender, call-to-action, whether newsletter/transactional
- Use structured output enforcement to reduce hallucination

### AI Client Interface
```typescript
// src/ai/aiClient.ts
export interface AIClient {
  classifyEmail(args: {
    subject: string,
    from: string,
    text: string,
    categories: {id: string, name: string, description: string}[]
  }): Promise<{categoryId?: string, confidence: number, reason: string}>;

  summarizeEmail(args: {
    subject: string,
    from: string,
    text: string
  }): Promise<string>;
}
```

## Archiving Messages in Gmail

After importing and storing in DB:
```javascript
gmail.users.messages.modify({
  userId: 'me',
  id: gmailMessageId,
  resource: { removeLabelIds: ['INBOX'] }
})
```

For delete action: use `gmail.users.messages.trash` or `gmail.users.messages.delete`

## Unsubscribe Agent Design

**Best-effort automation** using Playwright:

1. Extract unsubscribe link from message headers (`List-Unsubscribe`) or HTML anchors
2. Launch headless browser and navigate to URL
3. Detect common UI patterns: forms with "email" inputs, checkboxes, submit buttons with "unsubscribe"/"confirm"/"opt out" text
4. Fill forms with recipient email, check checkboxes, click submit
5. Detect success via page content keywords: "unsubscribed", "confirmed", "success"
6. Handle failures gracefully: CAPTCHAs → mark as failed, provide manual link fallback
7. Throttle tasks (30s timeout per attempt)

## Google OAuth Setup

### Required Scopes
- `https://www.googleapis.com/auth/gmail.modify` - read/write and archive messages
- `email`, `profile`, `openid` - user info

### Dev Mode Setup
1. Create Google Cloud project
2. Configure OAuth consent screen → External, mark as "testing"
3. Add test user emails to Test Users list
4. Create OAuth 2.0 Client ID (Web app)
5. Set authorized redirect URIs: `https://your-app.com/api/auth/callback/google`
6. Store client ID/secret in environment variables

**Important**: Keep app in dev mode with test users to avoid Google security review requirements

## Security & Privacy

- Encrypt OAuth tokens at rest (use encryption key in env)
- Only request minimum required Gmail scopes
- Implement account disconnect + data wipe functionality
- Rate-limit API calls to avoid hitting Google quotas
- Use exponential backoff for retries
- Display privacy notice: "We archive emails in your Gmail; we store message summaries and metadata"

## Testing Strategy

### Unit Tests
- AI classification helpers
- DB logic (Prisma)
- API route validation

### Integration Tests
- Mock Gmail message fetch + classification + archiving (use fixtures)
- Worker job flows

### E2E Tests
- Next.js UI login flow (mock OAuth in CI)
- Category creation and management
- Message listing and bulk actions
- Unsubscribe agent using local test page (avoid live sites in CI)

Run tests in CI (GitHub Actions) with coverage thresholds

## Deployment

### Render Setup
- **Web Service**: Next.js app (Node)
- **Worker Service**: Background queue consumer (Node)
- **Managed Services**: Postgres + Redis

### Environment Variables
```
DATABASE_URL=postgres://...
REDIS_URL=redis://...
NEXTAUTH_URL=https://your-app.onrender.com
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
AI_PROVIDER=openai
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
ENCRYPTION_KEY=...
```

### CI Pipeline (GitHub Actions)
- Lint, typecheck, unit tests
- Build
- Integration tests (with local Postgres/Redis via services)
- Deploy on merge to main

## Key Implementation Files

- `prisma/schema.prisma` - Database models and migrations
- `src/ai/` - AIClient interface + provider implementations
- `src/workers/` - Queue consumer and job handlers
- `src/pages/api/` - API routes for auth, categories, emails, bulk actions
- `src/pages/` - UI pages (accounts, categories, emails, message view)
- `src/lib/gmail.ts` - Gmail API integration helpers
- `tests/` - Unit and integration tests
- `playwright/` - E2E tests and mock unsubscribe pages

## Development Workflow

1. **Setup**: Initialize Next.js + Prisma + NextAuth + Redis
2. **Auth**: Implement Google OAuth with NextAuth, persist encrypted tokens
3. **Categories**: Build CRUD API and UI for custom categories
4. **Message Ingestion**: Implement polling worker + Gmail API integration
5. **AI Processing**: Build classification + summarization with AIClient
6. **UI**: Category views, message listing with summaries, message detail view
7. **Bulk Actions**: Implement delete and unsubscribe jobs
8. **Unsubscribe Agent**: Build Playwright automation with fallback handling
9. **Tests**: Write unit, integration, and E2E tests
10. **Deploy**: Configure Render services and environment variables

## Important Considerations

- **Gmail Quotas**: Implement rate limiting and exponential backoff
- **AI Classification Errors**: Show confidence scores, allow manual category reassignment
- **Unsubscribe Fragility**: Label as "best effort", provide manual link fallback for failures
- **Token Security**: Always encrypt OAuth tokens at rest
- **Test User Management**: Add judge/tester emails to Google Cloud OAuth test users list before demo
