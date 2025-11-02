# Deployment Guide

This guide explains how to deploy the email-sort application to production using GitHub Actions and Coolify.

## Architecture Overview

The application consists of two separate services:

1. **Web Service**: Next.js application (port 3000)
   - Handles HTTP requests, API routes, and UI
   - Runs database migrations on startup

2. **Worker Service**: Background job processor
   - Processes BullMQ jobs
   - Polls Gmail for new messages every 15 seconds
   - No exposed ports

Both services share:
- **PostgreSQL database**: Stores users, accounts, categories, and messages
- **Redis instance**: Job queue for BullMQ

## Prisma Migrations in Production

### How Migrations Work

Prisma uses a two-step process for database schema management:

1. **Development (`prisma migrate dev`)**:
   - Creates migration files in `prisma/migrations/`
   - Applies migrations to your development database
   - Regenerates Prisma Client
   - Used during local development

2. **Production (`prisma migrate deploy`)**:
   - Reads existing migration files
   - Applies any pending migrations to the production database
   - Does NOT create new migration files
   - Does NOT prompt for user input (safe for CI/CD)

### Migration Strategy in This Project

**Migrations run in the web app startup script** (`package.json`):

```json
"start": "prisma migrate deploy && next start"
```

**Why this approach?**
- ✅ Simple: No separate migration service needed
- ✅ Automatic: Migrations run before the app starts
- ✅ Safe: If migrations fail, the app won't start
- ⚠️ Startup delay: First deploy may take longer
- ⚠️ Race conditions: Multiple instances could race (mitigated by Prisma's locking)

**What happens during deployment:**

1. Docker build includes `prisma/migrations/` directory
2. Container starts and runs `npm run start`
3. Script executes `prisma migrate deploy`
4. Prisma checks database for applied migrations
5. Applies any pending migrations sequentially
6. Next.js server starts after migrations complete

### Prisma Generate in Build Process

**Prisma Client generation happens during Docker build**:

```dockerfile
# In Dockerfile (builder stage)
RUN npx prisma generate
```

**What is Prisma Generate?**
- Reads `prisma/schema.prisma`
- Generates TypeScript types and Prisma Client code
- Outputs to `node_modules/.prisma/client/`
- Required before running any Prisma queries

**Why generate during build?**
- ✅ Faster startup: Client is pre-generated
- ✅ Type safety: Ensures schema matches code at build time
- ✅ Smaller runtime: No need for Prisma CLI in production
- ✅ Immutable: Client version matches the deployed code

**Full build flow:**

```
1. Install dependencies (including Prisma CLI)
2. Copy prisma/schema.prisma
3. Run `prisma generate` → Creates Prisma Client
4. Build Next.js (uses generated types)
5. Build worker (uses generated types)
6. Copy node_modules/.prisma to production image
7. Production containers use pre-generated client
```

### Creating New Migrations

**When you change the database schema:**

```bash
# 1. Update prisma/schema.prisma locally
# 2. Create and apply migration
npm run db:migrate

# 3. Commit migration files
git add prisma/migrations/
git commit -m "Add new table for X"

# 4. Deploy via GitHub Actions
# The new migration will be applied automatically
```

## Deployment Setup

### Prerequisites

1. **GitHub Account** with access to the repository
2. **GitHub Personal Access Token** with `write:packages` scope
3. **Coolify Instance** with two services configured
4. **Google OAuth Credentials** (Client ID + Secret)
5. **Gemini API Key** (or alternative AI provider)
6. **PostgreSQL Database** (managed by Coolify or external)
7. **Redis Instance** (managed by Coolify or external)

### Step 1: Configure GitHub Secrets

Add these secrets in GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `GHCR_TOKEN` | GitHub Personal Access Token | [Generate at GitHub](https://github.com/settings/tokens) with `write:packages` scope |
| `COOLIFY_WEBHOOK_WEB` | Web service deployment webhook | Copy from Coolify web service settings |
| `COOLIFY_WEBHOOK_WORKER` | Worker service deployment webhook | Copy from Coolify worker service settings |

**Note**: You can use GitHub's built-in `GITHUB_TOKEN` for GHCR authentication (already configured in workflow), but a Personal Access Token gives more control.

### Step 2: Set Up Coolify Services

#### Service 1: Web (email-sort-web)

- **Type**: Docker Image
- **Image**: `ghcr.io/YOUR_GITHUB_USERNAME/email-sort-web:latest`
- **Port Mapping**: `3000:3000`
- **Domain**: `sort.manuelsantibanez.online`
- **Health Check**: HTTP GET to `/api/health` (optional)

#### Service 2: Worker (email-sort-worker)

- **Type**: Docker Image
- **Image**: `ghcr.io/YOUR_GITHUB_USERNAME/email-sort-worker:latest`
- **Port Mapping**: None (no exposed ports)
- **Domain**: None
- **Restart Policy**: `always` (must run continuously)

#### Shared Services

Create or connect to:
- **PostgreSQL 15+**: Note the connection URL
- **Redis 7+**: Note the connection URL

### Step 3: Configure Environment Variables in Coolify

Add these environment variables to **BOTH** web and worker services:

```bash
# Application URL
NEXTAUTH_URL=https://sort.manuelsantibanez.online

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your_generated_secret_here

# Database
DATABASE_URL=postgresql://user:password@postgres-host:5432/email_sort

# Redis
REDIS_URL=redis://redis-host:6379

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# AI Provider
AI_PROVIDER=gemini
GOOGLE_AI_API_KEY=your_gemini_api_key
AI_MODEL=gemini-2.5-flash

# Security (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_base64_encryption_key

# Environment
NODE_ENV=production
```

**Important**: Update Google OAuth redirect URIs in [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
- Add: `https://sort.manuelsantibanez.online/api/auth/callback/google`

### Step 4: Configure GitHub Container Registry in Coolify

For each service, configure registry authentication:

- **Registry**: `ghcr.io`
- **Username**: Your GitHub username
- **Password**: Your GitHub Personal Access Token (same as `GHCR_TOKEN`)

### Step 5: Deploy

#### First Deployment

1. Go to GitHub repository → **Actions** tab
2. Select **"Deploy to Coolify"** workflow
3. Click **"Run workflow"**
4. Keep defaults (don't skip tests or build)
5. Click **"Run workflow"** button

The workflow will:
1. ✅ Run linter and type checking
2. ✅ Run unit and integration tests
3. 🐳 Build web and worker Docker images
4. 📦 Push images to GitHub Container Registry
5. 🚀 Trigger Coolify webhooks for both services
6. 🎉 Coolify pulls and deploys containers

#### Subsequent Deployments

Same process, or enable auto-deploy:
- Modify `.github/workflows/deploy.yml`
- Change `on: workflow_dispatch` to include `push: branches: [main]`
- Every push to main will auto-deploy

#### Skip Build (Deploy Only)

If images are already built and you just want to redeploy:

1. Run workflow
2. Set `skip_build` to `true`
3. This triggers Coolify to pull and restart existing images

## Monitoring and Troubleshooting

### Check Deployment Status

**GitHub Actions:**
- Go to Actions tab → Latest workflow run
- Check each job (test, build, deploy) for errors

**Coolify:**
- View service logs in Coolify dashboard
- Check container status and restarts

### Common Issues

#### 1. Migrations Fail on Startup

**Symptom**: Web service crashes on startup

**Solution**:
```bash
# Connect to Coolify database directly
psql $DATABASE_URL

# Check migration status
SELECT * FROM _prisma_migrations;

# If stuck, manually apply migrations
npx prisma migrate deploy
```

#### 2. Worker Not Processing Jobs

**Symptom**: Emails not being classified

**Check**:
- Worker service is running in Coolify
- Redis connection is working
- Check worker logs for errors
- Verify Gmail polling is active

#### 3. OAuth Redirect Mismatch

**Symptom**: "redirect_uri_mismatch" error

**Solution**:
- Verify `NEXTAUTH_URL` matches your domain exactly
- Update Google Cloud Console redirect URIs
- Clear browser cookies and try again

#### 4. Database Connection Refused

**Symptom**: "Can't reach database server"

**Check**:
- `DATABASE_URL` is correct
- PostgreSQL service is running
- Network connectivity between services
- Firewall rules in Coolify

### Viewing Logs

**Web service logs:**
```bash
# In Coolify dashboard or via SSH
docker logs <web-container-id> --tail 100 -f
```

**Worker service logs:**
```bash
docker logs <worker-container-id> --tail 100 -f
```

**Database migrations:**
```bash
# Migration history
npx prisma migrate status

# Detailed migration logs
SELECT * FROM _prisma_migrations;
```

## Rollback Strategy

### Rollback to Previous Image

1. **Find previous image tag**:
   - Go to GitHub → Packages → `email-sort-web`
   - Note the previous SHA tag (e.g., `main-abc123`)

2. **Update Coolify service**:
   - Change image tag from `latest` to specific SHA
   - Redeploy

3. **Or use GitHub Actions**:
   - Revert the commit that broke production
   - Trigger deployment workflow

### Rollback Database Migration

⚠️ **Be careful with database rollbacks!**

Prisma doesn't support automatic rollbacks. If a migration causes issues:

1. **Write a new migration** to undo changes:
   ```bash
   # Create a revert migration manually
   npx prisma migrate dev --name revert_feature_x
   ```

2. **Or restore from database backup** (preferred)

## Performance Optimization

### Scaling

**Web Service:**
- Can scale horizontally (multiple instances)
- Each instance runs migrations (Prisma handles locking)
- Use load balancer in Coolify

**Worker Service:**
- One instance recommended (polling is singleton)
- If scaling needed, use Redis locks to prevent duplicate polling
- Multiple instances will share the BullMQ job processing

### Resource Allocation

Recommended Coolify resource limits:

**Web Service:**
- CPU: 1-2 cores
- Memory: 1-2 GB
- Instances: 1-3 (based on traffic)

**Worker Service:**
- CPU: 1 core
- Memory: 512 MB - 1 GB
- Instances: 1 (singleton)

## Security Checklist

Before deploying to production:

- [ ] All secrets are set in Coolify (not hardcoded)
- [ ] `ENCRYPTION_KEY` is strong (32 bytes, base64-encoded)
- [ ] `NEXTAUTH_SECRET` is strong (32+ characters)
- [ ] OAuth redirect URIs are correct in Google Console
- [ ] Database has regular backups enabled
- [ ] Redis is password-protected (if exposed)
- [ ] HTTPS is enabled via Coolify (automatic with Let's Encrypt)
- [ ] Google Cloud OAuth consent screen is configured
- [ ] Test users are added in Google Cloud Console (if in dev mode)

## Maintenance Tasks

### Database Backups

Set up automatic backups in Coolify or via cron:

```bash
# Backup script (add to Coolify or external cron)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

### Redis Monitoring

Monitor queue health:

```bash
# Connect to Redis CLI
redis-cli -u $REDIS_URL

# Check queue lengths
LLEN bull:processNewMessage:wait
LLEN bull:processNewMessage:failed

# View failed jobs
LRANGE bull:processNewMessage:failed 0 -1
```

### Update Dependencies

Regularly update dependencies:

```bash
npm update
npm audit fix
git commit -am "Update dependencies"
# Trigger deployment
```

## Cost Estimation

**Coolify (self-hosted):**
- VPS: $10-20/month (4GB RAM, 2 CPU)
- Domain: $12/year
- SSL: Free (Let's Encrypt)

**External Services:**
- Gemini API: Free tier (15 requests/min)
- Google OAuth: Free
- Postgres (Managed): $10-30/month
- Redis (Managed): $10-20/month

**Total estimated cost**: $30-70/month

## Support and Resources

- **Coolify Docs**: https://coolify.io/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **GitHub Actions**: https://docs.github.com/en/actions

---

## Quick Reference Commands

```bash
# Generate new migration locally
npm run db:migrate

# Check migration status
npx prisma migrate status

# Apply migrations manually
npm run migrate:deploy

# View Prisma schema
cat prisma/schema.prisma

# Build Docker images locally (for testing)
docker build --target web -t email-sort-web .
docker build --target worker -t email-sort-worker .

# Run local tests
npm run test
npm run typecheck
npm run lint

# View GitHub workflow runs
gh run list
gh run view <run-id>
```
