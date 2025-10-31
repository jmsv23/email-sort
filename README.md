# Email Sort

AI-powered Gmail inbox management application that automatically categorizes, summarizes, and helps users unsubscribe from emails.

## Features

- Connect multiple Gmail accounts via OAuth
- AI-powered email classification and summarization (Gemini 2.5 Pro)
- Custom category creation
- Automatic email archiving
- Background job processing with BullMQ
- Unsubscribe automation (coming soon)

## Tech Stack

- **Framework**: Next.js 15 (TypeScript, App Router)
- **Auth**: NextAuth.js v5 with Google OAuth
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ with Redis
- **AI**: Google Gemini 2.5 Pro
- **Gmail**: Google Gmail REST API

## Prerequisites

- Node.js 18+
- Docker and Docker Compose
- Google Cloud OAuth credentials

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd email-sort
npm install
```

### 2. Start Docker Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379

### 3. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string (default provided)
- `REDIS_URL`: Redis connection string (default provided)
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for dev)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
- `GOOGLE_AI_API_KEY`: From Google AI Studio
- `ENCRYPTION_KEY`: Generate with `openssl rand -base64 32`

### 4. Set Up Database

```bash
npm run db:migrate
```

### 5. Start Development Server

```bash
# Terminal 1: Next.js app
npm run dev

# Terminal 2: Background worker
npm run worker
```

The app will be available at http://localhost:3000

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Gmail API
4. Configure OAuth consent screen:
   - User Type: External
   - Add test users (your email addresses)
5. Create OAuth 2.0 Client ID (Web application)
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Secret to `.env`

## Google AI Setup

1. Go to [Google AI Studio](https://aistudio.google.com)
2. Create an API key
3. Copy to `.env` as `GOOGLE_AI_API_KEY`

## Available Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
npm run test         # Run Jest tests
npm run test:e2e     # Run Playwright E2E tests
npm run worker       # Start background worker process
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Generate Prisma client
npm run db:studio    # Open Prisma Studio
```

## Project Structure

```
email-sort/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   └── auth/         # Auth pages
│   ├── lib/              # Core utilities
│   │   ├── auth.ts       # NextAuth configuration
│   │   ├── prisma.ts     # Prisma client
│   │   ├── redis.ts      # Redis & BullMQ setup
│   │   └── gmail.ts      # Gmail API helpers
│   ├── ai/               # AI client interface
│   │   └── aiClient.ts   # Gemini implementation
│   ├── workers/          # Background job workers
│   │   └── index.ts      # Worker definitions
│   └── components/       # React components
├── prisma/
│   └── schema.prisma     # Database schema
├── tests/                # Test files
├── docker-compose.yml    # Docker services
└── package.json
```

## Development Workflow

1. Make changes to code
2. Database schema changes:
   ```bash
   npm run db:migrate
   ```
3. Test your changes
4. Commit and push

## Troubleshooting

### Port 5432 already in use
If you have PostgreSQL running locally, either:
- Stop it: `sudo service postgresql stop`
- Change the port in `docker-compose.yml`

### Docker services not starting
```bash
docker-compose down
docker-compose up -d
docker-compose ps  # Check status
```

### Database connection errors
Ensure Docker containers are running:
```bash
docker-compose ps
```

### Worker not processing jobs
Check Redis connection and ensure worker is running:
```bash
npm run worker
```

## Next Steps (Day 1+)

- [ ] Build category management UI
- [ ] Implement Gmail polling/webhook
- [ ] Create email listing and detail views
- [ ] Add bulk actions (delete, unsubscribe)
- [ ] Implement Playwright unsubscribe automation
- [ ] Add tests
- [ ] Deploy to production

## License

ISC
